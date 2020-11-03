import * as PIXI from 'pixi.js';

import ReactDOM from 'react-dom'
import React from 'react'
import {UdrawApp} from './app.jsx'

import './style.css';


const app = new PIXI.Application({
    backgroundColor: 0x1099bb,
    width: window.innerWidth,
    height: window.innerHeight
});
app.stage.interactive = true;
document.body.appendChild(app.view);


ReactDOM.render(
    <UdrawApp pixiApp={app} />,
    document.getElementById('root')
);