(function(){
'use strict';
// ---------- Environments ----------
const ENVS = {
  iss:     {name:'Space station (LEO)', dose:0.5,  delay:'~0 s · live link',    delaySev:0, sec:0.5, days:180, note:'Flight surgeons on near-live comms. Return to Earth possible within hours.'},
  transit: {name:'Deep-space transit',  dose:1.8,  delay:'grows to 20+ min',    delaySev:2, sec:null, def:8, days:950, note:'No resupply, no quick return. Highest radiation; know your storm-shelter location.'},
  lunar:   {name:'Lunar surface base',  dose:1.37, delay:'~1.3 s one-way',      delaySev:1, sec:1.3, days:30, note:'Return to Earth ~3 days. Lunar dust is a lung and eye irritant.'},
  rover:   {name:'Pressurized rover (Moon)', dose:1.37, delay:'~1.3 s · relay gaps', delaySev:1, sec:1.3, days:14, note:'Small medical kit, cramped cabin, hours from base shelter. Log before each traverse.'},
  mars:    {name:'Mars surface base',   dose:0.64, delay:'3–22 min one-way',    delaySev:3, sec:null, def:12, days:950, note:'Earth help is slow: crew medical officer and onboard protocols come first.'}
};
const CAREER_LIMIT = 600; // mSv

// ---------- Indicators ----------
const IND = {
  hr:{label:'Resting heart rate', unit:'bpm', step:1, lim:[0,250], jump:25, fmt:v=>v, band:[50,100], yr:[35,130],
    crit:v=>v<30||v>200,
    status:v=> v<45||v>110?'alert': v<50||v>100?'watch':'ok',
    how:'Sit still 5 min after waking, before caffeine or exercise. Use the chest strap / pulse oximeter, or count your pulse for 30 s × 2.',
    why:'Fluids shift toward the head and the heart works against less gravity, so it can lose some muscle mass. Stress, fever, dehydration and poor sleep raise resting rate.',
    act:['Re-measure after 10 min of quiet rest','Drink 500 mL water if you are thirsty or urine is dark','If >110 at rest, with chest pain, dizziness or irregular beat: stop activity and inform the crew medical officer now']},
  bp:{label:'Blood pressure', unit:'mmHg', jump:30, fmt:v=>v.sys+'/'+v.dia, band:[90,130], yr:[50,190],
    crit:v=>v.sys<70||v.sys>220||v.dia>130,
    status:v=> (v.sys>=160||v.dia>=100||v.sys<85)?'alert': (v.sys>=130||v.dia>=85||v.sys<90)?'watch':'ok',
    how:'Seated, arm supported at heart level, cuff on bare upper arm. Take 2 readings 1 min apart and log the average.',
    why:'Headward fluid shift changes how blood pressure is regulated. Radiation and stress may add long-term cardiovascular risk. On landing, low BP on standing (orthostatic intolerance) is common.',
    act:['Repeat in 15 min seated and calm','Review salt intake and sleep','≥160/100 twice, or symptoms like severe headache or vision change → flight surgeon']},
  spo2:{label:'Blood oxygen (SpO₂)', unit:'%', step:1, lim:[0,100], jump:4, fmt:v=>v, band:[95,100], yr:[85,100],
    crit:v=>v<85,
    status:v=> v<92?'alert': v<95?'watch':'ok',
    how:'Finger pulse oximeter on a warm finger, hand still, 30 s. Remove nail polish or tape.',
    why:'Shows how well oxygen reaches your blood. Cabin air faults, high CO₂, lung irritation from lunar or Mars dust, or illness can lower it.',
    act:['Re-check on another finger','Check cabin O₂ and CO₂ readouts','<92% → supplemental O₂ per protocol and inform the crew medical officer']},
  temp:{label:'Body temperature', unit:'°C', step:0.1, lim:[25,45], jump:1.0, fmt:v=>(+v).toFixed(1), band:[36.1,37.5], yr:[35,39.5],
    crit:v=>v<34||v>41,
    status:v=> v>38.0||v<35.5?'alert': v>37.5||v<36.1?'watch':'ok',
    how:'Oral or ear thermometer at rest, not within 30 min of eating, drinking or exercise.',
    why:'Studies on the ISS found core temperature runs warmer during long flights, because heat leaves the body less easily without convection. Fever can be an early sign of infection or reactivated latent virus.',
    act:['Rest and re-measure in 1 h','Fluids and the medical kit\'s fever protocol','>38 °C for over 24 h, or with rash or stiff neck → flight surgeon; consider isolating in a closed habitat']},
  glucose:{label:'Fasting blood sugar', unit:'mg/dL', step:1, lim:[10,800], jump:40, fmt:v=>v, band:[70,100], yr:[40,200],
    crit:v=>v<40||v>400,
    status:v=> v<60||v>125?'alert': v<70||v>99?'watch':'ok',
    how:'Before breakfast. Clean finger, lancet, first drop wiped, second drop on the glucometer strip.',
    why:'Inactivity and microgravity can reduce insulin sensitivity. Under-eating (common in flight) can drive it low.',
    act:['If low (<70): 15 g fast sugar, re-check in 15 min','If high: review meals and exercise and re-test tomorrow','Repeated >125 fasting → flight surgeon review']},
  sleep:{label:'Sleep last night', unit:'h', step:0.25, lim:[0,24], jump:3, fmt:v=>(+v).toFixed(1), band:[7,9], yr:[3,10],
    status:v=> v<5?'alert': v<7?'watch':'ok',
    how:'From the wearable actigraph, or estimate lights-out → wake minus time awake. Log every morning.',
    why:'Noise, light without a 24 h day, workload, CO₂ and isolation all cut sleep. Station crews have averaged about 6 h a night, below the 7 h+ target.',
    act:['Fixed sleep window; use the habitat\'s circadian lighting','No screens 60 min before sleep, eye mask and earplugs','Under 6 h for 3 nights → talk to the crew medical officer about workload']},
  mood:{label:'Mood', unit:'/5', step:1, lim:[1,5], jump:2, fmt:v=>v, band:[4,5], yr:[1,5],
    status:v=> v<=2?'alert': v===3?'watch':'ok',
    how:'Quick honest self-rating: 1 = very low, 5 = great. Takes 10 seconds, best at the same time each evening.',
    why:'Isolation, confinement, monotony, crew friction and distance from family build up slowly. Spotting a downward trend early matters most.',
    act:['Schedule a private call with family or support team','Something novel: a window session, a hobby, a crew meal','Two or more days at ≤2, or any hopeless thoughts → speak to the crew medical officer or psych support today']},
  exercise:{label:'Exercise', unit:'min', step:5, lim:[0,600], fmt:v=>v, band:[90,150], yr:[0,180],
    status:v=> v<45?'alert': v<90?'watch':'ok',
    how:'Total minutes on the resistive device, treadmill and cycle today (the device log usually records it).',
    why:'Without weight on them, bones and postural muscles waste. ISS crews exercise about 2 h a day. There is no bone scanner on board, so sticking to exercise is your best daily proxy for bones.',
    act:['Book the device slot now','Prioritise heavy resistive (squat, deadlift) over cardio if time is short','Several missed days → adjust the schedule with mission control']},
  hydration:{label:'Fluid intake', unit:'L', step:0.1, lim:[0,15], jump:1.5, fmt:v=>(+v).toFixed(1), band:[2,3.5], yr:[0.5,4],
    status:v=> v<1.5?'alert': v<2?'watch':'ok',
    how:'Sum of drink bags / pouches today. Check urine colour too: pale is good.',
    why:'Thirst is blunted in microgravity. Calcium released from bone raises kidney-stone risk, and drinking well dilutes it.',
    act:['Drink 500 mL now and 250 mL every hour','Pair a drink with every meal and task block','Flank pain or blood in urine → flight surgeon']},
  mass:{label:'Body mass', unit:'kg', step:0.1, lim:[20,300], jump:2.5, fmt:v=>(+v).toFixed(1), yr:null,
    status:(v,c)=>{const p=(c.baseMass-v)/c.baseMass*100; return p>5?'alert': p>2?'watch':'ok';},
    how:'Weekly on the mass-measurement device (it uses acceleration, since scales don\'t work in microgravity), same time of day.',
    why:'Under-eating, muscle loss and fluid shifts cause weight loss. Losing more than about 5% points to an energy deficit that speeds bone and muscle loss.',
    act:['Log meals for 3 days','Add calorie-dense snacks; eat the full menu','>5% loss → nutrition review with the ground team']},
  dose:{label:'Radiation dose (today)', unit:'mSv', step:0.01, lim:[0,5000], fmt:v=>(+v).toFixed(2), yr:null,
    status:(v,c)=> v>c.env.dose*5?'alert': v>c.env.dose*1.6?'watch':'ok',
    how:'Read your personal dosimeter at the end of the day (active dosimeters show it live).',
    why:'Galactic cosmic rays and solar particle events damage DNA, raising long-term cancer, CNS and cardiovascular risk. Beyond low-Earth orbit, Earth\'s magnetic field no longer shields you.',
    act:['A spike several times the usual rate may mean a solar particle event: go to the storm shelter','Postpone EVA and traverses','Track your cumulative total against the career limit']},
  vision:{label:'Vision check', unit:'', fmt:v=>v?'Changed':'No change', yr:null,
    status:v=> v?'watch':'ok',
    how:'Daily: read the near-vision card at arm\'s length and look at the Amsler grid with each eye. Note any blur, distortion or blind spots.',
    why:'Spaceflight-associated neuro-ocular syndrome (SANS): headward fluid shift can swell the optic disc and flatten the back of the eye, often making you more farsighted.',
    act:['Use adjustable-focus "space glasses" if issued','Report it so an onboard eye ultrasound or OCT scan can be scheduled','Sudden vision loss → urgent']}
};
const CORE = ['hr','bp','spo2','temp','glucose','sleep','mood','exercise','hydration','dose','vision','mass'];
const SYMPTOMS = {headache:['brain','lungs'], 'vision blur':['eyes'], congestion:['immune','eyes'], nausea:['metabolism'], 'skin rash':['immune'], 'back pain':['bones'], fatigue:['brain','muscles'], 'sore throat':['immune'], 'chest pain':['heart'], 'shortness of breath':['lungs','heart']};

const ZONES = {
  brain:{name:'Brain, spinal cord & behaviour', ind:['sleep','mood'], fn:'Mood, thinking, decision-making and the sleep-wake cycle; the spinal cord carries signals to the body.', space:'Isolation, confinement, lost day/night cues, workload and distance from family wear down sleep and mood. On a far mission, the crew is its own support system.'},
  eyes:{name:'Eyes (SANS)', ind:['vision'], fn:'Sight, with the optic nerve linking the eye to the brain.', space:'Fluids shift toward the head and can reshape the eye and swell the optic disc, which changes near vision. Many long-duration crews show some signs.'},
  heart:{name:'Heart & blood vessels', ind:['hr','bp'], fn:'Pumps blood through arteries (red) and back through veins (blue) to every organ.', space:'With less gravity to pump against, the heart can shrink slightly and BP regulation changes. Radiation may add long-term risk.'},
  lungs:{name:'Lungs & cabin air', ind:['spo2'], fn:'Gets oxygen in and carbon dioxide out.', space:'A closed habitat depends on life support. CO₂ build-up causes headaches; lunar or Mars dust is sharp and irritating to breathe.'},
  metabolism:{name:'Digestion, kidneys & metabolism', ind:['glucose','mass','hydration'], fn:'Stomach, liver, pancreas and intestines turn food into energy and regulate blood sugar; kidneys filter blood; the thyroid sets metabolic rate.', space:'Less activity can reduce insulin sensitivity. Appetite often drops in flight, so weight loss is common.'},
  muscles:{name:'Muscles', ind:['exercise','mass'], fn:'Movement, posture and strength for EVA and landing.', space:'Postural muscles waste quickly without load. Daily resistive exercise is the main countermeasure.'},
  bones:{name:'Bones & spine', ind:['exercise','hydration'], fn:'Structure, protection and calcium storage.', space:'Weight-bearing bones can lose roughly 1–1.5% of mass per month in microgravity. Released calcium raises kidney-stone risk. The spine lengthens, which often causes back pain.'},
  immune:{name:'Immune & lymphatic system', ind:['temp'], fn:'Spleen, thymus and lymph nodes defend against infection and filter lymph.', space:'Stress, radiation, altered gravity and disrupted sleep weaken immune regulation. Dormant viruses can reactivate, and germs spread easily in a closed habitat.'},
  radiation:{name:'Radiation exposure (aura)', ind:['dose'], fn:'Whole-body risk from ionising radiation. Tap the glow around the body.', space:'Cosmic rays and solar storms damage cells. The risk adds up over the mission, so the cumulative dose matters as much as today\'s.'}
};

// ---------- State ----------
const KEY='sonnenblume-v1';
let S=null;
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
// Demo dose table: ONLY the two over-the-counter painkillers below, taken from standard adult package labels.
// Every other dose must be entered by the flight surgeon in Pharmacy > Dose table.
const DEMO_FORMULARY={
  'med-acetaminophen':{mg:1000,perKg:false,interval:6,maxDaily:3000,src:'Adult OTC label (extra strength)'},
  'med-ibuprofen':{mg:400,perKg:false,interval:6,maxDaily:1200,src:'Adult OTC label'}
};
function isoDay(t){return new Date(t).toISOString().slice(0,10);}
function seedData(envKey){
  const r=rng(42), env=ENVS[envKey], days=[], base=72.4;
  const g=(m,s)=>m+(r()+r()+r()-1.5)*s*1.15;
  for(let d=1;d<=30;d++){
    const late=d/30, e={day:d};
    e.hr=Math.round(g(64+late*3,4));
    e.bp={sys:Math.round(g(118+late*6,6)),dia:Math.round(g(76+late*3,4))};
    e.spo2=Math.round(Math.min(100,g(97.5,1)));
    e.temp=+g(36.9+late*0.2,0.2).toFixed(1);
    e.glucose=Math.round(g(88+late*6,6));
    e.sleep=+Math.max(3.5,g(6.9-late*0.6,0.6)).toFixed(2);
    e.mood=Math.max(1,Math.min(5,Math.round(g(4.2-(d>19&&d<26?1.3:0),0.6))));
    e.exercise=r()<0.12?Math.round(g(40,15)):Math.round(g(118,12)/5)*5;
    e.hydration=+g(2.3-late*0.2,0.3).toFixed(1);
    e.mass=+(base*(1-0.022*late)+(r()-.5)*0.3).toFixed(1);
    e.dose=+(env.dose*(0.85+r()*0.3)).toFixed(2);
    e.vision=false; e.symptoms=[];
    if(d===14){e.temp=38.3;e.hr=88;e.symptoms=['sore throat','fatigue'];}
    if(d===15){e.temp=37.7;e.symptoms=['fatigue'];}
    if(d===18){e.dose=+(env.dose*6.5).toFixed(2);}
    if(d>=24){e.symptoms=d===26?['headache']:[]; e.vision=d>=26;}
    if(d===22){e.sleep=5.2;}
    if(d%7!==0){delete e.mass;}
    if(r()<0.06){delete e.glucose;}
    days.push(e);
  }
  days.push({day:31, sleep:5.6, hr:71, symptoms:[]});
  const now=Date.now();
  return {env:envKey, name:'Cmdr. Rivera', baseMass:base, days, view:'dashboard', zone:'heart', trend:'bp', range:'week', layer:'organs', bodyMode:'anatomy', sex:'male',
    log:[{day:31,ts:now-3*3600e3,k:'sleep',v:5.6},{day:31,ts:now-3*3600e3,k:'hr',v:71}],
    comms:[], escSig:'', crew:{leader:'Cdr. Ito', cmo:'Dr. Okafor'},
    link:{delayMin:ENVS[envKey].def||12,blackout:false}, pharm:{}, missionStart:isoDay(Date.now()-30*864e5), run:null,
    formulary:JSON.parse(JSON.stringify(DEMO_FORMULARY)), doses:[]};
}
// ---------- Load + strict validation (stored data is untrusted) ----------
const LISTS={view:['dashboard','log','trends','library','pharmacy','mind','ops','guide'],trend:['bp','hr','spo2','temp','glucose','sleep','mood','exercise','hydration','mass','dose'],range:['day','week','month'],layer:['organs','bones'],bodyMode:['anatomy','status'],sex:['male','female'],kind:['alert','manual','update','protocol','report']};
const str=(v,n)=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,n):'';
const int=(v,lo,hi,d)=>{const n=Math.round(Number(v));return typeof v!=='boolean'&&v!==null&&v!==''&&Number.isFinite(n)&&n>=lo&&n<=hi?n:d;};
const pick=(v,list,d)=>list.includes(v)?v:d;
function cleanVal(k,v){
  const I=IND[k]; if(!I)return undefined;
  if(k==='bp'){if(!v||typeof v!=='object')return undefined;const s=int(v.sys,0,300,null),d=int(v.dia,0,200,null);return s===null||d===null?undefined:{sys:s,dia:d};}
  if(k==='vision')return typeof v==='boolean'?v:undefined;
  if(typeof v!=='number'&&typeof v!=='string')return undefined;
  const n=Number(v); if(v===''||!Number.isFinite(n))return undefined;
  if(I.lim&&(n<I.lim[0]||n>I.lim[1]))return undefined;
  if(k==='mood')return Math.round(n);
  return n;
}
function cleanDay(e){
  if(!e||typeof e!=='object')return null;
  const o={day:int(e.day,1,100000,null)}; if(o.day===null)return null;
  Object.keys(IND).forEach(k=>{const v=cleanVal(k,e[k]);if(v!==undefined)o[k]=v;});
  o.symptoms=Array.isArray(e.symptoms)?e.symptoms.filter(x=>typeof x==='string'&&SYMPTOMS[x]):[];
  return o;
}
function sanitize(s){
  const env=ENVS[s.env]?s.env:'iss', d=seedData(env);
  const days=(Array.isArray(s.days)?s.days:[]).slice(-1000).map(cleanDay).filter(Boolean);
  if(!days.length)return d;
  const now=Date.now();
  const o={env,days,
    name:str(s.name,40)||d.name,
    baseMass:(Number.isFinite(+s.baseMass)&&+s.baseMass>=20&&+s.baseMass<=300&&typeof s.baseMass==='number')?s.baseMass:d.baseMass,
    view:pick(s.view,LISTS.view,'dashboard'), zone:ZONES[s.zone]?s.zone:'heart', trend:pick(s.trend,LISTS.trend,'bp'),
    range:pick(s.range,LISTS.range,'week'), layer:pick(s.layer,LISTS.layer,'organs'), bodyMode:pick(s.bodyMode,LISTS.bodyMode,'anatomy'), sex:pick(s.sex,LISTS.sex,'male'),
    escSig:typeof s.escSig==='string'&&/^[a-z,]{0,200}$/.test(s.escSig)?s.escSig:'',
    crew:{leader:str(s.crew&&s.crew.leader,40)||d.crew.leader, cmo:str(s.crew&&s.crew.cmo,40)||d.crew.cmo},
    log:(Array.isArray(s.log)?s.log:[]).slice(-1500).map(x=>{if(!x||!IND[x.k])return null;const v=cleanVal(x.k,x.v);const day=int(x.day,1,100000,null),ts=int(x.ts,0,now+864e5,null);return v===undefined||day===null||ts===null?null:{day,ts,k:x.k,v};}).filter(Boolean),
    comms:(Array.isArray(s.comms)?s.comms:[]).slice(-50).map(m=>{if(!m||!LISTS.kind.includes(m.kind))return null;const ts=int(m.ts,0,now+864e5,null),day=int(m.day,1,100000,null);if(ts===null||day===null)return null;
      return {ts,day,kind:m.kind,text:str(m.text,1200),to:(Array.isArray(m.to)?m.to:[]).slice(0,4).map(t=>str(t,60)),earth:str(m.earth,60),eta:m.eta===null?null:int(m.eta,0,now+864e6,ts),size:int(m.size,0,1e6,0)};}).filter(Boolean),
    link:{delayMin:int(s.link&&s.link.delayMin,1,22,d.link.delayMin),blackout:!!(s.link&&s.link.blackout===true)},
    missionStart:typeof s.missionStart==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s.missionStart)?s.missionStart:d.missionStart,
    pharm:{}, run:null, formulary:{}, doses:[]};
  if(s.pharm&&typeof s.pharm==='object')Object.keys(s.pharm).slice(0,300).forEach(id=>{const p=s.pharm[id];if(/^med-[a-z0-9-]{1,60}$/.test(id)&&p&&typeof p==='object'&&/^\d{4}-\d{2}-\d{2}$/.test(p.exp||''))o.pharm[id]={qty:int(p.qty,0,999,0),exp:p.exp};});
  if(s.formulary&&typeof s.formulary==='object')Object.keys(s.formulary).slice(0,300).forEach(id=>{const f=s.formulary[id];if(!/^med-[a-z0-9-]{1,60}$/.test(id)||!f||typeof f!=='object')return;
    const mg=Number(f.mg),iv=Number(f.interval),mx=Number(f.maxDaily);if(!(mg>0&&mg<=100000&&iv>=0.25&&iv<=168&&mx>0&&mx<=1000000))return;
    o.formulary[id]={mg,perKg:f.perKg===true,interval:iv,maxDaily:mx,maxSingle:Number(f.maxSingle)>0&&Number(f.maxSingle)<=100000?Number(f.maxSingle):null,src:str(f.src,80)};});
  if(!s.formulary)o.formulary=JSON.parse(JSON.stringify(DEMO_FORMULARY));
  o.doses=(Array.isArray(s.doses)?s.doses:[]).slice(-500).map(x=>x&&/^med-[a-z0-9-]{1,60}$/.test(x.id||'')&&Number(x.mg)>0&&Number(x.mg)<=100000?{id:x.id,mg:Number(x.mg),ts:int(x.ts,0,now+864e5,now),day:int(x.day,1,100000,1)}:null).filter(Boolean);
  const r=s.run;if(r&&typeof r==='object'&&/^prot-[a-z0-9-]{1,60}$/.test(r.id||'')&&Array.isArray(r.steps))o.run={id:r.id,start:int(r.start,0,now+864e5,now),steps:r.steps.slice(0,40).map(t=>t===null?null:int(t,0,now+864e5,null))};
  return o;
}
// ---------- Storage: availability check, rolling backup, corruption recovery, quota handling ----------
const BKEY=KEY+'-backup';
const STORE={ok:false,recovered:false,failed:false,lastBackup:0};
try{const t='__sb_test__';localStorage.setItem(t,'1');localStorage.removeItem(t);STORE.ok=true;}catch(e){STORE.ok=false;}
function readKey(k){try{const raw=localStorage.getItem(k);if(!raw)return null;const s=JSON.parse(raw);return s&&typeof s==='object'?s:null;}catch(e){return undefined;}}
function load(){
  if(!STORE.ok)return seedData('iss');
  const main=readKey(KEY);
  if(main)return sanitize(main);
  if(main===undefined){try{localStorage.setItem(KEY+'-corrupt',localStorage.getItem(KEY)||'');}catch(e){}}   // keep the damaged copy for inspection
  const bak=readKey(BKEY);
  if(bak){STORE.recovered=true;return sanitize(bak);}
  return seedData('iss');
}
function trimState(){S.log=S.log.slice(-400);S.comms=S.comms.slice(-15);S.doses=S.doses.slice(-150);if(S.days.length>400)S.days=S.days.slice(-400);}
function save(){
  if(!STORE.ok)return false;
  let json;try{json=JSON.stringify(S);}catch(e){fault('save',e);return false;}
  for(let attempt=0;attempt<2;attempt++){
    try{localStorage.setItem(KEY,json);
      if(Date.now()-STORE.lastBackup>60000){localStorage.setItem(BKEY,json);STORE.lastBackup=Date.now();}
      if(STORE.failed){STORE.failed=false;storageNotice();}
      return true;
    }catch(e){
      if(attempt===0){try{localStorage.removeItem(KEY+'-corrupt');localStorage.removeItem(BKEY);}catch(_){} trimState();json=JSON.stringify(S);continue;}
      if(!STORE.failed){STORE.failed=true;storageNotice();}
    }
  }
  return false;
}
// ---------- Fault handling: one failing panel never takes the console down ----------
const ERRS=[];
function fault(where,e){
  try{ERRS.push({where,msg:String(e&&e.message||e).slice(0,240),ts:Date.now()});if(ERRS.length>50)ERRS.shift();console.error('[Sonnenblume]',where,e);showFault();}catch(_){}
}
function guard(name,fn){return function(){try{return fn.apply(this,arguments);}catch(e){fault(name,e);}};}
function showFault(){
  let bar=document.getElementById('faultBar');
  if(!bar){bar=document.createElement('div');bar.id='faultBar';bar.className='faultbar';bar.setAttribute('role','alert');document.body.appendChild(bar);}
  bar.innerHTML='<span>Something went wrong in part of the console. Your data is safe.</span><button class="btn" type="button" data-fault="reload">Reload</button><button class="btn" type="button" data-fault="copy">Copy error report</button><button class="btn" type="button" data-fault="close" aria-label="Dismiss">Dismiss</button>';
}
function storageNotice(){
  let n=document.getElementById('storeBar');
  const msg=!STORE.ok?'This browser is not allowing storage (private mode or blocked). Readings will be lost when you close the page. Use Export data to keep them.'
    :STORE.failed?'Storage is full, so new readings could not be saved. Export your data, then delete old browser data.'
    :STORE.recovered?'Your saved data was damaged, so the console restored the most recent backup.':'';
  if(!msg){if(n)n.remove();return;}
  if(!n){n=document.createElement('div');n.id='storeBar';n.className='storebar';n.setAttribute('role','status');document.body.insertBefore(n,document.body.firstChild);}
  n.textContent=msg;
}
window.addEventListener('error',e=>fault('window',e.error||e.message));
window.addEventListener('unhandledrejection',e=>fault('promise',e.reason));
S=load();

