import { NextResponse } from 'next/server';

export async function GET() {
  const samplePunches = [
    { name: 'Kouassi Jean-Marc', role: 'Chef d\'équipe Logistique', site: 'Boutique Centrale - Siège', time: '07:28', status: 'CONFORME', delayMin: 0 },
    { name: 'Traoré Fatou', role: 'Responsable Magasin', site: 'Entrepôt Logistique Zone Nord', time: '07:46', status: 'RETARD', delayMin: 16 },
    { name: 'Yao Brice', role: 'Agent de Sécurité', site: 'Boutique Centrale - Siège', time: '07:15', status: 'CONFORME', delayMin: 0 },
  ];

  let csv = '\uFEFFCollaborateur;Poste;Site_Etablissement;Heure_Pointage;Statut_Assiduite;Minutes_Retard\n';
  samplePunches.forEach(p => {
    csv += `"${p.name}";"${p.role}";"${p.site}";"${p.time}";"${p.status}";"${p.delayMin}"\n`;
  });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="releve_assiduite_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
