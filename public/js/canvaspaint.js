/* global Backbone, _, PNotify, FastClick */

(function () {
    'use strict';
    var tileSize = 256;
    var debug = false;
    var lastPing = $.now();
    var canvas = document.getElementById("paper");
    canvas.width = $(window).width() + tileSize * 2;
    canvas.height = $(window).height() + tileSize * 2;
    var ctx = canvas.getContext('2d');
    //hdpi support
    var devicePixelRatio = window.devicePixelRatio || 1;
    var backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
            ctx.mozBackingStorePixelRatio ||
            ctx.msBackingStorePixelRatio ||
            ctx.oBackingStorePixelRatio ||
            ctx.backingStorePixelRatio || 1;

    var ratio = devicePixelRatio / backingStoreRatio;

    if (devicePixelRatio !== backingStoreRatio) {
        var oldWidth = canvas.width;
        var oldHeight = canvas.height;
        canvas.width = oldWidth * ratio;
        canvas.height = oldHeight * ratio;
        canvas.style.width = oldWidth + 'px';
        canvas.style.height = oldHeight + 'px';
    }


    var clientStates = {};
    var tileCollection = {};

    //The visible region on screen the user sees
    var extent = {
        width: $(window).width() * ratio,
        height: $(window).height() * ratio
    };

    var client = {
        state: {
            tool: 'line',
            color: '#222222',
            size: 4,
            opacity: 1
        },
        x: 0,
        y: 0,
        m1Down: false,
        offsetX: 0,
        offsetY: 0
    };

    $(canvas).on('mousedown touchstart', function (evt) {
        $('.panel').hide();
        //$('.colorbutton').children()..hide();
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
            client.x = evt.offsetX * ratio; // CHECKME: maybe factor hdpi here too
            client.y = evt.offsetY * ratio;
        }

    });

    $(canvas).on('mouseup mouseleave touchend touchcancel', function (evt) {
        if (evt.type === "touchend" || evt.type === "touchcancel") {
            evt.preventDefault();
            //client.x = evt.originalEvent.touches[0].clientX;
            //client.y = evt.originalEvent.touches[0].clientY;
            client.m1Down = false;
            updateDirtyTiles();
            //send a move setting drawing to false
            var message = {
                x: ((client.x / ratio) * ratio) + client.offsetX,
                y: ((client.y / ratio) * ratio) + client.offsetY,
                d1: client.m1Down
            };
            socket.emit('move', message);
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
            evt.preventDefault();
            x = evt.originalEvent.touches[0].clientX * ratio + tileSize; //improve?
            y = evt.originalEvent.touches[0].clientY * ratio + tileSize;
        } else {
            x = evt.offsetX * ratio; //check retina on mac
            y = evt.offsetY * ratio;
        }

        if (client.m1Down && client.state.tool !== 'move') {
            processDrawAction(client, x, y);
            var shadow = 0;
            if (client.state.tool === 'brush') {
                var shadow = client.state.size * 0.8;
            }
            // we need to factor in the size of the brush which might overlap
            // more than one tile
            for (var i = -(client.state.size / 2) - shadow; i < (client.state.size / 2) + shadow; i++) {
                //set the 'tile' to be recached
                var tileX = Math.floor((x + client.offsetX + i) / tileSize);
                var tileY = Math.floor((y + client.offsetY + i) / tileSize);
                var key = tileX + '/' + tileY;
                tileCollection[key].dirty = true;
                tileCollection[key].filthy = true; //locally created dirty watchdog flag
            }

            client.x = x;
            client.y = y;

            if ($.now() - lastEmit > 30) {
                var message = {
                    x: ((x / ratio) * ratio) + client.offsetX,
                    y: ((y / ratio) * ratio) + client.offsetY,
                    d1: client.m1Down
                };
                socket.emit('move', message);
                lastEmit = $.now();
            }
        } else if (client.m3Down || (client.m1Down && client.state.tool === 'move')) {
            processMoveAction(client, x, y);
            if ($.now() - lastEmit > 60) { //only send pan message every 60ms
                var message = {
                    x: client.offsetX,
                    y: client.offsetY
                };
                socket.emit('pan', message);
                lastEmit = $.now();
            }
        } else {
            //just a regular mouse move? //refactor 
            if ($.now() - lastEmit > 30) {
                var message = {
                    x: evt.offsetX + client.offsetX,
                    y: evt.offsetY + client.offsetY,
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
        ctx.lineCap = 'butt';
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

    function drawBrush(ctx, fromx, fromy, tox, toy, color, size) {
        ctx.beginPath(); //need to enclose in begin/close for colour settings to work
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.lineCap = "round";
        //shadow
        ctx.shadowBlur = size * 0.0;
        ctx.shadowColor = "black";
        //
        ctx.moveTo(fromx, fromy);
        ctx.lineTo(tox, toy);
        ctx.stroke();
        ctx.closePath();
        ctx.shadowBlur = 0; //set back to 0 othewise all drawings are shadowed?
    }

    function clearCircle(ctx, x, y, radius) {
        ctx.clearRect(x - radius, y - radius, radius, radius);
    }

    function updateToolState() {
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
    }

    setInterval(function () {
        updateToolState();
    }, 1000 * 20);

    var SidebarView = Backbone.View.extend({
        template: _.template($("#sidebar-template").html()),
        className: "sidebar",
        events: {
            "click .tool": "onToolClick",
            "click .brush-tools": "onBrushToolsClick",
            "click .fullscreen": "onFullScreenClick",
            "change .colourpicker input": "onColourChange",
            "click .status-info": "onStatusClick"
        },
        initialize: function () {
            this.toolsPanel = null;
            this.statusPanel = null;
        },
        render: function () {
            this.$el.append(this.template());
            return this;
        },
        onToolClick: function (evt) {
            client.state.tool = $(evt.currentTarget).data('name');
            $('.tool-rack').toggleClass('hidden');
            $('.tool-button').html($(evt.currentTarget).html());
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
        },
        onStatusClick: function () {
            if (this.statusPanel === null) {
                this.statusPanel = new StatusView();
                this.$el.append(this.statusPanel.render().el);
                var sp = this.statusPanel;
                setInterval(function () {
                    lastPing = $.now();
                    socket.emit('ping');
                    sp.updateLabels();
                }, 1500);
            } else {
                this.statusPanel.$el.toggle();
            }
            this.statusPanel.updateLabels();
        }
    });

    var StatusView = Backbone.View.extend({
        template: _.template($("#status-template").html()),
        className: "panel status-panel",
        events: {
        },
        render: function () {
            this.$el.append(this.template());
            return this;
        },
        updateLabels: function () {
            this.$el.find('.users').empty();
            //fill table of users
            for (var key in clientStates) {
                var x = clientStates[key].offset.x;
                var y = clientStates[key].offset.y;
                var text = "<li><a href='#!/" + x + "/" + y + "'>" + "User" + "</a> (" + x + ", " + y + ")</li>";
                this.$el.find('.users').append(text);
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
            this.$el.find('.size-range').val(client.state.size);
            this.$el.find('.opacity-range').val(client.state.opacity);
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

    //key Bindings
    $(document).on('keydown keypress', function (evt) {
        var s = 40;
        switch (evt.keyCode) {
            //move keys
            case 37:
            case 97:
                panScreen(-s, 0);
                break;
            case 39:
            case 100:
                panScreen(s, 0);
                break;
            case 38:
            case 119:
                panScreen(0, -s);
                break;
            case 40:
            case 115:
                panScreen(0, s);
                break;
                //tools
            case 98:
                $('.paint-tool').click();
                break;
            case 108:
                $('.line-tool').click();
                break;
            case 109:
                $('.move-tool').click();
                break;
            case 120:
                $('.eraser-tool').click();
                break;
            case 61:
                //+
                //$('.size-range').first().val($('.size-range').first().val() + 1);
                break;
            case 45:
                //-
                //$('.size-range').first().val($('.size-range').first().val() - 1);
                break;
        }
    });

    function panScreen(dx, dy) {
        client.offsetX += dx;
        client.offsetY += dy;
        drawTiles();
    }

    var socket = new io();

    socket.on('connect', function () {
        updateToolState();
    });

    socket.on('ping', function () {
        socket.emit('pong');
    });

    socket.on('pong', function () {
        var latency = $.now() - lastPing;
        $('#latency-label').text(latency + 'ms');
    });

    socket.on('states', function (data) {
        for (var key in data) {
            clientStates[key] = {};
            clientStates[key].state = data[key];
            clientStates[key].cursor = $('<div class="cursor">').appendTo('#cursors');
            clientStates[key].updated = $.now();
            clientStates[key].x = 0;
            clientStates[key].y = 0;
            clientStates[key].offset = {x: 0, y: 0};
        }
    });

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
            offset: {x: 0, y: 0}
        };
    }

    socket.on('move', function (packet) {

        if (!(packet.id in clientStates)) {
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
                tileCollection[key].dirty = true;
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
        if (!(packet.id in clientStates)) {
            addClient(packet);
        }
        clientStates[packet.id].state = packet;
        clientStates[packet.id].updated = $.now();
    });

    socket.on('pan', function (packet) {
        if (!(packet.id in clientStates)) {
            addClient(packet);
        }
        clientStates[packet.id].offset.x = packet.x;
        clientStates[packet.id].offset.y = packet.y;
        clientStates[packet.id].updated = $.now();
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
            //drawCircle(ctx, x, y, cs, state.size / 2);
            drawBrush(ctx, remoteClient.x, remoteClient.y, x, y, cs, state.size);
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
        client.x = x;
        client.y = y;
        if (!!(window.history && history.pushState)) {
            updateUrl("#!/" + client.offsetX + "/" + client.offsetY);
        }

    }

    var updateUrl = _.debounce(function (key) {
        history.replaceState(null, null, key);
    }, 500);

    function drawTiles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (var y = client.offsetY; y < client.offsetY + extent.height + tileSize * 2; y += tileSize) {
            for (var x = client.offsetX; x < client.offsetX + extent.width + tileSize * 2; x += tileSize) {
                var xTile = Math.floor(x / tileSize);
                var yTile = Math.floor(y / tileSize);

                loadTileAt(xTile, yTile, function (tile) {
                    var destinationX = (tile.x * tileSize) - client.offsetX;
                    var destinationY = (tile.y * tileSize) - client.offsetY;
                    ctx.drawImage(tile.canvas, 0, 0, tileSize, tileSize, destinationX, destinationY, tileSize, tileSize);
                });
            }
        }
    }

    //TODO: optimise and re-factor
    function loadTileAt(x, y, cb) {
        var key = x + '/' + y;
        var endpoint = '/canvases/main/1/' + key;

        if (key in tileCollection) {
            return cb(tileCollection[key]);
        }

        var tile = document.createElement("canvas");
        tile.width = tileSize;
        tile.height = tileSize;
        var tCtx = tile.getContext('2d');

        var oReq = new XMLHttpRequest();
        oReq.responseType = "blob";
        oReq.open("GET", endpoint, true);
        var tileStruct = {
            canvas: tile,
            dirty: false,
            x: x,
            y: y,
            ready: false
        };

        tileCollection[key] = tileStruct; //cache tile

        oReq.onload = function (evt) {
            if (evt.target.status === 200) {
                var imgData = evt.target.response;
                var img = new Image();
                img.onload = function () {
                    tCtx.drawImage(img, 0, 0);
                    tileStruct.ready = true;
                    cb(tileStruct);
                };
                img.src = window.URL.createObjectURL(imgData); //file api experimental


            } else if (evt.target.status === 204) {
                if (debug) {
                    tCtx.lineWidth = "1";
                    tCtx.strokeStyle = "#AACCEE";
                    tCtx.rect(0, 0, tileSize, tileSize);
                    tCtx.stroke();
                    tCtx.fillText("(" + x + "," + y + ")", 10, 10);
                    tileStruct.ready = true;
                    cb(tileStruct);
                }
            } else if (evt.target.status === 416) {
                tCtx.fillStyle = "#0F0";
                tCtx.fillRect(0, 0, tileSize, tileSize);
                notify("Tile Fetch Error", "Have you gone too far?", "error");
            }
        };
        if (!tileStruct.ready) {
            oReq.send();
        }
    }

    function initTheBusiness() {

        if (debug) {
            localStorage.clear();
        }

        var givenOffsets = parseHashBangArgs();

        if (givenOffsets !== null) {
            client.offsetX = givenOffsets[0];
            client.offsetY = givenOffsets[1];
            $('#offset-label').text(client.offsetX + ',' + client.offsetY);
        }
        drawTiles();

        if (localStorage.getItem('walkthrough') === null) {
            //setup tutorial
            notify("Welcome", "Draw anywhere on a massive canvas in real time. Drawings are saved. Expect bugs.", "");

            setTimeout(function () {
                notify("Tips", "B = brush, L = Line, M = Move. To quickly move around use WASD or arrow keys or Middle Mouse Button if you have one.", "info");
            }, 10000);

            setTimeout(function () {
                notify("Boss Tips", "The URL points to your current location to share.", "info");
            }, 35000);

            setTimeout(function () {
                notify("Thoughts so far?", "Send me an email for bug reports and suggestions. sulti642@student.otago.ac.nz", "info");
            }, 60 * 1000 * 2);

            if (ratio > 1) {
                notify("Retina Support", "Tile loading is temperamental bug. Pan lots re-load missing ones.", "");
            }
            localStorage.setItem('walkthrough', 1);
        }

        if (localStorage.getItem('toolsettings') !== null) {
            var tools = JSON.parse(localStorage.getItem('toolsettings'));
            client.state = tools;
            $('.colorbutton').css({color: client.state.color});
            $('.tool-button').html($('.' + client.state.tool + '-tool').html());
        }

        if (debug) {
            console.log("= Debug Info =");
            console.log("Window: " + $(window).width() + " x " + $(window).height());
            console.log("Extent: " + extent.width + " x " + extent.height);
        }
        $("#paper").focus();

        //mobile fast touching

        FastClick.attach(document.body);
    }

    function notify(title, message, type) {
        new PNotify({
            title: title,
            text: message,
            nonblock: {
                nonblock: true,
                nonblock_opacity: .1
            },
            type: type
        });
    }

    var saveTileAt = _.throttle(function (x, y, tileCanvas) {
        var key = x + '/' + y;
        var tileString = tileCanvas.toDataURL();
        var endpoint = '/canvases/main/1/' + key;
        //post tile at coordinate:
        var blob = b64toBlob(tileString.substr(22), 'image/png');
        var oReq = new XMLHttpRequest();
        oReq.onload = function (res) {
            var xhr = res.target;
            switch (xhr.status) {
                case 201:
                    break;
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
                    notify("Error 404", "Server playing up?", "error");
                    break;
                case 500:
                    notify("Error 500", "Server isn't feeling well right now.", "error");
                    break;
                default:
                    notify("Hmm", "Unhandled status code " + xhr.status + " for tile " + x + ", " + y, "error");
                    break;
            }
        };
        oReq.open("PUT", endpoint, true);
        oReq.send(blob);
    }, 2000); //limit saves to every 2s

    var updateDirtyTiles = _.throttle(function () {
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
                oCtx.drawImage(canvas, posx, posy, tileSize, tileSize, 0, 0, tileSize, tileSize);
                //swap
                tileCollection[tileKey].canvas = ofc;
                tileCollection[tileKey].dirty = false;
                //post tile to persistance layer
                if (tile.filthy) {
                    saveTileAt(tile.x, tile.y, ofc);
                    tile.filthy = false;
                }
            }
        }
    }, 500);

    function clearTileCache() {
        for (var tileKey in tileCollection) {
            var tile = tileCollection[tileKey];
            var xMin = Math.floor((client.offsetX - tileSize) / tileSize);
            var xMax = Math.floor((client.offsetX + tileSize + extent.width) / tileSize) + 1;
            var yMin = Math.floor((client.offsetY - tileSize) / tileSize);
            var yMax = Math.floor((client.offsetY + tileSize + extent.height) / tileSize) + 1;
            if (tile.x < xMin - 1 || tile.x > xMax || tile.y < yMin - 1 || tile.y > yMax) {
                delete tileCollection[tileKey];
            }
        }
    }

    setInterval(function () {
        clearTileCache();
    }, 5000);

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

    function parseHashBangArgs() {
        var aURL = window.location.href;
        var vars = aURL.slice(aURL.indexOf('#') + 3).split('/');
        if (vars.length === 2) {
            var parsedX = parseInt(vars[0]);
            var parsedY = parseInt(vars[1]);
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

    // Create the listener function
    var resizeLayout = _.debounce(function (e) {
        canvas.width = $(window).width() + tileSize * 2;
        canvas.height = $(window).height() + tileSize * 2;

        extent = {
            width: $(window).width() * ratio,
            height: $(window).height() * ratio
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

    window.addEventListener("resize", resizeLayout, false);

    window.onpopstate = function (e) {
        var givenOffsets = parseHashBangArgs();

        if (givenOffsets !== null) {
            client.offsetX = givenOffsets[0];
            client.offsetY = givenOffsets[1];
            $('#offset-label').text(client.offsetX + ',' + client.offsetY);
        }
        drawTiles();
    };

    $('.colorbutton').spectrum({
        color: "#f00",
        clickoutFiresChange: true,
        move: function (color) {
            client.state.color = color.toHexString();
            $('.colorbutton').css({color: color.toHexString()});
        },
        change: function (color) {
            client.state.color = color.toHexString();
            updateToolState();
        }
    });

    initTheBusiness();
})();