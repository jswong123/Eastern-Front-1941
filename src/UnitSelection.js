// ============================================================
// UnitSelection.js
//
// 单位选择与右侧作战信息面板
// V0.4A
// ============================================================


export class UnitSelection {

    constructor(
        renderer,
        gameState
    ) {

        this.renderer =
            renderer;


        this.gameState =
            gameState;


        this.selectedUnit =
            null;


        this.infoPanel =
            document.getElementById(
                "info-panel"
            );


        /*
         * 兼容可能使用的其他 ID
         */

        if (!this.infoPanel) {

            this.infoPanel =
                document.getElementById(
                    "unit-info"
                );

        }


        this.renderer.selection =
            this;

    }


    // ========================================================
    // 查找鼠标点击位置的单位
    // ========================================================

    findUnitAt(
        mouseX,
        mouseY,
        units
    ) {

        /*
         * 倒序检查。
         *
         * 如果未来同一 Hex 有多个单位，
         * 优先选择最后绘制的单位。
         */

        for (
            let i =
                units.length - 1;
            i >= 0;
            i--
        ) {

            const unit =
                units[i];


            const p =
                this.renderer
                    .worldToScreen(
                        unit.q,
                        unit.r
                    );


            const width =
                50 *
                this.renderer.camera.zoom;


            const height =
                40 *
                this.renderer.camera.zoom;


            if (
                mouseX >=
                    p.x - width / 2 &&

                mouseX <=
                    p.x + width / 2 &&

                mouseY >=
                    p.y - height / 2 &&

                mouseY <=
                    p.y + height / 2
            ) {

                return unit;

            }

        }


        return null;

    }


    // ========================================================
    // 选择单位
    // ========================================================

    select(
        unit
    ) {

        this.selectedUnit =
            unit;


        if (!unit) {

            this.showDefault();

            return;

        }


        this.showUnit(
            unit
        );

    }


    // ========================================================
    // 默认面板
    // ========================================================

    showDefault() {

        if (!this.infoPanel) {
            return;
        }


        this.infoPanel.innerHTML = `

            <h2>
                作战信息
            </h2>

            <p class="hint">
                点击地图上的单位查看详情
            </p>

            <hr>

            <h3>
                地图操作
            </h3>

            <p>
                鼠标拖动：移动地图
            </p>

            <p>
                滚轮：缩放
            </p>

            <p>
                点击单位：选择
            </p>

            <hr>

            <h3>
                图例
            </h3>

            <p>
                德军：蓝灰色
            </p>

            <p>
                苏军：红色
            </p>

        `;

    }


    // ========================================================
    // 是否己方单位
    // ========================================================

    isFriendly(
        unit
    ) {

        if (
            !this.gameState
        ) {

            return true;

        }


        if (
            typeof this.gameState
                .isPlayerUnit ===
            "function"
        ) {

            return this.gameState
                .isPlayerUnit(
                    unit
                );

        }


        return true;

    }


    // ========================================================
    // 是否观察员
    // ========================================================

    isObserver() {

        return (
            this.gameState &&
            typeof this.gameState
                .isObserver ===
                "function" &&
            this.gameState
                .isObserver()
        );

    }


    // ========================================================
    // 显示单位
    // ========================================================

    showUnit(
        unit
    ) {

        if (!this.infoPanel) {
            return;
        }


        const friendly =
            this.isFriendly(
                unit
            );


        const observer =
            this.isObserver();


        /*
         * 观察员可以查看双方完整信息。
         */

        if (
            !friendly &&
            !observer
        ) {

            this.showEnemyUnit(
                unit
            );

            return;

        }


        this.showFriendlyUnit(
            unit
        );

    }


    // ========================================================
    // 己方 / 观察员完整情报
    // ========================================================

