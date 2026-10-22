importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDhmyE8KMJ3kPv-lqqPaJPs-dhGT_khvnI",
  authDomain: "sr7themes-auth.firebaseapp.com",
  projectId: "sr7themes-auth",
  storageBucket: "sr7themes-auth.firebasestorage.app",
  messagingSenderId: "1002371493022",
  appId: "1:1002371493022:web:dafdea91424f7cadf01f8f"
});

const messaging = firebase.messaging();

// Handle background notifications
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/favicon.ico',
    data: {
        url: payload.data ? payload.data.url : 'https://www.orpte.com'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Redirect user when clicking notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data.url;
  event.waitUntil(
    clients.openWindow(targetUrl)
  );
});
