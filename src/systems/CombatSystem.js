// ========================================

// CombatSystem.js

// 战斗系统

// ========================================

 

export class CombatSystem {

 

    constructor(world) {

 

        this.world = world;

 

    }

 

 

    // ========================================

    // 六角格距离

    // ========================================

 

    getDistance(a, b) {

 

        if (!a || !b) {

            return Infinity;

        }

 

 

        const dq =

            a.q - b.q;

 

        const dr =

            a.r - b.r;

 

 

        return Math.max(

 

            Math.abs(dq),

 

            Math.abs(dr),

 

            Math.abs(dq + dr)

 

        );

 

    }

 

 

    // ========================================

    // 单位射程

    // ========================================

 

    getRange(unit) {

 

        if (!unit) {

            return 0;

        }

 

 

        const ranges = {

 

            infantry: 1,

 

            motorized: 1,

 

            armor: 1,

 

            artillery: 3,

 

            antitank: 2,

 

            antiair: 2,

 

            engineer: 1,

 

            reconnaissance: 1,

 

            cavalry: 1,

 

            headquarters: 1

 

        };

 

 

        return (

            unit.maxRange ??

            unit.range ??

            ranges[unit.type] ??

            1

        );

 

    }

 

 

    // ========================================

    // 攻击力

    // ========================================

 

    getAttack(unit) {

 

        const values = {

 

            infantry: 6,

 

            motorized: 7,

 

            armor: 10,

 

            artillery: 8,

 

            antitank: 9,

 

            antiair: 4,

 

            engineer: 6,

 

            reconnaissance: 5,

 

            cavalry: 6,

 

            headquarters: 2

 

        };

 

 

        return (

            unit.attack ??

            values[unit.type] ??

            5

        );

 

    }

 

 

    // ========================================

    // 防御力

    // ========================================

 

    getDefense(unit) {

 

        const values = {

 

            infantry: 6,

 

            motorized: 6,

 

            armor: 9,

 

            artillery: 4,

 

            antitank: 5,

 

            antiair: 4,

 

            engineer: 7,

 

            reconnaissance: 4,

 

            cavalry: 5,

 

            headquarters: 3

 

        };

 

 

        return (

            unit.defense ??

            values[unit.type] ??

            5

        );

 

    }

 

 

    // ========================================

    // 是否为敌对阵营

    // ========================================

 

    areEnemies(a, b) {

 

        return (

            a &&

            b &&

            a.faction !==

            b.faction

        );

 

    }

 

 

    // ========================================

    // 是否能够攻击

    // ========================================

 

    canAttack(

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

            !this.areEnemies(

                attacker,

                defender

            )

        ) {

 

            return false;

 

        }

 

 

        if (

            attacker.destroyed ||

            defender.destroyed

        ) {

 

            return false;

 

        }

 

 

        if (

            (attacker.strength ?? 1) <= 0 ||

            (defender.strength ?? 1) <= 0

        ) {

 

            return false;

 

        }

 

 

        if (

            attacker.hasAttacked === true

        ) {

 

            return false;

 

        }

 

 

        const distance =

            this.getDistance(

                attacker,

                defender

            );

 

 

        const minRange = Math.max(1, Number(attacker.minRange ?? 1));

        const maxRange = Math.max(minRange, Number(attacker.maxRange ?? this.getRange(attacker)));

 

        return (

            distance >= minRange &&

            distance <= maxRange

        );

 

    }

 

 

    // ========================================

    // 找出可以攻击的单位

    // ========================================

 

    getAttackableUnits(

        attacker,

        units

    ) {

 

        if (!attacker) {

            return [];

        }

 

 

        return units.filter(

 

            unit =>

                this.canAttack(

                    attacker,

                    unit

                )

 

        );

 

    }

 

 

    // ========================================

    // 伤害计算

    // ========================================

 

    calculateDamage(

        attacker,

        defender

    ) {

 

        const attack =

            this.getAttack(

                attacker

            );

 

 

        const defense =

            Math.max(

                1,

                this.getDefense(

                    defender

                )

            );

 

 

        const attackerStrength =

            attacker.strength ??

            100;

 

 

        // 单位兵力越低，

        // 实际攻击能力越低

 

        const strengthFactor =

            Math.max(

                0.25,

                attackerStrength / 150

            );

 

 

        const ratio =

            attack /

            defense;

 

 

        const randomFactor =

            0.85 +

            Math.random() * 0.30;

 

 

        let damage =

            20 *

            ratio *

            strengthFactor *

            randomFactor;

 

 

        // 装甲攻击步兵略有优势

 

        if (

            attacker.type === "armor" &&

            defender.type === "infantry"

        ) {

 

            damage *= 1.20;

 

        }

 

 

        // 反坦克攻击装甲获得明显加成

 

        if (

            attacker.type === "antitank" &&

            defender.type === "armor"

        ) {

 

            damage *= 1.50;

 

        }

 

 

        // 炮兵间接火力

 

        if (

            attacker.type === "artillery"

        ) {

 

            damage *= 1.10;

 

        }

 

 

        return Math.max(

            1,

            Math.round(damage)

        );

 

    }

 

 

    // ========================================

    // 执行攻击

    // ========================================

 

    attack(

        attacker,

        defender

    ) {

 

        if (

            !this.canAttack(

                attacker,

                defender

            )

        ) {

 

            return {

 

                success: false,

 

                reason:

                    "目标不在攻击范围内或该单位已经攻击"

 

            };

 

        }

 

 

        const beforeStrength =

            defender.strength ??

            100;

 

 

        const damage =

            this.calculateDamage(

                attacker,

                defender

            );

 

 

        defender.strength =

            Math.max(

                0,

                beforeStrength -

                damage

            );

 

 

        attacker.hasAttacked =

            true;

 

 

        let destroyed =

            false;

 

 

        if (

            defender.strength <= 0

        ) {

 

            defender.destroyed =

                true;

 

            destroyed =

                true;

 

        }

 

 

        return {

 

            success: true,

 

            attacker,

 

            defender,

 

            damage,

 

            beforeStrength,

 

            afterStrength:

                defender.strength,

 

            destroyed,

 

            distance:

                this.getDistance(

                    attacker,

                    defender

                )

 

        };

 

    }

 

 

    // ========================================

    // 新行动阶段重置攻击状态

    // ========================================

 

    resetUnit(unit) {

 

        if (!unit) {

            return;

        }

 

 

        unit.hasAttacked =

            false;

 

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

