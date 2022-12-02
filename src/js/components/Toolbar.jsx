import React from 'react';
import ColorPanel from './ColorPanel.jsx'

const TOOL_ICONS = {
    brush: 'fa fa-paint-brush',
    line: 'fa fa-stop',
    pencil: 'fa fa-pencil',
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
            <div style={divStyle} onClick={this.click} className={'tool'}>
                <i className={TOOL_ICONS[this.props.name]} />
            </div>
        )
    }
}

/**
 * The toolbar is displays all ui related to the current color status and active tool.
 *
 */
export class Toolbar extends React.Component {

    constructor() {
        super();
        this.state = {
            toolState: {},
            offset: { x: 0, y: 0 },
            resizedPuckYet: false
        };

        this.onToolClick = this.onToolClick.bind(this)
        this.onColorChange = this.onColorChange.bind(this)
        this.onSizeChange = this.onSizeChange.bind(this)
    }

    onToolClick(tool) {
        //FIXME: still keeping state in 2 places
        let toolName = tool.props.name;
        this.props.legacyClient.state.tool = toolName
        this.props.badEventHub.trigger("tool:change");

        this.setState({
            toolState: Object.assign({}, this.props.legacyClient.state, {
                tool: toolName
            })
        })
    }

    onColorChange(color){
        this.props.legacyClient.state.color = color.hex
        this.props.legacyClient.state.opacity = color.rgb.a
        this.props.badEventHub.trigger("tool:change");
    }

    onSizeChange(size){
        this.props.legacyClient.state.size = size
        this.setState({resizedPuckYet: true})
    }

    render() {
        let tiptext = (!this.state.resizedPuckYet ? "Drag Puck to change size" : "");
        return (
            <div className="Toolbar">
                <ColorPanel onColorChange={this.onColorChange} size={this.state.toolState.size} onSizeChange={this.onSizeChange} />
                <p>{tiptext}</p>
                <Tool name="pencil" onClick={this.onToolClick} />
                <Tool name="line" onClick={this.onToolClick} />
                <Tool name="brush" onClick={this.onToolClick} />
                <Tool name="move" onClick={this.onToolClick} />
                <Tool name="spray" onClick={this.onToolClick} />
                <Tool name="eraser" onClick={this.onToolClick} />
                <Tool name="eyedropper" onClick={this.onToolClick} />
            </div>
        );
    }
}