const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>S.days[S.days.length-1];
const ctx=()=>({env:ENVS[S.env],baseMass:S.baseMass});
const hhmm=ts=>{const d=new Date(ts);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');};
function has(e,k){return !!e&&e[k]!==undefined&&e[k]!==null&&e[k]!=='';}
function latest(k){for(let i=S.days.length-1;i>=0;i--){if(has(S.days[i],k))return {v:S.days[i][k],day:S.days[i].day,today:i===S.days.length-1};}return null;}
// ---------- Status engine: Rust compiled to WebAssembly (rust/core), JavaScript as fallback ----------
// The Rust core holds the same thresholds as IND above; tests check both give identical answers.
const RUST_KIND={hr:0,bp:1,spo2:2,temp:3,glucose:4,sleep:5,mood:6,exercise:7,hydration:8,mass:9,dose:10,vision:11};
const CODE=['none','ok','watch','alert'];
let RX=null; const ENGINE={name:'JavaScript'};
function rustArgs(k,v){
  if(k==='bp')return v&&typeof v==='object'?[+v.sys,+v.dia]:null;
  if(k==='vision')return typeof v==='boolean'?[v?1:0,0]:null;
  if(typeof v!=='number'&&typeof v!=='string')return null;
  return [+v,k==='mass'?+S.baseMass:k==='dose'?+ENVS[S.env].dose:0];}
function rustStatus(k,v){const a=rustArgs(k,v);return a?CODE[RX.sb_status(RUST_KIND[k],a[0],a[1])]||'none':'none';}
function jsStatus(k,v){try{return IND[k].status(v,ctx());}catch(e){return 'none';}}
function statusOf(k,v){if(v===undefined||v===null)return 'none';if(RX&&RUST_KIND[k]!==undefined){try{return rustStatus(k,v);}catch(e){}}return jsStatus(k,v);}
const isCrit=(k,v)=>{if(!IND[k].crit||v===undefined||v===null)return false;
  if(RX){try{const a=rustArgs(k,v);if(a)return RX.sb_critical(RUST_KIND[k],a[0],a[1])===1;}catch(e){}}
  return !!IND[k].crit(v);};
function rustMedian(a){const n=Math.min(a.length,RX.sb_buf_len());new Float64Array(RX.memory.buffer,RX.sb_buf_ptr(),n).set(a.slice(-n));return RX.sb_median(n);}
function loadRust(){
  if(typeof WebAssembly!=='object'||typeof fetch!=='function')return Promise.resolve(false);
  return fetch('wasm/sonnenblume_core.wasm').then(r=>{if(!r.ok)throw new Error('wasm '+r.status);return r.arrayBuffer();})
    .then(b=>WebAssembly.instantiate(b,{})).then(({instance})=>{const x=instance.exports;
      if(typeof x.sb_status!=='function'||x.sb_status(0,72,0)!==1||x.sb_status(1,162,90)!==3)throw new Error('engine self-test failed');
      RX=x;ENGINE.name='Rust (WebAssembly)';return true;})
    .catch(()=>false);}
// read-only hook for the parity tests
window.sbEngine=Object.freeze({name:()=>ENGINE.name,js:(k,v)=>jsStatus(k,v),rust:(k,v)=>RX&&RUST_KIND[k]!==undefined?rustStatus(k,v):null,
  jsCrit:(k,v)=>!!(IND[k]&&IND[k].crit&&IND[k].crit(v)),rustCrit:(k,v)=>{if(!RX)return null;const a=rustArgs(k,v);return a?RX.sb_critical(RUST_KIND[k],a[0],a[1])===1:null;}});
const fmtV=(k,v)=>IND[k].fmt(v)+(IND[k].unit?' '+IND[k].unit:'');
const RANK={none:0,ok:1,watch:2,alert:3};
const worst=a=>a.reduce((w,s)=>RANK[s]>RANK[w]?s:w,'none');
const STXT={ok:'Nominal',watch:'Watch',alert:'Act now',none:'No data'};
const fmtDur=sec=>sec<60?(sec<10?sec.toFixed(1):Math.round(sec))+' s':sec<3600?Math.round(sec/60)+' min':(sec/3600).toFixed(1)+' h';
function link(){const e=ENVS[S.env],adj=e.sec===null,sec=adj?S.link.delayMin*60:e.sec,black=adj&&S.link.blackout;
  return {sec,adj,black,label:black?'Blackout · solar conjunction':fmtDur(sec)+' one-way',independent:black||sec>=300};}
function cumDose(){return S.days.reduce((a,e)=>a+(has(e,'dose')?+e.dose:0),0);}
function radStatus(){if(RX){try{return CODE[RX.sb_radiation(cumDose(),CAREER_LIMIT)]||'ok';}catch(e){}}const p=cumDose()/CAREER_LIMIT;return p>0.8?'alert':p>0.5?'watch':'ok';}
const num=(k,v)=>k==='bp'?v.sys:+v;

// ---------- Sudden-shift detection ----------
function median(a){const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2;}
function shiftInfo(k){
  const I=IND[k], td=today();
  if(!I.jump||!has(td,k))return null;
  const cur=td[k], cs=statusOf(k,cur);
  // 1) rebound: an Act-now reading in the last 24 h (today or yesterday), now better
  const recent=S.log.filter(x=>x.k===k&&x.day>=td.day-1);
  const bad=[...recent].reverse().find(x=>statusOf(k,x.v)==='alert');
  if(bad&&cs!=='alert')return {kind:'rebound',text:`Was Act now (${fmtV(k,bad.v)}) within the last 24 h, now ${fmtV(k,cur)}. A sudden recovery isn't normal either, so re-measure and keep watching for 24 h.`};
  // 2) jump between today's last two saves
  const tl=S.log.filter(x=>x.k===k&&x.day===td.day);
  if(tl.length>=2){const a=tl[tl.length-2].v,b=tl[tl.length-1].v;
    const d=Math.abs(num(k,b)-num(k,a)), d2=k==='bp'?Math.abs(b.dia-a.dia):0;
    if(d>I.jump||d2>20)return {kind:'jump',text:`Jumped from ${fmtV(k,a)} to ${fmtV(k,b)} within the day. Check the sensor and re-measure.`};}
  // 3) far from personal baseline (median of previous 7 days)
  const prev=S.days.slice(0,-1).filter(e=>has(e,k)).slice(-7).map(e=>num(k,e[k]));
  if(prev.length>=3){let m=median(prev);if(RX){try{m=rustMedian(prev);}catch(e){}}
    if(Math.abs(num(k,cur)-m)>I.jump)return {kind:'baseline',text:`${fmtV(k,cur)} is far from your usual (~${k==='bp'?Math.round(m)+' sys':IND[k].fmt(Math.round(m*10)/10)+' '+I.unit}). Sudden change: re-measure.`};}
  return null;
}
function curStatus(k){
  const l=latest(k); if(!l)return 'none';
  const age=today().day-l.day, maxAge=k==='mass'?8:2;
  if(age>maxAge)return 'none';
  let s=statusOf(k,l.v);
  if(k==='dose') s=worst([s,radStatus()]);
  if(l.today&&shiftInfo(k)) s=worst([s,'watch']);
  return s;
}
function zoneStatus(z){
  const st=ZONES[z].ind.map(curStatus);
  (today().symptoms||[]).forEach(x=>{if((SYMPTOMS[x]||[]).includes(z))st.push(x==='chest pain'?'alert':'watch');});
  if(z==='brain'){
    const sl=S.days.slice(-3).map(e=>e.sleep).filter(v=>v!==undefined);if(sl.length===3&&sl.every(v=>v<6))st.push('alert');
    const m=S.days.slice(-3).map(e=>e.mood).filter(v=>v!==undefined);if(m.length>=2&&m.every(v=>v<=2))st.push('alert');}
  return worst(st);
}
const alertList=()=>CORE.filter(k=>curStatus(k)==='alert');
const critList=()=>CORE.filter(k=>has(today(),k)&&isCrit(k,today()[k]));

// ---------- Header ----------
const envSel=$('#envSel');
Object.entries(ENVS).forEach(([k,v])=>{const o=document.createElement('option');o.value=k;o.textContent=v.name;envSel.appendChild(o);});
envSel.onchange=()=>{S.env=envSel.value;if(ENVS[S.env].def)S.link.delayMin=ENVS[S.env].def;save();renderAll();toast('Environment: '+ENVS[S.env].name);};
$('#crewName').oninput=e=>{S.name=e.target.value.slice(0,40);save();};
$('#cLeader').oninput=e=>{S.crew.leader=e.target.value.slice(0,40);save();};
$('#cCmo').oninput=e=>{S.crew.cmo=e.target.value.slice(0,40);save();};

function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.remove('show'),2600);}

