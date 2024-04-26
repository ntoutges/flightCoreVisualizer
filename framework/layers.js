// minimizes the used layers
export class Layers {
    layers = [];
    subLayers = new Map();
    callbacks = [];
    // by default, adds to top
    add(type, layerI = 0) {
        const exists = this.layers.indexOf(type) != -1;
        if (exists) { // already exists
            this.moveToTop(type);
            return;
        }
        let nextLayer = null;
        for (const key of this.subLayers.keys()) {
            if (key > layerI && (nextLayer == null || key < nextLayer)) {
                nextLayer = key;
            }
        }
        let index = this.layers.length;
        if (nextLayer != null) { // must push to specific location
            index = this.layers.indexOf(this.subLayers.get(nextLayer)[0]);
            this.layers.splice(index, 0, type);
        }
        else { // no layer after, push to end
            this.layers.push(type);
        }
        if (!this.subLayers.has(layerI))
            this.subLayers.set(layerI, []);
        const sublayer = this.subLayers.get(layerI);
        sublayer.push(type);
        this.doUpdateGlobal(index);
    }
    remove(type) {
        const [layerI, sublayerI, index] = this.getLayerData(type);
        if (index == -1)
            return;
        const sublayer = this.subLayers.get(layerI);
        this.layers.splice(index, 1);
        sublayer.splice(sublayerI, 1);
        if (sublayer.length == 0)
            this.subLayers.delete(layerI); // remove empty layer
        this.doUpdateGlobal(index);
    }
    // move to front of current layer
    setLayer(type, layerI) {
        this.remove(type); // remove from old
        this.add(type, layerI); // add to new
    }
    moveToTop(type) {
        const [layerI, sublayerI, index] = this.getLayerData(type);
        const sublayer = this.subLayers.get(layerI);
        if (index == -1 || sublayerI == sublayer.length - 1)
            return; // cannot move any further up
        const items = this.subLayers.get(layerI);
        const lastIndex = this.layers.indexOf(items[items.length - 1]);
        // remove
        this.layers.splice(index, 1);
        sublayer.splice(sublayerI, 1);
        // push to front 
        this.layers.splice(lastIndex, 0, type);
        sublayer.push(type);
        this.doUpdate(layerI, sublayerI);
    }
    moveToBottom(type) {
        const [layerI, sublayerI, index] = this.getLayerData(type);
        const sublayer = this.subLayers.get(layerI);
        if (index == -1 || sublayerI == 0)
            return; // cannot move any further down
        // remove
        this.layers.splice(index, 1);
        sublayer.splice(sublayerI, 1);
        // push to back 
        this.layers.splice(0, 0, type);
        sublayer.splice(0, 0, type);
        this.doUpdate(layerI, 0, sublayerI);
    }
    moveUp(type) {
        const [layerI, sublayerI, index] = this.getLayerData(type);
        const sublayer = this.subLayers.get(layerI);
        if (index == -1 || sublayerI == sublayer.length - 1)
            return; // cannot move any further up
        // remove
        this.layers.splice(index, 1);
        sublayer.splice(sublayerI, 1);
        // push to front 
        this.layers.splice(index + 1, 0, type);
        sublayer.splice(sublayerI + 1, 0, type);
        this.doUpdate(layerI, sublayerI, sublayerI + 1);
    }
    moveDown(type) {
        const [layerI, sublayerI, index] = this.getLayerData(type);
        const sublayer = this.subLayers.get(layerI);
        if (index == -1 || sublayerI == sublayer.length - 1)
            return; // cannot move any further up
        // remove
        this.layers.splice(index, 1);
        sublayer.splice(sublayerI, 1);
        // push to back 
        this.layers.splice(index - 1, 0, type);
        sublayer.splice(sublayerI - 1, 0, type);
        this.doUpdate(layerI, sublayerI - 1, sublayerI);
    }
    onMove(callback) {
        this.callbacks.push(callback);
    }
    doUpdate(sublayerI, startI, endI = null) {
        if (endI == null)
            endI = (this.subLayers.get(sublayerI)?.length - 1) ?? -1;
        const sublayer = this.subLayers.get(sublayerI);
        for (let i = startI; i <= endI; i++) {
            const type = sublayer[i];
            this.callbacks.forEach((callback) => {
                callback(type, i);
            });
        }
    }
    doUpdateGlobal(startI, endI = this.layers.length - 1) {
        for (let i = startI; i <= endI; i++) {
            const type = this.layers[i];
            this.callbacks.forEach((callback) => {
                callback(type, i);
            });
        }
    }
    getLayerData(type) {
        for (const [i, subLayer] of this.subLayers.entries()) {
            const index = subLayer.indexOf(type);
            if (index != -1) {
                return [
                    i,
                    index,
                    this.layers.indexOf(type) // this is the position of the [type] in global space
                ];
            }
        }
        return [-1, -1, -1];
    }
}
//# sourceMappingURL=layers.js.map