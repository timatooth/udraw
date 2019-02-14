'use strict';
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');

const path = require('path');

const S3Adapter = require('./s3adapter');

/** Boundary limit for fetching tiles */
const tileRadius = 300;

//location of static web files
const staticDir = path.join(__dirname, '../public')

const canvasApiApp = () => {

    let adapter = S3Adapter(process.env.UDRAW_S3_BUCKET);

    let app = express();

    app.set('trust proxy', 'loopback');
    app.set('x-powered-by', false);


    //Express Middleware
    app.use('/', express.static(staticDir));
    app.use(morgan('combined'));
    app.use(bodyParser.raw({type: 'image/png', limit: '250kb'}));
    app.use(bodyParser.json({type: 'application/json', limit: '250kb'}));
    app.use(cors());

    app.get('/',(req, res) => { //todo remove cloudfrount ae?
        res.sendFile(path.join(staticDir, 'index.html'));
    });

    app.options('/canvases/:name/:zoom/:x/:y', cors()) // enable pre-flight request

    app.put('/canvases/:name/:zoom/:x/:y', (req, res) => {
        let p = req.params;
        if (p.name !== "main") {
            return res.sendStatus(404);
        } else if (Number(p.zoom) !== 1) {
            return res.sendStatus(404);
        } else if ( Number(p.x) < -(tileRadius / 2) ||
                    Number(p.x) > tileRadius / 2 ||
                    Number(p.y) < -(tileRadius / 2) ||
                    Number(p.y) > tileRadius / 2)
        {
            return res.sendStatus(416); //requested outside range
        }

        const key = "tile:" + req.params.name + ':' + req.params.zoom + ':' + req.params.x + ':' + req.params.y;

        adapter.saveTileAt(req.params.name, req.params.zoom, req.params.x, req.params.y, req.body, (result) => {
            if (!result) {
                console.log("Saving " + key +" to S3 FAILED")
            } else {
                console.log("Saved tile", key)
                res.sendStatus(201);
            }
        });
    });

    app.get('/canvases/:name/:zoom/:x/:y', (req, res) => {
        let p = req.params;
        if (p.name !== "main") {
            return res.sendStatus(404);
        } else if (Number(p.zoom) !== 1) {
            return res.sendStatus(404);
        } else if (Number(p.x) < -(tileRadius / 2) ||
        Number(p.x) > tileRadius / 2 ||
        Number(p.y) < -(tileRadius / 2) ||
        Number(p.y) > tileRadius / 2) {
            return res.sendStatus(416); //requested outside range
        }

        const key = req.params.name + ':' + req.params.zoom + ':' + req.params.x + ':' + req.params.y;
        console.log(key);
        adapter.getTileAt(req.params.name, req.params.zoom, req.params.x, req.params.y, (data) => {
            // if we have data, an existing tile was found, send the payload & cache it in redis? lol
            if (data !== null) {
                res.set('Content-Type', 'image/png');
                res.send(data);
            } else {
                console.log(res);
                res.sendStatus(204); //make them create the tile (client side)
            }
        });
    });

    return app;
}

module.exports = canvasApiApp;
