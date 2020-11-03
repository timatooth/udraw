import React from 'react'
import Peer from 'peerjs';
import * as PIXI from 'pixi.js';

import Pointer from './images/pointer.png';

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}


export class UdrawApp extends React.Component {

    constructor(props){
        super(props);
        this.state = {
            username: uuidv4(),
            connectToPeer: null,
            lastMessage: "(no message yet)",
            tool: {
                x: 0,
                y: 0
            },
            peers: []
        };

        this.peer = new Peer(this.state.username);

        this.handleChange = this.handleChange.bind(this);
        this.onConnectClick = this.onConnectClick.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onCallClick = this.onCallClick.bind(this);
    }

    onPointerMove(event){
        this.setState({tool: {
            x: event.data.global.x,
            y: event.data.global.y
        }})

        this.state.peers.forEach((p) => {
            p.send({m: this.state.tool});
        })
    }
    

    componentDidMount(){

        this.props.pixiApp.stage.on('pointermove', this.onPointerMove)


        var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        let self = this;
        this.peer.on('call', function(call) {
            console.log("Got a call coming in!!!")
            getUserMedia({video: true, audio: true}, function(stream) {
                call.answer(stream); // Answer the call with an A/V stream.
                call.on('stream', function(remoteStream) {
                    let videoElement = document.createElement('video');
                    videoElement.srcObject = remoteStream;
                    videoElement.autoplay = true; //unsure if needed
                    let videoSprite = PIXI.Sprite.from(videoElement);

                    videoSprite.anchor.set(0.5);
                    videoSprite.width = 50;
                    videoSprite.height = 50;
                    videoSprite.x = 0;
                    videoSprite.y = 50;

                    let container = self.props.pixiApp.stage.getChildByName(call.peer)
                    container.addChild(videoSprite);

                });
            }, function(err) {
                console.log('Failed to get local stream' ,err);
            });
        });

        this.peer.on('connection', (conn) => {
            conn.on('data', (data) => {
                this.setState({
                    lastMessage: JSON.stringify(data)
                })

                if (data.hasOwnProperty("m")){
                    let s = this.props.pixiApp.stage.getChildByName(conn.peer)
                    s.x = data.m.x;
                    s.y = data.m.y;
                }
            });

            conn.on('open', () => {
                const pointer = PIXI.Sprite.from(Pointer);
                pointer.name = conn.peer;

                pointer.anchor.set(0.5);
                pointer.x = 50;
                pointer.y = 50;
                const basicText = new PIXI.Text(conn.peer)
                pointer.addChild(basicText);

                this.props.pixiApp.stage.addChild(pointer);

                this.setState({
                    peers: [conn]
                })
            });
        });
    }

    handleChange(event) {
        this.setState({connectToPeer: event.target.value});
    }

    onConnectClick() {
        const conn = this.peer.connect(this.state.connectToPeer);
        conn.on('open', () => {
            this.props.pixiApp.renderer.backgroundColor = 0x00FF00;

            this.setState({
                peers: [conn]
            })
        });
    }

    onCallClick(){
        var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        let peerToConnectTo = this.state.connectToPeer;
        let peer = this.peer;
        getUserMedia({video: true, audio: true}, function(stream) {
            console.log("calling", peerToConnectTo, "...")
            var call = peer.call(peerToConnectTo, stream);
            call.on('stream', function(remoteStream) {
                // Show stream in some video/canvas element.
            });
        }, function(err) {
            console.log('Failed to get local stream' ,err);
        });
    }

    render() {
        return (
            <div>
            <p>My peer ID: {this.state.username}</p>
            <label htmlFor="connectToPeer">Connect To:</label>
            <input name="connectToPeer" onChange={this.handleChange} type="text" defaultValue={this.state.connectToPeer} />
            <button onClick={this.onConnectClick}>Connect</button>
            <button onClick={this.onCallClick}>Call</button>
            <p>{this.state.lastMessage}</p>
            <p>x,y: {this.state.tool.x},{this.state.tool.y}</p>
            </div>
            );
        }
    }