import React from 'react';

export default class Toolbar extends React.Component {
    render() {
        return (
            <div className="toolbar">
                <div className="tool tool-button line-tool" data-name ='line' title="Tools!"><i className="fa fa-pencil"></i></div>
                <div className="move-tool active" data-name ='move' title="Mighty move tool!"><i className="icon ion-arrow-move"></i></div>
                <div className="tool-rack hidden">
                    <div className="tool line-tool" data-name ='line' title="Tools!"><i className="fa fa-pencil"></i></div>
                    <div className="tool brush-tool" data-name ='brush' title="Wrecked Paintbrush!"><i className="fa fa-paint-brush"></i></div>
                    <div className="tool spray-tool" data-name ='spray' title="Filthy Spraycan!"><i className="fa fa-certificate"></i></div>
                    <div className="tool eraser-tool" data-name ='eraser' title="Dodgy Eraser!"><i className="fa fa-eraser"></i></div>
                    <div className="tool eyedropper-tool" data-name ='eyedropper' title="Color Picker!"><i className="fa fa-eyedropper"></i></div>
                </div>

                <div id="colorbutton"><i className="icon ion-ios-circle-filled"></i></div>
                <div className="panel-tool brush-tools" title="Brush Tools!"><i className="icon ion-ios-settings-strong"></i></div>
                <div className="panel-tool fullscreen" title="Full Screen!"><i className="icon ion-arrow-expand"></i></div>
                <div className="panel-tool status-info" title="Status"><i className="icon ion-ios-information-outline"></i></div>
                <div id="offset-label" title="offset!">0,0</div>
            </div>
        );
    }
}