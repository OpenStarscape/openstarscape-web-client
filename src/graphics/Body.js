import * as THREE from "three";
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

const emptyGeom = new THREE.BufferGeometry();
const upVec = new THREE.Vector3(0, 1, 0);
const sceneScale = 1;

/// The parent class for all 3D body types.
class Body {
  constructor(lifetime, scene, obj) {
    this.lt = lifetime;
    this.scene = scene;
    this.obj = obj;
    this.name = null; // Instead of us subscribing, the manager subscribes and uses the setter
    this.solidMat = new THREE.MeshBasicMaterial({color: 'white'});
    this.wireMat = new THREE.MeshBasicMaterial({color: 'white', wireframe: true});
    this.mesh = new THREE.Mesh(emptyGeom, this.wireMat);
    this.size = 1;
    this.getRawPos = this.obj.property('position').getter(this.lt);
    this.scene.add(this.mesh);

    this.labelDiv = document.createElement('div');
    this.labelDiv.className = 'body-label';
    this.labelDiv.style.marginTop = '1em';
    this.label = new CSS2DObject(this.labelDiv);
    this.label.visible = false;
    this.mesh.add(this.label);
  }

  isShip() {
    return false;
  }

  setToPosition(vec) {
    const raw = this.getRawPos();
    if (raw) {
      vec.copy(this.getRawPos());
      vec.multiplyScalar(sceneScale);
    }
  }

  position() {
    const result = new THREE.Vector3();
    this.setToPosition(result);
    return result;
  }

  setColor(color) {
    if (!color) {
      color = 0xFFFFFF;
    }
    this.wireMat.color.setHex(color);
    this.solidMat.color.setHex(color);
  }

  getName() {
    return this.name;
  }

  setName(name) {
    this.name = name;
    if (name !== null) {
      this.labelDiv.textContent = name;
      this.label.visible = true;
    } else {
      this.label.visible = false;
    }
  }

  update(cameraPosition) {
    this.setToPosition(this.mesh.position);
    const dist = this.mesh.position.distanceTo(cameraPosition);
    const scale = dist / 100 / this.size;
    if (scale > 1) {
      this.mesh.scale.setScalar(scale);
      this.mesh.material = this.solidMat;
    } else {
      this.mesh.scale.setScalar(1);
      this.mesh.material = this.wireMat;
    }
  }

  dispose() {
    this.scene.remove(this.mesh);
  }
}

class Celestial extends Body {
  constructor(lifetime, scene, obj) {
    super(lifetime, scene, obj)
    this.obj.property('color').subscribe(this.lt, color => this.setColor(color));
    this.obj.property('size').getThen(this.lt, km => {
      this.size = km * sceneScale;
      this.mesh.geometry = new THREE.SphereBufferGeometry(this.size, 16, 16);
    });
  }
}

class Ship extends Body {
  constructor(lifetime, scene, obj) {
    super(lifetime, scene, obj);
    this.setColor(0xFFFFFF);
    this.size = 0.25;
    this.mesh.geometry = new THREE.ConeGeometry(0.2, 0.5, 16);
    this.velocity = new THREE.Vector3();
    //this.previousVel = new THREE.Vector3();
    //this.thrustDir = new THREE.Vector3();
    this.obj.property('velocity').subscribe(this.lt, vel => {
      //this.thrustDir.subVectors(vel, this.previousVel);
      //this.thrustDir.normalize();
      //this.previousVel = vel;
      this.velocity.copy(vel);
      this.velocity.normalize();
      this.mesh.quaternion.setFromUnitVectors(upVec, this.velocity);
    });
  }

  isShip() {
    return true;
  }
}

export function makeBody(lifetime, scene, obj, callback) {
  obj.property('class').getThen(lifetime, cls => {
    if (!lifetime.isAlive()) {
      return;
    } else if (cls == 'celestial') {
      callback(new Celestial(lifetime, scene, obj));
    } else if (cls == 'ship') {
      callback(new Ship(lifetime, scene, obj));
    } else {
      console.error('unknown body class ', cls);
    }
  });
}
