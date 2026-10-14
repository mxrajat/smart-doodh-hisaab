/* ================================================================
   Smart Doodh Hisaab — Complete App Logic
   IndexedDB + Offline + All Views + Seed Data
   ================================================================ */

// ===== GLOBALS =====
let db;
const DB_NAME = 'SmartDoodhHisaabDB';
const DB_VERSION = 1;
let currentShift = 'subah';
let currentLedgerCustomerId = null;
let ledgerMonth = new Date(); // tracks which month is being viewed in ledger

const CATEGORY_LABELS = {
  chara: '🌾 Chara/Khali', dawai: '💊 Pashu Dawai',
  petrol: '⛽ Petrol/Delivery', helper: '👷 Helper', other: '📦 Other'
};
const CATEGORY_ICONS = {
  chara: '🌾', dawai: '💊', petrol: '⛽', helper: '👷', other: '📦'
};
const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
const MONTH_NAMES_HI = ['Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec'];

// ===== INDEXEDDB SETUP =====
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('customers')) {
        const cs = d.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
        cs.createIndex('shift', 'shift', { unique: false });
      }
      if (!d.objectStoreNames.contains('entries')) {
        const es = d.createObjectStore('entries', { keyPath: 'id', autoIncrement: true });
        es.createIndex('customerId', 'customerId', { unique: false });
        es.createIndex('date', 'date', { unique: false });
        es.createIndex('date_shift', ['date', 'shift'], { unique: false });
        es.createIndex('cust_date_shift', ['customerId', 'date', 'shift'], { unique: false });
      }
      if (!d.objectStoreNames.contains('payments')) {
        const ps = d.createObjectStore('payments', { keyPath: 'id', autoIncrement: true });
        ps.createIndex('customerId', 'customerId', { unique: false });
        ps.createIndex('date', 'date', { unique: false });
      }
      if (!d.objectStoreNames.contains('expenses')) {
        const xs = d.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
        xs.createIndex('date', 'date', { unique: false });
        xs.createIndex('category', 'category', { unique: false });
      }
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror = (e) => reject(e.target.error);
  });
}

