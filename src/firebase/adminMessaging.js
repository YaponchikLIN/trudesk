let admin;
let serviceAccountKey;
const userSchema = require('../models/user');
const winston = require('../logger');
const fs = require('fs');
const path = require('path');
const pathFile = path.join(__dirname, `./serviceAccountKey.json`);
if (fs.existsSync(`${pathFile}`)) {
  admin = require('firebase-admin');
  serviceAccountKey = require('./serviceAccountKey.json');
}

if (admin) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountKey),
  });
}

module.exports = (message) => {
  if (admin && message?.tokens?.length !== 0) {
    admin
      .messaging()
      .sendMulticast(message)
      .then((response) => {
        console.log('Successfully sent message:', response);
        // Проверяем, есть ли невалидные или незарегистрированные токены в ответе
        if (response.failureCount > 0) {
          // Получаем индексы невалидных токенов из ответа
          const invalidTokens = response.responses
            .map((response, i) => (response.error ? i : null))
            .filter((i) => i !== null);
          // Удаляем невалидные токены из базы данных
          for (let res of response.responses) {
            if (res.error) {
              if (res.error.length > 0) {
                for (let error of res.error) {
                  winston.warn(error);
                  console.log(error);
                }
              } else {
                winston.warn(res.error);
                console.log(res.error);
              }
            }
          }

          invalidTokens.forEach((i) => {
            const invalidToken = message.tokens[i];
            userSchema
              .updateOne(
                { notificationTokens: invalidToken },
                {
                  $pull: { notificationTokens: invalidToken },
                }
              )
              .then((result) => {
                // Выводим результат обновления
                console.log(result);
              })
              .catch((error) => {
                // Обрабатываем ошибку при обновлении
                winston.warn(error);
                console.error(error);
              });
            // Здесь твой код для удаления токена из базы данных
          });
        }
      })
      .catch((error) => {
        winston.warn('Error sending message:', error);
        console.log('Error sending message:', error);
        // Здесь твой код для обработки других ошибок FCM
      });
  }
};
