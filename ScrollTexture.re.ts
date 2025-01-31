import * as RE from 'rogue-engine';
import * as THREE from 'three';

// Rogue Engine Component to scroll a texture over a mesh

@RE.registerComponent
export default class ScrollTexture extends RE.Component {

  @RE.props.num() scrollValueX = 1;
  @RE.props.num() scrollValueY = 1;
  
  objectMap : THREE.Texture;
  offset : THREE.Vector2;

  start() {
    this.getTextureObject();
    this.offset = new THREE.Vector2(0,0);
  }

  getTextureObject(){
    let mat = null;
    this.object3d.traverse( function ( child ) {
      if ( child instanceof THREE.Mesh ) {
        mat = child.material.map;
      }
    } );
    if(mat){
      this.objectMap = mat;
      console.log(mat);
    }
  }

  update() {
    let delta = RE.Runtime.deltaTime
    if(this.objectMap){
      this.objectMap.offset = this.offset;
      this.offset.setX(this.offset.x + (delta*this.scrollValueX));
      this.offset.setY(this.offset.y + (delta*this.scrollValueY));
    }else{
      this.getTextureObject();
    }
    
  }
}
