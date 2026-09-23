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


const canvas =
    document.getElementById(
        "gameCanvas"
    );


const unitInfo =
    document.getElementById(
        "unitInfo"
    );


const world =
    new WorldMap();


const camera =
    new Camera();


const renderer =
    new Renderer(
        canvas,
        world
    );


/*
 * Renderer V0.1 原本自己保存 camera。
 *
 * V0.2 开始把 Camera 独立成模块。
 */

renderer.camera =
    camera;


const selection =
    new UnitSelection(
        renderer,
        unitInfo
    );


let units = [];


/*
 * 用来区分：
 *
 * 点击单位
 *
 * 和
 *
 * 拖动地图
 */

let mouseDownX = 0;
let mouseDownY = 0;

let movedDuringDrag = false;


/*
 * 加载场景
 */

async function loadScenario() {

    try {

        const response =
            await fetch(
                "./data/scenario.json"
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        units =
            data.units ?? [];


        render();


    } catch (error) {

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


/*
 * 主渲染
 */

function render() {

    renderer.render(
        units
    );


    /*
     * 给被选择的单位增加黄色框。
     */

    if (
        selection.selectedUnit
    ) {

        drawSelection(
            selection.selectedUnit
        );

    }

}


/*
 * 选中框
 */

function drawSelection(unit) {

    const position =
        renderer.worldToScreen(
            unit.q,
            unit.r
        );


    const ctx =
        renderer.ctx;


    const size =
        38 *
        Math.max(
            0.75,
            camera.zoom
        );


    ctx.save();


    ctx.strokeStyle =
        "#f1d36a";


    ctx.lineWidth = 3;


    ctx.strokeRect(

        position.x - size,

        position.y - size * 0.72,

        size * 2,

        size * 1.44

    );


    ctx.restore();

}


/*
 * 浏览器尺寸变化
 */

window.addEventListener(
    "resize",
    () => {

        renderer.resize();

        render();

    }
);


/*
 * 鼠标按下
 */

canvas.addEventListener(
    "mousedown",
    event => {

        mouseDownX =
            event.clientX;


        mouseDownY =
            event.clientY;


        movedDuringDrag =
            false;


        camera.startDrag(
            event.clientX,
            event.clientY
        );

    }
);


/*
 * 鼠标移动
 */

window.addEventListener(
    "mousemove",
    event => {

        if (
            !camera.dragging
        ) {

            return;

        }


        const totalDX =
            event.clientX -
            mouseDownX;


        const totalDY =
            event.clientY -
            mouseDownY;


        if (
            Math.abs(totalDX) > 4 ||
            Math.abs(totalDY) > 4
        ) {

            movedDuringDrag =
                true;

        }


        if (
            camera.drag(
                event.clientX,
                event.clientY
            )
        ) {

            render();

        }

    }
);


/*
 * 鼠标松开
 */

window.addEventListener(
    "mouseup",
    event => {

        if (
            !camera.dragging
        ) {

            return;

        }


        camera.endDrag();


        /*
         * 如果移动距离很小，
         * 认为这是一次点击。
         */

        if (
            !movedDuringDrag
        ) {

            handleMapClick(
                event
            );

        }

    }
);


/*
 * 点击单位
 */

function handleMapClick(event) {

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


/*
 * 滚轮缩放
 */

canvas.addEventListener(
    "wheel",
    event => {

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


/*
 * 防止鼠标离开窗口后
 * Camera 一直保持拖动状态。
 */

window.addEventListener(
    "blur",
    () => {

        camera.endDrag();

    }
);


/*
 * 错误保护
 */

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


/*
 * 启动游戏
 */

loadScenario();
