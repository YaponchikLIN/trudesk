
  importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
  importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');
  
  const firebaseConfig = {
    apiKey: 'AIzaSyBXIyOBepVRbF7VjicglYBtwtsCBAo8HJc',
    authDomain: 'trudesk-615c3.firebaseapp.com',
    projectId: 'trudesk-615c3',
    storageBucket: 'trudesk-615c3.appspot.com',
    messagingSenderId: '1054374084008',
    appId: '1:1054374084008:web:e9cdf82d8ef1ce513cf19d',
  }
  
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();
  var baseUrl = 'https://trudesk-dev.shatura.pro';
 messaging.onBackgroundMessage((payload) => {
  // console.log('[firebase-messaging-sw.js] Received background message ', payload);
  //const notificationTitle = payload.notification.title;
  const notificationTitle = payload.data.title;
  const notificationOptions = {
    //body: payload.notification.body,
    body: payload.data.body,
    data: { click_action: payload.data.click_action },
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function (event) {
  const action_click = event.notification.data.click_action;
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async function (clientList) {
      // Check if there is already a window/tab open with the same domain or path as the target URL
      let urlIncludes = false;
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];

        if (client.url.includes(baseUrl) && 'focus' in client) {
          urlIncludes = true;
          if (client.url !== action_click) {
            client.postMessage({
              action: 'redirect-from-notificationclick',
              url: action_click,
            });
          }
          client.focus();
        }
      }

      if (!urlIncludes) {
        if (clients.openWindow) {
          return clients.openWindow(action_click);
        }
      }
    })
  );
});
    