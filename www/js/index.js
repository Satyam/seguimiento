$(function() {
  var FS = require('./fs.js');
  var MAP = require('./map.js');
  var ZOOM = 16;
  var i = 0;
  var $lat = $('#lat');
  var $lng = $('#lng');
  var $bip = $('#bip');
  var $msg = $('#msg');
  var $onlineStatus = $('#onlineStatus');

  document.addEventListener('deviceready', onDeviceReady, false);

  function onDeviceReady() {

    MAP.init();

    $('#clearCache').click(function () {
      FS.getDiskUsage().then(function(result) {
        appendMsg(JSON.stringify(result, null, 2));
      }).then(function () {
        return FS.emptyCache().then(function (count) {
          appendMsg('cleared '  + count + ' files');
        });
      }).catch(appendMsg);
    });

    document.addEventListener("offline", function() {
      onlineStatus();
    }, false);

    document.addEventListener("online", function() {
      onlineStatus();
    }, false);

    onlineStatus();

    navigator.geolocation.watchPosition(
      newPosition,
      onError, {
        enableHighAccuracy: true,
        timeout: 30000
      }
    );
  }

  function onlineStatus() {
    if (isOnline) {
      $onlineStatus.addClass('status-on-line').html('on line');
    } else {
      $onlineStatus.removeClass('status-on-line').html('off line');
    }
  }

  function isOnline() {
    return navigator.connection.type !== Connection.NONE;
  }


  function newPosition(position) {
    var lat = position.coords.latitude,
      lng = position.coords.longitude;
    $bip.html('-/|\\' [(i++) % 4]);
    $lat.html(Math.round(lat * 1000) / 1000);
    $lng.html(Math.round(lng * 1000) / 1000);

    MAP.position(lat, lng, ZOOM).catch(onError);
  }

  function appendMsg(text) {
    $msg.html($msg.html() + text + '\n');
  }

  function onError(error) {
    appendMsg('code: ' + error.code + '\nmessage: ' + error.message);
  }
});
