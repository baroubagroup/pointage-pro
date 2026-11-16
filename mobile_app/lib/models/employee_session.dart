class EmployeeSession {
  final String id;
  final String fullName;
  final String phone;
  final String role;
  final String enrollmentToken;
  final String establishmentId;
  final String establishmentName;
  final String? boundDeviceId;
  final String? deviceModel;
  final String? employeeMatricule;
  final String? faceEmbeddingVector;
  final int faceUpdateCount;
  final double? establishmentLat;
  final double? establishmentLng;
  final double? establishmentRadius;

  // Planning de travail personnalisé
  final String? scheduleId;
  final String scheduleName;
  final List<int> workingDays;
  final String morningStart;
  final String morningEnd;
  final String lunchStart;
  final String lunchEnd;
  final String afternoonStart;
  final String afternoonEnd;
  final int toleranceMinutes;

  EmployeeSession({
    required this.id,
    required this.fullName,
    required this.phone,
    required this.role,
    required this.enrollmentToken,
    required this.establishmentId,
    required this.establishmentName,
    this.boundDeviceId,
    this.deviceModel,
    this.employeeMatricule,
    this.faceEmbeddingVector,
    this.faceUpdateCount = 0,
    this.establishmentLat,
    this.establishmentLng,
    this.establishmentRadius = 120.0,
    this.scheduleId,
    this.scheduleName = "Horaire Fractionné Standard",
    this.workingDays = const [1, 2, 3, 4, 5],
    this.morningStart = "07:30",
    this.morningEnd = "12:00",
    this.lunchStart = "12:00",
    this.lunchEnd = "13:30",
    this.afternoonStart = "13:30",
    this.afternoonEnd = "17:30",
    this.toleranceMinutes = 15,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'full_name': fullName,
      'phone': phone,
      'role': role,
      'enrollment_token': enrollmentToken,
      'establishment_id': establishmentId,
      'establishment_name': establishmentName,
      'bound_device_id': boundDeviceId,
      'device_model': deviceModel,
      'employee_matricule': employeeMatricule,
      'face_embedding_vector': faceEmbeddingVector,
      'face_update_count': faceUpdateCount,
      'establishment_lat': establishmentLat,
      'establishment_lng': establishmentLng,
      'establishment_radius': establishmentRadius,
      'schedule_id': scheduleId,
      'schedule_name': scheduleName,
      'working_days': workingDays.join(','),
      'morning_start': morningStart,
      'morning_end': morningEnd,
      'lunch_start': lunchStart,
      'lunch_end': lunchEnd,
      'afternoon_start': afternoonStart,
      'afternoon_end': afternoonEnd,
      'tolerance_minutes': toleranceMinutes,
    };
  }

  factory EmployeeSession.fromMap(Map<String, dynamic> map) {
    List<int> parsedDays = [1, 2, 3, 4, 5];
    if (map['working_days'] != null) {
      if (map['working_days'] is List) {
        parsedDays = List<int>.from(map['working_days'].map((e) => (e as num).toInt()));
      } else if (map['working_days'] is String) {
        parsedDays = (map['working_days'] as String)
            .split(',')
            .where((s) => s.trim().isNotEmpty)
            .map((s) => int.tryParse(s.trim()) ?? 1)
            .toList();
      }
    }

    return EmployeeSession(
      id: map['id'] ?? '',
      fullName: map['full_name'] ?? 'Collaborateur',
      phone: map['phone'] ?? '',
      role: map['role'] ?? 'EMPLOYEE',
      enrollmentToken: map['enrollment_token'] ?? '',
      establishmentId: map['establishment_id'] ?? '',
      establishmentName: map['establishment_name'] ?? 'Siège Principal Ouagadougou',
      boundDeviceId: map['bound_device_id'],
      deviceModel: map['device_model'],
      employeeMatricule: map['employee_matricule'],
      faceEmbeddingVector: map['face_embedding_vector'],
      faceUpdateCount: map['face_update_count'] is int ? map['face_update_count'] : 0,
      establishmentLat: map['establishment_lat'] != null ? (map['establishment_lat'] as num).toDouble() : null,
      establishmentLng: map['establishment_lng'] != null ? (map['establishment_lng'] as num).toDouble() : null,
      establishmentRadius: map['establishment_radius'] != null ? (map['establishment_radius'] as num).toDouble() : 120.0,
      scheduleId: map['schedule_id'],
      scheduleName: map['schedule_name'] ?? "Horaire Fractionné Standard",
      workingDays: parsedDays.isNotEmpty ? parsedDays : [1, 2, 3, 4, 5],
      morningStart: map['morning_start'] ?? "07:30",
      morningEnd: map['morning_end'] ?? "12:00",
      lunchStart: map['lunch_start'] ?? "12:00",
      lunchEnd: map['lunch_end'] ?? "13:30",
      afternoonStart: map['afternoon_start'] ?? "13:30",
      afternoonEnd: map['afternoon_end'] ?? "17:30",
      toleranceMinutes: map['tolerance_minutes'] is int ? map['tolerance_minutes'] : 15,
    );
  }

  /// Vérifie si aujourd'hui est un jour de travail prévu pour ce collaborateur
  bool isWorkingToday() {
    final weekday = DateTime.now().weekday; // 1 = Lundi, ..., 7 = Dimanche
    return workingDays.contains(weekday);
  }

  String get matricule => employeeMatricule ?? 'OUA-2026-001';

  String get initials {
    final parts = fullName.trim().split(RegExp(r'\s+'));
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    } else if (parts.isNotEmpty && parts[0].isNotEmpty) {
      return parts[0].substring(0, parts[0].length >= 2 ? 2 : 1).toUpperCase();
    }
    return 'CP';
  }

  String get displayRole {
    if (role == 'EMPLOYEE') return 'Collaborateur';
    if (role == 'MANAGER') return 'Responsable de Site';
    if (role == 'ADMIN') return 'Directeur / Gérant';
    return role;
  }
}
