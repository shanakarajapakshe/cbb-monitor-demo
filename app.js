const state = { accounts: [], overview: null, history: [], user: null, users: [] };
const palette = ["#0f766e", "#255f85", "#8a4b12", "#5f5aa2", "#3f6b2a", "#8a3251", "#58707a"];

const money = (value, currency = "LKR") => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return `${currency} ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const shortDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
};

async function fetchJson(url, options = {}) {
  if (!window.demoFetchJson) throw new Error("Demo data is not loaded.");
  return window.demoFetchJson(url, options);
}

function showLogin(message = "") {
  document.body.classList.remove("authenticated", "is-superadmin");
  document.querySelector("#loginStatus").textContent = message;
  setTimeout(() => document.querySelector("#loginUsername")?.focus(), 50);
}

function showApp(user) {
  state.user = user;
  document.body.classList.add("authenticated");
  document.body.classList.toggle("is-superadmin", user?.role === "superadmin");
  document.querySelector("#currentUser").textContent = user ? `${user.username} (${user.role})` : "";
  document.querySelector("#loginPassword").value = "";
  document.querySelector("#loginStatus").textContent = "";
}

function aggregate(rows, keyFn, valueFn) {
  const grouped = new Map();
  rows.forEach((row) => {
    const key = keyFn(row);
    grouped.set(key, (grouped.get(key) || 0) + valueFn(row));
  });
  return [...grouped.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function renderBarChart(target, rows, options = {}) {
  const el = document.querySelector(target);
  const data = rows.filter((row) => row.value > 0).slice(0, options.limit || 8);
  if (!data.length) {
    el.innerHTML = `<div class="empty-chart">${options.empty || "No chart data yet."}</div>`;
    return;
  }
  const max = Math.max(...data.map((row) => row.value)) || 1;
  el.innerHTML = `<div class="bar-list">${data.map((row, index) => {
    const width = Math.max(5, (row.value / max) * 100);
    const value = options.format ? options.format(row.value) : row.value.toLocaleString();
    return `<div class="bar-row">
      <div class="bar-label" title="${row.label}">${row.label}</div>
      <div class="bar-track"><span style="width:${width}%;background:${palette[index % palette.length]}"></span></div>
      <div class="bar-value">${value}</div>
    </div>`;
  }).join("")}</div>`;
}

function renderDonutChart(target, rows) {
  const el = document.querySelector(target);
  const data = rows.filter((row) => row.value > 0);
  if (!data.length) {
    el.innerHTML = `<div class="empty-chart">No currency data.</div>`;
    return;
  }
  const total = data.reduce((sum, row) => sum + row.value, 0);
  let offset = 25;
  const circles = data.map((row, index) => {
    const dash = (row.value / total) * 100;
    const circle = `<circle r="36" cx="50" cy="50" fill="transparent" stroke="${palette[index % palette.length]}" stroke-width="16" stroke-dasharray="${dash} ${100 - dash}" stroke-dashoffset="-${offset}" />`;
    offset += dash;
    return circle;
  }).join("");
  const legend = data.map((row, index) => `<span><i style="background:${palette[index % palette.length]}"></i>${row.label}: ${row.value}</span>`).join("");
  el.innerHTML = `<div class="donut-wrap"><svg viewBox="0 0 100 100">${circles}<text x="50" y="54" text-anchor="middle">${total}</text></svg><div class="legend">${legend}</div></div>`;
}


function accountPurpose(row) {
  const text = `${row.bank || ""} ${row.account_type || ""} ${row.account_number || ""}`.toLowerCase();
  if (text.includes("money market") || text.includes("building fund") || text.includes("lotus hub") || text.includes("welfare") || text.includes("(mm)")) return "special";
  return "operational";
}

function latestChartRows() {
  const purpose = document.querySelector("#purposeToggle")?.value || "all";
  const group = document.querySelector("#chartGroupSelect")?.value || "";
  return (state.overview?.rows || []).filter((row) => {
    const hasBalance = row.latest_balance !== null && row.latest_balance !== undefined;
    if (!hasBalance) return false;
    if (purpose !== "all" && accountPurpose(row) !== purpose) return false;
    if (group && row.group !== group) return false;
    return true;
  });
}

function renderShareDonut(target, rows, options = {}) {
  const el = document.querySelector(target);
  const data = rows.filter((row) => row.value > 0).slice(0, options.limit || 8);
  if (!data.length) {
    el.innerHTML = `<div class="empty-chart">${options.empty || "No balance data yet."}</div>`;
    return;
  }
  const total = data.reduce((sum, row) => sum + row.value, 0) || 1;
  const max = Math.max(...data.map((row) => row.value)) || 1;
  el.innerHTML = `<div class="share-list">${data.map((row, index) => {
    const share = (row.value / total) * 100;
    const width = Math.max(4, (row.value / max) * 100);
    return `<div class="share-row">
      <div class="share-top"><strong title="${row.label}">${row.label}</strong><span>${share.toFixed(1)}%</span></div>
      <div class="share-track"><span style="width:${width}%;background:${palette[index % palette.length]}"></span></div>
      <small>${money(row.value, options.currency || "LKR")}</small>
    </div>`;
  }).join("")}</div>`;
}

function lineSeriesChart(target, rows, options = {}) {
  const el = document.querySelector(target);
  const seriesMap = new Map();
  rows.forEach((row) => {
    if (!row.date || row.value === null || row.value === undefined) return;
    const label = row.series || "Balance";
    seriesMap.set(label, [...(seriesMap.get(label) || []), { date: row.date, value: Number(row.value) }]);
  });
  const series = [...seriesMap.entries()].map(([label, points]) => ({ label, points: points.sort((a, b) => new Date(a.date) - new Date(b.date)) })).filter((item) => item.points.length > 0).slice(0, 6);
  const pointCount = series.reduce((sum, item) => sum + item.points.length, 0);
  if (!series.length || pointCount < 2) {
    el.innerHTML = `<p>${options.empty || "Not enough history yet for this trend."}</p>`;
    return;
  }
  const width = 920;
  const height = 320;
  const pad = { top: 28, right: 28, bottom: 46, left: 88 };
  const allPoints = series.flatMap((item) => item.points);
  const values = allPoints.map((point) => point.value);
  const dates = allPoints.map((point) => new Date(point.date).getTime());
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const dateSpread = maxDate - minDate || 1;
  const x = (time) => pad.left + ((time - minDate) / dateSpread) * (width - pad.left - pad.right);
  const y = (value) => height - pad.bottom - ((value - min) / spread) * (height - pad.top - pad.bottom);
  const paths = series.map((item, index) => {
    const color = palette[index % palette.length];
    const d = item.points.map((point, i) => `${i === 0 ? "M" : "L"} ${x(new Date(point.date).getTime()).toFixed(1)} ${y(point.value).toFixed(1)}`).join(" ");
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="3.2" stroke-linecap="round" />`;
  }).join("");
  const startDate = new Date(minDate).toLocaleDateString(undefined, { month: "short", day: "2-digit" });
  const endDate = new Date(maxDate).toLocaleDateString(undefined, { month: "short", day: "2-digit" });
  const legend = series.map((item, index) => `<span><i style="background:${palette[index % palette.length]}"></i>${item.label}</span>`).join("");
  el.innerHTML = `<svg viewBox="0 0 ${width} ${height}" aria-hidden="true">
    <line x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}" stroke="#cfd6cf" />
    <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}" stroke="#cfd6cf" />
    <text x="${pad.left}" y="18" fill="#6a746f" font-size="12">${money(max)}</text>
    <text x="${pad.left}" y="${height - 12}" fill="#6a746f" font-size="12">${money(min)}</text>
    <text x="${pad.left}" y="${height - 4}" fill="#6a746f" font-size="11">${startDate}</text>
    <text x="${width - pad.right - 54}" y="${height - 4}" fill="#6a746f" font-size="11">${endDate}</text>
    ${paths}
  </svg><div class="legend line-legend">${legend}</div>`;
}

