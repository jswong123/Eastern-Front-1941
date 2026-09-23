// ============================================================
// main.js
// 东线 1941：杜布诺
// 精简稳定版
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
const mapArea = document.getElementById("mapArea");
const unitInfo = document.getElementById("unitInfo");

const turnInfo = document.getElementById("turnInfo");
const turnNumber = document.getElementById("turnNumber");
const turnTime = document.getElementById("turnTime");
const turnPhase = document.getElementById("turnPhase");
const endPhaseButton = document.getElementById("endPhaseButton");

if (!canvas) {
    throw new Error("找不到 #game-canvas");
}


// ============================================================
// 核心对象
// ============================================================

const world = new WorldMap();
const camera = new Camera();
const renderer = new Renderer(canvas, world, camera);

const gameState = new GameState();
const selection = new UnitSelection(renderer, gameState);
const movementSystem = new MovementSystem(world);
const factionSelection = new FactionSelection(gameState);

renderer.selection = selection;
renderer.movementSystem = movementSystem;


// ============================================================
// 游戏状态
// ============================================================

let units = [];
let selectedUnit = null;
let turnSystem = null;

let dragging = false;
let dragMoved = false;
let lastMouseX = 0;
let lastMouseY = 0;


// ============================================================
// 工具函数
// ============================================================

function normalizeSide(value) {

    value = String(value ?? "")
        .trim()
        .toLowerCase();

    if (
        value === "ger" ||
        value === "german" ||
        value === "germany" ||
        value === "axis" ||
        value === "德军"
    ) {
        return "german";
    }

    if (
        value === "ussr" ||
        value === "soviet" ||
        value === "redarmy" ||
        value === "red_army" ||
        value === "苏军" ||
        value === "红军"
    ) {
        return "soviet";
    }

    if (value === "observer") {
        return "observer";
    }

    return value;
}


function unitSide(unit) {

    return normalizeSide(
        unit?.side ??
        unit?.faction ??
        unit?.camp ??
        unit?.nation
    );
}


function playerSide() {

    return normalizeSide(
        gameState.playerFaction ??
        gameState.playerSide ??
        gameState.faction ??
        gameState.side
    );
}


function currentPhase() {

    if (!turnSystem) {
        return "german";
    }

    return normalizeSide(
        turnSystem.phase ??
        turnSystem.currentPhase ??
        turnSystem.side
    );
}


function isObserver() {

    return (
        gameState.observerMode === true ||
        gameState.mode === "observer" ||
        playerSide() === "observer"
    );
}


function render() {

    renderer.render(units);
}


// ============================================================
// Canvas
// ============================================================

function resizeCanvas() {

    const rect =
        (mapArea ?? canvas.parentElement)
            .getBoundingClientRect();

    canvas.width = Math.max(1, Math.floor(rect.width));
    canvas.height = Math.max(1, Math.floor(rect.height));

    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
}


window.addEventListener("resize", () => {

    resizeCanvas();
    render();

});


// ============================================================
// AP
// ============================================================

function getAP(unit) {

    return Number(
        unit?.actionPoints ??
        unit?.ap ??
        unit?.movementPoints ??
        0
    );
}


function getMaxAP(unit) {

    return Number(
        unit?.maxActionPoints ??
        unit?.maxAP ??
        unit?.maxMovementPoints ??
        getAP(unit)
    );
}


function setAP(unit, value) {

    const ap = Math.max(0, Number(value) || 0);

    unit.actionPoints = ap;
    unit.ap = ap;
    unit.movementPoints = ap;
}


// ============================================================
// 初始化单位
// ============================================================