const VIEWS=['dashboard','log','trends','library','pharmacy','mind','ops','guide'];
const VIEW_HOOKS={};   // add-on modules (js/mind.js, js/ops.js) register a render function per view
function setView(v){if(!VIEWS.includes(v))v='dashboard';S.view=v;save();document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));VIEWS.forEach(x=>$('#v-'+x).classList.toggle('hidden',x!==v));if(v==='trends')drawTrend();if(v==='log')renderForm();if(v==='library')renderLibrary();if(v==='pharmacy')renderPharmacy();(VIEW_HOOKS[v]||[]).forEach(f=>{try{f();}catch(e){console.warn('module view',v,e);}});try{if(location.hash.slice(1)!==v)history.replaceState(null,'','#'+v);}catch(e){}}
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>setView(b.dataset.v));
document.addEventListener('click',e=>{const g=e.target.closest('[data-goto]');if(g){e.preventDefault();setView(g.dataset.goto);}});
function logField(k){setView('log');const f=$('#f-'+k);if(!f)return;const box=f.closest('.field');
  const calm=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  try{box.scrollIntoView({block:'center',behavior:calm?'auto':'smooth'});}catch(err){box.scrollIntoView();}
  f.focus({preventScroll:true});box.classList.remove('flash');void box.offsetWidth;box.classList.add('flash');
  clearTimeout(logField.t);logField.t=setTimeout(()=>box.classList.remove('flash'),1800);}
document.addEventListener('click',e=>{const t=e.target.closest('[data-task]');if(t&&IND[t.dataset.task]){e.preventDefault();logField(t.dataset.task);}});
window.addEventListener('hashchange',()=>{const h=location.hash.slice(1);if(VIEWS.includes(h)&&h!==S.view)setView(h);});

// ---------- Render ----------
function renderHeader(){
  envSel.value=S.env; $('#crewName').value=S.name||''; $('#cLeader').value=S.crew.leader||''; $('#cCmo').value=S.crew.cmo||'';
  $('#mday').textContent=today().day;
  $('#delayTxt').textContent=link().label;
  const o=worst(Object.keys(ZONES).map(zoneStatus));
  $('#overallDot').className='dot st-'+o; $('#overallTxt').textContent='Overall: '+STXT[o];
}
function renderBanner(){
  const env=ENVS[S.env], td=today(), alerts=alertList(), crit=critList();
  let html='';
  if(crit.length){
    html+=`<div class="banner st-alert"><div><b>Critical reading: ${crit.map(k=>IND[k].label+' '+fmtV(k,td[k])).join(', ')}</b><span>This is outside survivable or plausible range. First check the sensor is on properly and re-measure. If it's confirmed, start the onboard emergency protocol and get the crew medical officer now.</span></div></div>`;
  }
  if(has(td,'dose')&&td.dose>env.dose*5){
    html+=`<div class="banner st-alert"><div><b>Possible solar particle event</b><span>Today's dose is ${(td.dose/env.dose).toFixed(1)}× your normal rate. Go to the storm shelter, stop EVA, and confirm with mission control.</span></div></div>`;
  }
  if(alerts.length){
    const L0=link(), who = L0.independent ? `Earth replies take a long time here (${L0.black?'no contact during blackout':'at least '+fmtDur(L0.sec*2)+' round trip'}). <b style="display:inline">Start the onboard protocol with your crew medical officer now</b>, then send the data to the flight surgeon.` : `Notify the flight surgeon at the next contact and follow the steps below.`;
    html+=`<div class="banner st-alert"><div><b>Needs action: ${alerts.map(k=>IND[k].label).join(', ')}</b><span>${who}${alerts.length>=2?' <b style="display:inline">Crew leader alerted.</b>':''}</span></div></div>`;
  }
  const shifts=CORE.map(k=>({k,s:shiftInfo(k)})).filter(x=>x.s&&curStatus(x.k)!=='alert');
  if(shifts.length&&!alerts.length){
    html+=`<div class="banner st-watch"><div><b>Sudden change: ${shifts.map(x=>IND[x.k].label).join(', ')}</b><span>Values swung sharply. Even if they look normal now, status stays on Watch until a steady re-check.</span></div></div>`;
  }
  const L1=link();
  if(L1.independent&&!alerts.length&&!crit.length){
    html+=`<div class="banner" style="--c:#7fb8ff"><div><b>Earth-independent mode</b><span>${L1.black?'Solar conjunction blackout: no contact with Earth. Messages are queued and sent when the link returns.':'The earliest possible reply from Earth is '+fmtDur(L1.sec*2)+' away.'} The crew medical officer and onboard protocols lead. <a href="#library" data-goto="library">Open protocols</a></span></div></div>`;
  }
  $('#banner').innerHTML=html;
}
let bodyBuilt=false, bodySex='';
function renderBody(){
  const svg=$('#bodySvg'), sex=S.sex||'male';
  if(bodyBuilt&&bodySex!==sex){svg.innerHTML=buildBody(rng,sex);bodySex=sex;}
  if(!bodyBuilt){
    svg.innerHTML=buildBody(rng,sex);bodyBuilt=true;bodySex=sex;
    let css='';Object.keys(ZONES).forEach(z=>{css+=`#bodySvg .zz-${z}{--zc:var(--z-${z},#4a4a50);--zh:var(--zh-${z},0);--zo:var(--zo-${z},.12)}#bodySvg.al-${z} .zz-${z}.halo{animation:pulse 1.4s ease-in-out infinite}#bodySvg[data-sel="${z}"] .zz-${z}.out{stroke:#fff;stroke-opacity:.95;stroke-width:1.1}`;});
    css+='#bodySvg.al-radiation .aura{animation:pulse 1.4s ease-in-out infinite}';
    document.head.insertAdjacentHTML('beforeend','<style>'+css+'</style>');
    const tip=$('#btip'), wrap=svg.parentElement;
    svg.addEventListener('click',e=>{const t=e.target.closest('[data-z]');if(!t)return;S.zone=t.dataset.z;save();renderBody();renderZone();});
    svg.addEventListener('mousemove',e=>{const t=e.target.closest('[data-z]');if(!t){tip.style.display='none';return;}const z=t.dataset.z,s=zoneStatus(z),r=wrap.getBoundingClientRect();
      tip.innerHTML=`<i class="dot st-${s}"></i> ${ZONES[z].name} · <span style="color:var(--${s})">${STXT[s]}</span>`;tip.style.display='block';
      tip.style.left=Math.min(e.clientX-r.left+12,r.width-190)+'px';tip.style.top=(e.clientY-r.top-34)+'px';});
    svg.addEventListener('mouseleave',()=>tip.style.display='none');
    document.querySelectorAll('#bodyLayer button').forEach(b=>b.onclick=()=>{S.layer=b.dataset.l;save();renderBody();});
    document.querySelectorAll('#bodyMode button').forEach(b=>b.onclick=()=>{S.bodyMode=b.dataset.m;save();renderBody();});
    document.querySelectorAll('#bodySex button').forEach(b=>b.onclick=()=>{S.sex=b.dataset.s;save();renderBody();});
  }
  const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  Object.keys(ZONES).forEach(z=>{const s=zoneStatus(z);
    svg.style.setProperty('--z-'+z,css('--'+s));
    svg.style.setProperty('--zh-'+z,{alert:.75,watch:.55,ok:.1,none:0}[s]);
    svg.style.setProperty('--zo-'+z,{alert:.95,watch:.85,ok:.3,none:.12}[s]);
    svg.classList.toggle('al-'+z,s==='alert');});
  svg.dataset.sel=S.zone; svg.dataset.layer=S.layer||'organs';
  svg.classList.toggle('mode-status',S.bodyMode==='status');
  document.querySelectorAll('#bodyLayer button').forEach(b=>b.classList.toggle('on',b.dataset.l===(S.layer||'organs')));
  document.querySelectorAll('#bodyMode button').forEach(b=>b.classList.toggle('on',b.dataset.m===(S.bodyMode||'anatomy')));
  document.querySelectorAll('#bodySex button').forEach(b=>{const on=b.dataset.s===sex;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);});
  svg.dataset.sex=sex;svg.setAttribute('aria-label','Interactive anatomical body map, '+sex);
}
function renderZone(){
  const z=ZONES[S.zone]||ZONES.heart, s=zoneStatus(S.zone);
  const chips=z.ind.map(k=>{const l=latest(k),cs=curStatus(k);return `<span class="chip"><i class="dot st-${cs}"></i>${IND[k].label}: <b>${l?esc(fmtV(k,l.v)):'—'}</b></span>`;}).join('');
  const sy=(today().symptoms||[]).filter(x=>(SYMPTOMS[x]||[]).includes(S.zone));
  const shifts=z.ind.map(shiftInfo).filter(Boolean);
  const acts=z.ind.filter(k=>['watch','alert'].includes(curStatus(k))).flatMap(k=>IND[k].act.slice(0,2));
  $('#zinfo').innerHTML=`<h3><i class="dot st-${s}"></i>${z.name}</h3>
    <div class="mini">${chips}${sy.map(x=>`<span class="chip"><i class="dot st-${x==='chest pain'?'alert':'watch'}"></i>Symptom: ${esc(x)}</span>`).join('')}</div>
    ${shifts.map(x=>`<p style="color:var(--watch);font-size:12.5px">${esc(x.text)}</p>`).join('')}
    <div class="lbl">What it does</div><p>${z.fn}</p>
    <div class="lbl">How spaceflight affects it</div><p>${z.space}</p>
    ${KB.ready?(()=>{const pr=kbFor('protocol',p=>(p.zones||[]).includes(S.zone)).slice(0,5);return pr.length?`<div class="lbl">Protocols</div><div>${pr.map(kbLink).join('')}</div>`:'';})():''}
    ${acts.length?`<div class="lbl">Do this</div><ul>${acts.map(a=>`<li>${a}</li>`).join('')}</ul>`:`<div class="lbl">Status</div><p>${s==='none'?'No recent data. Log a measurement to assess this system.':'Within reference range. Keep up the routine.'}</p>`}`;
}
function spark(canvas,k){
  const vals=S.days.slice(-14).map(e=>has(e,k)?num(k,e[k]):null);
  const dpr=window.devicePixelRatio||1, w=canvas.clientWidth||160, h=30;
  canvas.width=w*dpr;canvas.height=h*dpr;const c=canvas.getContext('2d');c.scale(dpr,dpr);
  const v=vals.filter(x=>x!==null&&isFinite(x)); if(v.length<2)return;
  const mn=Math.min(...v),mx=Math.max(...v),rg=(mx-mn)||1;
  c.strokeStyle=getComputedStyle(canvas.parentElement).getPropertyValue('--c');c.lineWidth=1.6;c.beginPath();let st=false;
  vals.forEach((x,i)=>{if(x===null)return;const X=i/(vals.length-1)*(w-4)+2,Y=h-3-(x-mn)/rg*(h-6);st?c.lineTo(X,Y):c.moveTo(X,Y);st=true;});c.stroke();
}
function renderVitals(){
  const g=$('#vgrid');g.innerHTML='';
  CORE.forEach(k=>{
    const l=latest(k), s=curStatus(k), d=document.createElement('div'), sh=l&&l.today?shiftInfo(k):null;
    d.className='vcard st-'+s;
    const ago=l?(l.today?'today':'day '+l.day):'';
    let val=l?esc(IND[k].fmt(l.v)):'—';
    if(k==='mass'&&l){const p=((l.v-S.baseMass)/S.baseMass*100);val+=` <small>${p>=0?'+':''}${p.toFixed(1)}%</small>`;}
    const crit=l&&l.today&&isCrit(k,l.v);
    d.innerHTML=`<div class="t"><span>${IND[k].label}</span><span>${ago}</span></div><div class="v">${val} <small>${l?IND[k].unit:''}</small></div><div class="s">${crit?'Critical':STXT[s]}${s==='none'&&l?' · stale':''}</div>${sh?`<div class="shift">sudden change</div>`:''}${k==='vision'?'':'<canvas></canvas>'}`;
    d.onclick=()=>{S.trend=k==='vision'?'bp':k;setView('trends');};
    g.appendChild(d);
    const cv=d.querySelector('canvas'); if(cv)requestAnimationFrame(()=>spark(cv,k));
  });
}
function renderActions(){
  const env=ENVS[S.env];
  const items=CORE.map(k=>({k,s:curStatus(k)})).filter(x=>x.s==='alert'||x.s==='watch').sort((a,b)=>RANK[b.s]-RANK[a.s]);
  const missing=CORE.filter(k=>!has(today(),k)&&k!=='mass');
  let h='';
  if(!items.length)h+=`<p style="margin:0;color:#c8c8cc">Everything logged is within range. ${missing.length?'Finish today\'s measurements to complete the picture.':''}</p>`;
  items.forEach(({k,s})=>{const sh=shiftInfo(k);
    h+=`<div style="padding:10px 0;border-bottom:1px dashed var(--line)"><div style="display:flex;gap:8px;align-items:center;font-weight:600"><i class="dot st-${s}"></i>${IND[k].label} · <span style="color:var(--${s})">${STXT[s]}</span></div>${sh?`<div style="font-size:12.5px;color:var(--watch);margin-top:4px">${esc(sh.text)}</div>`:''}<ul style="margin:6px 0 0;padding-left:20px;color:#c8c8cc;font-size:13.5px;line-height:1.5">${(sh&&s==='watch'&&statusOf(k,today()[k])==='ok'?['Re-measure in 15 min, then again in a few hours','Keep logging every save, since the system compares readings']:IND[k].act).map(a=>`<li>${a}</li>`).join('')}</ul>${KB.ready?(()=>{const SV={critical:0,high:1,moderate:2,low:3},want=s==='alert'?1:2.5,PRI={vision:'prot-vision-change',sleep:'prot-sleep-loss',spo2:'prot-low-spo2',temp:'prot-fever',glucose:s==='alert'?'prot-hypoglycemia':'prot-hyperglycemia',dose:'prot-spe',bp:'prot-hypertension',hydration:'prot-dehydration',mood:s==='alert'?'prot-behavioural-crisis':'prot-panic'},pr=kbFor('protocol',p=>(p.indicators||[]).includes(k)).sort((a,b)=>((b.id===PRI[k])-(a.id===PRI[k]))||(a.indicators.indexOf(k)-b.indicators.indexOf(k))||(Math.abs(SV[a.data.severity]-want)-Math.abs(SV[b.data.severity]-want))).slice(0,2);return pr.length?`<div style="margin-top:6px">${pr.map(kbLink).join('')}</div>`:'';})():''}</div>`;});
  h+=`<p style="margin:12px 0 0;font-size:12.5px;color:var(--muted)">${env.name}: ${env.note}</p>`;
  $('#actions').innerHTML=h;
}

