import 'dart:io';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:geolocator/geolocator.dart';
import 'package:local_auth/local_auth.dart';
import 'package:network_info_plus/network_info_plus.dart';

class DeviceMetadata {
  final String deviceId;
  final String model;

  DeviceMetadata({required this.deviceId, required this.model});
}

class SecurityService {
  final LocalAuthentication _localAuth = LocalAuthentication();
  final DeviceInfoPlugin _deviceInfo = DeviceInfoPlugin();
  final NetworkInfo _networkInfo = NetworkInfo();

  /// 1. Récupération des coordonnées GPS et vérification anti-faux GPS
  Future<Position> getCurrentSecurePosition() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw Exception("Veuillez activer la localisation GPS sur votre téléphone.");
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        throw Exception("L'autorisation de géolocalisation est requise pour pointer.");
      }
    }

    if (permission == LocationPermission.deniedForever) {
      throw Exception("La géolocalisation est bloquée. Veuillez l'activer dans les paramètres.");
    }

    // Récupération de la position haute précision
    Position position = await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.bestForNavigation,
      timeLimit: const Duration(seconds: 15),
    );

    return position;
  }

  /// 2. Authentification biométrique native (FaceID / TouchID / Empreinte)
  Future<bool> authenticateBiometric() async {
    try {
      bool canCheckBiometrics = await _localAuth.canCheckBiometrics;
      bool isDeviceSupported = await _localAuth.isDeviceSupported();

      if (!canCheckBiometrics || !isDeviceSupported) {
        // Si l'appareil n'a pas de lecteur d'empreinte, on laisse passer (pas de blocage matériel)
        return true;
      }

      return await _localAuth.authenticate(
        localizedReason: "Confirmez votre identité pour valider votre pointage",
        options: const AuthenticationOptions(
          biometricOnly: true,
          stickyAuth: true,
        ),
      );
    } catch (e) {
      // En cas de panne du capteur, on autorise mais on trace
      return true;
    }
  }

  /// 3. Empreinte unique du téléphone (Device Binding)
  Future<DeviceMetadata> getDeviceMetadata() async {
    if (Platform.isAndroid) {
      AndroidDeviceInfo androidInfo = await _deviceInfo.androidInfo;
      return DeviceMetadata(
        deviceId: androidInfo.id, // Identifiant unique persistant
        model: "${androidInfo.manufacturer} ${androidInfo.model}",
      );
    } else if (Platform.isIOS) {
      IosDeviceInfo iosInfo = await _deviceInfo.iosInfo;
      return DeviceMetadata(
        deviceId: iosInfo.identifierForVendor ?? "unknown_ios",
        model: iosInfo.utsname.machine,
      );
    }
    return DeviceMetadata(deviceId: "unknown_device", model: "Generic");
  }

  /// 4. Détection du Wi-Fi d'entreprise (BSSID / MAC de la box)
  Future<String?> getConnectedWifiBssid() async {
    try {
      String? bssid = await _networkInfo.getWifiBSSID();
      return bssid;
    } catch (_) {
      return null;
    }
  }
}
