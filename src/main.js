// ============================================================
// main.js
// 东线 1941 V1.1
//
// 双阵营玩家控制 / 动态 AI
// 战斗反馈 / 最大兵力 / 阵亡单位清理
// ============================================================


import { WorldMap } from "./WorldMap.js";

import { Camera } from "./Camera.js";

import { Renderer } from "./Renderer.js";

import { UnitSelection } from "./UnitSelection.js";

import { GameState } from "./GameState.js";

import { FactionSelection } from "./FactionSelection.js";

import { TurnSystem } from "./TurnSystem.js";

import { MovementSystem } from "./systems/MovementSystem.js";

import { CombatSystem } from "./systems/CombatSystem.js";

import { AISystem } from "./systems/AISystem.js";

import { pixelToHex } from "./Hex.js";


// ============================================================
// DOM
// ============================================================

const canvas =
    document.getElementById(
        "game-canvas"
    );


const mapArea =
    document.getElementById(
        "mapArea"
    );


const unitInfo =
    document.getElementById(
        "unitInfo"
    );


const turnInfo =
    document.getElementById(
        "turnInfo"
    );


const turnNumber =
    document.getElementById(
        "turnNumber"
    );


const turnTime =
    document.getElementById(
        "turnTime"
    );


const turnPhase =
    document.getElementById(
        "turnPhase"
    );


const endPhaseButton =
    document.getElementById(
        "endPhaseButton"
    );


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


const combatSystem =
    new CombatSystem(
        world
    );


const aiSystem =
    new AISystem(
        movementSystem,
        combatSystem
    );


const factionSelection =
    new FactionSelection(
        gameState
    );


// Renderer 读取移动系统

renderer.movementSystem =
    movementSystem;


// ============================================================
// 游戏状态
// ============================================================

let scenario = null;

let units = [];

let turnSystem = null;

let selectedUnit = null;

let gameOver = false;

let aiRunning = false;


// ============================================================
// 最近一次战斗信息
// ============================================================

let lastBattleMessage = "";


// ============================================================
// 鼠标状态
// ============================================================

let isDragging = false;

let dragMoved = false;

let lastMouseX = 0;

let lastMouseY = 0;


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


    const dpr =
        window.devicePixelRatio ||
        1;


    canvas.width =
        Math.max(
            1,
            Math.floor(
                rect.width *
                dpr
            )
        );


    canvas.height =
        Math.max(
            1,
            Math.floor(
                rect.height *
                dpr
            )
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

    renderer.render(
        units
    );

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
        value === "德军"
    ) {

        return "german";

    }


    if (
        value === "ussr" ||
        value === "soviet" ||
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
// 玩家阵营
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
// 单位名称
// ============================================================

function unitName(unit) {

    return (

        unit?.nameZh ??
        unit?.name ??
        unit?.id ??
        "未命名单位"

    );

}


// ============================================================
// 当前兵力
// ============================================================

function getUnitStrength(unit) {

    const value =
        Number(
            unit?.strength ??
            100
        );


    return Number.isFinite(value)
        ? Math.max(0, value)
        : 100;

}


// ============================================================
// 最大兵力
// ============================================================

function getUnitMaxStrength(unit) {

    const value =
        Number(
            unit?.maxStrength ??
            100
        );


    return Number.isFinite(value)
        ? Math.max(1, value)
        : 100;

}


// ============================================================
// 单位是否存活
// ============================================================

function isUnitAlive(unit) {

    return (

        !!unit &&

        unit.destroyed !== true &&

        getUnitStrength(unit) > 0

    );

}


// ============================================================
// 初始化单位
// ============================================================

function initializeUnits() {

    for (
        const unit
        of units
    ) {

        // ----------------------------------------
        // 阵营
        // ----------------------------------------

        const side =
            getUnitSide(unit);


        if (side) {

            unit.side =
                side;

            unit.faction =
                side;

        }


        // ----------------------------------------
        // 当前兵力
        // ----------------------------------------

        if (
            unit.strength ==
            null
        ) {

            unit.strength =
                100;

        }


        // ----------------------------------------
        // 最大兵力
        //
        // 第一次加载时记录单位原始兵力
        // ----------------------------------------

        if (
            unit.maxStrength ==
            null
        ) {

            unit.maxStrength =
                Math.max(
                    1,
                    Number(
                        unit.strength ??
                        100
                    )
                );

        }


        // ----------------------------------------
        // 已经没有兵力的单位
        // ----------------------------------------

        if (
            unit.strength <= 0
        ) {

            unit.strength = 0;

            unit.destroyed = true;

        }


        // ----------------------------------------
        // 战斗系统
        // ----------------------------------------

        combatSystem.resetUnit(
            unit
        );


        // ----------------------------------------
        // 移动系统
        // ----------------------------------------

        if (
            typeof movementSystem.initializeUnit ===
            "function"
        ) {

            movementSystem.initializeUnit(
                unit
            );

        }


        // ----------------------------------------
        // 默认战斗状态
        // ----------------------------------------

        if (
            unit.morale ==
            null
        ) {

            unit.morale = 80;

        }


        if (
            unit.suppression ==
            null
        ) {

            unit.suppression = 0;

        }


        if (
            unit.fatigue ==
            null
        ) {

            unit.fatigue = 0;

        }


        if (
            unit.ammunition ==
            null
        ) {

            unit.ammunition = 100;

        }

    }


    // 场景中如果本身存在 0 兵力单位，
    // 初始化阶段直接清除。

    removeDestroyedUnits();

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

            startingPhase:
                "german"

        });


    // ----------------------------------------
    // 阶段改变
    // ----------------------------------------

    turnSystem.onPhaseChanged =
        () => {

            clearSelection();

            updateTurnUI();

            render();

        };


    // ----------------------------------------
    // 回合改变
    // ----------------------------------------

    turnSystem.onTurnChanged =
        () => {

            updateTurnUI();

            render();

        };


    // ----------------------------------------
    // 时间改变
    // ----------------------------------------

    turnSystem.onTimeChanged =
        () => {

            updateTurnUI();

        };


    updateTurnUI();

}


