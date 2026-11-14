enum PunchType {
  checkIn,
  checkOut,
  breakStart,
  breakEnd,
}

enum SyncStatus {
  pending,
  synced,
  flagged,
  rejected,
}

class PunchModel {
  final int? localId;
  final String userId;
  final String establishmentId;
  final PunchType type;
  final DateTime recordedAtUtc;
  final double latitude;
  final double longitude;
  final double accuracyMeters;
  final bool isMockLocation;
  final String deviceId;
  final String deviceModel;
  final String? wifiBssid;
  final String? selfiePath;
  SyncStatus syncStatus;
  List<String> flagReasons;

  PunchModel({
    this.localId,
    required this.userId,
    required this.establishmentId,
    required this.type,
    required this.recordedAtUtc,
    required this.latitude,
    required this.longitude,
    required this.accuracyMeters,
    required this.isMockLocation,
    required this.deviceId,
    required this.deviceModel,
    this.wifiBssid,
    this.selfiePath,
    this.syncStatus = SyncStatus.pending,
    this.flagReasons = const [],
  });

  Map<String, dynamic> toMap() {
    return {
      'id': localId,
      'user_id': userId,
      'establishment_id': establishmentId,
      'punch_type': type.name,
      'recorded_at_utc': recordedAtUtc.toIso8601String(),
      'latitude': latitude,
      'longitude': longitude,
      'accuracy_meters': accuracyMeters,
      'is_mock_location': isMockLocation ? 1 : 0,
      'device_id': deviceId,
      'device_model': deviceModel,
      'wifi_bssid': wifiBssid,
      'selfie_path': selfiePath,
      'sync_status': syncStatus.name,
      'flag_reasons': flagReasons.join(','),
    };
  }

  factory PunchModel.fromMap(Map<String, dynamic> map) {
    return PunchModel(
      localId: map['id'],
      userId: map['user_id'],
      establishmentId: map['establishment_id'],
      type: PunchType.values.byName(map['punch_type']),
      recordedAtUtc: DateTime.parse(map['recorded_at_utc']),
      latitude: map['latitude'],
      longitude: map['longitude'],
      accuracyMeters: map['accuracy_meters'],
      isMockLocation: map['is_mock_location'] == 1,
      deviceId: map['device_id'],
      deviceModel: map['device_model'],
      wifiBssid: map['wifi_bssid'],
      selfiePath: map['selfie_path'],
      syncStatus: SyncStatus.values.byName(map['sync_status']),
      flagReasons: map['flag_reasons'] != null && (map['flag_reasons'] as String).isNotEmpty
          ? (map['flag_reasons'] as String).split(',')
          : [],
    );
  }
}
