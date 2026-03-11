
/* ═══════════════════════════════════════════════════════════════════
   CONSTANTES DE COORDENADAS
   txy(nx,ny) -> canvas px
   SVG usa viewBox 432×576; mapa dentro de esa viewBox:
   svgX = SVG_CX0 + nx * SVG_CW
   svgY = SVG_CY0 + ny * SVG_MH   (SVG_MH = SVG_CW / AR_RATIO)
═══════════════════════════════════════════════════════════════════ */
const AR_RATIO = 1/2.1;
const SVG_CX0=93.25, SVG_CY0=26.18, SVG_CW=245.50, SVG_VW=432, SVG_VH=576;
const SVG_MH = SVG_CW / AR_RATIO; // 515.55

/* ── Detección mobile/low-end ── */
const IS_MOBILE = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;

/* ── Cache de mp() — evita recalcular en cada txy() ── */
let _mpCache = null;

/* ── Polígono de respaldo para point-in-polygon si isPointInFill falla ── */
const AR_POLY=[
  [0.28,0.00],[0.34,0.00],[0.40,0.01],[0.47,0.02],[0.52,0.03],[0.58,0.03],[0.64,0.04],[0.70,0.06],[0.75,0.08],
  [0.80,0.11],[0.86,0.14],[0.90,0.18],[0.92,0.23],[0.90,0.29],[0.87,0.32],
  [0.84,0.35],[0.82,0.39],[0.84,0.44],[0.83,0.48],[0.82,0.52],[0.80,0.57],[0.78,0.61],
  [0.74,0.64],[0.71,0.68],[0.68,0.72],[0.65,0.76],[0.62,0.79],[0.60,0.82],[0.57,0.85],[0.55,0.88],
  [0.52,0.91],[0.49,0.94],[0.45,0.96],[0.41,0.97],[0.38,0.98],[0.34,0.97],[0.30,0.99],
  [0.24,0.96],[0.21,0.94],[0.18,0.89],[0.15,0.82],[0.13,0.75],[0.12,0.68],[0.13,0.62],
  [0.14,0.56],[0.15,0.50],[0.17,0.44],[0.18,0.38],[0.20,0.32],[0.22,0.26],[0.23,0.20],
  [0.25,0.14],[0.27,0.08],[0.28,0.04],[0.28,0.00]
];

function polyPIP(nx,ny){
  let inside=false;
  const n=AR_POLY.length;
  for(let i=0,j=n-1;i<n;j=i++){
    const xi=AR_POLY[i][0],yi=AR_POLY[i][1],xj=AR_POLY[j][0],yj=AR_POLY[j][1];
    if(((yi>ny)!==(yj>ny))&&(nx<(xj-xi)*(ny-yi)/(yj-yi)+xi)) inside=!inside;
  }
  return inside;
}

/* ── SVG paths para isPointInFill ── */
let svgPaths = [];
let svgEl = null;
let useNativePIP = false;

function initSVGPaths(){
  svgEl = document.getElementById('ar-map');
  if(!svgEl) return;
  svgPaths = Array.from(svgEl.querySelectorAll('path'));
  try {
    const pt = new DOMPoint(200, 200);
    svgPaths[0].isPointInFill(pt);
    useNativePIP = true;
  } catch(e){ useNativePIP = false; }
}

function isInside(nx, ny){
  if(nx<0||nx>1||ny<0||ny>1.02) return false;
  if(useNativePIP && svgEl && svgPaths.length){
    try {
      const x = SVG_CX0 + nx*SVG_CW;
      const y = SVG_CY0 + ny*SVG_MH;
      const pt = new DOMPoint(x, y);
      return svgPaths.some(p => p.isPointInFill(pt));
    } catch(e){ /* fallthrough */ }
  }
  return polyPIP(nx, ny);
}

