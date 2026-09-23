// ============================================================
// main.js
// 东线 1941 V0.5
//
// 功能：
// - 地图初始化
// - Camera
// - 单位加载
// - 阵营选择
// - 单位选择
// - 移动系统
// - 回合系统
// - 行动点 AP
// - 德军 / 苏军行动阶段
// ============================================================

import { WorldMap } from "./WorldMap.js";
import { Camera } from "./Camera.js";
import { Renderer } from "./Renderer.js";
import { UnitSelection } from "./UnitSelection.js";
import { GameState } from "./GameState.js";
import { FactionSelection } from "./FactionSelection.js";
import { TurnSystem } from "./TurnSystem.js";
import { MovementSystem } from "./systems/MovementSystem.js";
import { pixelToHex } from "./Hex.js";


// ============================================================
// DOM
// ============================================================

const canvas = document.getElementById("game-canvas");

if (!canvas) {
    throw new Error(
        "找不到 #game-canvas，请检查 index.html"
    );
}

const mapArea =
    document.getElementById("mapArea");

const unitInfo =
    document.getElementById("unitInfo");

const turnInfo =
    document.getElementById("turnInfo");

const turnNumber =
    document.getElementById("turnNumber");

const turnTime =
    document.getElementById("turnTime");

const turnPhase =
    document.getElementById("turnPhase");

const endPhaseButton =
    document.getElementById("endPhaseButton");


// ============================================================
// Canvas 尺寸
// ============================================================

function resizeCanvas() {

    const container =
        mapArea ?? canvas.parentElement;

    if (!container) {
        return;
    }

    const rect =
        container.getBoundingClientRect();

    const dpr =
        window.devicePixelRatio || 1;

    canvas.width =
        Math.max(
            1,
            Math.floor(rect.width * dpr)
        );

    canvas.height =
        Math.max(
            1,
            Math.floor(rect.height * dpr)
        );

    canvas.style.width =
        `${rect.width}px`;

    canvas.style.height =
        `${rect.height}px`;
}


// ============================================================
// 游戏核心对象
// ============================================================

const world =
    new WorldMap();

const camera =
    new Camera();

const renderer =
    new Renderer(
        canvas,
        world,
        camera
    );

const gameState =
    new GameState();

/*
 * 关键修复：
 *
 * UnitSelection 的 constructor 需要：
 *
 * constructor(renderer, gameState)
 *
 * 之前错误的：
 * new UnitSelection()
 *
 * 会导致 renderer === undefined。
 */
const selection =
    new UnitSelection(
        renderer,
        gameState
    );

const movementSystem =
    new MovementSystem(world);

const factionSelection =
    new FactionSelection(gameState);


// Renderer 可以读取移动范围
renderer.movementSystem =
    movementSystem;


// ============================================================
// 游戏数据
// ============================================================

let scenario = null;

let units = [];

let turnSystem = null;


// ============================================================
// 当前交互状态
// ============================================================

let selectedUnit = null;

let isDragging = false;

let dragMoved = false;

let lastMouseX = 0;
let lastMouseY = 0;


// ============================================================
// 渲染
// ============================================================

function render() {

    renderer.render(units);
}


// ============================================================
// Canvas 初始化
// ============================================================

resizeCanvas();

window.addEventListener(
    "resize",
    () => {

        resizeCanvas();

        render();
    }
);


// ============================================================
// 阵营标准化
// ============================================================

function normalizeSide(side) {

    const value =
        String(side ?? "")
            .trim()
            .toLowerCase();

    if (
        value === "german" ||
        value === "germany" ||
        value === "axis" ||
        value === "德军"
    ) {
        return "german";
    }

    if (
        value === "soviet" ||
        value === "ussr" ||
        value === "redarmy" ||
        value === "苏军" ||
        value === "红军"
    ) {
        return "soviet";
    }

    return value;
}


// ============================================================
// 获取单位阵营
// ============================================================

function getUnitSide(unit) {

    return normalizeSide(
        unit?.side ??
        unit?.faction ??
        unit?.camp
    );
}


// ============================================================
// 初始化单位
// ============================================================

