# udraw

_udraw_ is a multiplayer drawing application which expands in size allowing very large drawings on an (unlimited?) sized surface. Each area of the canvas is broken into 256x256 pixel tiles which are drawn on a single HTML5 canvas seamlessly.
### Demo
A live demo is available at [https://udraw.me](https://udraw.me)

#### Features
- Live mouse movement
- Color picker, eyedropper, Retina support, Sketchy pencil (based off mrdoobs 'harmony' app)
- WASD, Arrow keys and Middle Mouse Button pan around
- Shortcuts for Brush, Line, Eyedropper etc.

## Operation
The _udraw_ server uses Redis for storage of PNG tiles which are accessed via a basic RESTful API. Real time events are sent over WebSocket using Socket.IO.

WebRTC support is the next goal for *hopefully faster* Peer-to-Peer support while Socket.IO operates for signaling and relay as fallback.

### Requirements
 - Redis server running on localhost
 - Node.js
 - Gulp (```npm install  -g gulp```)

## Build & Run
    git clone https://github.com/timatooth/udraw
    cd udraw
    npm install
    gulp
    npm start
    # server listens on *:3000

## License
MIT - see LICENSE file.
