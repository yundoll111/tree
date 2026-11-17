import { useCallback, useEffect, useRef, useState } from 'react'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { gestureAction } from '../logic/season'

export type Gesture = 'pollinate'|'drop'|'wind'|'season'|'time'|'none'
export function useHandGestures(onGesture:(g:Gesture)=>void) {
  const videoRef=useRef<HTMLVideoElement>(null), landmarker=useRef<HandLandmarker|null>(null), stream=useRef<MediaStream|null>(null)
  const [enabled,setEnabled]=useState(false), [status,setStatus]=useState('尚未啟用鏡頭')
  const previous=useRef<boolean[]>()
  const stop=useCallback(()=>{stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;setEnabled(false);setStatus('鏡頭已關閉')},[])
  const start=useCallback(async()=>{
    try {
      setStatus('正在載入手勢模型…')
      const vision=await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm')
      landmarker.current=await HandLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',delegate:'GPU'},runningMode:'VIDEO',numHands:1})
      stream.current=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:640},audio:false})
      if(videoRef.current){videoRef.current.srcObject=stream.current;await videoRef.current.play()}
      setEnabled(true);setStatus('手勢辨識中 · 將手掌置於鏡頭前')
    } catch(e){setStatus('無法啟用鏡頭，請確認權限或使用 HTTPS / localhost');console.error(e)}
  },[])
  useEffect(()=>{
    let raf=0
    const detect=()=>{
      const video=videoRef.current, detector=landmarker.current
      if(enabled&&video&&detector&&video.readyState>=2){
        const result=detector.detectForVideo(video,performance.now())
        if(result.landmarks?.[0]){
          const p=result.landmarks[0], tips=[4,8,12,16,20], bases=[2,6,10,14,18]
          const fingers=tips.map((tip,i)=>i===0?Math.abs(p[tip].x-p[0].x)>Math.abs(p[bases[i]].x-p[0].x):p[tip].y<p[bases[i]].y)
          const action=gestureAction(fingers,previous.current) as Gesture
          if(action!=='none')onGesture(action)
          previous.current=fingers
        }
      }
      raf=requestAnimationFrame(detect)
    }
    raf=requestAnimationFrame(detect);return()=>cancelAnimationFrame(raf)
  },[enabled,onGesture])
  useEffect(()=>()=>{stream.current?.getTracks().forEach(t=>t.stop());landmarker.current?.close()},[])
  return {videoRef,enabled,status,start,stop}
}