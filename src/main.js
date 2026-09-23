import {
    WorldMap
} from "./WorldMap.js";


import {
    Renderer
} from "./Renderer.js";


import {
    Camera
} from "./Camera.js";


import {
    UnitSelection
} from "./UnitSelection.js";


import {
    GameState
} from "./GameState.js";


import {
    FactionSelection
} from "./FactionSelection.js";


// ========================================
// DOM
// ========================================

const canvas =
    document.getElementById(
        "gameCanvas"
    );


const unitInfo =
    document.getElementById(
        "unitInfo"
    );


if (!canvas) {

    throw new Error(
        "找不到 gameCanvas"
    );

}


if (!unitInfo) {

    throw new Error(
        "找不到 unitInfo"
    );

}


// ========================================
// 游戏核心对象
// ========================================

const world =
    new WorldMap();


const gameState =
    new GameState();


const camera =
    new Camera();


const renderer =
    new Renderer(
        canvas,
        world
    );


/*
 * Renderer 使用独立 Camera。
 */

renderer.camera =
    camera;


const selection =
    new UnitSelection(
        renderer,
        unitInfo,
        gameState
    );


const factionSelection =
    new FactionSelection(
        gameState
    );


// ========================================
// 数据
// ========================================

let units = [];


// ========================================
// 鼠标状态
// ========================================

let dragDistance = 0;


// ========================================
// 加载场景
// ========================================

async function loadScenario() {

    try {

        const response =
            await fetch(
                "./data/scenario.json"
            );


        if (
            !response.ok
        ) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        units =
            data.units ??
            [];


        /*
         * 给旧版 scenario.json
         * 自动补充 faction。
         *
         * 这样我们暂时不用立刻重写
         * 全部测试单位数据。
         */

        units =
            units.map(
                unit => {

                    if (
                        !unit.faction
                    ) {

                        if (
                            unit.side ===
                            "germany"
                        ) {

                            unit.faction =
                                "GER";

                        }


                        else if (
                            unit.side ===
                            "soviet"
                        ) {

                            unit.faction =
                                "USSR";

                        }

                    }


                    return unit;

                }
            );


        console.log(
            "战役数据加载完成：",
            units.length,
            "个单位"
        );


        /*
         * 先绘制背景地图。
         *
         * 阵营选择窗口会覆盖其上。
         */

        render();


        /*
         * 然后打开阵营选择。
         */

        factionSelection.show(
            startGame
        );

    }

    catch (error) {

        console.error(
            "战役加载失败：",
            error
        );


        unitInfo.innerHTML = `

            <strong>
                战役加载失败
            </strong>

            <p>
                ${error.message}
            </p>

        `;

    }

}


// ========================================
// 开始游戏
// ========================================

function startGame() {

    selection.select(
        null
    );


    console.log(
        "游戏模式：",
        gameState.mode
    );


    console.log(
        "玩家阵营：",
        gameState.playerFaction
    );


    updateInterface();


    render();
}


// ========================================
// 更新网页状态
// ========================================

function updateInterface() {

    if (
        gameState.isObserver()
    ) {

        document.title =
            "东线 1941 · 观察员";

    }

    else {

        const faction =
            gameState.factions[
                gameState.playerFaction
            ];


        document.title =
            `东线 1941 · ${
                faction?.name ??
                ""
            }`;

    }


    /*
     * 尝试更新顶部版本号。
     *
     * 如果当前 HTML 没有这些元素，
     * 不会导致游戏报错。
     */

    const versionElement =
        document.getElementById(
            "version"
        );


    if (
        versionElement
    ) {

        versionElement.textContent =
            "V0.3";

    }
}


// ========================================
// 主渲染
// ========================================

function render() {

    renderer.render(
        units
    );


    if (
        selection.selectedUnit
    ) {

        drawSelection(
            selection.selectedUnit
        );

    }
}


// ========================================
// 单位选择框
// ========================================

function drawSelection(unit) {

    const position =
        renderer.worldToScreen(
            unit.q,
            unit.r
        );


    const ctx =
        renderer.ctx;


    /*
     * 与 Renderer 中的军标缩放逻辑一致。
     */

    const scale =
        Math.max(
            0.75,
            Math.min(
                1.35,
                camera.zoom
            )
        );


    const width =
        70 *
        scale;


    const height =
        56 *
        scale;


    ctx.save();


    ctx.strokeStyle =
        "#f4d35e";


    ctx.lineWidth =
        3;


    ctx.strokeRect(

        position.x -
            width / 2,

        position.y -
            height / 2,

        width,

        height

    );


    ctx.restore();
}


// ========================================
// 浏览器窗口尺寸变化
// ========================================

window.addEventListener(
    "resize",
    () => {

        renderer.resize();

        render();

    }
);


// ========================================
// 地图拖动：开始
// ========================================

canvas.addEventListener(
    "mousedown",
    event => {

        /*
         * 尚未选择阵营时，
         * 不允许操作背景地图。
         */

        if (
            gameState.mode === null
        ) {

            return;

        }


        dragDistance = 0;


        camera.startDrag(
            event.clientX,
            event.clientY
        );

    }
);


// ========================================
// 地图拖动：移动
// ========================================

window.addEventListener(
    "mousemove",
    event => {

        if (
            !camera.dragging
        ) {

            return;

        }


        const dx =
            event.clientX -
            camera.lastX;


        const dy =
            event.clientY -
            camera.lastY;


        dragDistance +=
            Math.abs(dx) +
            Math.abs(dy);


        camera.drag(
            event.clientX,
            event.clientY
        );


        render();

    }
);


// ========================================
// 地图拖动：结束
// ========================================

window.addEventListener(
    "mouseup",
    () => {

        camera.endDrag();

    }
);


// ========================================
// 点击单位
// ========================================

canvas.addEventListener(
    "click",
    event => {

        /*
         * 必须先选择阵营。
         */

        if (
            gameState.mode === null
        ) {

            return;

        }


        /*
         * 明显拖动地图后，
         * 不触发单位选择。
         */

        if (
            dragDistance > 8
        ) {

            dragDistance = 0;

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


        const unit =
            selection.findUnitAt(

                mouseX,

                mouseY,

                units

            );


        selection.select(
            unit
        );


        render();

    }
);


// ========================================
// 地图缩放
// ========================================

canvas.addEventListener(
    "wheel",
    event => {

        /*
         * 阵营选择界面存在时，
         * 不操作地图。
         */

        if (
            gameState.mode === null
        ) {

            return;

        }


        event.preventDefault();


        camera.changeZoom(
            event.deltaY
        );


        render();

    },

    {
        passive: false
    }
);


// ========================================
// 防止窗口失焦后拖动锁死
// ========================================

window.addEventListener(
    "blur",
    () => {

        camera.endDrag();

    }
);


// ========================================
// 全局错误监控
// ========================================

window.addEventListener(
    "error",
    event => {

        console.error(
            "游戏运行错误：",
            event.error ??
            event.message
        );

    }
);


window.addEventListener(
    "unhandledrejection",
    event => {

        console.error(
            "异步运行错误：",
            event.reason
        );

    }
);


// ========================================
// 启动
// ========================================

loadScenario();
