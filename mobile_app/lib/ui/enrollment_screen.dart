import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
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
      print("Erreur metadata: $e");
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
        title: "Code de votre Invitation WhatsApp",
        subtitle: "Image importée. Saisissez le code d'activation figurant sur votre invitation (ex: PPRO-302667).",
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
        backgroundColor: const Color(0xFF1E293B),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: Row(
          children: [
            const Icon(Icons.vpn_key_rounded, color: Color(0xFF38BDF8), size: 24),
            const SizedBox(width: 8),
            Text(title, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(subtitle, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
            const SizedBox(height: 16),
            TextField(
              controller: _tokenInputController,
              autofocus: true,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, letterSpacing: 1.5),
              decoration: InputDecoration(
                hintText: "Ex : PPRO-302667",
                hintStyle: const TextStyle(color: Color(0xFF64748B), letterSpacing: 1),
                filled: true,
                fillColor: const Color(0xFF0F172A),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFF38BDF8), width: 1.5),
                ),
                prefixIcon: const Icon(Icons.qr_code, color: Color(0xFF38BDF8)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("Annuler", style: TextStyle(color: Color(0xFF94A3B8))),
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
              backgroundColor: const Color(0xFF38BDF8),
              foregroundColor: const Color(0xFF0F172A),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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
        backgroundColor: const Color(0xFF1E293B),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: const Row(
          children: [
            Icon(Icons.verified_rounded, color: Color(0xFF10B981), size: 30),
            SizedBox(width: 10),
            Text("Appareil Scellé !", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Bienvenue, ${session.fullName} !",
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 6),
            const Text(
              "Votre smartphone est désormais relié de manière sécurisée et inaltérable à votre compte collaborateur.",
              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildSuccessRow("Collaborateur :", session.fullName),
                  const SizedBox(height: 4),
                  _buildSuccessRow("Matricule :", session.matricule),
                  const SizedBox(height: 4),
                  _buildSuccessRow("Établissement :", session.establishmentName),
                  const SizedBox(height: 4),
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
              backgroundColor: const Color(0xFF10B981),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
            ),
            child: const Text("Accéder à Mon Espace", style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildSuccessRow(String label, String value) {
    return Row(
      children: [
        Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
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
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0F1D),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 10),

              // Logo Empreinte & Gradient
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF00F2FE), Color(0xFF4FACFE)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(color: const Color(0xFF00F2FE).withOpacity(0.3), blurRadius: 20, offset: const Offset(0, 8)),
                  ],
                ),
                child: const Icon(Icons.fingerprint, color: Colors.white, size: 48),
              ),

              const SizedBox(height: 20),

              const Text(
                "PointagePro Enterprise",
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5),
              ),
              const SizedBox(height: 6),

              const Text(
                "Activez votre compte pour démarrer le pointage satellite inaltérable.",
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
              ),

              const SizedBox(height: 24),

              // Sélecteur d'Onglets à 3 Modes
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    _buildTabItem(index: 0, title: "Scanner QR", icon: Icons.qr_code_scanner_rounded),
                    _buildTabItem(index: 1, title: "Code Clé", icon: Icons.pin_outlined),
                    _buildTabItem(index: 2, title: "Mode Inverse", icon: Icons.qr_code_2_rounded),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              if (_isProcessing)
                const Column(
                  children: [
                    CircularProgressIndicator(color: Color(0xFF38BDF8)),
                    SizedBox(height: 14),
                    Text(
                      "Vérification du compte et scellement du smartphone...",
                      style: TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                  ],
                )
              else if (_selectedModeIndex == 0)
                _buildScannerTab()
              else if (_selectedModeIndex == 1)
                _buildManualTokenTab()
              else
                _buildReverseEnrollmentTab(),

              const SizedBox(height: 30),

              // Badge de Sécurité Inaltérable
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withOpacity(0.06)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.shield_rounded, color: Color(0xFF38BDF8), size: 14),
                    SizedBox(width: 6),
                    Text(
                      "Sécurité Satellite UTC • Détection Faux-GPS active",
                      style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
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
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFF38BDF8) : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 16,
                color: isSelected ? const Color(0xFF0F172A) : const Color(0xFF94A3B8),
              ),
              const SizedBox(width: 6),
              Text(
                title,
                style: TextStyle(
                  color: isSelected ? const Color(0xFF0F172A) : const Color(0xFF94A3B8),
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
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
        ElevatedButton.icon(
          onPressed: _startCameraScanner,
          icon: const Icon(Icons.qr_code_scanner, size: 22),
          label: const Text("Scanner le QR Code Gérant", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF38BDF8),
            foregroundColor: const Color(0xFF0F172A),
            minimumSize: const Size(double.infinity, 52),
            elevation: 4,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: _importFromGallery,
          icon: const Icon(Icons.photo_library_outlined, size: 20),
          label: const Text("Importer depuis la Galerie", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          style: OutlinedButton.styleFrom(
            foregroundColor: Colors.white,
            side: BorderSide(color: Colors.white.withOpacity(0.2)),
            minimumSize: const Size(double.infinity, 50),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
        ),
      ],
    );
  }

  Widget _buildManualTokenTab() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Entrez votre Code ou Clé d'Enrôlement :",
            style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          const Text(
            "Exemple : PPRO-302667 ou simplement 302667",
            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _tokenInputController,
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, letterSpacing: 1.2),
            decoration: InputDecoration(
              hintText: "PPRO-302667",
              hintStyle: const TextStyle(color: Color(0xFF64748B)),
              filled: true,
              fillColor: const Color(0xFF0F172A),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: Color(0xFF38BDF8), width: 1.5),
              ),
              prefixIcon: const Icon(Icons.pin, color: Color(0xFF38BDF8)),
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () {
              final code = _tokenInputController.text.trim();
              if (code.isNotEmpty) {
                _verifyAndEnroll(code);
              } else {
                _showError("Veuillez saisir votre code d'activation.");
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF38BDF8),
              foregroundColor: const Color(0xFF0F172A),
              minimumSize: const Size(double.infinity, 48),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            child: const Text("Activer ce Smartphone", style: TextStyle(fontWeight: FontWeight.bold)),
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
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        children: [
          const Text(
            "Faites scanner votre téléphone par le Gérant",
            style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),
          const Text(
            "Présentez ce QR Code à votre responsable ou superviseur. En le scannant avec son appareil, il vous liera directement.",
            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),

          // QR Code généré via qr_flutter
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.3), blurRadius: 12),
              ],
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
            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontFamily: 'monospace'),
          ),

          const SizedBox(height: 14),

          // Bouton Vérification Manuelle
          OutlinedButton.icon(
            onPressed: _isCheckingReverse ? null : _triggerManualReverseCheck,
            icon: _isCheckingReverse
                ? const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF38BDF8)),
                  )
                : const Icon(Icons.refresh_rounded, size: 16),
            label: const Text("Vérifier si j'ai été validé", style: TextStyle(fontSize: 12)),
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFF38BDF8),
              side: const BorderSide(color: Color(0xFF38BDF8)),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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
        title: const Text("Scannez le QR Code Gérant", style: TextStyle(color: Colors.white, fontSize: 16)),
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
                          backgroundColor: const Color(0xFF38BDF8),
                          foregroundColor: const Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: () {
                          Navigator.pop(context);
                          widget.onManualFallback();
                        },
                        child: const Text("Saisir mon code manuellement", style: TextStyle(color: Color(0xFF38BDF8))),
                      ),
                    ],
                  ),
                ),
              );
            },
            onDetect: (capture) {
              if (_hasDetected) return;
              final barcodes = capture.barcodes;
              for (final barcode in barcodes) {
                final raw = barcode.rawValue;
                if (raw != null && raw.trim().isNotEmpty) {
                  _hasDetected = true;
                  Navigator.pop(context);
                  widget.onDetected(raw.trim());
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
                border: Border.all(color: const Color(0xFF38BDF8), width: 3),
                borderRadius: BorderRadius.circular(20),
              ),
            ),
          ),
          Positioned(
            bottom: 40,
            left: 20,
            right: 20,
            child: Column(
              children: [
                const Text(
                  "Placez le QR Code de votre invitation dans le cadre",
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white70, fontSize: 13),
                ),
                const SizedBox(height: 10),
                TextButton(
                  onPressed: () {
                    Navigator.pop(context);
                    widget.onManualFallback();
                  },
                  child: const Text(
                    "Vous préférez saisir votre code manuellement ?",
                    style: TextStyle(color: Color(0xFF38BDF8), fontSize: 12, decoration: TextDecoration.underline),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
