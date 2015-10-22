/* global Backbone, _ */

(function () {
    'use strict';
    var tileSize = 256;
    var debug = true;
    var canvas = document.getElementById("paper");
    canvas.width = $(window).width() + tileSize;
    canvas.height = $(window).height() + tileSize;
    var ctx = canvas.getContext('2d');
    var clientStates = {};
    var tileCollection = {};

    //The visible region on screen the user sees
    var extent = {
        width: $(window).width(),
        height: $(window).height()
    };

    var client = {
        state: {
            tool: 'line',
            color: '#4480c2',
            size: 1,
            opacity: 0.8
        },
        x: 0,
        y: 0,
        m1Down: false,
        offsetX: 0,
        offsetY: 0
    };

    $(canvas).on('mousedown touchstart', function (evt) {
        if (evt.type === "touchstart") {
            client.x = evt.originalEvent.touches[0].clientX;
            client.y = evt.originalEvent.touches[0].clientY;
        } else {
            if (evt.which === 2) {
                client.m3Down = true;
            } else {
                client.m1Down = true;
            }
            client.x = evt.offsetX;
            client.y = evt.offsetY;
        }

    });

    $(canvas).on('mouseup mouseleave touchend touchcancel', function (evt) {
        if (evt.type === "touchstart" || evt.type === "touchcancel") {
            client.x = evt.originalEvent.touches[0].clientX;
            client.y = evt.originalEvent.touches[0].clientY;
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

    var lastEmit = $.now();
    $(canvas).on('mousemove touchmove', function (evt) {
        var x, y;
        if (evt.type === "touchmove") {
            x = evt.originalEvent.touches[0].clientX;
            y = evt.originalEvent.touches[0].clientY;
        } else {
            x = evt.offsetX;
            y = evt.offsetY;
        }

        if (client.m1Down && client.state.tool !== 'move') {
            processDrawAction(client, x, y);

            //set the 'tile' to be recached
            var tileX = Math.floor((x + client.offsetX) / tileSize);
            var tileY = Math.floor((y + client.offsetY) / tileSize);
            var key = tileX + '/' + tileY;
            tileCollection[key].dirty = true;

            client.x = x;
            client.y = y;

            if ($.now() - lastEmit > 30) {
                var message = {
                    x: evt.offsetX,
                    y: evt.offsetY,
                    d1: client.m1Down
                };
                socket.emit('move', message);
                lastEmit = $.now();
            }
        } else if (client.m3Down || (client.m1Down && client.state.tool === 'move')) {
            processMoveAction(client, evt.offsetX, evt.offsetY);
            client.x = x;
            client.y = y;
        } else {
            //just a regular mouse move? //refactor 
            if ($.now() - lastEmit > 30) {
                var message = {
                    x: evt.offsetX,
                    y: evt.offsetY,
                    d1: client.m1Down
                };
                socket.emit('move', message);
                lastEmit = $.now();
            }
        }

    });

    function drawLine(ctx, fromx, fromy, tox, toy, color, size) {
        ctx.beginPath(); //need to enclose in begin/close for colour settings to work
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.moveTo(fromx, fromy);
        ctx.lineTo(tox, toy);
        ctx.stroke();
        ctx.closePath();
    }

    function hexToRgb(hex) {
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function (m, r, g, b) {
            return r + r + g + g + b + b;
        });
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    function paintImage(ctx, x, y) {
        ctx.drawImage(img[0], x, y);
    }

    function drawCircle(ctx, x, y, color, radius) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
    }

    function clearCircle(ctx, x, y, radius) {
        ctx.clearRect(x - radius, y - radius, radius, radius);
    }

    function updateToolState() {
        var message = {
            tool: client.state.tool,
            color: client.state.color,
            size: client.state.size,
            opacity: client.state.opacity
        };

        socket.emit('status', message);
    }

    var img = $('#dummyImage');
    $(img).attr('src', '/static/svg/leaves.svg');
    $(img).attr('width', 50);
    $(img).attr('height', 50);

    var SidebarView = Backbone.View.extend({
        template: _.template($("#sidebar-template").html()),
        className: "sidebar",
        events: {
            "click .tool": "onToolClick",
            "click .brush-tools": "onBrushToolsClick",
            "click .fullscreen": "onFullScreenClick",
            "change .colourpicker input": "onColourChange"
        },
        initialize: function () {
            this.toolsPanel = null;
        },
        render: function () {
            this.$el.append(this.template());
            return this;
        },
        onToolClick: function (evt) {
            this.$el.find('.active').each(function () {
                $(this).removeClass('active');
            });
            $(evt.target).addClass('active');
            client.state.tool = $(evt.currentTarget).data('name');
            updateToolState();
        },
        onBrushToolsClick: function () {
            if (this.toolsPanel === null) {
                this.toolsPanel = new BrushToolsView();
                this.$el.append(this.toolsPanel.render().el);
            } else {
                this.toolsPanel.$el.toggle();
            }
        },
        onColourChange: function (evt) {
            client.state.color = evt.target.value;
            updateToolState();
        },
        onFullScreenClick: function () {
            $('.fullscreen i').removeClass('ion-arrow-expand');
            $('.fullscreen i').addClass('ion-arrow-shrink');
            if (!document.fullscreenElement && // alternative standard method
                    !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {  // current working methods
                if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen();
                } else if (document.documentElement.msRequestFullscreen) {
                    document.documentElement.msRequestFullscreen();
                } else if (document.documentElement.mozRequestFullScreen) {
                    document.documentElement.mozRequestFullScreen();
                } else if (document.documentElement.webkitRequestFullscreen) {
                    document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
                }
            } else {
                $('.fullscreen i').removeClass('ion-arrow-shrink');
                $('.fullscreen i').addClass('ion-arrow-expand');

                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
            }
        }
    });

    var BrushToolsView = Backbone.View.extend({
        template: _.template($("#brush-tools-template").html()),
        className: "panel",
        events: {
            "change .opacity-range": "onOpacityChange",
            "change .size-range": "onSizeChange"
        },
        initialize: function () {

        },
        render: function () {
            this.$el.append(this.template());
            return this;
        },
        onOpacityChange: function (evt, value) {
            client.state.opacity = Number(evt.target.value);
            updateToolState();
        },
        onSizeChange: function (evt, value) {
            client.state.size = Number(evt.target.value);
            updateToolState();
        }
    });

    var sidebar = new SidebarView();
    $('body').append(sidebar.render().el);

    var socket = new io();

    socket.on('states', function (data) {
        for (var key in data) {
            clientStates[key] = {};
            clientStates[key].state = data[key];
            clientStates[key].cursor = $('<div class="cursor">').appendTo('#cursors');
            clientStates[key].updated = $.now();
            clientStates[key].x = 0;
            clientStates[key].y = 0;
        }
    });

    socket.on('move', function (packet) {

        if (!(packet.id in clientStates)) {
            clientStates[packet.id] = {
                cursor: $('<div class="cursor">').appendTo('#cursors'),
                state: {
                    tool: 'line',
                    color: '#4480c2',
                    size: 1,
                    opacity: 0.8
                },
                updated: $.now()
            };
        } else {
            clientStates[packet.id].updated = $.now();
        }

        //update the cursor
        $(clientStates[packet.id].cursor).css({
            left: packet.x - tileSize, //correct offset
            top: packet.y - tileSize
        });

        var remoteClient = clientStates[packet.id];
        var x = packet.x;
        var y = packet.y;

        if (packet.d1) { //mouse1 down
            processDrawAction(remoteClient, x, y);
        }
        clientStates[packet.id].x = packet.x;
        clientStates[packet.id].y = packet.y;

    });

    socket.on('status', function (packet) {
        clientStates[packet.id].state = packet;
    });

    // Remove inactive clients after 30 seconds of inactivity
    setInterval(function () {
        for (var eachClient in clientStates) {
            if ($.now() - clientStates[eachClient].updated > 1000 * 30) {
                clientStates[eachClient].cursor.remove(); //remove cursor
                delete clientStates[eachClient]; //remove states
            }
        }
    }, 1000);

    function processDrawAction(remoteClient, x, y) {
        var state = remoteClient.state;
        var c = hexToRgb(state.color);
        var cs = "rgba(" + c.r + "," + c.g + "," + c.b + "," + state.opacity + ")";

        if (state.tool === 'line') {
            drawLine(ctx, remoteClient.x, remoteClient.y, x, y, cs, state.size);
        } else if (state.tool === 'region') {
            paintImage(ctx, x, y);
        } else if (state.tool === 'brush') {
            drawCircle(ctx, x, y, cs, state.size / 2);
        } else if (state.tool === 'eraser') {
            clearCircle(ctx, x, y, state.size);
        }
    }

    function processMoveAction(client, x, y) {
        var dx = client.x - x;
        var dy = client.y - y;
        client.offsetX = client.offsetX + dx;
        client.offsetY = client.offsetY + dy;
        $('#offset-label').text(client.offsetX + ',' + client.offsetY);
        drawTiles();
    }

    function drawTiles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (var y = client.offsetY; y < client.offsetY + extent.height + tileSize * 2; y += tileSize) {
            for (var x = client.offsetX; x < client.offsetX + extent.width + tileSize * 2; x += tileSize) {
                var xTile = Math.floor(x / tileSize);
                var yTile = Math.floor(y / tileSize);
                var destinationX = (xTile * tileSize) - client.offsetX;
                var destinationY = (yTile * tileSize) - client.offsetY;
                //this should be replaced with a render queue.
                (function (dx, dy) {
                    loadTileAt(xTile, yTile, function (tile) {
                        ctx.drawImage(tile.canvas, 0, 0, tileSize, tileSize, dx, dy, tileSize, tileSize);
                    });
                })(destinationX, destinationY);
            }
        }
    }

    //TODO: optimise and re-factor
    function loadTileAt(x, y, cb) {
        var key = x + '/' + y;
        var endpoint = '/canvases/main/1/' + key;
        var done = false;

        if (key in tileCollection) {
            return cb(tileCollection[key]);
        }

        var tile = document.createElement("canvas");
        tile.width = tileSize;
        tile.height = tileSize;
        var tCtx = tile.getContext('2d');

        var oReq = new XMLHttpRequest();
        oReq.responseType = "blob";
        oReq.open("GET", endpoint, true); //FIXME private api

        oReq.onload = function (evt) {
            if (evt.target.status === 200) {
                //var imgData = new Blob(ir, {type: 'image/png'});
                var imgData = evt.target.response;
                var img = new Image();
                img.onload = function () {
                    tCtx.drawImage(img, 0, 0);

                    var tileStruct = {
                        canvas: tile,
                        dirty: false,
                        x: x,
                        y: y
                    };

                    tileCollection[key] = tileStruct; //cache tile
                    cb(tileStruct);
                    done = true;
                };
                img.src = window.URL.createObjectURL(imgData); //file api experimental


            } else if (evt.target.status === 204) {
                if (debug) {
                    tCtx.lineWidth = "1";
                    tCtx.strokeStyle = "#AACCEE";
                    tCtx.rect(0, 0, tileSize, tileSize);
                    tCtx.stroke();
                    tCtx.fillText("(" + x + "," + y + ")", 10, 10);
                }
            }

            if (!done) {
                var tileStruct = {
                    canvas: tile,
                    dirty: false,
                    x: x,
                    y: y
                };

                tileCollection[key] = tileStruct; //cache tile
                cb(tileStruct);
            }
        };
        oReq.send();
    }

    function initTheBusiness() {
        drawTiles();
    }

    function saveTileAt(x, y, tileCanvas) {
        var key = x + '/' + y;
        var tileString = tileCanvas.toDataURL();
        var endpoint = '/canvases/main/1/' + key;
        //post tile at coordinate:
        var blob = b64toBlob(tileString.substr(22), 'image/png');
        var oReq = new XMLHttpRequest();
        oReq.open("PUT", endpoint, true);
        oReq.send(blob);
    }

    function updateDirtyTiles() {
        for (var tileKey in tileCollection) {
            if (tileCollection[tileKey].dirty) {
                var tile = tileCollection[tileKey];
                //find it onscreen
                var posx = tile.x * tileSize - client.offsetX;
                var posy = tile.y * tileSize - client.offsetY;
                var ofc = document.createElement("canvas");
                ofc.width = tileSize;
                ofc.height = tileSize;
                var oCtx = ofc.getContext('2d');
                oCtx.drawImage(canvas, posx, posy, tileSize, tileSize, 0, 0, tileSize, tileSize); //fixme remove jquery wrapping
                //swap
                tileCollection[tileKey].canvas = ofc;
                tileCollection[tileKey].dirty = false;
                //post tile to persistance layer
                saveTileAt(tile.x, tile.y, ofc);
            }
        }
    }

    //http://stackoverflow.com/questions/16245767/creating-a-blob-from-a-base64-string-in-javascript
    function b64toBlob(b64Data, contentType, sliceSize) {
        contentType = contentType || '';
        sliceSize = sliceSize || 512;
        var byteCharacters = atob(b64Data);
        var byteArrays = [];
        for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            var slice = byteCharacters.slice(offset, offset + sliceSize);
            var byteNumbers = new Array(slice.length);
            for (var i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            var byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }

        var blob = new Blob(byteArrays, {type: contentType});
        return blob;
    }

    initTheBusiness();
})();