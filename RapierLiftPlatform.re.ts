import * as RE from 'rogue-engine';
import * as THREE from 'three';
import RapierBody from '@RE/RogueEngine/rogue-rapier/Components/RapierBody.re'

export default class RapierLiftPlatform extends RE.Component {
  @RE.props.object3d() platform: THREE.Object3D;
  @RE.props.num() liftBottom = 4;
  @RE.props.num() liftTop = 4;
  @RE.props.checkbox() stopAtTerminus = true;

  rigidbody: RapierBody | undefined;
  private moveDirection = 1;

  awake() {
    this.rigidbody = RE.getComponent(RapierBody, this.object3d);
  }

  start() {

  }

  update() {
    if (!this.rigidbody) return;
    let vel = this.moveDirection;
    const posy = this.platform.position.y;

    if(posy >= this.liftTop && this.moveDirection == 1){
      this.moveDirection = -1;
      vel = 0;
      if(this.stopAtTerminus){
        this.object3d.userData.liftActive = false;
        if(this.object3d.userData.liftActuator){
          this.object3d.userData.liftActuator.userData.atTerminus = "top";
        }
      }
    }
    
    if(posy <= this.liftBottom && this.moveDirection == -1){
      this.moveDirection = 1;
      vel = 0;
      if(this.stopAtTerminus) {
        this.object3d.userData.liftActive = false;
        if(this.object3d.userData.liftActuator){
          this.object3d.userData.liftActuator.userData.atTerminus = "bottom";
        }
      }
    }
    if(this.object3d.userData.liftActive){
      let newPos = this.rigidbody.body.translation();
      newPos.y += this.moveDirection/50;
      this.rigidbody.body.setNextKinematicTranslation(newPos);
    }else{
      //this.rigidbody.body.velocity.y = 0;
    }
    
    if (RE.Input.keyboard.getKeyPressed("KeyL")) {
      this.object3d.userData.liftActive = true;
    }
    if (RE.Input.keyboard.getKeyPressed("KeyO")) {
      this.object3d.userData.liftActive = false;
    }
  }
}

RE.registerComponent(RapierLiftPlatform);
