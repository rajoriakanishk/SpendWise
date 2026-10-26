const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...document.querySelectorAll(selector)];
const API_BASE = "http://localhost:8080/api/admin";
let users = [], transactions = [], categories = [], adminProfile = null;
let modalMode = "addUser", editingId = null, pendingDelete = null, userPage = 1, transactionPage = 1;
const USERS_PER_PAGE = 5, TRANSACTIONS_PER_PAGE = 5;
let toastTimer;
async function api(path, method="GET", data=null) {
 const options={method,credentials:"include",headers:{}};
 if(data){options.headers["Content-Type"]="application/x-www-form-urlencoded;charset=UTF-8";options.body=new URLSearchParams(data).toString();}
 const response=await fetch(`${API_BASE}${path}`,options);
 const result=response.status===204?null:await response.json().catch(()=>({}));
 if(!response.ok){if(response.status===401||response.status===403)window.location.replace("login.html");throw new Error(result?.error||`Request failed (${response.status})`);}
 return result;
}
function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),3200)}
function money(value){return "₹"+Number(value||0).toLocaleString("en-IN",{maximumFractionDigits:2})}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function showPage(page){$$(".page-view").forEach(el=>el.classList.toggle("active",el.id===`page-${page}`));$$(".nav-link").forEach(el=>el.classList.toggle("active",el.dataset.page===page));$("#sidebar").classList.remove("open");if(page==="dashboard")renderActivity();if(page==="users")renderUsers();if(page==="transactions")renderTransactions();if(page==="categories")renderCategories();if(page==="reports")renderReports()}
$$(".nav-link").forEach(btn=>btn.addEventListener("click",()=>showPage(btn.dataset.page)));
$$("[data-go]").forEach(btn=>btn.addEventListener("click",()=>showPage(btn.dataset.go)));
$("#menuBtn").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
$("#todayLabel").textContent=new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
async function loadAdminData(){
 try{
  const [dashboard,loadedUsers,loadedTransactions,loadedCategories]=await Promise.all([api("/dashboard"),api("/users"),api("/transactions"),api("/categories")]);
  users=loadedUsers;transactions=loadedTransactions;categories=loadedCategories;
  $("#totalUsers").textContent=Number(dashboard.totalUsers||0).toLocaleString("en-IN");
  $("#totalTransactions").textContent=Number(dashboard.totalTransactions||0).toLocaleString("en-IN");
  $("#totalSpending").textContent=money(dashboard.totalSpending);
  const savingsCard=document.querySelector(".stat-card:nth-child(4) strong");if(savingsCard)savingsCard.textContent=money(dashboard.totalSavings);
  renderUsers();renderTransactions();renderCategories();renderTopUsers();updateUserFilter();updateCategoryFilter();renderActivity();renderDashboardCharts();renderReports();
 }catch(error){console.error("Admin data load failed:",error);toast(error.message||"Could not load admin data.");}
}
async function initAdmin(){
 try{
  adminProfile=await api("/session");
  const name=$("#profileBtn strong"),sub=$("#profileBtn small"),avatar=$("#profileBtn .avatar");
  if(name)name.textContent=adminProfile.fullName||"Admin";if(sub)sub.textContent="System Administrator";
  if(avatar)avatar.textContent=(adminProfile.fullName||"A").trim().charAt(0).toUpperCase();
  await loadAdminData();
 }catch(error){console.error("Administrator session unavailable:",error);window.location.replace("login.html");}
}
function renderDashboardCharts(){
 const chart=$("#adminSpendingChart");
 const range=$("#chartRange")?.value==="Last 30 days"?30:7;
 const end=new Date();end.setHours(0,0,0,0);
 const start=new Date(end);start.setDate(start.getDate()-range+1);
 const totals=[];
 for(let i=0;i<range;i++){const d=new Date(start);d.setDate(start.getDate()+i);const key=[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");totals.push({date:key,label:d.toLocaleDateString("en-IN",{day:"numeric",month:"short"}),amount:transactions.filter(t=>t.date===key).reduce((sum,t)=>sum+Number(t.amount||0),0)});}
 const max=Math.max(1,...totals.map(t=>t.amount)),top=Math.ceil(max/4/100)*100||100;
 const points=totals.map((t,i)=>({x:range===1?300:i*600/(range-1),y:178-(t.amount/max)*150}));
 const poly=points.map(p=>`${p.x},${p.y}`).join(" ");
 const area=`M${points[0].x} ${points[0].y} `+points.slice(1).map(p=>`L${p.x} ${p.y}`).join(" ")+` L600 190 L0 190 Z`;
 if(chart)chart.innerHTML=`<defs><linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#20a884" stop-opacity=".22"/><stop offset="100%" stop-color="#20a884" stop-opacity=".02"/></linearGradient></defs><path class="chart-area" d="${area}"/><polyline class="chart-line" points="${poly}"/><g class="chart-dots">${points.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="3.5"/>`).join("")}</g>`;
 const labels=$$(".spending-panel .x-labels span");if(labels.length){labels.forEach((el,i)=>{const index=Math.round(i*(range-1)/Math.max(1,labels.length-1));el.textContent=totals[index]?.label||"";});}
 const yLabels=$$(".spending-panel .y-labels span");yLabels.forEach((el,i)=>el.textContent=money(top*(4-i)));
 const sum=transactions.reduce((n,t)=>n+Number(t.amount||0),0);
 const totalEl=$("#categoryDonutTotal");if(totalEl)totalEl.textContent=money(sum);
 const donut=$("#adminCategoryDonut"),legend=$("#categoryLegend");
 const grouped=categories.map(c=>({...c,total:transactions.filter(t=>t.category===c.name).reduce((n,t)=>n+Number(t.amount||0),0)})).filter(c=>c.total>0).sort((a,b)=>b.total-a.total);
 if(donut){let cursor=0;const segments=grouped.map(c=>{const start=cursor;cursor+=sum?c.total/sum*100:0;return `${c.color} ${start}% ${cursor}%`;});donut.style.background=sum?`conic-gradient(${segments.join(",")})`:"conic-gradient(#e7eee9 0% 100%)";}
 if(legend)legend.innerHTML=grouped.map(c=>`<li><i class="dot" style="background:${escapeHtml(c.color)}"></i>${escapeHtml(c.name)} <span>${sum?Math.round(c.total/sum*100):0}%</span></li>`).join("")||"<li>No expense data yet.</li>";
}
function renderActivity(){
 const events=transactions.slice(0,5).map(t=>["▣","Expense recorded",`${t.user} · ${t.category} · ${money(t.amount)}`,new Date(t.date+"T12:00:00").toLocaleDateString("en-IN"),"orange"]);
 $("#activityList").innerHTML=events.map(e=>`<div class="activity-item"><span class="activity-icon ${e[4]}">${e[0]}</span><div><strong>${e[1]}</strong><small>${escapeHtml(e[2])}</small></div><span class="activity-time">${escapeHtml(e[3])}</span></div>`).join("")||'<p>No transactions have been recorded yet.</p>';
}
function renderUsers(){
 const role=$("#userRoleFilter").value,status=$("#userStatusFilter").value,q=$("#userSearch").value.trim().toLowerCase();
 // Keep IDs in ascending order so newly created users follow existing users.
 const list=users.slice().sort((a,b)=>a.id-b.id).filter(u=>(!role||u.role===role)&&(!status||u.status===status)&&(`${u.name} ${u.email}`.toLowerCase().includes(q)));
 const pageCount=Math.max(1,Math.ceil(list.length/USERS_PER_PAGE));
 userPage=Math.min(Math.max(1,userPage),pageCount);
 const start=(userPage-1)*USERS_PER_PAGE;
 const pageUsers=list.slice(start,start+USERS_PER_PAGE);
 $("#usersTable").innerHTML=pageUsers.map(u=>`<tr><td>${u.id}</td><td><strong>${escapeHtml(u.name)}</strong></td><td>${escapeHtml(u.email)}</td><td><span class="role-badge">${escapeHtml(u.role)}</span></td><td><span class="status-badge ${u.status.toLowerCase()}">${escapeHtml(u.status)}</span></td><td>${escapeHtml(u.joined)}</td><td><div class="row-actions"><button title="View user" data-action="view-user" data-id="${u.id}">◉</button><button title="Edit user" data-action="edit-user" data-id="${u.id}">✎</button>${u.role==="Admin"?"":`<button class="delete" title="Delete student" data-action="delete-user" data-id="${u.id}">♲</button>`}</div></td></tr>`).join("")||'<tr><td colspan="7">No users match your filters.</td></tr>';
 $("#usersCount").textContent=list.length?`Showing ${start+1}–${Math.min(start+USERS_PER_PAGE,list.length)} of ${list.length} users`:`Showing 0 users`;
 $("#totalUsers").textContent=users.length;
 renderUserPagination(pageCount);
}
function renderUserPagination(pageCount){
 const container=$("#usersPagination"); if(!container)return;
 const button=(label,page,{disabled=false,selected=false,ariaLabel}={})=>`<button type="button" ${disabled?'disabled':''} class="${selected?'selected':''}" data-user-page="${page}" aria-label="${ariaLabel||`Page ${page}`}" ${selected?'aria-current="page"':''}>${label}</button>`;
 let html=button('‹',userPage-1,{disabled:userPage===1,ariaLabel:'Previous page'});
 let pages;
 if(pageCount<=3) pages=Array.from({length:pageCount},(_,i)=>i+1);
 else if(userPage<=2) pages=[1,2,3];
 else if(userPage>=pageCount-1) pages=[pageCount-2,pageCount-1,pageCount];
 else pages=[userPage-1,userPage,userPage+1];
 if(pages[0]>1){html+=button('1',1,{selected:userPage===1});if(pages[0]>2)html+='<span class="pagination-ellipsis" aria-hidden="true">…</span>';}
 pages.forEach(p=>{if(!((p===1&&pages[0]>1)||(p===pageCount&&pages[pages.length-1]<pageCount)))html+=button(String(p),p,{selected:userPage===p});});
 if(pages[pages.length-1]<pageCount){if(pages[pages.length-1]<pageCount-1)html+='<span class="pagination-ellipsis" aria-hidden="true">…</span>';html+=button(String(pageCount),pageCount,{selected:userPage===pageCount});}
 html+=button('›',userPage+1,{disabled:userPage===pageCount,ariaLabel:'Next page'});
 container.innerHTML=html;
}
function renderTransactions(){
 const user=$("#transactionUserFilter").value,category=$("#transactionCategoryFilter").value,type=$("#transactionTypeFilter").value,date=$("#transactionDate").value,search=($("#globalSearch").value||"").trim().toLowerCase();
 const list=transactions.filter(t=>(!user||t.user===user)&&(!category||t.category===category)&&(!type||t.type===type)&&(!date||t.date===date)&&(`${t.user} ${t.category} ${t.type} ${t.amount}`.toLowerCase().includes(search)));
 const pageCount=Math.max(1,Math.ceil(list.length/TRANSACTIONS_PER_PAGE));
 transactionPage=Math.min(Math.max(1,transactionPage),pageCount);
 const start=(transactionPage-1)*TRANSACTIONS_PER_PAGE;
 const pageTransactions=list.slice(start,start+TRANSACTIONS_PER_PAGE);
 $("#transactionsTable").innerHTML=pageTransactions.map(t=>`<tr><td>${t.id}</td><td>${escapeHtml(t.user)}</td><td><span class="type-badge ${t.type.toLowerCase()}">${escapeHtml(t.type)}</span></td><td>${escapeHtml(t.category)}</td><td><strong>${money(t.amount)}</strong></td><td>${new Date(t.date+"T12:00:00").toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</td><td><div class="row-actions"><button title="View transaction" data-action="view-transaction" data-id="${t.id}">◉</button><button title="Edit transaction" data-action="edit-transaction" data-id="${t.id}">✎</button><button class="delete" title="Delete transaction" data-action="delete-transaction" data-id="${t.id}">♲</button></div></td></tr>`).join("")||'<tr><td colspan="7">No transactions match your filters.</td></tr>';
 $("#transactionsCount").textContent=list.length?`Showing ${start+1}–${Math.min(start+TRANSACTIONS_PER_PAGE,list.length)} of ${list.length} transactions`:`Showing 0 transactions`;
 $("#totalTransactions").textContent=transactions.length.toLocaleString("en-IN");
 renderTransactionPagination(pageCount);
}
function renderTransactionPagination(pageCount){
 const container=$("#transactionsPagination");if(!container)return;
 const button=(label,page,{disabled=false,selected=false,ariaLabel}={})=>`<button type="button" ${disabled?'disabled':''} class="${selected?'selected':''}" data-transaction-page="${page}" aria-label="${ariaLabel||`Page ${page}`}" ${selected?'aria-current="page"':''}>${label}</button>`;
 let html=button('‹',transactionPage-1,{disabled:transactionPage===1,ariaLabel:'Previous page'});
 let pages;
 if(pageCount<=3)pages=Array.from({length:pageCount},(_,i)=>i+1);
 else if(transactionPage<=2)pages=[1,2,3];
 else if(transactionPage>=pageCount-1)pages=[pageCount-2,pageCount-1,pageCount];
 else pages=[transactionPage-1,transactionPage,transactionPage+1];
 if(pages[0]>1){html+=button('1',1,{selected:transactionPage===1});if(pages[0]>2)html+='<span class="pagination-ellipsis" aria-hidden="true">…</span>';}
 pages.forEach(p=>{if(!((p===1&&pages[0]>1)||(p===pageCount&&pages[pages.length-1]<pageCount)))html+=button(String(p),p,{selected:transactionPage===p});});
 if(pages[pages.length-1]<pageCount){if(pages[pages.length-1]<pageCount-1)html+='<span class="pagination-ellipsis" aria-hidden="true">…</span>';html+=button(String(pageCount),pageCount,{selected:transactionPage===pageCount});}
 html+=button('›',transactionPage+1,{disabled:transactionPage===pageCount,ariaLabel:'Next page'});
 container.innerHTML=html;
}
function renderCategories(){
 $("#categoriesTable").innerHTML=categories.map(c=>`<tr><td><strong>${escapeHtml(c.name)}</strong></td><td><span class="category-icon">${escapeHtml(c.icon)}</span></td><td><span class="color-swatch" style="background:${escapeHtml(c.color)}"></span>${escapeHtml(c.color)}</td><td><span class="status-badge ${String(c.status).toLowerCase()}">${escapeHtml(c.status)}</span></td><td><div class="row-actions"><button title="Edit category" data-action="edit-category" data-id="${c.id}">✎</button><button class="delete" title="Delete category" data-action="delete-category" data-id="${c.id}">♲</button></div></td></tr>`).join("")||'<tr><td colspan="5">No categories yet.</td></tr>';
}
function renderTopUsers(){
 const list=$("#topUsersList");if(!list)return;
 const selected=$("[data-report].selected")?.dataset.report||"overview";
 const month=$("#reportMonth")?.value||new Date().toISOString().slice(0,7);
 const monthTransactions=transactions.filter(t=>String(t.date||"").startsWith(month));
 let rows=[];
 if(selected==="activity"){
  const counts={};monthTransactions.forEach(t=>{counts[t.user]=(counts[t.user]||0)+1;});
  rows=Object.entries(counts).map(([name,count])=>({name,value:count,label:"expenses"})).sort((a,b)=>b.value-a.value).slice(0,5);
 }else{
  const sums={};monthTransactions.forEach(t=>{sums[t.user]=(sums[t.user]||0)+Number(t.amount||0);});
  rows=Object.entries(sums).map(([name,value])=>({name,value,label:"spent"})).sort((a,b)=>b.value-a.value).slice(0,5);
 }
 list.innerHTML=rows.map(r=>`<div class="top-user-row"><span class="mini-avatar">${escapeHtml((r.name||"?")[0])}</span><div><strong>${escapeHtml(r.name)}</strong><small>${selected==="activity"?`${r.value} recorded expenses`:`${escapeHtml(month)} total`}</small></div><b>${selected==="activity"?r.value:money(r.value)}</b></div>`).join("")||'<p>No matching activity for this month.</p>';
}
function renderReports(){
 const container=$("#barChart");if(!container)return;
 const selected=$("[data-report].selected")?.dataset.report||"overview";
 const month=$("#reportMonth")?.value||new Date().toISOString().slice(0,7);
 let points=[];
 if(selected==="overview"){
  const now=new Date(month+"-01T12:00:00");
  for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;points.push({label:d.toLocaleDateString("en-IN",{month:"short"}),key,value:transactions.filter(t=>String(t.date||"").startsWith(key)).reduce((sum,t)=>sum+Number(t.amount||0),0)});}
  const title=$(".report-chart h2");if(title)title.textContent="Monthly Spending Trend";
 }else if(selected==="categories"){
  const grouped={};transactions.filter(t=>String(t.date||"").startsWith(month)).forEach(t=>grouped[t.category]=(grouped[t.category]||0)+Number(t.amount||0));
  points=Object.entries(grouped).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value).slice(0,6);
  const title=$(".report-chart h2");if(title)title.textContent="Category Breakdown";
 }else{
  const grouped={};transactions.filter(t=>String(t.date||"").startsWith(month)).forEach(t=>grouped[t.user]=(grouped[t.user]||0)+1);
  points=Object.entries(grouped).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value).slice(0,6);
  const title=$(".report-chart h2");if(title)title.textContent="User Expense Activity";
 }
 const max=Math.max(1,...points.map(p=>p.value));
 container.innerHTML=points.map(p=>`<div title="${escapeHtml(p.label)}: ${selected==="activity"?p.value:money(p.value)}"><span style="height:${Math.max(3,p.value/max*100)}%"></span><small>${escapeHtml(p.label)}</small></div>`).join("")||'<p class="muted">No database activity for this selection.</p>';
 const desc=$(".report-chart .muted");if(desc)desc.textContent=`Data from MySQL · ${selected==="overview"?"six-month history":`selected month ${month}`}`;
 const topHeading=$(".top-users h2");if(topHeading)topHeading.textContent=selected==="activity"?"Most Active Users":"Top Spending Users";
 const topDescription=$(".top-users .muted");if(topDescription)topDescription.textContent=`Live data for ${month}`;
 renderTopUsers();
}
function openModal(title,fields,mode,id=null){
 modalMode=mode;editingId=id;$("#modalTitle").textContent=title;$("#modalFields").innerHTML=fields;$("#modalBackdrop").hidden=false;
}
function closeModal(){$("#modalBackdrop").hidden=true;$("#modalForm").reset();editingId=null}
function userFields(u={name:"",email:"",role:"Student",status:"Active"}, isNew=false){return `<label class="form-field">Full name<input name="name" value="${escapeHtml(u.name)}" required maxlength="80"></label><label class="form-field">Email address<input name="email" type="email" value="${escapeHtml(u.email)}" required></label><label class="form-field">Role<select name="role"><option ${u.role==="Student"?"selected":""}>Student</option><option ${u.role==="Admin"?"selected":""}>Admin</option></select></label>${isNew?'<label class="form-field">Temporary password<input name="password" type="password" minlength="8" autocomplete="new-password" required><small>At least 8 characters. Share it securely with the user.</small></label>':""}<label class="form-field">Status<select name="status"><option ${u.status==="Active"?"selected":""}>Active</option><option ${u.status==="Inactive"?"selected":""}>Inactive</option></select></label>`}
function transactionFields(t={userId:users.find(u=>u.role==="Student")?.id||"",user:users.find(u=>u.role==="Student")?.name||"",type:"Expense",category:"Food",amount:"",date:new Date().toISOString().slice(0,10)}){return `<label class="form-field">User<select name="userId" required>${users.filter(u=>u.role!=="Admin").map(u=>`<option value="${u.id}" ${Number(u.id)===Number(t.userId)?"selected":""}>${escapeHtml(u.name)}</option>`).join("")}</select></label><label class="form-field">Type<select name="type"><option selected>Expense</option></select><small>The student database currently stores expenses, not income records.</small></label><label class="form-field">Category<input name="category" value="${escapeHtml(t.category)}" required maxlength="80"></label><label class="form-field">Amount (₹)<input name="amount" type="number" min="0.01" step="0.01" value="${t.amount}" required></label><label class="form-field">Date<input name="date" type="date" value="${t.date}" required></label>`}
function categoryFields(c={name:"",icon:"📌",color:"#087e62"}){return `<label class="form-field">Category name<input name="name" value="${escapeHtml(c.name)}" required maxlength="40"></label><label class="form-field">Icon (emoji)<input name="icon" value="${escapeHtml(c.icon)}" required maxlength="4"></label><label class="form-field">Color<input name="color" type="color" value="${c.color}" required></label>`}
$("#addUserBtn").addEventListener("click",()=>openModal("Add user",userFields({name:"",email:"",role:"Student",status:"Active"},true),"addUser"));
$("#addCategoryBtn").addEventListener("click",()=>openModal("Add category",categoryFields(),"addCategory"));
$("#closeModal").addEventListener("click",closeModal);$("#cancelModal").addEventListener("click",closeModal);
$("#modalBackdrop").addEventListener("click",e=>{if(e.target===$("#modalBackdrop"))closeModal()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});
$("#modalForm").addEventListener("submit",async e=>{
 e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget).entries());
 try{
  if(modalMode==="addUser"||modalMode==="editUser"){
   const method=modalMode==="addUser"?"POST":"PUT";if(modalMode==="editUser")data.id=String(editingId);
   await api("/users",method,data);toast(modalMode==="addUser"?"User saved to MySQL.":"User changes saved to MySQL.");
  }else if(modalMode==="addTransaction"||modalMode==="editTransaction"){
   if(!Number.isFinite(Number(data.amount))||Number(data.amount)<=0){toast("Enter an amount greater than zero.");return}
   const method=modalMode==="addTransaction"?"POST":"PUT";if(modalMode==="editTransaction")data.id=String(editingId);
   await api("/transactions",method,data);toast("Expense saved to MySQL.");
  }else if(modalMode==="addCategory"||modalMode==="editCategory"){
   const method=modalMode==="addCategory"?"POST":"PUT";if(modalMode==="editCategory"){data.id=String(editingId);data.status=categories.find(c=>c.id===editingId)?.status||"Active";}
   await api("/categories",method,data);toast("Category saved to MySQL.");
  }
  closeModal();await loadAdminData();
 }catch(error){console.error("Save failed:",error);toast(error.message||"Save failed. Your changes were not saved.");}
});
function updateUserFilter(){const select=$("#transactionUserFilter"),current=select.value;select.innerHTML='<option value="">All Users</option>'+users.map(u=>`<option>${escapeHtml(u.name)}</option>`).join("");select.value=current}
function updateCategoryFilter(){const select=$("#transactionCategoryFilter"),current=select.value;select.innerHTML='<option value="">All Categories</option>'+categories.map(c=>`<option>${escapeHtml(c.name)}</option>`).join("");select.value=current}
["userRoleFilter","userStatusFilter","userSearch"].forEach(id=>$("#"+id).addEventListener("input",()=>{userPage=1;renderUsers()}));
$("#usersPagination").addEventListener("click",e=>{const btn=e.target.closest("button[data-user-page]");if(!btn||btn.disabled)return;userPage=Number(btn.dataset.userPage);renderUsers()});
$("#brandHome").addEventListener("click",e=>{e.preventDefault();showPage("dashboard")});
["transactionUserFilter","transactionCategoryFilter","transactionTypeFilter","transactionDate"].forEach(id=>$("#"+id).addEventListener("input",()=>{transactionPage=1;renderTransactions()}));
$("#transactionsPagination").addEventListener("click",e=>{const btn=e.target.closest("button[data-transaction-page]");if(!btn||btn.disabled)return;transactionPage=Number(btn.dataset.transactionPage);renderTransactions()});
$("#globalSearch").addEventListener("input",()=>{transactionPage=1;renderTransactions();const q=$("#globalSearch").value.toLowerCase();if(q){showPage("transactions");renderTransactions()}});
document.addEventListener("click",e=>{
 const btn=e.target.closest("[data-action]");if(!btn)return;const id=Number(btn.dataset.id),action=btn.dataset.action;
 if(action==="view-user"){const u=users.find(x=>x.id===id);if(u)toast(`${u.name} · ${u.email} · ${u.status}`)}
 if(action==="edit-user"){const u=users.find(x=>x.id===id);if(u)openModal("Edit user",userFields(u,false),"editUser",id)}
 if(action==="delete-user"){openDeleteConfirmation("user",id)}
 if(action==="view-transaction"){const t=transactions.find(x=>x.id===id);if(t)toast(`${t.user} · ${t.category} · ${money(t.amount)}`)}
 if(action==="edit-transaction"){const t=transactions.find(x=>x.id===id);if(t)openModal("Edit transaction",transactionFields(t),"editTransaction",id)}
 if(action==="delete-transaction"){openDeleteConfirmation("transaction",id)}
 if(action==="edit-category"){const c=categories.find(x=>x.id===id);if(c)openModal("Edit category",categoryFields(c),"editCategory",id)}
 if(action==="delete-category"){openDeleteConfirmation("category",id)}
});
const deleteConfirmBackdrop=$("#transactionConfirmBackdrop");
const deleteConfirmDialog=deleteConfirmBackdrop.querySelector(".confirm-dialog");
function openDeleteConfirmation(type,id){
 const record=type==="user"?users.find(x=>x.id===id):type==="transaction"?transactions.find(x=>x.id===id):categories.find(x=>x.id===id);
 if(!record)return;
 pendingDelete={type,id};
 $("#transactionConfirmTitle").textContent=type==="user"?"Delete user?":type==="category"?"Delete category?":"Delete transaction?";
 $("#transactionConfirmDescription").textContent=type==="user"
  ?`Are you sure you want to delete ${record.name} (${record.email})? This action cannot be undone.`
  :type==="category"
   ?`Are you sure you want to delete the ${record.name} category? This action cannot be undone.`
   :`Delete the ${record.type.toLowerCase()} transaction for ${record.user} (${money(record.amount)})? This action cannot be undone.`;
 $("#confirmTransactionDelete").textContent=type==="user"?"Delete user":type==="category"?"Delete category":"Delete transaction";
 deleteConfirmBackdrop.hidden=false;
 document.body.style.overflow="hidden";
 $("#cancelTransactionDelete").focus();
}
function closeDeleteConfirmation(){
 deleteConfirmBackdrop.hidden=true;pendingDelete=null;document.body.style.overflow="";
}
$("#cancelTransactionDelete").addEventListener("click",closeDeleteConfirmation);
deleteConfirmBackdrop.addEventListener("click",e=>{if(e.target===deleteConfirmBackdrop)closeDeleteConfirmation()});
document.addEventListener("keydown",e=>{
 if(deleteConfirmBackdrop.hidden)return;
 if(e.key==="Escape"){e.preventDefault();closeDeleteConfirmation()}
 if(e.key==="Tab"){
  const controls=[$("#cancelTransactionDelete"),$("#confirmTransactionDelete")];
  if(e.shiftKey&&document.activeElement===controls[0]){e.preventDefault();controls[1].focus()}
  else if(!e.shiftKey&&document.activeElement===controls[1]){e.preventDefault();controls[0].focus()}
 }
});
$("#confirmTransactionDelete").addEventListener("click",async ()=>{
 if(!pendingDelete)return;const {type,id}=pendingDelete;closeDeleteConfirmation();
 try{await api(type==="category"?"/categories":type==="user"?"/users":"/transactions","DELETE",{id:String(id)});
 toast(`${type==="user"?"Student":type==="category"?"Category":"Expense"} deleted from MySQL.`);await loadAdminData();}
 catch(error){console.error("Delete failed:",error);toast(error.message||"Delete failed. The database was not changed.");}
});

$("#exportBtn").addEventListener("click",()=>{
 const rows=[["ID","User","Type","Category","Amount","Date"],...transactions.map(t=>[t.id,t.user,t.type,t.category,t.amount,t.date])];
 const csv=rows.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\r\n");
 const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="spendwise-transactions.csv";a.click();URL.revokeObjectURL(url);toast("CSV export downloaded.");
});
$("#settingsForm").addEventListener("submit",e=>{e.preventDefault();$("#settingsMessage").textContent="Not saved: the Java API does not have a settings endpoint yet.";toast("Settings are not connected to MySQL yet.")});
$("#notificationBtn").addEventListener("click",()=>toast("You are all caught up with notifications."));
$("#profileBtn").addEventListener("click",()=>toast(adminProfile?`Signed in as ${adminProfile.fullName}`:"Administrator account"));
$("#logoutBtn").addEventListener("click",async()=>{try{await fetch("http://localhost:8080/api/logout",{method:"POST",credentials:"include"});}catch(error){console.error("Logout failed",error)}window.location.href="login.html";});
$("#chartRange").addEventListener("change",renderDashboardCharts);
$$("[data-report]").forEach(btn=>btn.addEventListener("click",()=>{$$("[data-report]").forEach(b=>b.classList.toggle("selected",b===btn));renderReports()}));
$("#reportMonth").addEventListener("change",renderReports);
$$("[data-settings-tab]").forEach(btn=>btn.addEventListener("click",()=>{$$("[data-settings-tab]").forEach(b=>b.classList.toggle("selected",b===btn));toast(`${btn.textContent} settings are not backed by an API yet.`)}));

initAdmin();
