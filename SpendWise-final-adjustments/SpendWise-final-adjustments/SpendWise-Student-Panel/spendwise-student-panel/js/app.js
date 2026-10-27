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
    sessionStorage.setItem("spendwiseUser", JSON.stringify(user));
    
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
        checkMonthlyBudgetAlert();
        renderSpendingReports();
        await loadCategoryLimits();

        console.log("SpendWise expenses loaded:", expenses);
    } catch (error) {
        console.error("Unable to load expenses:", error);
        toast("Unable to load expenses from the server.");
    }
}
const today = new Date();
const isoToday = today.toISOString().slice(0, 10);

function getLoggedInUserId() {
  // First, use the user already loaded by the app.
  if (window.spendWiseUser?.id != null) {
    return Number(window.spendWiseUser.id);
  }

  // Otherwise, check sessionStorage.
  for (const storage of [sessionStorage, localStorage]) {
    const saved = storage.getItem("spendwiseUser");

    if (saved) {
      try {
        const user = JSON.parse(saved);

        if (user?.id != null && Number(user.id) > 0) {
          return Number(user.id);
        }
      } catch (error) {
        console.error("Unable to read saved student:", error);
      }
    }
  }

  console.error("No logged-in user ID was found.");
  return null;
}


function getBudgetStorageKey() {
  const userId = getLoggedInUserId();

  if (!userId) {
    return null;
  }

  return `spendwise-budget-${userId}`;
}

function loadMonthlyBudget() {
  const budgetKey = getBudgetStorageKey();

  if (!budgetKey) {
    return 5000;
  }

  const savedBudget = localStorage.getItem(budgetKey);

  return savedBudget !== null
    ? Number(savedBudget)
    : 5000;
}

let monthlyBudget = 5000;
async function loadMonthlyBudgetFromServer() {
    try {
        const response = await fetch("http://localhost:8080/api/budget", {
            method: "GET",
            credentials: "include"
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Unable to load budget");
        }

        monthlyBudget = Number(result.budgetAmount);
        updateSummary();
        checkMonthlyBudgetAlert();

    } catch (error) {
        console.error("Unable to load monthly budget:", error);
        toast("Unable to load monthly budget from server.");
    }
}
let expenses = [];
let goals = [];
let nextGoalId = 1;

async function loadSavingsGoals() {
  try {
    const response = await fetch(
      "http://localhost:8080/api/savings-goals",
      { credentials: "include" }
    );

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Invalid savings goals response");
    }

    goals = data.map(goal => ({
      id: Number(goal.id),
      name: goal.name,
      target: Number(goal.target),
      saved: Number(goal.saved),
      icon: goal.icon || "🎯",
      date: goal.date || ""
    }));

    nextGoalId = goals.reduce(
      (maxId, goal) => Math.max(maxId, goal.id),
      0
    ) + 1;

    renderGoals();
  } catch (error) {
    console.error("Unable to load savings goals:", error);
    toast("Unable to load savings goals from the server.");
  }
}

let editingGoalId = null;
let activeSavingsGoalId = null;
let pendingDeleteGoalId = null;
let profilePictureData = null;
let categoryLimits = {};
async function loadCategoryLimits() {
  try {
    const response = await fetch(
      "http://localhost:8080/api/category-limits",
      { credentials: "include" }
    );

    if (!response.ok) {
      console.error("Could not load category limits.");
      return;
    }

    const savedLimits = await response.json();

    for (const category of Object.keys(categoryMeta)) {
      if (savedLimits[category] !== null &&
          savedLimits[category] !== undefined) {
        categoryLimits[category] = Number(savedLimits[category]);
      }
    }

    renderBudgets();
    renderCategories();
  } catch (error) {
    console.error("Error loading category limits:", error);
  }
}

