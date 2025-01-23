const getCoordinatesFromEvent = (evt) => {
    let x, y, touchPanning = false;

    if (evt.type === "touchmove") {
        evt.preventDefault();
        x = evt.touches[0].clientX * ratio + tileSize;
        y = evt.touches[0].clientY * ratio + tileSize;
        if (evt.touches.length > 1) {
            touchPanning = true;
        }
    } else {
        x = evt.offsetX * ratio;
        y = evt.offsetY * ratio;
    }

    return { x, y, touchPanning };
};

const Hooks = {
    Canvas: {
      mounted() {
        console.log("mounted canvas");
        this.canvas = this.el;
        this.ctx = canvas.getContext('2d');
        
        // Get tool state from LiveView server
        this.toolState = JSON.parse(this.el.dataset.toolState);
        this.canvasState = JSON.parse(this.el.dataset.canvasState);
  
        // Set up canvas size
        const tileSize = 256;
        canvas.width = window.innerWidth + tileSize * 2;
        canvas.height = window.innerHeight + tileSize * 2;

        this.setupEventListeners();
      },
      updated() {
        console.log("updated canvas");
        const newToolState = JSON.parse(this.el.dataset.toolState);
        this.toolState = newToolState;
        console.log(this.toolState);
      },
      setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDownOrTouchStart(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMoveOrTouchMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUpOrTouchEnd(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseUpOrTouchEnd(e));
  
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.handleMouseDownOrTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleMouseMoveOrTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.handleMouseUpOrTouchEnd(e));
        this.canvas.addEventListener('touchcancel', (e) => this.handleMouseUpOrTouchEnd(e));
      },
      handleMouseDownOrTouchStart(evt) {
      },
      handleMouseMoveOrTouchMove(evt) {
      },
      handleMouseUpOrTouchEnd(evt) {
      }
    }
  }
  
  export default Hooks;