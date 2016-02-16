import React from 'react';
import ReactDOM from 'react-dom';

import TileSource from '../TileSource'

/**
 * All mouse move events and draw code goes here maybe
 *
 * takes properties for onPan, onMouseMove, offset, tileSize, pixelRatio
 */
export default class DrawingCanvas extends React.Component {

    constructor(){
        super();
        this.tileSource = new TileSource.LocalStorageTileSource({debug: false});
        this.state = {
            width: 640, //some defaults for the actual dom element
            height: 640
        }

        //use our own state holder for factors concerning canvas context rendering
        this.canvasState = {
            offset: {x: 0, y: 0},
            lastCoord: {x: 0, y: 0},
            m1Down: false
        }

        //bind drawTile to `this` so it can access the component's cached canvas context
        this.drawTile = this.drawTile.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
    }

    //initial setup needs to get the pixel ratio then update according to window size straight after
    componentDidMount(){
        this.domElement = ReactDOM.findDOMNode(this);
        this.ctx = this.domElement.getContext('2d');
        window.addEventListener('resize', this.handleResize);
        this.handleResize();
    }

    /* if the render() was called, a new html canvas context must be feteched */
    componentDidUpdate(){
        this.ctx = this.domElement.getContext('2d');
        this.drawTiles();
    }

    /**
     * Draw an individual PNG tile to the canvas. This function's lexical this is bound to the DrawingCanvas
     * @param code HTTP style success code from the tileSource
     * @param tile Tile object containing image data
     */
    drawTile(code, tile){
        var tileSize = this.props.tileSize;
        if (code === 200) {
            var destinationX = (tile.x * tileSize) - this.canvasState.offset.x;
            var destinationY = (tile.y * tileSize) - this.canvasState.offset.y;
            this.ctx.drawImage(tile.canvas, 0, 0, tileSize, tileSize, destinationX, destinationY, tileSize, tileSize);
        } else if (code === 416) {
            this.ctx.drawImage(tile.canvas, 0, 0, tileSize, tileSize, destinationX, destinationY, tileSize, tileSize);
            notify("Tile Fetch Error", "Have you gone too far out?", "error");
        }
    }

    //tile grid loop, fetches tiles from source and calls given callback
    drawTiles() {
        console.log("drawtiles call")
        this.ctx.clearRect(0, 0, this.state.width, this.state.height);
        var x, y, xTile, yTile;
        let tileSize = this.props.tileSize;

        for (y = this.canvasState.offset.y; y < this.canvasState.offset.y + this.state.height + tileSize * 2; y += tileSize) {
            for (x = this.canvasState.offset.x; x < this.canvasState.offset.x + this.state.width + tileSize * 2; x += tileSize) {
                xTile = Math.floor(x / tileSize);
                yTile = Math.floor(y / tileSize);
                this.tileSource.fetchTileAt(xTile, yTile, this.drawTile);
            }
        }
    }

    computePixelRatio(){
        let ctx = this.ctx;
        var devicePixelRatio = window.devicePixelRatio || 1;
        var backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
            ctx.mozBackingStorePixelRatio ||
            ctx.msBackingStorePixelRatio ||
            ctx.oBackingStorePixelRatio ||
            ctx.backingStorePixelRatio || 1;


        return devicePixelRatio / backingStoreRatio;
    }

    /* Event handling */
    handleResize() {
        //establish window height and pixel ratio and redraw
        let pixelRatio = this.computePixelRatio();
        var width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0) * pixelRatio;
        var height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) * pixelRatio;

        this.setState({ //will trigger render() and drawTiles()
            width: width,
            height: height
        });
    }

    setCanvasState(values){

    }

    onMouseDown(){
        this.canvasState.offset.x += 3;
        this.drawTiles();
    }

    onMouseUp(){

    }

    onMouseMove(evt){
        //console.log("mouseMove")
        //console.log(evt.clientX + ", " + evt.clientY);
    }


    render() {
        console.log("render");
        return (
            <canvas
                width={this.state.width}
                height={this.state.height}
                onMouseDown={this.onMouseDown}
                onMouseMove={this.onMouseMove}
                onTouchMove={this.onMouseMove}
            />
        );
    }
}

DrawingCanvas.propTypes = { tileSize: React.PropTypes.number };
DrawingCanvas.defaultProps = {
    tileSize: 256
};