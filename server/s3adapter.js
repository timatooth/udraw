const AWS = require('aws-sdk');
const s3 = new AWS.S3({apiVersion: '2006-03-01'});

const S3Adapter = (bucketName) => {
    // Optimise S3 object key for better performance. (TODO)
    const pathToKey = function (canvasName, zoom, x, y){
        return canvasName + "/" + zoom + "/" + x + "/" + y + ".png"
    }

    return {
        getTileAt: (canvasName, zoom, x, y, cb) => {
            console.log("Getting object from S3 at", pathToKey(canvasName, zoom, x, y))
            s3.getObject({
                Bucket: bucketName,
                Key: pathToKey(canvasName, zoom, x, y)
            }, (err, data) => {
                if (err) {
                    console.log("error", pathToKey(canvasName, zoom, x, y))
                    console.log(err, err.stack);
                    cb(null)
                } else {
                    console.log("got", pathToKey(canvasName, zoom, x, y))
                    console.log(data)
                    console.log("length", data.Body.length)
                    cb(data.Body)
                }
            })
        },
        saveTileAt: (canvasName, zoom, x, y, data, cb) => {
            s3.putObject({
                Bucket: bucketName,
                Key: pathToKey(canvasName, zoom, x, y),
                Body: data
            }, (err, data) => {
                if (err){
                    console.log(err, err.stack);
                    cb(false) // failure
                } else {
                    cb(true) // success
                }
            })
        }
    }
}

module.exports = S3Adapter
