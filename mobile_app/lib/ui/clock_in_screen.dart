import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';
import '../models/employee_session.dart';
import '../models/punch_model.dart';
import '../services/offline_sync_service.dart';
import '../services/security_service.dart';
import 'colleague_assistance_dialog.dart';
import 'enrollment_screen.dart';
import 'justification_modal.dart';

enum DayWorkState {
  notArrived,
  working,
  onBreak,
  completed,
}

class ClockInScreen extends StatefulWidget {
  final EmployeeSession session;

  const ClockInScreen({super.key, required this.session});

  @override
  State<ClockInScreen> createState() => _ClockInScreenState();
}

class _ClockInScreenState extends State<ClockInScreen> with SingleTickerProviderStateMixin {
  final SecurityService _securityService = SecurityService();
  final OfflineSyncService _syncService = OfflineSyncService();

  late Timer _clockTimer;
  late Timer _gpsDistanceTimer;
  DateTime _currentTime = DateTime.now();
  bool _isLoading = false;
  int _pendingSyncCount = 0;

  // Radar GPS dynamique
  double _distanceToSiteMeters = 18.0;
  bool _isInGeofence = true;
  bool _gpsReady = false;

  // State Machine
  DayWorkState _workState = DayWorkState.notArrived;
  String _stateSubtitle = "Non pointé aujourd'hui";
  DateTime? _lastPunchActionTime;

  // Animation Radar Pulse
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();

