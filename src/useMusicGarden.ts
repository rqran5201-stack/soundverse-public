import {useEffect,useRef,type RefObject} from 'react'
import type {AudioSignals} from './audio/signals'
import {GardenConductor,LandscapeConductor,type MusicEvent} from './worlds/musicGarden'
export function useMusicGarden(signals:RefObject<AudioSignals>,enabled:boolean,sessionKey:string,onEvent:(event:Omit<MusicEvent,'sequence'>)=>void, landscape = false) {
  const current=useRef({enabled,sessionKey,onEvent});current.current={enabled,sessionKey,onEvent}
  useEffect(()=>{
    if(!enabled)return
    const conductor=(landscape ? new LandscapeConductor() : new GardenConductor());let previous=performance.now()
    const timer=window.setInterval(()=>{
      const now=performance.now(),dt=(now-previous)/1000;previous=now
      if(!current.current.enabled||current.current.sessionKey!==sessionKey||current.current.onEvent!==onEvent||document.visibilityState!=='visible')return
      const event=conductor.step(signals.current,dt)
      if(event)onEvent(event)
    },100)
    return ()=>window.clearInterval(timer)
  },[signals,enabled,sessionKey,onEvent,landscape])
}
