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

        this.world =
            world;


        this.pathfinding =
            new Pathfinding(
                world
            );


        this.selectedUnit =
            null;


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
    // 确保单位存在移动状态
    // ========================================

    initializeUnit(unit) {

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

    }


    // ========================================
    // 选择移动单位
    // ========================================

    selectUnit(
        unit,
        units
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

    moveTo(q, r) {

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


        const cost =
            this.getMoveCost(
                q,
                r
            );


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


        /*
         * V0.4A：
         * 暂时直接移动到终点。
         *
         * V0.4A.1 可以增加沿路径动画。
         */

        unit.q = q;

        unit.r = r;


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

            path

        };


        /*
         * 移动之后重新计算
         * 剩余移动范围。
         */

        this.selectUnit(
            unit,
            []
        );


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
    // 新回合恢复移动点
    // ========================================

    resetUnit(unit) {

        this.initializeUnit(
            unit
        );


        unit.movementPoints =
            unit.maxMovementPoints;

    }


    resetFaction(
        units,
        faction
    ) {

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
