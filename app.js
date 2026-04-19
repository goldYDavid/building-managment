const STORAGE_KEY = "building_mgmt_v1";
const AUTH_KEY = "building_auth_v2";

const state = loadState();
const auth = loadAuth();

const ui = {
  residentForm: document.getElementById("residentForm"),
  residentsList: document.getElementById("residentsList"),
  paymentForm: document.getElementById("paymentForm"),
  paymentsList: document.getElementById("paymentsList"),
  ticketForm: document.getElementById("ticketForm"),
  ticketsList: document.getElementById("ticketsList"),
  noticeForm: document.getElementById("noticeForm"),
  noticesList: document.getElementById("noticesList"),
  installBtn: document.getElementById("installBtn"),
  tenantLoginForm: document.getElementById("tenantLoginForm"),
  adminLoginForm: document.getElementById("adminLoginForm"),
  authState: document.getElementById("authState"),
  authStatusText: document.getElementById("authStatusText"),
  logoutBtn: document.getElementById("logoutBtn"),
  kpiResidents: document.getElementById("kpiResidents"),
  kpiOpenTickets: document.getElementById("kpiOpenTickets"),
  kpiOutstanding: document.getElementById("kpiOutstanding"),
  kpiNotices: document.getElementById("kpiNotices")
};

let deferredInstallPrompt = null;

ui.tenantLoginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const tenantIdentifier = value("tenantIdentifier");
  if (!tenantIdentifier) {
    alert("יש להזין שם דייר או מזהה דירה.");
    return;
  }
  auth.role = "resident";
  auth.username = tenantIdentifier;
  persistAuth();
  ui.tenantLoginForm.reset();
  render();
});

ui.adminLoginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const username = value("username");
  const password = value("password");

  if (username === "admin" && password === "admin") {
    auth.role = "admin";
    auth.username = "admin";
    persistAuth();
    ui.adminLoginForm.reset();
    render();
    return;
  }

  alert("שם משתמש או סיסמה שגויים. למנהל: admin / admin");
});

ui.logoutBtn.addEventListener("click", () => {
  auth.role = "guest";
  auth.username = "";
  persistAuth();
  render();
});

ui.residentForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!requireAdmin()) return;

  state.residents.unshift({
    id: crypto.randomUUID(),
    name: value("residentName"),
    apartment: value("apartment"),
    phone: value("phone")
  });
  persist();
  ui.residentForm.reset();
  render();
});

ui.paymentForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!requireAdmin()) return;

  state.payments.unshift({
    id: crypto.randomUUID(),
    apartment: value("paymentApartment"),
    amount: Number(value("amount")),
    dueDate: value("dueDate"),
    paid: false
  });
  persist();
  ui.paymentForm.reset();
  render();
});

ui.ticketForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (auth.role === "guest") {
    alert("אורח לא יכול לפתוח קריאה. התחברו כדייר או כמנהל.");
    return;
  }

  state.tickets.unshift({
    id: crypto.randomUUID(),
    title: value("ticketTitle"),
    priority: value("priority"),
    description: value("ticketDesc"),
    createdAt: new Date().toISOString(),
    open: true,
    openedBy: auth.username || "דייר"
  });
  persist();
  ui.ticketForm.reset();
  render();
});

ui.noticeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!requireAdmin()) return;

  state.notices.unshift({
    id: crypto.randomUUID(),
    title: value("noticeTitle"),
    body: value("noticeBody"),
    createdAt: new Date().toISOString()
  });
  persist();
  ui.noticeForm.reset();
  render();
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  ui.installBtn.classList.remove("hidden");
});

ui.installBtn.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  ui.installBtn.classList.add("hidden");
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}

