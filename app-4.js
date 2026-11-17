"use strict";
/* ---------- Meals: photo -> rough calories & protein via the Claude API ---------- */
const AIKEY="peptide-tracker-ai-key";   // kept outside the main data so it is never exported in backups
const MEAL_MODELS=[["claude-sonnet-5-5","Sonnet 5.5 (more accurate)"],["claude-haiku-5-5","Haiku 5.5 (cheapest)"]];
const meals=()=>S.meals||(S.meals=[]);
const aiKey=()=>{ try{ return localStorage.getItem(AIKEY)||""; }catch(e){ return ""; } };
const aiModel=()=>S.settings.aiModel||MEAL_MODELS[0][0];
let mealImg=null;

const MEAL_PROMPT=`You estimate calories and protein from a photo of food. Identify each food item, assume a realistic portion size from visual cues (plates, hands, packaging, typical servings), and estimate. Include sauces, spreads and oils you can reasonably infer. Reply with JSON only, no other text:
{"items":[{"name":string,"portion":string,"kcal":number,"protein_g":number}],"kcal_low":number,"kcal_high":number,"protein_low":number,"protein_high":number,"assumptions":string}
The range should reflect honest uncertainty. Keep "assumptions" to one short sentence.`;

function loadImg(file){ return new Promise((res,rej)=>{ const u=URL.createObjectURL(file), im=new Image(); im.onload=()=>{ URL.revokeObjectURL(u); res(im); }; im.onerror=()=>rej(new Error("Couldn't read that image.")); im.src=u; }); }
async function shrinkImage(file){
  const im=await loadImg(file), k=Math.min(1,1280/Math.max(im.width,im.height));
  const c=document.createElement("canvas"); c.width=Math.round(im.width*k); c.height=Math.round(im.height*k);
  c.getContext("2d").drawImage(im,0,0,c.width,c.height); return c.toDataURL("image/jpeg",0.8);
}
async function estimateMeal(dataUrl,hint){
  const key=aiKey(); if(!key) throw new Error("Add your Anthropic API key in Settings first.");
  let r;
  try{
    r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",
      headers:{"content-type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({model:aiModel(),max_tokens:800,messages:[{role:"user",content:[
        {type:"image",source:{type:"base64",media_type:"image/jpeg",data:dataUrl.split(",")[1]}},
        {type:"text",text:MEAL_PROMPT+(hint?`\nUser notes about portions: ${hint}`:"")}]}]})});
  }catch(e){ throw new Error("Couldn't reach the API. Check your connection."); }
  if(!r.ok){ let m=""; try{ m=(await r.json()).error.message; }catch(e){}
    throw new Error(r.status===401?"The API key was rejected. Check it in Settings.":`Request failed (${r.status}). ${m}`); }
  const j=await r.json(), t=(j.content||[]).map(b=>b.text||"").join(""), m=t.match(/\{[\s\S]*\}/);
  if(!m) throw new Error("Couldn't read the estimate. Try again.");
  try{ return JSON.parse(m[0]); }catch(e){ throw new Error("Couldn't read the estimate. Try again."); }
}

function mealModal(){
  mealImg=null;
  showModal("Add meal",`
    <label class="f">Photo (optional)</label><input name="photo" type="file" accept="image/*">
    <img id="mealPrev" alt="Meal preview" style="display:none;width:100%;max-height:220px;object-fit:cover;border-radius:12px;margin-top:8px">
    <label class="f">Portion hints (optional)</label><input name="hint" type="text" maxlength="200" placeholder="e.g. large wraps, 2 tbsp mayo">
    <button type="button" class="btn" data-action="mealEstimate" style="width:100%;margin-top:12px">Estimate from photo</button>
    <div class="small muted" id="mealStatus" role="status"></div>
    <label class="f">What was it?</label><input name="desc" type="text" maxlength="120" placeholder="e.g. 3 half wraps and a pear">
    <div class="grid2"><div><label class="f">Calories (kcal)</label><input name="kcal" type="number" step="any" min="0" inputmode="decimal"></div>
    <div><label class="f">Protein (g)</label><input name="prot" type="number" step="any" min="0" inputmode="decimal"></div></div>
    <label class="f">Date & time</label><input name="when" type="datetime-local" value="${toLocalInput(Date.now())}">
    <p class="muted small">Estimates only. The photo is sent to Anthropic for analysis and isn't stored in this app.</p>`,
  fd=>{
    const kcal=parseFloat(fd.get("kcal")), prot=parseFloat(fd.get("prot")), ts=fromLocalInput(fd.get("when"));
    if(!(kcal>=0)&&!(prot>=0)) return "Enter calories or protein, or use Estimate from photo.";
    if(!isFinite(ts)) return "Enter a valid date.";
    const m={id:uid(),ts,desc:fd.get("desc").trim(),kcal:kcal>=0?Math.round(kcal):0,protein:prot>=0?Math.round(prot*10)/10:0};
    meals().push(m); meals().sort((a,b)=>a.ts-b.ts);
    const k=dateKey(ts); S.protein[k]=Math.round(((S.protein[k]||0)+m.protein)*10)/10;
    save(); toast("Meal added");
  });
}
function mealsCard(){
  const key=dateKey(Date.now()), list=meals().filter(m=>dateKey(m.ts)===key);
  const kc=list.reduce((a,m)=>a+m.kcal,0), pr=list.reduce((a,m)=>a+m.protein,0);
  return `<section class="card"><h2>Meals today</h2>
    <div class="grid2"><div class="stat"><div class="l">Calories</div><div class="v">${fmtNum(kc,0)}</div></div><div class="stat"><div class="l">Protein</div><div class="v">${fmtNum(pr,0)} g</div></div></div>
    ${list.length?`<div class="list" style="margin-top:12px">${list.map(m=>`<div class="item"><div><div class="t" style="font-size:17px">${esc(m.desc||"Meal")}</div><div class="muted small">${fmtTime(m.ts)} · ${fmtNum(m.kcal,0)} kcal · ${fmtNum(m.protein,0)} g protein</div></div><button class="btn sm danger" data-action="mealDel" data-id="${m.id}" aria-label="Delete meal">✕</button></div>`).join("")}</div>`:`<p class="muted small">No meals logged today. Protein from meals also counts toward your daily protein bar below.</p>`}
    <div class="row" style="margin-top:14px"><button class="btn primary" data-action="mealAdd">Add meal</button></div></section>`;
}
function aiCardHtml(){
  const has=!!aiKey();
  return `<section class="card"><h2>Meal photo analysis</h2>
    <p class="muted small">Uses your own Anthropic API key to estimate calories and protein from a photo. The key is stored only in this browser (not in backups or on GitHub). Create one at console.anthropic.com and set a low monthly spend limit. Each photo costs roughly a cent or two.</p>
    <label class="f">API key</label><input type="password" data-aikey="1" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="sk-ant-…" value="${has?"••••••••••••":""}">
    <label class="f">Model</label><select data-aimodel="1">${MEAL_MODELS.map(([v,l])=>`<option value="${v}" ${aiModel()===v?"selected":""}>${l}</option>`).join("")}</select>
    <div class="row" style="margin-top:12px">${has?`<span class="small" style="color:var(--accent)">✓ Key saved on this device</span><button class="btn sm danger" data-action="aiKeyClear">Remove key</button>`:`<span class="small muted">No key saved</span>`}</div></section>`;
}

