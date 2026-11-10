import { useEffect, useState, type CSSProperties } from 'react';
import { useLocation } from 'react-router-dom';
import './seasons.css';
const SEASONS = ['spring','summer','autumn','winter'] as const;
type Season = typeof SEASONS[number];
const motionQuery='(prefers-reduced-motion: reduce)';
const files:Record<Season,string>={spring:'/images/garden-study-spring-v2.webp',summer:'/images/garden-study.webp',autumn:'/images/garden-study-autumn-v2.webp',winter:'/images/garden-study-winter-v2.webp'};
function calendarSeason():Season {return SEASONS[Math.floor(((new Date().getMonth()+10)%12)/3)];}
function limitedDevice() {const device=navigator as Navigator & {deviceMemory?:number;connection?:{saveData?:boolean}};return Boolean(device.connection?.saveData||(device.deviceMemory!==undefined&&device.deviceMemory<=4)||(device.hardwareConcurrency>0&&device.hardwareConcurrency<=4));}
function SeasonalScene({paused,lightweight}:{paused:boolean;lightweight:boolean}) {
  const [current,setCurrent]=useState<Season>(calendarSeason);
  const [next,setNext]=useState<Season|null>(null);
  useEffect(()=>{
    if(paused||next)return;
    let active=true;let image:HTMLImageElement|undefined;
    const timer = window.setTimeout(() => {
      const season = SEASONS[(SEASONS.indexOf(current) + 1) % SEASONS.length];
      image = new Image();
      image.onload = () => {
        if (!active) return;
        if (lightweight) setCurrent(season);
        else setNext(season);
      };
      image.src = files[season];
    }, lightweight ? 120000 : 110000);
    return()=>{active=false;clearTimeout(timer);if(image)image.onload=null;};
  },[paused,current,next,lightweight]);
  useEffect(()=>{if(!next||paused)return;const timer=window.setTimeout(()=>{setCurrent(next);setNext(null);},10000);return()=>clearTimeout(timer);},[next,paused]);
  const layer=(season:Season,incoming=false)=><div key={incoming?'next':'current'} className={`ambient-season${incoming?' ambient-season-incoming':''}`} data-season={season} style={{'--season-image':`url("${files[season]}")`} as CSSProperties}>
    {!lightweight && <div className="ambient-canopy"/>}
    <div className="ambient-left-branch"/>
  </div>;
  return <div className="ambient-seasons" data-season={current} data-lightweight={lightweight}>{layer(current)}{next&&layer(next,true)}</div>;
}
/** Images only. No video, canvas, WebGL or frame-by-frame JavaScript. */
export function AmbientBackground() {
  const {pathname}=useLocation();
  const [reduced,setReduced]=useState(()=>window.matchMedia(motionQuery).matches);
  const [hidden,setHidden]=useState(()=>document.hidden);
  const [lightweight]=useState(limitedDevice);
  const focused=/^\/exam\/\d+(?:\/review)?\/?$/.test(pathname)||/^\/placement\/?$/.test(pathname);
  useEffect(()=>{const media=window.matchMedia(motionQuery);const motion=()=>setReduced(media.matches);const visibility=()=>setHidden(document.hidden);media.addEventListener('change',motion);document.addEventListener('visibilitychange',visibility);return()=>{media.removeEventListener('change',motion);document.removeEventListener('visibilitychange',visibility);};},[]);
  const paused=reduced||hidden||focused;
  return <div className="ambient-background" data-paused={paused} aria-hidden="true"><div className="ambient-background-photo"/><SeasonalScene paused={paused} lightweight={lightweight}/><div className="ambient-background-light"/></div>;
}
