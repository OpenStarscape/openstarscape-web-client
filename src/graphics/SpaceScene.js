import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import Lifetime from "../lib/Lifetime.js";
import ListProperty from "../lib/ListProperty.js";
import Starfield from '../graphics/Starfield.js';
import { makeBody } from "../graphics/Body.js";

/// Manages everything required to render a 3D space view with three.js.
export default class SpaceScene {
  constructor(state, domParent) {
    this.god = state.connection.god;
    this.currentShip = state.currentShip;
    this.lt = new Lifetime();
    this.domParent = domParent;
    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer({antialias: true});
    this.renderer.setClearColor('black');
    // TODO?: renderer.setPixelRatio( window.devicePixelRatio );
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.domParent.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.cameraController = new OrbitControls(this.camera, this.renderer.domElement);
    this.cameraController.target.set(0, 0, -50);

    this.starfield = new Starfield(this.lt, this.scene);

    this.bodyList = new ListProperty(this.god.property('bodies'), this.lt)
    this.bodyList.itemAdded.subscribe(this.lt, obj => {
      makeBody(this.lt, obj, body => {
        this.lt.add(body);
        this.bodyList.set(obj, body);
        this.scene.add(body.mesh);
      });
    });

    this.god.event('ship_created').subscribe(this.lt, obj => {
      this.currentShip.set(obj);
    });

    this.god.action('create_ship').fire([
      new THREE.Vector3(20000, 60000, 0),
      new THREE.Vector3(0, 0, 10000),
    ]);

    document.addEventListener("resize", () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });

    this.render();
  }

  updateCamera() {
    let body = this.bodyList.get(this.currentShip.get());
    let pos = new THREE.Vector3();
    if (body) {
      pos.copy(body.position());
    }
    let delta = new THREE.Vector3();
    delta.subVectors(pos, this.cameraController.target);
    this.camera.position.add(delta);
    this.cameraController.target.copy(pos);
    this.cameraController.update();
  }

  render() {
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.render());
  }
}