/* ═══════════════════════════════════════════════════════════════════
   CANVAS + RESIZE
═══════════════════════════════════════════════════════════════════ */
const canvas = document.getElementById('mc');
const ctx = canvas.getContext('2d');
let W=0, H=0, dpr=window.devicePixelRatio||1;
let mx=-1, my=-1;

function mp() {
  if(_mpCache) return _mpCache;
  const px = W * 0.11;
  const py = H * 0.04;
  const aw = W - 2 * px;
  const ah = H - 2 * py;
  let mw = aw;
  let mh = aw / AR_RATIO;
  if (mh > ah) { mh = ah; mw = ah * AR_RATIO; }
  const ox = px + (aw - mw) / 2 + (mw * 0.015);
  const oy = py + (ah - mh) / 2 - (mh * 0.01);
  _mpCache = { ox, oy, mw, mh };
  return _mpCache;
}

function txy(nx, ny) {
  const {ox, oy, mw, mh} = mp();
  return { x: ox + nx * mw, y: oy + ny * mh };
}

function positionSVG() {
  const el = document.getElementById('ar-map');
  if (!el) return;
  const {ox, oy, mw} = mp();
  const scale = mw / SVG_CW;
  el.style.left = (ox - SVG_CX0 * scale) + 'px';
  el.style.top = (oy - SVG_CY0 * scale) + 'px';
  el.style.width = (SVG_VW * scale) + 'px';
  el.style.height = (SVG_VH * scale) + 'px';
}

function resize() {
  const cw = document.getElementById('cw');
  if (!cw) return;
  W = cw.clientWidth;
  H = cw.clientHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.scale(dpr, dpr);
  _mpCache = null; // invalidar cache al cambiar tamaño
  positionSVG();
}

/* ═══════════════════════════════════════════════════════════════════
   POISSON DISK SAMPLING dentro de Argentina
═══════════════════════════════════════════════════════════════════ */
function poissonDisk(minDist, maxPts, seeds){
  const pts=[], grid={}, active=[];
  const cell=minDist/Math.SQRT2;
  function key(x,y){ return Math.floor(x/cell)+','+Math.floor(y/cell); }
  function tooClose(x,y){
    const cx=Math.floor(x/cell),cy=Math.floor(y/cell);
    for(let dx=-2;dx<=2;dx++) for(let dy=-2;dy<=2;dy++){
      const p=grid[(cx+dx)+','+(cy+dy)];
      if(p&&Math.hypot(x-p[0],y-p[1])<minDist) return true;
    }
    return false;
  }
  function addPt(x,y){ pts.push([x,y]); grid[key(x,y)]=[x,y]; active.push([x,y]); }

  for(const s of seeds){
    if(pts.length>=maxPts) break;
    if(!isInside(s[0],s[1])) continue;
    if(!tooClose(s[0],s[1])) addPt(s[0],s[1]);
  }
  if(!active.length){
    for(let t=0;t<80;t++){
      const x=0.25+Math.random()*0.55, y=0.15+Math.random()*0.7;
      if(isInside(x,y)){ addPt(x,y); break; }
    }
  }

  while(active.length && pts.length<maxPts){
    const idx=Math.floor(Math.random()*active.length);
    const base=active[idx];
    let found=false;
    for(let k=0;k<30;k++){
      const angle=Math.random()*Math.PI*2;
      const r=minDist+Math.random()*minDist;
      const nx=base[0]+Math.cos(angle)*r;
      const ny=base[1]+Math.sin(angle)*r;
      if(nx<0.02||nx>0.98||ny<0||ny>1.01) continue;
      if(!isInside(nx,ny)) continue;
      if(tooClose(nx,ny)) continue;
      addPt(nx,ny); found=true;
      if(pts.length>=maxPts) break;
    }
    if(!found) active.splice(idx,1);
  }
  return pts;
}

