import { Listener } from "./listener.js";
import { SmartInterval } from "./smartInterval.js";
export class FAnimation {
    interpolator;
    totalTicks;
    ticks = 0;
    listener = new Listener(); // animate internal, tick triggered externally
    interval = new SmartInterval(this.run.bind(this));
    vals = new Map();
    /**
     * @param time Length of time (ms) the animation will take
     * @param interpolator Takes in a number in the range [0,1]. The output should start at 0, and end on 1. Default is linear interpolation
     */
    constructor({ time = 1000, tStep = 100, interpolator = ((t) => t) }) {
        this.interpolator = interpolator;
        this.totalTicks = time / tStep;
        this.interval.setInterval(tStep);
        this.listener.on("tick", this.run.bind(this));
    }
    setValMovement(val, from, to) {
        this.vals.set(val, [from, to]);
    }
    setValStart(val, from) {
        if (!this.vals.has(val))
            this.vals.set(val, [from, 0]); // default value is 0
        else
            this.vals.get(val)[0] = from;
    }
    setValEnd(val, to) {
        if (!this.vals.has(val))
            this.vals.set(val, [0, to]); // default value is 0
        else
            this.vals.get(val)[1] = to;
    }
    start() {
        if (this.ticks >= this.totalTicks)
            return; // animation over
        this.interval.play();
    }
    stop() {
        this.interval.pause();
    }
    run() {
        if (this.ticks >= this.totalTicks) {
            if (this.ticks != this.totalTicks)
                this.sendAnimateGiven(1); // non-exact match // reached final 
            this.listener.trigger("stop", {});
            this.interval.pause(); // animation over
            return;
        }
        this.sendAnimateGiven(this.interpolator(this.ticks / this.totalTicks));
        this.ticks++;
    }
    sendAnimateGiven(interpolated) {
        const vals = {};
        for (const [val, [start, end]] of this.vals.entries()) {
            vals[val] = start + (end - start) * interpolated;
        }
        this.listener.trigger("animate", vals);
    }
}
//# sourceMappingURL=animation.js.map