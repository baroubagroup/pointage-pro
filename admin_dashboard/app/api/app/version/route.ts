import { NextRequest, NextResponse } from 'next/server';
import os from 'os';

function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  let localIp = '127.0.0.1';
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (
          name.toLowerCase().includes('wi-fi') || 
          name.toLowerCase().includes('wlan') || 
          name.toLowerCase().includes('wireless')
        ) {
          return iface.address;
        } else if (localIp === '127.0.0.1') {
          localIp = iface.address;
        }
      }
    }
  }
  return localIp;
}

export async function GET(request: NextRequest) {
  // Détermination de l'hôte d'appel
  const host = request.headers.get('host') || `${getLocalIp()}:3000`;
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  const baseUrl = `${protocol}://${host}`;

  return NextResponse.json({
    status: 'success',
    app: {
      name: 'PointagePro Enterprise (Application Collaborateur)',
      package: 'com.barouba.pointage_mobile',
      currentVersion: '1.1.0',
      versionCode: 11,
      minSupportedVersion: '1.0.0',
      isUpdateRequired: false,
      releaseDate: '2026-11-22',
      apkDownloadUrl: `${baseUrl}/api/app/download`,
      apkDirectUrl: `${baseUrl}/apk/pointagepro-enterprise-v1.1.0.apk`,
      changelog: [
        '✨ Isolation multi-entreprises étanche pour 100+ organisations indépendantes',
        '🛰️ Précision satellitaire WGS84 au mètre près avec calage sur toiture',
        '🔄 Système de mise à jour transparente intégrée à l\'application',
        '🛡️ Protection anti-fraude renforcée et détection des fausses positions GPS',
        '⚡ Synchronisation hors-ligne avec réconciliation automatique'
      ]
    },
    managerPwa: {
      name: 'PointagePro Gérant (Cockpit Mobile Dirigeant)',
      currentVersion: '2.4.0',
      otaUpdateSupported: true,
      serviceWorkerCacheKey: 'ppro-pwa-v2.4.0-20261122',
      mobileUrl: `${baseUrl}/gerant`,
      changelog: [
        '🚀 Mode application mobile native plein écran pour smartphone',
        '🔄 Mises à jour Over-The-Air (OTA) automatiques en arrière-plan',
        '📱 Bouton de vérification instantanée des mises à jour dans les paramètres',
        '⚖️ Arbitrage des retards et justifications en direct sur Supabase'
      ]
    },
    serverTimeUtc: new Date().toISOString()
  }, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
