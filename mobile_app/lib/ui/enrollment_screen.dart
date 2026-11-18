import 'dart:async';
import 'dart:convert';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:app_links/app_links.dart';
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

  int _selectedModeIndex = 0; // 0: Scanner, 1: Matricule/Organisation, 2: Mode Inverse
  bool _isProcessing = false;
  final TextEditingController _tokenInputController = TextEditingController();
  final TextEditingController _orgCodeController = TextEditingController(text: "ORG-8492");
  final TextEditingController _matriculeController = TextEditingController();
  final TextEditingController _secretController = TextEditingController();
  bool _showTokenFallback = false;

  // Mode Inverse
  String? _myDeviceId;
  String? _myDeviceModel;
  Timer? _reverseEnrollPollingTimer;
  bool _isCheckingReverse = false;

  // Deep Linking AppLinks
  late final AppLinks _appLinks;
  StreamSubscription<Uri>? _linkSubscription;

  @override
  void initState() {
    super.initState();
    _loadDeviceMetadata();
    _initDeepLinks();
  }

  Future<void> _initDeepLinks() async {
    _appLinks = AppLinks();

    // 1. Initial Link (Cold Start)
    try {
      final initialUri = await _appLinks.getInitialLink();
      if (initialUri != null) {
        _handleIncomingUri(initialUri);
      }
    } catch (e) {
      debugPrint("DeepLink initial error: $e");
    }

    // 2. Stream de liens (Warm Start)
    _linkSubscription = _appLinks.uriLinkStream.listen((uri) {
      _handleIncomingUri(uri);
    }, onError: (err) {
      debugPrint("DeepLink stream error: $err");
    });
  }

  void _handleIncomingUri(Uri uri) {
    debugPrint("Incoming Deep Link captured: $uri");
    final token = uri.queryParameters['token'];
    final org = uri.queryParameters['org'];
    final mat = uri.queryParameters['mat'];

    if (token != null && token.isNotEmpty) {
      if (mounted) {
        setState(() {
          _tokenInputController.text = token;
          if (org != null && org.isNotEmpty) _orgCodeController.text = org;
          if (mat != null && mat.isNotEmpty) _matriculeController.text = mat;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.auto_awesome, color: Colors.amber),
                const SizedBox(width: 8),
                Expanded(child: Text("Lien Magique détecté : $token")),
              ],
            ),
            backgroundColor: const Color(0xFF1E293B),
            duration: const Duration(seconds: 3),
          ),
        );

        // Lancement immédiat de la vérification et de l'enrôlement
        _verifyAndEnroll(token);
      }
    } else if (org != null && mat != null) {
      if (mounted) {
        setState(() {
          _selectedModeIndex = 1;
          _orgCodeController.text = org;
          _matriculeController.text = mat;
        });
      }
    }
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
    _linkSubscription?.cancel();
    _reverseEnrollPollingTimer?.cancel();
    _tokenInputController.dispose();
    _orgCodeController.dispose();
    _matriculeController.dispose();
    _secretController.dispose();
    super.dispose();
  }

  /// 1. Scan direct avec la Caméra
  Future<void> _startCameraScanner() async {
    // Demande proactive au niveau du système Android
    PermissionStatus status = await Permission.camera.status;
    if (!status.isGranted && !status.isPermanentlyDenied) {
      status = await Permission.camera.request();
    }
    if (!mounted) return;

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (ctx) => _CameraScanScreen(
          initialPermission: status,
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

      // Décodage automatique du QR Code depuis la photo sélectionnée
      final controller = MobileScannerController();
      final BarcodeCapture? capture = await controller.analyzeImage(image.path);
      controller.dispose();

      if (capture != null && capture.barcodes.isNotEmpty) {
        final raw = capture.barcodes.first.rawValue;
        if (raw != null && raw.trim().isNotEmpty) {
          _verifyAndEnroll(raw.trim());
          return;
        }
      }

      _showManualTokenDialog(
        title: "Code de votre Invitation",
        subtitle: "QR Code non décodé automatiquement. Renseignez le code d'activation figurant sur votre carton ou message (ex: PPRO-302667) :",
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

  /// Enrôlement 2FA Sécurisé : Code Établissement + Matricule Officiel + Secret
  Future<void> _verifyAndEnrollWithOrgAndMatricule() async {
    final orgCode = _orgCodeController.text.trim();
    final matricule = _matriculeController.text.trim();
    final secret = _secretController.text.trim();

    if (orgCode.isEmpty) {
      _showError("Veuillez renseigner le Code de votre Établissement (ex: ORG-8492).");
      return;
    }
    if (matricule.isEmpty) {
      _showError("Veuillez renseigner votre Matricule officiel.");
      return;
    }

    setState(() => _isProcessing = true);
    try {
      final device = await _securityService.getDeviceMetadata();
      final session = await _syncService.enrollWithOrganizationAndMatricule(
        rawOrgCode: orgCode,
        rawMatricule: matricule,
        rawSecret: secret,
        deviceId: device.deviceId,
        deviceModel: device.model,
      );

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
                    _buildTabItem(index: 1, title: "Mon Établissement", icon: Icons.domain_rounded),
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
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: OutlinedButton.icon(
                  onPressed: () {
                    setState(() {
                      _selectedModeIndex = 1;
                    });
                  },
                  icon: const Icon(Icons.pin_outlined, size: 18),
                  label: const Text(
                    "Saisir mon Code Manuellement",
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF2563EB),
                    side: const BorderSide(color: Color(0xFFDBEAFE), width: 1.5),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              ),

              const SizedBox(height: 16),
              Row(
                children: [
                  const Expanded(child: Divider(color: Color(0xFFE2E8F0))),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    child: Text(
                      "OU ACTIVATION EXPRESS",
                      style: TextStyle(color: const Color(0xFF94A3B8), fontSize: 10.5, fontWeight: FontWeight.w800),
                    ),
                  ),
                  const Expanded(child: Divider(color: Color(0xFFE2E8F0))),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _tokenInputController,
                      style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w800, fontSize: 13, letterSpacing: 1.2),
                      decoration: InputDecoration(
                        hintText: "PPRO-302667",
                        hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
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
                          borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5),
                        ),
                        prefixIcon: const Icon(Icons.vpn_key_rounded, size: 18, color: Color(0xFF2563EB)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: () {
                      final code = _tokenInputController.text.trim();
                      if (code.isNotEmpty) {
                        _verifyAndEnroll(code);
                      } else {
                        _showError("Veuillez saisir votre code d'activation (ex: PPRO-302667).");
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      elevation: 0,
                    ),
                    child: const Text("Activer", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  ),
                ],
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
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Center(
                  child: Icon(Icons.domain_rounded, color: Color(0xFF2563EB), size: 20),
                ),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Rejoindre mon Établissement",
                      style: TextStyle(color: Color(0xFF0F172A), fontSize: 16, fontWeight: FontWeight.w900, letterSpacing: -0.3),
                    ),
                    Text(
                      "Enrôlement 2FA sans scan de QR Code",
                      style: TextStyle(color: Color(0xFF64748B), fontSize: 11),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 18),

          // 1. Code Établissement Multi-Tenant
          const Text(
            "CODE ÉTABLISSEMENT / ORGANISATION",
            style: TextStyle(color: Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.5),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _orgCodeController,
            textCapitalization: TextCapitalization.characters,
            style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w900, letterSpacing: 1.2, fontSize: 14),
            decoration: InputDecoration(
              hintText: "ORG-8492",
              hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
              filled: true,
              fillColor: const Color(0xFFF8FAFC),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
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
              prefixIcon: const Icon(Icons.business_rounded, color: Color(0xFF2563EB), size: 20),
            ),
          ),

          const SizedBox(height: 14),

          // 2. Matricule Officiel
          const Text(
            "VOTRE MATRICULE OFFICIEL",
            style: TextStyle(color: Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.5),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _matriculeController,
            textCapitalization: TextCapitalization.characters,
            style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w800, letterSpacing: 1.0, fontSize: 14),
            decoration: InputDecoration(
              hintText: "Ex : MAT-2026-001 ou OUA-2026-001",
              hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
              filled: true,
              fillColor: const Color(0xFFF8FAFC),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
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
              prefixIcon: const Icon(Icons.badge_rounded, color: Color(0xFF2563EB), size: 20),
            ),
          ),

          const SizedBox(height: 14),

          // 3. Secret Personnel 2FA Anti-Usurpation
          const Text(
            "VÉRIFICATION D'IDENTITÉ PERSONNELLE (SECRET)",
            style: TextStyle(color: Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.5),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _secretController,
            style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w700, fontSize: 13),
            decoration: InputDecoration(
              hintText: "Date de naissance (JJ/MM/AAAA) ou 4 derniers chiffres tél",
              hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11.5),
              filled: true,
              fillColor: const Color(0xFFF8FAFC),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
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
              prefixIcon: const Icon(Icons.lock_person_rounded, color: Color(0xFF10B981), size: 20),
            ),
          ),
          const SizedBox(height: 5),
          const Text(
            "* Protège votre compte contre toute tentative de liaison par un tiers.",
            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5, fontStyle: FontStyle.italic),
          ),

          const SizedBox(height: 20),

          // Bouton d'Action Principal
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: _verifyAndEnrollWithOrgAndMatricule,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 0,
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.verified_user_rounded, size: 18),
                  SizedBox(width: 8),
                  Text("Vérifier & Lier ce Smartphone", style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Option de bascule Jeton Brut PPRO
          Center(
            child: TextButton(
              onPressed: () {
                setState(() {
                  _showTokenFallback = !_showTokenFallback;
                });
              },
              child: Text(
                _showTokenFallback ? "▲ Masquer la saisie par jeton direct" : "▼ Ou activer avec un Jeton Brut (ex: PPRO-302667)",
                style: const TextStyle(color: Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.bold),
              ),
            ),
          ),

          if (_showTokenFallback) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _tokenInputController,
                    style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w800, fontSize: 12),
                    decoration: InputDecoration(
                      hintText: "PPRO-302667",
                      filled: true,
                      fillColor: const Color(0xFFF1F5F9),
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: () {
                    final code = _tokenInputController.text.trim();
                    if (code.isNotEmpty) {
                      _verifyAndEnroll(code);
                    } else {
                      _showError("Veuillez renseigner un jeton.");
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0F172A),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    elevation: 0,
                  ),
                  child: const Text("Activer", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ],
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
  final PermissionStatus? initialPermission;
  final Function(String) onDetected;
  final VoidCallback onManualFallback;

  const _CameraScanScreen({
    this.initialPermission,
    required this.onDetected,
    required this.onManualFallback,
  });

  @override
  State<_CameraScanScreen> createState() => _CameraScanScreenState();
}

