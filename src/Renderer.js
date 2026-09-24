// ============================================================

 

// Renderer.js

 

// 东线 1941

 

//

 

// 地图渲染系统

 

// V0.4A

 

//

 

// 功能：

 

// - 六角格地图

 

// - 地形

 

// - 河流

 

// - 道路

 

// - 铁路

 

// - 城镇

 

// - 军事单位

 

// - 单位选中框

 

// - 移动范围

 

// ============================================================

 

 

 

import {

 

    drawHexPath

 

} from "./Hex.js";

 

 

 

 

 

export class Renderer {

 

 

 

    constructor(

 

        canvas,

 

        world,

 

        camera

 

    ) {

 

 

 

        this.canvas = canvas;

 

 

 

        this.ctx =

 

            canvas.getContext("2d");

 

 

 

 

 

        this.world =

 

            world;

 

 

 

 

 

        this.camera =

 

            camera;

 

 

 

 

 

        // ----------------------------------------------------

 

        // Hex 大小

 

        // ----------------------------------------------------

 

 

 

        this.hexSize = 24;

 

 

 

 

 

        // ----------------------------------------------------

 

        // 外部系统引用

 

        // ----------------------------------------------------

 

 

 

        this.selection = null;

 

 

 

        this.movementSystem = null;

 

 

 

 

 

        // ----------------------------------------------------

 

        // 地图颜色

 

        // ----------------------------------------------------

 

 

 

        this.colors = {

 

 

 

            plain:

 

                "#b4b28f",

 

 

 

            forest:

 

                "#65705a",

 

 

 

            marsh:

 

                "#87917b",

 

 

 

            urban:

 

                "#aaa184",

 

 

 

            water:

 

                "#7693a1",

 

 

 

            grid:

 

                "#747660",

 

 

 

            road:

 

                "#a38e69",

 

 

 

            railway:

 

                "#57564c",

 

 

 

            river:

 

                "#668ba0"

 

 

 

        };

 

 

 

    }

 

 

 

 

 

    // ========================================================

 

    // 清空画布

 

    // ========================================================

 

 

 

    clear() {

 

 

 

        const ctx =

 

            this.ctx;

 

 

 

 

 

        ctx.save();

 

 

 

 

 

        ctx.setTransform(

 

            1,

 

            0,

 

            0,

 

            1,

 

            0,

 

            0

 

        );

 

 

 

 

 

        ctx.clearRect(

 

            0,

 

            0,

 

            this.canvas.width,

 

            this.canvas.height

 

        );

 

 

 

 

 

        ctx.fillStyle =

 

            "#8f9078";

 

 

 

 

 

        ctx.fillRect(

 

            0,

 

            0,

 

            this.canvas.width,

 

            this.canvas.height

 

        );

 

 

 

 

 

        ctx.restore();

 

 

 

    }

 

 

 

 

 

    // ========================================================

 

    // Hex → 世界坐标

 

    // ========================================================

 

 

 

    hexToWorld(

 

        q,

 

        r

 

    ) {

 

 

 

        const size =

 

            this.hexSize;

 

 

 

 

 

        return {

 

 

 

            x:

 

                size *

 

                Math.sqrt(3) *

 

                (

 

                    q +

 

                    r / 2

 

                ),

 

 

 

            y:

 

                size *

 

                1.5 *

 

                r

 

 

 

        };

 

 

 

    }

 

 

 

 

 

    // ========================================================

 

    // 世界坐标 → 屏幕坐标

 

    // ========================================================

 

 

 

    worldPointToScreen(

 

        x,

 

        y

 

    ) {

 

 

 

        return {

 

 

 

            x:

 

                x *

 

                this.camera.zoom +

 

                this.camera.x,

 

 

 

            y:

 

                y *

 

                this.camera.zoom +

 

                this.camera.y

 

 

 

        };

 

 

 

    }

 

 

 

 

 

