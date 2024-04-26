import { Ids } from "./ids.js";
import { Listener } from "./listener.js";
export class ForwardListener extends Listener {
    listenerObjects = new Map();
    listenerObjectIds = new Ids();
    constructor() {
        super();
    }
    forwardListenerEvent(listener, type) {
        const listenerId = listener.on(type, this.trigger.bind(this, type));
        const id = this.listenerObjectIds.generateId();
        this.listenerObjects.set(id, { obj: listener, id: listenerId });
    }
    unforwardListenerEvent(id) {
        if (!this.listenerObjects.has(id))
            return;
        const data = this.listenerObjects.get(id);
        data.obj.off(data.id);
        this.listenerObjectIds.releaseId(id);
        this.listenerObjects.delete(id);
    }
}
//# sourceMappingURL=forwardListener.js.map