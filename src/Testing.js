import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { poisson_disc_sampling } from "./PoissonDiscSampling.js";
import { delaunay_triangulation } from "./DelaunayTriangulation.js";
import { heaps_permutation } from "./Heaps.js";
import { prims } from "./Prims.js";
import { aStarSearch } from "./AStarSearch.js";

export const testing = (() => {
  const GrowType = Object.freeze({
    Circular: 0,
    Blob: 1,
    Cooridoor: 2,
    Rectangular: 3,
  });

  class TestBuilder {
    constructor(scene, gizmos) {
      this.scene = scene;
      this.gizmos = gizmos;
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

      this.allTriangles = this.unUsedTriangles.slice();

      this.unBuiltRooms = [];
      this.usedTriangles = [];
      this.availRoomSpawnPoints = [];
      this.shortestPath = [];
      this.builtRooms = [];
      this.doors = [];

      //-----Generate Room-----
      this.GenerateCastle();

      //this.CreateMesh(this.unUsedTriangles, -5);
    }

    TrimSpawnPoints() {
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
      bakeHouseTower.addSupportRoom(new Start());
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
        let spawnPoints = this.TrimSpawnPoints();
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
          roomSpawnPoints.length >= this.CalcNumOfRooms(towers) &&
          this.CheckForSpawnPointsInRadius(towers, roomSpawnPoints)
        ) {
          this.availRoomSpawnPoints = roomSpawnPoints.slice();
          /* for (let i = 0; i < roomSpawnPoints.length; i++) {
            this.DrawPoint(roomSpawnPoints[i], new THREE.Color("skyblue"), 1);
          } */

          // Generate support rooms that belong to the towers
          for (let i = 0; i < towers.length; i++) {
            if (towers[i].supportRooms.length > 0) {
              // Loop through the support rooms that need to be built
              for (let j = 0; j < towers[i].supportRooms.length; j++) {
                // Get the closest spawn point to this room
                let closestPoint = this.GetClosestSpawnPoint(
                  towers[i].spawnPoint
                );

                this.SetSpawnPoints(towers[i].supportRooms[j], closestPoint);
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

          // Calculate Border edges and center points of rooms
          let roomPos = [];
          for (let i = 0; i < this.builtRooms.length; i++) {
            this.builtRooms[i].calcBorderEdges();
            let center = this.builtRooms[i].pickRandomCenter();
            roomPos.push(center);
            this.gizmos.DrawPoint(center, new THREE.Color("blue"), 1.1);
          }

          // Get MST of nodes
          let mst = new prims.MST(
            this.ConvertTriEdgesToNodeArray(
              roomPos,
              new delaunay_triangulation.Triangulate().Triangulation(roomPos)
            )
          );

          // Draw MST path
          for (let i = 1; i < mst.length; i++) {
            let pointA = roomPos[i];
            let pointB = roomPos[mst[i]];

            let points = [];
            points.push(pointA);
            points.push(pointB);

            this.gizmos.DrawLinesBetweenPoints(
              points,
              new THREE.Color("blue"),
              0.1
            );
          }

          // Create nodes
          let nodes = this.CreateAStarNodes();
          let paths = [];

          // Find path between each mst node pair
          for (let i = 1; i < mst.length; i++) {
            // Reset node values
            for (let j = 0; j < nodes.length; j++) {
              nodes[j].clear();
            }

            let start = this.GetNodeAtPos(roomPos[i], nodes);
            let end = this.GetNodeAtPos(roomPos[mst[i]], nodes);
            let path = new aStarSearch.AStar(end, start, nodes);

            // Need to check that any Empty nodes in the path become Hallways
            for (let i = 0; i < path.length; i++) {
              if (path[i].room == undefined) {
                let hallway = new Hallway();
                path[i].room = hallway;

                let t = this.GetTriAtPos(
                  path[i].position,
                  this.unUsedTriangles
                );
                path[i].room.addTriangles(t);
              }
            }
            paths.push(path);
          }

          // Draw paths
          for (let i = 0; i < paths.length; i++) {
            let path = paths[i];

            for (let j = 0; j < path.length; j++) {
              if (path[j].room.type == "Hallway") {
                this.CreateMesh(
                  path[j].room.triangles,
                  -0.1,
                  path[j].room.color
                );
              } else {
                this.gizmos.DrawPoint(
                  path[j].position,
                  new THREE.Color("green"),
                  0.7
                );
              }
            }
          }

          // ********** Maybe reconnect some of the major rooms to nearby major rooms,
          // especially wards to ajacent major rooms *****************

          //-----Debug Stuff-----
          // Draw Towers
          /* for (let i = 0; i < towerSpawnPoints.length; i++) {
            this.gizmos.DrawPoint(
              towerSpawnPoints[i],
              new THREE.Color("yellow"),
              0.1
            );
          }
          */
          // Draw Walls
          //this.gizmos.DrawShortestPath(this.shortestPath);

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

    SetSpawnPoints(room, spawn) {
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
            this.builtRooms.push(room);
            this.TrimOutlierTris(room);
            this.CreateMesh(room.triangles, -0.1, room.color);
            this.RemoveItemFromList(room, roomList);
          }
        }

        if (iterations > n) {
          for (let i = 0; i < roomList.length; i++) {
            let room = roomList[i];
            console.log("Failed to expand ", roomList[i].type);
            this.builtRooms.push(room);
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
            room.addTriangles(adj[i]);
            this.RemoveItemFromList(adj[i], this.unUsedTriangles);
          }
        }
      } else {
        //Get initial spawn point for room
        let initPoint = this.GetTriangleAtPoint(room, this.unUsedTriangles);
        room.addTriangles(this.unUsedTriangles[initPoint]);
        //Remove from unused triangle list
        this.RemoveItemFromList(
          this.unUsedTriangles[initPoint],
          this.unUsedTriangles
        );

        let adjTriangles = room.triangles[0].getAdjTriangles();

        for (let i = 0; i < adjTriangles.length; i++) {
          if (this.unUsedTriangles.includes(adjTriangles[i])) {
            room.addTriangles(adjTriangles[i]);
            this.RemoveItemFromList(adjTriangles[i], this.unUsedTriangles);
          }
        }
      }
    }

    FindPathBetween() {
      // Need to check that every room is accessable

      for (let i = 0; i < this.builtRooms.length; i++) {
        let room = this.builtRooms[i];
        if (room.type == "Tower") {
          let tower = this.builtRooms[i];
          for (let j = 0; j < tower.supportRooms.length; j++) {
            this.AddDoor(tower, tower.supportRooms[j]);
          }
        } else if (room.isMajor && room.supportRooms.length > 0) {
          for (let i = 0; i < room.supportRooms.length; i++) {
            this.AddDoor(room, room.supportRooms[i]);
          }
        } else {
          //console.log(room.type, "is not connected");
        }
      }

      // Connect any other rooms to adjacent rooms

      // Find any unconnected rooms
      let connectedRooms = [];
      let unconnectedRooms = [];
      // Find all rooms that are already connected
      for (let h = 0; h < this.builtRooms.length; h++) {
        let room = this.builtRooms[h];
        for (let i = 0; i < this.doors.length; i++) {
          // If this room has no doors and isn't alreay in the unconnected room list
          if (
            (room != this.doors[i].roomsConnected[0] ||
              room != this.doors[i].roomsConnected[1]) &&
            !connectedRooms.includes(room)
          ) {
            connectedRooms.push(room);
          }
        }
      }

      // Get all unconnected rooms
      for (let i = 0; i < this.builtRooms.length; i++) {
        if (!connectedRooms.includes(this.builtRooms[i])) {
          unconnectedRooms.push(this.builtRooms[i]);
        }
      }

      // Add doors to any unconnected rooms with adjacent rooms
      for (let i = 0; i < unconnectedRooms.length; i++) {
        let room = unconnectedRooms[i];
        for (let k = 0; k < this.builtRooms.length; k++) {
          let builtRoom = this.builtRooms[k];
          if (room != builtRoom) {
            let sharedEdge = this.CheckForSharedEdge(room, builtRoom);
            // If the 2 rooms share and edge and are not already connected add a door
            if (
              sharedEdge != undefined &&
              !this.CheckIfRoomsAreConnected(room, builtRoom)
            ) {
              this.AddDoor(room, builtRoom);
            }
          }
        }
      }

      // Connect unconnected rooms with hallways

      let points = [];
      for (let i = 0; i < this.doors.length; i++) {
        points.push(this.doors[i].position);
      }

      this.DrawLinesBetweenPoints(points);
    }

    AddDoor(r1, r2) {
      let sharedEdge = this.CheckForSharedEdge(r1, r2);
      if (sharedEdge != undefined) {
        let newDoor = new Door();
        newDoor.addRooms(r1, r2);
        newDoor.setPosition(sharedEdge.getMidpoint());
        this.doors.push(newDoor);
        this.DrawPoint(newDoor.position, new THREE.Color("black"), 2);
      }
    }

    CheckIfRoomsAreConnected(r1, r2) {
      for (let i = 0; i < this.doors.length; i++) {
        let room1 = this.doors[i].roomsConnected[0];
        let room2 = this.doors[i].roomsConnected[1];

        if ((room1 == r1 && room2 == r2) || (room1 == r2 && room2 == r1)) {
          return true;
        }
      }
      return false;
    }

    CheckForSharedEdge(room1, room2) {
      let r1edges = room1.borderEdges;
      let r2edges = room2.borderEdges;

      for (let i = 0; i < r1edges.length; i++) {
        for (let j = 0; j < r2edges.length; j++) {
          if (r1edges[i].equals(r2edges[j])) {
            return r1edges[i];
          }
        }
      }
      return undefined;
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
          room.removeTriangleAtIndex(index);
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
      let sampleVertex = new THREE.Vector2(
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

    CalcNumOfRooms(towers) {
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

    GetRoomByCenterPos(v) {
      for (let i = 0; i < this.builtRooms.length; i++) {
        let room = this.builtRooms[i];
        if (room.center.equals(v)) {
          return room;
        }
      }
    }

    ConvertTriEdgesToNodeArray(points, triangles) {
      /* 2D array containing every node in the room centers list and the nodes they are connected to
             The position of each center point in centers[] coorelates to that same node in nodes[]

                0  1  2  3 ... n
             0  0  3  0  0 ... n  --> in this row node 0 is connected to node 1 with weight of 3
             1  0  0  3  0 ... n  --> node 1 is connected to node 3 with a weight of 2
             .
             .
             .
             n
           */
      let nodes = [];
      // Initialize the nodes
      for (let i = 0; i < points.length; i++) {
        let row = new Array(points.length).fill(0);
        nodes.push(row);
      }

      // Set node adjacency
      for (let i = 0; i < points.length; i++) {
        let nodeA = points[i];

        for (let j = 0; j < triangles.length; j++) {
          // Get triangle edges to check for node adjacency
          let edges = triangles[j].getEdges();

          for (let k = 0; k < edges.length; k++) {
            /*
             If the triangulated edge contains the point at center[i],
             the other point in the edge is a connected node to center[i]
            */
            let nodeB = undefined;

            if (nodeA.equals(edges[k].v0)) {
              nodeB = edges[k].v1;
            }
            if (nodeA.equals(edges[k].v1)) {
              nodeB = edges[k].v0;
            }

            if (nodeB != undefined) {
              // Get the index of the adjacent node
              let nodeBIndex = points.indexOf(nodeB);
              let dist = edges[k].getDistBetweenVerts();
              // Set calculated weight
              //nodes[i][nodeBIndex] = edges[k].getAproximateDistBetweenVerts();
              nodes[i][nodeBIndex] = this.calcWeights(nodeA, nodeB, dist);
            }
          }
        }
      }

      /*
        Weights should be calculated by:
          If the nodes are a major room and its support room = 1
          If the nodes are 2 major rooms = dist/2
          If the node is a major room and a ward = dis/3
          Else the weight is just the distance between the 2
      */

      return nodes;
    }

    calcWeights(nodeA, nodeB, dist) {
      let weight = 0;
      let roomA = this.GetRoomByCenterPos(nodeA);
      let roomB = this.GetRoomByCenterPos(nodeB);

      // If roomA is a major room and roomB is one of its supporting rooms
      if (roomA.isMajor && roomA.supportRooms.includes(roomB)) {
        weight = 1;
      } else if (roomA.isMajor && roomB.isMajor) {
        weight = Math.floor(dist) / 2;
      } else {
        weight = Math.floor(dist);
      }

      return weight;
    }

    CreateAStarNodes() {
      // Create nodes
      let nodes = [];

      // Empty triangles -> empty nodes
      for (let i = 0; i < this.unUsedTriangles.length; i++) {
        let t = this.unUsedTriangles[i];
        let n = new Node(t.center(), undefined);
        nodes.push(n);
      }

      // Room triangles -> room nodes
      for (let i = 0; i < this.builtRooms.length; i++) {
        let r = this.builtRooms[i];
        for (let j = 0; j < r.triangles.length; j++) {
          let n = new Node(r.triangles[j].center(), r.type);
          nodes.push(n);
        }
      }

      // Build Paths
      for (let i = 0; i < this.allTriangles.length; i++) {
        let t = this.allTriangles[i];
        let n = this.GetNodeAtPos(t.center(), nodes);
        let adj = t.getAdjTriangles();

        for (let j = 0; j < adj.length; j++) {
          n.adjacent.push(this.GetNodeAtPos(adj[j].center(), nodes));
        }
      }

      return nodes;
    }

    GetNodeAtPos(pos, nodes) {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].position.equals(pos)) {
          return nodes[i];
        }
      }
    }

    GetTriAtPos(pos, triangles) {
      for (let i = 0; i < triangles.length; i++) {
        if (triangles[i].center().equals(pos)) {
          return triangles[i];
        }
      }
      return undefined;
    }
  }

  class Node {
    constructor(position, room) {
      this.position = position;
      this.room = room;
      this.adjacent = [];
      this.fCost = 0;
      this.hCost = 0;
      this.gCost = 0;
      this.parent = undefined;
    }

    clear() {
      this.fCost = 0;
      this.hCost = 0;
      this.gCost = 0;
      this.parent = undefined;
    }

    calcCosts(v1, v2) {
      this.hCost = this.position.distanceTo(start);
      this.gCost = this.position.distanceTo(end);
      this.fCost = this.gCost + this.hCost;
    }
  }

  class Room {
    constructor() {
      this.triangles = [];
      this.borderEdges = [];
      this.type = "";
      this.minBuildDist = 0;
      this.spawnPoint = new THREE.Vector2();
      this.supportRooms = [];
      this.isMajor = false;
      this.doorTo = [];
      this.center = new THREE.Vector2();
    }

    addTriangles(t) {
      this.triangles.push(t);
      //this.calcBorderEdges();
    }

    removeTriangleAtIndex(index) {
      this.triangles.splice(index, 1);
      //this.calcBorderEdges();
    }

    addDoorTo(r) {
      this.doorTo.push(r);
    }

    addSupportRoom(room) {
      this.supportRooms.push(room);
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

    isMajor() {
      return this.isMajor;
    }

    doorTo() {
      return this.doorTo;
    }

    spawnPoint() {
      return this.spawnPoint;
    }

    supportRooms() {
      return this.supportRooms;
    }

    borderEdges() {
      return this.borderEdges;
    }

    minBuildDist() {
      return this.minBuildDist;
    }

    calcBorderEdges() {
      for (let i = 0; i < this.triangles.length; i++) {
        let adj = this.triangles[i].getAdjTriangles();

        for (let j = 0; j < adj.length; j++) {
          if (!this.triangles.includes(adj[j])) {
            //this is a boundary triangle
            let insideEdges = this.triangles[i].getEdges();
            let outsideEdges = adj[j].getEdges();

            for (let k = 0; k < insideEdges.length; k++) {
              for (let m = 0; m < outsideEdges.length; m++) {
                if (insideEdges[k].equals(outsideEdges[m])) {
                  //This is a boundary edge
                  this.borderEdges.push(insideEdges[k]);
                }
              }
            }
          }
        }
      }
    }

    pickRandomCenter() {
      let index = Math.floor(Math.random() * this.triangles.length);
      this.center = this.triangles[index].center();
      return this.center;
    }
  }

  class Door {
    constructor() {
      this.roomsConnected = [];
      this.position = new THREE.Vector2();
    }

    addRooms(r1, r2) {
      this.roomsConnected.push(r1);
      this.roomsConnected.push(r2);
    }

    setPosition(pos) {
      this.position = new THREE.Vector2(pos.x, pos.y);
    }
  }

  class Hallway extends Room {
    constructor() {
      super();
      this.size = 10;
      this.type = "Hallway";
      this.color = new THREE.Color(0xfffb00);
      this.isMajor = false;
    }
  }

  class Start extends Room {
    constructor() {
      super();
      this.size = 20;
      this.type = "Start";
      this.color = new THREE.Color(0xffffff);
      this.isMajor = true;
    }
  }

  class Kitchen extends Room {
    constructor() {
      super();
      this.size = 35;
      this.type = "Kitchen";
      this.isMajor = true;
      this.color = new THREE.Color(0xf2bb24);
      this.supportRooms = [
        new Bottlery(),
        new Buttlery(),
        new KitchenStoreRoom(),
        new Pantry(),
      ];
    }
  }

  class Bottlery extends Room {
    constructor() {
      super();
      this.size = 20;
      this.type = "Bottlery";
      this.isMajor = false;
      this.color = new THREE.Color(0xd19f17);
    }
  }

  class KitchenStoreRoom extends Room {
    constructor() {
      super();
      this.size = 20;
      this.type = "KitchenStoreRoom";
      this.isMajor = true;
      this.color = new THREE.Color(0xaec22a);
    }
  }

  class StoreRoom extends Room {
    constructor() {
      super();
      this.size = 30;
      this.type = "StoreRoom";
      this.isMajor = true;
      this.color = new THREE.Color(0xaec92a);
    }
  }

  class Pantry extends Room {
    constructor() {
      super();
      this.size = 20;
      this.type = "Pantry";
      this.isMajor = false;
      this.color = new THREE.Color(0xa9bf3b);
    }
  }

  class Buttlery extends Room {
    constructor() {
      super();
      this.size = 20;
      this.type = "Buttlery";
      this.isMajor = false;
      this.color = new THREE.Color(0x8ba608);
    }
  }

  class Ward extends Room {
    constructor() {
      super();
      this.size = 100;
      this.type = "Ward";
      this.isMajor = true;
      this.color = new THREE.Color(0x25b33f);
    }
  }

  class GreatHall extends Room {
    constructor() {
      super();
      this.size = 50;
      this.type = "GreatHall";
      this.isMajor = true;
      this.color = new THREE.Color(0xc41a30);
      this.supportRooms = [new ThroneRoom()];
    }
  }

  class ThroneRoom extends Room {
    constructor() {
      super();
      this.size = 20;
      this.type = "ThroneRoom";
      this.isMajor = true;
      this.color = new THREE.Color(0xff0019);
    }
  }

  class Chamber extends Room {
    constructor() {
      super();
      this.size = 20;
      this.type = "Chamber";
      this.isMajor = true;
      this.color = new THREE.Color(0xf70a55);
    }
  }

  class Chapel extends Room {
    constructor() {
      super();
      this.size = 30;
      this.type = "Chapel";
      this.isMajor = true;
      this.color = new THREE.Color(0xd44468);
    }
  }

  class Tower extends Room {
    constructor() {
      super();
      this.size = 15;
      this.type = "Tower";
      this.isMajor = true;
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
      this.isMajor = true;
      this.color = new THREE.Color(0x514a59);
      this.supportRooms = [new PlaceOfArms(), new MessHall()];
    }
  }

  class PlaceOfArms extends Room {
    constructor() {
      super();
      this.size = 50;
      this.type = "PlaceOfArms";
      this.isMajor = false;
      this.color = new THREE.Color(0x443f4a);
      this.supportRooms = [];
    }
  }

  class MessHall extends Room {
    constructor() {
      super();
      this.size = 30;
      this.type = "MessHall";
      this.isMajor = false;
      this.color = new THREE.Color(0x625b69);
      this.supportRooms = [];
    }
  }

  return { TestBuilder: TestBuilder };
})();
