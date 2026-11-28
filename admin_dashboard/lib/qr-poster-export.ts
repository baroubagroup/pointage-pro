import QRCode from 'qrcode';

export interface A4PosterPdfOptions {
  orgName: string;
  orgCode: string;
  joinUrl: string;
  orgLogo?: string | null;
  supportContact?: string;
  sectorLabel?: string;
}

/**
 * Télécharge un QR Code haute résolution en PNG (généré localement sans API externe).
 */
export async function downloadQrCodePng(value: string, filename: string): Promise<void> {
  const dataUrl = await QRCode.toDataURL(value, {
    width: 1000,
    margin: 2,
    color: { dark: '#0f172a', light: '#ffffff' },
    errorCorrectionLevel: 'M'
  });
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function wrapTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function loadImageSafe(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function buildSinglePageA4PdfFromJpeg(jpegBytes: Uint8Array, widthPx: number, heightPx: number): Uint8Array {
  const enc = new TextEncoder();
  const pageWidthPt = '595.28';
  const pageHeightPt = '841.89';
  const contentStream = `q ${pageWidthPt} 0 0 ${pageHeightPt} 0 0 cm /Im0 Do Q`;

  const obj1 = enc.encode('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  const obj2 = enc.encode('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  const obj3 = enc.encode(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt} ${pageHeightPt}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`
  );
  const obj4Head = enc.encode(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
  );
  const obj4Tail = enc.encode('\nendstream\nendobj\n');
  const obj5 = enc.encode(
    `5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`
  );

  const header = enc.encode('%PDF-1.4\n');
  const offsets: number[] = [];
  let cursor = header.length;

  const chunks: Uint8Array[] = [header];

  const pushObj = (...parts: Uint8Array[]) => {
    offsets.push(cursor);
    for (const p of parts) {
      chunks.push(p);
      cursor += p.length;
    }
  };

  pushObj(obj1);
  pushObj(obj2);
  pushObj(obj3);
  pushObj(obj4Head, jpegBytes, obj4Tail);
  pushObj(obj5);

  const xrefStart = cursor;
  let xrefStr = `xref\n0 6\n0000000000 65535 f \n`;
  for (const off of offsets) {
    xrefStr += `${String(off).padStart(10, '0')} 00000 n \n`;
  }
  const trailerStr =
    `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  const xrefBytes = enc.encode(xrefStr + trailerStr);
  chunks.push(xrefBytes);

  const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLen);
  let pos = 0;
  for (const c of chunks) {
    result.set(c, pos);
    pos += c.length;
  }
  return result;
}

/**
 * Génère et télécharge directement une véritable Affiche A4 prête à imprimer au format PDF (.pdf),
 * avec le nom de l'entreprise, son logo, un QR Code géant centré et les instructions de scan.
 */
export async function downloadA4EnrollmentPosterPdf(opts: A4PosterPdfOptions): Promise<void> {
  const W = 1240;
  const H = 1754;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponible');

  // Fond blanc pur A4
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  // Bordure intérieure propre
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 6;
  drawRoundedRect(ctx, 42, 42, W - 84, H - 84, 36);
  ctx.stroke();

  // Bandeau supérieur bleu uni (#1D4ED8)
  ctx.fillStyle = '#1D4ED8';
  drawRoundedRect(ctx, 70, 70, W - 140, 270, 28);
  ctx.fill();

  // Logo entreprise ou initiales dans l'en-tête
  const logoSize = 120;
  const logoX = 115;
  const logoY = 145;
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, logoX, logoY, logoSize, logoSize, 24);
  ctx.fill();

  let drewLogo = false;
  if (opts.orgLogo) {
    const img = await loadImageSafe(opts.orgLogo);
    if (img) {
      try {
        ctx.save();
        drawRoundedRect(ctx, logoX + 6, logoY + 6, logoSize - 12, logoSize - 12, 20);
        ctx.clip();
        ctx.drawImage(img, logoX + 6, logoY + 6, logoSize - 12, logoSize - 12);
        ctx.restore();
        drewLogo = true;
      } catch {}
    }
  }
  if (!drewLogo) {
    ctx.fillStyle = '#1D4ED8';
    ctx.font = 'bold 46px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((opts.orgName || 'PP').slice(0, 2).toUpperCase(), logoX + logoSize / 2, logoY + logoSize / 2);
  }

  // Nom de l'entreprise & sous-titre
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#BFDBFE';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText((opts.sectorLabel || 'PORTAIL D\'ENRÔLEMENT OFFICIEL • POINTAGEPRO').toUpperCase(), 270, 145);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 48px sans-serif';
  const nameLines = wrapTextLines(ctx, (opts.orgName || 'ENTREPRISE').toUpperCase(), 850).slice(0, 2);
  nameLines.forEach((line, idx) => {
    ctx.fillText(line, 270, 208 + idx * 54);
  });

  // Titre central accrocheur
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('SCANNEZ POUR REJOINDRE L\'ÉQUIPE', W / 2, 435);

  ctx.fillStyle = '#475569';
  ctx.font = '26px sans-serif';
  ctx.fillText('Ouvrez l\'appareil photo de votre téléphone et visez le QR Code ci-dessous', W / 2, 485);

  // Grand cadre central contenant le QR Code géant
  const cardX = 155;
  const cardY = 535;
  const cardW = W - 310;
  const cardH = 770;
  ctx.fillStyle = '#F8FAFC';
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 36);
  ctx.fill();
  ctx.strokeStyle = '#1D4ED8';
  ctx.lineWidth = 5;
  ctx.setLineDash([16, 12]);
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 36);
  ctx.stroke();
  ctx.setLineDash([]);

  // Génération du QR Code géant au centre
  const qrCanvas = document.createElement('canvas');
  const qrSize = 620;
  await QRCode.toCanvas(qrCanvas, opts.joinUrl, {
    width: qrSize,
    margin: 2,
    color: { dark: '#0F172A', light: '#FFFFFF' },
    errorCorrectionLevel: 'M'
  });

  const qrBoxPad = 24;
  const qrBoxX = (W - (qrSize + qrBoxPad * 2)) / 2;
  const qrBoxY = cardY + 48;
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, qrBoxX, qrBoxY, qrSize + qrBoxPad * 2, qrSize + qrBoxPad * 2, 24);
  ctx.fill();
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.drawImage(qrCanvas, qrBoxX + qrBoxPad, qrBoxY + qrBoxPad, qrSize, qrSize);

  // Code Canonique sous le QR
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('CODE ENTREPRISE UNIQUE', W / 2, 1365);

  ctx.fillStyle = '#EFF6FF';
  drawRoundedRect(ctx, 310, 1385, W - 620, 74, 18);
  ctx.fill();
  ctx.strokeStyle = '#93C5FD';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#1D4ED8';
  ctx.font = 'bold 34px monospace';
  ctx.fillText(opts.orgCode, W / 2, 1433);

  // URL d'accès directe
  ctx.fillStyle = '#475569';
  ctx.font = '19px monospace';
  const urlLines = wrapTextLines(ctx, opts.joinUrl, 1020).slice(0, 2);
  urlLines.forEach((line, idx) => {
    ctx.fillText(line, W / 2, 1495 + idx * 26);
  });

  // 3 étapes en bas de page
  const stepsY = 1545;
  const stepW = 340;
  const gap = 30;
  const startX = (W - (stepW * 3 + gap * 2)) / 2;
  const steps = [
    { num: '1', title: 'Scannez ce QR Code', sub: 'Avec la caméra du téléphone' },
    { num: '2', title: 'Ouvrez le lien', sub: 'Dans votre navigateur web' },
    { num: '3', title: 'Validez votre profil', sub: 'Activez votre pointage mobile' }
  ];

  steps.forEach((st, i) => {
    const sx = startX + i * (stepW + gap);
    ctx.fillStyle = '#F1F5F9';
    drawRoundedRect(ctx, sx, stepsY, stepW, 115, 20);
    ctx.fill();

    ctx.fillStyle = '#1D4ED8';
    ctx.beginPath();
    ctx.arc(sx + 38, stepsY + 38, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(st.num, sx + 38, stepsY + 45);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 21px sans-serif';
    ctx.fillText(st.title, sx + 70, stepsY + 44);

    ctx.fillStyle = '#64748B';
    ctx.font = '18px sans-serif';
    ctx.fillText(st.sub, sx + 22, stepsY + 86);
  });

  // Pied de page
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '18px sans-serif';
  const footerText = opts.supportContact
    ? `PointagePro • Assistance Direction : ${opts.supportContact}`
    : 'PointagePro • Système Sécurisé de Présence par Satellite WGS84';
  ctx.fillText(footerText, W / 2, 1696);

  // Encodage JPEG + PDF A4
  const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.94);
  const b64 = jpegDataUrl.split(',')[1];
  const binStr = atob(b64);
  const jpegBytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) {
    jpegBytes[i] = binStr.charCodeAt(i);
  }

  const pdfBytes = buildSinglePageA4PdfFromJpeg(jpegBytes, W, H);
  const pdfBuffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength
  ) as ArrayBuffer;
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `Affiche_A4_PointagePro_${opts.orgCode}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
}
