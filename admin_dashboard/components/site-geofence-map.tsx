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
  Compass
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
    // 1. Google Maps Satellite Hybride (Imagerie satellite mondiale avec routes, boulevards, écoles, marchés et quartiers)
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
        // Formatter une adresse concise : quartier, ville, pays
        const parts = data.display_name.split(',').map((p: string) => p.trim());
        const shortAddr = parts.slice(0, 3).join(', ');
        setResolvedAddress(shortAddr || data.display_name);
      }
    } catch {
      // Silencieux si hors-ligne
    }
  }, []);

  // Déclencher la recherche de lieu quand l'utilisateur tape
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!val.trim() || val.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const q = encodeURIComponent(val.trim());
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${q}`, {
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

  // Sélectionner une suggestion de lieu : déplace la carte immédiatement
  const handleSelectSuggestion = (sugg: SearchSuggestion) => {
    const sLat = parseFloat(sugg.lat);
    const sLon = parseFloat(sugg.lon);
    if (!isNaN(sLat) && !isNaN(sLon) && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([sLat, sLon], 18, { duration: 1.2 });
      
      if (markerRef.current) {
        markerRef.current.setLatLng([sLat, sLon]);
      }
      if (circleRef.current) {
        circleRef.current.setLatLng([sLat, sLon]);
      }
      
      setSearchQuery(sugg.display_name.split(',').slice(0, 2).join(', '));
      setResolvedAddress(sugg.display_name);
      setShowSuggestions(false);
      onCoordinatesChange?.(Number(sLat.toFixed(6)), Number(sLon.toFixed(6)));
    }
  };

  // Initialisation de la carte Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lon],
        zoom: 17,
        zoomControl: false,
        attributionControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Couche de tuiles initiale (Google Maps Hybride avec routes et noms réels par défaut)
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

  // Changement de style de carte (Google Satellite Hybride vs Plan Rues vs Esri)
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

          {/* Sélecteur de Couche Cartographique + Bouton Google Maps */}
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

        {/* Barre de Recherche de Lieu Intégrée (Nominatim Autocomplete) */}
        {mode === 'picker' && (
          <div className="pointer-events-auto relative max-w-sm">
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
                placeholder="Rechercher un quartier, avenue, ville (ex: Bobo, Sarfalao)..."
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
                  className="text-slate-400 hover:text-slate-600"
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

      {/* Barre d'état inférieure avec Adresse physique résolue en temps réel */}
      {mode === 'picker' ? (
        <div className="absolute bottom-3 left-3 right-3 z-10 bg-slate-900/90 text-white text-[11px] font-semibold px-3 py-2 rounded-xl backdrop-blur-md border border-slate-700/60 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 pointer-events-none">
          <div className="flex items-center gap-2 truncate min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="truncate text-slate-200">
              {resolvedAddress ? (
                <span>📍 {resolvedAddress}</span>
              ) : (
                <span>Glissez le repère sur votre bureau pour caler au mètre près</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] text-emerald-300 shrink-0">
            <span>WGS84 : {lat.toFixed(6)}°, {lon.toFixed(6)}°</span>
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
