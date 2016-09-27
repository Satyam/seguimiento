$(function() {

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

  var fsHandle;
  var dirHandle;

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
      getDiskUsage().then(function(result) {
        appendMsg(JSON.stringify(result, null, 2));
      }).then(function () {
        return emptyCache().then(function (count) {
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

  function openFs(folder) {
    return new Promise(function (resolve, reject) {
      if (!window.requestFileSystem) {
        reject("L.TileLayer.Cordova: device does not support requestFileSystem");
        return;
      }
      window.requestFileSystem(
        window.LocalFileSystem.PERSISTENT,
        0,
        function(fshandle) {
          fsHandle = fshandle;
          fsHandle.root.getDirectory(
            folder, {
              create: true,
              exclusive: false
            },
            function(dirhandle) {
              dirHandle = dirhandle;
              dirHandle.setMetadata(null, null, {
                "com.apple.MobileBackup": 1
              });

              resolve(dirHandle);
            },
            reject
          );
        },
        reject
      );
    });
  }

  function localFileName(coords) {
    return [coords.x, coords.y, coords.z].join('-') + '.png';
  }

  function internalURL(coords) {
    return dirHandle.toURL() + '/' + localFileName(coords);
  }

  function OSMURL(coords) {
    return 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      .replace('{x}', coords.x)
      .replace('{y}', coords.y)
      .replace('{z}', coords.z)
      .replace('{s}', 'abc'[Math.floor(Math.random() * 3)]);
  }

  function fileExists(coords) {
    return new Promise(function (resolve) {
      dirHandle.getFile(
        localFileName(coords),
        {
          create: false
        },
        function () {
          resolve(true);
        },
        function () {
          resolve(false);
        }
      );
    });

  }

  function download(coords) {
    return new Promise(function (resolve, reject) {
      var transfer = new window.FileTransfer();
      transfer.download(
        OSMURL(coords),
        internalURL(coords),
        function(file) {
          // tile downloaded OK; set the iOS "don't back up" flag then move on
          file.setMetadata(null, null, {
            "com.apple.MobileBackup": 1
          });
          resolve(file);
        },
        function (error) {
          switch (error.code) {
            case window.FileTransferError.FILE_NOT_FOUND_ERR:
              reject("One of these was not found:\n"
                + OSMURL(coords) + "\n"
                + internalURL(coords));
              break;
            case window.FileTransferError.INVALID_URL_ERR:
              reject("Invalid URL:\n"
                + OSMURL(coords) + "\n"
                + internalURL(coords));
              break;
            case window.FileTransferError.CONNECTION_ERR:
              reject("Connection error at the web server.\n");
              break;
          }
        }
      );
    });
  }

  function readEntries() {
    var entries = [];
    var dirReader = dirHandle.createReader();
    return new Promise(function (resolve, reject) {
      function readMore() {
        dirReader.readEntries(
          function (list) {
            if (list.length) {
              entries = entries.concat(list);
              readMore();
            } else {
              resolve(entries.sort());
            }
          },
          reject
        );
      }
      readMore();
    });
  }

  function getDiskUsage() {

    return readEntries()
    .then(function(entries) {
      return Promise.all(entries.map(function (entry) {
        return new Promise(function (resolve, reject) {
          entry.file(
            function(fileinfo) {
              resolve(fileinfo.size);
            },
            reject
          );
        });
      }))
      .then(function (sizes) {
        return {
          files: sizes.length,
          size: sizes.reduce(function (total, size) {
            return total += size;
          }, 0)
        };
      });
    });
  }

  function emptyCache() {
    return readEntries()
    .then(function (entries) {
      return Promise.all(entries.map(function (entry) {
        return new Promise(function (resolve, reject) {
          entry.remove(
            resolve,
            reject
          );
        });
      }))
      .then(function (result) {
        return result.length;
      });
    });
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
    openFs('seguimiento')
    .then(function () {
      tiles = new L.TileLayer.Functional(function (view) {
        var coords = {
          x: view.tile.column,
          y: view.tile.row,
          z: view.zoom
        };
        return fileExists(coords)
        .then(function (exists) {
          if (exists) {
            return internalURL(coords);
          }
          return download(coords)
          .then(function () {
            return internalURL(coords);
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
