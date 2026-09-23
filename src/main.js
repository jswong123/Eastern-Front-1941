// ============================================================
// main.js
// 东线 1941：杜布诺
// V0.6
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

const canvas =
    document.getElementById("game-canvas");

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


if (!canvas) {

    throw new Error(
        "找不到 #game-canvas，请检查 index.html"
    );

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


const selection =
    new UnitSelection(
        renderer,
        gameState
    );


const movementSystem =
    new MovementSystem(
        world
    );


const factionSelection =
    new FactionSelection(
        gameState
    );


// Renderer 读取移动系统
renderer.movementSystem =
    movementSystem;


// 如果 Renderer 支持 selection，直接连接
renderer.selection =
    selection;


// ============================================================
// 游戏状态
// ============================================================

let scenario = null;

let units = [];

let turnSystem = null;

let selectedUnit = null;


// ============================================================
// 鼠标状态
// ============================================================

let isDragging = false;

let dragMoved = false;

let lastMouseX = 0;

let lastMouseY = 0;


// 防止极小的鼠标抖动被识别成拖动
const DRAG_THRESHOLD = 4;


// ============================================================
// Canvas
// ============================================================

function resizeCanvas() {

    const container =
        mapArea ??
        canvas.parentElement;


    if (!container) {

        return;

    }


    const rect =
        container.getBoundingClientRect();


    /*
     * 当前 Renderer / UnitSelection 使用 CSS 像素坐标。
     *
     * 因此这里保持 Canvas 内部尺寸与 CSS 尺寸一致，
     * 避免 DPR=2 时出现：
     *
     * 视觉位置正确
     * 但点击位置偏移
     */

    canvas.width =
        Math.max(
            1,
            Math.floor(rect.width)
        );


    canvas.height =
        Math.max(
            1,
            Math.floor(rect.height)
        );


    canvas.style.width =
        `${rect.width}px`;


    canvas.style.height =
        `${rect.height}px`;

}


// ============================================================
// 渲染
// ============================================================

function render() {

    if (
        typeof renderer.render ===
        "function"
    ) {

        renderer.render(
            units
        );

    }

}


// ============================================================
// 阵营标准化
// ============================================================

function normalizeSide(side) {

    const value =
        String(
            side ?? ""
        )
            .trim()
            .toLowerCase();


    if (
        value === "ger" ||
        value === "german" ||
        value === "germany" ||
        value === "axis" ||
        value === "de" ||
        value === "德军"
    ) {

        return "german";

    }


    if (
        value === "ussr" ||
        value === "soviet" ||
        value === "redarmy" ||
        value === "red_army" ||
        value === "su" ||
        value === "苏军" ||
        value === "红军"
    ) {

        return "soviet";

    }


    if (
        value === "observer"
    ) {

        return "observer";

    }


    return value;

}


// ============================================================
// 获取单位阵营
// ============================================================

function getUnitSide(unit) {

    if (!unit) {

        return "";

    }


    return normalizeSide(

        unit.side ??
        unit.faction ??
        unit.camp ??
        unit.nation

    );

}


// ============================================================
// 获取玩家阵营
// ============================================================

function getPlayerSide() {

    return normalizeSide(

        gameState.playerFaction ??
        gameState.playerSide ??
        gameState.side ??
        gameState.faction

    );

}


// ============================================================
// 判断观察员模式
// ============================================================

function isObserverMode() {

    return (
        gameState.mode === "observer" ||
        gameState.observerMode === true ||
        getPlayerSide() === "observer"
    );

}


// ============================================================
// 初始化单位
// ============================================================

function initializeUnits() {

    for (const unit of units) {

        // ----------------------------------------------------
        // 阵营
        // ----------------------------------------------------

        const side =
            getUnitSide(unit);


        if (side) {

            unit.side =
                side;

        }


        // ----------------------------------------------------
        // 坐标
        // ----------------------------------------------------

        unit.q =
            Number(unit.q ?? 0);

        unit.r =
            Number(unit.r ?? 0);


        // ----------------------------------------------------
        // 移动系统
        // ----------------------------------------------------

        if (
            typeof movementSystem.initializeUnit ===
            "function"
        ) {

            movementSystem.initializeUnit(
                unit
            );

        }


        // ----------------------------------------------------
        // 默认状态
        // ----------------------------------------------------

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


        // ----------------------------------------------------
        // AP 兼容
        // ----------------------------------------------------

        if (
            unit.actionPoints == null &&
            unit.ap != null
        ) {

            unit.actionPoints =
                Number(unit.ap);

        }


        if (
            unit.maxActionPoints == null &&
            unit.maxAP != null
        ) {

            unit.maxActionPoints =
                Number(unit.maxAP);

        }


        if (
            unit.maxActionPoints == null &&
            unit.actionPoints != null
        ) {

            unit.maxActionPoints =
                Number(unit.actionPoints);

        }

    }

}


// ============================================================
// 回合系统
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


    // --------------------------------------------------------
    // 阶段变化
    // --------------------------------------------------------

    turnSystem.onPhaseChanged =
        () => {

            clearSelection();

            updateTurnUI();

            render();

        };


    // --------------------------------------------------------
    // 回合变化
    // --------------------------------------------------------

    turnSystem.onTurnChanged =
        () => {

            updateTurnUI();

            render();

        };


    // --------------------------------------------------------
    // 时间变化
    // --------------------------------------------------------

    turnSystem.onTimeChanged =
        () => {

            updateTurnUI();

        };


    updateTurnUI();

}


