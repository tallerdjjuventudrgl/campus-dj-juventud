// ============================================================
//  scripts/migrate_campus.js
//  Migración de campus.html a API Turso Scaler (libSQL)
//  SISTEMAS DesarrollAR · Río Gallegos, Santa Cruz, Argentina 🇦🇷
// ============================================================

import fs from "fs";

function cleanFile(path) {
  let content = fs.readFileSync(path, "utf8");
  content = content.replace(/\r\n/g, "\n");

  // 1. Remove Supabase script tag
  content = content.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2"><\/script>\n?/, "");

  // 2. Replace top config block
  const oldTopBlockRegex = /\/\* ===================== CAMPUS VIRTUAL · TALLER DE DJ =====================[\s\S]*?function tmpClient[\s\S]*?\}\n+/;
  const newTopBlock = `/* ===================== CAMPUS VIRTUAL · TALLER DE DJ =====================
   Versión 2.0 — Vercel Pro + Turso Scaler (libSQL Serverless Edge)
   SISTEMAS DesarrollAR · Río Gallegos, Santa Cruz, Argentina 🇦🇷
========================================================================= */

const SETUP = new URLSearchParams(location.search).get("setup") === "1";
let authToken = localStorage.getItem("cursodj_token") || null;

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (authToken) headers["Authorization"] = "Bearer " + authToken;
  const res = await fetch(path, { credentials: "include", ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || ("Error " + res.status));
  }
  return data;
}

`;

  content = content.replace(oldTopBlockRegex, newTopBlock);

  // 3. Replace createAssignment
  const oldCreateAssign = `async function createAssignment(){
  const title=document.getElementById("ntTitle").value.trim(), instr=document.getElementById("ntInstr").value.trim();
  if(!title||!instr){alert("Completá título y consigna.");return;}
  const btn=document.getElementById("ntBtn"); btn.disabled=true; btn.textContent="Creando…";
  const {error}=await SB.from("assignments").insert({module_id:+document.getElementById("ntMod").value,title,instructions:instr,due_date:document.getElementById("ntDue").value,created_by:store.profile.name});
  if(error){alert("Error: "+error.message); btn.disabled=false; btn.textContent="Crear tarea"; return;}
  await go("gestion");
}`;
  const newCreateAssign = `async function createAssignment(){
  const title=document.getElementById("ntTitle").value.trim(), instr=document.getElementById("ntInstr").value.trim();
  if(!title||!instr){alert("Completá título y consigna.");return;}
  const btn=document.getElementById("ntBtn"); btn.disabled=true; btn.textContent="Creando…";
  try {
    await api("/api/assignments", {
      method: "POST",
      body: JSON.stringify({
        module_id: +document.getElementById("ntMod").value,
        title,
        instructions: instr,
        due_date: document.getElementById("ntDue").value
      })
    });
    await refresh();
    await go("gestion");
  } catch(err) {
    alert("Error: " + err.message);
    btn.disabled=false; btn.textContent="Crear tarea";
  }
}`;
  content = content.replace(oldCreateAssign, newCreateAssign);

  // 4. Replace grade
  const oldGrade = `async function grade(sid){
  const g=document.getElementById("g-"+sid).value; if(g===""){alert("Poné una nota.");return;}
  const {error}=await SB.from("submissions").update({grade:parseFloat(g),feedback:document.getElementById("f-"+sid).value,status:"graded",graded_at:new Date().toISOString(),graded_by:store.profile.name}).eq("id",sid);
  if(error){alert("Error: "+error.message);return;}
  await go("entregas",{id:state.route.id});
}`;
  const newGrade = `async function grade(sid){
  const g=document.getElementById("g-"+sid).value; if(g===""){alert("Poné una nota.");return;}
  try {
    await api("/api/submissions/grade", {
      method: "PUT",
      body: JSON.stringify({
        id: sid,
        grade: parseFloat(g),
        feedback: document.getElementById("f-"+sid).value
      })
    });
    await refresh();
    await go("entregas",{id:state.route.id});
  } catch(err) {
    alert("Error: " + err.message);
  }
}`;
  content = content.replace(oldGrade, newGrade);

  // 5. Replace postAnn and delAnn
  const oldPostAnn = `async function postAnn(){
  const t=document.getElementById("anTitle").value.trim(), b=document.getElementById("anBody").value.trim();
  if(!t||!b){alert("Completá título y mensaje.");return;}
  const btn=document.getElementById("anBtn"); btn.disabled=true; btn.textContent="Publicando…";
  const {error}=await SB.from("announcements").insert({title:t,body:b,author:store.profile.name});
  if(error){alert("Error: "+error.message); btn.disabled=false; btn.textContent="Publicar"; return;}
  await go("anuncios");
}
async function delAnn(id){ if(!confirm("¿Eliminar este anuncio?"))return; const {error}=await SB.from("announcements").delete().eq("id",id); if(error){alert(error.message);return;} await go("anuncios"); }`;

  const newPostAnn = `async function postAnn(){
  const t=document.getElementById("anTitle").value.trim(), b=document.getElementById("anBody").value.trim();
  if(!t||!b){alert("Completá título y mensaje.");return;}
  const btn=document.getElementById("anBtn"); btn.disabled=true; btn.textContent="Publicando…";
  try {
    await api("/api/announcements", {
      method: "POST",
      body: JSON.stringify({ title: t, body: b })
    });
    await refresh();
    await go("anuncios");
  } catch(err) {
    alert("Error: " + err.message);
    btn.disabled=false; btn.textContent="Publicar";
  }
}
async function delAnn(id){
  if(!confirm("¿Eliminar este anuncio?")) return;
  try {
    await api("/api/announcements?id=" + encodeURIComponent(id), { method: "DELETE" });
    await refresh();
    await go("anuncios");
  } catch(err) {
    alert("Error: " + err.message);
  }
}`;
  content = content.replace(oldPostAnn, newPostAnn);

  fs.writeFileSync(path, content, "utf8");
  console.log("Updated cleanly:", path);
}

["public/campus.html", "publish/campus.html", "docs/campus.html"].forEach(cleanFile);
