importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase with your project credentials
firebase.initializeApp({
  apiKey: "AIzaSyDhmyE8KMJ3kPv-lqqPaJPs-dhGT_khvnI",
  authDomain: "sr7themes-auth.firebaseapp.com",
  projectId: "sr7themes-auth",
  storageBucket: "sr7themes-auth.firebasestorage.app",
  messagingSenderId: "1002371493022",
  appId: "1:1002371493022:web:dafdea91424f7cadf01f8f"
});

const messaging = firebase.messaging();

// Handle background push notifications
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = (payload.notification && payload.notification.title) 
    ? payload.notification.title 
    : "New Update from Orpte";

  const notificationOptions = {
    body: (payload.notification && payload.notification.body) 
      ? payload.notification.body 
      : "Check out our latest post!",
    icon: (payload.notification && payload.notification.icon) 
      ? payload.notification.icon 
      : 'https://orpte.blogspot.com/favicon.ico',
    data: {
      url: (payload.data && payload.data.url) 
        ? payload.data.url 
        : 'https://orpte.blogspot.com/'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Open article or homepage when user clicks the notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const targetUrl = (event.notification.data && event.notification.data.url) 
    ? event.notification.data.url 
    : 'https://orpte.blogspot.com/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if open to target URL
      for (let client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new tab
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
