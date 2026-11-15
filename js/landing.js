(function(){
'use strict';
const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Earth: procedural globe rendered to canvas (original, no image assets) ----------
const TW=1024,TH=512;let TEX=null,CLOUD=null;
function hash(x,y,z){let h=x*374761393+y*668265263+z*2147483647;h=(h^(h>>>13))*1274126177;return ((h^(h>>>16))>>>0)/4294967295;}
function vnoise(x,y,z){const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z),xf=x-xi,yf=y-yi,zf=z-zi,s=t=>t*t*(3-2*t),u=s(xf),v=s(yf),w=s(zf),L=(a,b,t)=>a+(b-a)*t;
  return L(L(L(hash(xi,yi,zi),hash(xi+1,yi,zi),u),L(hash(xi,yi+1,zi),hash(xi+1,yi+1,zi),u),v),L(L(hash(xi,yi,zi+1),hash(xi+1,yi,zi+1),u),L(hash(xi,yi+1,zi+1),hash(xi+1,yi+1,zi+1),u),v),w);}
function fbm(x,y,z,o){let a=0,f=1,amp=.5;for(let i=0;i<o;i++){a+=amp*vnoise(x*f,y*f,z*f);f*=2.03;amp*=.5;}return a;}
function buildTex(){
  TEX=new Uint8ClampedArray(TW*TH*3);CLOUD=new Float32Array(TW*TH);
  for(let j=0;j<TH;j++){const lat=(0.5-j/TH)*Math.PI,cl=Math.cos(lat),sl=Math.sin(lat);
    for(let i=0;i<TW;i++){const lon=i/TW*Math.PI*2,x=cl*Math.cos(lon),y=sl,z=cl*Math.sin(lon),k=j*TW+i;
      const h=fbm(x*1.7+11,y*1.7+3,z*1.7+7,5), ice=Math.abs(lat)>1.22+(fbm(x*4,y*4,z*4,2)-.5)*.2;
      let r,g,b;
      if(ice){r=226;g=236;b=255;}
      else if(h>0.535){const t=Math.min(1,(h-.535)*5),d=fbm(x*6,y*6,z*6,3);            // land: muted greens/tans, blue-tinted
        r=70+60*t+30*d;g=96+40*t+20*d;b=92+30*t;}
      else{const t=Math.max(0,Math.min(1,(h-.36)/.175));r=8+22*t;g=36+60*t;b=96+90*t;}  // ocean: deep to shelf blue
      TEX[k*3]=r;TEX[k*3+1]=g;TEX[k*3+2]=b;
      const c=fbm(x*3.1+40,y*3.1,z*3.1,5);CLOUD[k]=Math.max(0,Math.min(1,(c-.5)*3.2));}}
}
function earth(canvas,opts){
  if(!canvas)return;const c=canvas.getContext('2d');let S=0,raf=0,on=true,lut=null,img=null,t0=performance.now();
  const pad=.09;
  function setup(){const css=canvas.clientWidth||600;S=Math.round(Math.min(opts.max||520,css*Math.min(1.5,devicePixelRatio||1)));
    canvas.width=S;canvas.height=S;img=c.createImageData(S,S);const R=S*(0.5-pad),cx=S/2,cy=S/2;lut=[];
    const L=[-.55,.42,.72],ll=Math.hypot(...L);L[0]/=ll;L[1]/=ll;L[2]/=ll;
    for(let y=0;y<S;y++)for(let x=0;x<S;x++){const nx=(x-cx)/R,ny=(y-cy)/R,d=nx*nx+ny*ny;if(d>1)continue;const nz=Math.sqrt(1-d);
      const lat=Math.asin(-ny),lon=Math.atan2(nx,nz);let sh=nx*L[0]+(-ny)*L[1]+nz*L[2];sh=Math.max(0.06,sh*1.05);
      lut.push((y*S+x),lat,lon,sh,Math.pow(1-nz,2.2));}
    lut=Float32Array.from(lut);}
  function frame(now){
    const rot=((now-t0)/1000)*(opts.speed||.035), d=img.data; d.fill(0);
    for(let i=0;i<lut.length;i+=5){const p=lut[i]|0,lat=lut[i+1],lon=lut[i+2],sh=lut[i+3],rim=lut[i+4];
      const v=Math.min(TH-1,((0.5-lat/Math.PI)*TH)|0);let u=((lon+rot)/(Math.PI*2))%1;if(u<0)u+=1;const k=v*TW+((u*TW)|0);
      let uc=((lon+rot*1.35)/(Math.PI*2))%1;if(uc<0)uc+=1;const cl=CLOUD[v*TW+((uc*TW)|0)]*.85;
      let r=TEX[k*3],g=TEX[k*3+1],b=TEX[k*3+2];r=r+(235-r)*cl;g=g+(242-g)*cl;b=b+(255-b)*cl;
      const s=sh;r=r*s+40*rim;g=g*s+90*rim;b=b*s+200*rim;                                   // light + blue limb glow
      const o=p*4;d[o]=r;d[o+1]=g;d[o+2]=b;d[o+3]=255;}
    c.putImageData(img,0,0);
    const R=S*(0.5-pad),g2=c.createRadialGradient(S/2,S/2,R*.96,S/2,S/2,R*1.16);g2.addColorStop(0,'rgba(110,170,255,.55)');g2.addColorStop(.35,'rgba(70,130,255,.22)');g2.addColorStop(1,'rgba(40,90,255,0)');
    c.globalCompositeOperation='destination-over';c.fillStyle=g2;c.beginPath();c.arc(S/2,S/2,R*1.16,0,Math.PI*2);c.fill();c.globalCompositeOperation='source-over';
  }
  let last=0;function loop(now){if(!on)return;if(now-last>45){frame(now);last=now;}raf=requestAnimationFrame(loop);}
  const start=()=>{if(!TEX)buildTex();setup();frame(performance.now());if(!reduce){new IntersectionObserver(es=>es.forEach(e=>{on=e.isIntersecting;cancelAnimationFrame(raf);if(on)raf=requestAnimationFrame(loop);})).observe(canvas);}};
  (window.requestIdleCallback||setTimeout)(start);
  let rt;window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{setup();frame(performance.now());},200);});
}
earth(document.getElementById('earth'),{max:760,speed:.04});
earth(document.getElementById('mini'),{max:720,speed:.025});

