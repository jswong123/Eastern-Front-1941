// ============================================================
// AISystem.js
// 东线 1941
// 基础战术 AI
// ============================================================

export class AISystem {

    constructor(
        movementSystem,
        combatSystem
    ) {

        this.movementSystem =
            movementSystem;

        this.combatSystem =
            combatSystem;

        this.thinkDelay =
            350;
    }


    // ========================================================
    // 等待
    // ========================================================

    sleep(ms) {

        return new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    ms
                )
        );
    }


    // ========================================================
    // 阵营
    // ========================================================

    getSide(unit) {

        return this.combatSystem
            .getSide(unit);
    }


    // ========================================================
    // 获取敌军
    // ========================================================

    getEnemies(unit, units) {

        return units.filter(
            target =>
                target !== unit &&
                this.combatSystem
                    .isEnemy(
                        unit,
                        target
                    ) &&
                this.combatSystem
                    .getStrength(target) > 0
        );
    }


    // ========================================================
    // 目标价值
    // ========================================================

    targetValue(unit) {

        const type =
            String(
                unit?.type ??
                unit?.typeZh ??
                unit?.unitType ??
                ""
            )
                .toLowerCase();

        if (
            type.includes("artillery") ||
            type.includes("炮")
        ) {
            return 12;
        }

        if (
            type.includes("tank") ||
            type.includes("armor") ||
            type.includes("装甲") ||
            type.includes("坦克")
        ) {
            return 10;
        }

        if (
            type.includes("anti") ||
            type.includes("反坦克")
        ) {
            return 9;
        }

        return 6;
    }


    // ========================================================
    // 目标评分
    // ========================================================

    scoreTarget(attacker, target) {

        const distance =
            this.combatSystem
                .hexDistance(
                    attacker,
                    target
                );

        const strength =
            this.combatSystem
                .getStrength(target);

        return (
            this.targetValue(target) * 10
            -
            distance * 4
            -
            strength * 0.02
        );
    }


    // ========================================================
    // 选择目标
    // ========================================================

    chooseTarget(unit, units) {

        const enemies =
            this.getEnemies(
                unit,
                units
            );

        if (
            enemies.length === 0
        ) {
            return null;
        }

        enemies.sort(
            (a, b) =>
                this.scoreTarget(unit, b)
                -
                this.scoreTarget(unit, a)
        );

        return enemies[0];
    }


    // ========================================================
    // 选择射程内目标
    // ========================================================

    chooseAttackTarget(unit, units) {

        const targets =
            this.getEnemies(
                unit,
                units
            )
                .filter(
                    target =>
                        this.combatSystem
                            .canAttack(
                                unit,
                                target
                            )
                );

        if (
            targets.length === 0
        ) {
            return null;
        }

        targets.sort(
            (a, b) =>
                this.scoreTarget(unit, b)
                -
                this.scoreTarget(unit, a)
        );

        return targets[0];
    }


    // ========================================================
    // 选择最佳移动格
    // ========================================================

    chooseMoveHex(unit, target) {

        const reachable =
            this.movementSystem
                .reachable;

        if (
            !(reachable instanceof Map) ||
            reachable.size === 0
        ) {
            return null;
        }

        let best = null;

        let bestDistance =
            this.combatSystem
                .hexDistance(
                    unit,
                    target
                );

        let bestCost =
            Infinity;

        for (
            const [key, cost]
            of reachable.entries()
        ) {

            const parts =
                String(key)
                    .split(",");

            if (
                parts.length !== 2
            ) {
                continue;
            }

            const q =
                Number(parts[0]);

            const r =
                Number(parts[1]);

            if (
                !Number.isFinite(q) ||
                !Number.isFinite(r)
            ) {
                continue;
            }

            /*
             * 不移动到敌人本身所在格。
             */
            if (
                q === Number(target.q) &&
                r === Number(target.r)
            ) {
                continue;
            }

            const distance =
                this.combatSystem
                    .hexDistance(
                        { q, r },
                        target
                    );

            const numericCost =
                Number(cost);

            /*
             * 第一优先：
             * 更接近目标。
             *
             * 第二优先：
             * 移动成本更低。
             */
            if (
                distance < bestDistance ||
                (
                    distance === bestDistance &&
                    numericCost < bestCost
                )
            ) {

                bestDistance =
                    distance;

                bestCost =
                    numericCost;

                best = {
                    q,
                    r,
                    cost:
                        numericCost
                };
            }
        }

        return best;
    }


    // ========================================================
    // 一个单位的行动
    // ========================================================

    async runUnit(
        unit,
        units,
        callbacks = {}
    ) {

        if (
            this.combatSystem
                .getStrength(unit) <= 0
        ) {
            return;
        }

        /*
         * ----------------------------------------
         * 1. 如果已经可以攻击，优先攻击
         * ----------------------------------------
         */

        let attackTarget =
            this.chooseAttackTarget(
                unit,
                units
            );

        if (attackTarget) {

            const result =
                this.combatSystem
                    .attack(
                        unit,
                        attackTarget
                    );

            if (
                result.success &&
                callbacks.onAttack
            ) {
                callbacks.onAttack(
                    result
                );
            }

            await this.sleep(
                this.thinkDelay
            );

            /*
             * 第一版：
             * 攻击一次后仍有 AP，
             * 可以再次攻击。
             */

            while (
                this.combatSystem
                    .getAP(unit) >=
                this.combatSystem
                    .attackAPCost
            ) {

                attackTarget =
                    this.chooseAttackTarget(
                        unit,
                        units
                    );

                if (!attackTarget) {
                    break;
                }

                const secondResult =
                    this.combatSystem
                        .attack(
                            unit,
                            attackTarget
                        );

                if (
                    !secondResult.success
                ) {
                    break;
                }

                if (
                    callbacks.onAttack
                ) {
                    callbacks.onAttack(
                        secondResult
                    );
                }

                await this.sleep(
                    this.thinkDelay
                );
            }

            return;
        }


        /*
         * ----------------------------------------
         * 2. 没有目标在射程内
         *    找一个主要目标
         * ----------------------------------------
         */

        const target =
            this.chooseTarget(
                unit,
                units
            );

        if (!target) {
            return;
        }


        /*
         * ----------------------------------------
         * 3. 计算移动范围
         * ----------------------------------------
         */

        this.movementSystem
            .selectUnit(
                unit,
                units
            );


        /*
         * ----------------------------------------
         * 4. 选择最佳移动格
         * ----------------------------------------
         */

        const destination =
            this.chooseMoveHex(
                unit,
                target
            );

        if (destination) {

            const oldQ =
                Number(unit.q);

            const oldR =
                Number(unit.r);

            const result =
                this.movementSystem
                    .moveTo(
                        destination.q,
                        destination.r
                    );

            if (
                result &&
                callbacks.onMove
            ) {

                callbacks.onMove({

                    unit,

                    oldQ,
                    oldR,

                    q:
                        Number(unit.q),

                    r:
                        Number(unit.r),

                    destination,

                    result
                });
            }

            await this.sleep(
                this.thinkDelay
            );
        }


        /*
         * ----------------------------------------
         * 5. 移动后重新检查攻击
         * ----------------------------------------
         */

        attackTarget =
            this.chooseAttackTarget(
                unit,
                units
            );

        if (attackTarget) {

            const result =
                this.combatSystem
                    .attack(
                        unit,
                        attackTarget
                    );

            if (
                result.success &&
                callbacks.onAttack
            ) {
                callbacks.onAttack(
                    result
                );
            }

            await this.sleep(
                this.thinkDelay
            );
        }
    }


    // ========================================================
    // AI 完整行动阶段
    // ========================================================

    async runTurn(
        aiSide,
        units,
        callbacks = {}
    ) {

        const aiUnits =
            units.filter(
                unit =>
                    this.getSide(unit) ===
                    aiSide &&
                    this.combatSystem
                        .getStrength(unit) > 0
            );

        for (
            const unit of aiUnits
        ) {

            if (
                callbacks.onUnitStart
            ) {
                callbacks.onUnitStart(
                    unit
                );
            }

            await this.runUnit(
                unit,
                units,
                callbacks
            );

            if (
                callbacks.onUnitEnd
            ) {
                callbacks.onUnitEnd(
                    unit
                );
            }
        }

        if (
            callbacks.onComplete
        ) {
            callbacks.onComplete();
        }
    }
}
