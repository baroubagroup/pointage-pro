import 'package:flutter/material.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'models/employee_session.dart';
import 'services/offline_sync_service.dart';
import 'services/push_notification_service.dart';
import 'ui/enrollment_screen.dart';
import 'ui/main_navigation_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('fr_FR', null);

  // Initialisation du service de synchronisation et des notifications push FCM
  final syncService = OfflineSyncService();
  await syncService.initialize();
  final pushService = PushNotificationService();
  await pushService.initialize();

  final EmployeeSession? activeSession = await syncService.getStoredEmployeeSession();
  if (activeSession != null) {
    pushService.syncOrganizationSubscription(activeSession.orgId);
  }

  runApp(PointageApp(initialSession: activeSession));
}

class PointageApp extends StatelessWidget {
  final EmployeeSession? initialSession;

  const PointageApp({super.key, this.initialSession});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PointagePro Enterprise',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF3B82F6),
          brightness: Brightness.dark,
        ),
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        useMaterial3: true,
        fontFamily: 'Roboto',
      ),
      // Si l'employé est déjà activé sur ce téléphone, on l'amène directement sur son espace de pointage !
      home: initialSession != null
          ? MainNavigationScreen(session: initialSession!)
          : const EnrollmentScreen(),
    );
  }
}
