import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../models/employee_session.dart';
import '../services/offline_sync_service.dart';
import '../services/security_service.dart';
import 'main_navigation_screen.dart';

class EnrollmentScreen extends StatefulWidget {
  const EnrollmentScreen({super.key});

  @override
  State<EnrollmentScreen> createState() => _EnrollmentScreenState();
}

class _EnrollmentScreenState extends State<EnrollmentScreen> {
  final ImagePicker _picker = ImagePicker();
  final SecurityService _securityService = SecurityService();
  final OfflineSyncService _syncService = OfflineSyncService();

  int _selectedModeIndex = 0; // 0: Scanner, 1: Code Manuel, 2: Mode Inverse
  bool _isProcessing = false;
  final TextEditingController _tokenInputController = TextEditingController();

  // Mode Inverse
  String? _myDeviceId;
  String? _myDeviceModel;
  Timer? _reverseEnrollPollingTimer;
  bool _isCheckingReverse = false;

  @override
  void initState() {
    super.initState();
    _loadDeviceMetadata();
  }

  Future<void> _loadDeviceMetadata() async {
    try {
      final meta = await _securityService.getDeviceMetadata();
      if (mounted) {
        setState(() {
          _myDeviceId = meta.deviceId;
          _myDeviceModel = meta.model;
        });
      }
    } catch (e) {
      debugPrint("Erreur metadata: $e");
    }
  }

  void _startReverseEnrollmentPolling() {
    _reverseEnrollPollingTimer?.cancel();
    _reverseEnrollPollingTimer = Timer.periodic(const Duration(seconds: 4), (timer) async {
      if (_selectedModeIndex == 2 && _myDeviceId != null && !_isProcessing) {
        final session = await _syncService.checkReverseEnrollment(_myDeviceId!);
        if (session != null && mounted) {
          timer.cancel();
          _showBindingSuccess(session, _myDeviceModel ?? "Smartphone");
        }
      }
    });
  }

  @override
  void dispose() {
    _reverseEnrollPollingTimer?.cancel();
    _tokenInputController.dispose();
    super.dispose();
  }