function initializeUnits() {

    for (const unit of units) {

        unit.q = Number(unit.q ?? 0);
        unit.r = Number(unit.r ?? 0);

        const side = unitSide(unit);

        if (side) {
            unit.side = side;
        }

        if (
            typeof movementSystem.initializeUnit === "function"
        ) {
            movementSystem.initializeUnit(unit);
        }

        const maxAP = getMaxAP(unit);

        if (!Number.isFinite(getAP(unit))) {
            setAP(unit, maxAP || 6);
        }

        if (unit.maxActionPoints == null) {
            unit.maxActionPoints =
                Number(unit.maxMovementPoints ?? maxAP ?? 6);
        }

        if (unit.morale == null) unit.morale = 80;
        if (unit.suppression == null) unit.suppression = 0;
        if (unit.fatigue == null) unit.fatigue = 0;
        if (unit.ammunition == null) unit.ammunition = 100;
    }
}


// ============================================================
// 回合
// ============================================================

function initializeTurnSystem() {

    turnSystem = new TurnSystem({
        units,
        year: 1941,
        month: 6,
        day: 26,
        hour: 8,
        minute: 0,
        hoursPerTurn: 2,
        startingPhase: "german"
    });

    turnSystem.onPhaseChanged = () => {
        clearSelection();
        updateTurnUI();
        render();
    };

    turnSystem.onTurnChanged = () => {
        updateTurnUI();
        render();
    };

    turnSystem.onTimeChanged = () => {
        updateTurnUI();
    };

    updateTurnUI();
}


function updateTurnUI() {

    if (!turnSystem) return;

    const phase = currentPhase();

    const number =
        turnSystem.turn ??
        turnSystem.turnNumber ??
        1;

    if (turnNumber) {
        turnNumber.textContent = `第${number}回合`;
    }

    if (turnPhase) {
        turnPhase.textContent =
            phase === "soviet"
                ? "苏军行动"
                : "德军行动";
    }

    if (endPhaseButton) {
        endPhaseButton.textContent =
            phase === "soviet"
                ? "结束苏军行动"
                : "结束德军行动";
    }

    if (turnInfo) {

        if (typeof turnSystem.getHeaderText === "function") {
            turnInfo.textContent =
                turnSystem.getHeaderText();
        }
    }

    if (turnTime) {

        if (typeof turnSystem.getTurnTimeRange === "function") {
            turnTime.textContent =
                turnSystem.getTurnTimeRange();
        }
    }
}


function canControl(unit) {

    if (!unit || isObserver()) {
        return false;
    }

    if (unitSide(unit) !== currentPhase()) {
        return false;
    }

    const player = playerSide();

    if (!player) {
        return true;
    }

    return unitSide(unit) === player;
}


// ============================================================
// 单位信息
// ============================================================

function showUnitInfo(unit) {

    if (!unitInfo || !unit) return;

    const sideName =
        unitSide(unit) === "german"
            ? "德军"
            : "苏军";

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

    unitInfo.innerHTML = `
        <div class="unit-title">${name}</div>

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
            <strong>${getAP(unit)} / ${getMaxAP(unit)}</strong>
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
                ${canControl(unit) ? "可行动" : "不可行动"}
            </strong>
        </div>
    `;
}


// ============================================================
// 清除移动范围
// ============================================================

function clearReachable() {

    if (
        typeof movementSystem.clearSelection === "function"
    ) {
        movementSystem.clearSelection();
    }

    if (movementSystem.reachable instanceof Map) {
        movementSystem.reachable.clear();
    }

    if (movementSystem.reachableHexes instanceof Map) {
        movementSystem.reachableHexes.clear();
    }

    if (
        typeof renderer.clearReachable === "function"
    ) {
        renderer.clearReachable();
    }
}


// ============================================================
// 计算移动范围
// ============================================================

function calculateReachable(unit) {

    clearReachable();

    if (!canControl(unit)) {
        return;
    }

    unit.movementPoints = getAP(unit);

    let result = null;

    if (
        typeof movementSystem.selectUnit === "function"
    ) {

        result = movementSystem.selectUnit(
            unit,
            units
        );

    }

    else if (
        typeof movementSystem.calculateReachable === "function"
    ) {

        result = movementSystem.calculateReachable(
            unit,
            units
        );

    }

    else if (
        typeof movementSystem.computeReachable === "function"
    ) {

        result = movementSystem.computeReachable(
            unit,
            units
        );
    }

    if (result instanceof Map) {
        movementSystem.reachable = result;
    }

    const reachable =
        movementSystem.reachable ??
        movementSystem.reachableHexes ??
        result;

    if (
        typeof renderer.setReachable === "function"
    ) {
        renderer.setReachable(reachable);
    }

    console.log(
        "可移动范围：",
        reachable
    );
}


