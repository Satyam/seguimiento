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
