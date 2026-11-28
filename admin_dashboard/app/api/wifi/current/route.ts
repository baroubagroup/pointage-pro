import { NextResponse } from 'next/server';
import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import { createClient } from '@/lib/supabase/client';

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

// Cache mémoire serveur court (10 secondes) pour éviter les blocages de pilotes radio
let cachedWifi: {
  ssid: string;
  bssid: string | null;
  timestamp: number;
} | null = null;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    // 0. Si un Wi-Fi réel a été scanné il y a moins de 10 secondes et pas de forceRefresh
    if (!forceRefresh && cachedWifi && Date.now() - cachedWifi.timestamp < 10000) {
      return NextResponse.json({
        success: true,
        ssid: cachedWifi.ssid,
        bssid: cachedWifi.bssid,
        verified: true,
        source: 'hardware_cached',
        message: `Réseau Wi-Fi réel détecté : ${cachedWifi.ssid}`
      });
    }

    // 1. Détection matérielle directe sur Windows (netsh.exe)
    if (process.platform === 'win32') {
      let stdout = '';
      const netshPath = process.env.SystemRoot ? `${process.env.SystemRoot}\\System32\\netsh.exe` : 'netsh.exe';
      try {
        const res = await execFileAsync(netshPath, ['wlan', 'show', 'interfaces'], {
          encoding: 'utf8',
          timeout: 10000
        });
        stdout = res.stdout;
      } catch (fileErr) {
        // Fallback avec shell standard si execFile direct échoue
        try {
          const res = await execAsync('netsh wlan show interfaces', {
            encoding: 'utf8',
            timeout: 10000
          });
          stdout = res.stdout;
        } catch (shellErr) {
          console.warn('Erreur exécution netsh wlan:', shellErr);
        }
      }

      if (stdout) {
        let ssid = '';
        let bssid = '';

        const lines = stdout.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();

          // Détection du SSID principal (ex: "SSID                   : SAKO")
          const ssidMatch = trimmed.match(/^\s*SSID\s*:\s*(.+)$/i);
          if (ssidMatch && !ssid && !trimmed.toLowerCase().includes('bssid') && !trimmed.toLowerCase().includes('point')) {
            ssid = ssidMatch[1].trim();
          }

          // Détection du BSSID / Adresse MAC du point d'accès (tolérance apostrophe Unicode et ASCII)
          const macMatch = trimmed.match(/([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}/);
          if (macMatch && !bssid) {
            const lower = trimmed.toLowerCase();
            if (lower.includes('bssid') || lower.includes('point') || lower.includes('accès') || lower.includes('acces') || lower.includes('identificateur')) {
              bssid = macMatch[0].toLowerCase();
            }
          }
        }

        if (ssid || bssid) {
          cachedWifi = {
            ssid: ssid || 'Wi-Fi_Connecte',
            bssid: bssid || null,
            timestamp: Date.now()
          };

          return NextResponse.json({
            success: true,
            ssid: cachedWifi.ssid,
            bssid: cachedWifi.bssid,
            verified: true,
            source: 'hardware_interface',
            message: `Réseau Wi-Fi réel détecté : ${cachedWifi.ssid}`
          });
        }
      }
    }

    // 2. Sur environnement Linux / Android
    if (process.platform === 'linux') {
      try {
        const { stdout } = await execAsync('iwgetid -r', { encoding: 'utf8', timeout: 3000 });
        const ssid = stdout.trim();
        if (ssid) {
          cachedWifi = { ssid, bssid: null, timestamp: Date.now() };
          return NextResponse.json({
            success: true,
            ssid,
            bssid: null,
            verified: true,
            source: 'linux_wireless',
            message: `Réseau Wi-Fi réel détecté : ${ssid}`
          });
        }
      } catch {}
    }

    // 3. Si aucun Wi-Fi matériel n'a pu être scanné en direct sur cette machine
    return NextResponse.json({
      success: false,
      error: "Aucun réseau Wi-Fi n'est connecté en direct sur cette machine."
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message || "Erreur lors de la détection Wi-Fi"
    });
  }
}
