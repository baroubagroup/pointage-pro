import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PointagePro Enterprise - Portail Gérant Multi-Entreprises',
  description: 'Plateforme cloud de gestion intelligente des pointages, géofencing et assiduité en temps réel.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
