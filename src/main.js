// ============================================================
// main.js
// 东线 1941：杜布诺
// V0.8
//
// 玩家：手动移动、攻击
// AI：自动移动、攻击
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
        "找不到 #game-canvas"
    );
}


// ============================================================
// 系统
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
    new CombatSystem();

const aiSystem =
    new AISystem(
        movementSystem,
        combatSystem
    );

const factionSelection =
    new FactionSelection(
        gameState
    );


renderer.selection =
    selection;

renderer.movementSystem =
    movementSystem;

renderer.gameState =
    gameState;


// ============================================================
// 游戏状态
// ============================================================

let units = [];

let turnSystem = null;

let selectedUnit = null;

let aiRunning = false;


// 地图拖动

let dragging = false;

let dragMoved = false;

let lastMouseX = 0;

let lastMouseY = 0;


// ============================================================
// 阵营
// ============================================================

function normalizeSide(value) {

    value =
        String(
            value ?? ""
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
        value === "red_army" ||
        value === "苏军"
    ) {
        return "soviet";
    }

    return value;
}


function getUnitSide(unit) {

    return normalizeSide(
        unit?.side ??
        unit?.faction ??
        unit?.camp ??
        unit?.nation
    );
}


function getPlayerSide() {

    return normalizeSide(
        gameState.playerSide ??
        gameState.side ??
        gameState.faction ??
        gameState.playerFaction
    );
}


function getAISide() {

    return (
        getPlayerSide() === "soviet"
            ? "german"
            : "soviet"
    );
}


function currentPhase() {

    if (!turnSystem) {
        return "german";
    }

    return normalizeSide(
        turnSystem.phase ??
        turnSystem.currentPhase ??
        turnSystem.side ??
        "german"
    );
}


function isPlayerPhase() {

    return (
        currentPhase() ===
        getPlayerSide()
    );
}


function isAIPhase() {

    return (
        currentPhase() ===
        getAISide()
    );
}


// ============================================================
// 单位红蓝关系
// ============================================================

function updateUnitRelations() {

    const player =
        getPlayerSide();

    if (!player) {
        return;
    }

    for (const unit of units) {

        if (
            getUnitSide(unit) ===
            player
        ) {

            unit.relation =
                "friendly";

            unit.displayColor =
                "#4f78a8";
        }

        else {

            unit.relation =
                "enemy";

            unit.displayColor =
                "#a94f4f";
        }
    }
}


// ============================================================
// AP
// ============================================================

function getAP(unit) {

    return combatSystem
        .getAP(unit);
}


function getMaxAP(unit) {

    return Number(
        unit?.maxActionPoints ??
        unit?.maxAP ??
        unit?.maxMovementPoints ??
        getAP(unit) ??
        6
    );
}


function setAP(unit, value) {

    combatSystem
        .setAP(
            unit,
            value
        );
}


// ============================================================
// 渲染
// ============================================================

function render() {

    renderer.units =
        units;

    renderer.render(
        units
    );
}


// ============================================================
// Canvas
// ============================================================

function resizeCanvas() {

    const parent =
        mapArea ??
        canvas.parentElement;

    const rect =
        parent
            .getBoundingClientRect();

    canvas.width =
        Math.max(
            1,
            Math.floor(
                rect.width
            )
        );

    canvas.height =
        Math.max(
            1,
            Math.floor(
                rect.height
            )
        );

    canvas.style.width =
        `${rect.width}px`;

    canvas.style.height =
        `${rect.height}px`;
}


window.addEventListener(
    "resize",
    () => {

        resizeCanvas();
        render();
    }
);


// ============================================================
// 初始化单位
// ============================================================

