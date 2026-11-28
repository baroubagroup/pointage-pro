import 'dart:async';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'offline_sync_service.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp();
  } catch (_) {}
}

class PushNotificationService {
  static final PushNotificationService _instance = PushNotificationService._internal();
  factory PushNotificationService() => _instance;
  PushNotificationService._internal();

  bool _initialized = false;
  String? _currentSubscribedTopic;

  final _foregroundBroadcastController = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get foregroundBroadcastStream => _foregroundBroadcastController.stream;

  String getOrgTopic(String orgId) {
    final clean = orgId.trim().replaceAll(RegExp(r'[^a-zA-Z0-9\-_.~%]'), '_');
    return 'org_$clean';
  }

  Future<void> initialize() async {
    if (_initialized) return;
    try {
      await Firebase.initializeApp();
      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      // Écoute des notifications reçues quand l'application est ouverte
      FirebaseMessaging.onMessage.listen(_handleIncomingRemoteMessage);

      // Écoute des clics sur une notification lorsque l'app était en arrière-plan
      FirebaseMessaging.onMessageOpenedApp.listen(_handleIncomingRemoteMessage);

      // Notification ayant lancé l'application depuis l'état fermé
      final initialMsg = await messaging.getInitialMessage();
      if (initialMsg != null) {
        Future.delayed(const Duration(milliseconds: 600), () {
          _handleIncomingRemoteMessage(initialMsg);
        });
      }

      _initialized = true;
    } catch (_) {
      // Ne jamais bloquer le démarrage hors-ligne ou sur simulateur sans Play Services
    }
  }

  void _handleIncomingRemoteMessage(RemoteMessage message) {
    final data = message.data;
    final bodyText = message.notification?.body ?? data['message']?.toString() ?? '';
    if (bodyText.trim().isEmpty) return;

    final broadcastId = data['broadcast_id']?.toString() ?? message.messageId ?? DateTime.now().millisecondsSinceEpoch.toString();
    _foregroundBroadcastController.add({
      'id': broadcastId,
      'message': bodyText.trim(),
      'sender': data['sender']?.toString() ?? 'Direction / Gérant',
      'sent_at': data['sent_at']?.toString() ?? DateTime.now().toIso8601String(),
      'urgent': true,
    });
  }

  Future<void> syncOrganizationSubscription(String orgId) async {
    if (orgId.trim().isEmpty) return;
    await initialize();
    if (!_initialized) return;

    try {
      final messaging = FirebaseMessaging.instance;
      final newTopic = getOrgTopic(orgId);
      final prevSavedTopic = await OfflineSyncService().getMetaValue('fcm_subscribed_topic');

      if (prevSavedTopic != null && prevSavedTopic.isNotEmpty && prevSavedTopic != newTopic) {
        await messaging.unsubscribeFromTopic(prevSavedTopic);
      }
      if (_currentSubscribedTopic != null && _currentSubscribedTopic != newTopic) {
        await messaging.unsubscribeFromTopic(_currentSubscribedTopic!);
      }

      await messaging.subscribeToTopic(newTopic);
      _currentSubscribedTopic = newTopic;
      await OfflineSyncService().setMetaValue('fcm_subscribed_topic', newTopic);

      // S'assure que l'appareil est bien enregistré auprès de FCM
      await messaging.register();
    } catch (_) {
      // Réessai au prochain lancement si hors-ligne
    }
  }
}
