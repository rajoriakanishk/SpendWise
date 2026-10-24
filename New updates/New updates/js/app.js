const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

async function loadUserProfile(userId = 1) {
  try {
    
const response = await fetch(
    `http://localhost:8080/api/user/${userId}`,
    {
        credentials: "include"
    }
);


    if (!response.ok) {
      throw new Error(`Could not load user (HTTP ${response.status})`);
    }

    const user = await response.json();

    window.spendWiseUser = user;
    
const headerName = document.querySelector(".user-meta b");
if (headerName) {
  headerName.textContent = user.fullName || "Student";
}

const greeting = document.querySelector("#page-dashboard h1");
if (greeting) {
  greeting.innerHTML =
    `Hello, ${escapeHtml(user.fullName || "Student")} <span>✦</span>`;
}

const avatar = document.querySelector("#headerAvatar");
if (avatar) {
  avatar.textContent = (user.fullName || "Student")
    .split(/\s+/)
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const profileAvatar = document.querySelector("#profileAvatar");

if (profileAvatar) {
  profileAvatar.textContent = (user.fullName || "Student")
    .split(/\s+/)
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}


    const nameElements = [
      "#profileName",
      "#profileFullName"
    ];

    nameElements.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        element.textContent = user.fullName || "Student";
      }
    });

    const emailElements = [
      "#profileEmail",
      "#profileFullEmail"
    ];

    emailElements.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        element.textContent = user.email || "";
      }
    });

    console.log("SpendWise user loaded:", user);
  } catch (error) {
    console.error("Unable to load SpendWise user:", error);
  }
}

async function loadExpenses() {
    try {
        const userId = window.spendWiseUser?.id || 1;

        
const response = await fetch(
    `http://localhost:8080/api/expenses?userId=${userId}`,
    {
        credentials: "include"
    }
);


        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("Invalid expenses response");
        }

        expenses = data.map(item => ({
            id: Number(item.id),
            date: String(item.date ?? item.expenseDate ?? "").slice(0, 10),
            description: item.description ?? "",
            category: item.category ?? "Other",
            amount: Number(item.amount)
        }));

        updateSummary();

        console.log("SpendWise expenses loaded:", expenses);
    } catch (error) {
        console.error("Unable to load expenses:", error);
        toast("Unable to load expenses from the server.");
    }
}
const today = new Date();
const isoToday = today.toISOString().slice(0, 10);
let monthlyBudget = 5000;
let expenses = [];
let goals = [
  {id:1,name:"New laptop",target:50000,saved:8000,icon:"💻",date:"2026-11-30"},
  {id:2,name:"Emergency fund",target:10000,saved:2500,icon:"🌱",date:"2026-12-31"}
];
let nextGoalId = 3;
let editingGoalId = null;
let activeSavingsGoalId = null;
let pendingDeleteGoalId = null;
let profilePictureData = null;
const categoryMeta = {
  Food:{icon:"🍜",color:"#07966b",limit:1500},Transport:{icon:"🚌",color:"#5aa8e8",limit:800},
  Education:{icon:"🎓",color:"#9676e8",limit:600},Entertainment:{icon:"🎮",color:"#f7a54b",limit:300},
  Shopping:{icon:"🛍️",color:"#f17b9c",limit:1000},Health:{icon:"♥",color:"#ec7c7c",limit:500},
  Bills:{icon:"▣",color:"#4db7b1",limit:500},Other:{icon:"•••",color:"#9ba9a2",limit:300}
};
const iconFor = (category) => (categoryMeta[category] || categoryMeta.Other).icon;
const spentTotal = () => expenses.reduce((sum, item) => sum + Number(item.amount), 0);
const remaining = () => monthlyBudget - spentTotal();
const money = (amount) => currency.format(amount);
function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),2600);}
function goToPage(page){
  const target=$("#page-"+page);if(!target)return;
  $$(".page").forEach(p=>p.classList.remove("active"));target.classList.add("active");
  $$(".nav-link[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  $("#pageTitle").textContent="/ "+({dashboard:"Dashboard","add-expense":"Add Expense",transactions:"Transactions",categories:"Categories",budgets:"Budgets",goals:"Savings Goals",reports:"Reports",profile:"Profile"}[page]||"Dashboard");
  $("#sidebar").classList.remove("open");window.scrollTo({top:0,behavior:"smooth"});
  if(page==="transactions")renderTransactions();
}
$$("[data-page]").forEach(button=>button.addEventListener("click",()=>goToPage(button.dataset.page)));
$$("[data-go]").forEach(button=>button.addEventListener("click",event=>{event.preventDefault();goToPage(button.dataset.go);}));
$("#menuToggle").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));