async function editCategoryLimit(category) {
  const currentLimit = categoryLimits[category] ?? "";
  const input = prompt(
    `Enter the monthly limit for ${category}:`,
    currentLimit
  );

  if (input === null) return;

  const amountText = input.trim();

  if (amountText === "" || !/^\d+(\.\d{1,2})?$/.test(amountText)) {
    toast("Enter a valid amount, such as 500 or 500.50.");
    return;
  }

  const amount = Number(amountText);

  if (!Number.isFinite(amount) || amount < 0 || amount > 99999999.99) {
    toast("Enter a non-negative amount within the allowed range.");
    return;
  }

  try {
    const response = await fetch(
      "http://localhost:8080/api/category-limits",
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          category: category,
          amount: amountText
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      toast(result.error || "Could not save category limit.");
      return;
    }

    categoryLimits[category] = amount;
    renderCategories();
    renderBudgets();
    toast(`${category} limit saved successfully.`);
  } catch (error) {
    console.error("Error saving category limit:", error);
    toast("Unable to connect to the server.");
  }
}

window.editCategoryLimit = editCategoryLimit;

let categoryMeta = {
  Food:{icon:"🍜",color:"#07966b",limit:1500},Transport:{icon:"🚌",color:"#5aa8e8",limit:800},
  Education:{icon:"🎓",color:"#9676e8",limit:600},Entertainment:{icon:"🎮",color:"#f7a54b",limit:300},
  Shopping:{icon:"🛍️",color:"#f17b9c",limit:1000},Health:{icon:"♥",color:"#ec7c7c",limit:500},
  Bills:{icon:"▣",color:"#4db7b1",limit:500},Other:{icon:"•••",color:"#9ba9a2",limit:300}
};
const iconFor = (category) => (categoryMeta[category] || categoryMeta.Other || {icon:"📌"}).icon;

async function loadStudentCategoriesFromServer() {
  try {
    const response = await fetch("http://localhost:8080/api/categories", { credentials: "include" });
    const result = await response.json().catch(() => []);
    if (!response.ok || !Array.isArray(result) || result.length === 0) {
      throw new Error("No active categories were returned by the server.");
    }
    const previous = categoryMeta;
    categoryMeta = Object.fromEntries(result.map(item => [item.name, {
      icon: item.icon || "📌",
      color: item.color || "#087e62",
      limit: previous[item.name]?.limit ?? 300
    }]));
    const optionHtml = result.map(item => `<option value="${String(item.name).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;")}">${String(item.name).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</option>`).join("");
    const select = $("#expenseCategory");
    if (select) {
      const selected = select.value;
      select.innerHTML = '<option value="">Select a category</option>' + optionHtml;
      if (result.some(item => item.name === selected)) select.value = selected;
    }
    const filter = $("#transactionFilter");
    if (filter) {
      const selected = filter.value;
      filter.innerHTML = '<option value="All">All categories</option>' + optionHtml;
      if (result.some(item => item.name === selected)) filter.value = selected;
    }
    renderCategories();
    renderBudgets();
  } catch (error) {
    console.error("Unable to load categories from server; using built-in categories:", error);
  }
}
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

function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),2600);}
$("#expenseDate").value=isoToday;