function initializeUnits() {

    for (const unit of units) {

        // MovementSystem 初始化
        if (
            typeof movementSystem.initializeUnit ===
            "function"
        ) {
            movementSystem.initializeUnit(unit);
        }

        // 默认状态
        if (unit.morale == null) {
            unit.morale = 80;
        }

        if (unit.suppression == null) {
            unit.suppression = 0;
        }

        if (unit.fatigue == null) {
            unit.fatigue = 0;
        }

        if (unit.ammunition == null) {
            unit.ammunition = 100;
        }
    }
}


// ============================================================
// 初始化回合系统
// ============================================================

function initializeTurnSystem() {

    turnSystem =
        new TurnSystem({

            units,

            year: 1941,
            month: 6,
            day: 26,

            hour: 8,
            minute: 0,

            hoursPerTurn: 2,

            startingPhase: "german"
        });


    // 阶段改变
    turnSystem.onPhaseChanged =
        () => {

            clearSelection();

            updateTurnUI();

            render();
        };


    // 回合改变
    turnSystem.onTurnChanged =
        () => {

            updateTurnUI();

            render();
        };


    // 时间改变
    turnSystem.onTimeChanged =
        () => {

            updateTurnUI();
        };


    updateTurnUI();
}


// ============================================================
// 更新回合 UI
// ============================================================

function updateTurnUI() {

    if (!turnSystem) {
        return;
    }


    // 顶栏时间
    if (turnInfo) {

        if (
            typeof turnSystem.getHeaderText ===
            "function"
        ) {
            turnInfo.textContent =
                turnSystem.getHeaderText();
        }
    }


    // 回合编号
    if (turnNumber) {

        const number =
            typeof turnSystem.getTurnNumber ===
            "function"
                ? turnSystem.getTurnNumber()
                : turnSystem.turn ?? 1;

        turnNumber.textContent =
            `第${number}回合`;
    }


    // 时间范围
    if (turnTime) {

        if (
            typeof turnSystem.getTurnTimeRange ===
            "function"
        ) {
            turnTime.textContent =
                turnSystem.getTurnTimeRange();
        }
    }


    // 当前行动方
    if (turnPhase) {

        if (
            typeof turnSystem.getPhaseName ===
            "function"
        ) {
            turnPhase.textContent =
                turnSystem.getPhaseName();

        } else {

            turnPhase.textContent =
                turnSystem.phase === "soviet"
                    ? "苏军行动"
                    : "德军行动";
        }
    }


    // 按钮文字
    if (endPhaseButton) {

        if (
            turnSystem.phase ===
            "german"
        ) {

            endPhaseButton.textContent =
                "结束德军行动";

        } else {

            endPhaseButton.textContent =
                "结束苏军行动";
        }
    }
}


// ============================================================
// 结束行动阶段
// ============================================================

endPhaseButton?.addEventListener(
    "click",
    () => {

        if (!turnSystem) {
            return;
        }

        if (
            typeof turnSystem.endPhase ===
            "function"
        ) {

            turnSystem.endPhase();

            // 即使 TurnSystem 没有触发 callback，
            // UI 也主动刷新一次。
            updateTurnUI();

            render();
        }
    }
);


// ============================================================
// 清除单位选择
// ============================================================

function clearSelection() {

    selectedUnit = null;


    if (
        typeof selection.clear ===
        "function"
    ) {
        selection.clear();
    }


    if (
        typeof renderer.setSelectedUnit ===
        "function"
    ) {
        renderer.setSelectedUnit(null);
    }


    if (
        typeof renderer.clearReachable ===
        "function"
    ) {
        renderer.clearReachable();
    }


    if (
        movementSystem.reachable instanceof Map
    ) {
        movementSystem.reachable.clear();
    }


    if (unitInfo) {

        unitInfo.innerHTML =
            "点击地图上的单位查看详情";
    }
}


// ============================================================
// 当前玩家是否允许操作单位
// ============================================================

function playerCanControlUnit(unit) {

    if (!unit) {
        return false;
    }


    // 必须属于当前行动阵营
    if (
        turnSystem &&
        typeof turnSystem.isUnitActive ===
            "function" &&
        !turnSystem.isUnitActive(unit)
    ) {
        return false;
    }


    // 观察员只能查看
    if (
        gameState.mode === "observer"
    ) {
        return false;
    }


    const playerSide =
        normalizeSide(
            gameState.playerSide ??
            gameState.side ??
            gameState.faction
        );


    /*
     * 尚未选择玩家阵营时，
     * 暂时允许当前阶段单位行动。
     */
    if (!playerSide) {
        return true;
    }


    return (
        getUnitSide(unit) ===
        playerSide
    );
}