// ============================================================
// 选择单位
// ============================================================

function selectUnit(unit) {

    if (!unit) return;

    selectedUnit = unit;
    selection.selectedUnit = unit;

    if (typeof selection.select === "function") {

        try {
            selection.select(unit);
        }
        catch (error) {
            console.warn(
                "UnitSelection.select()：",
                error
            );
        }
    }

    if (
        typeof renderer.setSelectedUnit === "function"
    ) {
        renderer.setSelectedUnit(unit);
    }

    showUnitInfo(unit);

    if (canControl(unit)) {
        calculateReachable(unit);
    }
    else {
        clearReachable();
    }

    render();
}


function clearSelection() {

    selectedUnit = null;

    if (typeof selection.clear === "function") {

        try {
            selection.clear();
        }
        catch (error) {
            console.warn(error);
        }
    }

    selection.selectedUnit = null;

    if (
        typeof renderer.setSelectedUnit === "function"
    ) {
        renderer.setSelectedUnit(null);
    }

    clearReachable();

    if (unitInfo) {
        unitInfo.innerHTML =
            "点击地图上的单位查看详情";
    }
}


// ============================================================
// 单位位置
// ============================================================

function unitAtHex(q, r) {

    return units.find(
        unit =>
            Number(unit.q) === Number(q) &&
            Number(unit.r) === Number(r)
    ) ?? null;
}


// ============================================================
// 坐标
// ============================================================

function mousePosition(event) {

    const rect =
        canvas.getBoundingClientRect();

    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}


function screenToWorld(x, y) {

    if (
        typeof renderer.screenToWorld === "function"
    ) {

        const result =
            renderer.screenToWorld(x, y);

        if (result) return result;
    }

    const zoom =
        Number(camera.zoom ?? 1);

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
        x: (x - offsetX) / zoom,
        y: (y - offsetY) / zoom
    };
}


function mouseToHex(event) {

    const mouse =
        mousePosition(event);

    const worldPoint =
        screenToWorld(
            mouse.x,
            mouse.y
        );

    const size =
        Number(
            renderer.hexSize ??
            renderer.size ??
            world.hexSize ??
            18
        );

    const hex =
        pixelToHex(
            worldPoint.x,
            worldPoint.y,
            size
        );

    if (!hex) return null;

    return {
        q: Math.round(Number(hex.q)),
        r: Math.round(Number(hex.r))
    };
}


// ============================================================
// 点击单位检测
// ============================================================