// ---------- Crew alert (simulated comms) ----------
function sendMsg(kind,text){
  const L=link(), ts=Date.now();
  const m={ts,day:today().day,kind,text:String(text).slice(0,1200),to:[S.crew.leader||'Crew leader',S.crew.cmo||'Medical officer'],earth:L.label,
    eta:L.black?null:ts+Math.round(L.sec*1000), size:new Blob([text]).size};
  S.comms.push(m); if(S.comms.length>50)S.comms=S.comms.slice(-50);
  return m;
}
function earthStatus(m){
  const now=Date.now();
  if(m.eta===null)return {c:'q',t:'Queued: Earth link blacked out'};
  if(m.eta>now)return {c:'t',t:'To Earth: arrives in '+fmtDur((m.eta-now)/1000)};
  const L=link(), reply=m.eta+L.sec*1000;
  return {c:'d',t:'Delivered to Earth'+(reply>now?' · earliest reply in '+fmtDur((reply-now)/1000):'')};
}
function releaseQueue(){const L=link();if(L.black)return;const now=Date.now();S.comms.forEach(m=>{if(m.eta===null)m.eta=now+Math.round(L.sec*1000);});}
function renderLink(){
  const L=link(), e=ENVS[S.env];
  let h=`<div class="linkctl"><div style="display:flex;justify-content:space-between;align-items:center"><span>Earth link</span><b>${esc(L.label)}</b></div>`;
  if(L.adj){
    h+=`<label>Delay <input type="range" id="lkDelay" min="1" max="22" step="1" value="${S.link.delayMin}" aria-label="One-way delay in minutes"> <b>${S.link.delayMin} min</b></label>
    <label><input type="checkbox" id="lkBlack" ${S.link.blackout?'checked':''}> Solar conjunction blackout (about 2 weeks every 26 months at Mars)</label>`;
  }
  if(L.independent)h+=`<div class="eim">Earth-independent mode</div>`;
  $('#linkCtl').innerHTML=h+'</div>';
  const d=$('#lkDelay');if(d)d.oninput=()=>{S.link.delayMin=int(d.value,1,22,12);save();renderHeader();renderBanner();renderLink();renderComms();};
  const b=$('#lkBlack');if(b)b.onchange=()=>{S.link.blackout=b.checked;if(!b.checked)releaseQueue();save();renderAll();toast(b.checked?'Blackout: messages to Earth will queue':'Link restored: queued messages sent');};
}
function buildReport(){
  const td=today(), L=link(), alerts=CORE.filter(k=>curStatus(k)==='alert'), watch=CORE.filter(k=>curStatus(k)==='watch');
  const line=k=>{const l=latest(k);return IND[k].label+': '+(l?fmtV(k,l.v)+(l.today?'':' (day '+l.day+')'):'no data')+' ['+STXT[curStatus(k)]+']';};
  const r=[`SONNENBLUME STATUS REPORT`,`Crew: ${S.name} · Mission day ${td.day} · ${ENVS[S.env].name}`,`Link: ${L.label}`,'',
    `ACT NOW (${alerts.length}): ${alerts.map(k=>IND[k].label).join(', ')||'none'}`,`WATCH (${watch.length}): ${watch.map(k=>IND[k].label).join(', ')||'none'}`,
    `Symptoms today: ${(td.symptoms||[]).join(', ')||'none'}`,'', 'Latest readings:',...CORE.map(k=>' - '+line(k)),'',
    `Radiation: ${cumDose().toFixed(1)} of ${CAREER_LIMIT} mSv career limit`];
  if(S.run&&KB.byId[S.run.id]){const p=KB.byId[S.run.id];r.push('',`Protocol in progress: ${p.title} (${S.run.steps.filter(Boolean).length}/${p.data.steps.length} steps)`);}
  const low=Object.entries(S.pharm||{}).filter(([id,p])=>p.qty<=2&&KB.byId[id]).map(([id])=>KB.byId[id].title);
  if(low.length)r.push('',`Low stock: ${low.join(', ')}`);
  const d24=S.doses.filter(x=>Date.now()-x.ts<864e5);
  if(d24.length)r.push('','Medicines given (24 h):',...d24.map(x=>` - ${hhmm(x.ts)} ${KB.byId[x.id]?KB.byId[x.id].title:x.id} ${x.mg} mg`));
  return r.join('\n');
}
function alertText(alerts){
  const td=today(), crit=critList();
  const parts=alerts.map(k=>IND[k].label+(has(td,k)?' '+fmtV(k,td[k]):''));
  return `${crit.length?'CRITICAL. ':''}${S.name||'Crew member'}: ${alerts.length} indicators at ACT NOW on mission day ${td.day}: ${parts.join('; ')}. Please come and check now.`;
}
function checkEscalation(){
  const alerts=alertList().sort();
  if(alerts.length>=2){
    const sig=alerts.join(',');
    if(sig!==S.escSig){S.escSig=sig;const m=sendMsg('alert',alertText(alerts));showEsc(m);}
  }else if(S.escSig){
    S.escSig='';
    sendMsg('update',`${S.name||'Crew member'}: fewer than 2 indicators at Act now after re-check. Values may have swung, so please confirm in person.`);
    toast('Update sent to crew leader');
  }
}
function showEsc(m){
  $('#escBody').innerHTML=`<p style="margin:0 0 10px">${esc(m.text)}</p>
   <div style="font-size:13px;color:#c8c8cc">Delivered on crew net to <b>${esc(m.to.join(', '))}</b><br>Copy to flight surgeon on Earth: ${esc(earthStatus(m).t)}</div>
   <p style="font-size:12px;color:var(--muted);margin:10px 0 0">Simulation. In a mission this would go over the habitat's crew comms network.</p>`;
  $('#escModal').classList.remove('hidden');
}
$('#escOk').onclick=()=>$('#escModal').classList.add('hidden');
$('#alertNowBtn').onclick=()=>{
  const a=alertList(), w=CORE.filter(k=>curStatus(k)==='watch');
  const txt=a.length?alertText(a):`${S.name||'Crew member'} requests a health check on mission day ${today().day}.${w.length?' On Watch: '+w.map(k=>IND[k].label).join(', ')+'.':''}`;
  const m=sendMsg('manual',txt);save();renderComms();showEsc(m);
};
function renderComms(){
  renderLink();
  const list=S.comms.slice(-6).reverse();
  const col={alert:'alert',manual:'watch',update:'ok',protocol:'watch',report:'none'}, lab={alert:'AUTO ALERT',manual:'MANUAL',update:'UPDATE',protocol:'PROTOCOL LOG',report:'STATUS REPORT'};
  $('#comms').innerHTML=list.length?list.map(m=>{const st=earthStatus(m);return `<div class="msg st-${col[m.kind]||'none'}"><div class="mh"><span style="color:var(--c);font-weight:600">${lab[m.kind]||'MESSAGE'}</span><span>Day ${m.day} · ${hhmm(m.ts)}</span></div>${esc(m.kind==='report'?m.text.split('\n').slice(4,6).join(' · '):m.text)}<div class="rc">Crew net: delivered to ${esc(m.to.join(', '))}${m.size?' · '+m.size+' bytes':''}</div><div class="st ${st.c}">${esc(st.t)}</div></div>`;}).join(''):`<div style="font-size:12px;color:var(--muted);margin-top:10px">No messages sent yet.</div>`;
}
setInterval(()=>{if(S.view==='dashboard'&&S.comms.some(m=>m.eta!==null&&(m.eta+link().sec*1000)>Date.now()))renderComms();},1000);
$('#reportBtn').onclick=()=>{const t=buildReport();const m=sendMsg('report',t);save();renderComms();toast(link().black?'Report queued until the link returns':'Report sent: '+m.size+' bytes, arrives in '+fmtDur(link().sec));};

// ---------- Routine & gamification ----------
const TASKS=[
  {nm:'Log sleep',k:'sleep',xp:10,when:'morning',done:e=>has(e,'sleep')},
  {nm:'Morning vitals (HR, BP, SpO₂, temp)',k:'hr',ks:['hr','bp','spo2','temp'],xp:25,when:'morning',done:e=>['hr','bp','spo2','temp'].every(k=>has(e,k))},
  {nm:'Fasting blood sugar',k:'glucose',xp:10,when:'morning',done:e=>has(e,'glucose')},
  {nm:'Exercise ≥ 90 min',k:'exercise',xp:30,when:'midday',done:e=>has(e,'exercise')&&e.exercise>=90},
  {nm:'Drink ≥ 2 L',k:'hydration',xp:10,when:'all day',done:e=>has(e,'hydration')&&e.hydration>=2},
  {nm:'Vision card + Amsler grid',k:'vision',xp:10,when:'evening',done:e=>has(e,'vision')},
  {nm:'Mood check-in',k:'mood',xp:10,when:'evening',done:e=>has(e,'mood')},
  {nm:'Read dosimeter',k:'dose',xp:10,when:'evening',done:e=>has(e,'dose')}
];
function dayXP(e){return TASKS.reduce((a,t)=>a+(t.done(e)?t.xp:0),0)+(TASKS.every(t=>t.done(e))?25:0);}
function streak(){let n=0;for(let i=S.days.length-1;i>=0;i--){const ok=TASKS.filter(t=>t.done(S.days[i])).length>=6;if(i===S.days.length-1&&!ok)continue;if(ok)n++;else break;}return n;}
function renderRoutine(){
  const e=today(), xp=S.days.reduce((a,d)=>a+dayXP(d),0), lvl=Math.floor(xp/400)+1, into=xp%400;
  $('#lvl').textContent='Level '+lvl;
  $('#xpfill').style.width=(into/400*100)+'%';
  $('#xptxt').textContent=`${xp} XP · ${400-into} to level ${lvl+1}`;
  const st=streak(); $('#streak').innerHTML=`${st}-day streak`;
  const hr=new Date().getHours(), phase=hr<11?'morning':hr<17?'midday':'evening';
  const next=TASKS.find(t=>!t.done(e)&&(t.when===phase||t.when==='all day'))||TASKS.find(t=>!t.done(e));
  $('#prompt').innerHTML=next?`<div class="prompt"><b>Up next (${phase}):</b> ${next.nm}. <a href="#log" data-goto="log">Log it →</a></div>`:`<div class="prompt"><b>All done for today.</b> Perfect-day bonus +25 XP.</div>`;
  // each task is a button: tapping it opens the log with that measurement focused (ticks fill in once the value is saved)
  $('#tasks').innerHTML=TASKS.map(t=>{const d=t.done(e),k=t.ks?(t.ks.find(x=>!has(e,x))||t.k):t.k;return `<button type="button" class="task ${d?'done':''}" data-task="${k}" aria-label="${t.nm}: ${d?'done, tap to edit':'not done, tap to log'}"><span class="box" aria-hidden="true">${d?'<svg class="i" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>':''}</span><span><span class="nm">${t.nm}</span><br><span class="when">${t.when}</span></span><span class="xp">+${t.xp}</span></button>`;}).join('');
  const perfect=S.days.filter(d=>TASKS.every(t=>t.done(d))).length, exDays=S.days.filter(d=>d.exercise>=90).length;
  const B=[['First log',xp>0],['7-day streak',st>=7],['21-day streak',st>=21],['Perfect day',perfect>=1],['10 perfect days',perfect>=10],['Iron crew (25 workout days)',exDays>=25],['Level 5',lvl>=5]];
  $('#badges').innerHTML=B.map(([n,g])=>`<span class="badge ${g?'got':''}">${g?'':''} ${n}</span>`).join('');
}
function renderRad(){
  const env=ENVS[S.env], cum=cumDose(), p=cum/CAREER_LIMIT, s=radStatus();
  const daysLeft=Math.max(0,Math.floor((CAREER_LIMIT-cum)/env.dose));
  $('#radbox').innerHTML=`<div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font-family:var(--mono);font-size:22px;font-weight:600">${cum.toFixed(1)}<small style="font-size:12px;color:var(--muted)"> / ${CAREER_LIMIT} mSv</small></span><span style="color:var(--${s});font-weight:600;font-size:12px">${STXT[s].toUpperCase()}</span></div>
  <div class="xpbar"><i style="width:${Math.min(100,p*100)}%;background:linear-gradient(90deg,var(--ok),var(--watch),var(--alert));background-size:${100/Math.max(Math.min(p,1),.01)}% 100%"></i></div>
  <div style="font-size:12.5px;color:#c8c8cc;line-height:1.5">${(p*100).toFixed(1)}% of the career limit. At the typical ${env.dose} mSv/day for <b>${env.name.toLowerCase()}</b>, about <b>${daysLeft.toLocaleString()}</b> more days remain.</div>`;
}