$("#logoutBtn").addEventListener("click", async () => {
  try {
    await fetch("http://localhost:8080/api/logout", {
      method: "POST",
      credentials: "include"
    });
  } catch (error) {
    console.error("Logout request failed:", error);
  } finally {
    sessionStorage.removeItem("spendWiseUser");
    window.location.href = "login.html";
  }
});

$("#notificationBtn").addEventListener("click",()=>toast(remaining()<0?"Your budget has been exceeded.":"You're all caught up in this demo."));
$("#expenseDate").value=isoToday;
function updateSummary(){
  const spent=spentTotal(),left=monthlyBudget-spent,percent=monthlyBudget>0?Math.round(spent/monthlyBudget*100):0;
  $("#dashBudget").textContent=money(monthlyBudget);$("#dashSpent").textContent=money(spent);$("#dashRemaining").textContent=money(left);
  $("#spentPercent").textContent=`${monthlyBudget?((spent/monthlyBudget)*100).toFixed(1):0}% of your budget`;
  $("#circlePercent").textContent=percent+"%";$(".progress-circle").style.background=`conic-gradient(#07966b 0 ${Math.min(100,Math.max(0,percent))}%,#dceee6 ${Math.min(100,Math.max(0,percent))}% 100%)`;
  $("#formBudget").textContent=money(monthlyBudget);$("#formRemaining").textContent=money(left);
  $("#budgetTotal").textContent=money(monthlyBudget);$("#budgetSpent").textContent=money(spent);$("#budgetAvailable").textContent=money(left);
  $("#reportBudgetTip").textContent=left>=0?`You have ${money(left)} remaining in your monthly budget.`:`You are ${money(Math.abs(left))} over your monthly budget.`;
  renderRecent();renderTransactions();renderCategories();renderBudgets();renderGoals();
}

function renderRecent(){
  const list=$("#recentTransactions");const recent=[...expenses].sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id).slice(0,4);
  list.innerHTML=recent.length?recent.map(e=>`<div class="recent-row"><div class="transaction-icon ${e.category}">${iconFor(e.category)}</div><div><b>${escapeHtml(e.description||e.category)}</b><small>${formatDate(e.date)} · ${e.category}</small></div><strong>${money(e.amount)}</strong></div>`).join(""):'<div class="empty-state">No expenses yet. Add your first expense.</div>';
}
function renderTransactions(){
  const query=($("#transactionSearch")?.value||"").toLowerCase(),filter=$("#transactionFilter")?.value||"All",dateFilter=$("#dateFilter")?.value||"all";
  let data=[...expenses].sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id).filter(e=>(filter==="All"||e.category===filter)&&(`${e.description} ${e.category} ${e.date}`.toLowerCase().includes(query)));
  if(dateFilter==="30"){const cutoff=new Date();cutoff.setDate(cutoff.getDate()-30);data=data.filter(e=>new Date(e.date)>=cutoff);}
  $("#transactionsBody").innerHTML=data.length?data.map(e=>`<tr><td>${formatDate(e.date)}</td><td><strong>${escapeHtml(e.description||"—")}</strong></td><td><span class="cat-pill">${iconFor(e.category)} ${e.category}</span></td><td><strong>${money(e.amount)}</strong></td><td><button class="delete-btn" data-delete="${e.id}" aria-label="Delete ${escapeHtml(e.description)}">×</button></td></tr>`).join(""):'<tr><td colspan="5" class="empty-state">No matching transactions.</td></tr>';
  $("#transactionCount").textContent=`Showing ${data.length} transaction${data.length===1?"":"s"}`;
  
