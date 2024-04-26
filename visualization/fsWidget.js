import { ConnectorAddon } from "../framework/addons/connector.js";
import { DraggableWidget } from "../framework/widgets/draggable-widget.js";
import { Terminal } from "../terminal/terminal.js";
import { SimpleShell } from "../terminal/cmd.js"
import * as fs from "../terminal/modules/fs.js"
import * as global from "../terminal/modules/global.js"
import { WireCatenary } from "../framework/widgets/wire/catenary.js";

function connValidator(dir1, dir2) {
  dir1 = dir1.split("#")[0];
  dir2 = dir2.split("#")[0];
  return (dir1 == "input" && dir2 == "output") || (dir1 == "output" && dir2 == "input") || (dir1 == "omni") || (dir2 == "omni");
}

export class FSWidget extends DraggableWidget {
  constructor() {
    const content = document.createElement("div");
    content.classList.add("fs-terminal-content");
    content.addEventListener("wheel", (e) => { e.stopPropagation(); });

    super({
      content,
      name: "fs-terminal",
      header: {
        title: "FS Terminal",
        buttons: {
          maximize: {
            show: true
          }
        }
      },
      style: {
        width: "150px",
        height: "150px"
      },
      addons: {
        input: {
          side: "left",
          addon: new ConnectorAddon({
            type: "data",
            direction: "input",
            positioning: 0.5,
            validator: connValidator,
            wireData: {
              type: WireCatenary
            }
          })
        },
        output: {
          side: "right",
          addon: new ConnectorAddon({
            type: "data",
            direction: "output",
            positioning: 0.5,
            validator: connValidator,
            wireData: {
              type: WireCatenary
            }
          })
        }
      },
      resize: "both"
    });

    this.module = {
      "ls": {
        execute: this.lsExecute.bind(this)
      },
      "cat": {
        args: {
          "filename": "file to read"
        },
        execute: this.catExecute.bind(this)
      },
      "write": {
        args: {
          "name": "file name"
        },
        execute: this.saveExecute.bind(this)
      },
      "rm": {
        args: {
          "name": "file name"
        },
        execute: this.rmExecute.bind(this)
      }
    }

    this.terminal = new Terminal("FS-Terminal", content);
    this.shell = new SimpleShell(this.terminal, "D");

    this.shell.addModule("", global.module);
    this.shell.addModule("", fs.module);
    this.shell.addModule("box", this.module);
    
    this.shell.runInit();
    this.resolve = null;
    this.reject = null;

    this.addons.get("input").sender.on("receive", (data) => {
      if (data.var || !this.resolve) return;
      
      const strData = data.value.map(code => String.fromCharCode(code)).join("").replace(/\r/g, ""); // remove the worst character
      switch (data.key) {
        case "ls":
          this.resolve(strData);
          break;
        case "rm":
          if (strData[0] == "G") this.resolve(strData.substring(1));
          else this.reject("Unable to remove file");
          break;
        case "cat":
          if (strData[0] == "G") this.resolve(strData.substring(1));
          else this.reject("Unable to find file");
          break;
        case "write":
          if (strData[0] == "G") this.resolve(strData.substring(1));
          else this.reject("Unable to write new file");
          break;
        default: // invalid command
          return;
      }

      this.resolve = null;
      this.reject = null;
    });
  }

  lsExecute(command, terminal, input = "") {
    return new Promise((resolve,reject) => {
      this.resolve = resolve;
      this.reject = reject;
      
      this.resolve = resolve;
      this.addons.get("output").sender.trigger("send", "l");
    });
  }

  catExecute(command, terminal, input = "") {
    return new Promise((resolve,reject) => {
      this.resolve = resolve;
      this.reject = reject;
      this.addons.get("output").sender.trigger("send", `c${command.args.get("filename").replace(/ /g, "")} `);
    });
  }

  saveExecute(command, terminal, input = "") {
    return new Promise((resolve,reject) => {
      this.resolve = resolve;
      this.reject = reject;
      // this.addons.get("output").sender.trigger("send", `c${command.args.get("filename").replace(/ /g, "")} `);
    });
  }

  rmExecute(command, terminal, input = "") {
    return new Promise((resolve,reject) => {
      this.resolve = resolve;
      this.reject = reject;
      this.addons.get("output").sender.trigger("send", `r${command.args.get("filename").replace(/ /g, "")} `);
    });
  }
}