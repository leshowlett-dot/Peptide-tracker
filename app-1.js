"use strict";
/* ---------- Constants & compound library ---------- */
const DAY = 864e5, HOUR = 36e5;
const VERSION = "1.4.0";
const PALETTE = ["#2fb89a","#e0a63a","#6aa9ff","#e86f8c","#a58bff","#8bc34a","#ff8f5a","#4dd0e1","#d4a5ff","#c0ca33",
  "#f06292","#90a4ae","#ffb74d","#26a69a","#7986cb","#aed581","#ba68c8","#4fc3f7","#ff8a65","#9ccc65",
  "#f48fb1","#80cbc4","#ce93d8","#ffd54f","#81d4fa","#bcaaa4"];

// hl = approximate elimination half-life in days. approx:true = limited/uncertain human data.
// These are rough reference values only; every one can be overridden in Settings.
const BUILTIN = [
  {id:"tirzepatide",name:"Tirzepatide",group:"Metabolic & weight",hl:5},
  {id:"semaglutide",name:"Semaglutide",group:"Metabolic & weight",hl:7},
  {id:"retatrutide",name:"Retatrutide",group:"Metabolic & weight",hl:6},
  {id:"cagrilintide",name:"Cagrilintide",group:"Metabolic & weight",hl:7},
  {id:"eloralintide",name:"Eloralintide",group:"Metabolic & weight",hl:8,approx:true},
  {id:"survodutide",name:"Survodutide",group:"Metabolic & weight",hl:4.5,approx:true},
  {id:"mazdutide",name:"Mazdutide",group:"Metabolic & weight",hl:5,approx:true},
  {id:"liraglutide",name:"Liraglutide",group:"Metabolic & weight",hl:0.54},
  {id:"dulaglutide",name:"Dulaglutide",group:"Metabolic & weight",hl:4.7},
  {id:"exenatide",name:"Exenatide",group:"Metabolic & weight",hl:0.1},
  {id:"pramlintide",name:"Pramlintide",group:"Metabolic & weight",hl:0.03},
  {id:"aod9604",name:"AOD-9604",group:"Metabolic & weight",hl:0.04,approx:true},
  {id:"5amino1mq",name:"5-Amino-1MQ",group:"Metabolic & weight",hl:null},
  {id:"lcarnitine",name:"L-Carnitine",group:"Metabolic & weight",hl:null},
  {id:"lipoc",name:"Lipo-C",group:"Metabolic & weight",hl:null},
  {id:"slupp332",name:"SLU-PP-332",group:"Metabolic & weight",hl:null},
  {id:"tesofensine",name:"Tesofensine",group:"Metabolic & weight",hl:null},
  {id:"pancragen",name:"Pancragen",group:"Metabolic & weight",hl:null},
  {id:"retatrutidecagrilintide",name:"Retatrutide + Cagrilintide",group:"Metabolic & weight",comps:[["retatrutide", 1], ["cagrilintide", 1]],hl:null},
  {id:"cagrilintidesemaglutidecagrisema",name:"Cagrilintide + Semaglutide (CagriSema)",group:"Metabolic & weight",comps:[["cagrilintide", 1], ["semaglutide", 1]],hl:null},
  {id:"tirzepatidebpc157",name:"Tirzepatide + BPC-157",group:"Metabolic & weight",comps:[["tirzepatide", 1], ["bpc157", 1]],hl:null},
  {id:"lipocb12",name:"Lipo-C + B12",group:"Metabolic & weight",comps:[["lipoc", 1], ["b12", 1]],hl:null},
  {id:"bpc157",name:"BPC-157",group:"Healing & recovery",hl:0.17,approx:true},
  {id:"tb500",name:"TB-500",group:"Healing & recovery",hl:0.5,approx:true},
  {id:"ghkcu",name:"GHK-Cu",group:"Healing & recovery",hl:0.04,approx:true},
  {id:"kpv",name:"KPV",group:"Healing & recovery",hl:null},
  {id:"ll37",name:"LL-37",group:"Healing & recovery",hl:null},
  {id:"ara290",name:"ARA-290",group:"Healing & recovery",hl:null},
  {id:"cartalax",name:"Cartalax",group:"Healing & recovery",hl:null},
  {id:"larazotide",name:"Larazotide",group:"Healing & recovery",hl:null},
  {id:"pentosanpolysulfate",name:"Pentosan Polysulfate",group:"Healing & recovery",hl:null},
  {id:"bpc157tb500wolverine",name:"BPC-157 + TB-500 (Wolverine)",group:"Healing & recovery",comps:[["bpc157", 1], ["tb500", 1]],hl:null},
  {id:"bpc157kpv",name:"BPC-157 + KPV",group:"Healing & recovery",comps:[["bpc157", 1], ["kpv", 1]],hl:null},
  {id:"ghkcubpc157",name:"GHK-Cu + BPC-157",group:"Healing & recovery",comps:[["ghkcu", 1], ["bpc157", 1]],hl:null},
  {id:"ghkcukpv",name:"GHK-Cu + KPV",group:"Healing & recovery",comps:[["ghkcu", 1], ["kpv", 1]],hl:null},
  {id:"glow",name:"GLOW",group:"Healing & recovery",comps:[["bpc157", 1], ["tb500", 1], ["ghkcu", 1]],hl:null},
  {id:"klow",name:"KLOW",group:"Healing & recovery",comps:[["ghkcu", 1], ["bpc157", 1], ["tb500", 1], ["kpv", 1]],hl:null},
  {id:"sermorelin",name:"Sermorelin",group:"Growth hormone",hl:0.01},
  {id:"cjc1295nodac",name:"CJC-1295 (no DAC)",group:"Growth hormone",hl:0.03},
  {id:"cjc1295dac",name:"CJC-1295 (DAC)",group:"Growth hormone",hl:8},
  {id:"ipamorelin",name:"Ipamorelin",group:"Growth hormone",hl:0.09},
  {id:"tesamorelin",name:"Tesamorelin",group:"Growth hormone",hl:0.03},
  {id:"ghrp2",name:"GHRP-2",group:"Growth hormone",hl:0.1,approx:true},
  {id:"ghrp6",name:"GHRP-6",group:"Growth hormone",hl:0.1,approx:true},
  {id:"hexarelin",name:"Hexarelin",group:"Growth hormone",hl:null},
  {id:"igf1lr3",name:"IGF-1 LR3",group:"Growth hormone",hl:null},
  {id:"mk677",name:"MK-677",group:"Growth hormone",hl:null},
  {id:"pegmgf",name:"PEG-MGF",group:"Growth hormone",hl:null},
  {id:"cjc1295ipamorelin",name:"CJC-1295 + Ipamorelin",group:"Growth hormone",comps:[["cjc1295nodac", 1], ["ipamorelin", 1]],hl:null},
  {id:"tesaipa",name:"Tesa + Ipa",group:"Growth hormone",comps:[["tesamorelin", 1], ["ipamorelin", 1]],hl:null},
  {id:"cjcipamorelintesamorelin",name:"CJC + Ipamorelin + Tesamorelin",group:"Growth hormone",comps:[["cjc1295nodac", 1], ["ipamorelin", 1], ["tesamorelin", 1]],hl:null},
  {id:"semax",name:"Semax",group:"Cognitive",hl:0.01,approx:true},
  {id:"selank",name:"Selank",group:"Cognitive",hl:0.01,approx:true},
  {id:"adamax",name:"Adamax",group:"Cognitive",hl:null},
  {id:"cerebrolysin",name:"Cerebrolysin",group:"Cognitive",hl:null},
  {id:"cortagen",name:"Cortagen",group:"Cognitive",hl:null},
  {id:"dihexa",name:"Dihexa",group:"Cognitive",hl:null},
  {id:"dsip",name:"DSIP",group:"Cognitive",hl:null},
  {id:"fgl",name:"FGL",group:"Cognitive",hl:null},
  {id:"nacetylselank",name:"N-Acetyl Selank",group:"Cognitive",hl:null},
  {id:"nacetylsemax",name:"N-Acetyl Semax",group:"Cognitive",hl:null},
  {id:"p21",name:"P21",group:"Cognitive",hl:null},
  {id:"pe2228",name:"PE-22-28",group:"Cognitive",hl:null},
  {id:"pinealon",name:"Pinealon",group:"Cognitive",hl:null},
  {id:"semaxselank",name:"Semax + Selank",group:"Cognitive",comps:[["semax", 1], ["selank", 1]],hl:null},
  {id:"ahkcu",name:"AHK-Cu",group:"Cosmetic",hl:null},
  {id:"glutathione",name:"Glutathione",group:"Cosmetic",hl:null},
  {id:"melanotanimt1",name:"Melanotan I (MT-1)",group:"Cosmetic",hl:null},
  {id:"mt2",name:"Melanotan II (MT-2)",group:"Cosmetic",hl:0.04,approx:true},
  {id:"snap8",name:"SNAP-8",group:"Cosmetic",hl:null},
  {id:"b12",name:"B12",group:"Energy",hl:null},
  {id:"nad",name:"NAD+",group:"Energy",hl:null},
  {id:"hcg",name:"hCG",group:"Hormones",hl:null},
  {id:"progesterone",name:"Progesterone",group:"Hormones",hl:null},
  {id:"somatropinhgh",name:"Somatropin (HGH)",group:"Hormones",hl:null},
  {id:"testosterone",name:"Testosterone",group:"Hormones",hl:null},
  {id:"testosteronecypionate",name:"Testosterone Cypionate",group:"Hormones",hl:null},
  {id:"testosteroneenanthate",name:"Testosterone Enanthate",group:"Hormones",hl:null},
  {id:"testosteronephenylpropionate",name:"Testosterone Phenylpropionate",group:"Hormones",hl:null},
  {id:"testosteronepropionate",name:"Testosterone Propionate",group:"Hormones",hl:null},
  {id:"thymosina1",name:"Thymosin Alpha-1",group:"Immunity",hl:0.1},
  {id:"thymogen",name:"Thymogen",group:"Immunity",hl:null},
  {id:"vilon",name:"Vilon",group:"Immunity",hl:null},
  {id:"vip",name:"VIP",group:"Immunity",hl:null},
  {id:"motsc",name:"MOTS-c",group:"Longevity",hl:0.1,approx:true},
  {id:"epitalon",name:"Epithalon",group:"Longevity",hl:0.05,approx:true},
  {id:"ss31elamipretide",name:"SS-31 (Elamipretide)",group:"Longevity",hl:null},
  {id:"bronchogen",name:"Bronchogen",group:"Longevity",hl:null},
  {id:"cardiogen",name:"Cardiogen",group:"Longevity",hl:null},
  {id:"chonluten",name:"Chonluten",group:"Longevity",hl:null},
  {id:"crystagen",name:"Crystagen",group:"Longevity",hl:null},
  {id:"foxo4dri",name:"FOXO4-DRI",group:"Longevity",hl:null},
  {id:"humanin",name:"Humanin",group:"Longevity",hl:null},
  {id:"livagen",name:"Livagen",group:"Longevity",hl:null},
  {id:"ovagen",name:"Ovagen",group:"Longevity",hl:null},
  {id:"pnc27",name:"PNC-27",group:"Longevity",hl:null},
  {id:"rapamycin",name:"Rapamycin",group:"Longevity",hl:null},
  {id:"thymalin",name:"Thymalin",group:"Longevity",hl:null},
  {id:"vesugen",name:"Vesugen",group:"Longevity",hl:null},
  {id:"epithalonmotsc",name:"Epithalon + MOTS-c",group:"Longevity",comps:[["epitalon", 1], ["motsc", 1]],hl:null},
  {id:"pt141",name:"PT-141",group:"Sexual health",hl:0.11},
  {id:"kisspeptin10",name:"Kisspeptin-10",group:"Sexual health",hl:0.003},
  {id:"gonadorelin",name:"Gonadorelin",group:"Sexual health",hl:null},
  {id:"oxytocin",name:"Oxytocin",group:"Sexual health",hl:null},
  {id:"prostamax",name:"Prostamax",group:"Sexual health",hl:null},
  {id:"testagen",name:"Testagen",group:"Sexual health",hl:null},
  {id:"pt141oxytocin",name:"PT-141 + Oxytocin",group:"Sexual health",comps:[["pt141", 1], ["oxytocin", 1]],hl:null},
  {id:"thymulin",name:"Thymulin",group:"Other",hl:null}
];
const MOST_COMMON=["retatrutide","ghkcu","motsc","nad","tirzepatide","klow","tesamorelin","kpv"];
const CAT_ORDER=["Cognitive","Cosmetic","Energy","Growth hormone","Healing & recovery","Hormones","Immunity","Longevity","Metabolic & weight","Sexual health","Other"];
const SITES = ["Abdomen – left","Abdomen – right","Thigh – left","Thigh – right","Upper arm – left","Upper arm – right","Glute – left","Glute – right","Other"];
const SYMPTOMS = ["Nausea","Fatigue","Constipation","Diarrhoea","Headache","Reflux","Low appetite","Dizziness","Injection-site reaction","Good energy"];
const MOODS = ["Rough","Low","OK","Good","Great"];
const WEEKDAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const TABS = [["today","Today","⚡"],["shots","Shots","💉"],["stack","Stack","📦"],["stock","Stock","🧪"],["progress","Progress","📈"],["journal","Journal","📔"],["calc","Calc","🔢"],["settings","Settings","⚙️"]];