/* ═══════════════════════════════════════════════════════════════════
   NODOS PRIMARIOS — 24 provincias
═══════════════════════════════════════════════════════════════════ */
const PRIMARY=[
 {id:'caba', name:'CABA',                short:'CAB', x:0.743, y:0.376, s:5.5},
  {id:'pba',  name:'Buenos Aires',       short:'PBA', x:0.656, y:0.448, s:5.0},
  {id:'cat',  name:'Catamarca',          short:'CAT', x:0.312, y:0.164, s:3.0},
  {id:'cha',  name:'Chaco',              short:'CHA', x:0.656, y:0.148, s:3.2},
  {id:'cht',  name:'Chubut',             short:'CHT', x:0.240, y:0.678, s:2.8},
  {id:'cba',  name:'Córdoba',            short:'CBA', x:0.490, y:0.316, s:4.5},
  {id:'cor',  name:'Corrientes',         short:'CRR', x:0.804, y:0.214, s:3.2},
  {id:'eru',  name:'Entre Ríos',         short:'ERS', x:0.728, y:0.316, s:3.2},
  {id:'for',  name:'Formosa',            short:'FOR', x:0.670, y:0.090, s:3.0},
  {id:'juj',  name:'Jujuy',              short:'JUJ', x:0.370, y:0.045, s:3.0},
  {id:'pam',  name:'La Pampa',           short:'LPA', x:0.394, y:0.480, s:3.2},
  {id:'rio',  name:'La Rioja',           short:'LRJ', x:0.332, y:0.240, s:3.0},
  {id:'mza',  name:'Mendoza',            short:'MZA', x:0.246, y:0.394, s:3.8},
  {id:'mis',  name:'Misiones',           short:'MIS', x:0.962, y:0.162, s:3.0},
  {id:'neu',  name:'Neuquén',            short:'NEU', x:0.174, y:0.518, s:3.2},
  {id:'rng',  name:'Río Negro',          short:'RNE', x:0.312, y:0.566, s:2.8},
  {id:'sal',  name:'Salta',              short:'SAL', x:0.492, y:0.094, s:3.2},
  {id:'sju',  name:'San Juan',           short:'SJN', x:0.232, y:0.270, s:3.0},
  {id:'slu',  name:'San Luis',           short:'SLU', x:0.380, y:0.350, s:3.0},
  {id:'scr',  name:'Santa Cruz',         short:'SCR', x:0.172, y:0.828, s:2.8},
  {id:'sfe',  name:'Santa Fe',           short:'SFE', x:0.638, y:0.270, s:4.0},
  {id:'sgo',  name:'Santiago del Estero',short:'SGO', x:0.508, y:0.174, s:3.2},
  {id:'tdf',  name:'Tierra del Fuego',   short:'TDF', x:0.270, y:0.980, s:2.8},
  {id:'tuc',  name:'Tucumán',            short:'TUC', x:0.408, y:0.160, s:3.5}
];

/* ═══════════════════════════════════════════════════════════════════
   RED — Nodos secundarios + conexiones
═══════════════════════════════════════════════════════════════════ */
let SECONDARY=[], ALL_NODES=[], CONNECTIONS=[];
let NODES_SEC=[], NODES_PRI=[]; // listas pre-filtradas
let nodePhase={};

/* Límites según dispositivo */
const MAX_PULSES  = IS_MOBILE ? 12 : 80;
const MAX_PKTS    = IS_MOBILE ? 8  : 30;
const SPAWN_PROB  = IS_MOBILE ? 0.02 : 0.04;

let DATA_PKTS=[];
let PKT_ENABLED_CONNS=new Set();
let pktLastRefresh=0;

