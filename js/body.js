// ---------- Anatomical body: skeleton, organs, arteries, veins, nerves, lymph, muscles ----------
// Original procedural SVG (no image assets). viewBox 0 0 880 980, figure centred on x = 440, arms out.
// Contract with app.js: zones via data-z + zz-<zone> classes, layer groups L-sk/L-ml/L-mt/L-bp/L-ba/L-sd/L-o/L-v/L-nv/L-ly.
function buildBody(rng){
  const R=rng(1977), r2=n=>Math.round(n*10)/10, K=0.5523, CX=440;
  const P=(x,y)=>r2(x)+','+r2(y);
  const M=([x,y])=>[2*CX-x,y];                                   // mirror a point to the body's left side
  const MP=pts=>pts.map(M);
  const mirD=d=>d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g,(m,x,y)=>r2(2*CX-parseFloat(x))+','+y);
  const both=(d,f)=>{f(d);f(mirD(d));};
  const ell=(cx,cy,rx,ry,rot)=>{const a=(rot||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),q=(x,y)=>P(cx+x*c-y*s,cy+x*s+y*c);
    return `M${q(rx,0)} C${q(rx,ry*K)} ${q(rx*K,ry)} ${q(0,ry)} C${q(-rx*K,ry)} ${q(-rx,ry*K)} ${q(-rx,0)} C${q(-rx,-ry*K)} ${q(-rx*K,-ry)} ${q(0,-ry)} C${q(rx*K,-ry)} ${q(rx,-ry*K)} ${q(rx,0)} Z`;};
  const smooth=(pts,closed)=>{const n=pts.length,g=i=>closed?pts[(i+n)%n]:pts[Math.max(0,Math.min(n-1,i))];
    let d=`M${P(pts[0][0],pts[0][1])}`;const m=closed?n:n-1;
    for(let i=0;i<m;i++){const p0=g(i-1),p1=g(i),p2=g(i+1),p3=g(i+2);
      d+=` C${P(p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6)} ${P(p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6)} ${P(p2[0],p2[1])}`;}
    return d+(closed?' Z':'');};
  // dense samples along a Catmull-Rom curve (for haustra, branching)
  const sample=(pts,step)=>{const out=[];const g=i=>pts[Math.max(0,Math.min(pts.length-1,i))];
    for(let i=0;i<pts.length-1;i++){const p0=g(i-1),p1=g(i),p2=g(i+1),p3=g(i+2),len=Math.hypot(p2[0]-p1[0],p2[1]-p1[1]),n=Math.max(1,Math.round(len/step));
      for(let k=0;k<n;k++){const t=k/n,t2=t*t,t3=t2*t,f=(a,b,c,d)=>.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3);out.push([f(p0[0],p1[0],p2[0],p3[0]),f(p0[1],p1[1],p2[1],p3[1])]);}}
    out.push(pts[pts.length-1]);return out;};
  const lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  const unit=(a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;return [dx/l,dy/l];};
  const off=(p,n,s)=>[p[0]+n[0]*s,p[1]+n[1]*s];

  const lay={};const add=(l,s)=>(lay[l]=lay[l]||[]).push(s);
  // filled structure: halo (status glow) + fill + volume shading + specular + outline
  const organ=(z,l,d,nat,o)=>{o=o||{};add(l,`<path class="zz-${z} halo" d="${d}"/>`);
    add(l,`<path class="zz-${z} fn" data-z="${z}" style="--nat:${nat}${o.op?';opacity:'+o.op:''}" d="${d}"/>`);
    if(o.pat)add(l,`<path class="pat" style="fill:url(#${o.pat})" d="${d}"/>`);
    if(o.shade!==false){add(l,`<path class="shd" d="${d}"/>`);add(l,`<path class="spec" d="${d}"/>`);}
    add(l,`<path class="zz-${z} out" d="${d}"/>`);};
  // tubular structure with cylindrical shading (dark rim, body, highlight)
  const tube=(z,l,d,nat,w,o)=>{o=o||{};if(!o.nohalo)add(l,`<path class="zz-${z} halo" style="stroke-width:${r2(w+5)}" d="${d}"/>`);
    add(l,`<path class="deco" style="stroke:${o.under||'rgba(0,0,0,.45)'};stroke-width:${r2(w+1.6)}" d="${d}"/>`);
    add(l,`<path class="zz-${z} sn" data-z="${z}" style="--nat:${nat};stroke-width:${w}" d="${d}"/>`);
    if(o.dash)add(l,`<path class="deco" style="stroke:${o.dash[0]};stroke-width:${w};stroke-dasharray:${o.dash[1]}" d="${d}"/>`);
    add(l,`<path class="deco" style="stroke:${o.hi||'#fff'};stroke-width:${r2(Math.max(.35,w*.3))};stroke-opacity:${o.hiop||.32}" d="${d}"/>`);};
  const ln=(l,d,c,w,x)=>add(l,`<path class="deco" style="stroke:${c};stroke-width:${w}${x?';'+x:''}" d="${d}"/>`);
  const fl=(l,d,c,op)=>add(l,`<path class="decof" style="fill:${c}${op!=null?';opacity:'+op:''}" d="${d}"/>`);

  // ---------------- Key joints (body's right = viewer's left) ----------------
  const SH=[338,214], EL=[210,292], WR=[96,360], FT=[30,398];
  const HIP=[398,566], KN=[392,748], AN=[388,912];
  const armDir=unit(EL,WR), armN=[-armDir[1],armDir[0]];        // along forearm, and its perpendicular (towards the top edge)

  // ================= SKIN =================
  const half=[
    [440,16],[416,20],[400,32],[391,52],[388,76],[390,100],[395,118],[403,134],[414,148],[426,157],[424,172],[406,184],[376,194],[348,202],
    [322,216],[290,236],[252,256],[214,276],[176,300],[140,322],[104,341],[84,350],[62,360],[42,370],[26,386],[22,398],[34,402],[52,394],[70,388],
    [92,382],[110,374],[146,354],[184,330],[220,312],[258,294],[300,276],[336,262],
    [346,300],[352,350],[362,404],[368,446],[360,486],[352,524],[352,566],[356,610],[362,660],[366,704],[368,744],
    [362,790],[364,840],[372,890],[376,916],[364,936],[352,954],[364,962],[400,962],[408,948],[404,920],
    [408,880],[414,830],[420,780],[422,740],[426,690],[430,640],[436,612],[440,606]];
  const SKIN=smooth(half.concat(half.slice(1,-1).reverse().map(M)),true);
  add('sk',`<path class="skin" style="fill:url(#skinG)" d="${SKIN}"/>`);
  add('sk',`<path class="skin" style="fill:url(#skinShade)" d="${SKIN}"/>`);
  add('sk',`<path class="skin" style="fill:none;stroke:#f2c9bb;stroke-opacity:.5;stroke-width:1.3" d="${SKIN}"/>`);
  both(ell(389,86,6,13,8),d=>fl('sk',d,'#c0806c',.5));                                       // ears

  // ================= FACE + EYES =================
  both(smooth([[420,62],[428,58],[437,60]]),d=>ln('sd',d,'#6b3529',1.5,'stroke-opacity:.55'));            // brows
  ln('sd',smooth([[440,74],[437,92],[432,102],[440,106],[448,102],[443,92]]),'#8d4a3c',1,'stroke-opacity:.5');
  ln('sd',smooth([[427,120],[434,123],[440,122],[446,123],[453,120]]),'#7b3a30',1.4,'stroke-opacity:.65');
  both(ell(421,84,9,5.6),d=>organ('eyes','sd',d,'#f1ece6',{shade:false}));
  both(ell(421,84,3.8,3.8),d=>fl('sd',d,'#3d6f8f'));both(ell(421,84,1.7,1.7),d=>fl('sd',d,'#0b0b0b'));both(ell(419.6,82.6,1,1),d=>fl('sd',d,'#fff',.9));
  both(ell(398,300,3,2.6),d=>fl('sd',d,'#9a5547',.4));fl('sd',ell(440,470,3,4.4),'#7b3a30',.45);

  // ================= MUSCLES (zone: muscles) =================
  const mus=(d,pat,c)=>organ('muscles','ml',d,c||'#b04f42',{pat:pat||'fibR',op:.9});
  mus(smooth([[440,24],[414,30],[402,48],[440,58],[478,48],[466,30]],true),'fibV','#b9604f');                              // frontalis
  both(smooth([[398,56],[392,80],[398,104],[406,96],[408,70]],true),d=>mus(d,'fibV'));                                      // temporalis
  both(smooth([[402,108],[404,132],[418,148],[420,128],[412,112]],true),d=>mus(d,'fibV'));                                  // masseter
  both(smooth([[424,150],[416,170],[410,196],[418,200],[428,176]],true),d=>mus(d,'fibL'));                                  // sternocleidomastoid
  both(smooth([[426,170],[402,184],[370,196],[392,202],[420,196]],true),d=>mus(d));                                         // trapezius
  both(smooth([[346,206],[322,216],[302,236],[300,262],[318,272],[338,262],[350,236]],true),d=>mus(d));                     // deltoid
  both(smooth([[438,226],[400,222],[366,232],[350,256],[356,290],[384,306],[420,304],[438,292]],true),d=>mus(d,'fibL'));   // pectoralis major
  [0,1,2,3].forEach(i=>both(smooth([[352,312+i*20],[344,322+i*20],[356,330+i*20],[366,320+i*20]],true),d=>mus(d,'fibR')));  // serratus anterior
  [0,1,2].forEach(i=>both(smooth([[438,332+i*40],[416,330+i*40],[410,350+i*40],[416,366+i*40],[438,368+i*40]],true),d=>mus(d,'fibV')));  // rectus abdominis
  both(smooth([[438,456],[418,456],[414,490],[424,540],[438,560]],true),d=>mus(d,'fibV'));
  both(smooth([[364,330],[350,380],[358,440],[384,476],[404,456],[400,382],[384,330]],true),d=>mus(d));                     // external oblique
  const limbM=(a,b,w0,w1,pat,c)=>{const n=[-unit(a,b)[1],unit(a,b)[0]];both(smooth([off(a,n,w0/2),off(lerp(a,b,.5),n,(w0+w1)/3.2),off(b,n,w1/2),lerp(b,lerp(a,b,.97),0),off(b,n,-w1/2),off(lerp(a,b,.5),n,-(w0+w1)/3.2),off(a,n,-w0/2)],true),d=>mus(d,pat,c));};
  limbM(lerp(SH,EL,.25),lerp(SH,EL,.92),30,20,'fibL');                                                                     // biceps
  limbM(lerp(SH,EL,.4),lerp(SH,EL,1.02),18,16,'fibR','#a34638');                                                           // brachialis
  limbM(lerp(EL,WR,-.02),lerp(EL,WR,.7),26,13,'fibR');                                                                     // forearm flexors / brachioradialis
  limbM([408,586],[398,732],56,34,'fibV');                                                                                 // rectus femoris + vastus
  limbM([384,600],[372,724],30,24,'fibR','#a34638');                                                                       // vastus lateralis
  both(smooth([[372,560],[392,620],[416,690],[424,740],[418,744],[404,690],[382,620],[364,566]],true),d=>mus(d,'fibL','#c06a58'));   // sartorius
  both(smooth([[428,606],[420,640],[414,690],[426,700],[434,640]],true),d=>mus(d,'fibV','#a34638'));                       // adductors
  limbM([382,768],[386,890],24,14,'fibV','#a34638');                                                                       // tibialis anterior
  limbM([370,784],[378,876],36,18,'fibR');                                                                                 // gastrocnemius
  both(smooth([[438,226],[438,452]]),d=>ln('mt',d,'#eadccf',2.2));                                                         // linea alba
  [0,1,2,3].forEach(i=>both(smooth([[412,328+i*40],[438,328+i*40]]),d=>ln('mt',d,'#eadccf',1.5)));

  // ================= SKELETON (zone: bones) =================
  const B='#e8dcc2', BD='#b9a582', CART='#cfe0e6';
  const bone=d=>organ('bones','bp',d,B);
  const lbone=(a,b,w0,w1,ends)=>{const n=[-unit(a,b)[1],unit(a,b)[0]],u=unit(a,b);
    const d=smooth([off(a,n,w0*.5),off(lerp(a,b,.18),n,w0*.32),off(lerp(a,b,.5),n,(w0+w1)*.13),off(lerp(a,b,.82),n,w1*.32),off(b,n,w1*.5),off(b,u,w1*.35),off(b,n,-w1*.5),off(lerp(a,b,.82),n,-w1*.32),off(lerp(a,b,.5),n,-(w0+w1)*.13),off(lerp(a,b,.18),n,-w0*.32),off(a,n,-w0*.5),off(a,u,-w0*.35)],true);
    bone(d);mirrorBone(d);if(ends!==false)ln('ba',smooth([lerp(a,b,.2),lerp(a,b,.8)]),BD,.8,'stroke-opacity:.5');};
  const mirrorBone=d=>bone(mirD(d));
  // skull
  const SKULL=smooth([[440,20],[412,26],[396,44],[391,70],[393,96],[400,112],[405,124],[410,118],[414,104],[466,104],[470,118],[475,124],[480,112],[487,96],[489,70],[484,44],[468,26]],true);
  bone(SKULL);
  both(smooth([[411,78],[418,74],[430,76],[433,84],[430,94],[420,95],[412,90]],true),d=>{fl('bp',d,'#2a231c',.9);ln('bp',d,BD,1.1);});
  both(smooth([[404,100],[414,106],[426,104]]),d=>ln('bp',d,BD,1.2,'stroke-opacity:.8'));                                                                     // orbits
  fl('bp',smooth([[440,94],[435,104],[434,112],[440,115],[446,112],[445,104]],true),'#2a231c',.9);ln('bp','M440,95 L440,114',BD,.8);                                          // nasal aperture
  both(smooth([[404,98],[396,104],[402,114],[414,110]]),d=>ln('bp',d,BD,1.4));                                            // zygomatic arch
  const MAND=smooth([[408,118],[410,138],[422,152],[440,158],[458,152],[470,138],[472,118],[462,126],[440,132],[418,126]],true);bone(MAND);
  for(let i=0;i<8;i++){const x=427+i*3.7;fl('bp',`M${P(x,117)} h3 v7 h-3 Z`,'#f6f1e4');fl('bp',`M${P(x,127)} h3 v6 h-3 Z`,'#f6f1e4');}
  ln('bp',smooth([[440,22],[436,40],[442,58]]),BD,.8,'stroke-opacity:.6');                                               // coronal/sagittal suture hint
  // spine: 7 cervical, 12 thoracic, 5 lumbar, sacrum, coccyx
  for(let i=0;i<24;i++){const y=i<7?160+i*6.6:i<19?208+(i-7)*17.2:416+(i-19)*19,w=i<7?7.5:i<19?10+(i-7)*.25:15,h=i<7?2.6:i<19?6.4:8;
    bone(ell(CX,y,w,h));both(ell(CX-w-2.5,y,2.6,1.6),d=>fl('ba',d,BD,.7));}
  bone(smooth([[426,510],[454,510],[450,546],[440,568],[430,546]],true));                                                  // sacrum
  [0,1,2].forEach(i=>both(ell(434,520+i*12,2,1.6),d=>fl('bp',d,'#6a5a44',.7)));
  bone(smooth([[436,570],[444,570],[441,582]],true));                                                                      // coccyx
  // sternum, clavicles, scapulae
  bone(smooth([[430,210],[450,210],[452,230],[448,236],[449,316],[444,330],[440,340],[436,330],[431,316],[432,236],[428,230]],true));
  both(smooth([[432,212],[408,204],[384,208],[362,204],[346,210]]),d=>tube('bones','bp',d,B,6.5,{nohalo:true,under:BD}));
  both(smooth([[350,212],[402,226],[396,300],[356,292],[344,240]],true),d=>fl('ba',d,B,.35));
  // ribs: 1-7 true ribs reach the sternum through cartilage, 8-10 join the cartilage above, 11-12 float
  for(let i=0;i<12;i++){const y=212+i*17.2,wmax=[48,62,72,80,86,90,92,92,90,86,78,66][i],drop=26+i*2.4;
    const back=[CX-10,y],lat=[CX-wmax,y+drop*.62],front=[CX-wmax*.62,y+drop+8];
    const rib=smooth([back,[CX-wmax*.62,y-6],[CX-wmax*.95,y+drop*.25],lat,i<10?front:[CX-wmax*.85,y+drop*.9]]);
    both(rib,d=>tube('bones','ba',d,B,i<2?4:3.4,{nohalo:true,under:BD,hiop:.4}));
    if(i<7){both(smooth([front,[CX-14,y+drop+2-i*1.5],[CX-9,218+i*15]]),d=>tube('bones','ba',d,CART,2.6,{nohalo:true,under:'#8aa3ad'}));}
    else if(i<10){both(smooth([front,[CX-wmax*.4,y+drop-4],[CX-30-i*2,y+drop-24]]),d=>tube('bones','ba',d,CART,2.4,{nohalo:true,under:'#8aa3ad'}));}}
  // pelvis
  const PELV=smooth([[430,512],[404,508],[374,512],[358,528],[360,552],[376,560],[392,556],[404,570],[406,590],[420,600],[436,604],[438,592],[424,582],[414,566],[420,540],[430,530]],true);
  both(PELV,d=>bone(d));both(ell(410,588,6,8,-15),d=>fl('bp',d,'#1d1a17',.75));both(ell(396,566,10,10),d=>fl('ba',d,BD,.55));
  // arms
  both(ell(SH[0]+4,SH[1]+2,13,12),d=>bone(d));                                                                            // humeral head
  lbone(lerp(SH,EL,.06),EL,13,15);                                                                                        // humerus
  const RU0=off(EL,armN,4.5),RU1=off(WR,armN,4),UL0=off(EL,armN,-4),UL1=off(WR,armN,-3.5);
  lbone(RU0,RU1,7,9);lbone(UL0,UL1,8,6);                                                                                  // radius, ulna
  // hand: carpals, metacarpals, phalanges (thumb towards the top edge)
  const handBase=off(WR,armDir,6);
  for(let i=0;i<8;i++){const p=off(off(handBase,armDir,(i%2)*6),armN,(Math.floor(i/2)-1.5)*5.2);both(ell(p[0],p[1],3,2.6),d=>fl('bp',d,B,.95));}
  const finger=(spread,len,segs,w)=>{let p=off(off(handBase,armDir,10),armN,spread);const dir=unit([0,0],[armDir[0]+armN[0]*spread*.012,armDir[1]+armN[1]*spread*.012]);
    for(let s=0;s<segs;s++){const L=len*(s===0?1:s===1?.62:.45),q=off(p,dir,L);both(smooth([p,q]),d=>tube('bones','ba',d,B,w*(1-s*.15),{nohalo:true,under:BD}));p=off(q,dir,1.6);}};
  finger(9,13,3,3.2);finger(4,15,4,2.8);finger(-.5,16,4,2.8);finger(-5,15,4,2.6);finger(-9.5,13,4,2.3);
  // legs
  both(smooth([[HIP[0]-6,HIP[1]-2],[386,572],[378,580]]),d=>tube('bones','bp',d,B,9,{nohalo:true,under:BD}));             // femoral neck
  both(ell(HIP[0],HIP[1],10,10),d=>bone(d));both(ell(376,582,8,10),d=>bone(d));                                           // femoral head, greater trochanter
  lbone([382,588],KN,17,22);                                                                                              // femur
  both(ell(KN[0]+2,KN[1]+6,9,11),d=>bone(d));                                                                             // patella
  lbone([KN[0]+3,KN[1]+18],[AN[0]+3,AN[1]-4],17,12);                                                                      // tibia
  lbone([KN[0]-12,KN[1]+22],[AN[0]-11,AN[1]-2],6,6);                                                                      // fibula
  both(ell(AN[0]-12,AN[1]+2,4,6),d=>bone(d));both(ell(AN[0]+12,AN[1]+1,4,5),d=>bone(d));                                  // malleoli
  for(let i=0;i<7;i++){both(ell(AN[0]-8+(i%3)*8,AN[1]+12+Math.floor(i/3)*7,4.2,3.4),d=>fl('bp',d,B,.95));}                  // tarsals
  for(let t=0;t<5;t++){const x0=AN[0]-14+t*7,x1=AN[0]-20+t*9;both(smooth([[x0,936],[x1,950]]),d=>tube('bones','ba',d,B,2.8,{nohalo:true,under:BD}));
    both(smooth([[x1,952],[x1-1,960]]),d=>tube('bones','ba',d,B,2.4,{nohalo:true,under:BD}));}

  // ================= BRAIN, SPINAL CORD, NERVES (zone: brain) =================
  const BRAIN=smooth([[440,30],[414,36],[400,56],[400,84],[412,100],[440,106],[468,100],[480,84],[480,56],[466,36]],true);
  organ('brain','o',BRAIN,'#e3b2ae',{pat:'gyri',op:.95});
  ln('o','M440,32 L440,104','#9a5d5d',1.3,'stroke-opacity:.7');                                                           // longitudinal fissure
  for(let i=0;i<22;i++){const x0=404+R()*72,y0=40+R()*58;ln('o',smooth([[x0,y0],[x0+4+R()*6,y0+(R()-.5)*8],[x0+9+R()*6,y0+(R()-.5)*9],[x0+12+R()*6,y0+(R()-.5)*8]]),'#a5696a',.85,'stroke-opacity:.6');}
  tube('brain','o',smooth([[440,104],[440,124]]),'#e3b2ae',8,{nohalo:true});                                              // brainstem
  tube('brain','nv',smooth([[440,124],[440,200],[440,360],[440,500]]),'#f0cf72',3.4,{under:'#9c7a26'});                  // spinal cord
  both(smooth([[421,90],[432,96],[440,98]]),d=>tube('eyes','nv',d,'#f0cf72',1.8,{nohalo:true,under:'#9c7a26'}));        // optic nerves
  const nerve=pts=>both(smooth(pts),d=>tube('brain','nv',d,'#f0cf72',1.4,{nohalo:true,under:'#9c7a26',hiop:.5}));
  nerve([[440,200],[410,214],[372,224],[off(SH,armN,-2)[0],off(SH,armN,-2)[1]],off(lerp(SH,EL,.5),armN,-3),off(EL,armN,-1),off(lerp(EL,WR,.5),armN,0),off(WR,armN,0),off(FT,armN,0)]);   // median
  nerve([[440,206],[404,222],[368,236],off(lerp(SH,EL,.4),armN,-7),off(EL,armN,-8),off(lerp(EL,WR,.6),armN,-6),off(WR,armN,-6)]);                                                  // ulnar
  nerve([[440,196],[400,208],[360,218],off(lerp(SH,EL,.45),armN,8),off(EL,armN,6),off(lerp(EL,WR,.5),armN,6),off(WR,armN,5)]);                                                     // radial
  nerve([[440,500],[420,540],[408,590],[404,660],[398,740],[392,840],[388,920]]);                                       // sciatic / tibial
  nerve([[440,480],[414,520],[396,560],[392,600],[386,640]]);                                                           // femoral
  for(let i=0;i<11;i++){const y=230+i*17.2;both(smooth([[438,y],[440-60,y+6],[440-80+i,y+24]]),d=>ln('nv',d,'#f0cf72',.6,'stroke-opacity:.55'));}   // intercostals
  both(smooth([[420,96],[408,110],[404,128]]),d=>ln('nv',d,'#f0cf72',.7,'stroke-opacity:.6'));                          // facial nerve

  // ================= NECK: larynx, thyroid, trachea, esophagus =================
  tube('metabolism','o',smooth([[446,150],[446,240],[450,320],[452,382]]),'#d58c80',8,{nohalo:true,under:'#7c4038'}); // esophagus (behind)
  organ('lungs','o',smooth([[428,140],[452,140],[456,154],[440,162],[424,154]],true),'#d9c08c');                         // thyroid cartilage
  tube('lungs','o',smooth([[440,160],[440,200],[440,238]]),'#dcc08a',13,{under:'#8f6c3a',dash:['#b48d52','2 3.2'],hi:'#fff4d6'});   // trachea
  organ('metabolism','o',smooth([[426,166],[434,164],[440,170],[446,164],[454,166],[456,182],[446,186],[440,180],[434,186],[424,182]],true),'#b8545a');   // thyroid

  // ================= HEART + GREAT VESSELS (zone: heart) =================
  const ART='#c9262f', VEN='#2a8fd6', PULA='#5b6fd0', PULV='#d0444c';
  tube('heart','o',smooth([[452,270],[450,244],[446,224],[462,212],[478,222],[478,250]]),ART,10,{under:'#6f1418'});       // aortic arch
  tube('heart','o',smooth([[460,214],[456,190],[454,160]]),ART,4,{nohalo:true,under:'#6f1418'});                         // left common carotid
  tube('heart','o',smooth([[450,222],[438,206],[430,190],[428,160]]),ART,4.4,{nohalo:true,under:'#6f1418'});             // brachiocephalic → right carotid
  tube('heart','o',smooth([[432,262],[434,232],[432,200]]),VEN,9,{under:'#123c66'});                                     // superior vena cava
  tube('heart','o',smooth([[448,288],[462,262],[478,252],[496,258]]),PULA,8,{under:'#24306e'});                           // pulmonary trunk → left
  tube('heart','o',smooth([[448,288],[440,264],[420,256],[398,262]]),PULA,7,{under:'#24306e'});                           // → right pulmonary artery
  // ================= LUNGS (zone: lungs) with bronchial tree + pulmonary vessels =================
  const LUNG_R=smooth([[426,226],[406,222],[386,236],[370,268],[362,310],[360,352],[372,372],[404,366],[424,358],[432,324],[432,268]],true);
  const LUNG_L=smooth([[454,226],[474,222],[494,236],[510,268],[518,310],[520,352],[508,372],[478,366],[462,356],[470,330],[454,312],[456,268]],true);
  organ('lungs','o',LUNG_R,'#e49a8f',{pat:'alv'});organ('lungs','o',LUNG_L,'#e49a8f',{pat:'alv'});
  ln('o',smooth([[430,268],[402,290],[370,316]]),'#8f453e',1.2,'stroke-opacity:.7');ln('o',smooth([[428,322],[398,334],[366,348]]),'#8f453e',1.2,'stroke-opacity:.7');   // right fissures
  ln('o',smooth([[456,286],[484,314],[516,338]]),'#8f453e',1.2,'stroke-opacity:.7');                                      // left oblique fissure
  const tree=(p,a,len,w,depth,c,l,z)=>{const q=[p[0]+Math.cos(a)*len,p[1]+Math.sin(a)*len];
    ln(l||'o',smooth([p,lerp(p,q,.5).map((v,i)=>v+(R()-.5)*3*(i?1:1)),q]),c,r2(w),'stroke-opacity:.85');
    if(depth>0){const s=.35+R()*.25;tree(q,a-s,len*.72,w*.68,depth-1,c,l,z);tree(q,a+s,len*.68,w*.66,depth-1,c,l,z);if(R()<.4)tree(q,a+(R()-.5)*.3,len*.6,w*.6,depth-1,c,l,z);}};
  [[[424,250],2.2],[[456,250],.95]].forEach(([p,a])=>{tree(p,a+.15,22,3.2,4,'#e8d3a8');});                              // bronchi
  [[[410,262],2.4],[[470,262],.75]].forEach(([p,a])=>{tree(p,a+.4,18,1.6,4,PULA);tree(p,a-.3,18,1.4,4,PULV);});
  both(smooth([[392,250],[380,290],[376,340]]),d=>ln('o',d,'#fff',3,'stroke-opacity:.16'));
  // heart sits in front, between the lungs (cardiac notch)
  add('o','<path class="decof" style="fill:#000;opacity:.25;filter:blur(3px)" d="'+smooth([[432,284],[452,274],[474,282],[490,304],[492,330],[480,354],[460,370],[442,364],[428,342],[424,310]],true)+'"/>');
  const HEART=smooth([[432,280],[452,270],[474,278],[490,300],[492,326],[480,350],[460,366],[442,360],[428,338],[424,306]],true);
  organ('heart','o',HEART,'#b02d36',{pat:'myo'});
  fl('o',smooth([[422,300],[436,284],[444,300],[440,330],[426,330]],true),'#8a2a3a',.55);                                 // right atrium
  ln('o',smooth([[452,272],[460,300],[458,330],[446,356]]),'#e0b24a',2.2,'stroke-opacity:.8');                            // interventricular groove fat
  ln('o',smooth([[452,272],[460,300],[458,330],[446,356]]),ART,1.4);                                                      // LAD coronary artery
  ln('o',smooth([[430,290],[426,320],[438,350]]),ART,1.2);ln('o',smooth([[458,300],[478,320],[484,340]]),VEN,1,'stroke-opacity:.8');
  for(let i=0;i<6;i++){const p=lerp([456,282],[448,350],i/6);ln('o',smooth([p,[p[0]+10+R()*8,p[1]+6+R()*6]]),ART,.6);}

  ln('o',smooth([[358,380],[392,368],[440,376],[488,368],[522,380]]),'#7e2427',6,'stroke-opacity:.9');                   // diaphragm

  // ================= ABDOMEN (zone: metabolism) =================
  tube('heart','o',smooth([[446,368],[446,420],[444,470],[440,518]]),ART,6,{nohalo:true,under:'#6f1418'});                // descending aorta
  tube('heart','o',smooth([[434,372],[432,420],[432,470],[436,520]]),VEN,7,{nohalo:true,under:'#123c66'});               // inferior vena cava
  both(ell(398,468,14,24,-8),d=>organ('metabolism','o',d,'#8e3530'));                                                     // kidneys
  both(ell(400,444,9,5,-20),d=>organ('metabolism','o',d,'#d9a24a'));                                                      // adrenals
  both(smooth([[412,470],[434,468]]),d=>ln('o',d,ART,2));both(smooth([[412,476],[432,476]]),d=>ln('o',d,VEN,2.2));     // renal vessels
  both(smooth([[404,490],[412,530],[420,580],[432,602]]),d=>tube('metabolism','o',d,'#e4c48c',2.2,{nohalo:true,under:'#8f6c3a'}));   // ureters
  const LIVER=smooth([[358,386],[396,374],[446,378],[478,390],[470,404],[446,414],[414,432],[380,440],[362,424]],true);
  organ('metabolism','o',LIVER,'#9b3b33',{pat:'lob'});
  ln('o',smooth([[446,382],[432,404],[420,430]]),'#5e1f1a',1.2,'stroke-opacity:.7');                                     // falciform ligament
  organ('metabolism','o',ell(418,430,8,6,25),'#6b8f4a');                                                                  // gallbladder
  const STOM=smooth([[468,388],[496,380],[518,394],[520,424],[502,448],[476,456],[454,448],[446,436],[460,428],[470,410]],true);
  organ('metabolism','o',STOM,'#d88a7c',{pat:'rug'});
  tube('metabolism','o',smooth([[448,440],[430,446],[420,460],[424,478],[440,482]]),'#d9a07c',8,{nohalo:true,under:'#7c4a30'});   // duodenum
  organ('metabolism','o',smooth([[430,454],[464,448],[500,452],[524,446],[520,458],[496,462],[462,464],[436,470]],true),'#e2b783',{pat:'lob'});   // pancreas
  organ('immune','o',ell(530,414,10,22,-15),'#7e3150');                                                                   // spleen
  tube('heart','o',smooth([[452,470],[446,446],[436,428],[424,418]]),'#6a5bb8',4,{nohalo:true,under:'#2c2366'});         // portal vein
  // large intestine with haustra: ascending → transverse → descending → sigmoid → rectum
  const COLON=sample([[390,572],[382,540],[380,500],[386,470],[410,460],[440,466],[470,460],[496,468],[502,500],[500,540],[492,566],[470,580],[452,584],[440,600]],8.5);
  tube('metabolism','o',smooth(COLON.filter((_,i)=>i%3===0).concat([COLON[COLON.length-1]])),'#b48f61',16,{under:'#5e4626'});
  COLON.forEach((p,i)=>{if(i%2)return;fl('o',ell(p[0],p[1],8.6,8.6),'#b8936a');fl('o',ell(p[0]-2,p[1]-2.4,4.4,3.6),'#e2c69a',.55);add('o',`<path class="deco" style="stroke:#6c5130;stroke-width:.9;fill:none" d="${ell(p[0],p[1],8.6,8.6)}"/>`);});
  tube('metabolism','o',smooth([[388,578],[392,592],[398,598]]),'#c49a6c',4,{nohalo:true,under:'#6c5130'});              // appendix
  // small intestine: overlapping coiled loops, drawn back to front
  const loops=[];for(let i=0;i<34;i++){loops.push([404+R()*72,476+R()*84,R()*Math.PI*2,12+R()*12]);}
  loops.sort((a,b)=>a[1]-b[1]).forEach(([x,y,a,l],i)=>{const c=Math.cos(a),s=Math.sin(a),p0=[x-c*l,y-s*l],p1=[x+c*l,y+s*l],mid=[x-s*l*.55,y+c*l*.55];
    tube('metabolism','o',smooth([p0,mid,p1]),'#cfa06e',8.6,{nohalo:i>0,under:'#6e4f2c',hi:'#ffe9c4',hiop:.45});});
  organ('metabolism','o',ell(440,612,17,12),'#d9a582');                                                                   // bladder

  // ================= SYSTEMIC VESSELS (zone: heart): arteries red, veins blue =================
  const vtree=(pts,c,w,dark,branchEvery,blen,l)=>{const d=smooth(pts);tube('heart',l||'v',d,c,w,{nohalo:true,under:dark});
    const s=sample(pts,branchEvery);s.forEach((p,i)=>{if(i===0||i===s.length-1)return;const nx=s[Math.min(s.length-1,i+1)],dir=Math.atan2(nx[1]-p[1],nx[0]-p[0]),side=R()<.5?-1:1;
      tree(p,dir+side*(.6+R()*.6),blen*(.6+R()*.6),Math.max(.45,w*.42),2,c,l||'v');});};
  const armLine=o=>[[CX-30,206],[372,210],off(SH,armN,o),off(lerp(SH,EL,.5),armN,o),off(EL,armN,o*.8),off(lerp(EL,WR,.5),armN,o*.8),off(WR,armN,o*.7),off(lerp(WR,FT,.5),armN,o*.4),FT];
  const sides=f=>{f(x=>x);f(MP);};
  sides(m=>{
    vtree(m(armLine(-3)),ART,2.6,'#6f1418',22,14);                                       // subclavian → axillary → brachial → ulnar/radial → digital
    vtree(m(armLine(6)),VEN,2.4,'#123c66',20,13);                                        // cephalic vein
    vtree(m(armLine(-9).slice(2)),VEN,2,'#123c66',24,12);                                // basilic vein
    vtree(m([[428,190],[426,160],[420,132],[412,112],[406,90],[414,62]]),ART,1.8,'#6f1418',16,10);   // carotid → facial/temporal
    vtree(m([[426,200],[420,170],[414,140],[406,118]]),VEN,2.2,'#123c66',18,10);         // jugular
    vtree(m([[436,520],[416,548],[404,584],[400,640],[398,700],[394,750],[392,820],[390,880],[384,924],[370,952]]),ART,2.8,'#6f1418',26,16);   // iliac → femoral → tibial → dorsalis pedis
    vtree(m([[444,524],[426,552],[412,586],[410,640],[406,700],[402,752],[398,820],[396,880],[394,926]]),VEN,3,'#123c66',26,15);              // femoral vein
    vtree(m([[372,680],[366,740],[368,800],[372,860],[378,920]]),VEN,1.6,'#123c66',22,12);                                                     // great saphenous
    vtree(m([[400,232],[376,252],[360,280],[352,320]]),ART,1.2,'#6f1418',16,10);                                                               // lateral thoracic
  });
  // mesenteric arteries fanning into the intestine
  for(let i=0;i<9;i++){const p0=[444,476],a=Math.PI*.35+i*.26;tree(p0,a,26+R()*14,1.2,2,ART,'v');}
  for(let i=0;i<6;i++){const p0=[438,470],a=Math.PI*.55+i*.32;tree(p0,a,22+R()*12,1,2,'#6a5bb8','v');}

  // ================= LYMPH + IMMUNE (zone: immune) =================
  organ('immune','ly',smooth([[432,236],[448,236],[452,250],[440,258],[428,250]],true),'#e2b39a',{op:.55,shade:false});                  // thymus
  const nodes=[[392,176],[384,166],[400,190],[360,262],[352,272],[344,250],[366,282],[396,600],[388,590],[404,612],[420,520],[426,540],[230,296],[226,306]];
  nodes.forEach(([x,y])=>both(ell(x,y,3.4,3),d=>organ('immune','ly',d,'#9fd07a',{shade:false})));
  const lymph=pts=>both(smooth(pts),d=>ln('ly',d,'#9fd07a',.8,'stroke-opacity:.6;stroke-dasharray:3 3'));
  lymph([[392,176],[372,220],[352,262],[364,330],[392,420],[420,520],[396,600]]);
  lymph([[352,262],off(lerp(SH,EL,.5),armN,-12),off(EL,armN,-11),off(WR,armN,-8)]);
  lymph([[396,600],[400,680],[398,760],[392,860]]);

  // ================= Tap targets =================
  add('sd',`<path class="hit" data-z="brain" d="${ell(440,66,40,40)}"/>`);

  // ================= Definitions =================
  const defs=`<defs>
<linearGradient id="skinG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6ad9c" stop-opacity=".6"/><stop offset=".45" stop-color="#d79483" stop-opacity=".46"/><stop offset="1" stop-color="#c47e6c" stop-opacity=".54"/></linearGradient>
<radialGradient id="skinShade" cx=".5" cy=".42" r=".62"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#3a1a14" stop-opacity=".45"/></radialGradient>
<radialGradient id="vol" cx=".36" cy=".3" r=".85"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset=".78" stop-color="#000" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity=".48"/></radialGradient>
<radialGradient id="specG" cx=".32" cy=".26" r=".3"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<radialGradient id="aura" cx=".5" cy=".5" r=".5"><stop offset=".8" stop-color="#000" stop-opacity="0"/><stop offset=".94" class="auraStop"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<linearGradient id="scanG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f5b301" stop-opacity="0"/><stop offset=".75" stop-color="#f5b301" stop-opacity=".05"/><stop offset=".92" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<pattern id="fibR" width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(14)"><path d="M0,0 L0,2.4" stroke="#000" stroke-opacity=".26" stroke-width=".55"/></pattern>
<pattern id="fibL" width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(-14)"><path d="M0,0 L0,2.4" stroke="#000" stroke-opacity=".26" stroke-width=".55"/></pattern>
<pattern id="fibV" width="2.4" height="2.4" patternUnits="userSpaceOnUse"><path d="M0,0 L0,2.4" stroke="#000" stroke-opacity=".24" stroke-width=".55"/></pattern>
<pattern id="alv" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.6" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width=".5"/></pattern>
<pattern id="myo" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><path d="M0,0 L0,3" stroke="#000" stroke-opacity=".18" stroke-width=".6"/></pattern>
<pattern id="lob" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0,3 L3,0 L6,3 L3,6 Z" fill="none" stroke="#000" stroke-opacity=".14" stroke-width=".5"/></pattern>
<pattern id="gyri" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0,4 Q2,0 4,4 T8,4" fill="none" stroke="#8d4f50" stroke-opacity=".35" stroke-width=".7"/></pattern>
<pattern id="rug" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><path d="M0,2.5 Q1.25,.5 2.5,2.5 T5,2.5" fill="none" stroke="#7a3b33" stroke-opacity=".32" stroke-width=".6"/></pattern>
<filter id="rim" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur in="SourceAlpha" stdDeviation="9" result="bl"/><feFlood flood-color="#f5b301" flood-opacity=".06"/><feComposite in2="bl" operator="in" result="glow"/><feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="depth" x="-5%" y="-5%" width="110%" height="110%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.4" flood-color="#000" flood-opacity=".45"/></filter>
<clipPath id="cpBody"><path d="${SKIN}"/></clipPath>
</defs>`;
  const g=(k,c,x)=>`<g class="${c}"${x||''}>${(lay[k]||[]).join('')}</g>`;
  const clip=' clip-path="url(#cpBody)"';
  return defs+
    `<ellipse class="zz-radiation aura fnA" data-z="radiation" cx="440" cy="490" rx="436" ry="486" fill="url(#aura)"/>`+
    g('sk','L-sk',' filter="url(#rim)"')+g('ml','L L-ml',clip)+g('mt','L L-mt',clip)+g('bp','L L-bp',' filter="url(#depth)"')+g('ba','L L-ba')+g('sd','L-sd')+
    g('v','L L-v',clip)+g('nv','L L-nv',clip)+g('ly','L L-ly',clip)+g('o','L L-o',' filter="url(#depth)"')+
    `<rect class="scan" x="0" y="-60" width="880" height="60" fill="url(#scanG)" clip-path="url(#cpBody)"><animate attributeName="y" from="-60" to="980" dur="7s" repeatCount="indefinite"/></rect>`;
}
