import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import '../models/employee_session.dart';
import '../services/face_recognition_service.dart';
import '../services/offline_sync_service.dart';
import 'enrollment_screen.dart';

class ProfileTab extends StatefulWidget {
  final EmployeeSession session;

  const ProfileTab({super.key, required this.session});

  @override
  State<ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends State<ProfileTab> {
  late EmployeeSession _currentSession;
  bool _isUpdatingFace = false;

  @override
  void initState() {
    super.initState();
    _currentSession = widget.session;
  }

  Future<void> _handleUpdateFaceSignature() async {
    if (_currentSession.faceUpdateCount >= 2) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: const Color(0xFF1E293B),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Row(
            children: [
              Icon(Icons.lock_rounded, color: Color(0xFFEF4444)),
              SizedBox(width: 8),
              Text("Quota Atteint", style: TextStyle(color: Colors.white, fontSize: 16)),
            ],
          ),
          content: const Text(
            "Vous avez utilisé la totalité de vos 2 modifications de signature faciale. Pour des motifs stricts de sécurité anti-usurpation, toute nouvelle mise à jour doit être débloquée par votre Responsable RH.",
            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
          ),
          actions: [
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx),
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF3B82F6)),
              child: const Text("Compris"),
            ),
          ],
        ),
      );
      return;
    }

    // Ouvrir le modal caméra réel
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => _FaceCaptureModal(
        onCaptureSuccess: (newVector) async {
          setState(() => _isUpdatingFace = true);
          final res = await OfflineSyncService().updateFaceSignature(
            employeeId: _currentSession.id,
            newVector: newVector,
            currentUpdateCount: _currentSession.faceUpdateCount,
          );
          if (mounted) {
            setState(() => _isUpdatingFace = false);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(res['message'] ?? ''),
                backgroundColor: res['success'] == true ? const Color(0xFF10B981) : const Color(0xFFEF4444),
              ),
            );
            if (res['success'] == true) {
              final updated = await OfflineSyncService().getStoredEmployeeSession();
              if (updated != null && mounted) {
                setState(() {
                  _currentSession = updated;
                });
              }
            }
          }
        },
      ),
    );
  }

  Future<void> _handleLogout(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Color(0xFFF59E0B), size: 26),
            SizedBox(width: 8),
            Text("Dissocier l'Appareil ?", style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.bold)),
          ],
        ),
        content: const Text(
          "Cette action réinitialisera votre session locale. Pour pointer à nouveau, vous devrez scanner ou saisir une nouvelle invitation fournie par votre gérant.",
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
              backgroundColor: const Color(0xFFEF4444),
              foregroundColor: Colors.white,
            ),
            child: const Text("Confirmer la Déconnexion"),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await OfflineSyncService().clearEmployeeSession();
      if (context.mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (context) => const EnrollmentScreen()),
          (route) => false,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0F1D),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A0F1D),
        elevation: 0,
        title: const Text(
          "Mon Profil Collaborateur",
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        child: Column(
          children: [
            // Grande Carte Profil Badge
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.25), blurRadius: 15, offset: const Offset(0, 8)),
                ],
              ),
              child: Column(
                children: [
                  Container(
                    width: 78,
                    height: 78,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF00F2FE), Color(0xFF4FACFE)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(color: const Color(0xFF38BDF8).withOpacity(0.35), blurRadius: 15, offset: const Offset(0, 5)),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        _currentSession.initials,
                        style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800),
                      ),
                    ),
                  ),

                  const SizedBox(height: 14),

                  Text(
                    _currentSession.fullName,
                    style: const TextStyle(color: Colors.white, fontSize: 19, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),

                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF38BDF8).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFF38BDF8).withOpacity(0.3)),
                    ),
                    child: Text(
                      _currentSession.displayRole,
                      style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),

                  const SizedBox(height: 16),
                  const Divider(color: Color(0xFF334155), height: 1),
                  const SizedBox(height: 16),

                  // Identifiant Unique Matricule
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.badge_outlined, color: Color(0xFF94A3B8), size: 16),
                      const SizedBox(width: 6),
                      Text(
                        "Matricule : ${_currentSession.matricule}",
                        style: const TextStyle(
                          color: Color(0xFFE2E8F0),
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Détails du Compte & Affectation
            _buildSectionHeader("Affectation & Planning de Travail"),
            const SizedBox(height: 10),

            Container(
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white.withOpacity(0.06)),
              ),
              child: Column(
                children: [
                  _buildDetailRow(
                    icon: Icons.business_rounded,
                    label: "Établissement Attribué",
                    value: _currentSession.establishmentName,
                    accentColor: const Color(0xFF38BDF8),
                  ),
                  const Divider(color: Color(0xFF334155), height: 1, indent: 56),
                  _buildDetailRow(
                    icon: Icons.calendar_today_rounded,
                    label: "Planning de Travail",
                    value: "${_currentSession.scheduleName} (${_currentSession.morningStart} - ${_currentSession.afternoonEnd})",
                    accentColor: const Color(0xFF10B981),
                  ),
                  const Divider(color: Color(0xFF334155), height: 1, indent: 56),
                  _buildDetailRow(
                    icon: Icons.phone_android_rounded,
                    label: "Numéro Enregistré",
                    value: _currentSession.phone.isNotEmpty ? _currentSession.phone : "+226 Enregistré",
                    accentColor: const Color(0xFF10B981),
                  ),
                  const Divider(color: Color(0xFF334155), height: 1, indent: 56),
                  _buildDetailRow(
                    icon: Icons.phonelink_lock_rounded,
                    label: "Appareil Matériel Lié",
                    value: _currentSession.deviceModel ?? "Smartphone Sécurisé",
                    accentColor: const Color(0xFFF59E0B),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Module Signature Faciale
            _buildSectionHeader("Biométrie & Dépannage Collègues"),
            const SizedBox(height: 10),

            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white.withOpacity(0.06)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.face_retouching_natural_rounded, color: Color(0xFF38BDF8), size: 20),
                          SizedBox(width: 8),
                          Text(
                            "Signature Faciale",
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withOpacity(0.15),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF10B981).withOpacity(0.3)),
                        ),
                        child: Text(
                          _currentSession.faceEmbeddingVector != null ? "Actif & Certifié" : "Non configuré",
                          style: const TextStyle(color: Color(0xFF10B981), fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    "Utilisée pour vous identifier en RAM si votre téléphone est en panne et que vous utilisez l'appareil d'un collègue.",
                    style: TextStyle(color: Colors.white.withOpacity(0.65), fontSize: 11, height: 1.4),
                  ),
                  const SizedBox(height: 12),

                  // Quota de modifications anti-fraude
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        "Quota anti-usurpation :",
                        style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                      ),
                      Text(
                        "${_currentSession.faceUpdateCount}/2 modifications",
                        style: TextStyle(
                          color: _currentSession.faceUpdateCount >= 2 ? const Color(0xFFEF4444) : const Color(0xFF38BDF8),
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Bouton Mettre à jour avec Caméra Réelle
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: _isUpdatingFace ? null : _handleUpdateFaceSignature,
                      icon: const Icon(Icons.camera_alt_outlined, size: 16),
                      label: Text(
                        _currentSession.faceUpdateCount >= 2
                            ? "Quota de modifications épuisé"
                            : "Prendre mon selfie biométrique",
                        style: const TextStyle(fontSize: 12),
                      ),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: _currentSession.faceUpdateCount >= 2 ? const Color(0xFF94A3B8) : const Color(0xFF38BDF8),
                        side: BorderSide(
                          color: _currentSession.faceUpdateCount >= 2 ? const Color(0xFF475569) : const Color(0xFF38BDF8),
                        ),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Certifications Cryptographiques
            _buildSectionHeader("Protections Cryptographiques Actives"),
            const SizedBox(height: 10),

            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: Colors.white.withOpacity(0.06)),
              ),
              child: const Column(
                children: [
                  _SecurityTile(
                    title: "Horloge Satellite Atomique UTC",
                    desc: "Inaltérable même en modifiant l'heure manuelle du téléphone.",
                    icon: Icons.satellite_alt,
                  ),
                  SizedBox(height: 12),
                  _SecurityTile(
                    title: "Bouclier Anti-Faux GPS",
                    desc: "Détection active des applications d'usurpation (Mock Locations).",
                    icon: Icons.radar,
                  ),
                  SizedBox(height: 12),
                  _SecurityTile(
                    title: "Liaison Unique 1 Appareil = 1 Collaborateur",
                    desc: "Interdiction du pointage de complaisance pour un tiers.",
                    icon: Icons.phonelink_lock,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 28),

            // Bouton Déconnexion
            SizedBox(
              width: double.infinity,
              height: 50,
              child: OutlinedButton.icon(
                onPressed: () => _handleLogout(context),
                icon: const Icon(Icons.logout, color: Color(0xFFEF4444), size: 18),
                label: const Text(
                  "Dissocier ce Téléphone / Déconnexion",
                  style: TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.bold, fontSize: 13),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFFEF4444), width: 1.2),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ),

            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Text(
        title,
        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
      ),
    );
  }

  Widget _buildDetailRow({
    required IconData icon,
    required String label,
    required String value,
    required Color accentColor,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: accentColor.withOpacity(0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: accentColor, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                const SizedBox(height: 2),
                Text(value, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SecurityTile extends StatelessWidget {
  final String title;
  final String desc;
  final IconData icon;

  const _SecurityTile({
    required this.title,
    required this.desc,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 16),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 2),
              Text(desc, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, height: 1.3)),
            ],
          ),
        ),
      ],
    );
  }
}