// ============================================================
// 是否允许查看单位
// ============================================================

function playerCanViewUnit(unit) {

    if (!unit) {
        return false;
    }


    // 观察员可以查看全部
    if (
        gameState.mode === "observer"
    ) {
        return true;
    }


    // 当前阶段己方单位
    if (
        playerCanControlUnit(unit)
    ) {
        return true;
    }


    /*
     * 目前允许查看敌军基本情报。
     * 后续战争迷雾系统再修改。
     */
    return true;
}


// ============================================================
// 显示单位信息
// ============================================================

function showUnitInfo(unit) {

    if (!unitInfo || !unit) {
        return;
    }


    const side =
        getUnitSide(unit);


    const sideName =
        side === "german"
            ? "德军"
            : side === "soviet"
                ? "苏军"
                : "未知";


    const name =
        unit.nameZh ??
        unit.name ??
        unit.id ??
        "未命名单位";


    const type =
        unit.typeZh ??
        unit.type ??
        unit.unitType ??
        "未知";


    const ap =
        unit.actionPoints ?? "—";

    const maxAP =
        unit.maxActionPoints ?? "—";


    const active =
        playerCanControlUnit(unit);


    unitInfo.innerHTML = `
        <div class="unit-title">
            ${name}
        </div>

        <div class="unit-row">
            <span>阵营</span>
            <strong>${sideName}</strong>
        </div>

        <div class="unit-row">
            <span>兵种</span>
            <strong>${type}</strong>
        </div>

        <div class="unit-row">
            <span>行动点</span>
            <strong>${ap} / ${maxAP}</strong>
        </div>

        <div class="unit-row">
            <span>士气</span>
            <strong>${unit.morale ?? "—"}</strong>
        </div>

        <div class="unit-row">
            <span>压制</span>
            <strong>${unit.suppression ?? "—"}</strong>
        </div>

        <div class="unit-row">
            <span>疲劳</span>
            <strong>${unit.fatigue ?? "—"}</strong>
        </div>

        <div class="unit-row">
            <span>弹药</span>
            <strong>${unit.ammunition ?? "—"}</strong>
        </div>

        <div class="unit-row">
            <span>位置</span>
            <strong>
                ${unit.q ?? "—"},
                ${unit.r ?? "—"}
            </strong>
        </div>

        <div class="unit-row">
            <span>状态</span>
            <strong>
                ${active ? "可行动" : "等待行动"}
            </strong>
        </div>
    `;
}


// ============================================================
// 选择单位
// ============================================================

function selectUnit(unit) {

    if (!unit) {
        return;
    }


    selectedUnit = unit;


    if (
        typeof selection.select ===
        "function"
    ) {
        selection.select(unit);
    }


    if (
        typeof renderer.setSelectedUnit ===
        "function"
    ) {
        renderer.setSelectedUnit(unit);
    }


    showUnitInfo(unit);


    // 非当前行动单位只显示资料
    if (
        !playerCanControlUnit(unit)
    ) {

        if (
            typeof renderer.clearReachable ===
            "function"
        ) {
            renderer.clearReachable();
        }

        if (
            movementSystem.reachable instanceof Map
        ) {
            movementSystem.reachable.clear();
        }

        render();

        return;
    }


    calculateReachable(unit);

    render();
}


// ============================================================
// 计算移动范围
// ============================================================

function calculateReachable(unit) {

    if (!unit) {
        return;
    }


    if (
        typeof movementSystem.calculateReachable ===
        "function"
    ) {

        const result =
            movementSystem.calculateReachable(
                unit
            );

        if (result instanceof Map) {
            movementSystem.reachable =
                result;
        }

        return;
    }


    if (
        typeof movementSystem.computeReachable ===
        "function"
    ) {

        const result =
            movementSystem.computeReachable(
                unit
            );

        if (result instanceof Map) {
            movementSystem.reachable =
                result;
        }

        return;
    }


    if (
        typeof movementSystem.getReachableHexes ===
        "function"
    ) {

        const result =
            movementSystem.getReachableHexes(
                unit
            );

        if (result instanceof Map) {

            movementSystem.reachable =
                result;
        }
    }
}


