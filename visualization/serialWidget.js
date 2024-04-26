import { ConnectorAddon } from "../framework/addons/connector.js";
import { DraggableWidget } from "../framework/widgets/draggable-widget.js";
import { WireCatenary } from "../framework/widgets/wire/catenary.js";

function connValidator(dir1, dir2) {
  dir1 = dir1.split("#")[0];
  dir2 = dir2.split("#")[0];
  return (dir1 == "input" && dir2 == "output") || (dir1 == "output" && dir2 == "input") || (dir1 == "omni") || (dir2 == "omni");
}

export class BoxConnection extends DraggableWidget {
  constructor({
    baud = 9600
  }) {
    const content = document.createElement("div");
    content.classList.add("box-connection-contents")

    super({
      name: "box-connection",
      content,
      header: {
        title: "Box Connection",
        buttons: {
          close: {
            show: false
          }
        }
      },
      addons: {
        "output": {
          side: "right",
          addon: new ConnectorAddon({
            type: "data",
            direction: "output",
            // wireData: {
            //   type: WireCatenary
            // },
            validator: connValidator
          })
        },
        "input": {
          side: "left",
          addon: new ConnectorAddon({
            type: "data",
            direction: "input",
            // wireData: {
            //   type: WireCatenary
            // },
            validator: connValidator
          })
        }
      },
      doDragAll: true
    });

    this.portId = null;
    this.port = null;
    this.reader = null;
    this.writer = null;

    this.encoder = new TextEncoder();
    
    this.baud = baud;

    this.connectButton = document.createElement("button");
    this.connectButton.textContent = "Connect";
    this.connectButton.classList.add("conn-button");

    this.baudInput = document.createElement("input");
    this.baudInput.value = this.baud;
    this.baudInput.placeholder = "Baud Rate";
    this.baudInput.type = "number";
    this.baudInput.classList.add("conn-baud");

    this.baudInput.addEventListener("pointerdown", (e) => { e.stopPropagation(); });
    this.baudInput.addEventListener("keydown", this.onBaudKey.bind(this));
    
    this.inputControls = document.createElement("div");
    this.inputControls.classList.add("conn-input-controls");
    this.inputControls.append(this.connectButton, this.baudInput);

    this.connectButton.addEventListener("click", this.connectPortMedium.bind(this));

    this.connectionPort = document.createElement("div");
    this.connectionPort.classList.add("conn-ports");

    this.connectionStatus = document.createElement("div");
    this.connectionStatus.classList.add("conn-status");

    content.append(this.inputControls, this.connectionPort, this.connectionStatus);

    this.addons.get("input").sender.on("receive", this.doSendMessage.bind(this));
  }

  connectPortMedium() {
    if (this.port) {
      this.unlockBaud();
      this.disconnectOldPort();
    }
    else {
      this.connectButton.textContent = "Connecting";
      this.connectNewPort().then((success) => {
        this.connectButton.textContent = success ? "Disconnect" : "Connect";
      });
    }
  }
  
  connectNewPort() {
    return new Promise((resolve) => {
      this.lockBaud();
      navigator.serial.requestPort({}).then(port => {
        this.disconnectOldPort();

        this.port = port;
        this.portId = port.getInfo().usbProductId;
        port.open({ baudRate: this.baud }).then(() => {
          this.reader = this.port.readable?.getReader();
          this.writer = this.port.writable?.getWriter();
          this.connectionPort.textContent = this.portId.toString(16).toUpperCase();
          this.connectionStatus.textContent = ""; // remove errror message
          this.doInitReceiveMessage();
          resolve(true);
        }).catch(err => {
          this.port = null;
          this.portId = null;
          this.connectionStatus.textContent = ""; // remove errror message
          this.connectionStatus.textContent = "Unable to open port";
          this.unlockBaud();
          resolve(false);
        });
      }).catch(err => {
        this.disconnectOldPort();
        this.connectionStatus.textContent = err.toString();
        this.unlockBaud();
        resolve(false);
      });
    });
  }

  async disconnectOldPort() {
    if (this.port) {
      if (this.reader) await this.reader.releaseLock();
      if (this.writer) await this.writer.releaseLock();
      await this.port.close();
      this.port = null;
      this.portId = null;
      this.reader = null;
      this.writer = null;
    }

    this.connectionPort.textContent = "";
    this.connectButton.textContent = "Connect";
  }

  onBaudKey(e) {
    if (e.key == "Enter") {
      const baud = parseInt(this.baudInput.value);
      if (!isNaN(baud) && baud > 0) this.baud = baud; // only set new baud if valid
      
      this.baudInput.value = this.baud; // change value to match formatting
      this.baudInput.blur(); // remove focus
    } 
    else if (e.key == "Escape") {
      this.baudInput.value = this.baud; // revert to old value
      this.baudInput.blur(); // remove focus
    }
  }

  lockBaud() { this.baudInput.disabled = true; }
  unlockBaud() { this.baudInput.disabled = false; }

  doSendMessage(message) {
    if (!this.writer) {
      this.connectionStatus.textContent = "No open writable port";
      return;
    }
    this.connectionStatus.textContent = "";
    
    if (Array.isArray(message)) message = new Uint8Array(message);
    else message = this.encoder.encode(message);

    this.writer.write(message).catch(err => {
      this.disconnectOldPort();
      this.connectionStatus.textContent = err.toString();
    });
  }

  async doInitReceiveMessage() {
    if (!this.reader) {
      this.connectionStatus.textContent = "Unable to find open readable port";
      return;
    }
    
    const outSend = this.addons.get("output").sender;
    try {
      while (true) {
        const { value, done } = await this.reader.read();
        if (done) break;

        outSend.trigger("send", Array.from(value));
      }
    }
    catch(err) {} // allow reader to gracefully exit
  }
}