import { ConnectorAddon } from "../addons/connector.js";
import { DraggableWidget } from "./draggable-widget.js";
export class ConnWidget extends DraggableWidget {
    channel;
    constructor(channel) {
        super({
            content: document.createElement("div"),
            name: "conn",
            header: {
                title: "Conn"
            },
            addons: {
                "input": {
                    addon: new ConnectorAddon({
                        type: "data",
                        direction: "input",
                        positioning: 0.5,
                    }),
                    side: "left"
                },
                "output": {
                    addon: new ConnectorAddon({
                        type: "data",
                        direction: "output",
                        positioning: 0.5,
                    }),
                    side: "right"
                }
            },
            style: {
                width: "100px",
                height: "50px"
            },
            doDragAll: true
        });
        this.channel = channel;
        this.addons.get("input").sender.on("receive", (data) => {
            this.channel.broadcast(data);
        });
        this.channel.listener.on("message", (data) => {
            this.addons.get("output").sender.trigger("send", data.req.data);
        });
    }
}
export class ConnDisplay extends DraggableWidget {
    constructor() {
        const content = document.createElement("div");
        content.style.padding = "2px";
        content.style.background = "white";
        content.style.border = "1px black solid";
        super({
            content,
            name: "conn-display",
            header: {
                title: "Connection Display"
            },
            style: {
                width: "200px",
                height: "50px"
            },
            doDragAll: true,
            addons: {
                "input": {
                    addon: new ConnectorAddon({
                        type: "data",
                        direction: "input",
                        positioning: 0.5,
                    }),
                    side: "left"
                }
            },
        });
        this.addons.get("input").sender.on("receive", (data) => { content.innerText = data; });
    }
}
export class ConnInput extends DraggableWidget {
    constructor() {
        const content = document.createElement("div");
        const input = document.createElement("input");
        const button = document.createElement("button");
        button.innerText = "Send!";
        content.append(input, button);
        input.addEventListener("mousedown", (e) => e.stopPropagation());
        super({
            content,
            name: "conn-display",
            header: {
                title: "Connection Input"
            },
            style: {
                width: "200px",
                height: "50px"
            },
            doDragAll: true,
            addons: {
                "output": {
                    addon: new ConnectorAddon({
                        type: "data",
                        direction: "output",
                        positioning: 0.5,
                    }),
                    side: "right"
                }
            },
        });
        button.addEventListener("click", () => {
            this.addons.get("output").sender.trigger("send", input.value);
        });
    }
}
//# sourceMappingURL=connWidget2.js.map