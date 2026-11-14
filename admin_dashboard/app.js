// Données dynamiques en mémoire
        
        // ==============================================================================
        // CONFIGURATION SUPABASE CLOUD & SYNCHRONISATION TEMPS RÉEL
        // ==============================================================================
        const SUPABASE_URL = 'https://ylrnxuphtaoazlhlmnsd.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlscm54dXBodGFvYXpsaGxtbnNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMDc3NDgsImV4cCI6MjEwMTg4Mzc0OH0._F9Kr-vgD_nahWhVfYJDhP8xRhDw_HyukIHWw5yOC8g';
        const supabase = (window.supabase && window.supabase.createClient) ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

        async function initSupabaseLiveSync() {
            if (!supabase) return;
            try {
                // Charger les sites réels
                const { data: estData } = await supabase.from('pointage_establishments').select('*').eq('is_active', true);
                if (estData && estData.length > 0) {
                    sitesData = estData.map(e => ({
                        id: e.id,
                        name: e.name,
                        city: e.city || 'Abidjan',
                        lat: e.latitude,
                        lon: e.longitude,
                        radius: e.radius_meters || 80,
                        wifi: (e.wifi_bssids && e.wifi_bssids.length > 0) ? e.wifi_bssids.join(', ') : 'Non configuré',
                        employees: 0
                    }));
                    renderSites();
                    updateSiteFilterOptions();
                }

                // Charger les employés réels
                const { data: empData } = await supabase.from('pointage_employees').select('*, pointage_establishments(name)');
                if (empData && empData.length > 0) {
                    employeesData = empData.map(e => ({
                        id: e.enrollment_token || e.id.substring(0, 8),
                        real_id: e.id,
                        name: e.full_name,
                        phone: e.phone || 'Non renseigné',
                        role: e.role === 'ORG_ADMIN' ? 'Gérant' : 'Collaborateur',
                        shift: '07h30 - 17h30 (Fractionné)',
                        site: e.pointage_establishments ? e.pointage_establishments.name : 'Siège Principal',
                        device: e.device_model || (e.bound_device_id ? 'Appareil Associé' : 'En attente'),
                        bound: !!e.bound_device_id
                    }));
                    renderEmployees();
                }

                // Écouter les pointages en temps réel
                supabase.channel('public_pointage_logs')
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pointage_logs' }, payload => {
                        fetchLiveData();
            initSupabaseLiveSync();
                    })
                    .subscribe();

            } catch (err) {
                console.warn('Mode hors-ligne / API locale:', err);
            }
        }

        function updateSiteFilterOptions() {
            const select = document.getElementById('siteFilter');
            const empSiteSelect = document.getElementById('newEmpSite');
            if (!select) return;
            select.innerHTML = '<option value="all">🏢 Tous les sites et agences (Vue Globale)</option>';
            if (empSiteSelect) empSiteSelect.innerHTML = '';
            sitesData.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.name;
                opt.textContent = `🏬 ${s.name} (${s.city})`;
                select.appendChild(opt);

                if (empSiteSelect) {
                    const empOpt = document.createElement('option');
                    empOpt.value = s.name;
                    empOpt.textContent = `${s.name} - ${s.city}`;
                    empSiteSelect.appendChild(empOpt);
                }
            });
        }

        let employeesData = [
            { id: "EMP-001", name: "Amina Traoré", phone: "+225 07 00 00 01", role: "Responsable Vente", shift: "Shift Vente (08h30 - 17h30)", site: "Boutique Centrale - Siège", device: "Samsung Galaxy A54", bound: true },
            { id: "EMP-002", name: "Mamadou Diallo", phone: "+225 07 00 00 02", role: "Gestionnaire Stock", shift: "Shift Coupure Midi (07h30 - 17h30)", site: "Entrepôt Logistique Zone Nord", device: "Nouvel appareil", bound: false },
            { id: "EMP-003", name: "Koffi Konan", phone: "+225 07 00 00 03", role: "Caisse Centrale", shift: "Shift Vente (08h30 - 17h30)", site: "Boutique Centrale - Siège", device: "Samsung Galaxy S22", bound: true }
        ];

        let shiftsData = [
            {
                id: "s1",
                name: "Shift Coupure Midi (Commerce)",
                type: "Fractionné",
                hours: "07h30 - 12h00 & 15h00 - 17h30",
                pause: "3h00 (12h00 à 15h00)",
                assigned: 2
            },
            {
                id: "s2",
                name: "Shift Vente & Accueil Continu",
                type: "Continu",
                hours: "08h30 - 17h30",
                pause: "1h00 déjeuner",
                assigned: 1
            }
        ];

        let sitesData = [
            {
                id: "site_1",
                name: "Boutique Centrale - Siège",
                city: "Abidjan (Marcory Zone 4)",
                lat: "5.30966",
                lon: "-4.00483",
                radius: 80,
                wifi: "aa:bb:cc:dd:ee:ff",
                employees: 3
            }
        ];

        let justificationsData = [
            {
                id: "j_001",
                empName: "Mamadou Diallo",
                role: "Gestionnaire Stock",
                event: "Retard Matin (+18 min)",
                category: "🚗 Embouteillage / Panne transport",
                comment: "Gros ralentissement sur l'autoroute du Nord suite à un camion en panne.",
                status: "PENDING"
            },
            {
                id: "j_002",
                empName: "Amina Traoré",
                role: "Responsable Vente",
                event: "Sortie Déjeuner (+15 min)",
                category: "💼 Rendez-vous Professionnel",
                comment: "Attente de la livraison d'un fournisseur partenaire à proximité.",
                status: "APPROVED"
            }
        ];

        function renderJustifications() {
            const tbody = document.getElementById('justificationsTableBody');
            if (!tbody) return;
            tbody.innerHTML = '';

            const pendingCount = justificationsData.filter(j => j.status === 'PENDING').length;
            const badge = document.getElementById('badgeJustifCount');
            if (badge) {
                badge.textContent = pendingCount;
                badge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
            }

            justificationsData.forEach(item => {
                let statusBadge = '';
                if (item.status === 'PENDING') {
                    statusBadge = `<span class="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full text-[10px]">En attente d'arbitrage</span>`;
                } else if (item.status === 'APPROVED') {
                    statusBadge = `<span class="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">✓ Justifié (Approuvé)</span>`;
                } else {
                    statusBadge = `<span class="bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full text-[10px]">✗ Rejeté (Non justifié)</span>`;
                }

                const tr = document.createElement('tr');
                tr.className = "hover:bg-slate-50 transition";
                tr.innerHTML = `
                    <td class="py-3 px-4">
                        <div class="font-bold text-slate-900">${item.empName}</div>
                        <div class="text-[11px] text-slate-400">${item.role}</div>
                    </td>
                    <td class="py-3 px-4 font-semibold text-slate-800">${item.event}</td>
                    <td class="py-3 px-4"><span class="bg-slate-100 px-2 py-1 rounded-md text-[11px] font-medium">${item.category}</span></td>
                    <td class="py-3 px-4 text-slate-600 italic">"${item.comment}"</td>
                    <td class="py-3 px-4">${statusBadge}</td>
                    <td class="py-3 px-4 text-right space-x-1">
                        ${item.status === 'PENDING' ? `
                            <button onclick="arbitrateJustif('${item.id}', true)" class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2.5 py-1.5 rounded-lg text-[11px] transition">Approuver</button>
                            <button onclick="arbitrateJustif('${item.id}', false)" class="bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-700 font-semibold px-2.5 py-1.5 rounded-lg text-[11px] border border-slate-200 transition">Refuser</button>
                        ` : `<span class="text-slate-400 text-[11px]">Traité</span>`}
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        function arbitrateJustif(id, isApproved) {
            const item = justificationsData.find(x => x.id === id);
            if (item) {
                item.status = isApproved ? 'APPROVED' : 'REJECTED';
                renderJustifications();
                alert(isApproved ? "Justification approuvée ! Le retard est régularisé." : "Justification refusée.");
            }
        }

        function navigateTab(tabId) {
            const tabs = ['live', 'employees', 'justifications', 'planning', 'sites', 'reports', 'security', 'company-settings'];
            tabs.forEach(t => {
                const el = document.getElementById('tab-' + t);
                const deskBtn = document.getElementById('nav-' + t);
                const mobBtn = document.getElementById('mob-nav-' + t);
                if (el) {
                    el.classList.toggle('hidden', t !== tabId);
                }
                if (deskBtn) {
                    if (t === tabId) {
                        deskBtn.className = "w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl bg-blue-600 text-white font-semibold transition";
                    } else {
                        deskBtn.className = "w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition";
                    }
                }
                if (mobBtn) {
                    if (t === tabId) {
                        mobBtn.className = "whitespace-nowrap px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold transition";
                    } else {
                        mobBtn.className = "whitespace-nowrap px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-semibold transition";
                    }
                }
            });

            const titles = {
                'live': 'Supervision en Temps Réel',
                'employees': 'Employés & Enrôlement Sécurisé',
                'justifications': 'Demandes de Justification (Retards & Absences)',
                'planning': 'Plannings & Gestion des Horaires Fractionnés',
                'sites': 'Établissements & Géofencing',
                'reports': 'Relevé d\'Assiduité & Heures Effectives',
                'security': 'Matrice de Sécurité & Anti-Triche',
                'company-settings': 'Configuration de l\'Entreprise'
            };
            const titleEl = document.getElementById('pageTitle');
            if (titleEl) titleEl.textContent = titles[tabId] || 'Portail Entreprise';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Modales
        function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
        function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

        // Rendu des Employés
        function renderEmployees() {
            const tbody = document.getElementById('employeesTableBody');
            tbody.innerHTML = '';
            employeesData.forEach(emp => {
                const tr = document.createElement('tr');
                tr.className = "hover:bg-slate-50 transition";
                tr.innerHTML = `
                    <td class="py-3 px-4">
                        <div class="font-bold text-slate-900">${emp.name}</div>
                        <div class="text-[11px] text-slate-400">${emp.id} • ${emp.phone}</div>
                    </td>
                    <td class="py-3 px-4">
                        <div class="font-semibold text-slate-800">${emp.role}</div>
                        <div class="text-[11px] text-blue-600 font-medium">📍 ${emp.site}</div>
                        <div class="text-[10px] text-slate-400">${emp.shift}</div>
                    </td>
                    <td class="py-3 px-4">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${emp.bound ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}">
                            <i class="fa-solid fa-mobile-screen mr-1"></i> ${emp.device}
                        </span>
                    </td>
                    <td class="py-3 px-4 text-right space-x-1">
                        <button onclick="triggerActivation('${emp.name}', '${emp.id}', '${emp.phone}')" class="bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold px-2.5 py-1.5 rounded-lg border border-blue-200 transition">
                            <i class="fa-brands fa-whatsapp text-emerald-600 mr-1"></i> Inviter / QR
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        function submitNewEmployee(e) {
            e.preventDefault();
            const name = document.getElementById('newEmpName').value;
            const phone = document.getElementById('newEmpPhone').value;
            const role = document.getElementById('newEmpRole').value;
            const shift = document.getElementById('newEmpShift').value;
            const site = document.getElementById('newEmpSite').value;

            const newId = `EMP-00${employeesData.length + 1}`;
            employeesData.unshift({
                id: newId,
                name: name,
                phone: phone,
                role: role,
                shift: shift,
                site: site,
                device: "En attente de liaison",
                bound: false
            });

            closeModal('addEmployeeModal');
            renderEmployees();
            triggerActivation(name, newId, phone);
        }

        // Rendu des Plannings & Shifts
        function renderShifts() {
            const grid = document.getElementById('shiftsGrid');
            grid.innerHTML = '';
            shiftsData.forEach(s => {
                const card = document.createElement('div');
                card.className = "bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3";
                card.innerHTML = `
                    <div class="flex items-center justify-between">
                        <span class="font-bold text-sm text-slate-900">${s.name}</span>
                        <span class="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">${s.type}</span>
                    </div>
                    <div class="space-y-1.5 text-xs text-slate-600">
                        <p><i class="fa-regular fa-clock mr-1 text-slate-400"></i> <strong>Horaires :</strong> ${s.hours}</p>
                        <p><i class="fa-solid fa-coffee mr-1 text-slate-400"></i> <strong>Pause :</strong> ${s.pause}</p>
                        <p><i class="fa-solid fa-shield mr-1 text-slate-400"></i> <strong>Tolérance Grâce :</strong> 5 minutes</p>
                    </div>
                    <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span class="text-slate-400 font-medium">${s.assigned} employé(s)</span>
                        <button class="text-blue-600 font-semibold hover:underline">Modifier</button>
                    </div>
                `;
                grid.appendChild(card);
            });
        }

        function submitNewShift(e) {
            e.preventDefault();
            const name = document.getElementById('newShiftName').value;
            const type = document.getElementById('newShiftType').value;
            const mStart = document.getElementById('newShiftMorningStart').value;
            const bStart = document.getElementById('newShiftBreakStart').value;
            const bEnd = document.getElementById('newShiftBreakEnd').value;
            const dEnd = document.getElementById('newShiftDayEnd').value;

            let hoursStr = `${mStart} - ${dEnd}`;
            let pauseStr = "1h00 déjeuner standard";
            if (type === 'split') {
                hoursStr = `${mStart} - ${bStart} & ${bEnd} - ${dEnd}`;
                pauseStr = `Pause de ${bStart} à ${bEnd}`;
            }

            shiftsData.push({
                id: `s_${shiftsData.length + 1}`,
                name: name,
                type: type === 'split' ? 'Fractionné' : 'Continu',
                hours: hoursStr,
                pause: pauseStr,
                assigned: 0
            });

            closeModal('addShiftModal');
            renderShifts();
        }

        function toggleBreakInputs(val) {
            document.getElementById('breakStartContainer').style.display = val === 'continuous' ? 'none' : 'block';
            document.getElementById('afternoonContainer').style.display = val === 'continuous' ? 'none' : 'grid';
        }

        // Rendu des Sites
        function renderSites() {
            const grid = document.getElementById('sitesGrid');
            grid.innerHTML = '';
            sitesData.forEach(site => {
                const card = document.createElement('div');
                card.className = "bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4";
                card.innerHTML = `
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-2">
                            <span class="text-blue-600 text-lg">🏬</span>
                            <div>
                                <span class="font-bold text-slate-900 text-sm">${site.name}</span>
                                <p class="text-[11px] text-slate-400">${site.city}</p>
                            </div>
                        </div>
                        <span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Actif</span>
                    </div>
                    <div class="p-3 bg-slate-50 rounded-xl space-y-2 text-xs text-slate-600">
                        <div class="flex justify-between">
                            <span class="text-slate-400">Coordonnées GPS :</span>
                            <span class="font-mono font-medium">${site.lat}, ${site.lon}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-400">Rayon Autorisé :</span>
                            <span class="font-bold text-emerald-600">${site.radius} mètres</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-400">Signature Wi-Fi (BSSID) :</span>
                            <span class="font-mono text-blue-600 font-bold">${site.wifi || 'Non configuré'}</span>
                        </div>
                    </div>
                `;
                grid.appendChild(card);
            });
        }

        async function detectSiteCurrentWifi() {
            const feedback = document.getElementById('wifiDetectFeedback');
            const input = document.getElementById('newSiteWifi');
            feedback.textContent = "Détection en cours...";
            try {
                const res = await fetch('/api/wifi/current');
                if (res.ok) {
                    const data = await res.json();
                    if (data.bssid) {
                        let currentVal = input.value.trim();
                        if (!currentVal) {
                            input.value = data.bssid;
                        } else if (!currentVal.toLowerCase().includes(data.bssid.toLowerCase())) {
                            input.value = currentVal + ", " + data.bssid;
                        }
                        feedback.innerHTML = `<span class="text-emerald-600 font-bold">✓ Box Wi-Fi ajoutée à la grappe : ${data.ssid || ''} (${data.bssid})</span>`;
                    } else if (data.ssid) {
                        input.value = data.ssid;
                        feedback.innerHTML = `<span class="text-emerald-600 font-bold">✓ Réseau détecté : ${data.ssid}</span>`;
                    } else {
                        feedback.innerHTML = `<span class="text-amber-600">Aucun Wi-Fi actif détecté sur cet appareil.</span>`;
                    }
                }
            } catch (e) {
                feedback.innerHTML = `<span class="text-red-500">Erreur de connexion au serveur local.</span>`;
            }
        }

        function submitNewSite(e) {
            e.preventDefault();
            sitesData.push({
                id: `site_${sitesData.length + 1}`,
                name: document.getElementById('newSiteName').value,
                city: document.getElementById('newSiteCity').value,
                lat: document.getElementById('newSiteLat').value,
                lon: document.getElementById('newSiteLon').value,
                radius: parseInt(document.getElementById('newSiteRadius').value),
                wifi: document.getElementById('newSiteWifi').value,
                employees: 0
            });
            closeModal('addSiteModal');
            renderSites();
        }

        // Détection GPS Réelle via l'API Navigateur
        function detectCompanyCurrentLocation() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(pos => {
                    document.getElementById('companyLat').value = pos.coords.latitude.toFixed(5);
                    document.getElementById('companyLon').value = pos.coords.longitude.toFixed(5);
                    alert("Position GPS actuelle détectée avec succès !");
                }, err => {
                    alert("Activez la géolocalisation dans votre navigateur pour détecter votre position.");
                });
            }
        }

        function detectSiteCurrentLocation() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(pos => {
                    document.getElementById('newSiteLat').value = pos.coords.latitude.toFixed(5);
                    document.getElementById('newSiteLon').value = pos.coords.longitude.toFixed(5);
                });
            }
        }

        function triggerActivation(name, matricule, phone) {
            currentActiveActivationEmp = { name, matricule, phone };
            document.getElementById('actEmpName').textContent = name;
            document.getElementById('actEmpMatricule').textContent = "Matricule : " + matricule;

            const token = "POINTAGE_PRO_SECURE_TOKEN_v1_" + btoa(JSON.stringify({
                org: document.getElementById('companyInputName').value,
                emp_id: matricule,
                salt: Math.random().toString(36).substring(2)
            }));

            const container = document.getElementById('actQrcode');
            container.innerHTML = '';
            new QRCode(container, { text: token, width: 170, height: 170, colorDark: "#0f172a" });
            openModal('activationModal');
        }

        function sendViaWhatsApp() {
            const msg = encodeURIComponent(`Bonjour ${currentActiveActivationEmp.name},\nVoici votre invitation sécurisée pour activer votre application de pointage de ${document.getElementById('companyInputName').value}.\nEnregistrez l'image reçue dans vos photos puis ouvrez l'application PointagePro et choisissez "Importer depuis la galerie".`);
            window.open(`https://wa.me/?text=${msg}`, '_blank');
        }

        function downloadQRImage() {
            const img = document.querySelector('#actQrcode img');
            if (img) {
                const a = document.createElement('a');
                a.href = img.src;
                a.download = `activation_${currentActiveActivationEmp.matricule}.png`;
                a.click();
            }
        }

        function saveCompanySettings() {
            const name = document.getElementById('companyInputName').value;
            const city = document.getElementById('companyInputCity').value;
            document.getElementById('sidebarOrgName').textContent = name;
            document.getElementById('sidebarOrgCity').textContent = "● " + city;
            alert("Paramètres de l'entreprise enregistrés avec succès !");
        }

        function saveSecurityPolicy() {
            alert("Politique de sécurité et règles anti-fraude sauvegardées avec succès !");
        }

        function renderPayroll() {
            const tbody = document.getElementById('payrollTableBody');
            tbody.innerHTML = `
                <tr class="hover:bg-slate-50 transition">
                    <td class="py-3 px-4 font-bold text-slate-900">Amina Traoré</td>
                    <td class="py-3 px-4 font-medium text-slate-700">154h 00</td>
                    <td class="py-3 px-4 font-bold text-slate-900">156h 30</td>
                    <td class="py-3 px-4 font-bold text-emerald-600">+2h 30</td>
                    <td class="py-3 px-4 text-emerald-600 font-medium">0 min</td>
                    <td class="py-3 px-4"><span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">100%</span></td>
                    <td class="py-3 px-4 text-right"><button onclick="exportDataCSV()" class="text-xs text-blue-600 hover:underline font-semibold">Exporter</button></td>
                </tr>
                <tr class="hover:bg-slate-50 transition">
                    <td class="py-3 px-4 font-bold text-slate-900">Mamadou Diallo</td>
                    <td class="py-3 px-4 font-medium text-slate-700">154h 00</td>
                    <td class="py-3 px-4 font-bold text-slate-900">152h 15</td>
                    <td class="py-3 px-4 text-slate-400">0h 00</td>
                    <td class="py-3 px-4 text-amber-600 font-bold">+48 min</td>
                    <td class="py-3 px-4"><span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">88%</span></td>
                    <td class="py-3 px-4 text-right"><button onclick="exportDataCSV()" class="text-xs text-blue-600 hover:underline font-semibold">Exporter</button></td>
                </tr>
            `;
        }

        let rawLivePunches = [];
        let currentSelectedSiteFilter = "all";

        function filterAttendanceBySite(siteName) {
            currentSelectedSiteFilter = siteName;
            renderLiveTable(rawLivePunches);
        }

        function renderLiveTable(punches) {
            const tbody = document.getElementById('attendanceTableBody');
            tbody.innerHTML = '';

            let filtered = punches;
            if (currentSelectedSiteFilter !== "all") {
                filtered = punches.filter(p => (p.site_name || "Boutique Centrale - Siège") === currentSelectedSiteFilter);
            }

            if (filtered.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-slate-400 text-xs">Aucun pointage pour ce site aujourd'hui.</td></tr>`;
                return;
            }

            filtered.forEach(p => {
                let statusBadge = p.status === 'VERIFIED'
                    ? `<span class="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full text-[11px]">✓ Conforme</span>`
                    : `<span class="bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full text-[11px]">⚠️ Signalé</span>`;

                let flagPills = '';
                if ((p.flags || []).includes('NEW_DEVICE_DETECTED')) flagPills += `<span class="bg-orange-100 text-orange-800 text-[10px] font-bold px-1.5 py-0.5 rounded">📱 Nouvel Appareil</span> `;
                if ((p.flags || []).includes('OUT_OF_BOUNDS_TOLERATED')) flagPills += `<span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">📍 Tolérance (${p.distance_meters}m)</span> `;
                if ((p.flags || []).includes('WIFI_CONFIRMED')) flagPills += `<span class="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.5 rounded">📶 Wi-Fi Box</span> `;
                if ((p.flags || []).includes('EXCESS_BREAK_DELAY')) flagPills += `<span class="bg-amber-100 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded">☕ Dépassement Pause (+25 min)</span> `;

                const tr = document.createElement('tr');
                tr.className = "hover:bg-slate-50 transition";
                tr.innerHTML = `
                    <td class="py-3 px-4">
                        <div class="font-bold text-slate-900">${p.name}</div>
                        <div class="text-[11px] text-slate-400">${p.role}</div>
                    </td>
                    <td class="py-3 px-4">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-800">
                            🏢 ${p.site_name || "Boutique Centrale - Siège"}
                        </span>
                    </td>
                    <td class="py-3 px-4">
                        <div class="font-medium text-slate-900">${p.recorded_at}</div>
                        ${p.is_late ? `<div class="text-[11px] text-amber-600 font-bold">+${p.late_minutes} min retard</div>` : `<div class="text-[11px] text-emerald-600">À l'heure</div>`}
                    </td>
                    <td class="py-3 px-4">
                        <div class="text-xs text-slate-600">à ${p.distance_meters}m</div>
                        <div class="text-[11px] text-slate-400">${p.device_model}</div>
                    </td>
                    <td class="py-3 px-4">
                        <div class="mb-1">${statusBadge}</div>
                        <div class="flex flex-wrap gap-1">${flagPills}</div>
                    </td>
                    <td class="py-3 px-4 text-right"><span class="text-emerald-500 font-bold">OK</span></td>
                `;
                tbody.appendChild(tr);
            });
        }

        async function fetchLiveData() {
            try {
                const res = await fetch('/api/attendance/today');
                if (res.ok) {
                    const data = await res.json();
                    rawLivePunches = (data.punches || []).map((p, idx) => {
                        // Simulation de répartition multisites
                        p.site_name = idx === 1 ? "Entrepôt Logistique Zone Nord" : "Boutique Centrale - Siège";
                        return p;
                    });
                    
                    document.getElementById('statPresent').innerHTML = `${data.summary.total_present} <span class="text-sm font-normal text-slate-400">/ 5</span>`;
                    document.getElementById('statRetards').textContent = data.summary.late_count;
                    document.getElementById('statAlertes').textContent = data.summary.alerts_count;
                    document.getElementById('statWifi').textContent = data.summary.wifi_count;

                    renderLiveTable(rawLivePunches);
                }
            } catch(e) {}
        }

        
        function exportDataCSV() {
            if (rawLivePunches && rawLivePunches.length > 0) {
                let csv = "\uFEFFEmploye;Site;Heure;Distance;Statut;Alertes\n";
                rawLivePunches.forEach(p => {
                    const flags = (p.flags || []).join(' | ');
                    csv += `"${p.name}";"${p.site_name || 'Siège'}";"${p.recorded_at}";"${p.distance_meters}m";"${p.status}";"${flags}"\n`;
                });
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", `releve_pointage_${new Date().toISOString().slice(0,10)}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                window.location.href = '/api/export/csv';
            }
        }


        window.onload = function() {
            renderEmployees();
            renderJustifications();
            renderShifts();
            renderSites();
            renderPayroll();
            fetchLiveData();
            initSupabaseLiveSync();
            setInterval(fetchLiveData, 3000);
        };