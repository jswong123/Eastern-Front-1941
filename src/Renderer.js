import {
    hexToPixel,
    drawHexPath
} from "./Hex.js";


import {
    MilitarySymbolRenderer
} from "./MilitarySymbolRenderer.js";


export class Renderer {

    constructor(
        canvas,
        world
    ) {

        this.canvas =
            canvas;

        this.ctx =
            canvas.getContext("2d");


        this.world =
            world;


        this.hexSize = 28;


        this.camera = {

            x: 80,
            y: 80,

            zoom: 1

        };


        this.symbolRenderer =
            new MilitarySymbolRenderer(
                this.ctx
            );


        this.resize();

    }


    resize() {

        const rect =
            this.canvas
            .getBoundingClientRect();


        const ratio =
            window.devicePixelRatio || 1;


        this.canvas.width =
            rect.width * ratio;


        this.canvas.height =
            rect.height * ratio;


        this.ctx.setTransform(
            ratio,
            0,
            0,
            ratio,
            0,
            0
        );


        this.width =
            rect.width;

        this.height =
            rect.height;

    }


    terrainColor(type) {

        switch (type) {

            case "forest":
                return "#66745b";

            case "river":
                return "#718b99";

            case "town":
                return "#a69a7c";

            default:
                return "#aaa987";

        }

    }


    worldToScreen(q, r) {

        const p =
            hexToPixel(
                q,
                r,
                this.hexSize
            );


        return {

            x:
                this.camera.x +
                p.x *
                this.camera.zoom,

            y:
                this.camera.y +
                p.y *
                this.camera.zoom

        };

    }


    drawMap() {

        const ctx =
            this.ctx;


        const size =
            this.hexSize *
            this.camera.zoom;


        for (
            let r = 0;
            r < this.world.height;
            r++
        ) {

            for (
                let q = 0;
                q < this.world.width;
                q++
            ) {

                const position =
                    this.worldToScreen(
                        q,
                        r
                    );


                /*
                 * 屏幕外不绘制
                 */

                if (
                    position.x < -size ||
                    position.y < -size ||
                    position.x > this.width + size ||
                    position.y > this.height + size
                ) {

                    continue;

                }


                const terrain =
                    this.world.terrainAt(
                        q,
                        r
                    );


                drawHexPath(
                    ctx,
                    position.x,
                    position.y,
                    size
                );


                ctx.fillStyle =
                    this.terrainColor(
                        terrain
                    );


                ctx.fill();


                ctx.strokeStyle =
                    "rgba(40,40,32,0.35)";

                ctx.lineWidth = 1;

                ctx.stroke();

            }

        }

    }


    drawUnits(units) {

        for (
            const unit
            of units
        ) {

            const position =
                this.worldToScreen(
                    unit.q,
                    unit.r
                );


            this.symbolRenderer.draw(

                unit,

                position.x,
                position.y,

                Math.max(
                    0.75,
                    this.camera.zoom
                )

            );

        }

    }


    render(units) {

        this.ctx.clearRect(
            0,
            0,
            this.width,
            this.height
        );


        this.drawMap();

        this.drawUnits(
            units
        );

    }

}
