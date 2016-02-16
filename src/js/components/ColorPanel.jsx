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
        this.setState({
            displayColorPicker: !this.state.displayColorPicker, //toggle display. re calls render
        });
    }

    handleColorChange(color){
        this.setState({
            color: color.rgb
        })
    }

    render() {
        var colorString = 'rgba(' + this.state.color.r + ', ' + this.state.color.g + ', ' + this.state.color.b + ', ' + this.state.color.a + ')';
        var buttonStyle = {
            color: colorString,
            fontSize: '4em'
        }

        return (
            <div>
                <div onClick={this.handleColorButtonClick } style={buttonStyle}><i className="icon ion-ios-circle-filled"></i></div>
                <ColorPicker color={ this.state.color }
                             display={ this.state.displayColorPicker }
                             onChange={ this.handleColorChange }
                             type="chrome"
                />
            </div>
        );
    }
}