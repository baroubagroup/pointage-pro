import 'package:flutter/material.dart';
import '../models/employee_session.dart';
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

  @override
  void initState() {
    super.initState();
    _pages = [
      ClockInScreen(session: widget.session),
      StatsTab(session: widget.session),
      ProfileTab(session: widget.session),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _pages,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF0F172A),
          border: Border(
            top: BorderSide(color: Colors.white.withOpacity(0.08), width: 1),
          ),
        ),
        child: NavigationBar(
          selectedIndex: _currentIndex,
          onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
          backgroundColor: const Color(0xFF0F172A),
          indicatorColor: const Color(0xFF3B82F6).withOpacity(0.2),
          elevation: 0,
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.fingerprint, color: Color(0xFF94A3B8)),
              selectedIcon: Icon(Icons.fingerprint, color: Color(0xFF3B82F6)),
              label: "Pointage",
            ),
            NavigationDestination(
              icon: Icon(Icons.bar_chart_outlined, color: Color(0xFF94A3B8)),
              selectedIcon: Icon(Icons.bar_chart, color: Color(0xFF3B82F6)),
              label: "Statistiques",
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline, color: Color(0xFF94A3B8)),
              selectedIcon: Icon(Icons.person, color: Color(0xFF3B82F6)),
              label: "Mon Profil",
            ),
          ],
        ),
      ),
    );
  }
}
