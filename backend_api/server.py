"""
SERVEUR API CENTRAL - POINTAGE SÉCURISÉ (100% LOGICIEL)
Gère la réception des pointages mobiles, le calcul de distance géodésique,
la détection d'alertes, la résilience hors-ligne et l'alimentation du dashboard.
"""

import os
import sys
import json
import math
from datetime import datetime, time, timezone
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Configuration par défaut du lieu de travail (Siège)
OFFICE_CONFIG = {
    "name": "Boutique Centrale - Siège",
    "latitude": 48.8566,
    "longitude": 2.3522,
    "radius_meters": 80,
    "elastic_radius_meters": 150,
    # Grappe de signatures Wi-Fi autorisées (2.4 GHz, 5 GHz et répéteurs du site)
    "wifi_bssids": ["68:9e:29:3b:43:08", "68:9e:29:3b:43:09", "aa:bb:cc:dd:ee:ff"],
    "expected_checkin_time": time(8, 30),
    "grace_period_minutes": 5
}

# Base de données en mémoire (ou connectable à Supabase / PostgreSQL)
DB = {
    "users": {
        "a1b2c3d4-e5f6-7890-abcd-ef1234567890": {
            "name": "Jean Dupont",
            "role": "Employé Polyvalent",
            "bound_device_id": "device_origin_123",
            "device_model": "Samsung Galaxy A53"
        },
        "emp_002": {
            "name": "Amina Traoré",
            "role": "Vendeuse Principale",
            "bound_device_id": "device_amina_456",
            "device_model": "Samsung Galaxy A54"
        },
        "emp_003": {
            "name": "Mamadou Diallo",
            "role": "Gestionnaire Stock",
            "bound_device_id": "device_mamadou_789",
            "device_model": "Xiaomi Redmi 12"
        }
    },
    "attendance_logs": [
        {
            "id": "log_001",
            "user_id": "emp_002",
            "name": "Amina Traoré",
            "role": "Vendeuse Principale",
            "punch_type": "CHECK_IN",
            "recorded_at": "08:24:15",
            "distance_meters": 12.4,
            "device_model": "Samsung Galaxy A54",
            "status": "VERIFIED",
            "flags": ["WIFI_CONFIRMED"],
            "is_late": False,
            "late_minutes": 0
        },
        {
            "id": "log_002",
            "user_id": "emp_003",
            "name": "Mamadou Diallo",
            "role": "Gestionnaire Stock",
            "punch_type": "CHECK_IN",
            "recorded_at": "08:44:20",
            "distance_meters": 94.0,
            "device_model": "iPhone 13 (Nouveau)",
            "status": "FLAGGED",
            "flags": ["NEW_DEVICE_DETECTED", "OUT_OF_BOUNDS_TOLERATED"],
            "is_late": True,
            "late_minutes": 14
        }
    ]
}

import subprocess
import re

def get_system_current_wifi():
    """Détecte automatiquement le BSSID et le SSID du Wi-Fi connecté sous Windows/Mac/Linux."""
    wifi_info = {"connected": False, "ssid": None, "bssid": None}
    try:
        if sys.platform.startswith('win'):
            # Commande Windows native
            proc = subprocess.run(['netsh', 'wlan', 'show', 'interfaces'], capture_output=True, text=True, encoding='cp850', errors='ignore')
            output = proc.stdout
            
            # Recherche du SSID
            ssid_match = re.search(r'^\s*SSID\s*:\s*(.+)$', output, re.MULTILINE)
            if ssid_match:
                wifi_info["ssid"] = ssid_match.group(1).strip()
                wifi_info["connected"] = True

            # Recherche du BSSID (adresse MAC de la box)
            # En français ou en anglais (Point d'accès / BSSID)
            bssid_match = re.search(r'([0-9a-fA-F]{2}[:-]){5}([0-9a-fA-F]{2})', output)
            if bssid_match:
                # Éviter de capturer l'adresse physique du PC, chercher la 2e MAC si présente
                all_macs = re.findall(r'([0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2})', output)
                if len(all_macs) >= 2:
                    wifi_info["bssid"] = all_macs[1].lower() # La 2ème est celle de la box (AP)
                elif len(all_macs) == 1:
                    wifi_info["bssid"] = all_macs[0].lower()
    except Exception as e:
        print(f"Erreur détection Wi-Fi : {e}")

    return wifi_info

