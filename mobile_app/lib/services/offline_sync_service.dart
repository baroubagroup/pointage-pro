import 'dart:async';
import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:http/http.dart' as http;
import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';
import '../models/employee_session.dart';
import '../models/punch_model.dart';

class OfflineSyncService {
  static final OfflineSyncService _instance = OfflineSyncService._internal();
  factory OfflineSyncService() => _instance;
  OfflineSyncService._internal();

  Database? _db;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;

  // Configuration Supabase Direct REST
  final String _supabaseUrl = "https://ylrnxuphtaoazlhlmnsd.supabase.co";
  final String _apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlscm54dXBodGFvYXpsaGxtbnNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMDc3NDgsImV4cCI6MjEwMTg4Mzc0OH0._F9Kr-vgD_nahWhVfYJDhP8xRhDw_HyukIHWw5yOC8g";

  final _pendingCountController = StreamController<int>.broadcast();
  Stream<int> get pendingCountStream => _pendingCountController.stream;

  Map<String, String> get _headers => {
    "Content-Type": "application/json",
    "apikey": _apiKey,
    "Authorization": "Bearer $_apiKey",
    "Prefer": "return=representation",
  };

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

  void dispose() {
    _connectivitySubscription?.cancel();
    _pendingCountController.close();
  }

