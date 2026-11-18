"use strict";
/* ---------- Daily AI report: analyses a day's weight, fluids, symptoms, meals and shots ---------- */
const dayStart=k=>{ const [y,m,d]=k.split("-").map(Number); return new Date(y,m-1,d).getTime(); };
const dayEnd=k=>{ const [y,m,d]=k.split("-").map(Number); return new Date(y,m-1,d+1).getTime(); };
const keyOffset=n=>{ const d=new Date(); d.setDate(d.getDate()+n); return dateKey(d.getTime()); };
const reports=()=>S.reports||(S.reports={});
let repDay="y", repBusy=false, repMsg="";
const repKey=()=>keyOffset(repDay==="y"?-1:0);

function dayData(k){
  const a=dayStart(k), b=dayEnd(k), s=S.settings, inDay=t=>t>=a&&t<b;
  const W=[...S.weights].sort((x,y)=>x.ts-y.ts), wd=W.filter(w=>inDay(w.ts)), prev=[...W].reverse().find(w=>w.ts<a);
  const ml=meals().filter(m=>inDay(m.ts));
  const j=S.journal.filter(x=>inDay(x.ts)).map(x=>({time:fmtTime(x.ts),mood:MOODS[(x.mood||3)-1],symptoms:x.sym||[],note:x.note||""}));
  const nm=id=>((typeof drugById==="function"&&drugById(id))||{}).name||id;
  const shots=S.shots.filter(x=>x.ts>=a-6*864e5&&x.ts<b).map(x=>({drug:nm(x.drug),mg:x.mg,when:fmtDate(x.ts)+" "+fmtTime(x.ts),days_before_report_day_end:Math.round((b-x.ts)/864e5*10)/10,site:x.site||""}));
  const water=S.water[k]||0, protein=S.protein[k]||0;
  const data={
    date:fmtDate(a),
    weight:{logged_that_day_kg:wd.map(w=>w.kg),previous_weigh_in:prev?{kg:prev.kg,date:fmtDate(prev.ts)}:null,goal_kg:s.goalWeight||null},
    fluids:{water_ml:water,goal_ml:s.waterGoal||null},
    protein:{total_g:protein,goal_g:s.proteinGoal||null},
    calories:{from_logged_meals_kcal:ml.reduce((x,m)=>x+m.kcal,0),goal_kcal:s.calGoal||null},
    meals:ml.map(m=>({time:fmtTime(m.ts),what:m.desc||"Meal",kcal:m.kcal,protein_g:m.protein})),
    journal_entries:j,
    shots_in_previous_7_days:shots
  };
  const has=wd.length||ml.length||water>0||protein>0||j.length||shots.some(x=>x.days_before_report_day_end<=1);
  return {data,has};
}
function reportPrompt(label,data){
  return `You write a short, friendly daily check-in for someone using a GLP-1 / peptide tracker. Analyse ONLY the data below for ${label}. If something is not logged, say so briefly rather than guessing. Do not diagnose, do not suggest changing doses or medication, and do not recommend extreme calorie cuts. If symptoms sound severe or persistent (e.g. repeated vomiting, severe abdominal pain, signs of dehydration), advise contacting their prescriber. You may gently note common links (for example low fluids and constipation or headache; low protein while losing weight and muscle loss; symptoms in the days after a shot).
Format: plain text, NO markdown symbols, under 220 words. Use these section titles, each on its own line ending with a colon, followed by 1-3 short sentences: Overview: / Food and protein: / Fluids: / Weight: / Symptoms and mood: / Focus for tomorrow:
Data (JSON, kcal values are photo estimates):
${JSON.stringify(data)}`;
}
async function aiText(prompt,tried=[]){
  const key=aiKey(); if(!key) throw new Error("Add your API key in Settings first.");
  if(aiProv()==="claude"){
    const r=await timedFetch("https://api.anthropic.com/v1/messages",{method:"POST",
      headers:{"content-type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({model:aiModel(),max_tokens:900,messages:[{role:"user",content:prompt}]})},60000);
    if(!r.ok){ let m=""; try{ m=(await r.json()).error.message; }catch(e){}
      throw new Error(r.status===401?"The API key was rejected. Check it in Settings.":`Request failed (${r.status}). ${m}`); }
    const j=await r.json(); return {text:(j.content||[]).map(b=>b.text||"").join("").trim(),model:aiModel()};
  }
  const list=PROVIDERS.gemini.models.map(m=>m[0]);
  const model=tried.length?list.find(m=>!tried.includes(m)):aiModel();
  if(!model) throw new Error("None of the Gemini models is available to this key. Check aistudio.google.com.");
  const r=await timedFetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:"POST",
    headers:{"content-type":"application/json","x-goog-api-key":key},
    body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.4,maxOutputTokens:4000}})},60000);
  if(!r.ok){ let m=""; try{ m=(await r.json()).error.message; }catch(e){}
    if(r.status===404) return aiText(prompt,[...tried,model]);
    throw new Error(/api key/i.test(m)?"The API key was rejected. Check it in Settings.":r.status===429?"Free limit reached for now. Try again in a minute, or tomorrow.":`Request failed (${r.status}) [${model}]. ${m}`); }
  const j=await r.json(), t=((j.candidates&&j.candidates[0]&&j.candidates[0].content&&j.candidates[0].content.parts)||[]).map(b=>b.text||"").join("").trim();
  if(!t) throw new Error("The AI returned nothing. Try again.");
  if(model!==aiModel()){ S.settings.aiModelG=model; save(); }
  return {text:t,model};
}
const repHtml=t=>esc(t.replace(/[*#`]/g,"")).replace(/^([A-Z][A-Za-z &',’-]{2,40}):\s*$/gm,"<b>$1</b>");

function reportCard(){
  const k=repKey(), rep=reports()[k], label=repDay==="y"?"yesterday":"today so far";
  return `<section class="card"><h2>Daily report</h2>
    <div class="chips"><button class="chip ${repDay==="y"?"on":""}" data-action="repDay" data-d="y">Yesterday</button><button class="chip ${repDay==="t"?"on":""}" data-action="repDay" data-d="t">Today so far</button></div>
    ${rep?`<div style="white-space:pre-wrap;line-height:1.5">${repHtml(rep.text)}</div><div class="muted small" style="margin-top:8px">Generated ${fmtDate(rep.ts)} ${fmtTime(rep.ts)}. AI summary of your own logs, not medical advice.</div>`:`<p class="muted small">AI summary of ${label}'s weight, fluids, meals, symptoms and shots.</p>`}
    <div class="small" id="repMsg" role="status" style="margin-top:6px;color:var(--muted)">${esc(repMsg)}</div>
    <div class="row" style="margin-top:10px"><button class="btn primary" data-action="repGo" ${repBusy?"disabled":""}>${rep?"Regenerate":"Generate"} report</button></div></section>`;
}
const _vToday5=viewToday;
viewToday=function(){ return _vToday5().replace('<section class="card"><h2>Meals today</h2>',m=>reportCard()+m); };

Object.assign(actions,{
  repDay:el=>{ repDay=el.dataset.d==="t"?"t":"y"; repMsg=""; render(); },
  repGo:async()=>{
    if(repBusy) return;
    const k=repKey(), {data,has}=dayData(k), label=repDay==="y"?"yesterday ("+data.date+")":"today so far ("+data.date+")";
    const set=t=>{ repMsg=t; const e=document.getElementById("repMsg"); if(e) e.textContent=t; };
    if(!aiKey()){ set("Add your API key in Settings first."); return; }
    if(!has){ set("Nothing logged for "+(repDay==="y"?"yesterday":"today")+" yet."); return; }
    repBusy=true; render(); let secs=0; set("Writing report… 0s");
    const tick=setInterval(()=>{ secs++; if(repBusy) set("Writing report… "+secs+"s"); },1000);
    try{
      const r=await aiText(reportPrompt(label,data));
      reports()[k]={ts:Date.now(),text:r.text,model:r.model};
      const keep=Object.keys(S.reports).sort().slice(-30); Object.keys(S.reports).forEach(x=>{ if(!keep.includes(x)) delete S.reports[x]; });
      save(); repMsg="";
    }catch(e){ repMsg=e.message; }
    finally{ clearInterval(tick); repBusy=false; render(); }
  }
});

const APP_VERSION5="1.6.0", APP_DATE5="18 Nov 2026";
footerHtml=function(){ return `<footer>v${APP_VERSION5} · Released ${APP_DATE5} · Personal tracking · Medication amounts are estimates, not blood measurements or dosing advice.</footer>`; };
render();
