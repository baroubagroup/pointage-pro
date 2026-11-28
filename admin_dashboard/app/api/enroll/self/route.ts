import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const orgCode = req.nextUrl.searchParams.get('org')?.trim();
  if (!orgCode) {
    return NextResponse.json({ success: false, error: 'Paramètre org manquant.' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: orgData, error } = await supabase
      .from('pointage_organizations')
      .select('id, name, org_code, security_config')
      .ilike('org_code', orgCode)
      .maybeSingle();

    if (error || !orgData) {
      return NextResponse.json(
        {
          success: false,
          error: "Code Entreprise introuvable ou désactivé (un nouveau code canonique a peut-être été généré)."
        },
        { status: 404 }
      );
    }

    const sc = (orgData.security_config && typeof orgData.security_config === 'object')
      ? orgData.security_config
      : {};

    return NextResponse.json({
      success: true,
      org: {
        id: orgData.id,
        name: orgData.name,
        org_code: orgData.org_code,
        org_logo: sc.org_logo || null,
        admission_policy: sc.admission_policy || 'STRICT',
        sector_profile: sc.sector_profile || 'ENTREPRISE',
        support_contact: sc.support_contact || ''
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cleanOrg = String(body.org_code || '').trim().toUpperCase();
    const fullName = String(body.full_name || '').trim();
    const cleanMat = String(body.matricule || '').trim().toUpperCase();
    const cleanPhone = String(body.phone || '').trim();
    const cleanSecret = String(body.secret || '').trim();

    if (!cleanOrg) {
      return NextResponse.json({ success: false, error: 'Code entreprise manquant.' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: orgData, error: orgErr } = await supabase
      .from('pointage_organizations')
      .select('id, name, org_code, security_config')
      .ilike('org_code', cleanOrg)
      .maybeSingle();

    if (orgErr || !orgData) {
      return NextResponse.json(
        { success: false, error: `Code Établissement "${cleanOrg}" introuvable ou désactivé.` },
        { status: 404 }
      );
    }

    const sc = (orgData.security_config && typeof orgData.security_config === 'object')
      ? orgData.security_config
      : {};
    const admissionPolicy: 'STRICT' | 'MODERATE' | 'OPEN' = sc.admission_policy || 'STRICT';

    // 1. Si un matricule est saisi, vérifier s'il existe déjà dans l'organisation
    if (cleanMat) {
      const { data: existing } = await supabase
        .from('pointage_employees')
        .select('id, full_name, employee_matricule, enrollment_token, security_secret, birth_date, phone, is_enrolled, is_active')
        .eq('org_id', orgData.id)
        .or(`employee_matricule.ilike.${cleanMat},enrollment_token.ilike.${cleanMat}`)
        .maybeSingle();

      if (existing) {
        if (existing.is_active === false) {
          return NextResponse.json(
            { success: false, error: 'Ce profil collaborateur a été archivé par la direction.' },
            { status: 403 }
          );
        }

        // Vérification secret 2FA optionnelle si configurée sur la fiche
        const dbSecret = (existing.security_secret || '').trim();
        const dbBirth = (existing.birth_date || '').trim();
        if (cleanSecret && (dbSecret || dbBirth)) {
          const digits = cleanSecret.replace(/\D/g, '');
          const phoneDigits = (existing.phone || '').replace(/\D/g, '');
          const secretMatch =
            (dbSecret && dbSecret.toLowerCase() === cleanSecret.toLowerCase()) ||
            (dbBirth && dbBirth.includes(cleanSecret)) ||
            (digits.length >= 4 && phoneDigits.endsWith(digits));
          if (!secretMatch) {
            return NextResponse.json(
              { success: false, error: 'Code secret ou 4 derniers chiffres de téléphone incorrects.' },
              { status: 403 }
            );
          }
        }

        const tokenOut = existing.enrollment_token || `PPRO-${Math.floor(100000 + Math.random() * 900000)}`;
        if (!existing.enrollment_token) {
          await supabase.from('pointage_employees').update({ enrollment_token: tokenOut }).eq('id', existing.id);
        }

        return NextResponse.json({
          success: true,
          status: existing.is_enrolled ? 'ACTIVE' : 'READY',
          admission_policy: admissionPolicy,
          full_name: existing.full_name,
          matricule: existing.employee_matricule,
          token: tokenOut,
          message: `Profil trouvé (${existing.full_name}). Utilisez ces identifiants dans l'application.`
        });
      }
    }

    // 2. Nouveau collaborateur inconnu : appliquer la politique d'admission réelle
    if (admissionPolicy === 'STRICT') {
      return NextResponse.json(
        {
          success: false,
          admission_policy: 'STRICT',
          error:
            "Mode Strict actif : seuls les matricules déjà créés par la direction sont autorisés. Contactez votre responsable RH."
        },
        { status: 403 }
      );
    }

    if (!fullName || fullName.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Veuillez saisir votre Nom & Prénoms complets.' },
        { status: 400 }
      );
    }

    // Récupérer site et planning par défaut de l'organisation
    const [{ data: defSite }, { data: defSched }] = await Promise.all([
      supabase
        .from('pointage_establishments')
        .select('id')
        .eq('org_id', orgData.id)
        .eq('is_active', true)
        .order('created_at')
        .limit(1)
        .maybeSingle(),
      supabase
        .from('pointage_schedules')
        .select('id')
        .eq('org_id', orgData.id)
        .eq('is_active', true)
        .order('created_at')
        .limit(1)
        .maybeSingle()
    ]);

    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const finalMat =
      cleanMat || `${admissionPolicy === 'OPEN' ? 'EVT' : 'REQ'}-${new Date().getFullYear()}-${randSuffix}`;
    const token = `PPRO-${Math.floor(100000 + Math.random() * 900000)}`;

    const isOpen = admissionPolicy === 'OPEN';
    const { data: createdEmp, error: insertErr } = await supabase
      .from('pointage_employees')
      .insert({
        org_id: orgData.id,
        default_establishment_id: defSite?.id || null,
        schedule_id: defSched?.id || null,
        full_name: fullName,
        employee_matricule: finalMat,
        phone: cleanPhone || null,
        role: isOpen ? 'Participant' : 'Collaborateur',
        enrollment_token: token,
        device_model: isOpen ? 'Accès Ouvert (Événement)' : 'En attente approbation RH',
        is_enrolled: isOpen,
        is_active: true
      })
      .select('id, full_name, employee_matricule, enrollment_token, is_enrolled')
      .single();

    if (insertErr) {
      return NextResponse.json(
        { success: false, error: `Impossible d'enregistrer l'inscription : ${insertErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      admission_policy: admissionPolicy,
      status: isOpen ? 'ACTIVE' : 'PENDING_APPROVAL',
      full_name: createdEmp.full_name,
      matricule: createdEmp.employee_matricule,
      token: createdEmp.enrollment_token,
      message: isOpen
        ? 'Inscription validée automatiquement (Mode Ouvert) ! Vous pouvez ouvrir l’application.'
        : 'Demande enregistrée ! Votre responsable doit valider votre accès dans son espace Personnel.'
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Erreur serveur' }, { status: 500 });
  }
}
