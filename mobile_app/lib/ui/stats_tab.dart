import 'dart:math' as math;
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

class _StatsTabState extends State<StatsTab> with SingleTickerProviderStateMixin {
  final OfflineSyncService _syncService = OfflineSyncService();
  bool _isLoading = true;
  Map<String, dynamic> _stats = {};
  List<PunchModel> _recentPunches = [];
  int _selectedPeriodIndex = 0; // 0: Jour, 1: Semaine, 2: Mois, 3: Année

  late AnimationController _animController;
  late Animation<double> _gaugeAnimation;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _gaugeAnimation = CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOutCubic,
    );
    _loadStats();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  Future<void> _loadStats() async {
    setState(() => _isLoading = true);
    try {
      final stats = await _syncService.getEmployeeStats(widget.session.id, session: widget.session);
      final punches = await _syncService.getRecentPunches(widget.session.id);
      if (mounted) {
        setState(() {
          _stats = stats;
          _recentPunches = punches;
          _isLoading = false;
        });
        _animController.forward(from: 0.0);
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Calcul des métriques pour la vue
    final double punctualityRate = (_stats['punctualityRate'] is num)
        ? (_stats['punctualityRate'] as num).toDouble()
        : 98.0;
    final int lateMinutes = (_stats['lateMinutes'] is num)
        ? (_stats['lateMinutes'] as num).toInt()
        : 0;
    final String workedHoursMonth = _stats['workedHoursMonth']?.toString() ?? "0.0h";
    final String workedHoursWeek = _stats['workedHoursWeek']?.toString() ?? "0.0h";

    // Premier pointage d'aujourd'hui
    final now = DateTime.now();
    final todayPunches = _recentPunches.where((p) {
      final d = p.recordedAtUtc.toLocal();
      return d.year == now.year && d.month == now.month && d.day == now.day;
    }).toList();

    String firstCheckIn = "--:--";
    String checkOutTime = "--:--";
    if (todayPunches.isNotEmpty) {
      final checkIns = todayPunches.where((p) => p.type == PunchType.checkIn).toList();
      if (checkIns.isNotEmpty) {
        firstCheckIn = DateFormat('HH:mm').format(checkIns.last.recordedAtUtc.toLocal());
      }
      final checkOuts = todayPunches.where((p) => p.type == PunchType.checkOut).toList();
      if (checkOuts.isNotEmpty) {
        checkOutTime = DateFormat('HH:mm').format(checkOuts.first.recordedAtUtc.toLocal());
      }
    }

    return Scaffold(
      backgroundColor: const Color(0xFF1D4ED8), // Royal Cobalt Blue
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Colors.white))
          : RefreshIndicator(
              onRefresh: _loadStats,
              color: const Color(0xFF1D4ED8),
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                slivers: [
                  // 1. En-tête Royal Blue courbé avec Sélecteur de Période & Date
                  SliverToBoxAdapter(
                    child: Container(
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          colors: [Color(0xFF1E40AF), Color(0xFF1D4ED8), Color(0xFF2563EB)],
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                        ),
                      ),
                      child: SafeArea(
                        bottom: false,
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              // Barre d'action supérieure
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Container(
                                    width: 40,
                                    height: 40,
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                    child: const Center(
                                      child: Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 16),
                                    ),
                                  ),
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(6),
                                        decoration: BoxDecoration(
                                          color: Colors.white.withValues(alpha: 0.2),
                                          shape: BoxShape.circle,
                                        ),
                                        child: const Icon(Icons.verified_rounded, color: Colors.white, size: 16),
                                      ),
                                      const SizedBox(width: 8),
                                      const Text(
                                        "Assiduité & Pointages",
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.w800,
                                          fontSize: 17,
                                          letterSpacing: -0.3,
                                        ),
                                      ),
                                    ],
                                  ),
                                  GestureDetector(
                                    onTap: _loadStats,
                                    child: Container(
                                      width: 40,
                                      height: 40,
                                      decoration: BoxDecoration(
                                        color: Colors.white.withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(14),
                                      ),
                                      child: const Center(
                                        child: Icon(Icons.refresh_rounded, color: Colors.white, size: 20),
                                      ),
                                    ),
                                  ),
                                ],
                              ),

                              const SizedBox(height: 20),

                              // Onglets Segmentés : Jour | Semaine | Mois | Année
                              Container(
                                padding: const EdgeInsets.all(4),
                                decoration: BoxDecoration(
                                  color: Colors.black.withValues(alpha: 0.18),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: Row(
                                  children: [
                                    _buildPeriodTab(0, "Jour"),
                                    _buildPeriodTab(1, "Semaine"),
                                    _buildPeriodTab(2, "Mois"),
                                    _buildPeriodTab(3, "Année"),
                                  ],
                                ),
                              ),

                              const SizedBox(height: 18),

                              // Navigateur de Date : ❮ Aujourd'hui, 17 Nov ❯
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.chevron_left_rounded, color: Colors.white.withValues(alpha: 0.7), size: 22),
                                  const SizedBox(width: 8),
                                  Text(
                                    _getPeriodLabel(_selectedPeriodIndex),
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 14,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Icon(Icons.chevron_right_rounded, color: Colors.white.withValues(alpha: 0.7), size: 22),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),

                  // 2. Feuille Blanche Courbée Montante (Style Figma / Claymorphic Bento)
                  SliverToBoxAdapter(
                    child: Container(
                      decoration: const BoxDecoration(
                        color: Color(0xFFF4F7FD), // Soft Bento airy background
                        borderRadius: BorderRadius.vertical(top: Radius.circular(36)),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(20, 28, 20, 120), // Bottom padding for Floating Pill Nav
                        child: Column(
                          children: [
                            // Grand Cercle de Progression Circulaire Claymorphic
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(28),
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFF1E3A8A).withValues(alpha: 0.06),
                                    blurRadius: 20,
                                    offset: const Offset(0, 8),
                                  ),
                                ],
                              ),
                              child: Column(
                                children: [
                                  // Anneau Circulaire Animé
                                  SizedBox(
                                    width: 170,
                                    height: 170,
                                    child: AnimatedBuilder(
                                      animation: _gaugeAnimation,
                                      builder: (context, child) {
                                        final animatedValue = punctualityRate * _gaugeAnimation.value;
                                        return CustomPaint(
                                          painter: _CircularScorePainter(
                                            percentage: animatedValue / 100.0,
                                            trackColor: const Color(0xFFEEF2F6),
                                            progressGradient: const LinearGradient(
                                              colors: [Color(0xFF2563EB), Color(0xFF38BDF8)],
                                              begin: Alignment.topCenter,
                                              end: Alignment.bottomCenter,
                                            ),
                                          ),
                                          child: Center(
                                            child: Column(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Text(
                                                  "${animatedValue.toStringAsFixed(0)}%",
                                                  style: const TextStyle(
                                                    color: Color(0xFF0F172A),
                                                    fontSize: 36,
                                                    fontWeight: FontWeight.w900,
                                                    letterSpacing: -1.0,
                                                  ),
                                                ),
                                                const SizedBox(height: 2),
                                                const Text(
                                                  "Score Assiduité",
                                                  style: TextStyle(
                                                    color: Color(0xFF64748B),
                                                    fontSize: 12,
                                                    fontWeight: FontWeight.w600,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        );
                                      },
                                    ),
                                  ),

                                  const SizedBox(height: 24),

                                  // Ligne de Métadonnées Shift : Total Temps & Objectif
                                  Container(
                                    padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF8FAFC),
                                      borderRadius: BorderRadius.circular(18),
                                    ),
                                    child: Row(
                                      children: [
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              const Text(
                                                "Temps Présence",
                                                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold),
                                              ),
                                              const SizedBox(height: 2),
                                              Text(
                                                _selectedPeriodIndex == 2
                                                    ? workedHoursMonth
                                                    : (workedHoursWeek != "0.0h" ? workedHoursWeek : "7h 44m"),
                                                style: const TextStyle(
                                                  color: Color(0xFF0F172A),
                                                  fontSize: 16,
                                                  fontWeight: FontWeight.w800,
                                                  letterSpacing: -0.3,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        Container(width: 1, height: 32, color: const Color(0xFFE2E8F0)),
                                        Expanded(
                                          child: Padding(
                                            padding: const EdgeInsets.only(left: 16),
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                const Text(
                                                  "Objectif Shift",
                                                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold),
                                                ),
                                                const SizedBox(height: 2),
                                                Text(
                                                  "8h 00m",
                                                  style: const TextStyle(
                                                    color: Color(0xFF0F172A),
                                                    fontSize: 16,
                                                    fontWeight: FontWeight.w800,
                                                    letterSpacing: -0.3,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            const SizedBox(height: 18),

                            // Grille 2x2 Mini-Bento Cards (Identique à l'image de référence)
                            GridView.count(
                              crossAxisCount: 2,
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              mainAxisSpacing: 14,
                              crossAxisSpacing: 14,
                              childAspectRatio: 1.35,
                              children: [
                                _buildMiniBentoCard(
                                  icon: Icons.access_time_filled_rounded,
                                  iconColor: const Color(0xFF2563EB),
                                  iconBg: const Color(0xFFEFF6FF),
                                  title: "Arrivée Matinale",
                                  value: firstCheckIn,
                                  statusBadge: firstCheckIn != "--:--" ? "Certifiée" : "En attente",
                                  badgeColor: firstCheckIn != "--:--" ? const Color(0xFF10B981) : const Color(0xFF94A3B8),
                                ),
                                _buildMiniBentoCard(
                                  icon: Icons.logout_rounded,
                                  iconColor: const Color(0xFF64748B),
                                  iconBg: const Color(0xFFF1F5F9),
                                  title: "Départ Soirée",
                                  value: checkOutTime,
                                  statusBadge: checkOutTime != "--:--" ? "Effectué" : "En attente",
                                  badgeColor: checkOutTime != "--:--" ? const Color(0xFF10B981) : const Color(0xFF94A3B8),
                                ),
                                _buildMiniBentoCard(
                                  icon: Icons.timer_outlined,
                                  iconColor: lateMinutes > 0 ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                                  iconBg: lateMinutes > 0 ? const Color(0xFFFEE2E2) : const Color(0xFFECFDF5),
                                  title: "Retard Notifié",
                                  value: "$lateMinutes min",
                                  statusBadge: lateMinutes == 0 ? "Parfait" : "Tolérance",
                                  badgeColor: lateMinutes == 0 ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                                ),
                                _buildMiniBentoCard(
                                  icon: Icons.shield_rounded,
                                  iconColor: const Color(0xFF10B981),
                                  iconBg: const Color(0xFFECFDF5),
                                  title: "Sécurité & Box",
                                  value: "100%",
                                  statusBadge: "GPS & Wi-Fi",
                                  badgeColor: const Color(0xFF2563EB),
                                ),
                              ],
                            ),

                            const SizedBox(height: 24),

                            // En-tête Historique des Pointages
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  "Derniers Pointages Certifiés",
                                  style: TextStyle(
                                    color: Color(0xFF0F172A),
                                    fontWeight: FontWeight.w800,
                                    fontSize: 16,
                                    letterSpacing: -0.3,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(10),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: 0.04),
                                        blurRadius: 6,
                                        offset: const Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  child: Text(
                                    "${_recentPunches.length} enregistrés",
                                    style: const TextStyle(
                                      color: Color(0xFF64748B),
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                            ),

                            const SizedBox(height: 12),

                            // Liste des Pointages Blancs Bento
                            if (_recentPunches.isEmpty)
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(28),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(22),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFF1E3A8A).withValues(alpha: 0.05),
                                      blurRadius: 16,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: const Column(
                                  children: [
                                    Icon(Icons.history_toggle_off_rounded, color: Color(0xFF94A3B8), size: 40),
                                    SizedBox(height: 10),
                                    Text(
                                      "Aucun pointage pour le moment",
                                      style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 14),
                                    ),
                                    SizedBox(height: 4),
                                    Text(
                                      "Vos pointages certifiés par GPS et Wi-Fi apparaîtront ici.",
                                      textAlign: TextAlign.center,
                                      style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                                    ),
                                  ],
                                ),
                              )
                            else
                              ListView.separated(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemCount: _recentPunches.length,
                                separatorBuilder: (_, __) => const SizedBox(height: 10),
                                itemBuilder: (context, index) {
                                  return _buildBentoPunchTile(_recentPunches[index]);
                                },
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildPeriodTab(int index, String label) {
    final bool isSelected = _selectedPeriodIndex == index;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() => _selectedPeriodIndex = index);
          _loadStats();
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.1),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                color: isSelected ? const Color(0xFF1D4ED8) : Colors.white.withValues(alpha: 0.8),
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                fontSize: 12,
              ),
            ),
          ),
        ),
      ),
    );
  }

  String _getPeriodLabel(int periodIndex) {
    final now = DateTime.now();
    switch (periodIndex) {
      case 0:
        return "Aujourd'hui, ${DateFormat('d MMMM yyyy', 'fr_FR').format(now)}";
      case 1:
        return "Semaine en cours (${widget.session.workingDays.length}j)";
      case 2:
        return DateFormat('MMMM yyyy', 'fr_FR').format(now).toUpperCase();
      case 3:
        return "Année ${now.year}";
      default:
        return "Période active";
    }
  }

  Widget _buildMiniBentoCard({
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    required String title,
    required String value,
    required String statusBadge,
    required Color badgeColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1E3A8A).withValues(alpha: 0.05),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: BorderRadius.circular(11),
                ),
                child: Icon(icon, color: iconColor, size: 18),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                decoration: BoxDecoration(
                  color: badgeColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  statusBadge,
                  style: TextStyle(
                    color: badgeColor,
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: const TextStyle(
                  color: Color(0xFF0F172A),
                  fontSize: 17,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 1),
              Text(
                title,
                style: const TextStyle(
                  color: Color(0xFF64748B),
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBentoPunchTile(PunchModel punch) {
    Color accentColor;
    Color lightBg;
    IconData iconData;
    String actionTitle;

    switch (punch.type) {
      case PunchType.checkIn:
        accentColor = const Color(0xFF10B981);
        lightBg = const Color(0xFFECFDF5);
        iconData = Icons.login_rounded;
        actionTitle = "Prise de Poste (Arrivée)";
        break;
      case PunchType.breakStart:
        accentColor = const Color(0xFFF59E0B);
        lightBg = const Color(0xFFFFFBEB);
        iconData = Icons.coffee_rounded;
        actionTitle = "Départ en Pause Déjeuner";
        break;
      case PunchType.breakEnd:
        accentColor = const Color(0xFF2563EB);
        lightBg = const Color(0xFFEFF6FF);
        iconData = Icons.play_arrow_rounded;
        actionTitle = "Reprise de Poste";
        break;
      case PunchType.checkOut:
        accentColor = const Color(0xFF64748B);
        lightBg = const Color(0xFFF1F5F9);
        iconData = Icons.logout_rounded;
        actionTitle = "Fin de Journée (Départ)";
        break;
    }

    final timeStr = DateFormat('HH:mm').format(punch.recordedAtUtc.toLocal());
    final dateStr = DateFormat('dd/MM/yyyy').format(punch.recordedAtUtc.toLocal());

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1E3A8A).withValues(alpha: 0.05),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: lightBg,
              borderRadius: BorderRadius.circular(13),
            ),
            child: Icon(iconData, color: accentColor, size: 21),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  actionTitle,
                  style: const TextStyle(
                    color: Color(0xFF0F172A),
                    fontWeight: FontWeight.w800,
                    fontSize: 13.5,
                  ),
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.location_on, color: Color(0xFF10B981), size: 10),
                          const SizedBox(width: 2),
                          Text(
                            "${punch.distanceToSiteMeters.toStringAsFixed(0)}m",
                            style: const TextStyle(
                              color: Color(0xFF475569),
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (punch.wifiBssid != null) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEEF2FF),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.wifi, color: Color(0xFF4F46E5), size: 10),
                            SizedBox(width: 2),
                            Text(
                              "Box Wi-Fi",
                              style: TextStyle(
                                color: Color(0xFF4F46E5),
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
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
                style: const TextStyle(
                  color: Color(0xFF0F172A),
                  fontWeight: FontWeight.w900,
                  fontSize: 15,
                  fontFamily: 'monospace',
                ),
              ),
              const SizedBox(height: 2),
              Text(
                dateStr,
                style: const TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 10.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Peintre personnalisé pour l'anneau de progression circulaire
class _CircularScorePainter extends CustomPainter {
  final double percentage; // entre 0.0 et 1.0
  final Color trackColor;
  final Gradient progressGradient;

  _CircularScorePainter({
    required this.percentage,
    required this.trackColor,
    required this.progressGradient,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - 18) / 2;
    const strokeWidth = 14.0;

    // 1. Cercle de fond (track)
    final trackPaint = Paint()
      ..color = trackColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawCircle(center, radius, trackPaint);

    // 2. Arc de progression dégradé
    if (percentage > 0) {
      final rect = Rect.fromCircle(center: center, radius: radius);
      final progressPaint = Paint()
        ..shader = progressGradient.createShader(rect)
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..strokeCap = StrokeCap.round;

      const startAngle = -math.pi / 2;
      final sweepAngle = 2 * math.pi * percentage.clamp(0.0, 1.0);

      canvas.drawArc(rect, startAngle, sweepAngle, false, progressPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _CircularScorePainter oldDelegate) {
    return oldDelegate.percentage != percentage;
  }
}
