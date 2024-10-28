import React from 'react'
import {Toolbar} from './components/Toolbar.jsx'

export class UdrawApp extends React.Component {

    constructor(){
        super();
    }

    render() {
        let {legacyClient} = this.props

        return (
            <div>
                <canvas id="paper" width="640" height="640"></canvas>
                <Toolbar legacyClient={legacyClient} />
            </div>
        );
    }
}
