/* ═══════════════════════════════════════════════════════════════════
   MAPA C.U.R.A. - LÓGICA COMPLETA (SIN RECORTES)
═══════════════════════════════════════════════════════════════════ */

const AR_RATIO = 1/2.1;
const SVG_CX0=93.25, SVG_CY0=26.18, SVG_CW=245.50, SVG_VW=432, SVG_VH=576;
const SVG_MH = SVG_CW / AR_RATIO;

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
  let inside=false; const n=AR_POLY.length;
  for(let i=0,j=n-1;i<n;j=i++){
    const xi=AR_POLY[i][0],yi=AR_POLY[i][1],xj=AR_POLY[j][0],yj=AR_POLY[j][1];
    if(((yi>ny)!==(yj>ny))&&(nx<(xj-xi)*(ny-yi)/(yj-yi)+xi)) inside=!inside;
  }
  return inside;
}

let svgPaths = []; let svgEl = null; let useNativePIP = false;

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
      const x = SVG_CX0 + nx*SVG_CW; const y = SVG_CY0 + ny*SVG_MH;
      const pt = new DOMPoint(x, y);
      return svgPaths.some(p => p.isPointInFill(pt));
    } catch(e){ }
  }
  return polyPIP(nx, ny);
}

const canvas = document.getElementById('mc');
const ctx = canvas.getContext('2d');
let W=0, H=0, dpr=window.devicePixelRatio||1;
let mx=-1, my=-1;

function mp(){
  const px=W*.055, py=H*.04, aw=W-2*px, ah=H-2*py;
  let mw=aw, mh=aw/AR_RATIO;
  if(mh>ah){ mh=ah; mw=ah*AR_RATIO; }
  return {ox:px+(aw-mw)/2, oy:py+(ah-mh)/2, mw, mh};
}
function txy(nx,ny){ const{ox,oy,mw,mh}=mp(); return{x:ox+nx*mw, y:oy+ny*mh}; }

function positionSVG(){
  const el=document.getElementById('ar-map'); if(!el) return;
  const{ox,oy,mw}=mp(); const scale=mw/SVG_CW;
  el.style.left=(ox-SVG_CX0*scale)+'px'; el.style.top=(oy-SVG_CY0*scale)+'px';
  el.style.width=(SVG_VW*scale)+'px'; el.style.height=(SVG_VH*scale)+'px';
}

function resize(){
  const cw=document.getElementById('cw'); if(!cw) return;
  W=cw.clientWidth; H=cw.clientHeight;
  canvas.width=W*dpr; canvas.height=H*dpr;
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
  ctx.scale(dpr,dpr); positionSVG();
}

function poissonDisk(minDist, maxPts, seeds){
  const pts=[], grid={}, active=[]; const cell=minDist/Math.SQRT2;
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
    if(isInside(s[0],s[1]) && !tooClose(s[0],s[1])) addPt(s[0],s[1]);
  }
  while(active.length && pts.length<maxPts){
    const idx=Math.floor(Math.random()*active.length);
    const base=active[idx]; let found=false;
    for(let k=0;k<30;k++){
      const angle=Math.random()*Math.PI*2; const r=minDist+Math.random()*minDist;
      const nx=base[0]+Math.cos(angle)*r, ny=base[1]+Math.sin(angle)*r;
      if(nx<0.02||nx>0.98||ny<0||ny>1.01 || !isInside(nx,ny) || tooClose(nx,ny)) continue;
      addPt(nx,ny); found=true; if(pts.length>=maxPts) break;
    }
    if(!found) active.splice(idx,1);
  }
  return pts;
}

