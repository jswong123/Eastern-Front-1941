// ============================================================
// main.js
// 东线 1941：杜布诺
// V1.3 — 玩家控制 / 阶段同步 / 目标胜利修正版
// ============================================================
 
import { WorldMap } from "./WorldMap.js";
import { Camera } from "./Camera.js";
import { Renderer } from "./Renderer.js";
import { UnitSelection } from "./UnitSelection.js";
import { GameState } from "./GameState.js";
import { FactionSelection } from "./FactionSelection.js";
import { TurnSystem } from "./TurnSystem.js";
import { VictorySystem } from "./systems/VictorySystem.js";
 
import { MovementSystem } from "./systems/MovementSystem.js";
import { CombatSystem } from "./systems/CombatSystem.js";
import { AISystem } from "./systems/AISystem.js";
 
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
 
 
renderer.movementSystem =
    movementSystem;
 
 
// ============================================================
// 游戏状态
// ============================================================
 
let scenario = null;
 
let units = [];
 
let turnSystem = null;
 
let victorySystem = null;
 
let selectedUnit = null;

 
let gameOver = false;

 
let aiRunning = false;
 
 
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
        window.devicePixelRatio || 1;
 
 
    canvas.width =

        Math.max(
            1,
            Math.floor(

                rect.width * dpr
            )
        );
 
 
    canvas.height =
        Math.max(
            1,
            Math.floor(
                rect.height * dpr
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

    // FactionSelection / GameState 不同版本可能使用不同字段。
    // 这里统一兼容，避免“界面显示苏军，但控制逻辑仍读取德军”的问题。
    const candidates = [
        gameState.playerFaction,
        gameState.playerSide,
        gameState.selectedFaction,
        gameState.selectedSide,
        gameState.side,
        gameState.faction
    ];

    for (const value of candidates) {
        const side = normalizeSide(value);
        if (side === "german" || side === "soviet") {
            return side;
        }
    }

    return "";
}


// ============================================================
// 单位是否存活

// ============================================================
 
function isUnitAlive(unit) {
 
    if (!unit) {
        return false;

    }
 
 
    return (
 
        unit.destroyed !== true &&
 
        Number(
            unit.manpower ??
            unit.strength ?? 100
        ) > 0
 
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
            unit?.manpower ??
            unit?.strength ?? 100
        );
 

 
    return Number.isFinite(value)
        ? value
        : 100;
 
}
 
 
// ============================================================
// 最大兵力
// ============================================================
 
function getUnitMaxStrength(unit) {
 
    const value =
        Number(
 
            unit?.maxManpower ??
            unit?.maxStrength ??
            unit?.initialStrength ??
            100
 
        );
 
 
    return Number.isFinite(value)
        ? value
        : 100;
 
}
 
 
// ============================================================
// 兵力显示
// ============================================================

 
function getStrengthText(unit) {
 
    return (
        `${Math.max(0, Math.round(getUnitStrength(unit)))} / ` +
        `${Math.max(1, Math.round(getUnitMaxStrength(unit)))}`
    );
 
}
 
 

// ============================================================
// units.json 单位标准化
// ============================================================
 
function normalizeUnit(rawUnit) {
 
    const strength =
        Number(
            rawUnit.manpower ??
            rawUnit.strength ??
            100
        );
 
 
    const maxStrength =
        Number(
            rawUnit.maxManpower ??
            rawUnit.maxStrength ??
            rawUnit.manpower ??
            rawUnit.strength ??
            100
        );
 
 
    const movement =
        Number(
            rawUnit.movement ??
            rawUnit.maxMovementPoints ??
            rawUnit.movementPoints ??
            4
        );
 
 

    const faction =
        normalizeSide(
 
            rawUnit.faction ??
            rawUnit.side ??
            rawUnit.camp
 
        );
 
 
    return {
 
        ...rawUnit,
 
 
        id:

            String(
                rawUnit.id ?? ""
            ),
 
 
        name:
            String(
 
                rawUnit.name ??
                rawUnit.nameZh ??
                rawUnit.id ??
                "未知单位"
 
            ),
 
 
        faction,
 
        side:
            faction,
 
 
        type:
            rawUnit.type ??
            rawUnit.unitType ??
            "infantry",
 
 

        q:
            Number(
                rawUnit.q
            ),
 
 
        r:
            Number(
                rawUnit.r
            ),
 
 
        strength:
            Math.max(
                0,
                strength
            ),

 
 
        maxStrength:
            Math.max(
                1,
                maxStrength
            ),

        manpower:
            Math.max(
                0,
                strength
            ),

        maxManpower:
            Math.max(
                1,
                maxStrength
            ),

        echelon:
            rawUnit.echelon ??
            "battalion",

        minRange:
            Number(
                rawUnit.minRange ??

                (rawUnit.type === "artillery" ? 2 : 1)
            ),

        maxRange:
            Number(
                rawUnit.maxRange ??
                rawUnit.range ??
                1
            ),
 
 
        attack:
            Number(
                rawUnit.attack ?? 5
            ),
 
 
        defense:
            Number(
                rawUnit.defense ?? 5
            ),
 
 
        range:
            Number(
                rawUnit.range ?? 1
            ),
 
 
        movement,
 
        maxMovementPoints:
            movement,
 
        movementPoints:
            movement,
 
 
        destroyed:
            strength <= 0,
 
 
        hasAttacked:
            false,
 

 
        morale:

            Number(
                rawUnit.morale ?? 80
            ),
 
 
        suppression:
            Number(
                rawUnit.suppression ?? 0
            ),
 
 
        fatigue:
            Number(
                rawUnit.fatigue ?? 0
            ),
 
 
        ammunition:
            Number(
 
                rawUnit.ammunition ??
                rawUnit.ammo ??
                100
 
            ),
 
 
        ammo:
            Number(
 
                rawUnit.ammo ??
                rawUnit.ammunition ??
                100
 
            )
 
    };
 
}
 
 
// ============================================================

// 加载 units.json
// ============================================================
 

async function loadUnitsFromJSON() {
 
    console.log(
        "[单位系统] 正在读取 data/units.json"
    );
 
 
    const response =
        await fetch(
            "./data/units.json",
            {
                cache: "no-store"
            }
        );
 
 
    if (!response.ok) {
 
        throw new Error(
            `units.json 加载失败：HTTP ${response.status}`
        );
 
    }
 
 
    const data =
        await response.json();
 
 
    if (
        !data ||
        !Array.isArray(
            data.units
        )
    ) {
 
        throw new Error(
            "units.json 格式错误：找不到 units 数组"
        );
 
    }

 
 
    const loadedUnits =
        data.units.map(

            normalizeUnit
        );
 
 
    console.log(
        `[单位系统] units.json 加载成功：${loadedUnits.length} 个单位`
    );
 
 
    return loadedUnits;
 
}
 
 
// ============================================================
// 单位数据检查
// ============================================================
 
function validateUnits(
    unitList
) {
 
    const ids =
        new Set();
 
 
    const positions =
        new Map();
 
 
    let errors =
        0;
 
 
    for (
        const unit
        of unitList
    ) {
 
        // ----------------------------------------------------

        // ID
        // ----------------------------------------------------
 
        if (!unit.id) {
 

            console.error(
                "[单位数据] 存在没有 ID 的单位",
                unit
            );
 
            errors++;
 
        }
 
        else if (
            ids.has(
                unit.id
            )
        ) {
 
            console.error(
                `[单位数据] 重复单位 ID：${unit.id}`
            );
 
            errors++;
 
        }
 
        else {
 
            ids.add(
                unit.id
            );
 
        }
 
 
        // ----------------------------------------------------
        // 阵营
        // ----------------------------------------------------
 
        if (
            getUnitSide(unit) !==
                "german" &&

            getUnitSide(unit) !==
                "soviet"
        ) {
 
            console.error(
                `[单位数据] ${unit.id} 阵营错误：${unit.faction}`

            );
 
            errors++;
 
        }
 
 
        // ----------------------------------------------------
        // 坐标
        // ----------------------------------------------------
 
        if (
            !Number.isFinite(
                unit.q
            ) ||
            !Number.isFinite(
                unit.r
            )
        ) {
 
            console.error(
                `[单位数据] ${unit.id} 坐标无效`
            );
 
            errors++;
 
            continue;
 
        }
 
 
        // ----------------------------------------------------
        // 一格一单位
        // ----------------------------------------------------
 
        if (
            isUnitAlive(unit)
        ) {

 
            const key =
                `${unit.q},${unit.r}`;
 
 
            if (
                positions.has(

                    key
                )
            ) {
 
                const existing =
                    positions.get(
                        key
                    );
 
 
                console.error(
                    `[部署冲突] ${existing.id} 与 ${unit.id} 同时位于 (${unit.q}, ${unit.r})`
                );
 
                errors++;
 
            }
 
            else {
 
                positions.set(
                    key,
                    unit
                );
 
            }
 
        }
 
    }
 
 
    if (
        errors === 0
    ) {
 
        console.log(

            `[单位系统] 数据检查通过：${unitList.length} 个单位`
        );
 
        return true;
 
    }
 
 

    console.error(
        `[单位系统] 数据检查失败：发现 ${errors} 个问题`
    );
 
 
    return false;
 
}
 
 
// ============================================================
// 初始化单位
// ============================================================
 
function initializeUnits() {
 
    for (
        const unit
        of units
    ) {
 
        const side =
            getUnitSide(
                unit
            );
 
 
        unit.side =
            side;
 
        unit.faction =
            side;
 
 
        if (
            unit.strength ==

            null
        ) {
 
            unit.strength =
                100;
 
        }
 
 

        if (
            unit.maxStrength ==
            null
        ) {
 
            unit.maxStrength =
                unit.strength;
 
        }
 
 
        if (
            unit.strength <= 0
        ) {
 
            unit.strength = 0;
 
            unit.destroyed = true;
 
        }
 
 
        combatSystem.resetUnit(
            unit
        );
 
 
        if (
            typeof movementSystem.initializeUnit ===
            "function"
        ) {
 
            movementSystem.initializeUnit(
                unit
            );

 
        }
 
 
        if (
            unit.morale ==
            null
        ) {
 
            unit.morale =

                80;
 
        }
 
 
        if (
            unit.suppression ==
            null
        ) {
 
            unit.suppression =
                0;
 
        }
 
 
        if (
            unit.fatigue ==
            null
        ) {
 
            unit.fatigue =
                0;
 
        }
 
 
        if (
            unit.ammunition ==
            null
        ) {
 
            unit.ammunition =
                unit.ammo ??

                100;
 
        }
 
 
        if (
            unit.ammo ==
            null
        ) {
 
            unit.ammo =

                unit.ammunition;
 
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
 
            startingPhase:

                "german"
 
        });
 
 
    turnSystem.onPhaseChanged =
        () => {
 
            clearSelection();
 
            updateTurnUI();
 

            render();
 
        };
 
 
    turnSystem.onTurnChanged =
        () => {
 
            updateTurnUI();
 
            if (!gameOver) {
 
                checkVictory();
 
            }
 
            render();
 
        };
 
 
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
 
 

    if (
        turnInfo &&
        typeof turnSystem.getHeaderText ===
        "function"
    ) {
 
        turnInfo.textContent =
            turnSystem.getHeaderText();
 
    }
 
 
    const number =
 
        typeof turnSystem.getTurnNumber ===
        "function"
 
            ? turnSystem.getTurnNumber()
 
            : turnSystem.turn ?? 1;
 
 
    if (turnNumber) {
 
        turnNumber.textContent =
            `第${number}回合`;
 
    }
 
 
    if (

        turnTime &&
        typeof turnSystem.getTurnTimeRange ===
        "function"
    ) {
 
        turnTime.textContent =
            turnSystem.getTurnTimeRange();
 
    }
 
 
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
 
 
    if (endPhaseButton) {
 
        endPhaseButton.textContent =
 

            phase === "soviet"
 
                ? "结束苏军行动"
 
                : "结束德军行动";
 
    }
 
}
 
 
// ============================================================
// 当前行动阶段
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

    if (!unit || !isUnitAlive(unit) || gameOver || aiRunning) {
        return false;
    }

    if (gameState.mode === "observer") {
        return false;
    }

    const unitSide = getUnitSide(unit);
    const playerSide = getPlayerSide();
    const phaseSide = normalizeSide(turnSystem?.phase);

    // 没有明确玩家阵营时，绝不默认允许控制，防止误控 AI 阵营。
    if (playerSide !== "german" && playerSide !== "soviet") {

        return false;
    }

    // 只能控制玩家自己选择的阵营。
    if (unitSide !== playerSide) {
        return false;
    }

    // 只能在本方行动阶段操作。
    if (turnSystem && phaseSide !== playerSide) {
        return false;
    }

    return true;
}


