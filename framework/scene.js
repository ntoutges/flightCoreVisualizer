// containers of everything--imagine this as the viewport
import { FrameworkBase } from "./framework.js";
import { Draggable } from "./draggable.js";
import { ElementListener, Listener } from "./listener.js";
import { Layers } from "./layers.js";
import { GlobalSingleUseWidget } from "./widgets/widget.js";
import { Pos } from "./pos.js";
import { WireBase } from "./widgets/wire/base.js";
import { Ids } from "./ids.js";
import { RevMap } from "./revMap.js";
var sceneIdentifiers = 0;
export class Scene extends FrameworkBase {
    draggable;
    identifier = sceneIdentifiers++;
    elListener = new Listener();
    resizeListener = new ElementListener();
    interListener = new Listener();
    bounds = new Pos({});
    widgetIds = new Ids();
    widgets = new RevMap();
    nestedScenes = [];
    snapObjects = new Map();
    nextSnapObjectId = 0;
    layers = new Layers();
    wires = new Set();
    encapsulator = null;
    loadClasses = {
        widget: new Map()
    };
    constructor({ parent = null, options = {}, style, widgets = [], doStartCentered = false, resize, encapsulator = null }) {
        super({
            name: "scene",
            parent,
            style,
            resize
        });
        this.draggable = new Draggable({
            viewport: this.element,
            element: parent,
            scrollX: options?.scrollX ?? true,
            scrollY: options?.scrollY ?? true,
            zoomable: options?.zoom?.able ?? true,
            options: {
                zoom: {
                    max: options?.zoom?.max ?? Number.MAX_VALUE,
                    min: options?.zoom?.min ?? 0
                }
            }
        });
        this.layers.onMove((type, zIndex) => { type.setZIndex(zIndex); });
        for (const widget of widgets) {
            this.addWidget(widget);
        }
        this.draggable.listener.on("drag", this.updateWidgetPosition.bind(this));
        this.draggable.listener.on("scroll", this.onScroll.bind(this));
        if (doStartCentered)
            this.draggable.listener.on("init", this.center.bind(this));
        this.elListener.onListen((type, isNew) => {
            if (isNew)
                this.el.addEventListener(type, this.elListener.trigger.bind(this.elListener, type));
        });
        this.elListener.on("pointerdown", () => { GlobalSingleUseWidget.unbuildType("contextmenu"); });
        this.resizeListener.observe(this.el);
        // this.resizeListener.setResizePoll(1000);
        this.resizeListener.on("resize", () => {
            const width = this.el.offsetWidth;
            const height = this.el.offsetHeight;
            this.bounds.setPos({ x: width, y: height });
            this.updateWidgetPosition(); // updates visibility
            this.elListener.trigger("resize", new Event("resize", {}));
        });
        this.resizeListener.on("scale", (scale) => {
            this.updateTrackedDraggableScale(scale);
            for (const widget of this.widgets.values()) {
                widget.updateTrackedDraggableScale(scale);
            }
            this.updateNestedSceneScale();
        });
        this.trackDraggables(this.draggable);
        if (encapsulator !== null)
            encapsulator.addNestedScene(this);
    }
    addWidget(widget, id = 0) {
        if (typeof id == "function")
            id = id(this.widgetIds.getIdsInUse()); // generate id
        if (!this.widgetIds.reserveId(id))
            id = this.widgetIds.generateId(); // if id invalid, generate new
        widget.attachTo(this, id);
        this.widgets.set(id, widget);
        this.layers.add(widget);
        this.updateIndividualWidget(widget);
        for (const snapObj of this.snapObjects.values()) {
            widget.pos.addSnapObject(snapObj);
        } // add snap objects
        return id;
    }
    removeWidget(widget) {
        if (typeof widget == "number") {
            if (!this.widgets.has(widget))
                return false; // widgetId doesn't exist
            widget = this.widgets.get(widget);
        }
        else if (!this.widgets.revHas(widget))
            return false; // widget doesn't exist
        this.widgets.revDelete(widget);
        this.layers.remove(widget);
        widget.detachFrom(this);
        if (widget instanceof WireBase && this.wires.has(widget))
            this.wires.delete(widget); // stop tracking wire
        for (const snapObj of this.snapObjects.values()) {
            widget.pos.removeSnapObject(snapObj);
        } // remove snap objects
    }
    getWidgetById(id) {
        return this.widgets.get(id, null);
    }
    updateIndividualWidget(widget) {
        if (!this.widgets.revHas(widget))
            return; // don't try to update invalid widget
        this.updateIndividualWidgetPosition(widget);
        this.updateIndividualWidgetScale(widget);
    }
    updateIndividualWidgetPosition(widget) {
        if (widget.isMovementExempt)
            return; // if positioning is 0 (doesn't move), then ignore
        const { x, y } = widget.pos.getPosData(["x", "y"]);
        const sWidth = widget.bounds.getPosComponent("x");
        const sHeight = widget.bounds.getPosComponent("y");
        const width = this.draggable.scaleIntoScreenSpace(sWidth);
        const height = this.draggable.scaleIntoScreenSpace(sHeight);
        const [sX, sY] = this.draggable.toScreenSpace(x, y);
        const viewWidth = this.bounds.getPosComponent("x");
        const viewHeight = this.bounds.getPosComponent("y");
        // outside viewable bounds
        if (sX + width < 0
            || sX > viewWidth
            || sY + height < 0
            || sY > viewHeight) {
            widget.element.classList.add("hidden"); // hide element to save on processing (I hope)
        }
        else
            widget.element.classList.remove("hidden");
        widget.element.style.left = `${sX}px`;
        widget.element.style.top = `${sY}px`;
    }
    updateIndividualWidgetScale(widget) {
        if (widget.positioning == 0)
            return; // no point in trying to multiply by 0
        const scale = (this.draggable.pos.z * widget.positioning) + 1 * (1 - widget.positioning);
        widget.setTransformation("scale", scale.toString());
        widget.setZoom(this.draggable.pos.z);
    }
    updateWidgetPosition() {
        for (const widget of this.widgets.values()) {
            this.updateIndividualWidgetPosition(widget);
        }
    }
    updateWidgetScale() {
        for (const widget of this.widgets.values()) {
            this.updateIndividualWidgetScale(widget);
        }
    }
    onScroll() {
        this.updateWidgetPositionAndScale();
        this.updateNestedSceneScale();
    }
    updateNestedSceneScale() {
        for (const nestedScene of this.nestedScenes) {
            nestedScene.resizeListener.trigger("scale", this.draggable.scaledZoom);
        }
    }
    updateWidgetPositionAndScale() {
        this.updateWidgetPosition();
        this.updateWidgetScale();
    }
    setWidgetPos(widget, x, y) {
        if (!this.widgets.revHas(widget))
            return;
        const bounds = this.el.getBoundingClientRect();
        // include x/y position of scene
        const [sX, sY] = this.draggable.toSceneSpace(x - bounds.left, y - bounds.top);
        widget.setPos(sX, sY);
        this.updateIndividualWidget(widget);
    }
    center() {
        const bounds = this.bounds.getPosData(["x", "y"]);
        this.draggable.setOffsetTo(bounds.x / 2, bounds.y / 2);
    }
    addGlobalSnapObject(obj) {
        for (const widget of this.widgets.values()) {
            widget.pos.addSnapObject(obj);
        }
        const id = this.nextSnapObjectId++;
        this.snapObjects.set(id, obj);
        return id;
    }
    removeGlobalSnapObject(obj) {
        if (typeof obj == "number")
            obj = this.snapObjects.get(obj);
        for (const widget of this.widgets.values()) {
            widget.pos.removeSnapObject(obj);
        }
        let id = -1;
        for (const [i, snapObj] of this.snapObjects.entries()) {
            if (snapObj == obj) {
                id = i;
                break;
            }
        }
        if (id == -1)
            return false; // doesn't exist
        this.snapObjects.delete(id);
        return true; // exists
    }
    registerWire(wire) {
        this.wires.add(wire); // track wire
    }
    addNestedScene(scene) {
        scene.encapsulator = this;
        this.nestedScenes.push(scene);
        scene.resizeListener.trigger("scale", this.draggable.pos.z);
    }
    removeNestedScene(scene) {
        const i = this.nestedScenes.indexOf(scene);
        if (i == -1)
            return false; // scene isn't nested
        scene.encapsulator = null;
        this.nestedScenes.splice(i, 1);
        return true; // successfully removed
    }
    addLoadClass(type, classname, params = {}) {
        this.loadClasses[type].set(classname.name, { classname, params });
    }
    save() {
        const widgetSave = {};
        this.widgets.forEach((widget, key) => {
            if (widget.doSaveWidget)
                widgetSave[key] = widget.save();
        });
        return {
            widgets: widgetSave,
            nested: this.nestedScenes.map(scene => scene.save())
        };
    }
    load(state) {
        const widgets = new Map();
        for (const widgetId in state.widgets) {
            const data = state.widgets[widgetId];
            const type = data.type;
            if (this.loadClasses.widget.has(type)) {
                const { classname, params: addedParams } = this.loadClasses.widget.get(type);
                const loaded = new classname({ ...data.params, ...addedParams });
                const id = this.addWidget(loaded, data.id);
                widgets.set(id, loaded);
            }
        }
        for (const [widgetId, widget] of widgets) {
            const data = state.widgets[widgetId];
            widget.load(data);
        }
    }
}
//# sourceMappingURL=scene.js.map