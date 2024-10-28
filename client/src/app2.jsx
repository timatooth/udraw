import React, { useState, useEffect, useCallback, useRef } from 'react';
import Peer from 'peerjs';
import * as PIXI from 'pixi.js';
//import { Channel } from 'phoenix';
import Pointer from './images/pointer.png';

const TILE_SIZE = 256;
const API_URL = "http://localhost:4000/api/canvases/main/1";

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export const UdrawApp2 = ({ pixiApp }) => {
    const [username] = useState(uuidv4());
    const [connectToPeer, setConnectToPeer] = useState('');
    const [lastMessage, setLastMessage] = useState('(no message yet)');
    const [tool, setTool] = useState({ x: 0, y: 0 });
    const [peers, setPeers] = useState([]);
    const [tileCache, setTileCache] = useState({});

    const peerRef = useRef(null);
    const channelRef = useRef(null);

    useEffect(() => {
        peerRef.current = new Peer(username);
        setupPeerListeners();
        setupPixiApp();
        setupPhoenixChannel();

        return () => {
            peerRef.current.destroy();
        };
    }, []);

    const setupPeerListeners = () => {
        peerRef.current.on('connection', handlePeerConnection);
        peerRef.current.on('call', handleIncomingCall);
    };

    const setupPixiApp = () => {
        pixiApp.stage.interactive = true;
        pixiApp.stage.on('pointermove', handlePointerMove);
        loadTiles();
    };

    const setupPhoenixChannel = () => {
        // Setup Phoenix channel connection
        // Update channelRef.current with the new channel
    };

    const loadTiles = useCallback(() => {
        const extentWidth = window.innerWidth / TILE_SIZE;
        const extentHeight = window.innerHeight / TILE_SIZE;
        const offsetX = -Math.floor(pixiApp.stage.position.x / TILE_SIZE);
        const offsetY = -Math.floor(pixiApp.stage.position.y / TILE_SIZE);

        for (let x = offsetX - 1; x < offsetX + extentWidth + 1; x++) {
            for (let y = offsetY - 1; y < offsetY + extentHeight + 1; y++) {
                const tileUri = `${API_URL}/${x}/${y}.png`;
                if (!tileCache[tileUri]) {
                    createTileSprite(tileUri, x, y);
                }
            }
        }
    }, [pixiApp.stage.position, tileCache]);

    const createTileSprite = async (tileUri, x, y) => {
        try {
            const texture = await PIXI.Assets.load(tileUri);
            const tile = new PIXI.Sprite(texture);
            const container = new PIXI.Container();
            
            container.addChild(tile);
            container.x = TILE_SIZE * x;
            container.y = TILE_SIZE * y;
            
            const basicText = new PIXI.Text({text:`(${x}, ${y})`});
            console.log("adding text child")
            container.addChild(basicText);
            
            pixiApp.stage.addChild(container);
            setTileCache(prev => ({ ...prev, [tileUri]: true }));
        } catch (error) {
            console.error('Failed to load texture:', error);
        }
    };

    const handlePointerMove = useCallback((event) => {
        const local = pixiApp.stage.toLocal(event.data.global);
    
        if (event.data.buttons > 0) {
            const dX = local.x - tool.x; // Use the current local coordinates
            const dY = local.y - tool.y; // Use the current local coordinates
            pixiApp.stage.position.x -= dX;
            pixiApp.stage.position.y -= dY;
        } else {
            peers.forEach(p => p.send({ m: { x: local.x, y: local.y } }));
            channelRef.current?.push('cursor_move', { x: local.x, y: local.y });
        }
    
        console.log(`setting tool x ${local.x}, ${local.y}`);
        setTool({ x: local.x, y: local.y });
    
    }, [tool, peers]);

    const handlePeerConnection = useCallback((conn) => {
        conn.on('data', handlePeerData);
        conn.on('open', () => {
            addPeerCursor(conn.peer);
            setPeers(prev => [...prev, conn]);
        });
    }, []);

    const handlePeerData = useCallback((data) => {
        setLastMessage(JSON.stringify(data));
        if (data.m) {
            const cursor = pixiApp.stage.getChildByName(data.peer);
            if (cursor) {
                cursor.x = data.m.x;
                cursor.y = data.m.y;
            }
        }
    }, []);

    const addPeerCursor = useCallback((peerId) => {
        const pointer = PIXI.Sprite.from(Pointer);
        pointer.name = peerId;
        pointer.anchor.set(0.5);
        pointer.x = 50;
        pointer.y = 50;
        const basicText = new PIXI.Text(peerId);
        pointer.addChild(basicText);
        pixiApp.stage.addChild(pointer);
    }, []);

    const handleIncomingCall = useCallback((call) => {
        getUserMedia({ video: true, audio: true }, (stream) => {
            call.answer(stream);
            call.on('stream', (remoteStream) => {
                addVideoStreamToStage(remoteStream, call.peer);
            });
        }, (err) => console.log('Failed to get local stream', err));
    }, []);

    const addVideoStreamToStage = useCallback((stream, peerId) => {
        const videoElement = document.createElement('video');
        videoElement.srcObject = stream;
        videoElement.autoplay = true;
        const videoSprite = PIXI.Sprite.from(videoElement);
        videoSprite.anchor.set(0.5);
        videoSprite.width = 133;
        videoSprite.height = 100;
        videoSprite.x = 0;
        videoSprite.y = 100;
        const container = pixiApp.stage.getChildByName(peerId);
        container.addChild(videoSprite);
    }, []);

    const handleConnectClick = useCallback(() => {
        const conn = peerRef.current.connect(connectToPeer);
        conn.on('open', () => {
            setPeers(prev => [...prev, conn]);
        });
    }, [connectToPeer]);

    const handleCallClick = useCallback(() => {
        getUserMedia({ video: true, audio: true }, (stream) => {
            const call = peerRef.current.call(connectToPeer, stream);
            call.on('stream', (remoteStream) => {
                addVideoStreamToStage(remoteStream, connectToPeer);
            });
        }, (err) => console.log('Failed to get local stream', err));
    }, [connectToPeer]);

    return (
        <div>
            <p>My peer ID: {username}</p>
            <label htmlFor="connectToPeer">Connect To:</label>
            <input
                name="connectToPeer"
                onChange={(e) => setConnectToPeer(e.target.value)}
                type="text"
                value={connectToPeer}
            />
            <button onClick={handleConnectClick}>{peers.length > 0 ? "Connected" : "Connect"}</button>
            <button onClick={handleCallClick}>Call</button>
            <p>{lastMessage}</p>
            <p>x,y: {tool.x},{tool.y}</p>
        </div>
    );
};

function getUserMedia(constraints, success, error) {
    (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia)
        .call(navigator, constraints, success, error);
}