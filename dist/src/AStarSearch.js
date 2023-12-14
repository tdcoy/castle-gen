import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

export const aStarSearch = (() => {
  /* 

        -Find a path between each adjacent nodes
        -If the path doesnt consist of triangles outside of the 2 rooms, 
          add a doorway where the path crosses the 2 rooms
        -If the path consits of triangles from the unUsedTriangles list, create a hallway

        -make going through exsisting hallways cheaper than making a new one
            ex) if(node == support room)
                    cost + 15
                if(node == major room)
                    cost + 10            
                if(node == nothing)
                    cost + 5
                if(node == hallway)
                    cost + 1

        -going through wards or major rooms is prefered over support rooms
        -all towers should be accessable by their support room only




    A* finds a path from start to goal.
    h is the heuristic function. h(n) estimates the cost to reach goal from node n.

      OPEN  // Set of nodes to be evaluated (adjacent triangles that havnet been checked)
      CLOSED  // Set of nodes already evaluated (adjacent triangles that have been checked)

      loop
        current = node in OPEN with the lowest f_cost
        remove current from OPEN
        add current to CLOSED

        // Path found
        if current is the target node (target is also the end node)
         return
        
        foreach adjacent of the current node
         if adjacent is not traversable or adjacent is in CLOSED
          skip to the next adjacent

          if new path to adjacent is shorter OR adjacent is not in OPEN
            set f_cost of adjacent
            set parent off adjacent to current
            
            if adjacent is not in OPEN
              add adjacent to OPEN 
*/
  class AStar {
    constructor() {}

    FindPath(start, goal, h) {
      this.start = start;
      this.goal = goal;
      this.h = h; //h_cost = dist from the node to the end node
      // The set of discovered nodes that may need to be (re-)expanded.
      // Initially, only the start node is known.
      // This is usually implemented as a min-heap or priority queue rather than a hash-set.
      this.openSet = [this.start];

      // For node n, cameFrom[n] is the node immediately preceding it on the cheapest path from the start
      // to n currently known.
      this.cameFrom = [];

      // For node n, gScore[n] is the cost of the cheapest path from start to n currently known.
      this.gScore = new Map();
      this.gScore.set(this.start, 0);

      // For node n, fScore[n] = gScore[n] + h(n). fScore[n] represents our current best guess as to
      // how cheap a path could be from start to finish if it goes through n.
      this.fScore = new Map();
      this.fScore.set(this.start, this.h(this.start));

      // This operation can occur in O(Log(N)) time if openSet is a min-heap or a priority queue
      while (this.openSet.length > 0) {
        //node in openSet having the lowest fScore[] value
        let current = 0;

        if (current == target) {
          return ReconstructPath(this.cameFrom, current);
        }

        // remove the current node from openSet
        this.openSet.delete(current);

        // Foreach adjacent node of current
            // d(current,adjacent) is the weight of the edge from current to adjacent
            // tentative_gScore is the distance from start to the adjacent through current
            //let tentative_gScore = gScore[current] + d(current, adjacent)

            //if tentative_gScore < gScore[adjacent]
            // This path to adjacent is better than any previous one. Record it!
            //cameFrom[adjacent] = current
            //gScore[adjacent] = tentative_gScore
            //fScore[adjacent] = tentative_gScore + h(adjacent)
            //if adjacent not in openSet
            //    openSet.add(adjacent)
            
        // Open set is empty but goal was never reached
        // return failure
      }
    }

    ReconstructPath(cameFrom, current){
        totalPath = current;

        //while current is in cameFrom keys:
            //current = cameFrom[current]
            //totalPath.prepend(current)
        //return totalPath
    }
  }
})();