/* ---------- State ---------- */
const KEY = "peptide-tracker-v1";
function defaults(){
  return {v:1,
    settings:{drug:"tirzepatide",theme:"dark",waterGoal:2000,proteinGoal:null,goalWeight:null,shotDay:null,shotTime:"18:00",
      notify:false,lastNotified:"",halfLives:{},range:42,mode:"single"},
    shots:[],weights:[],journal:[],water:{},protein:{},custom:[],inv:{items:[],vials:[],log:[]},stack:[],blends:{},coas:[]};
}
function load(){
  try{
    const r = JSON.parse(localStorage.getItem(KEY));
    if(r && r.v===1){ const d=defaults(); return {...d,...r,settings:{...d.settings,...r.settings}}; }
  }catch(e){}
  return defaults();
}
let S = load();
let tab = "today";
let cursorT = null;
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){ toast("Could not save – browser storage unavailable"); } }
const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,7);

/* ---------- Helpers ---------- */
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmtNum = (n,dp=3)=> isFinite(n) ? String(parseFloat(Number(n).toFixed(dp))) : "–";
const fmtAmt = mg => {
  if(mg===0 || mg>=0.1) return fmtNum(mg,3)+" mg";
  const u = mg*1000;
  return (u<0.01?"<0.01":fmtNum(u,2))+" mcg";
};
const dFmt = new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric"});
const dShort = new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short"});
const tFmt = new Intl.DateTimeFormat("en-GB",{hour:"2-digit",minute:"2-digit",hour12:false});
const fmtDate = t => dFmt.format(t), fmtShort = t => dShort.format(t), fmtTime = t => tFmt.format(t);
const dateKey = t => { const d=new Date(t); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); };
const toLocalInput = t => dateKey(t)+"T"+fmtTime(t);
const fromLocalInput = s => new Date(s).getTime();
function ago(t){
  const d=Date.now()-t, a=Math.abs(d), fut=d<0;
  let s; if(a<HOUR) s=Math.max(1,Math.round(a/6e4))+" min"; else if(a<DAY) s=Math.round(a/HOUR)+" h"; else { const n=Math.round(a/DAY); s=n+(n===1?" day":" days"); }
  return fut?"in "+s:s+" ago";
}
function toast(msg){
  document.querySelectorAll(".toast").forEach(e=>e.remove());
  const el=document.createElement("div"); el.className="toast"; el.textContent=msg; document.body.appendChild(el);
  setTimeout(()=>el.remove(),2600);
}