const _viewToday=viewToday, _viewSettings=viewSettings;
viewToday=function(){ return _viewToday().replace(/<section class="card">\s*<h2>Daily habits<\/h2>/,m=>mealsCard()+m); };
viewSettings=function(){ return _viewSettings().replace('<section class="card"><h2>Personal goals</h2>',m=>aiCardHtml()+m); };

Object.assign(actions,{
  mealAdd:()=>mealModal(),
  mealDel:el=>{ const m=meals().find(x=>x.id===el.dataset.id); if(!m||!confirm("Delete this meal?")) return;
    const k=dateKey(m.ts); S.protein[k]=Math.max(0,Math.round(((S.protein[k]||0)-m.protein)*10)/10);
    S.meals=meals().filter(x=>x!==m); save(); render(); },
  aiKeyClear:()=>{ try{ localStorage.removeItem(AIKEY); }catch(e){} render(); toast("Key removed"); },
  mealEstimate:async el=>{
    const m=document.getElementById("modal"); if(!m) return;
    const st=m.querySelector("#mealStatus"), f=m.querySelector("form");
    if(!mealImg){ st.textContent="Choose a photo first."; return; }
    if(!aiKey()){ st.textContent="Add your Anthropic API key in Settings first."; return; }
    el.disabled=true; st.textContent="Analysing photo…";
    try{
      const r=await estimateMeal(mealImg,f.elements.hint.value.trim());
      if(!document.getElementById("modal")) return;
      const items=Array.isArray(r.items)?r.items:[];
      const kc=items.reduce((a,i)=>a+(Number(i.kcal)||0),0), pr=items.reduce((a,i)=>a+(Number(i.protein_g)||0),0);
      if(!f.elements.desc.value.trim()) f.elements.desc.value=items.map(i=>i.name).filter(Boolean).join(", ").slice(0,120);
      f.elements.kcal.value=Math.round(kc); f.elements.prot.value=Math.round(pr*10)/10;
      const rng=(a,b,u)=>(isFinite(a)&&isFinite(b))?`${Math.round(a)}–${Math.round(b)} ${u}`:"";
      st.innerHTML=`Estimated range: ${esc(rng(r.kcal_low,r.kcal_high,"kcal"))}${rng(r.protein_low,r.protein_high,"g")?`, ${esc(rng(r.protein_low,r.protein_high,"g protein"))}`:""}. ${esc(r.assumptions||"")}<br>${items.map(i=>`• ${esc(i.name)}${i.portion?" ("+esc(i.portion)+")":""}: ${fmtNum(Number(i.kcal)||0,0)} kcal, ${fmtNum(Number(i.protein_g)||0,0)} g`).join("<br>")}<br>You can edit the numbers before saving.`;
    }catch(e){ if(document.getElementById("modal")) st.textContent=e.message; }
    finally{ el.disabled=false; }
  }
});

document.addEventListener("change",async e=>{
  const el=e.target;
  if(el.name==="photo"&&el.closest("#modal")){
    const f=el.files&&el.files[0], st=document.getElementById("mealStatus"), pv=document.getElementById("mealPrev");
    if(!f){ mealImg=null; if(pv) pv.style.display="none"; return; }
    try{ mealImg=await shrinkImage(f); if(pv){ pv.src=mealImg; pv.style.display="block"; } if(st) st.textContent="Photo ready. Tap Estimate from photo."; }
    catch(err){ mealImg=null; if(st) st.textContent=err.message; }
  } else if(el.dataset&&el.dataset.aikey){
    const v=el.value.trim();
    if(!v){ try{ localStorage.removeItem(AIKEY); }catch(e){} }
    else if(!/^•+$/.test(v)){ try{ localStorage.setItem(AIKEY,v); toast("Key saved on this device"); }catch(e){ toast("Couldn't save the key"); } }
    render();
  } else if(el.dataset&&el.dataset.aimodel){ S.settings.aiModel=el.value; save(); toast("Saved"); }
});

render();