function renderSpendingChart() {
  const svg = $("#spendingChart");
  if (!svg) return;

  const range = $("#chartRange").value;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const start = range === "Last month"
    ? new Date(year, month - 1, 1)
    : new Date(year, month, 1);

  const end = range === "Last month"
    ? new Date(year, month, 1)
    : new Date(year, month + 1, 1);

  const dailyTotals = {};

  expenses.forEach(expense => {
    const date = expense.date;
    if (!date) return;

    const expenseDay = new Date(date + "T12:00:00");

    if (expenseDay >= start && expenseDay < end) {
      dailyTotals[date] =
        (dailyTotals[date] || 0) + Number(expense.amount || 0);
    }
  });

  const days = [];
  for (
    let date = new Date(start);
    date < end;
    date.setDate(date.getDate() + 1)
  ) {
    const key = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");

    days.push({
      date: key,
      day: date.getDate(),
      amount: dailyTotals[key] || 0
    });
  }

  const width = 620;
  const height = 220;
  const padding = 12;
  const maxAmount = Math.max(1, ...days.map(day => day.amount));
  const points = days.map((day, index) => {
    const x = days.length > 1
      ? padding + index * (width - 2 * padding) / (days.length - 1)
      : width / 2;

    const y = height - padding -
      (day.amount / maxAmount) * (height - 2 * padding);

    return { x, y, day };
  });

  const linePoints = points
    .map(point => `${point.x},${point.y}`)
    .join(" ");

  const areaPath = points.length
    ? `M${points[0].x},${height} L${linePoints.replaceAll(" ", " L")} L${points[points.length - 1].x},${height} Z`
    : "";

  const circles = points
    .filter((point, index) =>
      point.day.amount > 0 &&
      (index % Math.max(1, Math.ceil(points.length / 10)) === 0 ||
       index === points.length - 1)
    )
    .map(point =>
      `<circle cx="${point.x}" cy="${point.y}" r="4"
        fill="#fff" stroke="#07966b" stroke-width="3">
        <title>Day ${point.day.day}: ${money(point.day.amount)}</title>
      </circle>`
    ).join("");

  svg.innerHTML = `
    <defs>
      <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#0d9b70" stop-opacity=".22"/>
        <stop offset="100%" stop-color="#0d9b70" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${points.length
      ? `<path d="${areaPath}" fill="url(#areaFill)"/>
         <polyline points="${linePoints}" fill="none"
           stroke="#07966b" stroke-width="3"
           stroke-linecap="round" stroke-linejoin="round"/>
         ${circles}`
      : `<text x="310" y="110" text-anchor="middle"
           fill="currentColor">No expenses for this period</text>`
    }
  `;

  svg.setAttribute(
    "aria-label",
    `Daily spending chart for ${range.toLowerCase()}`
  );

  const labels = $$(".x-labels span");
  const labelIndexes = labels.length > 1
    ? labels.map((_, index) =>
        Math.round(index * (days.length - 1) / (labels.length - 1)))
    : [];

  labels.forEach((label, index) => {
    const day = days[labelIndexes[index]];
    label.textContent = day ? day.day : "";
  });

  const yLabels = $$(".y-labels span");
  const maxLabel = Math.ceil(maxAmount / 250) * 250 || 250;

  yLabels.forEach((label, index) => {
    const value = maxLabel * (yLabels.length - 1 - index) /
      (yLabels.length - 1);

    label.textContent = money(value);
  });
}


function updateSummary(){
  const spent=spentTotal(),left=monthlyBudget-spent,percent=monthlyBudget>0?Math.round(spent/monthlyBudget*100):0;
  $("#dashBudget").textContent=money(monthlyBudget);$("#dashSpent").textContent=money(spent);$("#dashRemaining").textContent=money(left);
  $("#spentPercent").textContent=`${monthlyBudget?((spent/monthlyBudget)*100).toFixed(1):0}% of your budget`;
  $("#circlePercent").textContent=percent+"%";$(".progress-circle").style.background=`conic-gradient(#07966b 0 ${Math.min(100,Math.max(0,percent))}%,#dceee6 ${Math.min(100,Math.max(0,percent))}% 100%)`;
  $("#formBudget").textContent=money(monthlyBudget);$("#formRemaining").textContent=money(left);
  $("#budgetTotal").textContent=money(monthlyBudget);$("#budgetSpent").textContent=money(spent);$("#budgetAvailable").textContent=money(left);
  $("#reportBudgetTip").textContent=left>=0?`You have ${money(left)} remaining in your monthly budget.`:`You are ${money(Math.abs(left))} over your monthly budget.`;
  renderRecent();renderTransactions();renderCategories();renderBudgets();renderGoals();renderSpendingChart();
}

