import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { poisson_disc_sampling } from "./PoissonDiscSampling.js";
import { delaunay_triangulation } from "./DelaunayTriangulation.js";
import { heaps_permutation } from "./Heaps.js";

export const testing = (() => {
  const GrowType = Object.freeze({
    Circular: 0,
    Blob: 1,
    Cooridoor: 2,
    Rectangular: 3,
  });

  class TestBuilder {
    constructor(scene) {
      this.scene = scene;
      this.Init();
    }

    Init() {
      this.radius = 4;
      this.width = 200;
      this.height = 200;
      this.spawnPointRadius = this.radius * 3;

      let points = new poisson_disc_sampling.SpawnPoints().Init(
        this.radius,
        this.width,
        this.height,
        30
      );
      this.unUsedTriangles = new delaunay_triangulation.Triangulate().Init(
        points
      );

      this.unBuiltRooms = [];
      this.usedTriangles = [];
      this.availRoomSpawnPoints = [];
      this.shortestPath = [];

      this.GenerateCastle();
      //this.CreateMesh(this.unUsedTriangles, -5);
    }

    GenerateRoomSpawnPoints() {
      let roomSpawnPoints = new poisson_disc_sampling.SpawnPoints().Init(
        this.spawnPointRadius,
        this.width,
        this.height,
        30
      );

      //I have no idea why this has to be repeated
      roomSpawnPoints = this.RemoveSpawnPointsOutsideOfBounds(roomSpawnPoints);
      roomSpawnPoints = this.RemoveSpawnPointsOutsideOfBounds(roomSpawnPoints);
      roomSpawnPoints = this.RemoveSpawnPointsOutsideOfBounds(roomSpawnPoints);
      roomSpawnPoints = this.RemoveSpawnPointsOutsideOfBounds(roomSpawnPoints);
      roomSpawnPoints = this.RemoveSpawnPointsOutsideOfBounds(roomSpawnPoints);

      /* for (let i = 0; i < roomSpawnPoints.length; i++) {
        this.DrawPoint(roomSpawnPoints[i], new THREE.Color("red"), 2);
      } */
      return roomSpawnPoints;
    }

    GenerateTowers() {
      let towers = [];

      let prisonTower = new Tower();
      prisonTower.addSupportRoom(new Barracks());
      towers.push(prisonTower);

      let kitchenTower = new Tower();
      kitchenTower.addSupportRoom(new Kitchen());
      towers.push(kitchenTower);

      let guardTower = new Tower();
      guardTower.addSupportRoom(new GreatHall());
      towers.push(guardTower);

      let northWestTower = new Tower();
      northWestTower.addSupportRoom(new Chamber());
      towers.push(northWestTower);

      let southWestTower = new Tower();
      southWestTower.addSupportRoom(new Chamber());
      towers.push(southWestTower);

      let stockHouseTower = new Tower();
      stockHouseTower.addSupportRoom(new StoreRoom());
      towers.push(stockHouseTower);

      let bakeHouseTower = new Tower();
      towers.push(bakeHouseTower);

      let chapelTower = new Tower();
      chapelTower.addSupportRoom(new Chapel());
      towers.push(chapelTower);

      return towers;
    }

    GenerateCastle() {
      let acceptedLayout = false;
      let iterations = 0;
      let n = 100;

      //********************Need to check if all the rooms will fit in the current layout, right now its not doing that */
      while (!acceptedLayout) {
        //----- Generate points to spawn rooms at -----
        let towerSpawnPoints = [];
        //*************need to spread the points out further********************* */
        let spawnPoints = this.GenerateRoomSpawnPoints();
        let towers = this.GenerateTowers();
        for (let i = 0; i < towers.length; i++) {
          // Get a random spawn point for tower
          towers[i].spawnPoint = this.GetTowerSpawnPoint(spawnPoints, towers);
          towerSpawnPoints.push(towers[i].spawnPoint);
        }

        //----- Define bounds of spawn points -----
        let roomSpawnPoints = this.GetPointsInbetweenTowers(
          towerSpawnPoints,
          spawnPoints
        );

        // If there are enough spawn points for the all the rooms
        if (
          roomSpawnPoints.length >= this.GetAllRoomsAndSupportRooms(towers) &&
          this.CheckForSpawnPointsInRadius(towers, roomSpawnPoints)
        ) {
          this.availRoomSpawnPoints = roomSpawnPoints.slice();
          for (let i = 0; i < roomSpawnPoints.length; i++) {
            this.DrawPoint(roomSpawnPoints[i], new THREE.Color("skyblue"), 1);
          }

          // Generate support rooms that belong to the towers
          for (let i = 0; i < towers.length; i++) {
            if (towers[i].supportRooms.length > 0) {
              // Loop through the support rooms that need to be built
              for (let j = 0; j < towers[i].supportRooms.length; j++) {
                // Get the closest spawn point to this room
                let closestPoint = this.GetClosestSpawnPoint(
                  towers[i].spawnPoint
                );

                this.GenerateRooms(towers[i].supportRooms[j], closestPoint);
              }
            }
          }

          // Generate tower rooms
          for (let i = 0; i < towers.length; i++) {
            this.ExpandRoomsUntilComplete(towers);
          }

          // Expand rooms
          this.ExpandRoomsUntilComplete(this.unBuiltRooms);

          let wards = [];
          let ward = new Ward();
          ward.spawnPoint = this.GetRoomSpawnPoint(roomSpawnPoints);
          wards.push(ward);

          this.ExpandRoomsUntilComplete(wards);

          //-----Debug Stuff-----
          for (let i = 0; i < towerSpawnPoints.length; i++) {
            this.DrawPoint(towerSpawnPoints[i], new THREE.Color("yellow"), 1);
          }

          this.DrawShortestPath(this.shortestPath);
          //---------------------

          acceptedLayout = true;
        } else {
          console.log("Can't fit all rooms.");
          iterations++;
        }

        if (iterations > n) {
          console.log("Something went wrong generating spawn points");
          break;
        }
      }
    }

    // Returns a random index from the available room spawn points list
    GetRoomSpawnPoint(roomList) {
      let sample = Math.floor(Math.random() * roomList.length);
      let point = roomList[sample];
      let isAccepted = false;
      let numIterations = 0;

      //****Make sure not picking the same point over and over */
      while (!isAccepted) {
        sample = Math.floor(Math.random() * roomList.length);
        point = roomList[sample];

        // Accept this spawn point if nothing is there
        if (numIterations >= 300) {
          // Remove that spawn point from the avilable list
          this.RemoveItemFromList(point, roomList);
          isAccepted = true;
        }
        numIterations++;
      }

      if (point == undefined) {
        console.log("Spawn not found");
      }

      return point;
    }

    // Returns a random index from the available room spawn points list
    GetTowerSpawnPoint(pointList, towers) {
      let sample = Math.floor(Math.random() * pointList.length);
      let point = pointList[sample];
      let isAccepted = false;
      let iterations = 0;
      let n = 300;

      //****Make sure not picking the same point over and over */
      while (!isAccepted) {
        sample = Math.floor(Math.random() * pointList.length);
        point = pointList[sample];
        this.RemoveItemFromList(point, pointList);

        // Accept this spawn point if another tower isn't close by
        if (this.CheckSpawnPointProximity(point, towers)) {
          // Remove that spawn point from the avilable list
          //this.RemoveItemFromList(point, pointList);
          isAccepted = true;
        }

        if (iterations > n) {
          console.log("Uh ohh");
          break;
        }

        iterations++;
      }

      if (point == undefined) {
        console.log("Spawn not found");
      }

      return point;
    }

    // Connects adjacent triangle based on a positon and size of a room
    GenerateRoom(room) {
      // **Initialize room**
      // Get the triangle that this point is contained in
      let seedTriIndex = this.GetTriangleAtPoint(room, this.unUsedTriangles);

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
      let availableTris = room.triangles.slice();
      let checked = room.triangles.slice();

      while (!isComplete) {
        if (
          room.growType == GrowType.Circular &&
          room.size <= room.triangles.length
        ) {
          for (let i = 1; i < room.triangles.length; i++) {
            let adjTris = room.triangles[i].getAdjTriangles();
            console.log("adjTris: ", adjTris.length);
            for (let j = 0; j < adjTris.length; j++) {
              if (
                this.unUsedTriangles.includes(adjTris[j]) &&
                !room.triangles.includes(adjTris[j])
              ) {
                room.triangles.push(adjTris[j]);
                this.RemoveItemFromList(adjTris[j], this.unUsedTriangles);
              }
            }
          }
        } else {
          // Pick random triangle index from the rooms triangles
          seedTriIndex = Math.floor(Math.random() * availableTris.length);

          // Add any triangles adjacent un-used triangles to this rooms triangle list
          let adjTriangles = availableTris[seedTriIndex].getAdjTriangles();

          // Get all adjacent triangles that are available
          for (let i = 0; i < adjTriangles.length; i++) {
            if (this.unUsedTriangles.includes(adjTriangles[i])) {
              // Add any available triangles to the rooms triangle list
              room.triangles.push(adjTriangles[i]);
              availableTris.push(adjTriangles[i]);

              // Remove this triangle from the unUsed triangle list
              this.RemoveItemFromList(adjTriangles[i], this.unUsedTriangles);

              //****For more long cooridor growth: */
              // Remove seed triangle from available triangles so it is not picked again for sampling
              //this.RemoveItemFromList(availableTris[seedTriIndex], availableTris);

              //*******Need to find different ways to grow the rooms for variety */
            }
          }
        }

        if (room.size <= room.triangles.length) {
          isComplete = true;
        }
        if (numIterations > 300) {
          console.log("failed to build ", room.type);
          break;
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
      this.CreateMesh(room.triangles, -0.1, room.color);
    }

    GenerateRooms(room, spawn) {
      room.spawnPoint = spawn;
      this.unBuiltRooms.push(room);
      // If this room has any support rooms
      if (room.supportRooms.length > 0) {
        // Repeat same steps for all other support rooms
        for (let i = 0; i < room.supportRooms.length; i++) {
          room.supportRooms[i].spawnPoint = this.GetClosestSpawnPoint(
            room.spawnPoint
          );
          this.unBuiltRooms.push(room.supportRooms[i]);
        }
      }
    }

    ExpandRoomsUntilComplete(roomList) {
      let iterations = 0;
      let n = 1000;

      while (roomList.length > 0) {
        for (let i = 0; i < roomList.length; i++) {
          let room = roomList[i];
          if (room.size * 1.3 > room.triangles.length) {
            // Expand room
            this.ExpandRoom(room);
          } else {
            // Room is built
            this.TrimOutlierTris(room);
            this.CreateMesh(room.triangles, -0.1, room.color);
            this.RemoveItemFromList(room, roomList);
          }
        }

        if (iterations > n) {
          for (let i = 0; i < roomList.length; i++) {
            let room = roomList[i];
            console.log("Failed to expand ", roomList[i].type);
            this.TrimOutlierTris(room);
            this.CreateMesh(room.triangles, -0.1, room.color);
            this.RemoveItemFromList(room, roomList);
          }

          break;
        }

        iterations++;
      }
    }

    ExpandRoom(room) {
      // If the room is being built, pick a random triangle to expand from
      if (room.triangles.length > 0) {
        let seed = Math.floor(Math.random() * room.triangles.length);
        let adj = room.triangles[seed].getAdjTriangles();

        for (let i = 0; i < adj.length; i++) {
          if (
            !room.triangles.includes(adj[i]) &&
            this.unUsedTriangles.includes(adj[i])
          ) {
            room.triangles.push(adj[i]);
            this.RemoveItemFromList(adj[i], this.unUsedTriangles);
          }
        }
      } else {
        room.triangles.push(
          this.unUsedTriangles[
            this.GetTriangleAtPoint(room, this.unUsedTriangles)
          ]
        );

        let adjTriangles = room.triangles[0].getAdjTriangles();

        for (let i = 0; i < adjTriangles.length; i++) {
          if (this.unUsedTriangles.includes(adjTriangles[i])) {
            room.triangles.push(adjTriangles[i]);
            this.RemoveItemFromList(adjTriangles[i], this.unUsedTriangles);
          }
        }
      }
    }

    GetPointsInbetweenTowers(towers, pointsList) {
      let pointsInside = [];
      let acceptedPoint = false;

      let pointPerms = new heaps_permutation.HeapsPermutation().generateRoutes(
        towers
      );
      let shortestPath =
        new heaps_permutation.HeapsPermutation().findShortestPath(pointPerms);

      // Remove spawn points outside of these walls

      for (let i = 0; i < pointsList.length; i++) {
        acceptedPoint = this.IsPointInPoly(shortestPath, pointsList[i]);

        if (acceptedPoint) {
          pointsInside.push(pointsList[i]);
        }
      }
      this.shortestPath = shortestPath.slice();
      return pointsInside;
    }

    TrimOutlierTris(room) {
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

    GetTriangleAtPoint(room, triangles) {
      //console.log(room.spawnPoint);
      let acceptedSample = 0;
      //console.log(room.type);
      let sampleVertex = new delaunay_triangulation.Vertex(
        room.spawnPoint.x,
        room.spawnPoint.y
      );

      //**************FInd a better way to do  this********************* */
      //Find the triangle in triangles that the sample resides in
      for (let i = 0; i < triangles.length; i++) {
        if (triangles[i].inCircumCircle(sampleVertex)) {
          acceptedSample = i;
          break;
        }
      }

      /* if (acceptedSample > 0) {
        this.DrawPoint(room.spawnPoint, new THREE.Color("skyblue"));
      } else {
        console.log(room.type);
        this.DrawPoint(room.spawnPoint, new THREE.Color("red"));
      }
 */
      return acceptedSample;
    }

    GetClosestSpawnPoint(point) {
      let points = this.availRoomSpawnPoints;
      let shortestDist = Infinity;
      let closestPoint = undefined;

      for (let i = 0; i < points.length; i++) {
        let dist = point.distanceTo(points[i]);
        if (dist < shortestDist) {
          shortestDist = dist;
          closestPoint = points[i];
        }
      }
      this.RemoveItemFromList(closestPoint, this.availRoomSpawnPoints);
      return closestPoint;
    }

    CheckForSpawnPointsInRadius(checkPoints, availpoints) {
      for (let i = 0; i < checkPoints.length; i++) {
        let neighborPoints = [];

        //Check all points within a radius from this point
        for (let j = 0; j < availpoints.length; j++) {
          if (!availpoints[i].equals(checkPoints[i].spawnPoint)) {
            let dx = checkPoints[i].spawnPoint.x - availpoints[j].x;
            let dy = checkPoints[i].spawnPoint.y - availpoints[j].y;
            // If the point is within this points radius add it to the neihbor list
            if (Math.sqrt(dx * dx + dy * dy) <= this.spawnPointRadius * 2) {
              neighborPoints.push(availpoints[j]);
            }
          }
        }
        if (neighborPoints < checkPoints[i].supportRooms.length) {
          console.log("not enough spawn points around tower");
          return false;
        }
      }

      return true;
    }

    CheckSpawnPointProximity(point, towers) {
      let curTowerSpawnPoints = [];
      for (let i = 0; i < towers.length; i++) {
        curTowerSpawnPoints.push(towers[i].spawnPoint);
      }

      //Check all points within a radius from this point
      for (let j = 0; j < curTowerSpawnPoints.length; j++) {
        let dx = point.x - curTowerSpawnPoints[j].x;
        let dy = point.y - curTowerSpawnPoints[j].y;

        // If there is a point is within this points radius return false
        if (Math.sqrt(dx * dx + dy * dy) <= this.spawnPointRadius * 2) {
          return false;
        }
      }

      return true;
    }

    RemoveSpawnPointsOutsideOfBounds(points) {
      let offset = this.spawnPointRadius * 2;
      for (let i = 0; i < points.length; i++) {
        let point = points[i];
        if (
          point.x > offset &&
          point.x < this.width - offset &&
          point.y > offset &&
          point.y < this.height - offset
        ) {
        } else {
          //this.DrawPoint(point, new THREE.Color("orange"), 3);
          this.RemoveItemFromList(point, points);
        }
      }
      return points;
    }

    GetAllRoomsAndSupportRooms(towers) {
      let roomCount = this.unBuiltRooms.length;

      for (let i = 0; i < towers.length; i++) {
        roomCount += towers[i].supportRooms.length;
      }

      for (let i = 0; i < this.unBuiltRooms.length; i++) {
        roomCount += this.unBuiltRooms[i].supportRooms.length;
      }
      return roomCount + Math.floor(roomCount * 1.5);
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

    DrawLinesBetweenPoints(points, color) {
      const roomPoints = [];

      const material = new THREE.LineBasicMaterial({ color: color });

      for (let i = 0; i < points.length; i++) {
        //create a blue LineBasicMaterial

        for (let j = 0; j < points.length; j++) {
          roomPoints.push(new THREE.Vector3(points[i].x, -3, points[i].y));
          roomPoints.push(new THREE.Vector3(points[j].x, -3, points[j].y));
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

    // Removes an item from the list that contains it by looking up that items index
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
      this.spawnPoint = new THREE.Vector2();
      this.supportRooms = [];
    }

    addTriangles(t) {
      for (let i = 0; i < t.length; i++) {
        this.triangles.push(t[i]);
      }
    }

    addTriangle(t) {
      this.triangles.push(t);
    }

    addSupportRoom(room) {
      this.supportRooms.push(room);
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

    spawnPoint() {
      return this.spawnPoint;
    }

    supportRooms() {
      return this.supportRooms;
    }

    minBuildDist() {
      return this.minBuildDist;
    }
  }

  class Start extends Room {
    constructor() {
      super();
      this.size = 20;
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
      this.supportRooms = [
        new Bottlery(),
        new Buttlery(),
        new StoreRoom(),
        new Pantry(),
      ];
    }
  }

  class Bottlery extends Room {
    constructor() {
      super();
      this.size = 20;
      this.type = "Bottlery";
      this.color = new THREE.Color(0xd19f17);
    }
  }

  class StoreRoom extends Room {
    constructor() {
      super();
      this.size = 35;
      this.type = "StoreRoom";
      this.color = new THREE.Color(0xaec92a);
    }
  }

  class Pantry extends Room {
    constructor() {
      super();
      this.size = 25;
      this.type = "Pantry";
      this.color = new THREE.Color(0xa9bf3b);
    }
  }

  class Buttlery extends Room {
    constructor() {
      super();
      this.size = 20;
      this.type = "Buttlery";
      this.color = new THREE.Color(0x8ba608);
    }
  }

  class Ward extends Room {
    constructor() {
      super();
      this.size = 100;
      this.type = "Ward";
      this.color = new THREE.Color(0x25b33f);
    }
  }

  class GreatHall extends Room {
    constructor() {
      super();
      this.size = 55;
      this.type = "GreatHall";
      this.color = new THREE.Color(0xc41a30);
      this.supportRooms = [new ThroneRoom()];
    }
  }

  class ThroneRoom extends Room {
    constructor() {
      super();
      this.size = 25;
      this.type = "ThroneRoom";
      this.color = new THREE.Color(0xff0019);
    }
  }

  class Chamber extends Room {
    constructor() {
      super();
      this.size = 25;
      this.type = "Chamber";
      this.color = new THREE.Color(0xf70a55);
    }
  }

  class Chapel extends Room {
    constructor() {
      super();
      this.size = 40;
      this.type = "Chapel";
      this.color = new THREE.Color(0xd44468);
    }
  }

  class Tower extends Room {
    constructor() {
      super();
      this.size = 13;
      this.type = "Tower";
      this.growType = GrowType.Circular;
      this.minBuildDist = this.size * 5;
      this.color = new THREE.Color(0x4287f5);
    }
  }

  class Barracks extends Room {
    constructor() {
      super();
      this.size = 40;
      this.type = "Barracks";
      this.color = new THREE.Color(0x514a59);
      this.supportRooms = [new PlaceOfArms(), new MessHall()];
    }
  }

  class PlaceOfArms extends Room {
    constructor() {
      super();
      this.size = 50;
      this.type = "PlaceOfArms";
      this.color = new THREE.Color(0x443f4a);
      this.supportRooms = [];
    }
  }

  class MessHall extends Room {
    constructor() {
      super();
      this.size = 30;
      this.type = "MessHall";
      this.color = new THREE.Color(0x625b69);
      this.supportRooms = [];
    }
  }

  return { TestBuilder: TestBuilder };
})();
