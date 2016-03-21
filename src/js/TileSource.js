'use strict'

export const Tile = (x, y, tileSize = 256) => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = tileSize
    const ctx = canvas.getContext('2d')

    let pub = {
        tileSize,
        dirty: false,
        ready: true,
        x,
        y,
        canvas
    }

    pub.applyBlob = (blob) => {
        return new Promise((resolve, reject) => {
            let img = new Image()
            img.onload = () => {
                if(img.width === img.height === 0){
                    reject(Error('Image Blob apply failed. Corrupt tile?'))
                } else {
                    ctx.drawImage(img, 0, 0)
                    pub.ready = true
                    resolve(pub)
                }
            };
            img.src = window.URL.createObjectURL(blob)
        })
    }

    return pub;
}

export const RestTileSource = (options) => {
    let url = options.url || '/'
    let tileCollection = {}
    let debug = options.debug || false

    return {
        fetchTileAt: (x, y) => {
            return new Promise((resolve, reject) => {
                let key = x + '/' + y
                if (tileCollection.hasOwnProperty(key)) {
                    if(tileCollection[key].ready){
                        resolve(tileCollection[key])
                    }
                } else {
                    let tile = tileCollection[key] = Tile(x, y)
                    tile.ready = false

                    fetch(url + 'canvases/main/1/' + key)
                        .then((response) => {
                            if(response.status === 200) {
                                response.blob()
                                    .then((blob) => {
                                        tile.applyBlob(blob).then(() => {
                                            resolve(tile)
                                        })
                                    })
                            } else if (response.status === 204) {
                                if (debug) {
                                    let tCtx = tile.canvas.getContext('2d')
                                    tCtx.lineWidth = "1"
                                    tCtx.strokeStyle = "#AACCEE"
                                    tCtx.rect(0, 0, tile.tileSize, tile.tileSize)
                                    tCtx.stroke()
                                    tCtx.fillText("(" + x + "," + y + ")", 10, 10)
                                    tile.ready = true;
                                }
                                resolve(tile)
                            } else {
                                let error = Error(response.statusText)
                                error.response = response
                                reject(error)
                            }
                        })
                        .catch((error) => {
                            reject(error)
                        })
                }
            })
        },
        saveTileAt: (x, y, tile) => {
            let key = x + '/' + y;
            let tileString = tile.toDataURL();
            let endpoint = url + 'canvases/main/1/' + key;

            return new Promise((resolve, reject) => {
                let blob = b64toBlob(tileString.substr(22), 'image/png');

                fetch(endpoint, {
                    method: 'PUT',
                    body: blob
                }).then((response) => {
                    if(response.ok){
                        resolve(response)
                    } else {
                        reject(response)
                    }
                })
            })
        },
        tileCollection //exposing what should be private for legacy reasons
    }
};

/**
 * Helper for creating Blob objects from base64.
 * @param {String} b64Data
 * @param {String} contentType
 * @param {Number} sliceSize
 * @returns {Blob}
 */
const b64toBlob = (b64Data, contentType = '', sliceSize = 512) => {
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

export const LocalStorageTileSource = (options) => {
    let debug = options.debug || false
    let tileCollection = {}

    return {
        fetchTileAt: (x, y, cb) => {
            return new Promise((resolve, reject) => {
                /* cache lookup */
                if (tileCollection.hasOwnProperty(key)) {
                    resolve(tileCollection[key])
                } else {
                    let tile = tileCollection[key] = Tile(x, y);
                    let imageString = localStorage.getItem(key);

                    if (imageString) {
                        let img = new Image()

                        img.onload = () => {
                            let ctx = tile.canvas.getContext('2d')
                            ctx.drawImage(img, 0, 0)
                            resolve(tile)
                        }
                    } else {
                        let newTile = Tile(x, y)
                        if (debug) {
                            let ctx = tile.canvas.getContext('2d')
                            ctx.lineWidth = "1";
                            ctx.strokeStyle = "#AACCEE";
                            ctx.rect(0, 0, tile.tileSize, tile.tileSize);
                            ctx.stroke();
                            ctx.fillText("(" + xTile + "," + yTile + ")", 10, 10);
                        }
                        resolve(newTile)
                    }

                }
            })
        },
        saveTileAt: (x, y, tile) => {
            var key = xTile + '/' + yTile;
            return new Promise((resolve, reject) => {
                try {
                    localStorage.setItem(key, tileCanvas.toDataURL());
                    resolve()
                } catch (Exception) {
                    reject(Error('localStorage threw exception'))
                }
            })
        },
        tileCollection //exposing privates
    }
}

