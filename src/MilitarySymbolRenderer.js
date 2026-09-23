export class MilitarySymbolRenderer {

    constructor(ctx) {

        this.ctx = ctx;

    }


    draw(unit, x, y, scale = 1) {

        const ctx = this.ctx;

        const width = 52 * scale;
        const height = 38 * scale;


        ctx.save();


        /*
         * 阵营底色
         */

        if (unit.side === "germany") {

            ctx.fillStyle = "#76899a";

        } else {

            ctx.fillStyle = "#a85b55";

        }


        ctx.strokeStyle = "#1c1c18";
        ctx.lineWidth = 2 * scale;


        ctx.fillRect(
            x - width / 2,
            y - height / 2,
            width,
            height
        );


        ctx.strokeRect(
            x - width / 2,
            y - height / 2,
            width,
            height
        );


        /*
         * 兵种符号
         */

        ctx.strokeStyle = "#111";
        ctx.fillStyle = "#111";

        ctx.lineWidth =
            2 * scale;


        if (unit.type === "infantry") {

            this.drawInfantry(
                x,
                y,
                width,
                height
            );

        }


        if (unit.type === "armor") {

            this.drawArmor(
                x,
                y,
                width,
                height
            );

        }


        if (unit.type === "artillery") {

            this.drawArtillery(
                x,
                y
            );

        }


        /*
         * 团级隶属标号
         */

        ctx.font =
            `${10 * scale}px FangSong, serif`;

        ctx.textAlign = "center";

        ctx.fillStyle = "#f2eddc";


        ctx.fillText(
            unit.regiment,
            x - width / 2 + 13 * scale,
            y - height / 2 - 5 * scale
        );


        /*
         * 单位等级
         */

        ctx.fillStyle = "#111";

        ctx.font =
            `${11 * scale}px serif`;


        ctx.fillText(
            unit.level === "company"
                ? "Ⅰ"
                : "•••",

            x,
            y - height / 2 - 5 * scale
        );


        /*
         * 单位名称
         */

        ctx.font =
            `${10 * scale}px FangSong, serif`;

        ctx.fillText(
            unit.shortName,
            x,
            y + height / 2 + 13 * scale
        );


        ctx.restore();

    }


    drawInfantry(
        x,
        y,
        width,
        height
    ) {

        const ctx =
            this.ctx;


        ctx.beginPath();

        ctx.moveTo(
            x - width * 0.32,
            y - height * 0.30
        );

        ctx.lineTo(
            x + width * 0.32,
            y + height * 0.30
        );


        ctx.moveTo(
            x + width * 0.32,
            y - height * 0.30
        );

        ctx.lineTo(
            x - width * 0.32,
            y + height * 0.30
        );

        ctx.stroke();

    }


    drawArmor(
        x,
        y,
        width,
        height
    ) {

        const ctx =
            this.ctx;


        ctx.beginPath();

        ctx.ellipse(
            x,
            y,
            width * 0.30,
            height * 0.22,
            0,
            0,
            Math.PI * 2
        );

        ctx.stroke();

    }


    drawArtillery(
        x,
        y
    ) {

        const ctx =
            this.ctx;


        ctx.beginPath();

        ctx.arc(
            x,
            y,
            5,
            0,
            Math.PI * 2
        );

        ctx.fill();

    }

}
