import { NextResponse } from 'next/server';

const ALLOWED_HOSTS = new Set([
  'maps.app.goo.gl',
  'goo.gl',
  'www.google.com',
  'google.com',
  'maps.google.com'
]);

function extractCoordsFromMapsUrl(urlStr: string): { lat: number; lon: number } | null {
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /\/search\/(-?\d+\.\d+),(-?\d+\.\d+)/
  ];
  for (const regex of patterns) {
    const match = urlStr.match(regex);
    if (match) {
      const lat = parseFloat(match[1]);
      const lon = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
        return { lat: Number(lat.toFixed(6)), lon: Number(lon.toFixed(6)) };
      }
    }
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawUrl = searchParams.get('url')?.trim();
    if (!rawUrl) {
      return NextResponse.json({ success: false, error: 'URL manquante.' }, { status: 400 });
    }

    // 1. Essai d'extraction directe si l'URL contient déjà les coordonnées
    const direct = extractCoordsFromMapsUrl(rawUrl);
    if (direct) {
      return NextResponse.json({ success: true, lat: direct.lat, lon: direct.lon, source: 'direct' });
    }

    // 2. Validation stricte du domaine (anti-SSRF) avant de suivre la redirection d'un lien court
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return NextResponse.json({ success: false, error: 'Lien invalide.' }, { status: 400 });
    }

    if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: 'Seuls les liens HTTPS Google Maps sont autorisés.' },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(parsed.toString(), {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PointageProGeo/1.0)'
        }
      });
      clearTimeout(timer);

      const finalCoords = extractCoordsFromMapsUrl(response.url);
      if (finalCoords) {
        return NextResponse.json({
          success: true,
          lat: finalCoords.lat,
          lon: finalCoords.lon,
          resolvedUrl: response.url,
          source: 'redirect'
        });
      }

      // Parfois Google Maps embarque les coordonnées dans le HTML meta/canonical
      const html = await response.text();
      const bodyCoords = extractCoordsFromMapsUrl(html);
      if (bodyCoords) {
        return NextResponse.json({
          success: true,
          lat: bodyCoords.lat,
          lon: bodyCoords.lon,
          source: 'html'
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Coordonnées introuvables dans ce lien Google Maps. Copiez directement les chiffres Lat, Lon ou cliquez sur la carte.'
        },
        { status: 422 }
      );
    } catch (fetchErr: any) {
      clearTimeout(timer);
      return NextResponse.json(
        {
          success: false,
          error: "Impossible de résoudre ce lien court hors ligne / sans accès Google Maps. Saisissez les coordonnées directement."
        },
        { status: 502 }
      );
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Erreur serveur' }, { status: 500 });
  }
}
