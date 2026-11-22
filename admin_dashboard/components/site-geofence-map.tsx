'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Layers, 
  LocateFixed, 
  ExternalLink, 
  Navigation, 
  CheckCircle2, 
  AlertTriangle, 
  Crosshair, 
  Search, 
  Loader2, 
  MapPin, 
  X,
  Compass,
  Target,
  ClipboardPaste,
  Building2,
  ZoomIn
} from 'lucide-react';

interface SiteGeofenceMapProps {
  name: string;
  city: string;
  lat: number;
  lon: number;
  radiusMeters: number;
  wifiSsid?: string;
  onCoordinatesChange?: (lat: number, lon: number) => void;
  interactive?: boolean;
  mode?: 'test' | 'picker';
  defaultStyle?: 'streets' | 'satellite' | 'googleHybrid';
  heightClassName?: string;
}

interface SearchSuggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

// Repères et quartiers réels clés (Burkina Faso)
const REGION_PRESETS = {
  bobo: [
    { name: 'Bobo Centre / Gare', lat: 11.1783, lon: -4.2965 },
    { name: 'Kuinima (Secteur 5)', lat: 11.1620, lon: -4.2790 },
    { name: 'Sarfalao (Secteur 17)', lat: 11.1550, lon: -4.2620 },
    { name: 'Accart-Ville (Secteur 9)', lat: 11.1920, lon: -4.3050 },
    { name: 'Bindougousso (Secteur 2)', lat: 11.1710, lon: -4.3180 },
    { name: 'Zone Industrielle', lat: 11.1650, lon: -4.3250 },
    { name: 'Belle-Ville', lat: 11.1420, lon: -4.2850 },
  ],
  ouaga: [
    { name: 'Ouaga 2000', lat: 12.3080, lon: -1.5050 },
    { name: 'Centre-Ville / Rood Woko', lat: 12.3685, lon: -1.5230 },
    { name: 'Gounghin', lat: 12.3550, lon: -1.5520 },
    { name: 'Karpala', lat: 12.3250, lon: -1.4850 },
    { name: 'Pissy', lat: 12.3420, lon: -1.5750 },
    { name: 'Somgandé', lat: 12.4050, lon: -1.4850 },
  ]
};

