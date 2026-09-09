import { supabase, isSupabaseConfigured } from './supabase';

export const VAPID_PUBLIC_KEY = 'BLTtv4NUkWqx5mGKODC4xnfogDAZbjlh6M7nvGHXfNf1SmihHJSe3-NXV4voaHOgxaFrqOT9CxrIWXmE_fShGEs';

// Converte la stringa Base64URL in Uint8Array richiesta da pushManager.subscribe
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Verifica se il browser/dispositivo supporta le notifiche push
export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// Rileva se il dispositivo è iOS (iPhone/iPad)
export function isIosDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// Rileva se l'app è in modalità PWA Standalone (Aggiunta alla schermata Home)
export function isStandalonePwa() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

// Stato corrente del permesso notifiche ('granted', 'denied', 'default', 'unsupported')
export function getNotificationPermission() {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

// Recupera l'iscrizione push attiva sul browser se esistente
export async function getExistingSubscription() {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (e) {
    console.warn('Impossibile verificare la sottoscrizione push esistente:', e);
    return null;
  }
}

// Iscrive l'utente alle notifiche push e registra il token in Supabase
export async function subscribeUserToPush(userId) {
  if (!isPushSupported()) {
    throw new Error('Le notifiche push non sono supportate da questo browser.');
  }

  // Su iOS, se non è installata sulla Home, avvisa l'utente
  if (isIosDevice() && !isStandalonePwa()) {
    throw new Error('Su iPhone le notifiche push funzionano solo se aggiungi prima l\'app alla Schermata Home da Safari (Condividi [↑] -> Aggiungi a Home)!');
  }

  // 1. Richiedi il permesso nativo del browser
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'I permessi per le notifiche sono stati bloccati nel browser. Abilitali nelle impostazioni del tuo dispositivo.'
        : 'Permesso notifiche non concesso.'
    );
  }

  // 2. Iscrizione tramite Service Worker
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
  }

  // 3. Salva la sottoscrizione nel database Supabase
  const rawSub = subscription.toJSON();
  const endpoint = rawSub.endpoint;
  const p256dh = rawSub.keys?.p256dh;
  const auth = rawSub.keys?.auth;

  if (isSupabaseConfigured && userId && endpoint && p256dh && auth) {
    try {
      await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          endpoint,
          p256dh,
          auth,
          user_agent: navigator.userAgent,
          updated_at: new Date().toISOString()
        }, { onConflict: 'endpoint' });
    } catch (e) {
      console.warn('Salvataggio push_subscriptions su Supabase fallito o tabella non ancora creata:', e);
    }
  }

  return subscription;
}

// Disiscrive l'utente dalle notifiche push
export async function unsubscribeUserFromPush(userId) {
  if (!isPushSupported()) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      if (isSupabaseConfigured && userId && endpoint) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', endpoint);
      }
    }
  } catch (e) {
    console.error('Errore durante la disiscrizione push:', e);
  }
}

// Invia una notifica push tramite la Netlify Function a uno o più coinquilini
export async function dispatchPushNotification({ userIds = [], subscription = null, title, body, url = '/', tag }) {
  try {
    // Prova a chiamare l'endpoint API Netlify
    const response = await fetch('/api/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userIds,
        subscription,
        title,
        body,
        url,
        tag
      })
    });

    if (!response.ok) {
      // Fallback a /.netlify/functions/send-push se il redirect locale non fosse attivo
      const fallbackResponse = await fetch('/.netlify/functions/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds, subscription, title, body, url, tag })
      });
      return await fallbackResponse.json();
    }

    return await response.json();
  } catch (e) {
    console.warn('Impossibile inviare la notifica push remota (probabilmente in locale senza Netlify CLI):', e);
    return null;
  }
}

// Invia una notifica push immediata di prova al dispositivo corrente
export async function sendTestNotification(userId) {
  const subscription = await getExistingSubscription();
  if (!subscription) {
    throw new Error('Nessuna sottoscrizione attiva. Abilita prima le notifiche.');
  }

  return await dispatchPushNotification({
    subscription: subscription.toJSON(),
    userIds: userId ? [userId] : [],
    title: '🎉 Notifica di Prova!',
    body: 'Perfetto! Le notifiche push sul tuo telefono funzionano alla perfezione anche ad app chiusa.',
    url: '/',
    tag: 'test-notification'
  });
}