// ============================================================
// 回合 UI
// ============================================================

function updateTurnUI() {

    if (!turnSystem) {

        return;

    }


    // ----------------------------------------
    // 顶部状态
    // ----------------------------------------

    if (turnInfo) {

        if (
            typeof turnSystem.getHeaderText ===
            "function"
        ) {

            turnInfo.textContent =
                turnSystem.getHeaderText();

        }

    }


    // ----------------------------------------
    // 回合数
    // ----------------------------------------

    const number =

        typeof turnSystem.getTurnNumber ===
        "function"

            ? turnSystem.getTurnNumber()

            : turnSystem.turn ??
            1;


    if (turnNumber) {

        turnNumber.textContent =
            `第${number}回合`;

    }


    // ----------------------------------------
    // 时间
    // ----------------------------------------

    if (turnTime) {

        if (
            typeof turnSystem.getTurnTimeRange ===
            "function"
        ) {

            turnTime.textContent =
                turnSystem.getTurnTimeRange();

        }

    }


    // ----------------------------------------
    // 当前阶段
    // ----------------------------------------

    const phase =
        normalizeSide(
            turnSystem.phase
        );


    const phaseName =

        phase === "soviet"

            ? "苏军行动"

            : "德军行动";


    if (turnPhase) {

        turnPhase.textContent =

            typeof turnSystem.getPhaseName ===
            "function"

                ? turnSystem.getPhaseName()

                : phaseName;

    }


    // ----------------------------------------
    // 结束阶段按钮
    // ----------------------------------------

    if (endPhaseButton) {

        endPhaseButton.textContent =

            phase === "soviet"

                ? "结束苏军行动"

                : "结束德军行动";

    }

}


// ============================================================
// 单位是否属于当前行动阶段
// ============================================================

function isUnitActive(unit) {

    if (!unit) {

        return false;

    }


    if (!turnSystem) {

        return true;

    }


    return (

        getUnitSide(unit) ===

        normalizeSide(
            turnSystem.phase
        )

    );

}


// ============================================================
// 玩家能否控制单位
// ============================================================

function playerCanControlUnit(unit) {

    if (
        !unit ||
        !isUnitAlive(unit)
    ) {

        return false;

    }


    if (
        !isUnitActive(
            unit
        )
    ) {

        return false;

    }


    if (
        gameState.mode ===
        "observer"
    ) {

        return false;

    }


    const playerSide =
        getPlayerSide();


    if (!playerSide) {

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

    return (
        !!unit &&
        isUnitAlive(unit)
    );

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
        movementSystem.reachable
        instanceof Map
    ) {

        movementSystem.reachable.clear();

    }

}


// ============================================================
// 清除选择
// ============================================================

