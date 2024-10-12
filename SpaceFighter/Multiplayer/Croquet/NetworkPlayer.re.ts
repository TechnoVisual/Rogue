/*
  This is a RogueCroquet Network Player component
  In this case we attach it to a space ship prefab
  Keyboard, joystick and VR controls are defined

  see https://github.com/BeardScript/RogueCroquet for RogueCroquet setup details
  
  This version WIP October 2024 - M.Vanstone
  Use and abuse as you see fit.

*/

import * as RE from 'rogue-engine';
import * as THREE from 'three';
import { Actor } from '@RE/RogueEngine/rogue-croquet/Actor';
import { RogueCroquet } from '@RE/RogueEngine/rogue-croquet';
import CroquetPawn from '@RE/RogueEngine/rogue-croquet/CroquetPawn.re';

// Model for the NetworkPlayer
@RogueCroquet.Model
export class NetworkPlayerModel extends Actor {
  transform = {pos: new THREE.Vector3(), rot: new THREE.Quaternion()};
  engineOn = false;
  playerNumber = 0;
  playerGUID = 0;
  playerReady = false;
  isHit = false;

  update(n){
      this.playerNumber = n;
  }
}

// NetworkPlayer component
@RE.registerComponent
export default class NetworkPlayer extends CroquetPawn {

  @RE.props.object3d() camera: THREE.Camera;
  @RE.props.object3d() dolly: THREE.Object3D;
  @RE.props.prefab() laser: RE.Prefab;
  @RE.props.list.object3d() spawnpoints: THREE.Object3D[];
  @RE.props.object3d() laserTurret1: THREE.Object3D;
  @RE.props.object3d() laserTurret2: THREE.Object3D;
  @RE.props.prefab() explosion: RE.Prefab;
  @RE.props.audio() lasersound: THREE.Audio;

  model: NetworkPlayerModel;

  networkPos = new THREE.Vector3();
  networkRot = new THREE.Quaternion();
  mouseLookSpeed = 10;

  // ship values
  shipSpeed = 0;
  shipVRotate = 0;
  shipHRotate = 0;
  laserReady = 0;
  laserDelay = 1;

  // NetworkPlayerModel properties
  @NetworkPlayerModel.prop(100)
  engineOn = false;

  @NetworkPlayerModel.prop(100)
  isHit = false;

  @NetworkPlayerModel.prop(true)
  playerNumber = 0;

  @NetworkPlayerModel.prop(true)
  playerReady = false;

  @NetworkPlayerModel.prop(true)
  playerGUID: `${string}-${string}-${string}-${string}-${string}`;

  @NetworkPlayerModel.prop(100)
  fireLaser = 0;

  @NetworkPlayerModel.prop(100)
  get transform() {
    return {
      pos: this.object3d.position,
      rot: this.object3d.quaternion,
    }
  }

  set transform(v: {pos: THREE.Vector3, rot: THREE.Quaternion}) {
    this.networkPos.copy(v.pos);
    this.networkRot.copy(v.rot);
  }

  // Initialize the player
  init() {
    if (!this.isMe) {
      // Set the position of the player
      this.object3d.position.copy(this.model.transform.pos);
    }else{
      // Camera Setup
      this.camera.position.copy(this.dolly.position);
      this.camera.rotation.y = 1.5707963268;
      this.dolly.add(this.camera);
      // XR Input
      RE.Runtime.renderer.xr.addEventListener('sessionstart',  ()=> {
        this.dolly.position.y -= 1.2;
        this.dolly.rotation.y = 3.141593;
      });
      RE.Runtime.renderer.xr.addEventListener('sessionend',  ()=> {
        this.dolly.position.y += 1.2;
        this.dolly.rotation.y = 1.5707963268;
      });
      this.camera.rotation.order = 'YXZ';
    }
    // Set the player as a target
    this.object3d.userData["isTarget"] = true;
  }

