import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const apkFilePath = path.join(process.cwd(), 'public', 'apk', 'pointagepro-enterprise-v1.1.0.apk');

    if (fs.existsSync(apkFilePath)) {
      const stat = fs.statSync(apkFilePath);
      const fileBuffer = fs.readFileSync(apkFilePath);

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.android.package-archive',
          'Content-Disposition': 'attachment; filename="pointagepro-enterprise-v1.1.0.apk"',
          'Content-Length': stat.size.toString(),
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // Si le fichier APK direct n'est pas encore généré, redirection vers la page d'instructions
    return NextResponse.redirect(new URL('/apk', request.url));
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors du téléchargement de l\'APK', details: String(error) },
      { status: 500 }
    );
  }
}
