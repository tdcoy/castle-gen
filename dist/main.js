import { OrbitControls } from "https://unpkg.com/three@0.127.0/examples/jsm/controls/OrbitControls.js";
import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

import { poisson_disc_sampling } from "./src/PoissonDiscSampling.js";
import { delaunay_triangulation } from "./src/DelaunayTriangulation.js";

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const controls = new OrbitControls(camera, renderer.domElement);

controls.enablePan = false;
controls.enableDamping = true;

function Init() {
  CreateScene();
  LoadLights();
  LoadSkyBox();

  const pointsRegion = 100;

  /* const points = new generate_points.GeneratePoints();
  points.Init(); */
  const points = new poisson_disc_sampling.SpawnPoints().Init(
    scene,
    10,
    pointsRegion,
    pointsRegion,
    30
  );

  const triangles = new delaunay_triangulation.Triangulate().Init(
    scene,
    points
  );

  controls.target.set(pointsRegion / 2, 0, pointsRegion / 2);
  controls.update();
  camera.position.set(0, pointsRegion, 0);
}

function CreateScene() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

function LoadLights() {
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
  scene.add(light);

  light = new THREE.AmbientLight(0xffffff, 1);
  scene.add(light);
}

function LoadSkyBox() {
  const skyBoxloader = new THREE.CubeTextureLoader();
  const skyBoxTexture = skyBoxloader.load([
    "./images/skybox/posx.jpg",
    "./images/skybox/negx.jpg",
    "./images/skybox/posy.jpg",
    "./images/skybox/negy.jpg",
    "./images/skybox/posz.jpg",
    "./images/skybox/negz.jpg",
  ]);
  scene.background = skyBoxTexture;
}

Init();
animate();
