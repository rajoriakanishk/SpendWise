const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];

let users = [
  {id:1,name:"Kanishk Rajoria",email:"kanishk@example.com",role:"Student",status:"Active",joined:"12 Oct 2025"},
  {id:2,name:"Priya Verma",email:"priya@example.com",role:"Student",status:"Active",joined:"11 Oct 2025"},
  {id:3,name:"Aarav Sharma",email:"aarav@example.com",role:"Student",status:"Active",joined:"10 Oct 2025"},
  {id:4,name:"Sneha Patel",email:"sneha@example.com",role:"Student",status:"Active",joined:"9 Oct 2025"},
  {id:5,name:"Rohan Mehta",email:"rohan@example.com",role:"Student",status:"Inactive",joined:"5 Oct 2025"}
];
let transactions = [
  {id:1,user:"Kanishk Rajoria",type:"Expense",category:"Food",amount:250,date:"2026-10-16"},
  {id:2,user:"Priya Verma",type:"Expense",category:"Transport",amount:120,date:"2026-10-16"},
  {id:3,user:"Aarav Sharma",type:"Income",category:"Freelance",amount:1500,date:"2026-10-15"},
  {id:4,user:"Sneha Patel",type:"Expense",category:"Entertainment",amount:300,date:"2026-10-15"},
  {id:5,user:"Rohan Mehta",type:"Expense",category:"Shopping",amount:650,date:"2026-10-14"},
  {id:6,user:"Priya Verma",type:"Expense",category:"Food",amount:180,date:"2026-10-14"},
  {id:7,user:"Kanishk Rajoria",type:"Expense",category:"Education",amount:1200,date:"2026-10-13"}
];
let categories = [
  {name:"Food",icon:"🍴",color:"#f39b34",status:"Active"},
  {name:"Transport",icon:"🚌",color:"#08a6b7",status:"Active"},
  {name:"Education",icon:"🎓",color:"#7e61dc",status:"Active"},
  {name:"Entertainment",icon:"🎮",color:"#d842ae",status:"Active"},
  {name:"Shopping",icon:"🛍️",color:"#f4a22d",status:"Active"},
  {name:"Health",icon:"♥",color:"#12b8a4",status:"Active"}
];
let modalMode = "addUser";
let editingId = null;
let pendingDelete = null;
let userPage = 1;
let transactionPage = 1;
const USERS_PER_PAGE = 5;
const TRANSACTIONS_PER_PAGE = 5;
let toastTimer;

function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2600)}
function money(value){return "₹"+Number(value).toLocaleString("en-IN")}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function showPage(page){$$(".page-view").forEach(el=>el.classList.toggle("active",el.id===`page-${page}`));$$(".nav-link").forEach(el=>el.classList.toggle("active",el.dataset.page===page));$("#sidebar").classList.remove("open");if(page==="dashboard")renderActivity();if(page==="users")renderUsers();if(page==="transactions")renderTransactions();if(page==="categories")renderCategories()}
$$(".nav-link").forEach(btn=>btn.addEventListener("click",()=>showPage(btn.dataset.page)));
$$("[data-go]").forEach(btn=>btn.addEventListener("click",()=>showPage(btn.dataset.go)));
$("#menuBtn").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
$("#todayLabel").textContent=new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"});

