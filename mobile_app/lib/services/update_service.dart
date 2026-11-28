import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'offline_sync_service.dart';

class AppUpdateInfo {
  final String latestVersion;
  final int versionCode;
  final String minSupportedVersion;
  final bool isUpdateRequired;
  final String releaseDate;
  final String apkDownloadUrl;
  final String apkDirectUrl;
  final List<String> changelog;

  AppUpdateInfo({
    required this.latestVersion,
    required this.versionCode,
    required this.minSupportedVersion,
    required this.isUpdateRequired,
    required this.releaseDate,
    required this.apkDownloadUrl,
    required this.apkDirectUrl,
    required this.changelog,
  });

  factory AppUpdateInfo.fromJson(Map<String, dynamic> json) {
    final app = json['app'] as Map<String, dynamic>? ?? {};
    return AppUpdateInfo(
      latestVersion: app['currentVersion'] as String? ?? '1.1.0',
      versionCode: app['versionCode'] as int? ?? 11,
      minSupportedVersion: app['minSupportedVersion'] as String? ?? '1.0.0',
      isUpdateRequired: app['isUpdateRequired'] as bool? ?? false,
      releaseDate: app['releaseDate'] as String? ?? '2026-11-22',
      apkDownloadUrl: app['apkDownloadUrl'] as String? ?? 'http://192.168.11.106:3000/api/app/download',
      apkDirectUrl: app['apkDirectUrl'] as String? ?? 'http://192.168.11.106:3000/apk/pointagepro-enterprise-v1.1.0.apk',
      changelog: (app['changelog'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
    );
  }
}

class UpdateService {
  static final UpdateService _instance = UpdateService._internal();
  factory UpdateService() => _instance;
  UpdateService._internal();

  static const String currentAppVersion = "1.0.0";
  static const int currentVersionCode = 10;

  // URL du serveur Next.js sur le réseau local Wi-Fi SAKO
  static const String defaultUpdateServerUrl = "http://192.168.11.106:3000/api/app/version";
  static const String fallbackUpdateServerUrl = "http://localhost:3000/api/app/version";

  Future<AppUpdateInfo?> fetchUpdateInfo() async {
    final dynamicBase = OfflineSyncService().apiBaseUrl;
    final dynamicUpdateUrl = "$dynamicBase/api/app/version";
    final candidates = <String>{
      dynamicUpdateUrl,
      defaultUpdateServerUrl,
      fallbackUpdateServerUrl,
    }.toList();

    for (final url in candidates) {
      try {
        final uri = Uri.parse(url);
        final response = await http.get(uri).timeout(const Duration(seconds: 4));
        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          if (data['status'] == 'success') {
            return AppUpdateInfo.fromJson(data);
          }
        }
      } catch (_) {
        // Essai sur URL suivante
      }
    }
    return null;
  }

  /// Vérifie si une mise à jour est disponible et l'affiche à l'utilisateur
  Future<void> checkForUpdate({
    required BuildContext context,
    bool showFeedbackIfLatest = false,
  }) async {
    final info = await fetchUpdateInfo();

    if (!context.mounted) return;

    if (info == null) {
      if (showFeedbackIfLatest) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Row(
              children: [
                Icon(Icons.wifi_off_rounded, color: Colors.white, size: 20),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    "Serveur de mise à jour non joignable. Vérifiez la connexion Wi-Fi.",
                    style: TextStyle(fontSize: 12.5),
                  ),
                ),
              ],
            ),
            backgroundColor: const Color(0xFF475569),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
      return;
    }

    final bool hasNewVersion = info.versionCode > currentVersionCode ||
        info.latestVersion != currentAppVersion;

    if (hasNewVersion) {
      _showUpdateModal(context, info);
    } else if (showFeedbackIfLatest) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  "PointagePro est parfaitement à jour (v$currentAppVersion). Aucune nouvelle mise à jour requise.",
                  style: const TextStyle(fontSize: 12.5),
                ),
              ),
            ],
          ),
          backgroundColor: const Color(0xFF10B981),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    }
  }

  void _showUpdateModal(BuildContext context, AppUpdateInfo info) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Indicateur de glissement
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE2E8F0),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // En-tête avec badge
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(18),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF2563EB).withValues(alpha: 0.3),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: const Icon(Icons.system_update_rounded, color: Colors.white, size: 28),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFBFDBFE)),
                          ),
                          child: const Text(
                            "MISE À JOUR OFFICIELLE DISPONIBLE",
                            style: TextStyle(
                              color: Color(0xFF1D4ED8),
                              fontWeight: FontWeight.w800,
                              fontSize: 9.5,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          "Version ${info.latestVersion}",
                          style: const TextStyle(
                            color: Color(0xFF0F172A),
                            fontWeight: FontWeight.w900,
                            fontSize: 18,
                            letterSpacing: -0.4,
                          ),
                        ),
                        Text(
                          "Version installée : v$currentAppVersion • Déployée le ${info.releaseDate}",
                          style: const TextStyle(
                            color: Color(0xFF64748B),
                            fontSize: 11.5,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Liste des améliorations (Changelog)
              const Text(
                "Nouveautés & Correctifs de cette version :",
                style: TextStyle(
                  color: Color(0xFF0F172A),
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 10),

              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: info.changelog.map((item) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.check_circle_outline_rounded, color: Color(0xFF10B981), size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              item,
                              style: const TextStyle(
                                color: Color(0xFF334155),
                                fontSize: 12,
                                height: 1.35,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),

              const SizedBox(height: 22),

              // Bouton Télécharger & Mettre à jour
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Row(
                          children: [
                            const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                "Téléchargement de l'APK v${info.latestVersion} depuis ${info.apkDownloadUrl}...",
                                style: const TextStyle(fontSize: 12),
                              ),
                            ),
                          ],
                        ),
                        backgroundColor: const Color(0xFF2563EB),
                        duration: const Duration(seconds: 4),
                        behavior: SnackBarBehavior.floating,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    );
                  },
                  icon: const Icon(Icons.cloud_download_rounded, color: Colors.white, size: 20),
                  label: Text(
                    "Mettre à jour maintenant (v${info.latestVersion})",
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              ),

              if (!info.isUpdateRequired) ...[
                const SizedBox(height: 10),
                Center(
                  child: TextButton(
                    onPressed: () => Navigator.pop(ctx),
                    child: const Text(
                      "Rappeler plus tard",
                      style: TextStyle(
                        color: Color(0xFF64748B),
                        fontWeight: FontWeight.w700,
                        fontSize: 12.5,
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}
