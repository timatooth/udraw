# udraw
_udraw_ is a multiplayer drawing application like many other drawing apps out there which have surfaced since WebSockets. Mine happens to expand in size allowing very large drawings on an (unlimited?) sized surface. Each area of the canvas is broken into 256x256 pixel tiles which are drawn on a single HTML5 canvas seamlessly to make drawing on a large canvas possible. 
### Demo
A live demo is available at [https://udraw.me](https://udraw.me)

#### Features
- Color picker, eyedropper, Retina support
- WASD, Arrow keys and Middle Mouse Button pan around
- Shortcuts for Brush, Line, Eyedropper etc.

## Operation
_udraw_ uses Redis for storage of PNG tiles which are accessed via a basic RESTful API. Real time events are sent over WebSocket using Socket.IO. 

WebRTC support is the next goal for *hopefully faster* Peer-to-Peer support while Socket.IO operates for signalling and relay as fallback.

### Requirements
 - Redis 3 server running
 - Node tested 0.10.x 4.x.x & 5.0.0
 - Gulp (```npm install  -g gulp```)

## Build & Run
    git clone https://github.com/timatooth/udraw
    cd udraw
    npm install
    gulp
    node start
    # server listens on *:3000 and serves public folder in dev mode

## License
MIT - see LICENSE file.