// ========================================
// MovementSystem.js
//
// 单位移动规则
// ========================================

import {
    Pathfinding
} from "./Pathfinding.js";


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


        const type =
            String(
                unit?.type ?? ""
            ).toLowerCase();


        return (
            unit?.movement ??
            values[type] ??
            4
        );

    }


    // ========================================
    // 确保单位存在移动状态
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
                this.getBaseMovement(
                    unit
                );

        }


        if (
            unit.movementPoints ===
            undefined
        ) {

            unit.movementPoints =
                unit.maxMovementPoints;

        }


        /*
         * 防止行动点异常超过最大值
         */

        unit.movementPoints =
            Math.min(
                unit.movementPoints,
                unit.maxMovementPoints
            );

    }


    // ========================================
    // 选择移动单位
    // ========================================

    selectUnit(
        unit,
        units = []
    ) {

        this.clear();


        if (!unit) {
            return;
        }


        this.initializeUnit(
            unit
        );


        this.selectedUnit =
            unit;


        /*
         * 已经没有行动点时，
         * 不再计算移动范围。
         */

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
            result?.costs ??
            new Map();


        this.previous =
            result?.previous ??
            new Map();

    }


    // ========================================
    // 是否可以移动到某格
    // ========================================

    canMoveTo(q, r) {

        return (
            this.reachable.has(
                `${q},${r}`
            )
        );

    }


    // ========================================
    // 移动成本
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

        if (
            !this.selectedUnit
        ) {

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


        this.initializeUnit(
            unit
        );


        const cost =
            this.getMoveCost(
                q,
                r
            );


        /*
         * 无法确定移动成本时
         * 不允许移动。
         */

        if (
            cost === null ||
            cost === undefined
        ) {

            return null;

        }


        /*
         * 防止行动点不足。
         */

        if (
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
            !path ||
            path.length === 0
        ) {

            return null;

        }


        const from = {

            q: unit.q,

            r: unit.r

        };


        // ========================================
        // 移动单位
        // ========================================

        unit.q = q;

        unit.r = r;


        // ========================================
        // 扣除行动点
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

            remainingMovementPoints:
                unit.movementPoints

        };


        // ========================================
        // 根据剩余行动点
        // 重新计算移动范围
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

            /*
             * 行动力耗尽后仍保留
             * selectedUnit，
             * 但清空移动范围。
             */

            this.reachable =
                new Map();

            this.previous =
                new Map();

            this.selectedUnit =
                unit;

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
    // 新行动阶段恢复单个单位行动点
    // ========================================

    resetUnit(unit) {

        if (!unit) {
            return;
        }


        this.initializeUnit(
            unit
        );


        unit.movementPoints =
            unit.maxMovementPoints;

    }


    // ========================================
    // 新行动阶段恢复整个阵营行动点
    // ========================================

    resetFaction(
        units,
        faction
    ) {

        if (
            !Array.isArray(units)
        ) {

            return;

        }


        for (
            const unit
            of units
        ) {

            if (
                unit.faction ===
                faction
            ) {

                this.resetUnit(
                    unit
                );

            }

        }

    }

}