function rebuildNetwork(){
  const SEEDS=[
    [0.55,0.07],[0.42,0.10],[0.48,0.18],[0.62,0.20],[0.38,0.22],
    [0.55,0.30],[0.67,0.33],[0.32,0.30],[0.73,0.42],[0.48,0.40],
    [0.38,0.45],[0.58,0.47],[0.25,0.48],[0.65,0.52],[0.43,0.55],
    [0.23,0.60],[0.35,0.62],[0.52,0.60],[0.45,0.68],[0.30,0.68],
    [0.53,0.72],[0.22,0.72],[0.38,0.75],[0.30,0.78],[0.52,0.78],
    [0.27,0.83],[0.42,0.82],[0.36,0.88],[0.26,0.90],[0.30,0.94],
  ];

  const maxPts = IS_MOBILE ? 40 : 68;
  const raw = poissonDisk(0.068, maxPts, SEEDS);
  const MIN_GAP = 0.058;

  SECONDARY = raw
    .filter(pt => !PRIMARY.some(p => Math.hypot(p.x-pt[0],p.y-pt[1]) < MIN_GAP))
    .map((pt,i)=>({
      id:'s'+i, name:null, short:null,
      x:pt[0], y:pt[1], s:1.55, isPrimary:false
    }));

  ALL_NODES=[
    ...PRIMARY.map(n=>({...n,isPrimary:true})),
    ...SECONDARY
  ];

  NODES_PRI = ALL_NODES.filter(n=> n.isPrimary);
  NODES_SEC = ALL_NODES.filter(n=>!n.isPrimary);

  nodePhase={};
  ALL_NODES.forEach(n=>{ nodePhase[n.id]=Math.random()*Math.PI*2; });

  CONNECTIONS=[];
  const cSet=new Set();
  const MAX_DIST=0.12, K=3;

  PRIMARY.forEach((a,i)=>{
    const near=PRIMARY
      .map((b,j)=>({j,d:Math.hypot(a.x-b.x,a.y-b.y)}))
      .filter(({j,d})=>j!==i && d<0.25)
      .sort((a,b)=>a.d-b.d).slice(0,3);
    near.forEach(({j})=>{
      const ai=ALL_NODES.findIndex(n=>n.id===PRIMARY[i].id);
      const bi=ALL_NODES.findIndex(n=>n.id===PRIMARY[j].id);
      const k=Math.min(ai,bi)+'-'+Math.max(ai,bi);
      if(!cSet.has(k)){ cSet.add(k); CONNECTIONS.push({a:ALL_NODES[ai],b:ALL_NODES[bi],type:'pp'}); }
    });
  });

  ALL_NODES.forEach((n,i)=>{
    if(n.isPrimary) return;
    const near=ALL_NODES
      .map((m,j)=>{ const dx=n.x-m.x,dy=n.y-m.y; let d=Math.sqrt(dx*dx+dy*dy); d=d*(1+Math.abs(n.y-m.y)*0.35); return {j,d,isPrim:m.isPrimary}; })
      .filter(({j})=>j!==i).sort((a,b)=>a.d-b.d).slice(0,K);
    near.forEach(({j,d,isPrim})=>{
      if(d>MAX_DIST) return;
      const k=Math.min(i,j)+'-'+Math.max(i,j);
      if(!cSet.has(k)){ cSet.add(k); CONNECTIONS.push({a:ALL_NODES[i],b:ALL_NODES[j],type:isPrim?'sp':'ss'}); }
    });
  });

  ALL_NODES.forEach(n=>{
    const hasConn=CONNECTIONS.some(c=>c.a.id===n.id||c.b.id===n.id);
    if(!hasConn){
      let nearest=null,best=Infinity;
      ALL_NODES.forEach(o=>{ if(o.id===n.id) return; const d=(n.x-o.x)**2+(n.y-o.y)**2; if(d<best){best=d;nearest=o;} });
      if(nearest) CONNECTIONS.push({a:n,b:nearest,type:(n.isPrimary||nearest.isPrimary)?'sp':'ss'});
    }
  });

  function buildOuterHull(){
    const cx=ALL_NODES.reduce((s,n)=>s+n.x,0)/ALL_NODES.length;
    const cy=ALL_NODES.reduce((s,n)=>s+n.y,0)/ALL_NODES.length;
    const nodes=ALL_NODES.map(n=>({node:n,angle:Math.atan2(n.y-cy,n.x-cx),dist:Math.hypot(n.x-cx,n.y-cy)}));
    const outer=nodes.sort((a,b)=>b.dist-a.dist).slice(0,26);
    outer.sort((a,b)=>a.angle-b.angle);
    for(let i=0;i<outer.length;i++){
      const a=outer[i].node,b=outer[(i+1)%outer.length].node;
      if(Math.hypot(a.x-b.x,a.y-b.y)<0.18) CONNECTIONS.push({a,b,type:'edge'});
    }
  }
  buildOuterHull();

  DATA_PKTS=[];
  pktLastRefresh=0;
  refreshActiveConns();
}

