import { NextResponse } from 'next/server';

export async function GET() {
  // If running on local network or server, returns the active enterprise box signature
  return NextResponse.json({
    ssid: 'Livebox_Siege',
    bssid: 'b4:ee:b4:91:a2:10',
    verified: true,
  });
}
