import { ConnectorAddon } from "../framework/addons/connector.js";
import { DraggableWidget } from "../framework/widgets/draggable-widget.js";
import { SmartInterval } from "../framework/smartInterval.js";

function connValidator(dir1, dir2) {
  dir1 = dir1.split("#")[0];
  dir2 = dir2.split("#")[0];
  return (dir1 == "input" && dir2 == "output") || (dir1 == "output" && dir2 == "input") || (dir1 == "omni") || (dir2 == "omni");
}

export class VarQuery extends DraggableWidget {
  constructor(defaultString="", speed=500) {
    const content = document.createElement("div");
    content.classList.add("var-query-content");

    super({
      content,
      name: "var-query",
      header: {
        title: "Var Query"
      },
      addons: {
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
      doDragAll: true
    });

    this.isIntervalPaused = true;

    this.messageSender = this.addons.get("output").sender;
    this.interval = new SmartInterval(this.sendMessage.bind(this), 1000); // Default interval duration is 1000ms
    this.queryString = defaultString; // Initialize query string

    // Add an input field for the user to edit the query string
    const queryStringInput = document.createElement("input");
    queryStringInput.type = "text";
    queryStringInput.value = this.queryString; // Default value is empty
    queryStringInput.addEventListener("pointerdown", e => e.stopPropagation()); // stop draggable from stealing input
    queryStringInput.addEventListener("input", () => {
      this.setQueryString(queryStringInput.value);
    });

    // Add a label for the input field
    const queryStringLabel = document.createElement("label");
    queryStringLabel.textContent = "Query String: ";
    queryStringLabel.appendChild(queryStringInput);

    // Add the label and input field to the content
    content.appendChild(queryStringLabel);

    // Add an input field for the user to edit the interval duration
    const intervalInput = document.createElement("input");
    intervalInput.type = "number";
    intervalInput.min = 0;
    intervalInput.value = speed; // Default value is 1000ms
    intervalInput.addEventListener("pointerdown", e => e.stopPropagation()); // stop draggable from stealing input
    intervalInput.addEventListener("input", () => {
      this.setInterval(parseInt(intervalInput.value, 10));
    });
    this.pause();

    // Add a label for the input field
    const intervalLabel = document.createElement("label");
    intervalLabel.textContent = "Interval Duration (ms): ";
    intervalLabel.appendChild(intervalInput);

    // Add the label and input field to the content
    content.appendChild(intervalLabel);

    // Add a button to start and stop the interval
    const toggleButton = document.createElement("button");
    toggleButton.textContent = "Start";
    toggleButton.addEventListener("click", () => {
      if (!this.isIntervalPaused) {
        this.pause();
        toggleButton.textContent = "Start";
        this.isIntervalPaused = true;
      } else {
        this.play();
        toggleButton.textContent = "Stop";
        this.isIntervalPaused = false;
      }
    });

    content.appendChild(toggleButton);
  }

  sendMessage() {
    if (this.queryString) this.messageSender.trigger("send", this.queryString);
  }

  setQueryString(queryString) {
    this.queryString = queryString;
  }

  // Method to control interval
  play() {
    this.interval.play();
  }

  pause() {
    this.interval.pause();
  }

  setInterval(ms) {
    this.interval.setInterval(ms);
  }
}
