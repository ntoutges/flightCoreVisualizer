export class RevMap {
    forwards = new Map();
    backwards = new Map();
    get(key, fallback = null) { return this.forwards.get(key) ?? fallback; }
    revGet(key, fallback = null) { return this.backwards.get(key) ?? fallback; }
    has(key) { return this.forwards.has(key); }
    revHas(key) { return this.backwards.has(key); }
    delete(key) {
        if (!this.forwards.has(key))
            return false;
        this.backwards.delete(this.forwards.get(key));
        this.forwards.delete(key);
    }
    revDelete(key) {
        if (!this.backwards.has(key))
            return false;
        this.forwards.delete(this.backwards.get(key));
        this.backwards.delete(key);
    }
    set(key, val) {
        if (this.forwards.has(key))
            this.backwards.delete(this.forwards.get(key));
        if (this.backwards.has(val))
            this.forwards.delete(this.backwards.get(val));
        this.forwards.set(key, val);
        this.backwards.set(val, key);
    }
    keys() { return this.forwards.keys(); }
    values() { return this.forwards.values(); }
    forEach(callback) {
        this.forwards.forEach(callback);
    }
}
//# sourceMappingURL=revMap.js.map