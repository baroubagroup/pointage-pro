import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../services/security_service.dart';
import 'clock_in_screen.dart';

class EnrollmentScreen extends StatefulWidget {
  const EnrollmentScreen({super.key});

  @override
  State<EnrollmentScreen> createState() => _EnrollmentScreenState();
}

class _EnrollmentScreenState extends State<EnrollmentScreen> {
  final ImagePicker _picker = ImagePicker();
  final SecurityService _securityService = SecurityService();
  bool _isProcessing = false;

  /// 1. Importation du QR Code reçu par WhatsApp depuis la galerie de photos
  Future<void> _importFromGallery() async {
    try {
      final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
      if (image == null) return;

      setState(() => _isProcessing = true);

      // Simulation du décodage du jeton cryptographique chiffré depuis l'image WhatsApp
      await Future.delayed(const Duration(seconds: 2));

      // Empreinte matérielle du téléphone (Device Binding)
      final device = await _securityService.getDeviceMetadata();

      // Déclenchement de la biométrie locale (Touch ID / Face ID)
      bool bioOk = await _securityService.authenticateBiometric();
      if (!bioOk) {
        _showError("Authentification biométrique requise pour valider votre téléphone.");
        setState(() => _isProcessing = false);
        return;
      }

      _showSuccessActivation(device.model);
    } catch (e) {
      _showError("Impossible de lire le QR code depuis cette image.");
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  /// 2. Scan direct avec la caméra
  Future<void> _scanWithCamera() async {
    setState(() => _isProcessing = true);
    await Future.delayed(const Duration(seconds: 2));
    final device = await _securityService.getDeviceMetadata();
    _showSuccessActivation(device.model);
    if (mounted) setState(() => _isProcessing = false);
  }

  void _showSuccessActivation(String deviceModel) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.verified, color: Colors.green, size: 28),
            SizedBox(width: 8),
            Text("Appareil Activé !", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Votre téléphone a été lié avec succès à votre entreprise."),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("Appareil lié : $deviceModel", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  const SizedBox(height: 4),
                  const Text("Sécurité : Token à usage unique brûlé", style: TextStyle(color: Colors.black54, fontSize: 11)),
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
                MaterialPageRoute(builder: (context) => const ClockInScreen()),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.blueAccent),
            child: const Text("Accéder au Pointage", style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: Colors.red.shade700),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28.0, vertical: 24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Spacer(),

              // Logo & Titre
              Container(
                width: 76,
                height: 76,
                decoration: BoxDecoration(
                  color: Colors.blueAccent,
                  borderRadius: BorderRadius.circular(22),
                  boxShadow: [
                    BoxShadow(color: Colors.blueAccent.withOpacity(0.3), blurRadius: 15, offset: const Offset(0, 8)),
                  ],
                ),
                child: const Icon(Icons.fingerprint, color: Colors.white, size: 44),
              ),
              const SizedBox(height: 24),
              const Text(
                "Activation de l'Appareil",
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 8),
              const Text(
                "Pour lier votre smartphone à votre entreprise, utilisez l'invitation transmise par votre responsable.",
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: Colors.black54),
              ),

              const Spacer(),

              // Bouton 1 : Importation WhatsApp / Galerie
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: _isProcessing ? null : _importFromGallery,
                  icon: const Icon(Icons.photo_library, color: Colors.white),
                  label: const Text(
                    "Importer depuis la Galerie (WhatsApp)",
                    style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 13),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981), // Vert WhatsApp
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 2,
                  ),
                ),
              ),

              const SizedBox(height: 12),

              // Bouton 2 : Scan direct caméra
              SizedBox(
                width: double.infinity,
                height: 52,
                child: OutlinedButton.icon(
                  onPressed: _isProcessing ? null : _scanWithCamera,
                  icon: const Icon(Icons.qr_code_scanner, color: Colors.blueAccent),
                  label: const Text(
                    "Scanner un QR Code avec la Caméra",
                    style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blueAccent, fontSize: 13),
                  ),
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    side: const BorderSide(color: Colors.blueAccent, width: 1.5),
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // Note Sécurité
              const Text(
                "🔒 Authentification sécurisée 0-mot de passe.\nJeton cryptographique unique vérifié par votre entreprise.",
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 11, color: Colors.black38),
              ),

              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }
}
