/*
  Rogue Engine Component
  AR base setup component to place a scene object in a scene at the position of a reticle.

  Mark Vanstone Nov 2023
  Use and abuse as you see fit. 
  Based on the Three.js example at: https://github.com/mrdoob/three.js/blob/master/examples/webxr_ar_hittest.html
  
  Check out my stuff at X @MindExplorers and @ArcVenture1
  https://arcventure.online || https://education.technovisual.co.uk/
  
  Mobile device hit test requires the view to be moved
  backwards and forwards to get depth info.

  Mobile device requires WebAR compatibility.
  
*/

import * as RE from 'rogue-engine';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';

export default class ARSceneConfig extends RE.Component {

  @RE.props.object3d() camera: THREE.Camera;  // the main scene camera
  @RE.props.object3d() sceneObject: THREE.Object3D; // the object that we want to place in the AR space

  reticle: THREE.Object3D;  // the circular marker
  controller: THREE.Group;  // detects the touch or controller select button
  hitTestSource = null;
  session;                  // stores the AR session handle
  referenceSpace;           // stores the AR 3D ref space

  showObject(object: THREE.Object3D){
    // position object at the reticle position and make visible
    const hitpoint = new THREE.Object3D;
    this.reticle.matrix.decompose( hitpoint.position, hitpoint.quaternion, hitpoint.scale );
    this.sceneObject.position.copy(hitpoint.position);
    object.visible = true;
    object.traverse(function( this: any, obj){
      obj.visible = true;
    });
  }

  hideObject(object: THREE.Object3D){
    // hide object in the scene
    object.visible = false;
    object.traverse(function( this: any, obj){
      obj.visible = false;
    });
  }

  start() {
    this.hideObject(this.sceneObject);
    // Set the scene to enable XR (AR) and add the button to the view.
    RE.Runtime.renderer.xr.enabled = true;
    document.body.appendChild(ARButton.createButton(RE.Runtime.renderer, { requiredFeatures: [ 'hit-test' ]}));
    // Add a controller to detect input. 
    this.controller = RE.Runtime.renderer.xr.getController( 0 );
		this.controller.addEventListener( 'select', () => {
      if ( this.reticle.visible ) {
        this.showObject(this.sceneObject);
        this.reticle.visible = false;
      }else{
        this.reticle.visible = true;
      }
    });
		RE.Runtime.scene.add( this.controller );
    // Create the circular reticle as a mesh and add it to the scene.
    const rmat = new THREE.MeshBasicMaterial();
    this.reticle = new THREE.Mesh(
      new THREE.RingGeometry( 0.15, 0.2, 32 ).rotateX( - Math.PI / 2 ), rmat
    );
    this.reticle.matrixAutoUpdate = false;
    this.reticle.visible = true;
    RE.Runtime.scene.add( this.reticle );
  }

  update(){
    // Detect where the reticle should be based on a hit test.
    this.session = RE.Runtime.renderer.xr.getSession();
    this.referenceSpace = RE.Runtime.renderer.xr.getReferenceSpace();
    if(this.session && this.reticle.visible == true){
      this.session.requestReferenceSpace( 'viewer' ).then( ref => {
        this.referenceSpace = ref;
        this.session.requestHitTestSource( { space: ref } ).then( source => {
          this.hitTestSource = source;
        } );
      });
      if(this.hitTestSource){
        const frame = RE.Runtime.renderer.xr.getFrame();
        const hitTestResults = frame.getHitTestResults( this.hitTestSource );
        if ( hitTestResults.length ) {
          let hit;
          hit = hitTestResults[ 0 ];
          this.reticle.matrix.fromArray( hit.getPose(this.referenceSpace).transform.matrix );
        }
      }
    }
  }
}

RE.registerComponent(ARSceneConfig);
        