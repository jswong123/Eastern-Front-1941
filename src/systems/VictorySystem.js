// ============================================================
// VictorySystem.js
// 东线 1941 - 战役胜负判定系统
//
// 支持：
// 1. 消灭敌方全部有效作战单位
// 2. 消灭敌方全部指挥单位
// 3. 德军在规定时间内占领战略目标
// 4. 苏军坚持到规定时间并守住战略目标
//
// 阵营统一：
// german
// soviet
// ============================================================

export class VictorySystem {

    constructor(options = {}) {

        this.scenario =
            options.scenario ?? {};

        this.gameOver = false;

        this.winner = null;

        this.reason = "";

    }


    // ========================================================
    // 阵营标准化
    // ========================================================

    normalizeSide(side) {

        const value =
            String(side ?? "")
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
            value === "sov" ||
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


    // ========================================================
    // 获取单位阵营
    // ========================================================

    getUnitSide(unit) {

        return this.normalizeSide(

            unit?.faction ??
            unit?.side ??
            unit?.camp

        );

    }


    // ========================================================
    // 单位是否存活
    // ========================================================

    isAlive(unit) {

        if (!unit) {

            return false;

        }

        return (

            unit.destroyed !== true &&

            Number(
                unit.strength ?? 1
            ) > 0

        );

    }


    // ========================================================
    // 是否属于有效作战单位
    //
    // 注意：
    // 司令部不参与普通“全军覆没”判定。
    // 司令部拥有独立的胜利判定。
    // ========================================================

    isCombatUnit(unit) {

        if (
            !this.isAlive(unit)
        ) {

            return false;

        }

        const type =
            String(
                unit.type ?? ""
            )
                .trim()
                .toLowerCase();

        return (
            type !== "headquarters" &&
            type !== "hq"
        );

    }


    // ========================================================
    // 获取某阵营仍存活的作战单位
    // ========================================================

    getCombatUnits(
        units,
        faction
    ) {

        const side =
            this.normalizeSide(
                faction
            );

        return units.filter(

            unit =>

                this.isCombatUnit(unit) &&

                this.getUnitSide(unit) ===
                    side

        );

    }


    // ========================================================
    // 获取某阵营的全部指挥单位
    //
    // 注意：
    // 这里包括已经被摧毁的指挥单位。
    // 因为我们需要判断“是否全部被摧毁”。
    // ========================================================

    getHeadquartersUnits(
        units,
        faction
    ) {

        const side =
            this.normalizeSide(
                faction
            );

        return units.filter(unit => {

            const type =
                String(
                    unit?.type ?? ""
                )
                    .trim()
                    .toLowerCase();

            return (

                this.getUnitSide(unit) === side &&

                (
                    type === "headquarters" ||
                    type === "hq"
                )

            );

        });

    }


    // ========================================================
    // 判断某阵营所有指挥单位是否已经被消灭
    //
    // 保护逻辑：
    // 如果某阵营从一开始就没有任何HQ，
    // 不会因此自动判负。
    // ========================================================

    allHeadquartersDestroyed(
        units,
        faction
    ) {

        const headquarters =
            this.getHeadquartersUnits(
                units,
                faction
            );

        if (
            headquarters.length === 0
        ) {

            return false;

        }

        return headquarters.every(

            unit =>
                !this.isAlive(unit)

        );

    }


    // ========================================================
    // 获取某格上的存活单位
    // ========================================================

    getUnitAt(
        units,
        q,
        r
    ) {

        return units.find(

            unit =>

                this.isAlive(unit) &&

                Number(unit.q) ===
                    Number(q) &&

                Number(unit.r) ===
                    Number(r)

        ) ?? null;

    }


    // ========================================================
    // 判断某阵营是否控制一个目标
    //
    // 当前规则：
    // 该战略格上存在该阵营存活单位
    // 即视为控制。
    //
    // 因为目前实行“一格一单位”，
    // 所以不会产生双方同时控制的问题。
    // ========================================================

    controlsObjective(
        units,
        faction,
        objective
    ) {

        if (!objective) {

            return false;

        }

        const unit =
            this.getUnitAt(
                units,
                objective.q,
                objective.r
            );

        if (!unit) {

            return false;

        }

        return (

            this.getUnitSide(unit) ===
            this.normalizeSide(faction)

        );

    }


    // ========================================================
    // 获取目标控制状态
    // ========================================================

    getObjectiveStatus(
        units,
        objective
    ) {

        const unit =
            this.getUnitAt(
                units,
                objective.q,
                objective.r
            );

        if (!unit) {

            return {

                objective,

                controller: null,

                unit: null

            };

        }

        return {

            objective,

            controller:
                this.getUnitSide(unit),

            unit

        };

    }


    // ========================================================
    // 检查目标组
    //
    // mode:
    //
    // "all"
    // 所有目标都必须控制
    //
    // "any"
    // 任意一个目标被控制即可
    // ========================================================

    checkObjectiveGroup(
        units,
        faction,
        objectiveRule
    ) {

        if (
            !objectiveRule ||
            !Array.isArray(
                objectiveRule.objectives
            ) ||
            objectiveRule.objectives.length === 0
        ) {

            return false;

        }

        const objectives =
            objectiveRule.objectives;

        const results =
            objectives.map(

                objective =>

                    this.controlsObjective(
                        units,
                        faction,
                        objective
                    )

            );

        if (
            objectiveRule.mode ===
            "any"
        ) {

            return results.some(Boolean);

        }

        // 默认 all

        return results.every(Boolean);

    }


    // ========================================================
    // 是否已经到达截止回合
    //
    // deadlineTurn 来自 scenario.json
    //
    // 例如：
    //
    // "deadlineTurn": 92
    //
    // 表示第92回合结束以后进行最终判定。
    // ========================================================

    deadlineReached(
        turn,
        phase,
        victoryConditions
    ) {

        const deadlineTurn =
            Number(
                victoryConditions?.deadlineTurn
            );

        if (
            !Number.isFinite(
                deadlineTurn
            )
        ) {

            return false;

        }

        if (
            Number(turn) >
            deadlineTurn
        ) {

            return true;

        }

        /*
         * 一个完整回合：
         *
         * german
         * →
         * soviet
         * →
         * 下一回合
         *
         * 因此：
         *
         * deadlineTurn = 92
         *
         * 第92回合苏军阶段结束以后，
         * TurnSystem进入第93回合，
         * 此时进行最终截止判定。
         */

        return false;

    }


    // ========================================================
    // 设置胜利
    // ========================================================

    setVictory(
        winner,
        reason
    ) {

        this.gameOver = true;

        this.winner =
            this.normalizeSide(
                winner
            );

        this.reason =
            reason ?? "";

        return this.getResult();

    }


    // ========================================================
    // 主胜负判定
    // ========================================================

    check(
        units,
        {
            turn = 1,
            phase = "german"
        } = {}
    ) {

        if (
            this.gameOver
        ) {

            return this.getResult();

        }

        const victoryConditions =
            this.scenario
                ?.victoryConditions ??
            {};


        // ====================================================
        // 1. 获取双方有效作战单位
        // ====================================================

        const germanUnits =
            this.getCombatUnits(
                units,
                "german"
            );

        const sovietUnits =
            this.getCombatUnits(
                units,
                "soviet"
            );


        // ====================================================
        // 2. 德军全部有效作战单位被消灭
        // ====================================================

        if (
            germanUnits.length === 0
        ) {

            return this.setVictory(

                "soviet",

                "德军全部有效作战单位已被消灭"

            );

        }


        // ====================================================
        // 3. 苏军全部有效作战单位被消灭
        // ====================================================

        if (
            sovietUnits.length === 0
        ) {

            return this.setVictory(

                "german",

                "苏军全部有效作战单位已被消灭"

            );

        }


        // ====================================================
        // 4. 德军全部指挥单位被消灭
        //
        // 德军所有 headquarters / hq
        // 全部失去战斗能力时：
        // 苏军立即获胜。
        // ====================================================

        if (
            this.allHeadquartersDestroyed(
                units,
                "german"
            )
        ) {

            return this.setVictory(

                "soviet",

                "德军全部指挥单位已被消灭，苏军取得胜利"

            );

        }


        // ====================================================
        // 5. 苏军全部指挥单位被消灭
        //
        // 苏军所有 headquarters / hq
        // 全部失去战斗能力时：
        // 德军立即获胜。
        // ====================================================

        if (
            this.allHeadquartersDestroyed(
                units,
                "soviet"
            )
        ) {

            return this.setVictory(

                "german",

                "苏军全部指挥单位已被消灭，德军取得胜利"

            );

        }


        // ====================================================
        // 6. 德军战略目标
        // ====================================================

        const germanRule =
            victoryConditions.german ??
            {};

        const captureRule =
            germanRule.captureObjectives;


        /*
         * 德军只要在截止时间之前满足目标，
         * 就立即获胜。
         */

        if (
            captureRule &&
            this.checkObjectiveGroup(
                units,
                "german",
                captureRule
            )
        ) {

            return this.setVictory(

                "german",

                captureRule.successText ??
                "德军已占领指定战略目标"

            );

        }


        // ====================================================
        // 7. 截止时间
        // ====================================================

        const deadline =
            this.deadlineReached(
                turn,
                phase,
                victoryConditions
            );


        if (deadline) {

            // =================================================
            // 苏军防守目标
            // =================================================

            const sovietRule =
                victoryConditions.soviet ??
                {};

            const defendRule =
                sovietRule
                    .defendObjectivesUntilDeadline;


            /*
             * 到达截止时间，
             * 德军又没有提前完成占领目标，
             * 则检查苏军防守目标。
             */

            if (defendRule) {

                const defended =
                    this.checkObjectiveGroup(
                        units,
                        "soviet",
                        defendRule
                    );

                if (defended) {

                    return this.setVictory(

                        "soviet",

                        defendRule.successText ??
                        "苏军成功坚守战略目标至规定时间"

                    );

                }

            }


            /*
             * 如果设置了德军占领目标，
             * 但截止时间仍未满足，
             * 默认判苏军防御成功。
             */

            if (captureRule) {

                return this.setVictory(

                    "soviet",

                    victoryConditions
                        .deadlineFailureText ??
                    "德军未能在规定时间内完成战略目标，苏军防御成功"

                );

            }

        }


        // ====================================================
        // 8. 战斗继续
        // ====================================================

        return {

            gameOver: false,

            winner: null,

            reason: "",

            germanRemaining:
                germanUnits.length,

            sovietRemaining:
                sovietUnits.length

        };

    }


    // ========================================================
    // 返回结果
    // ========================================================

    getResult() {

        return {

            gameOver:
                this.gameOver,

            winner:
                this.winner,

            reason:
                this.reason

        };

    }


    // ========================================================
    // 重置
    // ========================================================

    reset() {

        this.gameOver = false;

        this.winner = null;

        this.reason = "";

    }

}
