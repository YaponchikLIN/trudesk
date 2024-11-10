// import { initializeApp } from 'firebase/app';
// import { getMessaging, getToken } from 'firebase/messaging';

// const firebaseConfig = {
//   apiKey: 'AIzaSyABl7kYBJ3IXdC-lqHKWisBFEDrqDWvUIg',
//   authDomain: 'trudesk-24f1c.firebaseapp.com',
//   projectId: 'trudesk-24f1c',
//   storageBucket: 'trudesk-24f1c.appspot.com',
//   messagingSenderId: '469089753661',
//   appId: '1:469089753661:web:9c8f958c4e45c8e7bc6854',
// };

// requestPermission = (store) => {
//   console.log('Requesting permission...');
//   Notification.requestPermission().then((permission) => {
//     if (permission === 'granted') {
//       console.log('Notification permission granted.');
//       const app = initializeApp(firebaseConfig);
//       console.log(store);
//       const messaging = getMessaging(app);
//       getToken(messaging, {
//         vapidKey: 'BDmLREZt4wFzug7U31tGcD-SmMO25Bt1yG5GqUhyqPETEQCPrphq2vQ3GYespYA3rfO_3mYi9DD0j6Ydre6qdM0',
//       }).then((currentToken) => {
//         if (currentToken) {
//           console.log('currentToken: ', currentToken);
//         } else {
//           console.log('Can not get token');
//         }
//       });
//     } else {
//       console.log('Do not have permission!');
//     }
//   });
// };

// export default requestPermission;
