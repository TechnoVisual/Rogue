/*
  This RogueCroquet game config is based on the CroquetConfig component
  found in the rogue-croquet package
  see https://github.com/BeardScript/RogueCroquet for setup details
  
  This version October 2024 - M.Vanstone
  Use and abuse as you see fit.

*/
import * as RE from 'rogue-engine';
import * as Croquet from '@croquet/croquet';
import { RootModel } from '@RE/RogueEngine/rogue-croquet/RootModel';
import { RootView } from '@RE/RogueEngine/rogue-croquet/RootView';
import { RogueCroquet } from '@RE/RogueEngine/rogue-croquet';

@RE.registerComponent
export default class CroquetGameConfig extends RE.Component {
  static apiKey = "";
  static appId = "";

  @RE.props.text() appName = "";
  @RE.props.num(0) autoSleep = 30;
  @RE.props.num(0) rejoinLimit = 1000;

  time = 0;
  config;

  async startSession(){
    Croquet.App.root = RE.Runtime.rogueDOMContainer;

    this.config = await this.fetchConfig();
    RogueCroquet.mainSession = await Croquet.Session.join({
      apiKey: this.config.apiKey,
      appId: this.config.appId,
      name: this.appName,
      password: "secret",
      autoSleep: this.autoSleep,
      rejoinLimit: this.rejoinLimit,
      model: RootModel,
      view: RootView,
      step: "manual",
    });

    RogueCroquet.activeSession = RogueCroquet.mainSession;
    RogueCroquet.sessions.set(RogueCroquet.mainSession["id"], RogueCroquet.mainSession);

    RE.Runtime.onStop(() => {
      this.stopSession();
    });
  }

  async restartSession(){
    /*
      first rescue the camera from the player model if its attached
      if your camera is attached to a player you will need to do this
      If you have a fixed/following camera view you may just want
      to reset the position.
    */
    RE.Runtime.scene.add(RE.Runtime.camera);

    // Then restart the session with a new name
    this.stopSession();
    this.startSession();

  }

  async awake() {
    this.startSession();
  }

  beforeUpdate() {
    this.time += RE.Runtime.deltaTime;
    RogueCroquet.sessions.forEach(session => {
      session["step"](this.time);
    });

    // Check to see if a new session has been requested
    if(window['updateSession']){
      const input = document.getElementById("sessionName") as HTMLInputElement;
      if(input) {
        let newSession = input.value;
        this.appName = newSession;
        this.restartSession();
      }
      window['updateSession'] = false;
    }
  }

  stopSession(){
    RogueCroquet.sessions.forEach(session => {
      session["view"]?.unsubscribeAll();
      session["view"]?.detach();
      session["leave"]();
    });

    (RogueCroquet.mainSession as any) = undefined;
    (RogueCroquet.activeSession as any) = undefined;
    RogueCroquet.sessions.clear();
  }

  async fetchConfig() {
    // This gets your API key which needs to be defined
    // in /Static/corquet.json
    // see https://github.com/BeardScript/RogueCroquet for details

    const res = await fetch(RE.getStaticPath("croquet.json"));
    const config = await res.json();

    CroquetGameConfig.apiKey = config.apiKey;
    CroquetGameConfig.appId = config.appId;

    return config;
  }
}
