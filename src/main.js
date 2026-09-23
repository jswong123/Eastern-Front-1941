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
     * main.js
     * UnitSelection
     * Renderer
     *
     * 三者共享同一个 selectedUnit。
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

function calculateReachable(unit) {

    // 清除上一个单位的移动范围
    clearReachable();


    if (!unit) {

        return;

    }


    // 只有玩家当前能够控制的单位才显示移动范围
    if (
        !playerCanControlUnit(
            unit
        )
    ) {

        return;

    }


    // --------------------------------------------------------
    // 初始化 MovementSystem 中的单位移动数据
    // --------------------------------------------------------

    if (
        typeof movementSystem.initializeUnit ===
        "function"
    ) {

        movementSystem.initializeUnit(
            unit
        );

    }


    /*
     * TurnSystem 当前主要使用 actionPoints，
     * MovementSystem 使用 movementPoints。
     *
     * 在这里进行同步。
     */

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
    // 当前 MovementSystem 的主接口
    // --------------------------------------------------------

    if (
        typeof movementSystem.selectUnit ===
        "function"
    ) {

        try {

            movementSystem.selectUnit(
                unit,
                units
            );

        }

        catch (error) {

            console.error(
                "MovementSystem.selectUnit() 调用失败：",
                error
            );

            return;

        }

    }


    // --------------------------------------------------------
    // 兼容其他 MovementSystem 版本
    // --------------------------------------------------------

    else if (
        typeof movementSystem.calculateReachable ===
        "function"
    ) {

        try {

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

        catch (error) {

            console.error(
                "MovementSystem.calculateReachable() 调用失败：",
                error
            );

            return;

        }

    }


    else if (
        typeof movementSystem.computeReachable ===
        "function"
    ) {

        try {

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

        catch (error) {

            console.error(
                "MovementSystem.computeReachable() 调用失败：",
                error
            );

            return;

        }

    }


    else {

        console.error(
            "MovementSystem 中没有可用的移动范围计算接口"
        );

        return;

    }


    // --------------------------------------------------------
    // 保证 reachable 始终为 Map
    // --------------------------------------------------------

    if (
        !(movementSystem.reachable instanceof Map)
    ) {

        if (
            movementSystem.reachableHexes instanceof Map
        ) {

            movementSystem.reachable =
                movementSystem.reachableHexes;

        }

        else {

            movementSystem.reachable =
                new Map();

        }

    }


    // --------------------------------------------------------
    // 将结果交给 Renderer
    // --------------------------------------------------------

    if (
        typeof renderer.setReachable ===
        "function"
    ) {

        renderer.setReachable(
            movementSystem.reachable
        );

    }

    else {

        renderer.reachable =
            movementSystem.reachable;

    }


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
        movementSystem.reachable.size
    );

    console.log(
        "可移动格：",
        movementSystem.reachable
    );

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
     * 这里都强制同步：
     *
     * main.js
     * UnitSelection
     * Renderer
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

        console.log(
            "准备计算移动范围：",
            unit
        );


        calculateReachable(
            unit
        );


        console.log(
            "移动范围计算完成"
        );

    }

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
// 屏幕坐标 -> 世界坐标
// ============================================================

function screenToWorld(
    screenX,
    screenY
) {

    /*
     * Renderer 如果已经提供坐标转换，
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
     * 第一优先级：
     *
     * UnitSelection.findUnitAt()
     *
     * 单位最终显示在哪里，
     * UnitSelection 就在哪里进行屏幕命中检测。
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
     * 第二优先级：
     *
     * 按照 Renderer 实际单位屏幕位置
     * 进行命中检测。
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


    // 倒序检查，优先选择后绘制的单位
    for (
        let i = units.length - 1;
        i >= 0;
        i--
    ) {

        const unit =
            units[i];


        let screenPoint = null;


        // ----------------------------------------------------
        // Renderer.worldToScreen()
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

                // 接口参数可能不同，继续尝试后备方案

            }

        }


        // ----------------------------------------------------
        // Renderer.hexToScreen()
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
     * 最后的后备方案：
     *
     * Hex 命中。
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
            Number(data.cost)
        )
    ) {

        return Number(
            data.cost
        );

    }


    if (
        Number.isFinite(
            Number(data.totalCost)
        )
    ) {

        return Number(
            data.totalCost
        );

    }


    if (
        Number.isFinite(
            Number(data.distance)
        )
    ) {

        return Number(
            data.distance
        );

    }


    if (
        Number.isFinite(
            Number(data.apCost)
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


    // --------------------------------------------------------
    // 优先交给 TurnSystem
    // --------------------------------------------------------

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


            /*
             * TurnSystem 如果负责 AP，
             * 同步 MovementSystem 使用的 movementPoints。
             */

            const currentAP =
                getUnitAP(
                    unit
                );


            unit.movementPoints =
                currentAP;


            return;

        }

        catch (error) {

            console.warn(
                "TurnSystem.registerMove() 调用失败，改用本地 AP：",
                error
            );

        }

    }


    // --------------------------------------------------------
    // 本地 AP
    // --------------------------------------------------------

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


    // MovementSystem 同步
    unit.movementPoints =
        newAP;

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


    const cost =
        Number(amount);


    if (
        !Number.isFinite(cost) ||
        cost < 0
    ) {

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
                cost
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
        cost
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


    // --------------------------------------------------------
    // 玩家是否有权控制
    // --------------------------------------------------------

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
    // 目标格是否已经存在单位
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
         * V0.6：
         *
         * 这里暂时不直接执行攻击。
         *
         * 后续 CombatSystem 可以接在这里。
         */

        console.log(
            "目标格存在单位：",
            occupyingUnit
        );


        return false;

    }


    // --------------------------------------------------------
    // 读取可移动范围
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
    // 获取移动成本
    // --------------------------------------------------------

    const movementCost =
        getMovementCost(
            reachableData
        );


    if (
        movementCost == null
    ) {

        console.warn(
            "无法读取目标格移动成本：",
            reachableData
        );


        return false;

    }


    // --------------------------------------------------------
    // AP 检查
    // --------------------------------------------------------

    if (
        !canSpendAP(
            selectedUnit,
            movementCost
        )
    ) {

        console.log(
            "行动点不足"
        );


        return false;

    }


    // --------------------------------------------------------
    // 保存原坐标
    // --------------------------------------------------------

    const oldQ =
        Number(
            selectedUnit.q
        );


    const oldR =
        Number(
            selectedUnit.r
        );


    // --------------------------------------------------------
    // 尝试使用 MovementSystem 执行移动
    // --------------------------------------------------------

    let movedBySystem =
        false;


    /*
     * 兼容：
     *
     * moveUnit(unit,q,r,units)
     */

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
             * 就认为 MovementSystem 接受了移动。
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
                "MovementSystem.moveUnit() 调用失败：",
                error
            );

        }

    }


    /*
     * 兼容：
     *
     * moveTo(unit,q,r,units)
     */

    else if (
        typeof movementSystem.moveTo ===
        "function"
    ) {

        try {

            const result =
                movementSystem.moveTo(

                    selectedUnit,

                    q,

                    r,

                    units

                );


            if (
                result !== false
            ) {

                movedBySystem =
                    true;

            }

        }

        catch (error) {

            console.warn(
                "MovementSystem.moveTo() 调用失败：",
                error
            );

        }

    }


    // --------------------------------------------------------
    // 如果 MovementSystem 没有移动接口，
    // main.js 自己更新单位坐标
    // --------------------------------------------------------

    if (!movedBySystem) {

        selectedUnit.q =
            Number(q);

        selectedUnit.r =
            Number(r);

    }


    // --------------------------------------------------------
    // 检查最终位置
    // --------------------------------------------------------

    const positionChanged =

        Number(selectedUnit.q) !== oldQ ||

        Number(selectedUnit.r) !== oldR;


    /*
     * 某些 MovementSystem 返回成功，
     * 但没有直接修改 unit.q / unit.r。
     *
     * 此时 main.js 补上坐标更新。
     */

    if (!positionChanged) {

        selectedUnit.q =
            Number(q);

        selectedUnit.r =
            Number(r);

    }


    // --------------------------------------------------------
    // 消耗 AP
    // --------------------------------------------------------

    spendAP(
        selectedUnit,
        movementCost
    );


    // --------------------------------------------------------
    // 保持单位选择状态
    // --------------------------------------------------------

    syncSelectedUnit(
        selectedUnit
    );


    // --------------------------------------------------------
    // 根据剩余 AP 重新计算移动范围
    // --------------------------------------------------------

    calculateReachable(
        selectedUnit
    );


    // --------------------------------------------------------
    // 更新右侧单位信息
    // --------------------------------------------------------

    showUnitInfo(
        selectedUnit
    );


    // --------------------------------------------------------
    // 重绘
    // --------------------------------------------------------

    render();


    console.log(
        "单位移动：",
        `${oldQ},${oldR}`,
        "→",
        `${selectedUnit.q},${selectedUnit.r}`,
        "成本：",
        movementCost,
        "剩余AP：",
        getUnitAP(selectedUnit)
    );


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
         * 只有真正进入拖动状态以后，
         * 才移动地图。
         *
         * 这样普通点击单位时轻微的鼠标抖动
         * 不会取消 click。
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
// 鼠标离开窗口时停止拖动
// ============================================================

