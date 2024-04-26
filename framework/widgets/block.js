import { Widget } from "./widget.js";
export class BlockWidget extends Widget {
    constructor({ layer, style, positioning = 1, pos, resize }) {
        const el = document.createElement("div");
        super({
            layer, style,
            name: "block",
            positioning,
            pos,
            content: el,
            resize
        });
        this.addInitParams({}, ["name"]);
    }
}
//# sourceMappingURL=block.js.map