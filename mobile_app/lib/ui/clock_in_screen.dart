import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';
import '../models/punch_model.dart';
import '../services/offline_sync_service.dart';
import '../services/security_service.dart';

class ClockInScreen extends StatefulWidget {
  const ClockInScreen({super.key});

  @override
  State<ClockInScreen> createState() => _ClockInScreenState();
}

class _ClockInScreenState extends State<ClockInScreen> {
  final SecurityService _securityService = SecurityService();
  final OfflineSyncService _syncService = OfflineSyncService();

  late Timer _clockTimer;
  DateTime _currentTime = DateTime.now();
  bool _isLoading = false;
  String? _wifiBssid;
  int _pendingSyncCount = 0;

  // Données de simulation pour la session employé
  final String _currentUserId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
  final String _establishmentId = "b2c3d4e5-f6a7-8901-bcde-f12345678901";
  final String _establishmentName = "Boutique Centrale - Siège";

  @override
  void initState() {
    super.initState();
    _syncService.initialize();

    // Horloge temps réel
    _clockTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          _currentTime = DateTime.now();
        });
      }
    });

    // Écoute de l'état de synchronisation
    _syncService.pendingCountStream.listen((count) {
      if (mounted) {
        setState(() {
          _pendingSyncCount = count;
        });
      }
    });

    _checkWifi();
  }

  Future<void> _checkWifi() async {
    String? bssid = await _securityService.getConnectedWifiBssid();
    if (mounted) {
      setState(() {
        _wifiBssid = bssid;
      });
    }
  }

  @override
  void dispose() {
    _clockTimer.cancel();
    super.dispose();
  }

  Future<void> _handlePunch(PunchType type) async {
    setState(() => _isLoading = true);

    try {
      // 1. Biométrie de l'appareil (Face ID / Empreinte)
      bool authenticated = await _securityService.authenticateBiometric();
      if (!authenticated) {
        _showSnackbar("Authentification annulée.", isError: true);
        setState(() => _isLoading = false);
        return;
      }

      // 2. Récupération position GPS & vérification Faux GPS
      Position position = await _securityService.getCurrentSecurePosition();

      // 3. Récupération métadonnées de l'appareil (Device Binding)
      final device = await _securityService.getDeviceMetadata();

      // 4. Lecture Wi-Fi actuel
      String? currentBssid = await _securityService.getConnectedWifiBssid();

      // 5. Création du modèle de pointage (avec heure satellite inaltérable)
      PunchModel punch = PunchModel(
        userId: _currentUserId,
        establishmentId: _establishmentId,
        type: type,
        recordedAtUtc: position.timestamp, // Heure satellite UTC
        latitude: position.latitude,
        longitude: position.longitude,
        accuracyMeters: position.accuracy,
        isMockLocation: position.isMocked,
        deviceId: device.deviceId,
        deviceModel: device.model,
        wifiBssid: currentBssid,
      );

      // 6. Sauvegarde immédiate en base locale (0 perte hors-ligne)
      await _syncService.savePunchLocally(punch);

      _showSuccessDialog(punch);
    } catch (e) {
      _showSnackbar(e.toString().replaceAll("Exception: ", ""), isError: true);
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _showSuccessDialog(PunchModel punch) {
    String punchLabel = punch.type == PunchType.checkIn
        ? "Arrivée validée !"
        : punch.type == PunchType.checkOut
            ? "Départ validé !"
            : "Pause enregistrée !";

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.green, size: 28),
            const SizedBox(width: 10),
            Text(punchLabel, style: const TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("Heure certifiée : ${DateFormat('HH:mm:ss').format(punch.recordedAtUtc.toLocal())}"),
            const SizedBox(height: 6),
            Text("Précision satellite : ±${punch.accuracyMeters.toStringAsFixed(1)} m"),
            if (punch.wifiBssid != null) ...[
              const SizedBox(height: 6),
              const Row(
                children: [
                  Icon(Icons.wifi, color: Colors.blue, size: 16),
                  SizedBox(width: 6),
                  Text("Réseau Wi-Fi détecté", style: TextStyle(color: Colors.blue)),
                ],
              ),
            ],
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                "Le pointage a été consigné de manière infalsifiable.",
                style: TextStyle(fontSize: 12, color: Colors.black54),
              ),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blueAccent,
              foregroundColor: Colors.white,
            ),
            child: const Text("Fermer"),
          ),
        ],
      ),
    );
  }

  void _showSnackbar(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red.shade700 : Colors.green.shade700,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    String formattedTime = DateFormat('HH:mm:ss').format(_currentTime);
    String formattedDate = DateFormat('EEEE d MMMM yyyy', 'fr_FR').format(_currentTime);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text("Pointage Présence", style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
        actions: [
          if (_pendingSyncCount > 0)
            Padding(
              padding: const EdgeInsets.only(right: 16.0),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.orange.shade100,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.cloud_off, size: 16, color: Colors.orange),
                      const SizedBox(width: 6),
                      Text(
                        "$_pendingSyncCount en attente",
                        style: TextStyle(fontSize: 12, color: Colors.orange.shade900, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // 1. Carte Établissement
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.04),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.storefront, color: Colors.blueAccent),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _establishmentName,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.location_on, size: 16, color: Colors.green),
                            SizedBox(width: 4),
                            Text("Zone couverte", style: TextStyle(fontSize: 12, color: Colors.black54)),
                          ],
                        ),
                        Row(
                          children: [
                            Icon(
                              _wifiBssid != null ? Icons.wifi : Icons.wifi_off,
                              size: 16,
                              color: _wifiBssid != null ? Colors.blue : Colors.grey,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              _wifiBssid != null ? "Wi-Fi Détecté" : "4G/GPS Seul",
                              style: TextStyle(
                                fontSize: 12,
                                color: _wifiBssid != null ? Colors.blue : Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const Spacer(),

              // 2. Horloge Principale
              Text(
                formattedTime,
                style: const TextStyle(
                  fontSize: 54,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                  letterSpacing: -1,
                ),
              ),
              Text(
                formattedDate,
                style: const TextStyle(
                  fontSize: 16,
                  color: Colors.black45,
                  fontWeight: FontWeight.w500,
                ),
              ),

              const Spacer(),

              // 3. Bouton Principal de Pointage (1 Clic)
              SizedBox(
                width: 220,
                height: 220,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : () => _handlePunch(PunchType.checkIn),
                  style: ElevatedButton.styleFrom(
                    shape: const CircleBorder(),
                    backgroundColor: Colors.blueAccent,
                    elevation: 8,
                    shadowColor: Colors.blueAccent.withOpacity(0.4),
                  ),
                  child: _isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.touch_app, size: 54, color: Colors.white),
                            SizedBox(height: 10),
                            Text(
                              "POINTER\nARRIVÉE",
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                                letterSpacing: 1,
                              ),
                            ),
                          ],
                        ),
                ),
              ),

              const Spacer(),

              // 4. Boutons secondaires (Pause & Départ)
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _isLoading ? null : () => _handlePunch(PunchType.breakStart),
                      icon: const Icon(Icons.coffee, size: 18),
                      label: const Text("Pause"),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _isLoading ? null : () => _handlePunch(PunchType.checkOut),
                      icon: const Icon(Icons.logout, size: 18, color: Colors.redAccent),
                      label: const Text("Départ", style: TextStyle(color: Colors.redAccent)),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        side: BorderSide(color: Colors.redAccent.shade200),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }
}
