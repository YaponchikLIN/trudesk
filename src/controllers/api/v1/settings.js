/*
      .                             .o8                     oooo
   .o8                             "888                     `888
 .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
   888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
   888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
   888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
   "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 ========================================================================
 Created:    06/27/2016
 Author:     Chris Brame

 **/

var _ = require('lodash');
var async = require('async');
var emitter = require('../../../emitter');
var winston = require('winston');
var sanitizeHtml = require('sanitize-html');
var SettingsSchema = require('../../../models/setting');
var settingsUtil = require('../../../settings/settingsUtil');
var sizeOf = require('image-size');
const socketEventConsts = require('../../../socketio/socketEventConsts');
const fs = require('fs');
const path = require('path');
const Busboy = require('busboy');

var apiSettings = {};

function defaultApiResponse(err, res) {
  if (err) return res.status(400).json({ success: false, error: err });

  return res.json({ success: true });
}

apiSettings.getSettings = function (req, res) {
  settingsUtil.getSettings(function (err, settings) {
    if (err) return res.status(400).json({ success: false, error: err });

    // Sanitize
    if (!req.user.role.isAdmin) {
      delete settings.data.settings.mailerHost;
      delete settings.data.settings.mailerSSL;
      delete settings.data.settings.mailerPort;
      delete settings.data.settings.mailerUsername;
      delete settings.data.settings.mailerPassword;
      delete settings.data.settings.mailerFrom;
      delete settings.data.settings.mailerCheckEnabled;
      delete settings.data.settings.mailerCheckPolling;
      delete settings.data.settings.mailerCheckHost;
      delete settings.data.settings.mailerCheckPort;
      delete settings.data.settings.mailerCheckPassword;
      delete settings.data.settings.mailerCheckTicketType;
      delete settings.data.settings.mailerCheckTicketPriority;
      delete settings.data.settings.mailerCheckCreateAccount;
      delete settings.data.settings.mailerCheckDeleteMessage;
      delete settings.data.settings.tpsEnabled;
      delete settings.data.settings.tpsUsername;
      delete settings.data.settings.tpsApiKey;

      delete settings.data.mailTemplates;
    }

    return res.json({ success: true, settings: settings });
  });
};

apiSettings.getSingleSetting = function (req, res) {
  settingsUtil.getSettings(function (err, settings) {
    if (err) return res.status(400).json({ success: false, error: err });

    var setting = settings.data.settings[req.params.name];
    if (!setting) return res.status(400).json({ success: false, error: 'invalid setting' });

    return res.json({ success: true, setting: setting });
  });
};

/**
 * @api {put} /api/v1/settings/:setting Update Setting
 * @apiName updateSetting
 * @apiDescription Updates given Setting with given Post Data
 * @apiVersion 0.1.7
 * @apiGroup Setting
 * @apiHeader {string} accesstoken The access token for the logged in user
 *
 * @apiParamExample {json} Request-Example:
 * {
 *      "name": "setting:name",
 *      "value": {setting value},
 * }
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json"
        -H "accesstoken: {accesstoken}"
        -X PUT -d "{\"name\": {name},\"value\": \"{value}\"}"
        -l http://localhost/api/v1/settings/:setting
 *
 * @apiSuccess {boolean} success Successful?
 *
 * @apiError InvalidPostData The data was invalid
 * @apiErrorExample
 *      HTTP/1.1 400 Bad Request
 {
     "error": "Invalid Post Data"
 }
 */
