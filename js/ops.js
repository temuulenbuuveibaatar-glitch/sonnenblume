// Crew ops: crew medical officer view, EVA / task readiness, countermeasure planner, ground handover report.
// Decision support only. The crew medical officer and mission rules decide.
// Reads the console through window.SB (read-only); keeps only its own UI preferences in localStorage.
(function(){
'use strict';
if(!window.SB)return;
const SB=window.SB, esc=SB.esc, IND=SB.IND, CORE=SB.CORE, STXT=SB.STXT;
const RANK={none:0,ok:1,watch:2,alert:3};
const worst=a=>a.reduce((w,s)=>RANK[s]>RANK[w]?s:w,'none');
const has=(e,k)=>!!e&&e[k]!==undefined&&e[k]!==null&&e[k]!=='';
const num=(k,v)=>k==='bp'?v.sys:+v;
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const median=a=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2;};
const hhmm=ts=>{const d=new Date(ts);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');};
const dot=s=>`<i class="dot st-${s}" aria-hidden="true"></i>`;
const radSt=cum=>{const p=cum/SB.CAREER_LIMIT;return p>0.8?'alert':p>0.5?'watch':'ok';};
const SHORT={hr:'HR',bp:'BP',spo2:'SpO2',temp:'Temp',glucose:'Glucose',sleep:'Sleep',mood:'Mood',exercise:'Exercise',hydration:'Fluid',dose:'Dose',vision:'Vision',mass:'Mass'};
const LINKS={
  hrp:['NASA HRP human system risks','https://humanresearchroadmap.nasa.gov/risks/'],
  std:['NASA-STD-3001 (OCHMO standards)','https://www.nasa.gov/ochmo/hsa-standards/'],
  briefs:['OCHMO technical briefs','https://www.nasa.gov/ochmo/hsa-standards/ochmo-technical-briefs/'],
  hrpHome:['NASA Human Research Program','https://www.nasa.gov/hrp/']
};
const sources=(keys,extra)=>`<p class="ops-src">Sources: ${keys.map(k=>`<a href="${LINKS[k][1]}" target="_blank" rel="noopener noreferrer">${esc(LINKS[k][0])}</a>`).join(' · ')}${extra?' · '+esc(extra):''}. Decision support only: the crew medical officer and mission rules decide.</p>`;

// ---------- UI preferences (own key, validated) ----------
const PKEY='sonnenblume-ops-v1';
const PANELS={crew:'Medical officer',eva:'EVA readiness',plan:'Countermeasures',handover:'Handover report'};
const ACTS={
  eva:{name:'EVA (spacewalk or surface walk)',rad:true,sedNoGo:true,need:['hr','bp','spo2','temp','glucose']},
  rover:{name:'Pressurised rover traverse',rad:true,sedNoGo:true,need:['hr','bp','spo2','temp','glucose']},
  exercise:{name:'Heavy exercise',rad:false,sedNoGo:false,need:['hr','bp','spo2','temp']},
  vehicle:{name:'Robotics or vehicle ops',rad:false,sedNoGo:true,need:['hr','bp','spo2','temp']}
};
const P={panel:'crew',act:'eva'}, OPEN={};
try{const j=JSON.parse(localStorage.getItem(PKEY)||'null');if(j&&typeof j==='object'){if(Object.prototype.hasOwnProperty.call(PANELS,j.panel))P.panel=j.panel;if(Object.prototype.hasOwnProperty.call(ACTS,j.act))P.act=j.act;}}catch(e){}
function saveP(){try{localStorage.setItem(PKEY,JSON.stringify(P));}catch(e){}}

function medName(id){try{const kb=SB.kb();if(kb&&kb.byId&&kb.byId[id])return kb.byId[id].title;}catch(e){}return String(id).replace(/^med-/,'').replace(/-/g,' ');}

// ---------- Demo crew: deterministic, generated in-module, never stored ----------
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const DEMO=[
  {id:'demo-a',name:'Flt Eng. Lindqvist',role:'Flight engineer',seed:7,baseMass:68.0,prior:42,lastH:1.5,profile:'steady'},
  {id:'demo-b',name:'Mission Spec. Adeyemi',role:'Mission specialist',seed:19,baseMass:81.5,prior:118,lastH:9,profile:'tired'},
  {id:'demo-c',name:'Flt Eng. Moreau',role:'Flight engineer',seed:31,baseMass:74.2,prior:12,lastH:3,profile:'ill'}
];
const demoCache={};
function genDemo(m,envKey,lastDay){
  const key=m.id+'|'+envKey+'|'+lastDay;if(demoCache[key])return demoCache[key];
  const r=rng(m.seed), env=SB.ENVS[envKey]||SB.ENVS.iss, g=(mu,s)=>mu+(r()+r()+r()-1.5)*s, days=[];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  for(let i=29;i>=0;i--){
    const d=lastDay-i;const late=(29-i)/29;
    const e={day:d,symptoms:[],vision:false};
    e.hr=Math.round(g(62,3));e.bp={sys:Math.round(g(116,5)),dia:Math.round(g(74,3))};
    e.spo2=Math.round(Math.min(100,g(97.6,0.7)));e.temp=+g(36.8,0.12).toFixed(1);e.glucose=Math.round(g(87,4));
    e.sleep=+clamp(g(7.2,0.4),4,9.5).toFixed(2);e.mood=clamp(Math.round(g(4.3,0.4)),1,5);
    e.exercise=Math.round(g(120,8)/5)*5;e.hydration=+g(2.5,0.2).toFixed(1);e.dose=+(env.dose*(0.85+r()*0.3)).toFixed(2);
    if(d%7===0||i===0)e.mass=+(m.baseMass*(1-0.012*late)).toFixed(1);
    if(m.profile==='tired'&&i<4){e.sleep=+clamp(g(5.3,0.3),4,6.4).toFixed(2);e.mood=i<2?2:3;e.exercise=Math.round(g(70,6)/5)*5;e.hydration=+g(1.8,0.1).toFixed(1);}
    if(m.profile==='ill'&&i<2){e.temp=i===0?38.6:38.2;e.hr=i===0?98:92;e.spo2=93;e.symptoms=['sore throat','fatigue'];e.exercise=20;e.sleep=6.1;}
    if(m.profile==='steady'&&i===0)delete e.glucose;
    days.push(e);
  }
  return (demoCache[key]=days);
}

// ---------- Per-member status (user via the console's engine; demo via the same thresholds) ----------
function latestIn(days,k){for(let i=days.length-1;i>=0;i--)if(has(days[i],k))return {v:days[i][k],day:days[i].day};return null;}
function stOf(m,k,v){if(!m.demo)return SB.statusOf(k,v);if(k==='mass'){const p=(m.baseMass-v)/m.baseMass*100;return p>5?'alert':p>2?'watch':'ok';}return SB.statusOf(k,v);}
function mStatus(m,k){
  if(!m.demo)return SB.status(k);
  const l=latestIn(m.days,k);if(!l)return 'none';
  if(m.days[m.days.length-1].day-l.day>(k==='mass'?8:2))return 'none';
  let s=stOf(m,k,l.v);if(k==='dose')s=worst([s,radSt(m.cum)]);return s;
}
function trend(days,k,thr){
  const v=days.slice(-7).filter(e=>has(e,k)).map(e=>+e[k]);
  if(v.length<4)return {a:'-',w:'no trend',s:'none'};
  const d=mean(v.slice(-3))-mean(v.slice(0,-3));
  return d>thr?{a:'↑',w:'rising',s:'ok'}:d<-thr?{a:'↓',w:'falling',s:'watch'}:{a:'→',w:'steady',s:'ok'};
}
function members(){
  const S=SB.state(), last=SB.today().day, now=Date.now();
  const lastTs=S.log.reduce((a,x)=>Math.max(a,x.ts),0)||null;
  const you={id:'you',name:S.name||'You',role:'You, this device',demo:false,days:S.days,baseMass:S.baseMass,cum:SB.cumDose(),lastTs};
  const demo=DEMO.map(d=>{const days=genDemo(d,S.env,last);return Object.assign({},d,{demo:true,days,cum:d.prior+days.reduce((a,e)=>a+(has(e,'dose')?+e.dose:0),0),lastTs:now-d.lastH*3600e3});});
  return [you].concat(demo).map(m=>{
    m.st={};CORE.forEach(k=>{m.st[k]=mStatus(m,k);});
    m.alerts=CORE.filter(k=>m.st[k]==='alert');m.watch=CORE.filter(k=>m.st[k]==='watch');
    const td=m.days[m.days.length-1];m.sym=(td&&td.symptoms)||[];
    m.overall=worst(CORE.map(k=>m.st[k]).concat(m.sym.map(x=>x==='chest pain'?'alert':'watch')));
    m.score=m.alerts.length*100+m.watch.length*10+m.sym.length;
    m.mood=trend(m.days,'mood',0.4);m.sleep=trend(m.days,'sleep',0.4);
    return m;
  }).sort((a,b)=>b.score-a.score||RANK[b.overall]-RANK[a.overall]||(a.demo-b.demo));
}
function topActions(m){
  const ks=CORE.filter(k=>m.st[k]==='alert').concat(CORE.filter(k=>m.st[k]==='watch'));
  const out=[];
  ks.forEach(k=>{const a=IND[k].act||[];if(a[0])out.push(SHORT[k]+': '+a[0]);if(m.st[k]==='alert'&&a[2])out.push(SHORT[k]+': '+a[2]);});
  if(m.sym.includes('chest pain'))out.unshift('Chest pain: stop activity, crew medical officer assesses now');
  return out.slice(0,4);
}

// ---------- Panel 1: crew medical officer view ----------
function panelCrew(){
  const ms=members(), now=Date.now();
  const rows=ms.map(m=>{
    const td=m.days[m.days.length-1], open=!!OPEN[m.id], pct=m.cum/SB.CAREER_LIMIT*100;
    const age=m.lastTs?SB.fmtDur(Math.max(0,(now-m.lastTs)/1000)):'none';
    const chips=CORE.map(k=>{const l=latestIn(m.days,k);return `<span class="chip">${dot(m.st[k])}${esc(IND[k].label)}: <b>${l?esc(SB.fmtV(k,l.v)):'-'}</b></span>`;}).join('');
    const acts=topActions(m);
    const sl3=m.days.slice(-3).filter(e=>has(e,'sleep')).map(e=>+e.sleep);
    return `<div class="ops-row st-${m.overall}" data-row="${esc(m.id)}" data-demo="${m.demo?1:0}" data-score="${m.score}">
      <button type="button" class="ops-rh" data-member="${esc(m.id)}" aria-expanded="${open}" aria-controls="ops-d-${esc(m.id)}">
        <span class="ops-nm"><b>${esc(m.name)}</b><small>${esc(m.role)}${m.demo?' · demo':''}</small></span>
        <span class="ops-dots" role="img" aria-label="${esc(`${m.alerts.length} Act now, ${m.watch.length} Watch of 12 indicators`)}">${CORE.map(k=>`<i class="dot st-${m.st[k]}" title="${esc(IND[k].label+': '+STXT[m.st[k]])}"></i>`).join('')}</span>
        <span class="ops-c ${m.alerts.length?'hot':''}"><b>${m.alerts.length}</b><small>Act now</small></span>
        <span class="ops-c"><b>${esc(age)}</b><small>last log</small></span>
        <span class="ops-c st-${m.mood.s}"><b class="tr" aria-hidden="true">${m.mood.a}</b><small>mood ${m.mood.w}</small></span>
        <span class="ops-c st-${m.sleep.s}"><b class="tr" aria-hidden="true">${m.sleep.a}</b><small>sleep ${m.sleep.w}</small></span>
        <span class="ops-c st-${radSt(m.cum)}"><b>${pct.toFixed(1)}%</b><small>career dose</small></span>
      </button>
      <div class="ops-d" id="ops-d-${esc(m.id)}" ${open?'':'hidden'}>
        <div class="mini">${chips}${m.sym.map(x=>`<span class="chip">${dot(x==='chest pain'?'alert':'watch')}Symptom: ${esc(x)}</span>`).join('')}</div>
        <p class="ops-note">Mission day ${esc(String(td.day))} · sleep 3-night average ${sl3.length?esc(mean(sl3).toFixed(1))+' h':'no data'} · cumulative dose ${esc(m.cum.toFixed(1))} of ${SB.CAREER_LIMIT} mSv${m.demo?' (includes prior missions)':''}</p>
        <div class="ops-lbl">Top actions</div>
        ${acts.length?`<ul class="ops-ul">${acts.map(a=>`<li>${esc(a)}</li>`).join('')}</ul>`:'<p class="ops-note">Nothing on Watch or Act now. Keep the routine.</p>'}
      </div>
    </div>`;}).join('');
  const crew=SB.state().crew||{};
  return `<div class="card" id="opsCrew">
    <h2>Whole crew at a glance <span class="ops-tag">CMO: ${esc(crew.cmo||'not set')}</span></h2>
    <p class="ops-intro">Worst first. Each dot is one of the 12 core indicators (${CORE.map(k=>SHORT[k]).join(', ')}). Tap a crew member for details and the top actions.</p>
    <p class="ops-demo">Rows marked demo are a demo crew generated on this device; sync between devices is not part of this prototype. Only your row uses your own logged data.</p>
    <div class="ops-grid">${rows}</div>
    <div class="legend" style="justify-content:flex-start;margin-top:8px"><span>${dot('ok')}Nominal</span><span>${dot('watch')}Watch</span><span>${dot('alert')}Act now</span><span>${dot('none')}No recent data</span></div>
    ${sources(['hrp','std'],'Career dose limit 600 mSv from NASA-STD-3001 Vol. 1')}
  </div>`;
}

// ---------- Panel 2: EVA / task readiness ----------
const VWHY={
  spo2:'Low oxygen saturation leaves little margin for exertion, suit pressure or cabin air faults.',
  bp:'Abnormal blood pressure under heavy load or in a suit raises the risk of fainting or a cardiac event.',
  hr:'An abnormal resting heart rate can mean illness, dehydration or a rhythm problem.',
  temp:'Fever lowers work capacity and heat tolerance; a suit or cabin sheds heat poorly.',
  glucose:'Low or high blood sugar impairs judgement and fine motor control over hours without food.'
};
function readiness(a){
  const A=ACTS[a], S=SB.state(), td=SB.today(), out=[], add=(lvl,t,why)=>out.push({lvl,t,why});
  const missing=A.need.filter(k=>!has(td,k));
  if(missing.length)add('caution','Measure first: '+missing.map(k=>IND[k].label).join(', '),'Not logged today. Readiness is not judged on old readings.');
  ['spo2','bp','hr','temp','glucose'].forEach(k=>{if(!has(td,k))return;const s=SB.statusOf(k,td[k]);
    if(s==='alert')add('nogo',`${IND[k].label} ${SB.fmtV(k,td[k])}: Act now`,VWHY[k]);
    else if(s==='watch')add('caution',`${IND[k].label} ${SB.fmtV(k,td[k])}: Watch`,VWHY[k]+' Re-measure before starting.');});
  const sl=has(td,'sleep')?+td.sleep:null, l3=S.days.slice(-3).filter(e=>has(e,'sleep')).map(e=>+e.sleep);
  if(sl===null)add('caution','Log last night\'s sleep','Sleep is the strongest everyday predictor of fatigue-related errors.');
  else if(sl<5)add(a==='exercise'?'caution':'nogo',`Slept ${sl.toFixed(1)} h last night`,'Under 5 h of sleep raises the risk of errors in long, safety-critical work.');
  else if(sl<6)add('caution',`Slept ${sl.toFixed(1)} h last night`,'Short sleep slows reactions: plan breaks and a second check of critical steps.');
  if(l3.length===3&&mean(l3)<6)add('caution',`3-night sleep average ${mean(l3).toFixed(1)} h`,'Sleep debt builds up over several short nights even if last night was better.');
  (td.symptoms||[]).forEach(x=>{
    if(x==='chest pain'||x==='shortness of breath')add('nogo','Symptom: '+x,'Needs assessment by the crew medical officer before any exertion.');
    else if(x==='nausea'&&a==='eva')add('nogo','Symptom: nausea','Vomiting inside a helmet is an airway and visibility hazard.');
    else add('caution','Symptom: '+x,'Report it to the crew medical officer before starting.');});
  if(has(td,'mood')&&+td.mood<=2)add('caution',`Mood ${td.mood}/5 today`,'Low mood affects attention and teamwork; check in with the crew medical officer first.');
  const now=Date.now();
  SB.doses().filter(d=>now-d.ts>=0&&now-d.ts<8*3600e3&&(SB.medClass('sedative',d.id)||SB.medClass('opioid',d.id))).forEach(d=>
    add(A.sedNoGo?'nogo':'caution',`${medName(d.id)} given at ${hhmm(d.ts)}`,'Sedating or opioid medicine in the last 8 h: drowsiness and slowed reactions.'));
  if(A.rad){
    const w=SB.swx().status;
    if(w==='alert')add('nogo','Space weather: Act now','Recent solar particle event or X-class flare: stay in or near shielding until mission control clears it.');
    else if(w==='watch')add('caution','Space weather: Watch','M-class flare in the last 48 h: stay within reach of the storm shelter and watch the dosimeter.');
    else if(w==='none')add('caution','Space weather not available','Live NASA DONKI data is not loaded: confirm with mission control before going out.');
    if(has(td,'dose')&&SB.statusOf('dose',td.dose)==='alert')add('nogo',`Dosimeter ${SB.fmtV('dose',td.dose)} today`,'Several times the normal rate: possible solar particle event. Go to the shelter.');
    const rs=SB.radStatus();
    if(rs==='alert')add('caution',`Cumulative dose ${(SB.cumDose()/SB.CAREER_LIMIT*100).toFixed(0)}% of career limit`,'Every hour outside adds dose: flight surgeon reviews the remaining budget.');
  }
  const v=SB.latest('vision');
  if(v&&v.v===true&&td.day-v.day<=7&&(a==='vehicle'||a==='eva'))add('caution','Vision changed (SANS)','Displays, checklists and hand controls depend on near vision: check with the vision card first.');
  if(a==='exercise'&&has(td,'hydration')&&SB.statusOf('hydration',td.hydration)==='alert')add('caution',`Fluid intake ${SB.fmtV('hydration',td.hydration)} so far`,'Drink before heavy exercise: sweat losses add to dehydration.');
  const verdict=out.some(x=>x.lvl==='nogo')?'nogo':out.length?'caution':'go';
  return {verdict,rules:out.sort((x,y)=>(y.lvl==='nogo')-(x.lvl==='nogo'))};
}
function panelEva(){
  const r=readiness(P.act), V={go:['Go','ok'],caution:['Caution','watch'],nogo:['No-go','alert']}[r.verdict];
  const summary=r.verdict==='go'?'No rule fired. Proceed under normal mission rules.':r.verdict==='nogo'?'At least one rule blocks this activity today.':'Resolve or accept the items below with the crew medical officer.';
  return `<div class="card" id="opsEva">
    <h2>EVA and task readiness</h2>
    <div class="libtypes" id="evaActs" role="group" aria-label="Activity">${Object.keys(ACTS).map(k=>`<button type="button" data-act="${k}" class="${k===P.act?'on':''}" aria-pressed="${k===P.act}">${esc(ACTS[k].name)}</button>`).join('')}</div>
    <div class="ops-verdict st-${V[1]}" id="evaVerdict" data-verdict="${r.verdict}" role="status"><b>${V[0]}</b><span>${esc(ACTS[P.act].name)} · ${esc(summary)}</span></div>
    <div id="evaRules">${r.rules.length?r.rules.map(x=>`<div class="dr">${dot(x.lvl==='nogo'?'alert':'watch')}<div><b>${x.lvl==='nogo'?'No-go':'Caution'}: ${esc(x.t)}</b><br><span class="ops-why">${esc(x.why)}</span></div></div>`).join(''):`<div class="dr">${dot('ok')}<div>All checks passed.</div></div>`}</div>
    <p class="ops-note">Checked: today's SpO2, blood pressure, heart rate, temperature${ACTS[P.act].need.includes('glucose')?', blood sugar':''}; sleep last night and 3-night average; symptoms; mood; sedating or opioid medicine in the last 8 h${ACTS[P.act].rad?'; space weather; dosimeter and cumulative dose':''}${P.act==='vehicle'||P.act==='eva'?'; vision change':''}.</p>
    <p class="ops-demo">This is a checklist aid, not a clearance. The crew medical officer and mission flight rules make the go or no-go call.</p>
    ${sources(['hrp','std','briefs'])}
  </div>`;
}

// ---------- Panel 3: countermeasure planner ----------
function streakOf(k){
  const S=SB.state(), tdDay=SB.today().day, days=S.days.slice(-7).filter(e=>has(e,k));
  if(!days.length||tdDay-days[days.length-1].day>2)return {n:0,s:'ok'};
  let n=0,s='ok';
  for(let i=days.length-1;i>=0;i--){const x=SB.statusOf(k,days[i][k]);if(x==='watch'||x==='alert'){n++;s=worst([s,x]);}else break;}
  return {n,s};
}
function plan(){
  const S=SB.state(), td=SB.today(), env=S.env, envName=(SB.ENVS[env]||{}).name||env, items=[];
  const add=(s,title,detail,why)=>items.push({s,title,detail,why});
  const last7=k=>S.days.slice(-7).filter(e=>has(e,k)).map(e=>+e[k]);
  // exercise
  let res=60, aer=60, envNote='Same pattern as ISS crews: heavy resistive device plus treadmill or cycle, about 2 h a day.';
  if(env==='rover'){res=35;aer=25;envNote='Rover cabin is too small for the full devices: compact resistive kit and in-seat isometrics, make up the rest back at base.';}
  else if(env==='lunar'||env==='mars')envNote='Partial gravity alone does not load bone and muscle enough: keep the heavy resistive work.';
  else if(env==='transit')envNote='No quick return: protect muscle and aerobic fitness for the landing and surface tasks.';
  const exAvg=mean(last7('exercise')), massSt=SB.status('mass'), cardio=worst([SB.status('hr'),SB.status('bp')]), fever=has(td,'temp')&&SB.statusOf('temp',td.temp)==='alert';
  const exWhy=[envNote];
  if(massSt==='watch'||massSt==='alert'){res+=10;aer-=10;exWhy.push('Body mass is falling: more time on heavy resistive work, and eat the full menu.');}
  if(cardio==='watch'||cardio==='alert')exWhy.push('Heart rate or blood pressure is off: keep aerobic work moderate, no maximal intervals.');
  if(exAvg!==null&&exAvg<90)exWhy.push(`7-day average ${Math.round(exAvg)} min/day is below the 90 min minimum.`);
  if(fever)add('alert','Exercise: rest day','Fever today. No heavy exercise until temperature is back in range.','Exercising with a fever strains the heart and slows recovery.');
  else add(exAvg!==null&&exAvg<90?'watch':'ok',`Exercise ${res+aer} min: ${res} resistive, ${aer} aerobic`,exWhy.join(' '),'Without load, weight-bearing bone can lose about 1% a month and postural muscle wastes; daily exercise is the main countermeasure.');
  // hydration
  const ml=SB.latest('mass'), mass=ml?+ml.v:+S.baseMass||70, base=Math.min(3.5,Math.max(2.0,Math.round(mass*0.035*10)/10)), tgt=+(base+(fever?0:0.5)).toFixed(1);
  const hyAvg=mean(last7('hydration'));
  add(hyAvg!==null&&hyAvg<2?'watch':'ok',`Fluids ${tgt.toFixed(1)} L today`,`About 35 mL per kg (${mass.toFixed(1)} kg), at least 2 L, plus 0.5 L for exercise. ${hyAvg!==null?'7-day average '+hyAvg.toFixed(1)+' L.':''}`,'Thirst is blunted in microgravity and calcium released from bone raises kidney-stone risk; drinking well dilutes urine.');
  // sleep
  const sl3=S.days.slice(-3).filter(e=>has(e,'sleep')).map(e=>+e.sleep), slAvg=mean(sl3);
  add(slAvg!==null&&slAvg<6?'watch':'ok','Sleep window 8.5 h, same time every day',`${slAvg!==null?'3-night average '+slAvg.toFixed(1)+' h. ':''}${env==='mars'?'A Mars sol is about 24 h 40 min: shift the window about 40 min later each sol. ':''}Circadian lighting, no screens for 60 min before, eye mask and earplugs.`,'ISS schedules allow 8.5 h for sleep, yet crews average about 6 h; sleep loss degrades performance and mood.');
  // vision
  const v=SB.latest('vision'), vChanged=v&&v.v===true&&td.day-v.day<=7;
  if(vChanged)add('watch','Extra vision checks (SANS)','Near-vision card and Amsler grid, each eye, morning and evening. Ask the crew medical officer for an onboard eye ultrasound or OCT scan.','A change in near vision can be an early sign of spaceflight-associated neuro-ocular syndrome.');
  else add('ok','Vision check once today','Near-vision card and Amsler grid, each eye.','Daily checks catch SANS changes early.');
  // radiation and space weather
  const w=SB.swx().status, spike=has(td,'dose')&&SB.statusOf('dose',td.dose)==='alert', rs=SB.radStatus();
  if(w==='alert'||spike)add('alert','Shelter: stay in the storm shelter, no EVA',spike?'Today\'s dosimeter reading is several times the normal rate.':'NASA DONKI shows a recent solar particle event or X-class flare.','Solar particle events can deliver a large dose within hours; shielding cuts it sharply.');
  else if(w==='watch')add('watch','EVA limits: stay within reach of the shelter','Keep the dosimeter on, plan EVA close to shelter, short and early.','An M-class flare in the last 48 h can be followed by a particle event.');
  if(rs==='alert'||rs==='watch')add(rs,'Dose budget: keep EVA hours to a minimum',`Cumulative ${SB.cumDose().toFixed(1)} of ${SB.CAREER_LIMIT} mSv. Sleep in the most shielded quarters.`,'NASA limits career effective dose to 600 mSv; exposure adds up over the mission.');
  if(w!=='alert'&&w!=='watch'&&!spike&&rs==='ok')add('ok','No shelter actions today','Keep the dosimeter on and know the way to the shelter.','Space weather can change within hours.');
  // priority boosts: indicators on Watch or Act for 3+ logged days in a row
  const covered={vision:true,sleep:slAvg!==null&&slAvg<6,exercise:exAvg!==null&&exAvg<90,hydration:hyAvg!==null&&hyAvg<2};   // already flagged above
  CORE.filter(k=>!covered[k]).forEach(k=>{const st=streakOf(k);if(st.n>=3){const a=(IND[k].act||[])[0];
    add(st.s,`Priority: ${IND[k].label}`,a||'Review with the crew medical officer.',`On ${STXT[st.s]} for ${st.n} logged days in a row: a lasting trend needs a plan, not a single fix.`);}});
  const order={alert:0,watch:1,ok:2,none:3};
  return {envName,items:items.sort((a,b)=>order[a.s]-order[b.s])};
}
function panelPlan(){
  const p=plan();
  return `<div class="card" id="opsPlan">
    <h2>Today's countermeasure plan <span class="ops-tag">${esc(p.envName)}</span></h2>
    <p class="ops-intro">Adapted to the mission environment and your last 7 days. Items that need attention come first.</p>
    ${p.items.map(x=>`<div class="ops-item st-${x.s}"><div class="ops-it">${dot(x.s)}<b>${esc(x.title)}</b></div><div class="ops-why">${esc(x.detail)}</div><div class="ops-rat">Why: ${esc(x.why)}</div></div>`).join('')}
    ${sources(['hrp','std','hrpHome'],'ISS exercise countermeasures: resistive device, treadmill and cycle')}
  </div>`;
}

// ---------- Panel 4: ground handover report ----------
const MAXB=1200;   // console comms keep up to 1200 characters per message; target under 1.5 KB
function handover(){
  const S=SB.state(), td=SB.today(), L=SB.link(), days=S.days.slice(-7), first=days[0]?days[0].day:td.day;
  const now=SB.CORE.filter(k=>SB.status(k)==='alert'), wat=SB.CORE.filter(k=>SB.status(k)==='watch');
  let nA=0,nW=0;days.forEach(e=>CORE.forEach(k=>{if(!has(e,k))return;const s=SB.statusOf(k,e[k]);if(s==='alert')nA++;else if(s==='watch')nW++;}));
  const r=['SONNENBLUME 7-DAY HANDOVER',`Crew: ${S.name||'crew member'} | days ${first}-${td.day} | ${(SB.ENVS[S.env]||{}).name||S.env}`,`Link: ${L.label}`,`Readings 7d: ${nA} Act now, ${nW} Watch`,
    `ACT NOW: ${now.map(k=>SHORT[k]).join(', ')||'none'}`,`WATCH: ${wat.map(k=>SHORT[k]).join(', ')||'none'}`,'min/median/max (days logged):'];
  const f=(k,x)=>IND[k].fmt(Math.round(x*100)/100);
  CORE.forEach(k=>{
    if(k==='vision'){const vd=days.filter(e=>has(e,'vision'));r.push(`Vision: changed ${vd.filter(e=>e.vision).length}/${vd.length} d`);return;}
    const vs=days.filter(e=>has(e,k));if(!vs.length){r.push(`${SHORT[k]}: no data`);return;}
    if(k==='bp'){const s=vs.map(e=>e.bp.sys),d=vs.map(e=>e.bp.dia);r.push(`BP: ${Math.min(...s)}/${Math.round(median(s))}/${Math.max(...s)} sys, ${Math.min(...d)}/${Math.round(median(d))}/${Math.max(...d)} dia (${vs.length})`);return;}
    const n=vs.map(e=>num(k,e[k]));r.push(`${SHORT[k]}: ${f(k,Math.min(...n))}/${f(k,median(n))}/${f(k,Math.max(...n))} ${IND[k].unit} (${vs.length})`);
  });
  const sym={};days.forEach(e=>(e.symptoms||[]).forEach(x=>{(sym[x]=sym[x]||[]).push(e.day);}));
  r.push('Symptoms: '+(Object.keys(sym).map(x=>`${x} d${sym[x].join(',')}`).join('; ')||'none'));
  const cut=Date.now()-7*864e5, ds=SB.doses().filter(d=>d.ts>=cut), dosesAt=r.length;
  const doseLine=n=>'Doses given: '+(ds.length?(ds.length>n?`${ds.length} (last ${n}) `:'')+ds.slice(-n).map(d=>`d${d.day} ${hhmm(d.ts)} ${medName(d.id)} ${d.mg}mg`).join('; '):'none');
  r.push(doseLine(6));
  const d7=days.reduce((a,e)=>a+(has(e,'dose')?+e.dose:0),0);
  r.push(`Radiation: ${d7.toFixed(1)} mSv in 7d; total ${SB.cumDose().toFixed(1)}/${SB.CAREER_LIMIT} mSv (${(SB.cumDose()/SB.CAREER_LIMIT*100).toFixed(1)}%)`);
  const mo=days.filter(e=>has(e,'mood')).map(e=>+e.mood), t=trend(S.days,'mood',0.4);
  r.push(mo.length?`Mind: mood avg ${mean(mo).toFixed(1)}/5, ${mo.filter(x=>x<=2).length} low day(s), trend ${t.w}`:'Mind: no mood check-ins');
  let txt=r.join('\n');
  for(let n=5;n>=0&&new Blob([txt]).size>MAXB;n--){r[dosesAt]=n?doseLine(n):`Doses given: ${ds.length} (see full record)`;txt=r.join('\n');}   // shorten the medicine list first
  if(new Blob([txt]).size>MAXB)txt=txt.slice(0,MAXB-40)+'\n[truncated: full record on request]';   // never exceed the comms limit
  return txt;
}
function panelHandover(){
  const t=handover(), b=new Blob([t]).size, L=SB.link();
  return `<div class="card" id="opsHandover">
    <h2>Ground handover report <span class="ops-tag" id="hoSize">${b} bytes</span></h2>
    <p class="ops-intro">A compact 7-day summary for the flight surgeon, small enough for a weak, delayed link (target under 1.5 KB). Current link: ${esc(L.label)}${L.black?', messages queue until it returns':''}.</p>
    <textarea id="hoText" readonly rows="16" data-bytes="${b}" aria-label="Handover report text">${esc(t)}</textarea>
    <div class="btns"><button type="button" class="btn pri" id="hoSend">Send to Earth</button><button type="button" class="btn" id="hoCopy">Copy</button><button type="button" class="btn" id="hoDl">Download .txt</button></div>
    ${sources(['std','hrp'])}
  </div>`;
}
function copyText(t){
  const fallback=()=>{const ta=document.getElementById('hoText');if(!ta)return;ta.focus();ta.select();let ok=false;try{ok=document.execCommand('copy');}catch(e){}SB.toast(ok?'Report copied':'Select the text and copy it manually');};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(()=>SB.toast('Report copied')).catch(fallback);else fallback();
}
function download(t){
  try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/plain'}));a.download='sonnenblume-handover-day'+SB.today().day+'.txt';
    document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);SB.toast('Report downloaded');}catch(e){SB.toast('Download failed');}
}

