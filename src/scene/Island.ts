import * as THREE from 'three'
import { getStage, dayLighting } from '../logic/season'

type SceneState = { hour: number; stage: number; wind: number; rain: boolean }
const mat = (color: number, roughness = 1) => new THREE.MeshStandardMaterial({ color, roughness, flatShading: true })
const lerpColor = (a: number, b: number, t: number) => new THREE.Color(a).lerp(new THREE.Color(b), t)

export class IslandScene {
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 250)
  renderer: THREE.WebGLRenderer
  root = new THREE.Group()
  tree = new THREE.Group()
  leaves: THREE.InstancedMesh
  flowers: THREE.InstancedMesh
  pods: THREE.Group
  bees: THREE.Group
  fireflies: THREE.Points
  clouds: THREE.Group
  rain: THREE.LineSegments
  sun: THREE.Mesh
  moon: THREE.Mesh
  ambient: THREE.HemisphereLight
  key: THREE.DirectionalLight
  windmill: THREE.Group
  podVelocities: { mesh: THREE.Group; velocity: THREE.Vector3; landed: boolean }[] = []
  private clock = new THREE.Clock()
  private state: SceneState = { hour: 9, stage: 1, wind: 0.5, rain: false }
  private elapsed = 0

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.scene.background = new THREE.Color('#9bc9dc')
    this.camera.position.set(13, 10, 17)
    this.camera.lookAt(0, 2, 0)
    this.ambient = new THREE.HemisphereLight(0xc7e5ff, 0x62503d, 1.7)
    this.scene.add(this.ambient)
    this.key = new THREE.DirectionalLight(0xffe1ae, 2.4)
    this.key.position.set(-8, 16, 8)
    this.key.castShadow = true
    this.key.shadow.mapSize.set(1024, 1024)
    this.scene.add(this.key)
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.25))
    this.scene.add(this.root)
    this.buildIsland()
    this.buildTree()
    this.buildVillage()
    this.buildAtmosphere()
    this.buildWeather()
    this.renderer.setAnimationLoop(() => this.animate())
  }

  private buildIsland() {
    const grass = new THREE.Mesh(new THREE.CylinderGeometry(7.4, 6.6, 1.0, 10, 1), mat(0x78a96b))
    grass.position.y = 1.1; grass.castShadow = true; grass.receiveShadow = true; this.root.add(grass)
    // Stacked tapered rock strata meet the lawn edge, creating a continuous floating-island silhouette.
    const strata = [0x827b70, 0x625f5a, 0x454b50]
    strata.forEach((c, i) => {
      const layer = new THREE.Mesh(new THREE.CylinderGeometry(6.7 - i * 1.35, 5.7 - i * 1.2, 1.25, 10, 1), mat(c))
      layer.position.y = 0.05 - i * 1.12; layer.rotation.y = i * 0.17; layer.castShadow = true; this.root.add(layer)
    })
    const cliff = new THREE.Mesh(new THREE.ConeGeometry(4.6, 4.3, 9), mat(0x3e4148))
    cliff.position.y = -3.2; cliff.rotation.y = 0.15; cliff.castShadow = true; this.root.add(cliff)
    // Faceted rim stones soften the seam between turf and rock.
    for (let i=0;i<20;i++) {
      const a = i / 20 * Math.PI * 2
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.62, 0), mat(i%2?0x68645e:0x77736a))
      stone.position.set(Math.cos(a)*6.8, 0.55, Math.sin(a)*6.8); stone.scale.set(1.2,.7,.9); this.root.add(stone)
    }
    // Water pools and two narrow cascades.
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x5bbbd0, roughness: .22, metalness: .12, transparent: true, opacity: .86 })
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1.3, 24), waterMat)
    pool.rotation.x = -Math.PI/2; pool.position.set(-3.4, .62, -3.3); this.root.add(pool)
    for (const x of [-3.7, -2.7]) {
      const fall = new THREE.Mesh(new THREE.PlaneGeometry(.42, 4.5, 1, 12), waterMat)
      fall.position.set(x, -1.65, -5.85); fall.rotation.x = -.08; this.root.add(fall)
    }
    // Winding path.
    const path = new THREE.Mesh(new THREE.TorusGeometry(3.4, .28, 5, 48, Math.PI*1.4), mat(0xd4bd91))
    path.rotation.x = Math.PI/2; path.position.set(.3, 1.62, .2); path.rotation.z = .2; this.root.add(path)
  }

  private buildTree() {
    const bark = mat(0x72503a)
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.32,.65,4.2,7,4), bark)
    trunk.position.set(0,3.2,0); trunk.rotation.z = -.15; trunk.castShadow = true; this.tree.add(trunk)
    // Curved trunk and visible buttress roots.
    for(let i=0;i<5;i++) {
      const root = new THREE.Mesh(new THREE.ConeGeometry(.28,1.7,5), bark)
      const a=i*Math.PI*2/5; root.position.set(Math.cos(a)*.55,1.55,Math.sin(a)*.55); root.rotation.z=Math.cos(a)*.65; root.rotation.x=Math.sin(a)*.5; this.tree.add(root)
    }
    const branchMat = mat(0x79543b)
    for(let i=0;i<7;i++) {
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(.07,.2,2.8,6),branchMat)
      const a=i/7*Math.PI*2; branch.position.set(Math.cos(a)*1.05,4.5+Math.sin(i)*.25,Math.sin(a)*1.05)
      branch.rotation.z=-Math.cos(a)*.65; branch.rotation.x=Math.sin(a)*.65; this.tree.add(branch)
    }
    const dummy = new THREE.Object3D()
    const leafGeo = new THREE.IcosahedronGeometry(.22,0)
    this.leaves = new THREE.InstancedMesh(leafGeo, mat(0x3e8752), 520)
    this.flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.18,0), new THREE.MeshStandardMaterial({color:0xe34d35, emissive:0x57140d, flatShading:true}), 130)
    for(let i=0;i<520;i++) {
      const a=i*2.399, r=1.0+((i*17)%100)/100*2.2, y=4.3+((i*29)%100)/100*2.5
      dummy.position.set(Math.cos(a)*r,y,Math.sin(a)*r); dummy.scale.setScalar(.65+((i%4)*.15)); dummy.rotation.set(a,a*.7,0); dummy.updateMatrix(); this.leaves.setMatrixAt(i,dummy.matrix)
    }
    for(let i=0;i<130;i++) {
      const a=i*2.399, r=1.0+((i*17)%100)/100*2.15, y=4.7+((i*29)%100)/100*2.35
      dummy.position.set(Math.cos(a)*r,y,Math.sin(a)*r); dummy.scale.setScalar(.8); dummy.updateMatrix(); this.flowers.setMatrixAt(i,dummy.matrix)
    }
    this.tree.add(this.leaves,this.flowers)
    this.pods = new THREE.Group()
    const podMat=mat(0x70552d)
    for(let i=0;i<12;i++) {
      const pod=new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0,0),new THREE.Vector2(.09,.25),new THREE.Vector2(.06,.8),new THREE.Vector2(0,1.5)],7),podMat)
      pod.position.set(Math.sin(i*5)*2,4.1+(i%4)*.42,Math.cos(i*5)*2); pod.rotation.z=.35; this.pods.add(pod)
    }
    this.tree.add(this.pods); this.root.add(this.tree)
  }

  private buildVillage() {
    // Small Chinese garden houses, tiled roofs and lanterns.
    for(let i=0;i<4;i++) {
      const a=i/4*Math.PI*2, x=Math.cos(a)*4.5, z=Math.sin(a)*4.5
      const house=new THREE.Group()
      const body=new THREE.Mesh(new THREE.BoxGeometry(1.25,.9,1.05),mat(0xe5d2ad)); body.position.y=.55; house.add(body)
      const roof=new THREE.Mesh(new THREE.ConeGeometry(1.0,.55,4),mat(0x9a4b3c)); roof.position.y=1.3; roof.rotation.y=Math.PI/4; house.add(roof)
      house.position.set(x,1.6,z); house.rotation.y=-a; this.root.add(house)
      const lamp=new THREE.PointLight(0xffbd68,0,3); lamp.position.set(x,2.2,z); this.root.add(lamp)
      const orb=new THREE.Mesh(new THREE.SphereGeometry(.1,8,6),new THREE.MeshBasicMaterial({color:0xffc56b})); orb.position.copy(lamp.position); this.root.add(orb)
      ;(lamp as any).userData.lantern=true
    }
    const tower=new THREE.Group()
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.12,.18,3.6,7),mat(0x8c6548)); pole.position.y=3.4; tower.add(pole)
    const deck=new THREE.Mesh(new THREE.BoxGeometry(1.2,.18,1.2),mat(0x98704c)); deck.position.y=4.7; tower.add(deck)
    const cap=new THREE.Mesh(new THREE.ConeGeometry(.95,.55,4),mat(0x9c4e3e)); cap.position.y=5.1; cap.rotation.y=Math.PI/4; tower.add(cap)
    tower.position.set(4.2,1.5,-1.4); this.root.add(tower)
    this.windmill=new THREE.Group()
    const mast=new THREE.Mesh(new THREE.CylinderGeometry(.07,.1,2.2,6),mat(0x8c6548)); mast.position.y=1.1; this.windmill.add(mast)
    const hub=new THREE.Group(); hub.position.y=2.1
    for(let i=0;i<4;i++){const blade=new THREE.Mesh(new THREE.BoxGeometry(.13,1.5,.06),mat(0xe9e0c9)); blade.position.y=.8; blade.rotation.z=i*Math.PI/2; hub.add(blade)}
    this.windmill.add(hub); (this.windmill as any).userData.hub=hub
    this.windmill.position.set(-4.2,1.6,1.7); this.root.add(this.windmill)
    // A satellite bee orbiting the lookout tower.
    this.bees=new THREE.Group()
    for(let i=0;i<3;i++) {
      const bee=new THREE.Group()
      const body=new THREE.Mesh(new THREE.SphereGeometry(.12,8,6),mat(0xe8ae36)); body.scale.set(1.35,.8,.8); bee.add(body)
      const wingMat=new THREE.MeshBasicMaterial({color:0xeaf4ef,transparent:true,opacity:.8})
      for(const side of [-1,1]){const wing=new THREE.Mesh(new THREE.SphereGeometry(.09,7,5),wingMat); wing.position.set(0,.12,side*.1); bee.add(wing)}
      this.bees.add(bee)
    }
    this.root.add(this.bees)
  }

  private buildAtmosphere() {
    this.clouds=new THREE.Group()
    for(let i=0;i<18;i++) {
      const c=new THREE.Mesh(new THREE.SphereGeometry(.65+Math.random()*.45,8,6),new THREE.MeshBasicMaterial({color:0xeaf5f5,transparent:true,opacity:.34}))
      c.position.set((Math.random()-.5)*32,4+Math.random()*7,(Math.random()-.5)*24); c.scale.y=.35; this.clouds.add(c)
    }
    this.scene.add(this.clouds)
    const starsGeo=new THREE.BufferGeometry(), pts=[]
    for(let i=0;i<500;i++) pts.push((Math.random()-.5)*90,Math.random()*40+4,(Math.random()-.5)*90)
    starsGeo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3))
    this.fireflies=new THREE.Points(starsGeo,new THREE.PointsMaterial({color:0xffe9a0,size:.09,transparent:true,opacity:.0}))
    this.scene.add(this.fireflies)
    this.sun=new THREE.Mesh(new THREE.SphereGeometry(.7,16,12),new THREE.MeshBasicMaterial({color:0xffd27b}))
    this.moon=new THREE.Mesh(new THREE.SphereGeometry(.48,16,12),new THREE.MeshBasicMaterial({color:0xe7efff}))
    this.scene.add(this.sun,this.moon)
  }

  private buildWeather() {
    const points=[]
    for(let i=0;i<220;i++) points.push((Math.random()-.5)*16,Math.random()*12+1,(Math.random()-.5)*16)
    const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3))
    this.rain=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0xb9ddeb,transparent:true,opacity:0}))
    this.scene.add(this.rain)
  }

  setState(next: Partial<SceneState>) { this.state={...this.state,...next}; this.applyPhenology() }
  private applyPhenology() {
    const s=getStage(this.state.stage)
    this.flowers.visible=s.flower>.1
    this.flowers.material.opacity=s.flower; (this.flowers.material as THREE.Material).transparent=true
    this.pods.visible=s.fruit>.08
    this.leaves.visible=s.leaf>.1
  }
  dropFruit() {
    const pod=this.pods.children.find(p=>p.visible && p.userData.falling!==true)
    if(!pod) return
    pod.userData.falling=true
    const world=new THREE.Vector3(); pod.getWorldPosition(world)
    const falling=new THREE.Group(); const clone=pod.clone(); clone.position.set(0,0,0); falling.add(clone); falling.position.copy(world)
    this.scene.add(falling); pod.visible=false
    this.podVelocities.push({mesh:falling,velocity:new THREE.Vector3(.25,-.2,.1),landed:false})
  }
  rotateWindmill() { this.windmill.rotation.y += Math.PI/2 }
  resize(w:number,h:number) { this.camera.aspect=w/h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w,h,false) }
  private animate() {
    const dt=Math.min(this.clock.getDelta(),.04); this.elapsed+=dt
    const {daylight,night,warm}=dayLighting(this.state.hour)
    this.ambient.intensity=.42+daylight*1.45
    this.key.intensity=.18+daylight*2.35
    this.key.color.copy(lerpColor(0x7899d8,0xffd3a0,warm))
    this.scene.background=lerpColor(0x101b34,0x9bc9dc,daylight*.88+.08)
    this.sun.position.set(Math.cos((this.state.hour/24)*Math.PI*2)*22,Math.sin((this.state.hour/24)*Math.PI*2)*14+5,-12)
    this.moon.position.copy(this.sun.position).multiplyScalar(-1)
    this.sun.visible=daylight>.08; this.moon.visible=night>.35
    this.fireflies.material.opacity=night*.8
    this.clouds.children.forEach((c,i)=>{c.position.x+=dt*(.12+this.state.wind*.3); if(c.position.x>18)c.position.x=-18})
    this.bees.children.forEach((b,i)=>{const a=this.elapsed*(.7+i*.12)+i*2.1;b.position.set(Math.cos(a)*(2.6+i*.3),4.8+Math.sin(a*2)*.3,Math.sin(a)*(2.6+i*.3))})
    this.windmill.rotation.y+=dt*.15
    const hub=(this.windmill as any).userData.hub as THREE.Group; hub.rotation.z+=dt*1.7
    this.tree.rotation.z=Math.sin(this.elapsed*.8)*.012*this.state.wind
    this.rain.material.opacity=this.state.rain?.55:0
    const pos=this.rain.geometry.attributes.position as THREE.BufferAttribute
    for(let i=0;i<pos.count;i++){pos.setY(i,pos.getY(i)-dt*8); if(pos.getY(i)<0)pos.setY(i,12)}
    pos.needsUpdate=true
    this.podVelocities.forEach(p=>{
      if(!p.landed){p.velocity.y-=9.8*dt;p.mesh.position.addScaledVector(p.velocity,dt);p.mesh.rotation.z+=dt*2
        if(p.mesh.position.y<1.55){p.mesh.position.y=1.55;p.landed=true;p.velocity.set(0,0,0)}}
      else {p.mesh.rotation.z*=.92;p.mesh.position.y=1.55+Math.sin(this.elapsed*18)*.018}
    })
    this.renderer.render(this.scene,this.camera)
  }
  dispose(){this.renderer.setAnimationLoop(null);this.renderer.dispose()}
}