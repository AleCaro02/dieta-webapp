const DAYS = ["Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato","Domenica"];
const MEALS = ["Colazione","Spuntino Matt.","Pranzo","Merenda","Cena"];

let rows = [];
let currentDate = new Date();
let selected = JSON.parse(localStorage.getItem("dietSelections") || "{}");
let shoppingChecks = JSON.parse(localStorage.getItem("shoppingChecks") || "{}");

const $ = id => document.getElementById(id);
const norm = s => String(s ?? "").trim().toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g,"");

function dayKey(d){ return DAYS[d.getDay() === 0 ? 6 : d.getDay()-1]; }
function dateText(d){ return d.toLocaleDateString("it-IT",{day:"numeric",month:"long",year:"numeric"}); }

function showStatus(msg){
  $("status").textContent = msg;
  $("status").classList.remove("hidden");
}
function hideStatus(){ $("status").classList.add("hidden"); }

function updateHeader(){
  $("dayName").textContent = dayKey(currentDate);
  $("dateLabel").textContent = dateText(currentDate);
}

function groupRows(day, meal){
  return rows.filter(r => norm(r.Giorno)===norm(day) && norm(r.Pasto)===norm(meal));
}

function groupByNumber(items){
  const map = new Map();
  for(const r of items){
    const g = String(r.Gruppo ?? "1").trim() || "1";
    if(!map.has(g)) map.set(g,[]);
    map.get(g).push(r);
  }
  return [...map.entries()].sort((a,b)=>{
    const na=Number(a[0]), nb=Number(b[0]);
    return (Number.isFinite(na)&&Number.isFinite(nb)) ? na-nb : a[0].localeCompare(b[0]);
  });
}

function rowId(r){ return [r.Giorno,r.Pasto,r.Gruppo,r.Alimento,r.Quantità,r.Unità].map(x=>String(x??"")).join("|"); }

function renderDay(){
  updateHeader();
  if(!rows.length){
    $("dayView").innerHTML = `<div class="empty">Carica il tuo file Excel per visualizzare la dieta.</div>`;
    return;
  }
  const day = dayKey(currentDate);
  let html = "";
  for(const meal of MEALS){
    const items = groupRows(day,meal);
    if(!items.length) continue;
    const groups = groupByNumber(items);
    html += `<article class="meal"><div class="meal-head"><div><div class="meal-title">${meal}</div></div></div>`;
    for(const [g, opts] of groups){
      const isChoice = opts.length > 1;
      const key = `${day}|${meal}|${g}`;
      const val = selected[key];
      html += `<div class="group">
        ${isChoice ? `<div class="group-label">Scegli una</div>` : ""}
        ${opts.map((r,i)=>{
          const id=rowId(r);
          const checked = isChoice ? val===id : true;
          return `<label class="choice">
            ${isChoice ? `<input type="radio" name="${CSS.escape(key)}" data-key="${escapeHtml(key)}" value="${escapeHtml(id)}" ${checked?"checked":""}>` : `<input type="checkbox" checked disabled>`}
            <span class="food">${escapeHtml(r.Alimento)}
              ${r.Note ? `<span class="note">${escapeHtml(r.Note)}</span>`:""}
            </span>
            <span class="qty">${escapeHtml(r.Quantità)} ${escapeHtml(r.Unità||"")}</span>
          </label>`;
        }).join("")}
      </div>`;
    }
    html += `</article>`;
  }
  $("dayView").innerHTML = html || `<div class="empty">Non risultano pasti per ${day}.</div>`;
  $("dayView").querySelectorAll("input[type=radio]").forEach(el=>{
    el.addEventListener("change", e=>{
      selected[e.target.dataset.key]=e.target.value;
      localStorage.setItem("dietSelections",JSON.stringify(selected));
      renderShopping();
    });
  });
}