apiSettings.updateSetting = function (req, res) {
  var postData = req.body;
  if (_.isUndefined(postData)) return res.status(400).json({ success: false, error: 'Invalid Post Data' });

  if (!_.isArray(postData)) postData = [postData];

  var updatedSettings = [];

  //
  async.each(
    postData,
    function (item, callback) {
      SettingsSchema.getSettingByName(item.name, function (err, s) {
        if (err) return callback(err.message);
        if (_.isNull(s) || _.isUndefined(s)) {
          s = new SettingsSchema({
            name: item.name,
          });
        }

        if (s.name === 'legal:privacypolicy') {
          item.value = sanitizeHtml(item.value, {
            allowedTags: false,
          });
        }

        s.value = item.value;

        s.save(function (err, savedSetting) {
          if (err) return callback(err.message);

          updatedSettings.push(savedSetting);

          return callback();
        });
      });
    },
    function (err) {
      if (err) return res.status(400).json({ success: false, error: err });

      return res.json({ success: true, updatedSettings: updatedSettings });
    }
  );
};

apiSettings.testMailer = function (req, res) {
  var mailer = require('../../../mailer');
  mailer.verify(function (err) {
    if (err) {
      winston.debug(err);
      return res.status(400).json({ success: false, error: err.code ? err.code : 'See Console' });
    }

    return res.json({ success: true });
  });
};

apiSettings.updateTemplateSubject = function (req, res) {
  var templateSchema = require('../../../models/template');
  var id = req.params.id;
  var subject = req.body.subject;
  if (!subject) return res.status(400).json({ sucess: false, error: 'Invalid PUT data' });
  subject = subject.trim();

  templateSchema.findOne({ _id: id }, function (err, template) {
    if (err) return defaultApiResponse(err, res);
    if (!template) return res.status(404).json({ success: false, error: 'No Template Found' });

    template.subject = subject;

    template.save(function (err) {
      return defaultApiResponse(err, res);
    });
  });
};

apiSettings.updateTemplateFullHTML = function (req, res) {
  var templateSchema = require('../../../models/template');
  var id = req.params.id;

  var fullHTML = req.body.fullHTML;
  if (!fullHTML) return res.status(400).json({ sucess: false, error: 'Invalid PUT data' });
  fullHTML = fullHTML.trim();

  templateSchema.findOne({ _id: id }, function (err, template) {
    if (err) return defaultApiResponse(err, res);
    if (!template) return res.status(404).json({ success: false, error: 'No Template Found' });

    template.data['gjs-fullHtml'] = fullHTML;
    const updateTemplate = {
      name: template.name,
      displayName: template.displayName,
      description: template.description,
      subject: template.subject,
      data: template.data,
    };

    templateSchema.deleteOne({ _id: id }, function (err) {
      if (err) return defaultApiResponse(err, res);
      return templateSchema.create(updateTemplate);
    });
    return res.json({ success: true });
  });
};

apiSettings.firebaseMessagingSw = async function (req, res) {
  const s = {};
  s.apiKey = req.body.settings.apiKey;
  s.authDomain = req.body.settings.authDomain;
  s.projectId = req.body.settings.projectId;
  s.storageBucket = req.body.settings.storageBucket;
  s.messagingSenderId = req.body.settings.messagingSenderId;
  s.appId = req.body.settings.appId;
  s.siteUrl = req.body.settings.siteUrl;

  const imortScriptsString = `
  importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
  importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');
  `;

  const firebaseConfigString = `
  const firebaseConfig = {
    apiKey: '${s.apiKey}',
    authDomain: '${s.authDomain}',
    projectId: '${s.projectId}',
    storageBucket: '${s.storageBucket}',
    messagingSenderId: '${s.messagingSenderId}',
    appId: '${s.appId}',
  }
  `;

  const onBackgroundMessageString = `
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();
  var baseUrl = '${s.siteUrl}';
 messaging.onBackgroundMessage((payload) => {
  // console.log('[firebase-messaging-sw.js] Received background message ', payload);
  //const notificationTitle = payload.notification.title;
  const notificationTitle = payload.data.title;
  const notificationOptions = {
    body: payload.data.body,
    data: { click_action: payload.data.click_action },
    icon: '${s.siteUrl}/notificationImage.png',
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
    `;

  const onBackgroundMessageStringForMobile = `
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();
  var baseUrl = '${s.siteUrl}';
 messaging.onBackgroundMessage((payload) => {
  // console.log('[firebase-messaging-sw.js] Received background message ', payload);
  //const notificationTitle = payload.notification.title;
  const notificationTitle = payload.data.title;
  const notificationOptions = {
     body: payload.data.body,
    data: { click_action: payload.data.click_action },
    icon: '${s.siteUrl}/notificationImage.png',
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
 
self.addEventListener('notificationclick', function (event) {
  let action_click = event.notification.data.click_action;
  var url = action_click;
  var sub = '/mobile/#/tab';
  var position = url.indexOf('/tickets'); // индекс перед /tickets
  action_click = url.substr(0, position) + sub + url.substr(position);
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
    `;

  const firebaseMessagingSwString = `${imortScriptsString}${firebaseConfigString}${onBackgroundMessageString}`;
  const firebaseMessagingSwStringForMobile = `${imortScriptsString}${firebaseConfigString}${onBackgroundMessageStringForMobile}`;
  fs.writeFileSync(path.join(__dirname, '../../../../public/firebase-messaging-sw.js'), firebaseMessagingSwString);
  fs.writeFileSync(
    path.join(__dirname, '../../../../mobile/firebase-messaging-sw.js'),
    firebaseMessagingSwStringForMobile
  );
  fs.writeFileSync(
    path.join(__dirname, '../../../../mobile/js/dist/firebase-messaging-sw.js'),
    firebaseMessagingSwStringForMobile
  );
};