// ---------- Log form ----------
const FORM=[
  ['sleep','Sleep last night (h)'],['hr','Resting heart rate (bpm)'],['bp','Blood pressure (mmHg)'],['spo2','SpO₂ (%)'],
  ['temp','Body temperature (°C)'],['glucose','Fasting blood sugar (mg/dL)'],['exercise','Exercise today (min)'],['hydration','Fluid intake (L)'],
  ['mood','Mood (1–5)'],['dose','Dosimeter reading today (mSv)'],['mass','Body mass (kg) · weekly'],['vision','Vision check']
];
function renderForm(){
  const e=today(); $('#logDay').textContent='· mission day '+e.day;
  const f=$('#logForm'); f.innerHTML='';
  FORM.forEach(([k,lab])=>{
    const I=IND[k], d=document.createElement('div'); d.className='field'; d.dataset.k=k;
    let inp;
    if(k==='bp') inp=`<div class="row2"><input type="number" inputmode="numeric" id="f-bp" name="sys" placeholder="sys" aria-label="Systolic blood pressure" value="${has(e,'bp')?e.bp.sys:''}"><input type="number" inputmode="numeric" name="dia" placeholder="dia" aria-label="Diastolic blood pressure" value="${has(e,'bp')?e.bp.dia:''}"></div>`;
    else if(k==='mood') inp=`<select name="mood" id="f-mood"><option value="">—</option>${[5,4,3,2,1].map(v=>`<option value="${v}" ${e.mood===v?'selected':''}>${I.fmt(v)}</option>`).join('')}</select>`;
    else if(k==='vision') inp=`<select name="vision" id="f-vision"><option value="">—</option><option value="0" ${e.vision===false?'selected':''}>No change</option><option value="1" ${e.vision===true?'selected':''}>Something changed</option></select>`;
    else inp=`<input type="number" inputmode="decimal" id="f-${k}" name="${k}" step="${I.step}" value="${has(e,k)?e[k]:''}">`;
    const rng=I.band?`Nominal ${I.band[0]}–${I.band[1]} ${I.unit}`: k==='dose'?`Typical here ≈ ${ENVS[S.env].dose} mSv/day`: k==='mass'?`Baseline ${S.baseMass} kg`:'';
    d.innerHTML=`<label for="f-${k}">${lab}</label>${inp}<div class="hint">${rng}</div><div class="live"></div>`;
    f.appendChild(d);
  });
  f.oninput=liveCheck; liveCheck();
  $('#symBox').innerHTML=Object.keys(SYMPTOMS).map(s=>`<label><input type="checkbox" value="${s}" ${(e.symptoms||[]).includes(s)?'checked':''}>${s}</label>`).join('');
}
// returns {ok:{k:v}, bad:{k:msg}}
function readForm(){
  const f=$('#logForm'), ok={}, bad={};
  FORM.forEach(([k])=>{
    const I=IND[k];
    if(k==='bp'){
      const s=f.sys.value.trim(), d=f.dia.value.trim();
      if(s===''&&d==='')return;
      if(s===''||d===''){bad.bp='Enter both numbers';return;}
      const sv=+s, dv=+d;
      if(!isFinite(sv)||!isFinite(dv)||sv<0||sv>300||dv<0||dv>200){bad.bp='Not a valid reading (sys 0–300, dia 0–200)';return;}
      if(dv>=sv&&sv>0){bad.bp='Diastolic must be lower than systolic';return;}
      ok.bp={sys:Math.round(sv),dia:Math.round(dv)};return;
    }
    const el=f[k]; if(!el)return; const raw=String(el.value).trim(); if(raw==='')return;
    if(k==='vision'){ok.vision=raw==='1';return;}
    const v=+raw;
    if(!isFinite(v)){bad[k]='Not a number';return;}
    if(I.lim&&(v<I.lim[0]||v>I.lim[1])){bad[k]=`Not a valid reading (${I.lim[0]}–${I.lim[1]})`;return;}
    ok[k]=I.step>=1?Math.round(v):Math.round(v*100)/100;
  });
  return {ok,bad};
}
function liveCheck(){
  const {ok,bad}=readForm();
  document.querySelectorAll('#logForm .field').forEach(d=>{
    const k=d.dataset.k, el=d.querySelector('.live');
    d.classList.toggle('bad',!!bad[k]);
    if(bad[k]){el.style.setProperty('--c','var(--alert)');el.textContent='Invalid: '+bad[k];return;}
    if(ok[k]===undefined){el.textContent='';return;}
    const s=statusOf(k,ok[k]); el.style.setProperty('--c','var(--'+s+')');
    el.textContent=(isCrit(k,ok[k])?'Critical, check sensor':STXT[s]);
  });
}
function doSave(silent){
  const {ok,bad}=readForm(), td=today(), ts=Date.now();
  Object.keys(ok).forEach(k=>{
    const same=has(td,k)&&JSON.stringify(td[k])===JSON.stringify(ok[k]);
    td[k]=ok[k];
    if(!same)S.log.push({day:td.day,ts,k,v:ok[k]});
  });
  if(S.log.length>1500)S.log=S.log.slice(-1500);
  td.symptoms=[...document.querySelectorAll('#symBox input:checked')].map(i=>i.value);
  checkEscalation(); save(); renderAll(); liveCheck();
  if(silent)return;
  const nb=Object.keys(bad).length;
  if(nb)toast(`Saved. Skipped ${nb} invalid field${nb>1?'s':''} (marked in red).`);
  else if(critList().length)toast('Saved. Critical reading: see the banner');
  else if(alertList().length)toast('Saved. Check "What to do now" on the dashboard');
  else toast('Saved. +XP');
}
$('#saveBtn').onclick=e=>{e.preventDefault();doSave(false);};
$('#logForm').addEventListener('submit',e=>{e.preventDefault();doSave(false);});
$('#nextDayBtn').onclick=e=>{e.preventDefault();doSave(true);S.days.push({day:today().day+1,symptoms:[]});save();renderAll();renderForm();toast('Mission day '+today().day+' started');};
$('#resetBtn').onclick=e=>{e.preventDefault();const b=$('#resetBtn');if(b.dataset.c!=='1'){b.dataset.c='1';b.textContent='Tap again to confirm';setTimeout(()=>{b.dataset.c='';b.textContent='Reset demo data';},3000);return;}
  S=seedData(S.env);if(KB.ready)seedPharmacy();save();renderAll();renderForm();b.dataset.c='';b.textContent='Reset demo data';toast('Demo data restored');};
function fullJSON(){return JSON.stringify({crew:S.name,environment:ENVS[S.env].name,baselineMassKg:S.baseMass,cumulativeDoseMsv:+cumDose().toFixed(2),days:S.days,readingLog:S.log,crewMessages:S.comms,pharmacy:S.pharm,doseTable:S.formulary,dosesGiven:S.doses,errorLog:ERRS},null,1);}
function setExport(f){document.querySelectorAll('#mSeg button').forEach(b=>b.classList.toggle('on',b.dataset.f===f));$('#mText').value=f==='json'?fullJSON():buildReport();
  $('#mHint').textContent=f==='json'?'Complete record of every reading, message and stock level, for analysis tools.':'A short, readable report for the flight surgeon ('+new Blob([buildReport()]).size+' bytes, small enough for a weak deep-space link).';}
document.querySelectorAll('#mSeg button').forEach(b=>b.onclick=()=>setExport(b.dataset.f));
$('#exportBtn').onclick=e=>{e.preventDefault();setExport('report');$('#modal').classList.remove('hidden');$('#mClose').focus();};
$('#mClose').onclick=()=>$('#modal').classList.add('hidden');
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#modal').classList.add('hidden');$('#escModal').classList.add('hidden');}});
$('#mCopy').onclick=async()=>{try{await navigator.clipboard.writeText($('#mText').value);toast('Copied');}catch(err){$('#mText').select();toast('Select all and copy manually');}};

// ---------- Trends ----------
const TK=['bp','hr','spo2','temp','glucose','sleep','mood','exercise','hydration','mass','dose'];
function renderTsel(){
  $('#tsel').innerHTML=TK.map(k=>`<button data-k="${k}" class="${S.trend===k?'on':''}">${IND[k].label}</button>`).join('');
  document.querySelectorAll('#tsel button').forEach(b=>b.onclick=()=>{S.trend=b.dataset.k;save();drawTrend();});
  document.querySelectorAll('#seg button').forEach(b=>b.classList.toggle('on',b.dataset.r===S.range));
}
document.querySelectorAll('#seg button').forEach(b=>b.onclick=()=>{S.range=b.dataset.r;save();drawTrend();});
function trendPoints(k,range){
  if(range==='day'){
    const td=today(), yd=S.days.length>1?S.days[S.days.length-2]:null, P=[];
    if(yd&&has(yd,k))P.push({lab:'Yesterday',raw:yd[k]});
    const logs=S.log.filter(x=>x.day===td.day&&x.k===k);
    if(logs.length)logs.forEach(x=>P.push({lab:hhmm(x.ts),raw:x.v}));
    else if(has(td,k))P.push({lab:'D'+td.day,raw:td[k]});
    return P;
  }
  const n=range==='week'?7:30;
  let cum=0; const cumBy={}; S.days.forEach(e=>{cum+=has(e,'dose')?+e.dose:0;cumBy[e.day]=cum;});
  return S.days.slice(-n).map(e=>({lab:'D'+e.day,raw:has(e,k)?e[k]:null,cum:cumBy[e.day]}));
}
let pts=[];
function drawTrend(){
  renderTsel();
  const k=TK.includes(S.trend)?S.trend:'bp', I=IND[k], range=S.range, cv=$('#trend'), dpr=window.devicePixelRatio||1, W=cv.clientWidth, H=340;
  if(!W)return;
  cv.width=W*dpr;cv.height=H*dpr;const c=cv.getContext('2d');c.scale(dpr,dpr);c.clearRect(0,0,W,H);
  const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const L=46,R=14,T=14,B=30, pw=W-L-R, ph=H-T-B;
  const P=trendPoints(k,range), n=P.length;
  const vals=P.filter(p=>p.raw!==null).map(p=>num(k,p.raw)).concat(k==='bp'?P.filter(p=>p.raw!==null).map(p=>p.raw.dia):[]).filter(isFinite);
  pts=[];
  if(!vals.length){
    c.fillStyle=css('--muted');c.font='14px Space Grotesk';c.textAlign='center';c.fillText('No readings in this window yet',W/2,H/2);c.textAlign='left';
    $('#tstats').innerHTML='';$('#tnote').innerHTML=`<b>Why it moves in space:</b> ${I.why}`;return;
  }
  let lo,hi;
  if(I.yr){lo=Math.min(I.yr[0],...vals);hi=Math.max(I.yr[1],...vals);}else{lo=Math.min(...vals);hi=Math.max(...vals);const pad=(hi-lo)*.2||1;lo-=pad;hi+=pad;}
  if(k==='mass'){lo=Math.min(lo,S.baseMass*0.93);hi=Math.max(hi,S.baseMass*1.01);}
  if(k==='dose')lo=0;
  if(hi===lo)hi=lo+1;
  const X=i=>L+(n===1?pw/2:i/(n-1)*pw), Y=v=>T+ph-(v-lo)/(hi-lo)*ph;
  const band=(a,b,col)=>{c.fillStyle=col;const y1=Y(Math.min(hi,b)),y2=Y(Math.max(lo,a));if(y2>y1)c.fillRect(L,y1,pw,y2-y1);};
  if(I.band)band(I.band[0],I.band[1],'rgba(61,220,151,.08)');
  if(k==='mass'){band(S.baseMass*0.98,S.baseMass*1.01,'rgba(61,220,151,.08)');band(S.baseMass*0.95,S.baseMass*0.98,'rgba(255,166,61,.07)');}
  if(k==='bp')band(60,85,'rgba(61,220,151,.05)');
  c.strokeStyle='#232327';c.fillStyle=css('--muted');c.font='11px JetBrains Mono';c.lineWidth=1;
  for(let i=0;i<=5;i++){const v=lo+(hi-lo)*i/5,y=Y(v);c.beginPath();c.moveTo(L,y);c.lineTo(W-R,y);c.stroke();c.fillText((Math.abs(v)<10?v.toFixed(1):Math.round(v)),4,y+4);}
  const maxLabels=range==='day'?6:12, stepX=Math.max(1,Math.ceil(n/maxLabels));
  P.forEach((p,i)=>{if(i%stepX===0||i===n-1){const t=p.lab;const tw=c.measureText(t).width;c.fillText(t,Math.min(Math.max(X(i)-tw/2,L-10),W-R-tw),H-10);}});
  const line=(arr,col,w,dash)=>{c.strokeStyle=col;c.lineWidth=w;c.setLineDash(dash||[]);c.beginPath();let s=false;arr.forEach((v,i)=>{if(v===null||!isFinite(v))return;s?c.lineTo(X(i),Y(v)):c.moveTo(X(i),Y(v));s=true;});c.stroke();c.setLineDash([]);};
  line(P.map(p=>p.raw===null?null:num(k,p.raw)),'#d9d9dc',2);
  if(k==='bp')line(P.map(p=>p.raw===null?null:p.raw.dia),'#7a7a82',2,[5,4]);
  if(k==='dose'&&range!=='day'){
    const cs=P.map(p=>p.cum), mx=Math.max(...cs)||1;
    c.strokeStyle='rgba(245,179,1,.55)';c.lineWidth=1.5;c.setLineDash([4,4]);c.beginPath();cs.forEach((v,i)=>{const y=T+ph-v/mx*ph;i?c.lineTo(X(i),y):c.moveTo(X(i),y);});c.stroke();c.setLineDash([]);
    c.fillStyle='#f5b301';c.fillText('cumulative (scaled) '+mx.toFixed(1)+' mSv',Math.max(L,W-R-220),T+12);
  }
  P.forEach((p,i)=>{if(p.raw===null)return;const v=num(k,p.raw);if(!isFinite(v))return;const s=statusOf(k,p.raw);c.fillStyle=css('--'+s);c.beginPath();c.arc(X(i),Y(v),range==='day'?5:3.6,0,7);c.fill();pts.push({x:X(i),y:Y(v),lab:p.lab,t:fmtV(k,p.raw),s});});
  // stats
  const sv=P.filter(p=>p.raw!==null), nv=sv.map(p=>num(k,p.raw));
  const avg=nv.reduce((a,b)=>a+b,0)/nv.length;
  const fmt=v=>(k==='bp'||I.step>=1)?String(Math.round(v)):(+v).toFixed(I.step<0.1?2:1);
  const cnt=s=>sv.filter(p=>statusOf(k,p.raw)===s).length;
  const delta=nv[nv.length-1]-nv[0];
  const wl={day:'Today vs yesterday',week:'Last 7 days',month:'Last 30 days'}[range];
  $('#tstats').innerHTML=[
    ['Window',wl],
    ['Latest',esc(IND[k].fmt(sv[sv.length-1].raw))],
    ['Average',fmt(avg)],
    ['Min – max',fmt(Math.min(...nv))+' – '+fmt(Math.max(...nv))],
    ['Change',nv.length>1?(delta>=0?'+':'')+fmt(delta):'—'],
    ['Flagged (watch / act)',`<span style="color:var(--watch)">${cnt('watch')}</span> / <span style="color:var(--alert)">${cnt('alert')}</span>`],
    k==='dose'?['Cumulative',cumDose().toFixed(1)+' mSv']:['Readings',sv.length]
  ].map(([a,b])=>`<div class="stat"><div class="k">${a}</div><div class="n" style="${a==='Window'?'font-size:14px':''}">${b}</div></div>`).join('');
  const sh=shiftInfo(k);
  $('#tnote').innerHTML=`${range==='day'?'<b>Day view</b> shows every reading you saved today, so you can see swings within the day. ':''}${sh?`<span style="color:var(--watch)">${esc(sh.text)}</span><br>`:''}<b>Why it moves in space:</b> ${I.why}${k==='bp'?' Solid = systolic, dashed = diastolic.':''}${I.band||k==='mass'?' The green band is the nominal range; dot colours show each reading\'s status.':''}`;
}
$('#trend').addEventListener('mousemove',ev=>{const r=ev.target.getBoundingClientRect(),x=ev.clientX-r.left,y=ev.clientY-r.top;let b=null,bd=400;pts.forEach(p=>{const d=(p.x-x)**2+(p.y-y)**2;if(d<bd){bd=d;b=p;}});const t=$('#tip');if(b){t.style.display='block';t.style.left=Math.min(b.x+10,r.width-170)+'px';t.style.top=(b.y-34)+'px';t.innerHTML=`${esc(b.lab)}: ${esc(b.t)} <i class="dot st-${b.s}"></i>`;}else t.style.display='none';});
$('#trend').addEventListener('mouseleave',()=>$('#tip').style.display='none');
let rz;window.addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{if(S.view==='trends')drawTrend();renderVitals();},120);});

