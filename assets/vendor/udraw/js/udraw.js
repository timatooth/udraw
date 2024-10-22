'use strict';
import React from 'react'
import ReactDOM from 'react-dom'
import { UdrawApp } from './UdrawApp.jsx'
import RestTileSource from './RestTileSource'
import { drawLine, drawSketchy, drawBrush, eraseRegion, sprayCan } from './drawing'

const tileSize = 256;
const DEBUG_MODE = false;

let ratio = 1;
let extent = {
    width: window.innerWidth * ratio,
    height: window.innerHeight * ratio
};

const Client = () => ({
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
});

const tileSource = new RestTileSource({
    debug: DEBUG_MODE,
    url: `${window.location.href}api`
});

const client = Client();

ReactDOM.render(
    <UdrawApp legacyClient={client} />,
    document.getElementById('udrawapp')
);

const canvas = document.getElementById("paper");
canvas.width = window.innerWidth + tileSize * 2;
canvas.height = window.innerHeight + tileSize * 2;
const ctx = canvas.getContext('2d');

const notify = (title, message, type) => {
    console.log(title, message, type);
};

const inIframe = () => {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
};

const hexToRgb = (hex) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};

const drawTile = (e, tile) => {
    const destinationX = (tile.x * tileSize) - client.offsetX;
    const destinationY = (tile.y * tileSize) - client.offsetY;
    ctx.drawImage(tile.canvas, 0, 0, tileSize, tileSize, destinationX, destinationY, tileSize, tileSize);
};

const drawTiles = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = client.offsetY; y < client.offsetY + extent.height + tileSize * 2; y += tileSize) {
        for (let x = client.offsetX; x < client.offsetX + extent.width + tileSize * 2; x += tileSize) {
            const xTile = Math.floor(x / tileSize);
            const yTile = Math.floor(y / tileSize);
            tileSource.fetchTileAt(xTile, yTile, drawTile);
        }
    }
};

const panScreen = (dx, dy) => {
    client.offsetX += dx;
    client.offsetY += dy;
    requestAnimationFrame(drawTiles);
};

const processDrawAction = (remoteClient, x, y) => {
    const { state } = remoteClient;
    const c = hexToRgb(state.color);
    const cs = `rgba(${c.r},${c.g},${c.b},${state.opacity})`;

    switch (state.tool) {
        case 'pencil':
            const ss = `rgba(${c.r},${c.g},${c.b},0.1)`;
            drawSketchy(ctx, remoteClient, x, y, ss);
            break;
        case 'line':
            drawLine(ctx, remoteClient.x, remoteClient.y, x, y, cs, state.size);
            break;
        case 'brush':
            drawBrush(ctx, remoteClient.x, remoteClient.y, x, y, cs, state.size);
            break;
        case 'eraser':
            eraseRegion(ctx, x, y, state.size);
            break;
        case 'spray':
            sprayCan(ctx, x, y, cs, state.size);
            break;
    }
};

const updatePixelColor = (x, y) => {
    const pxData = ctx.getImageData(x, y, 1, 1);
    const colorString = `rgb(${pxData.data[0]},${pxData.data[1]},${pxData.data[2]})`;

    const componentToHex = (c) => {
        const hex = c.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    };

    const rgbToHex = (r, g, b) => {
        return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    };

    client.state.color = rgbToHex(pxData.data[0], pxData.data[1], pxData.data[2]);
    const opacity = pxData.data[3] / 255;
    client.state.opacity = opacity < 0.01 ? 0.03 : opacity;

    return colorString;
};

const processMoveAction = (client, x, y) => {
    const dx = client.x - x;
    const dy = client.y - y;
    panScreen(dx, dy);
    client.x = x;
    client.y = y;
};

const saveTileAt = (x, y, tileCanvas) => {
    const key = `${x}/${y}`;

    const onSaveResponse = (code) => {
        switch (code) {
            case 201:
                break;
            case 413:
                notify("Too Large", `Error 413 is the tile ${x}, ${y} too large?`, "error");
                break;
            case 416:
                notify("Range Exceeded", "Canvas boundary limit. You have gone too far.", "error");
                break;
            case 429:
                notify("Slow Down", `Drawing fast? Server rejected tile save at ${x}, ${y} try again shortly.`, "error");
                break;
            case 404:
                notify("Error 404", "Server messing up?", "error");
                break;
            case 403:
                notify("Protected Region", `This region is protected. (${x}, ${y}) Move over a bit!`, "error");
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
                notify("Hmm", `Unhandled status code ${code} for tile ${x}, ${y}`, "error");
                break;
        }
    };

    tileSource.saveTileAt(x, y, tileCanvas, onSaveResponse);
};

const updateDirtyTiles = () => {
    Object.entries(tileSource.tileCollection).forEach(([tileKey, tile]) => {
        if (tile.dirty) {
            const posx = tile.x * tileSize - client.offsetX;
            const posy = tile.y * tileSize - client.offsetY;
            const ofc = document.createElement("canvas");
            ofc.width = tileSize;
            ofc.height = tileSize;
            const oCtx = ofc.getContext('2d');
            oCtx.drawImage(canvas, posx, posy, tileSize, tileSize, 0, 0, tileSize, tileSize);
            
            tileSource.tileCollection[tileKey].canvas = ofc;
            tileSource.tileCollection[tileKey].dirty = false;
            
            if (tile.filthy) {
                saveTileAt(tile.x, tile.y, ofc);
                tile.filthy = false;
            }
        }
    });
};

