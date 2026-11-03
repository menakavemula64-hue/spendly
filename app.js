const CATS={Food:["🍔","#f97316"],Transport:["🚌","#3b82f6"],Shopping:["🛍️","#ec4899"],Bills:["💡","#eab308"],Entertainment:["🎬","#8b5cf6"],Health:["💊","#10b981"],Other:["📦","#64748b"]};
// Demo login: the logged-in email is kept in localStorage (see js/auth.js).
const SESSION_KEY="spendly_session";
let currentUser=null;
try{currentUser=localStorage.getItem(SESSION_KEY)}catch(e){}
if(!currentUser){location.replace("login.html")}
// Each account gets its own saved expenses and budget.
const KEY="spendly-v1:"+currentUser,BKEY="spendly-budget-v1:"+currentUser,TKEY="spendly-theme-v1";
const $=id=>document.getElementById(id);
const money=n=>"₹"+Number(n).toLocaleString("en-IN",{maximumFractionDigits:0});
const money2=n=>"₹"+Number(n).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
const esc=s=>{const d=document.createElement("div");d.textContent=s;return d.innerHTML};
const iso=d=>d.toISOString().slice(0,10);
const ago=n=>{const d=new Date();d.setDate(d.getDate()-n);return iso(d)};
const store={mem:{},get(k){try{const v=localStorage.getItem(k);if(v!==null)return JSON.parse(v)}catch(e){}return this.mem[k]??null},set(k,v){this.mem[k]=v;try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

let items=store.get(KEY)||[
 {id:1,title:"Lunch with friends",amount:350,category:"Food",date:ago(1)},
 {id:2,title:"Metro card recharge",amount:500,category:"Transport",date:ago(3)},
 {id:3,title:"Internet bill",amount:799,category:"Bills",date:ago(5)},
 {id:4,title:"Movie night",amount:420,category:"Entertainment",date:ago(7)},
 {id:5,title:"Pharmacy",amount:260,category:"Health",date:ago(9)},
 {id:6,title:"New headphones",amount:1899,category:"Shopping",date:ago(12)}
];
let budget=store.get(BKEY)??10000,filter="All",editing=null;
const save=()=>store.set(KEY,items);

function setTheme(t){if(t)document.documentElement.setAttribute("data-theme",t)}
setTheme(store.get(TKEY));
$("themeBtn").onclick=()=>{const dark=getComputedStyle(document.documentElement).colorScheme==="dark";const t=dark?"light":"dark";setTheme(t);store.set(TKEY,t)};

function render(){
 const now=new Date(),ym=iso(now).slice(0,7),dom=now.getDate();
 const total=items.reduce((s,x)=>s+x.amount,0);
 const month=items.filter(x=>x.date.slice(0,7)===ym).reduce((s,x)=>s+x.amount,0);
 const by={};items.forEach(x=>by[x.category]=(by[x.category]||0)+x.amount);
 const cats=Object.entries(by).sort((a,b)=>b[1]-a[1]);
 $("sTotal").textContent=money(total);$("sCount").textContent=items.length+(items.length===1?" entry":" entries");
 $("sMonth").textContent=money(month);$("sAvg").textContent=money(month/dom);
 $("sTop").textContent=cats[0]?cats[0][0]:"–";$("sTopAmt").textContent=cats[0]?money(cats[0][1]):"\u00a0";
 const pct=budget>0?Math.min(100,month/budget*100):0;
 $("sMonthNote").textContent=budget>0?Math.round(month/budget*100)+"% of budget":"No budget set";
 $("prog").style.width=pct+"%";$("prog").style.background=month>budget&&budget>0?"var(--bad)":pct>80?"var(--warn)":"";
 $("progNote").textContent=budget>0?(month>budget?money(month-budget)+" over budget":money(budget-month)+" left of "+money(budget)):"Set a monthly budget to track progress.";
 $("budgetIn").value=budget||"";

 // donut
 let off=0,svg='<circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--line)" stroke-width="6"/>';
 cats.forEach(([c,v])=>{const p=v/total*100;svg+=`<circle cx="21" cy="21" r="15.9" fill="none" stroke="${CATS[c][1]}" stroke-width="6" stroke-dasharray="${p} ${100-p}" stroke-dashoffset="${25-off}"/>`;off+=p});
 $("donut").innerHTML=total?svg:'<circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--line)" stroke-width="6"/>';
 $("legend").innerHTML=cats.map(([c,v])=>`<div><span class="dot" style="background:${CATS[c][1]}"></span>${c}<b>${money(v)}</b></div>`).join("")||'<span style="color:var(--muted)">No data yet</span>';

 // 6-month bars
 const ms=[];for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);ms.push({k:iso(new Date(d.getTime()-d.getTimezoneOffset()*60000)).slice(0,7),l:d.toLocaleString("en",{month:"short"}),v:0})}
 items.forEach(x=>{const m=ms.find(z=>z.k===x.date.slice(0,7));if(m)m.v+=x.amount});
 const mx=Math.max(1,...ms.map(m=>m.v));
 $("bars").innerHTML=ms.map(m=>`<div title="${money(m.v)}"><span>${m.v?money(m.v):""}</span><i style="height:${m.v/mx*100}px"></i><span class="bar-label">${m.l}</span></div>`).join("");

 // chips + list
 $("chips").innerHTML=["All",...Object.keys(CATS)].map(c=>`<button class="chip ${c===filter?"on":""}" data-c="${c}">${c}</button>`).join("");
 const q=$("q").value.trim().toLowerCase(),s=$("sort").value;
 let list=items.filter(x=>(filter==="All"||x.category===filter)&&(!q||x.title.toLowerCase().includes(q)));
 list.sort((a,b)=>s==="old"?a.date.localeCompare(b.date)||a.id-b.id:s==="high"?b.amount-a.amount:b.date.localeCompare(a.date)||b.id-a.id);
 $("list").innerHTML=list.length?list.map(e=>`<div class="row"><div class="ico" style="background:${CATS[e.category][1]}22">${CATS[e.category][0]}</div><div class="info"><b>${esc(e.title)}</b><small>${e.category} · ${new Date(e.date+"T00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</small></div><div class="amt">${money2(e.amount)}</div><button class="ghost sm" data-e="${e.id}">Edit</button><button class="danger sm" data-d="${e.id}">Delete</button></div>`).join(""):'<div class="empty">No expenses match. Tap “Add expense” to create one.</div>';
}

