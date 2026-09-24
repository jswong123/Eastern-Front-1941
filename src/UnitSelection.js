// ============================================================
// UnitSelection.js
// 东线 1941
//
// 单位选择系统
// V0.6
//
// 功能：
// - 单位点击命中
// - 单位选择
// - 单位取消选择
// - 右侧单位信息
// - 兼容 Canvas DPR
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


        // ----------------------------------------------------
        // 信息面板
        // ----------------------------------------------------

        this.infoPanel =
            document.getElementById(
                "unitInfo"
            );


        if (!this.infoPanel) {

            this.infoPanel =
                document.getElementById(
                    "unit-info"
                );

        }


        if (!this.infoPanel) {

            this.infoPanel =
                document.getElementById(
                    "info-panel"
                );

        }


        // ----------------------------------------------------
        // 连接 Renderer
        // ----------------------------------------------------

        if (this.renderer) {

            this.renderer.selection =
                this;

        }

    }


    // ========================================================
    // 阵营标准化
    // ========================================================

    normalizeSide(side) {

        const value =
            String(
                side ?? ""
            )
                .trim()
                .toLowerCase();


        if (
            value === "ger" ||
            value === "german" ||
            value === "germany" ||
            value === "axis" ||
            value === "de" ||
            value === "德军"
        ) {

            return "german";

        }


        if (
            value === "ussr" ||
            value === "soviet" ||
            value === "redarmy" ||
            value === "red_army" ||
            value === "su" ||
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

        if (!unit) {

            return "";

        }


        return this.normalizeSide(

            unit.side ??
            unit.faction ??
            unit.camp ??
            unit.nation

        );

    }


    // ========================================================
    // 获取玩家阵营
    // ========================================================

    getPlayerSide() {

        if (!this.gameState) {

            return "";

        }


        return this.normalizeSide(

            this.gameState.playerFaction ??
            this.gameState.playerSide ??
            this.gameState.side ??
            this.gameState.faction

        );

    }


    // ========================================================
    // 是否观察员
    // ========================================================

    isObserver() {

        if (!this.gameState) {

            return false;

        }


        return (

            this.gameState.mode ===
                "observer"

            ||

            this.gameState.observerMode ===
                true

        );

    }


    // ========================================================
    // Hex -> 屏幕位置
    // ========================================================

    getUnitScreenPosition(unit) {

        if (
            !unit ||
            !this.renderer
        ) {

            return null;

        }


        // ----------------------------------------------------
        // Renderer 标准接口
        // ----------------------------------------------------

        if (
            typeof this.renderer
                .worldToScreen ===
            "function"
        ) {

            const p =
                this.renderer
                    .worldToScreen(
                        unit.q,
                        unit.r
                    );


            if (
                p &&
                Number.isFinite(p.x) &&
                Number.isFinite(p.y)
            ) {

                return p;

            }

        }


        // ----------------------------------------------------
        // 后备方案
        // ----------------------------------------------------

        if (
            typeof this.renderer
                .hexToWorld ===
            "function"
        ) {

            const world =
                this.renderer
                    .hexToWorld(
                        unit.q,
                        unit.r
                    );


            if (!world) {

                return null;

            }


            const camera =
                this.renderer.camera;


            const zoom =
                camera?.zoom ?? 1;


            const cameraX =
                camera?.x ?? 0;


            const cameraY =
                camera?.y ?? 0;


            return {

                x:
                    world.x *
                    zoom +
                    cameraX,

                y:
                    world.y *
                    zoom +
                    cameraY

            };

        }


        return null;

    }


    // ========================================================
    // 查找点击位置单位
    // ========================================================

    findUnitAt(
        mouseX,
        mouseY,
        units
    ) {

        if (
            !Array.isArray(units) ||
            !this.renderer
        ) {

            return null;

        }


        const canvas =
            this.renderer.canvas;


        if (!canvas) {

            return null;

        }


        const rect =
            canvas.getBoundingClientRect();


        // ----------------------------------------------------
        // Canvas 内部分辨率 / CSS 分辨率
        // ----------------------------------------------------
        //
        // 例如：
        //
        // CSS width = 1300
        // canvas.width = 2600
        //
        // scaleX = 2
        //
        // Renderer 的实际绘图坐标可能位于 Canvas 像素空间。
        // 鼠标事件却位于 CSS 像素空间。
        //
        // 因此同时支持两套坐标。
        // ----------------------------------------------------

        const scaleX =

            rect.width > 0

                ? canvas.width /
                    rect.width

                : 1;


        const scaleY =

            rect.height > 0

                ? canvas.height /
                    rect.height

                : 1;


        const mouseCanvasX =
            mouseX * scaleX;


        const mouseCanvasY =
            mouseY * scaleY;


        const zoom =
            this.renderer.camera?.zoom ??
            1;


        // ----------------------------------------------------
        // 点击区域
        // ----------------------------------------------------

        const baseWidth =
            56;


        const baseHeight =
            46;


        const width =
            Math.max(
                32,
                baseWidth * zoom
            );


        const height =
            Math.max(
                28,
                baseHeight * zoom
            );


        /*
         * 倒序查找。
         *
         * 后绘制单位优先。
         */

       for (
    let i =
        units.length - 1;
    i >= 0;
    i--
) {

    const unit =
        units[i];


    if (
        !unit ||
        unit.destroyed === true ||
        Number(unit.strength ?? 0) <= 0
    ) {

        continue;

    }


    const p =
        this.getUnitScreenPosition(
            unit
        );


    if (!p) {

        continue;

    }

    // 后面保持原代码


            const p =
                this.getUnitScreenPosition(
                    unit
                );


            if (!p) {

                continue;

            }


            // =================================================
            // 方法 A
            //
            // CSS 坐标直接检测
            // =================================================

            const hitCSS =

                mouseX >=
                    p.x - width / 2

                &&

                mouseX <=
                    p.x + width / 2

                &&

                mouseY >=
                    p.y - height / 2

                &&

                mouseY <=
                    p.y + height / 2;


            if (hitCSS) {

                return unit;

            }


            // =================================================
            // 方法 B
            //
            // DPR / Canvas 像素坐标检测
            // =================================================

            const canvasPX =
                p.x * scaleX;


            const canvasPY =
                p.y * scaleY;


            const canvasWidth =
                width * scaleX;


            const canvasHeight =
                height * scaleY;


            const hitCanvas =

                mouseCanvasX >=
                    canvasPX -
                    canvasWidth / 2

                &&

                mouseCanvasX <=
                    canvasPX +
                    canvasWidth / 2

                &&

                mouseCanvasY >=
                    canvasPY -
                    canvasHeight / 2

                &&

                mouseCanvasY <=
                    canvasPY +
                    canvasHeight / 2;


            if (hitCanvas) {

                return unit;

            }

        }


        return null;

    }


    // ========================================================
    // 选择单位
    // ========================================================

    select(unit) {

        this.selectedUnit =
            unit ?? null;


        if (!unit) {

            this.showDefault();

            return;

        }


        this.showUnit(
            unit
        );

    }


    // ========================================================
    // 清除选择
    // ========================================================

    clear() {

        this.selectedUnit =
            null;


        this.showDefault();

    }


    // ========================================================
    // 是否己方单位
    // ========================================================

    isFriendly(unit) {

        if (!unit) {

            return false;

        }


        if (
            this.isObserver()
        ) {

            return true;

        }


        if (
            this.gameState &&
            typeof this.gameState
                .isPlayerUnit ===
            "function"
        ) {

            try {

                return this.gameState
                    .isPlayerUnit(
                        unit
                    );

            }

            catch (error) {

                console.warn(
                    "GameState.isPlayerUnit() 调用失败：",
                    error
                );

            }

        }


        const playerSide =
            this.getPlayerSide();


        if (!playerSide) {

            return true;

        }


        return (

            this.getUnitSide(unit) ===
            playerSide

        );

    }


    // ========================================================
    // 默认面板
    // ========================================================

    showDefault() {

        if (!this.infoPanel) {

            return;

        }


        /*
         * 注意：
         *
         * 这里只修改 unitInfo。
         *
         * 不再覆盖整个 info-panel，
         * 否则会把回合按钮一起删除。
         */

        if (
            this.infoPanel.id ===
            "unitInfo"
        ) {

            this.infoPanel.innerHTML =
                "点击地图上的单位查看详情";

            return;

        }


        this.infoPanel.innerHTML = `

            <h3>
                单位信息
            </h3>

            <p class="hint">
                点击地图上的单位查看详情
            </p>

        `;

    }


    // ========================================================
    // 显示单位信息
    // ========================================================

    showUnit(unit) {

        if (
            !this.infoPanel ||
            !unit
        ) {

            return;

        }


        const side =
            this.getUnitSide(
                unit
            );


        const sideName =

            side === "german"

                ? "德军"

                : side === "soviet"

                    ? "苏军"

                    : "未知";


        const name =

            unit.nameZh ??
            unit.name ??
            unit.id ??
            "未命名单位";


        const type =

            unit.typeZh ??
            unit.type ??
            unit.unitType ??
            "未知";


        const ap =

            unit.actionPoints ??
            unit.ap ??
            "—";


        const maxAP =

            unit.maxActionPoints ??
            unit.maxAP ??
            "—";


        const friendly =
            this.isFriendly(
                unit
            );


        // ----------------------------------------------------
        // 敌军信息
        // ----------------------------------------------------

        if (!friendly) {

            this.infoPanel.innerHTML = `

                <div class="unit-title">
                    ${name}
                </div>

                <div class="unit-row">
                    <span>阵营</span>
                    <strong>
                        ${sideName}
                    </strong>
                </div>

                <div class="unit-row">
                    <span>兵种</span>
                    <strong>
                        ${type}
                    </strong>
                </div>

                <div class="unit-row">
                    <span>位置</span>
                    <strong>
                        ${unit.q},
                        ${unit.r}
                    </strong>
                </div>

                <div class="unit-row">
                    <span>情报</span>
                    <strong>
                        敌军单位
                    </strong>
                </div>

            `;


            return;

        }


        // ----------------------------------------------------
        // 己方完整信息
        // ----------------------------------------------------

        this.infoPanel.innerHTML = `

            <div class="unit-title">
                ${name}
            </div>


            <div class="unit-row">

                <span>
                    阵营
                </span>

                <strong>
                    ${sideName}
                </strong>

            </div>


            <div class="unit-row">

                <span>
                    兵种
                </span>

                <strong>
                    ${type}
                </strong>

            </div>


            <div class="unit-row">

                <span>
                    行动点
                </span>

                <strong>
                    ${ap} / ${maxAP}
                </strong>

            </div>


            <div class="unit-row">

                <span>
                    士气
                </span>

                <strong>
                    ${unit.morale ?? "—"}
                </strong>

            </div>


            <div class="unit-row">

                <span>
                    压制
                </span>

                <strong>
                    ${unit.suppression ?? "—"}
                </strong>

            </div>


            <div class="unit-row">

                <span>
                    疲劳
                </span>

                <strong>
                    ${unit.fatigue ?? "—"}
                </strong>

            </div>


            <div class="unit-row">

                <span>
                    弹药
                </span>

                <strong>
                    ${unit.ammunition ?? "—"}
                </strong>

            </div>


            <div class="unit-row">

                <span>
                    位置
                </span>

                <strong>
                    ${unit.q},
                    ${unit.r}
                </strong>

            </div>

        `;

    }

}
