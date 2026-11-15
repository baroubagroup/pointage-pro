import 'dart:async';
import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:http/http.dart' as http;
import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';
import '../models/punch_model.dart';

class OfflineSyncService {
  static final OfflineSyncService _instance = OfflineSyncService._internal();
  factory OfflineSyncService() => _instance;
  OfflineSyncService._internal();

  Database? _db;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  final String _backendApiUrl = "https://ylrnxuphtaoazlhlmnsd.supabase.co/rest/v1/rpc/process_pointage_punch";
  final String _apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlscm54dXBodGFvYXpsaGxtbnNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMDc3NDgsImV4cCI6MjEwMTg4Mzc0OH0._F9Kr-vgD_nahWhVfYJDhP8xRhDw_HyukIHWw5yOC8g";

  // Stream pour notifier l'UI du nombre de pointages en attente
  final _pendingCountController = StreamController<int>.broadcast();
  Stream<int> get pendingCountStream => _pendingCountController.stream;

  Future<void> initialize() async {
    _db = await _initDatabase();
    await _updatePendingCount();

    // Écoute automatique des changements de connexion
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((results) {
      bool hasConnection = results.any((r) => r != ConnectivityResult.none);
      if (hasConnection) {
        syncPendingPunches();
      }
    });
  }

  Future<Database> _initDatabase() async {
    String dbPath = join(await getDatabasesPath(), 'attendance_offline.db');
    return await openDatabase(
      dbPath,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE offline_punches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            establishment_id TEXT NOT NULL,
            punch_type TEXT NOT NULL,
            recorded_at_utc TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            accuracy_meters REAL NOT NULL,
            is_mock_location INTEGER NOT NULL,
            device_id TEXT NOT NULL,
            device_model TEXT NOT NULL,
            wifi_bssid TEXT,
            selfie_path TEXT,
            sync_status TEXT NOT NULL,
            flag_reasons TEXT
          )
        ''');
      },
    );
  }

  /// Sauvegarde immédiate en base locale (garantie 0 perte)
  Future<PunchModel> savePunchLocally(PunchModel punch) async {
    final db = _db ?? await _initDatabase();
    int localId = await db.insert('offline_punches', punch.toMap());
    
    await _updatePendingCount();
    
    // Tente immédiatement une synchronisation si connecté
    syncPendingPunches();
    
    return PunchModel(
      localId: localId,
      userId: punch.userId,
      establishmentId: punch.establishmentId,
      type: punch.type,
      recordedAtUtc: punch.recordedAtUtc,
      latitude: punch.latitude,
      longitude: punch.longitude,
      accuracyMeters: punch.accuracyMeters,
      isMockLocation: punch.isMockLocation,
      deviceId: punch.deviceId,
      deviceModel: punch.deviceModel,
      wifiBssid: punch.wifiBssid,
      selfiePath: punch.selfiePath,
      syncStatus: punch.syncStatus,
    );
  }

  /// Synchronisation en arrière-plan avec le serveur
  Future<void> syncPendingPunches() async {
    final db = _db ?? await _initDatabase();
    List<Map<String, dynamic>> pendingMaps = await db.query(
      'offline_punches',
      where: 'sync_status = ?',
      whereArgs: [SyncStatus.pending.name],
    );

    if (pendingMaps.isEmpty) return;

    for (var map in pendingMaps) {
      PunchModel punch = PunchModel.fromMap(map);
      try {
        final response = await http.post(
          Uri.parse(_backendApiUrl),
          headers: {
            "Content-Type": "application/json",
            "apikey": _apiKey,
            "Authorization": "Bearer $_apiKey",
          },
          body: jsonEncode({
            "p_employee_id": punch.userId,
            "p_establishment_id": punch.establishmentId,
            "p_punch_type": punch.type == PunchType.checkIn
                ? "CHECK_IN"
                : punch.type == PunchType.checkOut
                    ? "CHECK_OUT"
                    : punch.type == PunchType.breakStart
                        ? "BREAK_START"
                        : "BREAK_END",
            "p_recorded_at_utc": punch.recordedAtUtc.toIso8601String(),
            "p_longitude": punch.longitude,
            "p_latitude": punch.latitude,
            "p_accuracy_meters": punch.accuracyMeters,
            "p_device_id": punch.deviceId,
            "p_device_model": punch.deviceModel,
            "p_wifi_bssid": punch.wifiBssid,
            "p_is_mock_location": punch.isMockLocation,
            "p_selfie_url": punch.selfiePath,
          }),
        ).timeout(const Duration(seconds: 10));

        if (response.statusCode == 200) {
          final resData = jsonDecode(response.body);
          if (resData['success'] == true) {
            String serverStatus = resData['status'] ?? 'VERIFIED';
            SyncStatus finalStatus = serverStatus == 'FLAGGED'
                ? SyncStatus.flagged
                : SyncStatus.synced;

            await db.update(
              'offline_punches',
              {'sync_status': finalStatus.name},
              where: 'id = ?',
              whereArgs: [punch.localId],
            );
          } else {
            // Rejet du serveur (ex: trop loin)
            await db.update(
              'offline_punches',
              {'sync_status': SyncStatus.rejected.name},
              where: 'id = ?',
              whereArgs: [punch.localId],
            );
          }
        }
      } catch (e) {
        // En cas d'échec réseau, reste en "pending", sera retenté plus tard
      }
    }

    await _updatePendingCount();
  }

  Future<void> _updatePendingCount() async {
    final db = _db ?? await _initDatabase();
    final count = Sqflite.firstIntValue(await db.rawQuery(
      'SELECT COUNT(*) FROM offline_punches WHERE sync_status = ?',
      [SyncStatus.pending.name],
    ));
    _pendingCountController.add(count ?? 0);
  }

  void dispose() {
    _connectivitySubscription?.cancel();
    _pendingCountController.close();
  }
}
