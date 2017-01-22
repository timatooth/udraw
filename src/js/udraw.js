/*
 udraw

 (c) 2015-2017 Tim Sullivan
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
import { UdrawApp} from './UdrawApp.jsx'
import EventHub from './EventHub.js'

import RestTileSource from './RestTileSource'
import {createStore } from 'redux'
import { udrawAppReducer } from './reducers/udrawapp'

const EMIT_DELAY = 10;


const tileSize = 256;
/** shows tile boundaries and extra console output */
const debug = false;
let lastPing = $.now();
/**
 * Store states of other connected clients
 * @type type
 */
let clientStates = {};
/**
 * The visible region to draw on screen.
 * @type Extent
 */
let extent = {
    width: window.innerWidth * ratio,
    height: window.innerHeight * ratio
};


/**
* This guy is a dirty escape hatch to pass events into the new React UI
* environment so it can re-render as changes happen.
*
* This should only be here to assist the migration to a full React/Redux
* design. *touch wood*
*/
let badEventHub = new EventHub();


let tileSource = new RestTileSource({
    debug: debug,
    //url: 'https://udraw.me' //default is /
});

/**
 * Hold all information about the state of the local client
 * @type Client
 */
let client = {
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

let store = createStore( udrawAppReducer );

ReactDOM.render(
    <UdrawApp store={store} legacyClient={client} clientStates={clientStates} badEventHub={badEventHub} />,
    document.getElementById('udrawapp')
);

let canvas = document.getElementById("paper");
canvas.width = window.innerWidth + tileSize * 2;
canvas.height = window.innerHeight + tileSize * 2;
let ctx = canvas.getContext('2d');
/** Screen ratio is 2 for hdpi/retina displays */
let ratio = 1;
let socket = new io('', {reconnection: true});

let notify = underscore.debounce(function (title, message, type) {
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
    let i, dx, dy, d;
    //push past points to client
    let points = remoteClient.points;

    //store the
    points.push([x + client.offsetX, y + client.offsetY]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = colorString;
    ctx.beginPath();
    ctx.moveTo(remoteClient.x, remoteClient.y); //prev
    ctx.lineTo(x, y); //latest
    ctx.stroke();
    let pointCount = remoteClient.pointCount;
    let threshold = 4000;
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
    let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function (ignore, r, g, b) {
        return r + r + g + g + b + b;
    });
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
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
    let count = size * 4;
    ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
        let randomAngle = Math.random() * (2 * Math.PI);
        let randomRadius = Math.random() * size;
        let ox = Math.cos(randomAngle) * randomRadius;
        let oy = Math.sin(randomAngle) * randomRadius;
        let xLocation = x + ox;
        let yLocation = y + oy;

        ctx.fillRect(xLocation, yLocation, 1, 1);
    }
}

let updateToolState = underscore.debounce(function () {

    let message = {
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

//send out current tool state every 2 seconds
setInterval(function () {
    updateToolState();
}, 1000 * 2);

function drawTile(e, tile) {
    let destinationX = (tile.x * tileSize) - client.offsetX
    let destinationY = (tile.y * tileSize) - client.offsetY
    ctx.drawImage(tile.canvas, 0, 0, tileSize, tileSize, destinationX, destinationY, tileSize, tileSize)
}

function drawTiles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let x, y, xTile, yTile;
    for (y = client.offsetY; y < client.offsetY + extent.height + tileSize * 2; y += tileSize) {
        for (x = client.offsetX; x < client.offsetX + extent.width + tileSize * 2; x += tileSize) {
            xTile = Math.floor(x / tileSize);
            yTile = Math.floor(y / tileSize);
            tileSource.fetchTileAt(xTile, yTile, drawTile)
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

    if ($.now() - lastEmit > EMIT_DELAY) { //only send pan message every 60ms
        let panMessage = {
            offsetX: client.offsetX * ratio,
            offsetY: client.offsetY * ratio
        };

        socket.emit('pan', panMessage);
        lastEmit = $.now();
    }
}

function processDrawAction(remoteClient, x, y) {
    let state = remoteClient.state;
    let c = hexToRgb(state.color);
    let cs = "rgba(" + c.r + "," + c.g + "," + c.b + "," + state.opacity + ")";

    if (state.tool === 'pencil') {
        let ss = "rgba(" + c.r + "," + c.g + "," + c.b + "," + 0.1 + ")";
        drawSketchy(remoteClient, x, y, ss);
    } else if (state.tool === 'line'){
        drawLine(ctx, remoteClient.x, remoteClient.y, x, y, cs, state.size);
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
    let pxData = ctx.getImageData(x, y, 1, 1);
    let colorString = "rgb(" + pxData.data[0] + "," + pxData.data[1] + "," + pxData.data[2] + ")";

    function componentToHex(c) {
        let hex = c.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }

    function rgbToHex(r, g, b) {
        return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    }
    client.state.color = rgbToHex(pxData.data[0], pxData.data[1], pxData.data[2]);
    let opacity = pxData.data[3] / 255;
    client.state.opacity = opacity;
    if (client.state.opacity < 0.01) { //fix when they click completely transparent area
        client.state.opacity = 0.03;
    }

    updateToolState();
    return colorString;
}

let updateUrl = underscore.debounce(function (key) {
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
    let dx = client.x - x;
    let dy = client.y - y;
    panScreen(dx, dy);
    client.x = x;
    client.y = y;
}

/**
 * Key event bindings
 */
$(document).on('keydown keypress keyup', function (evt) {
    let s = 40;
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

let saveTileAt = function (x, y, tileCanvas) {
    let key = x + '/' + y;

    let onSaveResponse = function(code){
        switch(code) {
            case 201:
                break; //successfully saved.
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
                notify("Hmm", "Unhandled status code " + code + " for tile " + x + ", " + y, "error");
                break;
        }
    };

    tileSource.saveTileAt(x, y, tileCanvas, onSaveResponse);
};

let updateDirtyTiles = underscore.throttle(function () {
    Object.keys(tileSource.tileCollection).forEach(function (tileKey) {
        if (tileSource.tileCollection[tileKey].dirty) {
            let tile = tileSource.tileCollection[tileKey];
            //find it onscreen
            let posx = tile.x * tileSize - client.offsetX;
            let posy = tile.y * tileSize - client.offsetY;
            let ofc = document.createElement("canvas");
            ofc.width = tileSize;
            ofc.height = tileSize;
            let oCtx = ofc.getContext('2d');
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
        let tile = tileSource.tileCollection[tileKey];
        let xMin = Math.floor((client.offsetX - tileSize) / tileSize);
        let xMax = Math.floor((client.offsetX + tileSize + extent.width) / tileSize) + 1;
        let yMin = Math.floor((client.offsetY - tileSize) / tileSize);
        let yMax = Math.floor((client.offsetY + tileSize + extent.height) / tileSize) + 1;
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
    let aURL = window.location.href;
    let vars = aURL.slice(aURL.indexOf('/') + 2).split('/');
    if (vars.length === 3) {
        let parsedX = parseInt(vars[1]);
        let parsedY = parseInt(vars[2]);
        let l = 150 * tileSize;
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
        //cursor: $('<div class="cursor">').appendTo('#cursors'),
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
    let latency = $.now() - lastPing;
});

socket.on('states', function (data) {
    Object.keys(data).forEach(function (key) {
        clientStates[key] = {};
        clientStates[key].state = data[key];
        //clientStates[key].cursor = $('<div class="cursor">').appendTo('#cursors');
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

    let remoteClient = clientStates[packet.id];
    let x = packet.x - client.offsetX;
    let y = packet.y - client.offsetY;
    //is the user in our viewport extent?
    if (packet.x > client.offsetX + tileSize &&
            packet.x < extent.width + client.offsetX + tileSize * 2 &&
            packet.y > client.offsetY &&
            packet.y < extent.height + client.offsetY + tileSize * 2) {
        let screenX = (packet.x - (tileSize) - client.offsetX) / ratio;
        let screenY = (packet.y - (tileSize) - client.offsetY) / ratio;
        //update the cursor
        //$(clientStates[packet.id].cursor).show(); //if was hidden
        // $(clientStates[packet.id].cursor).css({
        //     transform: "translate(" + (screenX ) + "px, " + (screenY) + "px)"
        // });

        if (packet.d1) { //mouse1 down
            processDrawAction(remoteClient, x, y);

            //dirty the tile
            //set the 'tile' to be recached
            let tileX = Math.floor((x + client.offsetX) / tileSize);
            let tileY = Math.floor((y + client.offsetY) / tileSize);
            let key = tileX + '/' + tileY;
            tileSource.tileCollection[key].dirty = true;
            updateDirtyTiles();
        }

    }

    clientStates[packet.id].x = x;
    clientStates[packet.id].y = y;
    badEventHub.trigger('clientStates:move', clientStates, client.offsetX, client.offsetY);
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
            //clientStates[key].cursor.remove(); //remove cursor
            delete clientStates[key]; //remove states
        }
    });
}, 1000);

/**
 * Resizes the canvas when the window is resized. Debounced to only
 * call every 500ms.
 * @type {function}
 */
let resizeLayout = underscore.debounce(function () {
    //hdpi support
    let devicePixelRatio = window.devicePixelRatio || 1;
    let backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
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
        let oldWidth = canvas.width;
        let oldHeight = canvas.height;
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
    let givenOffsets = parseUriArgs();

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
        let message = {
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
        let tileX = Math.floor((client.x + client.offsetX) / tileSize);
        let tileY = Math.floor((client.y + client.offsetY) / tileSize);
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
        let moveMessage = {
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
let lastEmit = $.now();

/**
 * When the mouse moves process draw actions or movement.
 * This could do with a re-write, Cyclomatic complexity < 15
 * @param {jQuery} evt Incoming event
 */
$(canvas).on('mousemove touchmove', function (evt) {
    let moveMessage;
    let x, y;
    let touchPanning = false; //flag for mobile devices panning
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
        let shadow = 0;
        if (client.state.tool === 'brush') {
            shadow = client.state.size * 0.8;
        }
        // we need to factor in the size of the brush which might overlap more than one tile
        let i, tileX, tileY, key;
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
                x: ((x / ratio) * ratio) + client.offsetX,
                y: ((y / ratio) * ratio) + client.offsetY,
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
    let givenOffsets = parseUriArgs();

    if (givenOffsets !== null) {
        client.offsetX = givenOffsets[0];
        client.offsetY = givenOffsets[1];
    }
    resizeLayout(); //calls drawTiles()


    $("#paper").focus(); // key events in canvas

    //mobile fast touching
    FastClick.attach(document.body);
}

initTheBusiness();
