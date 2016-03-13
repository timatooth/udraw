import React from 'react'
import ColorPicker from 'react-color'

export default class ColorPanel extends React.Component {

    constructor() {
        super();

        //initial state is closed color picker
        this.state = {
            displayColorPicker: false,
            color: { r: 51, g: 51, b: 51, a: 1 }
        };

        this.handleColorButtonClick = this.handleColorButtonClick.bind(this);
        this.handleColorChange = this.handleColorChange.bind(this);
    }

    handleColorButtonClick() {
        console.log("button click");
        this.setState({
            displayColorPicker: !this.state.displayColorPicker, //toggle display. re calls render
            mouseDownOnPuck: true
        });
    }

    handleMouseMove(evt){

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
            fontSize: this.props.size + 'px'
        };

        return (
            <div>
                <div onClick={this.handleColorButtonClick } style={buttonStyle}><i className="icon ion-ios-circle-filled" /></div>
                <ColorPicker color={ this.state.color }
                             display={ this.state.displayColorPicker }
                             onChange={ this.handleColorChange }
                             onClose={ () => this.setState({displayColorPicker: !this.state.displayColorPicker}) }
                             type="chrome"
                />
            </div>
        );
    }
}