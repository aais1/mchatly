self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Mchatly Notification';
  const options = {
    body: data.body || '',
    tag: data.tag || '',
    icon: '/next.svg',
    data: data.data || {}, // Pass custom data to notification
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.url || '/dashboard';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      if (clientList.length > 0) {
        const client = clientList[0];
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
        return client.navigate(url).then(c => c.focus());
      }
      return clients.openWindow(url);
    })
  );
});