$$("[data-delete]").forEach(btn => {
  btn.addEventListener("click", async () => {
    const id = Number(btn.dataset.delete);

    if (!confirm("Are you sure you want to delete this expense?")) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8080/api/expenses/${id}`,
        { method: "DELETE", credentials: "include" }
      );

      const result = await response.json();

      if (!response.ok) {
        toast(result.error || "Could not delete expense.");
        return;
      }

      await loadExpenses();
      toast("Expense deleted successfully!");

    } catch (error) {
      console.error("Error deleting expense:", error);
      toast("Could not connect to the backend. Is the Java server running?");
    }
  });
});

}
function renderCategories(){
  const total=spentTotal();const categories=Object.keys(categoryMeta);
  $("#categoryGrid").innerHTML=categories.map(cat=>{const amount=expenses.filter(e=>e.category===cat).reduce((s,e)=>s+Number(e.amount),0);const pct=total?amount/total*100:0;return `<article class="category-card"><div class="category-top"><span class="category-symbol" style="color:${categoryMeta[cat].color}">${categoryMeta[cat].icon}</span><span class="muted">${pct.toFixed(0)}%</span></div><h2>${cat}</h2><small>${expenses.filter(e=>e.category===cat).length} transaction(s)</small><div class="amount">${money(amount)}</div><small>of ${money(categoryMeta[cat].limit)} sample limit</small><div class="category-bar"><span style="width:${Math.min(100,pct)}%;background:${categoryMeta[cat].color}"></span></div></article>`}).join("");
}
function renderBudgets(){
  const total=spentTotal();$("#budgetList").innerHTML=Object.keys(categoryMeta).map(cat=>{const spent=expenses.filter(e=>e.category===cat).reduce((s,e)=>s+Number(e.amount),0),limit=categoryMeta[cat].limit,pct=limit?spent/limit*100:0;return `<div class="budget-item"><span class="category-symbol" style="width:34px;height:34px;font-size:16px">${categoryMeta[cat].icon}</span><div class="budget-name"><b>${cat}</b><small>${money(spent)} spent of ${money(limit)}</small></div><div class="budget-numbers ${pct>100?"over":""}">${pct.toFixed(0)}%<small>${money(limit-spent)} left</small></div><div class="budget-bar"><span style="width:${Math.min(100,pct)}%;background:${pct>100?"#dc6660":"#07966b"}"></span></div></div>`}).join("");
}
function renderGoals(){
  const grid=$("#goalGrid");
  if(!goals.length){grid.innerHTML='<div class="empty-state goal-empty"><div class="goal-empty-icon">◎</div><h2>No savings goals yet</h2><p>Create a goal to start tracking your progress.</p><button class="btn primary" type="button" id="emptyAddGoalBtn">＋ Add goal</button></div>';$("#emptyAddGoalBtn")?.addEventListener("click",openAddGoal);return;}
  grid.innerHTML=goals.map(g=>{const pct=g.target?Math.min(100,g.saved/g.target*100):0;return `<article class="goal-card"><div class="goal-top"><div class="goal-art">${g.icon||"◎"}</div><div class="goal-title"><h2>${escapeHtml(g.name)}</h2><p class="muted">Savings target</p></div><span class="goal-target">${pct.toFixed(0)}%</span></div><div class="goal-progress"><span>${money(g.saved)} saved</span><b>${money(g.target)}</b></div><div class="budget-bar"><span style="width:${pct}%"></span></div><div class="goal-foot"><span>Target date: ${escapeHtml(g.date?formatDate(g.date):"Not set")}</span><button class="text-btn" type="button" data-add-savings="${g.id}">＋ Add savings</button></div><div class="goal-actions"><button class="btn outline small-btn" type="button" data-edit-goal="${g.id}">✎ Edit goal</button><button class="btn subtle-danger small-btn" type="button" data-delete-goal="${g.id}">Delete</button></div></article>`}).join("");
  $$('[data-add-savings]').forEach(btn=>btn.addEventListener('click',()=>openSavingsDialog(Number(btn.dataset.addSavings))));
  $$('[data-edit-goal]').forEach(btn=>btn.addEventListener('click',()=>openEditGoal(Number(btn.dataset.editGoal))));
  $$('[data-delete-goal]').forEach(btn=>btn.addEventListener('click',()=>openDeleteGoal(Number(btn.dataset.deleteGoal))));
}
function openAddGoal(){
  editingGoalId=null;$("#goalForm").reset();$("#goalSaved").value="0";$("#goalDialogTitle").textContent="Add a savings goal";$("#saveGoalBtn").textContent="Save goal";$("#goalDialog").showModal();setTimeout(()=>$("#goalName").focus(),50);
}
function openEditGoal(id){
  const goal=goals.find(g=>g.id===id);if(!goal)return;editingGoalId=id;$("#goalName").value=goal.name;$("#goalTarget").value=goal.target;$("#goalSaved").value=goal.saved;$("#goalDate").value=goal.date||"";$("#goalDialogTitle").textContent="Edit savings goal";$("#saveGoalBtn").textContent="Save changes";$("#goalDialog").showModal();
}
function openSavingsDialog(id){
  const goal=goals.find(g=>g.id===id);if(!goal)return;activeSavingsGoalId=id;$("#savingsForm").reset();$("#savingsGoalContext").textContent=`Add money saved toward “${goal.name}”. Current total: ${money(goal.saved)}.`;$("#savingsDialog").showModal();setTimeout(()=>$("#savingsAmount").focus(),50);
}
function openDeleteGoal(id){
  const goal=goals.find(g=>g.id===id);if(!goal)return;pendingDeleteGoalId=id;$("#deleteGoalMessage").textContent=`“${goal.name}” and its savings progress will be removed. This action cannot be undone.`;$("#deleteGoalDialog").showModal();
}
function closeDialog(id){const dialog=$("#"+id);if(dialog?.open)dialog.close();}
function setupDialogDismissal(){
  $$('[data-close-dialog]').forEach(btn=>btn.addEventListener('click',()=>closeDialog(btn.dataset.closeDialog)));
  ['goalDialog','savingsDialog','deleteGoalDialog','budgetDialog'].forEach(id=>{const dialog=$("#"+id);if(!dialog)return;dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});dialog.addEventListener('cancel',()=>{});});
}
function formatDate(date){if(!date)return "—";return new Date(date+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));}
$("#expenseForm").addEventListener("submit", async event => {
  event.preventDefault();

  const amount = Number($("#expenseAmount").value);
  const category = $("#expenseCategory").value;
  const date = $("#expenseDate").value;
  const description = $("#expenseDescription").value.trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    toast("Enter an amount greater than zero.");
    return;
  }

  if (!category || !date) {
    toast("Please complete the required fields.");
    return;
  }

  try {
    const response = await fetch("http://localhost:8080/api/expenses", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        userId: String(window.spendWiseUser?.id || 1),
        amount: String(amount),
        category: category,
        expenseDate: date,
        description: description || category
      })
    });

    const result = await response.json();

    if (!response.ok) {
      toast(result.error || "Could not save expense.");
      return;
    }

    // Reload expenses from the database.
    await loadExpenses();

    $("#expenseForm").reset();
    $("#expenseDate").value = isoToday;

    updateSummary();
    toast("Expense saved successfully!");
    goToPage("transactions");

  } catch (error) {
    console.error("Error saving expense:", error);
    toast("Could not connect to the backend. Is the Java server running?");
  }
});
["transactionSearch","transactionFilter","dateFilter"].forEach(id=>$("#"+id).addEventListener("input",renderTransactions));
$("#exportBtn").addEventListener("click",()=>{
  const rows=[["Date","Description","Category","Amount"],...expenses.map(e=>[e.date,e.description,e.category,e.amount])];
  const csv=rows.map(row=>row.map(cell=>`"${String(cell).replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));const a=document.createElement("a");a.href=url;a.download="spendwise-transactions.csv";a.click();URL.revokeObjectURL(url);toast("CSV export downloaded.");
});
$("#editBudgetBtn").addEventListener("click",()=>{ $("#newBudget").value=monthlyBudget;$("#budgetDialog").showModal();});
$("#budgetForm").addEventListener("submit",event=>{if(event.submitter?.value==="cancel")return;event.preventDefault();const amount=Number($("#newBudget").value);if(!Number.isFinite(amount)||amount<=0){toast("Budget must be greater than zero.");return;}monthlyBudget=amount;$("#budgetDialog").close();updateSummary();toast("Monthly budget updated.");});
function handleGoalSubmit(event){
  event.preventDefault();const name=$("#goalName").value.trim(),target=Number($("#goalTarget").value),saved=Number($("#goalSaved").value),date=$("#goalDate").value;
  if(!name||!Number.isFinite(target)||target<=0||!Number.isFinite(saved)||saved<0){toast("Enter a name, a target above zero, and a valid saved amount.");return;}
  if(editingGoalId!==null){const goal=goals.find(g=>g.id===editingGoalId);if(!goal)return;Object.assign(goal,{name,target,saved,date,icon:goal.icon||"🎯"});closeDialog("goalDialog");updateSummary();toast("Savings goal updated.");}
  else{goals.push({id:nextGoalId++,name,target,saved,icon:"🎯",date});closeDialog("goalDialog");updateSummary();toast("Savings goal added.");}
}
function openAddGoalFromButton(){openAddGoal();}
$("#addGoalBtn").addEventListener("click",openAddGoalFromButton);
$("#goalForm").addEventListener("submit",handleGoalSubmit);
$("#savingsForm").addEventListener("submit",event=>{event.preventDefault();const amount=Number($("#savingsAmount").value),goal=goals.find(g=>g.id===activeSavingsGoalId);if(!goal)return;if(!Number.isFinite(amount)||amount<=0){toast("Enter a savings amount greater than zero.");return;}goal.saved+=amount;closeDialog("savingsDialog");updateSummary();toast("Savings added to your goal.");});
$("#confirmDeleteGoalBtn").addEventListener("click",()=>{if(pendingDeleteGoalId===null)return;goals=goals.filter(g=>g.id!==pendingDeleteGoalId);pendingDeleteGoalId=null;closeDialog("deleteGoalDialog");updateSummary();toast("Savings goal deleted.");});
setupDialogDismissal();
function updateProfilePicture(data){profilePictureData=data;["#profileAvatar","#headerAvatar"].forEach(selector=>{const el=$(selector);if(!el)return;if(data){el.innerHTML=`<img src="${data}" alt="Your profile picture">`;el.classList.add("has-photo");}else{el.textContent="RB";el.classList.remove("has-photo");}});}
$("#profilePictureInput").addEventListener("change",event=>{const file=event.target.files?.[0];if(!file)return;if(!/^image\/(png|jpeg|webp|gif)$/.test(file.type)){toast("Choose a JPG, PNG, WEBP or GIF image.");event.target.value="";return;}if(file.size>5*1024*1024){toast("Image must be 5 MB or smaller.");event.target.value="";return;}const reader=new FileReader();reader.onload=()=>{updateProfilePicture(reader.result);try{localStorage.setItem("spendwise-profile-picture",reader.result);}catch(e){toast("Picture applied for this session, but could not be saved in browser storage.");return;}toast("Profile picture updated.");};reader.readAsDataURL(file);});
$("#removeProfilePictureBtn").addEventListener("click",()=>{updateProfilePicture(null);try{localStorage.removeItem("spendwise-profile-picture");}catch(e){}$("#profilePictureInput").value="";toast("Profile picture removed.");});
try{const savedPicture=localStorage.getItem("spendwise-profile-picture");if(savedPicture)updateProfilePicture(savedPicture);}catch(e){}

$("#chartRange").addEventListener("change",()=>toast("Chart is illustrative sample data in this prototype."));
const savedUser = sessionStorage.getItem("spendWiseUser");

if (savedUser) {
  try {
    window.spendWiseUser = JSON.parse(savedUser);
  } catch (error) {
    console.error("Unable to read saved student:", error);
  }
}


updateSummary();

if (window.spendWiseUser?.id) {
    loadUserProfile(window.spendWiseUser.id);
    loadExpenses();
} else {
    window.location.href = "login.html";
}

