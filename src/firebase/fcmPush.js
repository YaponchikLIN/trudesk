var FCM = require('fcm-push');
var f = new FCM(
  'AAAAK95Vpqc:APA91bE47V9nLVUwaUVjzNT7QOxgzSDnYTEmO3TGWoHk2A-MyWchIGroYg5sdoDx5Mj2tVG0-mRMMeO5rFFkmaZsbqD2-fkcyfmM4eDThuu2THKm7-ba6CrUfZHhsqftvaMqzrX-3m6F'
);

var message = {
  to: 'djnWfDITOrL-2MxMascniz:APA91bFqfHMULs8z81aHnRd5PPqmCYF4SJWUB8Os1uFNyVtWsQ3j5ySXmHVUsgqV6vb0qD5djugg21Z8hCWhSKOMLenUW1pjy7PuBwproE0GirA2j_2AstTa-fP1dgeJsfd5CLmst-XH',
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
