'use strict'

function Tile (x, y, tileSize) {
    this.dirty = false
    this.x = x
    this.y = y
    this.ready = false
    let tileCanvas = document.createElement("canvas")
    tileCanvas.width = tileSize
    tileCanvas.height = tileSize
    this.canvas = tileCanvas
    this.context = tileCanvas.getContext('2d')
}

const b64toBlob = (b64Data, contentType, sliceSize) => {
    contentType = contentType || ''
    sliceSize = sliceSize || 512
    let byteCharacters = atob(b64Data)
    let byteArrays = [], offset, slice, byteNumbers, i, byteArray
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        slice = byteCharacters.slice(offset, offset + sliceSize)
        byteNumbers = [slice.length] //new array
        for (let i = 0; i < slice.length; i += 1) {
            byteNumbers[i] = slice.charCodeAt(i)
        }
        byteArray = new Uint8Array(byteNumbers)
        byteArrays.push(byteArray)
    }

    let blob = new Blob(byteArrays, {type: contentType})
    return blob
}

export default function RestTileSource (options) {
    this.tileCollection = {}
    this.tileSize = 256
    this.debug = options.debug || false
    this.restEndpoint = options.url || ''
}

RestTileSource.prototype.fetchTileAt = function (zoom, tileX, tileY, cb) {
    let self = this
    let key = zoom  + '/' + tileX + '/' + tileY;
    /* cache lookup */
    if (this.tileCollection.hasOwnProperty(key)) {
        return cb(200, this.tileCollection[key]) //borrowing http codes
    }

    let endpoint = this.restEndpoint + '/canvases/main/' + key

    let getRequest = new XMLHttpRequest()
    getRequest.responseType = "blob"
    getRequest.open("GET", endpoint, true)

    let tile = new Tile(tileX, tileY, self.tileSize)
    this.tileCollection[key] = tile //cache tile structure

    let tCtx = tile.context
    getRequest.onload = function (evt) {
        if (evt.target.status === 200) {
            let imgData = evt.target.response
            let img = new Image()
            img.onload = function () {
                tCtx.drawImage(img, 0, 0) //this needs to be eliminated
                tile.ready = true
                cb(200, tile)
            }
            img.src = window.URL.createObjectURL(imgData) //file api experimental
        } else if (evt.target.status === 204) {
            if (self.debug) {
                tCtx.lineWidth = "1"
                tCtx.strokeStyle = "#AACCEE"
                tCtx.rect(0, 0, self.tileSize, self.tileSize)
                tCtx.stroke()
                tCtx.fillText("(" + tileX + "," + tileY + ")", 10, 10)
                tile.ready = true
                cb(200, tile) //appear like a normal tile with grid drawn
            }
        } else if (evt.target.status === 416) {
            tCtx.fillStyle = "#0F0"
            tCtx.fillRect(0, 0, self.tileSize, self.tileSize)
            cb(416, tile)
        }
    }

    if (!tile.ready) {
        getRequest.send()
    }
}

RestTileSource.prototype.saveTileAt = function (zoom, xTile, yTile, tileCanvas, cb) {
    let key = zoom + '/' + xTile + '/' + yTile
    let tileString = tileCanvas.toDataURL()
    let endpoint = this.restEndpoint + '/canvases/main/' + key

    let blob = b64toBlob(tileString.substr(22), 'image/png')
    let putRequest = new XMLHttpRequest()
    putRequest.onload = function (res) {
        let xhr = res.target
        cb(xhr.status)
    }
    putRequest.open("PUT", endpoint, true)
    // Microsoft Edge needs to explicityly set request Content-Type otherwise it sends text/plain
    putRequest.setRequestHeader('Content-Type', 'image/png')
    putRequest.responseType = 'blob'
    putRequest.send(blob)
}