// ============================================================
// 获取可移动格数据
// ============================================================

function getReachableData(q, r) {

    if (
        !movementSystem.reachable
    ) {
        return null;
    }


    const key =
        `${q},${r}`;


    if (
        movementSystem.reachable instanceof Map
    ) {

        return (
            movementSystem.reachable.get(key) ??
            null
        );
    }


    return (
        movementSystem.reachable[key] ??
        null
    );
}


// ============================================================
// 获取移动成本
// ============================================================

function getMovementCost(data) {

    if (data == null) {
        return null;
    }


    if (
        typeof data === "number"
    ) {
        return data;
    }


    if (
        Number.isFinite(data.cost)
    ) {
        return data.cost;
    }


    if (
        Number.isFinite(data.totalCost)
    ) {
        return data.totalCost;
    }


    if (
        Number.isFinite(data.distance)
    ) {
        return data.distance;
    }


    /*
     * 如果 MovementSystem 用 true
     * 表示可以到达，则默认成本 1。
     */
    if (data === true) {
        return 1;
    }


    return null;
}


// ============================================================
// 判断六角格是否存在单位
// ============================================================

function unitAtHex(q, r) {

    return (
        units.find(
            unit =>
                Number(unit.q) === Number(q) &&
                Number(unit.r) === Number(r)
        ) ?? null
    );
}


// ============================================================
// 执行移动
// ============================================================

function tryMoveSelectedUnit(q, r) {

    if (!selectedUnit) {
        return false;
    }


    if (
        !playerCanControlUnit(
            selectedUnit
        )
    ) {
        return false;
    }


    // 不能移动到已有单位的位置
    const occupyingUnit =
        unitAtHex(q, r);


    if (
        occupyingUnit &&
        occupyingUnit !== selectedUnit
    ) {
        return false;
    }


    // 必须在移动范围内
    const reachableData =
        getReachableData(q, r);


    if (!reachableData) {
        return false;
    }


    const movementCost =
        getMovementCost(
            reachableData
        );


    if (
        movementCost == null
    ) {
        return false;
    }


    // AP 检查
    if (
        turnSystem &&
        typeof turnSystem.canSpendAP ===
            "function" &&
        !turnSystem.canSpendAP(
            selectedUnit,
            movementCost
        )
    ) {
        return false;
    }


    // 执行移动
    selectedUnit.q = q;
    selectedUnit.r = r;


    // 消耗 AP
    if (
        turnSystem &&
        typeof turnSystem.registerMove ===
            "function"
    ) {

        turnSystem.registerMove(
            selectedUnit,
            movementCost
        );
    }


    /*
     * 关键修复：
     *
     * 移动之后不 clearSelection()。
     * selectedUnit 继续保留。
     */


    // Renderer 继续保持该单位为选中状态
    if (
        typeof renderer.setSelectedUnit ===
        "function"
    ) {
        renderer.setSelectedUnit(
            selectedUnit
        );
    }


    // UnitSelection 同样保持同步
    if (
        typeof selection.select ===
        "function"
    ) {
        selection.select(
            selectedUnit
        );
    }


    // 根据剩余 AP 重新计算范围
    calculateReachable(
        selectedUnit
    );


    // 移动后立即刷新作战信息
    showUnitInfo(
        selectedUnit
    );


    render();

    return true;
}


// ============================================================
// 屏幕坐标 -> 世界坐标
// ============================================================

function screenToWorld(
    screenX,
    screenY
) {

    const zoom =
        camera.zoom ?? 1;


    const offsetX =
        camera.x ??
        camera.offsetX ??
        0;

    const offsetY =
        camera.y ??
        camera.offsetY ??
        0;


    return {

        x:
            (screenX - offsetX) /
            zoom,

        y:
            (screenY - offsetY) /
            zoom
    };
}


// ============================================================
// 鼠标位置 -> Hex
// ============================================================

