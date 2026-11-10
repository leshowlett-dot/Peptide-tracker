"use strict";
/* ---------- Charts ---------- */
const CW=340, CML=40, CMR=12, CMT=14, CMB=28;
function mountMedChart(){
  const svg=document.getElementById("medChart"); if(!svg) return;
  const now=Date.now(), R=S.settings.range, t0=now-R*DAY*2/3, t1=now+R*DAY/3, H=230;
  const drugs = modelDrugs();
  const set=new Set(); const N=240;
  for(let i=0;i<=N;i++) set.add(Math.round(t0+(t1-t0)*i/N));
  set.add(Math.round(now));
  S.shots.forEach(s=>{ if(s.ts>t0&&s.ts<t1&&parts(s.drug).some(([pid])=>drugs.some(d=>d.id===pid))){ set.add(s.ts-1); set.add(s.ts); } });
  const ts=[...set].sort((a,b)=>a-b);
  const series=drugs.map(d=>({d,pts:ts.map(t=>[t,level(d.id,t)])}));
  let ymax=0; series.forEach(s=>s.pts.forEach(p=>{ if(p[1]>ymax) ymax=p[1]; })); ymax*=1.05; if(ymax<=0) ymax=1;
  const PW=CW-CML-CMR, PH=H-CMT-CMB;
  const X=t=>CML+(t-t0)/(t1-t0)*PW, Y=v=>H-CMB-v/ymax*PH;
  const path=pts=>pts.map((p,i)=>(i?"L":"M")+X(p[0]).toFixed(1)+" "+Y(p[1]).toFixed(1)).join("");
  const mcg=ymax<0.1, sc=mcg?1000:1;
  let g=`<text x="2" y="10">${mcg?"mcg":"mg"}</text>`;
  for(let i=0;i<=3;i++){ const v=ymax*i/3, y=Y(v); g+=`<line x1="${CML}" x2="${CW-CMR}" y1="${y}" y2="${y}" stroke="var(--grid)" stroke-width="1"/><text x="${CML-4}" y="${y+3}" text-anchor="end">${i===0?0:fmtNum(v*sc,3)}</text>`; }
  g+=`<line x1="${X(now)}" x2="${X(now)}" y1="${CMT}" y2="${H-CMB}" stroke="var(--muted)" stroke-width="1" opacity=".5"/>`;
  g+=`<text x="${CML}" y="${H-8}">${fmtShort(t0)} ${new Date(t0).getFullYear()}</text><text x="${X(now)}" y="${H-8}" text-anchor="middle">Now</text><text x="${CW-CMR}" y="${H-8}" text-anchor="end">${fmtShort(t1)} ${new Date(t1).getFullYear()}</text>`;
  series.forEach(s=>{
    const past=s.pts.filter(p=>p[0]<=now), fut=s.pts.filter(p=>p[0]>=now);
    g+=`<path d="${path(past)}" fill="none" stroke="${s.d.color}" stroke-width="2" stroke-linejoin="round"/>`;
    g+=`<path d="${path(fut)}" fill="none" stroke="${s.d.color}" stroke-width="2" stroke-dasharray="2 5" stroke-linecap="round"/>`;
  });
  g+=`<line id="cLine" y1="${CMT}" y2="${H-CMB}" stroke="var(--text)" stroke-width="1" stroke-dasharray="3 3"/>`;
  g+=series.map((s,i)=>`<circle id="cDot${i}" r="4" fill="${s.d.color}" stroke="var(--card)" stroke-width="1.5"/>`).join("");
  svg.innerHTML=g;
  const ro=document.getElementById("readout");
  function setCursor(t){
    t=Math.max(t0,Math.min(t1,t)); cursorT=t;
    const x=X(t); const ln=svg.querySelector("#cLine"); ln.setAttribute("x1",x); ln.setAttribute("x2",x);
    let html=`<div><b>${fmtDate(t)} · ${fmtTime(t)}</b>${t>now?` <span class="muted small">(projection)</span>`:""}</div>`;
    series.forEach((s,i)=>{ const v=level(s.d.id,t); const c=svg.querySelector("#cDot"+i); c.setAttribute("cx",x); c.setAttribute("cy",Y(v));
      html+=`<div><span class="dot" style="background:${s.d.color}"></span>${esc(s.d.name)}: ≈ ${fmtAmt(v)}</div>`; });
    ro.innerHTML=html;
  }
  const fromEvent=e=>{ const r=svg.getBoundingClientRect(); const px=(e.clientX-r.left)/r.width*CW; return t0+(px-CML)/PW*(t1-t0); };
  svg.addEventListener("pointerdown",e=>setCursor(fromEvent(e)));
  svg.addEventListener("pointermove",e=>{ if(e.buttons||e.pointerType==="mouse") setCursor(fromEvent(e)); });
  svg.addEventListener("keydown",e=>{
    const step=(t1-t0)/100; let c=cursorT??now;
    if(e.key==="ArrowLeft"){ setCursor(c-step); e.preventDefault(); }
    else if(e.key==="ArrowRight"){ setCursor(c+step); e.preventDefault(); }
    else if(e.key==="Home"){ setCursor(t0); e.preventDefault(); }
    else if(e.key==="End"){ setCursor(t1); e.preventDefault(); }
  });
  setCursor(cursorT??now);
}
function mountWeightChart(){
  const svg=document.getElementById("wChart"); if(!svg) return;
  const r=S.settings.wRange||"all"; let pts=S.weights;
  if(r!=="all") pts=pts.filter(w=>w.ts>=Date.now()-Number(r)*DAY);
  if(pts.length<2){ svg.outerHTML=`<div class="empty" id="wChart">${S.weights.length<2?"Log at least two weigh-ins to see a trend.":"Not enough weigh-ins in this period."}</div>`; return; }
  const H=200, t0=pts[0].ts, t1=pts[pts.length-1].ts;
  let lo=Math.min(...pts.map(p=>p.kg)), hi=Math.max(...pts.map(p=>p.kg)); const pad=(hi-lo||1)*0.08; lo-=pad; hi+=pad;
  const PW=CW-CML-CMR, PH=H-CMT-CMB;
  const X=t=>CML+(t1===t0?0:(t-t0)/(t1-t0))*PW, Y=v=>H-CMB-(v-lo)/(hi-lo)*PH;
  let g=""; for(let i=0;i<=3;i++){ const v=lo+(hi-lo)*i/3, y=Y(v); g+=`<line x1="${CML}" x2="${CW-CMR}" y1="${y}" y2="${y}" stroke="var(--grid)"/><text x="${CML-4}" y="${y+3}" text-anchor="end">${fmtNum(v,1)}</text>`; }
  g+=`<text x="${CML}" y="${H-8}">${fmtShort(t0)}</text><text x="${CW-CMR}" y="${H-8}" text-anchor="end">${fmtShort(t1)}</text>`;
  g+=`<path d="${pts.map((p,i)=>(i?"L":"M")+X(p.ts).toFixed(1)+" "+Y(p.kg).toFixed(1)).join("")}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>`;
  g+=pts.map(p=>`<circle cx="${X(p.ts)}" cy="${Y(p.kg)}" r="3.5" fill="var(--accent)"><title>${fmtNum(p.kg,1)} kg · ${fmtDate(p.ts)}</title></circle>`).join("");
  svg.innerHTML=g;
}

