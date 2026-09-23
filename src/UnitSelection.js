export class UnitSelection {

    constructor(
        renderer,
        infoElement
    ) {

        this.renderer =
            renderer;

        this.infoElement =
            infoElement;

        this.selectedUnit =
            null;

    }


    findUnitAt(
        mouseX,
        mouseY,
        units
    ) {

        /*
         * 从最后绘制的单位开始检测。
         * 如果以后两个单位图标重叠，
         * 优先选择最上面的那个。
         */

        for (
            let i = units.length - 1;
            i >= 0;
            i--
        ) {

            const unit =
                units[i];

            const position =
                this.renderer.worldToScreen(
                    unit.q,
                    unit.r
                );


            const dx =
                mouseX -
                position.x;

            const dy =
                mouseY -
                position.y;


            const distance =
                Math.sqrt(
                    dx * dx +
                    dy * dy
                );


            const radius =
                32 *
                Math.max(
                    0.75,
                    this.renderer.camera.zoom
                );


            if (
                distance <= radius
            ) {

                return unit;

            }

        }


        return null;
    }


    select(unit) {

        this.selectedUnit =
            unit;


        if (!unit) {

            this.showEmpty();

            return;

        }


        this.showUnit(
            unit
        );

    }


    showEmpty() {

        this.infoElement.innerHTML = `
            点击地图上的单位查看详情
        `;

    }


    getFactionName(unit) {

        if (
            unit.faction === "GER" ||
            unit.side === "germany"
        ) {

            return "德军";

        }


        if (
            unit.faction === "USSR" ||
            unit.side === "soviet"
        ) {

            return "苏军";

        }


        return "未知";

    }


    getTypeName(type) {

        const names = {

            infantry: "步兵",

            armor: "装甲兵",

            artillery: "炮兵",

            antitank: "反坦克兵",

            engineer: "工兵",

            reconnaissance: "侦察兵",

            headquarters: "指挥单位"

        };


        return (
            names[type] ??
            type ??
            "未知"
        );

    }


    getLevelName(level) {

        const names = {

            platoon: "排",

            company: "连",

            battalion: "营"

        };


        return (
            names[level] ??
            level ??
            "未知"
        );

    }


    showUnit(unit) {

        const faction =
            this.getFactionName(
                unit
            );


        const type =
            this.getTypeName(
                unit.type
            );


        const level =
            this.getLevelName(
                unit.level
            );


        /*
         * 装甲/火炮单位显示装备数量；
         * 步兵显示实际人员。
         */

        let strengthHTML = "";


        if (
            unit.operational !== undefined
        ) {

            strengthHTML = `

                <div class="unit-row">
                    <span>主要装备</span>
                    <strong>
                        ${unit.equipment ?? "未知"}
                    </strong>
                </div>

                <div class="unit-row">
                    <span>可战斗</span>
                    <strong>
                        ${unit.operational}
                        /
                        ${unit.maximum ?? "?"}
                    </strong>
                </div>

                <div class="unit-row">
                    <span>受损</span>
                    <strong>
                        ${unit.damaged ?? 0}
                    </strong>
                </div>

                <div class="unit-row">
                    <span>被毁</span>
                    <strong>
                        ${unit.destroyed ?? 0}
                    </strong>
                </div>

            `;

        } else {

            strengthHTML = `

                <div class="unit-row">
                    <span>人员</span>
                    <strong>
                        ${unit.personnel ?? "?"}
                        /
                        ${unit.maximum ?? "?"}
                    </strong>
                </div>

            `;

        }


        this.infoElement.innerHTML = `

            <div class="unit-title">
                ${unit.name ?? unit.shortName ?? "未命名单位"}
            </div>


            <div class="unit-row">
                <span>阵营</span>
                <strong>${faction}</strong>
            </div>


            <div class="unit-row">
                <span>兵种</span>
                <strong>${type}</strong>
            </div>


            <div class="unit-row">
                <span>规模</span>
                <strong>${level}</strong>
            </div>


            <hr>


            <h3>编制</h3>


            <div class="unit-row">
                <span>师</span>
                <strong>
                    ${unit.division ?? "—"}
                </strong>
            </div>


            <div class="unit-row">
                <span>团</span>
                <strong>
                    ${unit.regimentName ??
                      unit.regiment ??
                      "—"}
                </strong>
            </div>


            <div class="unit-row">
                <span>营</span>
                <strong>
                    ${unit.battalion ?? "—"}
                </strong>
            </div>


            <div class="unit-row">
                <span>单位</span>
                <strong>
                    ${unit.shortName ?? "—"}
                </strong>
            </div>


            <hr>


            <h3>战斗实力</h3>

            ${strengthHTML}


            <hr>


            <h3>状态</h3>


            <div class="unit-row">
                <span>士气</span>
                <strong>
                    ${unit.morale ?? 80}
                </strong>
            </div>


            <div class="unit-row">
                <span>压制</span>
                <strong>
                    ${unit.suppression ?? 0}
                </strong>
            </div>


            <div class="unit-row">
                <span>疲劳</span>
                <strong>
                    ${unit.fatigue ?? 0}
                </strong>
            </div>


            <div class="unit-row">
                <span>弹药</span>
                <strong>
                    ${unit.ammunition ?? 100}%
                </strong>
            </div>


            <div class="unit-row">
                <span>燃油</span>
                <strong>
                    ${
                        unit.type === "armor"
                            ? `${unit.fuel ?? 100}%`
                            : "—"
                    }
                </strong>
            </div>


            <hr>


            <div class="unit-row">
                <span>地图位置</span>
                <strong>
                    ${unit.q}, ${unit.r}
                </strong>
            </div>

        `;

    }

}
