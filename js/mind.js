// Mind: behavioural health module (check-in, PHQ-9/GAD-7, connection, coping tools, journal).
// Everything stays in this browser under its own key. Stored data is untrusted: validated on load, escaped on render.
(function(){'use strict';
if(!window.SB)return;
const SB=window.SB, esc=SB.esc, KEY='sonnenblume-mind-v1';

// ---------- Content ----------
const CHECK=[
  {k:'stress',  q:'Stress',                  lo:'calm',          hi:'very stressed', rev:true},
  {k:'energy',  q:'Energy',                  lo:'drained',       hi:'full of energy'},
  {k:'sleepq',  q:'Sleep quality',           lo:'very poor',     hi:'very good'},
  {k:'crew',    q:'Connection to crew',      lo:'isolated',      hi:'close'},
  {k:'family',  q:'Connection to family and home', lo:'far away', hi:'close'}
];
const FREQ=['Not at all','Several days','More than half the days','Nearly every day'];
const SCREENS={
  phq9:{name:'PHQ-9',topic:'Depression screen',max:27,
    stem:'Over the last 2 weeks, how often have you been bothered by any of the following problems?',
    items:['Little interest or pleasure in doing things',
      'Feeling down, depressed, or hopeless',
      'Trouble falling or staying asleep, or sleeping too much',
      'Feeling tired or having little energy',
      'Poor appetite or overeating',
      'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
      'Trouble concentrating on things, such as reading the newspaper or watching television',
      'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual',
      'Thoughts that you would be better off dead or of hurting yourself in some way'],
    bands:[[4,'Minimal'],[9,'Mild'],[14,'Moderate'],[19,'Moderately severe'],[27,'Severe']]},
  gad7:{name:'GAD-7',topic:'Anxiety screen',max:21,
    stem:'Over the last 2 weeks, how often have you been bothered by the following problems?',
    items:['Feeling nervous, anxious or on edge',
      'Not being able to stop or control worrying',
      'Worrying too much about different things',
      'Trouble relaxing',
      'Being so restless that it is hard to sit still',
      'Becoming easily annoyed or irritable',
      'Feeling afraid as if something awful might happen'],
    bands:[[4,'Minimal'],[9,'Mild'],[14,'Moderate'],[21,'Severe']]}
};
const DIFF_Q='If you checked off any problems, how difficult have these problems made it for you to do your work, take care of things at home, or get along with other people?';
const DIFF=['Not difficult at all','Somewhat difficult','Very difficult','Extremely difficult'];
const WIND=[
  ['light','Habitat lighting set to the pre-sleep (warm, dim) mode'],
  ['screens','Screens and work messages off for the last 60 minutes'],
  ['list','Tomorrow\'s tasks written down, so they are not on your mind'],
  ['caffeine','No caffeine in the 6 hours before sleep'],
  ['station','Sleep station ready: eye mask, earplugs, sleeping bag secured'],
  ['air','Ventilation fan pointed at your face (stops a CO₂ pocket forming)'],
  ['calm','10 minutes of something calm: reading, music, or box breathing']
];
const GROUND=[
  [5,'things you can see','A window view, a cable bundle, a photo from home, the colour of a panel.'],
  [4,'things you can feel','The fabric of your sleeve, the handrail, air from the vent, your feet in the foot loops.'],
  [3,'things you can hear','Fans, pumps, a crewmate\'s voice, your own breathing.'],
  [2,'things you can smell','Food packaging, soap, the cabin air. Pick a favourite scent if you have one.'],
  [1,'thing you can taste','A sip of water or tea. Notice its temperature.']
];

// Deterministic red-flag check on check-in notes and journal text.
const RED_FLAGS=[
  /\bsuicid\w*/, /\bkill(ing)?\s+(my\s*self|myself)\b/, /\bend(ing)?\s+(my|it)\s+(own\s+)?(life|all)\b/, /\bend\s+it\s+all\b/, /\btake\s+my\s+(own\s+)?life\b/,
  /\b(want|wanna|wanted|wish|going|ready)\s+(to\s+)?die\b/, /\bbetter\s+off\s+dead\b/, /\b(don'?t|do\s+not)\s+want\s+to\s+(live|be\s+alive|be\s+here|wake\s+up)\b/,
  /\bno\s+(reason|point)\s+(to|in)\s+(live|living|going\s+on|being\s+alive)\b/, /\bnot\s+worth\s+living\b/, /\bnothing\s+to\s+live\s+for\b/,
  /\bself[\s-]?harm\w*/, /\b(hurt|harm|cut|injure|punish)(ing)?\s+(my\s*self|myself)\b/, /\boverdos\w*/,
  /\b(kill|hurt|harm|attack|stab|strangle|shoot)(ing)?\s+(him|her|them|someone|somebody|anyone|everyone|people|my\s+crew\w*|the\s+crew|a\s+crew\w*|the\s+commander)\b/,
  /\bhopeless\b/, /\bno\s+way\s+out\b/, /\b(can'?t|cannot)\s+go\s+on\b/, /\bgive\s+up\s+on\s+(life|everything|living)\b/,
  /\bbetter\s+off\s+without\s+me\b/, /\bwish\s+i\s+(was|were)\s+(dead|never\s+born)\b/, /\bdisappear\s+forever\b/
];
function redFlag(text){const t=String(text||'').toLowerCase().replace(/[‘’ʼ]/g,"'").replace(/\s+/g,' ');return RED_FLAGS.some(r=>r.test(t));}

// ---------- Storage (own key, validated like sanitize() in app.js) ----------
const now=()=>Date.now();
const int=(v,a,b)=>typeof v==='number'&&Number.isInteger(v)&&v>=a&&v<=b?v:null;
const str=(v,n)=>typeof v==='string'?v.slice(0,n):'';
function blank(){return {v:1,checkins:[],screens:[],conn:{family:null,ppc:null},wind:{day:0,done:[]},journal:[]};}
function clean(s){
  const o=blank();if(!s||typeof s!=='object')return o;
  const T=now()+864e5;
  o.checkins=(Array.isArray(s.checkins)?s.checkins:[]).slice(-400).map(c=>{
    if(!c||typeof c!=='object')return null;const r={day:int(c.day,1,100000),ts:int(c.ts,0,T)};if(r.day===null||r.ts===null)return null;
    for(const q of CHECK){const v=int(c[q.k],1,5);if(v===null)return null;r[q.k]=v;}
    r.note=str(c.note,200);return r;}).filter(Boolean);
  const seen={};o.checkins=o.checkins.filter(c=>{if(seen[c.day])return false;seen[c.day]=1;return true;}).sort((a,b)=>a.day-b.day);
  o.screens=(Array.isArray(s.screens)?s.screens:[]).slice(-200).map(x=>{
    if(!x||typeof x!=='object'||!SCREENS[x.type])return null;const n=SCREENS[x.type].items.length;
    if(!Array.isArray(x.items)||x.items.length!==n)return null;const items=x.items.map(v=>int(v,0,3));if(items.includes(null))return null;
    const day=int(x.day,1,100000),ts=int(x.ts,0,T);if(day===null||ts===null)return null;
    const diff=x.diff===null||x.diff===undefined?null:int(x.diff,0,3);
    return {type:x.type,day,ts,items,diff};}).filter(Boolean);
  if(s.conn&&typeof s.conn==='object'){o.conn.family=int(s.conn.family,1,100000);o.conn.ppc=int(s.conn.ppc,1,100000);}
  if(s.wind&&typeof s.wind==='object'){const d=int(s.wind.day,1,100000);if(d!==null)o.wind={day:d,done:(Array.isArray(s.wind.done)?s.wind.done:[]).filter(x=>typeof x==='string'&&WIND.some(w=>w[0]===x)).slice(0,WIND.length)};}
  o.journal=(Array.isArray(s.journal)?s.journal:[]).slice(-500).map(j=>{
    if(!j||typeof j!=='object')return null;const ts=int(j.ts,0,T),day=int(j.day,1,100000),text=str(j.text,4000).trim();
    return ts===null||day===null||!text?null:{ts,day,text};}).filter(Boolean);
  return o;
}
function load(){try{const raw=localStorage.getItem(KEY);return raw?clean(JSON.parse(raw)):blank();}catch(e){return blank();}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(M));return true;}catch(e){SB.toast('Could not save on this device (storage full or blocked)');return false;}}
let M=load();
window.addEventListener('storage',e=>{if(e.key===KEY){M=load();if(isOpen())render();}});

// ---------- Helpers ----------
const $=id=>document.getElementById(id);
const isOpen=()=>{const v=$('v-mind');return !!v&&!v.classList.contains('hidden');};
const day=()=>{try{const d=SB.today();return d&&Number.isInteger(d.day)?d.day:1;}catch(e){return 1;}};
const crew=()=>{try{const s=SB.state();return {name:s.name||'Crew member',cmo:(s.crew&&s.crew.cmo)||'Crew medical officer',leader:(s.crew&&s.crew.leader)||'Crew leader'};}catch(e){return {name:'Crew member',cmo:'Crew medical officer',leader:'Crew leader'};}};
const median=a=>{const s=a.slice().sort((x,y)=>x-y),m=s.length>>1;return s.length?(s.length%2?s[m]:(s[m-1]+s[m])/2):null;};
const wellIdx=c=>CHECK.reduce((a,q)=>a+(q.rev?6-c[q.k]:c[q.k]),0)/CHECK.length;
const scoreOf=x=>x.items.reduce((a,b)=>a+b,0);
const bandOf=(type,score)=>SCREENS[type].bands.find(b=>score<=b[0])[1];
const fmtDate=ts=>{try{return new Date(ts).toISOString().slice(0,16).replace('T',' ');}catch(e){return '';}};
const dot=s=>`<i class="dot st-${s}"></i>`;
const reduceMotion=()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;}};

