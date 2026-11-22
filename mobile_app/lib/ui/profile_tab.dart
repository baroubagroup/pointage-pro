import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import '../models/employee_session.dart';
import '../services/face_recognition_service.dart';
import '../services/offline_sync_service.dart';
import '../services/update_service.dart';
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
  bool _isCheckingUpdate = false;

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
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          title: const Row(
            children: [
              Icon(Icons.lock_rounded, color: Color(0xFFEF4444)),
              SizedBox(width: 8),
              Text(
                "Quota Atteint",
                style: TextStyle(color: Color(0xFF0F172A), fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          content: const Text(
            "Vous avez utilisé la totalité de vos 2 modifications de signature faciale. Pour des motifs stricts de sécurité anti-usurpation, toute nouvelle mise à jour doit être débloquée par votre Responsable RH.",
            style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
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
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Color(0xFFF59E0B), size: 26),
            SizedBox(width: 8),
            Text(
              "Dissocier l'Appareil ?",
              style: TextStyle(color: Color(0xFF0F172A), fontSize: 17, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: const Text(
          "Cette action réinitialisera votre session locale. Pour pointer à nouveau, vous devrez scanner ou saisir une nouvelle invitation fournie par votre gérant.",
          style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text("Annuler", style: TextStyle(color: Color(0xFF64748B))),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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
      backgroundColor: const Color(0xFFF4F7FD), // Soft Bento background
      appBar: AppBar(
        backgroundColor: const Color(0xFFF4F7FD),
        elevation: 0,
        title: const Text(
          "Mon Profil Collaborateur",
          style: TextStyle(
            color: Color(0xFF0F172A),
            fontWeight: FontWeight.w800,
            fontSize: 18,
            letterSpacing: -0.4,
          ),
        ),
        centerTitle: false,
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 120), // 120 bottom for floating pill nav
        child: Column(
          children: [
            // Carte Héros Collaborateur (Cobalt / Bento)
            Container(
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
                    color: const Color(0xFF2563EB).withValues(alpha: 0.28),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 58,
                    height: 58,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.1),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        _currentSession.initials,
                        style: const TextStyle(
                          color: Color(0xFF1D4ED8),
                          fontWeight: FontWeight.w900,
                          fontSize: 20,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _currentSession.fullName,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                            fontSize: 17,
                            letterSpacing: -0.3,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          _currentSession.role,
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.85),
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            "Matricule : ${_currentSession.matricule}",
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontFamily: 'monospace',
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Carte Établissement de Rattachement
            _buildBentoSectionCard(
              title: "Établissement & Géofencing",
              icon: Icons.business_rounded,
              iconColor: const Color(0xFF2563EB),
              children: [
                _buildDetailRow(
                  icon: Icons.location_on_rounded,
                  label: "Site Assigné",
                  value: _currentSession.establishmentName,
                  accentColor: const Color(0xFF10B981),
                ),
                _buildDetailRow(
                  icon: Icons.radar_rounded,
                  label: "Rayon Géofence Autorisé",
                  value: "${(_currentSession.establishmentRadius ?? 120.0).toStringAsFixed(0)} mètres",
                  accentColor: const Color(0xFF3B82F6),
                ),
                _buildDetailRow(
                  icon: Icons.phone_android_rounded,
                  label: "Smartphone Lié",
                  value: _currentSession.deviceModel ?? 'Smartphone Lié',
                  accentColor: const Color(0xFF8B5CF6),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Carte Horaires & Planning Personnalisé
            _buildBentoSectionCard(
              title: "Planning & Horaires Fractionnés",
              icon: Icons.schedule_rounded,
              iconColor: const Color(0xFFF59E0B),
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _currentSession.scheduleName,
                        style: const TextStyle(
                          color: Color(0xFF0F172A),
                          fontWeight: FontWeight.w800,
                          fontSize: 13.5,
                        ),
                      ),
                      const SizedBox(height: 8),
                      // Jours d'activité
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          _buildDayChip(1, "Lun"),
                          _buildDayChip(2, "Mar"),
                          _buildDayChip(3, "Mer"),
                          _buildDayChip(4, "Jeu"),
                          _buildDayChip(5, "Ven"),
                          _buildDayChip(6, "Sam"),
                          _buildDayChip(7, "Dim"),
                        ],
                      ),
                    ],
                  ),
                ),
                const Divider(height: 16, indent: 16, endIndent: 16),
                _buildDetailRow(
                  icon: Icons.wb_sunny_rounded,
                  label: "Créneau Matin",
                  value: "${_currentSession.morningStart} → ${_currentSession.morningEnd}",
                  accentColor: const Color(0xFFF59E0B),
                ),
                _buildDetailRow(
                  icon: Icons.coffee_rounded,
                  label: "Pause Déjeuner",
                  value: "${_currentSession.lunchStart} → ${_currentSession.lunchEnd}",
                  accentColor: const Color(0xFF3B82F6),
                ),
                _buildDetailRow(
                  icon: Icons.nights_stay_rounded,
                  label: "Créneau Après-midi",
                  value: "${_currentSession.afternoonStart} → ${_currentSession.afternoonEnd}",
                  accentColor: const Color(0xFF6366F1),
                ),
                _buildDetailRow(
                  icon: Icons.timelapse_rounded,
                  label: "Tolérance Retard",
                  value: "+${_currentSession.toleranceMinutes} minutes accordées",
                  accentColor: const Color(0xFF10B981),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Carte Biométrie Faciale & Quota
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF1E3A8A).withValues(alpha: 0.05),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.face_retouching_natural_rounded, color: Color(0xFF2563EB), size: 20),
                          SizedBox(width: 8),
                          Text(
                            "Signature Faciale Biométrique",
                            style: TextStyle(
                              color: Color(0xFF0F172A),
                              fontWeight: FontWeight.w800,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          _currentSession.faceEmbeddingVector != null ? "Actif & Certifié" : "Non configuré",
                          style: const TextStyle(
                            color: Color(0xFF10B981),
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    "Votre signature faciale est calculée en mémoire vive (RAM) et permet de vous authentifier sans mot de passe si vous utilisez l'appareil d'un collègue.",
                    style: TextStyle(color: Color(0xFF64748B), fontSize: 11.5, height: 1.4),
                  ),
                  const SizedBox(height: 14),

                  // Quota anti-fraude
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "Quota anti-usurpation :",
                          style: TextStyle(color: Color(0xFF64748B), fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                        Text(
                          "${_currentSession.faceUpdateCount}/2 modifications",
                          style: TextStyle(
                            color: _currentSession.faceUpdateCount >= 2 ? const Color(0xFFEF4444) : const Color(0xFF2563EB),
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 14),

                  // Bouton Mettre à jour avec Caméra
                  SizedBox(
                    width: double.infinity,
                    height: 46,
                    child: OutlinedButton.icon(
                      onPressed: _isUpdatingFace ? null : _handleUpdateFaceSignature,
                      icon: const Icon(Icons.camera_alt_outlined, size: 17),
                      label: Text(
                        _currentSession.faceUpdateCount >= 2
                            ? "Quota de modifications épuisé"
                            : "Prendre mon selfie biométrique",
                        style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold),
                      ),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: _currentSession.faceUpdateCount >= 2 ? const Color(0xFF94A3B8) : const Color(0xFF2563EB),
                        side: BorderSide(
                          color: _currentSession.faceUpdateCount >= 2 ? const Color(0xFFE2E8F0) : const Color(0xFF2563EB),
                        ),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Carte Protections Cryptographiques
            _buildBentoSectionCard(
              title: "Protections Cryptographiques Actives",
              icon: Icons.shield_rounded,
              iconColor: const Color(0xFF10B981),
              children: const [
                Padding(
                  padding: EdgeInsets.all(16),
                  child: Column(
                    children: [
                      _SecurityTile(
                        title: "Horloge Satellite Atomique UTC",
                        desc: "Inaltérable même en cas de modification manuelle de l'heure du smartphone.",
                        icon: Icons.satellite_alt_rounded,
                      ),
                      SizedBox(height: 12),
                      _SecurityTile(
                        title: "Bouclier Anti-Faux GPS",
                        desc: "Détection active et blocage systématique des faux emplacements (Mock Locations).",
                        icon: Icons.radar_rounded,
                      ),
                      SizedBox(height: 12),
                      _SecurityTile(
                        title: "Liaison Unique 1 Téléphone = 1 Collaborateur",
                        desc: "Empêche formellement le pointage de complaisance pour un tiers.",
                        icon: Icons.phonelink_lock_rounded,
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Carte Mises à Jour & Maintenance Logicielle
            _buildBentoSectionCard(
              title: "Mises à Jour & Maintenance Logicielle",
              icon: Icons.system_update_rounded,
              iconColor: const Color(0xFF2563EB),
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                "Version Logiciel",
                                style: TextStyle(
                                  color: Color(0xFF64748B),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                "v${UpdateService.currentAppVersion} • Build ${UpdateService.currentVersionCode}",
                                style: const TextStyle(
                                  color: Color(0xFF0F172A),
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFFECFDF5),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: const Color(0xFFA7F3D0)),
                            ),
                            child: const Text(
                              "STABLE",
                              style: TextStyle(
                                color: Color(0xFF059669),
                                fontWeight: FontWeight.w900,
                                fontSize: 10,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          const Icon(Icons.business_rounded, color: Color(0xFF64748B), size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              "Établissement : ${_currentSession.orgName} (${_currentSession.orgCode})",
                              style: const TextStyle(
                                color: Color(0xFF475569),
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        height: 46,
                        child: ElevatedButton.icon(
                          onPressed: _isCheckingUpdate
                              ? null
                              : () async {
                                  setState(() => _isCheckingUpdate = true);
                                  await UpdateService().checkForUpdate(
                                    context: context,
                                    showFeedbackIfLatest: true,
                                  );
                                  if (mounted) setState(() => _isCheckingUpdate = false);
                                },
                          icon: _isCheckingUpdate
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : const Icon(Icons.sync_rounded, size: 18),
                          label: Text(
                            _isCheckingUpdate ? "Recherche en cours..." : "Rechercher une mise à jour",
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF2563EB),
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Bouton Déconnexion / Dissociation
            SizedBox(
              width: double.infinity,
              height: 50,
              child: OutlinedButton.icon(
                onPressed: () => _handleLogout(context),
                icon: const Icon(Icons.logout_rounded, color: Color(0xFFEF4444), size: 18),
                label: const Text(
                  "Dissocier ce Téléphone / Déconnexion",
                  style: TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.w800, fontSize: 13),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFFFCA5A5), width: 1.2),
                  backgroundColor: const Color(0xFFFEF2F2),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBentoSectionCard({
    required String title,
    required IconData icon,
    required Color iconColor,
    required List<Widget> children,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1E3A8A).withValues(alpha: 0.05),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 8),
            child: Row(
              children: [
                Icon(icon, color: iconColor, size: 20),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: const TextStyle(
                    color: Color(0xFF0F172A),
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                    letterSpacing: -0.2,
                  ),
                ),
              ],
            ),
          ),
          ...children,
        ],
      ),
    );
  }

  Widget _buildDayChip(int dayNumber, String label) {
    final bool isActive = _currentSession.workingDays.contains(dayNumber);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: isActive ? const Color(0xFF2563EB) : const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: isActive ? Colors.white : const Color(0xFF94A3B8),
          fontSize: 11,
          fontWeight: FontWeight.bold,
        ),
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
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: accentColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: accentColor, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(color: Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 1),
                Text(
                  value,
                  style: const TextStyle(
                    color: Color(0xFF0F172A),
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
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
        const Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 18),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(color: Color(0xFF0F172A), fontSize: 12.5, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 2),
              Text(
                desc,
                style: const TextStyle(color: Color(0xFF64748B), fontSize: 11, height: 1.3),
              ),
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
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
      child: Padding(
        padding: const EdgeInsets.all(22),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              "Enrôlement Biométrique Facial",
              style: TextStyle(
                color: Color(0xFF0F172A),
                fontWeight: FontWeight.w900,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              "Placez votre visage au centre du cadre pour enregistrer votre signature en RAM",
              textAlign: TextAlign.center,
              style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
            ),
            const SizedBox(height: 18),
            ClipRRect(
              borderRadius: BorderRadius.circular(22),
              child: SizedBox(
                width: 220,
                height: 220,
                child: _isInit && _cameraController != null
                    ? CameraPreview(_cameraController!)
                    : const Center(child: CircularProgressIndicator(color: Color(0xFF2563EB))),
              ),
            ),
            if (_errorMessage != null) ...[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFFCA5A5)),
                ),
                child: Text(
                  _errorMessage!,
                  style: const TextStyle(color: Color(0xFFDC2626), fontSize: 11.5, fontWeight: FontWeight.w600),
                  textAlign: TextAlign.center,
                ),
              ),
            ],
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text("Annuler", style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
                ),
                const SizedBox(width: 10),
                ElevatedButton.icon(
                  onPressed: _isInit && !_isProcessing ? _captureAndAnalyze : null,
                  icon: _isProcessing
                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Icon(Icons.camera_alt, size: 16),
                  label: Text(_isProcessing ? "Analyse..." : "Prendre mon selfie"),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
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
