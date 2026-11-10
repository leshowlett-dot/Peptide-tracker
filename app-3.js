"use strict";
/* ---------- Stock / inventory ---------- */
const KINDS={peptide:{label:"Peptide vials",unit:"vials",low:1,step:1},needle:{label:"Needles",unit:"pcs",low:10,step:1},
  syringe:{label:"Syringes",unit:"pcs",low:10,step:1},bac:{label:"Bacteriostatic water",unit:"mL",low:10,step:5},other:{label:"Other supplies",unit:"pcs",low:5,step:1}};
const PH={peptide:"",needle:"e.g. 31G 8 mm",syringe:"e.g. U-100 1 mL",bac:"e.g. BAC water 30 mL",other:"e.g. Alcohol swabs"};
const r3=x=>Math.round(x*1000)/1000;
const itemsOf=k=>S.inv.items.filter(i=>i.kind===k);
const itemName=i=>i.kind==="peptide"?`${drugById(i.drug).name} · ${fmtNum(i.mgPer,3)} mg vial${i.batch?" · #"+i.batch:""}`:i.name;
const norm=s=>String(s||"").trim().toLowerCase();
const suppliers=()=>[...new Set([...S.inv.items,...S.inv.vials,...S.coas].map(x=>(x.supplier||"").trim()).filter(Boolean))].sort();
const supList=()=>`<datalist id="supList">${suppliers().map(s=>`<option value="${esc(s)}">`).join("")}</datalist>`;
const isExpired=x=>x.expiry&&new Date(x.expiry+"T23:59:59").getTime()<Date.now();
function coaFor(batch,drug){ return norm(batch)?(S.coas.find(c=>norm(c.batch)===norm(batch)&&c.drug===drug)||null):null; }
function coaStatus(i){
  if(!norm(i.batch)) return {level:"warn",text:"No batch number recorded"};
  const c=coaFor(i.batch,i.drug); if(!c) return {level:"bad",text:`No CoA on file for batch ${i.batch}`};
  const label=i.mgPer??i.mgTotal, notes=[];
  if(c.mgTested>0&&label>0&&Math.abs(c.mgTested-label)/label>0.1) notes.push(`CoA tested ${fmtNum(c.mgTested,3)} mg vs ${fmtNum(label,3)} mg label`);
  if(c.supplier&&i.supplier&&norm(c.supplier)!==norm(i.supplier)) notes.push(`CoA supplier "${c.supplier}" differs`);
  return {level:notes.length?"warn":"ok",coa:c,text:`CoA on file${c.purity>0?` · ${fmtNum(c.purity,2)}% purity`:""}${notes.length?" · ⚠ "+notes.join("; "):""}`};
}
function metaHtml(i){
  const st=coaStatus(i), col=st.level==="ok"?"var(--accent)":st.level==="warn"?"#e0a63a":"var(--danger)";
  const bits=[i.supplier?esc(i.supplier):"",i.batch?"Batch "+esc(i.batch):"",i.expiry?(isExpired(i)?`<b style="color:var(--danger)">Expired ${fmtDate(new Date(i.expiry).getTime())}</b>`:"Exp "+fmtDate(new Date(i.expiry).getTime())):""].filter(Boolean);
  return `${bits.length?`<div class="small muted">${bits.join(" · ")}</div>`:""}<div class="small" style="color:${col}">${st.level==="ok"?"✓":"⚠"} ${esc(st.text)}</div>`;
}
const vialName=v=>`${drugById(v.drug).name} · opened ${fmtShort(v.ts)}`;
function invLog(text){ S.inv.log.unshift({ts:Date.now(),text}); if(S.inv.log.length>60) S.inv.log.length=60; }
function stockAlerts(){
  const out=[];
  S.inv.items.forEach(i=>{ const low=i.low??KINDS[i.kind].low; if(i.qty<=low) out.push(`${itemName(i)}: ${fmtNum(i.qty,1)} ${KINDS[i.kind].unit} left`); });
  S.inv.items.forEach(i=>{ if(i.kind!=="peptide"||!(i.qty>0)) return; if(isExpired(i)) out.push(`${itemName(i)} has expired`); if(norm(i.batch)&&!coaFor(i.batch,i.drug)) out.push(`No CoA on file for batch ${i.batch} (${drugById(i.drug).name})`); });
  S.inv.vials.forEach(v=>{ const ld=[...S.shots].reverse().find(s=>s.drug===v.drug); if(ld&&v.mgLeft<ld.mg-1e-9) out.push(`${vialName(v)} has ${fmtNum(v.mgLeft,3)} mg left – less than your last dose`); });
  return out;
}
function lowStockHtml(){
  const a=stockAlerts(); if(!a.length) return "";
  return `<section class="card warn"><div class="t" style="font-weight:800;font-size:18px">Low stock</div>${a.map(x=>`<div>• ${esc(x)}</div>`).join("")}
  <div class="row" style="margin-top:10px"><button class="btn sm" data-tab="stock">Open stock</button></div></section>`;
}
function stockSec(drugId){
  const vials=S.inv.vials.filter(v=>v.drug===drugId&&v.mgLeft>0), nd=itemsOf("needle").filter(i=>i.qty>0), sy=itemsOf("syringe").filter(i=>i.qty>0);
  if(!vials.length&&!nd.length&&!sy.length) return `<p class="muted small">Nothing in stock for this compound. Add vials and supplies in the Stock tab to deduct automatically.</p>`;
  const sel=(name,label,arr,lab)=>`<label class="f">${label}</label><select name="${name}"><option value="">Don't deduct</option>${arr.map((x,n)=>`<option value="${x.id}" ${n?"":"selected"}>${esc(lab(x))}</option>`).join("")}</select>`;
  return sel("vial","Draw from vial",vials,v=>`${vialName(v)} · ${fmtNum(v.mgLeft,3)} mg left`)+`<div class="small muted" id="drawHint"></div>`
    +sel("needle","Needle (−1)",nd,i=>`${i.name} · ${fmtNum(i.qty,0)} left`)+sel("syringe","Syringe (−1)",sy,i=>`${i.name} · ${fmtNum(i.qty,0)} left`);
}
function updateHints(){
  const m=document.getElementById("modal"); if(!m) return; const f=m.querySelector("form");
  const dh=m.querySelector("#drawHint");
  if(dh){
    let dose=parseFloat(f.elements.dose?.value); if(f.elements.unit?.value==="mcg") dose/=1000;
    const v=S.inv.vials.find(x=>x.id===f.elements.vial?.value);
    if(dose>0&&v&&v.ml>0){ const vol=dose/(v.mgTotal/v.ml); dh.textContent=`Draw ≈ ${fmtNum(vol,3)} mL (${fmtNum(vol*100,1)} units on a U-100 syringe) · ${fmtNum(v.mgLeft,3)} mg in vial`; } else dh.textContent="";
  }
  const rh=m.querySelector("#reconHint");
  if(rh){ const it=S.inv.items.find(i=>i.id===f.elements.pep?.value), ml=parseFloat(f.elements.ml?.value); rh.textContent=(it&&ml>0)?`Concentration ≈ ${fmtNum(it.mgPer/ml,3)} mg/mL`:""; }
}
function syncKind(){
  const m=document.getElementById("modal"), k=m?.querySelector("[name=kind]")?.value; if(!k) return;
  m.querySelectorAll("[data-kinds]").forEach(e=>e.style.display=e.dataset.kinds.split(",").includes(k)?"":"none");
  const nm=m.querySelector("[name=name]"); if(nm) nm.placeholder=PH[k];
  const q=m.querySelector("#qtyLbl"); if(q) q.textContent=`Quantity (${KINDS[k].unit})`;
  const lw=m.querySelector("[name=low]"); if(lw) lw.placeholder="Default: "+KINDS[k].low;
}
function itemModal(id){
  const ex=id?S.inv.items.find(i=>i.id===id):null;
  showModal(ex?"Edit stock item":"Add stock item",`
    <label class="f">Type</label><select name="kind">${Object.entries(KINDS).map(([k,v])=>`<option value="${k}" ${ex&&ex.kind===k?"selected":""}>${v.label}</option>`).join("")}</select>
    <div data-kinds="peptide"><label class="f">Compound</label>${drugCombo(ex?.drug||S.settings.drug)}
    <label class="f">mg per vial</label><input name="mgper" type="number" step="any" min="0" inputmode="decimal" value="${ex?.mgPer??""}" placeholder="e.g. 10">
    <label class="f">Supplier</label><input name="supplier" type="text" list="supList" maxlength="80" value="${esc(ex?.supplier||"")}" placeholder="Optional">${supList()}
    <label class="f">Batch / lot number</label><input name="batch" type="text" maxlength="60" value="${esc(ex?.batch||"")}" placeholder="Match this against your CoA">
    <label class="f">Expiry date</label><input name="expiry" type="date" value="${esc(ex?.expiry||"")}"></div>
    <div data-kinds="needle,syringe,bac,other"><label class="f">Name</label><input name="name" type="text" maxlength="60" value="${esc(ex?.name||"")}"></div>
    <label class="f" id="qtyLbl">Quantity</label><input name="qty" type="number" step="any" min="0" inputmode="decimal" value="${ex?.qty??""}">
    <label class="f">Low-stock alert at or below</label><input name="low" type="number" step="any" min="0" inputmode="decimal" value="${ex?.low??""}">`,
  fd=>{
    const kind=fd.get("kind"), qty=parseFloat(fd.get("qty")); if(!(qty>=0)) return "Enter a quantity (0 or more).";
    const lr=fd.get("low").trim(), rec={id:ex?.id||uid(),kind,qty,low:lr===""?null:parseFloat(lr)};
    if(kind==="peptide"){ const mg=parseFloat(fd.get("mgper")); if(!(mg>0)) return "Enter mg per vial."; rec.drug=fd.get("drug"); rec.mgPer=mg; rec.name=""; rec.supplier=fd.get("supplier").trim(); rec.batch=fd.get("batch").trim(); rec.expiry=fd.get("expiry")||""; }
    else { const n=fd.get("name").trim(); if(!n) return "Enter a name."; rec.name=n; }
    if(ex) Object.assign(ex,rec); else S.inv.items.push(rec);
    invLog(`${ex?"Updated":"Added"} ${itemName(rec)}: ${fmtNum(qty,1)} ${KINDS[kind].unit}`); save(); toast("Stock saved");
  });
  syncKind();
}
function reconModal(prefillMl){
  const peps=itemsOf("peptide").filter(i=>i.qty>=1), bacs=itemsOf("bac").filter(i=>i.qty>0), syr=itemsOf("syringe").filter(i=>i.qty>0);
  if(!peps.length){ toast("Add an unopened peptide vial to Inventory first (or use “Add opened vial”)"); return; }
  const sel=(name,label,arr,lab)=>`<label class="f">${label}</label><select name="${name}"><option value="">Don't deduct</option>${arr.map((x,n)=>`<option value="${x.id}" ${n?"":"selected"}>${esc(lab(x))}</option>`).join("")}</select>`;
  showModal("Reconstitute a vial",`
    <label class="f">Vial from stock (−1)</label><select name="pep">${peps.map(i=>`<option value="${i.id}">${esc(itemName(i))} · ${fmtNum(i.qty,0)} in stock</option>`).join("")}</select>
    <label class="f">Bacteriostatic water added (mL)</label><input name="ml" type="number" step="any" min="0" inputmode="decimal" value="${prefillMl||2}">
    <div class="small muted" id="reconHint"></div>
    ${sel("bac","Take water from (−mL)",bacs,i=>`${i.name} · ${fmtNum(i.qty,1)} mL left`)}
    ${sel("syr","Syringe used to add water (−1)",syr,i=>`${i.name} · ${fmtNum(i.qty,0)} left`)}
    <label class="f">Date & time</label><input name="when" type="datetime-local" value="${toLocalInput(Date.now())}">`,
  fd=>{
    const it=S.inv.items.find(i=>i.id===fd.get("pep")), ml=parseFloat(fd.get("ml")), ts=fromLocalInput(fd.get("when"));
    if(!it) return "Choose a vial."; if(!(ml>0)) return "Enter the water volume in mL."; if(!isFinite(ts)) return "Enter a valid date.";
    const bac=S.inv.items.find(i=>i.id===fd.get("bac")), sy=S.inv.items.find(i=>i.id===fd.get("syr"));
    if(bac&&bac.qty<ml-1e-9) return `Only ${fmtNum(bac.qty,1)} mL left in that bottle.`;
    it.qty=Math.max(0,it.qty-1); if(bac) bac.qty=r3(bac.qty-ml); if(sy) sy.qty=Math.max(0,sy.qty-1);
    const v={id:uid(),drug:it.drug,mgTotal:it.mgPer,mgLeft:it.mgPer,ml,ts,supplier:it.supplier||"",batch:it.batch||"",expiry:it.expiry||""}; S.inv.vials.push(v);
    invLog(`Reconstituted ${fmtNum(it.mgPer,3)} mg ${drugById(it.drug).name} in ${fmtNum(ml,2)} mL (−1 vial${bac?`, −${fmtNum(ml,2)} mL BAC`:""}${sy?", −1 syringe":""})`);
    save(); toast("Vial reconstituted · stock updated");
  },"Reconstitute");
  updateHints();
}
function vialModal(id){
  const ex=id?S.inv.vials.find(v=>v.id===id):null;
  showModal(ex?"Adjust vial":"Add opened vial",`
    <label class="f">Compound</label>${drugCombo(ex?.drug||S.settings.drug)}
    <label class="f">Total mg in vial</label><input name="tot" type="number" step="any" min="0" inputmode="decimal" value="${ex?.mgTotal??""}">
    <label class="f">mg remaining</label><input name="left" type="number" step="any" min="0" inputmode="decimal" value="${ex?.mgLeft??""}" placeholder="Blank = full">
    <label class="f">Water added (mL)</label><input name="ml" type="number" step="any" min="0" inputmode="decimal" value="${ex?.ml??""}">
    <label class="f">Supplier</label><input name="supplier" type="text" list="supList" maxlength="80" value="${esc(ex?.supplier||"")}">${supList()}
    <label class="f">Batch / lot number</label><input name="batch" type="text" maxlength="60" value="${esc(ex?.batch||"")}">
    <label class="f">Reconstituted on</label><input name="when" type="datetime-local" value="${toLocalInput(ex?.ts||Date.now())}">`,
  fd=>{
    const tot=parseFloat(fd.get("tot")), ml=parseFloat(fd.get("ml")), ts=fromLocalInput(fd.get("when")), lr=fd.get("left").trim(), left=lr===""?tot:parseFloat(lr);
    if(!(tot>0)) return "Enter the total mg."; if(!(ml>0)) return "Enter the water volume."; if(!(left>=0&&left<=tot)) return "Remaining mg must be between 0 and the total."; if(!isFinite(ts)) return "Enter a valid date.";
    const rec={id:ex?.id||uid(),drug:fd.get("drug"),mgTotal:tot,mgLeft:left,ml,ts,supplier:fd.get("supplier").trim(),batch:fd.get("batch").trim()};
    if(ex) Object.assign(ex,rec); else S.inv.vials.push(rec);
    invLog(`${ex?"Adjusted":"Added opened"} vial ${vialName(rec)}: ${fmtNum(left,3)}/${fmtNum(tot,3)} mg`); save(); toast("Vial saved");
  });
}
function viewStock(){
  const al=stockAlerts(), vials=S.inv.vials, lastDose=id=>[...S.shots].reverse().find(s=>s.drug===id);
  const groups=Object.entries(KINDS).map(([k,K])=>{
    const its=itemsOf(k); if(!its.length) return "";
    return `<div class="subh">${K.label}</div><div class="list">${its.map(i=>{ const low=i.qty<=(i.low??K.low);
      return `<div><div class="item"><div><div class="t">${esc(itemName(i))}</div><div class="${low?"":"muted"}" ${low?'style="color:var(--danger)"':""}>${fmtNum(i.qty,1)} ${K.unit}${low?" · low":""}</div>${i.kind==="peptide"?metaHtml(i):""}</div>
      <div class="row" style="flex:0 0 auto;justify-content:flex-end"><button class="btn sm" data-action="qty" data-id="${i.id}" data-n="${-K.step}" aria-label="Remove ${K.step}">−${K.step}</button><button class="btn sm" data-action="qty" data-id="${i.id}" data-n="${K.step}" aria-label="Add ${K.step}">+${K.step}</button>
      <button class="btn sm" data-action="editItem" data-id="${i.id}">Edit</button><button class="btn sm danger" data-action="delItem" data-id="${i.id}" aria-label="Remove item">✕</button></div></div></div>`; }).join("")}</div>`;
  }).join("");
  return header("Stock")+(al.length?`<section class="card warn"><h2>Low stock</h2>${al.map(a=>`<div>• ${esc(a)}</div>`).join("")}</section>`:"")+`
  <section class="card"><h2>Active vials</h2>
    <p class="muted small">Reconstituted vials you're drawing from. Logging a shot can deduct the dose from one automatically.</p>
    ${vials.length?`<div class="list">${vials.map(v=>{ const d=drugById(v.drug), pct=v.mgTotal>0?v.mgLeft/v.mgTotal*100:0, ld=lastDose(v.drug), conc=v.ml>0?v.mgTotal/v.ml:0;
      return `<div><div class="t"><span class="dot" style="background:${d.color}"></span>${esc(vialName(v))}</div>
      <div class="muted">${fmtNum(v.mgLeft,3)} of ${fmtNum(v.mgTotal,3)} mg left · ${fmtNum(conc,3)} mg/mL (${fmtNum(v.ml,2)} mL)</div>${v.batch||v.supplier?metaHtml(v):""}
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="small muted">Opened ${ago(v.ts)}${ld&&ld.mg>0?` · ≈ ${Math.floor(v.mgLeft/ld.mg+1e-9)} doses of ${fmtAmt(ld.mg)} left`:""}</div>
      <div class="row" style="margin-top:10px;justify-content:flex-start"><button class="btn sm" data-action="editVial" data-id="${v.id}">Adjust</button><button class="btn sm danger" data-action="delVial" data-id="${v.id}">Discard</button></div></div>`; }).join("")}</div>`
      :`<div class="empty">No active vials.</div>`}
    <div class="row" style="margin-top:14px"><button class="btn primary" data-action="recon">Reconstitute a vial</button><button class="btn" data-action="addVial">Add opened vial</button></div>
  </section>
  <section class="card"><h2>Inventory</h2>
    ${groups||`<div class="empty">No supplies yet. Add unopened peptide vials, needles, syringes and bacteriostatic water.</div>`}
    <div class="row" style="margin-top:16px"><button class="btn primary" data-action="addItem">Add stock item</button></div>
  </section>
  ${coaCardHtml()}
  <section class="card"><h2>Stock activity</h2>
    ${S.inv.log.length?`<div class="list">${S.inv.log.slice(0,15).map(l=>`<div><div class="muted small">${fmtDate(l.ts)} · ${fmtTime(l.ts)}</div><div>${esc(l.text)}</div></div>`).join("")}</div>`:`<div class="empty">Nothing yet.</div>`}
  </section>`+footerHtml();
}

