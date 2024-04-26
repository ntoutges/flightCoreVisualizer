import { getSvg } from "../svg.js";
export class ContextMenuItem {
    _value;
    _name;
    _shortcut;
    _icon;
    listener = null;
    _iconStates = [];
    _state = 0;
    el = null;
    isEnabled = true;
    constructor({ value, name = value, shortcut = "", icon = "" }) {
        this._value = value;
        this._name = name;
        this._shortcut = shortcut;
        this._iconStates = Array.isArray(icon) ? (icon.length == 0 ? [""] : icon) : [icon];
        this._icon = this._iconStates[this._state];
    }
    setListener(listener) {
        this.listener = listener;
    }
    build() {
        this.el = document.createElement("div");
        this.el.classList.add("framework-contextmenu-items");
        const icon = document.createElement("div");
        icon.classList.add("framework-contextmenu-icons");
        if (this._icon) {
            getSvg(this._icon).then(svg => {
                icon.append(svg);
            });
        }
        this.el.append(icon);
        const name = document.createElement("div");
        name.innerText = this._name;
        name.classList.add("framework-contextmenu-names");
        this.el.append(name);
        const shortcut = document.createElement("div");
        shortcut.classList.add("framework-contextmenu-shortcuts");
        if (this._shortcut)
            shortcut.innerText = this._shortcut;
        this.el.append(shortcut);
        this.el.addEventListener("click", this.onclick.bind(this));
        this.el.addEventListener("mouseenter", this.onEvent.bind(this, "mouseenter"));
        this.el.addEventListener("mouseleave", this.onEvent.bind(this, "mouseleave"));
        this.updateEnabledState();
        return this.el;
    }
    unbuild() {
        const el = this.el;
        this.el = null;
        return el;
    }
    onEvent(type) {
        if (!this.listener || !this.isEnabled)
            return;
        this.listener.trigger(type, this);
    }
    get value() { return this._value; }
    get name() { return this._name; }
    get icon() { return this._icon; }
    get shortcut() { return this._shortcut; }
    get state() { return this._state; }
    get element() { return this.el; }
    set name(name) {
        let wasChange = name != this._name;
        this._name = name;
        if (wasChange)
            this.listener.trigger("change", this);
    }
    set icon(icon) {
        let wasChange = icon != this._icon;
        this._icon = icon;
        if (wasChange)
            this.listener.trigger("change", this);
    }
    set shortcut(shortcut) {
        let wasChange = shortcut != this._shortcut;
        this._shortcut = shortcut;
        if (wasChange)
            this.listener.trigger("change", this);
    }
    set state(state) {
        state %= this._iconStates.length;
        if (state < 0)
            state += this._iconStates.length;
        let wasChange = state != this.state;
        this._state = state;
        if (wasChange)
            this.icon = this._iconStates[this._state];
    }
    enable() {
        this.isEnabled = true;
        this.updateEnabledState();
    }
    disable() {
        this.isEnabled = false;
        this.updateEnabledState();
    }
    updateEnabledState() {
        if (!this.el)
            return; // no element to update
        if (this.isEnabled)
            this.el.classList.remove("framework-contextmenu-item-disabled");
        else
            this.el.classList.add("framework-contextmenu-item-disabled");
    }
    onclick() {
        this.state++; // move to next state
        this.onEvent("click");
    }
}
export class ContextMenuSection {
    items;
    _name;
    listener;
    element = null;
    constructor({ items, name = null }) {
        this.items = items;
        this._name = name;
    }
    setListener(listener) {
        this.listener = listener;
        this.items.forEach(item => { item.setListener(listener); });
    }
    addItem(item) {
        this.items.push(item);
        if (this.listener) {
            this.listener.trigger("add", item);
            item.setListener(this.listener);
        }
    }
    removeItem(value) {
        const item = this.getItem(value);
        if (item == null)
            return;
        const index = this.items.indexOf(item);
        item.unbuild()?.remove();
        this.items.splice(index, 1);
    }
    getItem(value) {
        if (typeof value == "number") { // given exact index
            if (value < 0)
                value += this.items.length;
            if (value >= 0 && value < this.items.length) {
                return this.items[value];
            }
            return null;
        }
        // given name
        for (const item of this.items) {
            if (item.value == value) {
                return item;
            }
        }
        return null;
    }
    build() {
        this.element = document.createElement("div");
        this.element.classList.add("framework-contextmenu-sections");
        const separator = document.createElement("div");
        separator.classList.add("framework-contextmenu-section-separators");
        this.element.append(separator);
        if (this.name != null) { // section is named
            const lineL = document.createElement("div");
            const lineR = document.createElement("div");
            const name = document.createElement("div");
            name.innerText = this.name;
            lineL.classList.add("framework-contextmenu-section-separator-lines");
            lineR.classList.add("framework-contextmenu-section-separator-lines");
            name.classList.add("framework-contextmenu-section-separator-names");
            separator.append(lineL, name, lineR);
        }
        for (const item of this.items) {
            this.element.append(item.build());
        }
        return this.element;
    }
    unbuild() {
        for (const item of this.items) {
            this.removeItem(item.value);
        }
        const el = this.element;
        this.element = null;
        return el;
    }
    get name() { return this._name; }
    size() { return this.items.length; }
}
//# sourceMappingURL=contextmenuItems.js.map