/* ---------- Compounds & PK model ---------- */
function allDrugs(){
  return [...BUILTIN, ...S.custom.map(c=>({group:"Other",...c}))].map((d,i)=>({...d,color:PALETTE[i%PALETTE.length]}));
}
const drugById = id => allDrugs().find(d=>d.id===id) || allDrugs()[0];
function halfLife(id){ const o=Number(S.settings.halfLives[id]); if(o>0) return o; const h=drugById(id).hl; return h>0?h:null; }
const hlText=id=>{ const h=halfLife(id); return h?fmtNum(h,4)+" days":"not set"; };
// A blend with known components is split into those components (by ratio) for modelling.
function parts(drugId){
  const d=drugById(drugId);
  if(d.comps&&d.comps.length){ const sh=(S.blends&&S.blends[drugId])||d.comps.map(c=>c[1]); const tot=sh.reduce((a,b)=>a+b,0)||1; return d.comps.map((c,i)=>[c[0],sh[i]/tot]); }
  return [[drugId,1]];
}
function modelDrugs(){
  const ids=S.settings.mode==="combined"?[...new Set(S.shots.map(s=>s.drug))]:[S.settings.drug];
  const out=[],seen=new Set();
  ids.forEach(i=>parts(i).forEach(([pid])=>{ if(!seen.has(pid)){ seen.add(pid); out.push(drugById(pid)); } }));
  return out.length?out:[drugById(S.settings.drug)];
}
// Simple model: each logged dose is absorbed instantly, then decays exponentially.
function level(id,t){
  let sum=0;
  for(const s of S.shots){
    if(s.ts>t) continue;
    for(const [pid,f] of parts(s.drug)){
      if(pid!==id) continue; const hl=halfLife(id); if(!hl) continue;
      sum+=s.mg*f*Math.pow(0.5,(t-s.ts)/(hl*DAY));
    }
  }
  return sum;
}

