(() => {
  "use strict";

  const STORAGE_KEY = "moneyTrackerPH.v1";
  const THEME_KEY = "moneyTrackerPH.theme";
  const DEFAULT_CATEGORIES = [
    "Food",
    "Groceries",
    "Transport",
    "Bills",
    "Load/Data",
    "Shopping",
    "Family",
    "Savings",
    "Rent",
    "School",
    "Health",
    "Fees",
    "Other"
  ];

  const els = {};
  let state = loadData();
  let deferredInstallPrompt = null;
  let toastTimer = null;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {
    cacheElements();
    setupTheme();
    bindEvents();
    seedIfEmpty();
    setDefaultDate();
    renderAll();
    updateFormVisibility();
    setupInstallPrompt();
    registerServiceWorker();
  }

  function cacheElements() {
    els.installButton = document.getElementById("installButton");
    els.themeToggle = document.getElementById("themeToggle");
    els.toast = document.getElementById("toast");
    els.commandCard = document.getElementById("commandCard");
    els.insightsRail = document.getElementById("insightsRail");
    els.moneyNarrative = document.getElementById("moneyNarrative");
    els.weekFlow = document.getElementById("weekFlow");
    els.previewBalance = document.getElementById("previewBalance");
    els.previewTodaySpent = document.getElementById("previewTodaySpent");
    els.previewSavings = document.getElementById("previewSavings");
    els.statsGrid = document.getElementById("statsGrid");
    els.moneyStory = document.getElementById("moneyStory");
    els.balanceCards = document.getElementById("balanceCards");
    els.categoryBreakdown = document.getElementById("categoryBreakdown");
    els.recentTransactions = document.getElementById("recentTransactions");
    els.monthLabel = document.getElementById("monthLabel");
    els.transactionForm = document.getElementById("transactionForm");
    els.editingId = document.getElementById("editingId");
    els.txType = document.getElementById("txType");
    els.txDate = document.getElementById("txDate");
    els.txAmount = document.getElementById("txAmount");
    els.txAccount = document.getElementById("txAccount");
    els.txFromAccount = document.getElementById("txFromAccount");
    els.txToAccount = document.getElementById("txToAccount");
    els.txFee = document.getElementById("txFee");
    els.txCategory = document.getElementById("txCategory");
    els.txMethod = document.getElementById("txMethod");
    els.txTransferLabel = document.getElementById("txTransferLabel");
    els.txPayee = document.getElementById("txPayee");
    els.txNotes = document.getElementById("txNotes");
    els.saveTransactionButton = document.getElementById("saveTransactionButton");
    els.cancelEditButton = document.getElementById("cancelEditButton");
    els.historySearch = document.getElementById("historySearch");
    els.historyType = document.getElementById("historyType");
    els.historyMonth = document.getElementById("historyMonth");
    els.historyList = document.getElementById("historyList");
    els.accountForm = document.getElementById("accountForm");
    els.accountName = document.getElementById("accountName");
    els.accountType = document.getElementById("accountType");
    els.accountBalance = document.getElementById("accountBalance");
    els.accountsList = document.getElementById("accountsList");
    els.exportJsonButton = document.getElementById("exportJsonButton");
    els.exportCsvButton = document.getElementById("exportCsvButton");
    els.importFile = document.getElementById("importFile");
    els.resetButton = document.getElementById("resetButton");
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const tabButton = event.target.closest("[data-tab]");
      if (tabButton) {
        openTab(tabButton.dataset.tab);
        return;
      }

      const openTabButton = event.target.closest("[data-open-tab]");
      if (openTabButton) {
        openTab(openTabButton.dataset.openTab);
        return;
      }

      const templateButton = event.target.closest("[data-template]");
      if (templateButton) {
        applyTemplate(templateButton.dataset.template);
        return;
      }

      const editButton = event.target.closest("[data-edit-tx]");
      if (editButton) {
        editTransaction(editButton.dataset.editTx);
        return;
      }

      const deleteButton = event.target.closest("[data-delete-tx]");
      if (deleteButton) {
        deleteTransaction(deleteButton.dataset.deleteTx);
        return;
      }

      const removeAccountButton = event.target.closest("[data-remove-account]");
      if (removeAccountButton) {
        removeAccount(removeAccountButton.dataset.removeAccount);
      }
    });

    els.txType.addEventListener("change", updateFormVisibility);
    els.transactionForm.addEventListener("submit", saveTransactionFromForm);
    els.cancelEditButton.addEventListener("click", resetTransactionForm);
    els.historySearch.addEventListener("input", renderHistory);
    els.historyType.addEventListener("change", renderHistory);
    els.historyMonth.addEventListener("change", renderHistory);
    els.accountForm.addEventListener("submit", addAccount);
    els.accountsList.addEventListener("submit", reconcileAccount);
    els.exportJsonButton.addEventListener("click", exportJson);
    els.exportCsvButton.addEventListener("click", exportCsv);
    els.importFile.addEventListener("change", importJson);
    els.resetButton.addEventListener("click", resetAllData);
    if (els.themeToggle) els.themeToggle.addEventListener("click", cycleTheme);
    document.addEventListener("pointermove", handlePointerSpotlight, { passive: true });
  }

  function seedIfEmpty() {
    if (!Array.isArray(state.accounts) || state.accounts.length === 0) {
      state.accounts = makeDefaultAccounts();
    }
    if (!Array.isArray(state.categories) || state.categories.length === 0) {
      state.categories = [...DEFAULT_CATEGORIES];
    }
    if (!Array.isArray(state.transactions)) {
      state.transactions = [];
    }
    saveData();
  }

  function makeDefaultAccounts() {
    return [
      { id: makeId("acct"), name: "Cash", type: "Cash", initialBalance: 0, createdAt: nowISO() },
      { id: makeId("acct"), name: "GoTyme", type: "GoTyme / Bank", initialBalance: 0, createdAt: nowISO() },
      { id: makeId("acct"), name: "Go Save", type: "Savings / Go Save", initialBalance: 0, createdAt: nowISO() },
      { id: makeId("acct"), name: "Other Bank", type: "Bank", initialBalance: 0, createdAt: nowISO() }
    ];
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { app: "Money Tracker PH", version: 1, accounts: makeDefaultAccounts(), categories: [...DEFAULT_CATEGORIES], transactions: [] };
      }
      return sanitizeData(JSON.parse(raw));
    } catch (error) {
      console.error("Unable to load saved data", error);
      return { app: "Money Tracker PH", version: 1, accounts: makeDefaultAccounts(), categories: [...DEFAULT_CATEGORIES], transactions: [] };
    }
  }

  function sanitizeData(input) {
    const data = input && typeof input === "object" ? input : {};
    const accounts = Array.isArray(data.accounts) ? data.accounts : makeDefaultAccounts();
    const categories = Array.isArray(data.categories) && data.categories.length ? data.categories : [...DEFAULT_CATEGORIES];
    const transactions = Array.isArray(data.transactions) ? data.transactions : [];

    return {
      app: "Money Tracker PH",
      version: 1,
      accounts: accounts.map((account) => ({
        id: String(account.id || makeId("acct")),
        name: String(account.name || "Wallet").slice(0, 60),
        type: String(account.type || "Other").slice(0, 40),
        initialBalance: toNumber(account.initialBalance),
        createdAt: account.createdAt || nowISO()
      })),
      categories: categories.map((category) => String(category).slice(0, 60)),
      transactions: transactions.map(sanitizeTransaction).filter(Boolean)
    };
  }

  function sanitizeTransaction(tx) {
    if (!tx || typeof tx !== "object") return null;
    const type = ["expense", "income", "transfer", "adjustment"].includes(tx.type) ? tx.type : "expense";
    const clean = {
      id: String(tx.id || makeId("tx")),
      type,
      date: isDateString(tx.date) ? tx.date : todayISO(),
      amount: Math.abs(toNumber(tx.amount)),
      fee: Math.abs(toNumber(tx.fee)),
      category: String(tx.category || "Other").slice(0, 80),
      method: String(tx.method || "Other").slice(0, 80),
      transferLabel: String(tx.transferLabel || "Transfer").slice(0, 80),
      payee: String(tx.payee || "").slice(0, 120),
      notes: String(tx.notes || "").slice(0, 360),
      accountId: tx.accountId ? String(tx.accountId) : "",
      fromAccountId: tx.fromAccountId ? String(tx.fromAccountId) : "",
      toAccountId: tx.toAccountId ? String(tx.toAccountId) : "",
      createdAt: tx.createdAt || nowISO(),
      updatedAt: tx.updatedAt || tx.createdAt || nowISO()
    };

    if (type === "adjustment") {
      clean.amount = toNumber(tx.amount);
    }
    return clean;
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function setupTheme() {
    const theme = ["aurora", "daylight", "midnight"].includes(localStorage.getItem(THEME_KEY))
      ? localStorage.getItem(THEME_KEY)
      : "aurora";
    document.documentElement.dataset.theme = theme;
    updateThemeButton(theme);
  }

  function cycleTheme() {
    const themes = ["aurora", "daylight", "midnight"];
    const current = document.documentElement.dataset.theme || "aurora";
    const next = themes[(themes.indexOf(current) + 1) % themes.length] || "aurora";
    document.documentElement.dataset.theme = next;
    localStorage.setItem(THEME_KEY, next);
    updateThemeButton(next);
    showToast(`${themeLabel(next)} activated.`);
  }

  function updateThemeButton(theme) {
    if (!els.themeToggle) return;
    els.themeToggle.textContent = `${themeLabel(theme || document.documentElement.dataset.theme)} mode`;
  }

  function themeLabel(theme) {
    if (theme === "daylight") return "Daylight";
    if (theme === "midnight") return "Midnight";
    return "Aurora";
  }

  function handlePointerSpotlight(event) {
    const target = event.target.closest?.(".card, .command-card, .narrative-card, .stat-card, .story-card, .insight-card, .balance-card, .category-row, .transaction-card, .account-card");
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    target.style.setProperty("--mx", `${x}%`);
    target.style.setProperty("--my", `${y}%`);
  }

  function renderAll() {
    renderAccountOptions();
    renderDashboard();
    renderHistory();
    renderAccounts();
  }

  function renderAccountOptions() {
    const previous = {
      account: els.txAccount.value,
      from: els.txFromAccount.value,
      to: els.txToAccount.value
    };

    const options = state.accounts
      .map((account) => `<option value="${escapeHtml(account.id)}">${escapeHtml(account.name)}</option>`)
      .join("");

    els.txAccount.innerHTML = options;
    els.txFromAccount.innerHTML = options;
    els.txToAccount.innerHTML = options;
    els.txAccount.value = previous.account || state.accounts[0]?.id || "";
    els.txFromAccount.value = previous.from || state.accounts[0]?.id || "";
    els.txToAccount.value = previous.to || state.accounts[1]?.id || state.accounts[0]?.id || "";

    els.txCategory.innerHTML = state.categories
      .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
      .join("");
  }

  function renderDashboard() {
    const balances = getBalances();
    const totalBalance = Object.values(balances).reduce((sum, amount) => sum + amount, 0);
    const savingsBalance = getSavingsBalance(balances);
    const month = currentMonth();
    const today = todayISO();
    const monthTransactions = state.transactions.filter((tx) => tx.date && tx.date.startsWith(month));
    const todayTransactions = state.transactions.filter((tx) => tx.date === today);
    const monthSpent = sumExpenseLike(monthTransactions);
    const monthIncome = monthTransactions
      .filter((tx) => tx.type === "income")
      .reduce((sum, tx) => sum + toNumber(tx.amount), 0);
    const monthFees = monthTransactions
      .filter((tx) => tx.type === "transfer")
      .reduce((sum, tx) => sum + toNumber(tx.fee), 0);
    const todaySpent = sumExpenseLike(todayTransactions);
    const netMonth = roundMoney(monthIncome - monthSpent);

    const summary = { totalBalance, monthSpent, monthIncome, monthFees, netMonth, todaySpent, savingsBalance, monthTransactions, balances };

    renderHeroPreview(totalBalance, todaySpent, savingsBalance);
    renderCommandCard(summary);
    renderInsightsRail(summary);
    renderMoneyNarrative(summary);

    els.statsGrid.innerHTML = [
      statCard("Total money now", formatCurrency(totalBalance), "All wallet balances combined", "stat-balance", "ALL", 0),
      statCard("Spent this month", formatCurrency(monthSpent), "Expenses plus transfer fees", "stat-out", "OUT", 1),
      statCard("Money in this month", formatCurrency(monthIncome), "Income or new deposits", "stat-in", "IN", 2),
      statCard("Net this month", formatCurrency(netMonth), netMonth >= 0 ? "More in than out" : "More out than in", "stat-net", "NET", 3)
    ].join("");

    renderMoneyStory(monthTransactions);
    renderWeekFlow();
    els.monthLabel.textContent = monthLabel(month);
    renderBalanceCards(balances);
    renderCategoryBreakdown(monthTransactions);
    renderRecentTransactions();
  }

  function renderHeroPreview(totalBalance, todaySpent, savingsBalance) {
    if (els.previewBalance) els.previewBalance.textContent = formatCurrency(totalBalance);
    if (els.previewTodaySpent) els.previewTodaySpent.textContent = formatCurrency(todaySpent);
    if (els.previewSavings) els.previewSavings.textContent = formatCurrency(savingsBalance);
  }

  function renderCommandCard(summary) {
    if (!els.commandCard) return;
    const flowTotal = summary.monthIncome + summary.monthSpent;
    const incomePct = flowTotal ? Math.max(3, Math.round((summary.monthIncome / flowTotal) * 100)) : 0;
    const netClass = summary.netMonth >= 0 ? "amount-positive" : "amount-negative";
    const netLabel = summary.netMonth >= 0 ? "Positive month" : "Needs attention";
    const transactionCount = summary.monthTransactions.length;
    const health = getMoneyHealth(summary);

    els.commandCard.innerHTML = `
      <div class="command-main">
        <div>
          <div class="command-kicker">Live money pulse</div>
          <div class="command-balance">${escapeHtml(formatCurrency(summary.totalBalance))}</div>
          <p class="command-subline">This is your total across Cash, GoTyme, Go Save, banks, and every wallet you add.</p>
        </div>
        <div class="flow-panel">
          <div class="flow-top">
            <span>Money in ${escapeHtml(formatCurrency(summary.monthIncome))}</span>
            <span>Money out ${escapeHtml(formatCurrency(summary.monthSpent))}</span>
          </div>
          <div class="flow-meter" aria-label="Monthly money-in share">
            <span style="--width:${incomePct}%"></span>
          </div>
          <div class="flow-bottom">
            <span>${escapeHtml(transactionCount)} moves tracked this month</span>
            <span class="${netClass}">${escapeHtml(netLabel)}: ${escapeHtml(formatCurrency(summary.netMonth))}</span>
          </div>
        </div>
      </div>
      <div class="command-side">
        ${healthDial(health)}
        ${commandMini("TOD", "Spent today", formatCurrency(summary.todaySpent))}
        ${commandMini("SAV", "Savings now", formatCurrency(summary.savingsBalance))}
        ${commandMini("FEE", "Transfer fees", formatCurrency(summary.monthFees))}
      </div>
    `;
  }

  function commandMini(icon, label, value) {
    return `
      <div class="command-mini">
        <div class="command-mini-icon">${escapeHtml(icon)}</div>
        <div>
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      </div>
    `;
  }

  function healthDial(health) {
    return `
      <div class="health-dial">
        <div class="health-ring" style="--score:${health.score}" aria-label="Money health score ${health.score} out of 100">
          <div class="health-score">${escapeHtml(health.score)}</div>
        </div>
        <div class="health-copy">
          <span>Money health</span>
          <strong>${escapeHtml(health.label)}</strong>
          <p>${escapeHtml(health.note)}</p>
        </div>
      </div>
    `;
  }

  function renderInsightsRail(summary) {
    if (!els.insightsRail) return;
    const averageOut = summary.monthTransactions.length ? summary.monthSpent / summary.monthTransactions.length : 0;
    const burn = getBurnRate(summary);
    const streak = getTrackingStreak();
    els.insightsRail.innerHTML = [
      insightCard("Moves", String(summary.monthTransactions.length), "Logged this month", 0),
      insightCard("Daily burn", formatCurrency(burn.average), "Average outflow per day", 1),
      insightCard("Projected out", formatCurrency(burn.projected), "If this pace continues", 2),
      insightCard("Track streak", `${streak} day${streak === 1 ? "" : "s"}`, averageOut ? `Avg logged out: ${formatCurrency(averageOut)}` : "Start logging daily", 3)
    ].join("");
  }

  function insightCard(label, value, note, index) {
    return `
      <article class="insight-card" style="--delay:${(index || 0) * 70}ms">
        <div class="insight-label">${escapeHtml(label)}</div>
        <div class="insight-value">${escapeHtml(value)}</div>
        <p class="insight-note">${escapeHtml(note)}</p>
      </article>
    `;
  }

  function statCard(label, value, note, className, icon, index) {
    return `
      <article class="stat-card ${escapeHtml(className || "")}" style="--delay:${(index || 0) * 70}ms">
        <div class="stat-top">
          <div class="stat-label">${escapeHtml(label)}</div>
          <div class="stat-orb">${escapeHtml(icon || "")}</div>
        </div>
        <div class="stat-value">${escapeHtml(value)}</div>
        <div class="stat-note">${escapeHtml(note)}</div>
      </article>
    `;
  }

  function renderMoneyNarrative(summary) {
    if (!els.moneyNarrative) return;
    const topCategory = getTopSpendingCategory(summary.monthTransactions);
    const largestExpense = getLargestExpense(summary.monthTransactions);
    const largestWallet = getLargestWallet(summary.balances);
    const burn = getBurnRate(summary);
    const flow = getSavingsFlow(summary.monthTransactions);
    const hasMoves = summary.monthTransactions.length > 0;

    const title = hasMoves ? "Here is the story of your money this month" : "Start tracking and the app will explain your money";
    const text = hasMoves
      ? `${topCategory ? `Your biggest spending constellation is ${topCategory.name} at ${formatCurrency(topCategory.amount)}. ` : "No expenses recorded yet. "}${largestExpense ? `Your largest single expense is ${largestExpense.title} at ${formatCurrency(largestExpense.amount)}. ` : ""}At your current pace, your projected month-end outflow is ${formatCurrency(burn.projected)}. Savings net is ${formatCurrency(flow.net)}.`
      : "Log your first cash payment, GoTyme payment, InstaPay fee, deposit, withdrawal, or savings transfer. After that, this card will explain why your balance changed.";

    els.moneyNarrative.innerHTML = `
      <div class="narrative-top">
        <div>
          <span class="narrative-pill">Smart money story</span>
          <h3 class="narrative-title">${escapeHtml(title)}</h3>
        </div>
        <span class="spark-badge">No more mystery balance</span>
      </div>
      <p class="narrative-text">${escapeHtml(text)}</p>
      <div class="narrative-grid">
        <div class="narrative-item"><span>Top category</span><strong>${escapeHtml(topCategory ? `${topCategory.name} · ${formatCurrency(topCategory.amount)}` : "None yet")}</strong></div>
        <div class="narrative-item"><span>Biggest wallet</span><strong>${escapeHtml(largestWallet ? `${largestWallet.name} · ${formatCurrency(largestWallet.balance)}` : "None yet")}</strong></div>
        <div class="narrative-item"><span>Savings net</span><strong class="${flow.net >= 0 ? "amount-positive" : "amount-negative"}">${escapeHtml(formatCurrency(flow.net))}</strong></div>
      </div>
    `;
  }

  function renderWeekFlow() {
    if (!els.weekFlow) return;
    const days = getLastSevenDays();
    const rows = days.map((date) => {
      const transactions = state.transactions.filter((tx) => tx.date === date);
      const income = transactions.filter((tx) => tx.type === "income").reduce((sum, tx) => sum + toNumber(tx.amount), 0);
      const out = sumExpenseLike(transactions);
      return { date, income, out };
    });
    const max = Math.max(1, ...rows.map((row) => Math.max(row.income, row.out)));
    const totalIn = rows.reduce((sum, row) => sum + row.income, 0);
    const totalOut = rows.reduce((sum, row) => sum + row.out, 0);

    els.weekFlow.innerHTML = `
      <div class="week-heading">
        <div>
          <p class="mini-kicker">Seven-day money weather</p>
          <h3>Cash flow timeline</h3>
          <p class="muted">Green is money in. Red is money out or fees. Empty bars mean no movement logged.</p>
        </div>
        <div class="trust-strip"><span>7d in ${escapeHtml(formatCurrency(totalIn))}</span><span>7d out ${escapeHtml(formatCurrency(totalOut))}</span></div>
      </div>
      <div class="week-bars">
        ${rows.map((row, index) => {
          const inHeight = Math.max(4, Math.round((row.income / max) * 100));
          const outHeight = Math.max(4, Math.round((row.out / max) * 100));
          return `
            <div class="day-column">
              <div class="day-stack" title="${escapeHtml(formatDate(row.date))}: in ${escapeHtml(formatCurrency(row.income))}, out ${escapeHtml(formatCurrency(row.out))}">
                <div class="day-bar in" style="--in:${inHeight}%; --delay:${index * 45}ms"></div>
                <div class="day-bar out" style="--out:${outHeight}%; --delay:${index * 45 + 80}ms"></div>
              </div>
              <div class="day-label">${escapeHtml(shortDayLabel(row.date))}</div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function getMoneyHealth(summary) {
    let score = summary.monthTransactions.length ? 58 : 48;
    if (summary.monthIncome > 0) {
      score += clamp((summary.netMonth / summary.monthIncome) * 28, -28, 28);
    } else if (summary.monthSpent > 0) {
      score -= 16;
    }
    if (summary.savingsBalance > 0) score += 8;
    if (summary.monthFees > 0 && summary.monthSpent > 0) score -= clamp((summary.monthFees / summary.monthSpent) * 18, 0, 12);
    if (summary.todaySpent === 0) score += 2;
    if (summary.monthTransactions.length >= 8) score += 5;
    score = Math.round(clamp(score, 0, 100));

    if (score >= 82) return { score, label: "Elite control", note: "Your inflow, outflow, and savings are looking strong." };
    if (score >= 65) return { score, label: "Steady control", note: "Your tracker is giving you a clear money picture." };
    if (score >= 45) return { score, label: "Watch the leaks", note: "Check the biggest category and record missing cash moves." };
    return { score, label: "Leak detected", note: "Outflow is heavy or income has not been logged yet." };
  }

  function getBurnRate(summary) {
    const now = new Date();
    const day = Math.max(1, now.getDate());
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const average = summary.monthSpent / day;
    return {
      average: roundMoney(average),
      projected: roundMoney(average * daysInMonth)
    };
  }

  function getTopSpendingCategory(transactions) {
    const totals = new Map();
    transactions.forEach((tx) => {
      if (tx.type === "expense") totals.set(tx.category || "Other", (totals.get(tx.category || "Other") || 0) + toNumber(tx.amount));
      if (tx.type === "transfer" && toNumber(tx.fee) > 0) totals.set("Fees", (totals.get("Fees") || 0) + toNumber(tx.fee));
    });
    const top = [...totals.entries()].sort((a, b) => b[1] - a[1])[0];
    return top ? { name: top[0], amount: top[1] } : null;
  }

  function getLargestExpense(transactions) {
    const expenses = transactions
      .filter((tx) => tx.type === "expense")
      .map((tx) => ({ title: tx.payee || tx.category || "Expense", amount: toNumber(tx.amount) }))
      .sort((a, b) => b.amount - a.amount);
    return expenses[0] || null;
  }

  function getLargestWallet(balances) {
    return state.accounts
      .map((account) => ({ name: account.name, balance: toNumber(balances[account.id] || 0) }))
      .sort((a, b) => b.balance - a.balance)[0] || null;
  }

  function getTrackingStreak() {
    const dates = new Set(state.transactions.map((tx) => tx.date).filter(isDateString));
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    while (dates.has(dateToISO(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function getLastSevenDays() {
    return Array.from({ length: 7 }, (_, offset) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - offset));
      return dateToISO(date);
    });
  }

  function shortDayLabel(dateString) {
    if (!isDateString(dateString)) return "--";
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-PH", { weekday: "short" });
  }

  function dateToISO(date) {
    const copy = new Date(date);
    copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
    return copy.toISOString().slice(0, 10);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, toNumber(value)));
  }

  function renderMoneyStory(transactions) {
    if (!els.moneyStory) return;
    const flow = getSavingsFlow(transactions);
    const hasSavingsWallet = state.accounts.some(isSavingsAccount);
    const noSavingsNote = "Add a Savings / Go Save wallet to track this.";

    els.moneyStory.innerHTML = [
      storyCard("Savings in", formatCurrency(flow.in), hasSavingsWallet ? "Money moved or received into Savings / Go Save this month" : noSavingsNote, "savings-in", "S+", 0),
      storyCard("Savings out", formatCurrency(flow.out), hasSavingsWallet ? "Withdrawals, spending, and fees from savings this month" : noSavingsNote, "savings-out", "S-", 1),
      storyCard("Savings net", formatCurrency(flow.net), hasSavingsWallet ? (flow.net >= 0 ? "Savings grew this month" : "Savings went down this month") : noSavingsNote, "savings-net", "NET", 2)
    ].join("");
  }

  function storyCard(label, value, note, className, icon, index) {
    return `
      <article class="story-card ${escapeHtml(className)}" style="--delay:${(index || 0) * 70}ms">
        <div class="stat-top">
          <div class="story-label">${escapeHtml(label)}</div>
          <div class="story-orb">${escapeHtml(icon)}</div>
        </div>
        <div class="story-value">${escapeHtml(value)}</div>
        <div class="story-note">${escapeHtml(note)}</div>
      </article>
    `;
  }

  function renderBalanceCards(balances) {
    if (!state.accounts.length) {
      els.balanceCards.innerHTML = `<p class="empty-state">No wallets yet. Add Cash, GoTyme, or your bank account.</p>`;
      return;
    }

    const maxBalance = Math.max(1, ...state.accounts.map((account) => Math.abs(toNumber(balances[account.id] || 0))));
    els.balanceCards.innerHTML = state.accounts
      .map((account, index) => {
        const balance = toNumber(balances[account.id] || 0);
        const width = Math.max(4, Math.min(100, Math.round((Math.abs(balance) / maxBalance) * 100)));
        return `
          <div class="balance-card ${walletKindClass(account)}" style="--delay:${index * 55}ms">
            <div class="wallet-avatar">${escapeHtml(walletAvatar(account))}</div>
            <div class="balance-main">
              <div class="balance-name">${escapeHtml(account.name)}</div>
              <div class="balance-type">${escapeHtml(account.type)}</div>
              <div class="wallet-meter" aria-hidden="true"><span style="--width:${width}%"></span></div>
            </div>
            <div class="balance-amount ${balance < 0 ? "amount-negative" : ""}">${escapeHtml(formatCurrency(balance))}</div>
          </div>
        `;
      })
      .join("");
  }

  function renderCategoryBreakdown(transactions) {
    const categoryTotals = new Map();
    transactions.forEach((tx) => {
      if (tx.type === "expense") {
        categoryTotals.set(tx.category || "Other", (categoryTotals.get(tx.category || "Other") || 0) + toNumber(tx.amount));
      }
      if (tx.type === "transfer" && toNumber(tx.fee) > 0) {
        categoryTotals.set("Fees", (categoryTotals.get("Fees") || 0) + toNumber(tx.fee));
      }
    });

    const rows = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1]);
    const total = rows.reduce((sum, row) => sum + row[1], 0);
    if (!rows.length) {
      els.categoryBreakdown.innerHTML = `<p>No spending recorded this month yet.</p>`;
      return;
    }

    els.categoryBreakdown.innerHTML = rows
      .slice(0, 8)
      .map(([category, amount], index) => {
        const pct = total ? Math.round((amount / total) * 100) : 0;
        return `
          <div class="category-row" style="--delay:${index * 55}ms">
            <div class="category-avatar">${escapeHtml(categoryAvatar(category))}</div>
            <div class="category-main">
              <div class="category-top">
                <span>${escapeHtml(category)}</span>
                <span>${escapeHtml(formatCurrency(amount))}</span>
              </div>
              <span class="category-pct">${pct}% of monthly spending</span>
              <div class="progress-track" aria-label="${escapeHtml(category)} is ${pct}% of monthly spending">
                <div class="progress-bar" style="--width:${pct}%"></div>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderRecentTransactions() {
    const recent = sortedTransactions(state.transactions).slice(0, 6);
    if (!recent.length) {
      els.recentTransactions.innerHTML = `<p>No transactions yet. Add your first payment, deposit, withdrawal, or transfer.</p>`;
      return;
    }
    els.recentTransactions.innerHTML = recent.map((tx, index) => transactionCard(tx, false, index)).join("");
  }

  function renderHistory() {
    const query = normalize(els.historySearch.value);
    const type = els.historyType.value;
    const month = els.historyMonth.value;

    const filtered = sortedTransactions(state.transactions).filter((tx) => {
      if (type !== "all" && tx.type !== type) return false;
      if (month && (!tx.date || !tx.date.startsWith(month))) return false;
      if (!query) return true;
      return normalize(transactionSearchText(tx)).includes(query);
    });

    if (!filtered.length) {
      els.historyList.innerHTML = `<p>No matching transactions.</p>`;
      return;
    }

    els.historyList.innerHTML = filtered.map((tx, index) => transactionCard(tx, true, index)).join("");
  }

  function transactionSearchText(tx) {
    return [
      tx.type,
      tx.date,
      tx.category,
      tx.method,
      tx.transferLabel,
      tx.payee,
      tx.notes,
      getAccountName(tx.accountId),
      getAccountName(tx.fromAccountId),
      getAccountName(tx.toAccountId)
    ].join(" ");
  }

  function transactionCard(tx, showActions, index) {
    const details = describeTransaction(tx);
    const editable = tx.type !== "adjustment";
    return `
      <article class="transaction-card tx-${escapeHtml(tx.type)}" style="--delay:${(index || 0) * 45}ms">
        <div class="tx-avatar">${escapeHtml(transactionAvatar(tx))}</div>
        <div class="transaction-content">
          <div class="transaction-title">${escapeHtml(details.title)}</div>
          <div class="transaction-meta">${escapeHtml(details.meta)}</div>
          ${details.note ? `<div class="transaction-meta">${escapeHtml(details.note)}</div>` : ""}
          <span class="tx-badge">${escapeHtml(details.badge)}</span>
        </div>
        <div class="transaction-amount ${details.className}">${escapeHtml(details.amount)}</div>
        ${showActions ? `
          <div class="transaction-actions">
            ${editable ? `<button class="icon-button" type="button" data-edit-tx="${escapeHtml(tx.id)}">Edit</button>` : ""}
            <button class="icon-button danger" type="button" data-delete-tx="${escapeHtml(tx.id)}">Delete</button>
          </div>
        ` : ""}
      </article>
    `;
  }

  function describeTransaction(tx) {
    const date = formatDate(tx.date);
    if (tx.type === "expense") {
      return {
        title: tx.payee || tx.category || "Expense",
        meta: `${date} - ${tx.category || "Other"} - ${tx.method || "Other"} - ${getAccountName(tx.accountId)}`,
        note: tx.notes || "",
        amount: `-${formatCurrency(tx.amount)}`,
        className: "amount-negative",
        badge: tx.method || "Expense"
      };
    }

    if (tx.type === "income") {
      return {
        title: tx.payee || "Money in",
        meta: `${date} - ${tx.method || "Money in"} - ${getAccountName(tx.accountId)}`,
        note: tx.notes || "",
        amount: `+${formatCurrency(tx.amount)}`,
        className: "amount-positive",
        badge: "Money in"
      };
    }

    if (tx.type === "transfer") {
      const feeText = tx.fee ? ` - fee ${formatCurrency(tx.fee)}` : "";
      return {
        title: tx.transferLabel || "Transfer",
        meta: `${date} - ${getAccountName(tx.fromAccountId)} to ${getAccountName(tx.toAccountId)}${feeText}`,
        note: tx.notes || tx.payee || "Moves your own money, so total balance changes only by fee.",
        amount: formatCurrency(tx.amount),
        className: "",
        badge: tx.transferLabel || "Transfer"
      };
    }

    return {
      title: tx.payee || "Balance correction",
      meta: `${date} - ${getAccountName(tx.accountId)}`,
      note: tx.notes || "Manual correction to match real balance.",
      amount: `${tx.amount >= 0 ? "+" : "-"}${formatCurrency(Math.abs(tx.amount))}`,
      className: tx.amount >= 0 ? "amount-positive" : "amount-negative",
      badge: "Correction"
    };
  }

  function renderAccounts() {
    const balances = getBalances();
    els.accountsList.innerHTML = state.accounts
      .map((account, index) => {
        const hasTransactions = state.transactions.some((tx) => [tx.accountId, tx.fromAccountId, tx.toAccountId].includes(account.id));
        const balance = toNumber(balances[account.id] || 0);
        return `
          <article class="account-card ${walletKindClass(account)}" style="--delay:${index * 60}ms">
            <div class="account-top">
              <div class="account-avatar">${escapeHtml(walletAvatar(account))}</div>
              <div class="account-main">
                <div class="account-name">${escapeHtml(account.name)}</div>
                <div class="account-meta">${escapeHtml(account.type)} - starting balance ${escapeHtml(formatCurrency(account.initialBalance))}</div>
              </div>
              <div class="account-balance ${balance < 0 ? "amount-negative" : ""}">${escapeHtml(formatCurrency(balance))}</div>
            </div>
            <form class="reconcile-form" data-reconcile-account="${escapeHtml(account.id)}">
              <label>
                Actual balance now
                <input name="actualBalance" type="number" step="0.01" inputmode="decimal" placeholder="${escapeHtml(numberForInput(balance))}" required />
              </label>
              <button class="ghost-button small" type="submit">Set actual balance</button>
            </form>
            <div class="hint">Use this when your real ${escapeHtml(account.name)} balance is different from the app.</div>
            ${!hasTransactions && state.accounts.length > 1 ? `<button class="icon-button danger" type="button" data-remove-account="${escapeHtml(account.id)}">Remove wallet</button>` : ""}
          </article>
        `;
      })
      .join("");
  }

  function saveTransactionFromForm(event) {
    event.preventDefault();
    if (!state.accounts.length) {
      showToast("Add at least one wallet first.");
      openTab("accounts");
      return;
    }

    const type = els.txType.value;
    const amount = Math.abs(toNumber(els.txAmount.value));
    if (!amount) {
      showToast("Enter an amount higher than zero.");
      els.txAmount.focus();
      return;
    }

    const date = els.txDate.value || todayISO();
    const editingId = els.editingId.value;
    const existing = state.transactions.find((tx) => tx.id === editingId);
    const base = {
      id: editingId || makeId("tx"),
      type,
      date,
      amount,
      fee: 0,
      category: els.txCategory.value || "Other",
      method: els.txMethod.value || "Other",
      transferLabel: els.txTransferLabel.value || "Transfer",
      payee: els.txPayee.value.trim(),
      notes: els.txNotes.value.trim(),
      accountId: "",
      fromAccountId: "",
      toAccountId: "",
      createdAt: existing?.createdAt || nowISO(),
      updatedAt: nowISO()
    };

    let tx;
    if (type === "expense") {
      tx = {
        ...base,
        accountId: els.txAccount.value,
        category: els.txCategory.value || "Other",
        method: els.txMethod.value || "Other"
      };
    } else if (type === "income") {
      tx = {
        ...base,
        accountId: els.txAccount.value,
        category: "Income",
        method: els.txMethod.value || "Money in"
      };
    } else {
      const from = els.txFromAccount.value;
      const to = els.txToAccount.value;
      if (!from || !to || from === to) {
        showToast("Choose two different wallets for a transfer.");
        return;
      }
      tx = {
        ...base,
        fromAccountId: from,
        toAccountId: to,
        fee: Math.abs(toNumber(els.txFee.value)),
        category: "Transfer",
        method: els.txTransferLabel.value || "Transfer",
        transferLabel: els.txTransferLabel.value || "Transfer"
      };
    }

    if (editingId) {
      state.transactions = state.transactions.map((item) => (item.id === editingId ? tx : item));
      showToast("Transaction updated.");
    } else {
      state.transactions.push(tx);
      showToast("Transaction saved.");
    }

    saveData();
    resetTransactionForm();
    renderAll();
    openTab("dashboard");
    celebrateMoneyMove();
  }

  function editTransaction(id) {
    const tx = state.transactions.find((item) => item.id === id);
    if (!tx || tx.type === "adjustment") return;

    openTab("add");
    els.editingId.value = tx.id;
    els.txType.value = tx.type;
    els.txDate.value = tx.date || todayISO();
    els.txAmount.value = numberForInput(tx.amount);
    els.txAccount.value = tx.accountId || state.accounts[0]?.id || "";
    els.txFromAccount.value = tx.fromAccountId || state.accounts[0]?.id || "";
    els.txToAccount.value = tx.toAccountId || state.accounts[1]?.id || state.accounts[0]?.id || "";
    els.txFee.value = tx.fee ? numberForInput(tx.fee) : "";
    els.txCategory.value = tx.category || "Other";
    els.txMethod.value = tx.method || "Other";
    els.txTransferLabel.value = tx.transferLabel || "Transfer";
    els.txPayee.value = tx.payee || "";
    els.txNotes.value = tx.notes || "";
    els.saveTransactionButton.textContent = "Update transaction";
    els.cancelEditButton.hidden = false;
    updateFormVisibility();
    showToast("Editing transaction.");
  }

  function deleteTransaction(id) {
    const tx = state.transactions.find((item) => item.id === id);
    if (!tx) return;
    const details = describeTransaction(tx);
    if (!confirm(`Delete this transaction?\n\n${details.title} - ${details.amount}`)) return;
    state.transactions = state.transactions.filter((item) => item.id !== id);
    saveData();
    renderAll();
    showToast("Transaction deleted.");
  }

  function resetTransactionForm() {
    els.transactionForm.reset();
    els.editingId.value = "";
    setDefaultDate();
    els.txType.value = "expense";
    els.txFee.value = "";
    els.saveTransactionButton.textContent = "Save transaction";
    els.cancelEditButton.hidden = true;
    renderAccountOptions();
    updateFormVisibility();
  }

  function addAccount(event) {
    event.preventDefault();
    const name = els.accountName.value.trim();
    if (!name) {
      showToast("Enter a wallet name.");
      return;
    }

    state.accounts.push({
      id: makeId("acct"),
      name,
      type: els.accountType.value || "Other",
      initialBalance: toNumber(els.accountBalance.value),
      createdAt: nowISO()
    });

    saveData();
    els.accountForm.reset();
    renderAll();
    showToast("Wallet added.");
  }

  function reconcileAccount(event) {
    event.preventDefault();
    const form = event.target.closest("[data-reconcile-account]");
    if (!form) return;
    const accountId = form.dataset.reconcileAccount;
    const account = state.accounts.find((item) => item.id === accountId);
    if (!account) return;

    const input = form.elements.actualBalance;
    const actual = toNumber(input.value);
    const current = getBalances()[accountId] || 0;
    const difference = roundMoney(actual - current);

    if (Math.abs(difference) < 0.005) {
      showToast("This wallet already matches the app balance.");
      input.value = "";
      return;
    }

    state.transactions.push({
      id: makeId("tx"),
      type: "adjustment",
      date: todayISO(),
      amount: difference,
      fee: 0,
      category: "Balance correction",
      method: "Manual count",
      transferLabel: "",
      payee: "Balance correction",
      notes: `Adjusted ${account.name} from ${formatCurrency(current)} to actual balance ${formatCurrency(actual)}. Difference: ${difference >= 0 ? "+" : "-"}${formatCurrency(Math.abs(difference))}.`,
      accountId,
      fromAccountId: "",
      toAccountId: "",
      createdAt: nowISO(),
      updatedAt: nowISO()
    });

    saveData();
    renderAll();
    showToast("Balance correction recorded.");
  }

  function removeAccount(accountId) {
    const account = state.accounts.find((item) => item.id === accountId);
    if (!account) return;
    const hasTransactions = state.transactions.some((tx) => [tx.accountId, tx.fromAccountId, tx.toAccountId].includes(accountId));
    if (hasTransactions) {
      showToast("You cannot remove a wallet that has transactions.");
      return;
    }
    if (!confirm(`Remove wallet "${account.name}"?`)) return;
    state.accounts = state.accounts.filter((item) => item.id !== accountId);
    saveData();
    renderAll();
    showToast("Wallet removed.");
  }

  function applyTemplate(template) {
    resetTransactionForm();
    openTab("add");

    if (template === "cash-expense") {
      els.txType.value = "expense";
      setSelectByText(els.txMethod, "Cash");
      selectAccountByName(els.txAccount, "Cash");
    }

    if (template === "gotyme-expense") {
      els.txType.value = "expense";
      setSelectByText(els.txMethod, "GoTyme");
      selectGoTymeAccount(els.txAccount) || selectFirstNonCash(els.txAccount);
    }

    if (template === "instapay-expense") {
      els.txType.value = "expense";
      setSelectByText(els.txMethod, "InstaPay");
      selectGoTymeAccount(els.txAccount) || selectFirstNonCash(els.txAccount);
    }

    if (template === "deposit-gotyme") {
      els.txType.value = "transfer";
      setSelectByText(els.txTransferLabel, "Deposit to GoTyme");
      selectAccountByName(els.txFromAccount, "Cash");
      selectGoTymeAccount(els.txToAccount);
    }

    if (template === "move-to-savings") {
      els.txType.value = "transfer";
      setSelectByText(els.txTransferLabel, "Move to savings");
      selectGoTymeAccount(els.txFromAccount) || selectAccountByName(els.txFromAccount, "Cash");
      if (!selectSavingsAccount(els.txToAccount)) {
        showToast("Add a Savings / Go Save wallet first.");
      }
      if (els.txFromAccount.value === els.txToAccount.value) {
        selectFirstNonSavings(els.txFromAccount);
      }
    }

    if (template === "use-savings") {
      els.txType.value = "transfer";
      setSelectByText(els.txTransferLabel, "Withdraw from savings");
      if (!selectSavingsAccount(els.txFromAccount)) {
        showToast("Add a Savings / Go Save wallet first.");
      }
      selectAccountByName(els.txToAccount, "Cash") || selectGoTymeAccount(els.txToAccount);
      if (els.txFromAccount.value === els.txToAccount.value) {
        selectFirstNonSavings(els.txToAccount);
      }
    }

    if (template === "withdraw-cash") {
      els.txType.value = "transfer";
      setSelectByText(els.txTransferLabel, "Withdraw cash");
      selectGoTymeAccount(els.txFromAccount) || selectFirstNonCash(els.txFromAccount);
      selectAccountByName(els.txToAccount, "Cash");
    }

    if (template === "transfer-money") {
      els.txType.value = "transfer";
      setSelectByText(els.txTransferLabel, "InstaPay transfer");
      selectGoTymeAccount(els.txFromAccount) || selectFirstNonCash(els.txFromAccount);
      const from = els.txFromAccount.value;
      const different = state.accounts.find((account) => account.id !== from);
      if (different) els.txToAccount.value = different.id;
    }

    updateFormVisibility();
    els.txAmount.focus();
  }

  function updateFormVisibility() {
    const type = els.txType.value;
    document.querySelectorAll(".field-expense, .field-income, .field-transfer").forEach((field) => {
      field.hidden = !field.classList.contains(`field-${type}`);
    });
  }

  function openTab(tabName) {
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === tabName);
    });
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === tabName);
    });
    if (tabName === "add") {
      window.setTimeout(() => els.txAmount.focus(), 50);
    }
  }

  function getBalances() {
    const balances = Object.fromEntries(state.accounts.map((account) => [account.id, roundMoney(account.initialBalance)]));
    state.transactions.forEach((tx) => {
      if (tx.type === "expense") {
        balances[tx.accountId] = roundMoney((balances[tx.accountId] || 0) - toNumber(tx.amount));
      }
      if (tx.type === "income") {
        balances[tx.accountId] = roundMoney((balances[tx.accountId] || 0) + toNumber(tx.amount));
      }
      if (tx.type === "transfer") {
        balances[tx.fromAccountId] = roundMoney((balances[tx.fromAccountId] || 0) - toNumber(tx.amount) - toNumber(tx.fee));
        balances[tx.toAccountId] = roundMoney((balances[tx.toAccountId] || 0) + toNumber(tx.amount));
      }
      if (tx.type === "adjustment") {
        balances[tx.accountId] = roundMoney((balances[tx.accountId] || 0) + toNumber(tx.amount));
      }
    });
    return balances;
  }

  function getSavingsFlow(transactions) {
    const savingsAccountIds = new Set(state.accounts.filter(isSavingsAccount).map((account) => account.id));
    const flow = transactions.reduce((totals, tx) => {
      const amount = toNumber(tx.amount);
      const fee = toNumber(tx.fee);
      const fromSavings = savingsAccountIds.has(tx.fromAccountId);
      const toSavings = savingsAccountIds.has(tx.toAccountId);
      const accountIsSavings = savingsAccountIds.has(tx.accountId);

      if (tx.type === "income" && accountIsSavings) {
        totals.in += amount;
      }

      if (tx.type === "expense" && accountIsSavings) {
        totals.out += amount;
      }

      if (tx.type === "transfer") {
        if (toSavings && !fromSavings) totals.in += amount;
        if (fromSavings && !toSavings) totals.out += amount;
        if (fromSavings && fee) totals.out += fee;
      }

      return totals;
    }, { in: 0, out: 0 });

    return {
      in: roundMoney(flow.in),
      out: roundMoney(flow.out),
      net: roundMoney(flow.in - flow.out)
    };
  }

  function sumExpenseLike(transactions) {
    return transactions.reduce((sum, tx) => {
      if (tx.type === "expense") return sum + toNumber(tx.amount);
      if (tx.type === "transfer") return sum + toNumber(tx.fee);
      return sum;
    }, 0);
  }

  function sortedTransactions(transactions) {
    return [...transactions].sort((a, b) => {
      const dateCompare = String(b.date || "").localeCompare(String(a.date || ""));
      if (dateCompare !== 0) return dateCompare;
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });
  }

  function exportJson() {
    saveData();
    downloadBlob(
      new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }),
      `money-tracker-ph-backup-${todayISO()}.json`
    );
    showToast("Backup downloaded.");
  }

  function exportCsv() {
    const rows = [[
      "Date",
      "Type",
      "Amount",
      "Fee",
      "Account",
      "From account",
      "To account",
      "Category or label",
      "Method",
      "Store/person/source",
      "Notes",
      "Created at"
    ]];

    sortedTransactions(state.transactions).reverse().forEach((tx) => {
      rows.push([
        tx.date,
        tx.type,
        tx.amount,
        tx.fee || "",
        getAccountName(tx.accountId),
        getAccountName(tx.fromAccountId),
        getAccountName(tx.toAccountId),
        tx.type === "transfer" ? tx.transferLabel : tx.category,
        tx.method,
        tx.payee,
        tx.notes,
        tx.createdAt
      ]);
    });

    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `money-tracker-ph-${todayISO()}.csv`);
    showToast("CSV downloaded.");
  }

  function importJson(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = sanitizeData(JSON.parse(String(reader.result || "{}")));
        const ok = confirm(
          `Restore this backup?\n\nWallets: ${imported.accounts.length}\nTransactions: ${imported.transactions.length}\n\nThis will replace the data currently saved on this device.`
        );
        if (!ok) return;
        state = imported;
        saveData();
        resetTransactionForm();
        renderAll();
        openTab("dashboard");
        showToast("Backup restored.");
      } catch (error) {
        console.error(error);
        showToast("That file is not a valid backup JSON.");
      } finally {
        els.importFile.value = "";
      }
    };
    reader.readAsText(file);
  }

  function resetAllData() {
    const answer = prompt('Type RESET to delete all wallets and transactions on this device.');
    if (answer !== "RESET") return;
    state = { app: "Money Tracker PH", version: 1, accounts: makeDefaultAccounts(), categories: [...DEFAULT_CATEGORIES], transactions: [] };
    saveData();
    resetTransactionForm();
    renderAll();
    openTab("dashboard");
    showToast("All data reset.");
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function setupInstallPrompt() {
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      els.installButton.hidden = false;
    });

    els.installButton.addEventListener("click", async () => {
      if (!deferredInstallPrompt) {
        showToast("Use your browser menu, then choose Add to Home Screen or Install.");
        return;
      }
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      els.installButton.hidden = true;
    });
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("service-worker.js").catch((error) => {
        console.warn("Service worker registration failed", error);
      });
    }
  }

  function setDefaultDate() {
    els.txDate.value = todayISO();
  }

  function getAccountName(id) {
    if (!id) return "";
    return state.accounts.find((account) => account.id === id)?.name || "Unknown wallet";
  }

  function selectAccountByName(select, name) {
    const account = state.accounts.find((item) => normalize(item.name).includes(normalize(name)));
    if (account) {
      select.value = account.id;
      return true;
    }
    return false;
  }

  function selectFirstNonCash(select) {
    const account = state.accounts.find((item) => !normalize(item.name).includes("cash"));
    if (account) {
      select.value = account.id;
      return true;
    }
    return false;
  }

  function setSelectByText(select, text) {
    const option = [...select.options].find((item) => item.textContent === text || item.value === text);
    if (option) select.value = option.value;
  }

  function selectGoTymeAccount(select) {
    const account = state.accounts.find(isGoTymeAccount);
    if (account) {
      select.value = account.id;
      return true;
    }
    return false;
  }

  function selectSavingsAccount(select) {
    const account = state.accounts.find(isSavingsAccount);
    if (account) {
      select.value = account.id;
      return true;
    }
    return false;
  }

  function selectFirstNonSavings(select) {
    const account = state.accounts.find((item) => !isSavingsAccount(item));
    if (account) {
      select.value = account.id;
      return true;
    }
    return false;
  }

  function isGoTymeAccount(account) {
    const text = normalize(`${account?.name || ""} ${account?.type || ""}`);
    return text.includes("gotyme") || text.includes("go tyme");
  }

  function isSavingsAccount(account) {
    const text = normalize(`${account?.name || ""} ${account?.type || ""}`);
    return text.includes("savings") || text.includes("save") || text.includes("goal") || text.includes("emergency");
  }

  function walletKindClass(account) {
    return [
      isGoTymeAccount(account) ? "is-gotyme" : "",
      isSavingsAccount(account) ? "is-savings" : ""
    ].filter(Boolean).join(" ");
  }

  function getSavingsBalance(balances) {
    return state.accounts
      .filter(isSavingsAccount)
      .reduce((sum, account) => sum + toNumber(balances[account.id] || 0), 0);
  }

  function walletAvatar(account) {
    if (isSavingsAccount(account)) return "SV";
    if (isGoTymeAccount(account)) return "GT";
    const text = String(account?.name || account?.type || "W").replace(/[^a-z0-9 ]/gi, " ").trim();
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
    return text.slice(0, 2).toUpperCase() || "W";
  }

  function transactionAvatar(tx) {
    if (tx.type === "expense") return "OUT";
    if (tx.type === "income") return "IN";
    if (tx.type === "transfer") return "TF";
    return "ADJ";
  }

  function categoryAvatar(category) {
    const name = normalize(category);
    if (name.includes("food")) return "FD";
    if (name.includes("grocery")) return "GR";
    if (name.includes("transport")) return "TR";
    if (name.includes("bill")) return "BL";
    if (name.includes("load") || name.includes("data")) return "LD";
    if (name.includes("shop")) return "SH";
    if (name.includes("saving")) return "SV";
    if (name.includes("fee")) return "FE";
    const clean = String(category || "Other").replace(/[^a-z0-9]/gi, "").toUpperCase();
    return clean.slice(0, 2) || "OT";
  }

  function monthLabel(yyyyMm) {
    const [year, month] = yyyyMm.split("-").map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString("en-PH", { month: "long", year: "numeric" });
  }

  function formatDate(dateString) {
    if (!isDateString(dateString)) return "No date";
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(toNumber(value));
  }

  function numberForInput(value) {
    return String(roundMoney(value).toFixed(2));
  }

  function currentMonth() {
    return todayISO().slice(0, 7);
  }

  function todayISO() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 10);
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function isDateString(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
  }

  function makeId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function toNumber(value) {
    const number = Number.parseFloat(String(value ?? "").replace(/,/g, ""));
    return Number.isFinite(number) ? number : 0;
  }

  function roundMoney(value) {
    return Math.round(toNumber(value) * 100) / 100;
  }

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function csvEscape(value) {
    const stringValue = String(value ?? "");
    if (/[,"\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  function celebrateMoneyMove() {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const originX = Math.min(window.innerWidth - 64, Math.max(64, window.innerWidth * 0.78));
    const originY = Math.min(window.innerHeight - 120, Math.max(120, window.innerHeight * 0.22));
    for (let i = 0; i < 18; i += 1) {
      const burst = document.createElement("span");
      burst.className = "burst";
      burst.style.setProperty("--x", `${originX}px`);
      burst.style.setProperty("--y", `${originY}px`);
      burst.style.setProperty("--r", `${i * 20}deg`);
      burst.style.setProperty("--d", `${70 + Math.random() * 80}px`);
      burst.style.background = i % 3 === 0 ? "var(--lime)" : i % 3 === 1 ? "var(--aqua)" : "var(--yellow)";
      document.body.appendChild(burst);
      window.setTimeout(() => burst.remove(), 820);
    }
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add("show");
    toastTimer = window.setTimeout(() => {
      els.toast.classList.remove("show");
    }, 2600);
  }
})();