// ---------- Safety card ----------
function showSafety(reason){
  const el=$('mSafety');if(!el)return;const c=crew();let L='';try{L=SB.link().label||'';}catch(e){}
  el.innerHTML=`<h2>Let's get you some support now</h2>
    <p class="mlead">${esc(reason)} You do not have to handle this alone. Please talk to your crew medical officer, <b>${esc(c.cmo)}</b>, now, in person if you can.</p>
    <ul class="mlist">
      <li>Crew medical officer: <b>${esc(c.cmo)}</b>, in person or on the crew net</li>
      <li>Crew leader: <b>${esc(c.leader)}</b></li>
      <li>Flight surgeon and the Behavioral Health and Performance team on Earth: ask for a private psychological conference${L?` (link delay now: ${esc(L)})`:''}</li>
      <li>If you feel you might act on thoughts of harming yourself or someone else, go to the nearest crew member now and stay with them.</li>
    </ul>
    <div class="btns"><button class="btn red" type="button" id="mAlertBtn">Alert crew medical officer now</button><button class="btn" type="button" id="mSafeClose">I am safe for now</button></div>
    <p class="msmall" id="mAlertNote">The alert only says that you asked for support. Your answers and notes stay on this device.</p>`;
  el.classList.remove('hidden');
  $('mAlertBtn').onclick=()=>{const cc=crew();
    let m=null;try{m=SB.sendMsg('alert',`${cc.name} asked for behavioural health support from the Mind module. Please check in with them in person now. Their answers and notes stay private on their device.`);}catch(e){}
    $('mAlertNote').textContent=m?`Alert sent on the crew net to ${(m.to||[]).join(', ')}. Stay where you are or go to them now.`:'Could not send the alert. Please go to a crew member in person now.';
    $('mAlertBtn').disabled=true;SB.toast(m?'Crew alert sent':'Alert failed: speak to a crew member now');};
  $('mSafeClose').onclick=()=>el.classList.add('hidden');
  try{el.scrollIntoView({block:'start',behavior:reduceMotion()?'auto':'smooth'});el.focus({preventScroll:true});}catch(e){}
}