function openDlg(e){
 editing=e?e.id:null;$("dTitle").textContent=e?"Edit expense":"Add expense";$("err").textContent="";
 $("title").value=e?e.title:"";$("amount").value=e?e.amount:"";$("cat").value=e?e.category:"Food";$("date").value=e?e.date:iso(new Date());
 $("dlg").showModal();$("title").focus();
}
$("cat").innerHTML=Object.keys(CATS).map(c=>`<option>${c}</option>`).join("");
$("addBtn").onclick=()=>openDlg();$("cancel").onclick=()=>$("dlg").close();
$("f").addEventListener("submit",ev=>{
 const title=$("title").value.trim(),amount=Math.round(parseFloat($("amount").value)*100)/100;
 if(!title||!(amount>0)){ev.preventDefault();$("err").textContent="Enter a title and an amount above zero.";return}
 const rec={title,amount,category:$("cat").value,date:$("date").value};
 if(editing)items=items.map(x=>x.id===editing?{id:editing,...rec}:x);else items=[...items,{id:items.reduce((m,x)=>Math.max(m,x.id),0)+1,...rec}];
 save();render();
});
$("list").onclick=ev=>{const e=ev.target.dataset.e,d=ev.target.dataset.d;
 if(e)openDlg(items.find(x=>x.id==e));
 else if(d&&confirm("Delete this expense?")){items=items.filter(x=>x.id!=d);save();render()}};
$("chips").onclick=ev=>{if(ev.target.dataset.c){filter=ev.target.dataset.c;render()}};
$("q").oninput=render;$("sort").onchange=render;
$("budgetBtn").onclick=()=>{budget=Math.max(0,parseFloat($("budgetIn").value)||0);store.set(BKEY,budget);render()};

$("exportBtn").onclick=async()=>{
 const rows=[["Date","Title","Category","Amount"],...[...items].sort((a,b)=>b.date.localeCompare(a.date)).map(x=>[x.date,'"'+x.title.replace(/"/g,'""')+'"',x.category,x.amount])];
 const csv=rows.map(r=>r.join(",")).join("\n");
 try{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="expenses.csv";a.click()}catch(e){}
};
render();
document.querySelector(".hero p").textContent="Signed in as "+currentUser+". Your data stays in this browser.";
$("logoutBtn").onclick=()=>{try{localStorage.removeItem(SESSION_KEY)}catch(e){}location.href="login.html"};
