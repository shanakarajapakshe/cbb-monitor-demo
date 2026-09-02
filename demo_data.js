(function () {
  const today = new Date("2026-07-02T09:30:00");
  const rates = { LKR: 1, USD: 305, GBP: 389 };
  const accounts = [
    [1,"CSEC GROUP","Civil & Structural Engineering Consultants International (Pvt) Ltd","Commercial Bank","1116019751","Current","LKR",111310.71],
    [2,"CSEC GROUP","Civil & Structural Engineering Consultants International (Pvt) Ltd","Commercial Bank (Money Market)","2116028534","Money Market","LKR",680000.00],
    [3,"CSEC GROUP","Civil & Structural Engineering Consultants International (Pvt) Ltd","Commercial Bank (USD)","5000292578","Current","USD",1104.86],
    [4,"CSEC GROUP","Civil & Structural Engineering Consultants International (Pvt) Ltd","Commercial Bank (GBP)","5000283743","Current","GBP",55.33],
    [5,"CSEC GROUP","Civil & Structural Engineering Consultants (Pvt) Ltd.","NTB","100200005471","Current","LKR",508049.76],
    [6,"CSEC GROUP","Civil And Structural Engineering Consortium (Private) Limited","Seylan Bank (Building Fund Borella)","0820-13729134-002","Fund","LKR",950000.00],
    [7,"LCMC GROUP","Lotus Construction Management Consultants International (Pvt) Ltd","Commercial Bank","1000371497","Current","LKR",2396.93],
    [8,"LCMC GROUP","Lotus Construction Management Consultants (Pvt) Ltd.","Commercial Bank (Money Market)","2116022120","Money Market","LKR",620334.46],
    [9,"LCMC GROUP","Lotus Construction Management Consultants International (Pvt) Ltd","People's Bank","331-100120006231","Current","LKR",300000.00],
    [10,"LCMC GROUP","Lotus Construction Management Consortium (Private) Limited","Seylan Bank (Welfare Borella)","0820-13729166-002","Fund","LKR",172500.00],
    [11,"OTHER GROUP","Ceylon Plantation & Estate Holdings (Pvt) Ltd","NTB","100200004162","Current","LKR",331439.73],
    [12,"OTHER GROUP","Ceylon Plantation & Estate Holdings (Pvt) Ltd","Bank of Ceylon","0082822253","Current","LKR",38492.92],
    [13,"OTHER GROUP","Ceylon Plantation & Estate Holdings (Pvt) Ltd","National Development Bank (Money Market)","106110471362","Money Market","LKR",723691.43],
    [14,"OTHER GROUP","SESMA Holdings (Pvt) Ltd","National Development Bank","101000989917","Current","LKR",35750.76],
    [15,"OTHER GROUP","Ceylon Livestock & Fisheries (Pvt) Ltd","Sampath Bank","001110013228","Current","LKR",40835.00],
    [16,"GPMC GROUP","Global Project Management Consultants (Pvt) Ltd","Commercial Bank","1000053652","Current","LKR",410000.00]
  ].map(([id, group, company, bank, account_number, account_type, currency, base]) => ({ id, group, company, bank, account_number, account_type, currency, base }));
  const users = [
    { id: 1, username: "superadmin", role: "superadmin", is_active: true, created_at: "2026-07-01T08:00:00", last_login_at: "2026-07-02T09:30:00" },
    { id: 2, username: "viewer", role: "viewer", is_active: true, created_at: "2026-07-01T09:00:00", last_login_at: null }
  ];
  const lkr = (row, value = row.base) => value * (rates[row.currency] || 1);
  const latestRows = () => accounts.map((a) => ({ account_id: a.id, group: a.group, company: a.company, bank: a.bank, account_number: a.account_number, account_type: a.account_type, currency: a.currency, latest_balance: a.base, statement_date: a.currency === "LKR" ? "2026-06-30" : "2026-04-30", last_updated: "2026-07-02T09:30:00" }));
  const overview = (group = "") => {
    const rows = latestRows().filter((r) => !group || r.group === group);
    const lkrRows = rows.filter((r) => r.currency === "LKR");
    const total = lkrRows.reduce((sum, r) => sum + Number(r.latest_balance || 0), 0);
    const highest = lkrRows.slice().sort((a, b) => b.latest_balance - a.latest_balance)[0] || null;
    return { currency: "LKR", total_cash: Number(total.toFixed(2)), account_count: rows.length, active_accounts: rows.length, stale_accounts: 2, missing_accounts: 0, bank_count: new Set(rows.map((r) => r.bank)).size, highest_balance: highest, rows };
  };
  const history = (days = 30) => {
    const rows = [];
    accounts.forEach((a, index) => {
      for (let offset = days - 1; offset >= 0; offset -= 1) {
        const d = new Date(today); d.setDate(today.getDate() - offset);
        const wave = Math.sin((days - offset + index) / 5) * 0.055;
        const drift = ((days - offset) / days - 0.5) * ((index % 5) - 2) * 0.055;
        rows.push({ account_id: a.id, group: a.group, company: a.company, bank: a.bank, account_number: a.account_number, date: d.toISOString().slice(0, 10), closing_balance: Number(Math.max(0, a.base * (1 + wave + drift)).toFixed(2)) });
      }
    });
    return rows;
  };
  window.demoFetchJson = async function (url, options = {}) {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const method = (options.method || "GET").toUpperCase();
    const parsed = new URL(url, window.location.origin);
    const path = parsed.pathname;
    if (path === "/api/login" || path === "/api/me") return { username: "demo-superadmin", role: "superadmin" };
    if (path === "/api/logout") return { message: "Logged out." };
    if (path === "/api/sync-mail") return { message: "Demo mail sync completed.", processed: 2 };
    if (path === "/api/accounts") return accounts.map((a) => ({ ...a, label: `${a.group} | ${a.bank} | ${a.account_number}` }));
    if (path === "/api/overview") return overview(parsed.searchParams.get("group") || "");
    if (path === "/api/history") return { rows: history(Number(parsed.searchParams.get("days") || 30)) };
    if (path === "/api/upload") return { message: "Demo PDF parsed.", closing_balance: 111310.71 };
    if (path === "/api/manual-balance") { const id = options.body?.get?.("account_id"); const amount = Number(options.body?.get?.("closing_balance") || 0); const a = accounts.find((x) => String(x.id) === String(id)); if (a && amount) a.base = amount; return { message: "Demo balance saved.", closing_balance: amount }; }
    if (path === "/api/admin/users" && method === "GET") return users;
    if (path === "/api/admin/users" && method === "POST") { const p = JSON.parse(options.body || "{}"); const u = { id: Date.now(), username: p.username || "demo-user", role: p.role || "viewer", is_active: p.is_active !== false, created_at: new Date().toISOString(), last_login_at: null }; users.push(u); return u; }
    if (path.startsWith("/api/admin/users/") && method === "PATCH") { const id = Number(path.split("/").pop()); const p = JSON.parse(options.body || "{}"); const u = users.find((x) => x.id === id); if (u) Object.assign(u, p); return u || users[0]; }
    if (path.startsWith("/api/admin/users/") && method === "DELETE") { const id = Number(path.split("/").pop()); const i = users.findIndex((x) => x.id === id); if (i > -1) users.splice(i, 1); return { message: "Demo user deleted." }; }
    throw new Error(`Demo endpoint not found: ${path}`);
  };
})();
