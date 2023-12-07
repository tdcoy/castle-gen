import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { poisson_disc_sampling } from "./PoissonDiscSampling.js";
import { delaunay_triangulation } from "./DelaunayTriangulation.js";
import { heaps_permutation } from "./Heaps.js";

export const testing = (() => {
  class TestBuilder {
    constructor(scene) {
      this.scene = scene;
      this.Init();
    }

    Init() {
      this.radius = 5;
      this.width = 200;
      this.height = 200;

      this.unBuiltRooms = [
        new GreatHall(),
        new Kitchen(),
        new Kitchen(),
        new Bottlery(),
        new Bottlery(),
        new Ward(),
        new Start(),
        new Start(),
        new Chapel(),
      ];

      let points = new poisson_disc_sampling.SpawnPoints().Init(
        this.radius,
        this.width,
        this.height,
        30
      );
      this.unUsedTriangles = new delaunay_triangulation.Triangulate().Init(
        points
      );

      this.rooms = [];
      this.towerRooms = [
        new Tower(),
        new Tower(),
        new Tower(),
        new Tower(),
        new Tower(),
        new Tower(),
        new Tower(),
        new Tower(),
      ];
      this.towerPoints = [];

      this.usedTriangles = [];
      this.availRoomSpawnPoints = [];
      this.curRoomSpawnPoints = [];

      this.GenerateCastle();

      //this.CreateMesh(this.unUsedTriangles, -5);
    }

    GenerateRoomSpawnPoints() {
      let roomSpawnPoints = new poisson_disc_sampling.SpawnPoints().Init(
        this.radius * 4,
        this.width,
        this.height,
        30
      );

      return roomSpawnPoints;
    }

    GenerateCastle() {
      let acceptedLayout = false;
      let pointsInside = [];

      while (!acceptedLayout) {
        let roomSpawnPoints = this.GenerateRoomSpawnPoints();
        this.availRoomSpawnPoints = roomSpawnPoints.slice();

        //Create towers
        for (let i = 0; i < this.towerRooms.length; i++) {
          this.GenerateRoom(this.towerRooms[i], this.availRoomSpawnPoints);
        }

        //Get shortest path to define the "walls"
        let pointPerms =
          new heaps_permutation.HeapsPermutation().generateRoutes(
            this.towerPoints
          );

        let shortestPath =
          new heaps_permutation.HeapsPermutation().findShortestPath(pointPerms);

        // Remove spawn points outside of these walls
        let acceptedPoint = false;
        let pointsInside = [];

        for (let i = 0; i < this.availRoomSpawnPoints.length; i++) {
          acceptedPoint = this.IsPointInPoly(
            shortestPath,
            this.availRoomSpawnPoints[i]
          );

          if (acceptedPoint) {
            pointsInside.push(this.availRoomSpawnPoints[i]);
          }
        }

        // Check that theere are enough spawn points for the all the rooms in the future
        if (pointsInside.length >= this.unBuiltRooms.length) {
          // Add Rooms
          for (let i = 0; i < this.unBuiltRooms.length; i++) {
            this.GenerateRoom(this.unBuiltRooms[i], pointsInside);
          }

          this.DrawShortestPath(shortestPath);
          acceptedLayout = true;
        } else {
          console.log("Not enough rooms");
        }
      }

      //this.DrawLinesBetweenPoints(pointsInside);
    }

    GenerateRoom(room, roomList) {
      // Get a spawn point from the available room spawn list
      let roomSpawnPoint = this.GetRoomSpawnPoint(roomList);
      if (roomSpawnPoint != undefined) {
        // Remove that spawn point from the avilable list
        this.RemoveItemFromList(roomSpawnPoint, roomList);
        // Add that spawn to the currently spawned list
        this.curRoomSpawnPoints.push(roomSpawnPoint);

        //If this is a tower, add to tower points
        if (room.type == "Tower") {
          this.towerPoints.push(roomSpawnPoint);
        }

        // Expand room
        this.ExpandFromPoint(roomSpawnPoint, room);
      } else {
        console.log("Spawn not found");
      }
    }

    // Returns a random index from the available room spawn points list
    GetRoomSpawnPoint(roomList) {
      let sample = Math.floor(Math.random() * roomList.length);
      let point = roomList[sample];
      let isAccepted = false;
      let numIterations = 0;

      while (!isAccepted) {
        sample = Math.floor(Math.random() * roomList.length);
        point = roomList[sample];

        // Accept this spawn point if nothing is there
        if (
          this.GetTriangleAtPoint(point, this.unUsedTriangles) ||
          numIterations >= 300
        ) {
          isAccepted = true;
        }
        numIterations++;
      }

      return point;
    }

    // Connects adjacent triangle based on a positon and size of a room
    ExpandFromPoint(point, room) {
      // **Initialize room**
      // Get the triangle that this point is contained in
      let seedTriIndex = this.GetTriangleAtPoint(point, this.unUsedTriangles);

      let seedTri = this.unUsedTriangles[seedTriIndex];
      room.triangles.push(seedTri);
      this.RemoveItemFromList(seedTri, this.unUsedTriangles);

      // Add any triangles adjacent un-used triangles to this rooms triangle list
      let adjTriangles = room.triangles[0].getAdjTriangles();

      for (let i = 0; i < adjTriangles.length; i++) {
        if (this.unUsedTriangles.includes(adjTriangles[i])) {
          room.triangles.push(adjTriangles[i]);
          //this.unUsedTriangles.splice(adjTriangles[i], 1);
          this.RemoveItemFromList(adjTriangles[i], this.unUsedTriangles);
        }
      }

      // Pick a random triangle in this rooms triangle list and repeat
      // until its the correct size, or ran a max number of iterations
      let isComplete = false;
      let numIterations = 0;

      while (!isComplete) {
        // Pick random triangle index from the rooms triangles
        seedTriIndex = Math.floor(Math.random() * room.triangles.length);

        // Add any triangles adjacent un-used triangles to this rooms triangle list
        let adjTriangles = room.triangles[seedTriIndex].getAdjTriangles();

        for (let i = 0; i < adjTriangles.length; i++) {
          if (this.unUsedTriangles.includes(adjTriangles[i])) {
            // Add this triangle to the rooms triangle list
            room.triangles.push(adjTriangles[i]);
            // Remove this triangle from the unUsed triangle list
            this.RemoveItemFromList(adjTriangles[i], this.unUsedTriangles);
          }
        }

        if (room.size <= room.triangles.length || numIterations > 300) {
          isComplete = true;
        }

        numIterations++;
      }

      let beforeTriNum = room.triangles.length;

      // Remove any outlier triangles
      let outlierTris = this.GetOutlierTris(room.triangles);
      while (outlierTris.length > 0) {
        for (let i = 0; i < outlierTris.length; i++) {
          // Add the triangle back to un-used list
          this.unUsedTriangles.push(outlierTris[i]);
          // Remove from room triangle list
          let index = room.triangles.indexOf(outlierTris[i]);
          room.triangles.splice(index, 1);
        }

        outlierTris = this.GetOutlierTris(room.triangles);
      }
      if (room.triangles.length == 0) {
        console.log("No triangles left");
      }
      this.CreateMesh(room.triangles, 1, room.color);
    }

    GetOutlierTris(triangles) {
      let outliers = [];

      //Remove any triangles that don't share 2 or more edges
      for (let i = 0; i < triangles.length; i++) {
        let adjCount = 0;
        let adjTris = triangles[i].getAdjTriangles();

        for (let j = 0; j < adjTris.length; j++) {
          if (triangles.includes(adjTris[j])) {
            adjCount++;
          }
        }

        if (adjCount < 2) {
          outliers.push(triangles[i]);
        }
      }

      return outliers;
    }

    GetTriangleAtPoint(point, triangles) {
      let acceptedSample = 0;
      let sampleVertex = new delaunay_triangulation.Vertex(point.x, point.y);

      //Find the triangle in triangles that the sample resides in
      for (let i = 0; i < triangles.length; i++) {
        if (triangles[i].inCircumCircle(sampleVertex)) {
          acceptedSample = i;
          break;
        }
      }

      return acceptedSample;
    }

    CreateMesh(triangles, offset, color) {
      let meshes = [];
      let meshColor = color;

      const texture = new THREE.TextureLoader().load(
        "images/textures/cobble_floor.jpg"
      );

      for (let i = 0; i < triangles.length; i++) {
        const geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([
          triangles[i].v0.x,
          0,
          triangles[i].v0.y,
          triangles[i].v1.x,
          0,
          triangles[i].v1.y,
          triangles[i].v2.x,
          0,
          triangles[i].v2.y,
        ]);

        const uvs = new Float32Array([0, 0, 0, 1, 1, 0]);
        const indices = [0, 1, 2, 0];
        const normals = [0, 0, 1];

        geometry.setIndex(indices);
        geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(vertices, 3)
        );
        geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
        geometry.setAttribute(
          "normal",
          new THREE.Float32BufferAttribute(normals, 3)
        );

        if (color == undefined) {
          meshColor = THREE.MathUtils.randInt(0, 0xffffff);
        }
        //meshColor = THREE.MathUtils.randInt(0, 0xffffff);
        const texture_material = new THREE.MeshBasicMaterial({ map: texture });

        const material = new THREE.MeshStandardMaterial({ color: meshColor });
        const mesh = new THREE.Mesh(geometry, material);
        this.scene.add(mesh);
        mesh.position.set(0, offset, 0);

        meshes.push(mesh);
      }

      return meshes;
    }

    DrawLinesBetweenPoints(points) {
      const roomPoints = [];

      const material = new THREE.LineBasicMaterial({ color: 0x0000ff });

      for (let i = 0; i < points.length; i++) {
        //create a blue LineBasicMaterial

        for (let j = 0; j < points.length; j++) {
          roomPoints.push(new THREE.Vector3(points[i].x, -5, points[i].y));
          roomPoints.push(new THREE.Vector3(points[j].x, -5, points[j].y));
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

    RemoveItemFromList(item, list) {
      let index = list.indexOf(item);
      list.splice(index, 1);
    }

    IsPointInPoly(poly, pt) {
      for (var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
        ((poly[i].y <= pt.y && pt.y < poly[j].y) ||
          (poly[j].y <= pt.y && pt.y < poly[i].y)) &&
          pt.x <
            ((poly[j].x - poly[i].x) * (pt.y - poly[i].y)) /
              (poly[j].y - poly[i].y) +
              poly[i].x &&
          (c = !c);
      return c;
    }
  }

  class Room {
    constructor() {
      this.triangles = [];
      this.type = "";
      this.minBuildDist = 0;
      this.center = new THREE.Vector2(0, 0);
    }

    addTriangles(t) {
      for (let i = 0; i < t.length; i++) {
        this.triangles.push(t[i]);
      }
    }

    addTriangle(t) {
      this.triangles.push(t);
    }

    setCenter(v) {
      this.center = new THREE.Vector2(v.x, v.y);
    }

    size() {
      return this.size;
    }

    triangles() {
      return this.triangles;
    }

    type() {
      return this.type;
    }

    center() {
      return this.center();
    }

    minBuildDist() {
      return this.minBuildDist;
    }
  }

  class Start extends Room {
    constructor() {
      super();
      this.size = 10;
      this.type = "Start";
      this.color = new THREE.Color(0xd7f542);
    }
  }

  class Kitchen extends Room {
    constructor() {
      super();
      this.size = 45;
      this.type = "Kitchen";
      this.color = new THREE.Color(0xf2bb24);
    }
  }

  class Bottlery extends Room {
    constructor() {
      super();
      this.size = 25;
      this.type = "Bottlery";
      this.color = new THREE.Color(0xd19f17);
    }
  }

  class Ward extends Room {
    constructor() {
      super();
      this.size = 150;
      this.type = "Ward";
      this.color = new THREE.Color(0x25b33f);
    }
  }

  class GreatHall extends Room {
    constructor() {
      super();
      this.size = 100;
      this.type = "GreatHall";
      this.color = new THREE.Color(0xc41a30);
    }
  }

  class Chapel extends Room {
    constructor() {
      super();
      this.size = 75;
      this.type = "Chapel";
      this.color = new THREE.Color(0xd44468);
    }
  }

  class Tower extends Room {
    constructor() {
      super();
      this.size = 20;
      this.type = "Tower";
      this.minBuildDist = this.size * 5;
      this.color = new THREE.Color(0x4287f5);
    }
  }

  return { TestBuilder: TestBuilder };
})();