apiSettings.firebaseConfig = function (req, res) {
  SettingsSchema.find(
    {
      $or: [
        { name: 'gen:apiKey' },
        { name: 'gen:authDomain' },
        { name: 'gen:projectId' },
        { name: 'gen:storageBucket' },
        { name: 'gen:messagingSenderId' },
        { name: 'gen:appId' },
        { name: 'gen:vapidKey' },
        { name: 'gen:siteurl' },
      ],
    },
    function (err, settings) {
      if (err) return defaultApiResponse(err, res);
      if (!settings) return res.status(404).json({ success: false, error: 'No Settings Found' });

      const settingForRes = {};
      settings.forEach(function (setting) {
        settingForRes[setting.name.replace('gen:', '')] = setting.value;
      });

      return res.json({ success: true, settings: settingForRes });
    }
  );
};

apiSettings.checkFileServiceAccount = function (req, res) {
  // Проверяем, что имя файла не пустое
  const pathFile = path.join(__dirname, `../../../firebase/serviceAccountKey.json`);
  if (pathFile) {
    // Проверяем, существует ли такой файл
    fs.access(pathFile, fs.constants.F_OK, (err) => {
      // Обрабатываем ошибку при проверке файла
      if (err) {
        console.error(err);
        // Отправляем ответ клиенту с данными об отсутствии файла
        res.status(200).json({ exists: false });
      } else {
        // Отправляем ответ клиенту с данными о наличии файла
        res.status(200).json({ exists: true });
      }
    });
  } else {
    // Отправляем ответ клиенту с сообщением об ошибке
    res.status(400).json({ message: 'File name is missing' });
  }
};

apiSettings.fileServiceAccount = function (req, res) {
  // Создаем объект busboy для обработки загрузки файлов
  const busboy = Busboy({
    headers: req.headers,
  });
  // Создаем путь к папке, в которую нужно сохранить файл
  const path = require('path');
  const pathFile = path.join(__dirname, `../../../firebase`);
  // Проверяем, существует ли такая папка
  if (!fs.existsSync(pathFile)) {
    // Если нет, то создаем ее
    fs.mkdirSync(pathFile);
  }

  // Создаем переменную для хранения файла
  let file;
  // Обрабатываем событие получения файла

  busboy.on('file', function (name, filestream, info) {
    const mimetype = info.mimeType;
    // Проверяем, что файл имеет нужный тип
    if (mimetype === 'application/json') {
      // Читаем содержимое файла в буфер
      filestream.on('data', (data) => {
        file = data;
      });
      // Обрабатываем событие окончания чтения файла
      filestream.on('end', async () => {
        // Записываем содержимое файла в нужную папку
        await fs.writeFileSync(`${pathFile}/serviceAccountKey.json`, file);
      });
    } else {
      // Отправляем ответ клиенту с сообщением об ошибке
      res.status(400).json({ message: 'File type is not valid' });
    }
  });
  // Обрабатываем событие окончания обработки запроса
  busboy.on('finish', () => {
    // Отправляем ответ клиенту с сообщением об успехе
    res.status(200).json({ message: 'File uploaded successfully' });
  });
  // Передаем запрос в объект busboy для обработки
  req.pipe(busboy);
};

