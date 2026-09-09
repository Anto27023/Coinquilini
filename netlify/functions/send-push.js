import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Chiavi VAPID per Web Push
const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY || 'BLTtv4NUkWqx5mGKODC4xnfogDAZbjlh6M7nvGHXfNf1SmihHJSe3-NXV4voaHOgxaFrqOT9CxrIWXmE_fShGEs';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'LDzxF_LrUFpZb-oaJKRiiaEASgpsdUHLhAkLgzwNtBE';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:info@coinquilini.app';

webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export async function handler(event) {
  // Gestione preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Metodo non consentito' })
    };
  }

  try {
    const payloadData = JSON.parse(event.body || '{}');
    const { 
      userIds = [], 
      subscription = null, 
      title = 'Coinquilini', 
      body = 'Nuovo avviso dalla tua casa!', 
      url = '/', 
      tag = 'coinquilini-notification' 
    } = payloadData;

    let targets = [];

    // Se è stata inviata una sottoscrizione singola diretta (es. notifica di test immediata)
    if (subscription && subscription.endpoint) {
      targets.push(subscription);
    } 
    // Altrimenti recupera le sottoscrizioni registrate per gli utenti specificati da Supabase
    else if (Array.isArray(userIds) && userIds.length > 0) {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data: subs, error: subError } = await supabase
          .from('push_subscriptions')
          .select('*')
          .in('user_id', userIds);

        if (subError) {
          console.error('Errore recupero push_subscriptions:', subError);
        } else if (subs && subs.length > 0) {
          targets = subs.map(s => ({
            id: s.id,
            endpoint: s.endpoint,
            keys: {
              p256dh: s.p256dh,
              auth: s.auth
            }
          }));
        }
      }
    }

    if (targets.length === 0) {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Nessun dispositivo iscritto trovato per la notifica', sent: 0 })
      };
    }

    const pushPayload = JSON.stringify({
      title,
      body,
      url,
      tag,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png'
    });

    let sentCount = 0;
    const expiredIds = [];

    await Promise.all(
      targets.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys
            },
            pushPayload,
            {
              TTL: 86400 // 24 ore
            }
          );
          sentCount++;
        } catch (err) {
          console.error('Errore invio push a endpoint:', sub.endpoint, err?.statusCode || err);
          // 404 o 410 indicano che l'utente ha disinstallato la PWA o revocato il token
          if (err.statusCode === 404 || err.statusCode === 410) {
            if (sub.id) expiredIds.push(sub.id);
          }
        }
      })
    );

    // Se ci sono sottoscrizioni scadute, rimuovile dal database in background
    if (expiredIds.length > 0) {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.from('push_subscriptions').delete().in('id', expiredIds);
      }
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, sent: sentCount, total: targets.length })
    };
  } catch (err) {
    console.error('Errore nella funzione send-push:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Errore interno invio notifica push' })
    };
  }
}
