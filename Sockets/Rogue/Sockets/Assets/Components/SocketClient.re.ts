/*
  This a Socket.io game client
  Attach to the root of a Scene
  
  Requires a Socket.io node.js server to be running at the configured IP address
  
  This version November 2025 - M.Vanstone
  Use and abuse as you see fit.

*/
import * as RE from 'rogue-engine';
import * as THREE from 'three';
import io from 'socket.io-client';

@RE.registerComponent
export default class SocketClient extends RE.Component {

  @RE.props.text() serverURL = 'http://localhost:3000';
  @RE.props.prefab() playerPrefab: RE.Prefab;

  socket;
  playerObject: THREE.Object3D;
  public playerList;
  public playerNumber = "";
  public gameLive = false;

  start() {
    this.startClient();
  }

  /**
   * The `startClient` function sets up a Socket.IO connection, handles player joining, moving,
   * leaving, readiness, and menu actions, and manages player objects in a multiplayer game
   * environment.
   */
  startClient() {
    this.socket = io(this.serverURL);
    this.socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
      // Emit initial data, e.g., join a room
      this.socket.emit('joinGame', { playerId: this.object3d.uuid });  // Use Rogue's entity ID
      this.playerObject = this.playerPrefab.instantiate();
      this.playerObject.position.set(10 - (Math.random() * 20), 1.557, 10 - (Math.random() * 20));
      this.playerObject.name = "LocalPlayer";
      this.playerList = new Array();
      const p = { "id": this.object3d.uuid, "playerNumber": this.object3d.uuid, "playerReady": false };
      this.playerList.push(p);
      this.playerNumber = this.object3d.uuid;
    });

    // Listen for server events
    this.socket.on('playerJoined', (data) => {
      // Spawn a remote player model in Three.js, e.g., this.entity.scene.add(new THREE.Mesh(...))
      console.log("Player Joined : " + data.id);
      const remotePlayer = this.playerPrefab.instantiate();
      remotePlayer.name = "RemotePlayer_" + data.id;
      const p = { "id": data.id, "playerNumber": data.id, "playerReady": false };
      this.playerList.push(p);
    });

    this.socket.on('playerMoved', (data) => {
      // Update a remote player's Three.js object position/rotation
      const remotePlayer = this.getRemotePlayer(data.id);
      if (remotePlayer) {
        remotePlayer.position.set(data.x, data.y, data.z);
      } else {
        // player has not been created
        const remotePlayer = this.playerPrefab.instantiate();
        remotePlayer.name = "RemotePlayer_" + data.id;
        remotePlayer.position.set(data.x, data.y, data.z);
        const p = { "id": data.id, "playerNumber": data.id, "playerReady": false };
        this.playerList.push(p);
      }
      if (!this.getPlayerObject(data.id)) {
        const p = { "id": data.id, "playerNumber": data.id, "playerReady": false };
        this.playerList.push(p);
      }
    });

    this.socket.on('playerLeft', (data) => {
      // Remove the remote player from the scene
      if (RE.Runtime.isRunning) {
        const remotePlayer = this.getRemotePlayer(data);
        if (remotePlayer) {
          this.object3d.remove(remotePlayer);
        }
      }
      let tempP = new Array();
      this.playerList.forEach(p => {
        if (p.id != data) tempP.push(p);
      });
      this.playerList = tempP;
    });

    this.socket.on('playerReady', (data) => {
      this.playerList.forEach(p => {
        if (p.id == data) p.playerReady = true;
      });
    });

    this.socket.on('playerMenu', (data) => {
      this.playerList.forEach(p => {
        if (p.id == data) {
          p.playerReady = false;
          this.gameLive = false;
        }
      });
    });

    RE.Runtime.onStop(() => {
      if (this.playerObject) {
        this.object3d.remove(this.playerObject);
        this.socket.emit('playerExit');
        this.socket.close();
      }
    });
  }

/**
 * The function `getPlayerObject` retrieves a player object from a list based on the provided ID.
 * @param id - The `id` parameter is used to identify a specific player object in the `playerList`
 * array. The `getPlayerObject` function iterates through the `playerList` array to find and return the
 * player object that matches the given `id`.
 * @returns The `getPlayerObject` function is returning the player object with the specified `id` from
 * the `playerList` array. If a player with the matching `id` is found, the function returns that
 * player object. If no player with the specified `id` is found, the function returns `null`.
 */
  getPlayerObject(id) {
    let playerOb = null;
    this.playerList.forEach(p => {
      if (p.id == id) playerOb = p;
    });
    return playerOb;
  }

  /**
   * The `update` function checks for player movement, player readiness, and server changes, and
   * performs corresponding actions accordingly.
   */
  update() {
    if (this.socket.connected) {
      const playerPos = this.playerObject.position;  // Assuming your player entity has a Transform
      this.socket.emit('playerMove', {
        x: playerPos.x,
        y: playerPos.y,
        z: playerPos.z
      });
    }

    /* Set the local player to ready */
    if (window["playerReady"]) {
      // we clicked the ready button in the network menu
      this.socket.emit('playerReady');
      this.playerList[0].playerReady = true;
    }

    /* This block of code is checking if there is a value stored in `window["newServer"]`. If there is
    a value present, it performs the following actions: 
    
    Remove all players objects from the scene
    Reset the player list
    Close the current socket
    Start a new Socket connection
    
    */
    if (window["newServer"]) {
      this.serverURL = window["newServer"];
      window["newServer"] = null;
      this.object3d.remove(this.playerObject);

      this.playerList.forEach(p => {
        const ob = this.getRemotePlayer(p.id);
        if (ob) {
          this.object3d.remove(ob);
        }
      });
      this.playerList = new Array();
      this.socket.emit('playerExit');
      this.socket.close();
      setTimeout(() => {
        this.startClient();
      }, 1000);
    }
  }

  /**
   * The function `leaveToLobby` emits a 'playerMenu' event through a socket and sets the playerReady
   * property of the first player in the playerList array to false.
   */
  public leaveToLobby() {
    this.socket.emit('playerMenu');
    this.playerList[0].playerReady = false;
  }

  /**
   * The function `getRemotePlayer` returns a GameObject tagged with 'RemotePlayer' followed by the
   * provided id.
   * @param id - The `id` parameter is used to identify a specific remote player. It is typically a
   * unique identifier or reference that helps locate and retrieve the corresponding GameObject tagged
   * with 'RemotePlayer' + id.
   * @returns A GameObject tagged with 'RemotePlayer' followed by the provided id.
   */
  getRemotePlayer(id) {
    // e.g., Return a GameObject tagged with 'RemotePlayer' + id
    return RE.Runtime.scene.getObjectByName(`RemotePlayer_${id}`);
  }
}