    // ========================================================

 

    // Hex → 屏幕坐标

 

    // ========================================================

 

 

 

    worldToScreen(

 

        q,

 

        r

 

    ) {

 

 

 

        const world =

 

            this.hexToWorld(

 

                q,

 

                r

 

            );

 

 

 

 

 

        return this.worldPointToScreen(

 

            world.x,

 

            world.y

 

        );

 

 

 

    }

 

 

 

 

 

    // ========================================================

 

    // 地形颜色

 

    // ========================================================

 

 

 

    terrainColor(

 

        terrain

 

    ) {

 

 

 

        return (

 

            this.colors[terrain] ??

 

            this.colors.plain

 

        );

 

 

 

    }

 

 

 

 

 

    // ========================================================

 

    // 绘制基础地图

 

    // ========================================================

 

 

 

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

 

 

 

 

 

                const terrain =

 

                    this.world.terrainAt(

 

                        q,

 

                        r

 

                    );

 

 

 

 

 

                drawHexPath(

 

                    ctx,

 

                    p.x,

 

                    p.y,

 

                    size

 

                );

 

 

 

 

 

                ctx.fillStyle =

 

                    this.terrainColor(

 

                        terrain

 

                    );

 

 

 

 

 

                ctx.fill();

 

 

 

 

 

                ctx.strokeStyle =

 

                    this.colors.grid;

 

 

 

 

 

                ctx.lineWidth =

 

                    Math.max(

 

                        0.6,

 

                        this.camera.zoom

 

                    );

 

 

 

 

 