function findUnit(event) {

    const mouse =
        mousePosition(event);

    if (
        typeof selection.findUnitAt === "function"
    ) {

        try {

            const unit =
                selection.findUnitAt(
                    mouse.x,
                    mouse.y,
                    units,
                    camera,
                    renderer
                );

            if (unit) {
                return unit;
            }
        }
        catch (error) {
            console.warn(
                "findUnitAt：",
                error
            );
        }
    }

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
// Reachable
// ============================================================

function reachableAt(q, r) {

    const key = `${q},${r}`;

    const sources = [
        movementSystem.reachable,
        movementSystem.reachableHexes,
        renderer.reachable,
        renderer.reachableHexes
    ];

    for (const source of sources) {

        if (!source) continue;

        if (source instanceof Map) {

            if (source.has(key)) {
                return source.get(key);
            }
        }

        else if (
            typeof source === "object" &&
            Object.prototype.hasOwnProperty.call(
                source,
                key
            )
        ) {
            return source[key];
        }
    }

    return null;
}


function movementCost(data) {

    if (data == null) {
        return null;
    }

    if (typeof data === "number") {
        return data;
    }

    if (data === true) {
        return 1;
    }

    const values = [
        data.cost,
        data.totalCost,
        data.apCost,
        data.distance,
        data.g
    ];

    for (const value of values) {

        const number =
            Number(value);

        if (Number.isFinite(number)) {
            return number;
        }
    }

    return null;
}


// ============================================================
// 移动
// ============================================================

function moveSelectedUnit(q, r) {

    if (!selectedUnit) {
        return false;
    }

    if (!canControl(selectedUnit)) {
        return false;
    }

    if (
        selectedUnit.q === q &&
        selectedUnit.r === r
    ) {
        return false;
    }

    if (unitAtHex(q, r)) {
        return false;
    }

    const data =
        reachableAt(q, r);

    if (data == null) {
        return false;
    }

    const cost =
        movementCost(data);

    if (
        cost == null ||
        cost > getAP(selectedUnit)
    ) {
        return false;
    }

    const oldQ = selectedUnit.q;
    const oldR = selectedUnit.r;

    let moved = false;

    if (
        typeof movementSystem.moveUnit === "function"
    ) {

        try {

            const result =
                movementSystem.moveUnit(
                    selectedUnit,
                    q,
                    r,
                    units
                );

            moved = result !== false;
        }
        catch (error) {
            console.warn(
                "MovementSystem.moveUnit()：",
                error
            );
        }
    }

    else if (
        typeof movementSystem.moveTo === "function"
    ) {

        try {

            const result =
                movementSystem.moveTo(
                    selectedUnit,
                    q,
                    r,
                    units
                );

            moved = result !== false;
        }
        catch (error) {
            console.warn(
                "MovementSystem.moveTo()：",
                error
            );
        }
    }

    /*
     * MovementSystem 没有真正更新坐标时，
     * main.js 负责更新。
     */
    if (
        !moved ||
        (
            Number(selectedUnit.q) === Number(oldQ) &&
            Number(selectedUnit.r) === Number(oldR)
        )
    ) {
        selectedUnit.q = q;
        selectedUnit.r = r;
    }

    /*
     * 如果 MovementSystem 已经扣除了 movementPoints，
     * 使用它；否则自行扣除 AP。
     */
    let remainingAP =
        Number(selectedUnit.movementPoints);

    if (
        !Number.isFinite(remainingAP) ||
        remainingAP === getAP(selectedUnit)
    ) {
        remainingAP =
            getAP(selectedUnit) - cost;
    }

    setAP(
        selectedUnit,
        remainingAP
    );

    showUnitInfo(selectedUnit);

    calculateReachable(selectedUnit);

    render();

    console.log(
        `移动 ${oldQ},${oldR} → ${q},${r}`,
        `成本 ${cost}`,
        `剩余 AP ${getAP(selectedUnit)}`
    );

    return true;
}


// ============================================================
// 地图点击
// ============================================================

canvas.addEventListener(
    "click",
    event => {

        if (dragMoved) {

            dragMoved = false;
            return;
        }

        const clickedUnit =
            findUnit(event);

        if (clickedUnit) {

            selectUnit(clickedUnit);
            return;
        }

        if (selectedUnit) {

            const hex =
                mouseToHex(event);

            if (
                hex &&
                moveSelectedUnit(
                    hex.q,
                    hex.r
                )
            ) {
                return;
            }
        }

        clearSelection();
        render();
    }
);


// ============================================================
// 拖动地图
// ============================================================

canvas.addEventListener(
    "mousedown",
    event => {

        if (event.button !== 0) {
            return;
        }

        dragging = true;
        dragMoved = false;

        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    }
);


window.addEventListener(
    "mousemove",
    event => {

        if (!dragging) {
            return;
        }

        const dx =
            event.clientX - lastMouseX;

        const dy =
            event.clientY - lastMouseY;

        if (
            Math.abs(dx) > 3 ||
            Math.abs(dy) > 3
        ) {
            dragMoved = true;
        }

        if (dragMoved) {

            if (
                typeof camera.pan === "function"
            ) {
                camera.pan(dx, dy);
            }

            else {

                if ("x" in camera) {
                    camera.x =
                        Number(camera.x ?? 0) + dx;
                }

                if ("y" in camera) {
                    camera.y =
                        Number(camera.y ?? 0) + dy;
                }

                if ("offsetX" in camera) {
                    camera.offsetX =
                        Number(camera.offsetX ?? 0) + dx;
                }

                if ("offsetY" in camera) {
                    camera.offsetY =
                        Number(camera.offsetY ?? 0) + dy;
                }
            }

            render();
        }

        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    }
);


window.addEventListener(
    "mouseup",
    () => {
        dragging = false;
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
// 缩放
// ============================================================

canvas.addEventListener(
    "wheel",
    event => {

        event.preventDefault();

        const oldZoom =
            Number(camera.zoom ?? 1);

        const factor =
            event.deltaY < 0
                ? 1.1
                : 0.9;

        camera.zoom =
            Math.max(
                0.35,
                Math.min(
                    3,
                    oldZoom * factor
                )
            );

        render();
    },
    {
        passive: false
    }
);


// ============================================================
// 结束行动
// ============================================================

function endCurrentPhase() {

    if (!turnSystem) {
        return;
    }

    clearSelection();

    if (
        typeof turnSystem.endPhase === "function"
    ) {

        try {

            turnSystem.endPhase();

            updateTurnUI();
            render();

            return;
        }

        catch (error) {

            console.error(
                "TurnSystem.endPhase()：",
                error
            );
        }
    }

    /*
     * 后备机制。
     *
     * 如果 TurnSystem 没有 endPhase，
     * main.js 自己完成阶段切换。
     */

    const phase =
        currentPhase();

    if (phase === "german") {

        turnSystem.phase =
            "soviet";
    }

    else {

        turnSystem.phase =
            "german";

        if (
            Number.isFinite(
                Number(turnSystem.turn)
            )
        ) {
            turnSystem.turn++;
        }

        else if (
            Number.isFinite(
                Number(turnSystem.turnNumber)
            )
        ) {
            turnSystem.turnNumber++;
        }
    }

    updateTurnUI();
    render();
}


// ============================================================
// 结束行动按钮
// ============================================================

if (endPhaseButton) {

    endPhaseButton.addEventListener(
        "click",
        event => {

            event.preventDefault();
            event.stopPropagation();

            console.log(
                "结束行动"
            );

            endCurrentPhase();
        }
    );
}

else {

    console.warn(
        "没有找到 #endPhaseButton"
    );
}


// ============================================================
// 键盘
// ============================================================

window.addEventListener(
    "keydown",
    event => {

        if (event.key === "Escape") {

            clearSelection();
            render();

            return;
        }

        if (
            event.key.toLowerCase() === "e"
        ) {
            endCurrentPhase();
        }
    }
);


// ============================================================
// 场景单位
// ============================================================

function extractUnits(data) {

    if (!data) {
        return [];
    }

    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data.units)) {
        return data.units;
    }

    const result = [];

    const german =
        data.germanUnits ??
        data.german?.units ??
        data.factions?.german?.units ??
        data.factions?.GER?.units;

    const soviet =
        data.sovietUnits ??
        data.soviet?.units ??
        data.factions?.soviet?.units ??
        data.factions?.USSR?.units;

    if (Array.isArray(german)) {

        for (const unit of german) {

            result.push({
                ...unit,
                side:
                    unit.side ??
                    unit.faction ??
                    "german"
            });
        }
    }

    if (Array.isArray(soviet)) {

        for (const unit of soviet) {

            result.push({
                ...unit,
                side:
                    unit.side ??
                    unit.faction ??
                    "soviet"
            });
        }
    }

    return result;
}


// ============================================================
// 加载场景
// ============================================================

async function loadScenario() {

    const paths = [
        "./data/scenarios/dubno_1941.json",
        "./data/dubno_1941.json",
        "./data/scenario.json",
        "./scenario.json"
    ];

    for (const path of paths) {

        try {

            const response =
                await fetch(path);

            if (!response.ok) {
                continue;
            }

            const data =
                await response.json();

            console.log(
                "场景加载成功：",
                path
            );

            return data;
        }

        catch (error) {

            // 尝试下一个路径
        }
    }

    return null;
}


// ============================================================
// 后备单位
// ============================================================

function fallbackUnits() {

    return [

        {
            id: "GER_ARM_01",
            nameZh: "德军第1装甲团",
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
            id: "GER_INF_01",
            nameZh: "德军第1步兵团",
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
            id: "USSR_ARM_01",
            nameZh: "苏军第1坦克团",
            typeZh: "装甲",
            side: "soviet",
            faction: "USSR",

            q: 31,
            r: 17,

            actionPoints: 8,
            maxActionPoints: 8,

            movementPoints: 8,
            maxMovementPoints: 8,

            morale: 80,
            suppression: 0,
            fatigue: 0,
            ammunition: 100
        },

        {
            id: "USSR_INF_01",
            nameZh: "苏军第1步兵团",
            typeZh: "步兵",
            side: "soviet",
            faction: "USSR",

            q: 34,
            r: 15,

            actionPoints: 6,
            maxActionPoints: 6,

            movementPoints: 6,
            maxMovementPoints: 6,

            morale: 75,
            suppression: 0,
            fatigue: 0,
            ammunition: 100
        }
    ];
}


// ============================================================
// 应用场景
// ============================================================

function applyScenario(data) {

    units =
        extractUnits(data);

    if (
        units.length === 0 &&
        Array.isArray(world.units)
    ) {
        units = world.units;
    }

    if (units.length === 0) {

        console.warn(
            "未读取到场景单位，使用测试单位"
        );

        units =
            fallbackUnits();
    }

    initializeUnits();

    renderer.units = units;
    renderer.selection = selection;
    renderer.movementSystem = movementSystem;

    selection.units = units;
    gameState.units = units;

    console.log(
        `已载入 ${units.length} 个单位`
    );
}


// ============================================================
// 相机初始化
// ============================================================

function initializeCamera() {

    if (
        typeof camera.fitToMap === "function"
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
                "fitToMap 失败：",
                error
            );
        }
    }

    if (
        !Number.isFinite(
            Number(camera.zoom)
        )
    ) {
        camera.zoom = 1;
    }
}