// ---------- Guide ----------
function renderGuide(){
  const rows=k=>{const I=IND[k];
    if(k==='bp')return '<tr><td><i class="dot st-ok"></i></td><td>sys 90–129 and dia &lt;85</td></tr><tr><td><i class="dot st-watch"></i></td><td>sys 130–159, dia 85–99, or sys 85–89</td></tr><tr><td><i class="dot st-alert"></i></td><td>≥160 / ≥100, or sys &lt;85</td></tr>';
    if(k==='mass')return '<tr><td><i class="dot st-ok"></i></td><td>within 2% of baseline</td></tr><tr><td><i class="dot st-watch"></i></td><td>2–5% loss</td></tr><tr><td><i class="dot st-alert"></i></td><td>&gt;5% loss</td></tr>';
    if(k==='dose')return `<tr><td><i class="dot st-ok"></i></td><td>≈ the usual rate here (${ENVS[S.env].dose} mSv/day)</td></tr><tr><td><i class="dot st-watch"></i></td><td>&gt;1.6× the usual rate, or &gt;50% of career limit used</td></tr><tr><td><i class="dot st-alert"></i></td><td>&gt;5× the usual rate (storm), or &gt;80% of limit used</td></tr>`;
    if(k==='vision')return '<tr><td><i class="dot st-ok"></i></td><td>no change</td></tr><tr><td><i class="dot st-watch"></i></td><td>any change: report it</td></tr>';
    const m={hr:['50–100','45–49 / 101–110','<45 / >110'],spo2:['95–100','92–94','<92'],temp:['36.1–37.5','35.5–36.0 / 37.6–38.0','<35.5 / >38.0'],glucose:['70–99','60–69 / 100–125','<60 / >125'],sleep:['≥7','5–6.9','<5 (or 3 nights <6)'],mood:['4–5','3','1–2 (or 2 days ≤2)'],exercise:['≥90','45–89','<45'],hydration:['≥2.0','1.5–1.9','<1.5']}[k];
    return `<tr><td><i class="dot st-ok"></i></td><td>${m[0]} ${I.unit}</td></tr><tr><td><i class="dot st-watch"></i></td><td>${m[1]}</td></tr><tr><td><i class="dot st-alert"></i></td><td>${m[2]}</td></tr>`;};
  const order=['hr','bp','spo2','temp','glucose','sleep','mood','exercise','hydration','mass','dose','vision'];
  $('#guideList').innerHTML=`<details class="gitem" open><summary>How Sonnenblume decides the status<span>logic</span></summary><div class="gb">
    <div><h3 class="gh">1 · Value</h3>Each reading is compared with its reference range: green Nominal, amber Watch, red Act now.</div>
    <div><h3 class="gh">2 · Sudden change</h3>A reading also goes on Watch if it jumps far from your usual, swings sharply between two saves in a day, or recovers from Act now within 24 h. Sudden swings aren't normal either.</div>
    <div><h3 class="gh">3 · Critical</h3>Readings outside a survivable or plausible range (e.g. SpO₂ &lt;85%, HR &lt;30) are marked Critical. Check the sensor first, then treat it as an emergency.</div>
    <div><h3 class="gh">4 · Crew alert</h3>2 or more indicators at Act now automatically alert the crew leader and medical officer. The flight surgeon on Earth gets a copy after the comms delay.</div></div></details>`+
  order.map(k=>{const I=IND[k];return `<details class="gitem"><summary>${I.label}<span>${I.unit||'yes/no'}</span></summary><div class="gb">
    <div><h3 class="gh">How to measure</h3>${I.how}</div><div><h3 class="gh">Why spaceflight changes it</h3>${I.why}</div>
    <div><h3 class="gh">Colour code</h3><table class="rng">${rows(k)}</table></div><div><h3 class="gh">If flagged</h3><ul style="margin:0;padding-left:18px">${I.act.map(a=>`<li>${a}</li>`).join('')}</ul></div></div></details>`;}).join('')+
  `<details class="gitem"><summary>When to involve the crew medical officer or flight surgeon<span>escalation</span></summary><div class="gb">
    <div><h3 class="gh">Act now (crew)</h3>Chest pain, fainting, SpO₂ &lt;92%, sudden vision loss, severe headache, confusion, fever &gt;39 °C, thoughts of self-harm. Use the onboard emergency protocol first. Earth can't respond faster than the comms delay.</div>
    <div><h3 class="gh">Same day (flight surgeon)</h3>Any red indicator that is still red after a re-check, a new symptom with an amber reading, or a dosimeter spike.</div>
    <div><h3 class="gh">Next private medical conference</h3>Amber trends over 3+ days: sleep, mood, BP creep, weight loss, missed exercise.</div>
    <div><h3 class="gh">Comms delay by location</h3>${Object.values(ENVS).map(e=>`${e.name}: ${e.delay}`).join('<br>')}</div></div></details>`;
}


