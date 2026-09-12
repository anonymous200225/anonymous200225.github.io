(() => {
"use strict";

const GAJI_POKOK = 3187965;
const DAILY_RATE = GAJI_POKOK / 25;
const OVERTIME_RATE = GAJI_POKOK / 173;
const MEAL_RATE = 11800;
const JHT = GAJI_POKOK * 0.02;
const JP = GAJI_POKOK * 0.01;
const POTONGAN = JHT + JP;

/* GANTI dengan URL Web App Apps Script hasil deployment (/exec). */
const GOOGLE_SCRIPT_URL = "GANTI_DENGAN_URL_WEB_APP_APPS_SCRIPT";
const AUTO_SYNC_MS = 60 * 1000;
const LS_QUEUE = "essPendingQueue";
const LS_LAST_SYNC = "essLastSync";

let parsedData = [];
let user = {nama:"-", id:"-", jabatan:"-"};
let fileInput, summaryOutput, tableOutput, manualTanggal, manualJamLembur, manualMenitLembur, manualIndeks, btnAdd, btnReset;
let filterStart=null, filterEnd=null, displayData=null, syncInProgress=false, editId=null, autoSyncTimer=null;

const $ = id => document.getElementById(id);
const setSyncStatus = (t, good=false) => { const e=$("syncStatus"); if(e){e.textContent=t;e.style.color=good?"#86efac":"#fbbf24";} };
const configured = () => GOOGLE_SCRIPT_URL && !GOOGLE_SCRIPT_URL.startsWith("GANTI_") && /^https:\/\//i.test(GOOGLE_SCRIPT_URL);

function saveLocal(){
  localStorage.setItem("sunfishData",JSON.stringify(parsedData));
  localStorage.setItem("userInfo",JSON.stringify(user));
  localStorage.setItem(LS_LAST_SYNC,new Date().toISOString());
}
function loadLocal(){
  try{
    const s=localStorage.getItem("sunfishData"); if(s) parsedData=JSON.parse(s)||[];
    const u=localStorage.getItem("userInfo"); if(u) user=JSON.parse(u)||user;
  }catch(e){console.warn(e)}
}
function getQueue(){try{return JSON.parse(localStorage.getItem(LS_QUEUE)||"[]")||[]}catch(e){return[]}}
function setQueue(q){localStorage.setItem(LS_QUEUE,JSON.stringify(q||[]))}
function queueOperation(op){const q=getQueue();q.push({...op,queuedAt:new Date().toISOString()});setQueue(q);return q.length}
function parseIndoDate(str){if(!str)return null;const p=String(str).trim().split("/");if(p.length!==3)return null;const d=new Date(+p[2],+p[1]-1,+p[0]);return isNaN(d)?null:d}
function ddmmyyyy(d){return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`}
function formatRupiah(n){return "Rp "+Number(Math.round(n||0)).toLocaleString("id-ID")}
function formatInputDate(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function ensureId(row){if(!row.ID)row.ID=(crypto.randomUUID?crypto.randomUUID():"ess-"+Date.now()+"-"+Math.random().toString(36).slice(2));return row.ID}
function cloneRow(r){return JSON.parse(JSON.stringify(r))}
function overlayPendingRows(rows){
  const out=rows.map(normalizeSheetRow);
  const map=new Map(out.map(r=>[String(r.ID),r]));
  for(const op of getQueue()){
    if(op.action==="upsert") (op.rows||[]).forEach(r=>map.set(String(r.ID),normalizeSheetRow(r)));
    if(op.action==="delete") (op.ids||[]).forEach(id=>map.delete(String(id)));
    if(op.action==="replace") {map.clear();(op.rows||[]).forEach(r=>map.set(String(r.ID),normalizeSheetRow(r)))}
  }
  return [...map.values()];
}

function checkOffDay(jam,tipeHari){
 const ovh=$("ovh"),ovt=$("ovt"),off=$("off"),prs=$("prs"),statusPRS=$("statusPRS"); if(!ovh||!ovt)return;
 if(!jam||+jam<=0){ovh.checked=false;ovt.checked=false;if(tipeHari==="OFF"||tipeHari==="PHOFF")prs.checked=false}
 else if(tipeHari==="PHOFF"){ovh.checked=true;ovt.checked=false;off.checked=false;prs.checked=true;statusPRS.checked=true}
 else if(tipeHari==="WD"||tipeHari==="OFF"){ovh.checked=false;ovt.checked=true;prs.checked=true;off.checked=false;statusPRS.checked=true}
}
function hitungIndeksByJam(jam,tipeHari){
 jam=+jam||0;checkOffDay(jam,tipeHari);if(jam<=0)return 0;
 if(tipeHari==="OFF"||tipeHari==="PHOFF")return jam<=7?jam*2:14+(jam-7)*3+2;
 if(tipeHari==="WD")return jam<=1?1.5:1.5+(jam-1)*2;
 return 0;
}
function calculateStats(data){
 let hariKerja=0,cuti=0,absen=0,off=0,totalJam=0,totalIndeks=0,meal=0;
 data.forEach(r=>{const t=(r["Tipe Hari"]||"").toUpperCase(),s=(r.Status||"").toUpperCase(),o=(r["Other Status"]||"").toUpperCase();
 if((t==="WD"&&s==="PRS")||(t==="PHOFF"&&s==="PRS"))hariKerja++;
 if(t==="OFF"&&s==="PRS")off++; if(s==="ABS")absen++; if(s==="CT"||s==="CS")cuti++;
 if(o.includes("PRS_MEAL")||o.includes("MEAL"))meal++;
 totalJam+=parseFloat(String(r["Jam Lembur"]||"0").replace(",","."))||0;
 totalIndeks+=parseFloat(String(r["Indeks Lembur"]||"0").replace(",","."))||0;
 });
 const gajiPokokFinal=(data.length>=30)?GAJI_POKOK:(hariKerja*DAILY_RATE);
 return {hariKerja,cuti,absen,off,totalJam,totalIndeks,meal,gaji:gajiPokokFinal+totalIndeks*OVERTIME_RATE+meal*MEAL_RATE-(hariKerja>0?POTONGAN:0)};
}
function generateSummaryHtml(stats,s,e){
 return `<table class="summary-table"><tr><th colspan="2"><div class="period-center"><button id="prevMonthBtn" class="month-shift-btn">‹</button><span id="periodStart" class="period-clickable">${s||"-"}</span> — <span id="periodEnd" class="period-clickable">${e||"-"}</span><button id="nextMonthBtn" class="month-shift-btn">›</button></div></th></tr>
<tr><td>Nama Karyawan</td><td>${escapeHtml(user.nama)}</td></tr><tr><td>NIK / ID</td><td>${escapeHtml(user.id)}</td></tr><tr><td>Posisi / Jabatan</td><td>${escapeHtml(user.jabatan)}</td></tr>
<tr><td>Hari Kerja</td><td>${stats.hariKerja}</td></tr><tr><td>Cuti</td><td>${stats.cuti}</td></tr><tr><td>Absen</td><td>${stats.absen}</td></tr>
<tr><td>Jam Lembur</td><td>${stats.totalJam.toFixed(2)} jam</td></tr><tr><td>Indeks Lembur</td><td>${stats.totalIndeks.toFixed(2)}</td></tr><tr><td>Estimasi Gaji</td><td>${formatRupiah(stats.gaji)}</td></tr></table>`;
}
function escapeHtml(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]))}
function getRowClass(r){const t=(r["Tipe Hari"]||"").toUpperCase(),s=(r.Status||"").toUpperCase();if(s==="ABS")return"abs";if(s==="CT"||s==="CS")return"ct";if(t==="PHOFF")return"phoff";if(t==="OFF")return"off";if(t==="WD")return"wd";return""}
function generateTableHtml(data){
 if(!data.length)return"";const headers=Object.keys(data[0]).filter(k=>k!=="dateObj"&&!['ID','Nama','NIK','Jabatan','UpdatedAt'].includes(k));
 let h="<div class='table-responsive table-wrapper' id='dataTable'><table class='data-table'><thead><tr>";headers.forEach(x=>h+=`<th>${escapeHtml(x)}</th>`);h+="<th>Aksi</th></tr></thead><tbody>";
 data.forEach(row=>{const di=parsedData.findIndex(r=>r.ID===row.ID);h+=`<tr class="${getRowClass(row)}" data-idx="${di}" data-id="${escapeHtml(row.ID)}">`;headers.forEach(k=>h+=`<td>${escapeHtml(row[k]??"")}</td>`);h+=`<td><button class="delBtn" data-idx="${di}" title="Hapus">❌</button></td></tr>`});return h+"</tbody></table></div>";
}
function refreshUI(){
 parsedData.forEach(r=>r.dateObj=parseIndoDate(r.Tanggal));
 parsedData.sort((a,b)=>(a.dateObj&&b.dateObj)?a.dateObj-b.dateObj:0);
 displayData=parsedData.slice();
 if(filterStart||filterEnd)displayData=parsedData.filter(r=>r.dateObj&&(!filterStart||r.dateObj>=filterStart)&&(!filterEnd||r.dateObj<=filterEnd));
 tableOutput.innerHTML=generateTableHtml(displayData);attachHandlers();
 const stats=calculateStats(displayData),s=displayData[0]?.Tanggal||(filterStart?ddmmyyyy(filterStart):"-"),e=displayData.at(-1)?.Tanggal||(filterEnd?ddmmyyyy(filterEnd):"-");
 summaryOutput.innerHTML=generateSummaryHtml(stats,s,e);attachPeriodHandlers();saveLocal();
 const q=getQueue().length;if(q)setSyncStatus(`Menunggu sinkronisasi • ${q} operasi`,false);
}
function attachHandlers(){
 tableOutput.onclick=e=>{
  const del=e.target.closest(".delBtn");if(del){e.stopPropagation();deleteRowByIndex(+del.dataset.idx);return}
  const tr=e.target.closest("tbody tr");if(!tr)return;const row=parsedData.find(r=>r.ID===tr.dataset.id);if(!row)return;startEdit(row);
 };
}
function startEdit(row){
 editId=ensureId(row);document.querySelector(".input-form").scrollIntoView({behavior:"smooth",block:"center"});
 const toIso=t=>{const d=parseIndoDate(t);return d?formatInputDate(d):""};
 manualTanggal.value=toIso(row.Tanggal);manualJamLembur.value=row["Jam Lembur"]||0;manualMenitLembur.value=row["Menit Lembur"]||0;manualIndeks.value=String(row["Indeks Lembur"]||"").replace(",",".");
 const r1=document.querySelector(`input[name="manualTipeHari"][value="${row["Tipe Hari"]}"]`);if(r1)r1.checked=true;
 const r2=document.querySelector(`input[name="manualStatus"][value="${row.Status}"]`);if(r2)r2.checked=true;
 document.querySelectorAll(".other-status").forEach(cb=>cb.checked=false);
 String(row["Other Status"]||"").split(",").map(x=>x.trim()).filter(Boolean).forEach(x=>{const c=document.querySelector(`.other-status[value="${x}"]`);if(c)c.checked=true});
 btnAdd.textContent="UPDATE & SIMPAN";const c=$("btnCancelEdit");if(c)c.style.display="inline-block";setSyncStatus("Mode edit • perubahan akan disimpan ke Google Sheet",false);
}
function cancelEdit(){editId=null;btnAdd.textContent="SIMPAN";const c=$("btnCancelEdit");if(c)c.style.display="none"}
async function deleteRowByIndex(index){
 if(!confirm("Hapus baris ini?"))return;const row=parsedData[index];if(!row)return;ensureId(row);
 applyLocalMutation({action:"delete",ids:[row.ID]});
 try{await sendOrQueue({action:"delete",ids:[row.ID]});await syncFromGoogleSheet();}catch(e){setSyncStatus("Offline/tertunda: data dihapus lokal dan akan dikirim otomatis",false)}
}
function updateOtherStatus(t){document.querySelectorAll(".other-status").forEach(c=>c.checked=false);if(t==="WD"){$("eai").checked=true;$(`prs`).checked=true;$(`prsmeal`).checked=true;$(`statusPRS`).checked=true}}
function updateStatus(s){document.querySelectorAll(".other-status").forEach(c=>c.checked=false);if(s==="PRS"&&$("tipeHariWD").checked){$("eai").checked=true;$("prs").checked=true;$("prsmeal").checked=true}else if(s==="ABS"){$("tipeHariWD").checked=true;$("abs").checked=true}else if(s==="OFF"){$("tipeHariOFF").checked=true;$("off").checked=true}else if(s==="CT"){$("tipeHariWD").checked=true;$("ct").checked=true}}
function attachPeriodHandlers(){const a=$("periodStart"),b=$("periodEnd"),p=$("prevMonthBtn"),n=$("nextMonthBtn");if(p)p.onclick=()=>shiftMonth(-1);if(n)n.onclick=()=>shiftMonth(1);if(a)a.onclick=onStartClick;if(b)b.onclick=onEndClick}
function shiftMonth(off){if(!filterStart||!filterEnd){if(!parsedData.length)return;filterStart=parsedData[0].dateObj;filterEnd=parsedData.at(-1).dateObj}const s=new Date(filterStart),e=new Date(filterEnd);s.setMonth(s.getMonth()+off);e.setMonth(e.getMonth()+off);filterStart=s;filterEnd=e;localStorage.setItem("filterStart",formatInputDate(s));localStorage.setItem("filterEnd",formatInputDate(e));$("filterStartInput").value=formatInputDate(s);$("filterEndInput").value=formatInputDate(e);refreshUI()}
function onStartClick(){const x=$("filterStartInput");x.value=formatInputDate(filterStart||new Date());x.click()}
function onEndClick(){const x=$("filterEndInput");x.value=formatInputDate(filterEnd||new Date());x.click()}

function normalizeSheetRow(row){return {ID:String(row.ID||""),Tanggal:String(row.Tanggal||""),["Tipe Hari"]:String(row["Tipe Hari"]||""),["Menit Lembur"]:row["Menit Lembur"]??"",["Jam Lembur"]:String(row["Jam Lembur"]??""),["Indeks Lembur"]:String(row["Indeks Lembur"]??""),Status:String(row.Status||""),["Other Status"]:String(row["Other Status"]||""),Nama:String(row.Nama||""),NIK:String(row.NIK||""),Jabatan:String(row.Jabatan||""),UpdatedAt:row.UpdatedAt||""}}
function jsonp(url,timeout=15000){
 return new Promise((resolve,reject)=>{
  const cb="__essSync_"+Date.now()+"_"+Math.random().toString(36).slice(2);let done=false;
  const cleanup=()=>{delete window[cb];if(script.parentNode)script.parentNode.removeChild(script);clearTimeout(timer)};
  const finish=(fn,v)=>{if(done)return;done=true;cleanup();fn(v)};
  window[cb]=r=>finish(resolve,r);
  const script=document.createElement("script");script.src=url+(url.includes("?")?"&":"?")+"callback="+encodeURIComponent(cb)+"&_="+Date.now();script.onerror=()=>finish(reject,new Error("Tidak dapat terhubung ke Google Sheet"));document.body.appendChild(script);
  const timer=setTimeout(()=>finish(reject,new Error("Waktu koneksi ke Google Sheet habis")),timeout);
 });
}
async function syncFromGoogleSheet(){
 if(!configured()){setSyncStatus("Google Sheet belum dikonfigurasi",false);return Promise.reject(new Error("URL Apps Script belum diisi di js/ess.js"));}
 if(syncInProgress)return;
 syncInProgress=true;setSyncStatus("Memeriksa Google Sheet...");
 try{
  const result=await jsonp(GOOGLE_SCRIPT_URL+"?action=sync");
  if(!result?.success)throw new Error(result?.error||"Gagal membaca Google Sheet");
  parsedData=overlayPendingRows(result.rows||[]);
  if(result.user&&result.user.nama)user=result.user;
  saveLocal();
  const q=getQueue().length;setSyncStatus(q?`Online • ${q} operasi menunggu`:`Tersinkron • ${parsedData.length} data`,!q);
  return parsedData;
 }finally{syncInProgress=false}
}
function postToGoogleSheet(payload){
 if(!configured())return Promise.reject(new Error("URL Apps Script belum diisi di js/ess.js"));
 return new Promise((resolve,reject)=>{
  const name="ess_post_"+Date.now()+"_"+Math.random().toString(36).slice(2),iframe=document.createElement("iframe");iframe.name=name;iframe.style.display="none";document.body.appendChild(iframe);
  const form=document.createElement("form");form.method="POST";form.action=GOOGLE_SCRIPT_URL;form.target=name;form.style.display="none";
  const input=document.createElement("input");input.type="hidden";input.name="data";input.value=JSON.stringify(payload);form.appendChild(input);document.body.appendChild(form);form.submit();
  setTimeout(()=>{form.remove();iframe.remove();resolve()},1200);
 });
}
async function sendOrQueue(payload){
 if(!navigator.onLine||!configured()){queueOperation(payload);throw new Error("offline")}
 try{await postToGoogleSheet(payload)}catch(e){queueOperation(payload);throw e}
}
async function flushQueue(){
 if(syncInProgress||!navigator.onLine||!configured())return;
 const q=getQueue();if(!q.length)return;
 setSyncStatus(`Mengirim ${q.length} operasi tertunda...`);
 const remain=[];
 for(const op of q){try{await postToGoogleSheet(op);await new Promise(r=>setTimeout(r,500))}catch(e){remain.push(op);break}}
 setQueue(remain);
 if(remain.length)setSyncStatus(`Offline/tertunda • ${remain.length} operasi`,false);else setSyncStatus("Perubahan tertunda sudah dikirim",true);
}
async function syncNow(){try{await flushQueue();await syncFromGoogleSheet()}catch(e){setSyncStatus(navigator.onLine?"Gagal sync • cache lokal tetap aktif":"Offline • menggunakan cache lokal",false)}}
async function saveToGoogleSheet(rows){
 const out=rows.map(r=>({ID:ensureId(r),Tanggal:r.Tanggal,["Tipe Hari"]:r["Tipe Hari"],["Menit Lembur"]:r["Menit Lembur"],["Jam Lembur"]:r["Jam Lembur"],["Indeks Lembur"]:r["Indeks Lembur"],Status:r.Status,["Other Status"]:r["Other Status"],Nama:user.nama,NIK:user.id,Jabatan:user.jabatan}));
 await sendOrQueue({action:"upsert",rows:out});
}
function applyLocalMutation(payload){
 if(payload.action==="upsert"){
  (payload.rows||[]).forEach(r=>{ensureId(r);const i=parsedData.findIndex(x=>x.ID===r.ID);if(i>=0)parsedData[i]={...parsedData[i],...r};else parsedData.push(r)});
 }else if(payload.action==="delete")parsedData=parsedData.filter(r=>!(payload.ids||[]).includes(r.ID));
 else if(payload.action==="replace")parsedData=payload.rows||[];
 refreshUI();
}
async function addManualEntry(){
 const iso=manualTanggal.value;if(!iso)return alert("Tanggal belum diisi.");const [y,m,d]=iso.split("-"),tgl=`${d}/${m}/${y}`;
 const jam=+manualJamLembur.value||0,menit=Math.round(jam*60),tipe=document.querySelector("input[name='manualTipeHari']:checked").value,status=document.querySelector("input[name='manualStatus']:checked").value,other=[...document.querySelectorAll(".other-status:checked")].map(c=>c.value).join(",");
 const idx=editId?parsedData.findIndex(r=>r.ID===editId):parsedData.findIndex(r=>r.Tanggal===tgl);const old=idx>=0?parsedData[idx]:null;
 const row={ID:old?.ID||editId||undefined,Tanggal:tgl,["Tipe Hari"]:tipe,["Menit Lembur"]:menit,["Jam Lembur"]:jam.toFixed(2),["Indeks Lembur"]:(+manualIndeks.value||hitungIndeksByJam(jam,tipe)).toFixed(2),Status:status,["Other Status"]:other};ensureId(row);
 applyLocalMutation({action:"upsert",rows:[row]});
 setSyncStatus("Menyimpan ke Google Sheet...");
 try{await sendOrQueue({action:"upsert",rows:[{...row,Nama:user.nama,NIK:user.id,Jabatan:user.jabatan}]});cancelEdit();if(navigator.onLine)await syncFromGoogleSheet();else setSyncStatus("Offline • tersimpan lokal, akan dikirim otomatis",false);}
 catch(e){setSyncStatus("Offline/tertunda • perubahan akan dikirim otomatis",false);cancelEdit()}
}
function resetData(){
 if(!confirm("Hapus SEMUA data di Google Sheet dan lokal?"))return;
 applyLocalMutation({action:"replace",rows:[]});
 const payload={action:"replace",rows:[]};sendOrQueue(payload).then(()=>syncFromGoogleSheet()).catch(()=>setSyncStatus("Offline/tertunda • penghapusan akan dikirim otomatis",false));
}
function handleFileSelect(evt){
 const file=evt.target.files[0];if(!file)return;if(!file.name.toLowerCase().endsWith(".xls"))return alert("Gunakan file .xls dari ESS");
 const reader=new FileReader();reader.onload=e=>{try{
  const doc=new DOMParser().parseFromString(e.target.result,"text/html"),table=doc.querySelector("table.tabGen");if(!table)return alert("Tabel tabGen tidak ditemukan.");
  const res=[];table.querySelectorAll("tbody tr").forEach(r=>{const td=r.querySelectorAll("td");if(td.length<23)return;const serial=parseFloat(td[0].textContent.trim());let date;if(!isNaN(serial)){date=new Date((serial-25569)*86400*1000).toLocaleDateString("id-ID")}else date=td[0].textContent.trim();
  user={nama:td[1].textContent.trim()||"-",id:td[2].textContent.trim()||"-",jabatan:td[3].textContent.trim()||"-"};const menit=(td[17].textContent||"").trim(),jam=(parseFloat(menit)/60);res.push({ID:undefined,Tanggal:date,["Tipe Hari"]:(td[15].textContent||"").trim().toUpperCase(),["Menit Lembur"]:menit,["Jam Lembur"]:isNaN(jam)?"0.00":jam.toFixed(2),["Indeks Lembur"]:(td[18].textContent||"").trim(),Status:(td[21].textContent||"").trim().toUpperCase(),["Other Status"]:(td[22].textContent||"").trim().toUpperCase()})});
  res.forEach(row=>{const i=parsedData.findIndex(x=>x.Tanggal===row.Tanggal);if(i>=0)row.ID=parsedData[i].ID;ensureId(row)});
  applyLocalMutation({action:"upsert",rows:res});setSyncStatus("Mengirim hasil import ke Google Sheet...");
  saveToGoogleSheet(res).then(()=>syncFromGoogleSheet().then(()=>alert(`Data berhasil diimpor dan disinkronkan! ${res.length} baris.`))).catch(err=>alert("Import lokal berhasil, tetapi sinkronisasi tertunda: "+err.message));
 }catch(err){alert("Terjadi kesalahan saat membaca file: "+err.message)}};reader.readAsText(file);
}
function setupSyncStatus(){
 if(!$("syncStatus")){const e=document.createElement("div");e.id="syncStatus";e.className="sync-status";e.textContent="Menyiapkan...";document.querySelector(".header")?.after(e)}
}
function startAutoSync(){
 clearInterval(autoSyncTimer);autoSyncTimer=setInterval(()=>{if(document.visibilityState==="visible")syncNow()},AUTO_SYNC_MS);
 window.addEventListener("online",syncNow);window.addEventListener("focus",()=>syncNow());document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")syncNow()});
}
document.addEventListener("DOMContentLoaded",()=>{
 setupSyncStatus();fileInput=$("fileInput");summaryOutput=$("summaryOutput");tableOutput=$("tableOutput");manualTanggal=$("manualTanggal");manualJamLembur=$("manualJamLembur");manualMenitLembur=$("manualMenitLembur");manualIndeks=$("manualIndeks");btnAdd=$("btnAdd");btnReset=$("btnReset");
 loadLocal();const fs=localStorage.getItem("filterStart"),fe=localStorage.getItem("filterEnd");if(fs){const p=fs.split("-");filterStart=new Date(+p[0],+p[1]-1,+p[2]);$("filterStartInput").value=fs}if(fe){const p=fe.split("-");filterEnd=new Date(+p[0],+p[1]-1,+p[2]);$("filterEndInput").value=fe}
 const now=new Date();manualTanggal.value=formatInputDate(now);fileInput.onchange=handleFileSelect;
 manualJamLembur.oninput=()=>{const j=+manualJamLembur.value||0;manualMenitLembur.value=Math.round(j*60);const t=document.querySelector("input[name='manualTipeHari']:checked").value;manualIndeks.value=hitungIndeksByJam(j,t).toFixed(2)};
 manualMenitLembur.oninput=()=>{const min=+manualMenitLembur.value||0,j=min/60;manualJamLembur.value=j.toFixed(2);const t=document.querySelector("input[name='manualTipeHari']:checked").value;manualIndeks.value=hitungIndeksByJam(j,t).toFixed(2)};
 btnAdd.onclick=e=>{e.preventDefault();addManualEntry()};btnReset.onclick=e=>{e.preventDefault();resetData()};
 const cancelBtn=$("btnCancelEdit"); if(cancelBtn) cancelBtn.onclick=()=>{cancelEdit(); refreshUI()};
 document.querySelectorAll('input[name="manualTipeHari"]').forEach(r=>r.onchange=()=>{if(r.checked)updateOtherStatus(r.value)});document.querySelectorAll('input[name="manualStatus"]').forEach(r=>r.onchange=()=>{if(r.checked)updateStatus(r.value)});
 $("filterStartInput").onchange=e=>{const v=e.target.value;filterStart=v?new Date(v+"T00:00:00"):null;if(v)localStorage.setItem("filterStart",v);else localStorage.removeItem("filterStart");refreshUI()};$("filterEndInput").onchange=e=>{const v=e.target.value;filterEnd=v?new Date(v+"T00:00:00"):null;if(v)localStorage.setItem("filterEnd",v);else localStorage.removeItem("filterEnd");refreshUI()};
 manualTanggal.onchange=()=>{const d=new Date(manualTanggal.value+"T00:00:00");if(d.getDay()===0){updateStatus("OFF");$("statusOFF").checked=true;$("tipeHariOFF").checked=true}else{updateStatus("WD");updateOtherStatus("WD");$("statusPRS").checked=true;$("tipeHariWD").checked=true}const j=+manualJamLembur.value||0;manualIndeks.value=hitungIndeksByJam(j,document.querySelector("input[name='manualTipeHari']:checked").value).toFixed(2)};
 manualTanggal.dispatchEvent(new Event("change"));refreshUI();setTimeout(()=>{$("load-wrapper").style.display="none";syncNow()},300);startAutoSync();
});
window._app={refreshUI,saveLocal,loadLocal,syncFromGoogleSheet,syncNow,flushQueue,cancelEdit};
})();
