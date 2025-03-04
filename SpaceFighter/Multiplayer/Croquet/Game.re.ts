/*
  This RogueCroquet game component does the logic for a RogueCroquet game
  It initialises and tracks players in the game.

  see https://github.com/BeardScript/RogueCroquet for setup details
  based on https://github.com/BeardScript/RogueCroquet/blob/main/Assets/Components/Game.re.ts
  
  This version WIP October 2024 - M.Vanstone
  Use and abuse as you see fit.

*/
import * as RE from 'rogue-engine';
import CroquetView from '@RE/RogueEngine/rogue-croquet/CroquetView.re';
import { BaseModel } from '@RE/RogueEngine/rogue-croquet/BaseModel';
import { RootModel } from '@RE/RogueEngine/rogue-croquet/RootModel';
import { RogueCroquet } from '@RE/RogueEngine/rogue-croquet';

// To create a regular Model we extend the BaseModel class.
// The name must follow the format [component class name]Model.
// We use the @RogueCroquet.Model decorator to register it.
@RogueCroquet.Model
export class GameModel extends BaseModel {
  // A static model makes sure that there's only one instance of
  // this model for everyone. Ideal for Game Logic and simmilar.
  isStaticModel = true;
  
  // called internally when the model is initialized
  onInit() {
    window["players"] = [];
    window["playerCount"] = 0;
    this.update();
  }

  update() {
    // We find the RootModel in this session...
    const rootModel = this.wellKnownModel("modelRoot") as RootModel;
    // ...we iterate through its actors
    let pcount = 1;
    window["players"] = [];
    rootModel?.actors?.forEach(actor => {
      // ...and if they have an update method, we run it
      // with player count to set player number
      actor.model?.["update"] && actor.model["update"](pcount);
      window["players"].push(actor.model);
      pcount ++;
    });
    window["playerCount"] = pcount;

    // Then we run this method every 50 ms.
    this.future(50).update();
  }

  resetGame(){
    const rootModel = this.wellKnownModel("modelRoot") as RootModel;
    // ...we iterate through its actors
    rootModel?.actors?.forEach(actor => {
      actor.model.destroy();
    });
  }
}

// We extend the CroquetView Component to generate the View
// that will be interconnected with the GameModel.
@RE.registerComponent
export default class Game extends CroquetView {
  isStaticModel = true;
  // We create a field to drop the Prefab containing
  // our Player Actor.
  @RE.props.prefab() player: RE.Prefab;
  // This is called when both the Model and View are initialized.
  init() {
    // We instantiate our Player Actor.
    this.player.instantiate();
  }

  restart() {
    this.player.instantiate();
  }
    
}
