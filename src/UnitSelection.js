export class UnitSelection {

    constructor(
        renderer,
        infoElement,
        gameState
    ) {

        this.renderer = renderer;
        this.infoElement = infoElement;
        this.gameState = gameState;

        this.selectedUnit = null;
    }


    // ========================================
    // 点击检测
    // ========================================

    findUnitAt(
        mouseX,
        mouseY,
        units
    ) {

        /*
         * 从最后绘制的单位开始检测。
         * 如果单位发生重叠，
         * 优先选择最上层单位。
         */

        for (
            let i = units.length - 1;
            i >= 0;
            i--
        ) {

            const unit = units[i];

            const position =
                this.renderer.worldToScreen(
                    unit.q,
                    unit.r
                );


            const dx =
                mouseX - position.x;

            const dy =
                mouseY - position.y;


            const distance =
                Math.sqrt(
                    dx * dx +
                    dy * dy
                );


            /*
             * 点击判定范围。
             *
             * 不让点击范围随着缩放无限增大。
             */

            const radius =
                34 *
                Math.max(
                    0.75,
                    Math.min(
                        1.35,
                        this.renderer.camera.zoom
                    )
                );


            if (
                distance <= radius
            ) {

                return unit;

            }

        }


        return null;
    }


    // ========================================
    // 选择单位
    // ========================================

    select(unit) {

        this.selectedUnit = unit;


        if (!unit) {

            this.showEmpty();

            return;
        }


        /*
         * 观察员模式：
         * 双方资料全部可见。
         */

        if (
            this.gameState.isObserver()
        ) {

            this.showUnit(unit);

            return;
        }


        /*
         * 己方单位：
         * 完整资料。
         */

        if (
            this.gameState.isPlayerUnit(unit)
        ) {

            this.showUnit(unit);

            return;
        }


        /*
         * 敌方单位：
         * 暂时显示有限情报。
         *
         * V0.5 后由真正的
         * IntelligenceSystem 接管。
         */

        this.showEnemyUnit(unit);
    }


    // ========================================
    // 空白面板
    // ========================================

    showEmpty() {

        if (!this.infoElement) {
            return;
        }


        let factionText = "";


        if (
            this.gameState &&
            this.gameState.isObserver()
        ) {

            factionText = `
                <p style="
                    margin-top:10px;
                    opacity:0.65;
                ">
                    当前模式：观察员
                </p>
            `;

        }

        else if (
            this.gameState &&
            this.gameState.playerFaction
        ) {

            const faction =
                this.gameState.factions[
                    this.gameState.playerFaction
                ];


            factionText = `
                <p style="
                    margin-top:10px;
                    opacity:0.65;
                ">
                    当前阵营：
                    ${faction?.name ?? ""}
                </p>
            `;

        }


        this.infoElement.innerHTML = `

            <div>
                点击地图上的单位查看详情
            </div>

            ${factionText}

        `;
    }


    // ========================================
    // 阵营名称
    // ========================================

    getFactionName(unit) {

        const faction =
            unit.faction ??
            (
                unit.side === "germany"
                    ? "GER"
                    : unit.side === "soviet"
                        ? "USSR"
                        : null
            );


        if (
            faction === "GER"
        ) {

            return "德军";

        }


        if (
            faction === "USSR"
        ) {

            return "苏军";

        }


        return "未知";
    }


    // ========================================
    // 兵种名称
    // ========================================

    getTypeName(type) {

        const names = {

            infantry: "步兵",

            motorized: "摩托化步兵",

            armor: "装甲兵",

            artillery: "炮兵",

            antitank: "反坦克兵",

            antiair: "防空兵",

            engineer: "工兵",

            reconnaissance: "侦察兵",

            cavalry: "骑兵",

            headquarters: "指挥单位"

        };


        return (
            names[type] ??
            type ??
            "未知"
        );
    }


    // ========================================
    // 单位规模
    // ========================================

    getLevelName(level) {

        const names = {

            squad: "班",

            platoon: "排",

            company: "连",

            battalion: "营",

            regiment: "团",

            brigade: "旅",

            division: "师",

            corps: "军"

        };


        return (
            names[level] ??
            level ??
            "未知"
        );
    }


    // ========================================
    // 己方 / 观察员完整资料
    // ========================================

    showUnit(unit) {

        if (!this.infoElement) {
            return;
        }


        const faction =
            this.getFactionName(unit);


        const type =
            this.getTypeName(
                unit.type
            );


        const level =
            this.getLevelName(
                unit.level
            );


        let strengthHTML = "";


        /*
         * 车辆/火炮单位
         */

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

        }

        /*
         * 步兵单位
         */

        else {

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
                ${unit.name ??
                  unit.shortName ??
                  "未命名单位"}
            </div>


            <div class="unit-row">
                <span>阵营</span>
                <strong>
                    ${faction}
                </strong>
            </div>


            <div class="unit-row">
                <span>兵种</span>
                <strong>
                    ${type}
                </strong>
            </div>


            <div class="unit-row">
                <span>规模</span>
                <strong>
                    ${level}
                </strong>
            </div>


            <hr>


            <h3>
                编制
            </h3>


            <div class="unit-row">
                <span>军</span>
                <strong>
                    ${unit.corps ?? "—"}
                </strong>
            </div>


            <div class="unit-row">
                <span>师</span>
                <strong>
                    ${unit.division ?? "—"}
                </strong>
            </div>


            <div class="unit-row">
                <span>团</span>
                <strong>
                    ${
                        unit.regimentName ??
                        unit.regiment ??
                        "—"
                    }
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
                    ${
                        unit.shortName ??
                        unit.name ??
                        "—"
                    }
                </strong>
            </div>


            <hr>


            <h3>
                战斗实力
            </h3>


            ${strengthHTML}


            <hr>


            <h3>
                状态
            </h3>


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
                        unit.fuel !== undefined
                            ? `${unit.fuel}%`
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


    // ========================================
    // 敌军有限情报
    // ========================================

    showEnemyUnit(unit) {

        if (!this.infoElement) {
            return;
        }


        const faction =
            this.getFactionName(unit);


        const type =
            this.getTypeName(
                unit.type
            );


        const level =
            this.getLevelName(
                unit.level
            );


        this.infoElement.innerHTML = `

            <div class="unit-title">
                敌军单位
            </div>


            <div class="unit-row">
                <span>阵营</span>
                <strong>
                    ${faction}
                </strong>
            </div>


            <div class="unit-row">
                <span>判断兵种</span>
                <strong>
                    ${type}
                </strong>
            </div>


            <div class="unit-row">
                <span>估计规模</span>
                <strong>
                    ${level}
                </strong>
            </div>


            <hr>


            <h3>
                情报
            </h3>


            <div class="unit-row">
                <span>番号</span>
                <strong>
                    未确认
                </strong>
            </div>


            <div class="unit-row">
                <span>兵力</span>
                <strong>
                    未知
                </strong>
            </div>


            <div class="unit-row">
                <span>装备</span>
                <strong>
                    未确认
                </strong>
            </div>


            <div class="unit-row">
                <span>士气</span>
                <strong>
                    未知
                </strong>
            </div>


            <div class="unit-row">
                <span>弹药</span>
                <strong>
                    未知
                </strong>
            </div>


            <div class="unit-row">
                <span>燃油</span>
                <strong>
                    未知
                </strong>
            </div>


            <hr>


            <div class="unit-row">
                <span>情报可信度</span>
                <strong>
                    低
                </strong>
            </div>


            <div style="
                margin-top:18px;
                opacity:0.65;
                line-height:1.7;
            ">
                当前仅确认敌军的大致兵种与规模。
                后续需要通过侦察、战斗接触、
                无线电情报等方式进一步识别。
            </div>

        `;
    }
}
