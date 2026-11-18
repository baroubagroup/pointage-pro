'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, LocateFixed, ExternalLink, Navigation, CheckCircle2, AlertTriangle, Crosshair } from 'lucide-react';

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
  defaultStyle?: 'streets' | 'satellite';
  heightClassName?: string;
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
  defaultStyle = 'streets',
  heightClassName,
}: SiteGeofenceMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const testMarkerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>(defaultStyle);
  const [testResult, setTestResult] = useState<{
    inside: boolean;
    distanceMeters: number;
    testLat: number;
    testLon: number;
  } | null>(null);

  // Tuiles de cartes 100% gratuites et libres (ZÉRO clé API, ZÉRO filigrane, ZÉRO carte bancaire)
  const TILE_PROVIDERS = {
    // Style Plan Rues OpenStreetMap officiel (Open-Source, libre, sans filigrane ni clé)
    streets: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributeurs',
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
    },
    // Véritable vue satellite aérienne haute résolution (Esri World Imagery, gratuit et mondial)
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Imagerie Satellite Mondiale',
      maxZoom: 19,
      subdomains: ['server'],
    },
  };

  // Initialisation de la carte Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lon],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      // Zoom en bas à droite pour ne pas gêner les commandes métier
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Couche de tuiles initiale
      const currentProvider = TILE_PROVIDERS[mapStyle];
      const tiles = L.tileLayer(currentProvider.url, {
        attribution: currentProvider.attribution,
        maxZoom: currentProvider.maxZoom,
        subdomains: currentProvider.subdomains,
      }).addTo(map);
      tileLayerRef.current = tiles;

      // Cercle de géofencing WGS84 officiel
      const circle = L.circle([lat, lon], {
        radius: radiusMeters,
        color: '#2563eb',
        weight: 2,
        fillColor: '#3b82f6',
        fillOpacity: 0.18,
      }).addTo(map);
      circleRef.current = circle;

      // Pin central de l'établissement
      const icon = L.divIcon({
        className: 'custom-site-pin',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
            <div style="background: #1e293b; color: white; padding: 3px 8px; border-radius: 8px; font-size: 11px; font-weight: 800; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.2); margin-bottom: 4px;">
              📍 ${name || 'Établissement'}
            </div>
            <div style="width: 14px; height: 14px; background: #2563eb; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 0 10px rgba(37,99,235,0.6);"></div>
          </div>
        `,
        iconSize: [0, 0],
      });

      if (mode === 'picker') {
        // En mode calibrage / picker : le marqueur est déplaçable au glisser-déposer
        const marker = L.marker([lat, lon], { icon, draggable: true }).addTo(map);
        markerRef.current = marker;

        marker.on('dragend', (e: any) => {
          const pos = e.target.getLatLng();
          const pLat = Number(pos.lat.toFixed(6));
          const pLon = Number(pos.lng.toFixed(6));
          if (circleRef.current) circleRef.current.setLatLng(pos);
          onCoordinatesChange?.(pLat, pLon);
        });

        // Et un clic n'importe où sur le toit d'un bâtiment recale le repère immédiatement
        map.on('click', (e: L.LeafletMouseEvent) => {
          const clickLat = Number(e.latlng.lat.toFixed(6));
          const clickLon = Number(e.latlng.lng.toFixed(6));
          if (markerRef.current) markerRef.current.setLatLng(e.latlng);
          if (circleRef.current) circleRef.current.setLatLng(e.latlng);
          onCoordinatesChange?.(clickLat, clickLon);
        });
      } else {
        const marker = L.marker([lat, lon], { icon }).addTo(map);
        markerRef.current = marker;

        // Clic interactif sur la carte pour simuler / tester une position
        if (interactive) {
          map.on('click', (e: L.LeafletMouseEvent) => {
            const clickLat = e.latlng.lat;
            const clickLon = e.latlng.lng;

            // Calcul géodésique Haversine
            const centerLatLng = L.latLng(lat, lon);
            const distance = Math.round(centerLatLng.distanceTo(e.latlng));
            const inside = distance <= radiusMeters;

            setTestResult({
              inside,
              distanceMeters: distance,
              testLat: clickLat,
              testLon: clickLon,
            });

            // Marqueur de test
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
    }

    return () => {
      // Nettoyage au démontage
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Mise à jour de la position et du rayon quand le site change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    map.setView([lat, lon], 16, { animate: true });

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
            <div style="background: #1e293b; color: white; padding: 3px 8px; border-radius: 8px; font-size: 11px; font-weight: 800; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.2); margin-bottom: 4px;">
              📍 ${name || 'Établissement'}
            </div>
            <div style="width: 14px; height: 14px; background: #2563eb; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 0 10px rgba(37,99,235,0.6);"></div>
          </div>
        `,
        iconSize: [0, 0],
      });
      markerRef.current.setIcon(icon);
    }

    // Réinitialiser le test au changement de site
    if (testMarkerRef.current) {
      testMarkerRef.current.remove();
      testMarkerRef.current = null;
    }
    setTestResult(null);
  }, [lat, lon, radiusMeters, name]);

  // Changement de style de carte (Plan vs Satellite)
  const handleToggleStyle = (newStyle: 'streets' | 'satellite') => {
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

    // Réajuster le contraste du cercle selon le fond
    if (circleRef.current) {
      if (newStyle === 'satellite') {
        circleRef.current.setStyle({
          color: '#38bdf8',
          weight: 2.5,
          fillColor: '#0284c7',
          fillOpacity: 0.25,
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

  // Recentrer la carte
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lon], 16, { animate: true });
    }
  };

  return (
    <div className={`relative w-full ${heightClassName || 'h-80 sm:h-96'} rounded-2xl overflow-hidden border border-slate-200/80 shadow-inner bg-slate-100 flex flex-col`}>
      {/* Conteneur DOM Leaflet */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Barre de contrôles flottante en haut */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        {/* Badge d'informations WGS84 */}
        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-sm pointer-events-auto flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <div className="text-[11px] leading-tight">
            <span className="font-extrabold text-slate-900 block truncate max-w-[180px] sm:max-w-[240px]">
              {name}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Rayon: {radiusMeters}m • {city}
            </span>
          </div>
        </div>

        {/* Sélecteur Plan / Satellite + Recentrer */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-white/95 backdrop-blur-md p-1 rounded-xl border border-slate-200/80 shadow-sm">
          <button
            type="button"
            onClick={() => handleToggleStyle('streets')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              mapStyle === 'streets'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            🗺️ Plan
          </button>
          <button
            type="button"
            onClick={() => handleToggleStyle('satellite')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              mapStyle === 'satellite'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            🛰️ Satellite
          </button>
          <button
            type="button"
            onClick={handleRecenter}
            title="Recentrer sur le site"
            className="p-1 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Résultat du test de clic en bas à gauche */}
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

      {/* Message d'aide discret */}
      {mode === 'picker' ? (
        <div className="absolute bottom-3 left-3 right-3 z-10 bg-slate-900/90 text-white text-[11px] font-semibold px-3 py-1.5 rounded-xl backdrop-blur-md border border-slate-700/60 shadow-lg flex items-center justify-between pointer-events-none">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span>Calage au mètre près : cliquez ou glissez le repère sur votre bureau</span>
          </span>
          <span className="font-mono text-[10px] text-slate-300 hidden sm:inline">
            WGS84 : {lat.toFixed(6)}°, {lon.toFixed(6)}°
          </span>
        </div>
      ) : (
        !testResult && interactive && (
          <div className="absolute bottom-3 left-3 z-10 bg-slate-900/70 text-white text-[10px] font-medium px-2.5 py-1 rounded-lg backdrop-blur-xs pointer-events-none hidden sm:block">
            💡 Cliquez n'importe où sur la carte pour tester si une position est autorisée
          </div>
        )
      )}
    </div>
  );
}
