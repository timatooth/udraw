import React from 'react'
import ReactDOM from 'react-dom'
import DrawingCanvas from './components/DrawingCanvas.jsx'
import Toolbar from './components/Toolbar.jsx'

import css from '../sass/style.scss'


/**
 * Boots up the app
 * -- boot socket event listener code
 * -- load DrawingCanvas with a registered TileSource such as localStorage, REST API server or... join P2P tile swarm
 * -- add toolbar displaying system status and UI
 */
export default class App extends React.Component {

    constructor(){
        super();

    }
    render() {
        return (
            <div>
                <DrawingCanvas />
                <Toolbar />
            </div>
        );
    }
}

ReactDOM.render(
    <App />,
    document.getElementById('udrawapp')
);