function renderActivity(){
 const events=[
  ["♙","New user registered","Aarav Sharma","2 hours ago",""],
  ["▣","Expense added","Food · ₹250","4 hours ago","orange"],
  ["⚙","Budget updated","Priya Verma","5 hours ago",""],
  ["♙","New user registered","Sneha Patel","7 hours ago","purple"],
  ["◆","Category added","Health","8 hours ago","orange"]
 ];
 $("#activityList").innerHTML=events.map(e=>`<div class="activity-item"><span class="activity-icon ${e[4]}">${e[0]}</span><div><strong>${e[1]}</strong><small>${e[2]}</small></div><span class="activity-time">${e[3]}</span></div>`).join("");
}
function renderUsers(){
 const role=$("#userRoleFilter").value,status=$("#userStatusFilter").value,q=$("#userSearch").value.trim().toLowerCase();
 // Keep IDs in ascending order so newly created users follow existing users.
 const list=users.slice().sort((a,b)=>a.id-b.id).filter(u=>(!role||u.role===role)&&(!status||u.status===status)&&(`${u.name} ${u.email}`.toLowerCase().includes(q)));
 const pageCount=Math.max(1,Math.ceil(list.length/USERS_PER_PAGE));
 userPage=Math.min(Math.max(1,userPage),pageCount);
 const start=(userPage-1)*USERS_PER_PAGE;
 const pageUsers=list.slice(start,start+USERS_PER_PAGE);
 $("#usersTable").innerHTML=pageUsers.map(u=>`<tr><td>${u.id}</td><td><strong>${escapeHtml(u.name)}</strong></td><td>${escapeHtml(u.email)}</td><td><span class="role-badge">${escapeHtml(u.role)}</span></td><td><span class="status-badge ${u.status.toLowerCase()}">${escapeHtml(u.status)}</span></td><td>${escapeHtml(u.joined)}</td><td><div class="row-actions"><button title="View user" data-action="view-user" data-id="${u.id}">◉</button><button title="Edit user" data-action="edit-user" data-id="${u.id}">✎</button><button class="delete" title="Delete user" data-action="delete-user" data-id="${u.id}">♲</button></div></td></tr>`).join("")||'<tr><td colspan="7">No users match your filters.</td></tr>';
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
 $("#totalTransactions").textContent=(1842+transactions.length-7).toLocaleString("en-IN");
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
 $("#categoriesTable").innerHTML=categories.map((c,i)=>`<tr><td><strong>${escapeHtml(c.name)}</strong></td><td><span class="category-icon">${c.icon}</span></td><td><span class="color-swatch" style="background:${c.color}"></span>${c.color}</td><td><span class="status-badge active">${c.status}</span></td><td><div class="row-actions"><button title="Edit category" data-action="edit-category" data-id="${i}">✎</button><button class="delete" title="Delete category" data-action="delete-category" data-id="${i}">♲</button></div></td></tr>`).join("");
}
function renderTopUsers(){$("#topUsersList").innerHTML=users.slice(0,5).map((u,i)=>`<div class="top-user-row"><span class="mini-avatar">${escapeHtml(u.name[0])}</span><div><strong>${escapeHtml(u.name)}</strong><small>${u.status}</small></div><b>${money([12450,9320,8760,7790,6420][i]||0)}</b></div>`).join("")}
function openModal(title,fields,mode,id=null){
 modalMode=mode;editingId=id;$("#modalTitle").textContent=title;$("#modalFields").innerHTML=fields;$("#modalBackdrop").hidden=false;
}
function closeModal(){$("#modalBackdrop").hidden=true;$("#modalForm").reset();editingId=null}
function userFields(u={name:"",email:"",role:"Student",status:"Active"}){return `<label class="form-field">Full name<input name="name" value="${escapeHtml(u.name)}" required maxlength="80"></label><label class="form-field">Email address<input name="email" type="email" value="${escapeHtml(u.email)}" required></label><label class="form-field">Role<select name="role"><option ${u.role==="Student"?"selected":""}>Student</option><option ${u.role==="Admin"?"selected":""}>Admin</option></select></label><label class="form-field">Status<select name="status"><option ${u.status==="Active"?"selected":""}>Active</option><option ${u.status==="Inactive"?"selected":""}>Inactive</option></select></label>`}
function transactionFields(t={user:users[0]?.name||"",type:"Expense",category:"Food",amount:"",date:new Date().toISOString().slice(0,10)}){return `<label class="form-field">User<select name="user" required>${users.map(u=>`<option ${u.name===t.user?"selected":""}>${escapeHtml(u.name)}</option>`).join("")}</select></label><label class="form-field">Type<select name="type"><option ${t.type==="Expense"?"selected":""}>Expense</option><option ${t.type==="Income"?"selected":""}>Income</option></select></label><label class="form-field">Category<input name="category" value="${escapeHtml(t.category)}" required></label><label class="form-field">Amount (₹)<input name="amount" type="number" min="0.01" step="0.01" value="${t.amount}" required></label><label class="form-field">Date<input name="date" type="date" value="${t.date}" required></label>`}
function categoryFields(c={name:"",icon:"📌",color:"#087e62"}){return `<label class="form-field">Category name<input name="name" value="${escapeHtml(c.name)}" required maxlength="40"></label><label class="form-field">Icon (emoji)<input name="icon" value="${escapeHtml(c.icon)}" required maxlength="4"></label><label class="form-field">Color<input name="color" type="color" value="${c.color}" required></label>`}
$("#addUserBtn").addEventListener("click",()=>openModal("Add user",userFields(),"addUser"));
$("#addCategoryBtn").addEventListener("click",()=>openModal("Add category",categoryFields(),"addCategory"));
$("#closeModal").addEventListener("click",closeModal);$("#cancelModal").addEventListener("click",closeModal);
$("#modalBackdrop").addEventListener("click",e=>{if(e.target===$("#modalBackdrop"))closeModal()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});
$("#modalForm").addEventListener("submit",e=>{
 e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget).entries());
 if(modalMode==="addUser"||modalMode==="editUser"){
  if(users.some(u=>u.email.toLowerCase()===data.email.toLowerCase()&&u.id!==editingId)){toast("That email is already registered.");return}
  if(modalMode==="addUser"){users.push({id:Math.max(0,...users.map(u=>u.id))+1,...data,joined:new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})});userPage=Math.ceil(users.length/USERS_PER_PAGE)}
  else users=users.map(u=>u.id===editingId?{...u,...data}:u);
  renderUsers();renderTopUsers();updateUserFilter();toast(modalMode==="addUser"?"User added (demo only).":"User updated (demo only).");
 }else if(modalMode==="addTransaction"||modalMode==="editTransaction"){
  data.amount=Number(data.amount);if(!Number.isFinite(data.amount)||data.amount<=0){toast("Enter an amount greater than zero.");return}
  if(modalMode==="addTransaction")transactions.unshift({id:Math.max(0,...transactions.map(t=>t.id))+1,...data});
  else transactions=transactions.map(t=>t.id===editingId?{...t,...data}:t);
  renderTransactions();toast("Transaction saved (demo only).");
 }else if(modalMode==="addCategory"||modalMode==="editCategory"){
  if(categories.some(c=>c.name.toLowerCase()===data.name.toLowerCase()&&categories.indexOf(c)!==editingId)){toast("That category already exists.");return}
  if(modalMode==="addCategory")categories.push({...data,status:"Active"});else categories[editingId]={...categories[editingId],...data};
  renderCategories();updateCategoryFilter();toast("Category saved (demo only).");
 }
 closeModal();
});
function updateUserFilter(){const select=$("#transactionUserFilter"),current=select.value;select.innerHTML='<option value="">All Users</option>'+users.map(u=>`<option>${escapeHtml(u.name)}</option>`).join("");select.value=current}
function updateCategoryFilter(){const select=$("#transactionCategoryFilter"),current=select.value;select.innerHTML='<option value="">All Categories</option>'+categories.map(c=>`<option>${escapeHtml(c.name)}</option>`).join("")+'<option>Freelance</option>';select.value=current}
["userRoleFilter","userStatusFilter","userSearch"].forEach(id=>$("#"+id).addEventListener("input",()=>{userPage=1;renderUsers()}));
$("#usersPagination").addEventListener("click",e=>{const btn=e.target.closest("button[data-user-page]");if(!btn||btn.disabled)return;userPage=Number(btn.dataset.userPage);renderUsers()});
$("#brandHome").addEventListener("click",e=>{e.preventDefault();showPage("dashboard")});
["transactionUserFilter","transactionCategoryFilter","transactionTypeFilter","transactionDate"].forEach(id=>$("#"+id).addEventListener("input",()=>{transactionPage=1;renderTransactions()}));
$("#transactionsPagination").addEventListener("click",e=>{const btn=e.target.closest("button[data-transaction-page]");if(!btn||btn.disabled)return;transactionPage=Number(btn.dataset.transactionPage);renderTransactions()});
$("#globalSearch").addEventListener("input",()=>{transactionPage=1;renderTransactions();const q=$("#globalSearch").value.toLowerCase();if(q){showPage("transactions");renderTransactions()}});
document.addEventListener("click",e=>{
 const btn=e.target.closest("[data-action]");if(!btn)return;const id=Number(btn.dataset.id),action=btn.dataset.action;
 if(action==="view-user"){const u=users.find(x=>x.id===id);if(u)toast(`${u.name} · ${u.email} · ${u.status}`)}
 if(action==="edit-user"){const u=users.find(x=>x.id===id);if(u)openModal("Edit user",userFields(u),"editUser",id)}
 if(action==="delete-user"){openDeleteConfirmation("user",id)}
 if(action==="view-transaction"){const t=transactions.find(x=>x.id===id);if(t)toast(`${t.user} · ${t.category} · ${money(t.amount)}`)}
 if(action==="edit-transaction"){const t=transactions.find(x=>x.id===id);if(t)openModal("Edit transaction",transactionFields(t),"editTransaction",id)}
 if(action==="delete-transaction"){openDeleteConfirmation("transaction",id)}
 if(action==="edit-category"){const c=categories[id];if(c)openModal("Edit category",categoryFields(c),"editCategory",id)}
 if(action==="delete-category"){openDeleteConfirmation("category",id)}
});
const deleteConfirmBackdrop=$("#transactionConfirmBackdrop");
const deleteConfirmDialog=deleteConfirmBackdrop.querySelector(".confirm-dialog");
function openDeleteConfirmation(type,id){
 const record=type==="user"?users.find(x=>x.id===id):type==="transaction"?transactions.find(x=>x.id===id):categories[id];
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
$("#confirmTransactionDelete").addEventListener("click",()=>{
 if(!pendingDelete)return;
 const {type,id}=pendingDelete;
 closeDeleteConfirmation();
 if(type==="category"){
  const category=categories[id];
  categories.splice(id,1);
  renderCategories();updateCategoryFilter();
  toast(category?`Category ${category.name} removed from demo data.`:"Category removed from demo data.");
 }else if(type==="user"){
  const user=users.find(x=>x.id===id);
  users=users.filter(x=>x.id!==id);
  renderUsers();renderTopUsers();updateUserFilter();
  toast(user?`User ${user.name} removed from demo data.`:"User removed from demo data.");
 }else{
  transactions=transactions.filter(x=>x.id!==id);
  renderTransactions();
  toast("Transaction removed from demo data.");
 }
});

$("#exportBtn").addEventListener("click",()=>{
 const rows=[["ID","User","Type","Category","Amount","Date"],...transactions.map(t=>[t.id,t.user,t.type,t.category,t.amount,t.date])];
 const csv=rows.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\r\n");
 const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="spendwise-transactions.csv";a.click();URL.revokeObjectURL(url);toast("CSV export downloaded.");
});
$("#settingsForm").addEventListener("submit",e=>{e.preventDefault();$("#settingsMessage").textContent="Settings saved in this browser session.";toast("Settings saved (demo only).")});
$("#notificationBtn").addEventListener("click",()=>toast("You are all caught up with notifications."));
$("#profileBtn").addEventListener("click",()=>toast("Signed in as demo administrator."));
$("#logoutBtn").addEventListener("click",()=>toast("Demo mode: connect authentication before enabling logout."));
$("#chartRange").addEventListener("change",e=>toast(`${e.target.value} selected. Connect API data to update chart values.`));
$$("[data-report]").forEach(btn=>btn.addEventListener("click",()=>{$$("[data-report]").forEach(b=>b.classList.toggle("selected",b===btn));toast(`${btn.textContent} report selected.`)}));
$$("[data-settings-tab]").forEach(btn=>btn.addEventListener("click",()=>{$$("[data-settings-tab]").forEach(b=>b.classList.toggle("selected",b===btn));toast(`${btn.textContent} settings are a UI placeholder in this prototype.`)}));

renderActivity();renderUsers();renderTransactions();renderCategories();renderTopUsers();updateUserFilter();updateCategoryFilter();