/* ═══════════════════════════════════════════════════════════════════
   FUNCIONES DE DIBUJO
═══════════════════════════════════════════════════════════════════ */
function drawNode(n, alpha, time){
  if(alpha<=0.01) return;
  const pos=txy(n.x,n.y);
  const bp=nodePhase[n.id]+time*1.1;
  const breathe=Math.sin(bp)*0.5+0.5;
  const dist=mx>0?Math.hypot(mx-pos.x,my-pos.y):9999;
  const prox=n.isPrimary?Math.max(0,1-dist/90):Math.max(0,1-dist/50);
  const r=n.s*1.4+breathe*(n.isPrimary?2.0:0.65)+prox*(n.isPrimary?4.5:2.2);
  const gI=(0.20+breathe*0.25+prox*0.42)*alpha;
  const col=(prox>0.3)?'#88E8FF':'#00C2FF';
  const nAl=(n.isPrimary?(0.72+breathe*0.28):(0.45+breathe*0.25))*alpha;

  ctx.save();

  if(!IS_MOBILE){
    /* Halo radial — solo desktop */
    const gR=r*(n.isPrimary?(2.8+prox*2.0):2.5);
    const g=ctx.createRadialGradient(pos.x,pos.y,0,pos.x,pos.y,gR);
    g.addColorStop(0,`rgba(0,194,255,${gI*0.50})`);
    g.addColorStop(1,'transparent');
    ctx.beginPath();ctx.arc(pos.x,pos.y,gR,0,Math.PI*2);
    ctx.fillStyle=g;ctx.fill();
  }

  ctx.globalAlpha=nAl;
  if(!IS_MOBILE){ ctx.shadowColor=col; ctx.shadowBlur=n.isPrimary?9:5; }
  ctx.fillStyle=col;
  ctx.beginPath();ctx.arc(pos.x,pos.y,r,0,Math.PI*2);ctx.fill();
  if(n.isPrimary){
    ctx.strokeStyle=`rgba(255,255,255,${0.40*nAl})`;ctx.lineWidth=0.9;ctx.stroke();
  }
  if(!IS_MOBILE) ctx.shadowBlur=0;

  if(n.isPrimary&&alpha>0.15){
    const la=Math.min(1,alpha*0.9+prox*0.1);
    ctx.globalAlpha=la;
    ctx.fillStyle='#C8EAFF';
    ctx.font=`600 ${Math.max(9,n.s*1.7)}px 'Space Grotesk',sans-serif`;
    ctx.textAlign='center';ctx.textBaseline='top';
    if(!IS_MOBILE){ ctx.shadowColor='rgba(0,3,16,0.92)';ctx.shadowBlur=6; }
    ctx.fillText(n.short,pos.x,pos.y+r+3);
    if(!IS_MOBILE) ctx.shadowBlur=0;
  }
  ctx.globalAlpha=1;ctx.restore();
}

