import { useCallback, useEffect, useRef, useState } from 'react'
import { Hand, Sun, Moon, Volume2, VolumeX, ChevronDown, ChevronUp, Flower2, RotateCw, Clock3, CloudRain, Sparkles } from 'lucide-react'
import { IslandScene } from './scene/Island'
import { IslandAudio } from './scene/audio'
import { useHandGestures, type Gesture } from './hooks/useHandGestures'
import { getStage, nextStage } from './logic/season'

const stageHints=['春芽初醒','盛夏花火','蜜蜂授粉','秋日結莢','種子歸土']
export default function App(){
  const canvasRef=useRef<HTMLCanvasElement>(null), sceneRef=useRef<IslandScene|null>(null), audioRef=useRef<IslandAudio|null>(null)
  const [hour,setHour]=useState(9),[stage,setStage]=useState(1),[collapsed,setCollapsed]=useState(false),[muted,setMuted]=useState(true),[rain,setRain]=useState(false),[auto,setAuto]=useState(false),[gestureText,setGestureText]=useState('等待手勢…')
  const [cameraOpen,setCameraOpen]=useState(false)
  const handleGesture=useCallback((g:Gesture)=>{
    if(g==='none')return
    const labels:Record<string,string>={pollinate:'張手 · 授粉花粉飛舞',drop:'握拳 · 豆莢落果',wind:'揮動 · 風車轉動',season:'YA 手勢 · 切換物候',time:'食指 · 時間前進'}
    setGestureText(labels[g]||'')
    if(g==='pollinate')setStage(2)
    if(g==='drop'){sceneRef.current?.dropFruit();setStage(4)}
    if(g==='wind')sceneRef.current?.rotateWindmill()
    if(g==='season')setStage(s=>nextStage(s) as number)
    if(g==='time')setHour(h=>(h+1)%24)
  },[])
  const hand=useHandGestures(handleGesture)
  useEffect(()=>{
    if(!canvasRef.current)return
    const scene=new IslandScene(canvasRef.current);sceneRef.current=scene
    const resize=()=>scene.resize(window.innerWidth,window.innerHeight)
    resize();window.addEventListener('resize',resize)
    return()=>{window.removeEventListener('resize',resize);scene.dispose()}
  },[])
  useEffect(()=>{if(sceneRef.current)sceneRef.current.setState({hour,stage,rain})},[hour,stage,rain])
  useEffect(()=>{if(!auto)return;const id=window.setInterval(()=>setHour(h=>(h+.025)%24),100);return()=>clearInterval(id)},[auto])
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if(e.code==='Space'){e.preventDefault();setAuto(v=>!v)}
      if(e.key.toLowerCase()==='h')setCollapsed(v=>!v)
      if(e.key.toLowerCase()==='m')setMuted(v=>!v)
      if(['1','2','3','4','5'].includes(e.key))setStage(Number(e.key)-1)
    }
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)
  },[])
  useEffect(()=>{if(!muted&&sceneRef.current&&!audioRef.current){audioRef.current=new IslandAudio(sceneRef.current.camera,sceneRef.current.scene)}audioRef.current?.toggleMute(muted)},[muted])
  const info=getStage(stage)
  const timeLabel=`${String(Math.floor(hour)).padStart(2,'0')}:${String(Math.floor((hour%1)*60)).padStart(2,'0')}`
  const demo=(g:Gesture)=>handleGesture(g)
  return <main className="relative h-[100dvh] w-full overflow-hidden bg-[#101c2c] text-white">
    <canvas ref={canvasRef} className="absolute inset-0 h-full w-full"/>
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/35 via-transparent to-slate-950/50"/>
    <header className="absolute left-5 right-5 top-5 flex items-start justify-between md:left-9 md:right-9">
      <div className="glass rounded-2xl px-4 py-3 md:px-5">
        <div className="flex items-center gap-2 text-[10px] tracking-[.28em] text-amber-200/90"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_#86efac]"/> ECOLOGICAL DREAMSCAPE</div>
        <h1 className="mt-1 text-lg font-semibold tracking-[.08em] md:text-2xl">天空鳳凰木 <span className="font-light text-white/55">· Sky Poinciana Island</span></h1>
        <p className="mt-1 text-xs text-white/60">一座隨時間呼吸的空中生態島</p>
      </div>
      <div className="glass hidden rounded-full px-4 py-2 text-xs text-white/75 sm:block">程序化生成 · 3D 生態體驗</div>
    </header>
    <aside className="absolute right-5 top-1/2 hidden -translate-y-1/2 flex-col gap-3 md:flex">
      <div className="glass rounded-2xl p-3 text-right"><div className="text-[10px] tracking-widest text-white/50">LOCAL TIME</div><div className="text-2xl font-light tabular-nums">{timeLabel}</div><div className="mt-1 text-xs text-amber-100/80">{hour>=6&&hour<18?'日光漫島':'星夜降臨'}</div></div>
      <div className="glass rounded-2xl p-3 text-right"><div className="text-[10px] tracking-widest text-white/50">PHENOLOGY</div><div className="text-lg">{info.name}</div><div className="text-xs text-white/55">{stageHints[stage]}</div></div>
    </aside>
    {cameraOpen&&<div className="glass absolute left-5 top-28 z-20 w-56 overflow-hidden rounded-2xl p-3 md:left-9"><video ref={hand.videoRef} muted playsInline className="w-full rounded-xl bg-black/40"/><p className="mt-2 text-xs text-white/70">{hand.status}</p><button className="mt-2 w-full rounded-lg bg-white/10 px-3 py-2 text-xs" onClick={hand.enabled?hand.stop:hand.start}>{hand.enabled?'關閉鏡頭':'啟用手勢辨識'}</button></div>}
    <div className="absolute bottom-5 left-1/2 z-10 w-[calc(100%-24px)] max-w-4xl -translate-x-1/2">
      <div className="glass overflow-hidden rounded-[24px] shadow-2xl shadow-black/30">
        <button onClick={()=>setCollapsed(v=>!v)} className="flex w-full items-center justify-between px-4 py-2.5 text-xs text-white/65">
          <span className="flex items-center gap-2"><Sparkles size={14} className="text-amber-200"/> ISLAND CONTROL · {gestureText}</span>{collapsed?<ChevronUp size={16}/>:<ChevronDown size={16}/>}
        </button>
        {!collapsed&&<div className="border-t border-white/10 px-4 pb-4 pt-3 md:px-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-white/80"><Clock3 size={14}/> 時間流動</span><span className="font-mono text-amber-100">{timeLabel}</span></div>
              <input aria-label="時間" type="range" min="0" max="23.99" step=".05" value={hour} onChange={e=>setHour(Number(e.target.value))} className="w-full accent-amber-200"/>
              <div className="mt-1 flex justify-between text-[10px] text-white/35"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={()=>setAuto(v=>!v)} className={`control-btn ${auto?'active':''}`} title="晝夜循環 Space">{auto?<Sun size={16}/>:<Moon size={16}/>}<span>{auto?'循環中':'晝夜循環'}</span></button>
              <button onClick={()=>setMuted(v=>!v)} className="control-btn" title="靜音 M">{muted?<VolumeX size={16}/>:<Volume2 size={16}/>}<span>{muted?'靜音':'音效'}</span></button>
              <button onClick={()=>setRain(v=>!v)} className={`control-btn ${rain?'active':''}`} title="切換細雨"><CloudRain size={16}/><span>細雨</span></button>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2"><Flower2 size={16} className="shrink-0 text-rose-200"/><div className="min-w-0"><div className="text-xs text-white/85">四季物候 <span className="text-white/40">· {info.subtitle}</span></div><div className="mt-1 flex gap-1">{stageHints.map((s,i)=><button key={s} onClick={()=>setStage(i)} className={`h-1.5 flex-1 rounded-full transition ${i<=stage?'bg-rose-200':'bg-white/15'}`} aria-label={s}/>)}</div></div></div>
            <div className="flex items-center gap-1">{stageHints.map((s,i)=><button key={s} onClick={()=>setStage(i)} className={`rounded-xl px-2.5 py-2 text-[11px] transition ${stage===i?'bg-rose-200/20 text-rose-100 ring-1 ring-rose-100/30':'bg-white/5 text-white/55 hover:bg-white/10'}`}>{i+1} {s}</button>)}</div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
            <div className="flex items-center gap-2 text-[11px] text-white/50"><Hand size={14}/> 手勢控制 <span className="hidden sm:inline">· 張手授粉 / 握拳落果 / 揮手旋轉 / YA 換季 / 食指調時</span></div>
            <div className="flex flex-wrap gap-1.5"><button className="mini-btn" onClick={()=>setCameraOpen(v=>!v)}><Hand size={13}/> {cameraOpen?'收起鏡頭':'開啟鏡頭'}</button><button className="mini-btn" onClick={()=>demo('pollinate')}>測試張手</button><button className="mini-btn" onClick={()=>demo('drop')}>測試落果</button><button className="mini-btn" onClick={()=>demo('wind')}>測試揮手</button><button className="mini-btn" onClick={()=>demo('season')}>測試 YA</button><button className="mini-btn" onClick={()=>demo('time')}>測試食指</button></div>
          </div>
          <div className="mt-2 text-center text-[9px] tracking-wider text-white/30">快捷鍵 H 收合 · SPACE 晝夜循環 · M 靜音 · 1–5 切換物候</div>
        </div>}
      </div>
    </div>
  </main>
}