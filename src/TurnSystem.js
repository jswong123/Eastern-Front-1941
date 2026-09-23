// ============================================================
// TurnSystem.js
// 东线 1941 - 回合系统
//
// 一个完整回合：
// 德军行动阶段 -> 苏军行动阶段 -> 时间推进 2 小时 -> 下一回合
// ============================================================

export class TurnSystem {

    constructor(options = {}) {

        // ----------------------------------------------------
        // 战役时间
        // ----------------------------------------------------

        this.year = options.year ?? 1941;
        this.month = options.month ?? 6;
        this.day = options.day ?? 26;

        this.hour = options.hour ?? 8;
        this.minute = options.minute ?? 0;

        // 每个完整回合代表多少小时
        this.hoursPerTurn = options.hoursPerTurn ?? 2;


        // ----------------------------------------------------
        // 回合状态
        // ----------------------------------------------------

        this.turn = 1;

        // german -> soviet -> german...
        this.phase = options.startingPhase ?? "german";

        this.phaseOrder = [
            "german",
            "soviet"
        ];


        // ----------------------------------------------------
        // 单位
        // ----------------------------------------------------

        this.units = options.units ?? [];


        // ----------------------------------------------------
        // 行动点
        // ----------------------------------------------------

        this.defaultActionPoints = {
            infantry: 6,
            armor: 8,
            artillery: 5,
            reconnaissance: 9,
            headquarters: 5,
            default: 6
        };


        // ----------------------------------------------------
        // 回调
        // ----------------------------------------------------

        this.onPhaseChanged = null;
        this.onTurnChanged = null;
        this.onTimeChanged = null;


        // 初始化单位行动状态
        this.initializeUnits();
    }


    // ========================================================
    // 单位初始化
    // ========================================================

    initializeUnits() {

        for (const unit of this.units) {

            const maxAP = this.getUnitMaxAP(unit);

            unit.maxActionPoints = maxAP;

            if (
                unit.actionPoints === undefined ||
                unit.actionPoints === null
            ) {
                unit.actionPoints = maxAP;
            }

            unit.hasMoved = false;
            unit.hasAttacked = false;
        }
    }


    // ========================================================
    // 获取单位最大行动点
    // ========================================================

    getUnitMaxAP(unit) {

        // 如果 scenario.json 已经指定 AP，优先使用
        if (
            Number.isFinite(unit.maxActionPoints) &&
            unit.maxActionPoints > 0
        ) {
            return unit.maxActionPoints;
        }

        if (
            Number.isFinite(unit.maxAP) &&
            unit.maxAP > 0
        ) {
            return unit.maxAP;
        }

        const type = String(
            unit.type ??
            unit.unitType ??
            unit.branch ??
            ""
        ).toLowerCase();


        if (
            type.includes("tank") ||
            type.includes("armor") ||
            type.includes("panzer") ||
            type.includes("mechanized")
        ) {
            return this.defaultActionPoints.armor;
        }


        if (
            type.includes("artillery") ||
            type.includes("gun")
        ) {
            return this.defaultActionPoints.artillery;
        }


        if (
            type.includes("recon") ||
            type.includes("scout")
        ) {
            return this.defaultActionPoints.reconnaissance;
        }


        if (
            type.includes("hq") ||
            type.includes("headquarter")
        ) {
            return this.defaultActionPoints.headquarters;
        }


        if (
            type.includes("infantry") ||
            type.includes("rifle")
        ) {
            return this.defaultActionPoints.infantry;
        }


        return this.defaultActionPoints.default;
    }


    // ========================================================
    // 阵营标准化
    // ========================================================

    normalizeSide(side) {

        const value = String(side ?? "")
            .trim()
            .toLowerCase();


        if (
            value === "german" ||
            value === "germany" ||
            value === "axis" ||
            value === "德军"
        ) {
            return "german";
        }


        if (
            value === "soviet" ||
            value === "ussr" ||
            value === "redarmy" ||
            value === "红军" ||
            value === "苏军"
        ) {
            return "soviet";
        }


        return value;
    }


    // ========================================================
    // 判断单位是不是当前行动阵营
    // ========================================================

    isUnitActive(unit) {

        if (!unit) {
            return false;
        }

        const side = this.normalizeSide(
            unit.side ??
            unit.faction ??
            unit.camp
        );

        return side === this.phase;
    }


    // ========================================================
    // 判断单位是否还能行动
    // ========================================================

    canUnitAct(unit) {

        if (!this.isUnitActive(unit)) {
            return false;
        }

        return (unit.actionPoints ?? 0) > 0;
    }


    // ========================================================
    // 判断能否支付行动点
    // ========================================================

    canSpendAP(unit, cost) {

        if (!this.canUnitAct(unit)) {
            return false;
        }

        const required = Math.max(
            0,
            Number(cost) || 0
        );

        return (
            Number(unit.actionPoints) || 0
        ) >= required;
    }


    // ========================================================
    // 消耗行动点
    // ========================================================

    spendAP(unit, cost) {

        const required = Math.max(
            0,
            Number(cost) || 0
        );

        if (!this.canSpendAP(unit, required)) {
            return false;
        }

        unit.actionPoints = Math.max(
            0,
            unit.actionPoints - required
        );

        return true;
    }