apiSettings.fileImage = function (req, res) {
  if (Number(req.headers['content-length']) > 100000) {
    res.status(400).json({ message: 'The file must not exceed 100 KB' });
    return;
  }
  // Создаем объект busboy для обработки загрузки файлов
  const busboy = Busboy({
    headers: req.headers,
  });
  // Создаем путь к папке, в которую нужно сохранить файл
  const path = require('path');
  const pathFile = path.join(__dirname, `../../../../public`);
  // Проверяем, существует ли такая папка
  if (!fs.existsSync(pathFile)) {
    // Если нет, то создаем ее
    fs.mkdirSync(pathFile);
  }

  // Создаем переменную для хранения файла
  let fileProcessed = false;
  // Обрабатываем событие получения файла

  busboy.on('file', async function (name, filestream, info) {
    const mimetype = info.mimeType;
    // Проверяем, что файл имеет нужный тип
    if (mimetype === 'image/png') {
      // Читаем содержимое файла в буфер
      const file = await filestreamToBuffer(filestream);
      var dimensions = sizeOf(file);
      if (dimensions.height > 300 || dimensions.width > 300 || dimensions.height < 50 || dimensions.width < 50) {
        res.status(400).json({ message: 'The dimensions do not correspond to the range of 50-300px' });
        return;
      }
      // Записываем содержимое файла в нужную папку
      try {
        await fs.promises.writeFile(`${pathFile}/notificationImage.png`, file);
        // Устанавливаем флаг в true
        fileProcessed = true;
        res.status(200).json({ message: 'File uploaded successfully' });
      } catch (err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
      }
    } else {
      // Отправляем ответ клиенту с сообщением об ошибке
      res.status(400).json({ message: 'File type is not valid' });
    }
  });
  // Обрабатываем событие окончания обработки запроса
  busboy.on('finish', () => {
    console.log('Busboy request processed');
  });

  // Функция для преобразования потока в буфер
  function filestreamToBuffer(filestream) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      filestream.on('data', (chunk) => {
        chunks.push(chunk);
      });
      filestream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      filestream.on('error', (err) => {
        reject(err);
      });
    });
  }
  // Передаем запрос в объект busboy для обработки
  req.pipe(busboy);
};

apiSettings.buildsass = function (req, res) {
  var buildsass = require('../../../sass/buildsass');
  buildsass.build(function (err) {
    return defaultApiResponse(err, res);
  });
};

apiSettings.updateRoleOrder = function (req, res) {
  if (!req.body.roleOrder) return res.status(400).json({ success: false, error: 'Invalid PUT Data' });
  var RoleOrderSchema = require('../../../models/roleorder');
  RoleOrderSchema.getOrder(function (err, order) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (!order) {
      order = new RoleOrderSchema({
        order: req.body.roleOrder,
      });
      order.save(function (err, order) {
        if (err) return res.status(500).json({ success: false, error: err.message });

        emitter.emit(socketEventConsts.ROLES_FLUSH);

        return res.json({ success: true, roleOrder: order });
      });
    } else {
      order.updateOrder(req.body.roleOrder, function (err, order) {
        if (err) return res.status(400).json({ success: false, error: err.message });

        emitter.emit(socketEventConsts.ROLES_FLUSH);

        return res.json({ success: true, roleOrder: order });
      });
    }
  });
};

module.exports = apiSettings;
