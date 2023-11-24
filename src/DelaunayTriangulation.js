import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

export const delaunay_triangulation = (() => {
  class Triangulate {
    constructor() {}

    Init(scene, points) {
      this.scene = scene;
      let vertices = [];
      for (let i = 0; i < points.length; i++) {
        const v = new Vertex(points[i].x, points[i].y);
        vertices.push(v);
      }

      this.Triangulation(vertices);
    }

    Triangulation(vertices) {
      // Create Super-triangle that contains all the points in the point list and add it to triangle list
      const st = this.CreateSuperTriangle(vertices);

      var triangles = [];
      triangles.push(st);

      // Triangulate each vertex
      for (let i = 0; i < vertices.length; i++) {
        triangles = this.AddVertex(vertices[i], triangles);
      }

      // Remove triangles that share edges with super triangle
      //triangles = triangles.filter(this.CheckEdge(triangle));

      // Remove triangles that share edges with super triangle
      triangles = triangles.filter(function (triangle) {
        return !(
          triangle.v0 == st.v0 ||
          triangle.v0 == st.v1 ||
          triangle.v0 == st.v2 ||
          triangle.v1 == st.v0 ||
          triangle.v1 == st.v1 ||
          triangle.v1 == st.v2 ||
          triangle.v2 == st.v0 ||
          triangle.v2 == st.v1 ||
          triangle.v2 == st.v2
        );
      });

      for (let i = 0; i < triangles.length; i++) {
        this.Draw(triangles[i]);
      }
      return triangles;
    }

    CreateSuperTriangle(vertices) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (let i = 0; i < vertices.length; i++) {
        minX = Math.min(minX, vertices[i].x);
        minY = Math.min(minX, vertices[i].y);
        maxX = Math.max(maxX, vertices[i].x);
        maxY = Math.max(maxX, vertices[i].y);
      }

      let dx = (maxX - minX) * 2;
      let dy = (maxY - minY) * 2;
      let v0 = new Vertex(minX - dx, minY - dy * 3);
      let v1 = new Vertex(minX - dx, maxY + dy);
      let v2 = new Vertex(maxX + dx * 3, maxY + dy);

      return new Triangle(v0, v1, v2);
    }

    AddVertex(vertex, triangles) {
      let edges = [];

      triangles = triangles.filter(function (triangle) {
        if (triangle.inCircumCircle(vertex)) {
          edges.push(new Edge(triangle.v0, triangle.v1));
          edges.push(new Edge(triangle.v1, triangle.v2));
          edges.push(new Edge(triangle.v2, triangle.v0));
          return false;
        }
        return true;
      });

      edges = this.UniqueEdges(edges);

      for (let i = 0; i < edges.length; i++) {
        triangles.push(new Triangle(edges[i].v0, edges[i].v1, vertex));
      }

      return triangles;
    }

    UniqueEdges(edges) {
      let uniqueEdges = [];

      for (let i = 0; i < edges.length; i++) {
        let isUnique = true;

        for (let j = 0; j < edges.length; j++) {
          if (i != j && edges[i].equals(edges[j])) {
            isUnique = false;
            break;
          }
        }

        isUnique && uniqueEdges.push(edges[i]);
      }

      return uniqueEdges;
    }

    Draw(triangles) {
      const geometryA = new THREE.BoxGeometry(1, 1, 1);
      const materialA = new THREE.MeshBasicMaterial({ color: 0xff0fff });
      const pointA = new THREE.Mesh(geometryA, materialA);
      this.scene.add(pointA);
      pointA.position.set(triangles.v0.x, 0, triangles.v0.y);

      const geometryB = new THREE.BoxGeometry(1, 1, 1);
      const materialB = new THREE.MeshBasicMaterial({ color: 0xff0fff });
      const pointB = new THREE.Mesh(geometryB, materialB);
      this.scene.add(pointB);
      pointB.position.set(triangles.v1.x, 0, triangles.v1.y);

      const geometryC = new THREE.BoxGeometry(1, 1, 1);
      const materialC = new THREE.MeshBasicMaterial({ color: 0xff0fff });
      const pointC = new THREE.Mesh(geometryC, materialC);
      this.scene.add(pointC);
      pointC.position.set(triangles.v2.x, 0, triangles.v2.y);

      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
      const points = [];
      points.push(new THREE.Vector3(triangles.v0.x, 0, triangles.v0.y));
      points.push(new THREE.Vector3(triangles.v1.x, 0, triangles.v1.y));
      points.push(new THREE.Vector3(triangles.v2.x, 0, triangles.v2.y));
      points.push(new THREE.Vector3(triangles.v0.x, 0, triangles.v0.y));

      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(lineGeometry, lineMaterial);
      this.scene.add(line);
    }
  }

  class Vertex {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }

    getX() {
      return this.x;
    }
    getY() {
      return this.y;
    }

    setX(x) {
      this.x = x;
    }

    setY(y) {
      this.y = y;
    }

    equals(v) {
      return v.x === this.x && v.y === this.y;
    }
  }

  class Edge {
    constructor(v0, v1) {
      this.v0 = v0;
      this.v1 = v1;
    }

    equals(edge) {
      return (
        (this.v0.equals(edge.v0) && this.v1.equals(edge.v1)) ||
        (this.v0.equals(edge.v1) && this.v1.equals(edge.v0))
      );
    }
  }

  class Triangle {
    constructor(v0, v1, v2) {
      this.v0 = v0;
      this.v1 = v1;
      this.v2 = v2;

      this.circumCenter = this.calcCircumCenter(this.v0, this.v1, this.v2);
      this.circumRadius = this.calcCircumRadius(this.circumCenter);
    }

    inCircumCircle(v) {
      let dx = this.circumCenter.x - v.x;
      var dy = this.circumCenter.y - v.y;
      return Math.sqrt(dx * dx + dy * dy) <= this.circumRadius;
    }

    calcCircumCenter(v0, v1, v2) {
      let sqrV0 = new Vertex(Math.pow(v0.x, 2), Math.pow(v0.y, 2));
      let sqrV1 = new Vertex(Math.pow(v1.x, 2), Math.pow(v1.y, 2));
      let sqrV2 = new Vertex(Math.pow(v2.x, 2), Math.pow(v2.y, 2));

      //float D = (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y)) * 2f;
      let dist =
        (v0.x * (v1.y - v2.y) + v1.x * (v2.y - v0.y) + v2.x * (v0.y - v1.y)) *
        2;
      //float x = ((SqrA.x + SqrA.y) * (B.y - C.y) + (SqrB.x + SqrB.y) * (C.y - A.y) + (SqrC.x + SqrC.y) * (A.y - B.y)) / D;
      let x =
        ((sqrV0.x + sqrV0.y) * (v1.y - v2.y) +
          (sqrV1.x + sqrV1.y) * (v2.y - v0.y) +
          (sqrV2.x + sqrV2.y) * (v0.y - v1.y)) /
        dist;
      //float y = ((SqrA.x + SqrA.y) * (C.x - B.x) + (SqrB.x + SqrB.y) * (A.x - C.x) + (SqrC.x + SqrC.y) * (B.x - A.x)) / D;
      let y =
        ((sqrV0.x + sqrV0.y) * (v2.x - v1.x) +
          (sqrV1.x + sqrV1.y) * (v0.x - v2.x) +
          (sqrV2.x + sqrV2.y) * (v1.x - v0.x)) /
        dist;
      //return new Vector2(x, y);
      return new Vertex(x, y);
    }

    calcCircumRadius(center) {
      //Radius is the distance from any vertex to the CircumCentre
      const dx = center.x - this.v0.x;
      const dy = center.y - this.v0.y;
      return Math.sqrt(dx * dx + dy * dy);
    }
  }

  return { Triangulate: Triangulate, Vertex: Vertex };
})();
