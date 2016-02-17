/**
 * Created by tim on 17/02/16.
 */
import io from 'socket.io-client'
import Realtime from './Realtime'

export default class WebSocketConnection extends Realtime {
    constructor(options){
        super(options);
        //messages received from the Socket.IO get forwarded to super implementation
        this.socket = new io("localhost:3000");
        this.socket.on('pan', (message) => {this.onPan(message)})
        this.socket.on('move', (message) => {this.onMove(message)})
    }

    sendPan(offset){
        this.socket.emit('pan', offset);
    }
}