function mouseToHex(event) {

    const rect =
        canvas.getBoundingClientRect();


    const mouseX =
        event.clientX -
        rect.left;

    const mouseY =
        event.clientY -
        rect.top;


    const worldPos =
        screenToWorld(
            mouseX,
            mouseY
        );


    const hexSize =
        renderer.hexSize ??
        renderer.size ??
        18;


    return pixelToHex(
        worldPos.x,
        worldPos.y,
        hexSize
    );
}


// ============================================================
// 点击检测单位
// ============================================================

function findUnitAtMouse(event) {

    const rect =
        canvas.getBoundingClientRect();


    const x =
        event.clientX -
        rect.left;

    const y =
        event.clientY -
        rect.top;


    /*
     * 优先使用 UnitSelection 自己的
     * 点击检测。
     */
    if (
        typeof selection.findUnitAt ===
        "function"
    ) {

        const found =
            selection.findUnitAt(
                x,
                y,
                units,
                camera,
                renderer
            );

        if (found) {
            return found;
        }
    }


    /*
     * 备用方案：
     * 直接根据六角格坐标检测。
     */
    const hex =
        mouseToHex(event);


    if (!hex) {
        return null;
    }


    return unitAtHex(
        hex.q,
        hex.r
    );
}


// ============================================================
// 鼠标按下
// ============================================================

canvas.addEventListener(
    "mousedown",
    event => {

        if (event.button !== 0) {
            return;
        }


        isDragging = true;

        dragMoved = false;

        lastMouseX =
            event.clientX;

        lastMouseY =
            event.clientY;
    }
);


// ============================================================
// 鼠标拖动地图
// ============================================================

window.addEventListener(
    "mousemove",
    event => {

        if (!isDragging) {
            return;
        }


        const dx =
            event.clientX -
            lastMouseX;

        const dy =
            event.clientY -
            lastMouseY;


        if (
            Math.abs(dx) > 1 ||
            Math.abs(dy) > 1
        ) {
            dragMoved = true;
        }


        if (
            typeof camera.pan ===
            "function"
        ) {

            camera.pan(
                dx,
                dy
            );

        } else {

            /*
             * Camera 不提供 pan()
             * 时使用兼容模式。
             */

            if (
                Number.isFinite(
                    camera.x
                )
            ) {
                camera.x += dx;
            }

            if (
                Number.isFinite(
                    camera.y
                )
            ) {
                camera.y += dy;
            }

            if (
                Number.isFinite(
                    camera.offsetX
                )
            ) {
                camera.offsetX += dx;
            }

            if (
                Number.isFinite(
                    camera.offsetY
                )
            ) {
                camera.offsetY += dy;
            }
        }


        lastMouseX =
            event.clientX;

        lastMouseY =
            event.clientY;


        render();
    }
);


// ============================================================
// 鼠标释放
// ============================================================

window.addEventListener(
    "mouseup",
    () => {

        isDragging = false;
    }
);


// ============================================================
// 点击地图
// ============================================================

canvas.addEventListener(
    "click",
    event => {

        // 拖动地图之后不触发点击
        if (dragMoved) {

            dragMoved = false;

            return;
        }


        // ----------------------------------------------------
        // 1. 点击单位
        // ----------------------------------------------------

        const clickedUnit =
            findUnitAtMouse(event);


        if (clickedUnit) {

            if (
                playerCanViewUnit(
                    clickedUnit
                )
            ) {

                selectUnit(
                    clickedUnit
                );
            }

            return;
        }


        // ----------------------------------------------------
        // 2. 已选择单位 -> 尝试移动
        // ----------------------------------------------------

        if (selectedUnit) {

            const hex =
                mouseToHex(event);


            if (
                hex &&
                tryMoveSelectedUnit(
                    hex.q,
                    hex.r
                )
            ) {

                /*
                 * 移动成功后直接 return。
                 *
                 * 非常重要：
                 * 不允许继续执行下面的 clearSelection()。
                 */
                return;
            }
        }


        // ----------------------------------------------------
        // 3. 真正点击空白位置
        // ----------------------------------------------------

        clearSelection();

        render();
    }
);


// ============================================================
// 滚轮缩放
// ============================================================

