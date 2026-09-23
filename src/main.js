import { WorldMap } from "./WorldMap.js";
import { Renderer } from "./Renderer.js";
import { Camera } from "./Camera.js";
import { UnitSelection } from "./UnitSelection.js";


const canvas =
    document.getElementById("gameCanvas");

const unitInfo =
    document.getElementById("unitInfo");


const world =
    new WorldMap();

const camera =
    new Camera();

const renderer =
    new Renderer(
        canvas,
        world
    );


// V0.2 独立 Camera
renderer.camera = camera;


const selection =
    new UnitSelection(
        renderer,
        unitInfo
    );


let units = [];


// ===============================
// 场景加载
// ===============================

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

        console.log(
            "场景加载成功：",
            units.length,
            "个单位"
        );

        render();

    }

    catch (error) {

        console.error(
            "战役加载失败：",
            error
        );

        unitInfo.innerHTML = `
            <strong>战役加载失败</strong>
            <p>${error.message}</p>
        `;

    }

}


// ===============================
// 主渲染
// ===============================

function render() {

    renderer.render(units);


    if (selection.selectedUnit) {

        drawSelection(
            selection.selectedUnit
        );

    }

}


// ===============================
// 选中框
// ===============================

function drawSelection(unit) {

    const position =
        renderer.worldToScreen(
            unit.q,
            unit.r
        );


    const ctx =
        renderer.ctx;


    const zoom =
        Math.max(
            0.75,
            camera.zoom
        );


    const width =
        66 * zoom;

    const height =
        52 * zoom;


    ctx.save();


    ctx.strokeStyle =
        "#f4d35e";

    ctx.lineWidth = 3;


    ctx.strokeRect(
        position.x - width / 2,
        position.y - height / 2,
        width,
        height
    );


    ctx.restore();

}


// ===============================
// Canvas尺寸
// ===============================

window.addEventListener(
    "resize",
    () => {

        renderer.resize();

        render();

    }
);


// ===============================
// 地图拖动
// ===============================

let dragDistance = 0;


canvas.addEventListener(
    "mousedown",
    event => {

        dragDistance = 0;

        camera.startDrag(
            event.clientX,
            event.clientY
        );

    }
);


window.addEventListener(
    "mousemove",
    event => {

        if (!camera.dragging) {

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


window.addEventListener(
    "mouseup",
    () => {

        camera.endDrag();

    }
);


// ===============================
// 单位点击
// ===============================

canvas.addEventListener(
    "click",
    event => {

        /*
         * 如果刚刚进行了明显拖拽，
         * 就不把它当作点击。
         */

        if (dragDistance > 8) {

            dragDistance = 0;

            return;

        }


        const rect =
            canvas.getBoundingClientRect();


        const mouseX =
            event.clientX -
            rect.left;

        const mouseY =
            event.clientY -
            rect.top;


        console.log(
            "地图点击：",
            mouseX,
            mouseY
        );


        const unit =
            selection.findUnitAt(
                mouseX,
                mouseY,
                units
            );


        if (unit) {

            console.log(
                "选中单位：",
                unit
            );

        }

        else {

            console.log(
                "未点击到单位"
            );

        }


        selection.select(unit);

        render();

    }
);


// ===============================
// 缩放
// ===============================

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


// ===============================
// 防止拖拽锁死
// ===============================

window.addEventListener(
    "blur",
    () => {

        camera.endDrag();

    }
);


// ===============================
// 全局错误监控
// ===============================

window.addEventListener(
    "error",
    event => {

        console.error(
            "游戏错误：",
            event.error ??
            event.message
        );

    }
);


window.addEventListener(
    "unhandledrejection",
    event => {

        console.error(
            "异步错误：",
            event.reason
        );

    }
);


// ===============================
// 启动
// ===============================

loadScenario();