// 24 PROVINCIAS COMPLETAS
const PRIMARY=[
  {id:'caba', name:'CABA', short:'CAB', x:0.743, y:0.376, s:5.5},
  {id:'pba',  name:'Buenos Aires', short:'PBA', x:0.656, y:0.448, s:5.0},
  {id:'cat',  name:'Catamarca', short:'CAT', x:0.312, y:0.164, s:3.0},
  {id:'cha',  name:'Chaco', short:'CHA', x:0.656, y:0.148, s:3.2},
  {id:'cht',  name:'Chubut', short:'CHT', x:0.240, y:0.678, s:2.8},
  {id:'cba',  name:'Córdoba', short:'CBA', x:0.490, y:0.316, s:4.5},
  {id:'cor',  name:'Corrientes', short:'CRR', x:0.804, y:0.214, s:3.2},
  {id:'eru',  name:'Entre Ríos', short:'ERS', x:0.728, y:0.316, s:3.2},
  {id:'for',  name:'Formosa', short:'FOR', x:0.670, y:0.090, s:3.0},
  {id:'juj',  name:'Jujuy', short:'JUJ', x:0.370, y:0.045, s:3.0},
  {id:'pam',  name:'La Pampa', short:'LPA', x:0.394, y:0.480, s:3.2},
  {id:'rio',  name:'La Rioja', short:'LRJ', x:0.332, y:0.240, s:3.0},
  {id:'mza',  name:'Mendoza', short:'MZA', x:0.246, y:0.394, s:3.8},
  {id:'mis',  name:'Misiones', short:'MIS', x:0.962, y:0.162, s:3.0},
  {id:'neu',  name:'Neuquén', short:'NEU', x:0.174, y:0.518, s:3.2},
  {id:'rng',  name:'Río Negro', short:'RNE', x:0.312, y:0.566, s:2.8},
  {id:'sal',  name:'Salta', short:'SAL', x:0.492, y:0.094, s:3.2}, 
  {id:'sju',  name:'San Juan', short:'SJN', x:0.232, y:0.270, s:3.0},
  {id:'slu',  name:'San Luis', short:'SLU', x:0.380, y:0.350, s:3.0},
  {id:'scr',  name:'Santa Cruz', short:'SCR', x:0.172, y:0.828, s:2.8},
  {id:'sfe',  name:'Santa Fe', short:'SFE', x:0.638, y:0.270, s:4.0},
  {id:'sgo',  name:'Santiago del Estero', short:'SGO', x:0.508, y:0.174, s:3.2},
  {id:'tdf',  name:'Tierra del Fuego', short:'TDF', x:0.270, y:0.980, s:2.8},
  {id:'tuc',  name:'Tucumán', short:'TUC', x:0.408, y:0.160, s:3.5}
];

let SECONDARY=[], ALL_NODES=[], CONNECTIONS=[], nodePhase={}, packets=[];
const PACKET_SPEED=0.003, MAX_PACKETS=40;

function rebuildNetwork(){
  const SEEDS=[[0.55,0.07],[0.42,0.10],[0.48,0.18],[0.62,0.20],[0.38,0.22],[0.55,0.30],[0.67,0.33],[0.32,0.30],[0.73,0.42],[0.48,0.40],[0.38,0.45],[0.58,0.47],[0.25,0.48],[0.65,0.52],[0.43,0.55],[0.23,0.60],[0.35,0.62],[0.52,0.60],[0.45,0.68],[0.30,0.68],[0.53,0.72],[0.22,0.72],[0.38,0.75],[0.30,0.78],[0.52,0.78],[0.27,0.83],[0.42,0.82],[0.36,0.88],[0.26,0.90],[0.30,0.94]];
  const raw = poissonDisk(0.068, 68, SEEDS);
  SECONDARY = raw.filter(pt => !PRIMARY.some(p => Math.hypot(p.x-pt[0],p.y-pt[1]) < 0.058))
    .map((pt,i)=>({id:'s'+i, x:pt[0], y:pt[1], s:1.55, isPrimary:false}));
  ALL_NODES=[...PRIMARY.map(n=>({...n,isPrimary:true})), ...SECONDARY];
  ALL_NODES.forEach(n=> nodePhase[n.id]=Math.random()*Math.PI*2);
  CONNECTIONS=[]; const cSet=new Set();
  PRIMARY.forEach((a,i)=>{
    const near=PRIMARY.map((b,j)=>({j,d:Math.hypot(a.x-b.x,a.y-b.y)})).filter(({j,d})=>j!==i && d<0.25).sort((a,b)=>a.d-b.d).slice(0,3);
    near.forEach(({j})=>{
      const ai=ALL_NODES.findIndex(n=>n.id===PRIMARY[i].id), bi=ALL_NODES.findIndex(n=>n.id===PRIMARY[j].id);
      const k=Math.min(ai,bi)+'-'+Math.max(ai,bi);
      if(!cSet.has(k)){ cSet.add(k); CONNECTIONS.push({a:ALL_NODES[ai], b:ALL_NODES[bi], type:'pp'}); }
    });
  });
  ALL_NODES.forEach((n,i)=>{
    if(n.isPrimary) return;
    const near=ALL_NODES.map((m,j)=>({j,d:Math.hypot(n.x-m.x,n.y-m.y)*(1+Math.abs(n.y-m.y)*0.35),isPrim:m.isPrimary})).filter(({j})=>j!==i).sort((a,b)=>a.d-b.d).slice(0,3);
    near.forEach(({j,d,isPrim})=>{
      if(d>0.12) return; const k=Math.min(i,j)+'-'+Math.max(i,j);
      if(!cSet.has(k)){ cSet.add(k); CONNECTIONS.push({a:ALL_NODES[i], b:ALL_NODES[j], type:isPrim?'sp':'ss'}); }
    });
  });
}

