import { FrameworkBase } from "../framework.js";
import { ElementListener, Listener } from "../listener.js";
import { Pos, SnapPos } from "../pos.js";
import { AddonContainer } from "../addons/base.js";
import { ContextMenuItem, ContextMenuSection } from "./contextmenuItems.js";
import { AttachableListener } from "../attachableListener.js";
const alignmentMap = {
    "left": 0,
    "top": 0,
    "middle": 0.5,
    "right": 1,
    "bottom": 1
};
// what is put into scenes
export class Widget extends FrameworkBase {
    transformations = new Map();
    contextmenus = {};
    addons = new AddonContainer(this);
    elListener = new ElementListener(300);
    _scene = null;
    _id;
    layer; // used to store layer until attached to a scene
    positioning;
    doZoomScale;
    sceneDraggableListener = new AttachableListener(() => this._scene?.draggable.listener);
    sceneElementListener = new AttachableListener(() => this._scene?.elListener);
    sceneInterListener = new AttachableListener(() => this._scene?.interListener);
    pos = new SnapPos({}, 20);
    bounds = new Pos({});
    align = { x: 0, y: 0 };
    name;
    constructor({ name, style, content = document.createElement("div"), positioning = 1, doZoomScale = true, layer = 100 - Math.round(positioning * 100), // default makes elements positioned "closer" to the background lower in layer
    pos = {}, resize, contextmenu = [], addons = {} }) {
        const superName = name.split(" ").map(name => name + "-widget").join(" ");
        super({
            name: `${superName} widget`,
            children: [content],
            style, resize
        });
        this.addInitParams({ name, positioning, doZoomScale, layer, pos });
        this.name = name;
        this.elListener.observe(this.el);
        this.positioning = positioning;
        this.doZoomScale = doZoomScale;
        this.layer = layer;
        this.align.x = alignmentMap[pos?.xAlign ?? "left"];
        this.align.y = alignmentMap[pos?.yAlign ?? "top"];
        this.pos.listener.on("set", () => {
            this.elListener.trigger("move", this.el);
            this.scene?.updateIndividualWidget(this);
        });
        this.setPos(pos?.x ?? 0, pos?.y ?? 0);
        if (Array.isArray(contextmenu)) {
            if (contextmenu.length == 0)
                contextmenu = {};
            else if (contextmenu.length == 1)
                contextmenu = contextmenu[0];
            else {
                const base = contextmenu[contextmenu.length - 1]; // fill list back-to-front
                for (let i = contextmenu.length - 2; i >= 0; i--) {
                    ContextMenu.combineContextMenus(base, contextmenu[i]);
                }
                contextmenu = base;
            }
        }
        for (const name in contextmenu) {
            this.contextmenus[name] = new ContextMenu({
                items: ContextMenu.sectionsBuilder(contextmenu[name].options),
                trigger: contextmenu[name].el
            });
        }
        for (const id in addons) {
            const { side, addon } = addons[id];
            this.addons.add(id, side, addon);
        }
        this.elListener.on("resize", () => {
            this.addons.updateAddonPositions();
            this.updateBounds();
            this._scene?.updateIndividualWidget(this);
        });
        this.addons.appendTo(this.el);
    }
    get scene() { return this._scene; }
    setPos(x, y) {
        this.pos.setPos({ x, y });
    }
    offsetPos(x, y) {
        this.pos.offsetPos({ x, y });
    }
    setZoom(z) {
        if (!this.doZoomScale)
            this.setTransformation("scale", "1"); // force scale to not change
    }
    updateBounds(bounds = null, padding = null) {
        if (bounds === null)
            bounds = { width: this.el.offsetWidth, height: this.el.offsetHeight };
        this.bounds.setPos({
            x: bounds.width + (padding?.x ?? 0),
            y: bounds.height + (padding?.y ?? 0)
        });
    }
    // calculateBounds() {
    //   const scale = this._scene?.draggable.pos.z ?? 1; // no scene means no size
    //   return {
    //     "x": this.el.offsetWidth * scale,
    //     "y": this.el.offsetHeight * scale
    //   }
    // }
    attachTo(scene, id) {
        const isFirstScene = this._scene == null;
        if (!isFirstScene)
            this.detachFrom(this._scene);
        this._scene = scene;
        this._id = id;
        this.element.setAttribute("id", `framework-widget-i${id}`);
        this.sceneDraggableListener.updateValidity();
        this.sceneElementListener.updateValidity();
        this.sceneInterListener.updateValidity();
        this.setZoom(scene.draggable.pos.z);
        scene.layers.setLayer(this, this.layer);
        if (this.doImmediateSceneAppend)
            this.appendTo(scene.element);
        if (isFirstScene && this.resizeData.draggable) {
            this.resizeData.draggable.listener.on("resize", this.updatePositionOnResize.bind(this));
            ;
        }
        for (const name in this.contextmenus) {
            scene.addWidget(this.contextmenus[name]);
        }
    }
    detachFrom(scene) {
        if (this._scene != scene)
            return; // scenes don't match
        this._scene = null;
        this.el.remove();
        scene.removeWidget(this);
        this.sceneDraggableListener.updateValidity();
        this.sceneElementListener.updateValidity();
        this.sceneInterListener.updateValidity();
        this.elListener.trigger("detach", this.el);
    }
    setTransformation(property, value = "") {
        if (value.length == 0)
            this.transformations.delete(property); // delete property
        else
            this.transformations.set(property, value); // add property
        this.updateTransformations();
    }
    updateTransformations() {
        let transformations = [];
        for (const [property, value] of this.transformations.entries()) {
            transformations.push(`${property}(${value})`);
        }
        this.el.style.transform = transformations.join(",");
    }
    setZIndex(zIndex) {
        this.el.style.zIndex = zIndex.toString();
    }
    updatePositionOnResize(d) {
        const xOff = d.delta.x * this.align.x;
        const yOff = d.delta.y * this.align.y;
        this.pos.offsetPos({
            x: -xOff,
            y: yOff
        });
    }
    get isBuilt() { return true; } // used by types like GlobalSingleUseWidget for scene optimization
    get doSaveWidget() { return true; }
    manualResizeTo(d, xComponent = 1, yComponent = 1) {
        if (xComponent >= 2)
            this.pos.offsetPos({ x: -d.delta.x });
        if (yComponent >= 2)
            this.pos.offsetPos({ y: d.delta.y });
        if (this.scene)
            d.scale = this.scene.draggable.pos.z; // update scale if this.scene exists
        super.manualResizeTo(d, xComponent, yComponent);
    }
    get doImmediateSceneAppend() { return true; }
    get isMovementExempt() { return !this.isBuilt || this.positioning === 0; }
    getId() { return this._id; }
    save() {
        return {
            ...super.save(),
            id: this._id,
            type: this.constructor.name,
            pos: {
                x: this.pos.getPosComponent("x"),
                y: this.pos.getPosComponent("y")
            },
            addons: this.addons.save()
        };
    }
    load(data) {
        this.pos.setPos(data.pos);
    }
}
const globalSingleUseWidgetMap = new Map();
export class GlobalSingleUseWidget extends Widget {
    _isBuilt;
    constructor({ name, content, layer, pos, positioning, resize, style, options, doZoomScale, addons }) {
        super({
            name, content,
            layer,
            pos, positioning, resize,
            style,
            doZoomScale,
            addons
        });
        this._isBuilt = false;
        if (options?.autobuild ?? true) {
            setTimeout(() => { this.build(); }); // taking advantage of event system; wait for parent constructor to finish before calling build
        }
        this.el.style.display = "none";
    }
    build() {
        if (globalSingleUseWidgetMap.has(this.name)) { // get rid of old
            const oldWidget = globalSingleUseWidgetMap.get(this.name);
            if (oldWidget != this)
                oldWidget.unbuild();
        }
        globalSingleUseWidgetMap.set(this.name, this);
        this._isBuilt = true;
        if (this.scene)
            this.scene.element.append(this.el); // add element to scene if being used
        this.el.style.display = "";
    }
    unbuild() {
        this._isBuilt = false;
        this.el.style.display = "none";
        this.el.remove(); // remove element from scene when no longer used
        if (globalSingleUseWidgetMap.has(this.name)) {
            globalSingleUseWidgetMap.delete(this.name); // remove current entry
        }
    }
    get isBuilt() { return this._isBuilt; }
    get doSaveWidget() { return false; } // by default: don't save GlobalSingleUseWidgets
    static unbuildType(type) {
        if (globalSingleUseWidgetMap.has(type)) {
            globalSingleUseWidgetMap.get(type).unbuild();
        }
    }
    get doImmediateSceneAppend() { return false; }
}
const sectionPattern = /^(?:;([^;]+))?(.+?)$/;
export class ContextMenu extends GlobalSingleUseWidget {
    sections;
    container;
    listener = new Listener();
    doAutoClose;
    constructor({ pos, positioning, resize, style, layer = 999999, items, trigger }) {
        const container = document.createElement("div");
        super({
            layer, pos, positioning, resize, style,
            name: "contextmenu",
            content: container,
            options: {
                autobuild: false
            },
            doZoomScale: false
        });
        container.classList.add("framework-contextmenu-containers");
        container.addEventListener("pointerdown", (e) => { e.stopPropagation(); }); // block dragging
        container.addEventListener("contextmenu", (e) => { e.preventDefault(); }); // prevent real context-menu on fake context-menu
        if (items.length > 0) {
            if (items[0] instanceof ContextMenuSection)
                this.sections = items;
            else {
                this.sections = [
                    new ContextMenuSection({
                        items: items
                    })
                ];
            }
            this.sections.forEach(section => { section.setListener(this.listener); });
        }
        else
            this.sections = [];
        this.container = container;
        this.listener.on("add", () => { if (this.isBuilt)
            this.rebuild(); });
        this.listener.on("click", () => {
            if (this.doAutoClose)
                this.unbuild();
            this.doAutoClose = false; // reset 
        }, 0); // priority of 0, will wait until all else executed
        if (!Array.isArray(trigger))
            trigger = [trigger];
        for (const el of trigger) {
            el.addEventListener("contextmenu", (e) => {
                if (this.sections.length > 0)
                    e.preventDefault(); // if empty, allow standard contextmenu through (but still close previous contextmenu)
                e.stopPropagation();
                if (!this._scene)
                    return; // don't continue unless attached to something
                this.build();
                this._scene.setWidgetPos(this, e.pageX, e.pageY);
                this.listener.trigger("open", null);
            });
        }
    }
    rebuild() {
        this.container.innerHTML = ""; // clear
        const sectionElements = this.sections.map(section => section.build());
        for (const sectionEl of sectionElements) {
            this.container.append(sectionEl);
        }
    }
    build() {
        this.doAutoClose = true;
        if (!this.isEmpty())
            this.rebuild(); // don't bother trying to build empty contextmenu
        super.build();
    }
    unbuild() {
        this.container.innerHTML = "";
        this.listener.trigger("close", null);
        super.unbuild();
    }
    addSection(section) {
        section.setListener(this.listener);
        this.sections.push(section);
    }
    removeSection(name) {
        const section = this.getSection(name);
        if (section == null)
            return;
        const index = this.sections.indexOf(section);
        section.unbuild()?.remove();
        this.sections.splice(index, 1);
    }
    clear() {
        for (let i = this.sections.length; i >= 0; i--) {
            this.removeSection(i);
        }
    }
    getSection(name) {
        if (typeof name == "number") { // given exact index
            if (name < 0)
                name += this.sections.length;
            if (name >= 0 && name < this.sections.length) {
                return this.sections[name];
            }
            return null;
        }
        // given name
        for (const section of this.sections) {
            if (section.name == name) {
                return section;
            }
        }
        return null;
    }
    size() {
        let total = 0;
        this.sections.forEach(section => { total += section.size(); });
        return total;
    }
    /**
     * Call this to prevent the contextmenu from closing when clicked
     */
    blockClosing() {
        this.doAutoClose = false;
    }
    // format: <value>/<name>/<icon>,<icon-2>,.../<shortcut>
    static itemBuilder(input) {
        const parts = input.split("/");
        const buildData = { value: "" };
        if (parts.length == 1 && parts[0].length == 0)
            return null;
        buildData.value = parts[0];
        if (parts.length > 1 && parts[1].trim())
            buildData.name = parts[1];
        if (parts.length > 2 && parts[2].trim())
            buildData.icon = parts[2].split(",");
        if (parts.length > 3 && parts[3].trim())
            buildData.shortcut = parts[3];
        return new ContextMenuItem(buildData);
    }
    isEmpty() { return this.sections.length == 0; }
    // format: ;name;<item>;<item>;...
    static sectionBuilder(input) {
        const sectionData = sectionPattern.exec(input);
        if (!sectionData)
            return null;
        const name = (sectionData[1]?.trim()) || null;
        const items = [];
        const itemsData = (sectionData[2] ?? "").split(";");
        for (const itemInput of itemsData) {
            const item = ContextMenu.itemBuilder(itemInput);
            if (item == null)
                continue; // throw out
            items.push(item);
        }
        if (items.length == 0)
            return null;
        return new ContextMenuSection({
            items,
            name
        });
    }
    // format: <section>~<section>~...
    static sectionsBuilder(input) {
        const sectionsData = input.split("~");
        const sections = [];
        for (const sectionData of sectionsData) {
            const section = ContextMenu.sectionBuilder(sectionData);
            if (section == null)
                continue; // throw out
            sections.push(section);
        }
        return sections;
    }
    // copies data from [b] into [a]
    static combineContextMenus(a, b) {
        for (const name in b) {
            if (name in a) {
                const bMatch = sectionPattern.exec(b[name].options);
                if (bMatch[1])
                    a[name].options += "~"; // new section
                else if (a[name].options.length > 0)
                    a[name].options += ";"; // add separator
                a[name].options += b[name].options;
                if (a[name].el == null)
                    a[name].el = b[name].el; // [a] may leave element undefined; if so, fill with [b]'s element
            }
            else
                a[name] = b[name];
        }
    }
}
//# sourceMappingURL=widget.js.map