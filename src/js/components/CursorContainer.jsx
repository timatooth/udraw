import React from 'react'
export class CursorContainer extends React.Component {
    constructor() {
        super();

        //sadly store cursor state here for now :(
        this.state = {
            clientStates: {},
            offsetX: 0,
            offsetY: 0
        }
    }

    componentDidMount(){
        //bad state handling
        this.props.badEventHub.on('clientStates:move', (clientStates, offsetX, offsetY) => {
            this.setState({
                clientStates: clientStates,
                offsetX: offsetX,
                offsetY: offsetY
            })
        })
    }

    renderCursors(clientStates, offsetX, offsetY) {
        return Object.keys(this.state.clientStates).map((clientKey) => {
            let clientState = this.state.clientStates[clientKey]

            var screenX = (clientState.x - 256 - this.state.offsetX) / 2;
            var screenY = (clientState.y - 256 - this.state.offsetY) / 2;

            let style = {
                //transform: "translate(" + (screenX ) + "px, " + (screenY) + "px)"
                left: screenX,
                top: screenY
            }
            return (
                <div className="Cursor" style={style} key={clientKey} />
            )
        })
    }

    render() {
        let {clientStates, offsetX, offsetY} = this.props
        return (
            <div className="CursorContainer">
                {this.renderCursors()}
            </div>
        )
    }
}
