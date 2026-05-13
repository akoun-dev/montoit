const DEFAULT_ICON = '/logo.png';
const FALLBACK_TITLE = 'Mon Toit';

const parsePayload = (event) => {
  if (!event?.data) return {};
  try {
    return event.data.json();
  } catch (error) {
    try {
      return JSON.parse(event.data.text());
    } catch (err) {
      return {};
    }
  }
};

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    if (self.clients && self.clients.claim) {
      await self.clients.claim();
    }
  })());
});

self.addEventListener('push', (event) => {
  const payload = parsePayload(event);
  const title = payload.title || FALLBACK_TITLE;
  const options = {
    body: payload.body || 'Vous avez une notification sécurisée Mon Toit',
    icon: payload.icon || DEFAULT_ICON,
    badge: payload.badge || DEFAULT_ICON,
    data: payload.data || { url: '/' },
    requireInteraction: payload.requireInteraction || false,
    actions: payload.actions || [],
    tag: payload.tag || 'montoit-notification',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const payload = event.notification.data || {};
  const url = payload.url || '/';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existingClient = allClients.find((client) => new URL(client.url).origin === new URL(url, self.location).origin);

      if (existingClient) {
        existingClient.focus();
        existingClient.navigate ? existingClient.navigate(url) : (existingClient.url = url);
        return existingClient;
      }

      return self.clients.openWindow(url);
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