// ---------- Render ----------
function render(){
  const root=$('mindRoot');if(!root)return;
  root.innerHTML=`<div class="mind">
    <div id="mSafety" class="card msafety hidden" role="alert" tabindex="-1"></div>
    <div class="mhead"><div><h1 class="mtitle">Mind</h1><p class="msub">Private behavioural health check for long missions. Everything here stays on this device.</p></div><div id="mToday" class="mtoday"></div></div>
    <div class="mgrid">
      <section class="card" id="mCheck" aria-labelledby="mCheckH"></section>
      <section class="card" id="mConn" aria-labelledby="mConnH"></section>
      <section class="card mwide" id="mScreens" aria-labelledby="mScreensH"></section>
      <section class="card" id="mTools" aria-labelledby="mToolsH"></section>
      <section class="card" id="mJournal" aria-labelledby="mJournalH"></section>
    </div>
    <p class="msrc">Sources: NASA Human Research Program, Risk of Adverse Cognitive or Behavioral Conditions and Psychiatric Disorders (evidence report and Human Research Roadmap). PHQ-9 and GAD-7 by Drs. Spitzer, Williams, Kroenke and colleagues, developed with an educational grant from Pfizer Inc., public domain (<a href="https://www.phqscreeners.com/" rel="noopener noreferrer" target="_blank">phqscreeners.com</a>). Screens are not a diagnosis. This module does not replace the crew medical officer or flight surgeon.</p>
  </div>`;
  renderToday();renderCheck();renderConn();renderScreens();renderTools();renderJournal();
}

