import React from 'react';
import { connect } from 'react-redux';
import { getApps, initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';
import { fetchSettings } from 'actions/settings';
import axios from 'axios';

class FirebaseConfig extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      updateComponent: false,
    };
    this.firebaseConfig = {
      apiKey: this.getSettingsValue('apiKey'),
      authDomain: this.getSettingsValue('authDomain'),
      projectId: this.getSettingsValue('projectId'),
      storageBucket: this.getSettingsValue('storageBucket'),
      messagingSenderId: this.getSettingsValue('messagingSenderId'),
      appId: this.getSettingsValue('appId'),
    };
  }

  getSettingsValue(name) {
    return this.props.settings.getIn(['settings', name, 'value'])
      ? this.props.settings.getIn(['settings', name, 'value'])
      : '';
  }

  requestPermission() {
    // Проверяем, что все настройки firebase заданы
    const firebaseSettings = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    const hasFirebaseSettings = firebaseSettings.every((setting) =>
      this.props.settings.getIn(['settings', setting, 'value'])
    );

    if (hasFirebaseSettings) {
      console.log('Requesting permission…');
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          console.log('Notification permission granted.');

          // Инициализируем приложение firebase, если еще не сделали
          const app = !getApps().length ? initializeApp(this.firebaseConfig) : getApps();
          const messaging = getMessaging(app);

          // Получаем токен для уведомлений
          getToken(messaging, {
            vapidKey: this.getSettingsValue('vapidKey'),
          }).then((currentToken) => {
            if (currentToken) {
              const data = {
                currentToken: currentToken,
                sessionUserID: this.props.sessionUser._id,
              };
              console.log('currentToken');
              // console.log(currentToken);
              // console.log('firebaseConfig');
              // console.log(this.firebaseConfig);

              axios.post('/api/v2/accounts/notificationToken', data);
            } else {
              console.log('Can not get token');
            }
          });
        } else {
          console.log('Do not have permission!');
        }
      });
    } else {
      this.setState({ updateComponent: true });
    }
  }

  componentDidMount() {
    this.props.fetchSettings();
  }

  componentDidUpdate(prevProps) {
    // Запрашиваем разрешение только после получения настроек и пользователя и только если они изменились
    if (
      this.props.settings &&
      this.props.sessionUser &&
      (!prevProps.settings ||
        !prevProps.sessionUser ||
        prevProps.settings !== this.props.settings ||
        prevProps.sessionUser !== this.props.sessionUser)
    ) {
      // Обновляем конфигурацию firebase
      this.firebaseConfig = {
        apiKey: this.getSettingsValue('apiKey'),
        authDomain: this.getSettingsValue('authDomain'),
        projectId: this.getSettingsValue('projectId'),
        storageBucket: this.getSettingsValue('storageBucket'),
        messagingSenderId: this.getSettingsValue('messagingSenderId'),
        appId: this.getSettingsValue('appId'),
      };
      // Вызываем requestPermission()
      this.requestPermission();
    }
  }

  render() {
    return <></>;
  }
}
const mapStateToProps = (state) => ({
  settings: state.settings.settings,
  sessionUser: state.shared.sessionUser,
});

export default connect(mapStateToProps, { fetchSettings })(FirebaseConfig);
