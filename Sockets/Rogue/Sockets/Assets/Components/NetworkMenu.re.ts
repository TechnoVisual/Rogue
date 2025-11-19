/*
  This a Socket.io game lobby component
  Attach to the root of a Scene, it creates an overlay (which stops mouse interaction with the scene)
  and allows players to create and join named games
  
  Requires a Socket.io node.js server to be running at the configured IP address
  
  This version November 2025 - M.Vanstone
  Use and abuse as you see fit.

*/
import * as RE from 'rogue-engine';

@RE.registerComponent
export default class NetworkMenu extends RE.Component {

  @RE.props.text() serverURL = 'http://localhost:3000';
  @RE.props.text() gameTitle = 'Socket.io Game';

  menudiv;
  gameID;
  socketClient;

  start() {
    let md = document.getElementById("menudiv");
    if(md) return;
    this.socketClient = RE.getComponentByName("SocketClient");
    let gameComponent = RE.getComponentByName("SocketGameConfig");
    if(gameComponent){
      this.gameID = gameComponent.appName;
    }
    
    this.menudiv = document.createElement("div");
    this.menudiv.id = "menudiv";
    
    this.menudiv.style.cssText = `
      z-index:10000;
      width:500px;
      height:500px;
      text-align:center;
      position:absolute;
      top:100px;
      right:calc(50% - 250px);
      color:black;
      background:rgba(255,255,255,0.6);
      font-family:Arial;
      border:2px solid white;
      border-radius:20px;
      font-size:20px;"
    `;
    this.menudiv.innerHTML = this.getMenu();

    document.body.appendChild(this.menudiv);

    RE.Runtime.onStop(() => {
      this.menudiv.remove();
    });

  }

  /**
   * The `update` function checks if a game is live and updates the display accordingly, allowing
   * players to return to the lobby by pressing the Escape key.
   * @returns If the `socketClient` is not defined or if the `menudiv` element is not found in the
   * document, the `update()` function will return early without making any changes. If the
   * `socketClient` is defined and the `menudiv` element is found, the function will update the display
   * of the `menudiv` based on the `gameLive` property of the `socketClient
   */
  update() {
    const sc = this.socketClient;
    if(!sc) return;
    let md = document.getElementById("menudiv");
    if(!md) return;
    if(sc.gameLive == true){
      md.style.display = "none";
    }else{
      md.style.display = "block";
      this.updatePlayers(sc);
    }
    // Escape brings back the lobby display
    if(RE.Input.keyboard.getKeyPressed("Escape")){
      window['playerReady'] = false;
      sc.leaveToLobby();
      sc.gameLive = false;
    }
  }

  /**
   * The function `updatePlayers` updates the player list displayed on the webpage based on the player
   * data received, including marking players as ready and determining if the game is live.
   * @param sc - The `sc` parameter in the `updatePlayers` function is the Socket Client ref. 
   * It has a property `playerList` which is an array of player objects.
   * @returns If the player number is not set (`!pn`), the function will return early and nothing will
   * be returned explicitly.
   */
  updatePlayers(sc){
    const pn = this.socketClient.playerNumber;
    if(!pn ) return;
    let pll = document.getElementById("playerList");
    if(pll){
      let plt = "";
      if(sc){
        let ready = 0;
        let count = 0;
        sc.playerList.forEach(pl =>{
          let pr = pl.playerReady;
          let pri = "";
          if(pr) {
            pri = "&check;";
            ready ++;
          }
          if(pl.playerNumber == pn){
            plt += '<p>YOU '+pri+'</p>';
          }else{
            plt += '<p>Player: '+pl.playerNumber+' '+pri+'</p>';
          }
          count ++;
        });
        if(ready == count && ready > 1){
          this.socketClient.gameLive = true;
        }
      }
      pll.innerHTML = plt;
    }
  }

  getMenu() {
    let mt = '<p><h3>'+this.gameTitle+'</h3></p><hr>' +
    'SERVER IP: <input id="sessionName" value="'+this.serverURL+'" style="width:250px;height:26px;border-radius:5px;padding:5px;font-size:20px;margin-top:2px;"> ' +
    '<button style="padding:10px;width:80px;border-radius:5px;" onclick="window[`playerReady`]=false; window[`newServer`] = document.getElementById(`sessionName`).value;">CHANGE</button><hr>' +
    '<strong>PLAYERS IN LOBBY</strong>' +
    "<div id='playerList'></div>" +
    '<hr><div id="buttonSection">' +
    '<button style="font-size:30px;font-weight:bold;padding:10px;width:200px;height:60px;border-radius:5px;" onclick="window[`playerReady`]=true;">Ready</button>' +
    '</div>';
    return mt;
  }
}
