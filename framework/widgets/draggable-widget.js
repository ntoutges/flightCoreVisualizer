import { Draggable } from "../draggable.js";
import { getSvg } from "../svg.js";
import { buttonDefaults } from "./defaults.js";
import { GlobalSingleUseWidget, Widget } from "./widget.js";
export class DraggableWidget extends Widget {
    container;
    header = null;
    body;
    draggable = null;
    doCursorDrag;
    buttonHideTimeout = null;
    minimizeTimeout = null;
    acceptableMouseButtons;
    doDragAll;
    headerButtons = {};
    buttonColors = new Map();
    isClosing = false;
    isExpanding = false;
    draggableInfo = { scrollX: true, scrollY: true };
    constructor({ layer, positioning, pos, style, header = {}, doCursorDragIcon = true, doDragAll = false, options, content = document.createElement("div"), name, resize, contextmenu = [], doZoomScale, addons }) {
        const container = document.createElement("div");
        const headerEl = document.createElement("div");
        const body = document.createElement("div");
        if (!Array.isArray(contextmenu))
            contextmenu = [contextmenu];
        contextmenu.push({
            "header": {
                el: headerEl,
                options: "close/close/icons.x;collapse/collapse/icons.minus"
            },
            "body": {
                el: body,
                options: ""
            }
        });
        const bodyHeight = style?.height;
        const bodyBackground = style?.background;
        // intercept height/width data before they are sent to parent
        if (style) {
            delete style.height;
            delete style.background;
        }
        super({
            layer, positioning, pos, style,
            name,
            content: container,
            resize,
            doZoomScale,
            contextmenu: contextmenu,
            addons
        });
        this.addInitParams({ header, doCursorDragIcon, doDragAll, options });
        this.container = container;
        this.container.classList.add("framework-draggable-widget-containers");
        container.addEventListener("click", GlobalSingleUseWidget.unbuildType.bind(null, "contextmenu"));
        this.doDragAll = doDragAll;
        this.header = headerEl;
        this.header.classList.add("framework-draggable-widget-headers");
        this.container.append(this.header);
        const title = document.createElement("div");
        title.classList.add("framework-draggable-widget-titles");
        title.setAttribute("draggable", "false");
        const titleText = document.createElement("h3");
        titleText.classList.add("framework-draggable-widget-title-texts");
        titleText.innerText = header?.title ?? "Unnamed";
        title.append(titleText);
        this.header.append(title);
        const titleEnd = document.createElement('div');
        titleEnd.classList.add("framework-draggable-widget-title-ends");
        this.header.append(titleEnd);
        this.doCursorDrag = doCursorDragIcon;
        if (!doCursorDragIcon) {
            this.container.classList.add("no-cursor"); // don't show dragging indication
        }
        title.style.background = header.background ?? "#999999";
        titleEnd.style.background = header.background ?? "#999999";
        this.header.style.color = header.color ?? "black";
        const buttons = document.createElement("div");
        buttons.classList.add("framework-draggable-widget-button-holder");
        for (const type in buttonDefaults) {
            const options = ("buttons" in header ? header.buttons[type] : {});
            const defOptions = buttonDefaults[type];
            if (options?.show ?? defOptions.show) {
                const button = document.createElement("div");
                button.classList.add(`framework-draggable-widget-${type}s`, "framework-draggable-widget-buttons");
                button.setAttribute("title", type);
                this.buttonColors.set(type, {
                    dormant: {
                        fill: options?.dormant?.fill ?? defOptions.dormant.fill,
                        highlight: options?.dormant?.highlight ?? defOptions.dormant.highlight
                    },
                    active: {
                        fill: options?.active?.fill ?? defOptions.active.fill,
                        highlight: options?.active?.highlight ?? defOptions.active.highlight
                    }
                });
                button.style.width = options?.size ?? defOptions.size;
                button.style.height = options?.size ?? defOptions.size;
                button.style.padding = options?.padding ?? defOptions.padding;
                buttons.append(button);
                button.addEventListener("mouseenter", this.updateButtonColor.bind(this, button, type, "active"));
                button.addEventListener("mouseleave", this.updateButtonColor.bind(this, button, type, "dormant"));
                this.updateButtonColor(button, type, "dormant");
                button.addEventListener("pointerdown", (e) => {
                    e.stopPropagation(); // prevent dragging from button
                    this._scene.layers.moveToTop(this); // still do select
                });
                // fetch svg data
                const iconSvgs = [options?.icon ?? defOptions.icon];
                const altIcon = options?.altIcon ?? defOptions.altIcon;
                if (altIcon !== null)
                    iconSvgs.push(altIcon);
                getSvg(iconSvgs).then(svgs => {
                    svgs[0].classList.add("framework-header-buttons-main");
                    button.append(svgs[0]); // standard icon
                    if (svgs.length >= 2) { // alternate icon
                        svgs[1].classList.add("framework-header-buttons-alt");
                        button.append(svgs[1]);
                    }
                    for (const svg of svgs) {
                        svg.style.width = options?.size ?? defOptions.size;
                        svg.style.height = options?.size ?? defOptions.size;
                    }
                });
                this.headerButtons[type] = button;
                switch (type) {
                    case "close":
                        button.addEventListener("click", this.close.bind(this));
                        break;
                    case "collapse":
                        button.addEventListener("click", this.minimize.bind(this));
                        break;
                    case "maximize":
                        button.addEventListener("click", this.maximize.bind(this));
                        break;
                }
            }
        }
        if (options?.draggable?.hasOwnProperty("scrollX"))
            this.draggableInfo.scrollX = options.draggable.scrollX;
        if (options?.draggable?.hasOwnProperty("scrollY"))
            this.draggableInfo.scrollY = options.draggable.scrollY;
        title.append(buttons);
        this.acceptableMouseButtons = options?.acceptableMouseButtons ?? [];
        title.addEventListener("mouseenter", this.showButtons.bind(this));
        title.addEventListener("mouseleave", this.hideButtons.bind(this));
        titleEnd.addEventListener("mouseenter", this.showButtons.bind(this));
        titleEnd.addEventListener("mouseleave", this.hideButtons.bind(this));
        this.contextmenus.header.listener.on("click", (item) => {
            switch (item.value) {
                case "close":
                    this.close();
                    break;
                case "collapse":
                    const isMinimized = this.minimize();
                    this.contextmenus.header.getSection(0).getItem("collapse").name = isMinimized ? "expand" : "collapse";
                    this.contextmenus.header.getSection(0).getItem("collapse").icon = isMinimized ? "icons.plus" : "icons.minus";
                    break;
            }
        });
        this.body = body;
        this.body.classList.add("framework-draggable-widget-bodies");
        this.body.append(content);
        this.body.style.background = options?.bodyBackground ?? "";
        if (this.resizeData.dragEl)
            this.body.append(this.resizeData.dragEl);
        body.style.height = bodyHeight ?? "";
        body.style.background = bodyBackground ?? "";
        if (options?.hideOnInactivity ?? false)
            this.container.classList.add("framework-widgets-hide-on-inactive");
        this.container.append(this.body);
        if (!(header.show ?? true)) {
            this.container.classList.add("draggable-widget-headerless");
        }
        this.addons.appendTo(this.body);
    }
    setZoom(z) {
        super.setZoom(z); // just in case this is eventually implemented in parent class
        this.draggable?.setZoom(z);
    }
    attachTo(scene, id) {
        super.attachTo(scene, id);
        if (!this.draggable) {
            if (this.doDragAll) {
                this.draggable = new Draggable({
                    viewport: scene.element,
                    element: [
                        this.header.querySelector(".framework-draggable-widget-titles"),
                        this.header.querySelector(".framework-draggable-widget-title-ends"),
                        this.body
                    ],
                    periphery: [],
                    zoomable: false,
                    blockScroll: false,
                    input: {
                        acceptableMouseButtons: this.acceptableMouseButtons
                    },
                    scrollX: this.draggableInfo.scrollX,
                    scrollY: this.draggableInfo.scrollY
                });
            }
            else {
                this.draggable = new Draggable({
                    viewport: scene.element,
                    element: [
                        this.header.querySelector(".framework-draggable-widget-titles"),
                        this.header.querySelector(".framework-draggable-widget-title-ends")
                    ],
                    periphery: [this.body],
                    zoomable: false,
                    blockScroll: false,
                    input: {
                        acceptableMouseButtons: this.acceptableMouseButtons
                    },
                    scrollX: this.draggableInfo.scrollX,
                    scrollY: this.draggableInfo.scrollY
                });
            }
            this.draggable.offsetBy(this.pos.getPosComponent("x"), this.pos.getPosComponent("y"));
            this.draggable.listener.on("dragInit", this.dragInit.bind(this));
            this.draggable.listener.on("drag", this.drag.bind(this));
            this.draggable.listener.on("dragEnd", this.dragEnd.bind(this));
            this.draggable.listener.on("selected", () => { this._scene.layers.moveToTop(this); });
            this.trackDraggables(this.draggable);
        }
        else
            this.draggable.changeViewport(scene.element);
    }
    dragInit() {
        if (this.doCursorDrag)
            this.header.classList.add("dragging");
        GlobalSingleUseWidget.unbuildType("contextmenu");
    }
    dragEnd() {
        if (this.doCursorDrag)
            this.header.classList.remove("dragging");
    }
    drag(d) {
        this.pos.offsetPos({
            x: -d.delta.x,
            y: d.delta.y
        });
        this._scene?.updateIndividualWidget(this);
    }
    /**
     * call to toggle the minimized state of the widget
     * @returns if element is currently minimized
     */
    minimize() {
        this.body.classList.toggle("draggable-widget-minimize");
        this.headerButtons.collapse?.classList.toggle("framework-draggable-widget-button-alts");
        if (this.body.classList.contains("draggable-widget-minimize")) {
            if (this.container.classList.contains("draggable-widget-fullscreen"))
                this.maximize(); // unmaximize if maximized
            this.showButtons();
            if (this.minimizeTimeout != null)
                return; // timeout already in progress
            this.minimizeTimeout = setTimeout(() => {
                this.el.classList.add("is-minimized");
                this.minimizeTimeout = null;
                // this.updatePositionOnResize();
            }, 300);
            return true;
        }
        else {
            if (this.minimizeTimeout != null) { // timeout in progress
                clearTimeout(this.minimizeTimeout);
                this.minimizeTimeout = null;
            }
            this.el.classList.remove("is-minimized");
            return false;
        }
    }
    close() {
        if (this.isClosing)
            return; // don't interrupt process
        this.headerButtons.close?.classList.add("framework-draggable-widget-button-alts");
        if (this.body.classList.contains("draggable-widget-minimize")) {
            this.header.classList.add("draggable-widget-close");
            setTimeout(() => {
                this.detachFrom(this._scene);
            }, 100);
        }
        else {
            this.minimize(); // minimizing animation first
            setTimeout(() => {
                this.detachFrom(this._scene);
            }, 400);
            setTimeout(() => {
                this.header.classList.add("draggable-widget-close");
            }, 200);
        }
        this.isClosing = true;
    }
    maximize() {
        if (this.isExpanding)
            return; // don't do anything while expanding
        this.isExpanding = true;
        // going to expand, and height not yet set
        if (!this.container.classList.contains("draggable-widget-fullscreen") && this.element.style.height == "") {
            this.element.style.height = `${this.element.clientHeight}px`; // set height for nice animation
            this.element.classList.add("draggable-autoset-height");
            this.element.clientHeight; // trigger CSS reflow
        }
        this.container.classList.toggle("draggable-widget-fullscreen");
        this.headerButtons.maximize?.classList.toggle("framework-draggable-widget-button-alts");
        if (this.container.classList.contains("draggable-widget-fullscreen")) {
            if (this.body.classList.contains("draggable-widget-minimize"))
                this.minimize(); // unminimize if minimized
            this.draggable.disable();
            setTimeout(() => {
                this.isExpanding = false;
            }, 200);
        }
        else {
            this.container.classList.add("draggable-widget-fullscreen-exit"); // retain transitions while unexpanding
            setTimeout(() => {
                this.draggable.enable();
                this.isExpanding = false;
                this.container.classList.remove("draggable-widget-fullscreen-exit"); // remove fancy transitions
                if (this.element.classList.contains("draggable-autoset-height")) { // height set automatically by expanding; remove this
                    this.element.classList.remove("draggable-autoset-height");
                    this.element.style.height = ""; // reset to original
                }
            }, 200);
        }
    }
    get isFullScreen() { return this.container.classList.contains("draggable-widget-fullscreen"); }
    get isMovementExempt() { return super.isMovementExempt || this.isFullScreen; }
    showButtons() {
        if (this.buttonHideTimeout != null) { // stop timeout
            clearTimeout(this.buttonHideTimeout);
            this.buttonHideTimeout = null;
        }
        const title = this.header.querySelector(".framework-draggable-widget-titles");
        if (title.classList.contains("show-buttons"))
            return; // already shown
        title.classList.add("show-buttons");
        const toPad = title.querySelector(".framework-draggable-widget-button-holder").offsetWidth;
        const oldPad = +title.style.paddingRight.replace("px", "") || 0;
        title.style.paddingRight = `${toPad + oldPad + 10}px`;
    }
    hideButtons() {
        if (this.buttonHideTimeout != null) { // already working on hide
            this.buttonHideTimeout = null;
            return;
        }
        this.buttonHideTimeout = setTimeout(() => {
            this.buttonHideTimeout = null;
            if (this.body.classList.contains("draggable-widget-minimize"))
                return; // minimized, so keep
            const title = this.header.querySelector(".framework-draggable-widget-titles");
            title.classList.remove("show-buttons");
            title.style.paddingRight = ""; // remove bespoke styling
        }, 500);
    }
    updateButtonColor(button, type, set) {
        button.style.background = this.buttonColors.get(type)[set].highlight;
        button.style.fill = this.buttonColors.get(type)[set].fill;
    }
    setTitle(title) {
        const titleEl = this.header.querySelector(".framework-draggable-widget-titles > .framework-draggable-widget-title-texts");
        if (titleEl)
            titleEl.textContent = title;
    }
    resetBounds() {
        this.body.style.width = "";
        this.body.style.height = "";
    }
}
//# sourceMappingURL=draggable-widget.js.map