// Generic DB helpers
function dbAdd(store, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).add(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function dbPut(store, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function dbDelete(store, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
function dbGetAll(store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function dbGet(store, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function dbGetByIndex(store, indexName, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const idx = tx.objectStore(store).index(indexName);
    const req = idx.getAll(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function dbClear(store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ===== UTILITY FUNCTIONS =====
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDate() + ' ' + MONTH_NAMES_HI[d.getMonth()];
}
function formatDateFull(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDate() + ' ' + MONTH_NAMES[d.getMonth()] + ' ' + d.getFullYear();
}
function monthKey(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
}
function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}
function datesInMonth(year, month) {
  const dates = [];
  const end = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= end; d++) {
    dates.push(year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0'));
  }
  return dates;
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}
function rupees(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}

// ===== VIEW MANAGEMENT =====
function showView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const view = document.getElementById('view-' + viewName);
  if (view) view.classList.add('active');

  // Update bottom nav
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const navBtn = document.querySelector(`.nav-btn[data-view="${viewName}"]`);
  if (navBtn) navBtn.classList.add('active');

  // Refresh view data
  if (viewName === 'dashboard') refreshDashboard();
  else if (viewName === 'entry') refreshEntryView();
  else if (viewName === 'customers') refreshCustomerList();
  else if (viewName === 'expenses') refreshExpenseView();
  else if (viewName === 'ledger') refreshLedger();
}

// ===== MODAL MANAGEMENT =====
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
function closeModalOutside(e, id) {
  if (e.target.id === id) closeModal(id);
}

// ===== DASHBOARD =====
async function refreshDashboard() {
  const today = todayStr();
  const now = new Date();
  const mk = monthKey(now);

  const entries = await dbGetAll('entries');
  const customers = await dbGetAll('customers');
  const payments = await dbGetAll('payments');
  const expenses = await dbGetAll('expenses');

  // Aaj ka Doodh
  const todayEntries = entries.filter(e => e.date === today && e.status === 'delivered');
  const todayLitres = todayEntries.reduce((s, e) => s + e.quantity, 0);
  document.getElementById('dash-today-litres').textContent = todayLitres.toFixed(1) + ' L';

  // Month Sale
  const monthEntries = entries.filter(e => e.date.startsWith(mk) && e.status === 'delivered');
  const monthSale = monthEntries.reduce((s, e) => s + (e.quantity * e.rate), 0);
  document.getElementById('dash-month-sale').textContent = rupees(monthSale);

  // Month Expense
  const monthExpenses = expenses.filter(e => e.date.startsWith(mk));
  const monthExpenseTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);
  document.getElementById('dash-month-expense').textContent = rupees(monthExpenseTotal);

  // Profit
  document.getElementById('dash-profit').textContent = rupees(monthSale - monthExpenseTotal);

  // Total Due (all time)
  let totalDue = 0;
  for (const cust of customers) {
    const custEntries = entries.filter(e => e.customerId === cust.id && e.status === 'delivered');
    const custBill = custEntries.reduce((s, e) => s + (e.quantity * e.rate), 0);
    const custPayments = payments.filter(p => p.customerId === cust.id);
    const custPaid = custPayments.reduce((s, p) => s + p.amount, 0);
    const due = (cust.openingBalance || 0) + custBill - custPaid;
    if (due > 0) totalDue += due;
  }
  document.getElementById('dash-total-due').textContent = rupees(totalDue);

  // Today summary
  const summaryDiv = document.getElementById('dash-today-summary');
  if (todayEntries.length === 0 && entries.filter(e => e.date === today).length === 0) {
    summaryDiv.innerHTML = '<p class="empty-msg">Aaj ki koi entry nahi hui abhi.</p>';
  } else {
    const todayAll = entries.filter(e => e.date === today);
    let html = '';
    for (const entry of todayAll) {
      const cust = customers.find(c => c.id === entry.customerId);
      if (!cust) continue;
      const shiftIcon = entry.shift === 'subah' ? '🌅' : '🌇';
      if (entry.status === 'delivered') {
        html += `<div class="summary-item">
          <span class="s-name">${shiftIcon} ${cust.name}</span>
          <span class="s-qty">${entry.quantity} L</span>
        </div>`;
      } else {
        html += `<div class="summary-item">
          <span class="s-name">${shiftIcon} ${cust.name}</span>
          <span class="s-skip">❌ Chutti</span>
        </div>`;
      }
    }
    summaryDiv.innerHTML = html || '<p class="empty-msg">Aaj ki koi entry nahi hui abhi.</p>';
  }
}

// ===== ENTRY VIEW =====
function setShift(shift) {
  currentShift = shift;
  document.querySelectorAll('.shift-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.shift === shift);
  });
  refreshEntryView();
}

async function refreshEntryView() {
  const date = document.getElementById('entry-date').value;
  if (!date) return;

  const customers = await dbGetAll('customers');
  const shiftCustomers = customers.filter(c =>
    c.shift === currentShift || c.shift === 'dono'
  );

  const entries = await dbGetAll('entries');
  const listDiv = document.getElementById('entry-list');

  if (shiftCustomers.length === 0) {
    listDiv.innerHTML = '<p class="empty-msg">Is shift ke liye koi Grahak nahi hai. Pehle Grahak add karein.</p>';
    return;
  }

  let html = '';
  for (const cust of shiftCustomers) {
    // Check if entry exists for this date+shift+customer
    const existing = entries.find(e =>
      e.customerId === cust.id && e.date === date && e.shift === currentShift
    );
    const qty = existing ? existing.quantity : cust.defaultQty;
    const status = existing ? existing.status : 'pending';

    const deliveredClass = status === 'delivered' ? 'active-btn' : '';
    const skippedClass = status === 'skipped' ? 'active-btn' : '';
    const cardClass = status === 'delivered' ? 'delivered' : (status === 'skipped' ? 'skipped' : '');

    html += `<div class="entry-card ${cardClass}" id="entry-card-${cust.id}">
      <div class="entry-card-top">
        <div>
          <div class="entry-cust-name">${cust.name}</div>
          <div class="entry-cust-meta">${cust.milkType === 'cow' ? '🐄' : '🐃'} ${rupees(cust.ratePerLitre)}/L · Default: ${cust.defaultQty}L</div>
        </div>
      </div>
      <div class="entry-card-actions">
        <button class="entry-btn btn-gaya ${deliveredClass}" onclick="markEntry(${cust.id}, 'delivered')">✅ Gaya</button>
        <button class="entry-btn btn-nagha ${skippedClass}" onclick="markEntry(${cust.id}, 'skipped')">❌ Nagha</button>
        <div style="flex:1"></div>
        <button class="entry-btn btn-minus" onclick="adjustQty(${cust.id}, -0.5)">−</button>
        <span class="entry-qty-display" id="qty-${cust.id}">${qty} L</span>
        <button class="entry-btn btn-plus" onclick="adjustQty(${cust.id}, 0.5)">+</button>
      </div>
    </div>`;
  }
  listDiv.innerHTML = html;
}

async function markEntry(custId, status) {
  const date = document.getElementById('entry-date').value;
  const cust = await dbGet('customers', custId);
  if (!cust) return;

  // Get current qty from display
  const qtyEl = document.getElementById('qty-' + custId);
  let qty = parseFloat(qtyEl.textContent) || cust.defaultQty;
  if (status === 'skipped') qty = 0;
  if (status === 'delivered' && qty === 0) qty = cust.defaultQty;

  // Check existing entry
  const entries = await dbGetAll('entries');
  const existing = entries.find(e =>
    e.customerId === custId && e.date === date && e.shift === currentShift
  );

  const entryData = {
    customerId: custId,
    date: date,
    shift: currentShift,
    quantity: qty,
    status: status,
    rate: cust.ratePerLitre
  };

  if (existing) {
    entryData.id = existing.id;
    await dbPut('entries', entryData);
  } else {
    await dbAdd('entries', entryData);
  }

  // Update UI card
  const card = document.getElementById('entry-card-' + custId);
  card.className = 'entry-card ' + (status === 'delivered' ? 'delivered' : 'skipped');

  // Update buttons
  const btns = card.querySelectorAll('.entry-btn');
  btns[0].classList.toggle('active-btn', status === 'delivered');
  btns[1].classList.toggle('active-btn', status === 'skipped');

  if (status === 'delivered') {
    qtyEl.textContent = qty + ' L';
  } else {
    qtyEl.textContent = '0 L';
  }
}

async function adjustQty(custId, delta) {
  const qtyEl = document.getElementById('qty-' + custId);
  let qty = parseFloat(qtyEl.textContent) || 0;
  qty = Math.max(0, qty + delta);
  qtyEl.textContent = qty + ' L';

  // If already has an entry, update it
  const date = document.getElementById('entry-date').value;
  const entries = await dbGetAll('entries');
  const existing = entries.find(e =>
    e.customerId === custId && e.date === date && e.shift === currentShift
  );
  if (existing) {
    existing.quantity = qty;
    existing.status = qty > 0 ? 'delivered' : 'skipped';
    await dbPut('entries', existing);

    const card = document.getElementById('entry-card-' + custId);
    card.className = 'entry-card ' + (existing.status === 'delivered' ? 'delivered' : 'skipped');
    const btns = card.querySelectorAll('.entry-btn');
    btns[0].classList.toggle('active-btn', existing.status === 'delivered');
    btns[1].classList.toggle('active-btn', existing.status === 'skipped');
  }
}

async function markAllDelivered() {
  const date = document.getElementById('entry-date').value;
  const customers = await dbGetAll('customers');
  const shiftCustomers = customers.filter(c =>
    c.shift === currentShift || c.shift === 'dono'
  );

  for (const cust of shiftCustomers) {
    const entries = await dbGetAll('entries');
    const existing = entries.find(e =>
      e.customerId === cust.id && e.date === date && e.shift === currentShift
    );
    const entryData = {
      customerId: cust.id,
      date: date,
      shift: currentShift,
      quantity: cust.defaultQty,
      status: 'delivered',
      rate: cust.ratePerLitre
    };
    if (existing) {
      entryData.id = existing.id;
      await dbPut('entries', entryData);
    } else {
      await dbAdd('entries', entryData);
    }
  }

  refreshEntryView();
  showToast('✅ Sabko Default Mark kar diya!');
}

// ===== CUSTOMER MANAGEMENT =====
let customerFilterShift = 'all';

function openCustomerModal(editId) {
  const form = document.getElementById('form-customer');
  form.reset();
  document.getElementById('cust-edit-id').value = '';
  document.getElementById('modal-customer-title').textContent = '➕ Naya Grahak';

  if (editId) {
    document.getElementById('modal-customer-title').textContent = '✏️ Grahak Edit Karein';
    dbGet('customers', editId).then(cust => {
      if (!cust) return;
      document.getElementById('cust-edit-id').value = cust.id;
      document.getElementById('cust-name').value = cust.name;
      document.getElementById('cust-mobile').value = cust.mobile || '';
      document.querySelector(`input[name="cust-shift"][value="${cust.shift}"]`).checked = true;
      document.querySelector(`input[name="cust-milk"][value="${cust.milkType}"]`).checked = true;
      document.getElementById('cust-rate').value = cust.ratePerLitre;
      document.getElementById('cust-qty').value = cust.defaultQty;
      document.getElementById('cust-balance').value = cust.openingBalance || 0;
    });
  }
  openModal('modal-customer');
}

async function saveCustomer(e) {
  e.preventDefault();
  const editId = document.getElementById('cust-edit-id').value;
  const data = {
    name: document.getElementById('cust-name').value.trim(),
    mobile: document.getElementById('cust-mobile').value.trim(),
    shift: document.querySelector('input[name="cust-shift"]:checked').value,
    milkType: document.querySelector('input[name="cust-milk"]:checked').value,
    ratePerLitre: parseFloat(document.getElementById('cust-rate').value),
    defaultQty: parseFloat(document.getElementById('cust-qty').value),
    openingBalance: parseFloat(document.getElementById('cust-balance').value) || 0,
    createdAt: new Date().toISOString()
  };

  if (editId) {
    data.id = parseInt(editId);
    // Preserve original createdAt
    const orig = await dbGet('customers', data.id);
    if (orig) data.createdAt = orig.createdAt;
    await dbPut('customers', data);
    showToast('✅ Grahak update ho gaya!');
  } else {
    await dbAdd('customers', data);
    showToast('✅ Naya Grahak add ho gaya!');
  }

  closeModal('modal-customer');
  refreshCustomerList();
}

async function deleteCustomer(id) {
  if (!confirm('Kya aap sure hain? Is Grahak ka saara data delete ho jayega!')) return;

  // Delete associated entries and payments
  const entries = await dbGetAll('entries');
  const payments = await dbGetAll('payments');
  for (const e of entries.filter(e => e.customerId === id)) await dbDelete('entries', e.id);
  for (const p of payments.filter(p => p.customerId === id)) await dbDelete('payments', p.id);
  await dbDelete('customers', id);

  showToast('🗑️ Grahak delete ho gaya');
  refreshCustomerList();
}

function filterByShift(shift) {
  customerFilterShift = shift;
  document.querySelectorAll('.filter-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.filter === shift)
  );
  refreshCustomerList();
}

function filterCustomers() {
  refreshCustomerList();
}

async function refreshCustomerList() {
  let customers = await dbGetAll('customers');
  const searchVal = document.getElementById('customer-search').value.toLowerCase().trim();
  const entries = await dbGetAll('entries');
  const payments = await dbGetAll('payments');

  // Filter by shift
  if (customerFilterShift !== 'all') {
    customers = customers.filter(c => c.shift === customerFilterShift || c.shift === 'dono');
  }
  // Filter by search
  if (searchVal) {
    customers = customers.filter(c => c.name.toLowerCase().includes(searchVal));
  }

  const listDiv = document.getElementById('customer-list');
  if (customers.length === 0) {
    listDiv.innerHTML = '<p class="empty-msg">Koi Grahak nahi mila. ➕ button se add karein.</p>';
    return;
  }

  let html = '';
  for (const cust of customers) {
    const initial = cust.name.charAt(0).toUpperCase();
    const shiftLabel = cust.shift === 'subah' ? '🌅 Subah' : cust.shift === 'shaam' ? '🌇 Shaam' : '🔄 Dono';
    const milkIcon = cust.milkType === 'cow' ? '🐄' : '🐃';

    // Calculate due
    const custEntries = entries.filter(e => e.customerId === cust.id && e.status === 'delivered');
    const custBill = custEntries.reduce((s, e) => s + (e.quantity * e.rate), 0);
    const custPaid = payments.filter(p => p.customerId === cust.id).reduce((s, p) => s + p.amount, 0);
    const due = (cust.openingBalance || 0) + custBill - custPaid;

    html += `<div class="customer-card" onclick="openLedger(${cust.id})">
      <div class="cust-avatar">${initial}</div>
      <div class="cust-info">
        <div class="cust-card-name">${cust.name}</div>
        <div class="cust-card-meta">${milkIcon} ${shiftLabel} · ${cust.defaultQty}L · ${cust.mobile || 'No mobile'}</div>
      </div>
      <div class="cust-card-right">
        <div class="cust-card-rate">${rupees(cust.ratePerLitre)}/L</div>
        <div class="cust-card-due ${due > 0 ? 'has-due' : ''}">${due > 0 ? 'Baaki: ' + rupees(due) : 'Clear ✅'}</div>
      </div>
      <div class="cust-card-actions" onclick="event.stopPropagation()">
        <button class="icon-btn" onclick="openCustomerModal(${cust.id})" title="Edit">
          <span class="material-icons-round" style="font-size:18px;color:#1565C0">edit</span>
        </button>
        <button class="icon-btn" onclick="deleteCustomer(${cust.id})" title="Delete">
          <span class="material-icons-round" style="font-size:18px;color:#C62828">delete</span>
        </button>
      </div>
    </div>`;
  }
  listDiv.innerHTML = html;
}

// ===== EXPENSE MANAGEMENT =====
function openExpenseModal() {
  document.getElementById('form-expense').reset();
  document.getElementById('exp-date').value = todayStr();
  document.getElementById('exp-edit-id').value = '';
  openModal('modal-expense');
}

async function saveExpense(e) {
  e.preventDefault();
  const data = {
    date: document.getElementById('exp-date').value,
    category: document.getElementById('exp-category').value,
    amount: parseFloat(document.getElementById('exp-amount').value),
    note: document.getElementById('exp-note').value.trim()
  };

  const editId = document.getElementById('exp-edit-id').value;
  if (editId) {
    data.id = parseInt(editId);
    await dbPut('expenses', data);
    showToast('✅ Kharcha update ho gaya!');
  } else {
    await dbAdd('expenses', data);
    showToast('✅ Kharcha add ho gaya!');
  }

  closeModal('modal-expense');
  refreshExpenseView();
}

async function deleteExpense(id) {
  if (!confirm('Kya aap ye kharcha delete karna chahte hain?')) return;
  await dbDelete('expenses', id);
  showToast('🗑️ Kharcha delete ho gaya');
  refreshExpenseView();
}

async function refreshExpenseView() {
  const monthInput = document.getElementById('expense-month');
  const mk = monthInput.value; // YYYY-MM
  if (!mk) return;

  const expenses = await dbGetAll('expenses');
  const filtered = expenses.filter(e => e.date.startsWith(mk)).sort((a, b) => b.date.localeCompare(a.date));

  // Summary by category
  const catTotals = {};
  let total = 0;
  for (const exp of filtered) {
    catTotals[exp.category] = (catTotals[exp.category] || 0) + exp.amount;
    total += exp.amount;
  }

  const summaryDiv = document.getElementById('expense-summary');
  let sumHtml = `<div class="exp-sum-chip"><div class="exp-cat">KUL</div><div class="exp-amt">${rupees(total)}</div></div>`;
  for (const [cat, amt] of Object.entries(catTotals)) {
    sumHtml += `<div class="exp-sum-chip"><div class="exp-cat">${CATEGORY_LABELS[cat]}</div><div class="exp-amt">${rupees(amt)}</div></div>`;
  }
  summaryDiv.innerHTML = sumHtml;

  // List
  const listDiv = document.getElementById('expense-list');
  if (filtered.length === 0) {
    listDiv.innerHTML = '<p class="empty-msg">Is mahine koi kharcha nahi. ➕ button se add karein.</p>';
    return;
  }

  let html = '';
  for (const exp of filtered) {
    html += `<div class="expense-card">
      <div class="exp-icon ${exp.category}">${CATEGORY_ICONS[exp.category]}</div>
      <div class="exp-info">
        <div class="exp-card-cat">${CATEGORY_LABELS[exp.category]}</div>
        <div class="exp-card-note">${exp.note || '—'}</div>
      </div>
      <div class="exp-card-right">
        <div class="exp-card-amt">${rupees(exp.amount)}</div>
        <div class="exp-card-date">${formatDate(exp.date)}</div>
      </div>
      <button class="exp-del-btn" onclick="deleteExpense(${exp.id})">
        <span class="material-icons-round" style="font-size:18px">delete</span>
      </button>
    </div>`;
  }
  listDiv.innerHTML = html;
}

// ===== LEDGER / HISAAB =====
async function openLedger(custId) {
  currentLedgerCustomerId = custId;
  ledgerMonth = new Date();
  showView('ledger');
}

function ledgerPrevMonth() {
  ledgerMonth.setMonth(ledgerMonth.getMonth() - 1);
  refreshLedger();
}
function ledgerNextMonth() {
  ledgerMonth.setMonth(ledgerMonth.getMonth() + 1);
  refreshLedger();
}

async function refreshLedger() {
  if (!currentLedgerCustomerId) return;

  const cust = await dbGet('customers', currentLedgerCustomerId);
  if (!cust) return;

  // Header
  const shiftLabel = cust.shift === 'subah' ? '🌅 Subah' : cust.shift === 'shaam' ? '🌇 Shaam' : '🔄 Dono';
  const milkIcon = cust.milkType === 'cow' ? '🐄 Cow' : '🐃 Buffalo';
  document.getElementById('ledger-name').textContent = cust.name;
  document.getElementById('ledger-meta').textContent = `${milkIcon} | ${rupees(cust.ratePerLitre)}/L | ${shiftLabel}`;

  // Month label
  document.getElementById('ledger-month-label').textContent =
    MONTH_NAMES[ledgerMonth.getMonth()] + ' ' + ledgerMonth.getFullYear();

  const mk = monthKey(ledgerMonth);
  const entries = await dbGetAll('entries');
  const payments = await dbGetAll('payments');

  // This month's entries for this customer
  const monthEntries = entries.filter(e =>
    e.customerId === cust.id && e.date.startsWith(mk)
  ).sort((a, b) => a.date.localeCompare(b.date) || a.shift.localeCompare(b.shift));

  const deliveredEntries = monthEntries.filter(e => e.status === 'delivered');
  const totalLitres = deliveredEntries.reduce((s, e) => s + e.quantity, 0);
  const totalBill = deliveredEntries.reduce((s, e) => s + (e.quantity * e.rate), 0);
  const deliveryDays = new Set(deliveredEntries.map(e => e.date)).size;

  // This month's payments
  const monthPayments = payments.filter(p =>
    p.customerId === cust.id && p.date.startsWith(mk)
  ).sort((a, b) => a.date.localeCompare(b.date));
  const totalPaid = monthPayments.reduce((s, p) => s + p.amount, 0);

  // All-time due
  const allEntries = entries.filter(e => e.customerId === cust.id && e.status === 'delivered');
  const allBill = allEntries.reduce((s, e) => s + (e.quantity * e.rate), 0);
  const allPaid = payments.filter(p => p.customerId === cust.id).reduce((s, p) => s + p.amount, 0);
  const totalDue = (cust.openingBalance || 0) + allBill - allPaid;

  // Update summary cards
  document.getElementById('led-days').textContent = deliveryDays;
  document.getElementById('led-litres').textContent = totalLitres.toFixed(1) + ' L';
  document.getElementById('led-bill').textContent = rupees(totalBill);
  document.getElementById('led-paid').textContent = rupees(totalPaid);
  document.getElementById('led-due').textContent = rupees(totalDue);

  // Entries list
  const entriesDiv = document.getElementById('ledger-entries');
  if (monthEntries.length === 0) {
    entriesDiv.innerHTML = '<p class="empty-msg">Is mahine ki koi entry nahi.</p>';
  } else {
    let html = '';
    for (const e of monthEntries) {
      const isSkipped = e.status === 'skipped';
      const shiftIcon = e.shift === 'subah' ? '🌅' : '🌇';
      html += `<div class="led-entry-item ${isSkipped ? 'skipped' : ''}">
        <span class="led-e-date">${formatDate(e.date)}</span>
        <span class="led-e-shift">${shiftIcon}</span>
        <span class="led-e-qty">${isSkipped ? '❌ Chutti' : e.quantity + ' L'}</span>
        <span class="led-e-amt">${isSkipped ? '—' : rupees(e.quantity * e.rate)}</span>
      </div>`;
    }
    entriesDiv.innerHTML = html;
  }

  // Payments list
  const paymentsDiv = document.getElementById('ledger-payments');
  if (monthPayments.length === 0) {
    paymentsDiv.innerHTML = '<p class="empty-msg">Is mahine koi payment nahi.</p>';
  } else {
    let html = '';
    for (const p of monthPayments) {
      html += `<div class="led-pay-item">
        <span class="led-p-date">${formatDate(p.date)}</span>
        <span class="led-p-mode">${p.mode === 'cash' ? '💵 Cash' : '📱 UPI'}</span>
        <span class="led-p-amt">+${rupees(p.amount)}</span>
      </div>`;
    }
    paymentsDiv.innerHTML = html;
  }
}

// ===== PAYMENT =====
function openPaymentModal() {
  document.getElementById('form-payment').reset();
  document.getElementById('pay-date').value = todayStr();
  openModal('modal-payment');
}

async function savePayment(e) {
  e.preventDefault();
  const data = {
    customerId: currentLedgerCustomerId,
    date: document.getElementById('pay-date').value,
    amount: parseFloat(document.getElementById('pay-amount').value),
    mode: document.querySelector('input[name="pay-mode"]:checked').value,
    note: document.getElementById('pay-note').value.trim()
  };
  await dbAdd('payments', data);
  closeModal('modal-payment');
  showToast('✅ Payment jama ho gayi!');
  refreshLedger();
}

// ===== WHATSAPP BILL =====
async function sendWhatsAppBill() {
  const cust = await dbGet('customers', currentLedgerCustomerId);
  if (!cust) return;

  const mk = monthKey(ledgerMonth);
  const monthName = MONTH_NAMES[ledgerMonth.getMonth()] + ' ' + ledgerMonth.getFullYear();

  const entries = await dbGetAll('entries');
  const payments = await dbGetAll('payments');

  const monthEntries = entries.filter(e =>
    e.customerId === cust.id && e.date.startsWith(mk) && e.status === 'delivered'
  ).sort((a, b) => a.date.localeCompare(b.date));

  const totalLitres = monthEntries.reduce((s, e) => s + e.quantity, 0);
  const totalBill = monthEntries.reduce((s, e) => s + (e.quantity * e.rate), 0);
  const monthPayments = payments.filter(p => p.customerId === cust.id && p.date.startsWith(mk));
  const totalPaid = monthPayments.reduce((s, p) => s + p.amount, 0);

  // All-time due
  const allEntries = entries.filter(e => e.customerId === cust.id && e.status === 'delivered');
  const allBill = allEntries.reduce((s, e) => s + (e.quantity * e.rate), 0);
  const allPaid = payments.filter(p => p.customerId === cust.id).reduce((s, p) => s + p.amount, 0);
  const totalDue = (cust.openingBalance || 0) + allBill - allPaid;

  let msg = `🥛 *Smart Doodh Hisaab*\n`;
  msg += `━━━━━━━━━━━━━━━\n`;
  msg += `👤 *${cust.name}*\n`;
  msg += `📅 *${monthName} ka Hisaab*\n`;
  msg += `━━━━━━━━━━━━━━━\n\n`;

  // Daily details
  for (const e of monthEntries) {
    const shiftIcon = e.shift === 'subah' ? '🌅' : '🌇';
    msg += `${formatDate(e.date)} ${shiftIcon} → ${e.quantity}L × ₹${e.rate} = ₹${e.quantity * e.rate}\n`;
  }

  msg += `\n━━━━━━━━━━━━━━━\n`;
  msg += `📊 *Summary:*\n`;
  msg += `🥛 Kul Doodh: ${totalLitres.toFixed(1)} Litre\n`;
  msg += `💰 Kul Bill: ${rupees(totalBill)}\n`;
  msg += `✅ Jama: ${rupees(totalPaid)}\n`;
  msg += `━━━━━━━━━━━━━━━\n`;
  msg += `🔴 *Kul Baaki: ${rupees(totalDue)}*\n`;
  msg += `━━━━━━━━━━━━━━━\n\n`;
  msg += `_Smart Doodh Hisaab App se bheja gaya_ 🐄`;

  const phone = cust.mobile ? '91' + cust.mobile : '';
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

// ===== PRINT / PDF BILL =====
async function printBill() {
  const cust = await dbGet('customers', currentLedgerCustomerId);
  if (!cust) return;

  const mk = monthKey(ledgerMonth);
  const monthName = MONTH_NAMES[ledgerMonth.getMonth()] + ' ' + ledgerMonth.getFullYear();
  const entries = await dbGetAll('entries');
  const payments = await dbGetAll('payments');

  const monthEntries = entries.filter(e =>
    e.customerId === cust.id && e.date.startsWith(mk)
  ).sort((a, b) => a.date.localeCompare(b.date));

  const deliveredEntries = monthEntries.filter(e => e.status === 'delivered');
  const totalLitres = deliveredEntries.reduce((s, e) => s + e.quantity, 0);
  const totalBill = deliveredEntries.reduce((s, e) => s + (e.quantity * e.rate), 0);
  const monthPay = payments.filter(p => p.customerId === cust.id && p.date.startsWith(mk));
  const totalPaid = monthPay.reduce((s, p) => s + p.amount, 0);
  const allEntries = entries.filter(e => e.customerId === cust.id && e.status === 'delivered');
  const allBill = allEntries.reduce((s, e) => s + (e.quantity * e.rate), 0);
  const allPaid = payments.filter(p => p.customerId === cust.id).reduce((s, p) => s + p.amount, 0);
  const totalDue = (cust.openingBalance || 0) + allBill - allPaid;

  let rows = '';
  for (const e of monthEntries) {
    const shift = e.shift === 'subah' ? 'Subah' : 'Shaam';
    if (e.status === 'delivered') {
      rows += `<tr><td>${formatDate(e.date)}</td><td>${shift}</td><td>${e.quantity} L</td><td>₹${e.rate}</td><td>₹${e.quantity * e.rate}</td></tr>`;
    } else {
      rows += `<tr style="color:#C62828"><td>${formatDate(e.date)}</td><td>${shift}</td><td colspan="3">❌ Chutti</td></tr>`;
    }
  }

  let payRows = '';
  for (const p of monthPay) {
    payRows += `<tr><td>${formatDate(p.date)}</td><td>${p.mode === 'cash' ? 'Cash' : 'UPI'}</td><td>₹${p.amount}</td></tr>`;
  }

  const printWin = window.open('', '_blank');
  printWin.document.write(`<!DOCTYPE html><html><head><title>Bill - ${cust.name}</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; padding: 20px; max-width: 500px; margin: auto; }
    h1 { text-align: center; color: #1565C0; font-size: 1.3rem; }
    h2 { font-size: 1rem; border-bottom: 2px solid #1565C0; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 0.85rem; }
    th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #E3F2FD; font-weight: 700; }
    .summary { background: #FFF3E0; padding: 12px; border-radius: 8px; margin: 12px 0; }
    .summary p { margin: 4px 0; font-size: 0.9rem; }
    .due { font-size: 1.2rem; font-weight: 800; color: #C62828; text-align: center; margin: 12px 0; }
    .footer { text-align: center; color: #999; font-size: 0.75rem; margin-top: 20px; }
    @media print { body { padding: 10px; } }
  </style></head><body>
  <h1>🥛 Smart Doodh Hisaab</h1>
  <h2>👤 ${cust.name} — ${monthName}</h2>
  <p style="font-size:0.82rem;color:#666">${cust.milkType === 'cow' ? '🐄 Cow' : '🐃 Buffalo'} Milk | Rate: ₹${cust.ratePerLitre}/L</p>
  <table><thead><tr><th>Date</th><th>Shift</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
  ${payRows ? `<h2>💰 Payments</h2><table><thead><tr><th>Date</th><th>Mode</th><th>Amount</th></tr></thead><tbody>${payRows}</tbody></table>` : ''}
  <div class="summary">
    <p><strong>Kul Doodh:</strong> ${totalLitres.toFixed(1)} Litre</p>
    <p><strong>Kul Bill:</strong> ₹${totalBill}</p>
    <p><strong>Jama (Paid):</strong> ₹${totalPaid}</p>
  </div>
  <div class="due">Kul Baaki: ₹${totalDue}</div>
  <div class="footer">Smart Doodh Hisaab App se generate hua<br>${new Date().toLocaleString('hi-IN')}</div>
  <script>window.onload=function(){window.print()}<\/script>
  </body></html>`);
  printWin.document.close();
}

// ===== BACKUP & RESTORE =====
async function downloadBackupJSON() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    customers: await dbGetAll('customers'),
    entries: await dbGetAll('entries'),
    payments: await dbGetAll('payments'),
    expenses: await dbGetAll('expenses')
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `DoodhHisaab_Backup_${todayStr()}.json`);
  showToast('✅ JSON Backup download ho gaya!');
}

async function downloadBackupCSV() {
  const customers = await dbGetAll('customers');
  const entries = await dbGetAll('entries');
  const payments = await dbGetAll('payments');
  const expenses = await dbGetAll('expenses');

  let csv = '=== CUSTOMERS ===\n';
  csv += 'ID,Name,Mobile,Shift,MilkType,Rate,DefaultQty,OpeningBalance\n';
  for (const c of customers) {
    csv += `${c.id},"${c.name}",${c.mobile},${c.shift},${c.milkType},${c.ratePerLitre},${c.defaultQty},${c.openingBalance}\n`;
  }

  csv += '\n=== ENTRIES ===\n';
  csv += 'ID,CustomerID,Date,Shift,Quantity,Status,Rate\n';
  for (const e of entries) {
    csv += `${e.id},${e.customerId},${e.date},${e.shift},${e.quantity},${e.status},${e.rate}\n`;
  }

  csv += '\n=== PAYMENTS ===\n';
  csv += 'ID,CustomerID,Date,Amount,Mode,Note\n';
  for (const p of payments) {
    csv += `${p.id},${p.customerId},${p.date},${p.amount},${p.mode},"${p.note || ''}"\n`;
  }

  csv += '\n=== EXPENSES ===\n';
  csv += 'ID,Date,Category,Amount,Note\n';
  for (const e of expenses) {
    csv += `${e.id},${e.date},${e.category},${e.amount},"${e.note || ''}"\n`;
  }

  const blob = new Blob([csv], { type: 'text/csv' });
  downloadBlob(blob, `DoodhHisaab_Backup_${todayStr()}.csv`);
  showToast('✅ CSV Backup download ho gaya!');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function restoreBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!confirm('⚠️ Restore karne se pehle ka saara data replace ho jayega. Kya aap sure hain?')) {
    event.target.value = '';
    return;
  }

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data.customers || !data.entries) {
      showToast('❌ Invalid backup file!');
      return;
    }

    // Clear all stores
    await dbClear('customers');
    await dbClear('entries');
    await dbClear('payments');
    await dbClear('expenses');

    // Restore data
    for (const c of data.customers) await dbPut('customers', c);
    for (const e of data.entries) await dbPut('entries', e);
    for (const p of (data.payments || [])) await dbPut('payments', p);
    for (const x of (data.expenses || [])) await dbPut('expenses', x);

    showToast('✅ Backup restore ho gaya!');
    showView('dashboard');
  } catch (err) {
    showToast('❌ Backup restore fail: ' + err.message);
  }
  event.target.value = '';
}

