# udraw

_udraw_ lets you draw and pan on a very large canvas. It uses a single HTML5 canvas which is broken up into tiles which are saved on a server. Many people can draw in the same area with WebSocket and WebRTC Peer-to-Peer connections for realtime updating.

### Demo
A live demo is available at [https://udraw.me](https://udraw.me)

#### Features
- Mobile 2 finger touch gestures for panning
- Color picker, eyedropper, Retina support, Sketchy pencil (based off mrdoobs 'harmony' app)
- WASD, Arrow keys and Middle Mouse Button for pan around on PC
- Shortcuts for Brush, Line, Eyedropper etc.

## Operation
The _udraw_ server uses Redis for storage of PNG tiles which are accessed via a basic RESTful API. Real time events are sent over WebSocket using Socket.IO or if possible leveraging WebRTC with Socket.IO-P2P.

### Requirements
 - Redis server running on localhost


## Build & Run
    npm install
    # ensure Redis is running first
    npm start #launches webpack-dev-server proxying requests to the rest api and websocket server.

## License
MIT - see LICENSE file.
