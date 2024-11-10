import { AngularFireModule } from '@angular/fire';
import { AngularFireMessaging } from '@angular/fire/messaging';

const firebaseConfig = {
  apiKey: 'AIzaSyBXIyOBepVRbF7VjicglYBtwtsCBAo8HJc',
  authDomain: 'trudesk-615c3.firebaseapp.com',
  projectId: 'trudesk-615c3',
  storageBucket: 'trudesk-615c3.appspot.com',
  messagingSenderId: '1054374084008',
  appId: '1:1054374084008:web:e9cdf82d8ef1ce513cf19d',
};

AngularFireModule.initializeApp(firebaseConfig);

requestPermission = () => {
  AngularFireMessaging.requestToken.subscribe(
    (token) => {
      console.log('Permission granted! Save to the server!', token);
      // сохранить токен или отправить на сервер
    },
    (error) => {
      console.error(error);
    }
  );
};

requestPermission();
