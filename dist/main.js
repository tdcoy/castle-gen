import { OrbitControls } from "https://unpkg.com/three@0.127.0/examples/jsm/controls/OrbitControls.js";
import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { physics } from "./src/Physics.js";
import { testing } from "./src/Testing.js";
import { gizmos } from "./src/Gizmos.js";

class Demo {
  constructor() {
    this.Init();
  }

  Init() {
    this.previousRAF = null;

    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;

    this.CreateScene();
    this.LoadLights();
    this.LoadSkyBox();

    this.RAF();

    const regionSize = 250;
    const radius = 5;
    const scale = regionSize / radius;

    this.controls.target.set(regionSize / 2, 0, regionSize / 2);
    this.controls.update();
    this.camera.position.set(0, regionSize, 0);

    let gizmo = new gizmos.DrawGizmos(this.scene);
    let test = new testing.TestBuilder(this.scene, gizmo);
  }

  CreateScene() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);
  }

  CreateNodes() {
    let particles = [];
    this.springs = [];
    let offset = 2;
    let k = 0.01;
    let damping = 0.91;

    /* restLength = the distance from the centers of the particles to its bounds + some offset 
     _______           _________
    |     d1|         |  d2     |
    |   .---|---------|----.    |
    |       | offset  |_________|
    |_______|         


    */

    let startRoom = new physics.BoundBox(
      this.scene,
      new THREE.Vector2(10, 20),
      new THREE.Vector2(0, 0),
      1
    );

    let smallRoom = new physics.BoundBox(
      this.scene,
      new THREE.Vector2(20, 20),
      startRoom.Position().add(new THREE.Vector2(20, 50)),
      1
    );

    let largeRoom = new physics.BoundBox(
      this.scene,
      new THREE.Vector2(40, 70),
      startRoom.Position().add(new THREE.Vector2(0, 40)),
      3
    );

    let s0 = new physics.Spring(startRoom, smallRoom, k, damping, offset);
    this.springs.push(s0);

    let s2 = new physics.Spring(largeRoom, smallRoom, k, damping, offset);
    this.springs.push(s2);

    let s1 = new physics.Spring(largeRoom, startRoom, k, damping, offset);
    this.springs.push(s1);
  }

  CalcRestLength(a, b) {}

  LoadLights() {
    let light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(-100, 100, 100);
    light.target.position.set(0, 0, 0);
    light.castShadow = true;
    light.shadow.bias = -0.001;
    light.shadow.mapSize.width = 4096;
    light.shadow.mapSize.height = 4096;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.left = 50;
    light.shadow.camera.right = -50;
    light.shadow.camera.top = 50;
    light.shadow.camera.bottom = -50;
    this.scene.add(light);

    light = new THREE.AmbientLight(0xffffff, 1);
    this.scene.add(light);
  }

  LoadSkyBox() {
    const skyBoxloader = new THREE.CubeTextureLoader();
    const skyBoxTexture = skyBoxloader.load([
      "./images/skybox/posx.jpg",
      "./images/skybox/negx.jpg",
      "./images/skybox/posy.jpg",
      "./images/skybox/negy.jpg",
      "./images/skybox/posz.jpg",
      "./images/skybox/negz.jpg",
    ]);
    this.scene.background = skyBoxTexture;
  }

  RAF() {
    requestAnimationFrame((t) => {
      if (this.previousRAF === null) {
        this.previousRAF = t;
      }

      this.RAF();

      this.Step(t - this.previousRAF);
      this.previousRAF = t;
    });
  }

  Step(timeElapsed) {
    const timeElapsedS = Math.min(1.0 / 30.0, timeElapsed * 0.001);

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

let App = null;

window.addEventListener("DOMContentLoaded", () => {
  App = new Demo();
});
