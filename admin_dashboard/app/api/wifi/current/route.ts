import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    // 1. Détection sur environnement Windows
    if (process.platform === 'win32') {
      try {
        const { stdout } = await execAsync('netsh wlan show interfaces', { encoding: 'utf8', timeout: 4000 });
        
        let ssid = '';
        let bssid = '';

        const lines = stdout.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();

          // Détection du SSID principal (ex: "SSID                   : ABDEL")
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
          return NextResponse.json({
            success: true,
            ssid: ssid || 'Wi-Fi_Connecte',
            bssid: bssid || null,
            verified: true,
            source: 'hardware_interface',
            message: `Réseau Wi-Fi réel détecté : ${ssid || 'Connecté'}`
          });
        }
      } catch (err) {
        console.warn('Erreur exécution netsh wlan:', err);
      }
    }

    // 2. Sur environnement Linux / Android
    if (process.platform === 'linux') {
      try {
        const { stdout } = await execAsync('iwgetid -r', { encoding: 'utf8', timeout: 2000 });
        const ssid = stdout.trim();
        if (ssid) {
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

    // 3. Si aucun Wi-Fi matériel n'est connecté : réponse HONNÊTE sans AUCUNE donnée fictive
    return NextResponse.json({
      success: false,
      error: "Aucun réseau Wi-Fi connecté n'a pu être scanné sur cette machine. Vous pouvez renseigner manuellement le nom de votre Box (SSID)."
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message || "Erreur lors de la détection Wi-Fi"
    });
  }
}
