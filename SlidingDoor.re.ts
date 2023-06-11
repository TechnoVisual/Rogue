import * as RE from 'rogue-engine';
import * as THREE from 'three';
import RapierBody from '@RE/RogueEngine/rogue-rapier/Components/RapierBody.re'

export default class SlidingDoor extends RE.Component {
  @RE.props.num() slideTo_X = 0;
  @RE.props.num() slideTo_Y = 0;
  @RE.props.num() slideTo_Z = 0;
  @RE.props.num() timeToOpen = 1;
  doorClosed = true;
  startingPos : THREE.Vector3;
  moveDoor = false;
  move: THREE.Vector3;
  endPos: THREE.Vector3;
  thisObject: THREE.Object3D;
  moveCount = 0;

  awake() {
    this.thisObject = this.object3d;
    this.startingPos = this.object3d.position;
    let t = this.timeToOpen*30;
    this.move = new THREE.Vector3((this.slideTo_X/t),(this.slideTo_Y/t),(this.slideTo_Z/t));
    this.endPos = new THREE.Vector3(this.slideTo_X, this.slideTo_Y, this.slideTo_Z);
  }

  update() {

    if(this.object3d.userData.actuateDoor == true){
      if(this.moveCount == 0){
        this.moveDoor = true;
      }
      this.object3d.userData.actuateDoor = false;
    }

    if(this.moveDoor){
      if(this.doorClosed){
        moveDoorAdd(this.move, this);
        this.moveCount += 1;
        if (this.moveCount == this.timeToOpen*30){
          this.doorClosed = false;
          this.object3d.userData.doorOpen = true;
          this.moveDoor = false;
          this.moveCount = 0;
        }
      }else{
        moveDoorSub(this.move, this);
        this.moveCount += 1;
        if (this.moveCount == this.timeToOpen*30){
          this.doorClosed = true;
          this.object3d.userData.doorOpen = false;
          this.moveDoor = false;
          this.moveCount = 0;
        }
      }
    }

    function moveDoorAdd(mv: THREE.Vector3, comp:RE.Component){
      const rigidbody = RE.getComponent(RapierBody, comp.object3d);
      if(rigidbody){
        let newPos = rigidbody.body.translation();
        newPos.x += mv.x;
        newPos.y += mv.y;
        newPos.z += mv.z;
        rigidbody.body.setNextKinematicTranslation(newPos);
      }else{
        comp.object3d.position.add(mv);
      } 
    }

    function moveDoorSub(mv: THREE.Vector3, comp:RE.Component){
      const rigidbody = RE.getComponent(RapierBody, comp.object3d);
      if(rigidbody){
        let newPos = rigidbody.body.translation();
        newPos.x -= mv.x;
        newPos.y -= mv.y;
        newPos.z -= mv.z;
        rigidbody.body.setNextKinematicTranslation(newPos);
      }else{
        comp.object3d.position.add(mv);
      } 
    }
  }
}



RE.registerComponent(SlidingDoor);
