$(function() {
  var FS = require('./fs.js');

  var ZOOM = 16;
  var map = null;
  var marker = null;
  var tiles = null;
  var i = 0;
  var $map = $('#map');
  var $lat = $('#lat');
  var $lng = $('#lng');
  var $bip = $('#bip');
  var $msg = $('#msg');
  var $onlineStatus = $('#onlineStatus');
  var $forceOffline = $('#forceOffline');



  document.addEventListener('deviceready', onDeviceReady, false);

  function onDeviceReady() {

    $map.css({
      'height': ($(window.document).height()) + 'px'
    });
    $(window).resize(function() {
      $map.css({
        'height': ($(window.document).height()) + 'px'
      });
    });
    $forceOffline.on('click', function() {
      if ($forceOffline.hasClass('btn-warning')) {
        tiles.goOnline();
        $forceOffline.html('force offline');
      } else {
        tiles.goOffline();
        $forceOffline.html('offline (forced)');
      }
      $forceOffline.toggleClass('btn-warning');
    });

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
      tiles.goOffline();
      onlineStatus();
    }, false);

    document.addEventListener("online", function() {
      if (!$forceOffline.hasclass('btn-warning')) {
        tiles.goOnline();
      }
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


  function createMap(lat, lng, zoom) {
    map = L.map('map', {
      center: [lat, lng],
      zoom: zoom
    });
    map.zoomControl.setPosition('topright');
    FS.openFs('seguimiento')
    .then(function () {
      tiles = new L.TileLayer.Functional(function (view) {
        var coords = {
          x: view.tile.column,
          y: view.tile.row,
          z: view.zoom
        };
        return FS.fileExists(coords)
        .then(function (exists) {
          if (exists) {
            return FS.internalURL(coords);
          }
          return FS.download(coords)
          .then(function () {
            return FS.internalURL(coords);
          });
        });
      }, {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
          '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
      });
      map.addLayer(tiles);
    }).catch(onError);

    map.on('moveend', function (ev) {
      console.log('moveend', ev);

    });
    map.on('zoomend', function (ev) {
      console.log('zoomend', ev);
    });
  }


  function newPosition(position) {
    var lat = position.coords.latitude,
      lng = position.coords.longitude;
    $bip.html('-/|\\' [(i++) % 4]);
    $lat.html(Math.round(lat * 1000) / 1000);
    $lng.html(Math.round(lng * 1000) / 1000);

    if (map) {
      marker.setLatLng([lat, lng]);
    } else {
      createMap(lat, lng, ZOOM);
      marker = L.marker([lat, lng]).addTo(map);
      map.on('click', function(ev) {
        appendMsg(JSON.stringify(ev.latlng, null, 2));
      });
    }
  }

  function appendMsg(text) {
    $msg.html($msg.html() + text + '\n');
  }

  function onError(error) {
    appendMsg('code: ' + error.code + '\nmessage: ' + error.message);
  }
});