function renderWeek(){
  if(!rows.length){$("weekView").innerHTML=`<div class="empty">Carica il file Excel.</div>`;return;}
  let html="";
  for(const day of DAYS){
    const dayRows=rows.filter(r=>norm(r.Giorno)===norm(day));
    if(!dayRows.length) continue;
    html+=`<article class="day-card card"><h3>${day}</h3>`;
    for(const meal of MEALS){
      const items=groupRows(day,meal); if(!items.length) continue;
      html+=`<div class="mini-meal"><strong>${meal}</strong>`;
      for(const [g,opts] of groupByNumber(items)){
        const choice=opts.length>1;
        const key=`${day}|${meal}|${g}`;
        const val=selected[key];
        const chosen=choice ? opts.find(o=>rowId(o)===val) : opts[0];
        html+=`<div class="mini-food">• ${escapeHtml(chosen?chosen.Alimento:opts.map(o=>o.Alimento).join(" / "))}${chosen&&chosen.Quantità?` — ${escapeHtml(chosen.Quantità)} ${escapeHtml(chosen.Unità||"")}`:""}${choice&&!chosen?" — scegli nell'app":" "}</div>`;
      }
      html+=`</div>`;
    }
    html+=`</article>`;
  }
  $("weekView").innerHTML=html;
}

function formatQty(n){
  // Rounds to 2 decimals and drops trailing zeros (150 -> "150", 33.333 -> "33.33")
  const r=Math.round(n*100)/100;
  return String(r);
}

function renderShopping(){
  if(!rows.length){$("shoppingView").innerHTML=`<div class="empty">Carica il file Excel.</div>`;return;}
  // Aggregates the foods currently selected su tutta la settimana. Le alternative contano solo se scelte nell'app.
  const map=new Map();
  for(const r of rows){
    const opts=groupRows(r.Giorno,r.Pasto).filter(x=>String(x.Gruppo??"1")===String(r.Gruppo??"1"));
    if(opts.length>1){
      const key=`${r.Giorno}|${r.Pasto}|${r.Gruppo}`;
      if(selected[key]!==rowId(r)) continue;
    }
    const k=norm(r.Alimento);
    const unit=String(r.Unità||"").trim();
    if(!map.has(k)) map.set(k,{name:r.Alimento, byUnit:new Map(), occurrences:0});
    const entry=map.get(k);
    entry.occurrences++;
    const qNum=parseFloat(String(r.Quantità??"").replace(",","."));
    if(!entry.byUnit.has(unit)) entry.byUnit.set(unit,{sum:0,hasNumeric:false,raw:[]});
    const u=entry.byUnit.get(unit);
    if(!isNaN(qNum)){ u.sum+=qNum; u.hasNumeric=true; }
    else if(String(r.Quantità??"").trim()){ u.raw.push(String(r.Quantità).trim()); }
  }
  const entries=[...map.values()].sort((a,b)=>a.name.localeCompare(b.name,"it"));
  $("shoppingView").innerHTML = `<div class="shopping-section">
    <h3>🛒 Lista della spesa — settimana intera</h3>
    <div class="note">Quantità totali di ciò che ti serve durante la settimana (somma di tutti i pasti in cui compare). Tiene conto delle alternative che hai selezionato.</div>
    ${entries.map(e=>{
      const id="shop-"+norm(e.name).replace(/[^a-z0-9]+/g,"-");
      const checked=!!shoppingChecks[id];
      const parts=[];
      for(const [unit,u] of e.byUnit.entries()){
        if(u.hasNumeric) parts.push(`${formatQty(u.sum)}${unit?" "+unit:""}`);
        parts.push(...u.raw.map(x=>unit?`${x} ${unit}`:x));
      }
      const qtyText=parts.length?parts.join(" + "):"";
      const timesText = e.occurrences>1 ? ` <span class="shop-times">(×${e.occurrences} nella settimana)</span>` : "";
      return `<label class="shop-item ${checked?"is-checked":""}"><input type="checkbox" data-shop="${id}" ${checked?"checked":""}>
        <span><strong>${escapeHtml(e.name)}</strong>${qtyText?` — ${escapeHtml(qtyText)}`:""}${timesText}</span></label>`;
    }).join("")}
  </div>`;
  $("shoppingView").querySelectorAll("[data-shop]").forEach(el=>{
    el.addEventListener("change",e=>{
      shoppingChecks[e.target.dataset.shop]=e.target.checked;
      localStorage.setItem("shoppingChecks",JSON.stringify(shoppingChecks));
      el.closest(".shop-item").classList.toggle("is-checked",e.target.checked);
    });
  });
}

