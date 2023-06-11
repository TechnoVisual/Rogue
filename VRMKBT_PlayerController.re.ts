import * as RE from 'rogue-engine';
import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat'
import RogueRapier from '@RE/RogueEngine/rogue-rapier/Lib/RogueRapier'
import RapierBody from '@RE/RogueEngine/rogue-rapier/Components/RapierBody.re'
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';

/*
  Rogue Engine 
  VR or Touch Player controller with keyboard and mouse fallback for flatscreen
  Mark Vanstone June 2023 

  Provide Enter VR button if in VR browser
  Initialise controllers and display pointer rays if set.

  If no controllers are available fall back to hand control.

  If no VR, lock mouse (optional) with mouse click.
  Provide on-screen target if in non-VR state.

  Provide Touch controls if detected with left/right/forward/back
  widget in the bottom left of the screen - drag touch to rotate view.

  Requires Rapier Physics engine and acts as a Dynamic Rigid Body.

*/

export default class VRMKBT_PlayerController extends RE.Component {
  @RE.props.object3d() cameraDolly: THREE.Object3D;
  @RE.props.object3d() camera: THREE.Camera;
  @RE.props.num() fwdSpeed = 3;
  @RE.props.checkbox() lockMouse = true;
  @RE.props.num() mouseLookSpeedX = 5;
  @RE.props.num() mouseLookSpeedY = 10;
  @RE.props.checkbox() showPointers = true;
  @RE.props.checkbox() showTarget = true;
  @RE.props.num() cameraHeight = 2;

  private mouseLocked = false;
  private rotatedView = false;
  character: RAPIER.RigidBody;
  dummy: THREE.Object3D;
  initialized = false;
  characterDir = new THREE.Vector3();
  characterSidewaysDir = new THREE.Vector3();
  RightDir = new THREE.Vector3( 1, 0, 0 );
  playerObject: THREE.Object3D;
  hand1: THREE.XRHandSpace;
  hand2: THREE.XRHandSpace;
  curTouch = new THREE.Vector2(0,0);

  awake() {
    this.playerObject = this.object3d;
    this.playerObject.userData.objectHitList = new Array();
    const appContainer = RE.Runtime.uiContainer;
    if (!appContainer) return;
    appContainer.onmousedown = (e) => {
      if (this.lockMouse){
        RE.Input.mouse.lock();
        this.mouseLocked = true;
        if(this.showTarget){
          let targetcode = "color:red;position: absolute;top: 50%;left: 50%;margin-top: -8px;margin-left: -8px;width: 16px;height: 16px; font-size: 64px";
          let canv = RE.Runtime.uiContainer;
          if( !canv ) return;
          let target = document.getElementById('rogue-target');
          if(!target){
            var t = document.createElement("div");
            t.innerHTML = "&target;";
            t.setAttribute("id","rogue-target");
            t.setAttribute("style",targetcode);
            canv.appendChild(t);
          }
        }
      }
    }
    RE.Runtime.onStop(() => {
      if (!appContainer) return;
      appContainer.onmousedown = null;
      this.mouseLocked = false;
      let target = document.getElementById('rogue-target');
      if(target) appContainer.removeChild(target);
    });
  }

  beforeUpdate(): void {
    if (!RogueRapier.initialized) return;
    !this.initialized && this.init();
  }

  init() {
    const component = RE.getComponent(RapierBody, this.object3d);
    if (!component) {
      RE.Debug.logError("Player Controller did not find Rapier body on this object.");
    } else {
      this.character = component.body;
    }
    this.dummy = new THREE.Object3D();
  }

