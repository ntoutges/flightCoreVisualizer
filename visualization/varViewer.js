import { ConnectorAddon } from "../framework/addons/connector.js";
import { DraggableWidget } from "../framework/widgets/draggable-widget.js";

function connValidator(dir1, dir2) {
  dir1 = dir1.split("#")[0];
  dir2 = dir2.split("#")[0];
  return (dir1 == "input" && dir2 == "output") || (dir1 == "output" && dir2 == "input") || (dir1 == "omni") || (dir2 == "omni");
}

export class VarViewer extends DraggableWidget {
  constructor(fullNames = {}, formatOptions = {}) {
    const content = document.createElement("div");
    content.classList.add("var-viewer-content");
    
    super({
      content,
      name: "var-viewer",
      header: {
        title: "Var Viewer"
      },
      addons: {
        input: {
          side: "left",
          addon: new ConnectorAddon({
            type: "data",
            direction: "input",
            positioning: 0.5,
            validator: connValidator
          })
        }
      },
      doDragAll: true
    });

    this.variableElements = {}; // Object to store variable elements
    this.sortedVariableNames = []; // Array to store sorted variable names

    this.content = content; // Store content for later use
    this.addons.get("input").sender.on("receive", this.updateVar.bind(this));

    this.fullNames = fullNames; // Object to store full variable names
    this.formatOptions = formatOptions; // Object to store format options for variables
  }

  updateVar(data) {
    if (!data.var) return;
    const name = data.key;
    const value = data.value;

    // Check if variable with the same name exists
    if (this.variableElements.hasOwnProperty(name)) {
      // Update the existing variable element
      this.variableElements[name].querySelector(".variable-value").textContent = this.formatValue(value, name);
    } else {
      // Create a new element to display the variable
      const variableElement = document.createElement("div");
      variableElement.classList.add("variable");
      variableElement.innerHTML = `<span class="variable-name">${this.fullNames[name] || name}</span>: <span class="variable-value">${this.formatValue(value, name)}</span>`;

      // Store the variable element
      this.variableElements[name] = variableElement;
      this.sortedVariableNames.push(name); // Add name to sorted names array
      this.sortedVariableNames.sort(); // Sort the names alphabetically

      // Clear content before re-rendering variables
      this.content.innerHTML = "";

      // Append the variable elements to the content in sorted order
      this.sortedVariableNames.forEach((variableName) => {
        this.content.appendChild(this.variableElements[variableName]);
      });
    }
  }

  formatValue(value, name) {
    // Check if format options are provided for the variable
    if (this.formatOptions.hasOwnProperty(name)) {
      const { precision, trailing } = this.formatOptions[name];
      // Format the value based on precision and trailing character
      return value.toFixed(precision) + trailing;
    }
    return value; // Return the value as is if no format options are provided
  }
}
