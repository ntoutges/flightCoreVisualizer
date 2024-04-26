import { WireBase } from "./base.js";
export class WireLine extends WireBase {
    constructor({ color, shadow, width }) {
        super({
            name: "line-wire",
            color, shadow, width
        });
    }
    getPolar() {
        const dx = this.point2.getPos().x - this.point1.getPos().x;
        const dy = this.point2.getPos().y - this.point1.getPos().y;
        const mag = Math.sqrt(dx * dx + dy * dy);
        const rot = Math.atan2(dy, dx);
        return { mag, rot };
    }
    updateElementTransformations() {
        if (!this.scene)
            return;
        let { mag, rot } = this.getPolar();
        // this allows the wire to not overlap addon
        const r1 = this.point1.radius;
        const r2 = this.point2.radius;
        mag = Math.max(mag - (r1 + r2), 0);
        const pos1 = this.point1.getPos();
        const pos2 = this.point2.getPos();
        // ensure x/y is always at top-left
        const minX = Math.min(pos1.x, pos2.x);
        const minY = Math.min(pos1.y, pos2.y);
        this.setPos(minX, minY);
        this.wireEl.style.top = `${pos1.y - minY}px`;
        this.wireEl.style.left = `${pos1.x - minX}px`;
        this.wireEl.style.width = `${mag}px`;
        this.wireEl.style.transform = `translateY(-50%) rotate(${rot}rad) translateX(${r1}px)`;
    }
    updateWireStyle() {
        this.wireEl.style.height = `${this._width}px`;
        this.wireEl.style.background = this._color;
        this.wireEl.style.boxShadow = `${this._shadow} 0px 0px ${this._width + 1}px`;
    }
}
//# sourceMappingURL=line.js.map