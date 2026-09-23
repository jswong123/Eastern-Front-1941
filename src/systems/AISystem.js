// ========================================
// AISystem.js
// 敌方 AI
// ========================================

export class AISystem {

    constructor(
        movementSystem,
        combatSystem
    ) {

        this.movementSystem =
            movementSystem;

        this.combatSystem =
            combatSystem;

    }


    // ========================================
    // 六角距离
    // ========================================

    distance(a, b) {

        return (
            this.combatSystem
                .getDistance(
                    a,
                    b
                )
        );

    }


    // ========================================
    // 找最近敌军
    // ========================================

    findNearestEnemy(
        unit,
        units
    ) {

        const enemies =
            units.filter(
                other =>
                    other.faction !==
                        unit.faction &&
                    !other.destroyed &&
                    (other.strength ?? 1) > 0
            );


        if (
            enemies.length === 0
        ) {

            return null;

        }


        enemies.sort(

            (a, b) =>

                this.distance(
                    unit,
                    a
                ) -

                this.distance(
                    unit,
                    b
                )

        );


        return enemies[0];

    }


    // ========================================
    // 找最佳攻击目标
    // ========================================

    findAttackTarget(
        unit,
        units
    ) {

        const targets =
            this.combatSystem
                .getAttackableUnits(
                    unit,
                    units
                );


        if (
            targets.length === 0
        ) {

            return null;

        }


        // 优先攻击兵力最低的目标

        targets.sort(

            (a, b) =>

                (a.strength ?? 100) -
                (b.strength ?? 100)

        );


        return targets[0];

    }


    // ========================================
    // AI移动
    // ========================================

    moveTowardEnemy(
        unit,
        target,
        units
    ) {

        this.movementSystem
            .selectUnit(
                unit,
                units
            );


        const reachable =
            this.movementSystem
                .reachable;


        if (
            !reachable ||
            reachable.size === 0
        ) {

            return null;

        }


        let bestHex =
            null;

        let bestDistance =
            this.distance(
                unit,
                target
            );


        for (
            const [key, cost]
            of reachable
        ) {

            const parts =
                key.split(",");


            const q =
                Number(parts[0]);

            const r =
                Number(parts[1]);


            const fakePosition = {
                q,
                r
            };


            const distance =
                this.distance(
                    fakePosition,
                    target
                );


            if (
                distance <
                bestDistance
            ) {

                bestDistance =
                    distance;

                bestHex = {
                    q,
                    r,
                    cost
                };

            }

        }


        if (!bestHex) {

            return null;

        }


        return (
            this.movementSystem
                .moveTo(
                    bestHex.q,
                    bestHex.r,
                    units
                )
        );

    }


    // ========================================
    // 单个 AI 单位行动
    // ========================================

    actUnit(
        unit,
        units
    ) {

        if (
            !unit ||
            unit.destroyed ||
            (unit.strength ?? 1) <= 0
        ) {

            return null;

        }


        // ========================================
        // 1. 先检查能否直接攻击
        // ========================================

        let target =
            this.findAttackTarget(
                unit,
                units
            );


        if (target) {

            return {

                type: "attack",

                result:
                    this.combatSystem
                        .attack(
                            unit,
                            target
                        )

            };

        }


        // ========================================
        // 2. 没目标 → 找最近敌人
        // ========================================

        const nearest =
            this.findNearestEnemy(
                unit,
                units
            );


        if (!nearest) {

            return null;

        }


        // ========================================
        // 3. 向最近敌人移动
        // ========================================

        const movement =
            this.moveTowardEnemy(
                unit,
                nearest,
                units
            );


        // ========================================
        // 4. 移动后再次检查攻击
        // ========================================

        target =
            this.findAttackTarget(
                unit,
                units
            );


        if (target) {

            const combat =
                this.combatSystem
                    .attack(
                        unit,
                        target
                    );


            return {

                type:
                    "move-and-attack",

                movement,

                combat

            };

        }


        return {

            type: "move",

            movement

        };

    }


    // ========================================
    // 整个 AI 阵营行动
    // ========================================

    actFaction(
        faction,
        units
    ) {

        const results = [];


        const aiUnits =
            units.filter(
                unit =>
                    unit.faction ===
                        faction &&
                    !unit.destroyed &&
                    (unit.strength ?? 1) > 0
            );


        for (
            const unit
            of aiUnits
        ) {

            const result =
                this.actUnit(
                    unit,
                    units
                );


            if (result) {

                results.push(
                    result
                );

            }

        }


        return results;

    }

}
