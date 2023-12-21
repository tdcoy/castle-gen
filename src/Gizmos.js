import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

export const gizmos = (() => {
  class DrawGizmos {
    constructor(scene) {
      this.scene = scene;
    }

    DrawLinesBetweenPoints(points, color, height) {
      const roomPoints = [];

      const material = new THREE.LineBasicMaterial({ color: color });

      for (let i = 0; i < points.length; i++) {
        for (let j = 1; j < points.length; j++) {
          roomPoints.push(new THREE.Vector3(points[i].x, height, points[i].y));
          roomPoints.push(new THREE.Vector3(points[j].x, height, points[j].y));
        }
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(roomPoints);
      const line = new THREE.Line(geometry, material);
      this.scene.add(line);
    }

    DrawShortestPath(points) {
      let linePoints = [];

      for (let i = 0; i < points.length; i++) {
        linePoints.push(new THREE.Vector3(points[i].x, 0, points[i].y));
      }

      linePoints.push(new THREE.Vector3(points[0].x, 0, points[0].y));

      const material = new THREE.LineBasicMaterial({ color: 0xf6ff00 });
      const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
      const line = new THREE.Line(geometry, material);
      this.scene.add(line);
    }

    DrawPoint(point, color, size) {
      const geometry = new THREE.SphereGeometry(size, 5, 2);
      const material = new THREE.MeshBasicMaterial({ color: color });
      const cube = new THREE.Mesh(geometry, material);
      this.scene.add(cube);
      cube.position.set(point.x, 0, point.y);
    }

    DrawBox(point, color, size) {
      const geometry = new THREE.BoxGeometry(size, size, size);
      const material = new THREE.MeshBasicMaterial({ color: color });
      const cube = new THREE.Mesh(geometry, material);
      this.scene.add(cube);
      cube.position.set(point.x, 0, point.y);
    }
  }

  return { DrawGizmos: DrawGizmos };
})();