function clearSelection() {

    selectedUnit =
        null;


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

        renderer.setSelectedUnit(
            null
        );

    }


    clearReachable();


    if (unitInfo) {

        if (lastBattleMessage) {

            unitInfo.innerHTML = `

                <p class="hint">
                    点击地图上的单位查看详情
                </p>

                <hr>

                <div class="battle-message">

                    <strong>
                        最近战斗
                    </strong>

                    <br><br>

                    ${lastBattleMessage}

                </div>

            `;

        }
        else {

            unitInfo.innerHTML =
                "点击地图上的单位查看详情";

        }

    }

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
        getUnitSide(
            unit
        );


    const sideName =

        side === "german"

            ? "德军"

            : side === "soviet"

                ? "苏军"

                : "未知";


    const name =
        unitName(
            unit
        );


    const type =

        unit.typeZh ??
        unit.type ??
        unit.unitType ??
        "未知";


    const ap =

        unit.movementPoints ??
        unit.actionPoints ??
        unit.ap ??
        "—";


    const maxAP =

        unit.maxMovementPoints ??
        unit.maxActionPoints ??
        unit.maxAP ??
        "—";


    const strength =
        getUnitStrength(
            unit
        );


    const maxStrength =
        getUnitMaxStrength(
            unit
        );


    const attackValue =
        combatSystem.getAttack(
            unit
        );


    const defenseValue =
        combatSystem.getDefense(
            unit
        );


    const rangeValue =
        combatSystem.getRange(
            unit
        );


    const active =
        playerCanControlUnit(
            unit
        );


    // ----------------------------------------
    // 攻击状态
    // ----------------------------------------

    let attackStatus =
        "不可攻击";


    if (
        isUnitAlive(unit) &&
        !unit.hasAttacked &&
        active
    ) {

        attackStatus =
            "可攻击";

    }


    if (
        unit.hasAttacked
    ) {

        attackStatus =
            "本阶段已攻击";

    }


    unitInfo.innerHTML = `

        <div class="unit-title">
            ${name}
        </div>


        <div class="unit-row">

            <span>
                阵营
            </span>

            <strong>
                ${sideName}
            </strong>

        </div>


        <div class="unit-row">

            <span>
                兵种
            </span>

            <strong>
                ${type}
            </strong>

        </div>


        <div class="unit-row">

            <span>
                行动点
            </span>

            <strong>
                ${ap} / ${maxAP}
            </strong>

        </div>


        <div class="unit-row">

            <span>
                兵力
            </span>

            <strong>
                ${strength} / ${maxStrength}
            </strong>

        </div>


        <div class="unit-row">

            <span>
                攻击
            </span>

            <strong>
                ${attackValue}
            </strong>

        </div>


        <div class="unit-row">

            <span>
                防御
            </span>

            <strong>
                ${defenseValue}
            </strong>

        </div>


        <div class="unit-row">

            <span>
                射程
            </span>

            <strong>
                ${rangeValue}
            </strong>

        </div>


        <div class="unit-row">

            <span>
                攻击状态
            </span>

            <strong>
                ${attackStatus}
            </strong>

        </div>


        <div class="unit-row">

            <span>
                士气
            </span>

            <strong>
                ${unit.morale ?? "—"}
            </strong>

        </div>


        <div class="unit-row">

            <span>
                压制
            </span>

            <strong>
                ${unit.suppression ?? "—"}
            </strong>

        </div>


        <div class="unit-row">

            <span>
                疲劳
            </span>

            <strong>
                ${unit.fatigue ?? "—"}
            </strong>

        </div>


        <div class="unit-row">

            <span>
                弹药
            </span>

            <strong>
                ${unit.ammunition ?? "—"}
            </strong>

        </div>


        <div class="unit-row">

            <span>
                位置
            </span>

            <strong>
                ${unit.q}, ${unit.r}
            </strong>

        </div>


        <div class="unit-row">

            <span>
                状态
            </span>

            <strong>
                ${
                    active
                        ? "可行动"
                        : "不可行动"
                }
            </strong>

        </div>


        ${
            lastBattleMessage

                ? `

                    <hr>

                    <div class="battle-message">

                        <strong>
                            最近战斗
                        </strong>

                        <br><br>

                        ${lastBattleMessage}

                    </div>

                `

                : ""
        }

    `;

}


// ============================================================
// 计算移动范围
// ============================================================

function calculateReachable(unit) {

    clearReachable();


    if (
        !unit ||
        !isUnitAlive(unit)
    ) {

        return;

    }


    let result =
        null;


    if (
        typeof movementSystem.calculateReachable ===
        "function"
    ) {

        result =
            movementSystem.calculateReachable(
                unit
            );

    }


    else if (
        typeof movementSystem.computeReachable ===
        "function"
    ) {

        result =
            movementSystem.computeReachable(
                unit
            );

    }


    else if (
        typeof movementSystem.getReachableHexes ===
        "function"
    ) {

        result =
            movementSystem.getReachableHexes(
                unit
            );

    }


    else if (
        typeof movementSystem.selectUnit ===
        "function"
    ) {

        movementSystem.selectUnit(
            unit,
            units
        );


        result =
            movementSystem.reachable;

    }


    if (
        result instanceof Map
    ) {

        movementSystem.reachable =
            result;

    }


    if (
        typeof renderer.setReachable ===
        "function"
    ) {

        renderer.setReachable(
            movementSystem.reachable
        );

    }

}


