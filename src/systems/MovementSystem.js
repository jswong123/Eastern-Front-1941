// ========================================
// MovementSystem.js
// 单位移动系统
// ========================================

import { Pathfinding } from "./Pathfinding.js";


export class MovementSystem {

    constructor(world) {

        this.world = world;

        this.pathfinding =
            new Pathfinding(world);

        this.selectedUnit = null;

        this.reachable =
            new Map();

        this.previous =
            new Map();

    }


    // ========================================
    // 单位基础移动点
    // ========================================

    getBaseMovement(unit) {

        const values = {

            infantry: 4,

            motorized: 7,

            armor: 8,

            artillery: 4,

            antitank: 4,

            antiair: 4,

            engineer: 4,

            reconnaissance: 10,

            cavalry: 7,

            headquarters: 5

        };


        return (
            unit.movement ??
            values[unit.type] ??
            4
        );

    }


    // ========================================
    // 初始化单位移动状态
    // ========================================

    initializeUnit(unit) {

        if (!unit) {
            return;
        }


        if (
            unit.maxMovementPoints ===
            undefined
        ) {

            unit.maxMovementPoints =
                this.getBaseMovement(unit);

        }


        if (
            unit.movementPoints ===
            undefined
        ) {

            unit.movementPoints =
                unit.maxMovementPoints;

        }

    }


    // ========================================
    // 选择单位
    // ========================================

    selectUnit(
        unit,
        units = []
    ) {

        this.clear();


        if (
            !unit ||
            unit.destroyed ||
            (unit.strength ?? 1) <= 0
        ) {

            return;

        }


        this.initializeUnit(unit);


        this.selectedUnit =
            unit;


        if (
            unit.movementPoints <= 0
        ) {

            return;

        }


        const result =
            this.pathfinding
                .getReachableHexes(

                    unit,

                    unit.movementPoints,

                    units

                );


        this.reachable =
            result.costs;


        this.previous =
            result.previous;

    }


    // ========================================
    // 是否可以移动到目标格
    // ========================================

    canMoveTo(q, r) {

        if (!this.selectedUnit) {
            return false;
        }


        return this.reachable.has(
            `${q},${r}`
        );

    }


    // ========================================
    // 获取移动成本
    // ========================================

    getMoveCost(q, r) {

        return (
            this.reachable.get(
                `${q},${r}`
            ) ??
            null
        );

    }


    // ========================================
    // 执行移动
    // ========================================

    moveTo(
        q,
        r,
        units = []
    ) {

        if (!this.selectedUnit) {

            return null;

        }


        if (
            !this.canMoveTo(
                q,
                r
            )
        ) {

            return null;

        }


        const unit =
            this.selectedUnit;


        this.initializeUnit(unit);


        const cost =
            this.getMoveCost(
                q,
                r
            );


        if (
            cost === null ||
            cost >
            unit.movementPoints
        ) {

            return null;

        }


        const path =
            this.pathfinding
                .buildPath(

                    unit,

                    q,

                    r,

                    this.previous

                );


        if (
            path.length === 0
        ) {

            return null;

        }


        const from = {

            q: unit.q,

            r: unit.r

        };


        // ========================================
        // 修改单位位置
        // ========================================

        unit.q = q;

        unit.r = r;


        // ========================================
        // 扣除实际移动点
        // ========================================

        unit.movementPoints =
            Math.max(

                0,

                unit.movementPoints -
                cost

            );


        const result = {

            unit,

            from,

            to: {
                q,
                r
            },

            cost,

            path,

            remainingMovement:
                unit.movementPoints

        };


        // ========================================
        // 移动后重新计算剩余移动范围
        // ========================================

        if (
            unit.movementPoints > 0
        ) {

            this.selectUnit(
                unit,
                units
            );

        }

        else {

            this.clear();

        }


        return result;

    }


    // ========================================
    // 清除移动状态
    // ========================================

    clear() {

        this.selectedUnit =
            null;


        this.reachable =
            new Map();


        this.previous =
            new Map();

    }


    // ========================================
    // 新行动阶段恢复单位移动点
    // ========================================

    resetUnit(unit) {

        if (
            !unit ||
            unit.destroyed ||
            (unit.strength ?? 1) <= 0
        ) {

            return;

        }


        this.initializeUnit(unit);


        unit.movementPoints =
            unit.maxMovementPoints;

    }


    // ========================================
    // 恢复整个阵营移动点
    // ========================================

    resetFaction(
        units,
        faction
    ) {

        for (
            const unit
            of units
        ) {

            if (
                unit.faction === faction &&
                !unit.destroyed &&
                (unit.strength ?? 1) > 0
            ) {

                this.resetUnit(unit);

            }

        }

    }

}
