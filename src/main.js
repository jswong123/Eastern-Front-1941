// ============================================================
// main.js
// 东线 1941：杜布诺
// V0.7
//
// 核心功能：
// 1. 地图
// 2. 单位选择
// 3. 双方轮流行动
// 4. 移动范围
// 5. 单位移动
// 6. 基础攻击
// 7. 战斗伤亡
// 8. 单位消灭
// 9. 回合推进
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
        "找不到 #game-canvas"
    );
}


// ============================================================
// 核心对象
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


renderer.selection =
    selection;

renderer.movementSystem =
    movementSystem;


// ============================================================
// 游戏状态
// ============================================================

let units = [];

let selectedUnit = null;

let turnSystem = null;


// 地图拖动

let dragging = false;

let dragMoved = false;

let lastMouseX = 0;

let lastMouseY = 0;


// ============================================================
// 战斗系统参数
// ============================================================

const ATTACK_AP_COST = 2;


// ============================================================
// 阵营标准化
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
// 单位阵营
// ============================================================

function unitSide(unit) {

    return normalizeSide(

        unit?.side ??

        unit?.faction ??

        unit?.camp ??

        unit?.nation
    );
}


// ============================================================
// 当前行动阶段
// ============================================================

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


// ============================================================
// 当前阶段名称
// ============================================================

