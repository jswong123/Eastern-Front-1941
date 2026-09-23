// ============================================================
// main.js
//
// 东线 1941
// V0.4B
//
// 游戏入口
// ============================================================

import {
    WorldMap
} from "./WorldMap.js";

import {
    Camera
} from "./Camera.js";

import {
    Renderer
} from "./Renderer.js";

import {
    UnitSelection
} from "./UnitSelection.js";

import {
    GameState
} from "./GameState.js";

import {
    FactionSelection
} from "./FactionSelection.js";

import {
    MovementSystem
} from "./systems/MovementSystem.js";

import {
    pixelToHex
} from "./Hex.js";


// ============================================================
// Canvas
// ============================================================

const canvas =
    document.getElementById(
        "game-canvas"
    );

const mapArea =
    document.getElementById(
        "mapArea"
    );


if (!canvas) {

    throw new Error(
        "找不到 #game-canvas"
    );

}


if (!mapArea) {

    throw new Error(
        "找不到 #mapArea"
    );

}


// ============================================================
// Canvas 尺寸
// ============================================================

function resizeCanvas() {

    const width =
        mapArea.clientWidth;

    const height =
        mapArea.clientHeight;


    if (
        width <= 0 ||
        height <= 0
    ) {

        console.warn(
            "地图区域尺寸异常：",
            width,
            height
        );

        return;

    }


    /*
     * 游戏坐标统一采用 CSS 像素。
     *
     * 不使用 devicePixelRatio，
     * 避免 Canvas 内部坐标与鼠标坐标不一致。
     */

    const targetWidth =
        Math.round(width);

    const targetHeight =
        Math.round(height);


    if (
        canvas.width !== targetWidth ||
        canvas.height !== targetHeight
    ) {

        canvas.width =
            targetWidth;

        canvas.height =
            targetHeight;

    }


    canvas.style.width =
        `${targetWidth}px`;

    canvas.style.height =
        `${targetHeight}px`;

}


// 第一次确定 Canvas 大小
resizeCanvas();


// ============================================================
// 世界
// ============================================================

const world =
    new WorldMap();


// ============================================================
// Camera
// ============================================================

const camera =
    new Camera();


// ============================================================
// Renderer
// ============================================================

const renderer =
    new Renderer(
        canvas,
        world,
        camera
    );


// ============================================================
// Game State
// ============================================================

const gameState =
    new GameState();


// ============================================================
// 单位选择
// ============================================================

const selection =
    new UnitSelection(
        renderer,
        gameState
    );


// ============================================================
// 移动系统
// ============================================================

const movementSystem =
    new MovementSystem(
        world
    );


renderer.movementSystem =
    movementSystem;


// ============================================================
// 阵营选择
// ============================================================

const factionSelection =
    new FactionSelection(
        gameState
    );


// ============================================================
// 游戏数据
// ============================================================

let scenario =
    null;

let units =
    [];


// ============================================================
// 渲染
// ============================================================

function render() {

    renderer.render(
        units
    );

}


// ============================================================
// Canvas 自适应
// ============================================================

function handleCanvasResize() {

    const oldWidth =
        canvas.width;

    const oldHeight =
        canvas.height;


    resizeCanvas();


    if (
        oldWidth !== canvas.width ||
        oldHeight !== canvas.height
    ) {

        render();

    }

}


window.addEventListener(
    "resize",
    handleCanvasResize
);


/*
 * ResizeObserver 可以检测：
 *
 * 浏览器尺寸变化
 * Sidebar 尺寸变化
 * mapArea 尺寸变化
 */

if (
    typeof ResizeObserver !==
    "undefined"
) {

    const resizeObserver =
        new ResizeObserver(
            () => {

                handleCanvasResize();

            }
        );


    resizeObserver.observe(
        mapArea
    );

}


// ============================================================
// 初始化单位状态
// ============================================================

function initializeUnits() {

    for (
        const unit
        of units
    ) {

        movementSystem
            .initializeUnit(
                unit
            );


        // -----------------------------
        // 战斗状态默认值
        // -----------------------------

        if (
            unit.morale ===
            undefined
        ) {

            unit.morale =
                80;

        }


        if (
            unit.suppression ===
            undefined
        ) {

            unit.suppression =
                0;

        }


        if (
            unit.fatigue ===
            undefined
        ) {

            unit.fatigue =
                0;

        }


        if (
            unit.ammunition ===
            undefined
        ) {

            unit.ammunition =
                100;

        }

    }

}


// ============================================================
// 加载 Scenario
// ============================================================

async function loadScenario() {

    try {

        const response =
            await fetch(
                "./data/scenario.json"
            );


        if (!response.ok) {

            throw new Error(
                `scenario.json 加载失败：${response.status}`
            );

        }


        scenario =
            await response.json();


        /*
         * 兼容两种数据结构：
         *
         * scenario.units
         *
         * 或
         *
         * scenario.forces
         */

        if (
            Array.isArray(
                scenario.units
            )
        ) {

            units =
                scenario.units;

        }

        else if (
            Array.isArray(
                scenario.forces
            )
        ) {

            units =
                scenario.forces;

        }

        else {

            units =
                [];

        }


        initializeUnits();


        console.log(
            "Scenario loaded:",
            scenario
        );


        console.log(
            "Units:",
            units
        );


        /*
         * scenario 加载完成后再次确认尺寸。
         */

        resizeCanvas();

        render();


        /*
         * 地图完成后显示阵营选择。
         */

        if (
            typeof factionSelection
                .show ===
            "function"
        ) {

            factionSelection.show();

        }

    }

    catch (error) {

        console.error(
            error
        );


        const panel =
            document.getElementById(
                "info-panel"
            );


        if (panel) {

            panel.innerHTML = `

                <h2>
                    数据加载失败
                </h2>

                <p>
                    无法加载 scenario.json
                </p>

                <p>
                    请打开浏览器控制台查看错误。
                </p>

            `;

        }

    }

}


