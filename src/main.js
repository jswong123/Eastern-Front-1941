import {
    WorldMap
} from "./WorldMap.js";


import {
    Renderer
} from "./Renderer.js";


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


const renderer =
    new Renderer(
        canvas,
        world
    );


let units = [];


let dragging = false;

let lastMouseX = 0;
let lastMouseY = 0;


/*
 * 加载战役
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
            data.units || [];


        render();


    } catch (error) {

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


/*
 * 渲染
 */

function render() {

    renderer.render(
        units
    );

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
 * 地图拖动
 */

canvas.addEventListener(
    "mousedown",
    event => {

        dragging = true;

        lastMouseX =
            event.clientX;

        lastMouseY =
            event.clientY;

    }
);


window.addEventListener(
    "mouseup",
    () => {

        dragging = false;

    }
);


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


        renderer.camera.x += dx;
        renderer.camera.y += dy;


        lastMouseX =
            event.clientX;

        lastMouseY =
            event.clientY;


        render();

    }
);


/*
 * 滚轮缩放
 */

canvas.addEventListener(
    "wheel",
    event => {

        event.preventDefault();


        const factor =
            event.deltaY < 0
                ? 1.1
                : 0.9;


        renderer.camera.zoom *=
            factor;


        renderer.camera.zoom =
            Math.max(
                0.45,
                Math.min(
                    2.2,
                    renderer.camera.zoom
                )
            );


        render();

    },

    {
        passive: false
    }
);


/*
 * 全局错误保护
 */

window.addEventListener(
    "error",
    event => {

        console.error(
            "游戏运行错误：",
            event.error
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


loadScenario();