function initializeUnits() {

    for (const unit of units) {

        unit.q =
            Number(
                unit.q ?? 0
            );

        unit.r =
            Number(
                unit.r ?? 0
            );

        unit.side =
            getUnitSide(unit);


        // AP

        let maxAP =
            getMaxAP(unit);

        if (
            !Number.isFinite(maxAP) ||
            maxAP <= 0
        ) {
            maxAP = 6;
        }

        unit.maxActionPoints =
            maxAP;

        setAP(
            unit,
            maxAP
        );


        // 战斗属性

        if (
            unit.maxStrength == null
        ) {
            unit.maxStrength =
                Number(
                    unit.maxPersonnel ??
                    unit.maxMen ??
                    unit.strength ??
                    unit.personnel ??
                    100
                );
        }

        if (
            unit.strength == null
        ) {
            unit.strength =
                Number(
                    unit.personnel ??
                    unit.maxStrength ??
                    100
                );
        }

        if (
            unit.attack == null
        ) {
            unit.attack = 6;
        }

        if (
            unit.defense == null
        ) {
            unit.defense = 5;
        }

        if (
            unit.range == null
        ) {

            const type =
                String(
                    unit.type ??
                    unit.typeZh ??
                    ""
                )
                    .toLowerCase();

            if (
                type.includes("artillery") ||
                type.includes("炮兵")
            ) {
                unit.range = 3;
            }

            else if (
                type.includes("anti") ||
                type.includes("反坦克")
            ) {
                unit.range = 2;
            }

            else {
                unit.range = 1;
            }
        }

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


        if (
            typeof movementSystem
                .initializeUnit ===
            "function"
        ) {

            try {

                movementSystem
                    .initializeUnit(
                        unit
                    );

            }

            catch (error) {

                console.warn(
                    "initializeUnit:",
                    error
                );
            }
        }
    }
}


// ============================================================
// 玩家是否能操作
// ============================================================

