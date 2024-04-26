import { ConnectorAddon } from "../framework/addons/connector.js";
import { DraggableWidget } from "../framework/widgets/draggable-widget.js";
import * as THREE from "../threejs/build/three.module.js";
import { OrbitControls } from '../threejs/addons/controls/OrbitControls.js';

function connValidator(dir1, dir2) {
  dir1 = dir1.split("#")[0];
  dir2 = dir2.split("#")[0];
  return (dir1 == "input" && dir2 == "output") || (dir1 == "output" && dir2 == "input") || (dir1 == "omni") || (dir2 == "omni");
}

export class BoxViewWidget extends DraggableWidget {
  constructor() {
    const content = document.createElement("div");
    content.classList.add("box-view-content");
    content.addEventListener("wheel", (e) => { e.stopPropagation(); });

    super({
      content,
      name: "box-view",
      header: {
        title: "Box Viewer",
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
            validator: connValidator
          })
        }
      },
      resize: "both"
    });

    this.elListener.on("resize", () => {
      const width = content.offsetWidth;
      const height = content.offsetHeight;
      this.threeCamera.aspect = width / height;
      this.threeCamera.updateProjectionMatrix();
      this.threeRenderer.setSize(width,height);
    })

    this.threeCamera = new THREE.PerspectiveCamera(70, 1, 0.01, 100);
    this.threeCamera.position.z = 5; // Move the camera back to see the box

    this.threeRenderer = new THREE.WebGLRenderer({ antialias: true });
    this.threeRenderer.setSize(1,1); // defaults

    this.threeControls = new OrbitControls(this.threeCamera, this.threeRenderer.domElement);

    content.append(this.threeRenderer.domElement);

    this.threeScene = new THREE.Scene();
    
    // Ground plane
    const planeGeometry = new THREE.PlaneGeometry(10, 10); // Adjust size as needed
    const planeMaterial = new THREE.MeshBasicMaterial({ color: "darkgrey" });

    const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
    planeMesh.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    this.threeScene.add(planeMesh);

    planeMesh.position.y = -2;

    // Grid on top of the ground plane
    const gridHelper = new THREE.GridHelper(10, 10, 0xffffff, 0xffffff); // Adjust size and color as needed
    gridHelper.position.y = -2;
    this.threeScene.add(gridHelper);

    const boxBase = 5.5;
    const boxHeight = 3.25;

    // Dark grey box object
    const boxGeometry = new THREE.BoxGeometry(1, boxHeight/boxBase, 1);
    const boxMaterial = new THREE.MeshBasicMaterial({ color: "#353535" });
    this.demosatBox = new THREE.Mesh(boxGeometry, boxMaterial);
    this.threeScene.add(this.demosatBox);

    // Create edge geometry for outline
    const edgesGeometry = new THREE.EdgesGeometry(this.demosatBox.geometry);
    const outlineMaterial = new THREE.LineBasicMaterial({ color: "lightblue" });
    const outline = new THREE.LineSegments(edgesGeometry, outlineMaterial);
    this.demosatBox.add(outline);

    outline.position.copy(this.demosatBox.position); // Position the outline behind the box

    // Camera box
    const cameraGeometry = new THREE.BoxGeometry(1.25 / 5.5, 1.25 / 5.5, 1.25 / 5.5); // Adjust size as needed
    const cameraMaterial = new THREE.MeshBasicMaterial({ color: "#d38a8a" }); // Adjust color as needed
    const cameraBox = new THREE.Mesh(cameraGeometry, cameraMaterial);
    this.demosatBox.add(cameraBox);

    // Position the camera box relative to demosatBox
    cameraBox.position.copy(this.demosatBox.position); // Start from demosatBox position
    cameraBox.position.x = (-boxBase + 1.25) / (2*boxBase) + 0.05;
    cameraBox.position.y = (boxHeight - 1.25) / (2*boxBase) - 0.05;
    cameraBox.position.z = (boxBase - 1.25) / (2*boxBase) + 0.05;

    // flight cord
    const cylinderGeometry = new THREE.CylinderGeometry(0.5 / boxBase, 0.5 / boxBase, 2 * boxHeight / boxBase, 32);
    const cylinderMaterial = new THREE.MeshBasicMaterial({ color: "#f7ffcc" });
    const cylinderMesh = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    this.demosatBox.add(cylinderMesh);


    this.doRender = true;
    this.render();

    this.elListener.on("detach", () => { // closing
      this.doRender = false;
    });

    this.gravity = new THREE.Vector3(0,1,0);
    this.alignBoxWithGravity();
    
    this.addons.get("input").sender.on("receive", this.updateGravity.bind(this))
  }

  render() {
    if (!this.doRender) return;
    
    this.threeRenderer.render(
      this.threeScene,
      this.threeCamera
    );
    requestAnimationFrame(this.render.bind(this));
  }

  alignBoxWithGravity() {
    // Calculate the rotation quaternion to align the top face with the gravity direction
    const yAxis = new THREE.Vector3(0, 1, 0); // Define the local up direction
    const target = this.gravity.clone().normalize(); // Define the direction of gravity
    const quaternion = new THREE.Quaternion().setFromUnitVectors(yAxis, target);
  
    // Apply the rotation to the box
    this.demosatBox.setRotationFromQuaternion(quaternion);
  }
  

  updateGravity(data) {
    if (!data.var || !"XYZ".includes(data.key)) return; // invalid update

    // need to swap Y/Z, then X/Y
    switch (data.key) {
      case "Y":
        this.gravity.x = -data.value;
        break;
      case "X":
        this.gravity.z = -data.value;
        break;
      case "Z":
        this.gravity.y = data.value;
        break;
    }

    this.alignBoxWithGravity();
  }
}