export function SiteGeofenceMap({
  name,
  city,
  lat,
  lon,
  radiusMeters,
  wifiSsid,
  onCoordinatesChange,
  interactive = true,
  mode = 'test',
  defaultStyle = 'googleHybrid',
  heightClassName,
}: SiteGeofenceMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const testMarkerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const initialStyle = defaultStyle === 'satellite' ? 'googleHybrid' : defaultStyle;
  const [mapStyle, setMapStyle] = useState<'streets' | 'googleHybrid' | 'esriSatellite'>(initialStyle as any);
  
  // Viseur central de calage chirurgical
  const [crosshairActive, setCrosshairActive] = useState(false);
  const [centerCoords, setCenterCoords] = useState<{ lat: number; lon: number }>({ lat, lon });
  const [showPresets, setShowPresets] = useState(false);
  const [activePresetCity, setActivePresetCity] = useState<'bobo' | 'ouaga'>('bobo');

  const [testResult, setTestResult] = useState<{
    inside: boolean;
    distanceMeters: number;
    testLat: number;
    testLon: number;
  } | null>(null);

  // Recherche de lieu / quartier en direct
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fournisseurs de tuiles cartographiques réelles
  const TILE_PROVIDERS: Record<string, { url: string; attribution: string; maxZoom: number; subdomains?: string[] }> = {
    // 1. Google Maps Satellite Hybride (Zoom jusqu'à 20 : toitures, ruelles et portails nets)
    googleHybrid: {
      url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      attribution: '&copy; Google Maps Hybride Réel',
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    },
    // 2. OpenStreetMap Standard (Plan rues mondial vérifié)
    streets: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributeurs',
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
    },
    // 3. Esri World Imagery (Satellite alternatif)
    esriSatellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri',
      maxZoom: 19,
      subdomains: ['server'],
    },
  };

  // Résolution d'adresse humaine en direct par géocodage inversé (Reverse Geocoding)
  const fetchReverseAddress = useCallback(async (tLat: number, tLon: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${tLat}&lon=${tLon}`, {
        headers: { 'Accept-Language': 'fr' }
      });
      const data = await res.json();
      if (data && data.display_name) {
        const parts = data.display_name.split(',').map((p: string) => p.trim());
        const shortAddr = parts.slice(0, 3).join(', ');
        setResolvedAddress(shortAddr || data.display_name);
      }
    } catch {}
  }, []);

  // Analyseur intelligent de coordonnées ou de liens Google Maps collés
  const parsePastedCoordinatesOrUrl = (text: string): { lat: number; lon: number } | null => {
    const raw = text.trim();
    
    // Format 1 : URL Google Maps (ex: @11.180612,-4.294910 ou ?q=11.180612,-4.294910)
    const urlMatch = raw.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || raw.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (urlMatch) {
      return { lat: parseFloat(urlMatch[1]), lon: parseFloat(urlMatch[2]) };
    }

    // Format 2 : Décimal direct (ex: "11.180612, -4.294910" ou "11.180612 -4.294910")
    const coordMatch = raw.match(/^(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)$/);
    if (coordMatch) {
      return { lat: parseFloat(coordMatch[1]), lon: parseFloat(coordMatch[2]) };
    }

    return null;
  };

  // Déclencher la recherche de lieu quand l'utilisateur tape ou colle
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    // Vérifier si l'utilisateur a collé des coordonnées directes ou un lien Google Maps
    const parsed = parsePastedCoordinatesOrUrl(val);
    if (parsed && mapInstanceRef.current) {
      applyNewCoordinates(parsed.lat, parsed.lon, 19, 'Coordonnées collées appliquées');
      setShowSuggestions(false);
      return;
    }

    if (!val.trim() || val.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const q = encodeURIComponent(val.trim());
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${q}`, {
          headers: { 'Accept-Language': 'fr' }
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          setSuggestions(data);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.warn('Geocoding search error:', err);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  // Appliquer des coordonnées et déplacer la carte avec animation fluide
  const applyNewCoordinates = (newLat: number, newLon: number, targetZoom = 18, customLabel?: string) => {
    if (!mapInstanceRef.current) return;
    const cleanLat = Number(newLat.toFixed(6));
    const cleanLon = Number(newLon.toFixed(6));

    mapInstanceRef.current.flyTo([cleanLat, cleanLon], targetZoom, { duration: 1.2 });

    if (markerRef.current) {
      markerRef.current.setLatLng([cleanLat, cleanLon]);
    }
    if (circleRef.current) {
      circleRef.current.setLatLng([cleanLat, cleanLon]);
    }

    onCoordinatesChange?.(cleanLat, cleanLon);
    fetchReverseAddress(cleanLat, cleanLon);
    if (customLabel) {
      setSearchQuery(customLabel);
    }
  };

  // Sélectionner une suggestion de lieu
  const handleSelectSuggestion = (sugg: SearchSuggestion) => {
    const sLat = parseFloat(sugg.lat);
    const sLon = parseFloat(sugg.lon);
    if (!isNaN(sLat) && !isNaN(sLon)) {
      applyNewCoordinates(sLat, sLon, 18, sugg.display_name.split(',').slice(0, 2).join(', '));
      setResolvedAddress(sugg.display_name);
      setShowSuggestions(false);
    }
  };

  // Calage chirurgical : Verrouiller les coordonnées du centre du viseur
  const handleLockCrosshairCenter = () => {
    if (!mapInstanceRef.current) return;
    const center = mapInstanceRef.current.getCenter();
    applyNewCoordinates(center.lat, center.lng, mapInstanceRef.current.getZoom(), 'Calamage sur toiture verrouillé');
  };

  // Préréglage de zoom
  const handleSetZoomLevel = (zoomLvl: number) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setZoom(zoomLvl, { animate: true });
  };

  // Initialisation de la carte Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lon],
        zoom: 17,
        maxZoom: 20,
        zoomControl: false,
        attributionControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Couche de tuiles initiale (Google Maps Hybride maxZoom 20 par défaut)
      const provider = TILE_PROVIDERS[mapStyle] || TILE_PROVIDERS.googleHybrid;
      const tiles = L.tileLayer(provider.url, {
        attribution: provider.attribution,
        maxZoom: provider.maxZoom,
        subdomains: provider.subdomains,
      }).addTo(map);
      tileLayerRef.current = tiles;

      // Cercle de géofencing WGS84 officiel
      const circle = L.circle([lat, lon], {
        radius: radiusMeters,
        color: '#38bdf8',
        weight: 2.5,
        fillColor: '#0284c7',
        fillOpacity: 0.22,
      }).addTo(map);
      circleRef.current = circle;

      // Pin central de l'établissement
      const icon = L.divIcon({
        className: 'custom-site-pin',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
            <div style="background: #0f172a; color: white; padding: 4px 10px; border-radius: 10px; font-size: 11px; font-weight: 800; white-space: nowrap; box-shadow: 0 4px 14px rgba(0,0,0,0.4); border: 1.5px solid #38bdf8; margin-bottom: 4px;">
              🏢 ${name || 'Votre Établissement'}
            </div>
            <div style="width: 16px; height: 16px; background: #2563eb; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 0 12px rgba(37,99,235,0.8);"></div>
          </div>
        `,
        iconSize: [0, 0],
      });

      if (mode === 'picker') {
        const marker = L.marker([lat, lon], { icon, draggable: true }).addTo(map);
        markerRef.current = marker;

        marker.on('dragend', (e: any) => {
          const pos = e.target.getLatLng();
          const pLat = Number(pos.lat.toFixed(6));
          const pLon = Number(pos.lng.toFixed(6));
          if (circleRef.current) circleRef.current.setLatLng(pos);
          onCoordinatesChange?.(pLat, pLon);
          fetchReverseAddress(pLat, pLon);
        });

        map.on('click', (e: L.LeafletMouseEvent) => {
          const clickLat = Number(e.latlng.lat.toFixed(6));
          const clickLon = Number(e.latlng.lng.toFixed(6));
          if (markerRef.current) markerRef.current.setLatLng(e.latlng);
          if (circleRef.current) circleRef.current.setLatLng(e.latlng);
          onCoordinatesChange?.(clickLat, clickLon);
          fetchReverseAddress(clickLat, clickLon);
        });

        // Suivi du centre de la carte pour le viseur
        map.on('move', () => {
          const center = map.getCenter();
          setCenterCoords({ lat: Number(center.lat.toFixed(6)), lon: Number(center.lng.toFixed(6)) });
        });
      } else {
        const marker = L.marker([lat, lon], { icon }).addTo(map);
        markerRef.current = marker;

        if (interactive) {
          map.on('click', (e: L.LeafletMouseEvent) => {
            const clickLat = e.latlng.lat;
            const clickLon = e.latlng.lng;

            const centerLatLng = L.latLng(lat, lon);
            const distance = Math.round(centerLatLng.distanceTo(e.latlng));
            const inside = distance <= radiusMeters;

            setTestResult({
              inside,
              distanceMeters: distance,
              testLat: clickLat,
              testLon: clickLon,
            });

            if (testMarkerRef.current) {
              testMarkerRef.current.setLatLng(e.latlng);
            } else {
              const testIcon = L.divIcon({
                className: 'custom-test-pin',
                html: `
                  <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
                    <div style="background: ${inside ? '#059669' : '#dc2626'}; color: white; padding: 2px 6px; border-radius: 6px; font-size: 10px; font-weight: 800; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                      ${inside ? '✓ Dans zone' : '✕ Hors zone'} (${distance}m)
                    </div>
                    <div style="width: 12px; height: 12px; background: ${inside ? '#10b981' : '#ef4444'}; border: 2px solid #ffffff; border-radius: 50%;"></div>
                  </div>
                `,
                iconSize: [0, 0],
              });
              testMarkerRef.current = L.marker(e.latlng, { icon: testIcon }).addTo(map);
            }
          });
        }
      }

      mapInstanceRef.current = map;
      fetchReverseAddress(lat, lon);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Mise à jour de la position et du rayon quand les props changent
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    map.setView([lat, lon], map.getZoom() || 17, { animate: true });

    if (circleRef.current) {
      circleRef.current.setLatLng([lat, lon]);
      circleRef.current.setRadius(radiusMeters);
    }

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lon]);
      const icon = L.divIcon({
        className: 'custom-site-pin',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
            <div style="background: #0f172a; color: white; padding: 4px 10px; border-radius: 10px; font-size: 11px; font-weight: 800; white-space: nowrap; box-shadow: 0 4px 14px rgba(0,0,0,0.4); border: 1.5px solid #38bdf8; margin-bottom: 4px;">
              🏢 ${name || 'Votre Établissement'}
            </div>
            <div style="width: 16px; height: 16px; background: #2563eb; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 0 12px rgba(37,99,235,0.8);"></div>
          </div>
        `,
        iconSize: [0, 0],
      });
      markerRef.current.setIcon(icon);
    }

    if (testMarkerRef.current) {
      testMarkerRef.current.remove();
      testMarkerRef.current = null;
    }
    setTestResult(null);
  }, [lat, lon, radiusMeters, name]);

  // Changement de style de carte
  const handleToggleStyle = (newStyle: 'streets' | 'googleHybrid' | 'esriSatellite') => {
    if (!mapInstanceRef.current || newStyle === mapStyle) return;
    setMapStyle(newStyle);

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const provider = TILE_PROVIDERS[newStyle];
    const newTiles = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: provider.maxZoom,
      subdomains: provider.subdomains,
    }).addTo(mapInstanceRef.current);
    tileLayerRef.current = newTiles;

    if (circleRef.current) {
      if (newStyle === 'googleHybrid' || newStyle === 'esriSatellite') {
        circleRef.current.setStyle({
          color: '#38bdf8',
          weight: 2.5,
          fillColor: '#0284c7',
          fillOpacity: 0.22,
        });
      } else {
        circleRef.current.setStyle({
          color: '#2563eb',
          weight: 2,
          fillColor: '#3b82f6',
          fillOpacity: 0.18,
        });
      }
    }
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lon], 17, { animate: true });
    }
  };

  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lon}&t=k`;

  return (
    <div className={`relative w-full ${heightClassName || 'h-80 sm:h-96'} rounded-2xl overflow-hidden border border-slate-200/80 shadow-inner bg-slate-100 flex flex-col`}>
      {/* Conteneur DOM Leaflet */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* VISEUR CHIRURGICAL CENTRAL AU MÈTRE PRÈS (Overlay) */}
      {crosshairActive && mode === 'picker' && (
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
          {/* Réticule de visée */}
          <div className="relative flex items-center justify-center">
            {/* Cercle central */}
            <div className="w-12 h-12 rounded-full border-2 border-emerald-400 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
            {/* Lignes du réticule */}
            <div className="absolute w-20 h-0.5 bg-emerald-400/80" />
            <div className="absolute h-20 w-0.5 bg-emerald-400/80" />
          </div>

          {/* Bouton de Verrouillage Flottant en bas du viseur */}
          <div className="absolute bottom-16 pointer-events-auto">
            <button
              type="button"
              onClick={handleLockCrosshairCenter}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs rounded-full shadow-2xl flex items-center gap-2 border-2 border-white transition cursor-pointer animate-bounce"
            >
              <Target className="w-4 h-4" />
              <span>🎯 Verrouiller le repère sous le viseur</span>
            </button>
          </div>
        </div>
      )}

      {/* Barre de contrôles supérieure */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center justify-between gap-2">
          
          {/* Badge d'informations WGS84 & Statut Réel */}
          <div className="bg-slate-900/90 text-white backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-lg pointer-events-auto flex items-center gap-2 max-w-[200px] sm:max-w-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div className="text-[11px] leading-tight truncate">
              <span className="font-extrabold text-white block truncate">
                {name}
              </span>
              <span className="text-[10px] text-slate-300 font-mono block truncate">
                Rayon : {radiusMeters}m • {city}
              </span>
            </div>
          </div>

          {/* Outils & Sélecteur de Couche Cartographique */}
          <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-lg text-white">
            <button
              type="button"
              onClick={() => handleToggleStyle('googleHybrid')}
              title="Vue Satellite Haute Résolution avec rues et quartiers"
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                mapStyle === 'googleHybrid'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              🛰️ Satellite Réel
            </button>
            <button
              type="button"
              onClick={() => handleToggleStyle('streets')}
              title="Plan des Rues"
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                mapStyle === 'streets'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              🗺️ Plan
            </button>

            {/* Toggle Viseur Toiture (Mode Picker) */}
            {mode === 'picker' && (
              <button
                type="button"
                onClick={() => setCrosshairActive(prev => !prev)}
                title={crosshairActive ? "Désactiver le viseur" : "Activer le viseur de toiture central"}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  crosshairActive ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Sélecteur de Préréglages de Quartiers */}
            {mode === 'picker' && (
              <button
                type="button"
                onClick={() => setShowPresets(prev => !prev)}
                title="Quartiers populaires (Bobo / Ouaga)"
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  showPresets ? 'bg-amber-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleRecenter}
              title="Recentrer sur le site"
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <Crosshair className="w-4 h-4 text-emerald-400" />
            </button>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Ouvrir ces coordonnées directement dans Google Maps"
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer ml-0.5 border-l border-slate-700 pl-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            </a>
          </div>
        </div>

        {/* Barre de Recherche Intégrée (Coller lien Google Maps / Recherche Nominatim) */}
        {mode === 'picker' && (
          <div className="pointer-events-auto relative max-w-md">
            <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200/80 flex items-center px-3 py-1.5 gap-2">
              {searching ? (
                <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
              ) : (
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Rechercher un quartier ou coller lien/coordonnées Google Maps..."
                className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSuggestions([]);
                    setShowSuggestions(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Menu des suggestions de recherche */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 p-1.5 z-50 max-h-48 overflow-y-auto space-y-1 animate-fadeIn">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-0.5 block">
                  Lieux réels trouvés ({suggestions.length})
                </span>
                {suggestions.map((item) => (
                  <button
                    key={item.place_id}
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition flex items-start gap-2 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                    <span className="truncate leading-snug">{item.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Panneau Flottant des Quartiers Clés (Bobo-Dioulasso & Ouagadougou) */}
        {showPresets && mode === 'picker' && (
          <div className="pointer-events-auto bg-slate-900/95 text-white backdrop-blur-md p-2.5 rounded-2xl border border-slate-700/80 shadow-2xl max-w-lg animate-fadeIn">
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800">
              <span className="text-[11px] font-black uppercase text-amber-400 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" />
                Saut Rapide vers votre Ville / Quartier
              </span>
              <div className="flex items-center gap-1 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setActivePresetCity('bobo')}
                  className={`px-2 py-0.5 rounded-md transition ${activePresetCity === 'bobo' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Bobo-Dioulasso
                </button>
                <button
                  type="button"
                  onClick={() => setActivePresetCity('ouaga')}
                  className={`px-2 py-0.5 rounded-md transition ${activePresetCity === 'ouaga' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Ouagadougou
                </button>
                <button
                  type="button"
                  onClick={() => setShowPresets(false)}
                  className="text-slate-400 hover:text-white ml-1 px-1"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {REGION_PRESETS[activePresetCity].map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    applyNewCoordinates(preset.lat, preset.lon, 17, preset.name);
                    setShowPresets(false);
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-blue-600 hover:text-white rounded-lg text-[11px] font-semibold text-slate-200 transition flex items-center gap-1 cursor-pointer border border-slate-700/80"
                >
                  <MapPin className="w-2.5 h-2.5 text-blue-400" />
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Résultat du test de clic (mode test) */}
      {testResult && (
        <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200 shadow-md flex items-center gap-2.5 animate-fadeIn pointer-events-auto">
          {testResult.inside ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <div className="text-xs">
            <div className="flex items-center gap-1.5 font-bold">
              <span className={testResult.inside ? 'text-emerald-700' : 'text-rose-700'}>
                {testResult.inside ? 'Pointage Autorisé' : 'Pointage Refusé (Hors Zone)'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                • {testResult.distanceMeters}m / {radiusMeters}m
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">
              Position test : {testResult.testLat.toFixed(5)}, {testResult.testLon.toFixed(5)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (testMarkerRef.current) {
                testMarkerRef.current.remove();
                testMarkerRef.current = null;
              }
              setTestResult(null);
            }}
            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 ml-1 px-1.5 py-0.5 rounded hover:bg-slate-100 cursor-pointer"
          >
            Effacer
          </button>
        </div>
      )}

      {/* Barre d'état inférieure avec Adresse physique résolue & Zoom rapide */}
      {mode === 'picker' ? (
        <div className="absolute bottom-3 left-3 right-3 z-10 bg-slate-900/90 text-white text-[11px] font-semibold px-3 py-2 rounded-xl backdrop-blur-md border border-slate-700/60 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 pointer-events-auto">
          <div className="flex items-center gap-2 truncate min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="truncate text-slate-200">
              {resolvedAddress ? (
                <span>📍 {resolvedAddress}</span>
              ) : (
                <span>Glissez le repère sur votre toiture ou activez le viseur</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px] text-emerald-300 shrink-0">
            {crosshairActive && (
              <span className="text-amber-300 font-bold hidden sm:inline">Viseur: {centerCoords.lat}°, {centerCoords.lon}°</span>
            )}
            <span>WGS84 : {lat.toFixed(6)}°, {lon.toFixed(6)}°</span>
            
            {/* Raccourcis de Zoom Rapide */}
            <div className="flex items-center gap-1 border-l border-slate-700 pl-2 ml-1">
              <button
                type="button"
                onClick={() => handleSetZoomLevel(16)}
                title="Zoom Quartier"
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[9px] font-bold text-slate-300 cursor-pointer"
              >
                16x
              </button>
              <button
                type="button"
                onClick={() => handleSetZoomLevel(18)}
                title="Zoom Bâtiment"
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[9px] font-bold text-slate-300 cursor-pointer"
              >
                18x
              </button>
              <button
                type="button"
                onClick={() => handleSetZoomLevel(20)}
                title="Zoom Toiture Extrême"
                className="px-1.5 py-0.5 bg-blue-600 hover:bg-blue-500 rounded text-[9px] font-black text-white cursor-pointer"
              >
                20x Toit
              </button>
            </div>
          </div>
        </div>
      ) : (
        !testResult && interactive && (
          <div className="absolute bottom-3 left-3 right-3 z-10 bg-slate-900/80 text-white text-[11px] font-medium px-3 py-1.5 rounded-xl backdrop-blur-xs flex items-center justify-between pointer-events-none">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span>💡 Cliquez n'importe où sur la carte pour simuler si un employé sera accepté</span>
            </span>
            {resolvedAddress && (
              <span className="text-[10px] text-slate-400 font-normal hidden sm:inline truncate max-w-xs">
                📍 {resolvedAddress}
              </span>
            )}
          </div>
        )
      )}
    </div>
  );
}
