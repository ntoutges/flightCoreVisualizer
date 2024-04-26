import { Ids } from "./ids.js";
export class Group {
    groupsMap = new Map(); // converts from group member to index in groups
    groups = new Map(); // converts from index to group
    data = new Map();
    ids = new Ids();
    add(...elements) {
        const toCombine = new Set();
        const groupData = []; // will be filled with elements that don't already exist in a group
        // check if element already exists in group
        // if so, note it so they can combine with current added group
        for (const element of elements) {
            if (this.groupsMap.has(element))
                toCombine.add(this.groupsMap.get(element));
            else
                groupData.push(element);
        }
        const id = this.ids.generateId(); // id to keep track of group
        toCombine.add(id);
        // create new group
        for (const element of groupData) {
            this.groupsMap.set(element, id);
        } // add elements to groupsMap
        this.groups.set(id, groupData);
        // combine anything that needs combinng
        this.combine(Array.from(toCombine));
    }
    get(element) {
        if (!this.groupsMap.has(element))
            return null; // element not in groups, so ignore
        const groupId = this.groupsMap.get(element);
        return this.groups.get(groupId); // get group that element is in
    }
    remove(element) {
        if (!this.groupsMap.has(element))
            return; // element not in groups, so ignore
        const groupId = this.groupsMap.get(element);
        const group = this.groups.get(groupId); // get group that element is in
        const index = group.indexOf(element);
        if (index == -1)
            return; // element didn't exist...
        group.splice(index, 1); // remove element from group
        this.groupsMap.delete(element); // remove reference to eleemnt
        if (group.length == 0) { // remove empty group
            this.groups.delete(groupId);
            this.ids.releaseId(groupId);
        }
    }
    setGroupData(element, data) {
        if (!this.groupsMap.has(element))
            return; // element not in groups, so ignore
        const groupId = this.groupsMap.get(element);
        this.data.set(groupId, data);
    }
    getGroupData(element) {
        if (!this.groupsMap.has(element))
            return null; // element not in groups, so ignore
        const groupId = this.groupsMap.get(element);
        return this.data.get(groupId) ?? null;
    }
    // DANGER: this function assumes all indices exist in [groups]
    combine(indicesToCombine) {
        if (indicesToCombine.length < 2)
            return; // cannot combine 0/1 groups
        const firstGroupId = indicesToCombine[0]; // keep track of first group--everything will be added into this
        const firstGroupData = this.groups.get(firstGroupId);
        for (let i = 1; i < indicesToCombine.length; i++) {
            const groupId = indicesToCombine[i];
            const elements = this.groups.get(groupId);
            for (const element of elements) {
                firstGroupData.push(element); // put element in new group
                this.groupsMap.set(element, firstGroupId); // say that element is in new group
            }
            this.groups.delete(groupId); // this group is now unreferenced
            this.ids.releaseId(groupId); // allow id to be reused
        }
    }
    forEach(callback) {
        let doBreak = false;
        const brk = () => { doBreak = true; };
        for (const [index, group] of this.groups) {
            const data = this.data.get(index) ?? null;
            callback(group, data, brk);
            if (doBreak)
                break;
        }
    }
    /**
     * @param group An element indicating the group to modify
     * @param callback The splitting function. If this returns true, the corresponding elemnet will be moved into itso wn group
     * @returns a pair, whose first element is an element from the original group, and the second element is of the newly formed group (if either group is emptied, the value is null)
     */
    split(element, callback) {
        if (!this.groupsMap.has(element))
            return; // element not in groups, so ignore
        const groupId = this.groupsMap.get(element);
        const group = this.groups.get(groupId);
        let originalGroupEl = null;
        let newGroupEl = null;
        const offshoots = [];
        for (const item of group) {
            if (callback(item)) {
                offshoots.push(item); // remember that 'item' should be moved to another group
                if (newGroupEl === null)
                    newGroupEl = item;
            }
            else if (originalGroupEl === null)
                originalGroupEl = item;
        }
        // check if all elements in group will stay together
        if (offshoots.length != 0 && offshoots.length != group.length)
            this.splitFromGroup(offshoots);
        return [originalGroupEl, newGroupEl];
    }
    // this function assumes all elements in offshoots are from the same group
    splitFromGroup(offshoots) {
        if (offshoots.length == 0)
            return; // nothing to offshoot
        const groupId = this.groupsMap.get(offshoots[0]);
        const group = this.groups.get(groupId);
        const newGroupId = this.ids.generateId();
        const newGroupData = offshoots.slice(); // create shallow copy
        for (const offshoot of offshoots) {
            this.groupsMap.set(offshoot, newGroupId); // indicate new location of offshoot
            const index = group.indexOf(offshoot);
            if (index == -1)
                continue; // just ignore
            group.splice(index, 1); // remove element
        }
        this.groups.set(newGroupId, newGroupData); // save new group
    }
    get size() { return this.groups.size; }
}
//# sourceMappingURL=group.js.map