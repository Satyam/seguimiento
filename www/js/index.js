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
    $(function () {

    	$('#map').css({
    		'height': ($(window.document).height()) + 'px'
    	});
    	$(window).resize(function () {
    		$('#map').css({
    			'height': ($(window.document).height()) + 'px'
    		});
    	});


      var map = null;
      var marker = null;
      var tiles = null;
      var i = 0;
      var latEl = $('#lat');
      var lngEl = $('#lng');
      var bipEl = $('#bip');
      var msgEl = $('#msg');
      var onlineEl = $('#online');
      function onSuccess(position) {
        try {
          bipEl.html('-/|\\'[(i++) % 4]);
          latEl.html(position.coords.latitude);
          lngEl.html(position.coords.longitude);
          onlineEl

          if (map) {
            marker.setLatLng([position.coords.latitude, position.coords.longitude]);
          } else {
            map = L.map('map', {
          		center: [position.coords.latitude, position.coords.longitude],
          		zoom: 15
          	});
            tiles = L.tileLayerCordova('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
          			'<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
              folder: 'LTileLayerCordovaExample',
              name:   'example',
              debug: true
            });
            map.addLayer(tiles);
            onlineEl.prop('checked', tiles.isOnline());
            marker = L.marker([position.coords.latitude, position.coords.longitude]).addTo(map);
            map.on('click', function (ev) {
              msgEl.html(msgEl.html() + '<pre>' + JSON.stringify(ev.latlng, null, 2) + '</pre>');
            })
          }
          window.setTimeout(getPosition, 10000);
        }
        catch(err) {
          onError(err);
        }

      };
      function onError(error) {
        msgEl.html(msgEl.html() + '<pre>' +
          'code: ' + error.code + '\n' +
          'message: ' + error.message + '</pre>'
        );
      }

      onlineEl.on('click', function (ev) {
          if (onlineEl.prop('checked')) {
            tiles.goOnline();
          } else {
            tiles.goOffline();
          }
      });

      function getPosition() {
        navigator.geolocation.getCurrentPosition(onSuccess, onError, {
          timeout: 30000
        });
      }
      getPosition();
    });
  }
};
