import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/employee_session.dart';
import '../services/offline_sync_service.dart';
import '../services/push_notification_service.dart';
import '../services/update_service.dart';
import 'clock_in_screen.dart';
import 'stats_tab.dart';
import 'profile_tab.dart';

class MainNavigationScreen extends StatefulWidget {
  final EmployeeSession session;

  const MainNavigationScreen({super.key, required this.session});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;
  late final List<Widget> _pages;
  Timer? _broadcastPollTimer;
  StreamSubscription<Map<String, dynamic>>? _fcmSub;
  bool _isShowingBroadcastDialog = false;
  Map<String, dynamic>? _activeBroadcastBanner;

  @override
  void initState() {
    super.initState();
    _pages = [
      ClockInScreen(session: widget.session),
      StatsTab(session: widget.session),
      ProfileTab(session: widget.session),
    ];

    // Abonnement FCM au canal de l'organisation pour recevoir les notifications même app fermée
    PushNotificationService().syncOrganizationSubscription(widget.session.orgId);
    _fcmSub = PushNotificationService().foregroundBroadcastStream.listen((broadcast) {
      if (mounted) {
        _presentBroadcastAlert(broadcast);
      }
    });

    // Vérification discrète des mises à jour en arrière-plan au lancement
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) {
        UpdateService().checkForUpdate(context: context, showFeedbackIfLatest: false);
      }
    });

    // Vérification immédiate puis périodique des alertes push de la direction (Supabase fallback)
    Future.delayed(const Duration(milliseconds: 1200), () {
      if (mounted) {
        _checkForEmergencyBroadcast();
      }
    });
    _broadcastPollTimer = Timer.periodic(const Duration(seconds: 25), (_) {
      if (mounted) {
        _checkForEmergencyBroadcast();
      }
    });
  }

  @override
  void dispose() {
    _broadcastPollTimer?.cancel();
    _fcmSub?.cancel();
    super.dispose();
  }

  Future<void> _checkForEmergencyBroadcast() async {
    if (_isShowingBroadcastDialog) return;
    final broadcast = await OfflineSyncService().fetchUnseenBroadcast(widget.session.orgId);
    if (!mounted || broadcast == null) return;
    await _presentBroadcastAlert(broadcast);
  }

  Future<void> _presentBroadcastAlert(Map<String, dynamic> broadcast) async {
    if (!mounted || _isShowingBroadcastDialog) return;

    final broadcastId = broadcast['id']?.toString() ?? '';
    final message = broadcast['message']?.toString() ?? '';
    final sender = broadcast['sender']?.toString() ?? 'Direction / Gérant';
    final sentAtRaw = broadcast['sent_at']?.toString();

    if (message.isEmpty) return;

    if (broadcastId.isNotEmpty) {
      final seenId = await OfflineSyncService().getMetaValue('last_seen_broadcast_id');
      if (!mounted || seenId == broadcastId) return;
    }

    HapticFeedback.heavyImpact();
    setState(() {
      _activeBroadcastBanner = broadcast;
    });

    _isShowingBroadcastDialog = true;
    String formattedTime = '';
    if (sentAtRaw != null) {
      final parsed = DateTime.tryParse(sentAtRaw)?.toLocal();
      if (parsed != null) {
        formattedTime =
            '${parsed.day.toString().padLeft(2, '0')}/${parsed.month.toString().padLeft(2, '0')} à ${parsed.hour.toString().padLeft(2, '0')}:${parsed.minute.toString().padLeft(2, '0')}';
      }
    }

    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        backgroundColor: Colors.white,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFDBEAFE),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.campaign_rounded, color: Color(0xFF1D4ED8), size: 22),
            ),
            const SizedBox(width: 10),
            const Expanded(
              child: Text(
                'Annonce Direction',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Text(
                message,
                style: const TextStyle(fontSize: 14, height: 1.4, fontWeight: FontWeight.w600, color: Color(0xFF1E293B)),
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'De : $sender${formattedTime.isNotEmpty ? ' • $formattedTime' : ''}',
              style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
            ),
          ],
        ),
        actions: [
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () async {
                if (broadcastId.isNotEmpty) {
                  await OfflineSyncService().markBroadcastSeen(broadcastId);
                }
                if (ctx.mounted) Navigator.of(ctx).pop();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1D4ED8),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: const Text("J'ai pris connaissance", style: TextStyle(fontWeight: FontWeight.w700)),
            ),
          ),
        ],
      ),
    );

    _isShowingBroadcastDialog = false;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F7FD),
      body: Stack(
        children: [
          IndexedStack(
            index: _currentIndex,
            children: _pages,
          ),
          if (_activeBroadcastBanner != null)
            Positioned(
              top: MediaQuery.of(context).padding.top + 8,
              left: 16,
              right: 16,
              child: Material(
                color: Colors.transparent,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1D4ED8),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF1D4ED8).withOpacity(0.28),
                        blurRadius: 14,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.campaign_rounded, color: Colors.white, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _activeBroadcastBanner!['message']?.toString() ?? '',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ),
                      IconButton(
                        onPressed: () async {
                          final bid = _activeBroadcastBanner?['id']?.toString() ?? '';
                          if (bid.isNotEmpty) {
                            await OfflineSyncService().markBroadcastSeen(bid);
                          }
                          if (mounted) {
                            setState(() => _activeBroadcastBanner = null);
                          }
                        },
                        icon: const Icon(Icons.close_rounded, color: Colors.white, size: 18),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          Positioned(
            left: 24,
            right: 24,
            bottom: 20,
            child: _buildFloatingPillNavBar(),
          ),
        ],
      ),
    );
  }

  Widget _buildFloatingPillNavBar() {
    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(32),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1E3A8A).withOpacity(0.12),
            blurRadius: 28,
            offset: const Offset(0, 10),
          ),
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildNavItem(0, Icons.fingerprint_rounded, "Pointage"),
          _buildNavItem(1, Icons.bar_chart_rounded, "Activité"),
          _buildNavItem(2, Icons.person_rounded, "Profil"),
        ],
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, String label) {
    final bool isSelected = _currentIndex == index;
    return GestureDetector(
      onTap: () => setState(() => _currentIndex = index),
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOutCubic,
        padding: EdgeInsets.symmetric(
          horizontal: isSelected ? 16 : 12,
          vertical: 10,
        ),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFEFF6FF) : Colors.transparent,
          borderRadius: BorderRadius.circular(22),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: const Color(0xFF2563EB).withOpacity(0.15),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: isSelected ? const Color(0xFF2563EB) : const Color(0xFF94A3B8),
              size: 22,
            ),
            if (isSelected) ...[
              const SizedBox(width: 8),
              Text(
                label,
                style: const TextStyle(
                  color: Color(0xFF2563EB),
                  fontWeight: FontWeight.w800,
                  fontSize: 12,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
