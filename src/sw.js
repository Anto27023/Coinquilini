import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

// Pulisce cache obsolete e pre-carica asset dell'app
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

// Ascolto eventi PUSH inviati dal server (Apple APNs / Google FCM)
self.addEventListener('push', (event) => {
  let data = {
    title: 'Coinquilini',
    body: 'Hai una nuova notifica dalla casa!',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    url: '/'
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (err) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: data.body,
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: data.url || '/'
    },
    tag: data.tag || 'coinquilini-notification',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, notificationOptions)
  );
});

// Al tocco della notifica sul blocco schermo o nella tendina
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se l'app è già aperta in background, mettila a fuoco
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      // Se l'app era chiusa, aprila all'URL specificato
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Gestione aggiornamento immediato Service Worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
