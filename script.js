const $ = document.querySelector.bind(document);
import { Scene } from "./framework/scene.js"
import { GridWidget } from "./framework/widgets/grid.js"
import { ConnConsole, ConnWidget } from "./framework/widgets/prefabs/connWidget.js"
import { ConnectorAddon } from "./framework/addons/connector.js";
import { BoxConnection } from "./visualization/serialWidget.js";
import { BoxDecode } from "./visualization/decodeWidget.js";
import { WireCatenary } from "./framework/widgets/wire/catenary.js";
import { VarViewer } from "./visualization/varViewer.js";
import { VarQuery } from "./visualization/varQuery.js";
import { FSWidget } from "./visualization/fsWidget.js";
import { BoxViewWidget } from "./visualization/boxWidget.js";

ConnectorAddon.setStyle("data", "input", { background: "white" });
ConnectorAddon.setStyle("data", "input#2", { background: "white", borderStyle: "dashed" });
ConnectorAddon.setStyle("data", "output", { background: "black" });
ConnectorAddon.setStyle("data", "omni", { background: "radial-gradient(black, black 50%, white 50%, white)" });

new Scene({
  parent: $("#sandbox"),
  widgets: [
    new GridWidget({
      doCursorDragIcon: true
    }),
    new ConnConsole({
      type: "data",
      validator: connValidator,
      wireData: {
        type: WireCatenary
      }
    }),
    new ConnConsole({
      type: "data",
      validator: connValidator,
      wireData: {
        type: WireCatenary
      }
    }),
    new ConnConsole({
      type: "data",
      validator: connValidator,
      wireData: {
        type: WireCatenary
      }
    }),
    new ConnConsole({
      type: "data",
      validator: connValidator,
      wireData: {
        type: WireCatenary
      }
    }),
    new BoxConnection({
      baud: 115200
    }),
    new BoxDecode({}),
    new VarViewer(
      {
        "X": "Acc_x",
        "Y": "Acc_y",
        "Z": "Acc_z",
        "A": "Altitude",
        "H": "Humidity",
        "E": "Temp Ext",
        "I": "Temp Int",
        "V": "Voltage",
        "D": "Geiger",
        "S": "SD_func"
      },
      {
        "A": { precision: 3, trailing: "m" },
        "H": { precision: 3, trailing: "%" },
        "V": { precision: 3, trailing: "v" },
        "E": { precision: 3, trailing: "°C" },
        "I": { precision: 3, trailing: "°C" }
      }
    ),
    new VarQuery("XYZAHEIVDS", 500),
    new VarQuery("XYZ", 100), // use on its own for BOOST mode with xyz visualizer
    new FSWidget(),
    new BoxViewWidget()
  ],
  doStartCentered: true
});

function connValidator(dir1, dir2) {
  dir1 = dir1.split("#")[0];
  dir2 = dir2.split("#")[0];
  return (dir1 == "input" && dir2 == "output") || (dir1 == "output" && dir2 == "input") || (dir1 == "omni") || (dir2 == "omni");
}