/* ---------- CoA files (IndexedDB) & batch watch ---------- */
const idb=()=>new Promise((res,rej)=>{ const r=indexedDB.open("pt-files",1); r.onupgradeneeded=()=>r.result.createObjectStore("f"); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
const idbDo=(mode,fn)=>idb().then(d=>new Promise((res,rej)=>{ const t=d.transaction("f",mode), rq=fn(t.objectStore("f")); t.oncomplete=()=>res(rq&&rq.result); t.onerror=()=>rej(t.error); }));
const fput=(k,b)=>idbDo("readwrite",s=>s.put(b,k)), fget=k=>idbDo("readonly",s=>s.get(k)), fdel=k=>idbDo("readwrite",s=>s.delete(k));
const toB64=b=>new Promise(r=>{ const f=new FileReader(); f.onload=()=>r(String(f.result).split(",")[1]); f.readAsDataURL(b); });
const fromB64=(d,t)=>{ const bin=atob(d), u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return new Blob([u],{type:t}); };
async function openCoaFile(id){
  const c=S.coas.find(x=>x.id===id);
  try{
    const b=await fget(id); if(!b){ toast("No file stored for this CoA"); return; }
    const url=URL.createObjectURL(new Blob([b],{type:c?.file?.type||b.type}));
    if(!window.open(url,"_blank")){ const a=document.createElement("a"); a.href=url; a.download=c?.file?.name||"coa"; document.body.appendChild(a); a.click(); a.remove(); }
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(e){ toast("Couldn't open the file"); }
}
function linkedCount(c){
  const m=x=>x.drug===c.drug&&norm(x.batch)===norm(c.batch);
  return {items:S.inv.items.filter(i=>i.kind==="peptide"&&m(i)).length, vials:S.inv.vials.filter(m).length, shots:S.shots.filter(s=>s.drug===c.drug&&norm(s.use?.batch)===norm(c.batch)).length};
}
function coaModal(id){
  const ex=id?S.coas.find(c=>c.id===id):null;
  showModal(ex?"Edit CoA":"Add CoA",`
    <label class="f">Compound</label>${drugCombo(ex?.drug||S.settings.drug)}
    <label class="f">Batch / lot number</label><input name="batch" type="text" maxlength="60" value="${esc(ex?.batch||"")}">
    <label class="f">Supplier</label><input name="supplier" type="text" list="supList" maxlength="80" value="${esc(ex?.supplier||"")}">${supList()}
    <label class="f">Testing lab</label><input name="lab" type="text" maxlength="80" value="${esc(ex?.lab||"")}" placeholder="Optional">
    <label class="f">Test date</label><input name="date" type="date" value="${esc(ex?.date||"")}">
    <div class="grid2"><div><label class="f">Purity (%)</label><input name="purity" type="number" step="any" min="0" max="100" inputmode="decimal" value="${ex?.purity??""}"></div>
    <div><label class="f">Tested mg per vial</label><input name="mgt" type="number" step="any" min="0" inputmode="decimal" value="${ex?.mgTested??""}"></div></div>
    <label class="f">Notes</label><input name="notes" type="text" maxlength="200" value="${esc(ex?.notes||"")}" placeholder="e.g. endotoxin result, pass/fail">
    <label class="f">CoA file (PDF or image)${ex?.file?` · current: ${esc(ex.file.name)}`:""}</label><input name="file" type="file" accept="application/pdf,image/*">
    ${ex?.file?`<label class="f"><input type="checkbox" name="rmfile"> Remove stored file</label>`:""}`,
  fd=>{
    const batch=fd.get("batch").trim(); if(!batch) return "Enter the batch / lot number.";
    const num=k=>{ const v=parseFloat(fd.get(k)); return v>=0?v:null; };
    const rec={id:ex?.id||uid(),drug:fd.get("drug"),batch,supplier:fd.get("supplier").trim(),lab:fd.get("lab").trim(),date:fd.get("date")||"",purity:num("purity"),mgTested:num("mgt"),notes:fd.get("notes").trim(),file:ex?.file||null};
    const f=fd.get("file");
    if(f&&f.size>0){ if(f.size>25e6) return "File is larger than 25 MB."; rec.file={name:f.name,type:f.type||"application/octet-stream",size:f.size}; fput(rec.id,f).then(render).catch(()=>toast("Couldn't store the file in this browser")); }
    else if(ex?.file&&fd.get("rmfile")){ rec.file=null; fdel(rec.id).catch(()=>{}); }
    if(ex) Object.assign(ex,rec); else S.coas.push(rec);
    save(); toast("CoA saved");
  });
}
function coaCardHtml(){
  const peps=S.inv.items.filter(i=>i.kind==="peptide"&&i.qty>0);
  const watch=[...peps,...S.inv.vials.map(v=>({...v,qty:null}))];
  const bad=watch.filter(x=>coaStatus(x).level!=="ok");
  return `<section class="card"><h2>Batch watch &amp; CoAs</h2>
    <p class="muted small">Add each certificate of analysis with its batch number. Stock and active vials with a matching batch are checked automatically.</p>
    ${watch.length?`<div class="list">${watch.map(x=>{const st=coaStatus(x), col=st.level==="ok"?"var(--accent)":st.level==="warn"?"#e0a63a":"var(--danger)";
      return `<div><div class="t" style="font-size:16px">${x.qty===null?esc(vialName(x)):esc(itemName(x))}</div><div class="small" style="color:${col}">${st.level==="ok"?"✓":"⚠"} ${esc(st.text)}</div></div>`;}).join("")}</div>
      <div class="small ${bad.length?"":"muted"}" style="margin-top:8px;${bad.length?"color:var(--danger)":""}">${bad.length?`${bad.length} batch${bad.length>1?"es need":" needs"} attention`:"All current batches have a matching CoA"}</div>`
      :`<div class="empty">No peptide stock yet.</div>`}
    <div class="subh">Certificates</div>
    ${S.coas.length?`<div class="list">${[...S.coas].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(c=>{const d=drugById(c.drug), L=linkedCount(c);
      return `<div><div class="t" style="font-size:17px"><span class="dot" style="background:${d.color}"></span>${esc(d.name)} · batch ${esc(c.batch)}</div>
      <div class="small muted">${[c.supplier,c.lab,c.date?fmtDate(new Date(c.date).getTime()):"",c.purity!=null?fmtNum(c.purity,2)+"% purity":"",c.mgTested!=null?fmtNum(c.mgTested,3)+" mg tested":""].filter(Boolean).map(esc).join(" · ")}</div>
      ${c.notes?`<div class="small">${esc(c.notes)}</div>`:""}
      <div class="small muted">${L.items+L.vials+L.shots?`Linked: ${L.items} stock, ${L.vials} active vial${L.vials===1?"":"s"}, ${L.shots} shot${L.shots===1?"":"s"}`:"No stock uses this batch yet"}</div>
      <div class="row" style="margin-top:8px;justify-content:flex-start">${c.file?`<button class="btn sm" data-action="viewCoa" data-id="${c.id}">View file</button>`:""}<button class="btn sm" data-action="editCoa" data-id="${c.id}">Edit</button><button class="btn sm danger" data-action="delCoa" data-id="${c.id}">Delete</button></div></div>`;}).join("")}</div>`
      :`<div class="empty">No CoAs saved.</div>`}
    <div class="row" style="margin-top:14px"><button class="btn primary" data-action="addCoa">Add CoA</button></div></section>`;
}
async function applyImport(o){
  const d=defaults(), files=o.files||{};
  S={...d,...o,settings:{...d.settings,...o.settings}}; delete S.files; S.inv={items:[],vials:[],log:[],...S.inv};
  save(); for(const [id,f] of Object.entries(files)){ try{ await fput(id,fromB64(f.data,f.type)); }catch(e){} }
  render(); toast("Backup imported");
}
async function backupText(withFiles){
  const out={...S}; if(withFiles){ out.files={}; for(const c of S.coas){ if(!c.file) continue; try{ const b=await fget(c.id); if(b) out.files[c.id]={name:c.file.name,type:c.file.type,data:await toB64(b)}; }catch(e){} } }
  return JSON.stringify(out,null,2);
}

/* Convert a "Dose Horizon" backup (schema 5) into this app's format */
function fromDoseHorizon(o){
  const d=defaults(), r={...d,settings:{...d.settings}};
  const byName=n=>{ const k=String(n||"").trim().toLowerCase(); const f=BUILTIN.find(x=>x.name.toLowerCase()===k||x.id===k); return f?f.id:null; };
  const toId=n=>{
    let id=byName(n); if(id) return id;
    const ex=r.custom.find(c=>c.name.toLowerCase()===String(n).toLowerCase()); if(ex) return ex.id;
    const c={id:"c_"+uid(),name:String(n||"Unknown"),hl:1}; r.custom.push(c); return c.id;
  };
  (o.shots||[]).forEach(s=>{
    r.shots.push({id:uid(),drug:toId(s.med),mg:Number(s.dose)||0,ts:Number(s.time),
      site:String(s.site||"").replace(/\s*·\s*/g," – "),note:String(s.symptoms||"")});
  });
  r.shots.sort((a,b)=>a.ts-b.ts);
  const toKg=w=>w.kg!=null?Number(w.kg):Number(w.lb)*0.45359237;
  (o.weights||[]).forEach(w=>r.weights.push({id:uid(),kg:Math.round(toKg(w)*100)/100,ts:Number(w.time),note:""}));
  r.weights.sort((a,b)=>a.ts-b.ts);
  const sx=[["nausea","Nausea"],["constipation","Constipation"],["fatigue","Fatigue"],["appetite","Low appetite"]];
  (o.journal||[]).forEach(j=>{
    const key=dateKey(j.time);
    if(j.water>0) r.water[key]=Math.max(r.water[key]||0,j.water);
    if(j.protein>0) r.protein[key]=Math.max(r.protein[key]||0,j.protein);
    const sym=sx.filter(([k])=>j[k]>0).map(([k,l])=>j[k]>1?`${l} (${j[k]})`:l);
    const note=String(j.notes||"");
    if(sym.length||note) r.journal.push({id:uid(),ts:Number(j.time),mood:3,sym,note});
  });
  const st=r.settings;
  if(o.medication){ st.drug=toId(o.medication); }
  if(o.chartMode==="single"||o.chartMode==="combined") st.mode=o.chartMode;
  if(o.theme==="light"||o.theme==="dark") st.theme=o.theme;
  if(o.goalWeightLb>0) st.goalWeight=Math.round(o.goalWeightLb*0.45359237*10)/10;
  if(o.waterGoalMl>0) st.waterGoal=o.waterGoalMl;
  if(o.proteinGoalG>0) st.proteinGoal=o.proteinGoalG;
  return r;
}
/* ---------- Install (PWA) ---------- */
let deferredInstall=null;
const isStandalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
window.addEventListener("beforeinstallprompt",e=>{ e.preventDefault(); deferredInstall=e; if(tab==="settings"&&!document.getElementById("modal")) render(); });
window.addEventListener("appinstalled",()=>{ deferredInstall=null; toast("App installed"); if(tab==="settings") render(); });
function installCardHtml(){
  if(isStandalone()) return `<section class="card"><h2>Installed</h2><p class="muted small">You're running the installed app. Your data is stored on this device.</p></section>`;
  if(location.protocol==="file:") return `<section class="card"><h2>Install as an app</h2><p class="muted small">Installing needs the app to be opened from a web address (https://) rather than a local file. See the setup notes that came with it.</p></section>`;
  return `<section class="card"><h2>Install as an app</h2>${deferredInstall?`<p class="muted small">Add it to your home screen or desktop. It opens full screen and works offline.</p><div class="row"><button class="btn primary" data-action="install">Install app</button></div>`:`<p class="muted small">In Chrome, open the ⋮ menu and choose “Install app” or “Add to Home screen”.</p>`}</section>`;
}
const actions={
  install:async()=>{ if(!deferredInstall) return; deferredInstall.prompt(); await deferredInstall.userChoice.catch(()=>{}); deferredInstall=null; render(); },
  logShot:()=>shotModal(), addCoa:()=>coaModal(), editCoa:el=>coaModal(el.dataset.id), viewCoa:el=>openCoaFile(el.dataset.id),
  delCoa:el=>{ if(confirm("Delete this CoA and its file?")){ fdel(el.dataset.id).catch(()=>{}); S.coas=S.coas.filter(c=>c.id!==el.dataset.id); save(); render(); } }, stackAdd:()=>openPicker(), customCompound:()=>customCompoundModal(),
  stackEdit:el=>stackModal(null,el.dataset.id), stackUp:el=>moveStack(el.dataset.id,-1), stackDown:el=>moveStack(el.dataset.id,1),
  stackLog:el=>{ const it=S.stack.find(s=>s.id===el.dataset.id); if(it) shotModal(null,{drug:it.drug,mg:it.mg}); },
  stackDel:el=>{ if(confirm("Remove from stack? Logged shots are kept.")){ S.stack=S.stack.filter(s=>s.id!==el.dataset.id); save(); render(); } }, addItem:()=>itemModal(), editItem:el=>itemModal(el.dataset.id), recon:()=>reconModal(), addVial:()=>vialModal(), editVial:el=>vialModal(el.dataset.id),
  reconFromCalc:()=>{ const v=parseFloat(document.querySelector("#calcR [name=w]")?.value); reconModal(v>0?v:null); },
  qty:el=>{ const i=S.inv.items.find(x=>x.id===el.dataset.id); if(!i) return; i.qty=Math.max(0,r3(i.qty+Number(el.dataset.n))); invLog(`Adjusted ${itemName(i)} by ${el.dataset.n>0?"+":""}${el.dataset.n} → ${fmtNum(i.qty,1)}`); save(); render(); },
  delItem:el=>{ const i=S.inv.items.find(x=>x.id===el.dataset.id); if(i&&confirm(`Remove ${itemName(i)} from stock?`)){ S.inv.items=S.inv.items.filter(x=>x!==i); invLog(`Removed ${itemName(i)}`); save(); render(); } },
  delVial:el=>{ const v=S.inv.vials.find(x=>x.id===el.dataset.id); if(v&&confirm(`Discard this vial (${fmtNum(v.mgLeft,3)} mg left)?`)){ S.inv.vials=S.inv.vials.filter(x=>x!==v); invLog(`Discarded ${vialName(v)} with ${fmtNum(v.mgLeft,3)} mg left`); save(); render(); } }, editShot:el=>shotModal(el.dataset.id), logWeight:()=>weightModal(), setGoal:()=>goalModal(), addCustom:()=>customModal(),
  delShot:el=>{ const s=S.shots.find(x=>x.id===el.dataset.id); if(!s) return;
    if(confirm("Delete this shot?"+(s.use?" Stock used for it will be restored.":""))){
      const u=s.use;
      if(u){ const v=S.inv.vials.find(x=>x.id===u.vial); if(v) v.mgLeft=Math.min(v.mgTotal,r3(v.mgLeft+u.mg));
        [u.needle,u.syringe].forEach(id=>{ const i=S.inv.items.find(x=>x.id===id); if(i) i.qty+=1; }); invLog("Restored stock from a deleted shot"); }
      S.shots=S.shots.filter(x=>x!==s); save(); render(); } },
  delWeight:el=>{ if(confirm("Delete this weigh-in?")){ S.weights=S.weights.filter(s=>s.id!==el.dataset.id); save(); render(); } },
  delJournal:el=>{ if(confirm("Delete this entry?")){ S.journal=S.journal.filter(s=>s.id!==el.dataset.id); save(); render(); } },
  delCustom:el=>{ if(confirm("Remove this compound? Its logged shots will remain but show as the first compound.")){ S.custom=S.custom.filter(c=>c.id!==el.dataset.id); if(!S.custom.concat(BUILTIN).some(d=>d.id===S.settings.drug)) S.settings.drug="tirzepatide"; save(); render(); } },
  theme:()=>{ S.settings.theme=S.settings.theme==="dark"?"light":"dark"; save(); render(); },
  mode:el=>{ S.settings.mode=el.dataset.v; cursorT=null; save(); render(); },
  range:el=>{ S.settings.range=Number(el.dataset.v); cursorT=null; save(); render(); },
  wrange:el=>{ S.settings.wRange=el.dataset.v; save(); render(); },
  add:el=>{ const k=el.dataset.k, key=dateKey(Date.now()); const m=S[k]; m[key]=Math.max(0,(m[key]||0)+Number(el.dataset.n)); save(); render(); },
  export:async()=>{ download(`peptide-tracker-backup-${dateKey(Date.now())}.json`,await backupText(true)); toast("Backup downloaded (includes CoA files)"); },
  share:async()=>{
    const f=new File([await backupText(false)],`peptide-tracker-backup-${dateKey(Date.now())}.json`,{type:"application/json"});
    if(navigator.canShare&&navigator.canShare({files:[f]})){ try{ await navigator.share({files:[f],title:"Peptide tracker backup"}); }catch(e){} }
    else toast("File sharing isn't supported here – use Export backup, then upload to Drive");
  },
  import:()=>document.getElementById("importFile").click(),
  resetHl:()=>{ delete S.settings.halfLives[S.settings.drug]; save(); render(); },
  demo:()=>{ if(confirm("Replace current data with demo data?")){ demoData(); save(); render(); toast("Demo data loaded"); } },
  erase:()=>{ if(confirm("Erase ALL data in this browser? Export a backup first if unsure.")){ S.coas.forEach(c=>fdel(c.id).catch(()=>{})); S=defaults(); save(); render(); toast("All data erased"); } },
  notify:async()=>{
    if(S.settings.notify){ S.settings.notify=false; save(); render(); return; }
    if(!("Notification" in window)){ toast("Notifications aren't supported here"); return; }
    const p=Notification.permission==="granted"?"granted":await Notification.requestPermission();
    if(p==="granted"){ S.settings.notify=true; save(); render(); toast("Notifications on"); } else toast("Notification permission was not granted");
  }
};
document.addEventListener("click",e=>{
  const pk=e.target.closest("[data-pick]"); if(pk){ const id=pk.dataset.pick; closeModal(); stackModal(id); return; }
  const t=e.target.closest("[data-tab]"); if(t){ tab=t.dataset.tab; cursorT=null; render(); window.scrollTo(0,0); return; }
  const a=e.target.closest("[data-action]"); if(a && actions[a.dataset.action]) actions[a.dataset.action](a);
});
document.addEventListener("change",e=>{
  const el=e.target;
  if(el.dataset&&el.dataset.combo){ comboResolve(el,false); return; }
  if(el.closest("#modal")){
    if(el.name==="kind") syncKind();
    if(el.name==="drug"&&document.getElementById("stockSec")) document.getElementById("stockSec").innerHTML=stockSec(el.value);
    updateHints(); return;
  }
  if(el.id==="drugSel"){ S.settings.drug=el.value; cursorT=null; save(); render(); }
  else if(el.dataset.set){
    const k=el.dataset.set; let v=el.value;
    if(["waterGoal","proteinGoal","goalWeight"].includes(k)) v = v===""?null:Math.max(0,parseFloat(v));
    else if(k==="shotDay") v = v===""?null:Number(v);
    S.settings[k]=v; save(); toast("Saved");
  } else if(el.dataset.hl){
    const v=parseFloat(el.value); if(v>0) S.settings.halfLives[el.dataset.hl]=v; else delete S.settings.halfLives[el.dataset.hl];
    save(); render(); toast("Saved");
  } else if(el.id==="importFile" && el.files[0]){
    const f=el.files[0], rd=new FileReader();
    rd.onload=()=>{
      try{
        let o=JSON.parse(rd.result);
        if(o && o.schema && o.v===undefined) o=fromDoseHorizon(o);
        if(!o||o.v!==1||!Array.isArray(o.shots)||!Array.isArray(o.weights)) throw new Error("bad");
        if(confirm("Replace current data with this backup?")){ const d=defaults(); applyImport(o); }
      }catch(err){ toast("That file isn't a valid backup"); }
    };
    rd.readAsText(f); el.value="";
  }
});
document.addEventListener("focusin",e=>{ if(e.target.dataset&&e.target.dataset.combo) e.target.select(); });
document.addEventListener("focusout",e=>{ if(e.target.dataset&&e.target.dataset.combo) comboResolve(e.target,true); });
document.addEventListener("keydown",e=>{ if(e.key==="Enter"&&e.target.dataset&&e.target.dataset.combo){ e.preventDefault(); if(comboResolve(e.target,false)) e.target.blur(); } });
document.addEventListener("input",e=>{ if(e.target.dataset&&e.target.dataset.combo){ if(!e.inputType||e.inputType==="insertReplacementText") comboResolve(e.target,false); return; } if(e.target.id==="pickQ"){ renderPick(); return; } if(e.target.closest("#calcR,#calcD")) calcUpdate(); if(e.target.closest("#modal")) updateHints(); });
document.addEventListener("submit",e=>{
  if(e.target.id==="jForm"){
    e.preventDefault(); const fd=new FormData(e.target);
    const sym=fd.getAll("sym"), note=fd.get("note").trim();
    S.journal.push({id:uid(),ts:Date.now(),mood:Number(fd.get("mood"))||3,sym,note}); save(); render(); toast("Entry saved");
  } else if(e.target.closest("#calcR,#calcD")) e.preventDefault();
});
document.addEventListener("keydown",e=>{ if(e.key==="Escape") closeModal(); if((e.key==="Enter"||e.key===" ")&&e.target.dataset?.pick){ e.preventDefault(); e.target.click(); } });

/* Reminder check (only while page is open) */
setInterval(()=>{
  if(!S.settings.notify||Notification.permission!=="granted") return;
  const nxt=nextShotTs(); if(nxt===null) return;
  const key=dateKey(Date.now())+" "+S.settings.shotTime;
  if(Math.abs(nxt-Date.now())<6e4 && S.settings.lastNotified!==key){
    S.settings.lastNotified=key; save(); new Notification("Shot reminder",{body:"It's time to log your scheduled shot."});
  }
},30000);
setInterval(()=>{ if(tab==="today" && !document.getElementById("modal") && document.activeElement?.id!=="medChart") render(); },5*60000);

if("serviceWorker" in navigator && location.protocol.startsWith("http")){
  navigator.serviceWorker.register("sw.js").catch(()=>{});
}
// Ask the browser not to evict saved data under storage pressure
try{ navigator.storage&&navigator.storage.persist&&navigator.storage.persist(); }catch(e){}
render();
