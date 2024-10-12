/*
  This a RogueCroquet game lobby component
  Attach to the root of a Scene, it creates an overlay (which stops mouse interaction with the scene)
  and allows players to create and join named games
  
  see https://github.com/BeardScript/RogueCroquet for setup details of RogueCroquet
  
  This version October 2024 - M.Vanstone
  Use and abuse as you see fit.

*/
import * as RE from 'rogue-engine';

@RE.registerComponent
export default class NetworkMenu extends RE.Component {

  menudiv;
  gameID;
  
  start() {
    let md = document.getElementById("menudiv");
    if(md) return;

    let gameComponent = RE.getComponentByName("CroquetGameConfig");
    if(gameComponent){
      this.gameID = gameComponent.appName;
    }
    
    this.menudiv = document.createElement("div");
    this.menudiv.id = "menudiv";
    
    this.menudiv.style.cssText = `
      z-index:10000;
      width:500px;
      height:400px;
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
    
    // gameLive will switch off lobby display and start the game
    window["gameLive"] = false;
    // playerReady will signal that the current player is ready
    window[`playerReady`] = false;

    RE.Runtime.onStop(() => {
      this.menudiv.remove();
    });
  }

  update() {
    let md = document.getElementById("menudiv");
    if(!md) return;
    if(window["gameLive"] == true){
      md.style.display = "none";
    }else{
      md.style.display = "block";
      this.updatePlayers();
    }
    // Escape brings back the lobby display
    if(RE.Input.keyboard.getKeyPressed("Escape")){
      window["playerReady"] = false;
      window["gameLive"] = false;
    }
  }

  getMenu() {
    let path = RE.getStaticPath("/Images");
    let mt = '<p><img src="'+path+'/SpaceFighter.png" style="width:350px;"></p><hr>';
    mt += 'LOBBY NAME: <input id="sessionName" value="'+this.gameID+'" style="width:160px;height:26px;border-radius:5px;padding:5px;font-size:20px;margin-top:2px;"> ';
    mt += '<button style="padding:10px;width:80px;border-radius:5px;" onclick="window[`playerReady`]=false; window[`updateSession`] = true;">Update</button><hr>';
    mt += 'PLAYERS IN LOBBY';
    mt += "<div id='playerList'></div>";
    mt += '<hr><div id="buttonSection">';
    mt += '<button style="padding:10px;width:80px;border-radius:5px;" onclick="window[`playerReady`]=true;">Ready</button>';
    mt += '</div>';
    return mt;
  }

  updatePlayers(){
    let pll = document.getElementById("playerList");
    if(pll){
      let plt = "";
      if(window["players"]){
        let ready = 0;
        let count = 0;
        window["players"].forEach(pl =>{
          let pr = pl.playerReady;
          let pri = "";
          if(pr) {
            pri = "&check;";
            ready ++;
          }
          if(window["PlayerNumber"] == pl.playerNumber){
            plt += '<p>Player '+pl.playerNumber+' (You) '+pri+'</p>';
          }else{
            plt += '<p>Player '+pl.playerNumber+' '+pri+'</p>';
          }
          count ++;
        });
        if(ready == count && ready > 1){
          window[`gameLive`]=true;
        }
      }
      pll.innerHTML = plt;
    }
  }

}
