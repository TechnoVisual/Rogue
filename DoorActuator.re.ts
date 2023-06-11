import * as RE from 'rogue-engine';
import * as THREE from 'three';

export default class DoorActuator extends RE.Component {
  @RE.props.material() highlightMaterial: THREE.Material;
  @RE.props.num() highlightTimeout = 1;
  @RE.props.checkbox() waitForSignal = false;
  @RE.props.object3d() doorLeft: THREE.Object3D;
  @RE.props.object3d() doorRight: THREE.Object3D;
  @RE.props.object3d() liftActuator: THREE.Object3D;
  @RE.props.select() liftTerminus = 0;
  liftTerminusOptions = ["top", "bottom"];
  origMat : THREE.Material;
  matTimer = 0;

  awake() {
    // selectable is scanned by VRConfig on controller select
    this.object3d.userData.selectable = true;
    let mat = null;
    this.object3d.traverse( function ( child ) {
      if ( child instanceof THREE.Mesh ) {
        mat = child.material;
      }
    } );
    if(mat){
      this.origMat = mat;
    }
  }

  update() {
    // force signal 
    /*if (RE.Input.keyboard.getKeyPressed("KeyL")) {
      this.object3d.userData.signal = true;
    }*/

    if(this.object3d.userData.selected == true){
      
      if(this.highlightMaterial){
        doHighlight(this);
        if(!this.waitForSignal){
          this.matTimer = (this.highlightTimeout * 1000) + Date.now();
        }
      }
      if(!this.waitForSignal || this.doorLeft.userData.doorOpen || this.doorRight.userData.doorOpen){
        this.doorLeft.userData.actuateDoor = true;
        this.doorRight.userData.actuateDoor = true;
        this.matTimer = (this.highlightTimeout * 1000) + Date.now();
      }
      if(this.waitForSignal && this.liftActuator){
        this.liftActuator.userData.signal = true;
        this.liftActuator.userData.signalTerminus = this.liftTerminusOptions[this.liftTerminus];
        this.liftActuator.userData.signalFrom = this.object3d;
      }
      this.object3d.userData.selected = false;
    }



    function doHighlight(comp: DoorActuator){
      const mat = comp.highlightMaterial;
      comp.object3d.traverse( function ( child ) {
        if ( child instanceof THREE.Mesh ) {
            child.material = mat;
        }
      });
    }

    if(this.liftActuator && this.liftActuator.userData.currentTerminus != this.liftTerminusOptions[this.liftTerminus] && (this.doorLeft.userData.doorOpen || this.doorRight.userData.doorOpen)){
      this.doorLeft.userData.actuateDoor = true;
      this.doorRight.userData.actuateDoor = true;
    }

    if(this.liftActuator && this.liftActuator.userData.atTerminus == this.liftTerminusOptions[this.liftTerminus] && !(this.doorLeft.userData.doorOpen || this.doorRight.userData.doorOpen)){
      this.doorLeft.userData.actuateDoor = true;
      this.doorRight.userData.actuateDoor = true;
      this.liftActuator.userData.atTerminus = "";
    }

    if(this.matTimer > 0 && Date.now() > this.matTimer){
      const mat = this.origMat;
      this.object3d.traverse( function ( child ) {
        if ( child instanceof THREE.Mesh ) {
            child.material = mat;
        }
      });
      this.matTimer = 0;
    }

    if(this.object3d.userData.signal){
      const mat = this.origMat;
      this.object3d.traverse( function ( child ) {
        if ( child instanceof THREE.Mesh ) {
            child.material = mat;
        }
      });
      this.doorLeft.userData.actuateDoor = true;
      this.doorRight.userData.actuateDoor = true;
      this.object3d.userData.signal = false;
    }
  }
}

RE.registerComponent(DoorActuator);