async function clearAllData() {
  if (!confirm('⚠️ DANGER: Saara data permanently delete ho jayega!\n\nKya aap SURE hain?')) return;
  if (!confirm('LAST WARNING: Wapas nahi aa payega. Pehle backup le lein!')) return;

  await dbClear('customers');
  await dbClear('entries');
  await dbClear('payments');
  await dbClear('expenses');

  showToast('🗑️ Saara data delete ho gaya');
  showView('dashboard');
}

// ===== SEED DUMMY DATA =====
async function seedDummyData() {
  const existing = await dbGetAll('customers');
  if (existing.length > 0) return; // already has data

  const today = new Date();
  const yr = today.getFullYear();
  const mn = today.getMonth();

  // 4 sample customers
  const customers = [
    { name: 'Ramesh Kumar', mobile: '9876543210', shift: 'subah', milkType: 'cow', ratePerLitre: 60, defaultQty: 2, openingBalance: 500, createdAt: new Date().toISOString() },
    { name: 'Sunita Devi', mobile: '9988776655', shift: 'dono', milkType: 'buffalo', ratePerLitre: 80, defaultQty: 1.5, openingBalance: 0, createdAt: new Date().toISOString() },
    { name: 'Mohan Lal', mobile: '8877665544', shift: 'shaam', milkType: 'cow', ratePerLitre: 60, defaultQty: 1, openingBalance: 200, createdAt: new Date().toISOString() },
    { name: 'Priya Sharma', mobile: '7766554433', shift: 'subah', milkType: 'buffalo', ratePerLitre: 80, defaultQty: 2, openingBalance: 0, createdAt: new Date().toISOString() }
  ];

  const custIds = [];
  for (const c of customers) {
    const id = await dbAdd('customers', c);
    custIds.push(id);
  }

  // Generate entries for last 10 days
  for (let d = 10; d >= 1; d--) {
    const date = new Date(yr, mn, today.getDate() - d);
    const dateStr = date.toISOString().slice(0, 10);

    for (let i = 0; i < custIds.length; i++) {
      const cust = customers[i];
      const shifts = cust.shift === 'dono' ? ['subah', 'shaam'] : [cust.shift];
      for (const shift of shifts) {
        // 85% chance delivered, 15% chance skipped
        const delivered = Math.random() > 0.15;
        const qty = delivered ? cust.defaultQty + (Math.random() > 0.7 ? 0.5 : 0) : 0;
        await dbAdd('entries', {
          customerId: custIds[i],
          date: dateStr,
          shift: shift,
          quantity: qty,
          status: delivered ? 'delivered' : 'skipped',
          rate: cust.ratePerLitre
        });
      }
    }
  }

  // Sample payments
  const payDates = [
    new Date(yr, mn, today.getDate() - 8),
    new Date(yr, mn, today.getDate() - 3),
    new Date(yr, mn, today.getDate() - 5)
  ];
  await dbAdd('payments', { customerId: custIds[0], date: payDates[0].toISOString().slice(0,10), amount: 1000, mode: 'cash', note: 'Partial payment' });
  await dbAdd('payments', { customerId: custIds[1], date: payDates[1].toISOString().slice(0,10), amount: 2000, mode: 'upi', note: 'UPI se bheja' });
  await dbAdd('payments', { customerId: custIds[2], date: payDates[2].toISOString().slice(0,10), amount: 500, mode: 'cash', note: '' });

  // Sample expenses
  await dbAdd('expenses', { date: new Date(yr, mn, today.getDate() - 7).toISOString().slice(0,10), category: 'chara', amount: 3500, note: 'Sarson ki khali' });
  await dbAdd('expenses', { date: new Date(yr, mn, today.getDate() - 5).toISOString().slice(0,10), category: 'petrol', amount: 800, note: 'Delivery ka petrol' });
  await dbAdd('expenses', { date: new Date(yr, mn, today.getDate() - 3).toISOString().slice(0,10), category: 'dawai', amount: 1200, note: 'Gaay ka injection' });
  await dbAdd('expenses', { date: new Date(yr, mn, today.getDate() - 1).toISOString().slice(0,10), category: 'helper', amount: 5000, note: 'Helper ki salary' });

  console.log('✅ Dummy data seeded successfully!');
}