class _CameraScanScreenState extends State<_CameraScanScreen> with WidgetsBindingObserver {
  MobileScannerController? _scannerController;
  CameraController? _nativeCamController;
  Timer? _nativeCamScanTimer;
  bool _isNativeScanning = false;
  bool _useNativeCameraFallback = false;
  bool _isSwitchingToNative = false;

  bool _hasDetected = false;
  bool _isPermissionGranted = false;
  bool _isPermanentlyDenied = false;
  bool _isLoading = true;
  String? _errorMessage;
  final TextEditingController _inlineTokenController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    if (widget.initialPermission != null) {
      _handlePermissionResult(widget.initialPermission!);
    } else {
      _requestCameraPermission();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _nativeCamScanTimer?.cancel();
    _nativeCamController?.dispose();
    _scannerController?.dispose();
    _inlineTokenController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && !_isPermissionGranted) {
      _checkPermissionSilently();
    }
  }

  Future<void> _checkPermissionSilently() async {
    final status = await Permission.camera.status;
    if (status.isGranted) {
      _handlePermissionResult(status);
    }
  }

  void _handlePermissionResult(PermissionStatus status) {
    if (status.isGranted) {
      setState(() {
        _isPermissionGranted = true;
        _isPermanentlyDenied = false;
        _isLoading = false;
        _errorMessage = null;
      });
      _startScanner();
    } else if (status.isPermanentlyDenied) {
      setState(() {
        _isPermissionGranted = false;
        _isPermanentlyDenied = true;
        _isLoading = false;
      });
    } else {
      setState(() {
        _isPermissionGranted = false;
        _isPermanentlyDenied = false;
        _isLoading = false;
      });
    }
  }

  Future<void> _requestCameraPermission() async {
    setState(() => _isLoading = true);
    final status = await Permission.camera.request();
    if (!mounted) return;
    _handlePermissionResult(status);
  }

  void _startScanner() {
    _nativeCamScanTimer?.cancel();
    _nativeCamController?.dispose();
    _nativeCamController = null;
    _scannerController?.dispose();

    _scannerController = MobileScannerController(
      detectionSpeed: DetectionSpeed.normal,
      facing: CameraFacing.back,
      torchEnabled: false,
      autoStart: true,
    );
  }

  /// Bascule automatique vers le moteur caméra standard CameraController
  Future<void> _startNativeCameraFallback() async {
    if (_isSwitchingToNative) return;
    _isSwitchingToNative = true;
    _scannerController?.dispose();
    _scannerController = null;

    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        if (mounted) {
          setState(() {
            _isSwitchingToNative = false;
            _errorMessage = "Aucun capteur caméra détecté sur cet appareil.";
          });
        }
        return;
      }

      final backCamera = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );

      _nativeCamController = CameraController(
        backCamera,
        ResolutionPreset.medium,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );

      await _nativeCamController!.initialize();
      if (!mounted) return;

      setState(() {
        _useNativeCameraFallback = true;
        _isSwitchingToNative = false;
        _errorMessage = null;
      });

      // Analyse automatique de trame toutes les 1.2 secondes
      _nativeCamScanTimer?.cancel();
      _nativeCamScanTimer = Timer.periodic(const Duration(milliseconds: 1200), (_) {
        _captureAndAnalyzeNativeFrame();
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSwitchingToNative = false;
          _errorMessage = "Impossible d'initialiser l'appareil photo : $e";
        });
      }
    }
  }

  Future<void> _captureAndAnalyzeNativeFrame() async {
    if (_hasDetected || _isNativeScanning || _nativeCamController == null || !_nativeCamController!.value.isInitialized) {
      return;
    }
    _isNativeScanning = true;
    if (mounted) setState(() {});

    try {
      final XFile photo = await _nativeCamController!.takePicture();
      final controller = MobileScannerController();
      final capture = await controller.analyzeImage(photo.path);
      controller.dispose();

      if (capture != null && capture.barcodes.isNotEmpty) {
        final raw = capture.barcodes.first.rawValue;
        if (raw != null && raw.trim().isNotEmpty && mounted) {
          _hasDetected = true;
          _nativeCamScanTimer?.cancel();
          Navigator.pop(context);
          widget.onDetected(raw.trim());
          return;
        }
      }
    } catch (_) {
      // Ignorer les erreurs d'une trame individuelle
    } finally {
      if (mounted) {
        setState(() {
          _isNativeScanning = false;
        });
      }
    }
  }

  Future<void> _importGalleryFromScanner() async {
    try {
      final picker = ImagePicker();
      final image = await picker.pickImage(source: ImageSource.gallery);
      if (image == null) return;

      final controller = MobileScannerController();
      final capture = await controller.analyzeImage(image.path);
      controller.dispose();

      if (capture != null && capture.barcodes.isNotEmpty) {
        final raw = capture.barcodes.first.rawValue;
        if (raw != null && raw.trim().isNotEmpty && mounted) {
          Navigator.pop(context);
          widget.onDetected(raw.trim());
          return;
        }
      }
      if (mounted) {
        Navigator.pop(context);
        widget.onManualFallback();
      }
    } catch (_) {
      if (mounted) {
        Navigator.pop(context);
        widget.onManualFallback();
      }
    }
  }

  Widget _buildPermissionDeniedView() {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: const Color(0xFF334155)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.5),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444).withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Center(
                  child: Icon(Icons.camera_alt_outlined, color: Color(0xFFF87171), size: 34),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                "Accès Caméra Requis",
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 17, letterSpacing: -0.3),
              ),
              const SizedBox(height: 8),
              Text(
                _isPermanentlyDenied
                    ? "L'accès à l'appareil photo a été bloqué par Android. Veuillez l'activer dans les paramètres de votre téléphone pour scanner l'invitation."
                    : "L'application a besoin d'accéder à l'appareil photo pour scanner le QR Code d'invitation de votre entreprise.",
                textAlign: TextAlign.center,
                style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12.5, height: 1.4),
              ),
              const SizedBox(height: 20),

              if (_isPermanentlyDenied) ...[
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: () => openAppSettings(),
                    icon: const Icon(Icons.settings_outlined, size: 20),
                    label: const Text("Ouvrir les Paramètres Téléphone", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 0,
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  "Activez 'Appareil photo' puis revenez sur l'application.",
                  style: TextStyle(color: Color(0xFF64748B), fontSize: 11),
                ),
              ] else ...[
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: _requestCameraPermission,
                    icon: const Icon(Icons.refresh_rounded, size: 20),
                    label: const Text("Autoriser la Caméra", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 0,
                    ),
                  ),
                ),
              ],

              const SizedBox(height: 20),
              Row(
                children: [
                  const Expanded(child: Divider(color: Color(0xFF334155))),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    child: Text(
                      "OU ACTIVEZ SANS CAMÉRA",
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ),
                  const Expanded(child: Divider(color: Color(0xFF334155))),
                ],
              ),
              const SizedBox(height: 16),

              // Saisie directe du code dans cette modale
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF334155)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "Saisie directe de votre Code Clé :",
                      style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _inlineTokenController,
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, letterSpacing: 1.2),
                            decoration: const InputDecoration(
                              hintText: "PPRO-302667",
                              hintStyle: TextStyle(color: Colors.white24, fontSize: 12),
                              border: InputBorder.none,
                              isDense: true,
                              contentPadding: EdgeInsets.symmetric(vertical: 8),
                            ),
                          ),
                        ),
                        ElevatedButton(
                          onPressed: () {
                            final text = _inlineTokenController.text.trim();
                            if (text.isNotEmpty) {
                              Navigator.pop(context);
                              widget.onDetected(text);
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF10B981),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Text("Valider", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 12),

              // Raccourci Galerie WhatsApp
              SizedBox(
                width: double.infinity,
                height: 44,
                child: OutlinedButton.icon(
                  onPressed: _importGalleryFromScanner,
                  icon: const Icon(Icons.photo_library_outlined, size: 18),
                  label: const Text("Choisir une image dans la Galerie", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Color(0xFF475569)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),

              const SizedBox(height: 10),

              TextButton(
                onPressed: () {
                  Navigator.pop(context);
                  widget.onManualFallback();
                },
                child: const Text("Annuler et revenir à l'accueil", style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildScanOverlay() {
    return IgnorePointer(
      child: Center(
        child: Container(
          width: 250,
          height: 250,
          decoration: BoxDecoration(
            border: Border.all(color: const Color(0xFF2563EB), width: 3),
            borderRadius: BorderRadius.circular(24),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                margin: const EdgeInsets.only(top: 8),
                height: 3,
                width: 180,
                decoration: BoxDecoration(
                  color: const Color(0xFF60A5FA),
                  borderRadius: BorderRadius.circular(2),
                  boxShadow: [
                    BoxShadow(color: const Color(0xFF60A5FA).withValues(alpha: 0.8), blurRadius: 6),
                  ],
                ),
              ),
              const Padding(
                padding: EdgeInsets.only(bottom: 12),
                child: Text(
                  "Alignez le QR code du gérant",
                  style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFloatingBottomBar() {
    return Row(
      children: [
        Expanded(
          child: ElevatedButton.icon(
            onPressed: () {
              Navigator.pop(context);
              widget.onManualFallback();
            },
            icon: const Icon(Icons.keyboard_outlined, size: 18),
            label: const Text("Saisir mon Code", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: const Color(0xFF0F172A),
              elevation: 4,
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
          ),
        ),
        const SizedBox(width: 10),
        ElevatedButton(
          onPressed: _importGalleryFromScanner,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF1E293B),
            foregroundColor: Colors.white,
            elevation: 4,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
          child: const Icon(Icons.photo_library_rounded, size: 20),
        ),
      ],
    );
  }

  Widget _buildMobileScannerView() {
    return Stack(
      children: [
        MobileScanner(
          controller: _scannerController!,
          errorBuilder: (context, error, child) {
            if (error.errorCode == MobileScannerErrorCode.permissionDenied) {
              return _buildPermissionDeniedView();
            }
            // En cas d'erreur de flux direct (CameraX / MLKit), basculer automatiquement sur la caméra standard
            WidgetsBinding.instance.addPostFrameCallback((_) {
              _startNativeCameraFallback();
            });
            return const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(color: Color(0xFF2563EB)),
                  SizedBox(height: 14),
                  Text("Bascule vers le capteur caméra standard...", style: TextStyle(color: Colors.white, fontSize: 13)),
                ],
              ),
            );
          },
          onDetect: (capture) {
            if (_hasDetected) return;
            final List<Barcode> barcodes = capture.barcodes;
            for (final barcode in barcodes) {
              if (barcode.rawValue != null && barcode.rawValue!.trim().isNotEmpty) {
                _hasDetected = true;
                Navigator.pop(context);
                widget.onDetected(barcode.rawValue!.trim());
                break;
              }
            }
          },
        ),
        _buildScanOverlay(),
        Positioned(
          bottom: 24,
          left: 16,
          right: 16,
          child: _buildFloatingBottomBar(),
        ),
      ],
    );
  }

  Widget _buildNativeCameraView() {
    if (_nativeCamController == null || !_nativeCamController!.value.isInitialized) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(color: Color(0xFF2563EB)),
            const SizedBox(height: 16),
            const Text("Démarrage du capteur photo...", style: TextStyle(color: Colors.white70, fontSize: 13)),
            if (_errorMessage != null) ...[
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(_errorMessage!, textAlign: TextAlign.center, style: const TextStyle(color: Color(0xFFF87171), fontSize: 12)),
              ),
            ],
          ],
        ),
      );
    }

    return Stack(
      children: [
        Positioned.fill(
          child: CameraPreview(_nativeCamController!),
        ),
        _buildScanOverlay(),
        Positioned(
          bottom: 24,
          left: 16,
          right: 16,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton.icon(
                  onPressed: _isNativeScanning ? null : _captureAndAnalyzeNativeFrame,
                  icon: _isNativeScanning
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.qr_code_scanner_rounded, size: 22),
                  label: Text(
                    _isNativeScanning ? "Analyse en cours..." : "Scanner ce QR Code",
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    elevation: 6,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              _buildFloatingBottomBar(),
            ],
          ),
        ),
      ],
    );
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
          // Bouton bascule de mode caméra manuel
          if (_isPermissionGranted)
            IconButton(
              icon: Icon(
                _useNativeCameraFallback ? Icons.videocam_rounded : Icons.photo_camera_rounded,
                color: const Color(0xFF60A5FA),
              ),
              tooltip: _useNativeCameraFallback ? "Passer en mode Flux Continu" : "Passer en mode Caméra Standard",
              onPressed: () {
                if (_useNativeCameraFallback) {
                  setState(() => _useNativeCameraFallback = false);
                  _startScanner();
                } else {
                  _startNativeCameraFallback();
                }
              },
            ),
          if (!_useNativeCameraFallback && _scannerController != null) ...[
            IconButton(
              icon: ValueListenableBuilder(
                valueListenable: _scannerController!,
                builder: (context, state, child) {
                  return Icon(
                    state.torchState == TorchState.on ? Icons.flash_on : Icons.flash_off,
                    color: Colors.white,
                  );
                },
              ),
              onPressed: () => _scannerController!.toggleTorch(),
            ),
            IconButton(
              icon: const Icon(Icons.flip_camera_android, color: Colors.white),
              onPressed: () => _scannerController!.switchCamera(),
            ),
          ],
        ],
      ),
      body: _isLoading
          ? const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(color: Color(0xFF2563EB)),
                  SizedBox(height: 16),
                  Text("Vérification de la caméra...", style: TextStyle(color: Colors.white70, fontSize: 13)),
                ],
              ),
            )
          : (!_isPermissionGranted)
              ? _buildPermissionDeniedView()
              : _useNativeCameraFallback
                  ? _buildNativeCameraView()
                  : _buildMobileScannerView(),
    );
  }
}