// ---------- Astronaut illustration (original SVG, blue duotone) ----------
const astro=document.getElementById('astronaut');
if(astro)astro.innerHTML=`<defs>
<linearGradient id="suit" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1f5ff"/><stop offset=".55" stop-color="#b9cbf4"/><stop offset="1" stop-color="#6d88cf"/></linearGradient>
<linearGradient id="suitD" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c5d4f8"/><stop offset="1" stop-color="#5672bd"/></linearGradient>
<linearGradient id="pack" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8ea6e2"/><stop offset="1" stop-color="#3c559c"/></linearGradient>
<radialGradient id="visor" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#3b6fd6"/><stop offset=".55" stop-color="#14306f"/><stop offset="1" stop-color="#060f2c"/></radialGradient>
<radialGradient id="shade" cx=".3" cy=".25" r=".9"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#0a1840" stop-opacity=".45"/></radialGradient>
</defs>
<g stroke-linecap="round" stroke-linejoin="round">
 <rect x="92" y="148" width="236" height="214" rx="30" fill="url(#pack)"/>
 <rect x="104" y="160" width="40" height="80" rx="10" fill="#4a64a8" opacity=".7"/>
 <path d="M168 330 Q160 385 152 420 Q146 450 150 468" stroke="url(#suitD)" stroke-width="64" fill="none"/>
 <path d="M252 330 Q270 380 292 410 Q306 432 312 456" stroke="url(#suitD)" stroke-width="64" fill="none"/>
 <path d="M126 412 Q154 422 182 414M262 392 Q290 392 316 410" stroke="#5b76bd" stroke-width="3" fill="none" opacity=".8"/>
 <rect x="112" y="458" width="78" height="48" rx="18" fill="#7f97d6"/><rect x="112" y="490" width="78" height="16" rx="7" fill="#3f589e"/>
 <g transform="rotate(28 320 470)"><rect x="282" y="448" width="76" height="46" rx="18" fill="#7f97d6"/><rect x="282" y="478" width="76" height="16" rx="7" fill="#3f589e"/></g>
 <rect x="126" y="178" width="168" height="172" rx="50" fill="url(#suit)"/>
 <rect x="126" y="178" width="168" height="172" rx="50" fill="url(#shade)"/>
 <path d="M134 322 Q210 342 286 322" stroke="#6f89cd" stroke-width="5" fill="none"/>
 <path d="M142 212 Q96 252 86 300 Q80 332 92 356" stroke="url(#suit)" stroke-width="54" fill="none"/>
 <path d="M70 292 Q88 300 108 292" stroke="#5b76bd" stroke-width="3" fill="none"/>
 <circle cx="96" cy="374" r="27" fill="#8ea6e2"/><path d="M80 386 Q96 398 112 386" stroke="#4a64a8" stroke-width="3" fill="none"/>
 <path d="M282 214 Q330 214 352 248 Q370 278 384 268" stroke="url(#suit)" stroke-width="52" fill="none"/>
 <path d="M340 230 Q352 248 336 266" stroke="#5b76bd" stroke-width="3" fill="none"/>
 <g transform="rotate(-24 396 258)"><rect x="372" y="236" width="50" height="40" rx="16" fill="#8ea6e2"/><path d="M412 240 l12 -6 M414 252 l14 -2 M412 264 l12 4" stroke="#8ea6e2" stroke-width="9"/></g>
 <rect x="170" y="226" width="84" height="58" rx="10" fill="#9fb3e6" stroke="#4a64a8" stroke-width="2.5"/>
 <circle cx="186" cy="244" r="5" fill="#3b6fd6"/><circle cx="202" cy="244" r="5" fill="#dfe8ff"/><circle cx="218" cy="244" r="5" fill="#ff8a8a"/>
 <rect x="182" y="258" width="58" height="14" rx="4" fill="#2c4588"/>
 <path d="M252 270 Q296 286 304 326" stroke="#4a64a8" stroke-width="8" fill="none"/>
 <circle cx="152" cy="226" r="13" fill="#fff"/><path d="M142 223c6-2 14-2 20 0M141 228c7-2 15-2 22 0" stroke="#24408a" stroke-width="2.4" fill="none"/>
 <ellipse cx="206" cy="196" rx="74" ry="20" fill="#c9d7f8" stroke="#5b76bd" stroke-width="3"/>
 <circle cx="206" cy="118" r="84" fill="url(#suit)"/>
 <circle cx="206" cy="118" r="84" fill="url(#shade)"/>
 <rect x="128" y="76" width="18" height="30" rx="6" fill="#8ea6e2"/><rect x="266" y="76" width="18" height="30" rx="6" fill="#8ea6e2"/>
 <ellipse cx="214" cy="126" rx="60" ry="52" fill="url(#visor)" stroke="#9fb3e6" stroke-width="5"/>
 <path d="M172 102 Q190 82 222 82" stroke="#fff" stroke-width="7" fill="none" opacity=".55"/>
 <path d="M178 116 Q182 108 190 104" stroke="#fff" stroke-width="4" fill="none" opacity=".35"/>
 <circle cx="246" cy="146" r="13" fill="#3f7bff" opacity=".55"/><circle cx="246" cy="146" r="13" fill="none" stroke="#9fc0ff" stroke-width="1.5" opacity=".6"/>
</g>`;

