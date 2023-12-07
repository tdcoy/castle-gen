import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

export const heaps_permutation = (() => {
  class HeapsPermutation {
    constructor() {
      this.shortestDist = Infinity;
      this.shortestPath = [];
    }

    shortestDist() {
      return this.shortestDist;
    }

    shortestPath() {
      return this.shortestPath;
    }

    // Generates all permutations of an array,
    // Takes the array, size of the array and n should be initalized as the array size
    GeneratePermutaion(arr, n) {
      // If size is equal to one, do something with array
      if (n == 1) {
        this.CalcShortestPath(arr);
      }

      for (let i = 0; i < n; i++) {
        this.GeneratePermutaion(arr, n - 1);

        // if size is odd, swap 0th i.e (first) and
        // (size-1)th i.e (last) element
        if (n % 2 == 1) {
          let temp = arr[0];
          arr[0] = arr[n - 1];
          arr[n - 1] = temp;
        }

        // If size is even, swap ith
        // and (size-1)th i.e last element
        else {
          let temp = arr[i];
          arr[i] = arr[n - 1];
          arr[n - 1] = temp;
        }
      }
    }

    // Calculates the shortest path between a list of points
    CalcShortestPath(arr) {
      //Ignore solutions that are in reverse order

      //if (arr[0] < arr[arr.length - 2]) {
      //Calculate length of path including returning to the starting point
      let totalDist = 0;

      for (let i = 0; i < arr.length; i++) {
        let next = (i + 1) % arr.length;
        console.log(next);
        //totalDist += LookUpDistance(arr[i], arr[next]);
        let v1 = new THREE.Vector2(arr[i]);
        let v2 = new THREE.Vector2(arr[next]);
        totalDist += v1.distanceTo(v2);
      }
      console.log(totalDist);
      // Save the path if this is the shortest path
      if (totalDist < this.shortestDist) {
        this.shortestDist = totalDist;
        this.shortestPath = arr.slice();
        console.log(this.shortestDist);
      }
      //}
    }

    sgeneratePermutations(a) {
      var permutations = [];
      var arr = a.slice();

      function swap(a, b) {
        var temp = arr[a];
        arr[a] = arr[b];
        arr[b] = temp;
      }

      function generate(arr, n) {
        if (n == 1) {
          permutations.push(arr.slice);
        } else {
          for (let i = 0; i <= n - 1; i++) {
            generate(arr, n - 1);
            swap(n % 2 == 0 ? i : 0, n - 1);
          }
        }
      }

      generate(arr, arr.length);
      return permutations;
    }

    findShortestPath(perms) {
      let permutations = perms.slice();
      let shortestTotalDist = Infinity;
      let shortestPath = [];

      for (let i = 0; i < permutations.length; i++) {
        let totalDist = 0;
        for (let j = 0; j < permutations[i].length - 1; j++) {
          let v1 = new THREE.Vector2().copy(permutations[i][j]);
          let v2 = new THREE.Vector2().copy(permutations[i][j + 1]);

          totalDist += v1.distanceTo(v2);
        }

        if (totalDist < shortestTotalDist) {
          shortestTotalDist = totalDist;
          shortestPath = permutations[i].slice();
        }
      }

      return shortestPath;
    }

    generatePermutations(Arr) {
      var permutations = [];
      var A = Arr.slice();

      function swap(a, b) {
        var tmp = A[a];
        A[a] = A[b];
        A[b] = tmp;
      }

      function generate(n, A) {
        if (n == 1) {
          permutations.push(A.slice());
        } else {
          for (var i = 0; i <= n - 1; i++) {
            generate(n - 1, A);
            swap(n % 2 == 0 ? i : 0, n - 1);
          }
        }
      }
      generate(A.length, A);
      return permutations;
    }

    generateRoutes(points) {
      var pems = this.generatePermutations(points.slice(1));
      for (var i = 0; i < pems.length; i++) {
        pems[i].unshift(points[0]);
        pems[i].push(points[0]);
      }
      return pems;
    }
  }

  return { HeapsPermutation: HeapsPermutation };
})();