// ---------- Knowledge base (Azure Cosmos DB, with bundled fallback) ----------
const KB={records:[],byId:{},source:'',ready:false,type:'protocol',q:'',sel:null,disclaimer:''};
const KBT={protocol:'Protocols',guide:'Procedure guides',medication:'Medications',shielding:'Radiation shielding',condition:'Conditions',countermeasure:'Countermeasures',radiation_event:'Solar events',dose_rate:'Dose rates',source:'Sources'};
const KBT1={protocol:'Protocol',guide:'Procedure guide',medication:'Medication',shielding:'Shielding material',condition:'Condition',countermeasure:'Countermeasure',radiation_event:'Solar event',dose_rate:'Dose rate',source:'Source'};
async function loadKB(){
  const idx=await fetch('data/index.json').then(r=>r.json()).catch(()=>null);
  if(idx)KB.disclaimer=idx.disclaimer||'';
  try{
    const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),4000);
    const r=await fetch('api/kb',{signal:ctl.signal});clearTimeout(t);
    if(r.ok){const j=await r.json();if(Array.isArray(j.records)&&j.records.length){KB.records=j.records.filter(x=>x&&typeof x.id==='string'&&typeof x.type==='string'&&typeof x.title==='string'&&x.data&&typeof x.data==='object');if(KB.records.length)KB.source='azure';}}
  }catch(e){}
  if(!KB.records.length&&idx){
    const parts=await Promise.all(idx.files.map(f=>fetch('data/'+f).then(r=>r.json()).catch(()=>({records:[]}))));
    KB.records=parts.flatMap(p=>Array.isArray(p&&p.records)?p.records:[]).filter(r=>r&&typeof r.id==='string'&&typeof r.type==='string'&&typeof r.title==='string'&&r.data&&typeof r.data==='object');KB.source='bundled';
  }
  KB.records.forEach(r=>KB.byId[r.id]=r);KB.ready=true;seedPharmacy();
  renderZone();renderActions();if(S.view==='library')renderLibrary();if(S.view==='pharmacy')renderPharmacy();
}
const kbFor=(type,pred)=>KB.records.filter(r=>r.type===type&&pred(r));
const kbLink=r=>`<button class="kbl" data-kb="${esc(r.id)}">${esc(r.title)}</button>`;
document.addEventListener('click',e=>{const b=e.target.closest('[data-kb]');if(!b)return;e.preventDefault();const r=KB.byId[b.dataset.kb];if(!r)return;KB.type=r.type;KB.sel=r.id;KB.q='';const q=$('#kbQ');if(q)q.value='';setView('library');renderLibrary();});
function kbMatches(r){
  if(!KB.q)return r.type===KB.type;
  const q=KB.q.toLowerCase();
  return [r.title,r.summary,(r.tags||[]).join(' '),JSON.stringify(r.data||{})].join(' ').toLowerCase().includes(q);
}
function renderLibrary(){
  if(!KB.ready){$('#kbList').innerHTML='<div class="libempty">Loading the library…</div>';return;}
  if(!KB.records.length){$('#kbList').innerHTML='<div class="libempty">The library could not be loaded. Connect to the internet once so it can be saved for offline use, then reload.</div>';$('#kbDetail').innerHTML='';$('#kbSrc').textContent='LIBRARY UNAVAILABLE';return;}
  const b=$('#kbSrc');b.textContent=KB.source==='azure'?'LIVE: AZURE COSMOS DB':'BUNDLED DATA · '+KB.records.length+' RECORDS';b.classList.toggle('az',KB.source==='azure');
  const counts={};KB.records.forEach(r=>counts[r.type]=(counts[r.type]||0)+1);
  $('#kbTypes').innerHTML=Object.keys(KBT).filter(t=>counts[t]).map(t=>`<button data-t="${t}" class="${!KB.q&&KB.type===t?'on':''}">${KBT[t]}<small>${counts[t]}</small></button>`).join('');
  document.querySelectorAll('#kbTypes button').forEach(x=>x.onclick=()=>{KB.type=x.dataset.t;KB.q='';$('#kbQ').value='';KB.sel=null;renderLibrary();});
  const list=KB.records.filter(kbMatches);
  if(!list.find(r=>r.id===KB.sel))KB.sel=list[0]?list[0].id:null;
  $('#kbList').innerHTML=list.length?list.map(r=>`<button class="libitem ${r.id===KB.sel?'on':''}" data-id="${esc(r.id)}"><div class="t">${esc(r.title)}</div><div class="m">${KB.q?KBT1[r.type]+' · ':''}${esc(r.type==='protocol'?r.data.severity+' · '+r.data.category:r.type==='medication'?r.data.drug_class:(r.tags||[])[0]||'')}</div></button>`).join(''):'<div class="libempty">No matches. Try another word.</div>';
  document.querySelectorAll('#kbList .libitem').forEach(x=>x.onclick=()=>{KB.sel=x.dataset.id;renderLibrary();});
  $('#kbDetail').innerHTML=KB.sel?kbDetail(KB.byId[KB.sel]):'';
  $('#kbNote').textContent=KB.disclaimer;
}
function kbDetail(r){
  const d=r.data||{}, L=(t,h)=>h?`<div class="lbl">${t}</div>${h}`:'', P=t=>t?`<p>${esc(t)}</p>`:'';
  const ind=(r.indicators||[]).filter(k=>IND[k]).map(k=>{const s=curStatus(k);return `<span class="chip" style="margin:3px 6px 3px 0;display:inline-flex"><i class="dot st-${s}"></i>${IND[k].label}: ${STXT[s]}</span>`;}).join('');
  let h=`<div class="kind">${KBT1[r.type]}</div><h3>${esc(r.title)}${r.type==='protocol'?`<span class="sev ${esc(d.severity)}">${esc(d.severity)}</span>`:''}</h3>`;
  if(r.type==='protocol'){
    h+=L('When to use',P(d.trigger))+L('Steps',`<ol>${d.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>`)+L('Escalate',P(d.escalate))+L('Note',P(d.comms_note));
    const meds=(d.medications||[]).map(id=>KB.byId[id]).filter(Boolean);
    h+=L('Medications in this protocol',meds.map(m=>{const ps=pharmStatus(m.id);return kbLink(m)+(ps?`<span class="stock pst ${ps.s}">${ps.qty} left${ps.s!=='ok'?' · '+esc(ps.t):''}</span> `:'');}).join(''));
    const gd=kbFor('guide',g=>(g.indicators||[]).some(k=>(r.indicators||[]).includes(k))).slice(0,3);
    if(gd.length)h+=L('How-to guides',gd.map(kbLink).join(''));
    h+=runnerHTML(r);
  }else if(r.type==='medication'){
    h+=`<table style="margin-top:10px"><tr><td>Class</td><td>${esc(d.drug_class)}</td></tr><tr><td>Form</td><td>${esc(d.form)}</td></tr><tr><td>Prescription</td><td>${d.prescription?'Yes, crew medical officer':'No'}</td></tr></table>`;
    h+=L('Used for',`<ul>${d.uses.map(u=>`<li>${esc(u)}</li>`).join('')}</ul>`)+L('In spaceflight',P(d.spaceflight_note))+L('Cautions',P(d.cautions))+L('Dosing',P(d.dosing));
    h+=doseHTML(r);
    const ps=pharmStatus(r.id);
    if(ps)h+=L('Onboard stock',`<p><b style="font-family:var(--mono)">${ps.qty}</b> left · expires ${esc(ps.exp)} · <span class="pst ${ps.s}">${esc(ps.t)}</span></p><p style="margin-top:8px"><button class="btn" data-use="${esc(r.id)}" ${ps.qty?'':'disabled'}>Record one dose used</button> <button class="btn" data-goto="pharmacy">Open pharmacy</button></p>`);
    const pr=kbFor('protocol',p=>(p.data.medications||[]).includes(r.id));
    h+=L('Used in protocols',pr.map(kbLink).join(''));
    const links=(d.links||[]).filter(x=>x&&typeof x.url==='string'&&/^https:\/\/(dailymed\.nlm\.nih\.gov|vsearch\.nlm\.nih\.gov|medlineplus\.gov)\//.test(x.url));
    if(links.length)h+=L('Official drug information',links.map(x=>`<a class="kbl" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.label)}</a>`).join(''));
  }else if(r.type==='shielding'){
    const f=v=>v===null||v===undefined?'—':v;
    h+=`<table style="margin-top:10px"><tr><td>Density</td><td>${d.density_g_cm3?d.density_g_cm3+' g/cm³':'—'}</td></tr><tr><td>Hydrogen by mass</td><td>${d.hydrogen_mass_pct!==null&&d.hydrogen_mass_pct!==undefined?d.hydrogen_mass_pct+'%':'—'}</td></tr><tr><td>Galactic cosmic rays</td><td>${esc(f(d.vs_galactic_cosmic_rays))}</td></tr><tr><td>Solar particle events</td><td>${esc(f(d.vs_solar_particle_events))}</td></tr><tr><td>Status</td><td>${esc(f(d.status))}</td></tr></table>`+L('Notes',P(d.notes));
    h+=L('Related',[KB.byId['prot-spe'],KB.byId['cm-storm-shelter']].filter(Boolean).map(kbLink).join(''));
  }else if(r.type==='guide'){
    h+=P(r.summary)+L('Steps',`<ol>${(d.steps||[]).map(s=>`<li>${esc(s)}</li>`).join('')}</ol>`)+((d.tips||[]).length?L('Good to know',`<ul>${d.tips.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`):'');
    const pr=kbFor('protocol',p=>(p.indicators||[]).some(k=>(r.indicators||[]).includes(k))).slice(0,5);
    h+=L('Related protocols',pr.map(kbLink).join(''));
  }else if(r.type==='condition'){
    h+=L('What happens',P(r.summary))+`<table style="margin-top:10px"><tr><td>System</td><td>${esc(d.system)}</td></tr><tr><td>Onset</td><td>${esc(d.onset)}</td></tr></table>`+L('Signs',P(d.signs))+L('Countermeasures',P(d.countermeasures));
    const pr=kbFor('protocol',p=>(p.indicators||[]).some(k=>(r.indicators||[]).includes(k))&&(p.zones||[]).some(z=>(r.zones||[]).includes(z))).slice(0,6);
    h+=L('Related protocols',pr.map(kbLink).join(''));
  }else if(r.type==='source'){
    h+=P(r.summary)+(d.url&&/^https:\/\//.test(d.url)?`<p style="margin-top:10px"><a href="${esc(d.url)}" target="_blank" rel="noopener">Open source</a></p>`:'<p style="margin-top:10px;color:var(--muted)">Search for the title to find it.</p>');
  }else{
    h+=P(r.summary)+(r.type==='radiation_event'?L('Date',P(d.date)):'')+(r.type==='dose_rate'?L('Source',P(d.source)):'')+(r.type==='countermeasure'?L('Purpose',P(d.purpose)):'');
  }
  if(ind)h+=L('Your related indicators now',ind);
  return h;
}
$('#kbQ').addEventListener('input',e=>{KB.q=e.target.value.trim();KB.sel=null;renderLibrary();});

// ---------- Onboard pharmacy (no resupply beyond LEO) ----------
function hashStr(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function addMonths(iso,m){const d=new Date(iso+'T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+m);return d.toISOString().slice(0,10);}
function addDays(iso,n){return new Date(Date.parse(iso+'T00:00:00Z')+n*864e5).toISOString().slice(0,10);}
function seedPharmacy(){
  KB.records.filter(r=>r.type==='medication').forEach(r=>{if(S.pharm[r.id])return;const h=hashStr(r.id);
    const shelf=[18,24,24,30,36,36,48,60][h%8];             // illustrative shelf life, months
    S.pharm[r.id]={qty:2+(h>>>3)%18, exp:addDays(addMonths(addMonths(S.missionStart,-3-(h>>>7)%9),shelf),(h>>>11)%28)};});
  save();
}
function missionEnd(){return addDays(S.missionStart,ENVS[S.env].days);}
function pharmStatus(id){const p=S.pharm[id];if(!p)return null;const todayIso=isoDay(Date.now()),end=missionEnd();
  if(p.exp<=todayIso)return {...p,s:'alert',t:'Expired'};
  if(p.qty===0)return {...p,s:'alert',t:'Out of stock'};
  if(p.exp<=end)return {...p,s:'watch',t:'Expires before mission end'};
  if(p.qty<=2)return {...p,s:'watch',t:'Low stock'};
  return {...p,s:'ok',t:'OK'};}
let phFilter='all';
function renderPharmacy(){
  if(!KB.ready){$('#phTable').innerHTML='<div class="libempty">Loading…</div>';return;}
  renderDoseTable();
  const meds=KB.records.filter(r=>r.type==='medication'), st=meds.map(m=>({m,p:pharmStatus(m.id)})).filter(x=>x.p);
  const c=f=>st.filter(f).length;
  $('#phMission').textContent=`MISSION ${S.missionStart} → ${missionEnd()} · ${ENVS[S.env].days} DAYS`;
  $('#phStats').innerHTML=[['Medicines',st.length,''],['Expire before mission end',c(x=>x.p.t==='Expires before mission end'),'watch'],['Expired or out of stock',c(x=>x.p.s==='alert'),'alert'],['Low stock (2 or fewer)',c(x=>x.p.qty<=2&&x.p.qty>0),'watch']]
    .map(([k,n,s])=>`<div><div class="n" style="${s&&n?'color:var(--'+s+')':''}">${n}</div><div class="k">${k}</div></div>`).join('');
  const F={all:['All',()=>true],expiring:['Expiring before end',x=>x.p.s!=='ok'&&x.p.t!=='Low stock'],low:['Low or out',x=>x.p.qty<=2],ok:['OK',x=>x.p.s==='ok']};
  $('#phFilter').innerHTML=Object.entries(F).map(([k,[n]])=>`<button data-f="${k}" class="${phFilter===k?'on':''}">${n}</button>`).join('');
  document.querySelectorAll('#phFilter button').forEach(b=>b.onclick=()=>{phFilter=b.dataset.f;renderPharmacy();});
  const rows=st.filter(F[phFilter][1]).sort((a,b)=>({alert:0,watch:1,ok:2}[a.p.s]-{alert:0,watch:1,ok:2}[b.p.s])||a.p.exp.localeCompare(b.p.exp));
  $('#phTable').innerHTML=`<div class="phrow h"><span>Medicine</span><span class="cls">Class</span><span>Stock</span><span>Expires</span><span>Status</span></div>`+
    (rows.length?rows.map(({m,p})=>`<div class="phrow"><button class="nm" data-kb="${esc(m.id)}">${esc(m.title)}</button><span class="cls" style="color:var(--muted);font-size:12.5px">${esc(m.data.drug_class)}</span><span class="qty"><button data-dq="${esc(m.id)}" data-d="-1" aria-label="Remove one ${esc(m.title)}">−</button><b>${p.qty}</b><button data-dq="${esc(m.id)}" data-d="1" aria-label="Add one ${esc(m.title)}">+</button></span><span style="font-family:var(--mono);font-size:12.5px">${esc(p.exp)}</span><span class="pst ${p.s}">${esc(p.t)}</span></div>`).join(''):'<div class="libempty">Nothing in this group.</div>');
}
document.addEventListener('click',e=>{
  const q=e.target.closest('[data-dq]');if(q){const p=S.pharm[q.dataset.dq];if(p){p.qty=Math.max(0,Math.min(999,p.qty+(+q.dataset.d)));save();renderPharmacy();}return;}
  const u=e.target.closest('[data-use]');if(u){const p=S.pharm[u.dataset.use];if(p&&p.qty>0){p.qty--;save();renderLibrary();toast(`Dose recorded. ${p.qty} left.`+(p.qty<=2?' Low stock.':''));}}
});

// ---------- Dose check: vital-sign safety gates + weight-based calculation ----------
const DCLS={
  opioid:['morphine','oxycodone','tramadol'],
  sedative:['morphine','oxycodone','tramadol','ketamine','midazolam','diazepam','lorazepam','zolpidem','zaleplon','promethazine','hydroxyzine','diphenhydramine','haloperidol','trazodone','cyclobenzaprine','prochlorperazine','dimenhydrinate','meclizine','scopolamine-dex','scopolamine-patch'],
  nsaid:['ibuprofen','naproxen','ketorolac','aspirin','diclofenac-gel'],
  lowersBP:['nitroglycerin','metoprolol','furosemide','tamsulosin','morphine','promethazine','trazodone','haloperidol'],
  slowsHR:['metoprolol','adenosine','amiodarone'],
  raisesBP:['midodrine','fludrocortisone','pseudoephedrine','epinephrine','modafinil'],
  raisesHR:['pseudoephedrine','albuterol','epinephrine','atropine','modafinil','ipratropium'],
  raisesGlucose:['prednisone','dexamethasone','glucagon','dextrose-50','glucose-gel'],
  lowersGlucose:['insulin-regular'],
  antipyretic:['acetaminophen','ibuprofen','naproxen','aspirin'],
  emergency:['epinephrine','naloxone','glucagon','dextrose-50','atropine','adenosine','amiodarone','tranexamic-acid']
};
const isC=(c,id)=>DCLS[c].includes(id.replace(/^med-/,''));
function vit(k){const l=latest(k);if(!l||today().day-l.day>(k==='mass'?8:1))return null;return {v:l.v,day:l.day,today:l.today};}
function doseCheck(id){
  const out={block:[],warn:[],ok:[]},m=id.replace(/^med-/,''),hr=vit('hr'),bp=vit('bp'),sp=vit('spo2'),gl=vit('glucose'),tp=vit('temp'),hy=vit('hydration'),ms=latest('mass');
  const B=t=>out.block.push(t),W=t=>out.warn.push(t),O=t=>out.ok.push(t);
  const sys=bp?bp.v.sys:null;
  if(!hr||!bp||!sp)W('Vital signs are missing or older than a day: measure heart rate, blood pressure and SpO₂ before giving any medicine.');
  if(isC('sedative',id)){if(sp&&sp.v<92)B(`SpO₂ ${sp.v}% is below 92%: sedating medicines can slow breathing further.`);else if(sp)O(`SpO₂ ${sp.v}%: breathing reserve OK.`);
    if(sys!==null&&sys<90)W(`Systolic BP ${sys} is low: sedatives can lower it more.`);W('Causes drowsiness: no EVA, vehicle operations or emergency duty until it wears off.');}
  if(isC('opioid',id)){if(hr&&hr.v<50)W(`Heart rate ${hr.v} is slow.`);if(pharmStatus('med-naloxone'))O('Naloxone is in the pharmacy if reversal is needed.');}
  if(m==='nitroglycerin'){if(sys===null)B('Blood pressure unknown: nitroglycerin needs a systolic reading above 100.');else if(sys<=100)B(`Systolic BP ${sys} is 100 or lower: nitroglycerin can cause collapse.`);else O(`Systolic BP ${sys} is above 100.`);}
  if(isC('slowsHR',id)){if(hr&&hr.v<60)B(`Heart rate ${hr.v} is below 60: this medicine slows the heart further.`);if(sys!==null&&sys<100)B(`Systolic BP ${sys} is below 100.`);}
  else if(isC('lowersBP',id)&&m!=='nitroglycerin'&&sys!==null&&sys<95)W(`Systolic BP ${sys} is low: this medicine can lower it further.`);
  if(isC('raisesBP',id)&&!isC('emergency',id)){if(sys!==null&&sys>=140)B(`Systolic BP ${sys} is 140 or higher: this medicine raises blood pressure.`);}
  if(isC('raisesHR',id)&&!isC('emergency',id)&&hr&&hr.v>100)W(`Heart rate ${hr.v} is already above 100.`);
  if(isC('nsaid',id)){if(hy&&hy.v<1.5)W(`Fluid intake ${hy.v} L is low: NSAIDs strain dehydrated kidneys. Drink first.`);
    if((today().symptoms||[]).includes('chest pain')&&m!=='aspirin')W('Chest pain reported: follow the chest-pain protocol instead.');
    const other=S.doses.filter(x=>Date.now()-x.ts<864e5&&x.id!==id&&isC('nsaid',x.id)&&x.id!=='med-aspirin');if(other.length)W('Another NSAID was given in the last 24 h: do not combine NSAIDs.');}
  if(isC('lowersGlucose',id)){if(!gl)B('Blood sugar unknown: measure before insulin.');else if(gl.v<150)B(`Blood sugar ${gl.v} mg/dL is not high enough for insulin.`);}
  if(isC('raisesGlucose',id)&&gl&&gl.v>180&&!['glucagon','dextrose-50','glucose-gel'].includes(m))W(`Blood sugar ${gl.v} mg/dL is already high: steroids raise it further.`);
  if(['glucose-gel','glucagon','dextrose-50'].includes(m)){if(gl&&gl.v>=70)W(`Blood sugar ${gl.v} mg/dL is not low: re-check before giving sugar.`);else if(gl)O(`Blood sugar ${gl.v} mg/dL is low: treatment indicated.`);}
  if(isC('antipyretic',id)&&tp)O(`Temperature ${(+tp.v).toFixed(1)} °C ${tp.v>38?'(fever)':''}.`);
  if(m==='acetaminophen'){const other=S.doses.filter(x=>Date.now()-x.ts<864e5&&x.id==='med-acetaminophen');if(other.length)O('Earlier acetaminophen doses are counted in the 24 h total below.');}
  if(isC('emergency',id)){out.block=out.block.filter(()=>false);W('Emergency medicine: do not delay it for missing vitals when the protocol calls for it.');}
  // pharmacy
  const ps=pharmStatus(id);
  if(ps){if(ps.qty===0)B('Out of stock.');else if(ps.t==='Expired')W('This stock is past its expiry date: see the "Using an expired medicine" protocol.');}
  // formulary + timing
  const f=S.formulary[id];let dose=null;
  if(f){
    if(f.perKg){if(!ms)B('Body mass unknown: weigh the crew member for a weight-based dose.');else{dose=f.mg*ms.v;O(`Weight-based: ${f.mg} mg/kg × ${(+ms.v).toFixed(1)} kg.`);}}
    else dose=f.mg;
    if(dose!==null&&f.maxSingle&&dose>f.maxSingle){dose=f.maxSingle;W(`Capped at the maximum single dose of ${f.maxSingle} mg.`);}
    const given=S.doses.filter(x=>x.id===id&&Date.now()-x.ts<864e5),tot=given.reduce((a,x)=>a+x.mg,0),last=given.length?given[given.length-1].ts:null;
    if(dose!==null){const left=f.maxDaily-tot;
      if(left<=0){B(`24-hour maximum of ${f.maxDaily} mg already reached (${tot} mg given).`);dose=0;}
      else if(dose>left){W(`Reduced to stay within the 24-hour maximum (${tot} of ${f.maxDaily} mg given).`);dose=left;}
      else O(`${tot} of ${f.maxDaily} mg given in the last 24 h.`);}
    if(last){const next=last+f.interval*3600e3;if(next>Date.now())B(`Too soon: last dose at ${hhmm(last)}; next allowed in ${fmtDur((next-Date.now())/1000)}.`);}
  }
  dose=dose!==null?Math.round(dose*10)/10:null;
  const status=out.block.length?'alert':out.warn.length?'watch':'ok';
  return {...out,dose,f,status};
}
function doseHTML(r){
  const c=doseCheck(r.id),L=(t,h)=>`<div class="lbl">${t}</div>${h}`;
  const head={ok:'Clear to give',watch:'Caution: check the notes',alert:'Do not give now'}[c.status];
  let h=`<div class="dosebox st-${c.status}"><div class="dh"><b style="color:var(--${c.status})">${head}</b>${c.status!=='alert'&&c.dose!==null&&c.dose>0?`<span class="dv">${c.dose} mg</span>`:''}</div>`;
  h+=c.f?`<div class="ds">${c.f.perKg?esc(c.f.mg)+' mg/kg':esc(c.f.mg)+' mg'} · every ${esc(c.f.interval)} h · max ${esc(c.f.maxDaily)} mg/24 h · source: ${esc(c.f.src||'flight surgeon')}</div>`:`<div class="ds">No dose on file. The flight surgeon enters it in Pharmacy → Dose table; the safety checks below still apply.</div>`;
  h+=[['alert',c.block],['watch',c.warn],['ok',c.ok]].map(([s,a])=>a.map(t=>`<div class="dr"><i class="dot st-${s}"></i><span>${esc(t)}</span></div>`).join('')).join('');
  h+=`<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn${c.status==='alert'?'':' pri'}" data-give="${esc(r.id)}" ${c.status==='alert'||!c.f||!c.dose?'disabled':''}>Record dose given${c.dose?' ('+c.dose+' mg)':''}</button><button class="btn" data-goto="pharmacy">Dose table</button></div>`;
  return L('Dose check (from current vital signs)',h+'</div>');
}
document.addEventListener('click',e=>{
  const g=e.target.closest('[data-give]');if(!g)return;const c=doseCheck(g.dataset.give);if(c.status==='alert'||!c.dose)return;
  S.doses.push({id:g.dataset.give,mg:c.dose,ts:Date.now(),day:today().day});if(S.doses.length>500)S.doses=S.doses.slice(-500);
  const p=S.pharm[g.dataset.give];if(p&&p.qty>0)p.qty--;save();renderLibrary();toast(`Recorded ${c.dose} mg at ${hhmm(Date.now())}.`);
});
function renderDoseTable(){
  const meds=KB.records.filter(r=>r.type==='medication').sort((a,b)=>a.title.localeCompare(b.title));
  const rows=Object.entries(S.formulary).filter(([id])=>KB.byId[id]).map(([id,f])=>`<div class="phrow"><button class="nm" data-kb="${esc(id)}">${esc(KB.byId[id].title)}</button><span class="cls" style="font-family:var(--mono);font-size:12.5px">${esc(f.mg)} ${f.perKg?'mg/kg':'mg'}${f.maxSingle?' (max '+esc(f.maxSingle)+' mg)':''}</span><span style="font-family:var(--mono);font-size:12.5px">every ${esc(f.interval)} h</span><span style="font-family:var(--mono);font-size:12.5px">${esc(f.maxDaily)} mg/24 h</span><span><button class="btn" style="padding:4px 9px;font-size:12px" data-fdel="${esc(id)}">Remove</button></span></div>`).join('');
  const d24=S.doses.filter(x=>Date.now()-x.ts<864e5).slice().reverse();
  $('#doseTable').innerHTML=`<div class="phrow h"><span>Medicine</span><span class="cls">Dose</span><span>Interval</span><span>24 h max</span><span></span></div>${rows||'<div class="libempty">No doses on file.</div>'}
  <div class="fadd"><select id="fMed" aria-label="Medicine">${meds.map(m=>`<option value="${esc(m.id)}">${esc(m.title)}</option>`).join('')}</select>
  <input id="fMg" type="number" step="any" min="0" placeholder="Dose" aria-label="Dose amount"><select id="fUnit" aria-label="Dose unit"><option value="mg">mg</option><option value="kg">mg/kg</option></select>
  <input id="fMax1" type="number" step="any" min="0" placeholder="Max single mg" aria-label="Maximum single dose in mg"><input id="fInt" type="number" step="any" min="0" placeholder="Every h" aria-label="Interval in hours"><input id="fMax" type="number" step="any" min="0" placeholder="Max mg/24 h" aria-label="Maximum per 24 hours in mg">
  <button class="btn pri" id="fAdd">Save</button></div>
  <div class="lbl" style="margin-top:14px">Doses given in the last 24 h</div>${d24.length?d24.map(x=>`<div class="dr"><span style="font-family:var(--mono)">${hhmm(x.ts)}</span><span>${esc(KB.byId[x.id]?KB.byId[x.id].title:x.id)} · ${esc(x.mg)} mg</span></div>`).join(''):'<div class="libempty" style="padding:8px 0">None.</div>'}`;
  $('#fAdd').onclick=()=>{const id=$('#fMed').value,mg=+$('#fMg').value,iv=+$('#fInt').value,mx=+$('#fMax').value,m1=+$('#fMax1').value;
    if(!(mg>0&&iv>=0.25&&mx>0)){toast('Enter dose, interval and 24 h maximum.');return;}
    S.formulary[id]={mg,perKg:$('#fUnit').value==='kg',interval:iv,maxDaily:mx,maxSingle:m1>0?m1:null,src:'Flight surgeon'};save();renderDoseTable();toast('Dose saved for '+KB.byId[id].title);};
}
document.addEventListener('click',e=>{const d=e.target.closest('[data-fdel]');if(d){delete S.formulary[d.dataset.fdel];save();renderDoseTable();}});

// ---------- Guided protocol runner (decision support without Earth) ----------
function runnerHTML(r){
  const run=S.run&&S.run.id===r.id?S.run:null, d=r.data;
  if(!run)return `<div style="margin-top:14px"><button class="btn pri" data-run="${esc(r.id)}">Start guided protocol</button> <span style="font-size:12px;color:var(--muted)">Timestamps each step and sends a log to the crew and Earth.</span></div>`;
  const done=run.steps.filter(Boolean).length, el=Math.round((Date.now()-run.start)/60000);
  return `<div class="runner"><div style="display:flex;justify-content:space-between;align-items:center"><b>Running · ${done}/${d.steps.length} steps · ${el} min</b><span><button class="btn" data-runend="send">Finish and send log</button> <button class="btn" data-runend="cancel">Cancel</button></span></div>`+
    d.steps.map((s,i)=>`<div class="step ${run.steps[i]?'done':''}"><button data-step="${i}" aria-label="Mark step ${i+1} done">${run.steps[i]?'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>':''}</button><span>${i+1}. ${esc(s)}</span><span class="ts">${run.steps[i]?hhmm(run.steps[i]):''}</span></div>`).join('')+`</div>`;
}
document.addEventListener('click',e=>{
  const s=e.target.closest('[data-run]');if(s){const p=KB.byId[s.dataset.run];if(!p)return;if(S.run&&S.run.id!==p.id&&!confirmSwap())return;S.run={id:p.id,start:Date.now(),steps:p.data.steps.map(()=>null)};save();renderLibrary();return;}
  const st=e.target.closest('[data-step]');if(st&&S.run){const i=+st.dataset.step;S.run.steps[i]=S.run.steps[i]?null:Date.now();save();renderLibrary();return;}
  const en=e.target.closest('[data-runend]');if(en&&S.run){const p=KB.byId[S.run.id];
    if(en.dataset.runend==='send'&&p){const lines=p.data.steps.map((x,i)=>`${S.run.steps[i]?hhmm(S.run.steps[i]):'--:--'} ${S.run.steps[i]?'DONE':'SKIPPED'} ${x}`);
      const m=sendMsg('protocol',`${S.name}: ${p.title} protocol, started ${hhmm(S.run.start)}.\n`+lines.join('\n'));toast('Protocol log sent. '+earthStatus(m).t);}
    S.run=null;save();renderLibrary();renderComms();}
});
let swapOk=false;function confirmSwap(){if(swapOk){swapOk=false;return true;}swapOk=true;toast('Another protocol is running. Tap Start again to replace it.');setTimeout(()=>swapOk=false,4000);return false;}

// ---------- Offline (deep space has no internet) ----------
function offlineTag(){const et=$('#engineTag');if(et)et.textContent='Status engine: '+ENGINE.name;const t=$('#offlineTag');if(!t)return;t.textContent=!navigator.onLine?'OFFLINE · WORKING FROM DEVICE':(navigator.serviceWorker&&navigator.serviceWorker.controller?'OFFLINE READY':'');}
window.addEventListener('online',offlineTag);window.addEventListener('offline',offlineTag);
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){
  const hadController=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(()=>navigator.serviceWorker.ready).then(offlineTag).catch(()=>{});
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!hadController)return;let u=document.getElementById('updBar');if(u)return;
    u=document.createElement('div');u.id='updBar';u.className='storebar';u.innerHTML='A new version of Sonnenblume is ready. <button class="btn" type="button" id="updReload">Reload</button>';document.body.insertBefore(u,document.body.firstChild);
    document.getElementById('updReload').onclick=()=>location.reload();});
}

renderHeader=guard('renderHeader',renderHeader);renderBanner=guard('renderBanner',renderBanner);renderBody=guard('renderBody',renderBody);renderZone=guard('renderZone',renderZone);renderVitals=guard('renderVitals',renderVitals);renderActions=guard('renderActions',renderActions);renderComms=guard('renderComms',renderComms);renderRoutine=guard('renderRoutine',renderRoutine);renderRad=guard('renderRad',renderRad);renderGuide=guard('renderGuide',renderGuide);drawTrend=guard('drawTrend',drawTrend);renderForm=guard('renderForm',renderForm);renderLibrary=guard('renderLibrary',renderLibrary);renderPharmacy=guard('renderPharmacy',renderPharmacy);renderDoseTable=guard('renderDoseTable',renderDoseTable);checkEscalation=guard('checkEscalation',checkEscalation);doSave=guard('doSave',doSave);seedPharmacy=guard('seedPharmacy',seedPharmacy);
document.addEventListener('click',e=>{const b=e.target.closest('[data-fault]');if(!b)return;const a=b.dataset.fault,bar=document.getElementById('faultBar');
  if(a==='reload')location.reload();
  else if(a==='copy'){const t=JSON.stringify({version:'sonnenblume',userAgent:navigator.userAgent,errors:ERRS},null,1);(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast('Error report copied')).catch(()=>toast('Could not copy; use Export data'));}
  else if(bar)bar.remove();});
// another tab changed the data: reload it here instead of overwriting it
(function(){const btn=$('#bodyBig'),wrap=document.querySelector('.bodywrap');if(!btn||!wrap)return;
  const home=document.createComment('bodywrap');wrap.parentNode.insertBefore(home,wrap);
  const set=on=>{if(on)document.body.appendChild(wrap);else home.parentNode.insertBefore(wrap,home.nextSibling);wrap.classList.toggle('big',on);document.body.classList.toggle('noscroll',on);btn.setAttribute('aria-pressed',on);btn.textContent=on?'Close':'Enlarge';
    if(on){const c=document.createElement('button');c.className='btn bigclose';c.type='button';c.textContent='Close';c.onclick=()=>set(false);wrap.appendChild(c);c.focus();}else{const c=wrap.querySelector('.bigclose');if(c)c.remove();btn.focus();}};
  btn.onclick=()=>set(!wrap.classList.contains('big'));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&wrap.classList.contains('big'))set(false);});})();
