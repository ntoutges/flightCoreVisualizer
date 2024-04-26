import { Listener } from "./listener.js";
export class Pos {
    dimensions = new Map();
    bounds = new Map();
    listener = new Listener();
    animation = null;
    constructor(data) {
        for (const component in data) {
            const dimData = data[component];
            if ("val" in dimData)
                this.dimensions.set(component, dimData.val);
            if ("min" in dimData || "max" in dimData) {
                const min = dimData.min ?? Number.MIN_VALUE;
                const max = dimData.max ?? Number.MAX_VALUE;
                this.bounds.set(component, [
                    Math.min(min, max),
                    Math.max(min, max)
                ]);
            }
        }
    }
    setPos(pos, stopAnimation = true) {
        for (const component in pos) {
            const [min, max] = this.bounds.has(component) ? this.bounds.get(component) : [-Number.MAX_VALUE, Number.MAX_VALUE];
            let newPos = Math.min(Math.max(pos[component], min), max);
            this.dimensions.set(component, newPos);
        }
        this.listener.trigger("set", this);
        if (stopAnimation && this.animation) { // sets current animation to null
            this.animation.stop();
            this.animation = null;
        }
    }
    offsetPos(pos) {
        Object.keys(pos).forEach((component) => {
            pos[component] += this.getPosComponent(component); // do offset
        });
        this.setPos(pos);
    }
    animatePos(animation = null, finalPos = {}) {
        if (this.animation)
            this.animation.stop(); // animation ongoing, delete it
        this.animation = animation;
        if (!this.animation)
            return; // no new animation
        // set start/end
        for (const dim in finalPos) {
            this.animation.setValEnd(dim, finalPos[dim]);
        }
        for (const dim in this.dimensions) {
            this.animation.setValStart(dim, this.dimensions[dim]);
        }
        this.animation.start(); // start new animation
        this.animation.listener.on("animate", (newPos) => { this.setPos(newPos, false); });
        this.animation.listener.on("stop", this.setPos.bind(this, finalPos, false));
    }
    getPosComponent(component) {
        if (this.dimensions.has(component))
            return this.dimensions.get(component);
        return 0; // default value
    }
    getPosData(components) {
        const data = {};
        for (const component of components) {
            data[component] = this.getPosComponent(component);
        }
        return data;
    }
    // [components] defines which components will actually be compared
    distanceToPos(other, components) {
        let total = 0;
        for (const component of components) {
            const diff = this.getPosComponent(component) - other.getPosComponent(component);
            total += diff * diff; // diff^2
        }
        return Math.sqrt(total);
    }
    distanceToGrid(grid, components) {
        const gridPos = grid.getPointAt(this, components);
        return this.distanceToPos(gridPos, components);
    }
}
export class Grid {
    gaps;
    offsets;
    constructor(gaps, offsets) {
        this.gaps = gaps;
        this.offsets = offsets;
    }
    setOffset(pos) {
        this.offsets.setPos(pos);
    }
    offsetBy(pos) {
        this.offsets.offsetPos(pos);
    }
    getPointAt(pos, components) {
        const data = {};
        for (const component of components) {
            const gap = this.gaps.getPosComponent(component);
            const offset = this.offsets.getPosComponent(component);
            data[component] = {
                val: ((pos.getPosComponent(component) - offset) / gap) * gap + offset
            };
        }
        return new Pos(data);
    }
}
export class SnapPos extends Pos {
    snapPoints = new Map();
    snapGrids = new Map();
    nextSnapId = 0;
    snapPoint = null;
    snapRadius;
    constructor(data, snapRadius = 10) {
        super(data);
        this.snapRadius = snapRadius;
    }
    addSnapPoint(pos) {
        const id = this.nextSnapId++;
        this.snapPoints.set(id, pos);
        return this.nextSnapId;
    }
    getSnapPoint(id) {
        return this.snapPoints.get(id) ?? null;
    }
    removeSnapPoint(id) {
        if (id instanceof Pos) {
            for (const pos of this.snapPoints.values()) {
                if (pos == id) {
                    id = pos;
                    break;
                }
            }
            if (id instanceof Pos)
                return false; // couldn't find id, so doesn't exist
        }
        return this.snapPoints.delete(id);
    }
    addSnapGrid(grid) {
        const id = this.nextSnapId++;
        this.snapGrids.set(id, grid);
        return this.nextSnapId;
    }
    getSnapGrid(id) {
        return this.snapGrids.get(id) ?? null;
    }
    removeSnapGrid(id) {
        if (id instanceof Grid) {
            for (const grid of this.snapGrids.values()) {
                if (grid == id) {
                    id = grid;
                    break;
                }
            }
            if (id instanceof Grid)
                return false; // couldn't find id, so doesn't exist
        }
        return this.snapPoints.delete(id);
    }
    addSnapObject(obj) {
        if (obj instanceof Grid)
            return this.addSnapGrid(obj);
        return this.addSnapPoint(obj);
    }
    getSnapObject(id) {
        return this.getSnapPoint(id) ?? this.getSnapGrid(id);
    }
    removeSnapObject(id) {
        if (id instanceof Pos)
            return this.removeSnapPoint(id);
        else if (id instanceof Grid)
            return this.removeSnapGrid(id);
        return this.removeSnapPoint(id) || this.removeSnapGrid(id);
    }
    setPos(pos, stopAnimation = true) {
        super.setPos(pos, stopAnimation);
        this.snapPoint = null; // prevent current snap point from interfering
        let minDist = Infinity;
        let minPos = null;
        const components = Object.keys(pos);
        // check snapPoints
        for (const point of this.snapPoints.values()) {
            const dist = this.distanceToPos(point, components);
            if (dist < minDist) {
                minDist = dist;
                minPos = point;
            }
        }
        // check snapGrids
        for (const grid of this.snapGrids.values()) {
            const point = grid.getPointAt(this, components);
            const dist = this.distanceToPos(point, components);
            if (dist < minDist) {
                minDist = dist;
                minPos = point;
            }
        }
        // only do snap if close enough
        if (minDist < this.snapRadius)
            this.snapPoint = minPos;
        else
            this.snapPoint = null;
    }
    // override
    getPosComponent(component) {
        if (this.snapPoint)
            return this.snapPoint.getPosComponent(component); // refer to snap point
        return super.getPosComponent(component); // else, refer to self
    }
}
//# sourceMappingURL=pos.js.map