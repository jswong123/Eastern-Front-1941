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

        this.canvas = canvas;

        this.ctx =
            canvas.getContext("2d");


        this.world = world;


        this.hexSize = 28;


        /*
         * main.js 启动后会用
         * 独立 Camera 对象替换这里。
         */

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


    // ========================================
    // Canvas 尺寸
    // ========================================

    resize() {

        const rect =
            this.canvas
                .getBoundingClientRect();


        const ratio =
            window.devicePixelRatio ||
            1;


        this.canvas.width =
            Math.round(
                rect.width *
                ratio
            );


        this.canvas.height =
            Math.round(
                rect.height *
                ratio
            );


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


    // ========================================
    // 地形颜色
    // ========================================

    terrainColor(type) {

        switch (type) {

            case "forest":

                return "#6f775c";


            case "marsh":

                return "#8d9275";


            default:

                return "#aaa987";

        }
    }


    // ========================================
    // Hex -> 屏幕坐标
    // ========================================

    worldToScreen(
        q,
        r
    ) {

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


    // ========================================
    // 基础地形
    // ========================================

    drawTerrain() {

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

                const p =
                    this.worldToScreen(
                        q,
                        r
                    );


                /*
                 * 简单视口裁剪。
                 */

                if (
                    p.x < -size ||
                    p.y < -size ||
                    p.x > this.width + size ||
                    p.y > this.height + size
                ) {

                    continue;

                }


                drawHexPath(
                    ctx,
                    p.x,
                    p.y,
                    size
                );


                ctx.fillStyle =
                    this.terrainColor(
                        this.world
                            .terrainAt(
                                q,
                                r
                            )
                    );


                ctx.fill();


                /*
                 * 六边格保持较淡。
                 */

                ctx.strokeStyle =
                    "rgba(45,45,35,0.28)";


                ctx.lineWidth =
                    Math.max(
                        0.5,
                        this.camera.zoom *
                        0.7
                    );


                ctx.stroke();
            }
        }
    }


    // ========================================
    // 通用地图折线
    // ========================================

    drawFeatureLine(
        points,
        options
    ) {

        if (
            !points ||
            points.length < 2
        ) {

            return;

        }


        const ctx =
            this.ctx;


        ctx.save();


        ctx.beginPath();


        points.forEach(
            (
                [q, r],
                index
            ) => {

                const p =
                    this.worldToScreen(
                        q,
                        r
                    );


                if (
                    index === 0
                ) {

                    ctx.moveTo(
                        p.x,
                        p.y
                    );

                }

                else {

                    ctx.lineTo(
                        p.x,
                        p.y
                    );

                }

            }
        );


        ctx.strokeStyle =
            options.strokeStyle;


        ctx.lineWidth =
            options.lineWidth *
            this.camera.zoom;


        ctx.lineCap =
            "round";


        ctx.lineJoin =
            "round";


        if (
            options.dash
        ) {

            ctx.setLineDash(

                options.dash.map(
                    value =>
                        value *
                        this.camera.zoom
                )

            );

        }


        ctx.stroke();


        ctx.restore();
    }


    // ========================================
    // 河流
    // ========================================

    drawRivers() {

        for (
            const river
            of this.world
                .features
                .rivers
        ) {

            /*
             * 河岸
             */

            this.drawFeatureLine(

                river.points,

                {
                    strokeStyle:
                        "rgba(70,91,98,0.65)",

                    lineWidth:
                        river.width + 3
                }

            );


            /*
             * 河水
             */

            this.drawFeatureLine(

                river.points,

                {
                    strokeStyle:
                        "#7695a1",

                    lineWidth:
                        river.width
                }

            );

        }
    }


    // ========================================
    // 公路
    // ========================================

    drawRoads() {

        for (
            const road
            of this.world
                .features
                .roads
        ) {

            /*
             * 道路外缘
             */

            this.drawFeatureLine(

                road.points,

                {
                    strokeStyle:
                        "#625b48",

                    lineWidth: 5
                }

            );


            /*
             * 道路主体
             */

            this.drawFeatureLine(

                road.points,

                {
                    strokeStyle:
                        "#c5b78d",

                    lineWidth: 3
                }

            );

        }
    }


    // ========================================
    // 铁路
    // ========================================

    drawRailways() {

        for (
            const railway
            of this.world
                .features
                .railways
        ) {

            this.drawFeatureLine(

                railway.points,

                {
                    strokeStyle:
                        "#403d35",

                    lineWidth: 2,

                    dash: [
                        8,
                        5
                    ]
                }

            );

        }
    }


    // ========================================
    // 城镇
    // ========================================

    drawSettlements() {

        const ctx =
            this.ctx;


        for (
            const settlement
            of this.world
                .features
                .settlements
        ) {

            const p =
                this.worldToScreen(
                    settlement.q,
                    settlement.r
                );


            const city =
                settlement.type ===
                "city";


            const radius =
                (
                    city
                        ? 6
                        : 4
                )
                *
                Math.max(
                    0.8,
                    Math.min(
                        1.4,
                        this.camera.zoom
                    )
                );


            ctx.save();


            ctx.fillStyle =
                "#37352d";


            ctx.beginPath();


            ctx.arc(
                p.x,
                p.y,
                radius,
                0,
                Math.PI * 2
            );


            ctx.fill();


            /*
             * 地名不要无限随地图放大。
             */

            const fontSize =
                city
                    ? 15
                    : 13;


            ctx.font =
                `${fontSize}px FangSong, serif`;


            ctx.fillStyle =
                "#292820";


            ctx.textAlign =
                "left";


            ctx.textBaseline =
                "middle";


            ctx.fillText(

                `${settlement.nameZh}  ${settlement.name}`,

                p.x +
                    radius +
                    6,

                p.y - 4

            );


            ctx.restore();

        }
    }


    // ========================================
    // 单位
    // ========================================

    drawUnits(units) {

        for (
            const unit
            of units
        ) {

            const p =
                this.worldToScreen(
                    unit.q,
                    unit.r
                );


            /*
             * 单位军标不随着地图无限放大。
             */

            const symbolScale =
                Math.max(
                    0.75,
                    Math.min(
                        1.35,
                        this.camera.zoom
                    )
                );


            this.symbolRenderer.draw(

                unit,

                p.x,

                p.y,

                symbolScale

            );

        }
    }


    // ========================================
    // 主渲染
    // ========================================

    render(units = []) {

        this.ctx.clearRect(
            0,
            0,
            this.width,
            this.height
        );


        /*
         * 地图图层顺序
         *
         * 地形
         * ↓
         * 河流
         * ↓
         * 道路
         * ↓
         * 铁路
         * ↓
         * 城镇
         * ↓
         * 单位
         */

        this.drawTerrain();

        this.drawRivers();

        this.drawRoads();

        this.drawRailways();

        this.drawSettlements();

        this.drawUnits(
            units
        );
    }
}