// ============================================================
// 选择单位
// ============================================================

function selectUnit(unit) {

    if (
        !unit ||
        !isUnitAlive(unit)
    ) {

        return;

    }


    selectedUnit =
        unit;


    if (
        typeof selection.select ===
        "function"
    ) {

        selection.select(
            unit
        );

    }


    if (
        typeof renderer.setSelectedUnit ===
        "function"
    ) {

        renderer.setSelectedUnit(
            unit
        );

    }


    showUnitInfo(
        unit
    );


    if (
        playerCanControlUnit(
            unit
        )
    ) {

        calculateReachable(
            unit
        );

    }
    else {

        clearReachable();

    }


    render();

}


// ============================================================
// 查找 Hex 上单位
// ============================================================

function unitAtHex(q, r) {

    return (

        units.find(

            unit =>

                isUnitAlive(unit) &&

                Number(unit.q) ===
                Number(q) &&

                Number(unit.r) ===
                Number(r)

        ) ??

        null

    );

}


// ============================================================
// 屏幕 -> 世界坐标
// ============================================================

function screenToWorld(
    screenX,
    screenY
) {

    const zoom =
        camera.zoom ??
        1;


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
            (
                screenX -
                offsetX
            ) /
            zoom,

        y:
            (
                screenY -
                offsetY
            ) /
            zoom

    };

}


// ============================================================
// 鼠标 -> Hex
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


    const worldPosition =
        screenToWorld(
            mouseX,
            mouseY
        );


    const hexSize =

        renderer.hexSize ??
        renderer.size ??
        18;


    return pixelToHex(

        worldPosition.x,

        worldPosition.y,

        hexSize

    );

}


// ============================================================
// 点击单位检测
// ============================================================

function findUnitAtMouse(event) {

    const hex =
        mouseToHex(
            event
        );


    if (!hex) {

        return null;

    }


    // ----------------------------------------
    // Hex 直接查找
    // ----------------------------------------

    const direct =
        unitAtHex(
            hex.q,
            hex.r
        );


    if (direct) {

        return direct;

    }


    // ----------------------------------------
    // UnitSelection 兼容
    // ----------------------------------------

    if (
        typeof selection.findUnitAt ===
        "function"
    ) {

        const rect =
            canvas.getBoundingClientRect();


        const x =
            event.clientX -
            rect.left;


        const y =
            event.clientY -
            rect.top;


        const found =
            selection.findUnitAt(

                x,

                y,

                units,

                camera,

                renderer

            );


        if (
            found &&
            isUnitAlive(found)
        ) {

            return found;

        }

    }


    return null;

}


// ============================================================
// 可移动格数据
// ============================================================

function getReachableData(
    q,
    r
) {

    const reachable =
        movementSystem.reachable;


    if (!reachable) {

        return null;

    }


    const key =
        `${q},${r}`;


    if (
        reachable instanceof Map
    ) {

        return (
            reachable.get(key) ??
            null
        );

    }


    return (
        reachable[key] ??
        null
    );

}


// ============================================================
// 移动单位
// ============================================================