class _FaceCaptureModal extends StatefulWidget {
  final Function(String biometricVector) onCaptureSuccess;

  const _FaceCaptureModal({required this.onCaptureSuccess});

  @override
  State<_FaceCaptureModal> createState() => _FaceCaptureModalState();
}

class _FaceCaptureModalState extends State<_FaceCaptureModal> {
  CameraController? _cameraController;
  bool _isInit = false;
  bool _isProcessing = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _initCam();
  }

  Future<void> _initCam() async {
    try {
      final cameras = await availableCameras();
      if (cameras.isNotEmpty) {
        final front = cameras.firstWhere(
          (c) => c.lensDirection == CameraLensDirection.front,
          orElse: () => cameras.first,
        );
        _cameraController = CameraController(front, ResolutionPreset.medium, enableAudio: false);
        await _cameraController!.initialize();
        if (mounted) setState(() => _isInit = true);
      }
    } catch (e) {
      if (mounted) setState(() => _errorMessage = "Erreur caméra : $e");
    }
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    super.dispose();
  }

  Future<void> _captureAndAnalyze() async {
    if (_cameraController == null || !_cameraController!.value.isInitialized) return;
    setState(() {
      _isProcessing = true;
      _errorMessage = null;
    });

    try {
      final photo = await _cameraController!.takePicture();
      final bytes = await photo.readAsBytes();
      final result = await FaceRecognitionService().analyzeFaceImage(bytes);

      if (!result.isValidFace) {
        setState(() {
          _isProcessing = false;
          _errorMessage = result.errorMessage ?? "Visage non détecté.";
        });
        return;
      }

      widget.onCaptureSuccess(result.biometricVector);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      setState(() {
        _isProcessing = false;
        _errorMessage = "Erreur capture : $e";
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(0xFF0F172A),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              "Enrôlement Biométrique Facial",
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 6),
            const Text(
              "Placez votre visage au centre du cadre pour enregistrer votre signature",
              textAlign: TextAlign.center,
              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
            ),
            const SizedBox(height: 16),
            ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: SizedBox(
                width: 220,
                height: 220,
                child: _isInit && _cameraController != null
                    ? CameraPreview(_cameraController!)
                    : const Center(child: CircularProgressIndicator(color: Color(0xFF38BDF8))),
              ),
            ),
            if (_errorMessage != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  _errorMessage!,
                  style: const TextStyle(color: Color(0xFFF87171), fontSize: 11),
                  textAlign: TextAlign.center,
                ),
              ),
            ],
            const SizedBox(height: 18),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text("Annuler", style: TextStyle(color: Color(0xFF94A3B8))),
                ),
                const SizedBox(width: 8),
                ElevatedButton.icon(
                  onPressed: _isInit && !_isProcessing ? _captureAndAnalyze : null,
                  icon: _isProcessing
                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Icon(Icons.camera_alt, size: 16),
                  label: Text(_isProcessing ? "Analyse..." : "Prendre mon selfie"),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF38BDF8),
                    foregroundColor: const Color(0xFF0F172A),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