    showFriendlyUnit(
        unit
    ) {

        const factionName =
            this.getFactionName(
                unit.faction
            );


        const typeName =
            this.getTypeName(
                unit.type
            );


        const levelName =
            this.getLevelName(
                unit.level ??
                unit.size
            );


        const division =
            unit.division ??
            unit.parent?.division ??
            "—";


        const regiment =
            unit.regiment ??
            unit.parent?.regiment ??
            "—";


        const battalion =
            unit.battalion ??
            unit.parent?.battalion ??
            "—";


        const personnel =
            unit.personnel ??
            unit.strength ??
            "—";


        const maximum =
            unit.maximum ??
            unit.maxPersonnel ??
            personnel;


        const morale =
            unit.morale ??
            80;


        const suppression =
            unit.suppression ??
            0;


        const fatigue =
            unit.fatigue ??
            0;


        const ammunition =
            unit.ammunition ??
            100;


        const fuel =
            unit.fuel ??
            "—";


        const currentMP =
            unit.movementPoints ??
            unit.maxMovementPoints ??
            "—";


        const maxMP =
            unit.maxMovementPoints ??
            unit.movement ??
            "—";


        this.infoPanel.innerHTML = `

            <h2>
                作战信息
            </h2>


            <h3>
                ${unit.name ?? "未命名单位"}
            </h3>


            <div class="unit-row">

                <span>
                    阵营
                </span>

                <strong>
                    ${factionName}
                </strong>

            </div>


            <div class="unit-row">

                <span>
                    兵种
                </span>

                <strong>
                    ${typeName}
                </strong>

            </div>


            <div class="unit-row">

                <span>
                    规模
                </span>

                <strong>
                    ${levelName}
                </strong>

            </div>


            <hr>


            <h3>
                编制
            </h3>


            <div class="unit-row">

                <span>
                    师
                </span>

                <strong>
                    ${division}
                </strong>

            </div>


            <div class="unit-row">

                <span>
                    团
                </span>

                <strong>
                    ${regiment}
                </strong>

            </div>


            <div class="unit-row">

                <span>
                    营
                </span>

                <strong>
                    ${battalion}
                </strong>

            </div>


            <div class="unit-row">

                <span>
                    单位
                </span>

                <strong>
                    ${unit.name ?? "—"}
                </strong>

            </div>


            <hr>


            <h3>
                战斗实力
            </h3>


            <div class="unit-row">

                <span>
                    人员
                </span>

                <strong>
                    ${personnel}
                    /
                    ${maximum}
                </strong>

            </div>


            <hr>


            <h3>
                行动
            </h3>


            <div class="unit-row">

                <span>
                    移动点
                </span>

                <strong>
                    ${currentMP}
                    /
                    ${maxMP}
                </strong>

            </div>


            <hr>


            <h3>
                状态
            </h3>


            <div class="unit-row">

                <span>
                    士气
                </span>

                <strong>
                    ${morale}
                </strong>

            </div>


            <div class="unit-row">

                <span>
                    压制
                </span>

                <strong>
                    ${suppression}
                </strong>

            </div>


            <div class="unit-row">

                <span>
                    疲劳
                </span>

                <strong>
                    ${fatigue}
                </strong>

            </div>


            <div class="unit-row">

                <span>
                    弹药
                </span>

                <strong>
                    ${ammunition}%
                </strong>

            </div>


            <div class="unit-row">

                <span>
                    燃油
                </span>

                <strong>
                    ${fuel}
                </strong>

            </div>


            <hr>


            <div class="unit-row">

                <span>
                    地图位置
                </span>

                <strong>
                    ${unit.q},
                    ${unit.r}
                </strong>

            </div>

        `;

    }


    // ========================================================
    // 敌军有限情报
    // ========================================================

    showEnemyUnit(
        unit
    ) {

        const factionName =
            this.getFactionName(
                unit.faction
            );


        const typeName =
            this.getTypeName(
                unit.type
            );


        const levelName =
            this.getLevelName(
                unit.level ??
                unit.size
            );


        this.infoPanel.innerHTML = `

            <h2>
                敌军情报
            </h2>


            <h3>
                敌军单位
            </h3>


            <div class="unit-row">

                <span>
                    阵营
                </span>

                <strong>
                    ${factionName}
                </strong>

            </div>


            <div class="unit-row">

                <span>
                    判断兵种
                </span>

                <strong>
                    ${typeName}
                </strong>

            </div>


            <div class="unit-row">

                <span>
                    估计规模
                </span>

                <strong>
                    ${levelName}
                </strong>

            </div>


            <hr>


            <h3>
                情报
            </h3>


            <div class="unit-row">

                <span>
                    番号
                </span>

                <strong>
                    未确认
                </strong>

            </div>


            <div class="unit-row">

                <span>
                    兵力
                </span>

                <strong>
                    未知
                </strong>

            </div>


            <div class="unit-row">

                <span>
                    装备
                </span>

                <strong>
                    未确认
                </strong>

            </div>


            <div class="unit-row">

                <span>
                    士气
                </span>

                <strong>
                    未知
                </strong>

            </div>


            <div class="unit-row">

                <span>
                    弹药
                </span>

                <strong>
                    未知
                </strong>

            </div>


            <hr>


            <div class="unit-row">

                <span>
                    情报可信度
                </span>

                <strong>
                    低
                </strong>

            </div>

        `;

    }


    // ========================================================
    // 阵营名称
    // ========================================================

    getFactionName(
        faction
    ) {

        const names = {

            GER:
                "德军",

            germany:
                "德军",

            German:
                "德军",

            USSR:
                "苏军",

            soviet:
                "苏军",

            Soviet:
                "苏军"

        };


        return (
            names[faction] ??
            faction ??
            "未知"
        );

    }


    // ========================================================
    // 兵种名称
    // ========================================================

    getTypeName(
        type
    ) {

        const names = {

            infantry:
                "步兵",

            motorized:
                "摩托化步兵",

            armor:
                "装甲兵",

            artillery:
                "炮兵",

            antitank:
                "反坦克兵",

            antiair:
                "防空兵",

            engineer:
                "工兵",

            reconnaissance:
                "侦察兵",

            cavalry:
                "骑兵",

            headquarters:
                "指挥部"

        };


        return (
            names[type] ??
            type ??
            "未知"
        );

    }


    // ========================================================
    // 单位规模
    // ========================================================

    getLevelName(
        level
    ) {

        const names = {

            squad:
                "班",

            platoon:
                "排",

            company:
                "连",

            battalion:
                "营",

            regiment:
                "团",

            brigade:
                "旅",

            division:
                "师",

            corps:
                "军"

        };


        return (
            names[level] ??
            level ??
            "—"
        );

    }

}
