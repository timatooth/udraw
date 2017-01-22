import React from 'react';
import ColorPanel from './ColorPanel.jsx'
import {ToolMenu} from './ToolMenu.jsx'

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
        this.onSizeChange = this.onSizeChange.bind(this)
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

    onToolClick(toolName){
        //Problem: still keeping state in 2 places
        this.props.legacyClient.state.tool = toolName

        this.setState({
            toolState: Object.assign({}, this.props.legacyClient.state, {
                tool: toolName
            })
        })
    }

    onColorChange(color){
        this.props.legacyClient.state.color = color.hex
        this.props.legacyClient.state.opacity = color.rgb.a
    }

    onSizeChange(size){
        this.props.legacyClient.state.size = size
    }

    render() {
        let activeTool = this.state.toolState.tool;
        return (
            <div className="Toolbar">
                <ToolMenu onToolClick={this.onToolClick} />
                <ColorPanel onColorChange={this.onColorChange} size={this.state.toolState.size } onSizeChange={this.onSizeChange} />
                <div className="noselect">
                    {this.state.offset.x + ", " + this.state.offset.y }
                </div>
            </div>
        );
    }
}
//
//Toolbar.propTypes = {
//    eventHub: React.PropTypes.object.isRequired
//};
