// ============================================================
// CombatSystem.js
// 东线 1941
// 基础战斗系统
// ============================================================

export class CombatSystem {

    constructor() {

        // 一次攻击消耗的行动点
        this.attackAPCost = 2;
    }


    // ========================================================
    // 六角格距离
    // ========================================================

    hexDistance(a, b) {

        if (!a || !b) {
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


    // ========================================================
    // 阵营
    // ========================================================

    getSide(unit) {

        const value =
            String(
                unit?.side ??
                unit?.faction ??
                ""
            )
                .trim()
                .toLowerCase();

        if (
            value === "ger" ||
            value === "german" ||
            value === "germany" ||
            value === "axis"
        ) {
            return "german";
        }

        if (
            value === "ussr" ||
            value === "soviet" ||
            value === "redarmy" ||
            value === "red_army"
        ) {
            return "soviet";
        }

        return value;
    }


    // ========================================================
    // 是否敌对
    // ========================================================

    isEnemy(a, b) {

        if (!a || !b) {
            return false;
        }

        return (
            this.getSide(a) !==
            this.getSide(b)
        );
    }


    // ========================================================
    // 属性读取
    // ========================================================

    getAP(unit) {

        return Number(
            unit?.actionPoints ??
            unit?.ap ??
            unit?.movementPoints ??
            0
        );
    }


    setAP(unit, value) {

        const ap =
            Math.max(
                0,
                Number(value) || 0
            );

        unit.actionPoints = ap;
        unit.ap = ap;
        unit.movementPoints = ap;
    }


    getStrength(unit) {

        return Number(
            unit?.strength ??
            unit?.personnel ??
            unit?.men ??
            100
        );
    }


    getMaxStrength(unit) {

        return Number(
            unit?.maxStrength ??
            unit?.maxPersonnel ??
            unit?.maxMen ??
            this.getStrength(unit) ??
            100
        );
    }


    setStrength(unit, value) {

        const strength =
            Math.max(
                0,
                Math.round(
                    Number(value) || 0
                )
            );

        unit.strength =
            strength;

        if ("personnel" in unit) {
            unit.personnel = strength;
        }

        if ("men" in unit) {
            unit.men = strength;
        }
    }


    getAttack(unit) {

        return Number(
            unit?.attack ??
            unit?.attackPower ??
            6
        );
    }


    getDefense(unit) {

        return Number(
            unit?.defense ??
            unit?.defensePower ??
            5
        );
    }


    getRange(unit) {

        return Math.max(
            1,
            Number(
                unit?.range ??
                unit?.attackRange ??
                1
            )
        );
    }


    // ========================================================
    // 是否可以攻击
    // ========================================================

    canAttack(attacker, defender) {

        if (!attacker || !defender) {
            return false;
        }

        if (
            !this.isEnemy(
                attacker,
                defender
            )
        ) {
            return false;
        }

        if (
            this.getStrength(attacker) <= 0 ||
            this.getStrength(defender) <= 0
        ) {
            return false;
        }

        if (
            this.getAP(attacker) <
            this.attackAPCost
        ) {
            return false;
        }

        const distance =
            this.hexDistance(
                attacker,
                defender
            );

        return (
            distance <=
            this.getRange(attacker)
        );
    }


    // ========================================================
    // 计算伤害
    // ========================================================

    calculateDamage(attacker, defender) {

        const attack =
            this.getAttack(attacker);

        const defense =
            this.getDefense(defender);

        const strengthRatio =
            Math.max(
                0.20,
                this.getStrength(attacker) /
                Math.max(
                    1,
                    this.getMaxStrength(attacker)
                )
            );

        const moraleModifier =
            Math.max(
                0.50,
                Number(
                    attacker.morale ??
                    80
                ) / 100
            );

        const suppressionModifier =
            Math.max(
                0.40,
                1 -
                Number(
                    attacker.suppression ??
                    0
                ) / 150
            );

        let damage =
            (
                attack * 4 -
                defense * 1.5
            )
            *
            strengthRatio
            *
            moraleModifier
            *
            suppressionModifier;

        return Math.max(
            1,
            Math.round(damage)
        );
    }


    // ========================================================
    // 攻击
    // ========================================================

    attack(attacker, defender) {

        if (
            !this.canAttack(
                attacker,
                defender
            )
        ) {
            return {
                success: false,
                reason: "cannot_attack"
            };
        }

        const oldStrength =
            this.getStrength(defender);

        const damage =
            this.calculateDamage(
                attacker,
                defender
            );

        const newStrength =
            Math.max(
                0,
                oldStrength - damage
            );

        this.setStrength(
            defender,
            newStrength
        );

        this.setAP(
            attacker,
            this.getAP(attacker) -
            this.attackAPCost
        );

        attacker.ammunition =
            Math.max(
                0,
                Number(
                    attacker.ammunition ??
                    100
                ) - 5
            );

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

        return {

            success: true,

            attacker,

            defender,

            damage,

            oldStrength,

            newStrength,

            destroyed:
                newStrength <= 0,

            remainingAP:
                this.getAP(attacker)
        };
    }
}