/* ---------- Modal ---------- */
function closeModal(){ document.getElementById("modal")?.remove(); }
function showModal(title, body, onSubmit, submitLabel="Save"){
  closeModal();
  const w=document.createElement("div"); w.className="overlay"; w.id="modal";
  w.innerHTML=`<form class="sheet" novalidate role="dialog" aria-label="${esc(title)}">
    <div class="sheet-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Close">✕</button></div>
    ${body}<div class="err" role="alert"></div>
    <div class="row"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary" type="submit">${esc(submitLabel)}</button></div></form>`;
  document.body.appendChild(w);
  w.addEventListener("click",e=>{ if(e.target===w||e.target.closest("[data-close]")) closeModal(); });
  w.querySelector("form").addEventListener("submit",e=>{
    e.preventDefault();
    const res=onSubmit(new FormData(e.target));
    if(typeof res==="string") w.querySelector(".err").textContent=res; else { closeModal(); render(); }
  });
  w.querySelector("input,select,textarea")?.focus();
}
const drugOptions = sel => {
  const groups={}; allDrugs().forEach(d=>(groups[d.group]??=[]).push(d));
  return Object.entries(groups).map(([g,ds])=>`<optgroup label="${esc(g)}">${ds.map(d=>`<option value="${esc(d.id)}" ${d.id===sel?"selected":""}>${esc(d.name)}</option>`).join("")}</optgroup>`).join("");
};
// Type-ahead compound picker: visible search box + hidden input that holds the compound id.
function ensureDrugList(){
  let dl=document.getElementById("drugList"); if(!dl){ dl=document.createElement("datalist"); dl.id="drugList"; document.body.appendChild(dl); }
  dl.innerHTML=allDrugs().map(d=>`<option value="${esc(d.name)}">`).join("");
}
function drugCombo(sel,{name="drug",id=""}={}){
  ensureDrugList();
  return `<span class="combo" style="flex:1;min-width:0;display:block"><input type="text" data-combo="1" list="drugList" autocomplete="off" autocapitalize="off" spellcheck="false" style="width:100%" placeholder="Search compounds…" aria-label="Search compounds" value="${esc(drugById(sel).name)}"><input type="hidden" name="${name}" ${id?`id="${id}"`:""} value="${esc(sel)}"></span>`;
}
function comboResolve(vis,final){
  const hid=vis.parentElement.querySelector('input[type=hidden]'), q=vis.value.trim().toLowerCase();
  const m=allDrugs().find(d=>d.name.toLowerCase()===q);
  if(m){ if(hid.value!==m.id){ hid.value=m.id; hid.dispatchEvent(new Event("change",{bubbles:true})); } return true; }
  if(final) vis.value=drugById(hid.value).name;
  return false;
}

