// ========================================
// VictorySystem.js
// 胜负判定系统
// ========================================

export class VictorySystem {

    constructor() {

        this.gameOver = false;
        this.winner = null;
        this.reason = "";

    }


    // ========================================
    // 判断单位是否仍然存活
    // ========================================

    isAlive(unit) {

        if (!unit) {
            return false;
        }

        return (
            unit.destroyed !== true &&
            (unit.strength ?? 1) > 0
        );

    }


    // ========================================
    // 检查胜负
    // ========================================

    check(units) {

        if (this.gameOver) {

            return this.getResult();

        }


        const aliveUnits =
            units.filter(
                unit =>
                    this.isAlive(unit)
            );


        const germanUnits =
            aliveUnits.filter(
                unit =>
                    unit.faction === "GER"
            );


        const sovietUnits =
            aliveUnits.filter(
                unit =>
                    unit.faction === "SOV"
            );


        // ========================================
        // 德军全灭
        // ========================================

        if (
            germanUnits.length === 0
        ) {

            this.gameOver = true;

            this.winner = "SOV";

            this.reason =
                "德军作战单位已全部被消灭";

            return this.getResult();

        }


        // ========================================
        // 苏军全灭
        // ========================================

        if (
            sovietUnits.length === 0
        ) {

            this.gameOver = true;

            this.winner = "GER";

            this.reason =
                "苏军作战单位已全部被消灭";

            return this.getResult();

        }


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


    // ========================================
    // 返回当前结果
    // ========================================

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


    // ========================================
    // 重置
    // ========================================

    reset() {

        this.gameOver = false;

        this.winner = null;

        this.reason = "";

    }

}