window.addEventListener('storage',e=>{if(e.key!==KEY||!e.newValue)return;try{S=sanitize(JSON.parse(e.newValue));renderAll();checkEscalation();if(S.view==='log')renderForm();toast('Updated from another tab');}catch(err){fault('sync',err);}});
// ---------- "I feel unwell": symptom-first triage into protocols ----------
const TRIAGE=[
  ['Chest pain or pressure','prot-chest-pain',3,'chest pain'],['Hard to breathe','prot-low-spo2',3,'shortness of breath'],['Fainted or nearly fainted','prot-syncope',2],
  ['Sudden severe headache','prot-stroke',3,'headache'],['Face drooping, weak arm or slurred speech','prot-stroke',3],['Sudden loss of vision','prot-vision-loss',3],
  ['Seizure or jerking','prot-seizure',3],['Swollen lips or throat, hives','prot-anaphylaxis',3],['Heavy bleeding','prot-hemorrhage',3],
  ['Fever or chills','prot-fever',2],['Cough with fever','prot-pneumonia',2,'sore throat'],['Vomiting or cannot keep fluids down','prot-dehydration',2,'nausea'],
  ['Severe belly pain','prot-abdominal-pain',2],['Flank pain or blood in urine','prot-kidney-stone',2],['Burning when urinating','prot-uti',1],
  ['Headache','prot-headache',1,'headache'],['Blurred near vision','prot-vision-change',1,'vision blur'],['Something in my eye','prot-eye-foreign-body',1],
  ['Dizzy or spinning','prot-vertigo',1],['Back pain','prot-back-pain',1,'back pain'],['Rash or itching','prot-rash',1,'skin rash'],
  ['Toothache','prot-dental-abscess',1],['Racing or irregular heartbeat','prot-palpitations',2],['Anxious or panicky','prot-panic',1],
  ['Low mood for a long time','prot-low-mood',1],['Can not sleep','prot-insomnia',1],['Thoughts of harming myself','prot-behavioural-crisis',3],
  ['Burn','prot-burn',1],['Possible broken bone','prot-fracture',2],['Hit my head','prot-head-injury',2]
];
const URG={3:['alert','Act now','Start this protocol now and alert your crew medical officer.'],2:['watch','Same day','Follow the protocol and contact the flight surgeon at the next contact.'],1:['ok','Self-care','Follow the protocol; mention it at your next medical conference.']};
function renderUnwell(){
  $('#unwellList').innerHTML=TRIAGE.map((t,i)=>`<label class="uw"><input type="checkbox" value="${i}"><span>${esc(t[0])}</span></label>`).join('');
  $('#unwellResult').innerHTML='';
  $('#unwellList').onchange=()=>{
    const picked=[...document.querySelectorAll('#unwellList input:checked')].map(x=>TRIAGE[+x.value]);
    if(!picked.length){$('#unwellResult').innerHTML='';return;}
    const top=Math.max(...picked.map(p=>p[2])),[st,lab,msg]=URG[top];
    const seen=new Set(),prots=picked.sort((a,b)=>b[2]-a[2]).map(p=>KB.byId[p[1]]).filter(p=>p&&!seen.has(p.id)&&seen.add(p.id));
    $('#unwellResult').innerHTML=`<div class="banner st-${st}" style="margin-top:12px"><div><b>${lab}</b><span>${msg}${link().independent?' Earth is far away: the onboard protocol comes first.':''}</span></div></div>
      <div class="lbl" style="font-family:var(--mono);font-size:10.5px;letter-spacing:.8px;color:var(--muted);margin:10px 0 6px">OPEN THE PROTOCOL</div>${prots.map(kbLink).join('')}
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="button" id="uwLog">Add these symptoms to today</button>${top===3?'<button class="btn red" type="button" id="uwAlert">Alert crew now</button>':''}</div>`;
    $('#uwLog').onclick=()=>{const td=today();picked.forEach(p=>{if(p[3]&&!td.symptoms.includes(p[3]))td.symptoms.push(p[3]);});save();renderAll();toast('Symptoms added to today');};
    const a=$('#uwAlert');if(a)a.onclick=()=>{const m=sendMsg('manual',`${S.name||'Crew member'} reports: ${picked.map(p=>p[0]).join(', ')}. Needs assessment now.`);save();renderComms();$('#unwellModal').classList.add('hidden');showEsc(m);};
  };
}
$('#unwellBtn').onclick=()=>{renderUnwell();$('#unwellModal').classList.remove('hidden');$('#unwellClose').focus();};
$('#unwellClose').onclick=()=>$('#unwellModal').classList.add('hidden');
document.addEventListener('click',e=>{if(e.target.closest('#unwellResult [data-kb]'))$('#unwellModal').classList.add('hidden');});
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#unwellModal').classList.add('hidden');});

// ---------- Space weather (NASA DONKI via /api/spaceweather) ----------
const SWX={data:null,error:false};
async function loadSWX(){
  try{const c=sessionStorage.getItem('swx');if(c){const j=JSON.parse(c);if(j&&Date.now()-j.t<30*60e3){SWX.data=j.d;renderSWX();return;}}}catch(e){}
  try{const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),10000);const r=await fetch('api/spaceweather',{signal:ctl.signal});clearTimeout(t);
    if(!r.ok)throw new Error('http '+r.status);const j=await r.json();if(!j||!Array.isArray(j.flares))throw new Error('bad data');
    SWX.data=j;SWX.error=false;try{sessionStorage.setItem('swx',JSON.stringify({t:Date.now(),d:j}));}catch(e){}
  }catch(e){SWX.error=true;}
  renderSWX();
}
function renderSWX(){
  const el=$('#swx');if(!el)return;const d=SWX.data;
  if(!d){el.innerHTML=`<div style="font-size:12.5px;color:var(--muted)">${navigator.onLine?'Live space weather is unavailable right now.':'Offline: live space weather needs a connection.'} Check your dosimeter for sudden jumps.</div>`;return;}
  const now=Date.now(),age=t=>(now-Date.parse(t))/36e5,within=(t,h)=>Number.isFinite(age(t))&&age(t)<=h;
  const big=d.flares.filter(f=>/^X/i.test(f.cls)),mid=d.flares.filter(f=>/^M/i.test(f.cls));
  const sep48=d.particles.filter(p=>within(p.time,72)),x48=big.filter(f=>within(f.peak,48)),m48=mid.filter(f=>within(f.peak,48));
  const kp=d.storms.reduce((a,g)=>Math.max(a,g.kp||0),0),lastStorm=d.storms[d.storms.length-1];
  const st=sep48.length||x48.length?'alert':m48.length?'watch':'ok';
  SWX.status=st;
  const msg=st==='alert'?'Recent solar particle event or X-class flare. Review the storm shelter guide and limit EVA.':st==='watch'?'M-class flare in the last 48 h. Watch your dosimeter.':'No major solar activity in the last 48 h.';
  const fmt=t=>{const x=Date.parse(t);return Number.isFinite(x)?new Date(x).toISOString().slice(0,16).replace('T',' ')+' UTC':'–';};
  el.innerHTML=`<div class="swx-st"><i class="dot st-${st}"></i><b style="color:var(--${st})">${STXT[st]}</b><span>${esc(msg)}</span></div>
   <div class="swx-grid"><div><b>${d.flares.length}</b><span>flares (30 days)<br>${big.length} X · ${mid.length} M</span></div><div><b>${d.particles.length}</b><span>solar particle events</span></div><div><b>${kp?kp.toFixed(0):'0'}</b><span>max Kp storm index</span></div></div>
   ${lastStorm?`<div style="font-size:12px;color:var(--muted);margin-top:6px">Latest geomagnetic storm: ${esc(fmt(lastStorm.start))}, Kp ${esc(String(lastStorm.kp))}</div>`:''}
   <div style="margin-top:8px">${[KB.byId['guide-storm-shelter'],KB.byId['prot-spe']].filter(Boolean).map(kbLink).join('')}</div>
   <div style="font-size:11px;color:var(--muted);margin-top:6px">Source: ${esc(d.source)} · updated ${esc(fmt(d.fetched))}${d.feeds&&!(d.feeds.flares&&d.feeds.particles&&d.feeds.storms)?' · some feeds unavailable':''}</div>`;
}

// ---------- Backup file: download and restore ----------
$('#backupBtn').onclick=()=>{try{const blob=new Blob([JSON.stringify({app:'sonnenblume',version:1,saved:new Date().toISOString(),state:S})],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='sonnenblume-backup-'+isoDay(Date.now())+'.json';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);toast('Backup downloaded');}catch(e){fault('backup',e);}};
$('#restoreFile').onchange=e=>{const f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;
  if(f.size>5e6){toast('That file is too large to be a Sonnenblume backup');return;}
  const rd=new FileReader();rd.onload=()=>{try{const j=JSON.parse(rd.result);if(!j||j.app!=='sonnenblume'||!j.state||typeof j.state!=='object')throw new Error('not a backup');
      const next=sanitize(j.state);if(!next.days||!next.days.length)throw new Error('empty');
      S=next;if(KB.ready)seedPharmacy();save();renderAll();renderForm();toast('Backup restored: '+S.days.length+' mission days');}
    catch(err){toast('That file is not a valid Sonnenblume backup');}};rd.readAsText(f);};

function renderAll(){renderHeader();renderBanner();renderBody();renderZone();renderVitals();renderActions();renderComms();renderRoutine();renderRad();renderGuide();if(S.view==='trends')drawTrend();if(S.view==='pharmacy')renderPharmacy();if(S.view==='library'&&KB.ready)renderLibrary();offlineTag();}
storageNotice();
renderAll();
checkEscalation();save();renderComms();   // readings that arrived without a save (sync, restore) still trigger the crew alert
const h0=location.hash.slice(1);
setView(VIEWS.includes(h0)?h0:(S.view||'dashboard'));
loadKB().then(()=>loadSWX());
loadRust().then(ok=>{if(ok)renderAll();else offlineTag();});

// ---------- Module API for add-ons (read-mostly; modules keep their own validated storage) ----------
window.SB=Object.freeze({
  onView:(v,f)=>{if(VIEWS.includes(v)&&typeof f==='function'){(VIEW_HOOKS[v]=VIEW_HOOKS[v]||[]).push(f);if(S.view===v)try{f();}catch(e){}}},
  state:()=>S, today:()=>today(), latest:k=>latest(k), status:k=>curStatus(k), statusOf:(k,v)=>statusOf(k,v), zoneStatus:z=>zoneStatus(z),
  IND, CORE:CORE.slice(), ZONES, ENVS, STXT, CAREER_LIMIT, cumDose:()=>cumDose(), link:()=>link(), radStatus:()=>radStatus(),
  esc, toast:t=>toast(t), fmtV:(k,v)=>fmtV(k,v), fmtDur:x=>fmtDur(x), setView:v=>setView(v),
  sendMsg:(kind,text)=>{const m=sendMsg(LISTS.kind.includes(kind)?kind:'manual',String(text));save();renderComms();return m;},
  report:()=>buildReport(), kb:()=>KB, engine:()=>ENGINE.name, refresh:()=>renderAll(),
  swx:()=>({status:SWX.status||'none',data:SWX.data}), doses:()=>S.doses.slice(), medClass:(c,id)=>!!(DCLS[c]&&isC(c,id))
});
document.dispatchEvent(new Event('sb:ready'));
})();