const clearTileCache = () => {
    Object.entries(tileSource.tileCollection).forEach(([tileKey, tile]) => {
        const xMin = Math.floor((client.offsetX - tileSize) / tileSize);
        const xMax = Math.floor((client.offsetX + tileSize + extent.width) / tileSize) + 1;
        const yMin = Math.floor((client.offsetY - tileSize) / tileSize);
        const yMax = Math.floor((client.offsetY + tileSize + extent.height) / tileSize) + 1;
        
        if (tile.x < xMin - 1 || tile.x > xMax || tile.y < yMin - 1 || tile.y > yMax) {
            delete tileSource.tileCollection[tileKey];
        }
    });
};

setInterval(clearTileCache, 5000);

const parseUriArgs = () => {
    const aURL = window.location.href;
    const vars = aURL.slice(aURL.indexOf('/') + 2).split('/');
    if (vars.length === 3) {
        const parsedX = parseInt(vars[1]);
        const parsedY = parseInt(vars[2]);
        const l = 150 * tileSize;
        if (!isNaN(parsedX) && !isNaN(parsedY)) {
            if (parsedX < -l || parsedX > l || parsedY < -l || parsedY > l) {
                return null;
            }
            return [parsedX, parsedY];
        }
    }
    return null;
};

const resizeLayout = () => {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
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
        const oldWidth = canvas.width;
        const oldHeight = canvas.height;
        canvas.width = oldWidth * ratio;
        canvas.height = oldHeight * ratio;
        canvas.style.width = `${oldWidth}px`;
        canvas.style.height = `${oldHeight}px`;
    }

    drawTiles();
};

if (!inIframe()) {
    window.addEventListener("resize", resizeLayout, false);
}

const handleMouseDownOrTouchStart = (evt) => {
    const isTouch = evt.type === "touchstart";

    if (isTouch) {
        evt.preventDefault();
        client.x = evt.touches[0].clientX * ratio + tileSize;
        client.y = evt.touches[0].clientY * ratio + tileSize;
    } else {
        client.x = evt.offsetX * ratio;
        client.y = evt.offsetY * ratio;

        if (evt.which === 2) {
            evt.preventDefault();
            client.m3Down = true;
            return;
        }
    }

    client.m1Down = true;

    if (client.state.tool === 'eyedropper') {
        updatePixelColor(client.x, client.y);
    }
};


const handleMouseUpOrTouchEnd = (evt) => {
    if (evt.type === "touchend" || evt.type === "touchcancel") {
        evt.preventDefault();
        client.m1Down = false;
        updateDirtyTiles();
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
};

//processing mouse movement
const getCoordinatesFromEvent = (evt) => {
    let x, y, touchPanning = false;

    if (evt.type === "touchmove") {
        evt.preventDefault();
        x = evt.touches[0].clientX * ratio + tileSize;
        y = evt.touches[0].clientY * ratio + tileSize;
        if (evt.touches.length > 1) {
            touchPanning = true;
        }
    } else {
        x = evt.offsetX * ratio;
        y = evt.offsetY * ratio;
    }

    return { x, y, touchPanning };
};

const handleDrawing = (client, x, y) => {
    processDrawAction(client, x, y);
    const shadow = client.state.tool === 'brush' ? client.state.size * 0.8 : 0;

    for (let i = -(client.state.size / 2) - shadow; i < (client.state.size / 2) + shadow; i += 1) {
        const tileX = Math.floor((x + client.offsetX + i) / tileSize);
        const tileY = Math.floor((y + client.offsetY + i) / tileSize);
        const key = `${tileX}/${tileY}`;

        tileSource.tileCollection[key].dirty = true;
        tileSource.tileCollection[key].filthy = true;
    }

    client.x = x;
    client.y = y;
};

const handleMouseMoveOrTouchMove = (evt) => {
    const { x, y, touchPanning } = getCoordinatesFromEvent(evt);

    const action = determineAction(client, touchPanning);

    switch (action) {
        case 'draw':
            handleDrawing(client, x, y);
            break;
        case 'move':
            processMoveAction(client, x, y);
            break;
        case 'eyedropper':
            updatePixelColor(x, y);
            break;
        default:
            // Do nothing for unhandled actions or no action needed
            break;
    }
};

const determineAction = (client, touchPanning) => {
    if (touchPanning) return 'move';
    if (client.m1Down) {
        switch (client.state.tool) {
            case 'move':
                return 'move';
            case 'eyedropper':
                return 'eyedropper';
            default:
                return 'draw';
        }
    } else if (client.m3Down) {
        return 'move';
    }
    return null;
};

//end of handling drawing movement

const handleWheelEvent = (evt) => {
    evt.preventDefault();
    panScreen(Math.floor(evt.deltaX), Math.floor(evt.deltaY));
};

// event listeners
canvas.addEventListener('mousedown', handleMouseDownOrTouchStart);
canvas.addEventListener('touchstart', handleMouseDownOrTouchStart);

canvas.addEventListener('mouseup', handleMouseUpOrTouchEnd);
canvas.addEventListener('mouseleave', handleMouseUpOrTouchEnd);
canvas.addEventListener('touchend', handleMouseUpOrTouchEnd);
canvas.addEventListener('touchcancel', handleMouseUpOrTouchEnd);

canvas.addEventListener('mousemove', handleMouseMoveOrTouchMove);
canvas.addEventListener('touchmove', handleMouseMoveOrTouchMove);

canvas.addEventListener('wheel', handleWheelEvent);
canvas.addEventListener('mousewheel', handleWheelEvent);  // Legacy support for older browsers


const initTheBusiness = () => {
    const givenOffsets = parseUriArgs();

    if (givenOffsets !== null) {
        [client.offsetX, client.offsetY] = givenOffsets;
    }
    resizeLayout();
};

initTheBusiness();

export default tileSource;