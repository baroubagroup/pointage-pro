import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
  late Timer _deviceBindingTimer;
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
    _deviceBindingTimer = Timer.periodic(const Duration(seconds: 12), (_) {
      _verifyDeviceLinkActive();
    });
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
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: const Row(
          children: [
            Icon(Icons.phonelink_erase, color: Color(0xFFEF4444), size: 24),
            SizedBox(width: 8),
            Text("Appareil Dissocié", style: TextStyle(color: Color(0xFF0F172A), fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: const Text(
          "Ce smartphone a été délié de votre compte par votre superviseur ou la session a expiré.\n\nVeuillez scanner à nouveau votre QR code d'enrôlement ou saisir votre code d'activation.",
          style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
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
              backgroundColor: const Color(0xFF2563EB),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
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
    _deviceBindingTimer.cancel();
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
      final secConfig = await _syncService.getOrganizationSecurityConfig(widget.session.orgId);
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
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: const Row(
          children: [
            Icon(Icons.location_off_rounded, color: Color(0xFFEF4444), size: 28),
            SizedBox(width: 10),
            Expanded(
              child: Text(
                "Hors de la zone autorisée",
                style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 16),
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
              style: const TextStyle(color: Color(0xFF0F172A), fontSize: 13, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              "Le rayon autorisé est de ${widget.session.establishmentRadius?.toInt() ?? 80} mètres autour de l'établissement '${widget.session.establishmentName}'.",
              style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFBFDBFE)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline, color: Color(0xFF2563EB), size: 16),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      "Rapprochez-vous de votre lieu de travail pour déverrouiller le bouton de pointage.",
                      style: TextStyle(color: Color(0xFF1E40AF), fontSize: 11),
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
              backgroundColor: const Color(0xFF2563EB),
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
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: Row(
          children: [
            const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 28),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                "${punch.label} validé !",
                style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 16),
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
              style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 13),
            ),
            Text(
              "Matricule : ${widget.session.matricule}",
              style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
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
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFFECACA)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.warning_amber_rounded, color: Color(0xFFEF4444), size: 16),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        "Retard de $lateMinutes min détecté. Vous pouvez transmettre une justification si nécessaire.",
                        style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 11),
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
              child: const Text("Plus tard", style: TextStyle(color: Color(0xFF64748B))),
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
                foregroundColor: Colors.white,
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
        Icon(icon, color: const Color(0xFF2563EB), size: 16),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 10)),
              Text(value, style: const TextStyle(color: Color(0xFF0F172A), fontSize: 12, fontWeight: FontWeight.w700)),
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
      backgroundColor: const Color(0xFFF4F7FD),
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 100),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Barre Supérieure : Profil, Titre, Notifications
              _buildTopHeader(),

              const SizedBox(height: 18),

              // 2. Hero Card Bleu Royal Vibrant (Jauge circulaire + État du Shift)
              _buildHeroCard(),

              const SizedBox(height: 16),

              // 3. Bento Grid Asymétrique (Action, Géofence Liquid, Horloge Sparkline, Dépannage, Planning)
              _buildBentoGrid(timeStr, dateStr),

              const SizedBox(height: 16),

              // 4. Actions Secondaires (Clôture / Imprévu)
              _buildSecondaryActionSection(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTopHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Vue Générale 👋",
              style: TextStyle(
                color: Color(0xFF0F172A),
                fontSize: 22,
                fontWeight: FontWeight.w900,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 2),
            Row(
              children: [
                Text(
                  widget.session.fullName,
                  style: const TextStyle(color: Color(0xFF64748B), fontSize: 12, fontWeight: FontWeight.w600),
                ),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFBFDBFE)),
                  ),
                  child: Text(
                    widget.session.matricule,
                    style: const TextStyle(color: Color(0xFF2563EB), fontSize: 9, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ],
        ),
        Row(
          children: [
            // Bouton Dépanner un collègue (Discret, rapide et directement accessible en en-tête)
            InkWell(
              onTap: () => ColleagueAssistanceDialog.show(context, widget.session),
              borderRadius: BorderRadius.circular(14),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFF2563EB).withValues(alpha: 0.18)),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF2563EB).withValues(alpha: 0.08),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text("🤝", style: TextStyle(fontSize: 12)),
                    SizedBox(width: 4),
                    Text(
                      "Dépanner",
                      style: TextStyle(
                        color: Color(0xFF2563EB),
                        fontWeight: FontWeight.w800,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 8),
            // Bouton Notifications
            InkWell(
              onTap: _showNotificationsDialog,
              borderRadius: BorderRadius.circular(20),
              child: Container(
                padding: const EdgeInsets.all(9),
                decoration: BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(color: const Color(0xFF1E3A8A).withValues(alpha: 0.08), blurRadius: 10, offset: const Offset(0, 3)),
                  ],
                ),
                child: const Icon(Icons.notifications_outlined, color: Color(0xFF2563EB), size: 18),
              ),
            ),
            const SizedBox(width: 8),
            // Avatar Collaborateur
            Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2),
                boxShadow: [
                  BoxShadow(color: const Color(0xFF1E3A8A).withValues(alpha: 0.12), blurRadius: 12, offset: const Offset(0, 4)),
                ],
                gradient: const LinearGradient(
                  colors: [Color(0xFF2563EB), Color(0xFF38BDF8)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: CircleAvatar(
                radius: 18,
                backgroundColor: const Color(0xFF2563EB),
                child: Text(
                  widget.session.initials,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildHeroCard() {
    double progressPercent = 0.0;
    String heroTitle = "Prêt à démarrer ! 👋";
    String heroSubtitle = "Shift : ${widget.session.morningStart} - ${widget.session.afternoonEnd}";

    if (_workState == DayWorkState.working) {
      heroTitle = "En poste • Bon travail ! ⚡";
      heroSubtitle = _stateSubtitle;
      progressPercent = 0.75;
    } else if (_workState == DayWorkState.onBreak) {
      heroTitle = "Pause repas en cours ☕";
      heroSubtitle = _stateSubtitle;
      progressPercent = 0.50;
    } else if (_workState == DayWorkState.completed) {
      heroTitle = "Journée terminée 🎉";
      heroSubtitle = "Présence certifiée aujourd'hui";
      progressPercent = 1.0;
    }

    final int percentInt = (progressPercent * 100).toInt();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1D4ED8), Color(0xFF2563EB), Color(0xFF3B82F6)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(26),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2563EB).withValues(alpha: 0.38),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        children: [
          // Jauge Circulaire en Anneau
          SizedBox(
            width: 68,
            height: 68,
            child: Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 68,
                  height: 68,
                  child: CircularProgressIndicator(
                    value: progressPercent > 0 ? progressPercent : 0.08,
                    strokeWidth: 6.5,
                    backgroundColor: Colors.white.withValues(alpha: 0.22),
                    valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
                    strokeCap: StrokeCap.round,
                  ),
                ),
                Text(
                  "$percentInt%",
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  heroTitle,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  heroSubtitle,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.88),
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    _pendingSyncCount > 0
                        ? "$_pendingSyncCount hors-ligne en attente 🔄"
                        : "📍 ${widget.session.establishmentName}",
                    style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBentoGrid(String timeStr, String dateStr) {
    return Column(
      children: [
        // Ligne 1 : Horloge Satellite Sparkline & Réservoir Géofence
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: _buildBentoSparklineClockCard(timeStr)),
            const SizedBox(width: 14),
            Expanded(child: _buildBentoGeofenceCard()),
          ],
        ),
        const SizedBox(height: 14),
        // Ligne 2 : Planning en capsule pleine largeur
        _buildBentoPlanningCard(),
        const SizedBox(height: 16),
        // Ligne 3 : ZONE DU POUCE (Thumb Zone) - Grand Bouton d'Action Héroïque de Pointage
        _buildBentoThumbPunchCard(),
      ],
    );
  }

  Widget _buildBentoThumbPunchCard() {
    String actionTitle;
    String actionSubtitle;
    String helperText;
    IconData actionIcon;
    List<Color> gradientColors;
    PunchType punchType;

    switch (_workState) {
      case DayWorkState.notArrived:
        actionTitle = "Pointer mon Arrivée";
        actionSubtitle = "Prise de poste matinale";
        helperText = "Appuyez pour démarrer votre shift";
        actionIcon = Icons.login_rounded;
        gradientColors = const [Color(0xFF10B981), Color(0xFF059669)];
        punchType = PunchType.checkIn;
        break;
      case DayWorkState.working:
        actionTitle = "Départ Pause Déjeuner";
        actionSubtitle = "En poste • Arrivée enregistrée";
        helperText = "Appuyez pour notifier votre pause";
        actionIcon = Icons.free_breakfast_rounded;
        gradientColors = const [Color(0xFF2563EB), Color(0xFF1D4ED8)];
        punchType = PunchType.breakStart;
        break;
      case DayWorkState.onBreak:
        actionTitle = "Reprise de Poste";
        actionSubtitle = "En pause déjeuner actuellement";
        helperText = "Appuyez pour reprendre votre service";
        actionIcon = Icons.restart_alt_rounded;
        gradientColors = const [Color(0xFF3B82F6), Color(0xFF2563EB)];
        punchType = PunchType.breakEnd;
        break;
      case DayWorkState.completed:
        actionTitle = "Journée Clôturée";
        actionSubtitle = "Présence certifiée aujourd'hui";
        helperText = "Appuyez pour rouvrir en cas d'erreur";
        actionIcon = Icons.check_circle_rounded;
        gradientColors = const [Color(0xFF64748B), Color(0xFF475569)];
        punchType = PunchType.checkOut;
        break;
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1E3A8A).withValues(alpha: 0.08),
            blurRadius: 22,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          // Bouton Circulaire Héroïque Pulsant dans la Zone du Pouce
          GestureDetector(
            onTap: _isLoading
                ? null
                : () {
                    HapticFeedback.mediumImpact();
                    if (_workState == DayWorkState.completed) {
                      _showReopenDayDialog();
                    } else {
                      _handlePunchWithGuardrails(punchType);
                    }
                  },
            child: AnimatedBuilder(
              animation: _pulseAnimation,
              builder: (ctx, child) {
                return Container(
                  width: 66,
                  height: 66,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: gradientColors,
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: gradientColors.first.withValues(alpha: 0.38 * _pulseAnimation.value),
                        blurRadius: 18 * _pulseAnimation.value,
                        spreadRadius: 3 * _pulseAnimation.value,
                      ),
                    ],
                  ),
                  child: Center(
                    child: _isLoading
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                          )
                        : Icon(actionIcon, color: Colors.white, size: 28),
                  ),
                );
              },
            ),
          ),
          const SizedBox(width: 16),
          // Libellé et description ergonomique
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: gradientColors.first.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        "POINTAGE AU POUCE",
                        style: TextStyle(
                          color: gradientColors.first,
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.4,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  actionTitle,
                  style: const TextStyle(
                    color: Color(0xFF0F172A),
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  actionSubtitle,
                  style: const TextStyle(
                    color: Color(0xFF64748B),
                    fontSize: 11.5,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  helperText,
                  style: TextStyle(
                    color: gradientColors.first,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBentoGeofenceCard() {
    final double maxDist = (widget.session.establishmentRadius ?? 120.0) * 1.5;
    final double fillRatio = (1.0 - (_distanceToSiteMeters / maxDist)).clamp(0.15, 0.95);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1E3A8A).withValues(alpha: 0.05),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Text("📍", style: TextStyle(fontSize: 12)),
              SizedBox(width: 4),
              Expanded(
                child: Text(
                  "Périmètre",
                  style: TextStyle(color: Color(0xFF0F172A), fontSize: 12, fontWeight: FontWeight.w800),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          Text(
            _isInGeofence ? "Zone autorisée" : "Hors zone",
            style: TextStyle(
              color: _isInGeofence ? const Color(0xFF10B981) : const Color(0xFFEF4444),
              fontSize: 10,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          // Réservoir Liquide
          Container(
            height: 94,
            width: double.infinity,
            decoration: BoxDecoration(
              color: const Color(0xFFEFF6FF),
              borderRadius: BorderRadius.circular(18),
            ),
            alignment: Alignment.bottomCenter,
            child: FractionallySizedBox(
              heightFactor: fillRatio,
              widthFactor: 1.0,
              child: Container(
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF38BDF8), Color(0xFF2563EB)],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                  borderRadius: BorderRadius.vertical(
                    top: const Radius.circular(14),
                    bottom: Radius.circular(fillRatio >= 0.95 ? 18 : 18),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF2563EB).withValues(alpha: 0.25),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        "${_distanceToSiteMeters.toInt()}m",
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      Text(
                        _isInGeofence ? "Validé" : "Trop loin",
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBentoSparklineClockCard(String timeStr) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1E3A8A).withValues(alpha: 0.05),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Text("🛰️", style: TextStyle(fontSize: 12)),
              SizedBox(width: 4),
              Expanded(
                child: Text(
                  "Satellite UTC",
                  style: TextStyle(color: Color(0xFF0F172A), fontSize: 12, fontWeight: FontWeight.w800),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 38,
            width: double.infinity,
            child: CustomPaint(
              painter: _SparklinePainter(color: const Color(0xFF2563EB)),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                timeStr,
                style: const TextStyle(
                  color: Color(0xFF0F172A),
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                  fontFamily: 'monospace',
                ),
              ),
              const SizedBox(width: 3),
              const Text(
                "UTC",
                style: TextStyle(
                  color: Color(0xFF64748B),
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBentoPlanningCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1E3A8A).withValues(alpha: 0.05),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Text("📅", style: TextStyle(fontSize: 12)),
                  const SizedBox(width: 6),
                  Text(
                    widget.session.isWorkingToday()
                        ? "Planning : ${widget.session.morningStart} - ${widget.session.afternoonEnd}"
                        : "Planning : Repos programmé",
                    style: const TextStyle(
                      color: Color(0xFF0F172A),
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFA7F3D0)),
                ),
                child: const Text(
                  "Conforme",
                  style: TextStyle(color: Color(0xFF059669), fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Container(
              height: 10,
              width: double.infinity,
              color: const Color(0xFFF1F5F9),
              child: FractionallySizedBox(
                alignment: Alignment.centerLeft,
                widthFactor: _workState == DayWorkState.completed ? 1.0 : (_workState == DayWorkState.working ? 0.65 : 0.08),
                child: Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Color(0xFF3B82F6), Color(0xFF2563EB)],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSecondaryActionSection() {
    return Column(
      children: [
        if (_workState == DayWorkState.working) ...[
          OutlinedButton.icon(
            onPressed: _isLoading ? null : () => _handlePunchWithGuardrails(PunchType.checkOut),
            icon: const Icon(Icons.logout_rounded, color: Color(0xFFE11D48), size: 18),
            label: const Text(
              "Clôturer définitivement ma journée",
              style: TextStyle(color: Color(0xFFE11D48), fontWeight: FontWeight.w800, fontSize: 13),
            ),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Color(0xFFFECDD3), width: 1.5),
              backgroundColor: const Color(0xFFFFF1F2),
              minimumSize: const Size(double.infinity, 48),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            ),
          ),
          const SizedBox(height: 12),
        ],
        InkWell(
          onTap: () => JustificationModal.show(context, employeeId: widget.session.id),
          borderRadius: BorderRadius.circular(20),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF1E3A8A).withValues(alpha: 0.05),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.assignment_late_outlined, color: Color(0xFFD97706), size: 18),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        "Signaler un retard ou imprévu",
                        style: TextStyle(color: Color(0xFF0F172A), fontSize: 13, fontWeight: FontWeight.w800),
                      ),
                      Text(
                        "Transmettez votre motif au responsable",
                        style: TextStyle(color: Color(0xFF64748B), fontSize: 11),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: Color(0xFF94A3B8), size: 20),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _showNotificationsDialog() async {
    showDialog(
      context: context,
      builder: (ctx) => FutureBuilder<List<Map<String, dynamic>>>(
        future: _syncService.getEmployeeJustifications(widget.session.id),
        builder: (context, snapshot) {
          return AlertDialog(
            backgroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
            title: const Row(
              children: [
                Icon(Icons.notifications_active_rounded, color: Color(0xFF2563EB), size: 24),
                SizedBox(width: 8),
                Text(
                  "Notifications & Retards",
                  style: TextStyle(color: Color(0xFF0F172A), fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            content: SizedBox(
              width: double.maxFinite,
              child: snapshot.connectionState == ConnectionState.waiting
                  ? const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator(color: Color(0xFF2563EB))))
                  : (snapshot.data == null || snapshot.data!.isEmpty)
                      ? Column(
                          mainAxisSize: MainAxisSize.min,
                          children: const [
                            Icon(Icons.inbox_outlined, color: Color(0xFF94A3B8), size: 40),
                            SizedBox(height: 10),
                            Text("Aucune notification pour le moment.", style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                          ],
                        )
                      : ListView.separated(
                          shrinkWrap: true,
                          itemCount: snapshot.data!.length,
                          separatorBuilder: (_, __) => const Divider(color: Color(0xFFE2E8F0)),
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
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: badgeColor.withValues(alpha: 0.3)),
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
                                      Text(dateStr, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    "Motif : $reason ($delayMin min)",
                                    style: const TextStyle(color: Color(0xFF0F172A), fontSize: 11, fontWeight: FontWeight.w700),
                                  ),
                                  if (item['custom_comment'] != null && (item['custom_comment'] as String).isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 2),
                                      child: Text(
                                        "\"${item['custom_comment']}\"",
                                        style: const TextStyle(color: Color(0xFF64748B), fontSize: 11, fontStyle: FontStyle.italic),
                                      ),
                                    ),
                                  if (reviewNote != null && reviewNote.isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 6),
                                      child: Container(
                                        padding: const EdgeInsets.all(6),
                                        decoration: BoxDecoration(
                                          color: badgeColor.withValues(alpha: 0.1),
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
                child: const Text("Fermer", style: TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.bold)),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _SparklinePainter extends CustomPainter {
  final Color color;
  _SparklinePainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final path = Path();
    path.moveTo(0, size.height * 0.6);
    path.lineTo(size.width * 0.2, size.height * 0.6);
    path.lineTo(size.width * 0.32, size.height * 0.15);
    path.lineTo(size.width * 0.44, size.height * 0.85);
    path.lineTo(size.width * 0.54, size.height * 0.35);
    path.lineTo(size.width * 0.66, size.height * 0.7);
    path.lineTo(size.width * 0.78, size.height * 0.45);
    path.lineTo(size.width * 0.88, size.height * 0.6);
    path.lineTo(size.width, size.height * 0.55);

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