  update() {
    if (!this.initialized) return;
    if (this.isMe) {
      window["PlayerNumber"] = this.playerNumber;
      if(window[`playerReady`]) {
        if(this.playerReady == false){
          this.playerReady = true;
          this.updateProp("playerReady");
        }
      }else{
        if(this.playerReady == true){
          this.playerReady = false;
          this.updateProp("playerReady");
        }
      }
    }

    if (window["gameLive"] == false) return;
    if (this.isMe) {
      this.getInput();
      const posChanged = !this.transform.pos.equals(this.model.transform.pos);
      const rotChanged = !this.transform.rot.equals(this.model.transform.rot);
      if (posChanged || rotChanged) this.updateProp("transform");
    } else {
      this.object3d.quaternion.slerp(this.networkRot, 30 * RE.Runtime.deltaTime);
      this.dampV3(this.object3d.position, this.networkPos, 20);
    }
    if(this.engineOn){
      this.object3d.userData["engineOn"] = true;
    }else{
      this.object3d.userData["engineOn"] = false;
    }
    if(this.transform.pos.x == 0 && this.transform.pos.y == 0){
      // we are at the default position - move to a spawn point.
      if(this.playerNumber){
        if(this.spawnpoints[this.playerNumber-1]){
          this.object3d.position.copy(this.spawnpoints[this.playerNumber-1].position);
          let r = new THREE.Quaternion;
          this.spawnpoints[this.playerNumber-1].getWorldQuaternion(r);
          this.object3d.rotation.setFromQuaternion(r);
          this.networkPos.copy(this.object3d.position);
          this.object3d.getWorldQuaternion(this.networkRot);
          this.updateProp("transform");
        }
      }
    }
    if(this.fireLaser){
      this.createLaserFire(this.fireLaser);
      this.fireLaser = 0;
      this.updateProp("fireLaser");
    }
    if(!this.object3d.userData["playerNumber"]) this.object3d.userData["playerNumber"] = this.playerNumber;
    if(this.object3d.userData["destroyTimer"]){
      this.isHit = true;
      this.updateProp("isHit");
      if(this.isMe && this.object3d.userData["destroyTimer"] > 200){
        this.camera.translateZ(.3);
        this.camera.translateY(0.02);
      }
      this.object3d.userData["destroyTimer"] -= 1;
      if(this.object3d.userData["destroyTimer"] == 50 || this.object3d.userData["destroyTimer"] == 150 || this.object3d.userData["destroyTimer"] == 0){
        let ex = this.explosion.instantiate();
        let pos = new THREE.Vector3;
        this.object3d.getWorldPosition(pos);
        ex.position.set(pos.x,pos.y,pos.z);
        console.log("Explosion");
      }
      if(this.object3d.userData["destroyTimer"] <= 0){
        this.object3d.parent?.remove(this.object3d);
      }
    }else{
      // no destroyTimer
      if(this.isHit){
        this.object3d.userData["destroyTimer"] = 300;
      }
    }
  }