window.addEventListener(

    "blur",

    () => {

        isDragging =
            false;

        dragMoved =
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
        // 如果刚才发生了拖动，不执行点击
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
        // 第二优先级：点击可移动格
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
        // 点击普通空白区域
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

        console.warn(
            "TurnSystem 尚未初始化"
        );

        return;

    }


    // --------------------------------------------------------
    // 清除当前选择
    // --------------------------------------------------------

    clearSelection();


    // --------------------------------------------------------
    // 优先使用 TurnSystem.endPhase()
    // --------------------------------------------------------

    if (
        typeof turnSystem.endPhase ===
        "function"
    ) {

        try {

            turnSystem.endPhase();

        }

        catch (error) {

            console.error(
                "TurnSystem.endPhase() 执行失败：",
                error
            );

            return;

        }

    }


    // --------------------------------------------------------
    // 后备阶段切换
    // --------------------------------------------------------

    else {

        const current =
            getCurrentPhase();


        if (
            current === "german"
        ) {

            turnSystem.phase =
                "soviet";

        }

        else {

            turnSystem.phase =
                "german";


            // 苏军行动结束后进入下一回合
            if (
                Number.isFinite(
                    Number(turnSystem.turn)
                )
            ) {

                turnSystem.turn =
                    Number(turnSystem.turn) +
                    1;

            }

            else if (
                Number.isFinite(
                    Number(turnSystem.turnNumber)
                )
            ) {

                turnSystem.turnNumber =
                    Number(turnSystem.turnNumber) +
                    1;

            }

        }

    }


    // --------------------------------------------------------
    // UI
    // --------------------------------------------------------

    updateTurnUI();

    render();


    console.log(
        "阶段结束，当前行动方：",
        getCurrentPhase()
    );

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
        // ESC：取消选择
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
        // E：结束当前行动阶段
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
// 窗口尺寸变化
// ============================================================

window.addEventListener(

    "resize",

    () => {

        resizeCanvas();

        render();

    }

);


// ============================================================
// 从场景对象提取单位
// ============================================================

function extractUnitsFromScenario(data) {

    if (!data) {

        return [];

    }


    // --------------------------------------------------------
    // 标准格式：
    //
    // {
    //     units: [...]
    // }
    // --------------------------------------------------------

    if (
        Array.isArray(
            data.units
        )
    ) {

        return data.units;

    }


    // --------------------------------------------------------
    // 双方分开保存
    //
    // {
    //     germanUnits: [...],
    //     sovietUnits: [...]
    // }
    // --------------------------------------------------------

    const result = [];


    if (
        Array.isArray(
            data.germanUnits
        )
    ) {

        for (
            const unit of
            data.germanUnits
        ) {

            result.push({

                ...unit,

                side:
                    unit.side ??
                    unit.faction ??
                    "german"

            });

        }

    }


    if (
        Array.isArray(
            data.sovietUnits
        )
    ) {

        for (
            const unit of
            data.sovietUnits
        ) {

            result.push({

                ...unit,

                side:
                    unit.side ??
                    unit.faction ??
                    "soviet"

            });

        }

    }


    // --------------------------------------------------------
    // factions 格式
    // --------------------------------------------------------

    if (
        result.length === 0 &&
        data.factions
    ) {

        const german =

            data.factions.german ??
            data.factions.GER ??
            data.factions.axis;


        const soviet =

            data.factions.soviet ??
            data.factions.USSR ??
            data.factions.redArmy;


        if (
            Array.isArray(
                german
            )
        ) {

            for (
                const unit of german
            ) {

                result.push({

                    ...unit,

                    side:
                        unit.side ??
                        unit.faction ??
                        "german"

                });

            }

        }


        else if (
            Array.isArray(
                german?.units
            )
        ) {

            for (
                const unit of
                german.units
            ) {

                result.push({

                    ...unit,

                    side:
                        unit.side ??
                        unit.faction ??
                        "german"

                });

            }

        }


        if (
            Array.isArray(
                soviet
            )
        ) {

            for (
                const unit of soviet
            ) {

                result.push({

                    ...unit,

                    side:
                        unit.side ??
                        unit.faction ??
                        "soviet"

                });

            }

        }


        else if (
            Array.isArray(
                soviet?.units
            )
        ) {

            for (
                const unit of
                soviet.units
            ) {

                result.push({

                    ...unit,

                    side:
                        unit.side ??
                        unit.faction ??
                        "soviet"

                });

            }

        }

    }


    return result;

}


// ============================================================
// 场景加载
// ============================================================

async function loadScenario() {

    /*
     * 项目不同阶段可能使用过不同场景文件名。
     *
     * 依次尝试，成功一个即可。
     */

    const candidates = [

        "./data/scenarios/dubno_1941.json",

        "./data/dubno_1941.json",

        "./data/scenario.json",

        "./scenario.json"

    ];


    let lastError =
        null;


    for (
        const url of candidates
    ) {

        try {

            const response =
                await fetch(
                    url
                );


            if (!response.ok) {

                continue;

            }


            const data =
                await response.json();


            console.log(
                "场景加载成功：",
                url
            );


            return data;

        }

        catch (error) {

            lastError =
                error;

        }

    }


    if (lastError) {

        console.warn(
            "外部场景文件加载失败：",
            lastError
        );

    }


    /*
     * 如果你的单位本来由其他模块注入，
     * 返回 null 而不是直接终止游戏。
     */

    return null;

}


// ============================================================
// 默认测试单位
// ============================================================

function createFallbackUnits() {

    /*
     * 只有在场景完全没有单位时才会使用。
     *
     * 正常游戏不会进入这里。
     */

    return [

        {
            id: "GER_INF_01",
            name: "第1步兵团",
            nameZh: "第1步兵团",
            type: "infantry",
            typeZh: "步兵",
            side: "german",
            faction: "GER",
            q: 11,
            r: 14,

            actionPoints: 6,
            maxActionPoints: 6,

            movementPoints: 6,
            maxMovementPoints: 6,

            morale: 80,
            suppression: 0,
            fatigue: 0,
            ammunition: 100
        },


        {
            id: "GER_ARM_01",
            name: "第1装甲团",
            nameZh: "第1装甲团",
            type: "armor",
            typeZh: "装甲",
            side: "german",
            faction: "GER",
            q: 14,
            r: 12,

            actionPoints: 8,
            maxActionPoints: 8,

            movementPoints: 8,
            maxMovementPoints: 8,

            morale: 85,
            suppression: 0,
            fatigue: 0,
            ammunition: 100
        },


        {
            id: "USSR_INF_01",
            name: "苏军步兵第1团",
            nameZh: "苏军步兵第1团",
            type: "infantry",
            typeZh: "步兵",
            side: "soviet",
            faction: "USSR",
            q: 31,
            r: 17,

            actionPoints: 6,
            maxActionPoints: 6,

            movementPoints: 6,
            maxMovementPoints: 6,

            morale: 75,
            suppression: 0,
            fatigue: 0,
            ammunition: 100
        },


        {
            id: "USSR_ARM_01",
            name: "苏军坦克第1团",
            nameZh: "苏军坦克第1团",
            type: "armor",
            typeZh: "装甲",
            side: "soviet",
            faction: "USSR",
            q: 34,
            r: 15,

            actionPoints: 8,
            maxActionPoints: 8,

            movementPoints: 8,
            maxMovementPoints: 8,

            morale: 80,
            suppression: 0,
            fatigue: 0,
            ammunition: 100
        }

    ];

}


// ============================================================
// 设置场景
// ============================================================

function applyScenario(data) {

    scenario =
        data;


    let loadedUnits =
        extractUnitsFromScenario(
            data
        );


    // --------------------------------------------------------
    // 如果场景数据本身就是数组
    // --------------------------------------------------------

    if (
        loadedUnits.length === 0 &&
        Array.isArray(data)
    ) {

        loadedUnits =
            data;

    }


    // --------------------------------------------------------
    // 如果 Renderer / WorldMap 已经预装单位
    // --------------------------------------------------------

    if (
        loadedUnits.length === 0 &&
        Array.isArray(world.units)
    ) {

        loadedUnits =
            world.units;

    }


    // --------------------------------------------------------
    // 最终后备
    // --------------------------------------------------------

    if (
        loadedUnits.length === 0
    ) {

        console.warn(
            "没有从场景中读取到单位，使用默认测试单位"
        );


        loadedUnits =
            createFallbackUnits();

    }


    units =
        loadedUnits;


    initializeUnits();


    // --------------------------------------------------------
    // 同步 Renderer
    // --------------------------------------------------------

    renderer.units =
        units;


    renderer.world =
        world;


    renderer.camera =
        camera;


    renderer.movementSystem =
        movementSystem;


    renderer.selection =
        selection;


    // --------------------------------------------------------
    // 同步 UnitSelection
    // --------------------------------------------------------

    selection.units =
        units;


    // --------------------------------------------------------
    // 同步 GameState
    // --------------------------------------------------------

    gameState.units =
        units;


    console.log(
        "单位初始化完成：",
        units.length
    );

}


// ============================================================
// 相机初始位置
// ============================================================

function initializeCamera() {

    /*
     * 如果 Camera 自己提供 fitToMap，
     * 优先使用。
     */

    if (
        typeof camera.fitToMap ===
        "function"
    ) {

        try {

            camera.fitToMap(

                world,

                canvas.width,

                canvas.height

            );


            return;

        }

        catch (error) {

            console.warn(
                "camera.fitToMap() 调用失败：",
                error
            );

        }

    }


    /*
     * 不强行覆盖 Camera 已经存在的默认值。
     */

    if (
        camera.zoom == null ||
        !Number.isFinite(
            Number(camera.zoom)
        )
    ) {

        camera.zoom =
            1;

    }


    if (
        "x" in camera &&
        !Number.isFinite(
            Number(camera.x)
        )
    ) {

        camera.x =
            0;

    }


    if (
        "y" in camera &&
        !Number.isFinite(
            Number(camera.y)
        )
    ) {

        camera.y =
            0;

    }


    if (
        "offsetX" in camera &&
        !Number.isFinite(
            Number(camera.offsetX)
        )
    ) {

        camera.offsetX =
            0;

    }


    if (
        "offsetY" in camera &&
        !Number.isFinite(
            Number(camera.offsetY)
        )
    ) {

        camera.offsetY =
            0;

    }

}


// ============================================================
// 玩家选择阵营后开始游戏
// ============================================================

function startGame() {

    clearSelection();


    updateTurnUI();


    render();


    console.log(
        "游戏开始"
    );


    console.log(
        "玩家阵营：",
        getPlayerSide()
    );


    console.log(
        "当前行动方：",
        getCurrentPhase()
    );

}


// ============================================================
// 显示阵营选择
// ============================================================

function showFactionSelection() {

    if (
        !factionSelection ||
        typeof factionSelection.show !==
        "function"
    ) {

        console.warn(
            "FactionSelection 不可用，直接进入游戏"
        );


        startGame();

        return;

    }


    factionSelection.show(

        () => {

            startGame();

        }

    );

}


// ============================================================
// 初始化游戏
// ============================================================

async function initializeGame() {

    console.log(
        "正在初始化《东线 1941：杜布诺》..."
    );


    // --------------------------------------------------------
    // Canvas
    // --------------------------------------------------------

    resizeCanvas();


    // --------------------------------------------------------
    // 场景
    // --------------------------------------------------------

    let loadedScenario =
        null;


    try {

        loadedScenario =
            await loadScenario();

    }

    catch (error) {

        console.error(
            "场景加载出现异常：",
            error
        );

    }


    // --------------------------------------------------------
    // 应用场景
    // --------------------------------------------------------

    applyScenario(
        loadedScenario
    );


    // --------------------------------------------------------
    // 相机
    // --------------------------------------------------------

    initializeCamera();


    // --------------------------------------------------------
    // 回合系统
    // --------------------------------------------------------

    initializeTurnSystem();


    // --------------------------------------------------------
    // 初始渲染
    // --------------------------------------------------------

    render();


    // --------------------------------------------------------
    // 阵营选择
    // --------------------------------------------------------

    showFactionSelection();


    console.log(
        "初始化完成"
    );

}


// ============================================================
// 启动
// ============================================================

initializeGame()
    .catch(

        error => {

            console.error(
                "游戏初始化失败：",
                error
            );


            if (unitInfo) {

                unitInfo.innerHTML = `

                    <div class="unit-title">
                        游戏初始化失败
                    </div>

                    <p>
                        请打开浏览器开发者工具查看错误信息。
                    </p>

                `;

            }

        }

    );


// ============================================================
// 开发调试接口
// ============================================================

window.EasternFront1941 = {

    // --------------------------------------------------------
    // 核心对象
    // --------------------------------------------------------

    world,

    camera,

    renderer,

    gameState,

    selection,

    movementSystem,


    // --------------------------------------------------------
    // 获取游戏数据
    // --------------------------------------------------------

    getUnits() {

        return units;

    },


    getSelectedUnit() {

        return selectedUnit;

    },


    getTurnSystem() {

        return turnSystem;

    },


    getScenario() {

        return scenario;

    },


    // --------------------------------------------------------
    // 手动渲染
    // --------------------------------------------------------

    render() {

        render();

    },


    // --------------------------------------------------------
    // 手动结束阶段
    // --------------------------------------------------------

    endPhase() {

        endCurrentPhase();

    },


    // --------------------------------------------------------
    // 手动清除选择
    // --------------------------------------------------------

    clearSelection() {

        clearSelection();

        render();

    },


    // --------------------------------------------------------
    // 手动选择单位
    // --------------------------------------------------------

    selectUnitById(id) {

        const unit =
            units.find(

                item =>
                    String(item.id) ===
                    String(id)

            );


        if (!unit) {

            console.warn(
                "找不到单位：",
                id
            );


            return null;

        }


        selectUnit(
            unit
        );


        return unit;

    },


    // --------------------------------------------------------
    // 手动计算移动范围
    // --------------------------------------------------------

    calculateReachable(id) {

        const unit =
            units.find(

                item =>
                    String(item.id) ===
                    String(id)

            );


        if (!unit) {

            console.warn(
                "找不到单位：",
                id
            );


            return null;

        }


        calculateReachable(
            unit
        );


        render();


        return (
            movementSystem.reachable ??
            movementSystem.reachableHexes ??
            null
        );

    }

};


// ============================================================
// 完成
// ============================================================

console.log(
    "main.js 已加载"
);