// ============================================================
// 查看单位
// ============================================================
 
function playerCanViewUnit(unit) {
 
    return (
        unit != null &&
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
        movementSystem.reachable instanceof
        Map
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
 

 
    if (
        typeof movementSystem.clear ===
        "function"
    ) {
 
        movementSystem.clear();
 
    }
 
 
    clearReachable();
 
 
    if (unitInfo) {
 
        unitInfo.innerHTML =
            '<p class="hint">点击地图上的单位查看详情</p>';
 
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
 
 
    unitInfo.innerHTML = `

 
        <div class="unit-title">
            ${name}
        </div>
 
        <div class="unit-row">
            <span>ID</span>
            <strong>${unit.id}</strong>
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
            <span>编制</span>
            <strong>${unit.echelon ?? "—"}</strong>
        </div>
 
        <div class="unit-row">

            <span>行动点</span>
            <strong>${ap} / ${maxAP}</strong>
        </div>
 
        <div class="unit-row">
            <span>兵力</span>
            <strong>${getStrengthText(unit)}</strong>
        </div>
 
        <div class="unit-row">
            <span>攻击</span>
            <strong>${attackValue}</strong>
        </div>
 
        <div class="unit-row">
            <span>防御</span>
            <strong>${defenseValue}</strong>
        </div>

 
        <div class="unit-row">
            <span>射程</span>
            <strong>${rangeValue}</strong>
        </div>
 
        <div class="unit-row">
            <span>攻击状态</span>
            <strong>
                ${
                    unit.hasAttacked
                        ? "本阶段已攻击"
                        : "可攻击"
                }
            </strong>
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
 
    clearReachable();
 
 
    if (
        !unit ||
        !isUnitAlive(unit)
    ) {
 

        return;
 
    }
 
 
    movementSystem.selectUnit(
        unit,
        units
    );
 
 
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
// 查找 Hex 上的存活单位
// ============================================================
 
function unitAtHex(
    q,

    r
) {
 
    return (
 
        units.find(
 
            unit =>
 
                isUnitAlive(unit) &&
 
                Number(unit.q) ===
                Number(q) &&
 
                Number(unit.r) ===
                Number(r)
 
        ) ?? null
 
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

 
 
    const direct =
        unitAtHex(
            hex.q,
            hex.r
        );
 
 
    if (direct) {
 
        return direct;
 
    }
 
 
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
// 玩家移动
// ============================================================
 
function tryMoveSelectedUnit(
    q,
    r
) {
 
    if (
        !selectedUnit ||

        !playerCanControlUnit(
            selectedUnit
        )
    ) {
 
        return false;
 
    }
 

 
    // ========================================================
    // 一格一单位
    // ========================================================
 
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
 
        console.log(
            `[移动] Hex (${q}, ${r}) 已被 ${unitName(occupyingUnit)} 占据`
        );
 
        return false;
 
    }
 
 
    if (
        !movementSystem.canMoveTo(
            q,
            r,
            units
        )
    ) {
 
        return false;

 
    }
 
 
    const moveResult =
        movementSystem.moveTo(
            q,
            r,

            units
        );
 
 
    if (
        !moveResult ||
        moveResult.success === false
    ) {
 
        return false;
 
    }
 
 
    selectedUnit =
        moveResult.unit ??
        selectedUnit;
 
 
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
 
 
    showUnitInfo(
        selectedUnit
    );
 
 
    render();
 
 
    return true;
 
}
 
 
// ============================================================
// 战斗消息
// ============================================================
 
function writeBattleMessage(
    message
) {
 
    console.log(
        "[战斗]",
        message
    );
 
 

    if (unitInfo) {
 
        const old =
            unitInfo.innerHTML;
 
 

        unitInfo.innerHTML =
            `${old}<hr><div class="battle-message">${message}</div>`;
 
    }
 
}
 
 
// ============================================================
// 死亡单位处理
// ============================================================
 
function removeDestroyedUnits() {
 
    for (
        const unit
        of units
    ) {
 
        if (
            unit.destroyed ||
            getUnitStrength(unit) <= 0
        ) {
 
            unit.strength = 0;
 
            unit.destroyed = true;
 
            unit.movementPoints = 0;
 
            unit.hasAttacked = true;
 
 
            if (
                selectedUnit ===
                unit
            ) {
 
                selectedUnit =

                    null;
 
            }
 
        }

 
    }
 
 
    if (
        selectedUnit &&
        !isUnitAlive(
            selectedUnit
        )
    ) {
 
        clearSelection();
 
    }
 
}
 
 
// ============================================================
// 胜负检查
// ============================================================
 
function checkVictory() {
 
    if (
        gameOver ||
        !victorySystem
    ) {
 
        return gameOver;
 
    }
 
 
    // 清除兵力为 0 / 已摧毁的单位，确保地图和判定同步
    units =
        units.filter(
            unit =>
                isUnitAlive(unit)
        );

 
 
    gameState.units =
        units;

 
 
    const result =
        victorySystem.check(
            units,
            {
                turn: turnSystem?.turn ?? 1,
                phase: normalizeSide(turnSystem?.phase ?? "german"),
                playerSide: getPlayerSide(),
                scenario,
                year: turnSystem?.year ?? 1941,
                month: turnSystem?.month ?? 6,
                day: turnSystem?.day ?? 26,
                hour: turnSystem?.hour ?? 8,
                minute: turnSystem?.minute ?? 0
            }
        );
 
 
    if (!result.gameOver) {
 
        return false;
 
    }
 
 
    gameOver = true;
 
    clearSelection();
 
 
    const winnerText =
        result.winner === "german"
            ? "德军胜利"
            : result.winner === "soviet"
                ? "苏军胜利"
                : "战斗结束";
 
 
    if (unitInfo) {
 

        unitInfo.innerHTML = `
 
            <div class="unit-title">

                战斗结束
            </div>
 
            <div class="unit-row">
                <strong>
                    ${winnerText}
                </strong>
            </div>
 
            <div class="unit-row">
                <span>
                    ${result.reason ?? ""}
                </span>
            </div>
 
        `;
 
    }
 
 
    if (turnInfo) {
 
        turnInfo.textContent =
            winnerText;
 
    }
 
 
    if (endPhaseButton) {
 
        endPhaseButton.disabled =
            true;
 
    }
 
 
    console.log(
        "========================================"
    );
 
    console.log(
        `[胜负系统] ${winnerText}`

    );
 

    console.log(
        `[胜负系统] ${result.reason ?? ""}`
    );
 
    console.log(
        "========================================"
    );
 
 
    render();
 
    return true;
 
}
 
 
// ============================================================
// 玩家攻击
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
        !defender ||
        !isUnitAlive(attacker) ||
        !isUnitAlive(defender)
    ) {
 
        return false;
 
    }
 
 
    if (
        !combatSystem.canAttack(

            attacker,

            defender
        )
    ) {
 
        return false;
 
    }
 
 
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
            "攻击失败"
 
        );
 
 
        return false;
 
    }
 
 
    const sideLabel =
 
        getUnitSide(attacker) ===
        "german"
 
            ? "德军"
 
            : "苏军";
 
 
    const prefix =

        ai
            ? `${sideLabel} AI：`
            : "";
 
 
    const destroyedText =
        result.destroyed
 
            ? "，目标被消灭"
 
            : "";
 
 
    writeBattleMessage(
 
        `${prefix}${unitName(attacker)} 攻击 ${unitName(defender)}，` +
 
        `造成 ${result.damage} 点损失 ` +
 
        `（${result.beforeStrength}/${getUnitMaxStrength(defender)} → ` +
 
        `${result.afterStrength}/${getUnitMaxStrength(defender)}）` +
 
        destroyedText
 
    );
 
 
    removeDestroyedUnits();
 
 
    if (
        !checkVictory()
    ) {
 
        if (
            selectedUnit &&
            isUnitAlive(
                selectedUnit
            )
        ) {
 
            showUnitInfo(
                selectedUnit
            );


 
 
            calculateReachable(
                selectedUnit
            );
 
        }
 
 
        render();
 
    }
 
 
    return true;
 
}
 
 
// ============================================================
// 阵营阶段重置
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
// 延时
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
 
 
            if (
                !isUnitAlive(
                    unit
                )
            ) {
 
                continue;
 
            }
 
 
            const result =
                aiSystem.actUnit(
                    unit,
                    units
                );
 
 
            if (
                result?.type ===
                    "attack" &&
                result.result?.success
            ) {
 
                const combat =
                    result.result;
 
 

                writeBattleMessage(
 
                    `${sideLabel}：${unitName(combat.attacker)} 攻击 ${unitName(combat.defender)}，` +
 

                    `造成 ${combat.damage} 点损失 ` +
 
                    `（${combat.beforeStrength}/${getUnitMaxStrength(combat.defender)} → ` +
 
                    `${combat.afterStrength}/${getUnitMaxStrength(combat.defender)}）` +
 
                    `${combat.destroyed ? "，目标被消灭" : ""}`
 
                );
 
            }
 
 
            if (
                result?.type ===
                    "move-and-attack" &&
                result.combat?.success
            ) {
 
                const combat =
                    result.combat;
 
 
                writeBattleMessage(
 
                    `${sideLabel}：${unitName(combat.attacker)} 移动后攻击 ${unitName(combat.defender)}，` +
 
                    `造成 ${combat.damage} 点损失 ` +
 
                    `（${combat.beforeStrength}/${getUnitMaxStrength(combat.defender)} → ` +
 
                    `${combat.afterStrength}/${getUnitMaxStrength(combat.defender)}）` +
 
                    `${combat.destroyed ? "，目标被消灭" : ""}`
 
                );
 
            }
 
 

            removeDestroyedUnits();
 
 
            render();
 

 
            if (
                checkVictory()
            ) {
 
                break;
 
            }
 
 
            await sleep(
                220
            );
 
        }
 
 
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
 
 
        if (dragMoved) {
 
            dragMoved =
                false;
 

            return;
 
        }
 
 
        const clickedUnit =
            findUnitAtMouse(
                event
            );
 
 
        // ====================================================
        // 点击了单位
        // ====================================================
 
        if (clickedUnit) {
 
            // ------------------------------------------------
            // 已选择玩家单位 + 点击敌军
            // = 尝试攻击
            // ------------------------------------------------
 
            if (
                selectedUnit &&
                playerCanControlUnit(
                    selectedUnit
                ) &&
                getUnitSide(
                    clickedUnit
                ) !==
                getUnitSide(
                    selectedUnit

                )
            ) {
 
                if (
                    performAttack(
                        selectedUnit,
                        clickedUnit
                    )
                ) {
 
                    return;
 
                }

 
 
                writeBattleMessage(
 
                    `无法攻击 ${unitName(clickedUnit)}：` +
                    `请检查射程或该单位是否已经攻击`
 
                );
 
 
                render();
 
 
                return;
 
            }
 
 
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
 
 
        // ====================================================
        // 点击空格 = 尝试移动
        // ====================================================
 
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
        aiRunning ||
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
 
 
    if (
        playerSide &&
        currentSide !==

            playerSide
    ) {
 
        runAIPhase();
 
        return;
 
    }
 
 
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
// 结束行动按钮
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
 
        if (
            event.key ===
            "Escape"
        ) {
 
            clearSelection();
 

            render();
 
            return;
 
        }
 
 
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

    // 把最终选择结果同步回所有常见字段，确保其它系统读取到同一阵营。
    if (playerSide === "german" || playerSide === "soviet") {
        gameState.playerFaction = playerSide;
        gameState.playerSide = playerSide;
        gameState.selectedFaction = playerSide;
        gameState.selectedSide = playerSide;
    }


    console.log("[控制系统] 玩家阵营已统一为：", playerSide);
    console.log("[控制系统] 当前行动方：", currentSide);
 
 
    // ========================================================
    // 如果开局行动方不是玩家
    // AI 自动行动
    // ========================================================
 
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
// 加载游戏数据
// ============================================================
 
async function loadScenario() {
 
    try {
 
        // ====================================================
        // 1. 加载 scenario.json
        //
        // scenario 不再负责正式单位数据。

        // ====================================================
 
        const scenarioResponse =
            await fetch(
                "./data/scenario.json",
                {
                    cache: "no-store"
                }
            );
 
 
        if (
            !scenarioResponse.ok
        ) {
 
            throw new Error(
 
                `scenario.json 加载失败：HTTP ${scenarioResponse.status}`
 
            );

 
        }
 
 
        scenario =
            await scenarioResponse.json();
 
 
        console.log(
            "[场景系统] scenario.json 加载完成"
        );
 
 
        // ====================================================
        // 2. 加载 units.json
        //
        // 这是现在唯一正式单位来源。
        // ====================================================
 
        units =
            await loadUnitsFromJSON();
 
 
        if (
            !Array.isArray(units) ||

            units.length === 0
        ) {
 
            throw new Error(
                "units.json 中没有可用单位"
            );
 
        }
 
 
        // ====================================================
        // 3. 初始化单位
        // ====================================================
 
        initializeUnits();
 
 
        // ====================================================
        // 4. 删除开局已经死亡的单位

        // ====================================================
 
        units =
            units.filter(
                unit =>
                    isUnitAlive(
                        unit
                    )
            );
 
 
        // ====================================================
        // 5. 数据检查
        // ====================================================
 
        if (
            !validateUnits(
                units
            )
        ) {
 
            throw new Error(
                "units.json 单位数据检查失败，请查看浏览器控制台"
            );
 
        }

 
 
        // ====================================================
        // 6. 统计
        // ====================================================
 
        const germanCount =
            units.filter(
 
                unit =>
                    getUnitSide(unit) ===
                    "german"
 
            ).length;
 
 
        const sovietCount =
            units.filter(

 
                unit =>
                    getUnitSide(unit) ===
                    "soviet"
 
            ).length;
 
 
        console.log(
            "========================================"
        );
 
 
        console.log(
            "[单位系统] 战斗序列加载完成"
        );
 
 
        console.log(
            `[单位系统] 总单位：${units.length}`
        );
 
 
        console.log(
            `[单位系统] 德军：${germanCount}`
        );
 

 
        console.log(
            `[单位系统] 苏军：${sovietCount}`
        );
 
 
        console.log(
            "========================================"
        );
 
 
        // ====================================================
        // 7. GameState 同步
        // ====================================================
 
        gameState.units =
            units;

 
 
        // ====================================================
        // 8. 初始化回合
        // ====================================================
 
        initializeTurnSystem();
 
 
        // ====================================================
        // 9. 初始化胜负系统
        // ====================================================
 
        victorySystem =
            new VictorySystem({
 
                scenario
 
            });
 
 
        // ====================================================
        // 10. Canvas
        // ====================================================
 
        resizeCanvas();
 
 

        // ====================================================
        // 11. 第一次渲染
        // ====================================================
 
        render();
 
 
        // ====================================================
        // 12. 阵营选择
        // ====================================================
 
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
            "东线 1941 V1.3 已启动"
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

Renderer.js

// ============================================================
// Renderer.js
// 东线 1941
//
// 地图渲染系统
// V0.4A
//
// 功能：
// - 六角格地图
// - 地形
// - 河流
// - 道路
// - 铁路
// - 城镇
// - 军事单位
// - 单位选中框
// - 移动范围
// ============================================================

import {
    drawHexPath
} from "./Hex.js";


export class Renderer {

    constructor(
        canvas,
        world,
        camera
    ) {

        this.canvas = canvas;

        this.ctx =
            canvas.getContext("2d");


        this.world =
            world;


        this.camera =
            camera;


        // ----------------------------------------------------
        // Hex 大小
        // ----------------------------------------------------

        this.hexSize = 24;


        // ----------------------------------------------------
        // 外部系统引用
        // ----------------------------------------------------

        this.selection = null;

        this.movementSystem = null;


        // ----------------------------------------------------
        // 地图颜色
        // ----------------------------------------------------

        this.colors = {

            plain:
                "#b4b28f",

            forest:
                "#65705a",

            marsh:
                "#87917b",

            urban:
                "#aaa184",

            water:
                "#7693a1",

            grid:
                "#747660",

            road:
                "#a38e69",

            railway:

                "#57564c",

            river:
                "#668ba0"

        };

    }


    // ========================================================
    // 清空画布
    // ========================================================

    clear() {

        const ctx =
            this.ctx;


        ctx.save();


        ctx.setTransform(
            1,
            0,
            0,
            1,
            0,
            0
        );


        ctx.clearRect(
            0,
            0,
            this.canvas.width,
            this.canvas.height
        );


        ctx.fillStyle =
            "#8f9078";


        ctx.fillRect(
            0,
            0,
            this.canvas.width,
            this.canvas.height
        );


        ctx.restore();

    }


    // ========================================================
    // Hex → 世界坐标
    // ========================================================

    hexToWorld(
        q,
        r
    ) {

        const size =
            this.hexSize;


        return {

            x:
                size *
                Math.sqrt(3) *
                (
                    q +
                    r / 2
                ),

            y:
                size *
                1.5 *
                r

        };

    }


    // ========================================================
    // 世界坐标 → 屏幕坐标
    // ========================================================

    worldPointToScreen(
        x,
        y
    ) {

        return {

            x:
                x *
                this.camera.zoom +
                this.camera.x,

            y:
                y *
                this.camera.zoom +
                this.camera.y

        };

    }


    // ========================================================
    // Hex → 屏幕坐标
    // ========================================================

    worldToScreen(
        q,
        r
    ) {

        const world =
            this.hexToWorld(
                q,
                r
            );


        return this.worldPointToScreen(
            world.x,

            world.y
        );

    }


    // ========================================================
    // 地形颜色
    // ========================================================

    terrainColor(
        terrain
    ) {

        return (
            this.colors[terrain] ??
            this.colors.plain
        );

    }


    // ========================================================
    // 绘制基础地图
    // ========================================================

    drawTerrain() {

        const ctx =
            this.ctx;


        const size =
            this.hexSize *
            this.camera.zoom;


        for (
            let r = 0;
            r < this.world.height;
            r++
        ) {

            for (
                let q = 0;

                q < this.world.width;
                q++
            ) {

                const p =
                    this.worldToScreen(
                        q,
                        r
                    );


                const terrain =
                    this.world.terrainAt(
                        q,
                        r
                    );


                drawHexPath(
                    ctx,
                    p.x,
                    p.y,
                    size
                );


                ctx.fillStyle =
                    this.terrainColor(
                        terrain
                    );


                ctx.fill();


                ctx.strokeStyle =
                    this.colors.grid;


                ctx.lineWidth =
                    Math.max(
                        0.6,
                        this.camera.zoom
                    );


                ctx.stroke();

            }

        }

    }


    // ========================================================
    // 获取地图要素
    // ========================================================

    getFeatureArray(
        ...names
    ) {

        for (
            const name
            of names
        ) {

            if (
                Array.isArray(
                    this.world[name]
                )
            ) {

                return this.world[name];

            }

        }


        return [];

    }


    // ========================================================
    // 将地图要素节点转换成 Hex
    // ========================================================

    featureHex(
        point
    ) {

        if (!point) {
            return null;
        }


        if (
            Array.isArray(point)
        ) {

            return {

                q: Number(point[0]),

                r: Number(point[1])

            };

        }


        if (
            point.q !== undefined &&
            point.r !== undefined
        ) {

            return {

                q: Number(point.q),

                r: Number(point.r)

            };

        }


        return null;

    }


    // ========================================================
    // 绘制线路
    // ========================================================

    drawFeatureLines(
        features,
        options = {}
    ) {

        const ctx =
            this.ctx;


        const color =
            options.color ??
            "#000000";


        const width =
            options.width ??
            2;


        const dashed =
            options.dashed ??
            false;


        ctx.save();


        ctx.strokeStyle =
            color;


        ctx.lineWidth =
            width *
            this.camera.zoom;


        ctx.lineCap =
            "round";


        ctx.lineJoin =

            "round";


        if (dashed) {

            ctx.setLineDash([
                5 * this.camera.zoom,
                5 * this.camera.zoom
            ]);

        }


        for (
            const feature
            of features
        ) {

            const points =
                feature.points ??
                feature.path ??
                feature.hexes ??
                feature;


            if (
                !Array.isArray(points) ||
                points.length < 2
            ) {

                continue;

            }


            ctx.beginPath();


            let started =
                false;


            for (
                const rawPoint
                of points

            ) {

                const hex =
                    this.featureHex(
                        rawPoint
                    );


                if (!hex) {
                    continue;
                }


                const p =
                    this.worldToScreen(
                        hex.q,
                        hex.r
                    );


                if (!started) {

                    ctx.moveTo(
                        p.x,
                        p.y
                    );


                    started =
                        true;

                }

                else {

                    ctx.lineTo(
                        p.x,
                        p.y
                    );

                }

            }


            if (started) {

                ctx.stroke();

            }

        }


        ctx.restore();

    }


    // ========================================================
    // 河流
    // ========================================================

    drawRivers() {

        const rivers =
            this.getFeatureArray(
                "rivers",
                "riverFeatures"
            );


        this.drawFeatureLines(
            rivers,
            {
                color:
                    this.colors.river,

                width:
                    3.2
            }
        );

    }


    // ========================================================
    // 道路
    // ========================================================

    drawRoads() {

        const roads =
            this.getFeatureArray(
                "roads",
                "roadFeatures"
            );


        this.drawFeatureLines(
            roads,
            {
                color:
                    this.colors.road,

                width:
                    1.8
            }
        );

    }


    // ========================================================
    // 铁路
    // ========================================================

    drawRailways() {

        const railways =
            this.getFeatureArray(
                "railways",
                "rails",
                "railwayFeatures"
            );


        this.drawFeatureLines(
            railways,
            {
                color:
                    this.colors.railway,

                width:
                    1.2,


                dashed:
                    true
            }
        );

    }


    // ========================================================
    // 城镇
    // ========================================================

    drawSettlements() {

        const settlements =
            this.getFeatureArray(
                "settlements",
                "cities",
                "towns"
            );


        const ctx =
            this.ctx;


        ctx.save();


        for (
            const settlement
            of settlements
        ) {

            const q =
                settlement.q;


            const r =
                settlement.r;


            if (
                q === undefined ||

                r === undefined
            ) {

                continue;

            }


            const p =
                this.worldToScreen(
                    q,
                    r
                );


            const radius =
                Math.max(
                    3,
                    4 *
                    this.camera.zoom
                );


            ctx.beginPath();


            ctx.arc(
                p.x,
                p.y,
                radius,
                0,
                Math.PI * 2
            );


            ctx.fillStyle =
                "#34352e";


            ctx.fill();


            ctx.font =
                `${
                    Math.max(

                        10,
                        13 *
                        this.camera.zoom
                    )
                }px FangSong, STKaiti, serif`;


            ctx.fillStyle =
                "#4c493f";


            ctx.textAlign =
                "left";


            ctx.textBaseline =
                "middle";


            ctx.fillText(
                settlement.name ??
                "",
                p.x +
                radius +
                5,
                p.y
            );

        }


        ctx.restore();

    }


    // ========================================================
    // 移动范围
    // ========================================================

    drawMovementRange() {

        if (
            !this.movementSystem ||
            !this.movementSystem.selectedUnit

        ) {

            return;

        }


        const ctx =
            this.ctx;


        const size =
            this.hexSize *
            this.camera.zoom;


        ctx.save();


        for (
            const [
                key,
                cost
            ]
            of this.movementSystem
                .reachable
                .entries()
        ) {

            const [
                q,
                r
            ] =
                key
                    .split(",")
                    .map(Number);


            const p =
                this.worldToScreen(
                    q,
                    r
                );


            drawHexPath(
                ctx,
                p.x,
                p.y,
                size * 0.92
            );


            ctx.fillStyle =
                "rgba(96, 137, 91, 0.32)";


            ctx.fill();


            ctx.strokeStyle =
                "rgba(65, 103, 65, 0.82)";


            ctx.lineWidth =
                Math.max(
                    1,
                    1.5 *
                    this.camera.zoom
                );


            ctx.stroke();


            // 放大后显示移动成本

            if (
                this.camera.zoom >= 1.15
            ) {

                ctx.fillStyle =
                    "rgba(35, 55, 35, 0.75)";


                ctx.font =
                    `${
                        Math.max(
                            8,
                            9 *

                            this.camera.zoom
                        )
                    }px FangSong, serif`;


                ctx.textAlign =
                    "center";


                ctx.textBaseline =
                    "middle";


                ctx.fillText(
                    String(cost),
                    p.x,
                    p.y
                );

            }

        }


        ctx.restore();

    }


    // ========================================================
    // 单位颜色
    // ========================================================

    factionColor(unitOrFaction) {

    // 新版：允许直接传入 unit
    if (
        unitOrFaction &&
        typeof unitOrFaction === "object"
    ) {

        // 优先使用 main.js 设置的敌我颜色
        if (unitOrFaction.displayColor) {
            return unitOrFaction.displayColor;
        }


        const relation =
            String(
                unitOrFaction.relation ?? ""
            ).toLowerCase();

        if (relation === "friendly") {
            return "#4f78a8";
        }

        if (relation === "enemy") {
            return "#b6534f";
        }

        unitOrFaction =
            unitOrFaction.faction ??
            unitOrFaction.side;
    }

    const faction =
        String(
            unitOrFaction ?? ""
        ).toLowerCase();

    if (
        faction === "ger" ||
        faction === "german" ||
        faction === "germany" ||
        faction === "axis"
    ) {
        return "#4f78a8";
    }

    if (
        faction === "ussr" ||
        faction === "soviet" ||
        faction === "redarmy"
    ) {
        return "#b6534f";
    }

    return "#a9a68f";
}

    // ========================================================

    // 绘制军事符号
    // ========================================================

    drawMilitarySymbol(
        unit,
        x,
        y,
        width,
        height
    ) {

        const ctx =
            this.ctx;


        const type =
            unit.type ??
            "infantry";


        ctx.save();


        ctx.strokeStyle =
            "#171916";


        ctx.fillStyle =
            "#171916";


        ctx.lineWidth =
            Math.max(
                1.5,
                2 *
                this.camera.zoom
            );


        if (
            type === "infantry"
        ) {

            ctx.beginPath();

            ctx.moveTo(
                x - width * 0.32,
                y - height * 0.27
            );

            ctx.lineTo(
                x + width * 0.32,
                y + height * 0.27
            );

            ctx.moveTo(
                x + width * 0.32,
                y - height * 0.27
            );

            ctx.lineTo(
                x - width * 0.32,
                y + height * 0.27
            );

            ctx.stroke();

        }

        else if (
            type === "armor"
        ) {

            ctx.beginPath();

            ctx.ellipse(
                x,
                y,
                width * 0.27,
                height * 0.18,
                0,
                0,
                Math.PI * 2
            );

            ctx.stroke();

        }

        else if (

            type === "artillery"
        ) {

            ctx.beginPath();

            ctx.arc(
                x,
                y,
                height * 0.13,
                0,
                Math.PI * 2
            );

            ctx.fill();

        }

        else if (
            type === "antitank"
        ) {

            ctx.beginPath();

            ctx.moveTo(
                x - width * 0.28,
                y
            );

            ctx.lineTo(
                x + width * 0.28,
                y
            );

            ctx.stroke();


            ctx.beginPath();

            ctx.arc(
                x,
                y,
                height * 0.12,
                0,
                Math.PI * 2
            );


            ctx.stroke();

        }

        else if (
            type === "reconnaissance"
        ) {

            ctx.beginPath();

            ctx.moveTo(
                x - width * 0.28,
                y + height * 0.20
            );

            ctx.lineTo(
                x,
                y - height * 0.22
            );

            ctx.lineTo(
                x + width * 0.28,
                y + height * 0.20
            );

            ctx.stroke();

        }

        else {

            ctx.beginPath();

            ctx.arc(
                x,
                y,
                height * 0.11,
                0,
                Math.PI * 2
            );

            ctx.fill();

        }



        ctx.restore();

    }


    // ========================================================
    // 绘制单位
    // ========================================================

   drawUnits(
    units = []
) {

    const ctx =
        this.ctx;

    for (
        const unit
        of units
    ) {

        // ========================================
        // 不绘制已经被消灭的单位
        // ========================================

        if (
            !unit ||
            unit.destroyed === true ||
            Number(unit.manpower ?? unit.strength ?? 0) <= 0
        ) {

            continue;

        }


        // ========================================
        // 没有有效地图坐标
        // ========================================

        if (
            unit.q === undefined ||
            unit.r === undefined

        ) {

            continue;

        }


            const p =
                this.worldToScreen(
                    unit.q,
                    unit.r
                );


            const width =
                42 *
                this.camera.zoom;


            const height =
                30 *
                this.camera.zoom;


            const selected =
                this.selection &&
                this.selection.selectedUnit ===
                unit;


            // ------------------------------------------------
            // 选中框
            // ------------------------------------------------

            if (selected) {

                ctx.save();


                ctx.strokeStyle =
                    "#e8c85b";


                ctx.lineWidth =
                    Math.max(

                        2,
                        3 *
                        this.camera.zoom
                    );


                ctx.strokeRect(

                    p.x -
                    width / 2 -
                    5,

                    p.y -
                    height / 2 -
                    5,

                    width +
                    10,

                    height +
                    10

                );


                ctx.restore();

            }


            // ------------------------------------------------
            // 单位底色
            // ------------------------------------------------

            ctx.save();


            ctx.fillStyle =
                this.factionColor(
                    unit
                );


            ctx.strokeStyle =
                "#1c1e1b";



            ctx.lineWidth =
                Math.max(
                    1.5,
                    2 *
                    this.camera.zoom
                );


            ctx.fillRect(

                p.x -
                width / 2,

                p.y -
                height / 2,

                width,

                height

            );


            ctx.strokeRect(

                p.x -
                width / 2,

                p.y -
                height / 2,

                width,

                height

            );


            ctx.restore();


            // ------------------------------------------------
            // 军事符号

            // ------------------------------------------------

            this.drawMilitarySymbol(

                unit,

                p.x,

                p.y,

                width,

                height

            );


            // ------------------------------------------------
            // 上级番号
            // ------------------------------------------------

            const regiment =
                unit.regiment ??
                unit.parent?.regiment ??
                unit.parentUnit ??
                "";


            if (regiment) {

                ctx.save();


                ctx.fillStyle =
                    "#4b493f";


                ctx.font =
                    `${
                        Math.max(
                            7,
                            8 *
                            this.camera.zoom
                        )
                    }px FangSong, serif`;



                ctx.textAlign =
                    "center";


                ctx.fillText(

                    String(regiment),

                    p.x,

                    p.y -
                    height / 2 -
                    4

                );


                ctx.restore();

            }


            // ------------------------------------------------
            // 单位名称
            // ------------------------------------------------

            ctx.save();


            ctx.fillStyle =
                "#34352f";


            ctx.font =
                `${
                    Math.max(
                        8,
                        10 *
                        this.camera.zoom
                    )
                }px FangSong, serif`;


            ctx.textAlign =
                "center";


            ctx.textBaseline =
                "top";


            ctx.fillText(

                unit.name ??
                "",

                p.x,

                p.y +
                height / 2 +
                4

            );


            ctx.restore();

        }

    }


    // ========================================================
    // 总渲染
    // ========================================================

    render(
        units = []
    ) {

        this.clear();


        // 地形
        this.drawTerrain();


        // 地理要素

        this.drawRoads();

        this.drawRailways();

        this.drawRivers();

        this.drawSettlements();


        // 移动范围必须位于单位下面
        this.drawMovementRange();


        // 单位
        this.drawUnits(
            units
        );

    }

}
