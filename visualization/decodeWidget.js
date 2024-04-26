import { ConnectorAddon } from "../framework/addons/connector.js";
import { DraggableWidget } from "../framework/widgets/draggable-widget.js";
import { WireCatenary } from "../framework/widgets/wire/catenary.js";

function connValidator(dir1, dir2) {
  dir1 = dir1.split("#")[0];
  dir2 = dir2.split("#")[0];
  return (dir1 == "input" && dir2 == "output") || (dir1 == "output" && dir2 == "input") || (dir1 == "omni") || (dir2 == "omni");
}

export class BoxDecode extends DraggableWidget {
  constructor() {
    super({
      content: document.createElement("div"),
      name: "box-decode",
      header: {
        show: false
      },
      style: {
        width: "30px",
        height: "30px",
        background: "lightgrey"
      },
      addons: {
        response: {
          side: "left",
          addon: new ConnectorAddon({
            type: "data",
            direction: "input",
            positioning: 0.2,
            validator: connValidator
          })
        },
        command: {
          side: "left",
          addon: new ConnectorAddon({
            type: "data",
            direction: "input#2",
            positioning: 0.8,
            validator: connValidator
          })
        },
        output: {
          side: "right",
          addon: new ConnectorAddon({
            type: "data",
            direction: "output",
            positioning: 0.5,
            validator: connValidator
          })
        }
      },
      contextmenu: {
        body: {
          el: null,
          options: "clear/Clear/icons.trash"
        }
      },
      doDragAll: true
    });

    this.addons.get("response").sender.on("receive", this.accumulate.bind(this));
    this.addons.get("command").sender.on("receive", this.pushToCommandQueue.bind(this));

    this.cmdQueue = [];
    this.cmdIgnoreChars = []; // [char: number, limit: number][]

    this.consecutiveZeroes = 0;
    this.dataQueue = [];

    this.outputSender = this.addons.get("output").sender;

    this.contextmenus.body.listener.on("click", (item) => {
      switch (item.value) {
        case "clear":
          this.cmdQueue = [];
          this.cmdIgnoreChars = [];
          this.consecutiveZeroes = 0;
          this.dataQueue = [];
          break;
      }
    });
  }

  accumulate(data) {
    const workingData = Array.isArray(data) ? data.slice(0) : Array.from(data).map(char => char.charCodeAt(0));

    for (const charCode of workingData) {
      this.dataQueue.push(charCode);
      if (charCode == 0) this.consecutiveZeroes++;
      else this.consecutiveZeroes = 0;

      if (this.cmdQueue.length == 0) return; // data given without a command will be ignored
      const nextCmd = this.cmdQueue[0];


      if (nextCmd[0] > 0) { // waiting for a certain amount of bytes
        nextCmd[0]--;
        if (nextCmd[0] == 0) { // finished getting all bytes
          this.sendBuffer(nextCmd);
          this.cmdQueue.shift(); // remove cmd from queue
        }
      }
      else if (this.consecutiveZeroes >= -nextCmd[0]) { // waiting for a certain amount of consecutive null bytes
        this.sendBuffer(nextCmd);
        this.cmdQueue.shift(); // remove cmd from queue
      }
      else if (nextCmd[1] != "var" && nextCmd.length == 3) { // fail char
        if (charCode == nextCmd[2]) {
          nextCmd[0] = 0; // failed test, so ignore end condition
          this.sendBuffer(nextCmd);
          this.cmdQueue.shift();
        }
        else nextCmd.pop(); // remove fail char check
      }
    }
  }

  pushToCommandQueue(cmd) {
    const workingCmd = Array.isArray(cmd) ? cmd.slice(0) : Array.from(cmd).map(char => char.charCodeAt(0));

    while (workingCmd.length > 0) {
      if (this.cmdIgnoreChars.length == 0) this.interpretCommand(workingCmd);
      else this.ignoreCmdChars(workingCmd);
    }
  }

  interpretCommand(workingCmd) {
    const charCode = workingCmd[0];
    const char = String.fromCharCode(charCode);

    if (charCode >= 65 && charCode <= 90) {
      this.cmdQueue.push([4, "var", char]);
      workingCmd.shift();
      return;
    }
    
    switch (char) {
      case 'l': // ls
        this.cmdQueue.push([-1, "ls"]); // wait for null byte
        break;
      case 'c': // cat 
        this.cmdQueue.push([-5, "cat", 48]) // wait for 5 null bytes or fail on receiving 48 ('0')
        this.cmdIgnoreChars.push([32, 1 ]); // ignore until next space
        break;
      case 'r': // rm
        this.cmdQueue.push([1, "rm"]);
        this.cmdIgnoreChars.push([32, 1 ]); // ignore until next space
        break;
      case 'w': // write
        this.cmdQueue.push([1, "write"]);
        this.cmdIgnoreChars.push([0, 1]); // ignore until next null byte
        break;
      case 'm': // modify (returns nothing, but uses a character)
        this.cmdIgnoreChars.push([null, 1 ]); // ignore next char (doesn't matter hwat it is)
        break;
    }

    workingCmd.shift(); // get rid of command character
  }

  ignoreCmdChars(workingCmd) {
    const ignoreData = this.cmdIgnoreChars[0];
    if (ignoreData[1] <= 0) { // don't need to do anytthing
      this.cmdIgnoreChars.shift(); // get rid of command
      return;
    }
    
    const char = ignoreData[0];
    let i = 0;
    for (; i < workingCmd.length; i++) {
      if (char != null && workingCmd[i] != char) continue;

      ignoreData[1]--;
      if (ignoreData[1] <= 0) {
        this.cmdIgnoreChars.shift(); // get rid of command
        break;
      }
    }
    workingCmd.splice(0,i+1); // remove as many characters as needed
  }

  sendBuffer(cmd) {
    if (cmd[0] < 0) this.dataQueue.splice(cmd[0], -cmd[0]); // slice some amount from the end of the buffer
    
    const toSend = {
      var: false,
      key: null,
      value: null
    };
    if (cmd[1] == "var") { // need translation from 4 bytes to float
      let value = 0; // default for invalid floats
      if (this.dataQueue.length >= 4) {
        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);

        
        for (let i = 0; i < 4; i++) { view.setUint8(3-i, this.dataQueue[i]); } // fill buffer; bytes are apparently stored backwards...
        
        value = view.getFloat32();
      }

      toSend.var = true;
      toSend.key = cmd[2];
      toSend.value = value;
    }
    else { // simply send raw buffer
      toSend.key = cmd[1];
      toSend.value = this.dataQueue.slice();
    }
    this.outputSender.trigger("send", toSend);
    this.dataQueue.splice(0); // clear data
  }
}