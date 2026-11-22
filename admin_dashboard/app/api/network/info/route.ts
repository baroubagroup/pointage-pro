import { NextResponse } from 'next/server';
import os from 'os';

export async function GET() {
  const interfaces = os.networkInterfaces();
  let localIp = '127.0.0.1';
  const detectedIps: { name: string; ip: string }[] = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        detectedIps.push({ name, ip: iface.address });
        // Priorité absolue au Wi-Fi / WLAN
        if (
          name.toLowerCase().includes('wi-fi') || 
          name.toLowerCase().includes('wlan') || 
          name.toLowerCase().includes('wireless')
        ) {
          localIp = iface.address;
        } else if (localIp === '127.0.0.1') {
          localIp = iface.address;
        }
      }
    }
  }

  // Fallback si non trouvé
  if (localIp === '127.0.0.1' && detectedIps.length > 0) {
    localIp = detectedIps[0].ip;
  }

  return NextResponse.json({
    success: true,
    localIp,
    detectedIps,
    port: 3000,
    calibrerUrl: `http://${localIp}:3000/calibrer`,
    maquetteUrl: `http://${localIp}:3000/maquette-gerant`
  });
}