function renderToday(){
  const el=$('mToday');if(!el)return;
  const part=(k,lbl,f)=>{let l=null,s='none';try{l=SB.latest(k);s=SB.status(k)||'none';}catch(e){}
    return `<span class="chip">${dot(l?s:'none')}${lbl} <b>${l?esc(f(l.v)):'not logged'}</b></span>`;};
  el.innerHTML=part('mood','Mood',v=>v+'/5')+part('sleep','Sleep',v=>(+v).toFixed(1)+' h')+`<button class="btn msm" type="button" data-goto="log">Log mood and sleep</button>`;
}

// 1. Daily check-in
function drift(){
  const C=M.checkins;if(C.length<7)return {base:null,n:C.length};
  const base7=C.slice(0,7),base=median(base7.map(wellIdx));
  const per={};CHECK.forEach(q=>per[q.k]=median(base7.map(c=>c[q.k])));
  const recent=C.slice(7).slice(-3);
  const watch=recent.length===3&&recent.every(c=>wellIdx(c)<=base-0.4);
  const items=watch?CHECK.filter(q=>recent.every(c=>q.rev?c[q.k]>per[q.k]:c[q.k]<per[q.k])).map(q=>q.q):[];
  return {base,per,watch,items,last:C.length>7?wellIdx(C[C.length-1]):null};
}
function renderCheck(){
  const el=$('mCheck');if(!el)return;const d=day(),cur=M.checkins.find(c=>c.day===d)||null,D=drift();
  const scale=q=>`<fieldset class="mscale"><legend>${esc(q.q)} <small>1 = ${esc(q.lo)}, 5 = ${esc(q.hi)}</small></legend><div class="mopts">${[1,2,3,4,5].map(v=>
    `<label><input type="radio" name="mc-${q.k}" value="${v}"${cur&&cur[q.k]===v?' checked':''}><span>${v}</span></label>`).join('')}</div></fieldset>`;
  let st;
  if(D.base===null)st=`<p class="mstat">${dot('none')}Baseline forms after 7 check-ins (${D.n}/7). It is your own normal, not a population average.</p>`;
  else if(D.watch)st=`<p class="mstat mwatch">${dot('watch')}<b>Watch</b>: your last 3 check-ins are below your baseline (${D.base.toFixed(1)}).${D.items.length?' Lower: '+esc(D.items.join(', '))+'.':''} Consider a private call home, a crew meal, or a word with the crew medical officer.</p>`;
  else st=`<p class="mstat">${dot('ok')}In line with your baseline (${D.base.toFixed(1)} of 5)${D.last!==null?`, latest ${D.last.toFixed(1)}`:''}.</p>`;
  const spark=M.checkins.slice(-14).map(c=>{const w=wellIdx(c);return `<i style="height:${Math.round(w/5*100)}%" title="Day ${c.day}: ${w.toFixed(1)}"></i>`;}).join('');
  el.innerHTML=`<h2 id="mCheckH">Daily check-in <span class="mtag">${cur?'Saved for mission day '+d:'Mission day '+d+' · about 30 s'}</span></h2>
    <form id="mCheckForm" novalidate>${CHECK.map(scale).join('')}
      <div class="field"><label for="mNote">One line about today (optional)</label><input id="mNote" maxlength="200" autocomplete="off" value="${cur?esc(cur.note):''}"></div>
      <div class="btns"><button class="btn pri" type="submit" id="mCheckSave">${cur?'Update check-in':'Save check-in'}</button><span class="msmall" id="mCheckMsg" role="status"></span></div>
    </form>${st}${spark?`<div class="mspark" aria-hidden="true">${spark}</div>`:''}`;
  $('mCheckForm').onsubmit=e=>{e.preventDefault();
    const r={day:d,ts:now()};for(const q of CHECK){const x=el.querySelector(`input[name="mc-${q.k}"]:checked`);if(!x){$('mCheckMsg').textContent='Pick 1 to 5 for '+q.q.toLowerCase()+'.';return;}r[q.k]=+x.value;}
    r.note=str($('mNote').value,200).trim();
    M.checkins=M.checkins.filter(c=>c.day!==d).concat([r]).sort((a,b)=>a.day-b.day).slice(-400);save();renderCheck();
    $('mCheckMsg').textContent='Check-in saved for mission day '+d+'.';
    if(r.note&&redFlag(r.note))showSafety('Your note mentioned something serious.');};
}