// ============================================================
// Camera 拖动
// ============================================================

let dragging =
    false;

let lastMouseX =
    0;

let lastMouseY =
    0;

let dragDistance =
    0;


// ------------------------------------------------------------
// 鼠标按下
// ------------------------------------------------------------

canvas.addEventListener(
    "mousedown",
    event => {

        dragging =
            true;


        lastMouseX =
            event.clientX;

        lastMouseY =
            event.clientY;


        dragDistance =
            0;

    }
);


// ------------------------------------------------------------
// 鼠标移动
// ------------------------------------------------------------

window.addEventListener(
    "mousemove",
    event => {

        if (!dragging) {
            return;
        }


        const dx =
            event.clientX -
            lastMouseX;

        const dy =
            event.clientY -
            lastMouseY;


        dragDistance +=
            Math.sqrt(
                dx * dx +
                dy * dy
            );


        camera.x +=
            dx;

        camera.y +=
            dy;


        lastMouseX =
            event.clientX;

        lastMouseY =
            event.clientY;


        render();

    }
);


// ------------------------------------------------------------
// 鼠标释放
// ------------------------------------------------------------

window.addEventListener(
    "mouseup",
    () => {

        dragging =
            false;

    }
);


// ============================================================
// 缩放
// ============================================================

canvas.addEventListener(
    "wheel",
    event => {

        event.preventDefault();


        const rect =
            canvas
                .getBoundingClientRect();


        const mouseX =
            event.clientX -
            rect.left;

        const mouseY =
            event.clientY -
            rect.top;


        const oldZoom =
            camera.zoom;


        const zoomFactor =
            event.deltaY < 0
                ? 1.12
                : 0.89;


        let newZoom =
            oldZoom *
            zoomFactor;


        newZoom =
            Math.max(
                0.45,
                Math.min(
                    2.5,
                    newZoom
                )
            );


        /*
         * 鼠标指向的地图位置
         * 在缩放前后保持不动。
         */

        const worldX =
            (
                mouseX -
                camera.x
            )
            /
            oldZoom;


        const worldY =
            (
                mouseY -
                camera.y
            )
            /
            oldZoom;


        camera.zoom =
            newZoom;


        camera.x =
            mouseX -
            worldX *
            newZoom;


        camera.y =
            mouseY -
            worldY *
            newZoom;


        render();

    },
    {
        passive:
            false
    }
);


// ============================================================
// 点击
// ============================================================

canvas.addEventListener(
    "click",
    event => {

        /*
         * 尚未选择阵营时，
         * 不允许地图操作。
         */

        if (
            gameState.mode ===
            null
        ) {

            return;

        }


        /*
         * 刚刚拖动过地图时，
         * 不解释为点击。
         */

        if (
            dragDistance >
            8
        ) {

            dragDistance =
                0;

            return;

        }


        const rect =
            canvas
                .getBoundingClientRect();


        const mouseX =
            event.clientX -
            rect.left;

        const mouseY =
            event.clientY -
            rect.top;


        // ====================================================
        // 第一优先级：点击单位
        // ====================================================

        const clickedUnit =
            selection.findUnitAt(

                mouseX,

                mouseY,

                units

            );


        if (
            clickedUnit
        ) {

            selection.select(
                clickedUnit
            );


            /*
             * 判断观察员模式。
             */

            const observer =
                typeof gameState
                    .isObserver ===
                "function"
                &&
                gameState
                    .isObserver();


            /*
             * 判断是否属于玩家。
             */

            const friendly =
                typeof gameState
                    .isPlayerUnit ===
                "function"
                ?
                gameState
                    .isPlayerUnit(
                        clickedUnit
                    )
                :
                true;


            /*
             * 只有玩家自己的单位
             * 才进入移动模式。
             */

            if (
                !observer &&
                friendly
            ) {

                movementSystem
                    .selectUnit(

                        clickedUnit,

                        units

                    );

            }

            else {

                movementSystem
                    .clear();

            }


            render();

            return;

        }


        // ====================================================
        // 第二优先级：点击地图 Hex
        // ====================================================

        if (
            movementSystem
                .selectedUnit
        ) {

            /*
             * Screen
             * ↓
             * World
             */

            const worldX =
                (
                    mouseX -
                    camera.x
                )
                /
                camera.zoom;


            const worldY =
                (
                    mouseY -
                    camera.y
                )
                /
                camera.zoom;


            /*
             * World
             * ↓
             * Hex
             */

            const hex =
                pixelToHex(

                    worldX,

                    worldY,

                    renderer.hexSize

                );


            if (
                movementSystem
                    .canMoveTo(
                        hex.q,
                        hex.r
                    )
            ) {

                const result =
                    movementSystem
                        .moveTo(
                            hex.q,
                            hex.r
                        );


                if (result) {

                    console.log(
                        "单位移动：",
                        result
                    );


                    /*
                     * 移动后刷新右侧资料。
                     */

                    selection.select(
                        result.unit
                    );

                }


                render();

                return;

            }

        }


        // ====================================================
        // 点击普通空地
        // ====================================================

        movementSystem.clear();


        selection.select(
            null
        );


        render();

    }
);


// ============================================================
// 右键取消移动
// ============================================================

canvas.addEventListener(
    "contextmenu",
    event => {

        event.preventDefault();


        movementSystem.clear();


        render();

    }
);


// ============================================================
// ESC 取消移动
// ============================================================

window.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Escape"
        ) {

            movementSystem.clear();

            render();

        }

    }
);


// ============================================================
// 启动
// ============================================================

loadScenario();