    // ========================================================
    // 移动完成
    // ========================================================

    registerMove(unit, cost) {

        if (!this.spendAP(unit, cost)) {
            return false;
        }

        unit.hasMoved = true;

        return true;
    }


    // ========================================================
    // 攻击完成
    // ========================================================

    registerAttack(unit, cost = 2) {

        if (!this.spendAP(unit, cost)) {
            return false;
        }

        unit.hasAttacked = true;

        return true;
    }


    // ========================================================
    // 当前阶段名称
    // ========================================================

    getPhaseName() {

        switch (this.phase) {

            case "german":
                return "德军行动";

            case "soviet":
                return "苏军行动";

            default:
                return "未知阶段";
        }
    }


    // ========================================================
    // 当前回合
    // ========================================================

    getTurnNumber() {
        return this.turn;
    }


    // ========================================================
    // 当前日期
    // ========================================================

    getDateText() {

        return (
            `${this.year}年` +
            `${this.month}月` +
            `${this.day}日`
        );
    }


    // ========================================================
    // 当前时间
    // ========================================================

    getTimeText() {

        const hh = String(this.hour)
            .padStart(2, "0");

        const mm = String(this.minute)
            .padStart(2, "0");

        return `${hh}:${mm}`;
    }


    // ========================================================
    // 顶栏完整文字
    // ========================================================

    getHeaderText() {

        return (
            `${this.getDateText()} · ` +
            `${this.getTimeText()} ｜ ` +
            `第${this.turn}回合 ｜ ` +
            `${this.getPhaseName()}`
        );
    }


    // ========================================================
    // 当前回合时间范围
    // ========================================================

    getTurnTimeRange() {

        const start = this.getTimeText();

        let endHour =
            this.hour + this.hoursPerTurn;

        let endDay = this.day;

        while (endHour >= 24) {
            endHour -= 24;
            endDay += 1;
        }

        const end =
            `${String(endHour).padStart(2, "0")}:` +
            `${String(this.minute).padStart(2, "0")}`;

        if (endDay !== this.day) {
            return `${start}—次日${end}`;
        }

        return `${start}—${end}`;
    }


    // ========================================================
    // 结束当前行动阶段
    // ========================================================

    endPhase() {

        if (this.phase === "german") {

            // 德军 -> 苏军
            this.phase = "soviet";

            this.resetActionPointsForSide(
                "soviet"
            );

            this.emitPhaseChanged();

            return;
        }


        if (this.phase === "soviet") {

            // 苏军结束后，一个完整回合结束
            this.finishTurn();
        }
    }


    // ========================================================
    // 完成一个完整回合
    // ========================================================

    finishTurn() {

        this.advanceTime(
            this.hoursPerTurn
        );

        this.turn += 1;

        this.phase = "german";

        this.resetActionPointsForSide(
            "german"
        );


        if (
            typeof this.onTurnChanged ===
            "function"
        ) {
            this.onTurnChanged(this);
        }


        this.emitPhaseChanged();
    }


    // ========================================================
    // 推进时间
    // ========================================================

    advanceTime(hours) {

        this.hour += hours;

        while (this.hour >= 24) {

            this.hour -= 24;

            this.advanceDay();
        }


        if (
            typeof this.onTimeChanged ===
            "function"
        ) {
            this.onTimeChanged(this);
        }
    }


    // ========================================================
    // 日期推进
    // ========================================================

    advanceDay() {

        const daysInMonth =
            new Date(
                this.year,
                this.month,
                0
            ).getDate();

        this.day += 1;


        if (this.day > daysInMonth) {

            this.day = 1;

            this.month += 1;


            if (this.month > 12) {

                this.month = 1;

                this.year += 1;
            }
        }
    }


    // ========================================================
    // 重置指定阵营 AP
    // ========================================================

    resetActionPointsForSide(side) {

        const normalized =
            this.normalizeSide(side);


        for (const unit of this.units) {

            const unitSide =
                this.normalizeSide(
                    unit.side ??
                    unit.faction ??
                    unit.camp
                );


            if (unitSide !== normalized) {
                continue;
            }


            unit.maxActionPoints =
                this.getUnitMaxAP(unit);

            unit.actionPoints =
                unit.maxActionPoints;

            unit.hasMoved = false;
            unit.hasAttacked = false;
        }
    }


    // ========================================================
    // 替换单位列表
    // ========================================================

    setUnits(units) {

        this.units =
            Array.isArray(units)
                ? units
                : [];

        this.initializeUnits();
    }


    // ========================================================
    // 阶段改变事件
    // ========================================================

    emitPhaseChanged() {

        if (
            typeof this.onPhaseChanged ===
            "function"
        ) {
            this.onPhaseChanged(this);
        }
    }


    // ========================================================
    // 调试信息
    // ========================================================

    getState() {

        return {
            turn: this.turn,

            phase: this.phase,

            phaseName:
                this.getPhaseName(),

            date:
                this.getDateText(),

            time:
                this.getTimeText(),

            timeRange:
                this.getTurnTimeRange()
        };
    }
}
