import 'package:flutter/material.dart';
import '../models/employee_session.dart';
import '../services/offline_sync_service.dart';
import 'enrollment_screen.dart';

class ProfileTab extends StatelessWidget {
  final EmployeeSession session;

  const ProfileTab({super.key, required this.session});

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
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
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
                  // Avatar
                  Container(
                    width: 78,
                    height: 78,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF3B82F6), Color(0xFF6366F1)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(color: const Color(0xFF3B82F6).withOpacity(0.35), blurRadius: 15, offset: const Offset(0, 5)),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        session.initials,
                        style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800),
                      ),
                    ),
                  ),

                  const SizedBox(height: 14),

                  Text(
                    session.fullName,
                    style: const TextStyle(color: Colors.white, fontSize: 19, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),

                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF3B82F6).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFF3B82F6).withOpacity(0.3)),
                    ),
                    child: Text(
                      session.displayRole,
                      style: const TextStyle(color: Color(0xFF60A5FA), fontSize: 11, fontWeight: FontWeight.bold),
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
                        "Matricule : ${session.matricule}",
                        style: const TextStyle(
                          color: Color(0xFFE2E8F0),
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          fontFamily: 'monospace',
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Détails Organisationnels
            _buildSectionHeader("Informations Professionnelles"),
            const SizedBox(height: 10),

            Container(
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: Colors.white.withOpacity(0.06)),
              ),
              child: Column(
                children: [
                  _buildDetailRow(
                    icon: Icons.business,
                    label: "Établissement / Site",
                    value: session.establishmentName,
                    accentColor: const Color(0xFF3B82F6),
                  ),
                  const Divider(color: Color(0xFF334155), height: 1),
                  _buildDetailRow(
                    icon: Icons.phone,
                    label: "Téléphone",
                    value: session.phone.isNotEmpty ? session.phone : "Non renseigné",
                    accentColor: const Color(0xFF10B981),
                  ),
                  const Divider(color: Color(0xFF334155), height: 1),
                  _buildDetailRow(
                    icon: Icons.security,
                    label: "Sécurité Matérielle",
                    value: "Appareil Mobile Scellé",
                    accentColor: const Color(0xFF6366F1),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Certifications Anti-Triche
            _buildSectionHeader("Protections Cryptographiques Actives"),
            const SizedBox(height: 10),

            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: Colors.white.withOpacity(0.06)),
              ),
              child: Column(
                children: [
                  _buildSecurityTile(
                    title: "Horloge Satellite Atomique UTC",
                    desc: "Inaltérable même en modifiant l'heure manuelle du téléphone.",
                    icon: Icons.satellite_alt,
                  ),
                  const SizedBox(height: 12),
                  _buildSecurityTile(
                    title: "Bouclier Anti-Faux GPS",
                    desc: "Détection active des applications d'usurpation (Mock Locations).",
                    icon: Icons.radar,
                  ),
                  const SizedBox(height: 12),
                  _buildSecurityTile(
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

  Widget _buildSecurityTile({
    required String title,
    required String desc,
    required IconData icon,
  }) {
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
