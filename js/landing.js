(function(){
'use strict';
const hasIO='IntersectionObserver' in window;
if(!hasIO){document.querySelectorAll('.reveal').forEach(el=>el.classList.add('in'));}
const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Vortex: woven strands twisting into a funnel over a spiral disk ----------
// Performance: strands and rings are batched into a few alpha buckets (one stroke() per bucket instead of one per strand),
// segment count and pixel ratio are capped, frames are limited to ~24 fps, and drawing stops when off-screen or the tab is hidden.
function vortex(canvas,opts){
  if(!canvas||!canvas.getContext)return;const c=canvas.getContext('2d');if(!c)return;
  let W=0,H=0,visible=true,raf=0,last=-1e9;
  const small=Math.min(window.innerWidth,window.innerHeight)<700||(navigator.hardwareConcurrency||8)<=4;
  const N=Math.round((opts.strands||170)*(small?.5:.8)), SEG=small?28:40, NR=Math.round((opts.rings||110)*(small?.5:.8)), BUCKETS=6, FRAME=1000/24;
  const tint=opts.tint||'235,235,240';
  let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  const strands=Array.from({length:N},(_,i)=>({a:i/N*Math.PI*2+rnd()*.08,tw:2.2+rnd()*1.4,al:.08+rnd()*.28,w:.45+rnd()*.7,dir:rnd()<.5?1:-1}));
  const rings=Array.from({length:NR},(_,i)=>({k:i,ph:rnd()*Math.PI*2,sp:.6+rnd()*1.2,al:.1+rnd()*.32,len:.9+rnd()*1.6}));
  const stars=Array.from({length:small?60:120},()=>({x:rnd(),y:rnd(),r:rnd()*1.1+.2,p:rnd()*6}));
  // group strands by (alpha, width) bucket and rings by alpha bucket
  const sb=Array.from({length:BUCKETS},(_,b)=>({al:0,w:0,n:0,items:[]}));
  strands.forEach(s=>{const b=sb[Math.min(BUCKETS-1,Math.floor((s.al-.08)/.28*BUCKETS))];b.items.push(s);b.al+=s.al;b.w+=s.w;b.n++;});
  sb.forEach(b=>{if(b.n){b.al/=b.n;b.w/=b.n;}});
  const rb=Array.from({length:BUCKETS},()=>({al:0,n:0,items:[]}));
  rings.forEach(g=>{const al=g.al*(1-g.k/(NR*1.15)),b=rb[Math.min(BUCKETS-1,Math.floor(al/.42*BUCKETS))];b.items.push(g);b.al+=al;b.n++;});
  rb.forEach(b=>{if(b.n)b.al/=b.n;});
  function resize(){const d=1;W=canvas.clientWidth;H=canvas.clientHeight;canvas.width=Math.round(W*d);canvas.height=Math.round(H*d);c.setTransform(d,0,0,d,0,0);}
  function draw(t){
    c.clearRect(0,0,W,H);
    const cx=W/2, sc=Math.min(W*1.05,H*1.25), yTop=-H*.08, yBot=H*(opts.bot||.8), tilt=.2, time=t*.00018;
    // stars (twinkle)
    c.fillStyle='#fff';
    for(const s of stars){c.globalAlpha=.25+.35*Math.sin(t*.001+s.p)**2;c.fillRect(s.x*W,s.y*H*.75,s.r,s.r);}
    c.globalAlpha=1;
    // funnel strands
    const top=sc*.62,thr=sc*.045;
    c.lineCap='round';c.lineJoin='round';
    for(const b of sb){if(!b.n)continue;
      c.beginPath();
      for(const s of b.items){
        let px=0,py=0;                                                  // quadratic curves through segment midpoints: smooth with few samples
        for(let j=0;j<=SEG;j++){const u=Math.pow(j/SEG,1.6),y=yTop+(yBot-yTop)*u,r=thr+(top-thr)*Math.pow(1-u,2.3),ang=s.a+s.dir*(u*s.tw*Math.PI+time*(1.6+u*2.2));
          const x=cx+Math.cos(ang)*r, yy=y+Math.sin(ang)*r*tilt;
          if(!j)c.moveTo(x,yy);else if(j===SEG)c.quadraticCurveTo(px,py,x,yy);else c.quadraticCurveTo(px,py,(px+x)/2,(py+yy)/2);px=x;py=yy;}
      }
      c.strokeStyle=`rgba(${tint},${b.al})`;c.lineWidth=b.w;c.stroke();
    }
    // spiral floor disk
    c.lineWidth=.8;
    for(const b of rb){if(!b.n)continue;
      c.beginPath();
      for(const g of b.items){const k=g.k, rx=sc*.05+Math.pow(k,1.32)*sc*.0095, ry=rx*.13, st=g.ph+time*g.sp*(3.2-k*.012), cy=yBot+6+k*.35;
        c.moveTo(cx+Math.cos(st)*rx,cy+Math.sin(st)*ry);c.ellipse(cx,cy,rx,ry,0,st,st+g.len*Math.PI);}
      c.strokeStyle=`rgba(${tint},${b.al})`;c.stroke();
    }
    // warm core glow (sunflower)
    const gr=c.createRadialGradient(cx,yBot,0,cx,yBot,sc*.22);gr.addColorStop(0,'rgba(245,179,1,.10)');gr.addColorStop(1,'rgba(245,179,1,0)');c.fillStyle=gr;c.fillRect(0,0,W,H);
  }
  function loop(t){raf=0;if(!visible||document.hidden)return;if(t-last>=FRAME){last=t;draw(t);}raf=requestAnimationFrame(loop);}
  const start=()=>{if(!raf&&visible&&!document.hidden)raf=requestAnimationFrame(loop);};
  let rt=0;resize();window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{resize();draw(reduce?4000:last);},120);});
  if(reduce){draw(4000);return;}
  if(hasIO)new IntersectionObserver(es=>{es.forEach(e=>{visible=e.isIntersecting;if(visible)start();});}).observe(canvas);
  document.addEventListener('visibilitychange',start);
  start();
}
vortex(document.getElementById('vortex'),{strands:190,rings:170,bot:.8});
vortex(document.getElementById('mini'),{strands:90,rings:60,bot:.95,tint:'245,200,90'});

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
const html=items.map(([t])=>`<span>${t}</span>`).join('<span class="sep" aria-hidden="true">/</span>');
document.getElementById('track').innerHTML=html+html;