function drawConn(c, alpha=1){
  if(alpha<=0) return;
  const p1=txy(c.a.x,c.a.y),p2=txy(c.b.x,c.b.y);
  const midX=(p1.x+p2.x)/2,midY=(p1.y+p2.y)/2;
  const dist=mx>0?Math.hypot(mx-midX,my-midY):9999;
  const maxD=c.type==='pp'?W*0.22:W*0.15;
  const prox=Math.max(0,1-dist/maxD);
  const baseAl=c.type==='pp'?0.42:0.22;
  const al=Math.min(0.92,(baseAl+prox*0.45)*alpha);
  const lw=c.type==='pp'?(1.4+prox*1.8):(0.9+prox*0.9);
  const col=(prox>0.25)?`rgba(100,228,255,${al})`:`rgba(41,211,255,${al})`;
  ctx.save();
  if(!IS_MOBILE && c.type==='pp'){
    ctx.shadowColor='rgba(41,211,255,0.35)';
    ctx.shadowBlur=4;
  }
  ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);
  ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.stroke();
  if(!IS_MOBILE) ctx.shadowBlur=0;
  ctx.restore();
}

function drawNeuralPulse(p){
  if(p.trail.length<2) return;
  ctx.save();
  const trailStart = IS_MOBILE ? Math.max(0, p.trail.length-5) : 1;
  for(let i=trailStart+1;i<p.trail.length;i++){
    const r=i/p.trail.length;
    ctx.beginPath();
    ctx.moveTo(p.trail[i-1].x,p.trail[i-1].y);
    ctx.lineTo(p.trail[i].x,p.trail[i].y);
    ctx.strokeStyle=p.col.replace(/[\d.]+\)$/,r*0.55+')');
    ctx.lineWidth=p.size*r;ctx.stroke();
  }
  const h=p.trail[p.trail.length-1];
  if(!IS_MOBILE){ ctx.shadowColor=p.col;ctx.shadowBlur=10; }
  ctx.fillStyle='#fff';ctx.globalAlpha=0.92;
  ctx.beginPath();ctx.arc(h.x,h.y,p.size,0,Math.PI*2);ctx.fill();
  if(!IS_MOBILE) ctx.shadowBlur=0;
  ctx.globalAlpha=1;ctx.restore();
}

/* ═══════════════════════════════════════════════════════════════════
   PAQUETES DE DATOS
═══════════════════════════════════════════════════════════════════ */
function refreshActiveConns(){
  PKT_ENABLED_CONNS.clear();
  const total=Math.max(1,Math.floor(CONNECTIONS.length*0.15));
  const pool=[...Array(CONNECTIONS.length).keys()].sort(()=>Math.random()-0.5);
  for(let i=0;i<total;i++) PKT_ENABLED_CONNS.add(pool[i]);
}