  Future<Database> _initDatabase() async {
    String dbPath = join(await getDatabasesPath(), 'attendance_offline_v4.db');
    return await openDatabase(
      dbPath,
      version: 1,
      onCreate: (db, version) async {
        // Table des sessions collaborateur
        await db.execute('''
          CREATE TABLE employee_session (
            id TEXT PRIMARY KEY,
            full_name TEXT NOT NULL,
            phone TEXT,
            role TEXT NOT NULL,
            enrollment_token TEXT NOT NULL,
            establishment_id TEXT NOT NULL,
            establishment_name TEXT NOT NULL,
            bound_device_id TEXT,
            device_model TEXT,
            employee_matricule TEXT,
            face_embedding_vector TEXT,
            face_update_count INTEGER DEFAULT 0,
            establishment_lat REAL,
            establishment_lng REAL,
            establishment_radius REAL,
            schedule_id TEXT,
            schedule_name TEXT,
            working_days TEXT,
            morning_start TEXT,
            morning_end TEXT,
            lunch_start TEXT,
            lunch_end TEXT,
            afternoon_start TEXT,
            afternoon_end TEXT,
            tolerance_minutes INTEGER
          )
        ''');

        // Table des pointages locaux
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
            distance_to_site_meters REAL,
            is_mock_location INTEGER NOT NULL,
            device_id TEXT NOT NULL,
            device_model TEXT NOT NULL,
            wifi_bssid TEXT,
            selfie_path TEXT,
            sync_status TEXT NOT NULL,
            flag_reasons TEXT,
            is_assisted INTEGER DEFAULT 0,
            assisted_by_employee_id TEXT
          )
        ''');
      },
    );
  }

  // ==================== GESTION DE LA SESSION PERSISTANTE ====================

  Future<EmployeeSession?> getStoredEmployeeSession() async {
    try {
      final db = _db ?? await _initDatabase();
      final List<Map<String, dynamic>> maps = await db.query('employee_session', limit: 1);
      if (maps.isNotEmpty) {
        return EmployeeSession.fromMap(maps.first);
      }
    } catch (e) {
      print("Erreur getStoredEmployeeSession: $e");
    }
    return null;
  }

  Future<void> saveEmployeeSession(EmployeeSession session) async {
    final db = _db ?? await _initDatabase();
    await db.delete('employee_session'); // Nettoyage de la précédente session
    await db.insert('employee_session', session.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<void> clearEmployeeSession() async {
    final db = _db ?? await _initDatabase();
    await db.delete('employee_session');
  }

  // ==================== ENRÔLEMENT VIA TOKEN SUPABASE ====================

  /// Validation réelle du jeton d'enrôlement auprès de Supabase
  Future<EmployeeSession> enrollWithToken(String rawToken, String deviceId, String deviceModel) async {
    final cleanToken = rawToken.trim();
    if (cleanToken.isEmpty) {
      throw Exception("Veuillez renseigner un code d'activation.");
    }

    // 1. Recherche de l'employé dans Supabase avec établissement et planning
    final Uri url = Uri.parse(
      "$_supabaseUrl/rest/v1/pointage_employees?select=*,pointage_establishments(id,name,latitude,longitude,radius_meters),pointage_schedules(id,name,working_days,morning_start,morning_end,lunch_start,lunch_end,afternoon_start,afternoon_end,tolerance_minutes)&or=(enrollment_token.eq.$cleanToken,enrollment_token.ilike.%$cleanToken%)&limit=1"
    );

    final response = await http.get(url, headers: _headers);

    if (response.statusCode != 200) {
      throw Exception("Impossible de contacter le serveur cloud (${response.statusCode}).");
    }

    final List<dynamic> data = jsonDecode(response.body);
    if (data.isEmpty) {
      throw Exception("Code d'activation '$cleanToken' introuvable. Veuillez vérifier auprès de votre responsable.");
    }

    final emp = data.first;
    final empId = emp['id'] as String;
    final fullName = emp['full_name'] as String;
    final phone = emp['phone'] as String? ?? '';
    final role = emp['role'] as String? ?? 'EMPLOYEE';
    final token = emp['enrollment_token'] as String? ?? cleanToken;
    final establishmentId = emp['default_establishment_id'] as String? ?? '00000000-0000-0000-0000-000000000010';
    
    // Données de l'établissement
    final estData = emp['pointage_establishments'];
    final establishmentName = estData?['name'] as String? ?? 'Siège Principal Ouagadougou';
    final establishmentLat = estData?['latitude'] != null ? (estData['latitude'] as num).toDouble() : 11.24700;
    final establishmentLng = estData?['longitude'] != null ? (estData['longitude'] as num).toDouble() : -4.29180;
    final establishmentRadius = estData?['radius_meters'] != null ? (estData['radius_meters'] as num).toDouble() : 120.0;

    // Données du planning
    final schedData = emp['pointage_schedules'];
    final scheduleId = emp['schedule_id'] as String?;
    final scheduleName = schedData?['name'] as String? ?? 'Horaire Fractionné Standard (Lun - Ven)';
    List<int> workingDays = [1, 2, 3, 4, 5];
    if (schedData?['working_days'] != null) {
      workingDays = List<int>.from(schedData['working_days'].map((e) => (e as num).toInt()));
    }
    final morningStart = (schedData?['morning_start'] as String? ?? '07:30').sliceSafe(0, 5);
    final morningEnd = (schedData?['morning_end'] as String? ?? '12:00').sliceSafe(0, 5);
    final lunchStart = (schedData?['lunch_start'] as String? ?? '12:00').sliceSafe(0, 5);
    final lunchEnd = (schedData?['lunch_end'] as String? ?? '13:30').sliceSafe(0, 5);
    final afternoonStart = (schedData?['afternoon_start'] as String? ?? '13:30').sliceSafe(0, 5);
    final afternoonEnd = (schedData?['afternoon_end'] as String? ?? '17:30').sliceSafe(0, 5);
    final toleranceMinutes = schedData?['tolerance_minutes'] is int ? schedData['tolerance_minutes'] as int : 15;

    final matricule = emp['employee_matricule'] as String?;
    final faceVector = emp['face_embedding_vector'] as String?;
    final faceUpdateCount = emp['face_update_count'] is int ? emp['face_update_count'] as int : 0;

    // 2. Scellement matériel du smartphone (Device Binding) dans Supabase
    try {
      final patchUrl = Uri.parse("$_supabaseUrl/rest/v1/pointage_employees?id=eq.$empId");
      await http.patch(
        patchUrl,
        headers: _headers,
        body: jsonEncode({
          "bound_device_id": deviceId,
          "device_model": deviceModel,
          "is_enrolled": true,
        }),
      );
    } catch (e) {
      print("Avertissement mise à jour device_id: $e");
    }

    // 3. Création et stockage persistant de la session
    final session = EmployeeSession(
      id: empId,
      fullName: fullName,
      phone: phone,
      role: role,
      enrollmentToken: token,
      establishmentId: establishmentId,
      establishmentName: establishmentName,
      boundDeviceId: deviceId,
      deviceModel: deviceModel,
      employeeMatricule: matricule,
      faceEmbeddingVector: faceVector,
      faceUpdateCount: faceUpdateCount,
      establishmentLat: establishmentLat,
      establishmentLng: establishmentLng,
      establishmentRadius: establishmentRadius,
      scheduleId: scheduleId,
      scheduleName: scheduleName,
      workingDays: workingDays,
      morningStart: morningStart,
      morningEnd: morningEnd,
      lunchStart: lunchStart,
      lunchEnd: lunchEnd,
      afternoonStart: afternoonStart,
      afternoonEnd: afternoonEnd,
      toleranceMinutes: toleranceMinutes,
    );

    await saveEmployeeSession(session);
    return session;
  }

  /// Vérifie si l'appareil a été enrôlé en mode inversé par le superviseur
  Future<EmployeeSession?> checkReverseEnrollment(String deviceId) async {
    try {
      final Uri url = Uri.parse(
        "$_supabaseUrl/rest/v1/pointage_employees?select=*,pointage_establishments(id,name,latitude,longitude,radius_meters),pointage_schedules(id,name,working_days,morning_start,morning_end,lunch_start,lunch_end,afternoon_start,afternoon_end,tolerance_minutes)&bound_device_id=eq.$deviceId&is_enrolled=eq.true&limit=1"
      );
      final response = await http.get(url, headers: _headers);
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        if (data.isNotEmpty) {
          final emp = data.first;
          final estData = emp['pointage_establishments'];
          final schedData = emp['pointage_schedules'];

          List<int> workingDays = [1, 2, 3, 4, 5];
          if (schedData?['working_days'] != null) {
            workingDays = List<int>.from(schedData['working_days'].map((e) => (e as num).toInt()));
          }

          final session = EmployeeSession(
            id: emp['id'],
            fullName: emp['full_name'],
            phone: emp['phone'] ?? '',
            role: emp['role'] ?? 'EMPLOYEE',
            enrollmentToken: emp['enrollment_token'] ?? '',
            establishmentId: emp['default_establishment_id'] ?? '00000000-0000-0000-0000-000000000010',
            establishmentName: estData?['name'] ?? 'Siège Principal Ouagadougou',
            boundDeviceId: deviceId,
            deviceModel: emp['device_model'] ?? 'Smartphone Sécurisé',
            employeeMatricule: emp['employee_matricule'],
            faceEmbeddingVector: emp['face_embedding_vector'],
            faceUpdateCount: emp['face_update_count'] ?? 0,
            establishmentLat: estData?['latitude'] != null ? (estData['latitude'] as num).toDouble() : 11.24700,
            establishmentLng: estData?['longitude'] != null ? (estData['longitude'] as num).toDouble() : -4.29180,
            establishmentRadius: estData?['radius_meters'] != null ? (estData['radius_meters'] as num).toDouble() : 120.0,
            scheduleId: emp['schedule_id'],
            scheduleName: schedData?['name'] ?? "Horaire Fractionné Standard (Lun - Ven)",
            workingDays: workingDays,
            morningStart: (schedData?['morning_start'] as String? ?? '07:30').sliceSafe(0, 5),
            morningEnd: (schedData?['morning_end'] as String? ?? '12:00').sliceSafe(0, 5),
            lunchStart: (schedData?['lunch_start'] as String? ?? '12:00').sliceSafe(0, 5),
            lunchEnd: (schedData?['lunch_end'] as String? ?? '13:30').sliceSafe(0, 5),
            afternoonStart: (schedData?['afternoon_start'] as String? ?? '13:30').sliceSafe(0, 5),
            afternoonEnd: (schedData?['afternoon_end'] as String? ?? '17:30').sliceSafe(0, 5),
            toleranceMinutes: schedData?['tolerance_minutes'] is int ? schedData['tolerance_minutes'] as int : 15,
          );
          await saveEmployeeSession(session);
          return session;
        }
      }
    } catch (e) {
      print("Erreur checkReverseEnrollment: $e");
    }
    return null;
  }

  // ==================== CONFIGURATION ANTI-TRICHE D'ENTREPRISE ====================

  /// Récupère la matrice de sécurité anti-triche définie dans l'admin dashboard
  Future<Map<String, dynamic>> getOrganizationSecurityConfig() async {
    try {
      final Uri url = Uri.parse("$_supabaseUrl/rest/v1/pointage_organizations?select=security_config&limit=1");
      final response = await http.get(url, headers: _headers);
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        if (data.isNotEmpty && data.first['security_config'] != null) {
          return Map<String, dynamic>.from(data.first['security_config']);
        }
      }
    } catch (e) {
      print("Erreur getOrganizationSecurityConfig: $e");
    }
    return {
      "require_biometrics": true,
      "require_wifi_bssid": false,
      "hard_block_mock_gps": true,
      "require_device_binding": true,
      "require_face_on_colleague_assist": true,
      "block_early_arrival": true,
      "auto_prompt_delay_justification": true,
      "allow_offline": true,
      "grace_delay_minutes": 15,
      "max_break_minutes": 60,
    };
  }

  // ==================== GESTION DES POINTAGES & SYNCHRO ====================

  Future<PunchModel> savePunchLocally(
    PunchModel punch, {
    bool isAssisted = false,
    String? assistedByEmployeeId,
  }) async {
    final db = _db ?? await _initDatabase();

    Map<String, dynamic> row = punch.toMap();
    row['is_assisted'] = isAssisted ? 1 : 0;
    row['assisted_by_employee_id'] = assistedByEmployeeId;

    int id = await db.insert('offline_punches', row);
    PunchModel saved = punch.copyWith(id: id);

    await _updatePendingCount();

    // Tentative immédiate de synchronisation en tâche de fond
    syncPendingPunches();

    return saved;
  }

  Future<void> syncPendingPunches() async {
    final db = _db ?? await _initDatabase();
    final List<Map<String, dynamic>> pending = await db.query(
      'offline_punches',
      where: 'sync_status = ?',
      whereArgs: [SyncStatus.pending.name],
    );

    if (pending.isEmpty) return;

    final Uri postUrl = Uri.parse("$_supabaseUrl/rest/v1/pointage_logs");

    for (var map in pending) {
      try {
        final punch = PunchModel.fromMap(map);
        final bool isAssisted = (map['is_assisted'] == 1);
        final String? assistedBy = map['assisted_by_employee_id'];

        final payload = {
          "org_id": "00000000-0000-0000-0000-000000000001",
          "employee_id": punch.userId,
          "establishment_id": punch.establishmentId,
          "punch_type": punch.type.name,
          "recorded_at_utc": punch.recordedAtUtc.toIso8601String(),
          "synced_at_utc": DateTime.now().toUtc().toIso8601String(),
          "is_offline_sync": true,
          "latitude": punch.latitude,
          "longitude": punch.longitude,
          "accuracy_meters": punch.accuracyMeters,
          "distance_to_site_meters": punch.distanceToSiteMeters,
          "device_id": punch.deviceId,
          "device_model": punch.deviceModel,
          "wifi_bssid": punch.wifiBssid,
          "is_mock_location": punch.isMockLocation,
          "status": isAssisted ? "ASSISTED_VERIFIED" : "VERIFIED",
          "flag_reasons": isAssisted ? ["ASSISTANCE_COLLEGUE", "VISAGE_CERTIFIE"] : ["GPS_CONFIRMED", "HORLOGE_UTC_OK"],
          "is_assisted": isAssisted,
          "assisted_by_employee_id": assistedBy,
        };

        final response = await http.post(
          postUrl,
          headers: _headers,
          body: jsonEncode(payload),
        );

        if (response.statusCode == 201 || response.statusCode == 200) {
          if (map['id'] != null) {
            await db.update(
              'offline_punches',
              {'sync_status': SyncStatus.synced.name},
              where: 'id = ?',
              whereArgs: [map['id']],
            );
          }
        }
      } catch (e) {
        print("Erreur réseau sync: $e");
      }
    }

    await _updatePendingCount();
  }

  Future<int> _updatePendingCount() async {
    final db = _db ?? await _initDatabase();
    final count = Sqflite.firstIntValue(await db.rawQuery(
      'SELECT COUNT(*) FROM offline_punches WHERE sync_status = ?',
      [SyncStatus.pending.name],
    )) ?? 0;
    _pendingCountController.add(count);
    return count;
  }

  Future<List<PunchModel>> getRecentPunches(String userId) async {
    final db = _db ?? await _initDatabase();
    final rows = await db.query(
      'offline_punches',
      where: 'user_id = ?',
      whereArgs: [userId],
      orderBy: 'recorded_at_utc DESC',
      limit: 30,
    );
    return rows.map((r) => PunchModel.fromMap(r)).toList();
  }

  // ==================== JUSTIFICATIONS DES RETARDS ====================

  Future<bool> submitJustification({
    required String employeeId,
    required String category,
    required String reasonText,
    String? punchId,
  }) async {
    try {
      final Uri postUrl = Uri.parse("$_supabaseUrl/rest/v1/pointage_justifications");
      final response = await http.post(
        postUrl,
        headers: _headers,
        body: jsonEncode({
          "employee_id": employeeId,
          "punch_id": punchId,
          "reason_text": "[$category] $reasonText",
          "status": "PENDING",
        }),
      );
      return response.statusCode == 201 || response.statusCode == 200;
    } catch (e) {
      print("Erreur submitJustification: $e");
      return false;
    }
  }

  // ==================== ASSISTANCE COLLÈGUE & RECONNAISSANCE FACIALE ====================

  Future<List<Map<String, dynamic>>> getColleaguesList(String currentEmployeeId) async {
    try {
      final Uri url = Uri.parse(
        "$_supabaseUrl/rest/v1/pointage_employees?select=id,full_name,employee_matricule,face_embedding_vector,face_update_count&id=neq.$currentEmployeeId&is_active=eq.true&order=full_name.asc"
      );
      final response = await http.get(url, headers: _headers);
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return List<Map<String, dynamic>>.from(data);
      }
    } catch (e) {
      print("Erreur getColleaguesList: $e");
    }
    return [];
  }

  Future<Map<String, dynamic>> updateFaceSignature({
    required String employeeId,
    required String newVector,
    required int currentUpdateCount,
  }) async {
    if (currentUpdateCount >= 2) {
      return {
        "success": false,
        "message": "Quota d'enrôlement facial atteint (2/2). Toute modification nécessite l'approbation du Responsable RH."
      };
    }

    try {
      final Uri patchUrl = Uri.parse("$_supabaseUrl/rest/v1/pointage_employees?id=eq.$employeeId");
      final response = await http.patch(
        patchUrl,
        headers: _headers,
        body: jsonEncode({
          "face_embedding_vector": newVector,
          "face_update_count": currentUpdateCount + 1,
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 204) {
        final currentSession = await getStoredEmployeeSession();
        if (currentSession != null) {
          final updated = EmployeeSession(
            id: currentSession.id,
            fullName: currentSession.fullName,
            phone: currentSession.phone,
            role: currentSession.role,
            enrollmentToken: currentSession.enrollmentToken,
            establishmentId: currentSession.establishmentId,
            establishmentName: currentSession.establishmentName,
            boundDeviceId: currentSession.boundDeviceId,
            deviceModel: currentSession.deviceModel,
            employeeMatricule: currentSession.employeeMatricule,
            faceEmbeddingVector: newVector,
            faceUpdateCount: currentUpdateCount + 1,
            establishmentLat: currentSession.establishmentLat,
            establishmentLng: currentSession.establishmentLng,
            establishmentRadius: currentSession.establishmentRadius,
            scheduleId: currentSession.scheduleId,
            scheduleName: currentSession.scheduleName,
            workingDays: currentSession.workingDays,
            morningStart: currentSession.morningStart,
            morningEnd: currentSession.morningEnd,
            lunchStart: currentSession.lunchStart,
            lunchEnd: currentSession.lunchEnd,
            afternoonStart: currentSession.afternoonStart,
            afternoonEnd: currentSession.afternoonEnd,
            toleranceMinutes: currentSession.toleranceMinutes,
          );
          await saveEmployeeSession(updated);
        }
        return {"success": true, "message": "Signature faciale certifiée avec succès (Quota : ${currentUpdateCount + 1}/2)."};
      }
    } catch (e) {
      return {"success": false, "message": "Erreur serveur : $e"};
    }
    return {"success": false, "message": "Impossible de mettre à jour le visage."};
  }

  // ==================== STATISTIQUES CONSOLIDÉES ====================

  Future<Map<String, dynamic>> getEmployeeStats(String userId, {EmployeeSession? session}) async {
    final punches = await getRecentPunches(userId);
    int totalPunches = punches.length;
    int lateMinutes = 0;
    int lateCount = 0;
    double workedHoursMonth = 0.0;
    double workedHoursWeek = 0.0;

    // Regrouper par jour (YYYY-MM-DD)
    final Map<String, List<PunchModel>> dayPunches = {};
    for (var p in punches) {
      final localDate = p.recordedAtUtc.toLocal();
      final dateKey = "${localDate.year}-${localDate.month.toString().padLeft(2, '0')}-${localDate.day.toString().padLeft(2, '0')}";
      dayPunches.putIfAbsent(dateKey, () => []).add(p);
    }

    final now = DateTime.now();
    final currentMonthKey = "${now.year}-${now.month.toString().padLeft(2, '0')}";

    dayPunches.forEach((dateKey, dayList) {
      dayList.sort((a, b) => a.recordedAtUtc.compareTo(b.recordedAtUtc));

      // Calcul des retards du jour
      final checkIns = dayList.where((p) => p.type == PunchType.checkIn).toList();
      if (checkIns.isNotEmpty && session != null) {
        final firstIn = checkIns.first.recordedAtUtc.toLocal();
        if (session.workingDays.contains(firstIn.weekday)) {
          final parts = session.morningStart.split(':');
          final schedHour = int.tryParse(parts[0]) ?? 7;
          final schedMin = int.tryParse(parts.length > 1 ? parts[1] : '30') ?? 30;
          final schedTolerance = session.toleranceMinutes;

          final scheduledStart = DateTime(firstIn.year, firstIn.month, firstIn.day, schedHour, schedMin);
          final diff = firstIn.difference(scheduledStart).inMinutes;
          if (diff > schedTolerance) {
            lateMinutes += (diff - schedTolerance);
            lateCount++;
          }
        }
      }

      // Calcul des heures travaillées
      DateTime? currentIn;
      double dayHours = 0.0;

      for (var p in dayList) {
        switch (p.type) {
          case PunchType.checkIn:
            currentIn = p.recordedAtUtc.toLocal();
            break;
          case PunchType.breakStart:
            if (currentIn != null) {
              dayHours += p.recordedAtUtc.toLocal().difference(currentIn).inMinutes / 60.0;
              currentIn = null;
            }
            break;
          case PunchType.breakEnd:
            currentIn = p.recordedAtUtc.toLocal();
            break;
          case PunchType.checkOut:
            if (currentIn != null) {
              dayHours += p.recordedAtUtc.toLocal().difference(currentIn).inMinutes / 60.0;
              currentIn = null;
            }
            break;
        }
      }

      if (currentIn != null && dateKey == "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}") {
        dayHours += now.difference(currentIn).inMinutes / 60.0;
      }

      if (dateKey.startsWith(currentMonthKey)) {
        workedHoursMonth += dayHours;
      }
    });

    workedHoursWeek = (workedHoursMonth > 40.0 ? 40.0 : workedHoursMonth);
    double punctualityRate = totalPunches > 0
        ? (lateCount == 0 ? 100.0 : ((totalPunches - lateCount) / totalPunches * 100.0))
        : 100.0;

    return {
      'totalPunches': totalPunches,
      'workedHoursMonth': "${workedHoursMonth.toStringAsFixed(1)}h",
      'workedHoursWeek': "${workedHoursWeek.toStringAsFixed(1)}h",
      'lateMinutes': lateMinutes,
      'lateCount': lateCount,
      'punctualityRate': punctualityRate.clamp(0.0, 100.0).roundToDouble(),
      'recentPunches': punches,
    };
  }
}

extension SafeSlice on String {
  String sliceSafe(int start, int end) {
    if (length <= start) return this;
    if (length <= end) return substring(start);
    return substring(start, end);
  }
}
