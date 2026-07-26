// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import {
  COLORBLIND_MODE_STORAGE_KEY,
  COLORBLIND_TYPE_STORAGE_KEY,
  COLORBLIND_TYPES,
  DEFAULT_COLORBLIND_TYPE,
  DEFAULT_TEXT_SIZE_STEP,
  DEFAULT_THEME_HUE,
  DYSLEXIC_FONT_STORAGE_KEY,
  LEGACY_THEME_HUE_CLEANUP,
  TEXT_SIZE_STEP_MAX,
  TEXT_SIZE_STEP_MIN,
  TEXT_SIZE_STORAGE_KEY,
  THEME_ACCENT_STORAGE_KEY,
  THEME_HUE_STORAGE_KEY,
  THEME_HUES,
  THEME_STORAGE_KEY,
} from "@/lib/theme-storage";
import { THEME_HUE_HEX } from "@/lib/apple-color-picker";

/** Inline boot script — avoids accent flash before React hydrates. */
export function buildThemeInitScript(): string {
  const presetHex = THEME_HUE_HEX;
  return `(function(){try{
var mk=${JSON.stringify(THEME_STORAGE_KEY)};
var ak=${JSON.stringify(THEME_ACCENT_STORAGE_KEY)};
var hk=${JSON.stringify(THEME_HUE_STORAGE_KEY)};
var dk=${JSON.stringify(DYSLEXIC_FONT_STORAGE_KEY)};
var cbk=${JSON.stringify(COLORBLIND_MODE_STORAGE_KEY)};
var tsk=${JSON.stringify(TEXT_SIZE_STORAGE_KEY)};
var min=${JSON.stringify(TEXT_SIZE_STEP_MIN)};
var max=${JSON.stringify(TEXT_SIZE_STEP_MAX)};
var defStep=${JSON.stringify(DEFAULT_TEXT_SIZE_STEP)};
var hues=${JSON.stringify([...THEME_HUES])};
var leg=${JSON.stringify([...LEGACY_THEME_HUE_CLEANUP])};
var defHue=${JSON.stringify(DEFAULT_THEME_HUE)};
var presetHex=${JSON.stringify(presetHex)};
var r=document.documentElement;
function clamp(n,a,b){return Math.min(b,Math.max(a,n));}
function parseHex(x){if(!x)return null;x=String(x).trim().replace(/^#/,"");if(/^[0-9a-fA-F]{6}$/.test(x))return"#"+x.toLowerCase();if(/^[0-9a-fA-F]{3}$/.test(x))return"#"+x.split("").map(function(c){return c+c;}).join("").toLowerCase();return null;}
function hexToHsb(hex){var p=parseHex(hex)||"#0071e3",v=p.slice(1),rn=parseInt(v.slice(0,2),16)/255,gn=parseInt(v.slice(2,4),16)/255,bn=parseInt(v.slice(4,6),16)/255,mx=Math.max(rn,gn,bn),mn=Math.min(rn,gn,bn),d=mx-mn,h=0;if(d){if(mx===rn)h=((gn-bn)/d)%6;else if(mx===gn)h=(bn-rn)/d+2;else h=(rn-gn)/d+4;h*=60;if(h<0)h+=360;}var s=mx===0?0:(d/mx)*100;return{h:h,s:s,b:mx*100};}
function hsbToHex(h,s,b){s=clamp(s,0,100)/100;b=clamp(b,0,100)/100;var c=b*s,hp=(clamp(h,0,360)/60)%6,x=c*(1-Math.abs(hp%2-1)),m=b-c,rn=0,gn=0,bn=0;if(hp<1)[rn,gn,bn]=[c,x,0];else if(hp<2)[rn,gn,bn]=[x,c,0];else if(hp<3)[rn,gn,bn]=[0,c,x];else if(hp<4)[rn,gn,bn]=[0,x,c];else if(hp<5)[rn,gn,bn]=[x,0,c];else[rn,gn,bn]=[c,0,x];function ch(n){return clamp(Math.round(n),0,255).toString(16).padStart(2,"0");}
return "#"+ch((rn+m)*255)+ch((gn+m)*255)+ch((bn+m)*255);}
function derive(hex,dark){var hsb=hexToHsb(hex),h=hsb.h,s=hsb.s,b=hsb.b;if(s<12)return dark?{accent:"#d1d1d6",bright:"#ebebf0"}:{accent:"#3a3a3c",bright:"#636366"};if(dark)return{accent:hsbToHex(h,clamp(s,42,100),clamp(b,52,82)),bright:hsbToHex(h,clamp(s*0.88,32,100),clamp(b+16,68,94))};if(b>=55&&b<=92&&s>=40)return{accent:hex,bright:hsbToHex(h,clamp(s*0.82,36,100),clamp(b+10,72,96))};return{accent:hsbToHex(h,clamp(s,48,100),clamp(b*0.52,26,54)),bright:hsbToHex(h,clamp(s*0.92,36,100),clamp(Math.max(b,50)*0.72,42,70))};}
function applyAccent(hex,dark){var p=derive(hex,dark);r.style.setProperty("--accent",p.accent);r.style.setProperty("--accent-bright",p.bright);r.style.setProperty("--brand-accent",p.accent);r.style.setProperty("--brand-accent-bright",p.bright);r.style.setProperty("--gold-text-bright",p.bright);r.style.setProperty("--brand-gold-text",p.bright);r.style.setProperty("--gold-text","color-mix(in srgb, "+p.accent+" 88%, var(--color-text))");}
function resolveAccent(){var raw=localStorage.getItem(ak);var hex=parseHex(raw);if(hex)return hex;var legacy=localStorage.getItem(hk);if(legacy&&hues.indexOf(legacy)>=0&&presetHex[legacy])return presetHex[legacy];if(legacy&&presetHex[legacy])return presetHex[legacy];return presetHex[defHue]||"#0071e3";}
var mode=localStorage.getItem(mk);var dark=mode==="dark";if(dark)r.classList.add("dark");else r.classList.remove("dark");
for(var i=0;i<hues.length;i++)r.classList.remove("theme-"+hues[i]);for(var j=0;j<leg.length;j++)r.classList.remove("theme-"+leg[j]);r.classList.add("theme-custom");
applyAccent(resolveAccent(),dark);
if(localStorage.getItem(dk)==="1")r.classList.add("dyslexic-font");else r.classList.remove("dyslexic-font");
var cbtk=${JSON.stringify(COLORBLIND_TYPE_STORAGE_KEY)};var cbts=${JSON.stringify([...COLORBLIND_TYPES])};var cbtDef=${JSON.stringify(DEFAULT_COLORBLIND_TYPE)};
if(localStorage.getItem(cbk)==="1"){r.classList.add("colorblind-mode");var cbt=localStorage.getItem(cbtk);if(cbts.indexOf(cbt)<0)cbt=cbtDef;r.setAttribute("data-cb-filter",cbt);r.style.filter="url(#cb-filter-"+cbt+")";}else{r.classList.remove("colorblind-mode");r.removeAttribute("data-cb-filter");r.style.filter="";}
r.classList.remove("text-size-small","text-size-large");var ts=localStorage.getItem(tsk);var st=defStep;if(ts==="small")st=-6;else if(ts==="medium")st=0;else if(ts==="large")st=13;else if(ts==="0")st=-6;else if(ts==="1")st=-4;else if(ts==="2")st=-2;else if(ts==="3")st=0;else if(ts==="4")st=4;else if(ts==="5")st=8;else if(ts==="6")st=13;else{var tn=parseInt(ts,10);if(!isNaN(tn))st=tn;}if(st<min)st=min;if(st>max)st=max;r.style.setProperty("--text-scale-step",String(st));
}catch(e){}})();`;
}
