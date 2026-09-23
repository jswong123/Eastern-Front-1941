import { MapFeatures } from "./MapFeatures.js";

export class WorldMap {

    constructor() {

        this.width = 50;
        this.height = 36;

        this.specialTerrain = new Map();

        this.features = new MapFeatures();

        this.createTerrain();
        this.createFeatures();
    }

    key(q, r) {
        return `${q},${r}`;
    }

    terrainAt(q, r) {
        return this.specialTerrain.get(
            this.key(q, r)
        ) ?? "plain";
    }

    createTerrain() {

        // 西北森林
        for (let r = 7; r <= 11; r++) {
            for (let q = 7; q <= 15; q++) {

                if ((q + r) % 5 !== 0) {
                    this.specialTerrain.set(
                        this.key(q, r),
                        "forest"
                    );
                }
            }
        }

        // 中部森林
        for (let r = 17; r <= 22; r++) {
            for (let q = 19; q <= 25; q++) {

                if ((q * r) % 4 !== 0) {
                    this.specialTerrain.set(
                        this.key(q, r),
                        "forest"
                    );
                }
            }
        }

        // 东南湿地
        for (let r = 24; r <= 29; r++) {
            for (let q = 31; q <= 37; q++) {

                if ((q + r) % 3 === 0) {
                    this.specialTerrain.set(
                        this.key(q, r),
                        "marsh"
                    );
                }
            }
        }
    }

    createFeatures() {

        // -------------------------
        // 河流
        // -------------------------

        this.features.addRiver(
            "Ikva",
            [
                [27, 2],
                [27, 5],
                [28, 8],
                [27, 11],
                [28, 14],
                [29, 17],
                [29, 20],
                [30, 23],
                [31, 27],
                [31, 31]
            ],
            {
                width: 6
            }
        );

        this.features.addRiver(
            "Styr",
            [
                [12, 1],
                [13, 4],
                [14, 7],
                [14, 10],
                [15, 13],
                [16, 16]
            ],
            {
                width: 7
            }
        );

        // -------------------------
        // 城市
        // -------------------------

        this.features.addSettlement({
            id: "lutsk",
            name: "Lutsk",
            nameZh: "卢茨克",
            q: 13,
            r: 6,
            type: "city"
        });

        this.features.addSettlement({
            id: "dubno",
            name: "Dubno",
            nameZh: "杜布诺",
            q: 28,
            r: 16,
            type: "city"
        });

        this.features.addSettlement({
            id: "brody",
            name: "Brody",
            nameZh: "布罗迪",
            q: 22,
            r: 29,
            type: "town"
        });

        this.features.addSettlement({
            id: "rivne",
            name: "Rivne",
            nameZh: "里夫内",
            q: 41,
            r: 10,
            type: "city"
        });

        // -------------------------
        // 公路
        // -------------------------

        this.features.addRoad(
            "Lutsk-Dubno",
            [
                [13, 6],
                [16, 8],
                [19, 10],
                [22, 12],
                [25, 14],
                [28, 16]
            ]
        );

        this.features.addRoad(
            "Dubno-Rivne",
            [
                [28, 16],
                [31, 14],
                [34, 13],
                [37, 11],
                [41, 10]
            ]
        );

        this.features.addRoad(
            "Dubno-Brody",
            [
                [28, 16],
                [27, 20],
                [25, 23],
                [24, 26],
                [22, 29]
            ]
        );

        // -------------------------
        // 铁路
        // -------------------------

        this.features.addRailway(
            "Rivne-Dubno-Brody",
            [
                [41, 11],
                [37, 13],
                [33, 15],
                [28, 17],
                [26, 21],
                [24, 25],
                [22, 29]
            ]
        );
    }
}