// ---------- Shell ----------
const PANEL_FN={crew:panelCrew,eva:panelEva,plan:panelPlan,handover:panelHandover};
let bound=false, lastSwx=null;
function render(){
  const root=document.getElementById('opsRoot');if(!root)return;
  if(!bound){bound=true;root.addEventListener('click',onClick);}
  let body;
  try{body=PANEL_FN[P.panel]();}catch(e){console.warn('crew ops',e);body='<div class="card"><p class="ops-note">This panel could not be built from the current data. Other tabs are unaffected.</p></div>';}
  lastSwx=SB.swx().status;
  root.innerHTML=`<div class="ops-bar"><span class="seg" id="opsSeg" role="group" aria-label="Crew ops panels">${Object.keys(PANELS).map(k=>`<button type="button" data-p="${k}" class="${k===P.panel?'on':''}" aria-pressed="${k===P.panel}">${PANELS[k]}</button>`).join('')}</span></div>${body}`;
}
function onClick(e){
  const p=e.target.closest('[data-p]');if(p&&PANELS[p.dataset.p]){P.panel=p.dataset.p;saveP();render();return;}
  const a=e.target.closest('[data-act]');if(a&&ACTS[a.dataset.act]){P.act=a.dataset.act;saveP();render();return;}
  const m=e.target.closest('[data-member]');if(m){const id=m.dataset.member;OPEN[id]=!OPEN[id];const d=document.getElementById('ops-d-'+id);if(d){d.hidden=!OPEN[id];m.setAttribute('aria-expanded',String(OPEN[id]));}return;}
  if(e.target.closest('#hoSend')){const t=handover(),msg=SB.sendMsg('report',t);SB.toast(SB.link().black?'Handover queued until the link returns':'Handover sent: '+msg.size+' bytes, arrives in '+SB.fmtDur(SB.link().sec));return;}
  if(e.target.closest('#hoCopy')){copyText(handover());return;}
  if(e.target.closest('#hoDl')){download(handover());}
}
SB.onView('ops',render);
// live space weather arrives after first render: refresh the open panel once it changes
setInterval(()=>{try{const v=document.getElementById('v-ops');if(v&&!v.classList.contains('hidden')&&SB.swx().status!==lastSwx&&(P.panel==='eva'||P.panel==='plan'))render();}catch(e){}},2000);
window.addEventListener('storage',e=>{if(e.key==='sonnenblume-v1'){const v=document.getElementById('v-ops');if(v&&!v.classList.contains('hidden'))setTimeout(render,50);}});
})();
