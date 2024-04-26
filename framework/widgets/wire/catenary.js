import { WireBase } from "./base.js";
export class WireCatenary extends WireBase {
    drop;
    segments;
    tensionCoef;
    wireDisplay;
    wireDisplayPath;
    wireDisplayShadow;
    coefficients = { a: 0, b: 0, c: 0 };
    constructor({ width, color, shadow, drop = 100, tensionCoef = 0.001, segments = 15 }) {
        super({
            name: "catenary-wire",
            width, color, shadow,
            pointerless: true
        });
        this.addInitParams({ drop, segments, tensionCoef });
        this.drop = drop;
        this.segments = segments;
        this.tensionCoef = tensionCoef;
        this.wireDisplay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.wireDisplayShadow = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this.wireDisplayPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this.wireDisplay.setAttribute("fill", "none");
        this.wireDisplay.append(this.wireDisplayShadow, this.wireDisplayPath);
        this.wireEl.append(this.wireDisplay);
    }
    updateElementTransformations() {
        // calculate a/b/c values for ax^2 + bx + c of parabolic eq (parabola good approximation of catenary)
        let { x: x1, y: y1 } = this.point1.getPos();
        let { x: x3, y: y3 } = this.point2.getPos();
        const tensionLift = this.drop * Math.max(Math.min(this.tensionCoef * Math.abs(x3 - x1), 1), -1);
        const [x2, y2] = [(x1 + x3) / 2, (y1 + y3) / 2 + this.drop - tensionLift];
        // simply draw vertical line
        if (x1 == x3) {
            this.drawVLineFallback(x1, y1, y2, y3);
            return;
        }
        if (x1 == 0) { // magic eq breaks if x1=0
            // assuming x1 != x3; swap to fix eq
            let temp = x3;
            let temp2 = y3;
            x3 = x1;
            x1 = temp;
            y3 = y1;
            y1 = temp2;
        }
        const [sqX1, sqX2, sqX3] = [x1 * x1, x2 * x2, x3 * x3];
        const mainDiv = (x1 - x2) * (x1 - x3) * (x2 - x3);
        this.coefficients.a = -(x1 * (y2 - y3) - x2 * (y1 - y3) + x3 * (y1 - y2)) / mainDiv;
        this.coefficients.b = (sqX1 * (y2 - y3) - sqX2 * (y1 - y3) + sqX3 * (y1 - y2)) / mainDiv;
        this.coefficients.c = (sqX1 * x2 * y3 * (x1 - x2) - x2 * sqX3 * y1 * (x1 - x2) - x3 * (x1 - x3) * (sqX1 * y2 - sqX2 * y1)) / (x1 * mainDiv);
        this.drawParabola(x1, x3, y1, y3);
    }
    drawParabola(x1, x3, y1, y3) {
        const minX = Math.min(x1, x3);
        const maxX = Math.max(x1, x3);
        let minY = Math.min(y1, y3);
        let maxY = Math.max(y1, y3);
        const { a, b, c } = this.coefficients;
        if (Math.abs(a) > 1e-10) {
            // extreme(ax^2 + bx + c) -> 2ax + b = 0 -> x = -b / 2a
            const x2 = -b / (2 * a);
            const y2 = a * x2 * x2 + b * x2 + c;
            minY = Math.min(minY, y2);
            maxY = Math.max(maxY, y2);
        }
        // https://math.stackexchange.com/questions/335226/convert-segment-of-parabola-to-quadratic-bezier-curve
        const p_Cx = (x1 + x3) / 2;
        const p_Cy = y1 + (2 * a * x1 + b) * (x3 - x1) / 2;
        const d = `M${x1} ${y1} Q${p_Cx} ${p_Cy} ${x3} ${y3}`; // use quadratic bezier curve to draw parabola, which used to estimate catenary
        this.updateWireDisplay(d, minX, maxX, minY, maxY);
    }
    drawVLineFallback(x, y1, y2, y3) {
        const minY = Math.min(y1, y2, y3);
        const maxY = Math.max(y1, y2, y3);
        this.updateWireDisplay(`M${x} ${minY} L${x} ${maxY}`, x, x, minY, maxY);
    }
    updateWireDisplay(d, minX, maxX, minY, maxY) {
        const padding = this._width;
        const width = (maxX - minX) + 2 * padding;
        const height = (maxY - minY) + 2 * padding;
        this.setPos(minX - padding, minY - padding);
        this.wireDisplay.setAttribute("width", `${width}`);
        this.wireDisplay.setAttribute("height", `${height}`);
        this.wireDisplay.setAttribute("viewBox", `${minX - padding} ${minY - padding} ${width} ${height}`);
        this.wireDisplayShadow.setAttribute("d", d);
        this.wireDisplayPath.setAttribute("d", d);
    }
    updateWireStyle() {
        this.wireDisplayShadow.setAttribute("stroke", this._shadow);
        this.wireDisplayPath.setAttribute("stroke", this._color);
        this.wireDisplayShadow.style.strokeWidth = `${this._width + 1}px`;
        this.wireDisplayPath.style.strokeWidth = `${this._width}px`;
    }
}
//# sourceMappingURL=catenary.js.map