function phaseName() {

    return (
        currentPhase() === "soviet"
            ? "苏军"
            : "德军"
    );
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
// Canvas 大小
// ============================================================

function resizeCanvas() {

    const parent =
        mapArea ??
        canvas.parentElement;


    const rect =
        parent.getBoundingClientRect();


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


function setAP(
    unit,
    value
) {

    const ap =
        Math.max(
            0,
            Number(value) || 0
        );


    unit.actionPoints =
        ap;


    unit.ap =
        ap;


    unit.movementPoints =
        ap;
}


// ============================================================
// 战斗属性
// ============================================================

function getStrength(unit) {

    return Number(

        unit?.strength ??

        unit?.personnel ??

        unit?.men ??

        160
    );
}


function getMaxStrength(unit) {

    return Number(

        unit?.maxStrength ??

        unit?.maxPersonnel ??

        unit?.maxMen ??

        160
    );
}


function setStrength(
    unit,
    value
) {

    const strength =
        Math.max(
            0,
            Math.round(
                Number(value) || 0
            )
        );


    unit.strength =
        strength;


    if (
        "personnel" in unit
    ) {

        unit.personnel =
            strength;
    }


    if (
        "men" in unit
    ) {

        unit.men =
            strength;
    }
}


function getAttack(unit) {

    return Number(
        unit?.attack ??
        unit?.attackPower ??
        6
    );
}


function getDefense(unit) {

    return Number(
        unit?.defense ??
        unit?.defensePower ??
        5
    );
}


function getRange(unit) {

    return Math.max(
        1,
        Number(
            unit?.range ??
            unit?.attackRange ??
            1
        )
    );
}


// ============================================================
// 初始化单位
// ============================================================

function initializeUnits() {

    for (
        const unit of units
    ) {

        unit.q =
            Number(
                unit.q ?? 0
            );


        unit.r =
            Number(
                unit.r ?? 0
            );


        const side =
            unitSide(unit);


        if (side) {

            unit.side =
                side;
        }


        if (
            typeof movementSystem.initializeUnit ===
            "function"
        ) {

            try {

                movementSystem.initializeUnit(
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


        // ------------------------
        // AP
        // ------------------------

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


        if (
            !Number.isFinite(
                getAP(unit)
            )
        ) {

            setAP(
                unit,
                maxAP
            );
        }


        // ------------------------
        // 战斗属性
        // ------------------------

        if (
            unit.maxStrength == null
        ) {

            unit.maxStrength =
                Number(
                    unit.maxPersonnel ??
                    unit.maxMen ??
                    getStrength(unit) ??
                    160
                );
        }


        if (
            unit.strength == null
        ) {

            unit.strength =
                Number(
                    unit.personnel ??
                    unit.men ??
                    unit.maxStrength ??
                    160
                );
        }


        if (
            unit.attack == null
        ) {

            unit.attack =
                Number(
                    unit.attackPower ??
                    6
                );
        }


        if (
            unit.defense == null
        ) {

            unit.defense =
                Number(
                    unit.defensePower ??
                    5
                );
        }


        if (
            unit.range == null
        ) {

            unit.range =
                Number(
                    unit.attackRange ??
                    1
                );
        }


        // ------------------------
        // 状态
        // ------------------------

        if (
            unit.morale == null
        ) {

            unit.morale = 80;
        }


        if (
            unit.suppression == null
        ) {

            unit.suppression = 0;
        }


        if (
            unit.fatigue == null
        ) {

            unit.fatigue = 0;
        }


        if (
            unit.ammunition == null
        ) {

            unit.ammunition = 100;
        }
    }
}


// ============================================================
// 当前阶段是否可以控制单位
// ============================================================

function canControl(unit) {

    if (!unit) {

        return false;
    }


    /*
     * V0.7：
     *
     * 不再锁死在玩家最初选择的阵营。
     *
     * 德军阶段：
     * 控制德军。
     *
     * 苏军阶段：
     * 控制苏军。
     */

    return (
        unitSide(unit) ===
        currentPhase()
    );
}


// ============================================================
// 六角格距离
// ============================================================

function hexDistance(
    a,
    b
) {

    if (
        !a ||
        !b
    ) {

        return Infinity;
    }


    const dq =
        Number(a.q) -
        Number(b.q);


    const dr =
        Number(a.r) -
        Number(b.r);


    return (
        Math.abs(dq) +
        Math.abs(dr) +
        Math.abs(dq + dr)
    ) / 2;
}


// ============================================================
// 是否敌军
// ============================================================

function isEnemy(
    attacker,
    defender
) {

    if (
        !attacker ||
        !defender
    ) {

        return false;
    }


    return (
        unitSide(attacker) !==
        unitSide(defender)
    );
}


// ============================================================
// 是否可以攻击
// ============================================================

function canAttack(
    attacker,
    defender
) {

    if (
        !attacker ||
        !defender
    ) {

        return false;
    }


    if (
        !canControl(attacker)
    ) {

        return false;
    }


    if (
        !isEnemy(
            attacker,
            defender
        )
    ) {

        return false;
    }


    if (
        getStrength(attacker) <= 0 ||
        getStrength(defender) <= 0
    ) {

        return false;
    }


    if (
        getAP(attacker) <
        ATTACK_AP_COST
    ) {

        return false;
    }


    const distance =
        hexDistance(
            attacker,
            defender
        );


    return (
        distance <=
        getRange(attacker)
    );
}


// ============================================================
// 伤害计算
// ============================================================

function calculateDamage(
    attacker,
    defender
) {

    const attack =
        getAttack(attacker);


    const defense =
        getDefense(defender);


    const strengthRatio =
        Math.max(
            0.1,
            getStrength(attacker) /
            Math.max(
                1,
                getMaxStrength(attacker)
            )
        );


    /*
     * 第一版采用确定性伤害。
     *
     * 以后可以替换成：
     *
     * - 软攻击
     * - 硬攻击
     * - 装甲
     * - 穿深
     * - 地形
     * - 士气
     * - 压制
     * - 随机波动
     */

    let damage =

        (
            attack * 3 -
            defense * 1.5
        ) *

        strengthRatio;


    damage =
        Math.round(
            damage
        );


    return Math.max(
        1,
        damage
    );
}


// ============================================================
// 执行攻击
// ============================================================

function attackUnit(
    attacker,
    defender
) {

    if (
        !canAttack(
            attacker,
            defender
        )
    ) {

        return false;
    }


    const oldStrength =
        getStrength(defender);


    const damage =
        calculateDamage(
            attacker,
            defender
        );


    const newStrength =
        Math.max(
            0,
            oldStrength -
            damage
        );


    setStrength(
        defender,
        newStrength
    );


    setAP(
        attacker,
        getAP(attacker) -
        ATTACK_AP_COST
    );


    /*
     * 弹药消耗
     */

    attacker.ammunition =
        Math.max(
            0,
            Number(
                attacker.ammunition ??
                100
            ) - 5
        );


    /*
     * 被攻击单位受到压制
     */

    defender.suppression =
        Math.min(
            100,
            Number(
                defender.suppression ??
                0
            ) +
            Math.max(
                5,
                Math.round(
                    damage / 2
                )
            )
        );


    console.log(
        "========== 战斗 =========="
    );


    console.log(
        attacker.id ??
        attacker.name,
        "攻击",
        defender.id ??
        defender.name
    );


    console.log(
        "距离：",
        hexDistance(
            attacker,
            defender
        )
    );


    console.log(
        "伤害：",
        damage
    );


    console.log(
        "兵力：",
        oldStrength,
        "→",
        newStrength
    );


    /*
     * 单位被消灭
     */

    if (
        newStrength <= 0
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
// 消灭单位
// ============================================================

function destroyUnit(unit) {

    const index =
        units.indexOf(unit);


    if (
        index >= 0
    ) {

        units.splice(
            index,
            1
        );
    }


    if (
        selectedUnit === unit
    ) {

        selectedUnit =
            null;
    }


    console.log(
        "单位被消灭：",
        unit.id ??
        unit.name
    );


    renderer.units =
        units;


    selection.units =
        units;


    gameState.units =
        units;
}


// ============================================================
// 重置当前行动方 AP
// ============================================================

function resetPhaseUnits(side) {

    side =
        normalizeSide(side);


    for (
        const unit of units
    ) {

        if (
            unitSide(unit) !==
            side
        ) {

            continue;
        }


        setAP(
            unit,
            getMaxAP(unit)
        );


        /*
         * 每个行动阶段轻微恢复压制。
         */

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

            resetPhaseUnits(
                currentPhase()
            );

            updateTurnUI();

            render();
        };


    turnSystem.onTurnChanged =
        () => {

            updateTurnUI();

            render();
        };


    turnSystem.onTimeChanged =
        () => {

            updateTurnUI();
        };


    /*
     * 第一阶段德军获得完整 AP。
     */

    resetPhaseUnits(
        "german"
    );


    updateTurnUI();
}


// ============================================================
// 更新回合 UI
// ============================================================

function updateTurnUI() {

    if (!turnSystem) {

        return;
    }


    const phase =
        currentPhase();


    const number =

        turnSystem.turn ??

        turnSystem.turnNumber ??

        1;


    if (turnNumber) {

        turnNumber.textContent =
            `第${number}回合`;
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


    if (
        turnInfo &&
        typeof turnSystem.getHeaderText ===
        "function"
    ) {

        turnInfo.textContent =
            turnSystem.getHeaderText();
    }


    if (
        turnTime &&
        typeof turnSystem.getTurnTimeRange ===
        "function"
    ) {

        turnTime.textContent =
            turnSystem.getTurnTimeRange();
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


    const sideName =

        unitSide(unit) ===
        "german"

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


    const status =

        canControl(unit)

            ? (
                getAP(unit) > 0
                    ? "可行动"
                    : "行动点耗尽"
            )

            : "等待行动阶段";


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
            <span>兵力</span>
            <strong>
                ${getStrength(unit)}
                /
                ${getMaxStrength(unit)}
            </strong>
        </div>

        <div class="unit-row">
            <span>攻击</span>
            <strong>
                ${getAttack(unit)}
            </strong>
        </div>

        <div class="unit-row">
            <span>防御</span>
            <strong>
                ${getDefense(unit)}
            </strong>
        </div>

        <div class="unit-row">
            <span>射程</span>
            <strong>
                ${getRange(unit)}
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
                ${unit.morale ?? "—"}
            </strong>
        </div>

        <div class="unit-row">
            <span>压制</span>
            <strong>
                ${unit.suppression ?? "—"}
            </strong>
        </div>

        <div class="unit-row">
            <span>疲劳</span>
            <strong>
                ${unit.fatigue ?? "—"}
            </strong>
        </div>

        <div class="unit-row">
            <span>弹药</span>
            <strong>
                ${unit.ammunition ?? "—"}%
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
                ${status}
            </strong>
        </div>

    `;
}


// ============================================================
// 清除移动范围
// ============================================================

function clearReachable() {

    if (
        typeof movementSystem.clearSelection ===
        "function"
    ) {

        try {

            movementSystem.clearSelection();

        }

        catch (error) {

            console.warn(error);
        }
    }


    if (
        movementSystem.reachable
        instanceof Map
    ) {

        movementSystem.reachable.clear();
    }


    if (
        movementSystem.reachableHexes
        instanceof Map
    ) {

        movementSystem.reachableHexes.clear();
    }


    if (
        typeof renderer.clearReachable ===
        "function"
    ) {

        renderer.clearReachable();
    }
}


// ============================================================
// 计算移动范围
// ============================================================

function calculateReachable(unit) {

    clearReachable();


    if (
        !unit ||
        !canControl(unit) ||
        getAP(unit) <= 0
    ) {

        return;
    }


    unit.movementPoints =
        getAP(unit);


    let result =
        null;


    if (
        typeof movementSystem.selectUnit ===
        "function"
    ) {

        try {

            result =
                movementSystem.selectUnit(
                    unit,
                    units
                );

        }

        catch (error) {

            console.warn(
                "selectUnit:",
                error
            );
        }
    }


    else if (
        typeof movementSystem.calculateReachable ===
        "function"
    ) {

        try {

            result =
                movementSystem.calculateReachable(
                    unit,
                    units
                );

        }

        catch (error) {

            console.warn(
                "calculateReachable:",
                error
            );
        }
    }


    else if (
        typeof movementSystem.computeReachable ===
        "function"
    ) {

        try {

            result =
                movementSystem.computeReachable(
                    unit,
                    units
                );

        }

        catch (error) {

            console.warn(
                "computeReachable:",
                error
            );
        }
    }


    if (
        result instanceof Map
    ) {

        movementSystem.reachable =
            result;
    }


    const reachable =

        movementSystem.reachable ??

        movementSystem.reachableHexes ??

        result;


    if (
        typeof renderer.setReachable ===
        "function"
    ) {

        renderer.setReachable(
            reachable
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


    selectedUnit =
        unit;


    selection.selectedUnit =
        unit;


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
                "UnitSelection.select:",
                error
            );
        }
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
        canControl(unit)
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
// 取消选择
// ============================================================

function clearSelection() {

    selectedUnit =
        null;


    if (
        typeof selection.clear ===
        "function"
    ) {

        try {

            selection.clear();

        }

        catch (error) {

            console.warn(error);
        }
    }


    selection.selectedUnit =
        null;


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

        unitInfo.innerHTML =
            "点击地图上的单位查看详情";
    }
}


// ============================================================
// Hex 上的单位
// ============================================================

function unitAtHex(
    q,
    r
) {

    return (
        units.find(

            unit =>

                Number(unit.q) ===
                Number(q)

                &&

                Number(unit.r) ===
                Number(r)

        ) ?? null
    );
}


// ============================================================
// 鼠标位置
// ============================================================

function mousePosition(event) {

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
// 屏幕 → 世界坐标
// ============================================================

function screenToWorld(
    x,
    y
) {

    if (
        typeof renderer.screenToWorld ===
        "function"
    ) {

        try {

            const result =
                renderer.screenToWorld(
                    x,
                    y
                );


            if (result) {

                return result;
            }

        }

        catch (error) {

            console.warn(error);
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


// ============================================================
// 鼠标 → Hex
// ============================================================

function mouseToHex(event) {

    const mouse =
        mousePosition(
            event
        );


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


// ============================================================
// 点击检测单位
// ============================================================

function findUnit(event) {

    const mouse =
        mousePosition(
            event
        );


    if (
        typeof selection.findUnitAt ===
        "function"
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
                "findUnitAt:",
                error
            );
        }
    }


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
// Reachable 查询
// ============================================================

function reachableAt(
    q,
    r
) {

    const key =
        `${q},${r}`;


    const sources = [

        movementSystem.reachable,

        movementSystem.reachableHexes,

        renderer.reachable,

        renderer.reachableHexes
    ];


    for (
        const source of sources
    ) {

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


            /*
             * 某些 MovementSystem
             * 使用对象作为 Map key。
             */

            for (
                const [hex, value]
                of source.entries()
            ) {

                if (
                    Number(hex?.q) ===
                    Number(q)

                    &&

                    Number(hex?.r) ===
                    Number(r)
                ) {

                    return value;
                }
            }
        }


        else if (
            typeof source ===
            "object"

            &&

            Object.prototype
                .hasOwnProperty
                .call(
                    source,
                    key
                )
        ) {

            return source[key];
        }
    }


    return null;
}


// ============================================================
// 移动成本
// ============================================================

function movementCost(data) {

    if (
        data == null
    ) {

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


    const values = [

        data.cost,

        data.totalCost,

        data.apCost,

        data.distance,

        data.g
    ];


    for (
        const value of values
    ) {

        const number =
            Number(value);


        if (
            Number.isFinite(
                number
            )
        ) {

            return number;
        }
    }


    return null;
}


// ============================================================
// 移动单位
// ============================================================

function moveSelectedUnit(
    q,
    r
) {

    if (
        !selectedUnit
    ) {

        return false;
    }


    if (
        !canControl(
            selectedUnit
        )
    ) {

        return false;
    }


    if (
        Number(selectedUnit.q) ===
        Number(q)

        &&

        Number(selectedUnit.r) ===
        Number(r)
    ) {

        return false;
    }


    /*
     * 目标 Hex 有单位。
     */

    if (
        unitAtHex(
            q,
            r
        )
    ) {

        return false;
    }


    const data =
        reachableAt(
            q,
            r
        );


    if (
        data == null
    ) {

        return false;
    }


    const cost =
        movementCost(
            data
        );


    if (
        cost == null ||
        cost >
        getAP(selectedUnit)
    ) {

        return false;
    }


    const oldQ =
        selectedUnit.q;


    const oldR =
        selectedUnit.r;


    const oldAP =
        getAP(
            selectedUnit
        );


    let systemMoved =
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


            systemMoved =
                result !== false;

        }

        catch (error) {

            console.warn(
                "moveUnit:",
                error
            );
        }
    }


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


            systemMoved =
                result !== false;

        }

        catch (error) {

            console.warn(
                "moveTo:",
                error
            );
        }
    }


    /*
     * MovementSystem 没有改变坐标，
     * main.js 自己改变。
     */

    if (
        Number(selectedUnit.q) ===
        Number(oldQ)

        &&

        Number(selectedUnit.r) ===
        Number(oldR)
    ) {

        selectedUnit.q =
            Number(q);


        selectedUnit.r =
            Number(r);
    }


    /*
     * AP 同步。
     */

    const systemAP =
        Number(
            selectedUnit.movementPoints
        );


    if (
        systemMoved &&
        Number.isFinite(systemAP) &&
        systemAP < oldAP
    ) {

        setAP(
            selectedUnit,
            systemAP
        );
    }

    else {

        setAP(
            selectedUnit,
            oldAP - cost
        );
    }


    console.log(
        "移动：",
        `${oldQ},${oldR}`,
        "→",
        `${q},${r}`,
        "成本：",
        cost,
        "剩余 AP：",
        getAP(selectedUnit)
    );


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

        /*
         * 刚刚拖动过地图，
         * 不执行点击。
         */

        if (dragMoved) {

            dragMoved =
                false;

            return;
        }


        const clickedUnit =
            findUnit(
                event
            );


        // ====================================================
        // 点击到了单位
        // ====================================================

        if (clickedUnit) {


            /*
             * 已经选择了我方单位，
             * 点击的是敌军。
             *
             * 优先尝试攻击。
             */

            if (
                selectedUnit

                &&

                selectedUnit !==
                clickedUnit

                &&

                isEnemy(
                    selectedUnit,
                    clickedUnit
                )
            ) {

                if (
                    attackUnit(
                        selectedUnit,
                        clickedUnit
                    )
                ) {

                    return;
                }


                /*
                 * 敌人在射程外。
                 *
                 * 仍然允许查看敌军信息，
                 * 但不会切换为可操作单位。
                 */

                showUnitInfo(
                    clickedUnit
                );


                render();


                return;
            }


            /*
             * 点击友军或没有选择单位。
             */

            selectUnit(
                clickedUnit
            );


            return;
        }


        // ====================================================
        // 点击空地
        // ====================================================

        if (
            selectedUnit
        ) {

            const hex =
                mouseToHex(
                    event
                );


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


        /*
         * 不是移动目标，
         * 清除选择。
         */

        clearSelection();

        render();
    }
);


// ============================================================
// 地图拖动
// ============================================================

canvas.addEventListener(
    "mousedown",
    event => {

        if (
            event.button !== 0
        ) {

            return;
        }


        dragging =
            true;


        dragMoved =
            false;


        lastMouseX =
            event.clientX;


        lastMouseY =
            event.clientY;
    }
);


window.addEventListener(
    "mousemove",
    event => {

        if (
            !dragging
        ) {

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

            dragMoved =
                true;
        }


        if (
            dragMoved
        ) {

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
                    "x" in camera
                ) {

                    camera.x =
                        Number(
                            camera.x ?? 0
                        ) +
                        dx;
                }


                if (
                    "y" in camera
                ) {

                    camera.y =
                        Number(
                            camera.y ?? 0
                        ) +
                        dy;
                }


                if (
                    "offsetX" in camera
                ) {

                    camera.offsetX =
                        Number(
                            camera.offsetX ?? 0
                        ) +
                        dx;
                }


                if (
                    "offsetY" in camera
                ) {

                    camera.offsetY =
                        Number(
                            camera.offsetY ?? 0
                        ) +
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


window.addEventListener(
    "mouseup",
    () => {

        dragging =
            false;
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
            Number(
                camera.zoom ?? 1
            );


        const factor =

            event.deltaY < 0

                ? 1.1

                : 0.9;


        camera.zoom =
            Math.max(

                0.35,

                Math.min(

                    3,

                    oldZoom *
                    factor
                )
            );


        render();
    },

    {
        passive: false
    }
);


// ============================================================
// 结束当前行动阶段
// ============================================================

function endCurrentPhase() {

    if (
        !turnSystem
    ) {

        return;
    }


    const oldPhase =
        currentPhase();


    clearSelection();


    /*
     * 优先使用 TurnSystem。
     */

    if (
        typeof turnSystem.endPhase ===
        "function"
    ) {

        try {

            turnSystem.endPhase();


            /*
             * 新行动方恢复 AP。
             */

            resetPhaseUnits(
                currentPhase()
            );


            updateTurnUI();


            render();


            console.log(
                oldPhase,
                "→",
                currentPhase()
            );


            return;

        }

        catch (error) {

            console.error(
                "TurnSystem.endPhase:",
                error
            );
        }
    }


    /*
     * ========================================================
     * 后备回合系统
     * ========================================================
     */


    if (
        oldPhase ===
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


    resetPhaseUnits(
        currentPhase()
    );


    updateTurnUI();


    render();
}


// ============================================================
// 结束行动按钮
// ============================================================

if (
    endPhaseButton
) {

    endPhaseButton.addEventListener(
        "click",
        event => {

            event.preventDefault();

            event.stopPropagation();


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

        /*
         * ESC
         */

        if (
            event.key ===
            "Escape"
        ) {

            clearSelection();

            render();

            return;
        }


        /*
         * E
         */

        if (
            event.key.toLowerCase() ===
            "e"
        ) {

            endCurrentPhase();
        }
    }
);


// ============================================================
// 场景单位提取
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


    const result =
        [];


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


    return result;
}


// ============================================================
// 场景读取
// ============================================================

async function loadScenario() {

    const paths = [

        "./data/scenarios/dubno_1941.json",

        "./data/dubno_1941.json",

        "./data/scenario.json",

        "./scenario.json"
    ];


    for (
        const path of paths
    ) {

        try {

            const response =
                await fetch(
                    path
                );


            if (
                !response.ok
            ) {

                continue;
            }


            const data =
                await response.json();


            console.log(
                "场景读取成功：",
                path
            );


            return data;

        }

        catch (error) {

            /*
             * 尝试下一个文件。
             */
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
            id:
                "GER_ARM_01",

            nameZh:
                "德军第1装甲团",

            typeZh:
                "装甲",

            side:
                "german",

            faction:
                "GER",

            q: 14,
            r: 12,

            actionPoints: 8,
            maxActionPoints: 8,

            movementPoints: 8,
            maxMovementPoints: 8,

            strength: 120,
            maxStrength: 120,

            attack: 10,
            defense: 8,
            range: 1,

            morale: 90,
            suppression: 0,
            fatigue: 0,
            ammunition: 100
        },


        {
            id:
                "GER_INF_01",

            nameZh:
                "德军第1步兵团",

            typeZh:
                "步兵",

            side:
                "german",

            faction:
                "GER",

            q: 11,
            r: 14,

            actionPoints: 6,
            maxActionPoints: 6,

            movementPoints: 6,
            maxMovementPoints: 6,

            strength: 160,
            maxStrength: 160,

            attack: 6,
            defense: 6,
            range: 1,

            morale: 80,
            suppression: 0,
            fatigue: 0,
            ammunition: 100
        },


        {
            id:
                "SOV_ARM_01",

            nameZh:
                "苏军第1坦克团",

            typeZh:
                "装甲",

            side:
                "soviet",

            faction:
                "USSR",

            q: 30,
            r: 15,

            actionPoints: 8,
            maxActionPoints: 8,

            movementPoints: 8,
            maxMovementPoints: 8,

            strength: 120,
            maxStrength: 120,

            attack: 9,
            defense: 7,
            range: 1,

            morale: 80,
            suppression: 0,
            fatigue: 0,
            ammunition: 100
        },


        {
            id:
                "SOV_INF_01",

            nameZh:
                "苏军第1步兵团",

            typeZh:
                "步兵",

            side:
                "soviet",

            faction:
                "USSR",

            q: 27,
            r: 15,

            actionPoints: 6,
            maxActionPoints: 6,

            movementPoints: 6,
            maxMovementPoints: 6,

            strength: 160,
            maxStrength: 160,

            attack: 5,
            defense: 5,
            range: 1,

            morale: 80,
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


    renderer.selection =
        selection;


    renderer.movementSystem =
        movementSystem;


    selection.units =
        units;


    gameState.units =
        units;


    console.log(
        "单位数量：",
        units.length
    );
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

        camera.zoom =
            1;
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
        "=========================="
    );


    console.log(
        "东线 1941 V0.7"
    );


    console.log(
        "当前行动方：",
        phaseName()
    );


    console.log(
        "单位数量：",
        units.length
    );


    console.log(
        "=========================="
    );
}


// ============================================================
// 初始化游戏
// ============================================================

async function initializeGame() {

    console.log(
        "正在初始化《东线 1941：杜布诺》 V0.7"
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
     * 保留阵营选择界面。
     *
     * 但阵营选择现在只代表开局身份，
     * 不再锁定另一方单位。
     *
     * 因此进入苏军行动阶段后，
     * 苏军可以正常操作。
     */

    if (
        factionSelection &&
        typeof factionSelection.show ===
        "function"
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


    getPhase() {

        return currentPhase();
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

            selectUnit(
                unit
            );
        }


        return (
            unit ??
            null
        );
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

            return false;
        }


        return attackUnit(
            attacker,
            defender
        );
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


            if (
                unitInfo
            ) {

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
    "main.js V0.7 已加载"
);
