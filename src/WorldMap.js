export class WorldMap {

    constructor() {

        this.width = 42;
        this.height = 30;


        /*
         * V0.1 是地图引擎测试地形。
         *
         * 后续这里会被真实的
         * Dubno / Brody / Lutsk
         * 地理数据替代。
         */

        this.specialTerrain = new Map();


        this.createTestTerrain();

    }


    key(q, r) {

        return `${q},${r}`;

    }


    createTestTerrain() {

        /*
         * 森林带
         */

        for (let q = 8; q < 18; q++) {

            this.specialTerrain.set(
                this.key(q, 8),
                "forest"
            );

            this.specialTerrain.set(
                this.key(q, 9),
                "forest"
            );

        }


        /*
         * 河流测试区
         */

        for (let r = 5; r < 26; r++) {

            this.specialTerrain.set(
                this.key(24, r),
                "river"
            );

        }


        /*
         * 城镇
         */

        this.specialTerrain.set(
            this.key(20, 14),
            "town"
        );


        this.specialTerrain.set(
            this.key(30, 10),
            "town"
        );


        this.specialTerrain.set(
            this.key(12, 20),
            "town"
        );

    }


    terrainAt(q, r) {

        return (
            this.specialTerrain.get(
                this.key(q, r)
            )
            ??
            "plain"
        );

    }

}
