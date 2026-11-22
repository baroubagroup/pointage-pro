'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface RealQrCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export function RealQrCode({ value, size = 180, className = '' }: RealQrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!value) return;

    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isMounted) {
          setDataUrl(url);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('QR code generation failed:', err);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [value, size]);

  if (loading || !dataUrl) {
    return (
      <div 
        style={{ width: size, height: size }} 
        className={`bg-slate-100 rounded-2xl flex items-center justify-center animate-pulse ${className}`}
      >
        <span className="text-[10px] text-slate-400 font-bold">Génération QR...</span>
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt="QR Code Réel Scannable"
      width={size}
      height={size}
      className={`rounded-xl shadow-xs object-contain ${className}`}
    />
  );
}
