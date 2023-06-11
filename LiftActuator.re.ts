import * as RE from 'rogue-engine';
import * as THREE from 'three';

// Component to activate a lift component object
export default class LiftActuator extends RE.Component {
  // This is the object we will activate with this component
  @RE.props.object3d() liftPlatform: THREE.Object3D;
  // This is the object that will appear when selectStart happens
  @RE.props.material() highlightMaterial: THREE.Material;
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
    this.object3d.userData.currentTerminus = "bottom";
  }

  start() {
    
  }

  update() {
    // Check if the component has been targeted and trigger pressed
    
      if(this.object3d.userData.selectStart == true){
        
      }else{
        
      }
    
    if(this.object3d.userData.signal == true){
      //RE.Debug.log(this.object3d.userData.signalTerminus);
      if(this.object3d.userData.currentTerminus != this.object3d.userData.signalTerminus){
        this.object3d.userData.selected = true;
      }else{
        this.object3d.userData.signalFrom.userData.signal = true;
        this.object3d.userData.signalFrom = false;
        this.object3d.userData.signalTerminus = false;
      }
      this.object3d.userData.signal = false;
    }

    if(this.object3d.userData.atTerminus){
      this.object3d.userData.currentTerminus = this.object3d.userData.atTerminus;
      //RE.Debug.log(this.object3d.userData.signalTerminus);
      if(this.object3d.userData.currentTerminus == this.object3d.userData.signalTerminus){
        this.object3d.userData.signalFrom.userData.signal = true;
        this.object3d.userData.signalTerminus = false;
      }
      const mat = this.origMat;
      this.object3d.traverse( function ( child ) {
        if ( child instanceof THREE.Mesh ) {
            child.material = mat;
        }
      });
    }
   
    
    // Has the component been targetted and the select completed (endSelect)
    if(this.object3d.userData.selected == true){
      doHighlight(this);
      if(this.liftPlatform){
        this.liftPlatform.userData.liftActive = true;
        this.liftPlatform.userData.liftActuator = this.object3d;
      }
      this.object3d.userData.currentTerminus = "";
      this.object3d.userData.selected = false;
      this.object3d.userData.selectStart = false;
    }

    function doHighlight(comp: LiftActuator){
      const mat = comp.highlightMaterial;
      comp.object3d.traverse( function ( child ) {
        if ( child instanceof THREE.Mesh ) {
            child.material = mat;
        }
      });
    }
  }
}

RE.registerComponent(LiftActuator);
