/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	$(function() {
	  var FS = __webpack_require__(1);
	  var MAP = __webpack_require__(2);
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


/***/ },
/* 1 */
/***/ function(module, exports) {

	var fsHandle;
	var dirHandle;

	var FS = {
	  openFs: function (folder) {
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
	  },

	  localFileName: function (coords) {
	    return [coords.x, coords.y, coords.z].join('-') + '.png';
	  },

	  internalURL: function (coords) {
	    return dirHandle.toURL() + '/' + FS.localFileName(coords);
	  },

	  OSMURL: function (coords) {
	    return 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
	      .replace('{x}', coords.x)
	      .replace('{y}', coords.y)
	      .replace('{z}', coords.z)
	      .replace('{s}', 'abc'[Math.floor(Math.random() * 3)]);
	  },

	  fileExists: function (coords) {
	    return new Promise(function (resolve) {
	      dirHandle.getFile(
	        FS.localFileName(coords),
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

	  },

	  download: function (coords) {
	    return new Promise(function (resolve, reject) {
	      var transfer = new window.FileTransfer();
	      transfer.download(
	        FS.OSMURL(coords),
	        FS.internalURL(coords),
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
	                + FS.OSMURL(coords) + "\n"
	                + FS.internalURL(coords));
	              break;
	            case window.FileTransferError.INVALID_URL_ERR:
	              reject("Invalid URL:\n"
	                + FS.OSMURL(coords) + "\n"
	                + FS.internalURL(coords));
	              break;
	            case window.FileTransferError.CONNECTION_ERR:
	              reject("Connection error at the web server.\n");
	              break;
	          }
	        }
	      );
	    });
	  },


	  getDiskUsage: function () {

	    return FS.readEntries()
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
	  },

	  emptyCache: function () {
	    return FS.readEntries()
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
	};

	module.exports = FS;


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var $map = null;
	var map = null;
	var marker = null;
	var tiles = null;
	var FS = __webpack_require__(1);

	var MAP = {
	  init: function () {
	    $map = $('#map');
	    $map.css({
	      'height': ($(window.document).height()) + 'px'
	    });
	    $(window).resize(function() {
	      $map.css({
	        'height': ($(window.document).height()) + 'px'
	      });
	    });
	  },
	  getMap: function () {
	    return map;
	  },
	  get$Map: function () {
	    return $map;
	  },
	  createMap: function (lat, lng, zoom) {
	    map = L.map('map', {
	      center: [lat, lng],
	      zoom: zoom
	    });
	    map.zoomControl.setPosition('topright');
	    marker = L.marker([lat, lng]).addTo(map);
	    return FS.openFs('seguimiento')
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
	    });
	  },
	  position: function (lat, lng, ZOOM) {

	    if (map) {
	      marker.setLatLng([lat, lng]);
	      return Promise.resolve();
	    } else {
	      return MAP.createMap(lat, lng, ZOOM);
	    }
	  }


	};

	module.exports = MAP;


/***/ }
/******/ ]);