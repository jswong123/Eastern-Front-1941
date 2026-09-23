// ============================================================
// main.js
//
// 东线 1941
// V0.4A
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


if (!canvas) {

    throw new Error(
        "找不到 #game-canvas"
    );

}


// ============================================================
// Canvas 尺寸
// ============================================================

function resizeCanvas() {

    const rect =
        canvas.getBoundingClientRect();


    const dpr =
        window.devicePixelRatio ||
        1;


    canvas.width =
        Math.floor(
            rect.width *
            dpr
        );


    canvas.height =
        Math.floor(
            rect.height *
            dpr
        );


    /*
     * CSS 像素与 Canvas 像素保持一致。
     *
     * 当前版本优先稳定性。
     */

    if (dpr !== 1) {

        canvas.width =
            rect.width;

        canvas.height =
            rect.height;

    }

}


resizeCanvas();


window.addEventListener(
    "resize",
    () => {

        resizeCanvas();

        render();

    }
);


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
         * 兼容不同数据结构
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
         * 鼠标所在地图位置保持不变。
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
         * 尚未选择阵营时不允许操作。
         */

        if (
            gameState.mode ===
            null
        ) {

            return;

        }


        /*
         * 如果刚刚进行了拖动，
         * 不把鼠标释放解释为点击。
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
        // 第一优先级：单位
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
             * 只有玩家自己的单位
             * 才能进入移动状态。
             */

            const observer =
                typeof gameState
                    .isObserver ===
                    "function"
                    &&
                gameState
                    .isObserver();


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
        // 第二优先级：地图 Hex
        // ====================================================

        if (
            movementSystem
                .selectedUnit
        ) {

            /*
             * 屏幕坐标
             * ↓
             * 世界坐标
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
             * 世界坐标
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
                     * 更新右侧资料。
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
// 防止右键菜单干扰
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
