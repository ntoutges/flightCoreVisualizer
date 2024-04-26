// allows scenes to be moved around
import { Listener } from "./listener.js";
export class Draggable {
    isDragging = false;
    elements;
    // measured in px
    mouseOffset = { x: 0, y: 0 };
    pos = { x: 0, y: 0, z: 1 }; // z represents (z)oom
    delta = { x: 0, y: 0, z: 0 };
    // readonly bounds = {
    //   width: 0,
    //   height: 0,
    //   sWidth: 0,
    //   sHeight: 0
    // };
    scrollX;
    scrollY;
    zoomable;
    blockDrag;
    blockScroll;
    maxZoom;
    minZoom;
    viewport;
    doDragBound = this.doDrag.bind(this);
    endDragBound = this.endDrag.bind(this);
    acceptableMouseButtons = new Set();
    scale = 1;
    enabled = true;
    _lastEvent = null;
    listener = new Listener();
    constructor({ viewport, // continues movement
    element, // Initiates movement
    periphery = [], // Has event listener, but only to stop propagation
    scrollX = true, scrollY = true, zoomable = true, blockDrag = true, blockScroll = true, input, options = {} }) {
        this.blockDrag = blockDrag;
        this.blockScroll = blockScroll;
        let hasResized = false;
        const initResizeId = this.listener.on("resize", () => { hasResized = true; });
        const initInterval = setInterval(() => {
            if (hasResized) { // go for another itteration
                hasResized = false;
                return;
            }
            this.listener.setPollingInterval("resize", 400); // can now afford to slow down
            this.listener.off(initResizeId);
            clearInterval(initInterval); // prevent more repeat
            this.changeViewport(viewport);
            if (Array.isArray(element)) {
                if (element.length == 0)
                    throw new Error("Draggable must have at least one [element] (got 0)");
                for (const el of element) {
                    el.addEventListener("pointerdown", this.initDrag.bind(this));
                    el.addEventListener("wheel", this.onScroll.bind(this));
                }
            }
            else {
                element.addEventListener("pointerdown", this.initDrag.bind(this));
                element.addEventListener("wheel", this.onScroll.bind(this));
            }
            for (const el of periphery) {
                if (this.blockDrag)
                    el.addEventListener("pointerdown", (e) => {
                        e.stopPropagation();
                        this.listener.trigger("selected", this);
                    });
                if (this.blockScroll)
                    el.addEventListener("wheel", (e) => { e.stopPropagation(); });
            }
            // this.updateBounds();
            this.listener.setAutoResponse("init", this);
        }, 40);
        this.scrollX = scrollX;
        this.scrollY = scrollY;
        this.zoomable = zoomable;
        const minZoom = options?.zoom?.min ?? 0;
        const maxZoom = options?.zoom?.max ?? Number.MAX_VALUE;
        this.minZoom = Math.min(minZoom, maxZoom);
        this.maxZoom = Math.max(minZoom, maxZoom);
        if (input?.acceptableMouseButtons && input.acceptableMouseButtons.length > 0) {
            for (const button of input.acceptableMouseButtons) {
                this.acceptableMouseButtons.add(button);
            }
        }
        else
            this.acceptableMouseButtons.add(0); // by default, only listen to left-click
        this.elements = Array.isArray(element) ? element : [element];
        // this.listener.setPollingOptions("resize", this.updateBounds.bind(this), 10); // initially go at HYPER SPEED to detect the smallest change
    }
    initDrag(e) {
        if (this.blockDrag)
            e.stopPropagation();
        if (!this.enabled)
            return; // disabled
        if (!this.acceptableMouseButtons.has(e.button))
            return;
        e.preventDefault();
        this._lastEvent = e;
        this.isDragging = true;
        this.mouseOffset.x = e.pageX;
        this.mouseOffset.y = e.pageY;
        this.listener.trigger("dragInit", this);
        this.listener.trigger("selected", this);
    }
    doDrag(e) {
        if (!this.isDragging)
            return;
        if (this.blockDrag)
            e.stopPropagation();
        let didMove = false;
        if (this.scrollX) {
            this.delta.x = (this.mouseOffset.x - e.pageX) / (this.pos.z * this.scale);
            if (this.delta.x != 0)
                didMove = true;
            this.pos.x += this.delta.x;
            this.mouseOffset.x = e.pageX;
        }
        if (this.scrollY) {
            this.delta.y = (e.pageY - this.mouseOffset.y) / (this.pos.z * this.scale);
            if (this.delta.y != 0)
                didMove = true;
            this.pos.y -= this.delta.y;
            this.mouseOffset.y = e.pageY;
        }
        if (didMove) {
            this.delta.z = 0;
            this.listener.trigger("drag", this);
        }
    }
    endDrag(e) {
        if (!this.isDragging)
            return;
        if (this.blockDrag)
            e.stopPropagation();
        this._lastEvent = e;
        this.isDragging = false;
        this.listener.trigger("dragEnd", this);
    }
    onScroll(e) {
        if (!this.zoomable || e.deltaY == 0)
            return; // don't zoom if not zoomable
        if (this.blockScroll)
            e.stopPropagation();
        if (!this.enabled)
            return; // disabled
        this._lastEvent = e;
        // exact position of cursor actually matters here, rather than just difference in position
        const bounds = this.getBoundingClientRect();
        const localX = (e.pageX - bounds.left);
        const localY = (e.pageY - bounds.top);
        const dir = (e.deltaY > 0) ? 1 : -1;
        this.pos.x += localX / this.pos.z;
        this.pos.y += localY / this.pos.z;
        this.pos.z -= this.pos.z / (dir * 20);
        this.pos.z = Math.min(Math.max(this.pos.z, this.minZoom), this.maxZoom); // constrain
        this.pos.x -= localX / this.pos.z;
        this.pos.y -= localY / this.pos.z;
        this.listener.trigger("scroll", this);
    }
    // protected updateBounds() {
    //   const bounds = this.getBoundingClientRect();
    //   if (
    //     bounds.width == this.bounds.width
    //     && bounds.height == this.bounds.height
    //     && bounds.sWidth == this.bounds.sWidth
    //     && bounds.sHeight == this.bounds.sHeight
    //   ) return null; // no difference
    //   this.bounds.width = bounds.width;
    //   this.bounds.height = bounds.height;
    //   this.bounds.sWidth = bounds.sWidth;
    //   this.bounds.sHeight = bounds.sHeight;
    //   return this; // truthy/there *was* a difference
    // }
    getBoundingClientRect() {
        let minX = null;
        let maxX = null;
        let maxScaledX = null; // used to determine scaled width
        let minY = null;
        let maxY = null;
        let maxScaledY = null; // used to determine scaled width
        let minRight = null;
        let minBottom = null;
        for (const el of this.elements) {
            const bounds = el.getBoundingClientRect();
            const unscaledWidth = el.offsetWidth;
            const unscaledHeight = el.offsetHeight;
            if (minX == null || bounds.left < minX)
                minX = bounds.left;
            if (maxX == null || bounds.left + unscaledWidth > maxX)
                maxX = bounds.left + unscaledWidth;
            if (maxScaledX == null || bounds.left + bounds.width > maxScaledX)
                maxScaledX = bounds.left + bounds.width;
            if (minY == null || bounds.top < minY)
                minY = bounds.top;
            if (maxY == null || bounds.top + unscaledHeight > maxY)
                maxY = bounds.top + unscaledHeight;
            if (maxScaledY == null || bounds.top + bounds.width > maxScaledY)
                maxScaledY = bounds.top + bounds.height;
            if (minRight == null || bounds.right < minRight)
                minRight = bounds.right;
            if (minBottom == null || bounds.bottom < minBottom)
                minBottom = bounds.bottom;
        }
        // width ignoring any scaling (use for element dim decisions); SIZE IN DOM
        const width = maxX - minX;
        const height = maxY - minY;
        // width taking into account scaling (use for canvas dim decisions); SIZE ON SCREEN
        const sWidth = maxScaledX - minX;
        const sHeight = maxScaledY - minY;
        return {
            top: minY,
            bottom: minBottom,
            left: minX,
            right: minRight,
            width, height,
            sWidth, sHeight
        };
    }
    // recalculateScale() {
    //   const baseZoom = this.getBaseScale()
    //   this.scale = baseZoom[0];
    //   this.scale.y = baseZoom[1];
    // }
    setOffsetTo(x, y, triggerDrag = true) {
        this.pos.x = -x;
        this.pos.y = -y;
        if (triggerDrag)
            this.listener.trigger("drag", this);
    }
    offsetBy(x, y, triggerDrag = true) {
        this.pos.x -= x;
        this.pos.y -= y;
        if (triggerDrag)
            this.listener.trigger("drag", this);
    }
    setZoom(z) {
        this.pos.z = Math.min(Math.max(z, this.minZoom), this.maxZoom);
        this.listener.trigger("scroll", this);
    }
    // convert x,y in screen to x,y within transformations of scene
    toSceneSpace(x, y) {
        return [
            // for some reason, only multiplying by `this.scale` here works...
            x / (this.pos.z * this.scale) + this.pos.x,
            y / (this.pos.z * this.scale) + this.pos.y
        ];
    }
    scaleIntoSceneSpace(dim) {
        return dim / this.pos.z;
    }
    // convert x,y in scene out to to x,y without scene transformations
    toScreenSpace(x, y) {
        return [
            (x - this.pos.x) * (this.pos.z),
            (y - this.pos.y) * (this.pos.z)
        ];
    }
    scaleIntoScreenSpace(dim) {
        return dim * this.pos.z;
    }
    changeViewport(viewport) {
        if (this.viewport) { // remove old listeners
            this.viewport.removeEventListener("pointermove", this.doDragBound);
            this.viewport.removeEventListener("pointermove", this.endDragBound);
        }
        // add new listeners
        viewport.addEventListener("pointermove", this.doDragBound);
        viewport.addEventListener("pointerup", this.endDragBound);
        this.viewport = viewport;
    }
    // get zoom based on parent transformations
    getBaseScale() {
        if (!this.elements[0])
            return [1, 1]; // no elements, default
        const untransformedWidth = this.elements[0].offsetWidth;
        const untransformedHeight = this.elements[0].offsetHeight;
        const { width, height } = this.elements[0].getBoundingClientRect();
        return [
            width / untransformedWidth,
            height / untransformedHeight
        ];
    }
    get scaledZoom() { return this.pos.z * this.scale; }
    enable() { this.enabled = true; }
    disable() { this.enabled = false; }
    get lastEvent() { return this._lastEvent; }
}
//# sourceMappingURL=draggable.js.map