function tickDataPackets(dt){
  if(br-pktLastRefresh>8){ refreshActiveConns(); pktLastRefresh=br; }

  if(Math.random()<SPAWN_PROB && DATA_PKTS.length<MAX_PKTS){
    const ci=[...PKT_ENABLED_CONNS][Math.floor(Math.random()*PKT_ENABLED_CONNS.size)];
    if(ci===undefined) return;
    const c=CONNECTIONS[ci];
    if(!c) return;
    const rev=Math.random()<0.5;
    const fr=rev?c.b:c.a, to=rev?c.a:c.b;
    const p1=txy(fr.x,fr.y), p2=txy(to.x,to.y);
    DATA_PKTS.push({
      sx:p1.x,sy:p1.y,ex:p2.x,ey:p2.y,
      t:0, speed:0.003+Math.random()*0.004,
      size:1.5+Math.random()*0.8,
      col:Math.random()<0.6?'rgba(41,211,255,0.85)':'rgba(0,255,180,0.75)',
      trail:[],trailMax: IS_MOBILE ? 4 : 7,done:false
    });
  }

  for(let i=DATA_PKTS.length-1;i>=0;i--){
    const p=DATA_PKTS[i];
    p.t=Math.min(1,p.t+p.speed);
    const e=p.t<0.5?2*p.t*p.t:1-Math.pow(-2*p.t+2,2)/2;
    const cx=p.sx+(p.ex-p.sx)*e, cy=p.sy+(p.ey-p.sy)*e;
    p.trail.push({x:cx,y:cy});
    if(p.trail.length>p.trailMax)p.trail.shift();
    if(p.t>=1){DATA_PKTS.splice(i,1);continue;}

    ctx.save();
    if(!IS_MOBILE){
      for(let j=1;j<p.trail.length;j++){
        const r=j/p.trail.length;
        ctx.beginPath();
        ctx.moveTo(p.trail[j-1].x,p.trail[j-1].y);
        ctx.lineTo(p.trail[j].x,p.trail[j].y);
        ctx.strokeStyle=p.col.replace(/[\d.]+\)$/,r*0.45+')');
        ctx.lineWidth=p.size*r*0.7;ctx.stroke();
      }
    }
    const h=p.trail[p.trail.length-1]||{x:cx,y:cy};
    if(!IS_MOBILE){ ctx.shadowColor=p.col;ctx.shadowBlur=5; }
    ctx.fillStyle='rgba(255,255,255,0.9)';ctx.globalAlpha=0.88;
    ctx.beginPath();ctx.arc(h.x,h.y,p.size,0,Math.PI*2);ctx.fill();
    if(!IS_MOBILE) ctx.shadowBlur=0;
    ctx.globalAlpha=1;ctx.restore();
  }
}

/* ═══════════════════════════════════════════════════════════════════
   ANIMACION — Argentina que Despierta
═══════════════════════════════════════════════════════════════════ */
let D={};
function initDespierta(){
  D={ph:1,connReveal:0,nA:{},order:[],pulses:[]};
  D.order=[...ALL_NODES]
    .sort((a,b)=>{
      if(a.isPrimary && !b.isPrimary) return -1;
      if(!a.isPrimary && b.isPrimary) return 1;
      return a.y - b.y;
    })
    .map(n=>n.id);
  ALL_NODES.forEach(n=>{ D.nA[n.id]=0; });
}