function tryMoveSelectedUnit(
    q,
    r
) {

    if (
        !selectedUnit ||
        !isUnitAlive(selectedUnit)
    ) {

        return false;

    }


    if (
        !playerCanControlUnit(
            selectedUnit
        )
    ) {

        return false;

    }


    // ----------------------------------------
    // 目标格占用
    // ----------------------------------------

    const occupyingUnit =
        unitAtHex(
            q,
            r
        );


    if (
        occupyingUnit &&
        occupyingUnit !==
        selectedUnit
    ) {

        return false;

    }


    // ----------------------------------------
    // 可移动范围
    // ----------------------------------------

    if (
        typeof movementSystem.canMoveTo ===
        "function"
    ) {

        if (
            !movementSystem.canMoveTo(
                q,
                r
            )
        ) {

            return false;

        }

    }

    else {

        const reachableData =
            getReachableData(
                q,
                r
            );


        if (
            reachableData ==
            null
        ) {

            return false;

        }

    }


    // ----------------------------------------
    // MovementSystem 执行移动
    // ----------------------------------------

    if (
        typeof movementSystem.moveTo !==
        "function"
    ) {

        console.error(
            "MovementSystem.moveTo() 不存在"
        );

        return false;

    }


    const moveResult =
        movementSystem.moveTo(
            q,
            r,
            units
        );


    if (!moveResult) {

        console.warn(

            "玩家移动失败：",

            selectedUnit?.id ??
            selectedUnit?.name,

            q,

            r

        );


        return false;

    }


    selectedUnit =
        moveResult.unit ??
        selectedUnit;


    // ----------------------------------------
    // 保持选择
    // ----------------------------------------

    if (
        typeof selection.select ===
        "function"
    ) {

        selection.select(
            selectedUnit
        );

    }


    if (
        typeof renderer.setSelectedUnit ===
        "function"
    ) {

        renderer.setSelectedUnit(
            selectedUnit
        );

    }


    if (
        typeof renderer.setReachable ===
        "function"
    ) {

        renderer.setReachable(
            movementSystem.reachable
        );

    }


    console.log(

        "玩家移动成功：",

        selectedUnit.id ??
        selectedUnit.name,

        "消耗：",

        moveResult.cost,

        "剩余行动点：",

        selectedUnit.movementPoints

    );


    showUnitInfo(
        selectedUnit
    );


    render();


    return true;

}


// ============================================================
// 战斗反馈
// ============================================================

function writeBattleMessage(
    message,
    unit = selectedUnit
) {

    lastBattleMessage =
        message;


    console.log(
        "[战斗]",
        message
    );


    if (
        unit &&
        isUnitAlive(unit)
    ) {

        showUnitInfo(
            unit
        );

        return;

    }


    if (unitInfo) {

        unitInfo.innerHTML = `

            <div class="battle-message">

                <strong>
                    战斗信息
                </strong>

                <br><br>

                ${message}

            </div>

        `;

    }

}


// ============================================================
// 清除被消灭单位
//
// V1.1：真正从 units 数组删除
// ============================================================

function removeDestroyedUnits() {

    let removedAny =
        false;


    for (
        let i =
            units.length - 1;

        i >= 0;

        i--
    ) {

        const unit =
            units[i];


        if (
            unit.destroyed === true ||
            getUnitStrength(unit) <= 0
        ) {

            unit.strength = 0;

            unit.destroyed = true;


            console.log(
                `[战斗] ${unitName(unit)} 已从战场移除`
            );


            // ------------------------------------
            // 当前选中单位被消灭
            // ------------------------------------

            if (
                selectedUnit ===
                unit
            ) {

                selectedUnit =
                    null;


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

                    renderer.setSelectedUnit(
                        null
                    );

                }


                clearReachable();

            }


            // ------------------------------------
            // 真正删除
            // ------------------------------------

            units.splice(
                i,
                1
            );


            removedAny =
                true;

        }

    }


    return removedAny;

}


// ============================================================
// 胜负检查
// ============================================================

function checkVictory() {

    const germanAlive =
        units.some(

            unit =>

                getUnitSide(unit) ===
                "german" &&

                isUnitAlive(unit)

        );


    const sovietAlive =
        units.some(

            unit =>

                getUnitSide(unit) ===
                "soviet" &&

                isUnitAlive(unit)

        );


    if (
        germanAlive &&
        sovietAlive
    ) {

        return false;

    }


    gameOver =
        true;


    clearSelection();


    const winner =

        germanAlive

            ? "德军胜利"

            : sovietAlive

                ? "苏军胜利"

                : "双方均无可战单位";


    if (unitInfo) {

        unitInfo.innerHTML = `

            <div class="unit-title">

                战斗结束

            </div>


            <div class="unit-row">

                <strong>
                    ${winner}
                </strong>

            </div>

        `;

    }


    if (turnInfo) {

        turnInfo.textContent =
            winner;

    }


    if (endPhaseButton) {

        endPhaseButton.disabled =
            true;

    }


    console.log(
        "[胜负]",
        winner
    );


    render();


    return true;

}


// ============================================================
// 玩家 / 通用攻击
// ============================================================

