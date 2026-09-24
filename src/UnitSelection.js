// ========================================
// UnitSelection.js
//
// 单位选择系统
// 东线 1941
//
// 功能：
// 1. 点击单位
// 2. 玩家单位选择
// 3. 敌军单位查看
// 4. 死亡单位过滤
// 5. 点击判定
// 6. 与 Renderer / GameState 兼容
// ========================================


export class UnitSelection {

    constructor(
        renderer,
        gameState
    ) {

        this.renderer =
            renderer;

        this.gameState =
            gameState;


        // ========================================
        // 当前选择单位
        // ========================================

        this.selectedUnit =
            null;


        // ========================================
        // 当前查看单位
        //
        // 玩家点击敌军时：
        // inspectedUnit = 敌军
        // selectedUnit = null
        // ========================================

        this.inspectedUnit =
            null;


        // ========================================
        // 点击判定尺寸
        //
        // 这是基础尺寸。
        // 实际判定还会考虑 camera.zoom。
        // ========================================

        this.hitWidth =
            50;

        this.hitHeight =
            40;

    }


    // ========================================
    // 判断单位是否仍然存活
    // ========================================

    isUnitAlive(unit) {

        if (!unit) {

            return false;

        }


        if (
            unit.destroyed === true
        ) {

            return false;

        }


        const strength =
            Number(
                unit.strength ??
                unit.maxStrength ??
                100
            );


        return (
            Number.isFinite(strength) &&
            strength > 0
        );

    }


    // ========================================
    // 获取当前玩家阵营
    // ========================================

    getPlayerFaction() {

        if (!this.gameState) {

            return null;

        }


        /*
         * 项目不同版本中曾使用过不同字段。
         * 这里全部兼容。
         */

        return (

            this.gameState.playerFaction ??

            this.gameState.controlledFaction ??

            this.gameState.faction ??

            null

        );

    }


    // ========================================
    // 判断是否为玩家单位
    // ========================================

    isPlayerUnit(unit) {

        if (!unit) {

            return false;

        }


        const playerFaction =
            this.getPlayerFaction();


        /*
         * 如果 GameState 尚未设置玩家阵营，
         * 不在 UnitSelection 层强行禁止选择。
         *
         * 这样可以避免初始化阶段所有单位
         * 都突然无法点击。
         */

        if (!playerFaction) {

            return true;

        }


        return (
            unit.faction ===
            playerFaction
        );

    }


    // ========================================
    // 获取 Camera
    // ========================================

    getCamera() {

        return (
            this.renderer?.camera ??
            null
        );

    }


    // ========================================
    // 获取 Hex 尺寸
    // ========================================

    getHexSize() {

        const renderer =
            this.renderer;


        if (!renderer) {

            return 32;

        }


        return (

            renderer.hexSize ??

            renderer.size ??

            renderer.world?.hexSize ??

            32

        );

    }


    // ========================================
    // 六角格 → 世界坐标
    //
    // 优先调用 Renderer 已有方法。
    // 如果 Renderer 没有，则使用 fallback。
    // ========================================