function tickDespierta(dt){
  const ni=Math.floor(br/0.05);
  if(D.ph===1){
    for(let i=0;i<Math.min(ni,D.order.length);i++)
      D.nA[D.order[i]]=Math.min(1,(D.nA[D.order[i]]||0)+dt*5.5);
    if(ni>=D.order.length) D.ph=2;
  }
  if(D.ph===2){
    D.connReveal=Math.min(1,D.connReveal+dt*0.65);
    if(D.connReveal>=1) D.ph=3;
  }
  if(D.ph>=3){
    if(Math.random()<0.04 && D.pulses.length<MAX_PULSES){
      const pool=CONNECTIONS.filter(c=>c.type==='pp');
      if(pool.length){
        const c=pool[Math.floor(Math.random()*pool.length)];
        const rev=Math.random()<0.5;
        const fr=rev?c.b:c.a,to=rev?c.a:c.b;
        const p1=txy(fr.x,fr.y),p2=txy(to.x,to.y);
        D.pulses.push({sx:p1.x,sy:p1.y,ex:p2.x,ey:p2.y,
          t:0,speed:0.005+Math.random()*0.005,
          size:2.0,col:'rgba(136,232,255,0.90)',
          trail:[],trailMax: IS_MOBILE ? 8 : 16,done:false});
      }
    }
    /* Pulsos hover — solo desktop */
    if(!IS_MOBILE && mx>0 && Math.random()<0.08){
      let bN=null,bD=Infinity;
      PRIMARY.forEach(n=>{ const p=txy(n.x,n.y),d=Math.hypot(mx-p.x,my-p.y); if(d<bD){bD=d;bN=n;} });
      if(bN&&bD<85){
        const tgts=CONNECTIONS.filter(c=>c.a.id===bN.id||c.b.id===bN.id).map(c=>c.a.id===bN.id?c.b:c.a);
        if(tgts.length){
          const to=tgts[Math.floor(Math.random()*tgts.length)];
          const p1=txy(bN.x,bN.y),p2=txy(to.x,to.y);
          D.pulses.push({sx:p1.x,sy:p1.y,ex:p2.x,ey:p2.y,
            t:0,speed:0.018+Math.random()*0.01,
            size:3.0,col:'rgba(255,255,255,0.95)',
            trail:[],trailMax:22,done:false});
        }
      }
    }
  }

  const vis=D.ph>=2?Math.floor(D.connReveal*CONNECTIONS.length):0;
  for(let i=0;i<vis;i++) drawConn(CONNECTIONS[i],1.0);

  /* Usar listas pre-filtradas — sin crear arrays nuevos por frame */
  for(let i=0;i<NODES_SEC.length;i++) drawNode(NODES_SEC[i],D.nA[NODES_SEC[i].id]||0,br);
  for(let i=0;i<NODES_PRI.length;i++) drawNode(NODES_PRI[i],D.nA[NODES_PRI[i].id]||0,br);

  for(let i=D.pulses.length-1;i>=0;i--){
    const p=D.pulses[i];
    p.t=Math.min(1,p.t+p.speed);
    const e=p.t<0.5?2*p.t*p.t:1-Math.pow(-2*p.t+2,2)/2;
    const cx=p.sx+(p.ex-p.sx)*e,cy=p.sy+(p.ey-p.sy)*e;
    p.trail.push({x:cx,y:cy});
    if(p.trail.length>p.trailMax)p.trail.shift();
    if(p.t>=1){D.pulses.splice(i,1);continue;}
    drawNeuralPulse(p);
  }

  if(D.ph>=3) tickDataPackets(dt);
}

/* ═══════════════════════════════════════════════════════════════════
   LOOP PRINCIPAL — pausa cuando el mapa no es visible en pantalla
═══════════════════════════════════════════════════════════════════ */
let ANIM=0;
let rafId=null, lastTs=null, br=0;
let isVisible=true;

function loop(ts){
  rafId=requestAnimationFrame(loop);
  if(!isVisible){ lastTs=null; return; } // pausa el render, sin cancelar rAF

  if(!lastTs)lastTs=ts;
  const dt=Math.min((ts-lastTs)/1000,0.05);
  lastTs=ts; br+=dt;
  ctx.clearRect(0,0,W,H);
  if(ANIM===0) tickDespierta(dt);
}

/* ── Mouse ── */
canvas.addEventListener('mousemove',e=>{
  const r=canvas.getBoundingClientRect();
  mx=e.clientX-r.left; my=e.clientY-r.top;
  const tip=document.getElementById('tip');
  let found=null;
  PRIMARY.forEach(n=>{ const p=txy(n.x,n.y); if(Math.hypot(p.x-mx,p.y-my)<n.s*3.5)found=n; });
  if(found){ tip.textContent=found.name; tip.style.display='block';
    tip.style.left=(mx+16)+'px'; tip.style.top=(my-12)+'px'; }
  else tip.style.display='none';
});
canvas.addEventListener('mouseleave',()=>{ mx=-1;my=-1;document.getElementById('tip').style.display='none'; });

/* ── IntersectionObserver: pausa render cuando el mapa está fuera de pantalla ── */
const _observer = new IntersectionObserver(entries=>{
  isVisible = entries[0].isIntersecting;
}, { threshold: 0.05 });

/* ── Resize ── */
window.addEventListener('resize', ()=>{ resize(); });

/* ── INICIO ── */
window.addEventListener('load',()=>{
  initSVGPaths();
  resize();
  rebuildNetwork();
  initDespierta();
  _observer.observe(document.getElementById('cw'));
  rafId=requestAnimationFrame(loop);
});
