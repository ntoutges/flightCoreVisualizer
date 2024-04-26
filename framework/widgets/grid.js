import { Widget } from "./widget.js";
export class GridWidget extends Widget {
    canvas;
    ctx;
    step;
    gridColor;
    megaStep;
    megaGridColor;
    coords;
    doCursorDrag;
    doInitCenter;
    gridChangeScaleFactor;
    offset = { x: 0, y: 0 };
    constructor({ style, options = {}, layer = -1, // default: behind everything
    positioning = 0, doCursorDragIcon = false, doIndependentCenter = false, gridChangeScaleFactor = 0.4, resize, contextmenu = [], addons }) {
        const canvas = document.createElement("canvas");
        if (!Array.isArray(contextmenu))
            contextmenu = [contextmenu];
        contextmenu.push({
            "menu": {
                el: canvas,
                options: "center/Center Grid/icons.home;reset/Reset Positioning/icons.action-undo"
            }
        });
        super({
            name: "grid",
            content: canvas,
            positioning,
            style,
            layer,
            resize,
            contextmenu,
            addons
        });
        this.addInitParams({ options, doCursorDragIcon, doIndependentCenter, gridChangeScaleFactor }, ["name"]);
        this.step = Math.max(options?.grid?.size, 10) || 50;
        this.gridColor = options?.grid?.color || "lightgrey";
        this.megaStep = Math.max(options?.megagrid?.size, 2) || 5;
        this.megaGridColor = options?.megagrid?.color || "grey";
        this.coords = options?.coords ?? false;
        this.doCursorDrag = doCursorDragIcon;
        this.doInitCenter = doIndependentCenter;
        this.gridChangeScaleFactor = gridChangeScaleFactor;
        if (!this.doCursorDrag)
            this.el.classList.add("no-cursor");
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.sceneDraggableListener.on("drag", this.drag.bind(this));
        this.sceneDraggableListener.on("scroll", this.drag.bind(this));
        this.sceneDraggableListener.on("init", this.init.bind(this));
        this.sceneDraggableListener.on("dragInit", this.dragStart.bind(this));
        this.sceneDraggableListener.on("dragEnd", this.dragEnd.bind(this));
        this.sceneElementListener.on("resize", this.resize.bind(this));
        this.contextmenus.menu.listener.on("click", item => {
            switch (item.value) {
                case "reset":
                    this.scene.draggable.setZoom(1);
                // nobreak;
                case "center":
                    this.scene.center();
            }
        });
    }
    drag(d) {
        if (!this.scene)
            return;
        const sWidth = this.scene.bounds.getPosComponent("x");
        const sHeight = this.scene.bounds.getPosComponent("y");
        this.drawGrid(d.pos.x, d.pos.y, sWidth, sHeight, d.pos.z);
    }
    resize() {
        if (!this.scene)
            return;
        // actual screen dimensions (unscaled)
        const sWidth = this.scene.bounds.getPosComponent("x");
        const sHeight = this.scene.bounds.getPosComponent("y");
        // set width based on DOM
        this.canvas.style.width = `${sWidth}px`;
        this.canvas.style.height = `${sHeight}px`;
        this.canvas.setAttribute("width", `${sWidth}px`);
        this.canvas.setAttribute("height", `${sHeight}px`);
        if (sWidth != 0 && sHeight != 0) { // only resize if non-NaN scale-factor
            // set canvas scale (now, 1px on canvs doesn't exactly correspond to 1px on screen)
            this.ctx.setTransform(1, 0, 0, 1, 0, 0); // reset scaling (apparently?)
            // this.ctx.scale(
            //   this.scene.draggable.scale,
            //   this.scene.draggable.scale
            // );
        }
        this.drawGrid(this.scene.draggable.pos.x, this.scene.draggable.pos.y, sWidth, sHeight, this.scene.draggable.pos.z);
    }
    drawGrid(xOff, yOff, width, height, zoom) {
        this.ctx.clearRect(0, 0, width, height);
        const xAdj = (xOff - this.offset.x) * zoom;
        const yAdj = (yOff - this.offset.y) * zoom;
        const scale = (1 / this.gridChangeScaleFactor) ** Math.floor(Math.log(zoom) / Math.log(this.gridChangeScaleFactor)); // magic maths that gets the answer!
        const localStep = this.step * zoom * scale;
        // standard grid
        this.ctx.beginPath();
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = this.gridColor;
        for (let x = -xAdj % localStep; x < width; x += localStep) {
            this.vLine(x, height);
        }
        for (let y = -yAdj % localStep; y < height; y += localStep) {
            this.hLine(y, width);
        }
        this.ctx.stroke();
        // megagrid
        this.ctx.beginPath();
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = this.megaGridColor;
        for (let x = -xAdj % (localStep * this.megaStep); x < width; x += localStep * this.megaStep) {
            this.vLine(x, height);
        }
        for (let y = -yAdj % (localStep * this.megaStep); y < height; y += localStep * this.megaStep) {
            this.hLine(y, width);
        }
        this.ctx.stroke();
        // draw x axis
        if (yAdj <= 0 && yAdj >= -height) {
            this.ctx.beginPath();
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = "red";
            this.hLine(-yAdj, width);
            this.ctx.stroke();
        }
        // draw y axis
        if (xAdj <= 0 && xAdj >= -width) {
            this.ctx.beginPath();
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = "seagreen";
            this.vLine(-xAdj, height);
            this.ctx.stroke();
        }
        // draw point at center of graph
        if (xAdj <= 0 && xAdj >= -width && yAdj <= 0 && yAdj >= -height) {
            this.ctx.beginPath();
            this.ctx.arc(-xAdj, -yAdj, 4, 0, 2 * Math.PI);
            this.ctx.fill();
        }
        if (this.coords) {
            this.ctx.fillText(`x: ${Math.round(xOff)}`, 5, height - 5);
            this.ctx.fillText(`y: ${Math.round(yOff)}`, 5, height - 15);
        }
    }
    vLine(x, height) {
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, height);
    }
    hLine(y, width) {
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(width, y);
    }
    init() {
        if (this.doInitCenter) {
            const bounds = this.scene.bounds.getPosData(["x", "y"]);
            this.offset.x = bounds.x / 2;
            this.offset.y = bounds.y / 2;
        }
        this.resize();
    }
    dragStart() {
        if (this.doCursorDrag)
            this.el.classList.add("dragging");
    }
    dragEnd() {
        this.el.classList.remove("dragging");
    }
}
//# sourceMappingURL=grid.js.map