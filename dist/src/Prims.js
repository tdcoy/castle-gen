import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
/*  Step 1: Determine an arbitrary vertex as the starting vertex of the MST.
    Step 2: Follow steps 3 to 5 till there are vertices that are not included 
            in the MST (known as fringe vertex).
    Step 3: Find edges connecting any tree vertex with the fringe vertices.
    Step 4: Find the minimum among these edges.
    Step 5: Add the chosen edge to the MST if it does not form any cycle.
    Step 6: Return the MST and exit
*/
export const prims = (() => {
  class FindMST {
    constructor(points) {
      this.points = points;
    }
  }

  return { FindMST: FindMST };
})();
