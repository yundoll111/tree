import * as THREE from 'three'
export class IslandAudio {
  private listener: THREE.AudioListener
  private bird?: THREE.PositionalAudio
  private wind?: THREE.PositionalAudio
  private started=false
  constructor(camera: THREE.Camera, scene: THREE.Scene) {
    this.listener=new THREE.AudioListener(); camera.add(this.listener)
    this.bird=new THREE.PositionalAudio(this.listener)
    this.wind=new THREE.PositionalAudio(this.listener)
    const birdBuffer=this.synthesize('bird'), windBuffer=this.synthesize('wind')
    this.bird.setBuffer(birdBuffer); this.bird.setRefDistance(5); this.bird.setLoop(true); this.bird.setVolume(.2)
    this.wind.setBuffer(windBuffer); this.wind.setRefDistance(12); this.wind.setLoop(true); this.wind.setVolume(.18)
    const birdAnchor=new THREE.Object3D(); birdAnchor.position.set(-2,5,1); birdAnchor.add(this.bird); scene.add(birdAnchor)
    const windAnchor=new THREE.Object3D(); windAnchor.position.set(0,2,0); windAnchor.add(this.wind); scene.add(windAnchor)
  }
  private synthesize(kind:'bird'|'wind') {
    const ctx=new AudioContext(), duration=kind==='bird'?1.8:4, rate=22050
    const buffer=ctx.createBuffer(1,rate*duration,rate), data=buffer.getChannelData(0)
    for(let i=0;i<data.length;i++){
      const t=i/rate, env=kind==='bird'?Math.pow(Math.max(0,Math.sin(t*Math.PI*2*2.3)),8):.3+.7*Math.sin(t*.7)
      const tone=kind==='bird'?Math.sin(2*Math.PI*(1250+350*Math.sin(t*8))*t):Math.sin(2*Math.PI*95*t)*.25
      data[i]=(tone*(kind==='bird'?.18:.06)+ (Math.random()-.5)*(kind==='bird'?.02:.13))*env
    }
    return buffer
  }
  start(){if(this.started)return; this.started=true; this.bird?.play();this.wind?.play()}
  toggleMute(muted:boolean){if(this.started)this.listener.setMasterVolume(muted?0:1)}
}