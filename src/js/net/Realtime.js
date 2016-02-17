/**
 * Created by tim on 17/02/16.
 */


export class Client {
    constructor(message){
        this.id = message.id
        this.offset = {x: 0, y: 0}
    }
}

export default class Realtime {
    constructor(options){
        this.eventHub = options.eventHub;
        this.eventHub.on('canvas:offsetChange', (offset) => { this.sendPan(offset) })
        this.eventHub.on('toolbar:toolChange', (toolState) => { this.sendToolStateChange(toolState) })
        this.clientList = {}
    }

    //SENDING
    //forward the work to child class implementation
    sendPan(offset){}
    sendMove(coordinates){}
    sendToolStateChange(newState){}

    //UPDATING STATE
    updateClient(message){
        //if no client, create one
        if (! this.clientList.hasOwnProperty(message.id)){
            this.clientList[message.id] = new Client(message)
        }
    }

    //RECEIVING
    //work received from child implementation
    onMove(message){
        //update client in hash if exists or add them in
        this.updateClient(message);
        //tell components about move
    }

    onPan(message){

    }


}