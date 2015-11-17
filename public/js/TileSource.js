/**
 * Tile Object
 * @param {HTML5CanvasElement} tileCanvas holds canvas dom element
 * @param {type} x Tile coordinate
 * @param {type} y Tile coordinate
 * @returns {Tile}
 */
var Tile = function (tileCanvas, x, y) {
    this.canvas = tileCanvas;
    this.dirty = false;
    this.x = x;
    this.y = y;
    this.ready = false;
};

var TileSource = function (debug) {
    /**
     * Stores tiles in memory structure where keys are the tile coordinates seperated by '/'
     */
    this.tileCollection = {};
    this.tileSize = 256;
    if (debug !== undefined && debug) {
        this.debug = true;
    } else {
        this.debug = false;
    }
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
 * @param {type} b64Data
 * @param {type} contentType
 * @param {type} sliceSize
 * @returns {Blob|nm$_.exports|nm$_.module.exports}
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

    var blob = new Blob(byteArrays, {type: contentType});
    return blob;
};


/**
 * RESTful Tile Source.
 * @param {String} endpointUrl url where the rest lives without trailing slash
 * @param {type} debug draw gridline coordinates on tiles
 * @returns {RestTileSource}
 */
var RestTileSource = function (endpointUrl, debug) {
    TileSource.call(this, debug);
    if (endpointUrl === undefined) {
        this.restEndpoint = '';
    } else {
        this.restEndpoint = endpointUrl;
    }
};

RestTileSource.prototype.fetchTileAt = function (tileX, tileY, cb) {
    var key = tileX + '/' + tileY;

    /* cache lookup */
    if (this.tileCollection.hasOwnProperty(key)) {
        return cb(200, this.tileCollection[key]); //borrowing http codes
    }

    var endpoint = this.restEndpoint + '/canvases/main/1/' + key;
    var tileCanvas = document.createElement("canvas");
    tileCanvas.width = this.tileSize;
    tileCanvas.height = this.tileSize;
    var tCtx = tileCanvas.getContext('2d');

    var getRequest = new XMLHttpRequest();
    getRequest.responseType = "blob";
    getRequest.open("GET", endpoint, true);

    var tile = new Tile(tileCanvas, tileX, tileY);
    this.tileCollection[key] = tile; //cache tile structure
    var self = this;
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
                tCtx.rect(0, 0, 256, 256);
                tCtx.stroke();
                tCtx.fillText("(" + tileX + "," + tileY + ")", 10, 10);
                tile.ready = true;
                cb(200, tile); //appear like a normal tile with grid drawn
            }
        } else if (evt.target.status === 416) {
            tCtx.fillStyle = "#0F0";
            tCtx.fillRect(0, 0, 256, 256);
            cb(416, tile);
        }
    };

    if (!tile.ready) {
        getRequest.send();
    }
};


/**
 * Save tile out over HTTP REST api.
 * @param {Number} x Tile coordinate
 * @param {Number} y Tile coordinate
 * @param {HTMLCanvasElement} tileCanvas Tile image to save
 * @param {Function) cb takes 1 parameter with the response code.
 * @returns {undefined}
 */
RestTileSource.prototype.saveTileAt = function (xTile, yTile, tileCanvas, cb) {
    var key = xTile + '/' + yTile;
    var tileString = tileCanvas.toDataURL();
    var endpoint = this.restEndpoint + '/canvases/main/1/' + key;
    //post tile at coordinate:
    var blob = b64toBlob(tileString.substr(22), 'image/png');
    var putRequest = new XMLHttpRequest();
    putRequest.onload = function (res) {
        var xhr = res.target;
        cb(xhr.status);
    };
    putRequest.open("PUT", endpoint, true);
    putRequest.send(blob);
};