// 3. Isolation and connection
function renderConn(){
  const el=$('mConn');if(!el)return;const d=day();
  const row=(k,lbl)=>{const last=M.conn[k];const n=last===null?null:Math.max(0,d-last);
    const s=n===null?'none':n>=14?'alert':n>=7?'watch':'ok';
    const txt=n===null?'Not logged yet':n===0?'Today':n+(n===1?' day ago':' days ago');
    const nudge=n===null?'Log it after your next one.':n>=14?'Two weeks or more. Please book one this week; ask the crew leader to protect the slot.':n>=7?'A week or more. A good time to schedule the next one.':'';
    return `<div class="mconn"><div class="mconn-h">${dot(s)}<b>${lbl}</b><span class="mdays">${txt}</span></div>${nudge?`<p class="msmall">${nudge}</p>`:''}<button class="btn msm" type="button" data-conn="${k}">Had one today</button></div>`;};
  el.innerHTML=`<h2 id="mConnH">Isolation and connection</h2>
    ${row('family','Private family call')}${row('ppc','Private psychological conference')}
    <p class="msmall">Regular private contact with home and with the support team is a core countermeasure for isolation and confinement on long missions.</p>`;
  el.querySelectorAll('[data-conn]').forEach(b=>b.onclick=()=>{M.conn[b.dataset.conn]=day();save();renderConn();SB.toast('Logged for mission day '+day());});
}

// 2. Weekly validated screens
let screenOpen=null;
function renderScreens(){
  const el=$('mScreens');if(!el)return;const d=day();
  const last=t=>M.screens.filter(x=>x.type===t).slice(-1)[0]||null;
  const card=t=>{const S=SCREENS[t],l=last(t),due=!l||d-l.day>=7,sc=l?scoreOf(l):0;
    return `<div class="mscr"><div class="mscr-h"><b>${S.name}</b><span class="msmall">${S.topic}, ${S.items.length} questions</span></div>
      ${l?`<p class="mres" data-res="${t}">Last: <b>${sc}</b> of ${S.max} · ${esc(bandOf(t,sc))} (mission day ${l.day})</p>`:'<p class="msmall">Not taken yet.</p>'}
      <p class="msmall">${due?dot('watch')+' Due this week':dot('ok')+' Next due mission day '+(l.day+7)}</p>
      <button class="btn${due?' pri':''} msm" type="button" data-scr="${t}">${l?'Take again':'Start'}</button></div>`;};
  el.innerHTML=`<h2 id="mScreensH">Weekly screens</h2><div class="mscrs">${card('phq9')}${card('gad7')}</div><div id="mScrForm"></div>
    <p class="msmall">This is a screen, not a diagnosis. Scores help you and the crew medical officer notice change over time.</p>`;
  el.querySelectorAll('[data-scr]').forEach(b=>b.onclick=()=>{screenOpen=b.dataset.scr;renderScreenForm();});
  if(screenOpen)renderScreenForm();
}
function renderScreenForm(){
  const box=$('mScrForm');if(!box||!screenOpen)return;const t=screenOpen,S=SCREENS[t];
  box.innerHTML=`<form class="mscreen" id="mScreenForm" novalidate><h3>${S.name} · ${S.topic}</h3><p class="mstem">${esc(S.stem)}</p>
    ${S.items.map((it,i)=>`<fieldset class="mq" data-q="${i}"><legend><span class="mnum">${i+1}.</span> ${esc(it)}</legend><div class="mfreq">${FREQ.map((f,v)=>
      `<label><input type="radio" name="sq-${i}" value="${v}"><span>${esc(f)} <small>(${v})</small></span></label>`).join('')}</div></fieldset>`).join('')}
    ${t==='phq9'?`<fieldset class="mq"><legend>${esc(DIFF_Q)} <small>(optional, not scored)</small></legend><div class="mfreq">${DIFF.map((f,v)=>`<label><input type="radio" name="sq-diff" value="${v}"><span>${esc(f)}</span></label>`).join('')}</div></fieldset>`:''}
    <div class="btns"><button class="btn pri" type="submit">Score and save</button><button class="btn" type="button" id="mScrCancel">Cancel</button><span class="msmall" id="mScrMsg" role="status"></span></div></form>
    <div id="mScrResult"></div>`;
  const f=$('mScreenForm');
  if(t==='phq9')f.querySelectorAll('input[name="sq-8"]').forEach(r=>r.onchange=()=>{if(+r.value>0)showSafety('You noted thoughts of being better off dead or of hurting yourself.');});
  $('mScrCancel').onclick=()=>{screenOpen=null;box.innerHTML='';};
  f.onsubmit=e=>{e.preventDefault();
    const items=S.items.map((_,i)=>{const x=f.querySelector(`input[name="sq-${i}"]:checked`);return x?+x.value:null;});
    const miss=items.indexOf(null);if(miss>=0){$('mScrMsg').textContent='Please answer question '+(miss+1)+'.';return;}
    const dx=f.querySelector('input[name="sq-diff"]:checked');
    const rec={type:t,day:day(),ts:now(),items,diff:dx?+dx.value:null};
    M.screens=M.screens.concat([rec]).slice(-200);save();
    const sc=scoreOf(rec),band=bandOf(t,sc);screenOpen=null;renderScreens();
    const out=$('mScrForm');
    out.innerHTML=`<div class="mresult" id="mScrResult" role="status"><p><b>${S.name}: ${sc} of ${S.max}</b> · <span class="mband">${esc(band)}</span></p>
      <p class="msmall">This is a screen, not a diagnosis. ${sc>=10?'A score in this range is worth talking through with the crew medical officer this week.':'Keep taking it weekly so changes are noticed early.'}</p></div>`;
    if(t==='phq9'&&(items[8]>0||sc>=20))showSafety(items[8]>0?'You noted thoughts of being better off dead or of hurting yourself.':'Your PHQ-9 score is in the highest range.');
  };
}