// ===== APP INITIALIZATION =====
async function initApp() {
  try {
    await openDB();
    console.log('✅ Database opened');

    // Seed dummy data if empty
    await seedDummyData();

    // Set default dates
    document.getElementById('entry-date').value = todayStr();
    const now = new Date();
    document.getElementById('expense-month').value = monthKey(now);

    // Set default shift based on time
    const hour = now.getHours();
    if (hour >= 14) {
      setShift('shaam');
    } else {
      setShift('subah');
    }

    // Add date change listener
    document.getElementById('entry-date').addEventListener('change', refreshEntryView);
    document.getElementById('expense-month').addEventListener('change', refreshExpenseView);

    // Show dashboard
    showView('dashboard');

    // Initialize Capacitor plugins if running inside native app
    initCapacitor();

    console.log('✅ App initialized successfully!');
  } catch (err) {
    console.error('❌ App init error:', err);
    showToast('❌ Error: ' + err.message);
  }
}

// ===== CAPACITOR INTEGRATION =====
// Works in both browser (gracefully skips) and native Android (activates plugins)
async function initCapacitor() {
  try {
    // Check if running inside Capacitor native shell
    if (!window.Capacitor || !window.Capacitor.isNativePlatform()) {
      console.log('ℹ️ Browser mode — Capacitor plugins skipped');
      return;
    }
    console.log('📱 Capacitor native platform detected');

    // Handle Android hardware back button
    const { App } = await import('https://cdn.jsdelivr.net/npm/@capacitor/app/+esm');
    if (App && App.addListener) {
      App.addListener('backButton', ({ canGoBack }) => {
        // Navigate back through views: ledger→customers, settings→dashboard, else dashboard
        const activeView = document.querySelector('.view.active');
        if (activeView) {
          const viewId = activeView.id;
          if (viewId === 'view-ledger') {
            showView('customers');
          } else if (viewId === 'view-settings') {
            showView('dashboard');
          } else if (viewId !== 'view-dashboard') {
            showView('dashboard');
          } else {
            // On dashboard, minimize app instead of closing
            App.minimizeApp();
          }
        }
      });
      console.log('✅ Back button handler registered');
    }

    // Set status bar color
    try {
      const { StatusBar } = await import('https://cdn.jsdelivr.net/npm/@capacitor/status-bar/+esm');
      if (StatusBar) {
        StatusBar.setBackgroundColor({ color: '#1565C0' });
        StatusBar.setStyle({ style: 'DARK' });
        console.log('✅ StatusBar configured');
      }
    } catch (e) {
      console.log('ℹ️ StatusBar plugin not available');
    }

  } catch (e) {
    // Not running in Capacitor — this is perfectly fine (browser mode)
    console.log('ℹ️ Capacitor init skipped:', e.message);
  }
}

// Start the app
document.addEventListener('DOMContentLoaded', initApp);