// ---------- Live console preview (scaled iframe) ----------
const fv=document.getElementById('frameview');
if(fv){const fr=fv.firstElementChild,fit=()=>{const s=fv.clientWidth/1440;fv.style.height=Math.round(940*s)+'px';fr.style.transform='scale('+s+')';};fit();window.addEventListener('resize',fit);
  // the preview runs the whole console, so only load it when the visitor scrolls near it
  const load=()=>{if(!fr.getAttribute('src'))fr.setAttribute('src',fr.dataset.src);};
  if(hasIO){const fo=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){load();fo.disconnect();}},{rootMargin:'300px 0px'});fo.observe(fv);}else load();}

// ---------- Nav ----------
const nav=document.getElementById('nav'),links=document.getElementById('links'),burger=document.getElementById('burger');
const onScroll=()=>nav.classList.toggle('solid',window.scrollY>40);onScroll();window.addEventListener('scroll',onScroll,{passive:true});
burger.addEventListener('click',()=>{const o=links.classList.toggle('open');burger.setAttribute('aria-expanded',o);});
links.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{links.classList.remove('open');burger.setAttribute('aria-expanded','false');}));

// ---------- Reveal + counters ----------
const io=hasIO&&new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}}),{threshold:.12});
if(io)document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
const co=hasIO&&new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;co.unobserve(e.target);const end=+e.target.dataset.count,t0=performance.now();
  const step=t=>{const p=Math.min(1,(t-t0)/1200);e.target.textContent=Math.round(end*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(step);};
  if(reduce)e.target.textContent=end;else requestAnimationFrame(step);}),{threshold:.5});
if(!reduce&&co)document.querySelectorAll('[data-count]').forEach(el=>{el.textContent='0';co.observe(el);});
})();
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){navigator.serviceWorker.register('sw.js').catch(()=>{});}