/* ---------- Modals: shots, weight, goal, custom ---------- */
function shotModal(id,pre){
  const ex = id ? S.shots.find(s=>s.id===id) : null;
  const src = ex || pre || null;
  const mgv = src ? src.mg : "";
  const useMcg = src && src.mg<0.1;
  const dsel = (src&&src.drug)||S.settings.drug;
  showModal(ex?"Edit shot":"Log a shot", `
    <label class="f">Compound</label>${drugCombo(dsel)}
    <label class="f">Dose</label>
    <div class="row"><input name="dose" type="number" inputmode="decimal" step="any" min="0" placeholder="e.g. 2.5" value="${src?esc(fmtNum(useMcg?mgv*1000:mgv,4)):""}" style="flex:2">
    <select name="unit" style="flex:1"><option value="mg" ${useMcg?"":"selected"}>mg</option><option value="mcg" ${useMcg?"selected":""}>mcg</option></select></div>
    <label class="f">Date & time</label><input name="when" type="datetime-local" value="${toLocalInput(ex?ex.ts:Date.now())}">
    <label class="f">Injection site</label>
    <select name="site"><option value="">Not recorded</option>${SITES.map(s=>`<option ${ex&&ex.site===s?"selected":""}>${s}</option>`).join("")}</select>
    <label class="f">Notes</label><input name="note" type="text" maxlength="200" value="${esc(ex?.note||"")}" placeholder="Optional">
    ${ex?"":`<h3>Use from stock</h3><div id="stockSec">${stockSec(dsel)}</div>`}`,
  fd=>{
    let dose=parseFloat(fd.get("dose")); if(!(dose>0)) return "Enter a dose greater than 0.";
    if(fd.get("unit")==="mcg") dose/=1000;
    const ts=fromLocalInput(fd.get("when")); if(!isFinite(ts)) return "Enter a valid date and time.";
    const rec={id:ex?.id||uid(),drug:fd.get("drug"),mg:dose,ts,site:fd.get("site"),note:fd.get("note").trim()};
    if(!ex){
      const vial=S.inv.vials.find(x=>x.id===fd.get("vial")), nd=S.inv.items.find(x=>x.id===fd.get("needle")), sy=S.inv.items.find(x=>x.id===fd.get("syringe"));
      if(vial && dose>vial.mgLeft+1e-9) return `That vial only has ${fmtNum(vial.mgLeft,3)} mg left. Pick another vial or "Don't deduct".`;
      const use={}, bits=[];
      if(vial){ vial.mgLeft=r3(vial.mgLeft-dose); use.vial=vial.id; use.mg=dose; use.batch=vial.batch||""; bits.push(fmtAmt(dose)+" from vial"); }
      if(nd){ nd.qty=Math.max(0,nd.qty-1); use.needle=nd.id; bits.push("1 needle"); }
      if(sy){ sy.qty=Math.max(0,sy.qty-1); use.syringe=sy.id; bits.push("1 syringe"); }
      if(bits.length){ rec.use=use; invLog(`Shot (${drugById(rec.drug).name}): used ${bits.join(", ")}`); }
    }
    if(ex) Object.assign(ex,rec); else S.shots.push(rec);
    S.shots.sort((a,b)=>a.ts-b.ts); S.settings.drug = rec.drug; save(); toast(rec.use?"Shot saved · stock updated":"Shot saved");
  });
  updateHints();
}
function weightModal(){
  showModal("Log weight",`
    <label class="f">Weight (kg)</label><input name="kg" type="number" inputmode="decimal" step="0.1" min="20" max="500" placeholder="e.g. 107">
    <label class="f">Date & time</label><input name="when" type="datetime-local" value="${toLocalInput(Date.now())}">
    <label class="f">Notes</label><input name="note" type="text" maxlength="200" placeholder="Optional">`,
  fd=>{
    const kg=parseFloat(fd.get("kg")); if(!(kg>=20&&kg<=500)) return "Enter a weight between 20 and 500 kg.";
    const ts=fromLocalInput(fd.get("when")); if(!isFinite(ts)) return "Enter a valid date.";
    S.weights.push({id:uid(),kg,ts,note:fd.get("note").trim()}); S.weights.sort((a,b)=>a.ts-b.ts); save(); toast("Weight saved");
  });
}
function goalModal(){
  showModal("Set goal weight",`<label class="f">Goal weight (kg)</label>
    <input name="g" type="number" inputmode="decimal" step="0.1" min="20" max="500" value="${S.settings.goalWeight??""}" placeholder="e.g. 80">`,
  fd=>{
    const raw=fd.get("g").trim(); if(raw===""){ S.settings.goalWeight=null; save(); return; }
    const g=parseFloat(raw); if(!(g>=20&&g<=500)) return "Enter a weight between 20 and 500 kg.";
    S.settings.goalWeight=g; save();
  });
}
function customModal(){
  showModal("Add custom compound",`
    <label class="f">Name</label><input name="name" type="text" maxlength="40" placeholder="Compound name">
    <label class="f">Half-life (days)</label><input name="hl" type="number" inputmode="decimal" step="any" min="0.0001" placeholder="e.g. 0.5 for 12 hours">
    <p class="muted small">Tip: hours ÷ 24 = days (e.g. 6 h = 0.25).</p>`,
  fd=>{
    const name=fd.get("name").trim(), hl=parseFloat(fd.get("hl"));
    if(!name) return "Enter a name."; if(!(hl>0)) return "Enter a half-life greater than 0.";
    S.custom.push({id:"c_"+uid(),name,hl}); save(); toast("Compound added");
  });
}