// ============================================================
// 获取当前阶段
// ============================================================

function getCurrentPhase() {

    if (!turnSystem) {

        return "german";

    }


    return normalizeSide(

        turnSystem.phase ??
        turnSystem.currentPhase ??
        turnSystem.side

    );

}


// ============================================================
// 回合 UI
// ============================================================

function updateTurnUI() {

    if (!turnSystem) {

        return;

    }


    // --------------------------------------------------------
    // 顶部时间
    // --------------------------------------------------------

    if (turnInfo) {

        if (
            typeof turnSystem.getHeaderText ===
            "function"
        ) {

            turnInfo.textContent =
                turnSystem.getHeaderText();

        }

        else {

            turnInfo.textContent =
                "1941年6月26日 · 08:00";

        }

    }


    // --------------------------------------------------------
    // 回合编号
    // --------------------------------------------------------

    const number =

        typeof turnSystem.getTurnNumber ===
        "function"

            ? turnSystem.getTurnNumber()

            : (
                turnSystem.turn ??
                turnSystem.turnNumber ??
                1
            );


    if (turnNumber) {

        turnNumber.textContent =
            `第${number}回合`;

    }


    // --------------------------------------------------------
    // 时间段
    // --------------------------------------------------------

    if (turnTime) {

        if (
            typeof turnSystem.getTurnTimeRange ===
            "function"
        ) {

            turnTime.textContent =
                turnSystem.getTurnTimeRange();

        }

        else {

            turnTime.textContent =
                "08:00—10:00";

        }

    }


    // --------------------------------------------------------
    // 行动方
    // --------------------------------------------------------

    const phase =
        getCurrentPhase();


    const phaseName =
        phase === "soviet"

            ? "苏军行动"

            : "德军行动";


    if (turnPhase) {

        if (
            typeof turnSystem.getPhaseName ===
            "function"
        ) {

            turnPhase.textContent =
                turnSystem.getPhaseName();

        }

        else {

            turnPhase.textContent =
                phaseName;

        }

    }


    // --------------------------------------------------------
    // 结束阶段按钮
    // --------------------------------------------------------

    if (endPhaseButton) {

        endPhaseButton.textContent =

            phase === "soviet"

                ? "结束苏军行动"

                : "结束德军行动";

    }

}


// ============================================================
// 单位是否属于当前行动方
// ============================================================

function isUnitActive(unit) {

    if (!unit) {

        return false;

    }


    if (!turnSystem) {

        return true;

    }


    if (
        typeof turnSystem.isUnitActive ===
        "function"
    ) {

        try {

            return turnSystem.isUnitActive(
                unit
            );

        }

        catch (error) {

            console.warn(
                "TurnSystem.isUnitActive() 调用失败：",
                error
            );

        }

    }


    return (
        getUnitSide(unit) ===
        getCurrentPhase()
    );

}


// ============================================================
// 玩家能否控制单位
// ============================================================

function playerCanControlUnit(unit) {

    if (!unit) {

        return false;

    }


    // 观察员模式只观察
    if (isObserverMode()) {

        return false;

    }


    // 必须是当前行动方
    if (!isUnitActive(unit)) {

        return false;

    }


    const playerSide =
        getPlayerSide();


    // GameState 没记录玩家阵营时
    // 暂时允许当前行动方操作
    if (
        !playerSide ||
        playerSide === "player"
    ) {

        return true;

    }


    return (
        getUnitSide(unit) ===
        playerSide
    );

}


// ============================================================
// 玩家能否查看单位
// ============================================================

function playerCanViewUnit(unit) {

    if (!unit) {

        return false;

    }


    /*
     * V0.6 暂时允许查看双方单位。
     *
     * 战争迷雾之后在这里接入。
     */

    return true;

}


// ============================================================
// 清除移动范围
// ============================================================

function clearReachable() {

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


    if (
        movementSystem.reachableHexes instanceof Map
    ) {

        movementSystem.reachableHexes.clear();

    }

}


