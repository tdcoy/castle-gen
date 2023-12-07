import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { delaunay_triangulation } from "./DelaunayTriangulation.js";
import { poisson_disc_sampling } from "./PoissonDiscSampling.js";

export const room_generator = (() => {
  class CreateRoom {
    constructor() {}

    Init(scene, regionSize, radius) {
      this.scene = scene;
      this.cellSize = radius / Math.sqrt(2);
      this.regionSize = regionSize;
      this.radius = radius;

      this.minX = Infinity;
      this.minY = Infinity;
      this.maxX = -Infinity;
      this.maxY = -Infinity;

      let mapGraph = this.CreateMapGraph();
      this.AddRoomsFromGraph(mapGraph, radius, regionSize);

      const points = new poisson_disc_sampling.SpawnPoints().Init(
        radius,
        regionSize,
        regionSize,
        30
      );

      let triangles = new delaunay_triangulation.Triangulate().Init(points);
      this.CreateMesh(triangles);
      /* let roomBounds = [];
      for (let i = 0; i < rooms.length; i++) {
        roomBounds.push(this.BuildRoom(triangles, rooms[i].getSize()));
      } */
    }

    BuildRoom(triangles, roomSize) {
      let bounds = [];
      let mesh = [];

      // Check if bounding box is inside region
      this.GetRegionBounds(triangles);
      bounds = this.CalcBounds(triangles, roomSize);

      // Check if bounding box is within region
      let goodBounds = false;

      for (let j = 0; j < 30; j++) {
        for (let i = 0; i < bounds.length; i++) {
          //Check if the room will fit within the map
          if (
            bounds[i].x > this.maxX ||
            bounds[i].y > this.maxY ||
            bounds[i].x < this.minX ||
            bounds[i].y < this.minY
          ) {
            //outside of map, try new bounds
            bounds = this.CalcBounds(triangles, roomSize);
            //console.log("bad bounds");
          } else {
            //console.log("good bounds");
            goodBounds = true;
          }
        }
        if (goodBounds) {
          // Draw bounding box vertices
          for (let index = 0; index < bounds.length; index++) {
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const point = new THREE.Mesh(geometry, material);
            this.scene.add(point);
            point.position.set(bounds[index].x, 0, bounds[index].y);
          }
          break;
        }
      }

      for (let i = 0; i < triangles.length; i++) {
        //if the triangle is in the bounds
        if (
          (triangles[i].v0.x > this.minX &&
            triangles[i].v0.x < this.maxX &&
            triangles[i].v0.y > this.minY &&
            triangles[i].v0.y < this.maxY) ||
          (triangles[i].v1.x > this.minX &&
            triangles[i].v1.x < this.maxX &&
            triangles[i].v1.y > this.minY &&
            triangles[i].v1.y < this.maxY) ||
          (triangles[i].v2.x > this.minX &&
            triangles[i].v2.x < this.maxX &&
            triangles[i].v2.y > this.minY &&
            triangles[i].v2.y < this.maxY)
        ) {
          mesh.push(triangles[i]);
        }
      }

      this.CreateMesh(mesh);
      return bounds;
    }

    CreateMesh(triangles) {
      let meshes = [];

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

        const texture_material = new THREE.MeshBasicMaterial({ map: texture });

        let color = THREE.MathUtils.randInt(0, 0xffffff);

        const material = new THREE.MeshStandardMaterial({ color: color });
        const mesh = new THREE.Mesh(geometry, material);
        this.scene.add(mesh);
        meshes.push(mesh);
      }

      return meshes;
    }

    CalcBounds(triangles, roomSize) {
      let bounds = [];

      // Pick random position
      let sample = triangles[Math.floor(Math.random() * triangles.length)];

      // Set bounds for the room from sample
      let boundsMaxX = sample.v0.x + roomSize.x * this.scale;
      let boundsMinX = sample.v0.x;
      let boundsMaxY = sample.v0.y + roomSize.y * this.scale;
      let boundsMinY = sample.v0.y;

      let point1 = new delaunay_triangulation.Vertex(boundsMinX, boundsMinY);
      let point2 = new delaunay_triangulation.Vertex(boundsMinX, boundsMaxY);
      let point3 = new delaunay_triangulation.Vertex(boundsMaxX, boundsMinY);
      let point4 = new delaunay_triangulation.Vertex(boundsMaxX, boundsMaxY);

      bounds.push(point1);
      bounds.push(point2);
      bounds.push(point3);
      bounds.push(point4);
      return bounds;
    }

    GetRegionBounds(triangles) {
      this.minX = Infinity;
      this.minY = Infinity;
      this.maxX = -Infinity;
      this.maxY = -Infinity;

      for (let i = 0; i < triangles.length; i++) {
        this.minX = Math.min(this.minX, triangles[i].v0.x);
        this.minY = Math.min(this.minX, triangles[i].v0.y);
        this.maxX = Math.max(this.maxX, triangles[i].v0.x);
        this.maxY = Math.max(this.maxX, triangles[i].v0.y);

        this.minX = Math.min(this.minX, triangles[i].v1.x);
        this.minY = Math.min(this.minX, triangles[i].v1.y);
        this.maxX = Math.max(this.maxX, triangles[i].v1.x);
        this.maxY = Math.max(this.maxX, triangles[i].v1.y);

        this.minX = Math.min(this.minX, triangles[i].v2.x);
        this.minY = Math.min(this.minX, triangles[i].v2.y);
        this.maxX = Math.max(this.maxX, triangles[i].v2.x);
        this.maxY = Math.max(this.maxX, triangles[i].v2.y);
      }
    }

    CreateMapGraph() {
      // Rooms
      var nodes = [
        "Start",
        "TowerS1",
        "TowerS2",
        "TowerKitchen",
        "TowerPrison",
        "GreatHall",
        "Kitchen",
        "Pantry",
        "Ward",
      ];

      var graph = new Graph(nodes.length);

      for (let i = 0; i < nodes.length; i++) {
        graph.AddNode(nodes[i]);
      }

      // adding edges
      graph.AddEdge("Start", "Ward");
      graph.AddEdge("Ward", "TowerS1");
      graph.AddEdge("Ward", "TowerS2");
      graph.AddEdge("Ward", "GreatHall");
      graph.AddEdge("Ward", "Kitchen");
      graph.AddEdge("Kitchen", "Pantry");
      graph.AddEdge("Kitchen", "TowerKitchen");
      graph.AddEdge("GreatHall", "TowerPrison");

      //graph.PrintGraph();
      return graph;
    }

    AddRoomsFromGraph(graph) {
      //Setup grid
      let grid = [];
      let cols = Math.floor(this.regionSize / this.cellSize);
      let rows = Math.floor(this.regionSize / this.cellSize);
      for (let index = 0; index < cols * rows; index++) {
        grid[index] = -1;
      }

      //Place start in center
      var posX = this.regionSize / 2;
      var posY = this.regionSize / 2;
      var x = Math.floor(posX / this.cellSize); //Convert to integer for grid index
      var y = Math.floor(posY / this.cellSize);
      let orginPoint = new THREE.Vector2(posX, posY); //Create vector for sample
      grid[x + y * cols] = orginPoint; //Place into grid

      let roomsToSpawn = [];

      for (let key of graph.GetMap().keys()) {
        roomsToSpawn.push(key);

        /* let adjNodes = graph.GetAdjacent(key);

        for (let i = 0; i < adjNodes.length; i++) {
          console.log(key, ",", adjNodes[i]);
          let room = new Room(adjNodes[i]);
          let pos = new THREE.Vector3(i * 2, 1, i * 9);
          this.AddCube(room.getSize(), pos, room.getColor());
          break;
        }
        break; */
      }
      
    }

    AddCube(size, position, roomColor) {
      const geometry = new THREE.BoxGeometry(
        size.x * this.cellSize,
        size.y * this.cellSize,
        size.z * this.cellSize
      );

      const material = new THREE.MeshBasicMaterial({ color: roomColor });
      const box = new THREE.Mesh(geometry, material);
      this.scene.add(box);
      box.position.set(position.x, position.y, position.z);
    }
  }

  class Graph {
    constructor(nodes) {
      this.nodes = nodes;
      this.adjNodes = new Map(); //key of a map holds a vertex and values hold an array of an adjacent node.
    }

    GetNodes() {
      return this.adjNodes.keys();
    }

    // Add vertex to the graph
    AddNode(n) {
      this.adjNodes.set(n, []);
    }

    // Add an edge between the source node and destination
    AddEdge(src, dest) {
      this.adjNodes.get(src).push(dest);
      this.adjNodes.get(dest).push(src);
    }

    GetMap() {
      return this.adjNodes;
    }

    GetAdjacent(n) {
      return this.adjNodes.get(n);
    }

    BFSearch(startNode) {
      // Visited node object
      let visitedNodes = {};

      // Queue
      var q = new Queue();

      // Add starting node to the queue
      visitedNodes[startNode] = true;
      q.enqueue(startNode);

      while (!q.isEmpty()) {
        var getQueueElement = q.dequeue();

        // Nodes traversed in search
        //console.log("getQElement: ", getQueueElement);

        var getNodes = this.adjNodes.get(getQueueElement);

        // loop through the list and add the element to the
        // queue if it is not processed yet
        for (let i in getNodes) {
          var adjacent = getNodes[i];
          if (!visitedNodes[adjacent]) {
            visitedNodes[adjacent] = true;
            q.enqueue(adjacent);
          }
        }
      }
    }

    DFSearch(startNode) {
      var visited = {};

      this.DFSUtil(startingNode, visited);
    }

    // Recursive function which process and explore
    // all the adjacent vertex of the vertex with which it is called
    DFSUtil(vert, visited) {
      visited[vert] = true;
      console.log(vert);

      var get_neighbours = this.AdjList.get(vert);

      for (var i in get_neighbours) {
        var get_elem = get_neighbours[i];
        if (!visited[get_elem]) this.DFSUtil(get_elem, visited);
      }
    }

    PrintGraph() {
      var nodes = this.adjNodes.keys();

      for (let i of nodes) {
        let adjNodes = this.adjNodes.get(i);
        let concat = "";

        for (let j of adjNodes) {
          concat += j + " ";
        }
        console.log(i + "->" + concat);
      }
    }
  }

  class Queue {
    constructor() {
      this.items = [];
    }
    enqueue(element) {
      // adding element to the queue
      this.items.push(element);
    }
    dequeue() {
      // removing element from the queue
      // returns underflow when called
      // on empty queue
      if (this.isEmpty()) return "Underflow";
      return this.items.shift();
    }

    isEmpty() {
      // return true if the queue is empty.
      return this.items.length == 0;
    }

    peek() {
      // returns the Front element of
      // the queue without removing it.
      if (this.isEmpty()) return "No elements in Queue";
      return this.items[0];
    }

    printQueue() {
      var str = "";
      for (var i = 0; i < this.items.length; i++) str += this.items[i] + " ";
      return str;
    }
  }

  class Room {
    constructor(type) {
      this.size = new THREE.Vector3(1, 1, 1);
      this.type = type;
      this.color = new THREE.Color();
    }

    InitRoom() {
      if (this.type == "Start") {
        this.size = new THREE.Vector3(2, 1, 2);
        this.color = new THREE.Color(0xfffaa0);
      }

      if (this.type == "GreatHall") {
        this.size = new THREE.Vector3(4, 2, 6);
        this.color = new THREE.Color(0xff0000);
      }

      if (this.type == "Kitchen") {
        this.size = new THREE.Vector3(3, 1, 2);
        this.color = new THREE.Color(0xccccff);
      }

      if (this.type == "Ward") {
        this.size = new THREE.Vector3(7, 2, 11);
        this.color = new THREE.Color(0xfff000);
      }

      if (this.type == "TowerS1") {
        this.size = new THREE.Vector3(2, 2, 2);
        this.color = new THREE.Color(0x800020);
      }

      if (this.type == "TowerS2") {
        this.size = new THREE.Vector3(2, 2, 2);
        this.color = new THREE.Color(0x800020);
      }
      if (this.type == "TowerKitchen") {
        this.size = new THREE.Vector3(2, 2, 2);
        this.color = new THREE.Color(0x800020);
      }
      if (this.type == "TowerPrison") {
        this.size = new THREE.Vector3(2, 2, 2);
        this.color = new THREE.Color(0x800020);
      }
      if (this.type == "Pantry") {
        this.size = new THREE.Vector3(2, 1, 1);
        this.color = new THREE.Color(0xffdce2);
      }
    }

    getSize() {
      return this.size;
    }

    RotateRoom() {
      let x = this.size.x;
      let y = this.size.y;
      let z = this.size.z;

      this.size = new THREE.Vector3(z, y, x);
    }

    getType() {
      return this.type;
    }

    getColor() {
      return this.color;
    }

    setType(type) {
      if (type == "Start") {
        this.type = this.roomType.Start;
      }
      if (type == "Kitchen") {
        this.type = this.roomType.Kitchen;
      }
      if (type == "TowerS1") {
        this.type = this.roomType.Tower;
      }
      if (type == "TowerS2") {
        this.type = this.roomType.Tower;
      }
      if (type == "TowerKitchen") {
        this.type = this.roomType.Tower;
      }
      if (type == "TowerPrison") {
        this.type = this.roomType.Tower;
      }
      if (type == "GreatHall") {
        this.type = this.roomType.GreatHall;
      }
      if (type == "Pantry") {
        this.type = this.roomType.Pantry;
      }
      if (type == "Ward") {
        this.type = this.roomType.Ward;
      }
    }

    getRandPos(origin) {
      let numAttemptsToPlace = 30;
      // Loop 3 times to try and fit the room in the region at the origin
      for (let i = 0; i < numAttemptsToPlace; i++) {
        if (i > numAttemptsToPlace / 2) {
          //rotate the room
          this.rotateRoom();
        }

        //
      }
    }
  }

  return { CreateRoom: CreateRoom };
})();
