import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
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

  bool _isProcessing = false;
  final TextEditingController _tokenInputController = TextEditingController();

  @override
  void dispose() {
    _tokenInputController.dispose();
    super.dispose();
  }

  /// 1. Scan direct avec la Caméra
  void _startCameraScanner() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (ctx) => Scaffold(
          backgroundColor: Colors.black,
          appBar: AppBar(
            backgroundColor: Colors.black,
            title: const Text("Scannez votre QR Code", style: TextStyle(color: Colors.white, fontSize: 16)),
            leading: IconButton(
              icon: const Icon(Icons.arrow_back, color: Colors.white),
              onPressed: () => Navigator.pop(ctx),
            ),
          ),
          body: Stack(
            children: [
              MobileScanner(
                onDetect: (capture) {
                  final List<Barcode> barcodes = capture.barcodes;
                  for (final barcode in barcodes) {
                    final raw = barcode.rawValue;
                    if (raw != null && raw.isNotEmpty) {
                      Navigator.pop(ctx);
                      _verifyAndEnroll(raw);
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
                    border: Border.all(color: Colors.blueAccent, width: 3),
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
              ),
              const Positioned(
                bottom: 40,
                left: 20,
                right: 20,
                child: Text(
                  "Placez le QR Code fourni par votre gérant dans le cadre",
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white70, fontSize: 13),
                ),
              ),
            ],
          ),
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
        subtitle: "L'image a été importée. Si votre téléphone ne lit pas automatiquement les pixels, saisissez simplement le code d'activation (ex: PPRO-302667).",
      );
    } catch (e) {
      _showError("Impossible d'accéder à la galerie : $e");
    }
  }

  /// 3. Saisie Manuelle du Code d'Activation
  void _showManualTokenDialog({String? title, String? subtitle}) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        title: Text(
          title ?? "Saisir mon Code d'Activation",
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              subtitle ?? "Indiquez le code unique d'enrôlement figurant sur votre invitation (ex: PPRO-302667 ou 302667).",
              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _tokenInputController,
              autofocus: true,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, letterSpacing: 1),
              textCapitalization: TextCapitalization.characters,
              decoration: InputDecoration(
                filled: true,
                fillColor: const Color(0xFF0F172A),
                hintText: "PPRO-302667",
                hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFF334155)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFF3B82F6), width: 2),
                ),
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
              final token = _tokenInputController.text.trim();
              if (token.isNotEmpty) {
                Navigator.pop(ctx);
                _verifyAndEnroll(token);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF3B82F6),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text("Valider"),
          ),
        ],
      ),
    );
  }

  /// Procédure de vérification réelle auprès de Supabase
  Future<void> _verifyAndEnroll(String token) async {
    setState(() => _isProcessing = true);

    try {
      // 1. Empreinte matérielle du téléphone (Device Binding)
      final device = await _securityService.getDeviceMetadata();

      // 2. Biométrie locale (Touch ID / Face ID)
      bool bioOk = await _securityService.authenticateBiometric();
      if (!bioOk) {
        _showError("Authentification biométrique requise pour valider ce téléphone.");
        setState(() => _isProcessing = false);
        return;
      }

      // 3. Appel réel à Supabase pour valider le code d'activation
      final EmployeeSession session = await _syncService.enrollWithToken(
        token,
        device.deviceId,
        device.model,
      );

      _showSuccessActivation(session, device.model);
    } catch (e) {
      _showError(e.toString().replaceAll("Exception: ", ""));
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  void _showSuccessActivation(EmployeeSession session, String deviceModel) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: const Row(
          children: [
            Icon(Icons.verified, color: Color(0xFF10B981), size: 30),
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
            const SizedBox(height: 8),
            Text(
              "Votre smartphone est désormais associé de manière inaltérable à votre compte collaborateur.",
              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
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
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Spacer(),

              // Logo Empreinte & Gradient
              Container(
                width: 84,
                height: 84,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF3B82F6), Color(0xFF6366F1)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(26),
                  boxShadow: [
                    BoxShadow(color: const Color(0xFF3B82F6).withOpacity(0.35), blurRadius: 20, offset: const Offset(0, 8)),
                  ],
                ),
                child: const Icon(Icons.fingerprint, color: Colors.white, size: 50),
              ),

              const SizedBox(height: 24),

              const Text(
                "PointagePro Collaborateur",
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: -0.5),
              ),
              const SizedBox(height: 8),

              const Text(
                "Liez ce smartphone à votre profil employé pour activer le pointage satellite inaltérable.",
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13, height: 1.4),
              ),

              const SizedBox(height: 36),

              if (_isProcessing)
                const Column(
                  children: [
                    CircularProgressIndicator(color: Color(0xFF3B82F6)),
                    SizedBox(height: 14),
                    Text(
                      "Vérification du compte et scellement de l'appareil...",
                      style: TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                  ],
                )
              else ...[
                // Option 1 : Scanner QR Code
                _buildButton(
                  title: "Scanner le QR Code d'Activation",
                  subtitle: "Via l'appareil photo du smartphone",
                  icon: Icons.qr_code_scanner_rounded,
                  gradient: const [Color(0xFF2563EB), Color(0xFF3B82F6)],
                  onTap: _startCameraScanner,
                ),

                const SizedBox(height: 12),

                // Option 2 : Galerie WhatsApp
                _buildButton(
                  title: "Importer depuis la Galerie",
                  subtitle: "Image reçue par WhatsApp ou email",
                  icon: Icons.photo_library_rounded,
                  gradient: const [Color(0xFF0F766E), Color(0xFF14B8A6)],
                  onTap: _importFromGallery,
                ),

                const SizedBox(height: 12),

                // Option 3 : Saisie Manuelle du Code
                _buildButton(
                  title: "Saisir mon Code d'Activation",
                  subtitle: "Code à 6 chiffres (ex: PPRO-302667)",
                  icon: Icons.pin_outlined,
                  gradient: const [Color(0xFF334155), Color(0xFF475569)],
                  onTap: () => _showManualTokenDialog(),
                ),
              ],

              const Spacer(),

              const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.shield_outlined, color: Color(0xFF64748B), size: 14),
                  SizedBox(width: 6),
                  Text(
                    "Protocole Anti-Fraude • 1 Employé = 1 Smartphone",
                    style: TextStyle(color: Color(0xFF64748B), fontSize: 11),
                  ),
                ],
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildButton({
    required String title,
    required String subtitle,
    required IconData icon,
    required List<Color> gradient,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: gradient, begin: Alignment.topLeft, end: Alignment.bottomRight),
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(color: gradient.first.withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 4)),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: Colors.white, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 2),
                  Text(subtitle, style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 11)),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios, color: Colors.white70, size: 14),
          ],
        ),
      ),
    );
  }
}