// ============================================================
// 同步选择状态
// ============================================================

function syncSelectedUnit(unit) {

    selectedUnit =
        unit ?? null;


    /*
     * 这是这次的重要修改之一：
     *
     * main.js
     * UnitSelection
     * Renderer
     *
     * 三者必须共享同一个 selectedUnit。
     */

    selection.selectedUnit =
        selectedUnit;


    if (
        typeof renderer.setSelectedUnit ===
        "function"
    ) {

        renderer.setSelectedUnit(
            selectedUnit
        );

    }


    // 部分 Renderer 直接读取 selection
    renderer.selection =
        selection;

}


// ============================================================
// 清除选择
// ============================================================

function clearSelection() {

    selectedUnit = null;


    if (
        typeof selection.clear ===
        "function"
    ) {

        try {

            selection.clear();

        }

        catch (error) {

            console.warn(
                "selection.clear() 调用失败：",
                error
            );

        }

    }


    syncSelectedUnit(
        null
    );


    clearReachable();


    if (unitInfo) {

        unitInfo.innerHTML =
            "点击地图上的单位查看详情";

    }

}


// ============================================================
// 获取 AP
// ============================================================

function getUnitAP(unit) {

    if (!unit) {

        return 0;

    }


    return Number(

        unit.actionPoints ??
        unit.ap ??
        0

    );

}


// ============================================================
// 获取最大 AP
// ============================================================

function getUnitMaxAP(unit) {

    if (!unit) {

        return 0;

    }


    return Number(

        unit.maxActionPoints ??
        unit.maxAP ??
        unit.actionPoints ??
        unit.ap ??
        0

    );

}


// ============================================================
// 单位信息
// ============================================================