function stackedAreaChart(target, rows) {
  const el = document.querySelector(target);
  const dates = [...new Set(rows.map((row) => row.date))].sort();
  const banks = [...new Set(rows.map((row) => row.series))].sort();
  if (dates.length < 2 || banks.length < 2) {
    el.innerHTML = `<p>Not enough bank history yet for stacked trend.</p>`;
    return;
  }
  const byDateBank = new Map(rows.map((row) => [`${row.date}|${row.series}`, Number(row.value || 0)]));
  const width = 900;
  const height = 300;
  const pad = { top: 18, right: 24, bottom: 36, left: 70 };
  const totals = dates.map((date) => banks.reduce((sum, bank) => sum + (byDateBank.get(`${date}|${bank}`) || 0), 0));
  const maxTotal = Math.max(...totals) || 1;
  const x = (i) => pad.left + (i / Math.max(1, dates.length - 1)) * (width - pad.left - pad.right);
  const y = (value) => height - pad.bottom - (value / maxTotal) * (height - pad.top - pad.bottom);
  const cumulative = dates.map(() => 0);
  const areas = banks.map((bank, bankIndex) => {
    const lower = cumulative.slice();
    const upper = dates.map((date, i) => {
      cumulative[i] += byDateBank.get(`${date}|${bank}`) || 0;
      return cumulative[i];
    });
    const top = upper.map((value, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(value).toFixed(1)}`).join(" ");
    const bottom = lower.slice().reverse().map((value, ri) => {
      const i = lower.length - 1 - ri;
      return `L ${x(i).toFixed(1)} ${y(value).toFixed(1)}`;
    }).join(" ");
    return `<path d="${top} ${bottom} Z" fill="${palette[bankIndex % palette.length]}" opacity="0.72"><title>${bank}</title></path>`;
  }).join("");
  const legend = banks.slice(0, 6).map((bank, index) => `<span><i style="background:${palette[index % palette.length]}"></i>${bank}</span>`).join("");
  el.innerHTML = `<svg viewBox="0 0 ${width} ${height}" aria-hidden="true"><line x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}" stroke="#cfd6cf" /><line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}" stroke="#cfd6cf" /><text x="${pad.left}" y="15" fill="#6a746f" font-size="12">${money(maxTotal)}</text>${areas}</svg><div class="legend area-legend">${legend}</div>`;
}
function renderFreshnessChart(rows) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const categories = { Updated: 0, Stale: 0, Missing: 0 };
  rows.forEach((row) => {
    if (!row.statement_date) {
      categories.Missing += 1;
      return;
    }
    const statementDate = new Date(row.statement_date);
    statementDate.setHours(0, 0, 0, 0);
    const ageDays = Math.floor((today - statementDate) / 86400000);
    categories[ageDays <= 1 ? "Updated" : "Stale"] += 1;
  });
  renderBarChart("#freshnessChart", Object.entries(categories).map(([label, value]) => ({ label, value })), { empty: "No accounts configured." });
}

function renderInsightCharts(data) {
  const rows = latestChartRows();
  const lkrRows = rows.filter((row) => row.currency === "LKR");
  const groupCash = aggregate(lkrRows, (row) => row.group, (row) => Number(row.latest_balance || 0));
  const companyCash = aggregate(lkrRows, (row) => row.company, (row) => Number(row.latest_balance || 0));
  const bankCash = aggregate(lkrRows, (row) => row.bank, (row) => Number(row.latest_balance || 0));
  const purposeCash = aggregate(lkrRows, (row) => accountPurpose(row) === "special" ? "Money Market / Special Funds" : "Operational", (row) => Number(row.latest_balance || 0));
  const foreignCash = aggregate(rows.filter((row) => row.currency !== "LKR"), (row) => row.currency, (row) => Number(row.latest_balance || 0));

  renderShareDonut("#groupDistributionChart", groupCash, { empty: "No LKR group balances yet." });
  renderBarChart("#companyBreakdownChart", companyCash, { limit: 8, format: (value) => money(value), empty: "No company balance data for this filter." });
  renderShareDonut("#bankExposureChart", bankCash, { limit: 8, empty: "No bank exposure data yet." });
  renderBarChart("#foreignCurrencyChart", foreignCash, { limit: 4, format: (value) => value.toLocaleString(undefined, { maximumFractionDigits: 2 }), empty: "No USD/GBP balances entered yet." });
  renderShareDonut("#purposeChart", purposeCash, { empty: "No purpose split yet." });
}

function populateChartControls() {
  const groups = [...new Set(state.accounts.map((account) => account.group))].sort();
  const chartGroup = document.querySelector("#chartGroupSelect");
  const selectedChartGroup = chartGroup.value;
  chartGroup.innerHTML = `<option value="">All groups</option>${groups.map((group) => `<option value="${group}">${group}</option>`).join("")}`;
  chartGroup.value = groups.includes(selectedChartGroup) ? selectedChartGroup : "";

  const trendGroup = document.querySelector("#trendGroupSelect");
  const selectedTrendGroup = trendGroup.value;
  trendGroup.innerHTML = `<option value="">All groups</option>${groups.map((group) => `<option value="${group}">${group}</option>`).join("")}`;
  trendGroup.value = groups.includes(selectedTrendGroup) ? selectedTrendGroup : "";
  populateTrendCompanyAccountFilters();
}

function populateTrendCompanyAccountFilters() {
  const group = document.querySelector("#trendGroupSelect").value;
  const companySelect = document.querySelector("#trendCompanySelect");
  const accountSelect = document.querySelector("#trendAccountSelect");
  const companies = [...new Set(state.accounts.filter((account) => !group || account.group === group).map((account) => account.company))].sort();
  const selectedCompany = companySelect.value;
  companySelect.innerHTML = `<option value="">All companies</option>${companies.map((company) => `<option value="${company}">${company}</option>`).join("")}`;
  companySelect.value = companies.includes(selectedCompany) ? selectedCompany : "";
  const company = companySelect.value;
  const accounts = state.accounts.filter((account) => (!group || account.group === group) && (!company || account.company === company));
  const selectedAccount = accountSelect.value;
  accountSelect.innerHTML = `<option value="">All accounts</option>${accounts.map((account) => `<option value="${account.id}">${account.bank} - ${account.account_number}</option>`).join("")}`;
  accountSelect.value = accounts.some((account) => String(account.id) === selectedAccount) ? selectedAccount : "";
}

function renderTrendCharts() {
  const historyRows = state.history || [];
  const groupTrendRows = aggregateTrend(historyRows, (row) => row.group);
  lineSeriesChart("#groupTrendChart", groupTrendRows, { empty: "Not enough group history yet. Add daily balances over several days." });

  const group = document.querySelector("#trendGroupSelect").value;
  const company = document.querySelector("#trendCompanySelect").value;
  const accountId = document.querySelector("#trendAccountSelect").value;
  const filtered = historyRows.filter((row) => (!group || row.group === group) && (!company || row.company === company) && (!accountId || String(row.account_id) === accountId));
  const deepSeries = accountId
    ? filtered.map((row) => ({ date: row.date, series: `${row.bank} - ${row.account_number}`, value: row.closing_balance }))
    : aggregateTrend(filtered, (row) => company ? row.account_number : row.company || row.group);
  lineSeriesChart("#deepDiveTrendChart", deepSeries, { empty: "Select a group/company/account or add more balance history." });

  const bankTrendRows = aggregateTrend(historyRows, (row) => row.bank);
  stackedAreaChart("#bankTrendChart", bankTrendRows);
}

function aggregateTrend(rows, seriesFn) {
  const grouped = new Map();
  rows.forEach((row) => {
    const key = `${row.date}|${seriesFn(row)}`;
    const current = grouped.get(key) || { date: row.date, series: seriesFn(row), value: 0 };
    current.value += Number(row.closing_balance || 0);
    grouped.set(key, current);
  });
  return [...grouped.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
}
function renderOverview(data) {
  const highest = data.highest_balance;
  document.querySelector("#totalCash").textContent = money(data.total_cash, data.currency);
  document.querySelector("#activeAccounts").textContent = `${data.active_accounts}/${data.account_count}`;
  document.querySelector("#staleAccounts").textContent = data.stale_accounts;
  document.querySelector("#missingAccounts").textContent = data.missing_accounts;
  document.querySelector("#bankCoverage").textContent = data.bank_count;
  document.querySelector("#highestBalance").textContent = highest ? money(highest.latest_balance, highest.currency) : "-";
  document.querySelector("#highestBalanceMeta").textContent = highest ? `${highest.bank} | ${highest.account_number}` : "No LKR balance yet";
  document.querySelector("#freshness").textContent = `Refreshed ${new Date().toLocaleTimeString()}`;
  document.querySelector("#statusText").textContent = `${data.rows.length} configured account(s)`;
  const rows = data.rows.map((row) => `
    <tr>
      <td><span class="badge">${row.group}</span></td>
      <td class="company">${row.company}</td>
      <td>${row.bank}</td>
      <td>${row.account_number}</td>
      <td>${row.account_type}</td>
      <td class="amount">${money(row.latest_balance, row.currency)}</td>
      <td>${shortDate(row.statement_date)}</td>
      <td>${row.last_updated ? new Date(row.last_updated).toLocaleString() : "-"}</td>
    </tr>`);
  document.querySelector("#balanceRows").innerHTML = rows.join("") || `<tr><td colspan="8">No accounts configured.</td></tr>`;
  const cards = data.rows.map((row) => `
    <article class="balance-card">
      <div class="balance-card-top">
        <span class="badge">${row.group}</span>
        <strong>${money(row.latest_balance, row.currency)}</strong>
      </div>
      <h3>${row.company}</h3>
      <dl>
        <div><dt>Bank</dt><dd>${row.bank}</dd></div>
        <div><dt>Account</dt><dd>${row.account_number}</dd></div>
        <div><dt>Type</dt><dd>${row.account_type}</dd></div>
        <div><dt>Date</dt><dd>${shortDate(row.statement_date)}</dd></div>
      </dl>
    </article>`);
  document.querySelector("#balanceCards").innerHTML = cards.join("") || `<div class="empty-chart">No accounts configured.</div>`;
  renderInsightCharts(data);
}

function populateGroupFilter() {
  const selected = document.querySelector("#groupFilter").value;
  const groups = [...new Set(state.accounts.map((account) => account.group))].sort();
  document.querySelector("#groupFilter").innerHTML = `<option value="">All groups</option>${groups.map((group) => `<option value="${group}">${group}</option>`).join("")}`;
  document.querySelector("#groupFilter").value = groups.includes(selected) ? selected : "";
}

function populateAccountFilters() {
  const trend = document.querySelector("#accountFilter");
  const upload = document.querySelector("#uploadAccount");
  const balance = document.querySelector("#balanceAccount");
  const options = state.accounts.map((a) => `<option value="${a.id}">${a.label}</option>`).join("");
  trend.innerHTML = `<option value="">All accounts</option>${options}`;
  upload.innerHTML = `<option value="">Auto-detect account</option>${options}`;
  balance.innerHTML = options;
  document.querySelector("#balanceDate").valueAsDate = new Date();
}

function groupByAccount(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    const key = `${row.company} | ${row.bank} | ${row.account_number}`;
    grouped.set(key, [...(grouped.get(key) || []), row]);
  });
  return grouped;
}