// ============================================================
// 开始游戏
// ============================================================

function startGame() {

    clearSelection();

    updateTurnUI();
    render();

    console.log(
        "游戏开始",
        {
            player: playerSide(),
            phase: currentPhase()
        }
    );
}


// ============================================================
// 初始化
// ============================================================

async function initializeGame() {

    console.log(
        "正在初始化《东线 1941：杜布诺》"
    );

    resizeCanvas();

    const scenario =
        await loadScenario();

    applyScenario(scenario);

    initializeCamera();

    initializeTurnSystem();

    render();

    /*
     * 阵营选择。
     */

    if (
        factionSelection &&
        typeof factionSelection.show === "function"
    ) {

        factionSelection.show(
            () => {
                startGame();
            }
        );
    }

    else {

        startGame();
    }
}


// ============================================================
// 调试接口
// ============================================================

window.EasternFront1941 = {

    world,
    camera,
    renderer,
    gameState,
    selection,
    movementSystem,

    getUnits() {
        return units;
    },

    getSelectedUnit() {
        return selectedUnit;
    },

    getTurnSystem() {
        return turnSystem;
    },

    render,

    endPhase() {
        endCurrentPhase();
    },

    selectUnit(id) {

        const unit =
            units.find(
                item =>
                    String(item.id) ===
                    String(id)
            );

        if (unit) {
            selectUnit(unit);
        }

        return unit ?? null;
    },

    clearSelection() {

        clearSelection();
        render();
    }
};


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
                        请查看浏览器 Console。
                    </p>
                `;
            }
        }
    );


console.log(
    "main.js 已加载"
);