    getWorldPosition(unit) {

        if (!unit) {

            return null;

        }


        const renderer =
            this.renderer;


        // ========================================
        // Renderer API 1
        // ========================================

        if (
            renderer &&
            typeof renderer.hexToPixel ===
                "function"
        ) {

            const p =
                renderer.hexToPixel(
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


        // ========================================
        // Renderer API 2
        // ========================================

        if (
            renderer &&
            typeof renderer.getHexCenter ===
                "function"
        ) {

            const p =
                renderer.getHexCenter(
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


        // ========================================
        // Renderer API 3
        // ========================================

        if (
            renderer &&
            typeof renderer.hexCenter ===
                "function"
        ) {

            const p =
                renderer.hexCenter(
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


        // ========================================
        // Fallback
        //
        // Pointy-top axial hex
        // ========================================

        const size =
            this.getHexSize();


        const q =
            Number(unit.q);


        const r =
            Number(unit.r);


        if (
            !Number.isFinite(q) ||
            !Number.isFinite(r)
        ) {

            return null;

        }


        const x =
            size *
            Math.sqrt(3) *
            (
                q +
                r / 2
            );


        const y =
            size *
            1.5 *
            r;


        return {
            x,
            y
        };

    }


    // ========================================
    // 世界坐标 → 屏幕坐标
    // ========================================

    worldToScreen(
        worldX,
        worldY
    ) {

        const camera =
            this.getCamera();


        if (!camera) {

            return {

                x: worldX,

                y: worldY

            };

        }


        // ========================================
        // 优先使用 Camera 自己的方法
        // ========================================

        if (
            typeof camera.worldToScreen ===
                "function"
        ) {

            const p =
                camera.worldToScreen(
                    worldX,
                    worldY
                );


            if (
                p &&
                Number.isFinite(p.x) &&
                Number.isFinite(p.y)
            ) {

                return p;

            }

        }


        // ========================================
        // 通用 Camera fallback
        // ========================================

        const zoom =
            Number(
                camera.zoom ??
                1
            ) || 1;


        const cameraX =
            Number(
                camera.x ??
                camera.offsetX ??
                0
            ) || 0;


        const cameraY =
            Number(
                camera.y ??
                camera.offsetY ??
                0
            ) || 0;


        return {

            x:
                (
                    worldX -
                    cameraX
                ) *
                zoom,

            y:
                (
                    worldY -
                    cameraY
                ) *
                zoom

        };

    }


    // ========================================
    // 获取单位屏幕位置
    // ========================================

    getUnitScreenPosition(unit) {

        if (!unit) {

            return null;

        }


        const renderer =
            this.renderer;


        // ========================================
        // 如果 Renderer 已经提供完整转换，
        // 优先使用 Renderer。
        // ========================================

        if (
            renderer &&
            typeof renderer.getUnitScreenPosition ===
                "function"
        ) {

            const rendererPosition =
                renderer.getUnitScreenPosition(
                    unit
                );


            if (
                rendererPosition &&
                Number.isFinite(
                    rendererPosition.x
                ) &&
                Number.isFinite(
                    rendererPosition.y
                )
            ) {

                return rendererPosition;

            }

        }


        // ========================================
        // 否则自己计算
        // ========================================

        const worldPosition =
            this.getWorldPosition(
                unit
            );


        if (!worldPosition) {

            return null;

        }


        return this.worldToScreen(

            worldPosition.x,

            worldPosition.y

        );

    }


    // ========================================
    // 计算点击范围
    // ========================================

    getHitBox(unit) {

        const p =
            this.getUnitScreenPosition(
                unit
            );


        if (!p) {

            return null;

        }


        const camera =
            this.getCamera();


        const zoom =
            Math.max(
                0.1,
                Number(
                    camera?.zoom ??
                    1
                ) || 1
            );


        /*
         * 不让缩小时点击区域变得过小。
         *
         * 大地图缩小时仍然能够比较容易
         * 点击单位。
         */

        const width =
            Math.max(
                30,
                this.hitWidth *
                zoom
            );


        const height =
            Math.max(
                24,
                this.hitHeight *
                zoom
            );


        return {

            left:
                p.x -
                width / 2,

            right:
                p.x +
                width / 2,

            top:
                p.y -
                height / 2,

            bottom:
                p.y +
                height / 2,

            centerX:
                p.x,

            centerY:
                p.y,

            width,

            height

        };

    }


    // ========================================
    // 鼠标是否点击某个单位
    // ========================================

    hitTest(
        unit,
        mouseX,
        mouseY
    ) {

        if (
            !this.isUnitAlive(unit)
        ) {

            return false;

        }


        const box =
            this.getHitBox(
                unit
            );


        if (!box) {

            return false;

        }


        return (

            mouseX >=
                box.left &&

            mouseX <=
                box.right &&

            mouseY >=
                box.top &&

            mouseY <=
                box.bottom

        );

    }


    // ========================================
    // 根据鼠标位置寻找单位
    // ========================================

    findUnitAtScreenPosition(
        mouseX,
        mouseY,
        units = []
    ) {

        if (
            !Array.isArray(units)
        ) {

            return null;

        }


        /*
         * 从数组后面开始。
         *
         * Renderer 通常后绘制的单位
         * 位于视觉上层。
         */

        for (
            let i =
                units.length - 1;
            i >= 0;
            i--
        ) {

            const unit =
                units[i];


            // ========================================
            // 无效 / 死亡单位直接跳过
            // ========================================

            if (
                !this.isUnitAlive(unit)
            ) {

                continue;

            }


            // ========================================
            // 必须有地图坐标
            // ========================================

            const q =
                Number(unit.q);


            const r =
                Number(unit.r);


            if (
                !Number.isFinite(q) ||
                !Number.isFinite(r)
            ) {

                continue;

            }


            // ========================================
            // 点击检测
            // ========================================

            if (
                this.hitTest(
                    unit,
                    mouseX,
                    mouseY
                )
            ) {

                return unit;

            }

        }


        return null;

    }


    // ========================================
    // 兼容旧名称
    // ========================================

    findUnitAt(
        mouseX,
        mouseY,
        units = []
    ) {

        return this.findUnitAtScreenPosition(

            mouseX,

            mouseY,

            units

        );

    }


    // ========================================
    // 兼容旧名称
    // ========================================

    getUnitAtScreenPosition(
        mouseX,
        mouseY,
        units = []
    ) {

        return this.findUnitAtScreenPosition(

            mouseX,

            mouseY,

            units

        );

    }


    // ========================================
    // 选择玩家单位
    // ========================================

    selectUnit(unit) {

        if (
            !this.isUnitAlive(unit)
        ) {

            this.clearSelection();

            return null;

        }


        // ========================================
        // 敌方单位只能查看
        // ========================================

        if (
            !this.isPlayerUnit(unit)
        ) {

            this.selectedUnit =
                null;


            this.inspectedUnit =
                unit;


            return unit;

        }


        // ========================================
        // 玩家单位
        // ========================================

        this.selectedUnit =
            unit;


        this.inspectedUnit =
            unit;


        return unit;

    }


    // ========================================
    // 点击选择
    // ========================================

    selectAt(
        mouseX,
        mouseY,
        units = []
    ) {

        const unit =
            this.findUnitAtScreenPosition(

                mouseX,

                mouseY,

                units

            );


        if (!unit) {

            this.clearSelection();

            return null;

        }


        return this.selectUnit(
            unit
        );

    }


    // ========================================
    // 兼容旧版 select
    // ========================================

    select(
        mouseX,
        mouseY,
        units = []
    ) {

        return this.selectAt(

            mouseX,

            mouseY,

            units

        );

    }


    // ========================================
    // 设置选择单位
    // ========================================

    setSelectedUnit(unit) {

        return this.selectUnit(
            unit
        );

    }


    // ========================================
    // 获取当前玩家操作单位
    // ========================================

    getSelectedUnit() {

        if (
            !this.isUnitAlive(
                this.selectedUnit
            )
        ) {

            this.selectedUnit =
                null;

        }


        return this.selectedUnit;

    }


    // ========================================
    // 获取当前查看单位
    // ========================================

    getInspectedUnit() {

        if (
            !this.isUnitAlive(
                this.inspectedUnit
            )
        ) {

            this.inspectedUnit =
                null;

        }


        return this.inspectedUnit;

    }


    // ========================================
    // 是否存在选择
    // ========================================

    hasSelection() {

        return (
            this.getSelectedUnit() !==
            null
        );

    }


    // ========================================
    // 是否正在查看单位
    // ========================================

    hasInspectedUnit() {

        return (
            this.getInspectedUnit() !==
            null
        );

    }


    // ========================================
    // 清除选择
    // ========================================

    clearSelection() {

        this.selectedUnit =
            null;


        this.inspectedUnit =
            null;

    }


    // ========================================
    // 兼容旧名称
    // ========================================

    clear() {

        this.clearSelection();

    }


    // ========================================
    // 取消玩家操作选择
    //
    // 但可以继续保留查看目标。
    // ========================================

    clearSelectedUnit() {

        this.selectedUnit =
            null;

    }


    // ========================================
    // 清理已经死亡的选择目标
    //
    // 每次战斗后可以调用。
    // ========================================

    cleanupDeadSelection() {

        if (
            this.selectedUnit &&
            !this.isUnitAlive(
                this.selectedUnit
            )
        ) {

            this.selectedUnit =
                null;

        }


        if (
            this.inspectedUnit &&
            !this.isUnitAlive(
                this.inspectedUnit
            )
        ) {

            this.inspectedUnit =
                null;

        }

    }


    // ========================================
    // 从单位数组中删除死亡单位
    //
    // 注意：
    // 这个函数会直接修改 units 数组。
    //
    // 推荐战斗完成后调用：
    //
    // selection.removeDestroyedUnits(units);
    // ========================================

    removeDestroyedUnits(
        units = []
    ) {

        if (
            !Array.isArray(units)
        ) {

            return 0;

        }


        let removed =
            0;


        for (
            let i =
                units.length - 1;
            i >= 0;
            i--
        ) {

            const unit =
                units[i];


            if (
                !this.isUnitAlive(unit)
            ) {

                units.splice(
                    i,
                    1
                );


                removed++;

            }

        }


        this.cleanupDeadSelection();


        return removed;

    }


    // ========================================
    // 检查某个 Hex 是否存在单位
    //
    // 可供 main.js / MovementSystem 调试使用。
    // ========================================

    getUnitAtHex(
        q,
        r,
        units = []
    ) {

        if (
            !Array.isArray(units)
        ) {

            return null;

        }


        return (

            units.find(

                unit =>

                    this.isUnitAlive(
                        unit
                    ) &&

                    Number(unit.q) ===
                        Number(q) &&

                    Number(unit.r) ===
                        Number(r)

            ) ??

            null

        );

    }


    // ========================================
    // Hex 是否被占据
    // ========================================

    isHexOccupied(
        q,
        r,
        units = [],
        ignoredUnit = null
    ) {

        if (
            !Array.isArray(units)
        ) {

            return false;

        }


        return units.some(

            unit => {

                if (
                    !this.isUnitAlive(
                        unit
                    )
                ) {

                    return false;

                }


                if (
                    ignoredUnit &&
                    unit ===
                        ignoredUnit
                ) {

                    return false;

                }


                return (

                    Number(unit.q) ===
                        Number(q) &&

                    Number(unit.r) ===
                        Number(r)

                );

            }

        );

    }


    // ========================================
    // Debug
    // ========================================

    debugSelection() {

        console.log(
            "[UnitSelection]",
            {
                playerFaction:
                    this.getPlayerFaction(),

                selectedUnit:
                    this.selectedUnit?.id ??
                    null,

                inspectedUnit:
                    this.inspectedUnit?.id ??
                    null
            }
        );

    }

}
