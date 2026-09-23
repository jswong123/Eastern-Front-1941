// ========================================
// Pathfinding.js
//
// 六角格寻路系统
// ========================================


export class Pathfinding {

    constructor(world) {

        this.world = world;

    }


    // ========================================
    // 六方向
    // ========================================

    getNeighbors(q, r) {

        return [

            { q: q + 1, r: r },

            { q: q - 1, r: r },

            { q: q, r: r + 1 },

            { q: q, r: r - 1 },

            { q: q + 1, r: r - 1 },

            { q: q - 1, r: r + 1 }

        ].filter(
            hex =>
                this.isInsideMap(
                    hex.q,
                    hex.r
                )
        );

    }


    // ========================================
    // 地图边界
    // ========================================

    isInsideMap(q, r) {

        return (
            q >= 0 &&
            r >= 0 &&
            q < this.world.width &&
            r < this.world.height
        );

    }


    // ========================================
    // Hex Key
    // ========================================

    key(q, r) {

        return `${q},${r}`;

    }


    // ========================================
    // 地形移动成本
    // ========================================

    terrainCost(unit, q, r) {

        const terrain =
            this.world.terrainAt(
                q,
                r
            );


        const motorized =
            (
                unit.type === "armor" ||
                unit.type === "motorized" ||
                unit.type === "reconnaissance"
            );


        switch (terrain) {

            case "forest":

                return motorized
                    ? 3
                    : 2;


            case "marsh":

                return motorized
                    ? 4
                    : 3;


            default:

                return 1;

        }

    }


    // ========================================
    // 查找所有可到达 Hex
    // ========================================

    getReachableHexes(
        unit,
        movementPoints,
        units = []
    ) {

        const startKey =
            this.key(
                unit.q,
                unit.r
            );


        const costs =
            new Map();


        const previous =
            new Map();


        costs.set(
            startKey,
            0
        );


        const queue = [

            {
                q: unit.q,
                r: unit.r,
                cost: 0
            }

        ];


        while (
            queue.length > 0
        ) {

            /*
             * 当前地图不大，
             * V0.4A 使用简单优先队列即可。
             *
             * 后面地图扩大后再升级。
             */

            queue.sort(
                (a, b) =>
                    a.cost -
                    b.cost
            );


            const current =
                queue.shift();


            const currentKey =
                this.key(
                    current.q,
                    current.r
                );


            if (
                current.cost >
                costs.get(currentKey)
            ) {

                continue;

            }


            const neighbors =
                this.getNeighbors(
                    current.q,
                    current.r
                );


            for (
                const neighbor
                of neighbors
            ) {

                /*
                 * 暂时允许穿过己方单位，
                 * 但不能停在已经过度拥挤的位置。
                 *
                 * 正式堆叠系统之后再处理。
                 */


                const moveCost =
                    this.terrainCost(
                        unit,
                        neighbor.q,
                        neighbor.r
                    );


                const newCost =
                    current.cost +
                    moveCost;


                if (
                    newCost >
                    movementPoints
                ) {

                    continue;

                }


                const neighborKey =
                    this.key(
                        neighbor.q,
                        neighbor.r
                    );


                if (
                    !costs.has(
                        neighborKey
                    ) ||
                    newCost <
                    costs.get(
                        neighborKey
                    )
                ) {

                    costs.set(
                        neighborKey,
                        newCost
                    );


                    previous.set(
                        neighborKey,
                        currentKey
                    );


                    queue.push({

                        q: neighbor.q,

                        r: neighbor.r,

                        cost: newCost

                    });

                }

            }

        }


        /*
         * 起点不算“可移动位置”。
         */

        costs.delete(
            startKey
        );


        return {

            costs,

            previous

        };

    }


    // ========================================
    // 重建移动路径
    // ========================================

    buildPath(
        unit,
        targetQ,
        targetR,
        previous
    ) {

        const startKey =
            this.key(
                unit.q,
                unit.r
            );


        let currentKey =
            this.key(
                targetQ,
                targetR
            );


        if (
            !previous.has(
                currentKey
            )
        ) {

            return [];

        }


        const path = [];


        while (
            currentKey !==
            startKey
        ) {

            const [
                q,
                r
            ] =
                currentKey
                    .split(",")
                    .map(Number);


            path.push({
                q,
                r
            });


            currentKey =
                previous.get(
                    currentKey
                );


            if (
                currentKey ===
                undefined
            ) {

                return [];

            }

        }


        path.reverse();


        return path;

    }

}
