export const SQRT3 = Math.sqrt(3);


export function hexToPixel(q, r, size) {

    return {
        x: size * SQRT3 * (q + r / 2),
        y: size * 1.5 * r
    };

}


export function drawHexPath(ctx, x, y, size) {

    ctx.beginPath();

    for (let i = 0; i < 6; i++) {

        const angle =
            Math.PI / 180 *
            (60 * i - 30);

        const px =
            x + size * Math.cos(angle);

        const py =
            y + size * Math.sin(angle);


        if (i === 0) {

            ctx.moveTo(px, py);

        } else {

            ctx.lineTo(px, py);

        }

    }

    ctx.closePath();

}