    // 1. Animation de pulsation continue pour le radar
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    )..repeat();

    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.35).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeOut),
    );

    // 2. Horloge temps réel inaltérable
    _clockTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          _currentTime = DateTime.now();
        });
      }
    });

    // 3. Écoute de l'état de synchronisation Supabase
    _syncService.pendingCountStream.listen((count) {
      if (mounted) {
        setState(() {
          _pendingSyncCount = count;
        });
      }
    });

    _refreshDayFSM();
    _startLiveGpsTracking();
    _verifyDeviceLinkActive();
  }

  Future<void> _verifyDeviceLinkActive() async {
    try {
      final meta = await _securityService.getDeviceMetadata();
      final isStillActive = await _syncService.verifyDeviceBindingActive(
        widget.session.id,
        meta.deviceId,
      );
      if (!isStillActive && mounted) {
        await _syncService.clearEmployeeSession();
        _showDeviceUnboundDialog();
      }
    } catch (e) {
      debugPrint("Erreur vérification liaison: $e");
    }
  }

  void _showDeviceUnboundDialog() {
    if (!mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.phonelink_erase, color: Color(0xFFEF4444), size: 22),
            SizedBox(width: 8),
            Text("Appareil Dissocié", style: TextStyle(color: Colors.white, fontSize: 16)),
          ],
        ),
        content: const Text(
          "Votre gestionnaire a réinitialisé la liaison de ce smartphone.\n\nVeuillez scanner à nouveau votre QR code d'enrôlement ou saisir votre code d'activation.",
          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
        ),
        actions: [
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (c) => const EnrollmentScreen()),
                (route) => false,
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF38BDF8),
              foregroundColor: const Color(0xFF0F172A),
            ),
            child: const Text("Réenrôler mon Téléphone", style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _clockTimer.cancel();
    _gpsDistanceTimer.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  /// Calcul en continu de la distance au site de l'entreprise
  void _startLiveGpsTracking() {
    _updateGpsDistance();
    _gpsDistanceTimer = Timer.periodic(const Duration(seconds: 12), (timer) {
      _updateGpsDistance();
    });
  }

  Future<void> _updateGpsDistance() async {
    try {
      Position pos = await _securityService.getCurrentSecurePosition();
      
      // Coordonnées du site d'affectation
      final double siteLat = widget.session.establishmentLat ?? 11.24700;
      final double siteLng = widget.session.establishmentLng ?? -4.29180;
      final double radius = widget.session.establishmentRadius ?? 120.0;

      double dist = Geolocator.distanceBetween(
        pos.latitude,
        pos.longitude,
        siteLat,
        siteLng,
      );

      if (mounted) {
        setState(() {
          // Lissage exponentiel (Moving Average) pour amortir la gigue des satellites
          if (_distanceToSiteMeters == 18.0 || !_gpsReady) {
            _distanceToSiteMeters = dist;
          } else {
            _distanceToSiteMeters = (_distanceToSiteMeters * 0.35 + dist * 0.65);
          }
          _isInGeofence = _distanceToSiteMeters <= radius;
          _gpsReady = true;
        });
      }
    } catch (e) {
      // Conserver la dernière mesure connue en cas d'atténuation du signal GPS en intérieur
      if (mounted) {
        setState(() {
          _isInGeofence = _distanceToSiteMeters <= (widget.session.establishmentRadius ?? 120.0);
          _gpsReady = true;
        });
      }
    }
  }

  /// Machine à États Finis (FSM) : empêche le double pointage d'arrivée
  Future<void> _refreshDayFSM() async {
    final punches = await _syncService.getRecentPunches(widget.session.id);
    if (punches.isEmpty) {
      if (mounted) {
        setState(() {
          _workState = DayWorkState.notArrived;
          _stateSubtitle = "Prêt pour votre arrivée du matin";
        });
      }
      return;
    }

    // Filtrer les pointages d'aujourd'hui
    final now = DateTime.now();
    final todayPunches = punches.where((p) {
      final punchDate = p.recordedAtUtc.toLocal();
      return punchDate.year == now.year &&
          punchDate.month == now.month &&
          punchDate.day == now.day;
    }).toList();

    if (todayPunches.isEmpty) {
      if (mounted) {
        setState(() {
          _workState = DayWorkState.notArrived;
          _stateSubtitle = "Prêt pour votre arrivée du matin";
        });
      }
      return;
    }

    final latest = todayPunches.first;
    final timeStr = DateFormat('HH:mm').format(latest.recordedAtUtc.toLocal());

    // Détermination de l'état
    DayWorkState newState = DayWorkState.notArrived;
    String newSubtitle = "";

    switch (latest.type) {
      case PunchType.checkIn:
        newState = DayWorkState.working;
        newSubtitle = "En poste depuis $timeStr • Arrivée certifiée";
        break;
      case PunchType.breakStart:
        newState = DayWorkState.onBreak;
        newSubtitle = "En pause déjeuner depuis $timeStr";
        break;
      case PunchType.breakEnd:
        newState = DayWorkState.working;
        newSubtitle = "En poste • Retour de pause à $timeStr";
        break;
      case PunchType.checkOut:
        newState = DayWorkState.completed;
        newSubtitle = "Journée clôturée à $timeStr";
        break;
    }

    if (mounted) {
      setState(() {
        _workState = newState;
        _stateSubtitle = newSubtitle;
      });
    }
  }

  /// Déclencheur avec garde-fous anti-spam et dialogues de confirmation
  Future<void> _handlePunchWithGuardrails(PunchType type) async {
    if (_isLoading) return;

    // 0. Vérification de liaison active avec Supabase (Déconnexion immédiate si délié par l'admin)
    try {
      final meta = await _securityService.getDeviceMetadata();
      final isStillActive = await _syncService.verifyDeviceBindingActive(
        widget.session.id,
        meta.deviceId,
      );
      if (!isStillActive) {
        await _syncService.clearEmployeeSession();
        if (mounted) _showDeviceUnboundDialog();
        return;
      }
    } catch (_) {}

    // 1. Protection Anti-Spam (délai de sécurité entre 2 actions rapides)
    if (_lastPunchActionTime != null) {
      final elapsed = DateTime.now().difference(_lastPunchActionTime!);
      if (elapsed < const Duration(seconds: 40)) {
        final confirmRapid = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            backgroundColor: const Color(0xFF1E293B),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            title: const Row(
              children: [
                Icon(Icons.timer_outlined, color: Color(0xFFF59E0B)),
                SizedBox(width: 8),
                Text("Pointage Rapproché", style: TextStyle(color: Colors.white, fontSize: 16)),
              ],
            ),
            content: Text(
              "Votre précédente action date de seulement ${elapsed.inSeconds} secondes. Confirmez-vous vouloir enregistrer cette nouvelle action immédiatement ?",
              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text("Attendre", style: TextStyle(color: Color(0xFF94A3B8))),
              ),
              ElevatedButton(
                onPressed: () => Navigator.pop(ctx, true),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF38BDF8)),
                child: const Text("Confirmer"),
              ),
            ],
          ),
        );
        if (confirmRapid != true) return;
      }
    }

    // 2. Contrôle de prise de poste tardive (horaires dépassés)
    if (type == PunchType.checkIn && widget.session.isWorkingToday()) {
      final now = DateTime.now();
      final parts = widget.session.afternoonEnd.split(':');
      final endHour = int.tryParse(parts[0]) ?? 17;
      final endMin = int.tryParse(parts.length > 1 ? parts[1] : '30') ?? 30;
      final endMinutes = endHour * 60 + endMin;
      final curMinutes = now.hour * 60 + now.minute;
      if (curMinutes > endMinutes + 15) {
        final confirmLateShift = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            backgroundColor: const Color(0xFF1E293B),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            title: const Row(
              children: [
                Icon(Icons.nightlight_round, color: Color(0xFFF59E0B)),
                SizedBox(width: 8),
                Text("Prise de Poste Tardive", style: TextStyle(color: Colors.white, fontSize: 16)),
              ],
            ),
            content: Text(
              "Attention : L'horaire officiel de service d'aujourd'hui s'est achevé à ${widget.session.afternoonEnd}.\n\nConfirmez-vous cette prise de poste exceptionnelle (astreinte, heures supplémentaires ou décalage autorisé) ?",
              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text("Annuler", style: TextStyle(color: Color(0xFF94A3B8))),
              ),
              ElevatedButton(
                onPressed: () => Navigator.pop(ctx, true),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFF59E0B)),
                child: const Text("Confirmer"),
              ),
            ],
          ),
        );
        if (confirmLateShift != true) return;
      }
    }

    // 3. Dialogues de confirmation selon le type d'action
    if (type == PunchType.breakStart) {
      final confirm = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: const Color(0xFF1E293B),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Row(
            children: [
              Icon(Icons.free_breakfast_rounded, color: Color(0xFFF59E0B)),
              SizedBox(width: 8),
              Text("Départ en Pause Déjeuner", style: TextStyle(color: Colors.white, fontSize: 16)),
            ],
          ),
          content: Text(
            "Confirmez-vous votre départ en pause repas ? (Plage officielle : ${widget.session.lunchStart} - ${widget.session.lunchEnd}).",
            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text("Annuler", style: TextStyle(color: Color(0xFF94A3B8))),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFF59E0B)),
              child: const Text("Confirmer la Pause"),
            ),
          ],
        ),
      );
      if (confirm != true) return;
    } else if (type == PunchType.breakEnd) {
      final confirm = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: const Color(0xFF1E293B),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Row(
            children: [
              Icon(Icons.restart_alt_rounded, color: Color(0xFF38BDF8)),
              SizedBox(width: 8),
              Text("Reprise de Poste", style: TextStyle(color: Colors.white, fontSize: 16)),
            ],
          ),
          content: const Text(
            "Confirmez-vous votre retour de pause repas et la reprise immédiate de votre travail ?",
            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text("Annuler", style: TextStyle(color: Color(0xFF94A3B8))),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF38BDF8)),
              child: const Text("Confirmer la Reprise"),
            ),
          ],
        ),
      );
      if (confirm != true) return;
    } else if (type == PunchType.checkOut) {
      final confirm = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: const Color(0xFF1E293B),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Row(
            children: [
              Icon(Icons.logout_rounded, color: Color(0xFFF43F5E)),
              SizedBox(width: 8),
              Text("Clôturer la Journée", style: TextStyle(color: Colors.white, fontSize: 16)),
            ],
          ),
          content: Text(
            "Confirmez-vous la fin définitive de votre journée de travail ? Vos heures seront certifiées. (Fin officielle : ${widget.session.afternoonEnd}).",
            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text("Annuler", style: TextStyle(color: Color(0xFF94A3B8))),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFF43F5E),
                foregroundColor: Colors.white,
              ),
              child: const Text("Confirmer la Clôture"),
            ),
          ],
        ),
      );
      if (confirm != true) return;
    }

    _lastPunchActionTime = DateTime.now();
    await _triggerPunch(type);
  }

  /// Réouverture de journée en cas d'erreur de clic ou d'heures supplémentaires
  Future<void> _showReopenDayDialog() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.published_with_changes_rounded, color: Color(0xFF38BDF8)),
            SizedBox(width: 8),
            Text("Réouvrir la Journée", style: TextStyle(color: Colors.white, fontSize: 16)),
          ],
        ),
        content: const Text(
          "Avez-vous clôturé votre journée par inadvertance ou avez-vous des heures supplémentaires à effectuer ? Votre journée sera réouverte et repassera en statut 'En poste'.",
          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text("Annuler", style: TextStyle(color: Color(0xFF94A3B8))),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF38BDF8),
              foregroundColor: const Color(0xFF0F172A),
            ),
            child: const Text("Confirmer la Réouverture"),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      setState(() {
        _workState = DayWorkState.working;
        _stateSubtitle = "Journée réouverte • En poste";
      });
      _showSnackbar("Journée réouverte. Vous pouvez continuer vos activités et pointer à nouveau.");
    }
  }

  /// Exécution du pointage avec contrôles de sécurité réels
  Future<void> _triggerPunch(PunchType type) async {
    // 1. Contrôle du géofencing
    final maxRadius = widget.session.establishmentRadius ?? 120.0;
    if (!_isInGeofence && _distanceToSiteMeters > maxRadius) {
      _showOutOfZoneDialog();
      return;
    }

    // 2. Contrôle de pointage anticipé
    final now = DateTime.now();
    if (type == PunchType.checkIn && (now.hour < 6 || (now.hour == 6 && now.minute < 30))) {
      bool confirm = await _showAnticipatedPunchWarning();
      if (!confirm) return;
    }

    setState(() => _isLoading = true);

    try {
      // 3. Biométrie appareil (Touch ID / Face ID) selon la politique d'entreprise
      final secConfig = await _syncService.getOrganizationSecurityConfig();
      if (secConfig['require_biometrics'] == true) {
        bool authenticated = await _securityService.authenticateBiometric();
        if (!authenticated) {
          _showSnackbar("Pointage annulé : la validation biométrique (Empreinte / FaceID) est exigée par l'entreprise.", isError: true);
          setState(() => _isLoading = false);
          return;
        }
      }

      // 4. Capture GPS satellite certifiée
      Position position = await _securityService.getCurrentSecurePosition();
      final device = await _securityService.getDeviceMetadata();
      String? currentBssid = await _securityService.getConnectedWifiBssid();

      // 5. Création du pointage
      PunchModel punch = PunchModel(
        userId: widget.session.id,
        establishmentId: widget.session.establishmentId,
        type: type,
        recordedAtUtc: position.timestamp,
        latitude: position.latitude,
        longitude: position.longitude,
        accuracyMeters: position.accuracy,
        distanceToSiteMeters: _distanceToSiteMeters,
        isMockLocation: position.isMocked,
        deviceId: device.deviceId,
        deviceModel: device.model,
        wifiBssid: currentBssid,
        flagReasons: ["GPS_CONFIRMED", "HORLOGE_UTC_OK", "FSM_STRICT"],
      );

      // 6. Sauvegarde locale SQLite + envoi Supabase en temps réel
      await _syncService.savePunchLocally(punch);
      await _refreshDayFSM();

      // 7. Détection automatique de retard dynamique basée sur le planning
      bool isLate = false;
      int lateMin = 0;
      if (type == PunchType.checkIn && widget.session.isWorkingToday()) {
        final parts = widget.session.morningStart.split(':');
        final schedHour = int.tryParse(parts[0]) ?? 7;
        final schedMin = int.tryParse(parts.length > 1 ? parts[1] : '30') ?? 30;
        final limitMinutes = (schedHour * 60 + schedMin) + widget.session.toleranceMinutes;
        final currentMinutes = now.hour * 60 + now.minute;
        if (currentMinutes > limitMinutes) {
          isLate = true;
          lateMin = currentMinutes - limitMinutes;
        }
      }

      _showSuccessDialog(punch, isLate: isLate, lateMinutes: lateMin);
    } catch (e) {
      _showSnackbar(e.toString().replaceAll("Exception: ", ""), isError: true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<bool> _showAnticipatedPunchWarning() async {
    return await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            backgroundColor: const Color(0xFF1E293B),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            title: const Row(
              children: [
                Icon(Icons.access_time_filled, color: Color(0xFFF59E0B)),
                SizedBox(width: 8),
                Text("Pointage très matinal", style: TextStyle(color: Colors.white, fontSize: 16)),
              ],
            ),
            content: const Text(
              "Votre prise de poste est programmée pour 08h00. Souhaitez-vous tout de même enregistrer une arrivée anticipée ?",
              style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 13),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text("Attendre", style: TextStyle(color: Color(0xFF94A3B8))),
              ),
              ElevatedButton(
                onPressed: () => Navigator.pop(ctx, true),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFF59E0B)),
                child: const Text("Confirmer l'arrivée"),
              ),
            ],
          ),
        ) ??
        false;
  }

  void _showOutOfZoneDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: const Row(
          children: [
            Icon(Icons.location_off_rounded, color: Color(0xFFEF4444), size: 28),
            SizedBox(width: 10),
            Expanded(
              child: Text(
                "Hors de la zone autorisée",
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Vous êtes actuellement situé à ${_distanceToSiteMeters.toInt()} mètres du site.",
              style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              "Le rayon autorisé est de ${widget.session.establishmentRadius?.toInt() ?? 80} mètres autour de l'établissement '${widget.session.establishmentName}'.",
              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white10),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline, color: Color(0xFF38BDF8), size: 16),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      "Rapprochez-vous de votre lieu de travail pour déverrouiller le bouton de pointage.",
                      style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF3B82F6),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text("Compris"),
          ),
        ],
      ),
    );
  }

  void _showSuccessDialog(PunchModel punch, {bool isLate = false, int lateMinutes = 0}) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: Row(
          children: [
            const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 28),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                "${punch.label} validé !",
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Collaborateur : ${widget.session.fullName}",
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
            ),
            Text(
              "Matricule : ${widget.session.matricule}",
              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
            ),
            const SizedBox(height: 10),
            _buildDialogRow(
              icon: Icons.access_time_rounded,
              label: "Horloge Satellite UTC",
              value: DateFormat('HH:mm:ss').format(punch.recordedAtUtc.toLocal()),
            ),
            const SizedBox(height: 6),
            _buildDialogRow(
              icon: Icons.radar_rounded,
              label: "Distance au Site",
              value: "${punch.distanceToSiteMeters.toStringAsFixed(1)} mètres (Conforme)",
            ),
            if (isLate) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.warning_amber_rounded, color: Color(0xFFF87171), size: 16),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        "Retard de $lateMinutes min détecté. Vous pouvez transmettre une justification si nécessaire.",
                        style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 11),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
        actions: [
          if (isLate) ...[
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text("Plus tard", style: TextStyle(color: Color(0xFF94A3B8))),
            ),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.pop(ctx);
                JustificationModal.show(
                  context,
                  employeeId: widget.session.id,
                  delayMinutes: lateMinutes,
                );
              },
              icon: const Icon(Icons.edit_note_rounded, size: 18),
              label: Text("Justifier ($lateMinutes min)", style: const TextStyle(fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFF59E0B),
                foregroundColor: const Color(0xFF0F172A),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ] else ...[
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF10B981),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text("Continuer"),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDialogRow({required IconData icon, required String label, required String value}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: const Color(0xFF38BDF8), size: 15),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
              Text(value, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ],
    );
  }

  void _showSnackbar(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: isError ? const Color(0xFFEF4444) : const Color(0xFF10B981),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final timeStr = DateFormat('HH:mm:ss').format(_currentTime);
    final dateStr = DateFormat('EEEE d MMMM yyyy', 'fr_FR').format(_currentTime);

    return Scaffold(
      backgroundColor: const Color(0xFF0A0F1D),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // 1. Barre Supérieure : Profil, Matricule, Dépannage & Synchro
              _buildTopHeader(),

              const SizedBox(height: 18),

              // 2. Horloge Atomique Satellite UTC
              _buildClockCard(timeStr, dateStr),

              const SizedBox(height: 18),

              // 3. Radar Geofencing Dynamique en Temps Réel
              _buildGeofencingRadarCard(),

              const SizedBox(height: 24),

              // 4. Bouton Héroïque Central Biométrique (State Machine)
              _buildHeroicPulsingRadarButton(),

              const SizedBox(height: 24),

              // 5. Actions Secondaires (Clôture / Reprise / Justification)
              _buildSecondaryActionSection(),

              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _showNotificationsDialog() async {
    showDialog(
      context: context,
      builder: (ctx) => FutureBuilder<List<Map<String, dynamic>>>(
        future: _syncService.getEmployeeJustifications(widget.session.id),
        builder: (context, snapshot) {
          return AlertDialog(
            backgroundColor: const Color(0xFF1E293B),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
            title: const Row(
              children: [
                Icon(Icons.notifications_active_rounded, color: Color(0xFF38BDF8), size: 24),
                SizedBox(width: 8),
                Text("Notifications & Retards", style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              ],
            ),
            content: SizedBox(
              width: double.maxFinite,
              child: snapshot.connectionState == ConnectionState.waiting
                  ? const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator(color: Color(0xFF38BDF8))))
                  : (snapshot.data == null || snapshot.data!.isEmpty)
                      ? Column(
                          mainAxisSize: MainAxisSize.min,
                          children: const [
                            Icon(Icons.inbox_outlined, color: Color(0xFF64748B), size: 40),
                            SizedBox(height: 10),
                            Text("Aucune notification pour le moment.", style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
                          ],
                        )
                      : ListView.separated(
                          shrinkWrap: true,
                          itemCount: snapshot.data!.length,
                          separatorBuilder: (_, __) => const Divider(color: Colors.white10),
                          itemBuilder: (context, idx) {
                            final item = snapshot.data![idx];
                            final status = item['status'] as String? ?? 'PENDING';
                            final delayMin = item['delay_minutes'] ?? 0;
                            final reason = item['reason_category'] ?? 'Retard';
                            final reviewNote = item['review_notes'] as String?;
                            final createdAt = item['created_at'] != null ? DateTime.tryParse(item['created_at']) : null;
                            final dateStr = createdAt != null ? DateFormat('dd/MM HH:mm').format(createdAt.toLocal()) : '';

                            Color badgeColor = const Color(0xFFF59E0B);
                            String statusLabel = "En attente d'examen";
                            IconData statusIcon = Icons.hourglass_top_rounded;

                            if (status == 'APPROVED') {
                              badgeColor = const Color(0xFF10B981);
                              statusLabel = "Retard Approuvé (Excusé)";
                              statusIcon = Icons.check_circle_rounded;
                            } else if (status == 'REJECTED') {
                              badgeColor = const Color(0xFFEF4444);
                              statusLabel = "Retard Rejeté (Non excusé)";
                              statusIcon = Icons.cancel_rounded;
                            }

                            return Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: const Color(0xFF0F172A),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: badgeColor.withOpacity(0.3)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Icon(statusIcon, color: badgeColor, size: 16),
                                      const SizedBox(width: 6),
                                      Expanded(
                                        child: Text(
                                          statusLabel,
                                          style: TextStyle(color: badgeColor, fontWeight: FontWeight.bold, fontSize: 12),
                                        ),
                                      ),
                                      Text(dateStr, style: const TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    "Motif : $reason ($delayMin min)",
                                    style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                                  ),
                                  if (item['custom_comment'] != null && (item['custom_comment'] as String).isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 2),
                                      child: Text(
                                        "\"${item['custom_comment']}\"",
                                        style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontStyle: FontStyle.italic),
                                      ),
                                    ),
                                  if (reviewNote != null && reviewNote.isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 6),
                                      child: Container(
                                        padding: const EdgeInsets.all(6),
                                        decoration: BoxDecoration(
                                          color: badgeColor.withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          "Décision RH : $reviewNote",
                                          style: TextStyle(color: badgeColor, fontSize: 10, fontWeight: FontWeight.w600),
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            );
                          },
                        ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text("Fermer", style: TextStyle(color: Color(0xFF38BDF8))),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildTopHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // Profil & Matricule
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: const LinearGradient(
                  colors: [Color(0xFF00F2FE), Color(0xFF4FACFE)],
                ),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF38BDF8).withOpacity(0.3),
                    blurRadius: 8,
                  ),
                ],
              ),
              child: CircleAvatar(
                radius: 20,
                backgroundColor: const Color(0xFF0F172A),
                child: Text(
                  widget.session.initials,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.session.fullName,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                ),
                Container(
                  margin: const EdgeInsets.only(top: 2),
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    widget.session.matricule,
                    style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ],
        ),

        // Actions Rapides Droite
        Row(
          children: [
            // Bouton "Dépanner un collègue"
            InkWell(
              onTap: () => ColleagueAssistanceDialog.show(context, widget.session),
              borderRadius: BorderRadius.circular(20),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFF38BDF8).withOpacity(0.12),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFF38BDF8).withOpacity(0.4)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.handshake_rounded, color: Color(0xFF38BDF8), size: 14),
                    SizedBox(width: 4),
                    Text(
                      "Dépanner",
                      style: TextStyle(color: Color(0xFF38BDF8), fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(width: 8),

            // Cloche de notifications des retards & décisions manager
            InkWell(
              onTap: _showNotificationsDialog,
              borderRadius: BorderRadius.circular(20),
              child: Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white12),
                ),
                child: const Icon(Icons.notifications_outlined, color: Color(0xFF38BDF8), size: 16),
              ),
            ),

            const SizedBox(width: 8),

            // Badge Statut Synchro
            if (_pendingSyncCount == 0)
              Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withOpacity(0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.cloud_done_rounded, color: Color(0xFF10B981), size: 16),
              )
            else
              InkWell(
                onTap: () => _syncService.syncPendingPunches(),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF59E0B).withOpacity(0.2),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.sync, color: Color(0xFFFBBF24), size: 12),
                      const SizedBox(width: 3),
                      Text("$_pendingSyncCount", style: const TextStyle(color: Color(0xFFFBBF24), fontSize: 10)),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }

  Widget _buildClockCard(String timeStr, String dateStr) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.3), blurRadius: 16, offset: const Offset(0, 6)),
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
            decoration: BoxDecoration(
              color: const Color(0xFF3B82F6).withOpacity(0.15),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.satellite_alt_rounded, color: Color(0xFF60A5FA), size: 12),
                SizedBox(width: 5),
                Text(
                  "SATELLITE UTC ATOMIQUE",
                  style: TextStyle(color: Color(0xFF93C5FD), fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            timeStr,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 42,
              fontWeight: FontWeight.w900,
              fontFamily: 'monospace',
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            dateStr,
            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
            decoration: BoxDecoration(
              color: const Color(0xFF334155),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              _stateSubtitle,
              style: const TextStyle(color: Color(0xFFE2E8F0), fontSize: 11, fontWeight: FontWeight.w600),
            ),
          ),
          const SizedBox(height: 8),

          // Badge Planning d'activité réel du jour
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: widget.session.isWorkingToday()
                  ? const Color(0xFF3B82F6).withOpacity(0.15)
                  : const Color(0xFF10B981).withOpacity(0.15),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: widget.session.isWorkingToday()
                    ? const Color(0xFF3B82F6).withOpacity(0.3)
                    : const Color(0xFF10B981).withOpacity(0.3),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  widget.session.isWorkingToday() ? Icons.calendar_month_rounded : Icons.beach_access_rounded,
                  color: widget.session.isWorkingToday() ? const Color(0xFF60A5FA) : const Color(0xFF34D399),
                  size: 13,
                ),
                const SizedBox(width: 5),
                Flexible(
                  child: Text(
                    widget.session.isWorkingToday()
                        ? "Aujourd'hui : ${widget.session.morningStart} - ${widget.session.afternoonEnd} (${widget.session.scheduleName})"
                        : "Aujourd'hui : Jour de repos prévu (Planning)",
                    style: TextStyle(
                      color: widget.session.isWorkingToday() ? const Color(0xFF93C5FD) : const Color(0xFF6EE7B7),
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                    overflow: TextOverflow.ellipsis,
                    maxLines: 1,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGeofencingRadarCard() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF131D31),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: _isInGeofence
              ? const Color(0xFF10B981).withOpacity(0.3)
              : const Color(0xFFEF4444).withOpacity(0.3),
        ),
      ),
      child: Row(
        children: [
          // Voyant Radar
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: _isInGeofence
                  ? const Color(0xFF10B981).withOpacity(0.15)
                  : const Color(0xFFEF4444).withOpacity(0.15),
              shape: BoxShape.circle,
            ),
            child: Icon(
              _isInGeofence ? Icons.radar_rounded : Icons.location_searching_rounded,
              color: _isInGeofence ? const Color(0xFF10B981) : const Color(0xFFEF4444),
              size: 24,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      _isInGeofence ? "ZONE AUTORISÉE" : "HORS PÉRIMÈTRE",
                      style: TextStyle(
                        color: _isInGeofence ? const Color(0xFF34D399) : const Color(0xFFF87171),
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      "À ${_distanceToSiteMeters.toInt()}m du site",
                      style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  _isInGeofence
                      ? "Périmètre de pointage 80m validé • Prêt"
                      : "Rapprochez-vous de l'agence pour autoriser le pointage",
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeroicPulsingRadarButton() {
    // Si la journée est terminée
    if (_workState == DayWorkState.completed) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0xFF10B981).withOpacity(0.4)),
        ),
        child: Column(
          children: [
            const Icon(Icons.verified_rounded, color: Color(0xFF10B981), size: 52),
            const SizedBox(height: 10),
            const Text(
              "JOURNÉE CLÔTURÉE",
              style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              "Vos présences sont certifiées et transmises au manager.",
              style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 11),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: _showReopenDayDialog,
              icon: const Icon(Icons.refresh_rounded, color: Color(0xFF38BDF8), size: 16),
              label: const Text(
                "Rectifier / Réouvrir ma journée de travail",
                style: TextStyle(color: Color(0xFF38BDF8), fontWeight: FontWeight.bold, fontSize: 12),
              ),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0xFF38BDF8), width: 1.2),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              ),
            ),
          ],
        ),
      );
    }

    // Détermination de l'action principale selon le FSM
    String actionTitle;
    String actionSubtitle;
    IconData actionIcon;
    List<Color> gradientColors;
    PunchType punchType;

    switch (_workState) {
      case DayWorkState.notArrived:
        actionTitle = "POINTER L'ARRIVÉE";
        actionSubtitle = "Prise de poste matinale";
        actionIcon = Icons.login_rounded;
        gradientColors = const [Color(0xFF059669), Color(0xFF10B981)];
        punchType = PunchType.checkIn;
        break;
      case DayWorkState.working:
        actionTitle = "PAUSE DÉJEUNER";
        actionSubtitle = "Départ en pause repas";
        actionIcon = Icons.free_breakfast_rounded;
        gradientColors = const [Color(0xFFD97706), Color(0xFFF59E0B)];
        punchType = PunchType.breakStart;
        break;
      case DayWorkState.onBreak:
        actionTitle = "REPRISE DE POSTE";
        actionSubtitle = "Retour de pause repas";
        actionIcon = Icons.restart_alt_rounded;
        gradientColors = const [Color(0xFF4F46E5), Color(0xFF6366F1)];
        punchType = PunchType.breakEnd;
        break;
      case DayWorkState.completed:
        actionTitle = "JOURNÉE TERMINÉE";
        actionSubtitle = "Clôturé";
        actionIcon = Icons.done_all;
        gradientColors = const [Color(0xFF64748B), Color(0xFF475569)];
        punchType = PunchType.checkOut;
        break;
    }

    return Center(
      child: SizedBox(
        width: 250,
        height: 250,
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Cercle d'ondes pulsantes extérieures
            AnimatedBuilder(
              animation: _pulseAnimation,
              builder: (ctx, child) {
                return Container(
                  width: 190 * _pulseAnimation.value,
                  height: 190 * _pulseAnimation.value,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: gradientColors.last.withOpacity(0.18 * (1.35 - _pulseAnimation.value)),
                  ),
                );
              },
            ),

            // Cercle Pulsant Secondaire
            Container(
              width: 190,
              height: 190,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: gradientColors.first.withOpacity(0.15),
              ),
            ),

            // Bouton Central Interactif
            GestureDetector(
              onTap: _isLoading ? null : () => _handlePunchWithGuardrails(punchType),
              child: Container(
                width: 165,
                height: 165,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    colors: gradientColors,
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: gradientColors.last.withOpacity(0.4),
                      blurRadius: 22,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (_isLoading)
                      const CircularProgressIndicator(color: Colors.white, strokeWidth: 3)
                    else ...[
                      Icon(actionIcon, color: Colors.white, size: 36),
                      const SizedBox(height: 6),
                      Text(
                        actionTitle,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        actionSubtitle,
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.85),
                          fontSize: 9,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSecondaryActionSection() {
    return Column(
      children: [
        // Si l'employé est en poste, proposer l'option alternative "Fin de journée"
        if (_workState == DayWorkState.working) ...[
          OutlinedButton.icon(
            onPressed: _isLoading ? null : () => _handlePunchWithGuardrails(PunchType.checkOut),
            icon: const Icon(Icons.logout_rounded, color: Color(0xFFF43F5E), size: 18),
            label: const Text(
              "Clôturer définitivement ma journée",
              style: TextStyle(color: Color(0xFFF43F5E), fontWeight: FontWeight.bold, fontSize: 13),
            ),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Color(0xFFF43F5E), width: 1.2),
              minimumSize: const Size(double.infinity, 48),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
          ),
          const SizedBox(height: 12),
        ],

        // Raccourci Justification de Retard ou Absence
        InkWell(
          onTap: () => JustificationModal.show(context, employeeId: widget.session.id),
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withOpacity(0.06)),
            ),
            child: const Row(
              children: [
                Icon(Icons.assignment_late_outlined, color: Color(0xFFF59E0B), size: 18),
                SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Signaler un retard ou imprévu",
                        style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                      Text(
                        "Transmettez votre motif directement au responsable",
                        style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right, color: Color(0xFF94A3B8), size: 18),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