def calculate_haversine_distance(lat1, lon1, lat2, lon2):
    """Calcule la distance géodésique précise en mètres entre deux coordonnées GPS."""
    R = 6371000 # Rayon de la Terre en mètres
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)
    """Calcule la distance géodésique précise en mètres entre deux coordonnées GPS."""
    R = 6371000 # Rayon de la Terre en mètres
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)

class PointageAPIHandler(SimpleHTTPRequestHandler):
    def _send_json(self, status_code, data):
        payload = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def end_headers(self):
        # Activation CORS pour permettre la communication avec l'admin dashboard
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)

        # 0. API : Détection automatique du Wi-Fi système
        if parsed.path == '/api/wifi/current':
            info = get_system_current_wifi()
            self._send_json(200, info)
            return

        # 1. API : Récupération des présences du jour pour le Dashboard
        if parsed.path == '/api/attendance/today':
            total_present = len(DB["attendance_logs"])
            alerts_count = sum(1 for x in DB["attendance_logs"] if x["status"] == "FLAGGED")
            late_count = sum(1 for x in DB["attendance_logs"] if x.get("is_late", False))
            wifi_count = sum(1 for x in DB["attendance_logs"] if "WIFI_CONFIRMED" in x.get("flags", []))

            response_data = {
                "site": OFFICE_CONFIG["name"],
                "summary": {
                    "total_present": total_present,
                    "alerts_count": alerts_count,
                    "late_count": late_count,
                    "wifi_count": wifi_count
                },
                "punches": DB["attendance_logs"]
            }
            self._send_json(200, response_data)
            return

        # 2. API : Export Paie en format CSV
        elif parsed.path == '/api/export/csv':
            self.send_response(200)
            self.send_header('Content-Type', 'text/csv; charset=utf-8')
            self.send_header('Content-Disposition', 'attachment; filename="pointages_officiel.csv"')
            self.end_headers()

            csv_lines = ["ID,Employé,Rôle,Type,Heure,Distance_m,Appareil,Statut,Alertes,Retard_min\n"]
            for p in DB["attendance_logs"]:
                flags_str = ";".join(p.get("flags", []))
                csv_lines.append(f'"{p["id"]}","{p["name"]}","{p["role"]}","{p["punch_type"]}","{p["recorded_at"]}",{p["distance_meters"]},"{p["device_model"]}","{p["status"]}","{flags_str}",{p.get("late_minutes", 0)}\n')
            
            self.wfile.write("".join(csv_lines).encode('utf-8'))
            return

        # 3. Servir les fichiers statiques du dashboard si demandé
        dashboard_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'admin_dashboard'))
        req_file = parsed.path.lstrip('/')
        if not req_file or req_file == '/':
            req_file = 'index.html'

        target_path = os.path.join(dashboard_dir, req_file)
        if os.path.exists(target_path) and os.path.isfile(target_path):
            self.send_response(200)
            if target_path.endswith('.html'):
                self.send_header('Content-Type', 'text/html; charset=utf-8')
            elif target_path.endswith('.js'):
                self.send_header('Content-Type', 'application/javascript')
            elif target_path.endswith('.css'):
                self.send_header('Content-Type', 'text/css')
            self.end_headers()
            with open(target_path, 'rb') as f:
                self.wfile.write(f.read())
            return

        self.send_response(404)
        self.end_headers()
        self.wfile.write(b"Ressource introuvable.")

    def do_POST(self):
        parsed = urlparse(self.path)

        # 1. API : Réception d'un pointage mobile
        if parsed.path == '/api/punch':
            content_length = int(self.headers.get('Content-Length', 0))
            body_bytes = self.rfile.read(content_length)
            
            try:
                data = json.loads(body_bytes.decode('utf-8'))
            except Exception:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "JSON invalide"}).encode('utf-8'))
                return

            user_id = data.get("p_user_id") or "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
            lat = data.get("p_latitude")
            lon = data.get("p_longitude")
            is_mock = data.get("p_is_mock_location", False)
            device_id = data.get("p_device_id", "unknown")
            device_model = data.get("p_device_model", "Inconnu")
            wifi_bssid = data.get("p_wifi_bssid")
            punch_type = data.get("p_punch_type", "CHECK_IN")
            recorded_at_raw = data.get("p_recorded_at_utc")

            # A. Vérification Anti-Faux GPS (Blocage dur)
            if is_mock:
                self._send_json(403, {
                    "success": False,
                    "error": "Pointage rejeté : Détection d'application de faux GPS."
                })
                return

            # B. Calcul de distance
            distance = 0.0
            if lat is not None and lon is not None:
                distance = calculate_haversine_distance(lat, lon, OFFICE_CONFIG["latitude"], OFFICE_CONFIG["longitude"])

            # C. Analyse des alertes (Soft Flags)
            flags = []
            status = "VERIFIED"

            # Règle 1 : Changement de téléphone
            user = DB["users"].get(user_id, {
                "name": "Jean Dupont",
                "role": "Employé",
                "bound_device_id": device_id,
                "device_model": device_model
            })
            if user.get("bound_device_id") and user["bound_device_id"] != device_id:
                status = "FLAGGED"
                flags.append("NEW_DEVICE_DETECTED")

            # Règle 2 : Signature Wi-Fi (Multi-BSSID : 2.4 GHz, 5 GHz et Répéteurs)
            if wifi_bssid and OFFICE_CONFIG.get("wifi_bssids"):
                authorized_bssids = [b.lower().strip() for b in OFFICE_CONFIG["wifi_bssids"]]
                if wifi_bssid.lower().strip() in authorized_bssids:
                    flags.append("WIFI_CONFIRMED")

            # Règle 3 : Distance
            if distance > OFFICE_CONFIG["elastic_radius_meters"]:
                # Trop loin (> 150m) : Refus net
                self._send_json(400, {
                    "success": False,
                    "error": f"Vous êtes trop éloigné ({distance}m) pour pointer."
                })
                return
            elif distance > OFFICE_CONFIG["radius_meters"]:
                # Entre 80m et 150m : Alerte orange
                status = "FLAGGED"
                flags.append("OUT_OF_BOUNDS_TOLERATED")

            # D. Calcul de retard (Matin ou Dépassement Pause)
            now_time = datetime.now().time()
            is_late = False
            late_minutes = 0
            if punch_type == "CHECK_IN":
                expected = OFFICE_CONFIG["expected_checkin_time"]
                if now_time.hour > expected.hour or (now_time.hour == expected.hour and now_time.minute > (expected.minute + OFFICE_CONFIG["grace_period_minutes"])):
                    is_late = True
                    late_minutes = (now_time.hour * 60 + now_time.minute) - (expected.hour * 60 + expected.minute)
            elif punch_type == "BREAK_END":
                # Si le retour de pause dépasse l'horaire prévu
                flags.append("EXCESS_BREAK_DELAY")

            # E. Enregistrement
            punch_record = {
                "id": f"log_{len(DB['attendance_logs']) + 1:03d}",
                "user_id": user_id,
                "name": user["name"],
                "role": user["role"],
                "punch_type": punch_type,
                "recorded_at": datetime.now().strftime("%H:%M:%S"),
                "distance_meters": distance,
                "device_model": device_model,
                "status": status,
                "flags": flags,
                "is_late": is_late,
                "late_minutes": late_minutes
            }
            DB["attendance_logs"].insert(0, punch_record)

            self._send_json(200, {
                "success": True,
                "punch_id": punch_record["id"],
                "status": status,
                "flags": flags,
                "distance_meters": distance,
                "recorded_at": punch_record["recorded_at"]
            })
            return

        # 2. API : Acquittement d'une alerte par le manager
        elif parsed.path == '/api/alerts/acknowledge':
            content_length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(content_length).decode('utf-8'))
            log_id = body.get("log_id")

            for item in DB["attendance_logs"]:
                if item["id"] == log_id:
                    item["status"] = "VERIFIED"
                    item["flags"] = [f for f in item["flags"] if f not in ("NEW_DEVICE_DETECTED", "OUT_OF_BOUNDS_TOLERATED")]
                    break

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

def run_server(port=8000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, PointageAPIHandler)
    print("==================================================================")
    print(f"SERVEUR API & DASHBOARD EN LIGNE SUR : http://localhost:{port}")
    print(f"Ouvrez votre navigateur sur http://localhost:{port}")
    print("==================================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nArrêt du serveur.")
        httpd.server_close()

if __name__ == '__main__':
    port = 8000
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    run_server(port)