function checkMonthlyBudgetAlert() {
    const budget = Number(monthlyBudget) || 0;

    if (budget <= 0) {
        return;
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlySpending = expenses.reduce((total, expense) => {
        if (!expense.date) {
            return total;
        }

        const expenseDate = new Date(`${expense.date}T00:00:00`);

        if (
            expenseDate.getMonth() === currentMonth &&
            expenseDate.getFullYear() === currentYear
        ) {
            return total + (Number(expense.amount) || 0);
        }

        return total;
    }, 0);

    const spendingPercentage = (monthlySpending / budget) * 100;

if (spendingPercentage > 100) {
    const extraAmount = monthlySpending - budget;
    toast(`Budget exceeded ⚠️ You've spent extra ${money(extraAmount)} over your ${money(budget)} monthly budget.`);
} else if (spendingPercentage === 100) {
    toast(`Budget limit reached! You've spent ${money(monthlySpending)} of your ${money(budget)} monthly budget.`);
} else if (spendingPercentage === 90) {
    toast(`Budget warning: You've used ${Math.round(spendingPercentage)}% of your monthly budget.`);
} else if (spendingPercentage === 50) {
    toast(`Budget reminder: You've used ${Math.round(spendingPercentage)}% of your monthly budget. Keep an eye on your spending!`);
}

    
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
function renderCategories() {
  const total = spentTotal();
  const categories = Object.keys(categoryMeta);

  // Keep the existing category cards working
  $("#categoryGrid").innerHTML = categories.map(cat => {
    const categoryExpenses = expenses.filter(e => e.category === cat);
    const amount = categoryExpenses.reduce(
      (sum, e) => sum + Number(e.amount), 0
    );
    const pct = total ? amount / total * 100 : 0;
    const limit = categoryLimits[cat];
    const limitText = limit !== undefined ? money(limit) : "No limit set";

    return `
      <article class="category-card">
        <div class="category-top">
          <span class="category-symbol"
            style="color:${categoryMeta[cat].color}">
            ${categoryMeta[cat].icon}
          </span>
          <span class="muted">${pct.toFixed(0)}%</span>
        </div>
        <h2>${cat}</h2>
        <small>${categoryExpenses.length} transaction(s)</small>
        <div class="amount">${money(amount)}</div>
        <small>${limit !== undefined ? `of ${limitText} limit` : limitText}</small>
        <div class="category-bar">
          <span style="width:${Math.min(100, pct)}%;background:${categoryMeta[cat].color}"></span>
        </div>
      </article>
    `;
  }).join("");

  // Update the donut chart's total
  const totalElement = $("#categoryTotal");
  if (totalElement) {
    totalElement.textContent = money(total);
  }

  // Calculate each category's share of total spending
  const legendElement = $("#categoryLegend");
  const donutElement = $("#categoryDonut");

  const categoryAmounts = categories.map(cat => ({
    name: cat,
    amount: expenses
      .filter(e => e.category === cat)
      .reduce((sum, e) => sum + Number(e.amount), 0),
    color: categoryMeta[cat].color
  }));

  if (legendElement) {
    legendElement.innerHTML = categoryAmounts
      .filter(cat => cat.amount > 0)
      .map(cat => {
        const pct = total ? cat.amount / total * 100 : 0;

        return `
          <div>
            <i class="dot" style="background:${cat.color}"></i>
            ${cat.name}
            <b>${pct.toFixed(0)}%</b>
          </div>
        `;
      }).join("") || "<p class='muted'>No expenses recorded yet.</p>";
  }

  // Draw the donut using actual category spending
  if (donutElement) {
    let currentPercent = 0;

    const gradient = total > 0
      ? categoryAmounts
          .filter(cat => cat.amount > 0)
          .map(cat => {
            const start = currentPercent;
            currentPercent += cat.amount / total * 100;
            return `${cat.color} ${start}% ${currentPercent}%`;
          }).join(", ")
      : "#e8eeeb 0% 100%";

    donutElement.style.background =
      `conic-gradient(${gradient})`;
  }
}
function renderSpendingReports() {
  const chart = $("#reportWeeklyChart");
  const largestCategory = $("#reportLargestCategory");

  if (!chart || !largestCategory) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Calculate spending for each week of the current month.
  const weeklyTotals = [0, 0, 0, 0];

  expenses.forEach(expense => {
    if (!expense.date) return;

    const date = new Date(`${expense.date}T00:00:00`);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month
    ) {
      return;
    }

    const weekIndex = Math.min(
      3,
      Math.floor((date.getDate() - 1) / 7)
    );

    weeklyTotals[weekIndex] += Number(expense.amount) || 0;
  });

  const maxWeekly = Math.max(...weeklyTotals, 1);

  chart.innerHTML = weeklyTotals.map((amount, index) => {
    const height = amount > 0
      ? Math.max(4, amount / maxWeekly * 100)
      : 0;

    return `
      <div>
        <span
          style="height:${height}%;"
          title="${money(amount)}">
        </span>
        <small>Week ${index + 1}</small>
      </div>
    `;
  }).join("");

  // Calculate total spending for each category this month.
  const categoryTotals = {};

  expenses.forEach(expense => {
    if (!expense.date) return;

    const date = new Date(`${expense.date}T00:00:00`);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month
    ) {
      return;
    }

    const category = expense.category || "Other";

    categoryTotals[category] =
      (categoryTotals[category] || 0) +
      (Number(expense.amount) || 0);
  });

  const categories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1]);

  if (!categories.length || categories[0][1] <= 0) {
    largestCategory.textContent =
      "No expenses recorded this month yet.";
  } else {
    largestCategory.textContent =
      `${categories[0][0]} is your largest spending category this month (${money(categories[0][1])}).`;
  }
}

