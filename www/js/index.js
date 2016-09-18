/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = {
  // Application Constructor
  initialize: function() {
    this.bindEvents();
  },
  // Bind Event Listeners
  //
  // Bind any events that are required on startup. Common events are:
  // 'load', 'deviceready', 'offline', and 'online'.
  bindEvents: function() {
    document.addEventListener('deviceready', this.onDeviceReady, false);
  },
  // deviceready Event Handler
  //
  // The scope of 'this' is the event. In order to call the 'receivedEvent'
  // function, we must explicitly call 'app.receivedEvent(...);'
  onDeviceReady: function() {
    $(function() {

      $('#map').css({
        'height': ($(window.document).height()) + 'px'
      });
      $(window).resize(function() {
        $('#map').css({
          'height': ($(window.document).height()) + 'px'
        });
      });

      var ZOOM = 16;
      var map = null;
      var marker = null;
      var tiles = null;
      var i = 0;
      var latEl = $('#lat');
      var lngEl = $('#lng');
      var bipEl = $('#bip');
      var msgEl = $('#msg');
      var onlineStatusEl = $('#onlineStatus');
      var forceOfflineEl = $('#forceOffline');

      function createMap(lat, lng, zoom) {
        map = L.map('map', {
          center: [lat, lng],
          zoom: zoom
        });
        tiles = L.tileLayerCordova('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
            '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
          folder: 'LTileLayerCordovaExample',
          name: 'example',
          debug: true
        }, function() {
          //----------------------------------------------------------------
          // From: https://github.com/gregallensworth/L.TileLayer.Cordova
          // calculate a tile pyramid starting at a lat/lon and going down to a stated range of zoom levels
          var tile_list = tiles.calculateXYZListFromBounds(map.getBounds(), zoom - 1, zoom + 1);
          tiles.downloadXYZList(
            // 1st param: a list of XYZ objects indicating tiles to download
            tile_list,
            // 2nd param: overwrite existing tiles on disk?
            // if no then a tile already on disk will be kept, which can be a big time saver
            true,
            // 3rd param: progress callback
            // receives the number of tiles downloaded and the number of tiles total
            // caller can calculate a percentage, update progress bar, etc.
            // function(done, total) {
              // var percent = Math.round(100 * done / total);
              // console.log(done + " / " + total + " = " + percent + "%");
            //},
            null,
            // 4th param: complete callback
            // no parameters are given, but we know we're done!
            function() {
              // for this demo, on success we use another L.TileLayer.Cordova feature and show the disk usage!
              tiles.getDiskUsage(function(filecount, bytes) {
                var kilobytes = Math.round(bytes / 1024);
                msgEl.html(msgEl.html() +
                  "Done\n" + filecount + " files\n" + kilobytes + " kB"
                );
              });
            },
            // 5th param: error callback
            // parameter is the error message string
            onError
          );
        });
        map.addLayer(tiles);
      }

      function newPosition(position) {
        try {
          var lat = position.coords.latitude, lng = position.coords.longitude;
          bipEl.html('-/|\\' [(i++) % 4]);
          latEl.html(lat);
          lngEl.html(lng);

          if (map) {
            marker.setLatLng([lat, lng]);
          } else {
            createMap(lat, lng, ZOOM);
            marker = L.marker([lat, lng]).addTo(map);
            map.on('click', function(ev) {
              msgEl.html(msgEl.html() + '<pre>' + JSON.stringify(ev.latlng, null, 2) + '</pre>');
            });
          }
          window.setTimeout(getPosition, 10000);
        } catch (err) {
          onError(err);
        }

      };

      function onError(error) {
        msgEl.html(msgEl.html() + '<pre>' +
          'code: ' + error.code + '\n' +
          'message: ' + error.message + '</pre>'
        );
      }

      forceOfflineEl.on('click', function(ev) {
        if (forceOfflineEl.hasClass('btn-warning')) {
          tiles.goOnline();
          forceOfflineEl.html('force offline');
        } else {
          tiles.goOffline();
          forceOfflineEl.html('offline (forced)');
        }
        forceOfflineEl.toggleClass('btn-warning');
      });

      function onlineStatus() {
        if (navigator.connection.type === Connection.NONE) {
          onlineStatusEl.removeClass('status-on-line').html('off line');
        } else {
          onlineStatusEl.addClass('status-on-line').html('on line');
        }
      };

      document.addEventListener("offline", function() {
        tiles.goOffline();
        onlineStatus();
      }, false);
      document.addEventListener("online", function() {
        if (!forceOfflineEl.hasclass('btn-warning')) {
          tiles.goOnline();
        }
        onlineStatus();
      }, false);

      onlineStatus();
      function getPosition() {
        navigator.geolocation.getCurrentPosition(
          newPosition,
          function (err) {
            onError(err);
            window.setTimeout(getPosition, 10000);
          },
          {
            timeout: 30000
          }
        );
      }
      getPosition();
    });
  }
};