function drawNode(n, alpha, time){
  if(alpha<=0.01) return; const pos=txy(n.x,n.y);
  const bp=nodePhase[n.id]+time*1.1; const breathe=Math.sin(bp)*0.5+0.5;
  const dist=mx>0?Math.hypot(mx-pos.x,my-pos.y):9999;
  const prox=n.isPrimary?Math.max(0,1-dist/90):Math.max(0,1-dist/50);
  const r=n.s*1.4+breathe*(n.isPrimary?2.0:0.65)+prox*(n.isPrimary?4.5:2.2);
  const nAl=(n.isPrimary?(0.72+breathe*0.28):(0.45+breathe*0.25))*alpha;
  ctx.save();
  ctx.globalAlpha=nAl; ctx.fillStyle= (prox>0.3)?'#88E8FF':'#00C2FF';
  ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=n.isPrimary?9:5;
  ctx.beginPath();ctx.arc(pos.x,pos.y,r,0,Math.PI*2);ctx.fill();
  if(n.isPrimary && alpha>0.15){
    ctx.fillStyle='#C8EAFF'; ctx.font=`600 ${Math.max(9,n.s*1.7)}px 'Space Grotesk'`;
    ctx.textAlign='center'; ctx.fillText(n.short,pos.x,pos.y+r+12);
  }
  ctx.restore();
}

function drawConn(c, alpha=1){
  const p1=txy(c.a.x,c.a.y), p2=txy(c.b.x,c.b.y);
  const midX=(p1.x+p2.x)/2, midY=(p1.y+p2.y)/2;
  const dist=mx>0?Math.hypot(mx-midX,my-midY):9999;
  const prox=Math.max(0,1-dist/(W*0.15));
  const al=Math.min(0.92,(0.22+prox*0.45)*alpha);
  ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);
  ctx.strokeStyle=`rgba(41,211,255,${al})`; ctx.lineWidth=c.type==='pp'?1.4:0.9; ctx.stroke();
}

function spawnPacket(){
  if(CONNECTIONS.length===0) return;
  const c=CONNECTIONS[Math.floor(Math.random()*CONNECTIONS.length)];
  packets.push({conn:c, t:Math.random()});
  if(packets.length>MAX_PACKETS) packets.shift();
}

let D={ph:1, nA:{}, order:[], connReveal:0};
function initDespierta(){
  D={ph:1, nA:{}, order: [...ALL_NODES].sort((a,b)=> (a.isPrimary===b.isPrimary)?(a.y-b.y):(a.isPrimary?-1:1)).map(n=>n.id), connReveal:0};
  ALL_NODES.forEach(n=> D.nA[n.id]=0);
}

function loop(ts){
  if(!lastTs) lastTs=ts; const dt=Math.min((ts-lastTs)/1000, 0.05); lastTs=ts; br+=dt;
  ctx.clearRect(0,0,W,H);
  if(D.ph===1){
    const ni=Math.floor(br/0.05);
    for(let i=0; i<Math.min(ni, D.order.length); i++) D.nA[D.order[i]]=Math.min(1, (D.nA[D.order[i]]||0)+dt*5.5);
    if(ni>=D.order.length) D.ph=2;
  }
  if(D.ph===2){ D.connReveal=Math.min(1, D.connReveal+dt*0.65); if(D.connReveal>=1) D.ph=3; }
  
  const vis=Math.floor(D.connReveal*CONNECTIONS.length);
  for(let i=0;i<vis;i++) drawConn(CONNECTIONS[i],1.0);
  ALL_NODES.forEach(n=> drawNode(n,D.nA[n.id]||0,br));

  if(br>5 && Math.random()<0.08) spawnPacket();
  packets.forEach((p,i)=>{
    p.t+=PACKET_SPEED; if(p.t>=1){ packets.splice(i,1); return; }
    const x=p.conn.a.x+(p.conn.b.x-p.conn.a.x)*p.t, y=p.conn.a.y+(p.conn.b.y-p.conn.a.y)*p.t, pos=txy(x,y);
    ctx.beginPath(); ctx.arc(pos.x,pos.y,2.2,0,Math.PI*2); ctx.fillStyle="rgba(120,240,255,0.9)"; ctx.fill();
  });
  rafId=requestAnimationFrame(loop);
}

let rafId=null, lastTs=null, br=0;
window.addEventListener('load',()=>{
  initSVGPaths(); resize(); rebuildNetwork(); initDespierta();
  rafId=requestAnimationFrame(loop);
});
window.addEventListener('resize', resize);
canvas.addEventListener('mousemove',e=>{ const r=canvas.getBoundingClientRect(); mx=e.clientX-r.left; my=e.clientY-r.top; });
canvas.addEventListener('mouseleave',()=>{ mx=-1; my=-1; });
