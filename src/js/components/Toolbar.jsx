import React from 'react';
import ColorPanel from './ColorPanel.jsx'
import ToolMenu from './ToolMenu.jsx'

const TOOL_ICONS = {
    brush: 'fa fa-paint-brush',
    line: 'fa fa-pencil',
    move: 'icon ion-arrow-move',
    spray: 'fa fa-certificate',
    eraser: 'fa fa-eraser',
    eyedropper: 'fa fa-eyedropper'
}

class Tool extends React.Component {
    constructor(){
        super();
        this.click = this.click.bind(this);
    }

    click(evt){
       this.props.onClick(this, evt)
    }

    render(){
        let active = this.props.active || false;
        let divStyle = {
            fontSize: '3em',
            marginTop: '0.2em',
            marginBottom: '0.2em',
            textShadow: (active ? '0px 0px 10px #0DB6FF': 'none')
        };

        return (
            <div style={ divStyle } onClick={ this.click } className={ 'tool' }>
                <i className={ TOOL_ICONS[this.props.name] } />
            </div>
        )
    }
}

/**
 * The toolbar is displays all ui related to the current color status and active tool.
 *
 */
export class Toolbar extends React.Component {

    constructor(){
        super();
        this.state = {
            toolState: {},
            offset: {x: 0, y: 0}
        };

        this.onToolClick = this.onToolClick.bind(this)
        this.onColorChange = this.onColorChange.bind(this)
    }

    componentDidMount() {
        //temp hacky observer to bridge the jquery and old state over
        setInterval(() => {
            let {legacyClient} = this.props
            this.prev = this.prev || Object.assign({}, legacyClient);

            if(JSON.stringify(this.prev) !== JSON.stringify(legacyClient) ){
                this.prev = Object.assign({}, legacyClient);
                this.setState({
                    offset: {
                        x: legacyClient.offsetX,
                        y: legacyClient.offsetY
                    },
                    toolState: legacyClient.state
                })
            }
        }, 10); //woo polling!
    }

    onToolClick(tool){
        this.props.legacyClient.state.tool = tool.props.name;

        this.setState({
            toolState: Object.assign({}, this.props.legacyClient.state, {
                tool: tool.props.name
            })
        })
    }

    onColorChange(color){
        this.props.legacyClient.state.color = '#' + color.hex
    }

    render() {
        let activeTool = this.state.toolState.tool;
        return (
            <div className="toolbar">
                <ToolMenu />
                <ColorPanel onColorChange={this.onColorChange} size={this.state.toolState.size } />
                <div>
                    {this.state.offset.x + ", " + this.state.offset.y }
                </div>
            </div>
            //<div className="toolbar">
            //    <div className="tool tool-button line-tool" data-name ='line' title="Tools!"><i className="fa fa-pencil"></i></div>
            //    <div className="move-tool active" data-name ='move' title="Mighty move tool!"><i className="icon ion-arrow-move"></i></div>
            //    <div className="tool-rack hidden">
            //        <div className="tool line-tool" data-name ='line' title="Tools!"><i className="fa fa-pencil"></i></div>
            //        <div className="tool brush-tool" data-name ='brush' title="Wrecked Paintbrush!"><i className="fa fa-paint-brush"></i></div>
            //        <div className="tool spray-tool" data-name ='spray' title="Filthy Spraycan!"><i className="fa fa-certificate"></i></div>
            //        <div className="tool eraser-tool" data-name ='eraser' title="Dodgy Eraser!"><i className="fa fa-eraser"></i></div>
            //        <div className="tool eyedropper-tool" data-name ='eyedropper' title="Color Picker!"><i className="fa fa-eyedropper"></i></div>
            //    </div>
            //
            //    <ColorPanel />
            //
            //    <div className="panel-tool brush-tools" title="Brush Tools!"><i className="icon ion-ios-settings-strong"></i></div>
            //    <div className="panel-tool fullscreen" title="Full Screen!"><i className="icon ion-arrow-expand"></i></div>
            //    <div className="panel-tool status-info" title="Status"><i className="icon ion-ios-information-outline"></i></div>
            //    <div id="offset-label" title="offset!">{this.state.offset.x + ", " + this.state.offset.y }</div>
            //</div>
        );
    }
}
//
//Toolbar.propTypes = {
//    eventHub: React.PropTypes.object.isRequired
//};
