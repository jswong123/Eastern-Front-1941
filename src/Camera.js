export class Camera {

    constructor() {
        this.x = 80;
        this.y = 80;

        this.zoom = 1;

        this.minZoom = 0.45;
        this.maxZoom = 2.2;

        this.dragging = false;

        this.lastX = 0;
        this.lastY = 0;
    }


    startDrag(x, y) {
        this.dragging = true;

        this.lastX = x;
        this.lastY = y;
    }


    drag(x, y) {

        if (!this.dragging) {
            return false;
        }

        const dx = x - this.lastX;
        const dy = y - this.lastY;

        this.x += dx;
        this.y += dy;

        this.lastX = x;
        this.lastY = y;

        return true;
    }


    endDrag() {
        this.dragging = false;
    }


    changeZoom(delta) {

        const factor =
            delta < 0
                ? 1.1
                : 0.9;

        this.zoom *= factor;

        this.zoom = Math.max(
            this.minZoom,
            Math.min(
                this.maxZoom,
                this.zoom
            )
        );

        return this.zoom;
    }

}