function performAttack(
    attacker,
    defender,
    {
        ai = false
    } = {}
) {

    if (
        gameOver ||
        !attacker ||
        !defender
    ) {

        return false;

    }


    if (
        !isUnitAlive(attacker) ||
        !isUnitAlive(defender)
    ) {

        writeBattleMessage(
            "无法攻击：攻击方或目标已经被消灭。",
            attacker
        );

        return false;

    }


    // ----------------------------------------
    // 攻击条件检查
    // ----------------------------------------

    if (
        !combatSystem.canAttack(
            attacker,
            defender
        )
    ) {

        const distance =
            combatSystem.getDistance(
                attacker,
                defender
            );


        const range =
            combatSystem.getRange(
                attacker
            );


        let reason =
            "当前无法攻击该目标。";


        if (
            getUnitSide(attacker) ===
            getUnitSide(defender)
        ) {

            reason =
                "无法攻击己方单位。";

        }

        else if (
            attacker.hasAttacked
        ) {

            reason =
                `${unitName(attacker)} 本阶段已经攻击过。`;

        }

        else if (
            distance >
            range
        ) {

            reason =
                `${unitName(defender)} 超出射程：距离 ${distance}，射程 ${range}。`;

        }


        writeBattleMessage(
            reason,
            attacker
        );


        return false;

    }


    // ----------------------------------------
    // 执行攻击
    // ----------------------------------------

    const result =
        combatSystem.attack(
            attacker,
            defender
        );


    if (
        !result?.success
    ) {

        writeBattleMessage(

            result?.reason ??
            "攻击失败",

            attacker

        );


        return false;

    }


    // ----------------------------------------
    // 战斗文字
    // ----------------------------------------

    const prefix =
        ai
            ? "AI："
            : "";


    const destroyedText =
        result.destroyed

            ? "<br><strong>目标已被消灭</strong>"

            : "";


    const message =

        `${prefix}${unitName(attacker)} 攻击 ${unitName(defender)}` +

        `<br>` +

        `造成 <strong>${result.damage}</strong> 点损失` +

        `<br>` +

        `兵力：${result.beforeStrength} → ${result.afterStrength}` +

        `<br>` +

        `射击距离：${result.distance}` +

        destroyedText;


    lastBattleMessage =
        message;


    console.log(

        "[战斗]",

        `${prefix}${unitName(attacker)} 攻击 ${unitName(defender)}，` +

        `造成 ${result.damage} 点损失 ` +

        `(${result.beforeStrength} → ${result.afterStrength})` +

        `${result.destroyed ? "，目标被消灭" : ""}`

    );


    // ----------------------------------------
    // 删除阵亡单位
    // ----------------------------------------

    removeDestroyedUnits();


    // ----------------------------------------
    // 胜负
    // ----------------------------------------

    if (
        checkVictory()
    ) {

        return true;

    }


    // ----------------------------------------
    // 更新攻击者信息
    // ----------------------------------------

    if (
        selectedUnit &&
        isUnitAlive(selectedUnit)
    ) {

        showUnitInfo(
            selectedUnit
        );


        calculateReachable(
            selectedUnit
        );

    }
    else if (
        attacker &&
        isUnitAlive(attacker)
    ) {

        writeBattleMessage(
            message,
            attacker
        );

    }


    render();


    return true;

}


// ============================================================
// 阶段重置
// ============================================================

function resetFactionForPhase(
    faction
) {

    movementSystem.resetFaction?.(
        units,
        faction
    );


    combatSystem.resetFaction?.(
        units,
        faction
    );

}


// ============================================================
// 延迟
// ============================================================

function sleep(ms) {

    return new Promise(

        resolve =>
            setTimeout(
                resolve,
                ms
            )

    );

}


// ============================================================
// AI 阶段
// ============================================================

