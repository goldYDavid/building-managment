const STORAGE_KEY = "building_mgmt_v1";
const AUTH_KEY = "building_auth_v1";

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
  logoutBtn: document.getElementById("logoutBtn"),
  kpiResidents: document.getElementById("kpiResidents"),
  kpiOpenTickets: document.getElementById("kpiOpenTickets"),
  kpiOutstanding: document.getElementById("kpiOutstanding"),
  kpiNotices: document.getElementById("kpiNotices")
};

let deferredInstallPrompt = null;

ui.tenantLoginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const tenantName = value("tenantName");
  const tenantApartment = value("tenantApartment");
  if (!tenantName || !tenantApartment) {
    alert("יש למלא שם דייר ודירה.");
    return;
  }
  auth.role = "tenant";
  auth.tenantName = tenantName;
  auth.tenantApartment = tenantApartment;
  persistAuth();
  render();
});

ui.adminLoginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const username = value("username");
  const password = value("password");
  if (username === "admin" && password === "admin") {
    auth.role = "admin";
    persistAuth();
    render();
    return;
  }
  alert("שם משתמש או סיסמה שגויים.");
});

ui.logoutBtn.addEventListener("click", () => {
  auth.role = "guest";
  persistAuth();
  render();
});

ui.residentForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const resident = {
    id: crypto.randomUUID(),
    name: value("residentName"),
    apartment: value("apartment"),
    phone: value("phone")
  };
  state.residents.unshift(resident);
  persist();
  ui.residentForm.reset();
  render();
});

ui.paymentForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const payment = {
    id: crypto.randomUUID(),
    apartment: value("paymentApartment"),
    amount: Number(value("amount")),
    dueDate: value("dueDate"),
    paid: false
  };
  state.payments.unshift(payment);
  persist();
  ui.paymentForm.reset();
  render();
});

ui.ticketForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const ticket = {
    id: crypto.randomUUID(),
    title: value("ticketTitle"),
    priority: value("priority"),
    description: value("ticketDesc"),
    createdAt: new Date().toISOString(),
    open: true
  };
  state.tickets.unshift(ticket);
  persist();
  ui.ticketForm.reset();
  render();
});

ui.noticeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const notice = {
    id: crypto.randomUUID(),
    title: value("noticeTitle"),
    body: value("noticeBody"),
    createdAt: new Date().toISOString()
  };
  state.notices.unshift(notice);
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
  if (!deferredInstallPrompt) {
    return;
  }
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

  ui.paymentsList.innerHTML = state.payments
    .map(
      (p) => `<li>
        <strong>דירה ${escapeHtml(p.apartment)}</strong> · ₪${p.amount.toLocaleString("he-IL")}
        <br>תאריך יעד: ${escapeHtml(p.dueDate)}
        <br><button data-pay-id="${p.id}">${p.paid ? "סמן כלא שולם" : "סמן כשולם"}</button>
      </li>`
    )
    .join("");

  ui.ticketsList.innerHTML = state.tickets
    .map((t) => {
      const cls = t.priority === "גבוהה" ? "high" : t.priority === "בינונית" ? "medium" : "low";
      return `<li>
        <strong>${escapeHtml(t.title)}</strong>
        <span class="badge ${cls}">${escapeHtml(t.priority)}</span>
        <br>${escapeHtml(t.description || "-")}
        <br><button data-ticket-id="${t.id}">${t.open ? "סגור קריאה" : "פתח מחדש"}</button>
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
  const roleLabel = auth.role === "admin" ? "מנהל" : auth.role === "tenant" ? "דייר" : "אורח";
  ui.authState.textContent = `מצב נוכחי: ${roleLabel}`;
}

function bindActions() {
  document.querySelectorAll("[data-pay-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const payment = state.payments.find((p) => p.id === button.dataset.payId);
      if (!payment) {
        return;
      }
      payment.paid = !payment.paid;
      persist();
      render();
    });
  });

  document.querySelectorAll("[data-ticket-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const ticket = state.tickets.find((t) => t.id === button.dataset.ticketId);
      if (!ticket) {
        return;
      }
      ticket.open = !ticket.open;
      persist();
      render();
    });
  });
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function persistAuth() {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

function loadState() {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) {
    return JSON.parse(existing);
  }
  return {
    residents: [],
    payments: [],
    tickets: [],
    notices: []
  };
}

function loadAuth() {
  const existing = localStorage.getItem(AUTH_KEY);
  if (!existing) {
    return { role: "guest", tenantName: "", tenantApartment: "" };
  }
  try {
    const parsed = JSON.parse(existing);
    return {
      role: parsed.role === "admin" || parsed.role === "tenant" ? parsed.role : "guest",
      tenantName: typeof parsed.tenantName === "string" ? parsed.tenantName : "",
      tenantApartment: typeof parsed.tenantApartment === "string" ? parsed.tenantApartment : ""
    };
  } catch {
    return { role: "guest", tenantName: "", tenantApartment: "" };
  }
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