canvas.addEventListener(
    "wheel",
    event => {

        event.preventDefault();


        const rect =
            canvas.getBoundingClientRect();


        const mouseX =
            event.clientX -
            rect.left;

        const mouseY =
            event.clientY -
            rect.top;


        const oldZoom =
            camera.zoom ?? 1;


        const zoomFactor =
            event.deltaY < 0
                ? 1.1
                : 0.9;


        let newZoom =
            oldZoom *
            zoomFactor;


        const minZoom =
            camera.minZoom ??
            0.35;

        const maxZoom =
            camera.maxZoom ??
            3;


        newZoom =
            Math.max(
                minZoom,
                Math.min(
                    maxZoom,
                    newZoom
                )
            );


        /*
         * Camera 自带 zoomAt 时优先使用。
         */
        if (
            typeof camera.zoomAt ===
            "function"
        ) {

            camera.zoomAt(
                mouseX,
                mouseY,
                newZoom
            );

            render();

            return;
        }


        /*
         * 手动实现以鼠标位置为中心缩放。
         */

        const oldX =
            camera.x ??
            camera.offsetX ??
            0;

        const oldY =
            camera.y ??
            camera.offsetY ??
            0;


        const worldX =
            (mouseX - oldX) /
            oldZoom;

        const worldY =
            (mouseY - oldY) /
            oldZoom;


        const newX =
            mouseX -
            worldX * newZoom;

        const newY =
            mouseY -
            worldY * newZoom;


        camera.zoom =
            newZoom;


        if ("x" in camera) {
            camera.x = newX;
        }

        if ("y" in camera) {
            camera.y = newY;
        }

        if ("offsetX" in camera) {
            camera.offsetX =
                newX;
        }

        if ("offsetY" in camera) {
            camera.offsetY =
                newY;
        }


        render();
    },
    {
        passive: false
    }
);


// ============================================================
// 键盘操作
// ============================================================

window.addEventListener(
    "keydown",
    event => {

        // ESC：取消选择
        if (
            event.key === "Escape"
        ) {

            clearSelection();

            render();

            return;
        }


        // E：结束当前阶段
        if (
            event.key.toLowerCase() ===
            "e"
        ) {

            if (
                turnSystem &&
                typeof turnSystem.endPhase ===
                    "function"
            ) {

                turnSystem.endPhase();

                updateTurnUI();

                render();
            }
        }
    }
);


// ============================================================
// 加载场景
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


        // ----------------------------------------------------
        // 兼容 scenario.json 的不同结构
        // ----------------------------------------------------

        if (
            Array.isArray(
                scenario.units
            )
        ) {

            units =
                scenario.units;

        } else if (
            Array.isArray(
                scenario
            )
        ) {

            units =
                scenario;

        } else {

            const germanUnits =
                scenario.german?.units ??
                scenario.axis?.units ??
                [];

            const sovietUnits =
                scenario.soviet?.units ??
                scenario.ussr?.units ??
                [];


            units = [
                ...germanUnits,
                ...sovietUnits
            ];
        }


        // ----------------------------------------------------
        // 初始化单位
        // ----------------------------------------------------

        initializeUnits();


        // ----------------------------------------------------
        // 初始化回合
        // ----------------------------------------------------

        initializeTurnSystem();


        // ----------------------------------------------------
        // 阵营选择
        // ----------------------------------------------------

        if (
            typeof factionSelection.show ===
            "function"
        ) {

            factionSelection.show();

        } else if (
            typeof factionSelection.open ===
            "function"
        ) {

            factionSelection.open();

        } else if (
            typeof factionSelection.initialize ===
            "function"
        ) {

            factionSelection.initialize();
        }


        // ----------------------------------------------------
        // 第一次绘制
        // ----------------------------------------------------

        render();


        console.log(
            "东线 1941 V0.5 已启动"
        );

        console.log(
            "单位数量：",
            units.length
        );

        if (
            turnSystem &&
            typeof turnSystem.getState ===
                "function"
        ) {

            console.log(
                "回合状态：",
                turnSystem.getState()
            );
        }


    } catch (error) {

        console.error(
            "游戏初始化失败：",
            error
        );


        if (unitInfo) {

            unitInfo.innerHTML = `
                <strong>
                    游戏数据加载失败
                </strong>

                <br><br>

                ${error.message}
            `;
        }
    }
}


// ============================================================
// 启动
// ============================================================

loadScenario();
