'use strict';
import React from 'react';
import ReactDOM from 'react-dom';
import {Motion, StaggeredMotion, spring} from 'react-motion';
import range from 'lodash.range';

// Diameter of the main button in pixels
const MAIN_BUTTON_DIAM = 48;
const CHILD_BUTTON_DIAM = 48;
// The number of child buttons that fly out from the main button
const NUM_CHILDREN = 4;
// Hard code the position values of the mainButton
const M_X = 30;
const M_Y = 30;

//should be between 0 and 0.5 (its maximum value is difference between scale in finalChildButtonStyles a
// nd initialChildButtonStyles)
const OFFSET = 0.4;

const SPRING_CONFIG = [500, 28];

// How far away from the main button does the child buttons go
const FLY_OUT_RADIUS = 130,
    SEPARATION_ANGLE = 30, //degrees
    FAN_ANGLE = (NUM_CHILDREN - 1) * SEPARATION_ANGLE, //degrees
    BASE_ANGLE = ((-90 - FAN_ANGLE)/2); // degrees

// Names of icons for each button retreived from fontAwesome, we'll add a little extra just in case
// the NUM_CHILDREN is changed to a bigger value
let childButtonIcons = ['pencil', 'paint-brush', 'eraser', 'arrows', 'eyedropper', 'bolt', 'ban', 'code'];

const childButtonsCss = {
    position: 'absolute',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '50px',
    height: '50px',
    borderRadius: '100%',
    backgroundColor: 'white',
    boxShadow: 'rgba(0, 0, 0, 0.2) 0px 1px 3px',
    color: '#8898A5',
}
// Utility functions

function toRadians(degrees) {
    return degrees * 0.0174533;
}

function finalChildDeltaPositions(index) {
    let angle = BASE_ANGLE + (index* SEPARATION_ANGLE);
    return {
        deltaX: FLY_OUT_RADIUS * Math.cos(toRadians(angle)) - (CHILD_BUTTON_DIAM/2),
        deltaY: FLY_OUT_RADIUS * Math.sin(toRadians(angle)) + (CHILD_BUTTON_DIAM/2)
    };
}


class ToolMenu extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            isOpen: false,
            childButtons: [],
            activeIcon: 'pencil'
        };

        // Bind this to the functions
        this.toggleMenu = this.toggleMenu.bind(this);
        this.closeMenu = this.closeMenu.bind(this);
    }

    componentDidMount() {
        window.addEventListener('click', this.closeMenu);
        let childButtons = [];
        this.setState({childButtons: childButtons.slice(0)});
    }

    mainButtonStyles() {
        const mainButtonCss = {
            position: 'relative',
            width: '90px',
            height: '90px',
            borderRadius: '100%',
            backgroundColor: '#68AEF0',
            cursor: 'pointer',
            display: 'flex',
            justifyContent : 'center',
            alignItems: 'center',
            color: '#ffffff',
            fontWeight: 'lighter',
            border: '1px solid rgba(0, 0, 0, 0.1)'
        }

        return Object.assign({}, mainButtonCss, {
            width: MAIN_BUTTON_DIAM,
            height: MAIN_BUTTON_DIAM,
            top: M_Y - (MAIN_BUTTON_DIAM/2),
            left: M_X - (MAIN_BUTTON_DIAM/2)
        });
    }

    initialChildButtonStyles() {
        return {
            width: CHILD_BUTTON_DIAM,
            height: CHILD_BUTTON_DIAM,
            top: spring(M_Y - (CHILD_BUTTON_DIAM/2), SPRING_CONFIG),
            left: spring(M_X - (CHILD_BUTTON_DIAM/2), SPRING_CONFIG),
            rotate: spring(-180, SPRING_CONFIG),
            scale: spring(0.5, SPRING_CONFIG)
        };
    }

    finalChildButtonStyles(childIndex) {
        let {deltaX, deltaY} = finalChildDeltaPositions(childIndex);
        return {
            width: CHILD_BUTTON_DIAM,
            height: CHILD_BUTTON_DIAM,
            top: spring(M_Y - deltaY, SPRING_CONFIG),
            left: spring(M_X + deltaX, SPRING_CONFIG),
            rotate: spring(0, SPRING_CONFIG),
            scale: spring(1, SPRING_CONFIG)
        };
    }

    toggleMenu(e) {
        e.stopPropagation();
        let{isOpen} = this.state;
        this.setState({
            isOpen: !isOpen
        });
    }

    closeMenu() {
        this.setState({ isOpen: false});
    }

    renderChildButtons() {
        const {isOpen} = this.state;
        const targetButtonStyles = range(NUM_CHILDREN).map(i => {
            return isOpen ? this.finalChildButtonStyles(i) : this.initialChildButtonStyles();
        });

        const scaleMin = this.initialChildButtonStyles().scale.val;
        const scaleMax = this.finalChildButtonStyles(0).scale.val;

        let calculateStylesForNextFrame = prevFrameStyles => {
            prevFrameStyles = isOpen ? prevFrameStyles : prevFrameStyles.reverse();

            let nextFrameTargetStyles =  prevFrameStyles.map((buttonStyleInPreviousFrame, i) => {
                //animation always starts from first button
                if (i === 0) {
                    return targetButtonStyles[i];
                }

                const prevButtonScale = prevFrameStyles[i - 1].scale;
                const shouldApplyTargetStyle = () => {
                    if (isOpen) {
                        return prevButtonScale >= scaleMin + OFFSET;
                    } else {
                        return prevButtonScale <= scaleMax - OFFSET;
                    }
                };

                return shouldApplyTargetStyle() ? targetButtonStyles[i] : buttonStyleInPreviousFrame;
            });

            return isOpen ? nextFrameTargetStyles : nextFrameTargetStyles.reverse();
        };

        return (
            <StaggeredMotion
                defaultStyles={targetButtonStyles}
                styles={calculateStylesForNextFrame}>
                {interpolatedStyles =>
                    <div>
                        {interpolatedStyles.map(({height, left, rotate, scale, top, width}, index) =>
                            <div
                                className="child-button"
                                key={index}
                                onClick={(i) => this.setState({activeIcon: childButtonIcons[index]})}
                                style={Object.assign({}, childButtonsCss, {
									left,
									height,
									top,
									transform: `rotate(${rotate}deg) scale(${scale})`,
									width
								})}
                            >
                                <i className={"fa fa-" + childButtonIcons[index] + " fa-lg"}></i>
                            </div>
                        )}
                    </div>
                }
            </StaggeredMotion>
        );
    }

    render() {
        let {isOpen} = this.state;
        let mainButtonRotation = isOpen ? {rotate: spring(0, [500, 30])} : {rotate: spring(-135, [500, 30])};
        return (
            <div>
                {this.renderChildButtons()}
                <Motion style={mainButtonRotation}>
                    {({rotate}) =>
                        <div
                            className="main-button"
                            style={this.mainButtonStyles()}
                            onClick={this.toggleMenu}>
                            <i className={"fa fa-" + this.state.activeIcon + " fa-2x"} />
                        </div>
                    }
                </Motion>
            </div>
        );
    }
};

module.exports = ToolMenu;
