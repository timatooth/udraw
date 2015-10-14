/* global Backbone, _ */

(function () {
    'use strict';
    var canvas = $('canvas');
    var ctx = canvas[0].getContext('2d');
    var clientStates = {};

    var client = {
        state: {
            tool: 'line',
            color: '#4480c2',
            size: 1,
            opacity: 0.8
        },
        x: 0,
        y: 0,
        m1Down: false
    };

    $(canvas).on('mousedown', function (evt) {
        client.m1Down = true;
        client.x = evt.offsetX;
        client.y = evt.offsetY;
    });

    $(canvas).on('mouseup', function (evt) {
        client.m1Down = false;
        client.x = evt.offsetX;
        client.y = evt.offsetY;
    });

    var lastEmit = $.now();
    $(canvas).on('mousemove', function (evt) {
        if (client.m1Down) {
            var x = evt.offsetX;
            var y = evt.offsetY;
            processDrawAction(client, x, y);
            client.x = evt.offsetX;
            client.y = evt.offsetY;
        }
        if ($.now() - lastEmit > 30) {
            var message = {
                x: evt.offsetX,
                y: evt.offsetY,
                d1: client.m1Down
            };
            socket.emit('move', message);
            lastEmit = $.now();
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
            left: packet.x,
            top: packet.y
        });
        //console.log(clientStates);
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
})();