function showUnitInfo(unit) {

    if (
        !unitInfo ||
        !unit
    ) {

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
        getUnitAP(unit);


    const maxAP =
        getUnitMaxAP(unit);


    const active =
        playerCanControlUnit(
            unit
        );


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
            <strong>${unit.q}, ${unit.r}</strong>
        </div>

        <div class="unit-row">
            <span>状态</span>
            <strong>
                ${
                    active
                        ? "可行动"
                        : "不可行动"
                }
            </strong>
        </div>

    `;

}


// ============================================================
// 计算移动范围
// ============================================================

// ============================================================
// 计算移动范围
// ============================================================

function calculateReachable(unit) {

    // --------------------------------------------------------
    // 清除旧范围
    // --------------------------------------------------------

    clearReachable();


    if (!unit) {

        return;

    }


    // --------------------------------------------------------
    // 当前单位不能行动
    // --------------------------------------------------------

    if (
        !playerCanControlUnit(unit)
    ) {

        return;

    }


    // --------------------------------------------------------
    // 初始化移动数据
    // --------------------------------------------------------

    if (
        typeof movementSystem.initializeUnit ===
        "function"
    ) {

        movementSystem.initializeUnit(
            unit
        );

    }


    // --------------------------------------------------------
    // 同步行动点
    //
    // TurnSystem 使用 actionPoints
    // MovementSystem 使用 movementPoints
    //
    // 暂时让两者保持一致
    // --------------------------------------------------------

    const currentAP =

        unit.actionPoints ??
        unit.ap ??
        unit.movementPoints ??
        unit.maxMovementPoints ??
        0;


    if (
        Number.isFinite(
            Number(currentAP)
        )
    ) {

        unit.movementPoints =
            Number(currentAP);

    }


    // --------------------------------------------------------
    // MovementSystem.js 当前真正存在的方法：
    //
    // selectUnit(unit, units)
    //
    // 它内部会调用：
    // Pathfinding.getReachableHexes()
    // --------------------------------------------------------

    if (
        typeof movementSystem.selectUnit ===
        "function"
    ) {

        movementSystem.selectUnit(

            unit,

            units

        );

    }


    // --------------------------------------------------------
    // 兼容以后可能增加的新接口
    // --------------------------------------------------------

    else if (
        typeof movementSystem.calculateReachable ===
        "function"
    ) {

        const result =
            movementSystem.calculateReachable(

                unit,

                units

            );


        if (
            result instanceof Map
        ) {

            movementSystem.reachable =
                result;

        }

    }


    else if (
        typeof movementSystem.computeReachable ===
        "function"
    ) {

        const result =
            movementSystem.computeReachable(

                unit,

                units

            );


        if (
            result instanceof Map
        ) {

            movementSystem.reachable =
                result;

        }

    }


    // --------------------------------------------------------
    // Renderer 同步
    // --------------------------------------------------------

    if (
        typeof renderer.setReachable ===
        "function"
    ) {

        renderer.setReachable(
            movementSystem.reachable
        );

    }


    // --------------------------------------------------------
    // 调试
    // --------------------------------------------------------

    console.log(
        "已选择单位：",
        unit
    );


    console.log(
        "单位移动点：",
        unit.movementPoints
    );


    console.log(
        "可移动格数量：",
        movementSystem.reachable
            instanceof Map

            ? movementSystem.reachable.size

            : 0
    );


    console.log(
        "可移动格：",
        movementSystem.reachable
    );

}


    let result = null;


    // --------------------------------------------------------
    // 尝试 MovementSystem 的不同接口
    // --------------------------------------------------------

    if (
        typeof movementSystem.calculateReachable ===
        "function"
    ) {

        result =
            movementSystem.calculateReachable(
                unit,
                units
            );

    }

    else if (
        typeof movementSystem.computeReachable ===
        "function"
    ) {

        result =
            movementSystem.computeReachable(
                unit,
                units
            );

    }

    else if (
        typeof movementSystem.getReachableHexes ===
        "function"
    ) {

        result =
            movementSystem.getReachableHexes(
                unit,
                units
            );

    }


    if (result instanceof Map) {

        movementSystem.reachable =
            result;

    }


    // --------------------------------------------------------
    // Renderer
    // --------------------------------------------------------

    if (
        typeof renderer.setReachable ===
        "function"
    ) {

        renderer.setReachable(

            result ??
            movementSystem.reachable ??
            movementSystem.reachableHexes

        );

    }

}


// ============================================================
// 选择单位
// ============================================================

function selectUnit(unit) {

    if (!unit) {

        return;

    }


    // --------------------------------------------------------
    // UnitSelection
    // --------------------------------------------------------

    if (
        typeof selection.select ===
        "function"
    ) {

        try {

            selection.select(
                unit
            );

        }

        catch (error) {

            console.warn(
                "selection.select() 调用失败：",
                error
            );

        }

    }


    /*
     * 无论 UnitSelection.select() 内部怎么实现，
     * 这里都强制同步状态。
     */

    syncSelectedUnit(
        unit
    );


    // --------------------------------------------------------
    // 单位信息
    // --------------------------------------------------------

    showUnitInfo(
        unit
    );


    // --------------------------------------------------------
    // 移动范围
    // --------------------------------------------------------

    if (
        playerCanControlUnit(
            unit
        )
    ) {

console.log("准备计算移动范围：", unit);

calculateReachable(
    unit
);

console.log("移动范围计算完成");
console.log("reachable =", reachable);
    else {

        clearReachable();

    }


    render();

}


// ============================================================
// Hex 上查找单位
// ============================================================

function unitAtHex(q, r) {

    return units.find(

        unit =>

            Number(unit.q) ===
            Number(q)

            &&

            Number(unit.r) ===
            Number(r)

    ) ?? null;

}


// ============================================================
// Canvas 鼠标坐标
// ============================================================

function getCanvasMousePosition(event) {

    const rect =
        canvas.getBoundingClientRect();


    return {

        x:
            event.clientX -
            rect.left,

        y:
            event.clientY -
            rect.top

    };

}


// ============================================================
// 屏幕 -> 世界坐标
// ============================================================

function screenToWorld(
    screenX,
    screenY
) {

    /*
     * 如果 Renderer 已经提供转换函数，
     * 优先使用 Renderer。
     */

    if (
        typeof renderer.screenToWorld ===
        "function"
    ) {

        const result =
            renderer.screenToWorld(
                screenX,
                screenY
            );


        if (result) {

            return result;

        }

    }


    const zoom =
        Number(
            camera.zoom ?? 1
        );


    const offsetX =
        Number(

            camera.x ??
            camera.offsetX ??
            0

        );


    const offsetY =
        Number(

            camera.y ??
            camera.offsetY ??
            0

        );


    return {

        x:
            (
                screenX -
                offsetX
            ) / zoom,

        y:
            (
                screenY -
                offsetY
            ) / zoom

    };

}


// ============================================================
// 鼠标 -> Hex
// ============================================================

function mouseToHex(event) {

    const mouse =
        getCanvasMousePosition(
            event
        );


    const worldPoint =
        screenToWorld(
            mouse.x,
            mouse.y
        );


    const hexSize =
        Number(

            renderer.hexSize ??
            renderer.size ??
            world.hexSize ??
            18

        );


    const result =
        pixelToHex(

            worldPoint.x,

            worldPoint.y,

            hexSize

        );


    if (!result) {

        return null;

    }


    return {

        q:
            Math.round(
                Number(result.q)
            ),

        r:
            Math.round(
                Number(result.r)
            )

    };

}


// ============================================================
// 单位点击检测
// ============================================================

function findUnitAtMouse(event) {

    const mouse =
        getCanvasMousePosition(
            event
        );


    /*
     * ========================================================
     * 第一优先级：
     *
     * UnitSelection.findUnitAt()
     *
     * 这是本次最重要的修复。
     *
     * 单位最终显示在哪里，
     * UnitSelection 就在哪里进行屏幕命中检测。
     *
     * 不再：
     *
     * 鼠标
     * ↓
     * 世界坐标
     * ↓
     * Hex
     * ↓
     * 单位
     *
     * 才判断是否点击单位。
     * ========================================================
     */

    if (
        typeof selection.findUnitAt ===
        "function"
    ) {

        try {

            const found =
                selection.findUnitAt(

                    mouse.x,

                    mouse.y,

                    units,

                    camera,

                    renderer

                );


            if (found) {

                return found;

            }

        }

        catch (error) {

            console.warn(
                "UnitSelection.findUnitAt() 调用失败：",
                error
            );

        }

    }


    /*
     * ========================================================
     * 第二优先级：
     *
     * 直接按照 Renderer 实际单位屏幕位置进行命中检测。
     *
     * 这样即使 UnitSelection 接口版本不一致，
     * 单位仍然可以点击。
     * ========================================================
     */

    const zoom =
        Number(
            camera.zoom ?? 1
        );


    const hitWidth =
        Math.max(
            28,
            54 * zoom
        );


    const hitHeight =
        Math.max(
            24,
            42 * zoom
        );


    /*
     * 倒序检查。
     *
     * 如果两个单位视觉上重叠，
     * 优先选择后绘制的单位。
     */

    for (
        let i = units.length - 1;
        i >= 0;
        i--
    ) {

        const unit =
            units[i];


        let screenPoint = null;


        // ----------------------------------------------------
        // Renderer.worldToScreen(q,r)
        // ----------------------------------------------------

        if (
            typeof renderer.worldToScreen ===
            "function"
        ) {

            try {

                screenPoint =
                    renderer.worldToScreen(
                        unit.q,
                        unit.r
                    );

            }

            catch (error) {

                // 某些 Renderer 的 worldToScreen
                // 需要 world pixel，而不是 q/r。
            }

        }


        // ----------------------------------------------------
        // Renderer.hexToScreen(q,r)
        // ----------------------------------------------------

        if (
            !screenPoint &&
            typeof renderer.hexToScreen ===
            "function"
        ) {

            try {

                screenPoint =
                    renderer.hexToScreen(
                        unit.q,
                        unit.r
                    );

            }

            catch (error) {

                // 忽略，继续后备方案
            }

        }


        if (
            !screenPoint ||
            !Number.isFinite(screenPoint.x) ||
            !Number.isFinite(screenPoint.y)
        ) {

            continue;

        }


        const dx =
            Math.abs(
                mouse.x -
                screenPoint.x
            );


        const dy =
            Math.abs(
                mouse.y -
                screenPoint.y
            );


        if (
            dx <= hitWidth / 2 &&
            dy <= hitHeight / 2
        ) {

            return unit;

        }

    }


    /*
     * ========================================================
     * 最后的后备方案：
     *
     * Hex 命中。
     * ========================================================
     */

    const hex =
        mouseToHex(
            event
        );


    if (!hex) {

        return null;

    }


    return unitAtHex(
        hex.q,
        hex.r
    );

}


// ============================================================
// 获取移动范围数据
// ============================================================

function getReachableData(q, r) {

    const key =
        `${q},${r}`;


    const sources = [

        movementSystem.reachable,

        movementSystem.reachableHexes,

        renderer.reachable,

        renderer.reachableHexes

    ];


    for (const source of sources) {

        if (!source) {

            continue;

        }


        if (
            source instanceof Map
        ) {

            if (
                source.has(key)
            ) {

                return source.get(
                    key
                );

            }

        }


        else if (
            typeof source ===
            "object"
        ) {

            if (
                Object.prototype.hasOwnProperty.call(
                    source,
                    key
                )
            ) {

                return source[key];

            }

        }

    }


    return null;

}


// ============================================================
// 获取移动成本
// ============================================================

function getMovementCost(data) {

    if (data == null) {

        return null;

    }


    if (
        typeof data ===
        "number"
    ) {

        return data;

    }


    if (
        data === true
    ) {

        return 1;

    }


    if (
        Number.isFinite(
            data.cost
        )
    ) {

        return Number(
            data.cost
        );

    }


    if (
        Number.isFinite(
            data.totalCost
        )
    ) {

        return Number(
            data.totalCost
        );

    }


    if (
        Number.isFinite(
            data.distance
        )
    ) {

        return Number(
            data.distance
        );

    }


    if (
        Number.isFinite(
            data.apCost
        )
    ) {

        return Number(
            data.apCost
        );

    }


    return null;

}


// ============================================================
// 消耗 AP
// ============================================================

function spendAP(
    unit,
    amount
) {

    if (!unit) {

        return;

    }


    const cost =
        Math.max(
            0,
            Number(amount) || 0
        );


    if (
        turnSystem &&
        typeof turnSystem.registerMove ===
        "function"
    ) {

        try {

            turnSystem.registerMove(
                unit,
                cost
            );

            return;

        }

        catch (error) {

            console.warn(
                "TurnSystem.registerMove() 调用失败，改用本地 AP：",
                error
            );

        }

    }


    const currentAP =
        getUnitAP(
            unit
        );


    const newAP =
        Math.max(
            0,
            currentAP -
            cost
        );


    if (
        unit.actionPoints != null
    ) {

        unit.actionPoints =
            newAP;

    }


    if (
        unit.ap != null
    ) {

        unit.ap =
            newAP;

    }


    if (
        unit.actionPoints == null &&
        unit.ap == null
    ) {

        unit.actionPoints =
            newAP;

    }

}


// ============================================================
// AP 是否足够
// ============================================================

function canSpendAP(
    unit,
    amount
) {

    if (!unit) {

        return false;

    }


    if (
        turnSystem &&
        typeof turnSystem.canSpendAP ===
        "function"
    ) {

        try {

            return turnSystem.canSpendAP(
                unit,
                amount
            );

        }

        catch (error) {

            console.warn(
                "TurnSystem.canSpendAP() 调用失败：",
                error
            );

        }

    }


    return (
        getUnitAP(unit) >=
        Number(amount)
    );

}


// ============================================================
// 移动单位
// ============================================================

function tryMoveSelectedUnit(
    q,
    r
) {

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


    // --------------------------------------------------------
    // 原地点击
    // --------------------------------------------------------

    if (
        Number(selectedUnit.q) ===
        Number(q)

        &&

        Number(selectedUnit.r) ===
        Number(r)
    ) {

        return false;

    }


    // --------------------------------------------------------
    // 目标格已经有单位
    // --------------------------------------------------------

    const occupyingUnit =
        unitAtHex(
            q,
            r
        );


    if (
        occupyingUnit &&
        occupyingUnit !== selectedUnit
    ) {

        /*
         * V0.6 暂时不执行攻击。
         *
         * 后面 CombatSystem 接在这里。
         */

        return false;

    }


    // --------------------------------------------------------
    // 获取移动范围
    // --------------------------------------------------------

    const reachableData =
        getReachableData(
            q,
            r
        );


    if (
        reachableData == null
    ) {

        return false;

    }


    // --------------------------------------------------------
    // 移动成本
    // --------------------------------------------------------

    const movementCost =
        getMovementCost(
            reachableData
        );


    if (
        movementCost == null
    ) {

        return false;

    }


    // --------------------------------------------------------
    // AP
    // --------------------------------------------------------

    if (
        !canSpendAP(
            selectedUnit,
            movementCost
        )
    ) {

        return false;

    }


    // --------------------------------------------------------
    // 尝试让 MovementSystem 执行移动
    // --------------------------------------------------------

    let movedBySystem =
        false;


    if (
        typeof movementSystem.moveUnit ===
        "function"
    ) {

        try {

            const result =
                movementSystem.moveUnit(

                    selectedUnit,

                    q,

                    r,

                    units

                );


            /*
             * 只要没有明确返回 false，
             * 就认为系统完成了移动。
             */

            if (
                result !== false
            ) {

                movedBySystem =
                    true;

            }

        }

        catch (error) {

            console.warn(
                "MovementSystem.moveUnit() 调用失败，使用 main.js 移动：",
                error
            );

        }

    }


    // --------------------------------------------------------
    // 本地移动
    // --------------------------------------------------------

    if (!movedBySystem) {

        selectedUnit.q =
            Number(q);

        selectedUnit.r =
            Number(r);

    }


    // --------------------------------------------------------
    // AP
    // --------------------------------------------------------

    spendAP(
        selectedUnit,
        movementCost
    );


    // --------------------------------------------------------
    // 保持选择状态
    // --------------------------------------------------------

    syncSelectedUnit(
        selectedUnit
    );


    // --------------------------------------------------------
    // 重新计算移动范围
    // --------------------------------------------------------

    calculateReachable(
        selectedUnit
    );


    // --------------------------------------------------------
    // 更新信息
    // --------------------------------------------------------

    showUnitInfo(
        selectedUnit
    );


    render();


    return true;

}


// ============================================================
// 鼠标按下
// ============================================================

canvas.addEventListener(

    "mousedown",

    event => {

        if (
            event.button !== 0
        ) {

            return;

        }


        isDragging =
            true;


        dragMoved =
            false;


        lastMouseX =
            event.clientX;


        lastMouseY =
            event.clientY;

    }

);


// ============================================================
// 鼠标移动 / 地图拖动
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
            Math.abs(dx) >= DRAG_THRESHOLD ||
            Math.abs(dy) >= DRAG_THRESHOLD
        ) {

            dragMoved =
                true;

        }


        /*
         * 只有真正进入拖动状态后才移动地图。
         *
         * 这样普通点击单位时的小幅鼠标抖动
         * 不会导致 click 被取消。
         */

        if (dragMoved) {

            if (
                typeof camera.pan ===
                "function"
            ) {

                camera.pan(
                    dx,
                    dy
                );

            }

            else {

                if (
                    Number.isFinite(
                        camera.x
                    )
                ) {

                    camera.x +=
                        dx;

                }


                if (
                    Number.isFinite(
                        camera.y
                    )
                ) {

                    camera.y +=
                        dy;

                }


                if (
                    Number.isFinite(
                        camera.offsetX
                    )
                ) {

                    camera.offsetX +=
                        dx;

                }


                if (
                    Number.isFinite(
                        camera.offsetY
                    )
                ) {

                    camera.offsetY +=
                        dy;

                }

            }


            render();

        }


        lastMouseX =
            event.clientX;


        lastMouseY =
            event.clientY;

    }

);


// ============================================================
// 鼠标释放
// ============================================================

window.addEventListener(

    "mouseup",

    () => {

        isDragging =
            false;

    }

);


// ============================================================
// 点击地图
// ============================================================

canvas.addEventListener(

    "click",

    event => {

        // ----------------------------------------------------
        // 如果刚才是拖动，不执行点击
        // ----------------------------------------------------

        if (dragMoved) {

            dragMoved =
                false;

            return;

        }


        // ----------------------------------------------------
        // 第一优先级：点击单位
        // ----------------------------------------------------

        const clickedUnit =
            findUnitAtMouse(
                event
            );


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
        // 第二优先级：移动
        // ----------------------------------------------------

        if (selectedUnit) {

            const hex =
                mouseToHex(
                    event
                );


            if (
                hex &&
                tryMoveSelectedUnit(
                    hex.q,
                    hex.r
                )
            ) {

                return;

            }

        }


        // ----------------------------------------------------
        // 空白区域
        // ----------------------------------------------------

        clearSelection();

        render();

    }

);


// ============================================================
// 右键取消选择
// ============================================================

canvas.addEventListener(

    "contextmenu",

    event => {

        event.preventDefault();

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


        const mouse =
            getCanvasMousePosition(
                event
            );


        const oldZoom =
            Number(
                camera.zoom ?? 1
            );


        const factor =
            event.deltaY < 0

                ? 1.1

                : 0.9;


        const minZoom =
            Number(
                camera.minZoom ??
                0.35
            );


        const maxZoom =
            Number(
                camera.maxZoom ??
                3
            );


        const newZoom =
            Math.max(

                minZoom,

                Math.min(

                    maxZoom,

                    oldZoom *
                    factor

                )

            );


        // ----------------------------------------------------
        // Camera 原生缩放
        // ----------------------------------------------------

        if (
            typeof camera.zoomAt ===
            "function"
        ) {

            try {

                camera.zoomAt(

                    mouse.x,

                    mouse.y,

                    newZoom

                );


                render();

                return;

            }

            catch (error) {

                console.warn(
                    "camera.zoomAt() 调用失败，改用本地缩放：",
                    error
                );

            }

        }


        // ----------------------------------------------------
        // 手动缩放
        // ----------------------------------------------------

        const oldX =
            Number(

                camera.x ??
                camera.offsetX ??
                0

            );


        const oldY =
            Number(

                camera.y ??
                camera.offsetY ??
                0

            );


        const worldX =
            (
                mouse.x -
                oldX
            ) /
            oldZoom;


        const worldY =
            (
                mouse.y -
                oldY
            ) /
            oldZoom;


        const newX =
            mouse.x -
            worldX *
            newZoom;


        const newY =
            mouse.y -
            worldY *
            newZoom;


        camera.zoom =
            newZoom;


        if (
            "x" in camera
        ) {

            camera.x =
                newX;

        }


        if (
            "y" in camera
        ) {

            camera.y =
                newY;

        }


        if (
            "offsetX" in camera
        ) {

            camera.offsetX =
                newX;

        }


        if (
            "offsetY" in camera
        ) {

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
// 结束当前阶段
// ============================================================

function endCurrentPhase() {

    if (!turnSystem) {

        return;

    }


    clearSelection();


    if (
        typeof turnSystem.endPhase ===
        "function"
    ) {

        turnSystem.endPhase();

    }

    else {

        /*
         * TurnSystem 没有 endPhase 时的后备方案。
         */

        const current =
            getCurrentPhase();


        turnSystem.phase =

            current === "german"

                ? "soviet"

                : "german";


        if (
            current === "soviet"
        ) {

            if (
                Number.isFinite(
                    turnSystem.turn
                )
            ) {

                turnSystem.turn +=
                    1;

            }

        }

    }


    updateTurnUI();

    render();

}


// ============================================================
// 结束阶段按钮
// ============================================================

if (endPhaseButton) {

    endPhaseButton.addEventListener(

        "click",

        () => {

            endCurrentPhase();

        }

    );

}


// ============================================================
// 键盘
// ============================================================

window.addEventListener(

    "keydown",

    event => {

        // ----------------------------------------------------
        // ESC
        // ----------------------------------------------------

        if (
            event.key ===
            "Escape"
        ) {

            clearSelection();

            render();

            return;

        }


        // ----------------------------------------------------
        // E
        // ----------------------------------------------------

        if (
            event.key.toLowerCase() ===
            "e"
        ) {

            endCurrentPhase();

        }

    }

);


// ============================================================
// 玩家选择阵营之后
// ============================================================

function startGame(
    selectedFaction = null
) {

    console.log(
        "选择阵营：",
        selectedFaction
    );


    console.log(
        "玩家阵营：",
        getPlayerSide()
    );


    console.log(
        "游戏模式：",
        gameState.mode
    );


    clearSelection();

    updateTurnUI();

    resizeCanvas();

    render();

}


// ============================================================
// 从 Scenario 提取单位
// ============================================================

function extractUnitsFromScenario(
    data
) {

    if (!data) {

        return [];

    }


    // --------------------------------------------------------
    // scenario.units
    // --------------------------------------------------------

    if (
        Array.isArray(
            data.units
        )
    ) {

        return data.units;

    }


    // --------------------------------------------------------
    // scenario 本身就是数组
    // --------------------------------------------------------

    if (
        Array.isArray(
            data
        )
    ) {

        return data;

    }


    // --------------------------------------------------------
    // 德军
    // --------------------------------------------------------

    const germanUnits =

        data.german?.units ??
        data.axis?.units ??
        data.GER?.units ??
        [];


    // --------------------------------------------------------
    // 苏军
    // --------------------------------------------------------

    const sovietUnits =

        data.soviet?.units ??
        data.ussr?.units ??
        data.USSR?.units ??
        [];


    return [

        ...germanUnits,

        ...sovietUnits

    ];

}


// ============================================================
// 加载场景
// ============================================================

async function loadScenario() {

    try {

        // ----------------------------------------------------
        // Scenario
        // ----------------------------------------------------

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
        // 单位
        // ----------------------------------------------------

        units =
            extractUnitsFromScenario(
                scenario
            );


        console.log(
            "场景读取完成"
        );


        console.log(
            "单位数量：",
            units.length
        );


        // ----------------------------------------------------
        // 初始化单位
        // ----------------------------------------------------

        initializeUnits();


        // ----------------------------------------------------
        // 初始化回合
        // ----------------------------------------------------

        initializeTurnSystem();


        // ----------------------------------------------------
        // Canvas
        // ----------------------------------------------------

        resizeCanvas();


        // ----------------------------------------------------
        // 初始渲染
        // ----------------------------------------------------

        render();


        // ----------------------------------------------------
        // 阵营选择
        //
        // 必须传 startGame
        // 防止之前的 onStart is not a function
        // ----------------------------------------------------

        if (
            typeof factionSelection.show ===
            "function"
        ) {

            factionSelection.show(
                startGame
            );

        }

        else {

            startGame();

        }


        console.log(
            "东线 1941 V0.6 已启动"
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

    }

    catch (error) {

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
// 窗口大小变化
// ============================================================

window.addEventListener(

    "resize",

    () => {

        resizeCanvas();

        render();

    }

);


// ============================================================
// 调试接口
//
// 在浏览器 Console 可以输入：
//
// dubno.units
// dubno.selectedUnit
// dubno.camera
//
// 方便后续开发。
// ============================================================

window.dubno = {

    get units() {

        return units;

    },


    get selectedUnit() {

        return selectedUnit;

    },


    get turnSystem() {

        return turnSystem;

    },


    camera,

    renderer,

    selection,

    movementSystem,

    gameState,


    selectUnit,

    clearSelection,

    render

};


// ============================================================
// 启动
// ============================================================

resizeCanvas();

loadScenario();
