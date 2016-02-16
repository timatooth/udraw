import React from 'react'
import ReactDOM from 'react-dom'
import DrawingCanvas from './components/DrawingCanvas.jsx'
import Toolbar from './components/Toolbar.jsx'

import css from '../sass/style.scss'

export default class App extends React.Component {
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
