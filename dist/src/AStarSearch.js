import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

export const aStarSearch = (() => {
  /* 
        -If the path consits of triangles from the unUsedTriangles list, create a hallway

        
*/
  class AStar {
    constructor(start, end, nodes) {
      this.nodes = nodes;
      this.start = start;
      this.end = end;
      return this.FindPath();
    }

    FindPath() {
      //OPEN  // Set of nodes to be evaluated (adjacent triangles that havnet been checked)
      let open = [this.start];
      //CLOSED  // Set of nodes already evaluated (adjacent triangles that have been checked)
      let closed = [];

      let iterations = 0;
      let n = 500;

      while (open.length > 0) {
        //current = node in OPEN with the lowest f_cost
        var lowestIndex = 0;

        for (let i = 0; i < open.length; i++) {
          if (open[i].fCost < open[lowestIndex].fCost) {
            lowestIndex = i;
          }
        }

        // Set lowest fcost node to current
        let current = open[lowestIndex];

        // If current is the end node, a path has been found
        if (current === this.end) {
          // Return path

          let tmp = current;
          let path = [];
          //path.push(tmp);
          while (tmp.parent) {
            path.push(tmp);
            tmp = tmp.parent;

            if (path.length > 100) {
              console.log("something broke");
              break;
            }
          }

          return path.reverse();
        }

        // Remove current from OPEN
        open.splice(lowestIndex, 1);
        // Add current to CLOSED
        closed.push(current);

        let adjacents = current.adjacent;

        // Check all adjacent nodes
        for (let i = 0; i < adjacents.length; i++) {
          let adjacent = adjacents[i];

          // If the adjacent node is not in the closed list
          if (!closed.includes(adjacent)) {
            /* 
            Calculate Cost:
              -going through wards or major rooms is prefered over support rooms
              -all towers should be accessable by their support room only
              -make going through exsisting hallways cheaper than making a new one
                ex) if(node == support room)
                        cost + 15
                    if(node == major room)
                        cost + 10            
                    if(node == nothing)
                        cost + 5
                    if(node == hallway)
                        cost + 1
            */
            let cost = 0;

            // Empty node
            if (adjacent.room == undefined) {
              cost = current.gCost + 5;
            } else {
              // Hallway
              if (adjacent.room.type == "Hallway") {
                cost = current.gCost + 1;
              }
              // Major Room
              else if (adjacent.room.isMajor) {
                cost = current.gCost + 2;
              } else {
                // Support room
                cost = current.gCost + 2;
              }
            }

            /* switch (adjacent.room) {
              case undefined:
                cost = current.gCost + 5;
                break;
              case adjacent.room.type == "Hallway":
                cost = current.gCost + 1;
                break;
              case adjacent.room.isMajor == false:
                cost = current.gCost + 8;
                break;
              case adjacent.room.isMajor == true:
                cost = current.gCost + 2;
                break;
              default:
                console.log(adjacent.room.isMajor);
                cost = current.gCost + 10;
            } */

            // Need to check this node even if its not in open list
            if (!open.includes(adjacent)) {
              open.push(adjacent);
            } else if (cost >= adjacent.gCost) {
              continue;
            }

            adjacent.gCost = cost;
            adjacent.hCost = this.CalcHCost(adjacent, this.end);
            adjacent.fCost = adjacent.gCost + adjacent.hCost;
            adjacent.parent = current;
          }
        }

        if (iterations >= n) {
          console.log("Something broke in A*");
          break;
        } else {
          iterations++;
        }
      }
      return [];
    }

    CalcHCost(v1, v2) {
      let d1 = Math.abs(v2.position.x - v1.position.x);
      let d2 = Math.abs(v2.position.y - v1.position.y);

      return d1 + d2;
    }
  }

  return { AStar: AStar };
})();
