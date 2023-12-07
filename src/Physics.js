import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

export const physics = (() => {
  //Create class to contain physics objects
  //When a particle is added to the system, springs need to be remade depending on where that particle is placed
  //Then all springs in the system need thier rest length re-calculated to avoid collisions
  class Spring {
    constructor(anchor, bob, k, damping, offset) {
      this.offset = offset; //How long the spring is
      this.k = k; // How stiff the spring is
      this.damping = damping; //How much energy is lost in the spring per contraction (start with 0.99)
      this.anchor = anchor;
      this.bob = bob;
      this.restLength = this.CalcRestLength();

      this.anchorParticle = new Particle(
        anchor.Target(),
        anchor.Mass(),
        damping
      );
      this.bobParticle = new Particle(bob.Target(), bob.Mass(), damping); //Start position
    }

    Update(timeElapsedS) {
      let force = new THREE.Vector2();
      force.subVectors(
        this.anchorParticle.Position(),
        this.bobParticle.Position()
      );

      let x = force.length() - this.restLength;
      force.normalize();
      force.multiplyScalar(this.k * x);

      this.bobParticle.ApplyForce(force);
      force.multiplyScalar(-1);
      this.anchorParticle.ApplyForce(force);

      this.bobParticle.Update();
      this.anchorParticle.Update();
    }

    CalcRestLength() {
      let distFromBobToAnchor = this.bob
        .Position()
        .distanceTo(this.anchor.Position());
      let anchorDistFromCenterToBounds = this.CalcHypSide(
        this.anchor,
        this.bob
      );

      let bobDistFromCenterToBounds = this.CalcHypSide(this.bob, this.anchor);

      let restLength =
        anchorDistFromCenterToBounds + bobDistFromCenterToBounds + this.offset;

      //console.log("anchor center to bounds:", anchorDistFromCenterToBounds);
      //console.log("bob center to bounds:", bobDistFromCenterToBounds);

      // If the bob and anchor are far apart
      if (distFromBobToAnchor > restLength) {
        console.log(
          "bob and anchor are far apart; distFromBobToAnchor:",
          distFromBobToAnchor,
          " RL:",
          restLength
        );
        restLength = distFromBobToAnchor + this.offset;
      }

      let b1 = this.anchor;
      let b2 = this.bob;
      let distToB1Bounds = 0;
      let b1SideA = this.CalcAdjSide(b1, b2);
      if (b1SideA == b1.Size().x) {
        distToB1Bounds = b1.Size().y / 2;
      } else {
        distToB1Bounds = b1.Size().x / 2;
      }

      let distToB2Bounds = 0;
      let b2SideA = this.CalcAdjSide(b2, b1);
      if (b2SideA == b2.Size().x) {
        distToB2Bounds = b2.Size().y / 2;
      } else {
        distToB2Bounds = b2.Size().x / 2;
      }

      // If the bob and anchor are too close
      if (restLength < distToB1Bounds + distToB2Bounds) {
        console.log("too close", distToB1Bounds, ", ", distToB2Bounds);
        restLength = distToB1Bounds + distToB2Bounds + this.offset;
      }

      console.log("rest length:", restLength);
      return restLength;
    }

    CalcAdjSide(b1, b2) {
      let b1Pos = b1.Position();
      let b2Pos = b2.Position();
      let b1Size = b1.Size();

      //if b2 is top left, top right, bottom left or bottom right of b1
      if (
        (b2Pos.x < b1Pos.x - b1Size.x && b2Pos.y > b1Pos.y + b1Size.y) ||
        (b2Pos.x > b1Pos.x + b1Size.x && b2Pos.y > b1Pos.y + b1Size.y) ||
        (b2Pos.x < b1Pos.x - b1Size.x && b2Pos.y < b1Pos.y - b1Size.y) ||
        (b2Pos.x > b1Pos.x + b1Size.x && b2Pos.y < b1Pos.y - b1Size.y)
      ) {
        // Check if b2 is further in the x or y axis from b1
        if (Math.abs(b2Pos.x) > Math.abs(b2Pos.y)) {
          //console.log("x side", b1Size.x);
          return b1Size.x;
        }
        if (Math.abs(b2Pos.x) == Math.abs(b2Pos.y)) {
          //return dist from center to corner
          let a = b1.Size.x;
          let b = b1.Size.y;
          let c = Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
          //console.log("B2 is in the diagonal");
          return c;
        } else {
          //console.log("y side", b1Size.y);
          return b1Size.y;
        }
      }

      // If b2 is above or below b1
      if (
        (b2Pos.x <= b1Pos.x + b1Size.x &&
          b2Pos.x >= b1Pos.x + b1Size.x &&
          b2Pos.y > b1Pos.y + b1Size.y) ||
        (b2Pos.x <= b1Pos.x + b1Size.x &&
          b2Pos.x >= b1Pos.x - b1Size.x &&
          b2Pos.y < b1Pos.y - b1Size.y)
      ) {
        //console.log("y side", b1Size.y);
        return b1Size.y;
      }

      //If b2 is left or right of b1
      else {
        //console.log("x side", b1Size.x);
        return b1Size.x;
      }

      /* //If b2 is left or right of b1
      if (
        (b2Pos.x < b1Pos.x - b1Size.x &&
          b2Pos.y <= b1Pos.y + b1Size.y &&
          b2Pos.y >= b1Pos.y - b1Size.y) ||
        (b2Pos.x > b1Pos.x + b1Size.x &&
          b2Pos.y <= b1Pos.y + b1Size.y &&
          b2Pos.y >= b1Pos.y - b1Size.y)
      ) {
        return b1.pos.x;
      } */
    }

    CalcHypSide(b1, b2) {
      let b1Pos = b1.Position();
      let b2Pos = b2.Position();
      let distToBounds = 0;
      let sideC = b1Pos.distanceTo(b2Pos);
      let sideA = this.CalcAdjSide(b1, b2);
      let sideB = 0;

      if (sideA == b1.Size().x) {
        sideB = Math.abs(Math.abs(b1Pos.y) - Math.abs(b2Pos.y));
        distToBounds = b1.Size().y / 2;
      } else {
        sideB = Math.abs(Math.abs(b1Pos.x) - Math.abs(b2Pos.x));
        distToBounds = b1.Size().x / 2;
      }

      let angleA = Math.asin(sideB / sideC);

     /*  console.log(
        "A:",
        sideA / 2,
        "B:",
        sideB,
        " , C:",
        sideC,
        " angleA:",
        angleA * (180 / Math.PI)
      );
 */
      let dist = Math.abs(sideB / Math.cos(angleA * (180 / Math.PI)));

      // if the 2 bounds are verticle or horizontal with one another
      if (
        angleA * (180 / Math.PI) == 90 ||
        angleA * (180 / Math.PI) == 0 ||
        (sideB == 0 && sideC == 0)
      ) {
        //console.log("special conditions");
        dist = distToBounds;
      }

      //console.log("Distance between rooms:", dist);
      return dist;
    }
  }

  class Particle {
    constructor(target, mass, damping) {
      this.position = new THREE.Vector2(target.position.x, target.position.z);
      this.acceleration = new THREE.Vector2();
      this.velocity = new THREE.Vector2();
      this.mass = mass;
      this.target = target;
      this.damping = damping;
    }

    ApplyForce(force) {
      let f = force.clone();
      f.divideScalar(this.mass);
      this.acceleration.add(f);
    }

    Position() {
      return this.position;
    }

    Update() {
      this.velocity.multiplyScalar(this.damping);
      this.velocity.add(this.acceleration);
      this.position.add(this.velocity);
      this.acceleration.multiplyScalar(0);
      this.target.position.set(this.position.x, 0, this.position.y);
    }
  }

  class BoundBox {
    constructor(scene, size, pos, mass) {
      this.size = size;
      this.mass = mass;
      this.pos = pos;
      this.scene = scene;
      this.target = this.CreateMesh();
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

    Position() {
      let pos = new THREE.Vector2(
        this.target.position.x,
        this.target.position.z
      );
      return pos;
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
  }
  return { Spring: Spring, Particle: Particle, BoundBox: BoundBox };
})();
