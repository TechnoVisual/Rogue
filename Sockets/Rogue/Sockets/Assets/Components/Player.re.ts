/*
  This is the Socket.io player component
  
  This version November 2025 - M.Vanstone
  Use and abuse as you see fit.

*/
import * as RE from 'rogue-engine';

@RE.registerComponent
export default class Player extends RE.Component {

  start() {

  }

  /**
   * The `update` function checks if the object is the local player and if the game is live before
   * updating its position based on input axes.
   */
  update() {
    const socketClient = RE.getComponentByName("SocketClient");
    if (socketClient) {
      if (this.object3d.name == "LocalPlayer" && socketClient.gameLive) {
        const delta = RE.Runtime.deltaTime;
        const axes = RE.Input.getAxes("Move");
        this.object3d.position.x += axes.x * delta;
        this.object3d.position.z += axes.y * delta;
      }
    }
  }
}