function escapeHtml(s){
  return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function arrayBufferToBase64(buf){
  let binary="";
  const bytes=new Uint8Array(buf);
  for(let i=0;i<bytes.byteLength;i++) binary+=String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function base64ToArrayBuffer(b64){
  const binary=atob(b64);
  const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
  return bytes.buffer;
}

function parseWorkbook(data, opts){
  opts = opts || {};
  const wb=XLSX.read(data,{type:"array"});
  const ws=wb.Sheets[wb.SheetNames[0]];
  rows=XLSX.utils.sheet_to_json(ws,{defval:""});
  const required=["Giorno","Pasto","Gruppo","Alimento","Quantità","Unità"];
  const headers=Object.keys(rows[0]||{});
  const missing=required.filter(x=>!headers.includes(x));
  if(missing.length) throw new Error("Nel primo foglio mancano le colonne: "+missing.join(", "));
  hideStatus();
  $("dataStatus").textContent=`Dieta caricata · ${rows.length} righe`;
  renderAll();
  if(opts.persist){
    try{
      localStorage.setItem("dietaXlsxBase64", arrayBufferToBase64(data));
      const check = localStorage.getItem("dietaXlsxBase64");
      if(!check) throw new Error("verifica fallita dopo il salvataggio");
      console.log("[dieta] Excel salvato in memoria locale, "+data.byteLength+" byte");
    }catch(e){
      console.error("[dieta] impossibile salvare l'Excel in locale:", e);
      showStatus("Attenzione: il file è stato caricato ma non è stato possibile salvarlo per la prossima volta ("+e.message+"). Dovrai ricaricarlo al prossimo avvio.");
    }
  }
}

async function loadDefault(){
  // 1) prova prima il file salvato localmente da un upload precedente
  const cached = localStorage.getItem("dietaXlsxBase64");
  console.log("[dieta] cache trovata all'avvio:", !!cached, cached ? `(${cached.length} caratteri)` : "");
  if(cached){
    try{
      parseWorkbook(base64ToArrayBuffer(cached));
      return;
    }catch(e){ /* cache corrotta, continua con i tentativi successivi */ }
  }
  // 2) altrimenti prova dieta.xlsx nella stessa cartella (se l'hai messo nel repo)
  try{
    const res=await fetch("dieta.xlsx",{cache:"no-store"});
    if(!res.ok) throw new Error("File dieta.xlsx non trovato");
    parseWorkbook(await res.arrayBuffer());
  }catch(e){
    $("dataStatus").textContent="Nessun file dieta.xlsx";
    showStatus("Carica il tuo file Excel col pulsante ↥ (verrà ricordato automaticamente la prossima volta).");
    renderAll();
  }
}

function renderAll(){ renderDay(); renderWeek(); renderShopping(); }

$("prevDay").onclick=()=>{currentDate.setDate(currentDate.getDate()-1);renderDay();};
$("nextDay").onclick=()=>{currentDate.setDate(currentDate.getDate()+1);renderDay();};
$("uploadBtn").onclick=()=>$("fileInput").click();
$("fileInput").onchange=async e=>{
  const f=e.target.files[0]; if(!f)return;
  try{parseWorkbook(await f.arrayBuffer(), {persist:true});}
  catch(err){showStatus("Errore nel file Excel: "+err.message);}
};

document.querySelectorAll(".tab").forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const v=btn.dataset.view;
    $("dayView").classList.toggle("hidden",v!=="day");
    $("weekView").classList.toggle("hidden",v!=="week");
    $("shoppingView").classList.toggle("hidden",v!=="shopping");
    if(v==="shopping") renderShopping();
  };
});

updateHeader();
loadDefault();
