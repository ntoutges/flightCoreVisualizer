import { Ids } from "./ids.js";
export class AttachableListener {
    listener = null;
    validator;
    ids = new Ids();
    attachmentConstructors = new Map();
    attachments = new Map(); // convert from local id to listener id
    constructor(validator) {
        this.validator = validator;
    }
    updateValidity() {
        const listener = this.validator();
        if (listener == this.listener)
            return;
        this.detachAllFromListener(); // remove from old listener
        this.listener = listener;
        this.attachAllToListener(); // attach to new listener
    }
    on(type, callback) {
        const id = this.ids.generateId();
        this.attachmentConstructors.set(id, { type, callback });
        this.attachToListener(id);
        return id;
    }
    off(id) {
        if (this.attachmentConstructors.has(id)) {
            this.detachFromListener(id);
            this.attachmentConstructors.delete(id);
            this.ids.releaseId(id);
            return true;
        }
        return false;
    }
    trigger(type, data) {
        if (this.listener)
            this.listener.trigger(type, data);
    }
    detachAllFromListener() {
        if (!this.listener)
            return;
        for (const localId of this.attachments.keys()) {
            this.detachFromListener(localId);
        }
    }
    detachFromListener(localId) {
        if (!this.listener || !this.attachments.has(localId))
            return;
        this.listener.off(this.attachments.get(localId));
        this.attachments.delete(localId);
    }
    attachAllToListener() {
        if (!this.listener)
            return;
        for (const localId of this.attachmentConstructors.keys()) {
            this.attachToListener(localId);
        }
    }
    attachToListener(localId) {
        if (!this.listener || !this.attachmentConstructors.has(localId) || this.attachments.has(localId))
            return;
        const { type, callback } = this.attachmentConstructors.get(localId);
        this.attachments.set(localId, this.listener.on(type, callback));
    }
}
//# sourceMappingURL=attachableListener.js.map