  /// 1. Scan direct avec la Caméra
  void _startCameraScanner() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (ctx) => _CameraScanScreen(
          onDetected: (raw) => _verifyAndEnroll(raw),
          onManualFallback: () => _showManualTokenDialog(),
        ),
      ),
    );
  }

  /// 2. Importation depuis la Galerie
  Future<void> _importFromGallery() async {
    try {
      final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
      if (image == null) return;

      _showManualTokenDialog(
        title: "Code de votre Invitation",
        subtitle: "Image sélectionnée. Renseignez le code d'activation figurant sur votre carton ou message (ex: PPRO-302667) :",
      );
    } catch (e) {
      _showError("Impossible d'accéder à la galerie : $e");
    }
  }

  /// 3. Saisie Manuelle du Code
  void _showManualTokenDialog({
    String title = "Saisie du Code d'Activation",
    String subtitle = "Renseignez le jeton unique fourni par votre responsable (ex: PPRO-302667 ou 302667) :",
  }) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.vpn_key_rounded, color: Color(0xFF2563EB), size: 22),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  color: Color(0xFF0F172A),
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.3,
                ),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(subtitle, style: const TextStyle(color: Color(0xFF64748B), fontSize: 12.5)),
            const SizedBox(height: 16),
            TextField(
              controller: _tokenInputController,
              autofocus: true,
              style: const TextStyle(
                color: Color(0xFF0F172A),
                fontWeight: FontWeight.w800,
                letterSpacing: 1.5,
              ),
              decoration: InputDecoration(
                hintText: "Ex : PPRO-302667",
                hintStyle: const TextStyle(color: Color(0xFF94A3B8), letterSpacing: 1),
                filled: true,
                fillColor: const Color(0xFFF8FAFC),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.8),
                ),
                prefixIcon: const Icon(Icons.qr_code_rounded, color: Color(0xFF2563EB)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("Annuler", style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
          ),
          ElevatedButton(
            onPressed: () {
              final code = _tokenInputController.text.trim();
              Navigator.pop(ctx);
              if (code.isNotEmpty) {
                _verifyAndEnroll(code);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF2563EB),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 0,
            ),
            child: const Text("Valider", style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  /// Vérification et Scellement de l'Appareil
  Future<void> _verifyAndEnroll(String rawToken) async {
    setState(() => _isProcessing = true);

    try {
      String cleanToken = rawToken.trim();
      if (cleanToken.startsWith('{') && cleanToken.endsWith('}')) {
        try {
          final decoded = jsonDecode(cleanToken);
          if (decoded['token'] != null) cleanToken = decoded['token'];
        } catch (_) {}
      }

      final device = await _securityService.getDeviceMetadata();
      final session = await _syncService.enrollWithToken(cleanToken, device.deviceId, device.model);

      if (mounted) {
        _showBindingSuccess(session, device.model);
      }
    } catch (e) {
      if (mounted) {
        _showError(e.toString().replaceAll("Exception: ", ""));
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  Future<void> _triggerManualReverseCheck() async {
    if (_myDeviceId == null) return;
    setState(() => _isCheckingReverse = true);

    final session = await _syncService.checkReverseEnrollment(_myDeviceId!);
    if (mounted) {
      setState(() => _isCheckingReverse = false);
      if (session != null) {
        _showBindingSuccess(session, _myDeviceModel ?? "Smartphone");
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("En attente : le responsable n'a pas encore validé votre smartphone sur son portail."),
            backgroundColor: Color(0xFFF59E0B),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _showBindingSuccess(EmployeeSession session, String deviceModel) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
        title: const Row(
          children: [
            Icon(Icons.verified_rounded, color: Color(0xFF10B981), size: 30),
            SizedBox(width: 10),
            Text(
              "Appareil Scellé !",
              style: TextStyle(
                color: Color(0xFF0F172A),
                fontWeight: FontWeight.w900,
                fontSize: 18,
                letterSpacing: -0.3,
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Bienvenue, ${session.fullName} !",
              style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w800, fontSize: 16),
            ),
            const SizedBox(height: 6),
            const Text(
              "Votre smartphone est désormais relié de manière sécurisée et inaltérable à votre compte collaborateur.",
              style: TextStyle(color: Color(0xFF64748B), fontSize: 12.5),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildSuccessRow("Collaborateur :", session.fullName),
                  const SizedBox(height: 5),
                  _buildSuccessRow("Matricule :", session.matricule),
                  const SizedBox(height: 5),
                  _buildSuccessRow("Établissement :", session.establishmentName),
                  const SizedBox(height: 5),
                  _buildSuccessRow("Appareil Lié :", deviceModel),
                ],
              ),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(builder: (context) => MainNavigationScreen(session: session)),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF2563EB),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              elevation: 0,
            ),
            child: const Text("Accéder à Mon Espace", style: TextStyle(fontWeight: FontWeight.w800)),
          ),
        ],
      ),
    );
  }

  Widget _buildSuccessRow(String label, String value) {
    return Row(
      children: [
        Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 11.5, fontWeight: FontWeight.bold)),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(color: Color(0xFF0F172A), fontSize: 12.5, fontWeight: FontWeight.w700),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: const Color(0xFFEF4444),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F7FD), // Soft Bento Light Background
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 6),

              // 1. Hero Header Bleu Royal Vibrant
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF1D4ED8), Color(0xFF2563EB), Color(0xFF3B82F6)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(28),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF2563EB).withValues(alpha: 0.32),
                      blurRadius: 22,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Container(
                      width: 58,
                      height: 58,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.1),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: const Center(
                        child: Icon(Icons.fingerprint_rounded, color: Color(0xFF2563EB), size: 36),
                      ),
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      "PointagePro Enterprise",
                      style: TextStyle(
                        fontSize: 21,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      "Authentification & Enrôlement Sécurisé 2026",
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.88), fontSize: 12),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // 2. Sélecteur d'Onglets Segmenté Blanc (Style Bento)
              Container(
                padding: const EdgeInsets.all(5),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF1E3A8A).withValues(alpha: 0.05),
                      blurRadius: 12,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    _buildTabItem(index: 0, title: "Scanner QR", icon: Icons.qr_code_scanner_rounded),
                    _buildTabItem(index: 1, title: "Saisie Code", icon: Icons.pin_outlined),
                    _buildTabItem(index: 2, title: "Mode Inverse", icon: Icons.qr_code_2_rounded),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // 3. Contenu de l'onglet sélectionné
              if (_isProcessing)
                Container(
                  padding: const EdgeInsets.all(28),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: const Column(
                    children: [
                      CircularProgressIndicator(color: Color(0xFF2563EB)),
                      SizedBox(height: 16),
                      Text(
                        "Vérification du compte et scellement du smartphone...",
                        style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 13),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                )
              else if (_selectedModeIndex == 0)
                _buildScannerTab()
              else if (_selectedModeIndex == 1)
                _buildManualTokenTab()
              else
                _buildReverseEnrollmentTab(),

              const SizedBox(height: 26),

              // 4. Badge de Sécurité Inaltérable
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF1E3A8A).withValues(alpha: 0.04),
                      blurRadius: 10,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.shield_rounded, color: Color(0xFF10B981), size: 16),
                    SizedBox(width: 8),
                    Text(
                      "Sécurité Satellite UTC • Détection Faux-GPS active",
                      style: TextStyle(color: Color(0xFF64748B), fontSize: 11.5, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTabItem({required int index, required String title, required IconData icon}) {
    final isSelected = _selectedModeIndex == index;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() {
            _selectedModeIndex = index;
          });
          if (index == 2) {
            _startReverseEnrollmentPolling();
          } else {
            _reverseEnrollPollingTimer?.cancel();
          }
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFF2563EB) : Colors.transparent,
            borderRadius: BorderRadius.circular(14),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: const Color(0xFF2563EB).withValues(alpha: 0.25),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 16,
                color: isSelected ? Colors.white : const Color(0xFF64748B),
              ),
              const SizedBox(width: 5),
              Text(
                title,
                style: TextStyle(
                  color: isSelected ? Colors.white : const Color(0xFF64748B),
                  fontSize: 11.5,
                  fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildScannerTab() {
    return Column(
      children: [
        // Carte Principale Scanner
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(26),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF1E3A8A).withValues(alpha: 0.06),
                blurRadius: 18,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Column(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: const Center(
                  child: Icon(Icons.qr_code_scanner_rounded, color: Color(0xFF2563EB), size: 30),
                ),
              ),
              const SizedBox(height: 14),
              const Text(
                "Scanner l'Invitation Gérant",
                style: TextStyle(
                  color: Color(0xFF0F172A),
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                "Pointez votre appareil vers le QR code affiché sur le portail administrateur de votre entreprise.",
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton.icon(
                  onPressed: _startCameraScanner,
                  icon: const Icon(Icons.camera_alt_rounded, size: 20),
                  label: const Text("Ouvrir la Caméra", style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // Raccourci Galerie WhatsApp
        InkWell(
          onTap: _importFromGallery,
          borderRadius: BorderRadius.circular(20),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF1E3A8A).withValues(alpha: 0.04),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Center(
                    child: Icon(Icons.photo_library_rounded, color: Color(0xFF10B981), size: 20),
                  ),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Importer depuis la Galerie",
                        style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w800, fontSize: 13),
                      ),
                      SizedBox(height: 1),
                      Text(
                        "Pour les invitations reçues sur WhatsApp",
                        style: TextStyle(color: Color(0xFF64748B), fontSize: 11),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right_rounded, color: Color(0xFF94A3B8)),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildManualTokenTab() {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(26),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1E3A8A).withValues(alpha: 0.06),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Activation par Code Clé",
            style: TextStyle(color: Color(0xFF0F172A), fontSize: 16, fontWeight: FontWeight.w900, letterSpacing: -0.3),
          ),
          const SizedBox(height: 4),
          const Text(
            "Entrez le jeton fourni par votre responsable (ex : PPRO-302667 ou 302667) :",
            style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _tokenInputController,
            style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w800, letterSpacing: 1.5),
            decoration: InputDecoration(
              hintText: "PPRO-302667",
              hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
              filled: true,
              fillColor: const Color(0xFFF8FAFC),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.8),
              ),
              prefixIcon: const Icon(Icons.pin_rounded, color: Color(0xFF2563EB)),
            ),
          ),
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: () {
                final code = _tokenInputController.text.trim();
                if (code.isNotEmpty) {
                  _verifyAndEnroll(code);
                } else {
                  _showError("Veuillez saisir votre code d'activation.");
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 0,
              ),
              child: const Text("Activer ce Smartphone", style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReverseEnrollmentTab() {
    final qrPayload = jsonEncode({
      "mode": "POINTAGE_REVERSE_ENROLL",
      "device_id": _myDeviceId ?? "UNKNOWN_DEVICE",
      "model": _myDeviceModel ?? "Smartphone",
      "app": "PointagePro",
    });

    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(26),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1E3A8A).withValues(alpha: 0.06),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        children: [
          const Text(
            "Faites Scanner votre Téléphone",
            style: TextStyle(
              color: Color(0xFF0F172A),
              fontSize: 16,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.3,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),
          const Text(
            "Présentez ce QR code à votre superviseur sur son portail d'administration pour qu'il vous lie instantanément.",
            style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 18),

          // QR Code généré via qr_flutter
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: QrImageView(
              data: qrPayload,
              version: QrVersions.auto,
              size: 190.0,
            ),
          ),

          const SizedBox(height: 14),

          // ID Appareil
          Text(
            "ID Téléphone : ${_myDeviceId ?? 'En cours...'}",
            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5, fontFamily: 'monospace'),
          ),

          const SizedBox(height: 16),

          // Bouton Vérification Manuelle
          OutlinedButton.icon(
            onPressed: _isCheckingReverse ? null : _triggerManualReverseCheck,
            icon: _isCheckingReverse
                ? const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF2563EB)),
                  )
                : const Icon(Icons.refresh_rounded, size: 16),
            label: const Text("Vérifier si j'ai été validé", style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold)),
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFF2563EB),
              side: const BorderSide(color: Color(0xFF2563EB)),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            ),
          ),
        ],
      ),
    );
  }
}