/* ---------- Render & events ---------- */
function applyTheme(){ document.documentElement.dataset.theme=S.settings.theme; }
function render(){
  applyTheme();
  const views={today:viewToday,shots:viewShots,progress:viewProgress,journal:viewJournal,calc:viewCalc,settings:viewSettings,stock:viewStock,stack:viewStack};
  document.getElementById("app").innerHTML=views[tab]();
  document.getElementById("nav").innerHTML=TABS.map(([id,l,ic])=>`<button data-tab="${id}" class="${id===tab?"on":""}" ${id===tab?'aria-current="page"':""}><span class="ic">${ic}</span>${l}</button>`).join("");
  mountMedChart(); mountWeightChart(); calcUpdate();
}
function download(name,text){
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([text],{type:"application/json"})); a.download=name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function demoData(){
  const now=Date.now(), start=now-70*DAY; S.shots=[]; S.weights=[]; S.journal=[];
  for(let i=0;i<10;i++){ S.shots.push({id:uid(),drug:"tirzepatide",mg:i<4?2.5:5,ts:start+i*7*DAY,site:SITES[i%6],note:""}); }
  [[0,128],[28,121.5],[49,115],[70,109.4]].forEach(([d,kg])=>S.weights.push({id:uid(),kg,ts:start+d*DAY,note:""}));
  S.journal.push({id:uid(),ts:now-2*DAY,mood:4,sym:["Low appetite"],note:"Steady energy today."});
  S.settings.goalWeight=S.settings.goalWeight||90; S.settings.drug="tirzepatide";
  S.inv={items:[{id:uid(),kind:"peptide",drug:"tirzepatide",mgPer:10,qty:2,low:1,name:""},{id:uid(),kind:"needle",name:"31G 8 mm pen needles",qty:40,low:10},
    {id:uid(),kind:"syringe",name:"U-100 1 mL",qty:8,low:10},{id:uid(),kind:"bac",name:"Bacteriostatic water 30 mL",qty:22,low:10}],
    vials:[{id:uid(),drug:"tirzepatide",mgTotal:10,mgLeft:6.5,ml:2,ts:now-9*DAY}],log:[]};
}
/* ---------- Stack (my regular compounds) ---------- */
const FREQS=["As needed","Daily","Twice daily","Every other day","Twice weekly","Weekly","Every 2 weeks","Monthly"];
const compTag=d=>d.comps?`<span class="tag" style="cursor:default;padding:2px 10px">Blend</span>`:"";
function stackText(it){ return `${fmtAmt(it.mg)} ${(it.freq||"as needed").toLowerCase()}${it.note?" · "+esc(it.note):""}`; }
function stackHtml(){
  const L=S.stack;
  return `<section class="card"><h2>My stack</h2>
  ${L.length?`<div class="list">${L.map((it,i)=>{ const d=drugById(it.drug); return `<div><div class="item" style="border-left:5px solid ${d.color};padding-left:12px">
    <div style="flex:1"><div class="t">${esc(d.name)} ${compTag(d)}</div><div class="muted">${stackText(it)}</div>
    ${!parts(d.id).every(([pid])=>halfLife(pid))?`<div class="small" style="color:var(--danger)">Half-life not set – level can't be estimated</div>`:""}</div>
    <div class="row" style="flex:0 0 auto;flex-direction:column;gap:6px;align-items:stretch">
      <button class="btn sm" data-action="stackUp" data-id="${it.id}" aria-label="Move up" ${i?"":"disabled"}>▲</button>
      <button class="btn sm" data-action="stackDown" data-id="${it.id}" aria-label="Move down" ${i<L.length-1?"":"disabled"}>▼</button></div></div>
    <div class="row" style="margin-top:8px;justify-content:flex-start"><button class="btn sm primary" data-action="stackLog" data-id="${it.id}">Log</button><button class="btn sm" data-action="stackEdit" data-id="${it.id}">Edit</button><button class="btn sm danger" data-action="stackDel" data-id="${it.id}">Remove</button></div></div>`; }).join("")}</div>`
  :`<div class="empty">Your stack is empty. Add the compounds you take regularly, then log each in one tap.</div>`}
  <div class="row" style="margin-top:14px"><button class="btn primary" data-action="stackAdd">Add to stack</button></div></section>`;
}
function openPicker(){
  closeModal();
  const w=document.createElement("div"); w.className="overlay"; w.id="modal";
  w.innerHTML=`<div class="sheet" role="dialog" aria-label="Select compound"><div class="sheet-head"><h2>Select compound</h2><button type="button" class="icon-btn" data-close aria-label="Close">✕</button></div>
    <input id="pickQ" type="text" placeholder="Search compounds" autocomplete="off" style="margin:14px 0 8px">
    <button class="btn" data-action="customCompound" style="width:100%">Can't find it? Add any compound</button><div id="pickList"></div></div>`;
  document.body.appendChild(w);
  w.addEventListener("click",e=>{ if(e.target===w||e.target.closest("[data-close]")) closeModal(); });
  renderPick(); w.querySelector("#pickQ").focus();
}
function renderPick(){
  const q=(document.getElementById("pickQ")?.value||"").trim().toLowerCase(), el=document.getElementById("pickList"); if(!el) return;
  const all=allDrugs().filter(d=>!q||d.name.toLowerCase().includes(q)||d.group.toLowerCase().includes(q));
  const row=d=>`<div class="item" data-pick="${esc(d.id)}" tabindex="0" role="button" style="cursor:pointer;padding:12px 0;border-top:1px solid var(--card-line)"><span><span class="dot" style="background:${d.color}"></span>${esc(d.name)}</span>${d.comps?compTag(d):(d.hl>0?"":`<span class="small muted">half-life?</span>`)}</div>`;
  let html="";
  if(!q){ const mc=MOST_COMMON.map(id=>all.find(d=>d.id===id)).filter(Boolean); html+=`<div class="subh">Most common</div>`+mc.map(row).join(""); }
  const cats=[...CAT_ORDER,...new Set(all.map(d=>d.group).filter(g=>!CAT_ORDER.includes(g)))];
  cats.forEach(c=>{ const ds=all.filter(d=>d.group===c).sort((a,b)=>a.name.localeCompare(b.name)); if(ds.length) html+=`<div class="subh">${esc(c)}</div>`+ds.map(row).join(""); });
  el.innerHTML=html||`<div class="empty">No matches. Use “Add any compound” above.</div>`;
}
function hlFields(ids){
  const need=ids.filter(id=>!halfLife(id)); if(!need.length) return "";
  return `<h3>Half-life needed</h3><p class="muted small">This app doesn't have a half-life for ${need.map(id=>esc(drugById(id).name)).join(", ")}. Enter one from your own source to estimate levels, or leave blank to just log doses.</p>`+
   need.map(id=>`<label class="f">${esc(drugById(id).name)} half-life</label><div class="row"><input name="hl_${esc(id)}" type="number" step="any" min="0" inputmode="decimal" placeholder="Unknown" style="flex:2"><select name="hu_${esc(id)}" style="flex:1"><option value="h">hours</option><option value="d">days</option></select></div>`).join("");
}
function stackModal(drugId,editId){
  const ex=editId?S.stack.find(s=>s.id===editId):null, d=drugById(ex?.drug||drugId);
  const useMcg=ex&&ex.mg<0.1, ps=parts(d.id);
  const ratio=d.comps?`<h3>Blend ratio</h3><p class="muted small">The app doesn't know how much of each component is in ${esc(d.name)}. Enter the mg of each in your vial (or any consistent ratio) so levels can be split correctly.</p>`+
    d.comps.map((c,i)=>`<label class="f">${esc(drugById(c[0]).name)} (mg)</label><input name="share${i}" type="number" step="any" min="0" inputmode="decimal" value="${fmtNum((S.blends[d.id]||d.comps.map(x=>x[1]))[i],4)}">`).join(""):"";
  showModal(ex?"Edit stack item":"Add to stack",`
    <div class="t" style="font-size:20px"><span class="dot" style="background:${d.color}"></span>${esc(d.name)}</div>
    <label class="f">Dose per use</label>
    <div class="row"><input name="dose" type="number" step="any" min="0" inputmode="decimal" placeholder="e.g. 2.5" value="${ex?esc(fmtNum(useMcg?ex.mg*1000:ex.mg,4)):""}" style="flex:2"><select name="unit" style="flex:1"><option value="mg" ${useMcg?"":"selected"}>mg</option><option value="mcg" ${useMcg?"selected":""}>mcg</option></select></div>
    <label class="f">How often</label><select name="freq">${FREQS.map(f=>`<option ${((ex?.freq)||"As needed")===f?"selected":""}>${f}</option>`).join("")}</select>
    <label class="f">Notes</label><input name="note" type="text" maxlength="100" value="${esc(ex?.note||"")}" placeholder="Optional (e.g. morning, fasted)">
    ${ratio}${hlFields(ps.map(p=>p[0]))}`,
  fd=>{
    let dose=parseFloat(fd.get("dose")); if(!(dose>0)) return "Enter a dose greater than 0."; if(fd.get("unit")==="mcg") dose/=1000;
    if(d.comps){ const sh=d.comps.map((c,i)=>parseFloat(fd.get("share"+i))); if(sh.some(x=>!(x>0))) return "Enter an amount greater than 0 for every blend component."; S.blends[d.id]=sh; }
    for(const [pid] of ps){ const v=parseFloat(fd.get("hl_"+pid)); if(v>0) S.settings.halfLives[pid]=fd.get("hu_"+pid)==="h"?v/24:v; }
    const rec={id:ex?.id||uid(),drug:d.id,mg:dose,freq:fd.get("freq"),note:fd.get("note").trim()};
    if(ex) Object.assign(ex,rec); else S.stack.push(rec);
    save(); toast("Stack saved");
  });
}
function customCompoundModal(){
  showModal("Add any compound",`
    <label class="f">Name</label><input name="name" type="text" maxlength="60" placeholder="Compound or blend name">
    <label class="f">Category</label><select name="cat">${[...CAT_ORDER].map(c=>`<option ${c==="Other"?"selected":""}>${c}</option>`).join("")}</select>
    <label class="f">Half-life (optional)</label>
    <div class="row"><input name="hl" type="number" step="any" min="0" inputmode="decimal" placeholder="Unknown" style="flex:2"><select name="hu" style="flex:1"><option value="h">hours</option><option value="d">days</option></select></div>
    <p class="muted small">Leave blank if you don't know it – you can still log doses and add it later in Settings. For a blend you can't split, enter a single effective half-life or leave it blank.</p>`,
  fd=>{
    const name=fd.get("name").trim(); if(!name) return "Enter a name.";
    if(allDrugs().some(d=>d.name.toLowerCase()===name.toLowerCase())) return "That compound already exists.";
    const v=parseFloat(fd.get("hl")); const hl=v>0?(fd.get("hu")==="h"?v/24:v):null;
    const c={id:"c_"+uid(),name,hl,group:fd.get("cat")}; S.custom.push(c); save();
    setTimeout(()=>stackModal(c.id),0); toast("Compound added");
  });
}
function moveStack(id,dir){ const i=S.stack.findIndex(s=>s.id===id), j=i+dir; if(i<0||j<0||j>=S.stack.length) return; [S.stack[i],S.stack[j]]=[S.stack[j],S.stack[i]]; save(); render(); }