function playerCanControlUnit(unit) {

    if (!unit) {
        return false;
    }

    if (aiRunning) {
        return false;
    }

    if (!isPlayerPhase()) {
        return false;
    }

    return (
        getUnitSide(unit) ===
        getPlayerSide()
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

    const friendly =
        getUnitSide(unit) ===
        getPlayerSide();

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

        <div class="unit-title">
            ${name}
        </div>

        <div class="unit-row">
            <span>关系</span>
            <strong>
                ${friendly ? "我方" : "敌方"}
            </strong>
        </div>

        <div class="unit-row">
            <span>兵种</span>
            <strong>${type}</strong>
        </div>

        <div class="unit-row">
            <span>兵力</span>
            <strong>
                ${combatSystem.getStrength(unit)}
                /
                ${combatSystem.getMaxStrength(unit)}
            </strong>
        </div>

        <div class="unit-row">
            <span>攻击</span>
            <strong>
                ${combatSystem.getAttack(unit)}
            </strong>
        </div>

        <div class="unit-row">
            <span>防御</span>
            <strong>
                ${combatSystem.getDefense(unit)}
            </strong>
        </div>

        <div class="unit-row">
            <span>射程</span>
            <strong>
                ${combatSystem.getRange(unit)}
            </strong>
        </div>

        <div class="unit-row">
            <span>行动点</span>
            <strong>
                ${getAP(unit)}
                /
                ${getMaxAP(unit)}
            </strong>
        </div>

        <div class="unit-row">
            <span>士气</span>
            <strong>
                ${unit.morale}
            </strong>
        </div>

        <div class="unit-row">
            <span>压制</span>
            <strong>
                ${unit.suppression}
            </strong>
        </div>

        <div class="unit-row">
            <span>弹药</span>
            <strong>
                ${unit.ammunition}%
            </strong>
        </div>

        <div class="unit-row">
            <span>位置</span>
            <strong>
                ${unit.q},
                ${unit.r}
            </strong>
        </div>

        <div class="unit-row">
            <span>状态</span>
            <strong>
                ${
                    playerCanControlUnit(unit)
                        ? "可操作"
                        : friendly
                            ? "等待我方阶段"
                            : "AI控制"
                }
            </strong>
        </div>
    `;
}


// ============================================================
// 移动范围
// ============================================================

function clearReachable() {

    if (
        movementSystem.reachable
        instanceof Map
    ) {
        movementSystem
            .reachable
            .clear();
    }

    if (
        typeof movementSystem
            .clearSelection ===
        "function"
    ) {

        try {

            movementSystem
                .clearSelection();

        }

        catch (error) {
            console.warn(error);
        }
    }

    if (
        typeof renderer
            .clearReachable ===
        "function"
    ) {
        renderer.clearReachable();
    }
}


function calculateReachable(unit) {

    clearReachable();

    if (
        !playerCanControlUnit(unit)
    ) {
        return;
    }

    unit.movementPoints =
        getAP(unit);

    movementSystem
        .selectUnit(
            unit,
            units
        );

    if (
        typeof renderer
            .setReachable ===
        "function"
    ) {
        renderer.setReachable(
            movementSystem.reachable
        );
    }
}


// ============================================================
// 选择
// ============================================================

function selectUnit(unit) {

    if (!unit) {
        return;
    }

    selectedUnit =
        unit;

    selection.selectedUnit =
        unit;

    if (
        typeof renderer
            .setSelectedUnit ===
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
        playerCanControlUnit(unit)
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


function clearSelection() {

    selectedUnit =
        null;

    selection.selectedUnit =
        null;

    clearReachable();

    if (
        typeof renderer
            .setSelectedUnit ===
        "function"
    ) {
        renderer.setSelectedUnit(
            null
        );
    }

    if (unitInfo) {
        unitInfo.innerHTML =
            "点击地图上的单位查看详情";
    }
}


// ============================================================
// 单位移除
// ============================================================

function destroyUnit(unit) {

    const index =
        units.indexOf(unit);

    if (index >= 0) {

        units.splice(
            index,
            1
        );
    }

    renderer.units =
        units;

    selection.units =
        units;

    gameState.units =
        units;

    if (
        selectedUnit === unit
    ) {
        selectedUnit = null;
    }
}


// ============================================================
// 玩家攻击
// ============================================================

function playerAttack(
    attacker,
    defender
) {

    if (
        !playerCanControlUnit(
            attacker
        )
    ) {
        return false;
    }

    const result =
        combatSystem.attack(
            attacker,
            defender
        );

    if (!result.success) {

        console.log(
            "无法攻击：",
            result.reason
        );

        return false;
    }

    console.log(
        `${attacker.id} 攻击 ${defender.id}`,
        `伤害 ${result.damage}`
    );

    if (
        result.destroyed
    ) {
        destroyUnit(
            defender
        );
    }

    showUnitInfo(
        attacker
    );

    calculateReachable(
        attacker
    );

    render();

    return true;
}


// ============================================================
// 鼠标坐标
// ============================================================

function mousePosition(event) {

    const rect =
        canvas
            .getBoundingClientRect();

    return {

        x:
            event.clientX -
            rect.left,

        y:
            event.clientY -
            rect.top
    };
}


function screenToWorld(x, y) {

    if (
        typeof renderer
            .screenToWorld ===
        "function"
    ) {

        const result =
            renderer
                .screenToWorld(
                    x,
                    y
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
            (x - offsetX) /
            zoom,

        y:
            (y - offsetY) /
            zoom
    };
}


function mouseToHex(event) {

    const mouse =
        mousePosition(
            event
        );

    const point =
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
            point.x,
            point.y,
            size
        );

    if (!hex) {
        return null;
    }

    return {

        q:
            Math.round(
                Number(hex.q)
            ),

        r:
            Math.round(
                Number(hex.r)
            )
    };
}


function unitAtHex(q, r) {

    return (
        units.find(
            unit =>
                Number(unit.q) ===
                Number(q)
                &&
                Number(unit.r) ===
                Number(r)
        )
        ??
        null
    );
}


function findUnit(event) {

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
// 玩家移动
// ============================================================

function playerMove(q, r) {

    if (
        !selectedUnit ||
        !playerCanControlUnit(
            selectedUnit
        )
    ) {
        return false;
    }

    if (
        !movementSystem
            .canMoveTo(
                q,
                r
            )
    ) {
        return false;
    }

    if (
        unitAtHex(q, r)
    ) {
        return false;
    }

    const result =
        movementSystem
            .moveTo(
                q,
                r
            );

    if (!result) {
        return false;
    }

    showUnitInfo(
        selectedUnit
    );

    calculateReachable(
        selectedUnit
    );

    render();

    return true;
}


// ============================================================
// Canvas 点击
// ============================================================

canvas.addEventListener(
    "click",
    event => {

        if (
            aiRunning
        ) {
            return;
        }

        if (dragMoved) {

            dragMoved = false;

            return;
        }

        const clickedUnit =
            findUnit(
                event
            );


        // 点击单位

        if (clickedUnit) {

            /*
             * 已选中我方单位，
             * 再点击敌军：
             * 尝试攻击。
             */

            if (
                selectedUnit &&
                playerCanControlUnit(
                    selectedUnit
                ) &&
                combatSystem.isEnemy(
                    selectedUnit,
                    clickedUnit
                )
            ) {

                if (
                    playerAttack(
                        selectedUnit,
                        clickedUnit
                    )
                ) {
                    return;
                }

                /*
                 * 射程外时仅查看敌军。
                 */

                showUnitInfo(
                    clickedUnit
                );

                return;
            }


            /*
             * 我方单位
             */

            if (
                getUnitSide(
                    clickedUnit
                ) ===
                getPlayerSide()
            ) {

                selectUnit(
                    clickedUnit
                );

                return;
            }


            /*
             * 单独点击敌军：
             * 查看信息。
             */

            showUnitInfo(
                clickedUnit
            );

            return;
        }


        // 点击空地移动

        if (
            selectedUnit
        ) {

            const hex =
                mouseToHex(
                    event
                );

            if (
                hex &&
                playerMove(
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
// 拖动
// ============================================================

canvas.addEventListener(
    "mousedown",
    event => {

        if (
            event.button !== 0
        ) {
            return;
        }

        dragging = true;

        dragMoved = false;

        lastMouseX =
            event.clientX;

        lastMouseY =
            event.clientY;
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

        if (
            Math.abs(dx) > 3 ||
            Math.abs(dy) > 3
        ) {
            dragMoved = true;
        }

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

                if ("x" in camera) {
                    camera.x =
                        Number(
                            camera.x ?? 0
                        ) + dx;
                }

                if ("y" in camera) {
                    camera.y =
                        Number(
                            camera.y ?? 0
                        ) + dy;
                }

                if (
                    "offsetX" in camera
                ) {
                    camera.offsetX =
                        Number(
                            camera.offsetX ?? 0
                        ) + dx;
                }

                if (
                    "offsetY" in camera
                ) {
                    camera.offsetY =
                        Number(
                            camera.offsetY ?? 0
                        ) + dy;
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


window.addEventListener(
    "mouseup",
    () => {

        dragging = false;
    }
);


canvas.addEventListener(
    "contextmenu",
    event => {

        event.preventDefault();

        if (aiRunning) {
            return;
        }

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
            Number(
                camera.zoom ?? 1
            );

        camera.zoom =
            Math.max(
                0.35,
                Math.min(
                    3,
                    oldZoom *
                    (
                        event.deltaY < 0
                            ? 1.1
                            : 0.9
                    )
                )
            );

        render();
    },
    {
        passive: false
    }
);


// ============================================================
// 回合 UI
// ============================================================

function updateTurnUI() {

    if (!turnSystem) {
        return;
    }

    const number =
        turnSystem.turn ??
        turnSystem.turnNumber ??
        1;

    if (turnNumber) {

        turnNumber.textContent =
            `第${number}回合`;
    }

    if (turnPhase) {

        if (aiRunning) {

            turnPhase.textContent =
                "AI行动";

        }

        else {

            turnPhase.textContent =
                isPlayerPhase()
                    ? "我方行动"
                    : "敌方行动";
        }
    }

    if (endPhaseButton) {

        if (aiRunning) {

            endPhaseButton.textContent =
                "AI行动中……";

            endPhaseButton.disabled =
                true;

        }

        else {

            endPhaseButton.textContent =
                "结束我方行动";

            endPhaseButton.disabled =
                !isPlayerPhase();
        }
    }

    if (
        turnInfo &&
        typeof turnSystem
            .getHeaderText ===
        "function"
    ) {

        turnInfo.textContent =
            turnSystem
                .getHeaderText();
    }

    if (
        turnTime &&
        typeof turnSystem
            .getTurnTimeRange ===
        "function"
    ) {

        turnTime.textContent =
            turnSystem
                .getTurnTimeRange();
    }
}


// ============================================================
// AP 恢复
// ============================================================

function resetSideAP(side) {

    for (const unit of units) {

        if (
            getUnitSide(unit) !==
            side
        ) {
            continue;
        }

        setAP(
            unit,
            getMaxAP(unit)
        );

        unit.suppression =
            Math.max(
                0,
                Number(
                    unit.suppression ??
                    0
                ) - 10
            );
    }
}


// ============================================================
// 进入下一阶段
// ============================================================

function advancePhase() {

    if (
        typeof turnSystem
            .endPhase ===
        "function"
    ) {

        turnSystem.endPhase();

        return;
    }


    /*
     * TurnSystem 后备逻辑。
     */

    if (
        currentPhase() ===
        "german"
    ) {

        turnSystem.phase =
            "soviet";

    }

    else {

        turnSystem.phase =
            "german";

        if (
            Number.isFinite(
                Number(
                    turnSystem.turn
                )
            )
        ) {
            turnSystem.turn++;
        }

        else if (
            Number.isFinite(
                Number(
                    turnSystem.turnNumber
                )
            )
        ) {
            turnSystem.turnNumber++;
        }
    }
}


// ============================================================
// AI 回合
// ============================================================

async function runAITurn() {

    if (aiRunning) {
        return;
    }

    aiRunning = true;

    clearSelection();

    resetSideAP(
        getAISide()
    );

    updateTurnUI();

    render();


    console.log(
        "AI行动开始：",
        getAISide()
    );


    await aiSystem.runTurn(

        getAISide(),

        units,

        {

            onUnitStart(unit) {

                selectedUnit =
                    unit;

                if (
                    typeof renderer
                        .setSelectedUnit ===
                    "function"
                ) {

                    renderer
                        .setSelectedUnit(
                            unit
                        );
                }

                showUnitInfo(
                    unit
                );

                render();
            },


            onMove(info) {

                console.log(
                    "AI移动：",
                    info.unit.id,
                    `${info.oldQ},${info.oldR}`,
                    "→",
                    `${info.q},${info.r}`
                );

                render();
            },


            onAttack(result) {

                console.log(
                    "AI攻击：",
                    result.attacker.id,
                    "→",
                    result.defender.id,
                    "伤害：",
                    result.damage
                );

                if (
                    result.destroyed
                ) {
                    destroyUnit(
                        result.defender
                    );
                }

                render();
            },


            onUnitEnd(unit) {

                showUnitInfo(
                    unit
                );

                render();
            }
        }
    );


    selectedUnit =
        null;

    aiRunning =
        false;


    /*
     * AI行动结束，
     * 自动进入下一阶段。
     */

    advancePhase();


    /*
     * 玩家下一阶段恢复 AP。
     */

    resetSideAP(
        getPlayerSide()
    );


    clearSelection();

    updateTurnUI();

    render();


    console.log(
        "AI行动结束"
    );
}


// ============================================================
// 玩家结束行动
// ============================================================

async function endPlayerPhase() {

    if (
        aiRunning ||
        !isPlayerPhase()
    ) {
        return;
    }

    clearSelection();

    advancePhase();

    updateTurnUI();

    render();


    /*
     * 进入 AI 阶段。
     */

    if (
        isAIPhase()
    ) {

        await runAITurn();
    }
}


// ============================================================
// 按钮
// ============================================================

if (endPhaseButton) {

    endPhaseButton
        .addEventListener(
            "click",
            event => {

                event.preventDefault();

                event.stopPropagation();

                endPlayerPhase();
            }
        );
}


// ============================================================
// 键盘
// ============================================================

window.addEventListener(
    "keydown",
    event => {

        if (aiRunning) {
            return;
        }

        if (
            event.key ===
            "Escape"
        ) {

            clearSelection();

            render();

            return;
        }

        if (
            event.key
                .toLowerCase() ===
            "e"
        ) {

            endPlayerPhase();
        }
    }
);


// ============================================================
// 场景
// ============================================================

function extractUnits(data) {

    if (!data) {
        return [];
    }

    if (
        Array.isArray(data)
    ) {
        return data;
    }

    if (
        Array.isArray(
            data.units
        )
    ) {
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

    if (
        Array.isArray(german)
    ) {

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

    if (
        Array.isArray(soviet)
    ) {

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

            // 尝试下一个
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
            q: 14,
            r: 12,

            maxActionPoints: 8,

            strength: 120,
            maxStrength: 120,

            attack: 10,
            defense: 8,
            range: 1,

            morale: 90,
            ammunition: 100
        },

        {
            id: "GER_INF_01",
            nameZh: "德军第1步兵团",
            typeZh: "步兵",
            side: "german",
            q: 11,
            r: 14,

            maxActionPoints: 6,

            strength: 160,
            maxStrength: 160,

            attack: 6,
            defense: 6,
            range: 1,

            morale: 80,
            ammunition: 100
        },

        {
            id: "SOV_ARM_01",
            nameZh: "苏军第1坦克团",
            typeZh: "装甲",
            side: "soviet",
            q: 30,
            r: 15,

            maxActionPoints: 8,

            strength: 120,
            maxStrength: 120,

            attack: 9,
            defense: 7,
            range: 1,

            morale: 80,
            ammunition: 100
        },

        {
            id: "SOV_INF_01",
            nameZh: "苏军第1步兵团",
            typeZh: "步兵",
            side: "soviet",
            q: 27,
            r: 15,

            maxActionPoints: 6,

            strength: 160,
            maxStrength: 160,

            attack: 5,
            defense: 5,
            range: 1,

            morale: 80,
            ammunition: 100
        }
    ];
}


// ============================================================
// 应用场景
// ============================================================

function applyScenario(data) {

    units =
        extractUnits(
            data
        );

    if (
        units.length === 0 &&
        Array.isArray(
            world.units
        )
    ) {
        units =
            world.units;
    }

    if (
        units.length === 0
    ) {

        console.warn(
            "没有读取到场景单位，使用测试单位。"
        );

        units =
            fallbackUnits();
    }

    initializeUnits();

    renderer.units =
        units;

    selection.units =
        units;

    gameState.units =
        units;
}


// ============================================================
// 相机
// ============================================================

function initializeCamera() {

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
                "fitToMap:",
                error
            );
        }
    }

    if (
        !Number.isFinite(
            Number(
                camera.zoom
            )
        )
    ) {
        camera.zoom = 1;
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

    updateTurnUI();
}


// ============================================================
// 开始游戏
// ============================================================

async function startGame() {

    updateUnitRelations();

    /*
     * 如果玩家选择苏军，
     * 但第一阶段是德军，
     * 那么德军就是 AI，
     * 自动先走。
     */

    resetSideAP(
        currentPhase()
    );

    clearSelection();

    updateTurnUI();

    render();


    console.log(
        "玩家：",
        getPlayerSide()
    );

    console.log(
        "AI：",
        getAISide()
    );


    if (
        isAIPhase()
    ) {

        await runAITurn();
    }
}


// ============================================================
// 初始化
// ============================================================

async function initializeGame() {

    console.log(
        "东线 1941 V0.8 初始化"
    );

    resizeCanvas();

    const scenario =
        await loadScenario();

    applyScenario(
        scenario
    );

    initializeCamera();

    initializeTurnSystem();

    render();


    /*
     * 玩家选择阵营。
     */

    if (
        typeof factionSelection
            .show ===
        "function"
    ) {

        factionSelection.show(
            () => {

                startGame();
            }
        );
    }

    else {

        /*
         * 后备：
         * 默认德军。
         */

        gameState.playerSide =
            "german";

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

    movementSystem,
    combatSystem,
    aiSystem,

    getUnits() {
        return units;
    },

    getPlayerSide,

    getAISide,

    getPhase() {
        return currentPhase();
    },

    getSelectedUnit() {
        return selectedUnit;
    },

    render,

    async runAI() {
        await runAITurn();
    },

    attack(
        attackerId,
        defenderId
    ) {

        const attacker =
            units.find(
                unit =>
                    String(unit.id) ===
                    String(attackerId)
            );

        const defender =
            units.find(
                unit =>
                    String(unit.id) ===
                    String(defenderId)
            );

        if (
            !attacker ||
            !defender
        ) {
            return null;
        }

        return combatSystem.attack(
            attacker,
            defender
        );
    }
};


// ============================================================
// 启动
// ============================================================

initializeGame()
    .catch(
        error => {

            console.error(
                "系统初始化失败：",
                error
            );

            if (unitInfo) {

                unitInfo.innerHTML = `
                    <div class="unit-title">
                        游戏初始化失败
                    </div>

                    <p>
                        ${String(error)}
                    </p>
                `;
            }
        }
    );


console.log(
    "main.js V0.8 已加载"
);
