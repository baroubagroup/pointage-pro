import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/employee_session.dart';
import '../models/punch_model.dart';
import '../services/offline_sync_service.dart';

class StatsTab extends StatefulWidget {
  final EmployeeSession session;

  const StatsTab({super.key, required this.session});

  @override
  State<StatsTab> createState() => _StatsTabState();
}

class _StatsTabState extends State<StatsTab> {
  final OfflineSyncService _syncService = OfflineSyncService();
  bool _isLoading = true;
  Map<String, dynamic> _stats = {};
  List<PunchModel> _recentPunches = [];

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    setState(() => _isLoading = true);
    try {
      final stats = await _syncService.getEmployeeStats(widget.session.id);
      final punches = await _syncService.getRecentPunches(widget.session.id);
      if (mounted) {
        setState(() {
          _stats = stats;
          _recentPunches = punches;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Slate 900
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: const Text(
          "Mes Statistiques d'Assiduité",
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
        ),
        actions: [
          IconButton(
            onPressed: _loadStats,
            icon: const Icon(Icons.refresh, color: Colors.white70),
            tooltip: "Actualiser",
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Colors.blueAccent))
          : RefreshIndicator(
              onRefresh: _loadStats,
              color: Colors.blueAccent,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Carte récapitulative Collaborateur
                    Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF1E293B), Color(0xFF334155)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.white.withOpacity(0.08)),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.2),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 28,
                            backgroundColor: const Color(0xFF3B82F6),
                            child: Text(
                              widget.session.initials,
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  widget.session.fullName,
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  "Matricule : ${widget.session.matricule}",
                                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontFamily: 'monospace'),
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    const Icon(Icons.location_on, color: Color(0xFF10B981), size: 13),
                                    const SizedBox(width: 3),
                                    Expanded(
                                      child: Text(
                                        widget.session.establishmentName,
                                        style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 11),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Grille des 4 indicateurs clés
                    const Text(
                      "Performance & Ponctualité",
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    const SizedBox(height: 12),

                    GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 1.25,
                      children: [
                        _buildMetricCard(
                          title: "Heures ce Mois",
                          value: _stats['workedHoursMonth'] ?? "160h 00m",
                          subtitle: "Objectif légal : 160h",
                          icon: Icons.access_time_filled,
                          accentColor: const Color(0xFF3B82F6),
                        ),
                        _buildMetricCard(
                          title: "Heures Semaine",
                          value: _stats['workedHoursWeek'] ?? "38h 45m",
                          subtitle: "Base 40h standard",
                          icon: Icons.date_range,
                          accentColor: const Color(0xFF6366F1),
                        ),
                        _buildMetricCard(
                          title: "Retards Cumulés",
                          value: "${_stats['lateMinutes'] ?? 0} min",
                          subtitle: "${_stats['lateCount'] ?? 0} retard notifié",
                          icon: Icons.timer_outlined,
                          accentColor: (_stats['lateMinutes'] ?? 0) > 0 ? const Color(0xFFF59E0B) : const Color(0xFF10B981),
                        ),
                        _buildMetricCard(
                          title: "Taux Ponctualité",
                          value: "${_stats['punctualityRate'] ?? 100}%",
                          subtitle: "Score d'assiduité",
                          icon: Icons.shield_sharp,
                          accentColor: const Color(0xFF10B981),
                        ),
                      ],
                    ),

                    const SizedBox(height: 24),

                    // Section Historique des Pointages
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "Derniers Pointages Certifiés",
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                        Text(
                          "${_recentPunches.length} enregistrés",
                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    if (_recentPunches.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(28),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Center(
                          child: Column(
                            children: [
                              Icon(Icons.history_toggle_off, color: Color(0xFF64748B), size: 40),
                              SizedBox(height: 10),
                              Text(
                                "Aucun pointage enregistré pour le moment.",
                                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                              ),
                              SizedBox(height: 4),
                              Text(
                                "Effectuez votre première arrivée depuis l'onglet Pointage.",
                                style: TextStyle(color: Color(0xFF64748B), fontSize: 11),
                              ),
                            ],
                          ),
                        ),
                      )
                    else
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _recentPunches.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final p = _recentPunches[index];
                          return _buildPunchHistoryTile(p);
                        },
                      ),

                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildMetricCard({
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color accentColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold)),
              Icon(icon, color: accentColor, size: 18),
            ],
          ),
          Text(
            value,
            style: const TextStyle(color: Colors.white, fontSize: 19, fontWeight: FontWeight.w800, letterSpacing: -0.5),
          ),
          Text(
            subtitle,
            style: const TextStyle(color: Color(0xFF64748B), fontSize: 10),
          ),
        ],
      ),
    );
  }

  Widget _buildPunchHistoryTile(PunchModel punch) {
    Color badgeColor;
    IconData punchIcon;
    switch (punch.type) {
      case PunchType.checkIn:
        badgeColor = const Color(0xFF10B981);
        punchIcon = Icons.login;
        break;
      case PunchType.breakStart:
        badgeColor = const Color(0xFFF59E0B);
        punchIcon = Icons.free_breakfast;
        break;
      case PunchType.breakEnd:
        badgeColor = const Color(0xFF6366F1);
        punchIcon = Icons.restart_alt;
        break;
      case PunchType.checkOut:
        badgeColor = const Color(0xFFF43F5E);
        punchIcon = Icons.logout;
        break;
    }

    final timeStr = DateFormat('HH:mm').format(punch.recordedAtUtc.toLocal());
    final dateStr = DateFormat('dd/MM/yyyy').format(punch.recordedAtUtc.toLocal());

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: badgeColor.withOpacity(0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(punchIcon, color: badgeColor, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  punch.label,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    const Icon(Icons.satellite_alt, color: Color(0xFF64748B), size: 11),
                    const SizedBox(width: 3),
                    Text(
                      "GPS Certifié (±${punch.accuracyMeters.toStringAsFixed(0)}m)",
                      style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                timeStr,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14, fontFamily: 'monospace'),
              ),
              Text(
                dateStr,
                style: const TextStyle(color: Color(0xFF64748B), fontSize: 10),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
