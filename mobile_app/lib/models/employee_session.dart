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
    if (role == 'ADMIN') return 'Administrateur';
    return role;
  }

  String get matricule {
    if (enrollmentToken.isNotEmpty) {
      final clean = enrollmentToken.replaceAll('PPRO-', '').replaceAll('SEC-', '');
      return 'EMP-2026-$clean';
    }
    return 'EMP-${id.substring(0, 8).toUpperCase()}';
  }
}