/* ---------- Views ---------- */
function header(title){
  const d=new Date();
  return `<div class="eyebrow">${d.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}</div>
  <h1>${title}</h1>
  <div class="topbar">${drugCombo(S.settings.drug,{id:"drugSel"})}
  <button class="icon-btn" data-action="theme" aria-label="Toggle light or dark theme" title="Toggle theme">◐</button></div>`;
}
function nextShotTs(){
  const {shotDay,shotTime}=S.settings; if(shotDay===null||shotDay==="") return null;
  const [h,m]=(shotTime||"18:00").split(":").map(Number);
  const d=new Date(); d.setHours(h,m,0,0);
  d.setDate(d.getDate()+((Number(shotDay)-d.getDay()+7)%7));
  if(d.getTime()<Date.now()) d.setDate(d.getDate()+7);
  return d.getTime();
}
function viewToday(){
  const nxt=nextShotTs(), last=[...S.shots].reverse()[0];
  const ld=last?drugById(last.drug):null;
  const key=dateKey(Date.now()), water=S.water[key]||0, prot=S.protein[key]||0;
  const wg=S.settings.waterGoal||0, pg=S.settings.proteinGoal||0;
  const list = modelDrugs();
  const now=Date.now(); const levels=list.map(d=>({d,v:level(d.id,now)}));
  const total=levels.reduce((a,b)=>a+b.v,0);
  const sel=drugById(S.settings.drug);
  return header("Today")+lowStockHtml()+`
  <section class="card hero">
    <div class="muted">Next shot</div>
    ${nxt?`<div class="big">${WEEKDAYS[new Date(nxt).getDay()]}</div><div>${fmtDate(nxt)} · ${fmtTime(nxt)} · ${ago(nxt)}</div>`
         :`<div class="big">Not scheduled</div><p class="muted">Set your shot day and time in Settings for reminders.</p>`}
    ${last?`<p class="muted small">Last shot: ${esc(ld.name)} ${fmtAmt(last.mg)} · ${ago(last.ts)}${last.site?" · "+esc(last.site):""}</p>`:`<p class="muted small">No shots logged yet.</p>`}
    <div class="row"><button class="btn primary" data-action="logShot">Log a shot</button><button class="btn" data-action="logWeight">Log weight</button></div>
  </section>

  <section class="card">
    <h2>Medication estimate</h2>
    <div class="med">≈ ${fmtAmt(total)}</div>
    <div class="muted">${S.settings.mode==="combined"?`Combined estimate · ${list.length} ${list.length===1?"compound":"compounds"}`:`Selected drug estimate · ${esc(sel.name)}`}</div>
    <div class="chips" role="group" aria-label="Mode">
      <button class="chip ${S.settings.mode==="single"?"on":""}" data-action="mode" data-v="single">Single drug</button>
      <button class="chip ${S.settings.mode==="combined"?"on":""}" data-action="mode" data-v="combined">Combined</button></div>
    <div class="chips" role="group" aria-label="Range">
      ${[14,42,90].map(r=>`<button class="chip ${S.settings.range===r?"on":""}" data-action="range" data-v="${r}">${r} days</button>`).join("")}</div>
    <div>${levels.map(({d,v})=>`<div><span class="dot" style="background:${d.color}"></span>${esc(d.name)} · ${halfLife(d.id)?"≈ "+fmtAmt(v):`<span class="muted">half-life not set</span>`}</div>`).join("")}</div>
    <svg id="medChart" class="chart" viewBox="0 0 340 230" tabindex="0" role="img" aria-label="Estimated medication level over time. Use left and right arrow keys to explore."></svg>
    <p class="muted">Touch and drag on the chart to explore. With a keyboard, use the arrow keys.</p>
    <div class="readout" id="readout" aria-live="polite"></div>
    <p class="muted small">Colors represent separate medications. Each logged dose is modelled as decaying exponentially using the compound's half-life (${esc(sel.name)}: ${hlText(sel.id)}). This is an estimate, not a blood measurement.</p>
  </section>

  <section class="card">
    <h2>Daily habits</h2>
    <div class="row" style="justify-content:space-between"><b>Water</b><span>${fmtNum(water,0)} mL${wg?` / ${fmtNum(wg,0)} mL`:""}</span></div>
    ${wg?`<div class="bar"><i style="width:${Math.min(100,water/wg*100)}%"></i></div>`:""}
    <div class="chips"><button class="chip" data-action="add" data-k="water" data-n="250">+250 mL</button><button class="chip" data-action="add" data-k="water" data-n="500">+500 mL</button><button class="chip" data-action="add" data-k="water" data-n="-250">−250</button></div>
    <div class="row" style="justify-content:space-between;margin-top:14px"><b>Protein</b><span>${fmtNum(prot,0)} g${pg?` / ${fmtNum(pg,0)} g`:""}</span></div>
    ${pg?`<div class="bar"><i style="width:${Math.min(100,prot/pg*100)}%"></i></div>`:`<div class="muted small">Set a protein goal in Settings.</div>`}
    <div class="chips"><button class="chip" data-action="add" data-k="protein" data-n="10">+10 g</button><button class="chip" data-action="add" data-k="protein" data-n="25">+25 g</button><button class="chip" data-action="add" data-k="protein" data-n="-10">−10</button></div>
  </section>`+footerHtml();
}
function viewStack(){ return header("My Stack")+stackHtml()+footerHtml(); }
function viewShots(){
  const list=[...S.shots].reverse(), last=list[0];
  return header("Shots")+`
  <section class="card">
    <div class="grid2"><div class="stat"><div class="l">Shots logged</div><div class="v">${list.length}</div></div>
    <div class="stat"><div class="l">Last site</div><div class="v" style="font-size:18px">${last&&last.site?esc(last.site):"–"}</div></div></div>
    <div class="row" style="margin-top:16px"><button class="btn primary" data-action="logShot">Log a shot</button></div>
  </section>
  <section class="card"><h2>History</h2>
  ${list.length?`<div class="list">${list.map(s=>{const d=drugById(s.drug);return `<div><div class="item"><div>
    <div class="t"><span class="dot" style="background:${d.color}"></span>${esc(d.name)} · ${fmtAmt(s.mg)}</div>
    <div class="muted">${fmtDate(s.ts)} · ${fmtTime(s.ts)}${s.site?" · "+esc(s.site):""}${s.use&&s.use.batch?" · batch "+esc(s.use.batch):""}</div>
    ${s.note?`<div class="small">${esc(s.note)}</div>`:""}</div>
    <div class="row" style="flex:0 0 auto;flex-wrap:nowrap"><button class="btn sm" data-action="editShot" data-id="${s.id}">Edit</button><button class="btn sm danger" data-action="delShot" data-id="${s.id}">Delete</button></div></div></div>`}).join("")}</div>`
   :`<div class="empty">No shots yet. Tap “Log a shot” to add your first.</div>`}
  </section>`+footerHtml();
}
function viewProgress(){
  const W=S.weights, goal=S.settings.goalWeight;
  let hero;
  if(!W.length){
    hero=`<h2>Your weight journey</h2><p class="muted">Log your first weigh-in to start tracking.</p>
    <div class="row"><button class="btn primary" data-action="logWeight">+ Log weight</button><button class="btn" data-action="setGoal">Set goal</button></div>`;
  } else {
    const start=W[0], cur=W[W.length-1], diff=start.kg-cur.kg;
    let pct=null, rem=null;
    if(goal!=null){ const span=start.kg-goal; pct = span===0?(cur.kg===goal?100:0):Math.max(0,Math.min(100,diff/span*100)); rem=cur.kg-goal; }
    const change=(cur.kg-start.kg)/start.kg*100;
    const weeks=(cur.ts-start.ts)/(7*DAY);
    hero=`<h2>Your weight journey</h2><div class="big">${fmtNum(cur.kg,1)} kg</div>
    <div class="muted">${fmtNum(Math.abs(diff),1)} kg ${diff>=0?"lost":"gained"} since ${fmtDate(start.ts)}</div>
    ${pct!==null?`<div class="row" style="justify-content:space-between;margin-top:16px"><b style="font-size:22px">${fmtNum(pct,2)}% to goal</b><span class="muted">Goal ${fmtNum(goal,1)} kg</span></div>
      <div class="bar" style="height:14px"><i style="width:${pct}%"></i></div>
      <div class="muted">${rem>0?fmtNum(rem,1)+" kg remaining":"Goal reached"}</div>`:`<p class="muted">Set a goal weight to see progress.</p>`}
    <div class="row" style="margin:16px 0"><button class="btn primary" data-action="logWeight">+ Log weight</button><button class="btn" data-action="setGoal">Set goal</button></div>
    <div class="grid2"><div class="stat"><div class="l">Starting weight</div><div class="v">${fmtNum(start.kg,1)} kg</div></div>
    <div class="stat"><div class="l">Body weight change</div><div class="v">${fmtNum(change,3)}%</div></div></div>
    ${weeks>=1?`<p class="muted small">Average ${fmtNum((cur.kg-start.kg)/weeks,2)} kg per week over ${fmtNum(weeks,1)} weeks.</p>`:""}`;
  }
  const rev=[...W].reverse();
  return header("Progress")+`<section class="card">${hero}</section>
  <section class="card"><h2>Weigh-ins</h2>
  ${rev.length?`<div class="list">${rev.map(w=>`<div class="item"><div><div class="t" style="font-size:22px">${fmtNum(w.kg,1)} kg</div><div class="muted">${fmtDate(w.ts)}${w.note?" · "+esc(w.note):""}</div></div>
    <button class="btn sm danger" data-action="delWeight" data-id="${w.id}">Delete</button></div>`).join("")}</div>`:`<div class="empty">No weigh-ins yet.</div>`}
  </section>
  <section class="card"><h2>Weight trend</h2>
    <div class="chips">${[["30","30 days"],["90","90 days"],["all","All"]].map(([v,l])=>`<button class="chip ${(S.settings.wRange||"all")===v?"on":""}" data-action="wrange" data-v="${v}">${l}</button>`).join("")}</div>
    <svg id="wChart" class="chart" viewBox="0 0 340 200" role="img" aria-label="Weight trend chart"></svg>
  </section>`+footerHtml();
}
function viewJournal(){
  const list=[...S.journal].sort((a,b)=>b.ts-a.ts);
  return header("Journal")+`
  <section class="card"><h2>How are you feeling?</h2>
  <form id="jForm" novalidate>
    <div class="chips">${MOODS.map((m,i)=>`<label><input class="tg" type="radio" name="mood" value="${i+1}" ${i===2?"checked":""}><span class="tag">${m}</span></label>`).join("")}</div>
    <label class="f">Symptoms</label>
    <div class="tags">${SYMPTOMS.map(s=>`<label><input class="tg" type="checkbox" name="sym" value="${s}"><span class="tag">${s}</span></label>`).join("")}</div>
    <label class="f">Notes</label><textarea name="note" rows="3" maxlength="1000" placeholder="Appetite, energy, sleep, anything else…"></textarea>
    <div class="row" style="margin-top:14px"><button class="btn primary" type="submit">Save entry</button></div>
  </form></section>
  <section class="card"><h2>Entries</h2>
  ${list.length?`<div class="list">${list.map(j=>`<div><div class="item"><div>
    <div class="t">${MOODS[(j.mood||3)-1]} <span class="muted small" style="font-weight:400">· ${fmtDate(j.ts)} ${fmtTime(j.ts)}</span></div>
    ${j.sym?.length?`<div class="small muted">${j.sym.map(esc).join(", ")}</div>`:""}
    ${j.note?`<div style="margin-top:4px;white-space:pre-wrap">${esc(j.note)}</div>`:""}</div>
    <button class="btn sm danger" data-action="delJournal" data-id="${j.id}">Delete</button></div></div>`).join("")}</div>`:`<div class="empty">No entries yet.</div>`}
  </section>`+footerHtml();
}
function viewCalc(){
  const sel=drugById(S.settings.drug), hl=halfLife(sel.id)||"";
  return header("Calculator")+`
  <section class="card"><h2>Reconstitution</h2>
    <p class="muted small">Arithmetic helper only. Always check against your product or prescriber's instructions.</p>
    <form id="calcR" novalidate>
      <label class="f">Peptide in vial (mg)</label><input name="v" type="number" step="any" min="0" inputmode="decimal" placeholder="e.g. 10">
      <label class="f">Diluent added (mL)</label><input name="w" type="number" step="any" min="0" inputmode="decimal" placeholder="e.g. 2">
      <label class="f">Dose to draw</label>
      <div class="row"><input name="d" type="number" step="any" min="0" inputmode="decimal" placeholder="e.g. 250" style="flex:2"><select name="u" style="flex:1"><option value="mcg">mcg</option><option value="mg">mg</option></select></div>
      <label class="f">Syringe</label>
      <select name="s"><option value="1">1 mL (100 units)</option><option value="0.5">0.5 mL (50 units)</option><option value="0.3">0.3 mL (30 units)</option></select>
    </form>
    <div class="out" id="outR"></div>
    <div class="row" style="margin-top:14px"><button class="btn" data-action="reconFromCalc">Record this reconstitution from stock</button></div>
  </section>
  <section class="card"><h2>Decay & accumulation</h2>
    <p class="muted small">Based on simple exponential decay. Prefilled for ${esc(sel.name)}.</p>
    <form id="calcD" novalidate>
      <label class="f">Dose</label>
      <div class="row"><input name="d" type="number" step="any" min="0" inputmode="decimal" placeholder="e.g. 2.5" style="flex:2"><select name="u" style="flex:1"><option value="mg">mg</option><option value="mcg">mcg</option></select></div>
      <label class="f">Half-life (days)</label><input name="h" type="number" step="any" min="0" inputmode="decimal" value="${hl}">
      <label class="f">Interval between doses (days)</label><input name="t" type="number" step="any" min="0" inputmode="decimal" value="${hl>=2?7:1}">
    </form>
    <div class="out" id="outD"></div>
  </section>`+footerHtml();
}
function calcUpdate(){
  const R=document.getElementById("calcR"); if(R){
    const v=+R.v.value,w=+R.w.value,d=+R.d.value,s=+R.s.value, dmg=R.u.value==="mcg"?d/1000:d;
    const o=document.getElementById("outR");
    if(v>0&&w>0){
      const c=v/w; let h=`<span>Concentration</span><b>${fmtNum(c,3)} mg/mL (${fmtNum(c*1000,1)} mcg/mL)</b>`;
      if(dmg>0){
        const vol=dmg/c, units=vol*100;
        h+=`<span>Volume to draw</span><b>${fmtNum(vol,3)} mL</b><span>Syringe units (U-100)</span><b>${fmtNum(units,1)}</b>
        <span>Doses per vial (approx.)</span><b>${fmtNum(Math.floor(v/dmg*100)/100,2)}</b>`;
        if(vol>s) h+=`<span style="grid-column:1/3;color:var(--danger)">Volume exceeds the selected syringe size.</span>`;
      }
      o.innerHTML=h;
    } else o.innerHTML=`<span class="muted" style="grid-column:1/3">Enter vial amount and diluent volume.</span>`;
  }
  const D=document.getElementById("calcD"); if(D){
    const d=+D.d.value,h=+D.h.value,t=+D.t.value,u=D.u.value, o=document.getElementById("outD");
    if(d>0&&h>0&&t>0){
      const f=Math.pow(.5,t/h), acc=1/(1-f), unit=x=>fmtNum(x,3)+" "+u;
      o.innerHTML=`<span>Remaining at next dose</span><b>${fmtNum(f*100,1)}%</b><span>Accumulation factor</span><b>×${fmtNum(acc,2)}</b>
      <span>Steady-state peak</span><b>${unit(d*acc)}</b><span>Steady-state trough</span><b>${unit(d*acc*f)}</b>
      <span>Approx. time to steady state</span><b>${fmtNum(h*4.5,1)} days</b>`;
    } else o.innerHTML=`<span class="muted" style="grid-column:1/3">Enter dose, half-life and interval.</span>`;
  }
}
function viewSettings(){
  const s=S.settings, sel=drugById(s.drug), ov=s.halfLives[sel.id];
  return header("Settings")+`
  ${installCardHtml()}<section class="card"><h2>Saved on this device</h2>
    <p style="font-size:19px">No account or PIN. Records stay in this browser on this website.</p>
    <p class="muted">Export a backup before clearing browser data or changing devices. Each browser has its own journal.</p>
    <p class="muted">JSON backups can also be imported below.</p>
    <div class="row"><button class="btn primary" data-action="export">Export backup</button><button class="btn" data-action="import">Import backup</button></div>
    <div class="row" style="margin-top:12px"><button class="btn" data-action="share">Share backup (e.g. to Google Drive)</button></div>
    <p class="muted small">On Android, Share lets you pick Drive. On a computer, export the file into a Google Drive folder. Share excludes CoA files; Export includes them.</p>
    <input type="file" id="importFile" accept="application/json,.json" hidden>
  </section>
  <section class="card"><h2>Personal goals</h2>
    <div class="grid2"><div><label class="f">Water per day (mL)</label><input type="number" min="0" step="50" data-set="waterGoal" value="${s.waterGoal??""}" placeholder="Not set"></div>
    <div><label class="f">Protein per day (g)</label><input type="number" min="0" step="5" data-set="proteinGoal" value="${s.proteinGoal??""}" placeholder="Not set"></div></div>
    <label class="f">Goal weight (kg)</label><input type="number" min="20" max="500" step="0.1" data-set="goalWeight" value="${s.goalWeight??""}" placeholder="Not set">
  </section>
  <section class="card"><h2>Shot reminder</h2>
    <div class="grid2"><div><label class="f">Shot day</label>
    <select data-set="shotDay"><option value="">Not set</option>${WEEKDAYS.map((d,i)=>`<option value="${i}" ${s.shotDay!==null&&Number(s.shotDay)===i?"selected":""}>${d}</option>`).join("")}</select></div>
    <div><label class="f">Time</label><input type="time" data-set="shotTime" value="${s.shotTime||"18:00"}"></div></div>
    <div class="chips"><button class="chip ${s.notify?"on":""}" data-action="notify">${s.notify?"Browser notifications on":"Enable browser notifications"}</button></div>
    <p class="muted small">Notifications only fire while this page is open in Chrome.</p>
  </section>
  <section class="card"><h2>Compounds</h2>
    <p class="muted small">Half-lives are rough reference values. Several research compounds have little or no published human data, so edit them to match your own source.</p>
    <label class="f">${esc(sel.name)} half-life (days) ${sel.approx?"· approximate":""}${sel.comps?" · blend: components use their own half-lives":""}</label>
    <input type="number" step="any" min="0" data-hl="${esc(sel.id)}" value="${ov??""}" placeholder="${sel.hl?"Default: "+sel.hl:"Unknown – enter days"}">
    <div class="row" style="margin-top:14px"><button class="btn" data-action="addCustom">Add custom compound</button>${ov?`<button class="btn" data-action="resetHl">Reset to default</button>`:""}</div>
    ${S.custom.length?`<div class="list" style="margin-top:12px">${S.custom.map(c=>`<div class="item"><div>${esc(c.name)} <span class="muted small">· ${fmtNum(c.hl,4)} d</span></div><button class="btn sm danger" data-action="delCustom" data-id="${c.id}">Remove</button></div>`).join("")}</div>`:""}
  </section>
  <section class="card"><h2>Data</h2>
    <div class="row"><button class="btn" data-action="demo">Load demo data</button><button class="btn danger" data-action="erase">Erase all data</button></div>
  </section>`+footerHtml();
}
function footerHtml(){ return `<footer>v${VERSION} · Personal tracking · Medication amounts are estimates, not blood measurements or dosing advice.</footer>`; }

