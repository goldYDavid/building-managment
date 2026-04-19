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

ui.tenantLoginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const tenantName = value("tenantName");
  const tenantApartment = value("tenantApartment");

  if (!tenantName || !tenantApartment) {
    alert("יש להזין שם דייר ומספר דירה תקינים כדי להתחבר כדייר.");
    return;
  }

  auth.role = "tenant";
  auth.tenantName = tenantName;
  auth.tenantApartment = normalizeApartmentIdentifier(tenantApartment);
  persistAuth();
  ui.tenantLoginForm.reset();
  render();
});

ui.adminLoginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = value("username");
  const password = value("password");

  if (username === "admin" && password === "admin") {
    auth.role = "admin";
    auth.adminUsername = "admin";
    auth.tenantName = "";
    auth.tenantApartment = "";
    persistAuth();
    ui.adminLoginForm.reset();
    render();
    return;
  }

  alert("שם משתמש או סיסמה שגויים. למנהל: admin / admin");
});

ui.logoutBtn.addEventListener("click", () => {
  auth.role = "guest";
  auth.adminUsername = "";
  auth.tenantName = "";
  auth.tenantApartment = "";
  persistAuth();
  render();
});

ui.residentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!requireAdmin()) {
    return;
  }

  const resident = {
    id: crypto.randomUUID(),
    name: value("residentName"),
    apartment: normalizeApartmentIdentifier(value("apartment")),
    phone: value("phone")
  };
  state.residents.unshift(resident);
  persist();
  ui.residentForm.reset();
  render();
});

ui.paymentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!requireAdmin()) {
    return;
  }

  const payment = {
    id: crypto.randomUUID(),
    apartment: normalizeApartmentIdentifier(value("paymentApartment")),
    amount: Number(value("amount")),
    dueDate: value("dueDate"),
    paid: false
  };
  state.payments.unshift(payment);
  persist();
  ui.paymentForm.reset();
  render();
});

ui.ticketForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (auth.role === "guest") {
    alert("יש להתחבר כמנהל או כדייר.");
    return;
  }

  const ticket = {
    id: crypto.randomUUID(),
    title: value("ticketTitle"),
    priority: value("priority"),
    description: value("ticketDesc"),
    createdAt: new Date().toISOString(),
    open: true,
    openedBy: auth.role === "admin" ? "מנהל" : auth.tenantName
  };

  state.tickets.unshift(ticket);
  persist();
  ui.ticketForm.reset();
  render();
});

ui.noticeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!requireAdmin()) {
    return;
  }

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
    .map(
      (resident) =>
        `<li><strong>${escapeHtml(resident.name)}</strong> · דירה ${escapeHtml(resident.apartment)} · ${escapeHtml(resident.phone || "ללא")}</li>`
    )
    .join("");

  const visiblePayments = getVisiblePayments();
  ui.paymentsList.innerHTML = visiblePayments
    .map((payment) => {
      const statusMarkup =
        auth.role === "admin"
          ? `<br><button data-pay-id="${payment.id}">${payment.paid ? "סמן כלא שולם" : "סמן כשולם"}</button>`
          : `<br>סטטוס: ${payment.paid ? "שולם" : "לא שולם"}`;

      return `<li>
        <strong>דירה ${escapeHtml(payment.apartment)}</strong> · ₪${payment.amount.toLocaleString("he-IL")}
        <br>תאריך יעד: ${escapeHtml(payment.dueDate)}
        ${statusMarkup}
      </li>`;
    })
    .join("");

  if (!ui.paymentsList.innerHTML) {
    ui.paymentsList.innerHTML = `<li>${auth.role === "guest" ? "התחברו כדי לראות נתוני תשלומים." : "אין תשלומים להצגה."}</li>`;
  }

  ui.ticketsList.innerHTML = state.tickets
    .map((ticket) => {
      const cls =
        ticket.priority === "גבוהה" ? "high" : ticket.priority === "בינונית" ? "medium" : "low";
      const adminAction =
        auth.role === "admin"
          ? `<br><button data-ticket-id="${ticket.id}">${ticket.open ? "סגור קריאה" : "פתח מחדש"}</button>`
          : "";

      return `<li>
        <strong>${escapeHtml(ticket.title)}</strong>
        <span class="badge ${cls}">${escapeHtml(ticket.priority)}</span>
        <br>${escapeHtml(ticket.description || "-")}
        <br>נפתח ע"י: ${escapeHtml(ticket.openedBy || "-")}
        ${adminAction}
      </li>`;
    })
    .join("");

  ui.noticesList.innerHTML = state.notices
    .map((notice) => `<li><strong>${escapeHtml(notice.title)}</strong><br>${escapeHtml(notice.body)}</li>`)
    .join("");

  ui.kpiResidents.textContent = String(state.residents.length);
  ui.kpiOpenTickets.textContent = String(state.tickets.filter((ticket) => ticket.open).length);
  const outstanding = state.payments.filter((payment) => !payment.paid).reduce((sum, payment) => sum + payment.amount, 0);
  ui.kpiOutstanding.textContent = `₪${outstanding.toLocaleString("he-IL")}`;
  ui.kpiNotices.textContent = String(state.notices.length);

  bindActions();
}

