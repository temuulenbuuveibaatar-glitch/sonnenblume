// ---------- Anatomical body: translucent skin, organs, red arteries and cyan veins ----------
// Original procedural SVG. viewBox 0 0 880 980, figure centred on x = 440, arms out.
function buildBody(rng){
  const R=rng(1977), r2=n=>Math.round(n*10)/10, K=0.5523, CX=440;
  const P=(x,y)=>r2(x)+','+r2(y);
  const mir=d=>d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g,(m,x,y)=>r2(2*CX-parseFloat(x))+','+y);
  const both=(d,f)=>{f(d);f(mir(d));};
  const ell=(cx,cy,rx,ry,rot)=>{const a=(rot||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),q=(x,y)=>P(cx+x*c-y*s,cy+x*s+y*c);
    return `M${q(rx,0)} C${q(rx,ry*K)} ${q(rx*K,ry)} ${q(0,ry)} C${q(-rx*K,ry)} ${q(-rx,ry*K)} ${q(-rx,0)} C${q(-rx,-ry*K)} ${q(-rx*K,-ry)} ${q(0,-ry)} C${q(rx*K,-ry)} ${q(rx,-ry*K)} ${q(rx,0)} Z`;};
  // Catmull-Rom through points; closed=true joins the ends smoothly
  const smooth=(pts,closed)=>{const n=pts.length,g=i=>closed?pts[(i+n)%n]:pts[Math.max(0,Math.min(n-1,i))];
    let d=`M${P(pts[0][0],pts[0][1])}`;const m=closed?n:n-1;
    for(let i=0;i<m;i++){const p0=g(i-1),p1=g(i),p2=g(i+1),p3=g(i+2);
      d+=` C${P(p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6)} ${P(p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6)} ${P(p2[0],p2[1])}`;}
    return d+(closed?' Z':'');};
  // tapered limb segment between two points
  const seg=(a,b,w0,w1)=>{const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy),nx=-dy/l,ny=dx/l;
    return smooth([[a[0]+nx*w0/2,a[1]+ny*w0/2],[(a[0]+b[0])/2+nx*(w0+w1)/4*1.06,(a[1]+b[1])/2+ny*(w0+w1)/4*1.06],[b[0]+nx*w1/2,b[1]+ny*w1/2],[b[0]+dx/l*w1*.35,b[1]+dy/l*w1*.35],[b[0]-nx*w1/2,b[1]-ny*w1/2],[(a[0]+b[0])/2-nx*(w0+w1)/4*1.06,(a[1]+b[1])/2-ny*(w0+w1)/4*1.06],[a[0]-nx*w0/2,a[1]-ny*w0/2],[a[0]-dx/l*w0*.35,a[1]-dy/l*w0*.35]],true);};
  const lay={};const add=(l,s)=>(lay[l]=lay[l]||[]).push(s);
  const organ=(z,l,d,nat,o)=>{o=o||{};add(l,`<path class="zz-${z} halo" d="${d}"/>`);add(l,`<path class="zz-${z} fn" data-z="${z}" style="--nat:${nat}${o.op?';opacity:'+o.op:''}" d="${d}"/>`);
    if(o.pat)add(l,`<path class="pat" style="fill:url(#${o.pat})" d="${d}"/>`);if(o.shade!==false)add(l,`<path class="shd" d="${d}"/>`);add(l,`<path class="zz-${z} out" d="${d}"/>`);};
  const tube=(z,l,d,nat,w,o)=>{o=o||{};if(!o.nohalo)add(l,`<path class="zz-${z} halo" style="stroke-width:${r2(w+5)}" d="${d}"/>`);
    if(o.under)add(l,`<path class="deco" style="stroke:${o.under};stroke-width:${r2(w+1.8)}" d="${d}"/>`);
    add(l,`<path class="zz-${z} sn" data-z="${z}" style="--nat:${nat};stroke-width:${w}" d="${d}"/>`);
    if(o.dash)add(l,`<path class="deco" style="stroke:${o.dash[0]};stroke-width:${w};stroke-dasharray:${o.dash[1]}" d="${d}"/>`);
    if(o.hi)add(l,`<path class="deco" style="stroke:${o.hi};stroke-width:${r2(Math.max(.5,w*.28))};stroke-opacity:.55" d="${d}"/>`);};
  const ln=(l,d,c,w,x)=>add(l,`<path class="deco" style="stroke:${c};stroke-width:${w}${x?';'+x:''}" d="${d}"/>`);
  const fl=(l,d,c,op)=>add(l,`<path class="decof" style="fill:${c}${op!=null?';opacity:'+op:''}" d="${d}"/>`);
  const lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];

  // ---------------- Skeleton of the pose (body's right = viewer's left) ----------------
  const SH=[338,214], EL=[210,292], WR=[96,360], FT=[30,398];      // shoulder, elbow, wrist, fingertip
  const HIP=[398,566], KN=[390,748], AN=[386,912];                  // hip joint, knee, ankle

  // ---------------- Skin silhouette (one closed outline, mirrored) ----------------
  const half=[
    [440,18],[410,24],[392,48],[387,82],[389,112],[397,134],[412,152],[424,160],[422,178],[402,188],[372,196],[346,203],
    [322,216],[290,236],[252,256],[214,276],[176,300],[140,322],[104,341],[84,350],[62,360],[42,370],[26,386],[22,398],[34,402],[52,394],[70,388],
    [92,382],[110,374],[146,354],[184,330],[220,312],[258,294],[300,276],[336,262],
    [346,300],[352,350],[362,404],[368,446],[360,486],[352,524],[352,566],[356,610],[362,660],[366,704],[368,744],
    [362,790],[364,840],[372,890],[376,916],[364,936],[352,954],[364,962],[400,962],[408,948],[404,920],
    [408,880],[414,830],[420,780],[422,740],[426,690],[430,640],[436,612],[440,606]
  ];
  const full=half.concat(half.slice(1,-1).reverse().map(([x,y])=>[2*CX-x,y]));
  const SKIN=smooth(full,true);
  add('sk',`<path class="skin" style="fill:url(#skinG)" d="${SKIN}"/>`);
  add('sk',`<path class="skin" style="fill:url(#skinShade)" d="${SKIN}"/>`);
  add('sk',`<path class="skin" style="fill:none;stroke:#f2c9bb;stroke-opacity:.55;stroke-width:1.4" d="${SKIN}"/>`);
  const hitZone=(z,d)=>add('sd',`<path class="hit" data-z="${z}" d="${d}"/>`);

  // ---------------- Face (muscle-toned, like an anatomy render) ----------------
  fl('sd',ell(440,80,47,60),'#c8836f',.35);
  both(smooth([[412,50],[404,72],[408,104],[420,128],[436,142]]),d=>ln('sd',d,'#8d4a3c',1.1,'stroke-opacity:.5'));   // temporal / masseter edge
  both(smooth([[420,60],[428,56],[438,58]]),d=>ln('sd',d,'#6b3529',1.6,'stroke-opacity:.6'));                        // brow
  ln('sd',smooth([[440,72],[437,90],[432,100],[440,104],[448,100],[443,90]]),'#8d4a3c',1,'stroke-opacity:.55');      // nose
  ln('sd',smooth([[426,118],[434,121],[440,120],[446,121],[454,118]]),'#7b3a30',1.4,'stroke-opacity:.7');           // mouth
  both(ell(389,86,6,13,8),d=>fl('sd',d,'#c0806c',.6));                                                               // ears
  both(smooth([[392,190],[372,196],[350,203]]),d=>ln('sd',d,'#8d4a3c',1,'stroke-opacity:.35'));
  // nipples / navel hints
  both(ell(398,300,3,2.6),d=>fl('sd',d,'#9a5547',.45));
  fl('sd',ell(440,470,3.2,4.5),'#7b3a30',.5);

  // ---------------- Eyes (zone: eyes) ----------------
  both(ell(421,82,9,5.4),d=>organ('eyes','sd',d,'#f1ece6',{shade:false}));
  both(ell(421,82,3.6,3.6),d=>fl('sd',d,'#3d6f8f'));
  both(ell(421,82,1.6,1.6),d=>fl('sd',d,'#111'));

  // ---------------- Muscles (zone: muscles) ----------------
  const mus=(d,pat)=>organ('muscles','ml',d,'#b5584a',{pat:pat||'fibR',op:.85});
  both(smooth([[438,226],[400,222],[366,232],[350,256],[356,290],[384,306],[420,304],[438,292]],true),d=>mus(d,'fibL'));   // pectoralis
  both(smooth([[346,206],[322,216],[302,236],[300,262],[318,272],[338,262],[350,236]],true),d=>mus(d));                     // deltoid
  both(seg(lerp(SH,EL,.28),lerp(SH,EL,.9),30,22),d=>mus(d,'fibL'));                                                       // biceps
  both(seg(lerp(EL,WR,.05),lerp(EL,WR,.75),26,14),d=>mus(d));                                                             // forearm flexors
  [0,1,2].forEach(i=>both(smooth([[438,330+i*40],[414,328+i*40],[408,350+i*40],[414,364+i*40],[438,366+i*40]],true),d=>mus(d,'fibL')));  // rectus abdominis
  both(smooth([[364,330],[350,380],[360,440],[384,470],[404,450],[400,380],[384,330]],true),d=>mus(d));                   // external oblique
  both(seg([404,590],[396,730],70,40),d=>mus(d,'fibL'));                                                                  // quadriceps
  both(seg([372,780],[380,880],42,22),d=>mus(d));                                                                         // calf
  both(smooth([[424,176],[404,186],[378,196],[396,200],[422,192]],true),d=>mus(d));                                       // trapezius
  // tendon/fibre detail shown in the muscles layer
  both(smooth([[438,226],[438,450]]),d=>ln('mt',d,'#e9d2c5',2.4));
  [0,1,2,3].forEach(i=>both(smooth([[412,328+i*40-2],[438,328+i*40-2]]),d=>ln('mt',d,'#e9d2c5',1.6)));
  both(smooth([[404,600],[398,640],[394,700],[392,740]]),d=>ln('mt',d,'#e9d2c5',1.4,'stroke-opacity:.7'));

  // ---------------- Skeleton (zone: bones) ----------------
  const BONE='#e9dfc8';
  const bone=d=>organ('bones','bp',d,BONE,{shade:true});
  bone(smooth([[440,24],[408,30],[394,56],[394,96],[404,118],[420,128],[460,128],[476,118],[486,96],[486,56],[472,30]],true));  // cranium
  both(ell(421,82,10,8),d=>fl('bp',d,'#1b1b1e',.55));
  bone(smooth([[420,128],[426,148],[440,154],[454,148],[460,128]],true));                                                 // mandible
  for(let i=0;i<24;i++){const y=160+i*17.5,w=i<7?9:i<19?12:15;bone(ell(440,y,w,6.4));}                                    // vertebrae
  bone(smooth([[434,214],[446,214],[448,330],[440,340],[432,330]],true));                                                 // sternum
  both(smooth([[436,208],[400,202],[364,206],[344,212]]),d=>tube('bones','bp',d,BONE,6,{nohalo:true}));                    // clavicle
  for(let i=0;i<10;i++){const y=226+i*16,sp=82-Math.abs(i-4)*3-(i>6?(i-6)*7:0);
    both(smooth([[438,y],[440-sp*.55,y-8],[440-sp,y+8],[440-sp+6,y+26+i*1.6],[440-sp*.6,y+32+i*2]]),d=>tube('bones','ba',d,BONE,3.2,{nohalo:true}));}  // ribs
  both(smooth([[440,520],[410,512],[376,526],[362,556],[380,586],[410,592],[430,604],[440,600]],true),d=>bone(d));       // pelvis
  both(seg(SH,EL,13,10),bone); both(seg(lerp(EL,WR,0),WR,8,7),d=>bone(d));
  both(seg([EL[0]+4,EL[1]+6],[WR[0]+4,WR[1]+7],6,6),d=>tube('bones','ba',d,BONE,0.1,{nohalo:true}));
  both(seg([HIP[0]+2,HIP[1]],KN,18,14),bone); both(seg([KN[0],KN[1]+14],AN,13,10),bone);
  both(ell(KN[0]+2,KN[1]+4,9,10),bone);                                                                                  // patella
  both(smooth([[WR[0],WR[1]],[70,376],[44,388],[28,396]]),d=>tube('bones','ba',d,BONE,7,{nohalo:true}));                  // hand
  both(smooth([[AN[0],AN[1]+6],[378,936],[362,956]]),d=>tube('bones','ba',d,BONE,9,{nohalo:true}));                       // foot

  // ---------------- Brain + spinal cord (zone: brain) ----------------
  const BRAIN=smooth([[440,34],[412,40],[400,62],[402,90],[416,104],[440,108],[464,104],[478,90],[480,62],[468,40]],true);
  organ('brain','o',BRAIN,'#e8b7b4',{op:.92});
  for(let i=0;i<7;i++){const x0=406+R()*60,y0=44+R()*52;ln('o',smooth([[x0,y0],[x0+6+R()*8,y0+(R()-.5)*10],[x0+12+R()*8,y0+(R()-.5)*12]]),'#a86a6c',.9,'stroke-opacity:.6');}
  ln('o','M440,38 L440,106','#a86a6c',1.1,'stroke-opacity:.5');
  tube('brain','o',smooth([[440,108],[440,200],[440,360],[440,520]]),'#f2d27a',3.2,{});

  // ---------------- Trachea (zone: lungs) ----------------
  tube('lungs','o',smooth([[440,132],[440,180],[440,236]]),'#d9b77a',13,{under:'#8f6c3a',dash:['#b48d52','2.2 3.2'],hi:'#fff1cf'});
  both(smooth([[440,236],[424,250],[410,266]]),d=>tube('lungs','o',d,'#d9b77a',8,{under:'#8f6c3a',dash:['#b48d52','2 3']}));

  // ---------------- Heart (zone: heart), partly behind the lungs ----------------
  const HEART=smooth([[436,266],[462,262],[486,280],[494,310],[480,342],[452,362],[430,352],[418,320],[420,290]],true);
  organ('heart','o',HEART,'#b8333a');
  ln('o',smooth([[446,272],[456,300],[452,330],[440,350]]),'#7d1c22',1.4,'stroke-opacity:.7');
  tube('heart','o',smooth([[446,270],[444,240],[460,226],[476,236],[474,262]]),'#c43a3a',9,{under:'#6f1418'});            // aortic arch

  // ---------------- Lungs (zone: lungs) ----------------
  const LUNG_R=smooth([[428,224],[408,220],[386,236],[370,270],[362,312],[360,352],[372,372],[404,364],[426,356],[434,322],[434,268]],true);
  const LUNG_L=smooth([[452,224],[472,220],[494,236],[510,270],[518,312],[520,352],[508,372],[478,364],[462,354],[470,330],[456,312],[454,270]],true);
  organ('lungs','o',LUNG_R,'#e39184',{pat:'alv'}); organ('lungs','o',LUNG_L,'#e39184',{pat:'alv'});
  ln('o',smooth([[430,270],[400,292],[370,318]]),'#9a4a42',1.2,'stroke-opacity:.6');
  ln('o',smooth([[426,318],[396,334],[366,346]]),'#9a4a42',1.2,'stroke-opacity:.6');
  ln('o',smooth([[456,290],[484,316],[514,338]]),'#9a4a42',1.2,'stroke-opacity:.6');
  both(smooth([[392,250],[380,290],[376,340]]),d=>ln('o',d,'#fff',3,'stroke-opacity:.18'));

  // ---------------- Diaphragm ----------------
  ln('o',smooth([[358,378],[392,366],[440,374],[488,366],[522,378]]),'#8e2a2c',6,'stroke-opacity:.85');

  // ---------------- Abdomen (zone: metabolism) ----------------
  const LIVER=smooth([[358,384],[400,374],[448,378],[468,392],[452,412],[416,430],[380,436],[362,420]],true);
  organ('metabolism','o',LIVER,'#b9564c');
  ln('o',smooth([[448,382],[430,404],[420,428]]),'#7a2e28',1.1,'stroke-opacity:.6');
  fl('o',ell(418,426,9,6,20),'#5c8a4a',.85);                                                                            // gallbladder
  const STOM=smooth([[466,386],[494,380],[516,394],[518,424],[500,446],[474,452],[454,440],[460,416]],true);
  organ('metabolism','o',STOM,'#d4867a',{pat:'rug'});
  organ('immune','o',ell(526,412,9,20,-15),'#8f3a52');                                                                  // spleen
  organ('metabolism','o',smooth([[430,452],[470,446],[506,452],[500,460],[468,458],[434,462]],true),'#e2b48a');          // pancreas
  both(ell(396,472,13,22,-8),d=>organ('metabolism','o',d,'#9a3c35'));                                                  // kidneys

  // large intestine: ascending → transverse → descending → sigmoid
  const COLON=smooth([[382,560],[374,520],[374,486],[384,462],[420,458],[460,458],[496,462],[506,486],[506,522],[500,556],[476,574],[452,580],[440,592]]);
  tube('metabolism','o',COLON,'#b39062',17,{under:'#6c512c',dash:['#8d6c40','1.6 6.4'],hi:'#e8cf9e'});
  tube('metabolism','o',smooth([[382,560],[386,576],[396,582]]),'#b39062',13,{under:'#6c512c'});                         // caecum + appendix
  // small intestine: tightly coiled loops
  const loopRows=8;
  for(let r=0;r<loopRows;r++){
    const y=478+r*11.5, pts=[]; const left=394+(r%2?6:0), right=488-(r%2?0:6);
    for(let x=left;x<=right;x+=7.2){pts.push([x+(R()-.5)*3,y+((x/7.2|0)%2?-5.5:5.5)+(R()-.5)*2.4]);}
    if(r%2)pts.reverse();
    tube('metabolism','o',smooth(pts),'#c39a63',7.4,{nohalo:r>0,under:'#6e5230',hi:'#f1d7a6'});
  }
  organ('metabolism','o',ell(440,612,16,12),'#d8a77d');                                                                  // bladder

  // ---------------- Vessels (zone: heart): arteries red, veins cyan ----------------
  const ART='#d8343a', VEN='#2bc4cf';
  const vessel=(pts,c,w,branches)=>{const d=smooth(pts);tube('heart','v',d,c,w,{nohalo:true});
    if(branches){for(let i=1;i<pts.length-1;i++){const [x,y]=pts[i];for(let k=0;k<branches;k++){const a=R()*Math.PI*2,l=8+R()*20;
      const p1=[x+Math.cos(a)*l*.5+(R()-.5)*6,y+Math.sin(a)*l*.5+(R()-.5)*6],p2=[x+Math.cos(a)*l,y+Math.sin(a)*l];
      ln('v',smooth([[x,y],p1,p2]),c,r2(Math.max(.5,w*.38)));
      if(R()<.5){const b=a+(R()-.5)*1.4;ln('v',smooth([p1,[p1[0]+Math.cos(b)*l*.5,p1[1]+Math.sin(b)*l*.5]]),c,.5);}}}}};
  const perp=(a,b,o)=>{const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy);return [-dy/l*o,dx/l*o];};
  const armPath=(o)=>{const p=perp(SH,WR,o);return [[400,232],[372,224],[SH[0]+p[0],SH[1]+p[1]],lerp(SH,EL,.5).map((v,i)=>v+p[i]),[EL[0]+p[0],EL[1]+p[1]],lerp(EL,WR,.5).map((v,i)=>v+p[i]),[WR[0]+p[0],WR[1]+p[1]],[60,382+o*.4],[36,394]];};
  [1,-1].forEach(s=>{
    const M=pts=>s>0?pts:pts.map(([x,y])=>[2*CX-x,y]);
    vessel(M(armPath(4)),ART,2.6,2);                                    // subclavian → brachial → radial
    vessel(M(armPath(-5)),VEN,2.6,2);                                   // cephalic / basilic veins
    vessel(M([[434,262],[430,210],[428,170],[426,140],[420,112],[410,90]]),ART,2.4,1);   // carotid
    vessel(M([[424,250],[420,200],[416,170],[412,140],[404,112]]),VEN,2.8,1);            // jugular
    vessel(M([[436,520],[420,548],[406,580],[400,640],[396,700],[392,750],[388,820],[386,880],[380,924],[366,950]]),ART,2.8,2);   // iliac → femoral → tibial
    vessel(M([[444,526],[428,552],[414,582],[410,640],[406,700],[402,752],[398,820],[396,880],[392,926]]),VEN,3,2);               // femoral vein
    vessel(M([[372,700],[366,760],[368,820],[374,880]]),VEN,1.6,2);                                                              // great saphenous
    vessel(M([[360,240],[340,226],[310,232],[284,252]]),VEN,1.4,3);                                                              // shoulder network
    vessel(M([[400,230],[378,250],[364,276],[350,300]]),ART,1.2,2);                                                              // thoracic branches
    vessel(M([[420,150],[406,128],[398,104],[404,70],[418,46]]),ART,1,2);                                                         // superficial temporal
  });
  tube('heart','v',smooth([[440,370],[440,440],[438,520]]),ART,4,{nohalo:true});                                               // descending aorta (behind)
  tube('heart','v',smooth([[452,262],[454,200],[452,150]]),VEN,4,{nohalo:true});                                               // superior vena cava

  // ---------------- Lymph + immune (zone: immune) ----------------
  organ('immune','ly',smooth([[430,236],[450,236],[456,256],[440,266],[424,256]],true),'#d8a6a0',{op:.85});               // thymus
  [[392,176],[384,166],[360,262],[352,272],[344,250],[396,600],[388,590],[404,612]].forEach(([x,y])=>both(ell(x,y,3.6,3.6),d=>organ('immune','ly',d,'#a6d27e',{shade:false})));
  both(smooth([[392,176],[372,220],[352,262],[364,330],[392,420],[398,520],[396,600]]),d=>ln('ly',d,'#a6d27e',.9,'stroke-opacity:.55;stroke-dasharray:3 4'));

  // ---------------- Hit areas so whole regions are tappable ----------------
  hitZone('brain',ell(440,70,42,46));

  // ---------------- Definitions ----------------
  const defs=`<defs>
<linearGradient id="skinG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6ad9c" stop-opacity=".62"/><stop offset=".45" stop-color="#d79483" stop-opacity=".5"/><stop offset="1" stop-color="#c47e6c" stop-opacity=".56"/></linearGradient>
<radialGradient id="skinShade" cx=".5" cy=".42" r=".62"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#3a1a14" stop-opacity=".45"/></radialGradient>
<radialGradient id="vol" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".26"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset=".8" stop-color="#000" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></radialGradient>
<radialGradient id="aura" cx=".5" cy=".5" r=".5"><stop offset=".8" stop-color="#000" stop-opacity="0"/><stop offset=".94" class="auraStop"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<linearGradient id="scanG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2bc4cf" stop-opacity="0"/><stop offset=".75" stop-color="#2bc4cf" stop-opacity=".05"/><stop offset=".92" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<pattern id="fibR" width="2.6" height="2.6" patternUnits="userSpaceOnUse" patternTransform="rotate(12)"><path d="M0,0 L0,2.6" stroke="#000" stroke-opacity=".24" stroke-width=".6"/></pattern>
<pattern id="fibL" width="2.6" height="2.6" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)"><path d="M0,0 L0,2.6" stroke="#000" stroke-opacity=".24" stroke-width=".6"/></pattern>
<pattern id="alv" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="2.2" fill="none" stroke="#fff" stroke-opacity=".13" stroke-width=".7"/></pattern>
<pattern id="rug" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><path d="M0,3 Q1.5,1 3,3 T6,3" fill="none" stroke="#7a3b33" stroke-opacity=".3" stroke-width=".7"/></pattern>
<filter id="rim" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur in="SourceAlpha" stdDeviation="9" result="bl"/><feFlood flood-color="#2bc4cf" flood-opacity=".07"/><feComposite in2="bl" operator="in" result="glow"/><feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<clipPath id="cpBody"><path d="${SKIN}"/></clipPath>
</defs>`;
  const g=(k,c,x)=>`<g class="${c}"${x||''}>${(lay[k]||[]).join('')}</g>`;
  return defs+
    `<ellipse class="zz-radiation aura fnA" data-z="radiation" cx="440" cy="490" rx="436" ry="486" fill="url(#aura)"/>`+
    g('sk','L-sk',' filter="url(#rim)"')+g('ml','L L-ml')+g('mt','L L-mt')+g('bp','L L-bp')+g('ba','L L-ba')+g('sd','L-sd')+g('o','L L-o')+g('v','L L-v')+g('ly','L L-ly')+
    `<rect class="scan" x="0" y="-60" width="880" height="60" fill="url(#scanG)" clip-path="url(#cpBody)"><animate attributeName="y" from="-60" to="980" dur="7s" repeatCount="indefinite"/></rect>`;
}
