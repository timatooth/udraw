import { Application } from 'pixi.js';
import React from 'react'
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { UdrawApp } from './app.jsx'

import './style.css';

const options = {
    backgroundColor: 0x1099bb,
    width: window.innerWidth,
    height: window.innerHeight,
    //resolution: window.devicePixelRatio || 1,
};

const app = new Application();
await app.init(options);

app.stage.interactive = true;
document.body.appendChild(app.canvas);

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
    <StrictMode>
        <UdrawApp pixiApp={app} />
    </StrictMode>
);