function renderAuth() {
  const roleLabel = auth.role === "admin" ? "מנהל" : auth.role === "tenant" ? "דייר" : "אורח";
  const identityLabel =
    auth.role === "tenant"
      ? ` (${escapeHtml(auth.tenantName || "ללא שם")} · דירה ${escapeHtml(auth.tenantApartment || "-")})`
      : auth.role === "admin"
        ? " (admin)"
        : "";

  ui.authState.innerHTML = `תפקיד נוכחי: <strong>${roleLabel}</strong>${identityLabel}`;

  document.querySelectorAll("[data-admin-only='true']").forEach((element) => {
    element.classList.toggle("hidden", auth.role !== "admin");
  });
}

function bindActions() {
  if (auth.role !== "admin") {
    return;
  }

  document.querySelectorAll("[data-pay-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const payment = state.payments.find((item) => item.id === button.dataset.payId);
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
      const ticket = state.tickets.find((item) => item.id === button.dataset.ticketId);
      if (!ticket) {
        return;
      }
      ticket.open = !ticket.open;
      persist();
      render();
    });
  });
}

function getVisiblePayments() {
  if (auth.role === "admin") {
    return state.payments;
  }

  if (auth.role === "tenant") {
    const tenantApartment = normalizeApartmentIdentifier(auth.tenantApartment);
    return state.payments.filter(
      (payment) => normalizeApartmentIdentifier(payment.apartment) === tenantApartment
    );
  }

  return [];
}

function requireAdmin() {
  if (auth.role === "admin") {
    return true;
  }

  alert("הפעולה זמינה למנהל בלבד. התחברות: admin / admin");
  return false;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function persistAuth() {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

function createDefaultState() {
  return {
    residents: [],
    payments: [],
    tickets: [],
    notices: []
  };
}

function loadState() {
  const defaultState = createDefaultState();
  const existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) {
    return defaultState;
  }

  try {
    const parsed = JSON.parse(existing);
    if (!parsed || typeof parsed !== "object") {
      return defaultState;
    }

    return {
      residents: Array.isArray(parsed.residents) ? parsed.residents : defaultState.residents,
      payments: Array.isArray(parsed.payments) ? parsed.payments : defaultState.payments,
      tickets: Array.isArray(parsed.tickets) ? parsed.tickets : defaultState.tickets,
      notices: Array.isArray(parsed.notices) ? parsed.notices : defaultState.notices
    };
  } catch {
    return defaultState;
  }
}

function loadAuth() {
  const defaultAuth = { role: "guest", adminUsername: "", tenantName: "", tenantApartment: "" };
  const existing = localStorage.getItem(AUTH_KEY);
  if (!existing) {
    return defaultAuth;
  }

  try {
    const parsed = JSON.parse(existing);
    if (!parsed || typeof parsed !== "object") {
      return defaultAuth;
    }

    const role = ["guest", "tenant", "admin"].includes(parsed.role) ? parsed.role : "guest";
    return {
      role,
      adminUsername: typeof parsed.adminUsername === "string" ? parsed.adminUsername : "",
      tenantName: typeof parsed.tenantName === "string" ? parsed.tenantName : "",
      tenantApartment: normalizeApartmentIdentifier(parsed.tenantApartment || "")
    };
  } catch {
    return defaultAuth;
  }
}

function normalizeApartmentIdentifier(valueToNormalize) {
  return String(valueToNormalize || "").trim().toLowerCase();
}

function value(id) {
  return document.getElementById(id).value.trim();
}

function escapeHtml(text) {
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  return paragraph.innerHTML;
}

render();
