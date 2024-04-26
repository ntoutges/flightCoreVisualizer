import { Ids } from "../ids.js";
import { Addon } from "./base.js";
// an addon which can act as an addon edge
export class AddonEdgeAlias extends Addon {
    addons = new Map();
    ids = new Ids();
    constructor({ addons = [], style, positioning, weight }) {
        super({
            content: document.createElement("div"),
            positioning,
            weight
        });
        this.el.classList.add("addon-edge-aliases");
        this.contentEl.classList.add("addon-edge-alias-contents");
        for (const prop in style) {
            this.contentEl.style[prop] = style[prop];
        }
        for (const addon of addons) {
            this.add(addon);
        }
    }
    attachTo(addonEdge, id) {
        super.attachTo(addonEdge, id);
        for (const [id, addon] of this.addons) {
            addon.attachTo(this, id);
        }
    }
    // override setter; circleness/size does not apply with aliases
    set circleness(newCircleness) { }
    set size(newSize) { }
    get size() { return this.contentEl.offsetWidth; }
    add(addon) {
        const id = this.ids.generateId();
        this.addons.set(id, addon);
        if (this.addonEdge)
            addon.attachTo(this, id);
        return id;
    }
    // pop(id: number): boolean {
    //   if (!this.addons.has(id)) return false;
    //   const addon = this.addons.get(id);
    //   this.addons.delete(id);
    // }
    get(id) {
        return this.addons.get(id) ?? null;
    }
    get parentAddonEdge() { return this.addonEdge; }
}
//# sourceMappingURL=alias.js.map