  start() {
    this.camera.translateY(this.cameraHeight);
   
    RE.Runtime.renderer.xr.enabled = true;
    document.body.appendChild(VRButton.createButton(RE.Runtime.renderer));

    // add controllers to our player object
    // configure controllers to select objects if they have
    // this.object3d.userData.selectable = true; in the awake method
    //Controller 1
    const controller1 = RE.Runtime.renderer.xr.getController( 0 );
    this.playerObject.add(controller1);
    controller1.addEventListener( 'selectstart', function(){
      getSelectedObject(controller1,0);
    } );

    controller1.addEventListener( 'selectend', function(){
      getSelectedObject(controller1,1);
    } );

    //Controller 2
    const controller2 = RE.Runtime.renderer.xr.getController( 1 );
    this.playerObject.add(controller2);
    controller2.addEventListener( 'selectstart', function(){
      getSelectedObject(controller2,0);
    } );

    controller2.addEventListener( 'selectend', function(){
      getSelectedObject(controller2,1);
    } );

    // a controller has had the trigger pressed or released
    // type 0 is start select and 1 is end select
    function getSelectedObject(controller, type = 0){
      const tempMatrix = new THREE.Matrix4();
      const raycaster = new THREE.Raycaster();
      // build a list of objects in the scene that are selectable
      let objectHitList: THREE.Object3D[];
      objectHitList=[];
      
      RE.Runtime.scene.traverse(function(obj){
        if(obj.userData.selectable){
          objectHitList.push(obj);
        }
      });

      // fire a raycast out from the controller
      tempMatrix.identity().extractRotation( controller.matrixWorld );
      raycaster.ray.origin.setFromMatrixPosition( controller.matrixWorld );
      raycaster.ray.direction.set( 0, 0, - 1 ).applyMatrix4( tempMatrix );
      // have we hit any objects on the hit list?
      const intersects = raycaster.intersectObjects( objectHitList );
      if ( intersects.length > 0 ) {
        // take the first hit result and send a message to the object
        // to indicate if it was select start or end (selected)

        if(type == 0){
          intersects[ 0 ].object.userData.selectStart = true;
        }else{
          intersects[ 0 ].object.userData.selected = true;
        }
      }
    }

    const controllerModelFactory = new XRControllerModelFactory();
    const handModelFactory = new XRHandModelFactory();

    // Hand 1 Add controller model with optional pointer ray
    const controllerGrip1 = RE.Runtime.renderer.xr.getControllerGrip( 0 );
    controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
    this.playerObject.add( controllerGrip1 );
    this.hand1 = RE.Runtime.renderer.xr.getHand( 0 );
		this.hand1.add( handModelFactory.createHandModel( this.hand1, "mesh" ) );

		this.playerObject.add( this.hand1 );
    if(this.showPointers) controller1.add( makeRay() );
    
    // Hand 2 Add controller model with optional pointer ray
    const controllerGrip2 = RE.Runtime.renderer.xr.getControllerGrip( 1 );
    controllerGrip2.add( controllerModelFactory.createControllerModel( controllerGrip2 ) );
    this.playerObject.add( controllerGrip2 );
    this.hand2 = RE.Runtime.renderer.xr.getHand( 1 );
		this.hand2.add( handModelFactory.createHandModel( this.hand2, "mesh" ) );
    this.playerObject.add( this.hand2 );
    if(this.showPointers) controller2.add( makeRay() );

    function makeRay(){
      // Pointy ray to attach to controllers
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( [ 0, 0, 0, 0, 0, - 1 ], 3 ) );
      geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( [ 0.5, 0.5, 0.5, 0, 0, 0 ], 3 ) );
      const material = new THREE.LineBasicMaterial( { vertexColors: true, blending: THREE.AdditiveBlending } );
      return new THREE.Line( geometry, material );
    }
  }

  update() {
    if(!this.character) return;
    let newPos = this.character.translation();
    this.object3d.getWorldDirection( this.characterDir );
    this.characterSidewaysDir.copy(this.RightDir).transformDirection( this.cameraDolly.matrixWorld );
    let movez = 0;
    let movex = 0;
    let movey = 0;
    this.character.resetTorques(true);

    if (!this.character) return;
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
          if(i==0){
            if(data.axes[2] != 0){
              if(!this.rotatedView) {
                let turnDeg = -30;
                if(data.axes[2] > 0) turnDeg = 30;
                  movey = turnDeg;
                  this.rotatedView = true;    
              }
            }else{
              this.rotatedView = false;
            }
          }
          if(i==1){
            movez = data.axes[3]/20;
            movex = data.axes[2]/20;
          }
          i++;
        }
      }
    }
    let touchControls = document.getElementById('rogue-touchcontrols');

    if(RE.Input.touch.touches[0]){
      let mdelta = this.isInTouchControl(RE.Input.touch.touches[0]);
      if(mdelta){
        if(RE.Input.touch.touches[0].deltaY){
          movez = (RE.Input.touch.touches[0].deltaY/30)*(Math.abs(mdelta.y/500));
        }else{
          movez = mdelta.y/1000;
        }
        if(RE.Input.touch.touches[0].deltaX){
          movex = (RE.Input.touch.touches[0].deltaX/30)*(Math.abs(mdelta.x/500));
        }else{
          movex = mdelta.x/1000;
        }
      }else{
        this.character.addTorque({x:0.0,y:-RE.Input.touch.touches[0].deltaX / (20/this.mouseLookSpeedX),z:0.0},true);
        this.cameraDolly.rotation.x -= RE.Input.touch.touches[0].deltaY / (2000/this.mouseLookSpeedY);
      }
    }

    if (RE.Input.keyboard.getKeyPressed("KeyD")) movex = .1;
    if (RE.Input.keyboard.getKeyPressed("KeyA")) movex = -.1;
    if (RE.Input.keyboard.getKeyPressed("KeyW")) movez = -.1;
    if (RE.Input.keyboard.getKeyPressed("KeyS")) movez = .1;

    if (RE.Input.keyboard.getKeyPressed("KeyQ")) movey = -this.mouseLookSpeedX/10;
    if (RE.Input.keyboard.getKeyPressed("KeyE")) movey = this.mouseLookSpeedX/10;

    newPos.x += (movez * this.characterDir.x) + (movex * this.characterSidewaysDir.x);
    newPos.y += (movez * this.characterDir.y) + (movex * this.characterSidewaysDir.y);
    newPos.z += (movez * this.characterDir.z) + (movex * this.characterSidewaysDir.z);
    this.character.setTranslation(newPos,true);
    if(RE.Input.mouse.movementY || RE.Input.mouse.movementX || movey){
      if(this.mouseLocked || movey ){
        const xh = RE.Input.mouse.movementX + (movey*50);
        if(xh != 0){
          this.character.addTorque({x:0.0,y:-xh / (200/this.mouseLookSpeedX),z:0.0},true);
        }else{
          this.character.resetTorques(true);
        }
        this.cameraDolly.rotation.x -= RE.Input.mouse.movementY / (20000/this.mouseLookSpeedY);
      }
    }
    if(RE.Input.touch.startTouches[0]){
      this.curTouch.x = RE.Input.touch.startTouches[0].x;
      this.curTouch.y = RE.Input.touch.startTouches[0].y;
      
      if(!touchControls){
        let canv = RE.Runtime.uiContainer;
        if( !canv ) return;
        let touchcode = "color:green; position: absolute;bottom: 10px;right: 10px;width: 200px; height: 200px; font-size: 64px;border:1px solid green; border-radius:100px;background-color:rgba(0,150,0,0.2)";
        var t = document.createElement("div");
        t.innerHTML = "";
        t.setAttribute("id","rogue-touchcontrols");
        t.setAttribute("style",touchcode);
        canv.appendChild(t);
      }
    }
    if(RE.Input.touch.endTouches[0]){
      if(RE.Input.touch.endTouches[0].x == this.curTouch.x && RE.Input.touch.endTouches[0].y == this.curTouch.y){
        let mouse: THREE.Vector2;
        let mouseX = this.curTouch.x;
        let mouseY = this.curTouch.y;
        let canv = document.getElementById('rogue-app');
        let rect: DOMRect;
        if( !canv )
          return;
        rect = canv.getBoundingClientRect();
        if( mouseX > ( rect.left + rect.width ) || mouseX < rect.left )
          return;
        if( mouseY > ( rect.top + rect.height ) || mouseY < rect.top )
          return;
        mouse = new THREE.Vector2(
          ( ( mouseX - rect.left ) / rect.width ) * 2 - 1,
          -( ( mouseY - rect.top ) / rect.height ) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera( mouse, this.camera );
        let objectHitList: THREE.Object3D[];
        objectHitList=[];
        
        RE.Runtime.scene.traverse(function(obj){
          if(obj.userData.selectable){
            objectHitList.push(obj);
          }
        });
        let intersects = raycaster.intersectObjects( objectHitList, true );

        if(intersects.length > 0){
          intersects[0].object.userData.selected = true;
        }
      }
      
    }

    if (RE.Input.keyboard.getKeyPressed("Escape")) this.mouseLocked = false;

    if(RE.Input.mouse.isLeftButtonDown){
      let mouse: THREE.Vector2;
      if(this.mouseLocked){
        mouse = new THREE.Vector2(0,0);
      }else{
        let mouseX = RE.Input.mouse.x;
        let mouseY = RE.Input.mouse.y;
        let canv = document.getElementById('rogue-app');
        let rect: DOMRect;
        if( !canv )
          return;
        rect = canv.getBoundingClientRect();
        if( mouseX > ( rect.left + rect.width ) || mouseX < rect.left )
          return;
        if( mouseY > ( rect.top + rect.height ) || mouseY < rect.top )
          return;
        mouse = new THREE.Vector2(
          ( ( mouseX - rect.left ) / rect.width ) * 2 - 1,
          -( ( mouseY - rect.top ) / rect.height ) * 2 + 1
        );
      }
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera( mouse, this.camera );
      let objectHitList: THREE.Object3D[];
      objectHitList=[];
      
      RE.Runtime.scene.traverse(function(obj){
        if(obj.userData.selectable){
          objectHitList.push(obj);
        }
      });
      let intersects = raycaster.intersectObjects( objectHitList, true );

      if(intersects.length > 0){
        for ( let i = 0; i < intersects.length; i ++ ) {
          if(intersects[i].object.userData.selectable){
            intersects[i].object.userData.selected = true;
            continue;
          }
        }
      }
    }
  }

  isInTouchControl(touch){
    let touchControls = document.getElementById('rogue-touchcontrols');
    if(touchControls){
      if(touch.x > touchControls.getBoundingClientRect().left && touch.y > touchControls.getBoundingClientRect().top){
        let centreX = touchControls.getBoundingClientRect().left + ((touchControls.getBoundingClientRect().right - touchControls.getBoundingClientRect().left) / 2);
        let centreY = touchControls.getBoundingClientRect().top + ((touchControls.getBoundingClientRect().bottom - touchControls.getBoundingClientRect().top) / 2);
        let xoffset = touch.x - centreX;
        let yoffset = touch.y - centreY;
        return {x:xoffset, y:yoffset};
      }
    }
    return false;
  }
}

RE.registerComponent(VRMKBT_PlayerController);
        