async function runAIPhase() {

    if (
        aiRunning ||
        gameOver ||
        !turnSystem
    ) {

        return;

    }


    const currentSide =
        normalizeSide(
            turnSystem.phase
        );


    const playerSide =
        getPlayerSide();


    // 玩家自己的阶段
    // 不运行 AI

    if (
        !currentSide ||
        currentSide ===
        playerSide
    ) {

        return;

    }


    aiRunning =
        true;


    if (endPhaseButton) {

        endPhaseButton.disabled =
            true;

    }


    try {

        resetFactionForPhase(
            currentSide
        );


        // 使用副本，
        // 避免 units 删除元素时影响当前循环。

        const aiUnits =
            units.filter(

                unit =>

                    getUnitSide(unit) ===
                    currentSide &&

                    isUnitAlive(unit)

            );


        const sideLabel =

            currentSide ===
            "german"

                ? "德军 AI"

                : "苏军 AI";


        for (
            const unit
            of aiUnits
        ) {

            if (gameOver) {

                break;

            }


            // 该单位可能已经被前面的战斗消灭

            if (
                !units.includes(unit) ||
                !isUnitAlive(unit)
            ) {

                continue;

            }


            const result =
                aiSystem.actUnit(
                    unit,
                    units
                );


            // ------------------------------------
            // AI 原地攻击
            // ------------------------------------

            if (
                result?.type ===
                "attack" &&

                result.result?.success
            ) {

                const combat =
                    result.result;


                lastBattleMessage =

                    `${sideLabel}：${unitName(combat.attacker)} 攻击 ${unitName(combat.defender)}` +

                    `<br>` +

                    `造成 <strong>${combat.damage}</strong> 点损失` +

                    `<br>` +

                    `兵力：${combat.beforeStrength} → ${combat.afterStrength}` +

                    (
                        combat.destroyed

                            ? `<br><strong>目标已被消灭</strong>`

                            : ""
                    );


                console.log(

                    "[战斗]",

                    `${sideLabel}：${unitName(combat.attacker)} 攻击 ${unitName(combat.defender)}，` +

                    `造成 ${combat.damage} 点损失 ` +

                    `(${combat.beforeStrength} → ${combat.afterStrength})` +

                    `${combat.destroyed ? "，目标被消灭" : ""}`

                );

            }


            // ------------------------------------
            // AI 移动后攻击
            // ------------------------------------

            if (
                result?.type ===
                "move-and-attack" &&

                result.combat?.success
            ) {

                const combat =
                    result.combat;


                lastBattleMessage =

                    `${sideLabel}：${unitName(combat.attacker)} 移动后攻击 ${unitName(combat.defender)}` +

                    `<br>` +

                    `造成 <strong>${combat.damage}</strong> 点损失` +

                    `<br>` +

                    `兵力：${combat.beforeStrength} → ${combat.afterStrength}` +

                    (
                        combat.destroyed

                            ? `<br><strong>目标已被消灭</strong>`

                            : ""
                    );


                console.log(

                    "[战斗]",

                    `${sideLabel}：${unitName(combat.attacker)} 移动后攻击 ${unitName(combat.defender)}，` +

                    `造成 ${combat.damage} 点损失 ` +

                    `(${combat.beforeStrength} → ${combat.afterStrength})` +

                    `${combat.destroyed ? "，目标被消灭" : ""}`

                );

            }


            // ------------------------------------
            // 删除 AI 战斗造成的阵亡单位
            // ------------------------------------

            removeDestroyedUnits();


            render();


            // ------------------------------------
            // 胜负检查
            // ------------------------------------

            if (
                checkVictory()
            ) {

                break;

            }


            await sleep(
                220
            );

        }


        // ----------------------------------------
        // AI 自动结束阶段
        // ----------------------------------------

        if (
            !gameOver &&

            normalizeSide(
                turnSystem.phase
            ) ===
            currentSide
        ) {

            clearSelection();


            turnSystem.endPhase?.();


            const nextSide =
                normalizeSide(
                    turnSystem.phase
                );


            resetFactionForPhase(
                nextSide
            );


            updateTurnUI();


            render();


            // 如果下一阶段依然不是玩家
            // 继续 AI

            if (
                !gameOver &&
                nextSide &&
                nextSide !==
                getPlayerSide()
            ) {

                setTimeout(

                    () => {

                        runAIPhase();

                    },

                    250

                );

            }

        }

    }


    catch (error) {

        console.error(
            "AI 行动失败：",
            error
        );


        if (unitInfo) {

            unitInfo.innerHTML = `

                <div class="unit-title">
                    AI 行动失败
                </div>

                <div>
                    ${error?.message ?? error}
                </div>

            `;

        }

    }


    finally {

        aiRunning =
            false;


        if (
            endPhaseButton &&
            !gameOver
        ) {

            endPhaseButton.disabled =
                false;

        }

    }

}


// ============================================================
// 鼠标按下
// ============================================================

