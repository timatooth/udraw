import React from 'react'
//import ReactDOM from 'react-dom'
//import DrawingCanvas from './components/DrawingCanvas.jsx'
import {CursorContainer} from './components/CursorContainer.jsx'
import {Toolbar} from './components/Toolbar.jsx'
//import EventHub from './EventHub'
//import WebSocketConnection from './net/WebSocketConnection'

import css from '../sass/style.scss'

/**
 * Boots up the app
 * -- boot socket event listener code
 * -- load DrawingCanvas with a registered TileSource such as localStorage, REST API server or... join P2P tile swarm
 * -- add toolbar displaying system status and UI
 * -- an event
 */
export class UdrawApp extends React.Component {

    constructor(){
        super();
        //this.eventHub = new EventHub();
        //this.netConnection = new WebSocketConnection({eventHub: this.eventHub})
        //this.updateState = this.updateState.bind(this);
    }

    componentDidMount(){
        //subscribe renders
    }

    render() {
        let {store, legacyClient, clientStates, badEventHub} = this.props
        console.log(badEventHub)
        return (
            <div>
                <CursorContainer store={store} clientStates={clientStates} badEventHub={ badEventHub} />
                <canvas id="paper" width="640" height="640"></canvas>
                <Toolbar legacyClient={legacyClient} />
            </div>
        );
    }
}
