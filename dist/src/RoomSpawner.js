import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { physics } from "./Physics.js";
import { delaunay_triangulation } from "./DelaunayTriangulation.js";

export const room_spawner = (() => {
  class RoomSpawner {
    constructor(scene) {
      this.scene = scene;
      this.spawnedRooms = [];
      this.availableRooms = [];
      this.springs = [];

      this.offset = 2;
      this.k = 0.01;
      this.damping = 0.91;
    }

    AddRoom(size, pos, mass) {
      let newRoom = new Room(this.scene, size, pos, mass);
      this.spawnedRooms.push(newRoom);

      //Connect particle to other particles
      if (this.spawnedRooms.length == 2) {
        for (let i = 0; i < this.spawnedRooms.length - 1; i++) {
          //connect them
          let spring = new physics.Spring(
            this.spawnedRooms[i],
            this.spawnedRooms[i + 1],
            this.k,
            this.damping,
            this.offset
          );

          this.springs.push(spring);
        }
      }
      if (this.spawnedRooms.length > 2) {
        // triangulate rooms
        // loop thru each vertice of all the triangles adding springs between each vert
        // everytime a spring is added the restLengths need to be re-calculated of the previous springs
        this.CalcSprings();
      }
    }

    CalcSprings() {
      this.springs = [];
      let points = [];

      for (let i = 0; i < this.spawnedRooms.length; i++) {
        points.push(
          new THREE.Vector2(
            this.spawnedRooms[i].Position().x,
            this.spawnedRooms[i].Position().y
          )
        );
      }

      let triangles = new delaunay_triangulation.Triangulate().Init(points);

      if (triangles.length > 0) {
        //console.log(triangles[0].getVertices());
        for (let i = 0; i < triangles.length; i++) {
          let v0 = this.GetRoomAtPos(
            new THREE.Vector2(
              triangles[i].getVertices()[0].x,
              triangles[i].getVertices()[0].y
            )
          );

          let v1 = this.GetRoomAtPos(
            new THREE.Vector2(
              triangles[i].getVertices()[1].x,
              triangles[i].getVertices()[1].y
            )
          );

          let v2 = this.GetRoomAtPos(
            new THREE.Vector2(
              triangles[i].getVertices()[2].x,
              triangles[i].getVertices()[2].y
            )
          );

          let v0tov1 = new physics.Spring(
            v0,
            v1,
            this.k,
            this.damping,
            this.offset
          );
          this.springs.push(v0tov1);

          let v1tov2 = new physics.Spring(
            v1,
            v2,
            this.k,
            this.damping,
            this.offset
          );
          this.springs.push(v1tov2);

          let v2tov0 = new physics.Spring(
            v2,
            v0,
            this.k,
            this.damping,
            this.offset
          );
          this.springs.push(v2tov0);
        }
      }

      console.log(this.springs.length);
    }

    GetRoomAtPos(pos) {
      for (let i = 0; i < this.spawnedRooms.length; i++) {
        if (this.spawnedRooms[i].Position().equals(pos)) {
          return this.spawnedRooms[i];
        }
      }
    }

    Update() {
      for (let i = 0; i < this.springs.length; i++) {
        this.springs[i].Update();
      }
    }
  }

  class Room {
    constructor(scene, size, pos, mass) {
      this.scene = scene;
      this.size = size;
      this.pos = new THREE.Vector2(pos.x, pos.z);
      this.mass = mass;
      this.target = this.CreateMesh();
    }

    Position() {
      return this.pos;
    }

    Size() {
      return this.size;
    }

    Target() {
      return this.target;
    }

    Mass() {
      return this.mass;
    }

    CreateMesh() {
      let color = THREE.MathUtils.randInt(0, 0xffffff);
      const geometry = new THREE.BoxGeometry(this.size.x, 10, this.size.y);
      const material = new THREE.MeshBasicMaterial({ color: color });
      let box = new THREE.Mesh(geometry, material);
      this.scene.add(box);
      box.position.set(this.pos.x, 0, this.pos.y);
      return box;
    }
  }
  return { RoomSpawner: RoomSpawner };
})();
