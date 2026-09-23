export class GameState {

    constructor() {

        this.playerFaction = null;

        this.mode = null;

        this.date = "1941-06-26";
        this.hour = 8;
        this.minute = 0;

        this.turn = 1;
        this.turnMinutes = 15;

        this.factions = {

            GER: {
                id: "GER",
                name: "德军",
                fullName: "德国国防军",
                enemy: "USSR"
            },

            USSR: {
                id: "USSR",
                name: "苏军",
                fullName: "工农红军",
                enemy: "GER"
            }

        };

    }


    setPlayerFaction(faction) {

        if (
            faction !== "GER" &&
            faction !== "USSR"
        ) {
            throw new Error(
                `未知阵营：${faction}`
            );
        }

        this.playerFaction = faction;
        this.mode = "PLAYER";
    }


    setObserverMode() {

        this.playerFaction = null;
        this.mode = "OBSERVER";

    }


    isObserver() {

        return this.mode === "OBSERVER";

    }


    isPlayerUnit(unit) {

        if (this.isObserver()) {
            return true;
        }

        return (
            unit.faction === this.playerFaction ||
            this.convertLegacyFaction(unit.side) ===
                this.playerFaction
        );

    }


    isEnemyUnit(unit) {

        if (this.isObserver()) {
            return false;
        }

        return !this.isPlayerUnit(unit);

    }


    convertLegacyFaction(side) {

        if (side === "germany") {
            return "GER";
        }

        if (side === "soviet") {
            return "USSR";
        }

        return null;

    }


    getUnitFaction(unit) {

        if (unit.faction) {
            return unit.faction;
        }

        return this.convertLegacyFaction(
            unit.side
        );

    }


    getEnemyFaction() {

        if (!this.playerFaction) {
            return null;
        }

        return this.factions[
            this.playerFaction
        ].enemy;

    }


    nextTurn() {

        this.turn += 1;

        this.minute +=
            this.turnMinutes;

        while (this.minute >= 60) {

            this.minute -= 60;
            this.hour += 1;

        }

    }


    getTimeString() {

        return (
            String(this.hour)
                .padStart(2, "0")
            +
            ":"
            +
            String(this.minute)
                .padStart(2, "0")
        );

    }

}
