// ========================================
// CombatSystem.js
// 战斗系统
//
// V1.1
//
// 新增：
// 1. 兵力影响攻击效能
// 2. 兵力影响防御效能
// 3. 士气影响战斗效能
// 4. 压制影响战斗效能
// 5. 疲劳影响攻击效能
// 6. 弹药影响攻击效能
// 7. 兵种克制
// 8. 攻击消耗弹药
// 9. 攻击增加疲劳
// 10. 被攻击增加压制
// 11. 兵力归零时标记 destroyed
// ========================================


export class CombatSystem {

    constructor(world) {

        this.world = world;

    }
// ========================================
// 初始化单位战斗状态
// ========================================

initializeUnit(unit) {

    if (!unit) {
        return;
    }

    if (unit.maxStrength === undefined) {

        unit.maxStrength =
            unit.strength ?? 100;

    }

    if (unit.strength === undefined) {

        unit.strength =
            unit.maxStrength;

    }

    if (unit.strength <= 0) {

        unit.strength = 0;
        unit.destroyed = true;

    }

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
            unit.range ??
            ranges[unit.type] ??
            1
        );

    }


    // ========================================
    // 基础攻击力
    // ========================================

    getAttack(unit) {

        if (!unit) {
            return 0;
        }


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
    // 基础防御力
    // ========================================

    getDefense(unit) {

        if (!unit) {
            return 0;
        }


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
    // 当前兵力比例
    //
    // 返回范围：
    //
    // 1.00 = 满编
    // 0.50 = 50%兵力
    // 0.00 = 无兵力
    // ========================================

    getStrengthRatio(unit) {

        if (!unit) {
            return 0;
        }


        const strength =
            Math.max(
                0,
                Number(
                    unit.strength ??
                    0
                )
            );


        const maxStrength =
            Math.max(
                1,
                Number(
                    unit.maxStrength ??
                    100
                )
            );


        return Math.max(
            0,
            Math.min(
                1,
                strength /
                maxStrength
            )
        );

    }


    // ========================================
    // 当前有效攻击力
    //
    // 基础攻击力不会改变。
    //
    // 实际攻击能力受到：
    //
    // 兵力
    // 士气
    // 压制
    // 疲劳
    // 弹药
    //
    // 的共同影响。
    // ========================================

    getEffectiveAttack(unit) {

        if (!unit) {
            return 0;
        }


        if (
            unit.destroyed === true ||
            Number(
                unit.strength ??
                0
            ) <= 0
        ) {

            return 0;

        }


        const baseAttack =
            this.getAttack(
                unit
            );


        // ------------------------------------
        // 兵力
        // ------------------------------------

        const strengthRatio =
            this.getStrengthRatio(
                unit
            );


        /*
         * 非线性下降。
         *
         * 满编：
         * 1 ^ 1.25 = 1
         *
         * 半数兵力：
         * 0.5 ^ 1.25 ≈ 0.42
         *
         * 20%兵力：
         * 0.2 ^ 1.25 ≈ 0.13
         */

        const strengthModifier =
            Math.pow(
                strengthRatio,
                1.25
            );


        // ------------------------------------
        // 士气
        // ------------------------------------

        const morale =
            Number(
                unit.morale ??
                100
            );


        const moraleModifier =
            Math.max(
                0.40,
                Math.min(
                    1,
                    morale /
                    100
                )
            );


        // ------------------------------------
        // 压制
        // ------------------------------------

        const suppression =
            Number(
                unit.suppression ??
                0
            );


        const suppressionModifier =
            Math.max(
                0.25,
                1 -
                suppression /
                120
            );


        // ------------------------------------
        // 疲劳
        // ------------------------------------

        const fatigue =
            Number(
                unit.fatigue ??
                0
            );


        const fatigueModifier =
            Math.max(
                0.40,
                1 -
                fatigue /
                150
            );


        // ------------------------------------
        // 弹药
        // ------------------------------------

        const ammo =
            Number(
                unit.ammo ??
                100
            );


        let ammoModifier =
            1;


        if (
            ammo <= 0
        ) {

            ammoModifier =
                0.20;

        }
        else if (
            ammo < 25
        ) {

            ammoModifier =
                0.60;

        }
        else if (
            ammo < 50
        ) {

            ammoModifier =
                0.80;

        }


        // ------------------------------------
        // 最终有效攻击力
        // ------------------------------------

        return (
            baseAttack *
            strengthModifier *
            moraleModifier *
            suppressionModifier *
            fatigueModifier *
            ammoModifier
        );

    }


    // ========================================
    // 当前有效防御力
    //
    // 防御能力也会随着兵力下降。
    //
    // 但是下降速度比攻击力慢，
    // 表示残余部队仍然能够利用
    // 阵地、掩体和地形进行防御。
    // ========================================

    getEffectiveDefense(unit) {

        if (!unit) {
            return 0;
        }


        if (
            unit.destroyed === true ||
            Number(
                unit.strength ??
                0
            ) <= 0
        ) {

            return 0;

        }


        const baseDefense =
            this.getDefense(
                unit
            );


        // ------------------------------------
        // 兵力
        // ------------------------------------

        const strengthRatio =
            this.getStrengthRatio(
                unit
            );


        const strengthModifier =
            Math.pow(
                strengthRatio,
                0.75
            );


        // ------------------------------------
        // 士气
        // ------------------------------------

        const morale =
            Number(
                unit.morale ??
                100
            );


        const moraleModifier =
            Math.max(
                0.50,
                Math.min(
                    1,
                    morale /
                    100
                )
            );


        // ------------------------------------
        // 压制
        // ------------------------------------

        const suppression =
            Number(
                unit.suppression ??
                0
            );


        const suppressionModifier =
            Math.max(
                0.35,
                1 -
                suppression /
                140
            );


        // ------------------------------------
        // 最终有效防御力
        // ------------------------------------

        return (
            baseDefense *
            strengthModifier *
            moraleModifier *
            suppressionModifier
        );

    }


    // ========================================
    // 兵种克制
    // ========================================

    getTypeModifier(
        attacker,
        defender
    ) {

        if (
            !attacker ||
            !defender
        ) {

            return 1;

        }


        const attackerType =
            attacker.type;


        const defenderType =
            defender.type;


        // ------------------------------------
        // 反坦克 VS 装甲
        // ------------------------------------

        if (
            attackerType ===
                "antitank" &&
            defenderType ===
                "armor"
        ) {

            return 1.60;

        }


        // ------------------------------------
        // 装甲 VS 步兵
        // ------------------------------------

        if (
            attackerType ===
                "armor" &&
            defenderType ===
                "infantry"
        ) {

            return 1.25;

        }


        // ------------------------------------
        // 步兵 VS 装甲
        // ------------------------------------

        if (
            attackerType ===
                "infantry" &&
            defenderType ===
                "armor"
        ) {

            return 0.65;

        }


        // ------------------------------------
        // 炮兵 VS 步兵
        // ------------------------------------

        if (
            attackerType ===
                "artillery" &&
            defenderType ===
                "infantry"
        ) {

            return 1.35;

        }


        // ------------------------------------
        // 侦察部队
        //
        // 不适合正面强攻。
        // ------------------------------------

        if (
            attackerType ===
            "reconnaissance"
        ) {

            return 0.80;

        }


        // ------------------------------------
        // 指挥部
        //
        // 正面战斗能力很低。
        // ------------------------------------

        if (
            attackerType ===
            "headquarters"
        ) {

            return 0.50;

        }


        return 1;

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
            Number(
                attacker.strength ??
                1
            ) <= 0 ||
            Number(
                defender.strength ??
                1
            ) <= 0
        ) {

            return false;

        }


        if (
            attacker.hasAttacked ===
            true
        ) {

            return false;

        }


        const distance =
            this.getDistance(
                attacker,
                defender
            );


        return (
            distance <=
            this.getRange(
                attacker
            )
        );

    }


    // ========================================
    // 找出可以攻击的单位
    // ========================================

    getAttackableUnits(
        attacker,
        units
    ) {

        if (
            !attacker ||
            !Array.isArray(units)
        ) {

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

        if (
            !attacker ||
            !defender
        ) {

            return 0;

        }


        // ------------------------------------
        // 当前有效攻击力
        // ------------------------------------

        const attack =
            this.getEffectiveAttack(
                attacker
            );


        // ------------------------------------
        // 当前有效防御力
        // ------------------------------------

        const defense =
            Math.max(
                0.5,
                this.getEffectiveDefense(
                    defender
                )
            );


        // ------------------------------------
        // 兵种克制
        // ------------------------------------

        const typeModifier =
            this.getTypeModifier(
                attacker,
                defender
            );


        // ------------------------------------
        // 攻防比
        // ------------------------------------

        const ratio =
            attack /
            defense;


        // ------------------------------------
        // 随机波动
        //
        // 85% ～ 115%
        // ------------------------------------

        const randomFactor =
            0.85 +
            Math.random() *
            0.30;


        /*
         * 保留原系统的基础伤害尺度。
         *
         * 原系统：
         *
         * 20 × 攻防比
         *
         * 现在增加：
         *
         * 有效战斗力
         * 兵种克制
         * 随机波动
         */

        let damage =
            20 *
            ratio *
            typeModifier *
            randomFactor;


        // ------------------------------------
        // 炮兵火力
        //
        // 对步兵的克制已经在
        // getTypeModifier() 中计算。
        //
        // 这里仅保留小幅炮兵总体火力修正。
        // ------------------------------------

        if (
            attacker.type ===
            "artillery"
        ) {

            damage *=
                1.05;

        }


        return Math.max(
            1,
            Math.round(
                damage
            )
        );

    }


    // ========================================
    // 执行攻击
    // ========================================

    attack(
    attacker,
    defender
) {

    this.initializeUnit(attacker);
    this.initializeUnit(defender);


    if (
        !this.canAttack(
            attacker,
            defender
        )
    ) {
            return {

                success: false,

                reason:
                    "目标不在攻击范围内、单位已攻击或目标无效"

            };

        }


        // ------------------------------------
        // 攻击前状态
        // ------------------------------------

        const beforeStrength =
            Number(
                defender.strength ??
                100
            );


        const attackerStrength =
            Number(
                attacker.strength ??
                100
            );


        const effectiveAttack =
            this.getEffectiveAttack(
                attacker
            );


        const effectiveDefense =
            this.getEffectiveDefense(
                defender
            );


        const typeModifier =
            this.getTypeModifier(
                attacker,
                defender
            );


        // ------------------------------------
        // 计算伤害
        // ------------------------------------

        const damage =
            this.calculateDamage(
                attacker,
                defender
            );


        // ------------------------------------
        // 扣除防御方兵力
        // ------------------------------------

        defender.strength =
            Math.max(
                0,
                beforeStrength -
                damage
            );


        // ------------------------------------
        // 本阶段已经攻击
        // ------------------------------------

        attacker.hasAttacked =
            true;


        // ====================================
        // 战斗状态变化
        // ====================================


        // ------------------------------------
        // 弹药消耗
        // ------------------------------------

        attacker.ammo =
            Math.max(
                0,
                Number(
                    attacker.ammo ??
                    100
                ) -
                10
            );


        // ------------------------------------
        // 攻击增加疲劳
        // ------------------------------------

        attacker.fatigue =
            Math.min(
                100,
                Number(
                    attacker.fatigue ??
                    0
                ) +
                5
            );


        // ------------------------------------
        // 防御方增加压制
        //
        // 伤亡越大，
        // 压制增长越明显。
        // ------------------------------------

        defender.suppression =
            Math.min(
                100,
                Number(
                    defender.suppression ??
                    0
                ) +
                damage *
                2
            );


        // ====================================
        // 阵亡判定
        // ====================================

        let destroyed =
            false;


        if (
            defender.strength <=
            0
        ) {

            defender.strength =
                0;


            defender.destroyed =
                true;


            defender.hasAttacked =
                true;


            destroyed =
                true;

        }


        // ====================================
        // 返回战斗结果
        // ====================================

        return {

            success: true,


            attacker,

            defender,


            // --------------------------------
            // 伤害
            // --------------------------------

            damage,


            // --------------------------------
            // 防御方兵力
            // --------------------------------

            beforeStrength,

            afterStrength:
                defender.strength,


            // --------------------------------
            // 攻击方兵力
            // --------------------------------

            attackerStrength,


            // --------------------------------
            // 当前战斗效能
            // --------------------------------

            effectiveAttack,

            effectiveDefense,


            // --------------------------------
            // 兵种修正
            // --------------------------------

            typeModifier,


            // --------------------------------
            // 战斗状态
            // --------------------------------

            ammo:
                attacker.ammo,

            fatigue:
                attacker.fatigue,

            suppression:
                defender.suppression,


            // --------------------------------
            // 是否消灭
            // --------------------------------

            destroyed,


            // --------------------------------
            // 攻击距离
            // --------------------------------

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


    // ========================================
    // 阵营攻击状态重置
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