// ---------- Section marker ----------
const pn=document.getElementById('pageno'),secs=[document.querySelector('.hero'),...document.querySelectorAll('main .sec, main .cta')];
if(pn){const so=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){const i=secs.indexOf(e.target)+1;pn.textContent='SECTION '+String(i).padStart(2,'0');}}),{threshold:.45});secs.forEach(s=>s&&so.observe(s));}

// ---------- Marquee ----------
const items=[
  ['12 health indicators','<path d="M3 12h4l2-6 4 12 2-6h6"/>'],
  ['Anatomical body map','<circle cx="12" cy="5" r="2.6"/><path d="M12 8v8M7 11h10M9 22l3-6 3 6"/>'],
  ['Crew alert','<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>'],
  ['Sudden-change detection','<path d="M3 15c3 0 3-6 6-6s3 9 6 9 3-6 6-6"/>'],
  ['Radiation budget','<circle cx="12" cy="12" r="2"/><path d="M12 3a9 9 0 0 1 7.8 4.5L14 10.5M4.2 7.5A9 9 0 0 1 12 3M12 21a9 9 0 0 1-7.8-4.5L10 13.5M19.8 16.5A9 9 0 0 1 12 21"/>'],
  ['Day · Week · Month trends','<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'],
  ['5 mission environments','<circle cx="12" cy="12" r="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-20 12 12)"/>'],
  ['Comms-delay aware','<path d="M4 18a12 12 0 0 1 16 0M7 15a8 8 0 0 1 10 0M10 12a4 4 0 0 1 4 0"/><circle cx="12" cy="19" r="1"/>'],
  ['Works offline','<path d="M5 12a7 7 0 0 1 14 0M3 3l18 18"/><circle cx="12" cy="17" r="1"/>']
];
const html=items.map(([t,p])=>`<span><svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>${t}</span>`).join('');
document.getElementById('track').innerHTML=html+html;

// ---------- Live console preview (scaled iframe) ----------
const fv=document.getElementById('frameview');
if(fv){const fit=()=>{const s=fv.clientWidth/1440;fv.style.height=Math.round(940*s)+'px';fv.firstElementChild.style.transform='scale('+s+')';};fit();window.addEventListener('resize',fit);}

// ---------- Nav ----------
const nav=document.getElementById('nav'),links=document.getElementById('links'),burger=document.getElementById('burger');
const onScroll=()=>nav.classList.toggle('solid',window.scrollY>40);onScroll();window.addEventListener('scroll',onScroll,{passive:true});
burger.addEventListener('click',()=>{const o=links.classList.toggle('open');burger.setAttribute('aria-expanded',o);});
links.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{links.classList.remove('open');burger.setAttribute('aria-expanded','false');}));

// ---------- Reveal + counters ----------
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
const co=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;co.unobserve(e.target);const end=+e.target.dataset.count,t0=performance.now();
  const step=t=>{const p=Math.min(1,(t-t0)/1200);e.target.textContent=Math.round(end*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(step);};
  if(reduce)e.target.textContent=end;else requestAnimationFrame(step);}),{threshold:.5});
if(!reduce)document.querySelectorAll('[data-count]').forEach(el=>{el.textContent='0';co.observe(el);});
})();
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){navigator.serviceWorker.register('sw.js').catch(()=>{});}