class _CameraScanScreen extends StatefulWidget {
  final Function(String) onDetected;
  final VoidCallback onManualFallback;

  const _CameraScanScreen({
    required this.onDetected,
    required this.onManualFallback,
  });

  @override
  State<_CameraScanScreen> createState() => _CameraScanScreenState();
}

class _CameraScanScreenState extends State<_CameraScanScreen> {
  late final MobileScannerController _scannerController;
  bool _hasDetected = false;

  @override
  void initState() {
    super.initState();
    _scannerController = MobileScannerController(
      detectionSpeed: DetectionSpeed.normal,
      facing: CameraFacing.back,
      torchEnabled: false,
      autoStart: true,
    );
  }

  @override
  void dispose() {
    _scannerController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        title: const Text("Scannez le QR Code Gérant", style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: ValueListenableBuilder(
              valueListenable: _scannerController,
              builder: (context, state, child) {
                return Icon(
                  state.torchState == TorchState.on ? Icons.flash_on : Icons.flash_off,
                  color: Colors.white,
                );
              },
            ),
            onPressed: () => _scannerController.toggleTorch(),
          ),
          IconButton(
            icon: const Icon(Icons.flip_camera_android, color: Colors.white),
            onPressed: () => _scannerController.switchCamera(),
          ),
        ],
      ),
      body: Stack(
        children: [
          MobileScanner(
            controller: _scannerController,
            errorBuilder: (context, error, child) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.camera_alt_outlined, color: Color(0xFFF87171), size: 48),
                      const SizedBox(height: 12),
                      const Text(
                        "Accès Caméra Requis",
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        "Veuillez autoriser l'accès à la caméra pour scanner votre invitation QR.",
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton.icon(
                        onPressed: () => _scannerController.start(),
                        icon: const Icon(Icons.refresh),
                        label: const Text("Réessayer"),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF2563EB),
                          foregroundColor: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: () {
                          Navigator.pop(context);
                          widget.onManualFallback();
                        },
                        child: const Text("Saisir mon code manuellement", style: TextStyle(color: Color(0xFF60A5FA))),
                      ),
                    ],
                  ),
                ),
              );
            },
            onDetect: (capture) {
              if (_hasDetected) return;
              final List<Barcode> barcodes = capture.barcodes;
              for (final barcode in barcodes) {
                if (barcode.rawValue != null) {
                  _hasDetected = true;
                  Navigator.pop(context);
                  widget.onDetected(barcode.rawValue!);
                  break;
                }
              }
            },
          ),
          Center(
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                border: Border.all(color: const Color(0xFF2563EB), width: 3),
                borderRadius: BorderRadius.circular(24),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
