import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

interface FirebaseServiceAccount {
  project_id: string;
  private_key: string;
  client_email: string;
}

let cachedToken: { token: string; expiresAtMs: number; projectId: string } | null = null;

function base64Url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function loadServiceAccount(): FirebaseServiceAccount | null {
  try {
    const rawEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
    if (rawEnv) {
      const jsonStr = rawEnv.startsWith('{')
        ? rawEnv
        : Buffer.from(rawEnv, 'base64').toString('utf8');
      const parsed = JSON.parse(jsonStr);
      if (parsed?.project_id && parsed?.private_key && parsed?.client_email) {
        return {
          project_id: parsed.project_id,
          private_key: String(parsed.private_key).replace(/\\n/g, '\n'),
          client_email: parsed.client_email,
        };
      }
    }
  } catch {
    // Fallback fichier local
  }

  try {
    const localPath = path.join(process.cwd(), '.firebase-service-account.json');
    if (fs.existsSync(localPath)) {
      const parsed = JSON.parse(fs.readFileSync(localPath, 'utf8'));
      if (parsed?.project_id && parsed?.private_key && parsed?.client_email) {
        return {
          project_id: parsed.project_id,
          private_key: String(parsed.private_key).replace(/\\n/g, '\n'),
          client_email: parsed.client_email,
        };
      }
    }
  } catch {
    // Non disponible
  }

  return null;
}

async function getAccessToken(sa: FirebaseServiceAccount): Promise<string> {
  const nowMs = Date.now();
  if (cachedToken && cachedToken.projectId === sa.project_id && cachedToken.expiresAtMs - 60_000 > nowMs) {
    return cachedToken.token;
  }

  const nowSec = Math.floor(nowMs / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claimSet = base64Url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: nowSec,
      exp: nowSec + 3600,
    })
  );

  const unsignedJwt = `${header}.${claimSet}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedJwt);
  const signature = base64Url(signer.sign(sa.private_key));
  const jwt = `${unsignedJwt}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Google OAuth2 error (${tokenRes.status}): ${errText}`);
  }

  const tokenJson = await tokenRes.json();
  if (!tokenJson.access_token) {
    throw new Error('Google OAuth2 response missing access_token');
  }

  cachedToken = {
    token: tokenJson.access_token,
    expiresAtMs: nowMs + ((Number(tokenJson.expires_in) || 3600) * 1000),
    projectId: sa.project_id,
  };
  return tokenJson.access_token;
}

export function getOrgFcmTopic(orgId: string): string {
  const clean = orgId.trim().replace(/[^a-zA-Z0-9-_.~%]/g, '_');
  return `org_${clean}`;
}

export async function sendFcmTopicNotification(params: {
  orgId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<{ sent: boolean; topic: string; messageId?: string; reason?: string }> {
  const topic = getOrgFcmTopic(params.orgId);
  const sa = loadServiceAccount();
  if (!sa) {
    return {
      sent: false,
      topic,
      reason: 'FIREBASE_SERVICE_ACCOUNT_JSON absent côté serveur',
    };
  }

  try {
    const accessToken = await getAccessToken(sa);
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;

    const res = await fetch(fcmUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: {
          topic,
          notification: {
            title: params.title,
            body: params.body,
          },
          data: params.data || {},
          android: {
            priority: 'HIGH',
            notification: {
              channel_id: 'pointagepro_urgent_alerts',
              sound: 'default',
              default_vibrate_timings: true,
              notification_priority: 'PRIORITY_MAX',
            },
          },
        },
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        sent: false,
        topic,
        reason: json?.error?.message || `FCM HTTP ${res.status}`,
      };
    }

    return {
      sent: true,
      topic,
      messageId: json?.name,
    };
  } catch (err: any) {
    return {
      sent: false,
      topic,
      reason: err?.message || 'Erreur réseau FCM',
    };
  }
}
