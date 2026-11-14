import 'package:flutter/material.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'ui/clock_in_screen.dart';
import 'ui/enrollment_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('fr_FR', null);
  runApp(const PointageApp());
}

class PointageApp extends StatelessWidget {
  const PointageApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Pointage Présence',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.blueAccent,
          brightness: Brightness.light,
        ),
        useMaterial3: true,
        fontFamily: 'Roboto',
      ),
      // Par défaut au premier lancement : écran d'activation (WhatsApp / QR)
      home: const EnrollmentScreen(),
    );
  }
}
