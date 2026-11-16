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
    this.establishmentRadius = 80.0,
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
    };
  }

  factory EmployeeSession.fromMap(Map<String, dynamic> map) {
    return EmployeeSession(
      id: map['id'] ?? '',
      fullName: map['full_name'] ?? 'Collaborateur',
      phone: map['phone'] ?? '',
      role: map['role'] ?? 'EMPLOYEE',
      enrollmentToken: map['enrollment_token'] ?? '',
      establishmentId: map['establishment_id'] ?? '',
      establishmentName: map['establishment_name'] ?? 'Établissement Principal',
      boundDeviceId: map['bound_device_id'],
      deviceModel: map['device_model'],
      employeeMatricule: map['employee_matricule'],
      faceEmbeddingVector: map['face_embedding_vector'],
      faceUpdateCount: map['face_update_count'] is int ? map['face_update_count'] : 0,
      establishmentLat: map['establishment_lat'] != null ? (map['establishment_lat'] as num).toDouble() : null,
      establishmentLng: map['establishment_lng'] != null ? (map['establishment_lng'] as num).toDouble() : null,
      establishmentRadius: map['establishment_radius'] != null ? (map['establishment_radius'] as num).toDouble() : 80.0,
    );
  }

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

  String get matricule {
    if (employeeMatricule != null && employeeMatricule!.isNotEmpty) {
      return employeeMatricule!;
    }
    if (enrollmentToken.isNotEmpty) {
      final clean = enrollmentToken.replaceAll('PPRO-', '').replaceAll('SEC-', '');
      return 'SIP-2026-$clean';
    }
    return 'SIP-${id.substring(0, 8).toUpperCase()}';
  }
}