// 4. Coping tools
let breath=null;
function stopBreath(){if(breath){clearInterval(breath.t);breath=null;}}
function renderTools(){
  const el=$('mTools');if(!el)return;stopBreath();const d=day();
  if(M.wind.day!==d)M.wind={day:d,done:[]};
  el.innerHTML=`<h2 id="mToolsH">Coping tools</h2>
    <details class="mtool" open><summary>Box breathing (4-4-4-4)</summary>
      <div class="mbreath"><div class="mcircle" id="mCircle" aria-hidden="true"><span id="mCount"></span></div>
      <div><p class="mphase" id="mPhase" aria-live="polite">Four rounds, about one minute.</p>
      <button class="btn pri msm" type="button" id="mBreathBtn">Start</button></div></div></details>
    <details class="mtool"><summary>5-4-3-2-1 grounding</summary><div id="mGround"></div></details>
    <details class="mtool"><summary>Sleep wind-down checklist</summary>
      <div class="mwind">${WIND.map(([k,t])=>`<label><input type="checkbox" data-wind="${k}"${M.wind.done.includes(k)?' checked':''}><span>${esc(t)}</span></label>`).join('')}</div>
      <p class="msmall" id="mWindN">${M.wind.done.length} of ${WIND.length} done tonight</p></details>`;
  $('mBreathBtn').onclick=()=>breath?endBreath('Stopped. Notice how you feel.'):startBreath();
  el.querySelectorAll('[data-wind]').forEach(c=>c.onchange=()=>{const k=c.dataset.wind;M.wind.done=M.wind.done.filter(x=>x!==k);if(c.checked)M.wind.done.push(k);M.wind.day=day();save();$('mWindN').textContent=M.wind.done.length+' of '+WIND.length+' done tonight';});
  let g=0;const gr=()=>{const box=$('mGround');if(!box)return;const s=GROUND[g];
    box.innerHTML=`<p class="mground"><b>${s[0]}</b> ${esc(s[1])}</p><p class="msmall">${esc(s[2])}</p><div class="btns"><button class="btn msm" type="button" id="mGBack"${g?'':' disabled'}>Back</button><button class="btn pri msm" type="button" id="mGNext">${g<GROUND.length-1?'Next':'Start again'}</button><span class="msmall">Step ${g+1} of 5</span></div>`;
    $('mGBack').onclick=()=>{g=Math.max(0,g-1);gr();};$('mGNext').onclick=()=>{g=g<GROUND.length-1?g+1:0;gr();};};
  gr();
}
const PHASES=['Breathe in','Hold','Breathe out','Hold'];
function startBreath(){
  const rm=reduceMotion();let tick=0;const total=4*4*4;
  const step=()=>{const c=$('mCircle'),p=$('mPhase'),n=$('mCount');if(!c||!p||!n){stopBreath();return;}
    if(tick>=total){endBreath('Done. Four rounds complete.');return;}
    const ph=Math.floor(tick/4)%4,sec=4-tick%4;
    if(tick%4===0){p.textContent=PHASES[ph];c.dataset.ph=String(ph);}
    n.textContent=String(sec);tick++;};
  const c=$('mCircle');if(c)c.classList.toggle('still',rm);
  breath={t:setInterval(step,1000)};$('mBreathBtn').textContent='Stop';step();
}
function endBreath(msg){stopBreath();const p=$('mPhase'),c=$('mCircle'),n=$('mCount'),b=$('mBreathBtn');if(p)p.textContent=msg;if(c)delete c.dataset.ph;if(n)n.textContent='';if(b)b.textContent='Start';}