canvas.addEventListener(

    "mousedown",

    event => {

        if (
            event.button !==
            0
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
// 拖动地图
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
            Math.abs(dx) > 2 ||
            Math.abs(dy) > 2
        ) {

            dragMoved =
                true;

        }


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

        if (
            gameOver ||
            aiRunning
        ) {

            return;

        }


        // ----------------------------------------
        // 刚刚拖动地图
        // ----------------------------------------

        if (dragMoved) {

            dragMoved =
                false;

            return;

        }


        // ----------------------------------------
        // 点击单位
        // ----------------------------------------

        const clickedUnit =
            findUnitAtMouse(
                event
            );


        if (clickedUnit) {

            // ====================================
            // 已选择玩家单位 + 点击敌军
            // → 尝试攻击
            // ====================================

            if (
                selectedUnit &&

                playerCanControlUnit(
                    selectedUnit
                ) &&

                getUnitSide(clickedUnit) !==
                getUnitSide(selectedUnit)
            ) {

                performAttack(
                    selectedUnit,
                    clickedUnit
                );


                return;

            }


            // ====================================
            // 普通选择
            // ====================================

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


        // ----------------------------------------
        // 已选择单位
        // → 尝试移动
        // ----------------------------------------

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


        // ----------------------------------------
        // 点击空白区域
        // ----------------------------------------

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
            camera.zoom ??
            1;


        const factor =

            event.deltaY < 0

                ? 1.1

                : 0.9;


        const minZoom =

            camera.minZoom ??
            0.35;


        const maxZoom =

            camera.maxZoom ??
            3;


        const newZoom =
            Math.max(

                minZoom,

                Math.min(

                    maxZoom,

                    oldZoom *
                    factor

                )

            );


        // ----------------------------------------
        // Camera 自带 zoomAt
        // ----------------------------------------

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


        // ----------------------------------------
        // 手动缩放
        // ----------------------------------------

        const oldX =

            camera.x ??
            camera.offsetX ??
            0;


        const oldY =

            camera.y ??
            camera.offsetY ??
            0;


        const worldX =
            (
                mouseX -
                oldX
            ) /
            oldZoom;


        const worldY =
            (
                mouseY -
                oldY
            ) /
            oldZoom;


        const newX =
            mouseX -
            worldX *
            newZoom;


        const newY =
            mouseY -
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

    if (
        gameOver ||
        aiRunning
    ) {

        return;

    }


    if (!turnSystem) {

        return;

    }


    const currentSide =
        normalizeSide(
            turnSystem.phase
        );


    const playerSide =
        getPlayerSide();


    // 当前阶段不是玩家
    // → 让 AI 执行

    if (
        playerSide &&
        currentSide !==
        playerSide
    ) {

        runAIPhase();

        return;

    }


    clearSelection();


    if (
        typeof turnSystem.endPhase ===
        "function"
    ) {

        turnSystem.endPhase();

    }


    const nextSide =
        normalizeSide(
            turnSystem.phase
        );


    resetFactionForPhase(
        nextSide
    );


    updateTurnUI();


    render();


    // ----------------------------------------
    // 下一阶段是 AI
    // ----------------------------------------

    if (
        !gameOver &&
        nextSide &&
        nextSide !==
        getPlayerSide()
    ) {

        setTimeout(

            () => {

                runAIPhase();

            },

            250

        );

    }

}


// ============================================================
// 按钮
// ============================================================

endPhaseButton?.addEventListener(

    "click",

    () => {

        endCurrentPhase();

    }

);


// ============================================================
// 键盘
// ============================================================

window.addEventListener(

    "keydown",

    event => {

        // ESC

        if (
            event.key ===
            "Escape"
        ) {

            clearSelection();

            render();

            return;

        }


        // E

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

function startGame() {

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


    const currentSide =
        normalizeSide(
            turnSystem?.phase
        );


    const playerSide =
        getPlayerSide();


    // ----------------------------------------
    // 如果开局行动方不是玩家
    // AI 自动开始
    // ----------------------------------------

    if (
        gameState.mode !==
        "observer" &&

        currentSide &&

        playerSide &&

        currentSide !==
        playerSide
    ) {

        setTimeout(

            () => {

                runAIPhase();

            },

            250

        );

    }

}


// ============================================================
// 加载场景
// ============================================================

async function loadScenario() {

    try {

        // ----------------------------------------
        // scenario.json
        // ----------------------------------------

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


        // ----------------------------------------
        // 读取单位
        // ----------------------------------------

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
                scenario
            )
        ) {

            units =
                scenario;

        }


        else {

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


        console.log(
            "场景读取完成"
        );


        console.log(
            "单位数量：",
            units.length
        );


        // ----------------------------------------
        // 初始化单位
        // ----------------------------------------

        initializeUnits();


        // ----------------------------------------
        // 初始化回合
        // ----------------------------------------

        initializeTurnSystem();


        // ----------------------------------------
        // Canvas
        // ----------------------------------------

        resizeCanvas();


        // ----------------------------------------
        // 第一次渲染
        // ----------------------------------------

        render();


        // ----------------------------------------
        // 阵营选择
        // ----------------------------------------

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
            "东线 1941 V1.1 已启动"
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
// 窗口变化
// ============================================================

window.addEventListener(

    "resize",

    () => {

        resizeCanvas();

        render();

    }

);


// ============================================================
// 启动
// ============================================================

resizeCanvas();

loadScenario();
