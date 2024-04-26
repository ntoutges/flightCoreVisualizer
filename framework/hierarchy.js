export class FrameworkHierarchy {
    root;
    constructor(root) {
        if (root)
            this.root = root;
        else
            this.root = new Map();
    }
    getSubHierarchy(...path) {
        const head = this.getSubHead(path);
        return new FrameworkHierarchy(head); // maintain reference to this object
    }
    getChildren(...path) {
        let head = this.getSubHead(path);
        return Array.from(head.keys()); // convert itterator to array
    }
    // like getChildren, but for ALL levels
    traverse(callback) {
        let buffer = [this.root];
        while (buffer.length > 0) {
            let children = buffer.pop();
            for (const [obj, grandchildren] of children) {
                callback(obj);
                buffer.push(grandchildren);
            }
        }
    }
    getSubHead(path) {
        let head = this.root;
        for (const obj of path) {
            if (!head.has(obj))
                head.set(obj, new Map); // construct branch if it doesn't yet exist
            head = head.get(obj);
        }
        return head;
    }
}
//# sourceMappingURL=hierarchy.js.map