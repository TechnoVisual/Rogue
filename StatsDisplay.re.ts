import * as RE from 'rogue-engine';
import Stats from 'three/examples/jsm/libs/stats.module';

export default class StatsDisplay extends RE.Component {

  stat:Stats

  start() {
    this.stat = Stats();
    this.stat.setMode(0);
    this.stat.domElement.style.position = 'absolute';
    this.stat.domElement.style.left = '0';
    this.stat.domElement.style.top = '0';
    RE.Runtime.uiContainer.appendChild( this.stat.domElement );
  }

  update() {
    this.stat.update();
  }
}

RE.registerComponent(StatsDisplay);
        