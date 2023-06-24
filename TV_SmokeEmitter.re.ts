import * as RE from 'rogue-engine';
import * as THREE from 'three';

/*
  Rogue Engine 
  Smoke emitter 
  Mark Vanstone June 2023 

  Attach to a scene object
  Provide a texture and a colour for the visual appearance

  density = number of particles
  particleSize = width and height of each particle
  smokeVolume = base size of smoke object
  movementUp = how fast the fastest particle moves upwards
  movementSpeed = how fast the particles move away from each other

  Particles rotate towards the camera to make the
  smoke object look 3D as it is moved around

*/

export default class TV_SmokeEmitter extends RE.Component {
  @RE.props.texture() smokeTexture: THREE.Texture;
  @RE.props.color() color = new THREE.Color("#FFFFFF");
  @RE.props.num() density = 50;
  @RE.props.num() particleSize = 20;
  @RE.props.num() smokeVolume = 10;
  @RE.props.num() movementUp = 10;
  @RE.props.num() movementSpeed = 1;

  private smokeParticles: THREE.Sprite[] = [];
  private rotations: number[] = [];
  private dirs: number[] = [];

  start() {
    // Create an array for how the particles move in each direction
    // dictated by the movementSpeed property
    for (let i = 0; i < this.density; i++) {
      this.dirs.push(
        (Math.random() * this.movementSpeed) - (this.movementSpeed / 2),
        (Math.random() * this.movementSpeed / 2), 
        (Math.random() * this.movementSpeed) - (this.movementSpeed / 2) 
      );
      this.rotations.push(Math.random()-0.5);
    }

    // Create all the smoke particles
    // Each has a separate material so that we can change the opacity for each one
    for (var i = 0; i < this.density; i++)
      {   
          const smokeMaterial = new THREE.SpriteMaterial({ map: this.smokeTexture, opacity: 0.2, transparent: true, depthWrite: false, color: this.color});
          const smoke_element = new THREE.Sprite(smokeMaterial);
          smoke_element.scale.set(this.particleSize, this.particleSize, this.particleSize);
          smoke_element.position.set( Math.random()*(this.smokeVolume/2), Math.random()*(this.smokeVolume/2), Math.random()*(this.smokeVolume/2));
          smoke_element.rotation.z = Math.random() * 360;
                  
          this.object3d.add(smoke_element);
          this.smokeParticles.push(smoke_element);
      }
  }

  update() {
    // loop through all particles and update position and opacity
    // particles move up at different speeds depending on their index
    let delta = RE.Runtime.deltaTime;
    for(var i = 0; i < this.smokeParticles.length ; i++)
    {
        this.smokeParticles[i].position.y += (delta * (this.dirs[i]+(this.movementUp)));
        if(this.smokeParticles[i].position.y > this.smokeVolume/2){
          this.smokeParticles[i].material.opacity -= (0.03*delta);
          if(this.smokeParticles[i].material.opacity < 0){
            this.smokeParticles[i].position.y = 0;
            this.smokeParticles[i].material.opacity = 0;
          }
        }else{
          if(this.smokeParticles[i].material.opacity < 0.2){
            this.smokeParticles[i].material.opacity += (0.05*delta);
          }
        } 
        this.smokeParticles[i].geometry.rotateZ(this.rotations[i]*0.0005);
        
    }
  }
}

RE.registerComponent(TV_SmokeEmitter);
        