                ctx.stroke();

 

 

 

            }

 

 

 

        }

 

 

 

    }

 

 

 

 

 

    // ========================================================

 

    // 获取地图要素

 

    // ========================================================

 

 

 

    getFeatureArray(

 

        ...names

 

    ) {

 

 

 

        for (

 

            const name

 

            of names

 

        ) {

 

 

 

            if (

 

                Array.isArray(

 

                    this.world[name]

 

                )

 

            ) {

 

 

 

                return this.world[name];

 

 

 

            }

 

 

 

        }

 

 

 

 

 

        return [];

 

 

 

    }

 

 

 

 

 

    // ========================================================

 

    // 将地图要素节点转换成 Hex

 

    // ========================================================

 

 

 

    featureHex(

 

        point

 

    ) {

 

 

 

        if (!point) {

 

            return null;

 

        }

 

 

 

 

 

        if (

 

            Array.isArray(point)

 

        ) {

 

 

 

            return {

 

 

 

                q: Number(point[0]),

 

 

 

                r: Number(point[1])

 

 

 

            };

 

 

 

        }

 

 

 

 

 

        if (

 

            point.q !== undefined &&

 

            point.r !== undefined

 

        ) {

 

 

 

            return {

 

 

 

                q: Number(point.q),

 

 

 

                r: Number(point.r)

 

 

 

            };

 

 

 

        }

 

 

 

 

 

        return null;

 

 

 

    }

 

 

 

 

 

    // ========================================================

 

    // 绘制线路

 

    // ========================================================

 

 

 

    drawFeatureLines(

 

        features,

 

        options = {}

 

    ) {

 

 

 

        const ctx =

 

            this.ctx;

 

 

 

 

 

        const color =

 

            options.color ??

 

            "#000000";

 

 

 

 

 

        const width =

 

            options.width ??

 

            2;

 

 

 

 

 

        const dashed =

 

            options.dashed ??

 

            false;

 

 

 

 

 

        ctx.save();

 

 

 

 

 

        ctx.strokeStyle =

 

            color;

 

 

 

 

 

        ctx.lineWidth =

 

            width *

 

            this.camera.zoom;

 

 

 

 

 

        ctx.lineCap =

 

            "round";

 

 

 

 

 

        ctx.lineJoin =

 

            "round";

 

 

 

 

 

        if (dashed) {

 

 

 

            ctx.setLineDash([

 

                5 * this.camera.zoom,

 

                5 * this.camera.zoom

 

            ]);

 

 

 

        }

 

 

 

 

 

        for (

 

            const feature

 

            of features

 

        ) {

 

 

 

            const points =

 

                feature.points ??

 

                feature.path ??

 

                feature.hexes ??

 

                feature;

 

 

 

 

 

            if (

 

                !Array.isArray(points) ||

 

                points.length < 2

 

            ) {

 

 

 

                continue;

 

 

 

            }

 

 

 

 

 

            ctx.beginPath();

 

 

 

 

 

            let started =

 

                false;

 

 

 

 

 

            for (

 

                const rawPoint

 

                of points

 

            ) {

 

 

 

                const hex =

 

                    this.featureHex(

 

                        rawPoint

 

                    );

 

 

 

 

 

                if (!hex) {

 

                    continue;

 

                }

 

 

 

 

 

                const p =

 

                    this.worldToScreen(

 

                        hex.q,

 

                        hex.r

 

                    );

 

 

 

 

 

                if (!started) {

 

 

 

                    ctx.moveTo(

 

                        p.x,

 

                        p.y

 

                    );

 

 

 

 

 

                    started =

 

                        true;

 

 

 

                }

 

 

 

                else {

 

 

 

                    ctx.lineTo(

 

                        p.x,

 

                        p.y

 

                    );

 

 

 

                }

 

 

 

            }

 

 

 

 

 

            if (started) {

 

 

 

                ctx.stroke();

 

 

 

            }

 

 

 

        }

 

 

 

 

 

        ctx.restore();

 

 

 

    }

 

 

 

 

 

    // ========================================================

 

    // 河流

 

    // ========================================================

 

 

 

    drawRivers() {

 

 

 

        const rivers =

 

            this.getFeatureArray(

 

                "rivers",

 

                "riverFeatures"

 

            );

 

 

 

 

 

        this.drawFeatureLines(

 

            rivers,

 

            {

 

                color:

 

                    this.colors.river,

 

 

 

                width:

 

                    3.2

 

            }

 

        );

 

 

 

    }

 

 

 

 

 

    // ========================================================

 

    // 道路

 

    // ========================================================

 

 

 

    drawRoads() {

 

 

 

        const roads =

 

            this.getFeatureArray(

 

                "roads",

 

                "roadFeatures"

 

            );

 

 

 

 

 

        this.drawFeatureLines(

 

            roads,

 

            {

 

                color:

 

                    this.colors.road,

 

 

 

                width:

 

                    1.8

 

            }

 

        );

 

 

 

    }

 

 

 

 

 

    // ========================================================

 

    // 铁路

 

    // ========================================================

 

 

 

    drawRailways() {

 

 

 

        const railways =

 

            this.getFeatureArray(

 

                "railways",

 

                "rails",

 

                "railwayFeatures"

 

            );

 

 

 

 

 

        this.drawFeatureLines(

 

            railways,

 

            {

 

                color:

 

                    this.colors.railway,

 

 

 

                width:

 

                    1.2,

 

 

 

                dashed:

 

                    true

 

            }

 

        );

 

 

 

    }

 

 

 

 

 

    // ========================================================

 

    // 城镇

 

    // ========================================================

 

 

 

    drawSettlements() {

 

 

 

        const settlements =

 

            this.getFeatureArray(

 

                "settlements",

 

                "cities",

 

                "towns"

 

            );

 

 

 

 

 

        const ctx =

 

            this.ctx;

 

 

 

 

 

        ctx.save();

 

 

 

 

 

        for (

 

            const settlement

 

            of settlements

 

        ) {

 

 

 

            const q =

 

                settlement.q;

 

 

 

 

 

            const r =

 

                settlement.r;

 

 

 

 

 

            if (

 

                q === undefined ||

 

                r === undefined

 

            ) {

 

 

 

                continue;

 

 

 

            }

 

 

 

 

 

            const p =

 

                this.worldToScreen(

 

                    q,

 

                    r

 

                );

 

 

 

 

 

            const radius =

 

                Math.max(

 

                    3,

 

                    4 *

 

                    this.camera.zoom

 

                );

 

 

 

 

 

            ctx.beginPath();

 

 

 

 

 

            ctx.arc(

 

                p.x,

 

                p.y,

 

                radius,

 

                0,

 

                Math.PI * 2

 

            );

 

 

 

 

 

            ctx.fillStyle =

 

                "#34352e";

 

 

 

 

 

            ctx.fill();

 

 

 

 

 

            ctx.font =

 

                `${

 

                    Math.max(

 

                        10,

 

                        13 *

 

                        this.camera.zoom

 

                    )

 

                }px FangSong, STKaiti, serif`;

 

 

 

 

 

            ctx.fillStyle =

 

                "#4c493f";

 

 

 

 

 

            ctx.textAlign =

 

                "left";

 

 

 

 

 

            ctx.textBaseline =

 

                "middle";

 

 

 

 

 

            ctx.fillText(

 

                settlement.name ??

 

                "",

 

                p.x +

 

                radius +

 

                5,

 

                p.y

 

            );

 

 

 

        }

 

 

 

 

 

        ctx.restore();

 

 

 

    }

 

 

 

 

 

    // ========================================================

 

    // 移动范围

 

    // ========================================================

 

 

 

    drawMovementRange() {

 

 

 

        if (

 

            !this.movementSystem ||

 

            !this.movementSystem.selectedUnit

 

        ) {

 

 

 

            return;

 

 

 

        }

 

 

 

 

 

        const ctx =

 

            this.ctx;

 

 

 

 

 

        const size =

 

            this.hexSize *

 

            this.camera.zoom;

 

 

 

 

 

        ctx.save();

 

 

 

 

 

        for (

 

            const [

 

                key,

 

                cost

 

            ]

 

            of this.movementSystem

 

                .reachable

 

                .entries()

 

        ) {

 

 

 

            const [

 

                q,

 

                r

 

            ] =

 

                key

 

                    .split(",")

 

                    .map(Number);

 

 

 

 

 

            const p =

 

                this.worldToScreen(

 

                    q,

 

                    r

 

                );

 

 

 

 

 

            drawHexPath(

 

                ctx,

 

                p.x,

 

                p.y,

 

                size * 0.92

 

            );

 

 

 

 

 

            ctx.fillStyle =

 

                "rgba(96, 137, 91, 0.32)";

 

 

 

 

 

            ctx.fill();

 

 

 

 

 

            ctx.strokeStyle =

 

                "rgba(65, 103, 65, 0.82)";

 

 

 

 

 

            ctx.lineWidth =

 

                Math.max(

 

                    1,

 

                    1.5 *

 

                    this.camera.zoom

 

                );

 

 

 

 

 

            ctx.stroke();

 

 

 

 

 

            // 放大后显示移动成本

 

 

 

            if (

 

                this.camera.zoom >= 1.15

 

            ) {

 

 

 

                ctx.fillStyle =

 

                    "rgba(35, 55, 35, 0.75)";

 

 

 

 

 

                ctx.font =

 

                    `${

 

                        Math.max(

 

                            8,

 

                            9 *

 

                            this.camera.zoom

 

                        )

 

                    }px FangSong, serif`;

 

 

 

 

 

                ctx.textAlign =

 

                    "center";

 

 

 

 

 

                ctx.textBaseline =

 

                    "middle";

 

 

 

 

 

                ctx.fillText(

 

                    String(cost),

 

                    p.x,

 

                    p.y

 

                );

 

 

 

            }

 

 

 

        }

 

 

 

 

 

        ctx.restore();

 

 

 

    }

 

 

 

 

 

    // ========================================================

 

    // 单位颜色

 

    // ========================================================

 

 

 

    factionColor(

 

        faction

 

    ) {

 

 

 

        if (

 

            faction === "GER" ||

 

            faction === "germany" ||

 

            faction === "German" ||

 

            faction === "GERMAN" ||

 

            faction === "deutsch"

 

        ) {

 

 

 

            return "#5f87b2";

 

 

 

        }

 

 

 

 

 

        if (

 

            faction === "USSR" ||

 

            faction === "soviet" ||

 

            faction === "Soviet"

 

        ) {

 

 

 

            return "#c45f59";

 

 

 

        }

 

 

 

 

 

        return "#a9a68f";

 

 

 

    }

 

 

 

 

 

    // ========================================================

 

    // 绘制军事符号

 

    // ========================================================

 

 

 

    drawMilitarySymbol(

 

        unit,

 

        x,

 

        y,

 

        width,

 

        height

 

    ) {

 

 

 

        const ctx =

 

            this.ctx;

 

 

 

 

 

        const type =

 

            unit.type ??

 

            "infantry";

 

 

 

 

 

        ctx.save();

 

 

 

 

 

        ctx.strokeStyle =

 

            "#171916";

 

 

 

 

 

        ctx.fillStyle =

 

            "#171916";

 

 

 

 

 

        ctx.lineWidth =

 

            Math.max(

 

                1.5,

 

                2 *

 

                this.camera.zoom

 

            );

 

 

 

 

 

        if (

 

            type === "infantry"

 

        ) {

 

 

 

            ctx.beginPath();

 

 

 

            ctx.moveTo(

 

                x - width * 0.32,

 

                y - height * 0.27

 

            );

 

 

 

            ctx.lineTo(

 

                x + width * 0.32,

 

                y + height * 0.27

 

            );

 

 

 

            ctx.moveTo(

 

                x + width * 0.32,

 

                y - height * 0.27

 

            );

 

 

 

            ctx.lineTo(

 

                x - width * 0.32,

 

                y + height * 0.27

 

            );

 

 

 

            ctx.stroke();

 

 

 

        }

 

 

 

        else if (

 

            type === "armor"

 

        ) {

 

 

 

            ctx.beginPath();

 

 

 

            ctx.ellipse(

 

                x,

 

                y,

 

                width * 0.27,

 

                height * 0.18,

 

                0,

 

                0,

 

                Math.PI * 2

 

            );

 

 

 

            ctx.stroke();

 

 

 

        }

 

 

 

        else if (

 

            type === "artillery"

 

        ) {

 

 

 

            ctx.beginPath();

 

 

 

            ctx.arc(

 

                x,

 

                y,

 

                height * 0.13,

 

                0,

 

                Math.PI * 2

 

            );

 

 

 

            ctx.fill();

 

 

 

        }

 

 

 

        else if (

 

            type === "antitank"

 

        ) {

 

 

 

            ctx.beginPath();

 

 

 

            ctx.moveTo(

 

                x - width * 0.28,

 

                y

 

            );

 

 

 

            ctx.lineTo(

 

                x + width * 0.28,

 

                y

 

            );

 

 

 

            ctx.stroke();

 

 

 

 

 

            ctx.beginPath();

 

 

 

            ctx.arc(

 

                x,

 

                y,

 

                height * 0.12,

 

                0,

 

                Math.PI * 2

 

            );

 

 

 

            ctx.stroke();

 

 

 

        }

 

 

 

        else if (

 

            type === "reconnaissance"

 

        ) {

 

 

 

            ctx.beginPath();

 

 

 

            ctx.moveTo(

 

                x - width * 0.28,

 

                y + height * 0.20

 

            );

 

 

 

            ctx.lineTo(

 

                x,

 

                y - height * 0.22

 

            );

 

 

 

            ctx.lineTo(

 

                x + width * 0.28,

 

                y + height * 0.20

 

            );

 

 

 

            ctx.stroke();

 

 

 

        }

 

 

 

        else {

 

 

 

            ctx.beginPath();

 

 

 

            ctx.arc(

 

                x,

 

                y,

 

                height * 0.11,

 

                0,

 

                Math.PI * 2

 

            );

 

 

 

            ctx.fill();

 

 

 

        }

 

 

 

 

 

        ctx.restore();

 

 

 

    }

 

 

 

 

 

    // ========================================================

 

    // 绘制单位

 

    // ========================================================

 

 

 

    drawUnits(

 

        units = []

 

    ) {

 

 

 

        const ctx =

 

            this.ctx;

 

 

 

 

 

        for (

 

            const unit

 

            of units

 

        ) {

 

            // ------------------------------------------------

            // 阵亡单位保留在游戏数据中供胜负系统（尤其 HQ 全灭）判定，

            // 但绝不继续绘制在地图上。

            // ------------------------------------------------

 

            const strengthForRender =
                Number(unit?.strength);

            const manpowerForRender =
                Number(unit?.manpower);

            const strengthDead =
                Number.isFinite(strengthForRender) &&
                strengthForRender <= 0;

            const manpowerDead =
                Number.isFinite(manpowerForRender) &&
                manpowerForRender <= 0;

            if (
                unit?.destroyed === true ||
                strengthDead ||
                manpowerDead
            ) {
                continue;
            }

 

 

 

 

            if (

 

                unit.q === undefined ||

 

                unit.r === undefined

 

            ) {

 

 

 

                continue;

 

 

 

            }

 

 

 

 

 

            const p =

 

                this.worldToScreen(

 

                    unit.q,

 

                    unit.r

 

                );

 

 

 

 

 

            const width =

 

                42 *

 

                this.camera.zoom;

 

 

 

 

 

            const height =

 

                30 *

 

                this.camera.zoom;

 

 

 

 

 

            const selected =

 

                this.selection &&

 

                this.selection.selectedUnit ===

 

                unit;

 

 

 

 

 

            // ------------------------------------------------

 

            // 选中框

 

            // ------------------------------------------------

 

 

 

            if (selected) {

 

 

 

                ctx.save();

 

 

 

 

 

                ctx.strokeStyle =

 

                    "#e8c85b";

 

 

 

 

 

                ctx.lineWidth =

 

                    Math.max(

 

                        2,

 

                        3 *

 

                        this.camera.zoom

 

                    );

 

 

 

 

 

                ctx.strokeRect(

 

 

 

                    p.x -

 

                    width / 2 -

 

                    5,

 

 

 

                    p.y -

 

                    height / 2 -

 

                    5,

 

 

 

                    width +

 

                    10,

 

 

 

                    height +

 

                    10

 

 

 

                );

 

 

 

 

 

                ctx.restore();

 

 

 

            }

 

 

 

 

 

            // ------------------------------------------------

 

            // 单位底色

 

            // ------------------------------------------------

 

 

 

            ctx.save();

 

 

 

 

 

            ctx.fillStyle =

 

                this.factionColor(

 

                    unit.faction

 

                );

 

 

 

 

 

            ctx.strokeStyle =

 

                "#1c1e1b";

 

 

 

 

 

            ctx.lineWidth =

 

                Math.max(

 

                    1.5,

 

                    2 *

 

                    this.camera.zoom

 

                );

 

 

 

 

 

            ctx.fillRect(

 

 

 

                p.x -

 

                width / 2,

 

 

 

                p.y -

 

                height / 2,

 

 

 

                width,

 

 

 

                height

 

 

 

            );

 

 

 

 

 

            ctx.strokeRect(

 

 

 

                p.x -

 

                width / 2,

 

 

 

                p.y -

 

                height / 2,

 

 

 

                width,

 

 

 

                height

 

 

 

            );

 

 

 

 

 

            ctx.restore();

 

 

 

 

 

            // ------------------------------------------------

 

            // 军事符号

 

            // ------------------------------------------------

 

 

 

            this.drawMilitarySymbol(

 

 

 

                unit,

 

 

 

                p.x,

 

 

 

                p.y,

 

 

 

                width,

 

 

 

                height

 

 

 

            );

 

 

 

 

 

            // ------------------------------------------------

 

            // 上级番号

 

            // ------------------------------------------------

 

 

 

            const regiment =

 

                unit.regiment ??

 

                unit.parent?.regiment ??

 

                unit.parentUnit ??

 

                "";

 

 

 

 

 

            if (regiment) {

 

 

 

                ctx.save();

 

 

 

 

 

                ctx.fillStyle =

 

                    "#4b493f";

 

 

 

 

 

                ctx.font =

 

                    `${

 

                        Math.max(

 

                            7,

 

                            8 *

 

                            this.camera.zoom

 

                        )

 

                    }px FangSong, serif`;

 

 

 

 

 

                ctx.textAlign =

 

                    "center";

 

 

 

 

 

                ctx.fillText(

 

 

 

                    String(regiment),

 

 

 

                    p.x,

 

 

 

                    p.y -

 

                    height / 2 -

 

                    4

 

 

 

                );

 

 

 

 

 

                ctx.restore();

 

 

 

            }

 

 

 

 

 

            // ------------------------------------------------

 

            // 实时兵力（当前 / 初始）

 

            // ------------------------------------------------

 

 

 

            const currentStrength = Math.max(

                0,

                Number(unit.manpower ?? unit.strength ?? 0)

            );

 

            const maximumStrength = Math.max(

                1,

                Number(unit.maxManpower ?? unit.maxStrength ?? currentStrength)

            );

 

 

 

            ctx.save();

 

            ctx.fillStyle = "#20231f";

 

            ctx.font = `${Math.max(7, 8 * this.camera.zoom)}px Consolas, monospace`;

 

            ctx.textAlign = "center";

 

            ctx.textBaseline = "bottom";

 

            ctx.fillText(

 

                `${currentStrength}/${maximumStrength}`,

 

                p.x,

 

                p.y - height / 2 - 3

 

            );

 

            ctx.restore();

 

 

 

            // ------------------------------------------------

 

            // 单位名称

 

            // ------------------------------------------------

 

 

 

            ctx.save();

 

 

 

 

 

            ctx.fillStyle =

 

                "#34352f";

 

 

 

 

 

            ctx.font =

 

                `${

 

                    Math.max(

 

                        8,

 

                        10 *

 

                        this.camera.zoom

 

                    )

 

                }px FangSong, serif`;

 

 

 

 

 

            ctx.textAlign =

 

                "center";

 

 

 

 

 

            ctx.textBaseline =

 

                "top";

 

 

 

 

 

            ctx.fillText(

 

 

 

                unit.name ??

 

                "",

 

 

 

                p.x,

 

 

 

                p.y +

 

                height / 2 +

 

                4

 

 

 

            );

 

 

 

 

 

            ctx.restore();

 

 

 

        }

 

 

 

    }

 

 

 

 

 

    // ========================================================

 

    // 总渲染

 

    // ========================================================

 

 

 

    render(

 

        units = []

 

    ) {

 

 

 

        this.clear();

 

 

 

 

 

        // 地形

 

        this.drawTerrain();

 

 

 

 

 

        // 地理要素

 

        this.drawRoads();

 

 

 

        this.drawRailways();

 

 

 

        this.drawRivers();

 

 

 

        this.drawSettlements();

 

 

 

 

 

        // 移动范围必须位于单位下面

 

        this.drawMovementRange();

 

 

 

 

 

        // 单位

 

        this.drawUnits(

 

            units

 

        );

 

 

 

    }

 

 

 

}