  getInput() {
    // We get the values in the predefined "Move" Input Axis.
    let {x: hAxis, y: vAxis} = RE.Input.getAxes("Move");
    let delta = RE.Runtime.deltaTime;
    this.laserReady += delta;
    // VR input
    const session = RE.Runtime.renderer.xr.getSession();
    let i = 0;
    if (session) {
      if (session.inputSources){
        for (const source of session.inputSources) {
          if (!source.gamepad) continue;
          const data = {
            buttons: source.gamepad.buttons.map((b) => b.value),
            axes: source.gamepad.axes.slice(0)
          };
          if(data.buttons[0] && this.laserReady > this.laserDelay){
            this.fireLaser = this.playerNumber;
            this.updateProp("fireLaser");
            this.makeLaserSound();
            this.laserReady = 0;
          }
          if(i==1){
            hAxis = data.axes[2];
            vAxis = data.axes[3];
          }
          if(i==0){
            let sp = data.axes[3] * -1;
            if(data.axes[3] < 0){
              if(this.shipSpeed < 10){
                this.shipSpeed += sp*delta;
              }
            }
            if(data.axes[3] > 0){
              if(this.shipSpeed > 0){
                this.shipSpeed -= sp*delta;
              }
            }
          }
          i++;
        }
      }
    }
    
    // Keyboard and Mouse Input
    if(RE.Input.mouse.movementY || RE.Input.mouse.movementX){
        if(RE.Input.keyboard.getKeyPressed("ShiftLeft")){
          this.mouseLookSpeed = 100;
        }else{
          this.mouseLookSpeed = 10;
        }
        this.camera.rotation.x -= RE.Input.mouse.movementY / (100000/this.mouseLookSpeed);
        this.camera.rotation.y -= RE.Input.mouse.movementX / (50000/this.mouseLookSpeed);
    }
    // Fire laser?
    if(RE.Input.mouse.isLeftButtonPressed && this.laserReady > this.laserDelay){
      this.fireLaser = this.playerNumber;
      this.updateProp("fireLaser");
      this.makeLaserSound();
      this.laserReady = 0;
    }
    if(RE.Input.gamepads[0]){
      if(RE.Input.gamepads[0].getButtonDown(0) && this.laserReady > this.laserDelay){
        this.fireLaser = this.playerNumber;
        this.makeLaserSound();
        this.updateProp("fireLaser");
        this.laserReady = 0;
      }
    }
    
    // If movement input values are available,
    this.shipHRotate += (hAxis*delta)/30;
    this.shipVRotate += (vAxis*delta)/50;
    this.object3d.rotateZ(this.shipHRotate);
    this.object3d.rotateX(-this.shipVRotate);
    this.shipHRotate -= this.shipHRotate*(delta*3);
    this.shipVRotate -= this.shipVRotate*(delta*5);
    this.object3d.getWorldQuaternion(this.networkRot);
    // Accelerate 
    if(RE.Input.keyboard.getKeyPressed("Space")){
      if(this.shipSpeed < 1){
        this.shipSpeed += delta;
      }
    }
    // Brakes
    if(RE.Input.keyboard.getKeyPressed("ControlLeft")){
      if(this.shipSpeed > 0){
        this.shipSpeed -= delta/2;
      }
    }
    // gamepad speed 
    if(RE.Input.gamepads[0]){
      if(RE.Input.gamepads[0].gamepad.axes[2]){
        let sp = RE.Input.gamepads[0].gamepad.axes[2] *-1;
        if(sp > 0.1 && this.shipSpeed < 1) this.shipSpeed += sp*delta;
        if(sp < 0.1 && this.shipSpeed > 0) this.shipSpeed += sp*delta;
      }
    }
    // Move if speed > 0 and set Engine status
    this.engineOn = false;
    if(this.shipSpeed > 0){
      this.engineOn = true;
      this.shipSpeed -= delta/8;
      this.object3d.translateZ(this.shipSpeed);
      this.networkPos.copy(this.object3d.position);
    }
    this.updateProp("engineOn");
  }

  // Create a laser fire from the player's turrets
  createLaserFire(pn){
    const laser1 = this.laser.instantiate();
    laser1.userData["owner"] = pn;
    this.laserTurret1.getWorldPosition(laser1.position);
    laser1.rotation.set(this.object3d.rotation.x, this.object3d.rotation.y, this.object3d.rotation.z);
    const laser2 = this.laser.instantiate();
    laser2.userData["owner"] = pn;
    this.laserTurret2.getWorldPosition(laser2.position);
    laser2.rotation.set(this.object3d.rotation.x, this.object3d.rotation.y, this.object3d.rotation.z);
  }

  makeLaserSound(){
    // Audio
    this.lasersound.stop();
    this.lasersound.setVolume(0.5);
    this.lasersound.play();
  }
}
