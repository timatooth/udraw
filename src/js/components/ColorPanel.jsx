import React from 'react'
//import ColorPicker from 'react-color'
import ChromePicker from 'react-color'

//wrapper for old react-color behaviour which is now missing the display prop
function ReactColorPanel(props){
    if(props.display) {
        return (
            <ChromePicker
                color={ props.color }
                onChangeComplete={ props.onChangeComplete }
                onChange={ props.onChange } />
        )
    }

    return null;
}

export default class ColorPanel extends React.Component {

    constructor() {
        super();

        this.state = {
            displayColorPicker: false,
            color: { r: 51, g: 51, b: 51, a: 1 },
            mouseDownOnPuck: false,
            currentPuckPos: {x: 0, y: 0},
            size: 40,
            didChangeSize: false
        };

        this.onColorButtonMouseDown = this.onColorButtonMouseDown.bind(this);
        this.onColorButtonMouseUp = this.onColorButtonMouseUp.bind(this);
        this.handleColorChange = this.handleColorChange.bind(this);
        this.handleGlobalMouseMovePuckTarget = this.handleGlobalMouseMovePuckTarget.bind(this);
    }

    onColorButtonMouseDown(evt) {
        this.setState({
            //displayColorPicker: !this.state.displayColorPicker, //toggle display. re calls render
            mouseDownOnPuck: true,
            currentPuckPos: {
                x: evt.clientX,
                y: evt.clientY
            }
        });
        window.addEventListener('mousemove', this.handleGlobalMouseMovePuckTarget)
        window.addEventListener('touchmove', this.handleGlobalMouseMovePuckTarget)
        window.addEventListener('mouseup', this.onColorButtonMouseUp)
        window.addEventListener('touchend', this.onColorButtonMouseUp)
    }

    onColorButtonMouseUp(){

        if(this.state.didChangeSize){
            this.props.onSizeChange(this.state.size)
        }

        this.setState({
            displayColorPicker: !this.state.displayColorPicker && !this.state.didChangeSize,
            mouseDownOnPuck: false,
            didChangeSize: false
        });

        window.removeEventListener('mousemove', this.handleGlobalMouseMovePuckTarget)
        window.removeEventListener('touchmove', this.handleGlobalMouseMovePuckTarget)
        window.removeEventListener('mouseup', this.onColorButtonMouseUp)
        window.removeEventListener('touchend', this.onColorButtonMouseUp)
    }

    handleGlobalMouseMovePuckTarget(evt){
        let x, y, dX, dY;

        if (evt instanceof TouchEvent) {
            x = evt.touches[0].clientX
            y = evt.touches[0].clientY
        } else {
            x = evt.clientX
            y = evt.clientY
        }

        dX = x - this.state.currentPuckPos.x
        dY = y - this.state.currentPuckPos.y

        //compute size
        let proposedSize = this.state.size + dY + dX

        this.setState({
            currentPuckPos: {x, y},
            size: ((proposedSize > 2 && proposedSize <= 120) ? proposedSize : this.state.size),
            didChangeSize: true
        })
    }

    handleColorChange(color){
        this.setState({
            color: color.rgb
        });
        this.props.onColorChange(color)
    }

    render() {
        var colorString = 'rgba(' + this.state.color.r + ', ' + this.state.color.g + ', ' + this.state.color.b + ', ' + this.state.color.a + ')';
        var buttonStyle = {
            color: colorString,
            fontSize: ( (this.state.size > 10) ? this.state.size + 'px' : '10px'),
            marginTop: '20px',
            //cursor: 'all-scroll'
        };

        return (
            <div>
                <div className="noselect"
                    onMouseDown={this.onColorButtonMouseDown}
                    onTouchStart={this.onColorButtonMouseDown}
                    style={buttonStyle}>
                    <i className="noselect icon ion-ios-circle-filled"/>
                </div>
                <ReactColorPanel
                    color={this.state.color}
                    display={this.state.displayColorPicker}
                    onChangeComplete={ () => this.setState({displayColorPicker: !this.state.displayColorPicker}) }
                    onChange={this.handleColorChange} />
            </div>
        );
    }
}