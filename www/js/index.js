$(function() {
  document.addEventListener('deviceready', onDeviceReady, false);

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

  var existing = [];
  var required = [];

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
      tiles.emptyCache(function (success, failed) {
        alert('cleared '  + success + ' tiles, failed: ' + failed);
      });
    });
    document.addEventListener("offline", function() {
      tiles.goOffline();
      onlineStatus();
    }, false);

    document.addEventListener("online", function() {
      if (!$forceOffline.hasclass('btn-warning')) {
        tiles.goOnline();
        if (required.length) {
          download(function() {
            tiles.getDiskUsage(function(filecount, bytes) {
              var kilobytes = Math.round(bytes / 1024);
              appendMsg("Done\n" + filecount + " files\n" + kilobytes + " kB");
            });
          });
        }
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

  var downloading = false;

  function download(callback) {
    if (downloading) return;
    downloading = true;
    tiles.downloadXYZList(
      required,
      false,
      null,
      function() {
        existing = existing.concat(required);
        required = [];
        downloading = false;
        if (callback) callback();
      },
      onError
    );
  }

  function createMap(lat, lng, zoom) {
    map = L.map('map', {
      center: [lat, lng],
      zoom: zoom
    });

    tiles = L.tileLayerCordova(
      'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
          '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
        folder: 'LTileLayerCordovaExample',
        name: 'example',
        debug: true
      },
      function() {
        required = tiles.calculateXYZListFromBounds(map.getBounds(), zoom - 1, zoom + 1);
        if (required.length && isOnline()) {
          download(function() {
            tiles.getDiskUsage(function(filecount, bytes) {
              var kilobytes = Math.round(bytes / 1024);
              appendMsg("Done\n" + filecount + " files\n" + kilobytes + " kB");
            });
          });
        }
      }
    );
    map.addLayer(tiles);
    map.on('moveend', function (ev) {
      console.log('moveend', ev);

    });
    map.on('zoomend', function (ev) {
      console.log('zoomend', ev);
    });
    tiles.on('tileloadstart', function (ev) {
      console.log('tileloadstart', ev);
    });
    tiles.on('tileload', function (ev) {
      console.log('tileload', ev);
    });
    tiles.on('tileerror', function (ev) {
      console.log('tileerror', ev);
    });
  }


  function newPosition(position) {
    try {
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
    } catch (err) {
      onError(err);
    }

  }

  function appendMsg(text) {
    $msg.html($msg.html() + text + '\n');
  }

  function onError(error) {
    appendMsg('code: ' + error.code + '\nmessage: ' + error.message);
  }
});
