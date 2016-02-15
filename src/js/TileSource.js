/**
 * Tile Object
 * @param {Number} x Tile coordinate
 * @param {Number} y Tile coordinate
 * @param {Number} tileSize of the tile e.g 256
 * @returns {Tile}
 */
var Tile = function (x, y, tileSize) {
    this.dirty = false;
    this.x = x;
    this.y = y;
    this.ready = false;
    var tileCanvas = document.createElement("canvas");
    tileCanvas.width = tileSize;
    tileCanvas.height = tileSize;
    this.canvas = tileCanvas;
    this.context = tileCanvas.getContext('2d');
};

/**
 *
 * @param options {debug: false}
 * @constructor
 */
var TileSource = function (options) {
    /**
     * Stores tiles in memory structure where keys are the tile coordinates seperated by '/'
     */
    this.debug = false;
    var self = this;
    Object.keys(options).forEach(function(key) {
        self[key] = options[key];
    });
    this.tileCollection = {};
    this.tileSize = 256;
};

/** TileSource 'interface' */

TileSource.prototype.fetchTileAt = function () {
    throw "TileSource object must be extended";
};

TileSource.prototype.saveTileAt = function () {
    throw "TileSource object must be extended";
};


/**
 * Helper for creating Blob objects from base64.
 * @param {String} b64Data
 * @param {String} contentType
 * @param {Number} sliceSize
 * @returns {Blob}
 */
var b64toBlob = function (b64Data, contentType, sliceSize) {
    contentType = contentType || '';
    sliceSize = sliceSize || 512;
    var byteCharacters = atob(b64Data);
    var byteArrays = [], offset, slice, byteNumbers, i, byteArray;
    for (offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        slice = byteCharacters.slice(offset, offset + sliceSize);
        byteNumbers = [slice.length]; //new array
        for (i = 0; i < slice.length; i += 1) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, {type: contentType});
};


/**
 * RESTful Tile Source.
 * @param {Object} options {url: '/', debug: false}
 * @returns {RestTileSource}
 */
var RestTileSource = function (options) {
    TileSource.call(this, options);
    if (this.url === undefined) {
        this.url = '/';
    } else {
        this.url = endpointUrl;
    }
};

RestTileSource.prototype.fetchTileAt = function (tileX, tileY, cb) {
    var self = this;
    var key = tileX + '/' + tileY;
    /* cache lookup */
    if (this.tileCollection.hasOwnProperty(key)) {
        return cb(200, this.tileCollection[key]); //borrowing http codes
    }

    var endpoint = this.url + 'canvases/main/1/' + key;

    var getRequest = new XMLHttpRequest();
    getRequest.responseType = "blob";
    getRequest.open("GET", endpoint, true);

    var tile = new Tile(tileX, tileY, self.tileSize);
    this.tileCollection[key] = tile; //cache tile structure

    var tCtx = tile.context;
    getRequest.onload = function (evt) {
        if (evt.target.status === 200) {
            var imgData = evt.target.response;
            var img = new Image();
            img.onload = function () {
                tCtx.drawImage(img, 0, 0); //this needs to be eliminated
                tile.ready = true;
                cb(200, tile);
            };
            img.src = window.URL.createObjectURL(imgData); //file api experimental
        } else if (evt.target.status === 204) {
            if (self.debug) {
                tCtx.lineWidth = "1";
                tCtx.strokeStyle = "#AACCEE";
                tCtx.rect(0, 0, self.tileSize, self.tileSize);
                tCtx.stroke();
                tCtx.fillText("(" + tileX + "," + tileY + ")", 10, 10);
                tile.ready = true;
                cb(200, tile); //appear like a normal tile with grid drawn
            }
        } else if (evt.target.status === 416) {
            tCtx.fillStyle = "#0F0";
            tCtx.fillRect(0, 0, self.tileSize, self.tileSize);
            cb(416, tile);
        }
    };

    if (!tile.ready) {
        getRequest.send();
    }
};


/**
 * Save tile out over HTTP REST api.
 * @param {Number} xTile Tile coordinate
 * @param {Number} yTile Tile coordinate
 * @param {HTMLCanvasElement} tileCanvas Tile image to save
 * @param {Function} cb takes 1 parameter with the response code.
 */
RestTileSource.prototype.saveTileAt = function (xTile, yTile, tileCanvas, cb) {
    var key = xTile + '/' + yTile;
    var tileString = tileCanvas.toDataURL();
    var endpoint = this.url + 'canvases/main/1/' + key;
    //post tile at coordinate:
    var blob = b64toBlob(tileString.substr(22), 'image/png');
    var putRequest = new XMLHttpRequest();
    putRequest.onload = function (res) {
        var xhr = res.target;
        cb(xhr.status);
    };
    putRequest.open("PUT", endpoint, true);
    //Edge needs to explicityly set request Content-Type otherwise it sends text/plain
    putRequest.setRequestHeader('Content-Type', 'image/png');
    putRequest.responseType = 'blob';
    putRequest.send(blob);
};

/**
 * Create localStorage tile saving adapter.
 * @param {Boolean} debug
 * @returns {LocalStorageTileSource}
 */
var LocalStorageTileSource = function (debug) {
    TileSource.call(this, debug);
};

LocalStorageTileSource.prototype.fetchTileAt = function (xTile, yTile, cb) {
    var self = this;
    var key = xTile + '/' + yTile;

    /* cache lookup */
    if (this.tileCollection.hasOwnProperty(key)) {
        return cb(200, this.tileCollection[key]); //borrowing http codes
    }

    var tile = new Tile(xTile, yTile, self.tileSize);
    this.tileCollection[key] = tile; //cache tile structure

    var imageString = localStorage.getItem(key);
    if (imageString === null) {
        //draw gridlines, coordinates
        if (self.debug) {
            tile.context.lineWidth = "1";
            tile.context.strokeStyle = "#AACCEE";
            tile.context.rect(0, 0, self.tileSize, self.tileSize);
            tile.context.stroke();
            tile.context.fillText("(" + xTile + "," + yTile + ")", 10, 10);
            tile.ready = true;
        }
        cb(200, tile);
    } else {
        var image = new Image;
        image.onload = function () {
            tile.context.drawImage(image, 0, 0);
            tile.ready = true; //can't even remember what this is for
            cb(200, tile);
        };
        image.src = imageString;
    }
};

LocalStorageTileSource.prototype.saveTileAt = function (xTile, yTile, tileCanvas, cb) {
    var key = xTile + '/' + yTile;
    try {
        localStorage.setItem(key, tileCanvas.toDataURL());
        cb(201);
    } catch (Exception) {
        cb(507); //507 Insufficient Storage
    }
};

TileSource.LocalStorageTileSource = LocalStorageTileSource;
TileSource.RestTileSource = RestTileSource;

module.exports = TileSource;