function render() {
  renderAuth();

  ui.residentsList.innerHTML = state.residents
    .map((r) => `<li><strong>${escapeHtml(r.name)}</strong> · דירה ${escapeHtml(r.apartment)} · ${escapeHtml(r.phone || "ללא")}</li>`)
    .join("");

  const visiblePayments =
    auth.role === "resident"
      ? state.payments.filter((p) => matchesResidentPayment(p.apartment, auth.username))
      : state.payments;

  ui.paymentsList.innerHTML = visiblePayments
    .map(
      (p) => `<li>
        <strong>דירה ${escapeHtml(p.apartment)}</strong> · ₪${p.amount.toLocaleString("he-IL")}
        <br>תאריך יעד: ${escapeHtml(p.dueDate)}
        ${
          auth.role === "admin"
            ? `<br><button data-pay-id="${p.id}">${p.paid ? "סמן כלא שולם" : "סמן כשולם"}</button>`
            : `<br>סטטוס: ${p.paid ? "שולם" : "לא שולם"}`
        }
      </li>`
    )
    .join("");

  if (auth.role === "resident" && visiblePayments.length === 0) {
    ui.paymentsList.innerHTML = `<li>לא נמצאו חיובים עבור ${escapeHtml(auth.username)}.</li>`;
  }

  ui.ticketsList.innerHTML = state.tickets
    .map((t) => {
      const cls = t.priority === "גבוהה" ? "high" : t.priority === "בינונית" ? "medium" : "low";
      const adminAction =
        auth.role === "admin"
          ? `<br><button data-ticket-id="${t.id}">${t.open ? "סגור קריאה" : "פתח מחדש"}</button>`
          : "";
      return `<li>
        <strong>${escapeHtml(t.title)}</strong>
        <span class="badge ${cls}">${escapeHtml(t.priority)}</span>
        <br>${escapeHtml(t.description || "-")}
        <br>נפתח ע"י: ${escapeHtml(t.openedBy || "-")}
        ${adminAction}
      </li>`;
    })
    .join("");

  ui.noticesList.innerHTML = state.notices
    .map((n) => `<li><strong>${escapeHtml(n.title)}</strong><br>${escapeHtml(n.body)}</li>`)
    .join("");

  ui.kpiResidents.textContent = String(state.residents.length);
  ui.kpiOpenTickets.textContent = String(state.tickets.filter((t) => t.open).length);
  const outstanding = state.payments.filter((p) => !p.paid).reduce((sum, p) => sum + p.amount, 0);
  ui.kpiOutstanding.textContent = `₪${outstanding.toLocaleString("he-IL")}`;
  ui.kpiNotices.textContent = String(state.notices.length);

  bindActions();
}

function renderAuth() {
  const isAdmin = auth.role === "admin";

  document.querySelectorAll("[data-admin-only='true']").forEach((el) => {
    el.classList.toggle("hidden", !isAdmin);
  });

  if (auth.role === "admin") {
    ui.authState.textContent = "מצב נוכחי: מנהל";
    ui.authStatusText.textContent = "מחובר כמנהל admin. יש גישה מלאה לניהול הבניין.";
  } else if (auth.role === "resident") {
    ui.authState.textContent = "מצב נוכחי: דייר";
    ui.authStatusText.textContent = `מחובר כדייר: ${auth.username}. ניתן לפתוח קריאות ולצפות בחיובים האישיים.`;
  } else {
    ui.authState.textContent = "מצב נוכחי: אורח";
    ui.authStatusText.textContent = "לא מחובר. אורח יכול לצפות במידע ציבורי בלבד.";
  }
}

function bindActions() {
  if (auth.role !== "admin") return;

  document.querySelectorAll("[data-pay-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const payment = state.payments.find((p) => p.id === button.dataset.payId);
      if (!payment) return;
      payment.paid = !payment.paid;
      persist();
      render();
    });
  });

  document.querySelectorAll("[data-ticket-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const ticket = state.tickets.find((t) => t.id === button.dataset.ticketId);
      if (!ticket) return;
      ticket.open = !ticket.open;
      persist();
      render();
    });
  });
}

function matchesResidentPayment(apartment, residentIdentifier) {
  const a = String(apartment).toLowerCase();
  const r = String(residentIdentifier).toLowerCase();
  return a.includes(r) || r.includes(a);
}

function requireAdmin() {
  if (auth.role === "admin") return true;
  alert("הפעולה זמינה למנהל בלבד. התחברות: admin / admin");
  return false;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function persistAuth() {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

function loadState() {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return JSON.parse(existing);
  return { residents: [], payments: [], tickets: [], notices: [] };
}

function loadAuth() {
  const existing = localStorage.getItem(AUTH_KEY);
  if (existing) return JSON.parse(existing);
  return { role: "guest", username: "" };
}

function value(id) {
  return document.getElementById(id).value.trim();
}

function escapeHtml(text) {
  const p = document.createElement("p");
  p.textContent = text;
  return p.innerHTML;
}

render();
