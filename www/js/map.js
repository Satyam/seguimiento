var $map = null;
var map = null;
var marker = null;
var tiles = null;
// var menu = null;
var FS = require('./fs.js');
// var Menu = require('./menu.js');

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
  // getMenu: function () {
  //   return menu;
  // },
  createMap: function (lat, lng, zoom) {
    map = L.map('map', {
      center: [lat, lng],
      zoom: zoom
    });
    map.zoomControl.setPosition('topright');
    marker = L.marker([lat, lng]).addTo(map);
    // menu = new Menu([
    //   ['uno', function () {
    //     alert('uno');
    //   }],
    //   ['dos', function () {
    //     alert('dos');
    //   }],
    //   ['tres', function () {
    //     alert('tres');
    //   }]
    // ]);
    // menu.addTo(map);
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
