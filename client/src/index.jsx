import * as PIXI from 'pixi.js';
import React from 'react'
import { StrictMode } from 'react';

import { createRoot } from 'react-dom/client';
import {UdrawApp} from './app.jsx'

import './style.css';


const app = new PIXI.Application({
    backgroundColor: 0x1099bb,
    width: window.innerWidth,
    height: window.innerHeight
});
app.stage.interactive = true;
document.body.appendChild(app.view);


const container = document.getElementById('root');
const root = createRoot(container);
root.render( <StrictMode><UdrawApp pixiApp={app} /> </StrictMode>);
