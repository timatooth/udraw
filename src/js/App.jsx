import React from 'react'
import ReactDOM from 'react-dom'
import DrawingCanvas from './components/DrawingCanvas.jsx'
import Toolbar from './components/Toolbar.jsx'
import EventHub from './EventHub'

import css from '../sass/style.scss'


/**
 * Boots up the app
 * -- boot socket event listener code
 * -- load DrawingCanvas with a registered TileSource such as localStorage, REST API server or... join P2P tile swarm
 * -- add toolbar displaying system status and UI
 * -- an event
 */
export default class App extends React.Component {

    constructor(){
        super();
        this.eventHub = new EventHub();
    }
    render() {
        return (
            <div>
                <DrawingCanvas eventHub={ this.eventHub} />
                <Toolbar eventHub={ this.eventHub } />
            </div>
        );
    }
}

ReactDOM.render(
    <App />,
    document.getElementById('udrawapp')
);