function renderBudgets() {
  $("#budgetList").innerHTML = Object.keys(categoryMeta).map(cat => {
    const spent = expenses
      .filter(e => e.category === cat)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const limit = categoryLimits[cat];
    const hasLimit = limit !== undefined;
    const pct = hasLimit && limit > 0 ? spent / limit * 100 : 0;
    const remaining = hasLimit ? limit - spent : null;

    return `
      <div class="budget-item">
        <span class="category-symbol"
          style="width:34px;height:34px;font-size:16px">
          ${categoryMeta[cat].icon}
        </span>

        <div class="budget-name">
          <b>${cat}</b>
<button class="btn secondary"
  onclick="editCategoryLimit('${cat}')"
  style="padding:4px 8px;font-size:12px">
  Set limit
</button>
          <small>${money(spent)} spent ${
            hasLimit ? `of ${money(limit)}` : "— no limit set"
          }</small>
        </div>

        <div class="budget-numbers ${hasLimit && spent > limit ? "over" : ""}">
          ${hasLimit ? `${pct.toFixed(0)}%` : "—"}
          <small>${hasLimit ? `${money(remaining)} left` : "Set a limit"}</small>
        </div>

        <div class="budget-bar">
          <span style="width:${Math.min(100, pct)}%;background:${
            hasLimit && spent > limit ? "#dc6660" : "#07966b"
          }"></span>
        </div>
      </div>
    `;
  }).join("");
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

    // Show the budget warning after the success message.
    checkMonthlyBudgetAlert();

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

$("#budgetForm").addEventListener("submit", async event => {
    if (event.submitter?.value === "cancel") return;

    event.preventDefault();

    const amount = Number($("#newBudget").value);

    if (!Number.isFinite(amount) || amount <= 0) {
        toast("Budget must be greater than zero.");
        return;
    }

    try {
        const response = await fetch("http://localhost:8080/api/budget", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                amount: String(amount)
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Unable to save budget");
        }

        monthlyBudget = Number(result.budgetAmount);

        $("#budgetDialog").close();
        updateSummary();
        toast("Monthly budget saved successfully.");

    } catch (error) {
        console.error("Unable to save monthly budget:", error);
        toast(error.message || "Unable to save monthly budget.");
    }
});

$("#budgetDialog").close();updateSummary();toast("Monthly budget updated.");

async function handleGoalSubmit(event) {
  event.preventDefault();

  const name = $("#goalName").value.trim();
  const target = Number($("#goalTarget").value);
  const saved = Number($("#goalSaved").value);
  const date = $("#goalDate").value;

  if (
    !name ||
    !Number.isFinite(target) ||
    target <= 0 ||
    !Number.isFinite(saved) ||
    saved < 0
  ) {
    toast("Enter a name, a target above zero, and a valid saved amount.");
    return;
  }

  const isEditing = editingGoalId !== null;
  const existingGoal = isEditing
    ? goals.find(g => g.id === editingGoalId)
    : null;

  if (isEditing && !existingGoal) return;

  const formData = new URLSearchParams({
    name,
    target: String(target),
    saved: String(saved),
    date,
    icon: existingGoal?.icon || "🎯"
  });

  if (isEditing) {
    formData.set("id", String(editingGoalId));
  }

  try {
    const response = await fetch(
      "http://localhost:8080/api/savings-goals",
      {
        method: isEditing ? "PUT" : "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: formData
      }
    );

    const result = await response.json();

    if (!response.ok) {
      toast(result.error || "Could not save savings goal.");
      return;
    }

    await loadSavingsGoals();

    closeDialog("goalDialog");
    updateSummary();

    toast(isEditing ? "Savings goal updated." : "Savings goal added.");
  } catch (error) {
    console.error("Unable to save savings goal:", error);
    toast("Unable to connect to the server.");
  }
}

function openAddGoalFromButton(){openAddGoal();}
$("#addGoalBtn").addEventListener("click",openAddGoalFromButton);
$("#goalForm").addEventListener("submit",handleGoalSubmit);
$("#savingsForm").addEventListener("submit",event=>{event.preventDefault();const amount=Number($("#savingsAmount").value),goal=goals.find(g=>g.id===activeSavingsGoalId);if(!goal)return;if(!Number.isFinite(amount)||amount<=0){toast("Enter a savings amount greater than zero.");return;}goal.saved+=amount;closeDialog("savingsDialog");updateSummary();toast("Savings added to your goal.");});

$("#confirmDeleteGoalBtn").addEventListener("click", async () => {
  if (pendingDeleteGoalId === null) return;

  const goalId = pendingDeleteGoalId;

  try {
    const response = await fetch(
      "http://localhost:8080/api/savings-goals",
      {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          id: String(goalId)
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      toast(result.error || "Could not delete savings goal.");
      return;
    }

    goals = goals.filter(g => g.id !== goalId);
    pendingDeleteGoalId = null;

    closeDialog("deleteGoalDialog");
    updateSummary();

    toast("Savings goal deleted.");
  } catch (error) {
    console.error("Unable to delete savings goal:", error);
    toast("Unable to connect to the server.");
  }
});

setupDialogDismissal();
function updateProfilePicture(data){profilePictureData=data;["#profileAvatar","#headerAvatar"].forEach(selector=>{const el=$(selector);if(!el)return;if(data){el.innerHTML=`<img src="${data}" alt="Your profile picture">`;el.classList.add("has-photo");}else{el.textContent="RB";el.classList.remove("has-photo");}});}
$("#profilePictureInput").addEventListener("change",event=>{const file=event.target.files?.[0];if(!file)return;if(!/^image\/(png|jpeg|webp|gif)$/.test(file.type)){toast("Choose a JPG, PNG, WEBP or GIF image.");event.target.value="";return;}if(file.size>5*1024*1024){toast("Image must be 5 MB or smaller.");event.target.value="";return;}const reader=new FileReader();reader.onload=()=>{updateProfilePicture(reader.result);try{localStorage.setItem("spendwise-profile-picture",reader.result);}catch(e){toast("Picture applied for this session, but could not be saved in browser storage.");return;}toast("Profile picture updated.");};reader.readAsDataURL(file);});
$("#removeProfilePictureBtn").addEventListener("click",()=>{updateProfilePicture(null);try{localStorage.removeItem("spendwise-profile-picture");}catch(e){}$("#profilePictureInput").value="";toast("Profile picture removed.");});
try{const savedPicture=localStorage.getItem("spendwise-profile-picture");if(savedPicture)updateProfilePicture(savedPicture);}catch(e){}

$("#chartRange").addEventListener("change", renderSpendingChart);
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
    loadStudentCategoriesFromServer().finally(() => {
        loadUserProfile(window.spendWiseUser.id);
        loadExpenses();
        loadMonthlyBudgetFromServer();
        loadSavingsGoals();
        loadCategoryLimits();
    });
} else {
    window.location.href = "login.html";
}

