/*
 udraw

 (c) 2015-2016 Tim Sullivan
 udraw may be freely distributed under the MIT license.
 For all details and documentation: github.com/timatooth/udraw
 */
'use strict';
import $ from 'jquery'
import underscore from 'underscore'
import io from 'socket.io-client'
import FastClick from 'fastclick'

import css from '../sass/style.scss'

import React from 'react'
import ReactDOM from 'react-dom'
import {Toolbar} from './components/Toolbar.jsx'

import { RestTileSource } from './TileSource'

$(document).ready(function () {
    var tileSize = 256;
    /** shows tile boundaries and extra console output */
    var debug = true;
    var lastPing = $.now();
    var canvas = document.getElementById("paper");
    canvas.width = window.innerWidth + tileSize * 2;
    canvas.height = window.innerHeight + tileSize * 2;
    var ctx = canvas.getContext('2d');
    /** Screen ratio is 2 for hdpi/retina displays */
    var ratio = 1;
    var socket = new io('',{reconnection: false});
    /**
     * Store states of other connected clients
     * @type type
     */
    var clientStates = {};
    /**
     * The visible region to draw on screen.
     * @type Extent
     */
    var extent = {
        width: window.innerWidth * ratio,
        height: window.innerHeight * ratio
    };


    var tileSource = RestTileSource({
        debug: debug,
        //url: 'https://localhost:4000/' //default is /
    });

    /**
     * Hold all information about the state of the local client
     * @type Client
     */
    var client = {
        state: {
            tool: 'move',
            color: '#222222',
            size: 4,
            opacity: 1
        },
        x: 0,
        y: 0,
        m1Down: false,
        offsetX: 0,
        offsetY: 0,
        points: [],
        pointCount: 0
    };

    var notify = underscore.debounce(function (title, message, type) {
        console.log(title, message, type)
    }, 500);


    function inIframe() {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    }

    function drawLine(ctx, fromx, fromy, tox, toy, color, size) {
        ctx.beginPath(); //need to enclose in begin/close for colour settings to work
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.lineCap = 'butt';
        ctx.moveTo(fromx, fromy);
        ctx.lineTo(tox, toy);
        ctx.stroke();
        ctx.closePath();
    }

    function drawSketchy(remoteClient, x, y, colorString) {
        var i, dx, dy, d;
        //push past points to client
        var points = remoteClient.points;

        //store the
        points.push([x + client.offsetX, y + client.offsetY]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = colorString;
        ctx.beginPath();
        ctx.moveTo(remoteClient.x, remoteClient.y); //prev
        ctx.lineTo(x, y); //latest
        ctx.stroke();
        var pointCount = remoteClient.pointCount;
        var threshold = 4000;
        //credit to mrdoob's 'harmony' drawing page.
        for (i = 0; i < points.length; i++) {
            dx = points[i][0] - points[pointCount][0];
            dy = points[i][1] - points[pointCount][1];
            d = dx * dx + dy * dy;

            if (d < threshold && Math.random() > (d / threshold)) {
                ctx.beginPath();
                ctx.moveTo(points[pointCount][0] + (dx * 0.3) - client.offsetX, points[pointCount][1] + (dy * 0.3) - client.offsetY);
                ctx.lineTo(points[i][0] - (dx * 0.3) - client.offsetX, points[i][1] - (dy * 0.3) - client.offsetY);
                ctx.stroke();
            }
        }
        remoteClient.pointCount++;
    }

    function hexToRgb(hex) {
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function (ignore, r, g, b) {
            return r + r + g + g + b + b;
        });
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        };
    }

    function drawBrush(ctx, fromx, fromy, tox, toy, color, size) {
        ctx.beginPath(); //need to enclose in begin/close for colour settings to work
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.lineCap = "round";
        //shadow
        ctx.shadowBlur = size * 0; //disabled shadow
        ctx.shadowColor = "black";
        //
        ctx.moveTo(fromx, fromy);
        ctx.lineTo(tox, toy);
        ctx.stroke();
        ctx.closePath();
        ctx.shadowBlur = 0; //set back to 0 othewise all drawings are shadowed?
    }

    function eraseRegion(ctx, x, y, radius) {
        ctx.clearRect(x - radius, y - radius, radius, radius);
    }

    function sprayCan(ctx, x, y, color, size) {
        // Particle count
        var count = size * 4;
        ctx.fillStyle = color;
        for (var i = 0; i < count; i++) {
            var randomAngle = Math.random() * (2 * Math.PI);
            var randomRadius = Math.random() * size;
            var ox = Math.cos(randomAngle) * randomRadius;
            var oy = Math.sin(randomAngle) * randomRadius;
            var xLocation = x + ox;
            var yLocation = y + oy;

            ctx.fillRect(xLocation, yLocation, 1, 1);
        }
    }

    var updateToolState = underscore.debounce(function () {
        var message = {
            tool: client.state.tool,
            color: client.state.color,
            size: client.state.size,
            opacity: client.state.opacity,
            offsetX: client.offsetX,
            offsetY: client.offsetY
        };
        localStorage.setItem("toolsettings", JSON.stringify(client.state));

        socket.emit('status', message);
    }, 200);

    //send out current tool state every 20 seconds
    setInterval(function () {
        updateToolState();
    }, 1000 * 20);

    function drawTile(tile) {
        let destinationX = (tile.x * tileSize) - client.offsetX
        let destinationY = (tile.y * tileSize) - client.offsetY
        ctx.drawImage(tile.canvas, 0, 0, tileSize, tileSize, destinationX, destinationY, tileSize, tileSize)
    }

    function drawTiles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        var x, y, xTile, yTile;
        for (y = client.offsetY; y < client.offsetY + extent.height + tileSize * 2; y += tileSize) {
            for (x = client.offsetX; x < client.offsetX + extent.width + tileSize * 2; x += tileSize) {
                xTile = Math.floor(x / tileSize);
                yTile = Math.floor(y / tileSize);
                tileSource.fetchTileAt(xTile, yTile).then(drawTile)
            }
        }
    }

    function panScreen(dx, dy) {
        client.offsetX += dx;
        client.offsetY += dy;
        requestAnimationFrame(drawTiles);

        if ((window.history && history.pushState)) {
            updateUrl("/" + client.offsetX + "/" + client.offsetY);
        }

        if ($.now() - lastEmit > 60) { //only send pan message every 60ms
            var moveMessage = {
                offsetX: client.offsetX,
                offsetY: client.offsetY
            };

            socket.emit('pan', moveMessage);
            lastEmit = $.now();
        }
    }

    function processDrawAction(remoteClient, x, y) {
        var state = remoteClient.state;
        var c = hexToRgb(state.color);
        var cs = "rgba(" + c.r + "," + c.g + "," + c.b + "," + state.opacity + ")";

        if (state.tool === 'line') {
            //drawLine(ctx, remoteClient.x, remoteClient.y, x, y, cs, state.size);
            var ss = "rgba(" + c.r + "," + c.g + "," + c.b + "," + 0.1 + ")";
            drawSketchy(remoteClient, x, y, ss);
        } else if (state.tool === 'brush') {
            //drawCircle(ctx, x, y, cs, state.size / 2);
            drawBrush(ctx, remoteClient.x, remoteClient.y, x, y, cs, state.size);
        } else if (state.tool === 'eraser') {
            eraseRegion(ctx, x, y, state.size);
        } else if (state.tool === 'spray') {
            sprayCan(ctx, x, y, cs, state.size);
        }
    }

    /**
     * Handle clicks when eyedropper tool is being used.
     * @param {Number} x canvas coordinate of color to fetch
     * @param {type} y canvas coordinate of color to fetch
     * @returns {String} color in hex format with # prefixed
     */
    function updatePixelColor(x, y) {
        var pxData = ctx.getImageData(x, y, 1, 1);
        var colorString = "rgb(" + pxData.data[0] + "," + pxData.data[1] + "," + pxData.data[2] + ")";

        function componentToHex(c) {
            var hex = c.toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        }

        function rgbToHex(r, g, b) {
            return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
        }
        client.state.color = rgbToHex(pxData.data[0], pxData.data[1], pxData.data[2]);
        var opacity = pxData.data[3] / 255;
        client.state.opacity = opacity;
        if (client.state.opacity < 0.01) { //fix when they click completely transparent area
            client.state.opacity = 0.03;
        }

        updateToolState();
        return colorString;
    }

    var updateUrl = underscore.debounce(function (key) {
        //history.replaceState(null, null, key); disabled for now
    }, 500);

    /**
     * Handle Screen panning.
     * Updtes current offset and redraws the screen
     * @param {Object} client
     * @param {Number} x
     * @param {Number} y
     * @returns {undefined}
     */
    function processMoveAction(client, x, y) {
        var dx = client.x - x;
        var dy = client.y - y;
        panScreen(dx, dy);
        client.x = x;
        client.y = y;
    }

    /**
     * Key event bindings
     */
    $(document).on('keydown keypress keyup', function (evt) {
        var s = 40;
        switch (evt.keyCode) {
            //move keys
            case 37:
            case 65:
                panScreen(-s, 0); //left
                break;
            case 39:
            case 68:
                panScreen(s, 0); //right
                break;
            case 38:
            case 87:
                panScreen(0, -s); //up
                break;
            case 40:
            case 83:
                panScreen(0, s); //down
                break;
                //tools
            case 66: //b
                $('.brush-tool').click();
                break;
            case 69:
                $('.eyedropper-tool').click();
                break;
            case 76: //l
                $('.line-tool').click();
                break;
            case 77: //m
                $('.move-tool').click();
                break;
            case 88: //x
                $('.eraser-tool').click();
                break;
            case 187:
                //+
                $('.brush-tools').show();
                $('.size-range').first().val(Number($('.size-range').first().val()) + 1);
                $('.size-range').trigger('change');
                break;
            case 189:
                //-
                $('.brush-tools').show();
                $('.size-range').first().val(Number($('.size-range').first().val()) - 1);
                $('.size-range').trigger('change');
                break;
        }
    });

    var saveTileAt = function (x, y, tileCanvas) {
        var key = x + '/' + y;
        tileSource.saveTileAt(x, y, tileCanvas)
            .then((response) => console.log(key + ' saved.'))
            .catch((error) => {
                switch(error) {
                    case 413:
                        notify("Too Large", "Error 413 is the tile" + x + ", " + y + " too large?", "error");
                        break;
                    case 416:
                        notify("Range Excedded", "Canvas boundary limit. You have gone too far.", "error");
                        break;
                    case 429:
                        notify("Slow Down", "Drawing fast? Server rejected tile save at " + x + ", " + y + " try again shortly.", "error");
                        break;
                    case 404:
                        notify("Error 404", "Server messing up?", "error");
                        break;
                    case 403:
                        notify("Protected Region", "This region is protected. (" + x + ", " + y + ") Move over a bit!", "error");
                        delete tileSource.tileCollection[key];
                        drawTiles();
                        break;
                    case 500:
                        notify("Error 500", "Server isn't feeling well right now.", "error");
                        break;
                    case 507:
                        notify("Error 507", "Out of local storage!");
                        break;
                    default:
                        notify("Hmm", "Unhandled status code " + error + " for tile " + x + ", " + y, "error");
                        console.log(error)
                        break;
                }
            })
    };

    var updateDirtyTiles = underscore.throttle(function () {
        Object.keys(tileSource.tileCollection).forEach(function (tileKey) {
            if (tileSource.tileCollection[tileKey].dirty) {
                var tile = tileSource.tileCollection[tileKey];
                //find it onscreen
                var posx = tile.x * tileSize - client.offsetX;
                var posy = tile.y * tileSize - client.offsetY;
                var ofc = document.createElement("canvas");
                ofc.width = tileSize;
                ofc.height = tileSize;
                var oCtx = ofc.getContext('2d');
                oCtx.drawImage(canvas, posx, posy, tileSize, tileSize, 0, 0, tileSize, tileSize);
                //swap
                tileSource.tileCollection[tileKey].canvas = ofc;
                tileSource.tileCollection[tileKey].dirty = false;
                //post tile to persistance layer
                if (tile.filthy) {
                    saveTileAt(tile.x, tile.y, ofc);
                    tile.filthy = false;
                }
            }
        });
    }, 400);

    /**
     * Called every 5s. Removes tiles from memory which are more than
     * a tile away to prevent stale tiles around. Not ideal.
     * @returns {undefined}
     */
    function clearTileCache() {
        Object.keys(tileSource.tileCollection).forEach(function (tileKey) {
            var tile = tileSource.tileCollection[tileKey];
            var xMin = Math.floor((client.offsetX - tileSize) / tileSize);
            var xMax = Math.floor((client.offsetX + tileSize + extent.width) / tileSize) + 1;
            var yMin = Math.floor((client.offsetY - tileSize) / tileSize);
            var yMax = Math.floor((client.offsetY + tileSize + extent.height) / tileSize) + 1;
            if (tile.x < xMin - 1 || tile.x > xMax || tile.y < yMin - 1 || tile.y > yMax) {
                delete tileSource.tileCollection[tileKey];
            }
        });
    }

    setInterval(function () {
        clearTileCache();
    }, 5000);

    /**
     * Parse the uri for offset location to draw from
     * @returns {Array} x,y coordinates if parsed successfully otherwise null
     */
    function parseUriArgs() {
        var aURL = window.location.href;
        var vars = aURL.slice(aURL.indexOf('/') + 2).split('/');
        if (vars.length === 3) {
            var parsedX = parseInt(vars[1]);
            var parsedY = parseInt(vars[2]);
            var l = 150 * tileSize;
            if (!isNaN(parsedX) && !isNaN(parsedY)) {
                if (parsedX < -l || parsedX > l || parsedY < -l || parsedY > l) {
                    return null;
                }
                return [parsedX, parsedY];
            }
        }
        return null;
    }

    /*--------------------------------------------------------
     * Network socket event handling section.
     */
    function addClient(packet) {
        clientStates[packet.id] = {
            cursor: $('<div class="cursor">').appendTo('#cursors'),
            state: {
                tool: 'line',
                color: '#222222',
                size: 1,
                opacity: 0.8
            },
            x: 0,
            y: 0,
            updated: $.now(),
            offset: {x: 0, y: 0},
            points: [],
            pointCount: 0,
            offsetX: 0,
            offsetY: 0
        };
    }
    socket.on('connect', function () {
        updateToolState();
    });

    socket.on('error', function(err){
        console.log("socket error");
        console.log(err);
    });

    socket.on('ping', function () {
        socket.emit('pong');
    });

    socket.on('pong', function () {
        var latency = $.now() - lastPing;
    });

    socket.on('states', function (data) {
        Object.keys(data).forEach(function (key) {
            clientStates[key] = {};
            clientStates[key].state = data[key];
            clientStates[key].cursor = $('<div class="cursor">').appendTo('#cursors');
            clientStates[key].updated = $.now();
            clientStates[key].x = 0;
            clientStates[key].y = 0;
            clientStates[key].points = [];
            clientStates[key].pointCount = 0;
            clientStates[key].offsetX = 0;
            clientStates[key].offsetY = 0;

        });
    });

    socket.on('move', function (packet) {
        if (!clientStates.hasOwnProperty(packet.id)) {
            addClient(packet);
        } else {
            clientStates[packet.id].updated = $.now();
        }

        var remoteClient = clientStates[packet.id];
        var x = packet.x - client.offsetX;
        var y = packet.y - client.offsetY;
        //is the user in our viewport extent?
        if (packet.x > client.offsetX + tileSize &&
                packet.x < extent.width + client.offsetX + tileSize * 2 &&
                packet.y > client.offsetY &&
                packet.y < extent.height + client.offsetY + tileSize * 2) {
            var screenX = (packet.x - (tileSize) - client.offsetX) / ratio;
            var screenY = (packet.y - (tileSize) - client.offsetY) / ratio;
            //update the cursor
            $(clientStates[packet.id].cursor).show(); //if was hidden
            $(clientStates[packet.id].cursor).css({
                transform: "translate(" + screenX + "px, " + (screenY) + "px)"
            });

            if (packet.d1) { //mouse1 down
                processDrawAction(remoteClient, x, y);

                //dirty the tile
                //set the 'tile' to be recached
                var tileX = Math.floor((x + client.offsetX) / tileSize);
                var tileY = Math.floor((y + client.offsetY) / tileSize);
                var key = tileX + '/' + tileY;
                tileSource.tileCollection[key].dirty = true;
                updateDirtyTiles();
            }

        } else {
            //they are not in viewable region. Place cursor in general direction TODO
            $(clientStates[packet.id].cursor).hide();
        }

        clientStates[packet.id].x = x;
        clientStates[packet.id].y = y;

    });

    socket.on('status', function (packet) {
        if (!clientStates.hasOwnProperty(packet.id)) {
            addClient(packet);
        }
        clientStates[packet.id].state = packet;
        clientStates[packet.id].updated = $.now();
    });

    socket.on('pan', function (packet) {
        if (!clientStates.hasOwnProperty(packet.id)) {
            addClient(packet);
        }
        clientStates[packet.id].offsetX = packet.offsetX;
        clientStates[packet.id].offsetY = packet.offsetY;
        clientStates[packet.id].updated = $.now();
    });

    // Remove inactive clients after 30 seconds of inactivity
    setInterval(function () {
        Object.keys(clientStates).forEach(function (key) {
            if ($.now() - clientStates[key].updated > 1000 * 30) {
                clientStates[key].cursor.remove(); //remove cursor
                delete clientStates[key]; //remove states
            }
        });
    }, 1000);

    /**
     * Resizes the canvas when the window is resized. Debounced to only
     * call every 500ms.
     * @type {function}
     */
    var resizeLayout = underscore.debounce(function () {
        //hdpi support
        var devicePixelRatio = window.devicePixelRatio || 1;
        var backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
                ctx.mozBackingStorePixelRatio ||
                ctx.msBackingStorePixelRatio ||
                ctx.oBackingStorePixelRatio ||
                ctx.backingStorePixelRatio || 1;


        ratio = devicePixelRatio / backingStoreRatio;

        canvas.width = window.innerWidth + tileSize * 2;
        canvas.height = window.innerHeight + tileSize * 2;

        extent = {
            width: window.innerWidth * ratio,
            height: window.innerHeight * ratio
        };

        if (devicePixelRatio !== backingStoreRatio) {
            var oldWidth = canvas.width;
            var oldHeight = canvas.height;
            canvas.width = oldWidth * ratio;
            canvas.height = oldHeight * ratio;
            canvas.style.width = oldWidth + 'px';
            canvas.style.height = oldHeight + 'px';
        }

        drawTiles();
    }, 500); // Maximum run of once per 500 milliseconds
    if (!inIframe()) { //disable resizing inside iframe. Buggy on iphone
        window.addEventListener("resize", resizeLayout, false);
    }

    /* History URI API */
    window.onpopstate = function () {
        var givenOffsets = parseUriArgs();

        if (givenOffsets !== null) {
            client.offsetX = givenOffsets[0];
            client.offsetY = givenOffsets[1];
        }
        drawTiles();
    };

    /********************************************************
     * CANVAS jQuery events
     */

    /**
     * Callback for when mouse movement or touches begin.
     * @param {jQuery} evt Incoming event
     */
    $(canvas).on('mousedown touchstart', function (evt) {
        if (evt.type === "touchstart") {
            evt.preventDefault();
            client.x = evt.originalEvent.touches[0].clientX * ratio + tileSize; //caveat adding tilesize?
            client.y = evt.originalEvent.touches[0].clientY * ratio + tileSize;
            client.m1Down = true;
            //send a move setting drawing to true to say where they draw from
            var message = {
                x: ((client.x / ratio) * ratio) + client.offsetX,
                y: ((client.y / ratio) * ratio) + client.offsetY,
                d1: false //they aren't really drawing yet...
            };
            socket.emit('move', message);
        } else {
            if (evt.which === 2) {
                evt.preventDefault(); // remove up/down cursor.
                client.m3Down = true;
            } else {
                client.m1Down = true;
            }
            client.x = evt.offsetX * ratio;
            client.y = evt.offsetY * ratio;
        }

        //admin protection
        if (client.m1Down && client.state.tool === 'wand') {
            var tileX = Math.floor((client.x + client.offsetX) / tileSize);
            var tileY = Math.floor((client.y + client.offsetY) / tileSize);
            //protectTileAt(tileX, tileY); redo
        } else if (client.m1Down && client.state.tool === 'eyedropper') {
            updatePixelColor(client.x, client.y);
        }

    });

    /**
     * Mouse movement ends or touch end.
     * calls updateDirtyTiles which checks for updated regions to save into
     * off-screen tiles.
     * @param {jQuery} evt Incoming event
     */
    $(canvas).on('mouseup mouseleave touchend touchcancel', function (evt) {
        if (evt.type === "touchend" || evt.type === "touchcancel") {
            evt.preventDefault();
            client.m1Down = false;
            updateDirtyTiles();
            //send a move setting drawing to false
            var moveMessage = {
                x: ((client.x / ratio) * ratio) + client.offsetX,
                y: ((client.y / ratio) * ratio) + client.offsetY,
                d1: client.m1Down
            };
            socket.emit('move', moveMessage);
        } else {
            if (evt.which === 2) {
                client.m3Down = false;
            } else {
                client.m1Down = false;
                updateDirtyTiles();
            }
            client.x = evt.offsetX;
            client.y = evt.offsetY;
        }

    });

    /** Stores time for when last mouse movement packet was sent **/
    var lastEmit = $.now();

    /**
     * When the mouse moves process draw actions or movement.
     * This could do with a re-write, Cyclomatic complexity < 15
     * @param {jQuery} evt Incoming event
     */
    $(canvas).on('mousemove touchmove', function (evt) {
        var moveMessage;
        var x, y;
        var touchPanning = false; //flag for mobile devices panning
        if (evt.type === "touchmove") {
            evt.preventDefault();
            x = evt.originalEvent.touches[0].clientX * ratio + tileSize;
            y = evt.originalEvent.touches[0].clientY * ratio + tileSize;
            //ios sets the number of touches 2 for panning
            if (evt.originalEvent.touches.length > 1) {
                touchPanning = true;
            }
        } else {
            x = evt.offsetX * ratio;
            y = evt.offsetY * ratio;
        }

        //far out. that logic...
        if (client.m1Down && client.state.tool !== 'move' && client.state.tool !== 'wand' && client.state.tool !== 'eyedropper' && !touchPanning) {
            processDrawAction(client, x, y);
            var shadow = 0;
            if (client.state.tool === 'brush') {
                shadow = client.state.size * 0.8;
            }
            // we need to factor in the size of the brush which might overlap more than one tile
            var i, tileX, tileY, key;
            for (i = -(client.state.size / 2) - shadow; i < (client.state.size / 2) + shadow; i += 1) {
                //set the 'tile' to be recached
                tileX = Math.floor((x + client.offsetX + i) / tileSize);
                tileY = Math.floor((y + client.offsetY + i) / tileSize);
                key = tileX + '/' + tileY;

                tileSource.tileCollection[key].dirty = true; //indicate an ofscreen tile needs to be re-fetched from the master canvas
                tileSource.tileCollection[key].filthy = true; //indicate that this tile needs saving
            }
            //update 'last' position values for next draw call
            client.x = x;
            client.y = y;

            if ($.now() - lastEmit > 30) {
                moveMessage = {
                    x: ((x / ratio) * ratio) + client.offsetX,
                    y: ((y / ratio) * ratio) + client.offsetY,
                    d1: client.m1Down
                };
                socket.emit('move', moveMessage);
                lastEmit = $.now();
            }
        } else if (client.m3Down || (client.m1Down && client.state.tool === 'move') || touchPanning) {
            processMoveAction(client, x, y);
        } else if (client.m1Down && client.state.tool === 'eyedropper') {
            updatePixelColor(x, y);
        } else {
            //just a regular mouse move? this needs refactoring
            if ($.now() - lastEmit > 60) {
                moveMessage = {
                    x: evt.offsetX + client.offsetX,
                    y: evt.offsetY + client.offsetY,
                    d1: client.m1Down
                };
                socket.emit('move', moveMessage);
                lastEmit = $.now();
            }
        }

    });

    $(canvas).on('wheel mousewheel', function (evt) {
        //chrome, FF use wheel, safari uses mousewheel
        evt.preventDefault(); //stop browser going back/forward.
        panScreen(Math.floor(evt.originalEvent.deltaX), Math.floor(evt.originalEvent.deltaY));
    });

    /**
     * Main entry point to load up.
     * @returns {undefined}
     */
    function initTheBusiness() {
        var givenOffsets = parseUriArgs();

        if (givenOffsets !== null) {
            client.offsetX = givenOffsets[0];
            client.offsetY = givenOffsets[1];
        }
        resizeLayout(); //calls drawTiles()


        $("#paper").focus(); // key events in canvas

        //mobile fast touching
        FastClick.attach(document.body);

        ReactDOM.render(<Toolbar legacyClient={client} />, document.getElementById('udrawapp'));
    }

    initTheBusiness();
});
