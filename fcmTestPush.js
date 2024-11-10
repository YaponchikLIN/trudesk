var FCM = require('fcm-push');
var f = new FCM(
  'AAAAbTftmj0:APA91bGBJhtDE1mpIiVBElSDyFBx0VztWsFyc0GCyL8ScXnWMuowFqQ-AjzUgpYwRp7zhQpEXbi0jBdMjrfEvh00zJC_2m0HoVMtagdpoYgC88zU-m4zxVoN4i_ui3OQag6VXEWNiQ0c'
);

var message = {
  to: 'dR4UXHgWwwGqAQpqOPrn5C:APA91bHHYQBw-ZZtPMHTvmUTl7AJOKTtGKylF78qoWbVDkppiIXZlimoOYEr_pUpludnDBstonIfCkDfpYZkMZdGhi-qD_Qn5GR2fyrgLNaNSooP1pvN2RRrR4rsrjFca_nuRkNKekJ9',
  collapse_key: 'your_collapse_key',
  notification: {
    title: 'Title of your push notification',
    body: 'Body of your push notification',
  },
};

f.send(message, function (err, res) {
  if (err) {
    console.log('error ' + err);
  } else {
    console.log('Push success');
  }
});