function renderChart(rows) {
  const chart = document.querySelector("#chart");
  if (!rows.length) {
    chart.innerHTML = `<p>No history available for the selected period.</p>`;
    return;
  }
  const width = 900;
  const height = 320;
  const pad = { top: 24, right: 22, bottom: 42, left: 78 };
  const values = rows.map((row) => row.closing_balance);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;
  const dates = rows.map((row) => new Date(row.date).getTime());
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const dateSpread = maxDate - minDate || 1;
  const x = (time) => pad.left + ((time - minDate) / dateSpread) * (width - pad.left - pad.right);
  const y = (value) => height - pad.bottom - ((value - min) / spread) * (height - pad.top - pad.bottom);
  const grouped = groupByAccount(rows);
  let paths = "";
  let index = 0;
  grouped.forEach((items, account) => {
    const sorted = items.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    const color = palette[index % palette.length];
    const d = sorted.map((row, i) => `${i === 0 ? "M" : "L"} ${x(new Date(row.date).getTime()).toFixed(1)} ${y(row.closing_balance).toFixed(1)}`).join(" ");
    paths += `<path d="${d}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" />`;
    paths += sorted.map((row) => `<circle cx="${x(new Date(row.date).getTime()).toFixed(1)}" cy="${y(row.closing_balance).toFixed(1)}" r="4" fill="${color}"><title>${account}: ${money(row.closing_balance)}</title></circle>`).join("");
    index += 1;
  });
  chart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" aria-hidden="true">
      <line x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}" stroke="#cfd6cf" />
      <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}" stroke="#cfd6cf" />
      <text x="${pad.left}" y="18" fill="#6a746f" font-size="12">${money(max)}</text>
      <text x="${pad.left}" y="${height - 10}" fill="#6a746f" font-size="12">${money(min)}</text>
      ${paths}
    </svg>`;
}

async function loadHistory() {
  const accountId = document.querySelector("#accountFilter").value;
  const days = document.querySelector("#trendDaysSelect")?.value || "30";
  const history = await fetchJson(`/api/history?days=${days}`);
  state.history = history.rows;
  const actionRows = accountId ? history.rows.filter((row) => String(row.account_id) === accountId) : history.rows;
  renderChart(actionRows);
  renderTrendCharts();
}

async function refreshAll(options = {}) {
  const statusText = document.querySelector("#statusText");
  statusText.textContent = options.skipMailSync ? "Refreshing..." : "Checking mail...";
  if (!options.skipMailSync) {
    try {
      const sync = await fetchJson("/api/sync-mail", { method: "POST" });
      statusText.textContent = `Mail checked: ${sync.processed} attachment(s). Loading dashboard...`;
    } catch (error) {
      statusText.textContent = `${error.message} Loading saved dashboard data...`;
    }
  }
  state.accounts = await fetchJson("/api/accounts");
  populateGroupFilter();
  populateChartControls();
  const group = document.querySelector("#groupFilter").value;
  state.overview = await fetchJson(group ? `/api/overview?group=${encodeURIComponent(group)}` : "/api/overview");
  populateAccountFilters();
  renderOverview(state.overview);
  await loadHistory();
}

async function uploadStatement(event) {
  event.preventDefault();
  const file = document.querySelector("#pdfFile").files[0];
  const accountId = document.querySelector("#uploadAccount").value;
  const status = document.querySelector("#uploadStatus");
  if (!file) {
    status.textContent = "Select a PDF first.";
    return;
  }
  const formData = new FormData();
  formData.append("file", file);
  if (accountId) formData.append("account_id", accountId);
  status.textContent = "Parsing PDF...";
  try {
    const result = await fetchJson("/api/upload", { method: "POST", body: formData });
    status.textContent = `${result.message} ${money(result.closing_balance)} saved.`;
    await refreshAll();
  } catch (error) {
    status.textContent = error.message;
  }
}

async function saveManualBalance(event) {
  event.preventDefault();
  const accountId = document.querySelector("#balanceAccount").value;
  const statementDate = document.querySelector("#balanceDate").value;
  const amount = document.querySelector("#balanceAmount").value;
  const status = document.querySelector("#balanceStatus");
  if (!accountId || !statementDate || !amount) {
    status.textContent = "Select account, date, and amount.";
    return;
  }
  const formData = new FormData();
  formData.append("account_id", accountId);
  formData.append("statement_date", statementDate);
  formData.append("closing_balance", amount);
  status.textContent = "Saving balance...";
  try {
    const result = await fetchJson("/api/manual-balance", { method: "POST", body: formData });
    status.textContent = `${result.message} ${money(result.closing_balance)} saved.`;
    document.querySelector("#balanceAmount").value = "";
    await refreshAll();
  } catch (error) {
    status.textContent = error.message;
  }
}
function setupBottomNav() {
  const navItems = [...document.querySelectorAll(".bottom-nav-item")];
  const sections = navItems
    .map((item) => document.getElementById(item.dataset.target))
    .filter(Boolean);

  const activateView = (targetId) => {
    sections.forEach((section) => section.classList.toggle("mobile-active", section.id === targetId));
    navItems.forEach((item) => item.classList.toggle("active", item.dataset.target === targetId));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  navItems.forEach((item) => {
    item.addEventListener("click", (event) => {
      event.preventDefault();
      activateView(item.dataset.target);
    });
  });

  const hashTarget = window.location.hash ? window.location.hash.slice(1) : "";
  activateView(sections.some((section) => section.id === hashTarget) ? hashTarget : "overviewSection");
}

function setPreviewMode(mode) {
  const isMobile = mode === "mobile";
  document.body.classList.toggle("preview-mobile", isMobile);
  document.querySelector("#desktopViewBtn")?.classList.toggle("active", !isMobile);
  document.querySelector("#mobileViewBtn")?.classList.toggle("active", isMobile);
  document.querySelector("#desktopViewBtn")?.setAttribute("aria-pressed", String(!isMobile));
  document.querySelector("#mobileViewBtn")?.setAttribute("aria-pressed", String(isMobile));
  localStorage.setItem("demoPreviewMode", isMobile ? "mobile" : "desktop");
  if (isMobile && !document.querySelector(".shell > section.mobile-active")) {
    document.querySelector("#overviewSection")?.classList.add("mobile-active");
    document.querySelector('[data-target="overviewSection"]')?.classList.add("active");
  }
}

function setupPreviewToggle() {
  const savedMode = localStorage.getItem("demoPreviewMode") || "desktop";
  setPreviewMode(savedMode === "mobile" ? "mobile" : "desktop");
  document.querySelector("#desktopViewBtn")?.addEventListener("click", () => setPreviewMode("desktop"));
  document.querySelector("#mobileViewBtn")?.addEventListener("click", () => setPreviewMode("mobile"));
}
async function loadUsers() {
  if (state.user?.role !== "superadmin") return;
  const status = document.querySelector("#userListStatus");
  status.textContent = "Loading users...";
  state.users = await fetchJson("/api/admin/users");
  renderUsers();
  status.textContent = `${state.users.length} user(s)`;
}

function clearUserForm() {
  document.querySelector("#userId").value = "";
  document.querySelector("#userUsername").value = "";
  document.querySelector("#userPassword").value = "";
  document.querySelector("#userRole").value = "viewer";
  document.querySelector("#userActive").checked = true;
  document.querySelector("#userStatus").textContent = "";
}

function editUser(userId) {
  const user = state.users.find((item) => item.id === userId);
  if (!user) return;
  document.querySelector("#userId").value = user.id;
  document.querySelector("#userUsername").value = user.username;
  document.querySelector("#userPassword").value = "";
  document.querySelector("#userRole").value = user.role;
  document.querySelector("#userActive").checked = user.is_active;
  document.querySelector("#userStatus").textContent = `Editing ${user.username}`;
}

function renderUsers() {
  const list = document.querySelector("#usersList");
  list.innerHTML = state.users.map((user) => `
    <article class="user-row">
      <div>
        <strong>${user.username}</strong>
        <span>${user.role} | ${user.is_active ? "Active" : "Inactive"}</span>
        <small>Last login: ${user.last_login_at ? new Date(user.last_login_at).toLocaleString() : "Never"}</small>
      </div>
      <div class="row-actions">
        <button type="button" class="secondary-button" data-edit-user="${user.id}">Edit</button>
        <button type="button" class="danger-button" data-delete-user="${user.id}" ${state.user?.username === user.username ? "disabled" : ""}>Delete</button>
      </div>
    </article>`).join("") || `<div class="empty-chart">No users configured.</div>`;

  list.querySelectorAll("[data-edit-user]").forEach((button) => {
    button.addEventListener("click", () => editUser(Number(button.dataset.editUser)));
  });
  list.querySelectorAll("[data-delete-user]").forEach((button) => {
    button.addEventListener("click", () => deleteUser(Number(button.dataset.deleteUser)));
  });
}

async function saveUser(event) {
  event.preventDefault();
  if (state.user?.role !== "superadmin") return;
  const id = document.querySelector("#userId").value;
  const username = document.querySelector("#userUsername").value.trim();
  const password = document.querySelector("#userPassword").value;
  const role = document.querySelector("#userRole").value;
  const isActive = document.querySelector("#userActive").checked;
  const status = document.querySelector("#userStatus");
  const payload = { username, role, is_active: isActive };
  if (password) payload.password = password;
  if (!id && !password) {
    status.textContent = "Password is required for new users.";
    return;
  }
  status.textContent = "Saving user...";
  try {
    await fetchJson(id ? `/api/admin/users/${id}` : "/api/admin/users", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    clearUserForm();
    await loadUsers();
    status.textContent = "User saved.";
  } catch (error) {
    status.textContent = error.message;
  }
}

async function deleteUser(userId) {
  const user = state.users.find((item) => item.id === userId);
  if (!user) return;
  if (!confirm(`Delete user ${user.username}?`)) return;
  const status = document.querySelector("#userStatus");
  status.textContent = "Deleting user...";
  try {
    await fetchJson(`/api/admin/users/${userId}`, { method: "DELETE" });
    await loadUsers();
    status.textContent = "User deleted.";
  } catch (error) {
    status.textContent = error.message;
  }
}
function togglePasswordVisibility() {
  const input = document.querySelector("#loginPassword");
  const button = document.querySelector("#togglePasswordBtn");
  const showing = input.type === "text";
  input.type = showing ? "password" : "text";
  button.classList.toggle("is-visible", !showing);
  button.setAttribute("aria-label", showing ? "Show password" : "Hide password");
  button.setAttribute("title", showing ? "Show password" : "Hide password");
}
async function login(event) {
  event.preventDefault();
  const username = document.querySelector("#loginUsername").value.trim();
  const password = document.querySelector("#loginPassword").value;
  const status = document.querySelector("#loginStatus");
  status.textContent = "Signing in...";
  try {
    const user = await fetchJson("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    showApp(user);
    setupBottomNav();
    await refreshAll();
    await loadUsers();
  } catch (error) {
    status.textContent = error.message;
  }
}

async function logout() {
  await fetchJson("/api/logout", { method: "POST" }).catch(() => ({}));
  state.user = null;
  showLogin("Logged out.");
}

async function boot() {
  document.body.classList.add("demo-mode");
  try {
    const user = await fetchJson("/api/me");
    showApp(user);
    setupBottomNav();
    await refreshAll();
    await loadUsers();
  } catch (error) {
    showLogin(error.message === "Login required." ? "" : error.message);
  }
}

document.querySelector("#loginForm").addEventListener("submit", login);
document.querySelector("#togglePasswordBtn").addEventListener("click", togglePasswordVisibility);
document.querySelector("#logoutBtn").addEventListener("click", logout);
document.querySelector("#refreshBtn").addEventListener("click", refreshAll);
document.querySelector("#groupFilter").addEventListener("change", () => refreshAll({ skipMailSync: true }));
document.querySelector("#accountFilter").addEventListener("change", loadHistory);
document.querySelector("#uploadForm").addEventListener("submit", uploadStatement);
document.querySelector("#balanceForm").addEventListener("submit", saveManualBalance);
document.querySelector("#chartGroupSelect").addEventListener("change", () => renderInsightCharts(state.overview));
document.querySelector("#purposeToggle").addEventListener("change", () => renderInsightCharts(state.overview));
document.querySelector("#trendDaysSelect").addEventListener("change", loadHistory);
document.querySelector("#trendGroupSelect").addEventListener("change", () => { populateTrendCompanyAccountFilters(); renderTrendCharts(); });
document.querySelector("#trendCompanySelect").addEventListener("change", () => { populateTrendCompanyAccountFilters(); renderTrendCharts(); });
document.querySelector("#trendAccountSelect").addEventListener("change", renderTrendCharts);
document.querySelector("#userForm").addEventListener("submit", saveUser);
document.querySelector("#clearUserFormBtn").addEventListener("click", clearUserForm);
setupPreviewToggle();
boot();