// 5. Private journal
let delArm=false;
function renderJournal(){
  const el=$('mJournal');if(!el)return;
  const list=M.journal.slice().reverse().slice(0,30);
  el.innerHTML=`<h2 id="mJournalH">Private journal <span class="mtag">${M.journal.length} entr${M.journal.length===1?'y':'ies'}</span></h2>
    <label class="msmall" for="mJText">Only stored on this device. Not sent to the crew or Earth.</label>
    <textarea id="mJText" class="mjtext" maxlength="4000" placeholder="Write freely"></textarea>
    <div class="btns"><button class="btn pri msm" type="button" id="mJSave">Save entry</button><button class="btn msm" type="button" id="mJExport"${M.journal.length?'':' disabled'}>Export as text</button>
      <button class="btn warn msm" type="button" id="mJDel"${M.journal.length?'':' disabled'}>Delete all</button></div>
    <div id="mJConfirm" class="mconfirm${delArm?'':' hidden'}" role="alert"><p>Delete all ${M.journal.length} journal entries from this device? This cannot be undone.</p><div class="btns"><button class="btn red msm" type="button" id="mJDelYes">Delete all entries</button><button class="btn msm" type="button" id="mJDelNo">Cancel</button></div></div>
    <div class="mjlist">${list.map(j=>`<article class="mjentry"><div class="msmall">Mission day ${j.day} · ${esc(fmtDate(j.ts))}</div><p>${esc(j.text)}</p></article>`).join('')||'<p class="msmall">No entries yet.</p>'}${M.journal.length>30?`<p class="msmall">Showing the latest 30. Export to read all.</p>`:''}</div>`;
  $('mJSave').onclick=()=>{const t=$('mJText').value.trim().slice(0,4000);if(!t){SB.toast('Write something first');return;}
    addJournal(t);renderJournal();SB.toast('Saved to your private journal');if(redFlag(t))showSafety('Your journal entry mentioned something serious.');};
  $('mJExport').onclick=exportJournal;
  $('mJDel').onclick=()=>{delArm=true;renderJournal();const y=$('mJDelYes');if(y)y.focus();};
  $('mJDelNo').onclick=()=>{delArm=false;renderJournal();};
  $('mJDelYes').onclick=()=>{delArm=false;M.journal=[];save();renderJournal();SB.toast('Journal deleted from this device');};
}
function addJournal(t){M.journal=M.journal.concat([{ts:now(),day:day(),text:t.slice(0,4000)}]).slice(-500);save();}
function exportJournal(){
  try{const txt='Sonnenblume private journal\nExported '+new Date().toISOString()+'\n\n'+M.journal.map(j=>`Mission day ${j.day} - ${fmtDate(j.ts)}\n${j.text}\n`).join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'text/plain'}));a.download='sonnenblume-journal.txt';document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);}catch(e){SB.toast('Export failed');}
}

SB.onView('mind',render);
})();
