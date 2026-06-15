// ══════════════════════════════════════
//  SHARED DATA & UTILITIES
// ══════════════════════════════════════

const today = new Date();
today.setHours(0, 0, 0, 0);

function addDays(days) {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const defaultAlerts = [
  { type: 'records', label: 'سجل', title: 'سجل موظف رقم 104 يحتاج تجديد', detail: 'تبقى يومان حتى انتهاء الصلاحية', priority: 'عالي', status: 'مستعجل', urgent: true, time: 'اليوم 10:30', expiryDate: addDays(2) },
  { type: 'subscriptions', label: 'اشتراك', title: 'اشتراك خدمة أساسية على وشك الانتهاء', detail: 'تبقى 3 أيام للتجديد', priority: 'متوسط', status: 'قريب', urgent: false, time: 'اليوم 12:15', expiryDate: addDays(3) },
  { type: 'residences', label: 'إقامة', title: 'إقامة مقيم رقم 221 ستنتهي خلال 5 أيام', detail: 'يجب مراجعة التمديد قبل الموعد', priority: 'حرج', status: 'يحتاج متابعة', urgent: true, time: 'غداً 09:00', expiryDate: addDays(5) },
  { type: 'records', label: 'سجل', title: 'سجل ملف مراجعة يحتاج تحديث', detail: 'تم إرفاق ملاحظات جديدة لم تُعتمد بعد', priority: 'منخفض', status: 'قيد المراجعة', urgent: false, time: 'الخميس 14:00', expiryDate: addDays(45) },
  { type: 'subscriptions', label: 'اشتراك', title: 'اشتراك الخدمة السحابية', detail: 'يحتاج تجديد شهري', priority: 'حرج', status: 'قريب', urgent: true, time: 'غداً 08:00', expiryDate: addDays(6) },
  { type: 'residences', label: 'إقامة', title: 'إقامة موظف رقم 88', detail: 'تجديد إقامة سنوية', priority: 'متوسط', status: 'قريب', urgent: false, time: 'هذا الأسبوع', expiryDate: addDays(20) },
];

const storageKey = 'alerts-admin-data';
const settingsKey = 'alerts-admin-settings';

let alerts = JSON.parse(localStorage.getItem(storageKey) || 'null') || defaultAlerts;

const defaultSettings = { notifBrowser: true, notifSound: true, notifDaily: true, notifSms: false, thresholdUrgent: 7, thresholdWarning: 15, thresholdLow: 30 };
let appSettings = JSON.parse(localStorage.getItem(settingsKey) || 'null') || { ...defaultSettings };

function saveAlerts() { localStorage.setItem(storageKey, JSON.stringify(alerts)); }
function saveSettings() { localStorage.setItem(settingsKey, JSON.stringify(appSettings)); }

function getRemainingDays(item) {
  if (!item.expiryDate) return 0;
  const expiry = new Date(item.expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diff = Math.ceil((expiry - today) / 86400000);
  return Math.max(diff, 0);
}

function calculatePriority(days) {
  if (days <= appSettings.thresholdUrgent) return 'عالي';
  if (days <= appSettings.thresholdWarning) return 'حرج';
  if (days <= appSettings.thresholdLow) return 'متوسط';
  return 'منخفض';
}

function getPriorityBadgeClass(priority) {
  if (priority === 'منخفض') return 'success';
  if (priority === 'متوسط') return '';
  if (priority === 'حرج') return 'warning';
  return 'urgent';
}

function getDaysPillClass(days) {
  if (days <= appSettings.thresholdUrgent) return 'urgent';
  if (days <= appSettings.thresholdWarning) return 'warning';
  return 'ok';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
}

function playExpirySound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.02, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {}
}

function notifyExpiryWarning() {
  if (!appSettings.notifBrowser) return;
  if (appSettings.notifSound) playExpirySound();
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification('تنبيه تجديد قريب', { body: 'يوجد عنصر أو أكثر يقترب من تاريخ التجديد.' });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(p => {
      if (p === 'granted') new Notification('تنبيه تجديد قريب', { body: 'يوجد عنصر أو أكثر يقترب من تاريخ التجديد.' });
    });
  }
}

// Build a single alert card HTML
function buildAlertCard(item, index, showActions = false) {
  const days = getRemainingDays(item);
  const pillClass = getDaysPillClass(days);
  const badgeClass = getPriorityBadgeClass(item.priority);
  const expiryStr = item.expiryDate ? formatDate(item.expiryDate) : item.time;
  const urgentClass = days <= appSettings.thresholdUrgent ? 'urgent-item' : '';
  const actionsHtml = showActions ? `
    <div class="manage-actions" style="margin-top:4px;">
      <button class="action-renew" data-renew="${index}">تجديد الآن</button>
      <button class="action-delete" data-delete="${index}">حذف</button>
    </div>` : '';
  return `
    <article class="alert-item ${urgentClass}">
      <div class="alert-top">
        <span class="alert-tag">${item.label}</span>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          <span class="badge ${badgeClass}">${item.priority}</span>
          <span class="days-pill ${pillClass}">${days} يوم</span>
        </div>
      </div>
      <strong style="font-size:0.97rem;">${item.title}</strong>
      <div class="alert-meta">${item.detail} • ينتهي: ${expiryStr}</div>
      ${actionsHtml}
    </article>`;
}

// Update sidebar urgent badge on all pages
function updateUrgentBadge() {
  const urgentCount = alerts.filter(a => getRemainingDays(a) <= appSettings.thresholdUrgent).length;
  document.querySelectorAll('.js-urgent-badge').forEach(el => {
    el.textContent = urgentCount;
    el.style.display = urgentCount > 0 ? 'inline-flex' : 'none';
  });
}

// Update sidebar summary
function updateSidebarSummary() {
  const el = document.getElementById('sidebarSummary');
  if (!el) return;
  const urgent = alerts.filter(a => getRemainingDays(a) <= appSettings.thresholdUrgent).length;
  const soon = alerts.filter(a => { const d = getRemainingDays(a); return d > appSettings.thresholdUrgent && d <= appSettings.thresholdLow; }).length;
  const total = alerts.length;
  el.innerHTML = `
    <li>${total} عنصر إجمالي في النظام</li>
    <li>${urgent} عنصر حرج (≤${appSettings.thresholdUrgent} أيام)</li>
    <li>${soon} عنصر يحتاج متابعة</li>`;
}

// ══════════════════════════════════════
//  PAGE: DASHBOARD
// ══════════════════════════════════════

function initDashboard() {
  // Date
  const dateEl = document.getElementById('todayDate');
  if (dateEl) dateEl.textContent = today.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Stats
  const critical = alerts.filter(a => getRemainingDays(a) <= appSettings.thresholdUrgent).length;
  const records = alerts.filter(a => a.type === 'records').length;
  const subs = alerts.filter(a => a.type === 'subscriptions').length;
  const res = alerts.filter(a => a.type === 'residences').length;

  document.getElementById('stat-critical').textContent = critical;
  document.getElementById('stat-records').textContent = records;
  document.getElementById('stat-subscriptions').textContent = subs;
  document.getElementById('stat-residences').textContent = res;

  // Expiry banner
  const expiring = alerts.filter(a => getRemainingDays(a) <= appSettings.thresholdLow);
  const banner = document.getElementById('expiringBanner');
  if (banner && expiring.length > 0) {
    document.getElementById('expiringBannerText').textContent = `${expiring.length} عنصر يقترب من تاريخ الانتهاء — يحتاج مراجعة فورية`;
    banner.style.display = 'flex';
    notifyExpiryWarning();
  }

  // Recent alerts (top 5 most urgent)
  const sorted = [...alerts].sort((a, b) => getRemainingDays(a) - getRemainingDays(b)).slice(0, 5);
  const recentEl = document.getElementById('recentAlerts');
  if (recentEl) {
    recentEl.innerHTML = sorted.length
      ? sorted.map((item, i) => buildAlertCard(item, i)).join('')
      : '<div class="empty-state"><p>لا توجد تنبيهات</p></div>';
  }

  // Upcoming timeline
  const timelineEl = document.getElementById('upcomingTimeline');
  if (timelineEl) {
    const upcoming = [...alerts].sort((a, b) => getRemainingDays(a) - getRemainingDays(b)).slice(0, 6);
    timelineEl.innerHTML = upcoming.map(item => {
      const days = getRemainingDays(item);
      const label = days === 0 ? 'اليوم' : days === 1 ? 'غداً' : `${days} يوم`;
      return `<li><strong>${label}</strong><span>${item.title}</span></li>`;
    }).join('') || '<li><span class="muted">لا توجد عناصر قادمة</span></li>';
  }

  // Summary
  const summaryEl = document.getElementById('summaryGrid');
  if (summaryEl) {
    const renewed = alerts.filter(a => a.status === 'تم التجديد').length;
    const total = alerts.length;
    const pct = total > 0 ? Math.round((renewed / total) * 100) : 0;
    summaryEl.innerHTML = `
      <div class="summary-item"><h4 style="color:var(--success)">${pct}%</h4><p>نسبة العناصر المجددة</p></div>
      <div class="summary-item"><h4 style="color:var(--primary)">${total}</h4><p>إجمالي العناصر</p></div>
      <div class="summary-item"><h4 style="color:var(--danger)">${critical}</h4><p>عناصر حرجة الآن</p></div>
      <div class="summary-item"><h4 style="color:var(--warning)">${expiring.length}</h4><p>تنتهي خلال ${appSettings.thresholdLow} يوماً</p></div>`;
  }

  // System status
  const statusEl = document.getElementById('systemStatus');
  if (statusEl) {
    statusEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;font-size:0.9rem;padding:8px 0;border-bottom:1px solid var(--border)">
        <span style="color:var(--muted)">آخر تحديث</span>
        <span>${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.9rem;padding:8px 0;border-bottom:1px solid var(--border)">
        <span style="color:var(--muted)">حالة النظام</span>
        <span style="color:var(--success)">● يعمل بشكل طبيعي</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.9rem;padding:8px 0;border-bottom:1px solid var(--border)">
        <span style="color:var(--muted)">الإشعارات</span>
        <span style="color:${appSettings.notifBrowser ? 'var(--success)' : 'var(--muted)'}">
          ${appSettings.notifBrowser ? '● مفعّلة' : '● معطّلة'}
        </span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.9rem;padding:8px 0;">
        <span style="color:var(--muted)">حد التحذير</span>
        <span>${appSettings.thresholdUrgent} أيام (حرج) — ${appSettings.thresholdLow} (منخفض)</span>
      </div>`;
  }
}

// ══════════════════════════════════════
//  PAGE: ALERTS
// ══════════════════════════════════════

function initAlerts() {
  let activeFilter = 'all';
  let warnedExpiry = false;

  const listEl = document.getElementById('alertList');
  const searchEl = document.getElementById('searchBox');
  const chipsEl = document.getElementById('filterChips');
  const lastSyncEl = document.getElementById('lastSync');
  const totalBadge = document.getElementById('totalCountBadge');
  const toggleFormBtn = document.getElementById('toggleFormBtn');
  const closeFormBtn = document.getElementById('closeFormBtn');
  const addAlertForm = document.getElementById('addAlertForm');
  const addAlertBtn = document.getElementById('addAlertBtn');
  const itemType = document.getElementById('itemType');
  const itemTitle = document.getElementById('itemTitle');
  const itemDetail = document.getElementById('itemDetail');
  const itemDate = document.getElementById('itemDate');
  const itemDays = document.getElementById('itemDays');
  const itemPriority = document.getElementById('itemPriority');
  const priorityHint = document.getElementById('priorityHint');

  function updatePriorityPreview() {
    if (!itemPriority) return;
    const expiry = itemDate?.value;
    const days = expiry ? getRemainingDays({ expiryDate: expiry }) : (Number(itemDays?.value) || 0);
    if (itemDays && expiry) itemDays.value = days;
    const priority = days > 0 ? calculatePriority(days) : 'عالي';
    itemPriority.value = priority;
    itemPriority.className = 'form-input';
    const map = { 'منخفض': 'priority-low', 'متوسط': 'priority-medium', 'حرج': 'priority-high', 'عالي': 'priority-urgent' };
    if (map[priority]) itemPriority.classList.add(map[priority]);
    if (priorityHint) priorityHint.textContent = expiry ? `متبقي ${days} يوم — ${formatDate(expiry)}` : `متبقي ${days} يوم`;
  }

  itemDate?.addEventListener('input', updatePriorityPreview);
  itemDays?.addEventListener('input', updatePriorityPreview);
  updatePriorityPreview();

  toggleFormBtn?.addEventListener('click', () => {
    if (addAlertForm) addAlertForm.style.display = addAlertForm.style.display === 'none' ? 'block' : 'none';
  });
  closeFormBtn?.addEventListener('click', () => { if (addAlertForm) addAlertForm.style.display = 'none'; });

  function renderAlerts() {
    const query = searchEl?.value.trim().toLowerCase() || '';
    const filtered = alerts.filter(item => {
      const matchText = item.title.toLowerCase().includes(query) || item.label.toLowerCase().includes(query) || item.detail.toLowerCase().includes(query);
      const matchCat = activeFilter === 'all' || item.type === activeFilter || (activeFilter === 'urgent' && getRemainingDays(item) <= appSettings.thresholdUrgent);
      return matchText && matchCat;
    });

    if (totalBadge) totalBadge.textContent = filtered.length;

    const expiring = alerts.filter(a => getRemainingDays(a) <= appSettings.thresholdLow);
    if (expiring.length && !warnedExpiry) { warnedExpiry = true; notifyExpiryWarning(); }
    if (!expiring.length) warnedExpiry = false;

    if (listEl) {
      listEl.innerHTML = filtered.length
        ? filtered.map((item, i) => buildAlertCard(item, alerts.indexOf(item))).join('')
        : `<div class="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            <p>لا توجد تنبيهات تطابق البحث الحالي</p>
           </div>`;
    }

    if (lastSyncEl) lastSyncEl.textContent = 'آخر تحديث: ' + new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  }

  searchEl?.addEventListener('input', renderAlerts);

  chipsEl?.addEventListener('click', e => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    activeFilter = btn.dataset.filter;
    chipsEl.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    renderAlerts();
  });

  addAlertBtn?.addEventListener('click', () => {
    const title = itemTitle?.value.trim();
    const detail = itemDetail?.value.trim();
    if (!title || !detail) { alert('يرجى ملء العنوان والوصف'); return; }
    const expiryDate = itemDate?.value || addDays(Number(itemDays?.value) || 3);
    const days = getRemainingDays({ expiryDate });
    const priority = calculatePriority(days);
    alerts.unshift({
      type: itemType?.value || 'records',
      label: itemType?.options[itemType.selectedIndex]?.text || 'سجل',
      title, detail, priority,
      status: days <= 2 ? 'مستعجل' : 'قريب',
      urgent: days <= appSettings.thresholdUrgent,
      time: `ينتهي ${formatDate(expiryDate)}`,
      expiryDate
    });
    saveAlerts();
    if (itemTitle) itemTitle.value = '';
    if (itemDetail) itemDetail.value = '';
    if (itemDate) itemDate.value = '';
    if (itemDays) itemDays.value = '3';
    if (addAlertForm) addAlertForm.style.display = 'none';
    updateUrgentBadge();
    updateSidebarSummary();
    renderAlerts();
  });

  renderAlerts();
}

// ══════════════════════════════════════
//  PAGE: CALENDAR
// ══════════════════════════════════════

function initCalendar() {
  let calDate = new Date(today);
  let selectedDate = null;

  const calGrid = document.getElementById('calGrid');
  const calLabel = document.getElementById('calMonthLabel');
  const calPrev = document.getElementById('calPrev');
  const calNext = document.getElementById('calNext');
  const calSelected = document.getElementById('calSelectedItems');
  const calSelectedDate = document.getElementById('calSelectedDate');
  const calDayAlerts = document.getElementById('calDayAlerts');
  const timelineGroups = document.getElementById('timelineGroups');

  const arabicMonths = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

  function getItemsForDate(dateStr) {
    return alerts.filter(a => a.expiryDate === dateStr);
  }

  function buildCalendar() {
    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    calLabel.textContent = `${arabicMonths[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();

    let cells = '';
    for (let i = firstDay - 1; i >= 0; i--) {
      cells += `<div class="cal-cell other-month"><span class="cal-day-num">${daysInPrev - i}</span></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dateStr === today.toISOString().slice(0, 10);
      const items = getItemsForDate(dateStr);
      const hasUrgent = items.some(a => getRemainingDays(a) <= appSettings.thresholdUrgent);
      const hasWarning = items.some(a => { const dd = getRemainingDays(a); return dd > appSettings.thresholdUrgent && dd <= appSettings.thresholdLow; });
      const isSelected = selectedDate === dateStr;
      let cls = 'cal-cell';
      if (isToday) cls += ' today';
      else if (hasUrgent) cls += ' has-urgent';
      else if (items.length) cls += ' has-items';
      if (isSelected) cls += ' selected';
      const dots = items.slice(0, 4).map(a => {
        const dd = getRemainingDays(a);
        const dotCls = dd <= appSettings.thresholdUrgent ? 'urgent' : dd <= appSettings.thresholdLow ? 'warning' : '';
        return `<span class="cal-dot ${dotCls}"></span>`;
      }).join('');
      cells += `<div class="${cls}" data-date="${dateStr}">
        <span class="cal-day-num">${d}</span>
        ${items.length ? `<div class="cal-dots">${dots}</div>` : ''}
      </div>`;
    }

    const remaining = 42 - firstDay - daysInMonth;
    for (let d = 1; d <= remaining && cells.split('cal-cell').length - 1 < 42; d++) {
      cells += `<div class="cal-cell other-month"><span class="cal-day-num">${d}</span></div>`;
    }

    calGrid.innerHTML = cells;
    calGrid.querySelectorAll('[data-date]').forEach(el => {
      el.addEventListener('click', () => {
        selectedDate = el.dataset.date;
        calGrid.querySelectorAll('.selected').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
        showDayAlerts(selectedDate);
      });
    });
  }

  function showDayAlerts(dateStr) {
    const items = getItemsForDate(dateStr);
    if (!items.length) { calSelected.style.display = 'none'; return; }
    calSelected.style.display = 'block';
    calSelectedDate.textContent = formatDate(dateStr);
    calDayAlerts.innerHTML = items.map((item, i) => buildAlertCard(item, alerts.indexOf(item))).join('');
  }

  function buildTimeline() {
    if (!timelineGroups) return;
    const groups = [
      { label: 'حرج — ينتهي خلال ' + appSettings.thresholdUrgent + ' أيام', cls: 'urgent', items: alerts.filter(a => getRemainingDays(a) <= appSettings.thresholdUrgent && getRemainingDays(a) > 0) },
      { label: 'تحذير — ينتهي خلال ' + appSettings.thresholdLow + ' يوماً', cls: 'warning', items: alerts.filter(a => { const d = getRemainingDays(a); return d > appSettings.thresholdUrgent && d <= appSettings.thresholdLow; }) },
      { label: 'مجدد أو متأخر', cls: '', items: alerts.filter(a => a.status === 'تم التجديد' || getRemainingDays(a) === 0) },
      { label: 'لاحقاً — أكثر من ' + appSettings.thresholdLow + ' يوم', cls: '', items: alerts.filter(a => getRemainingDays(a) > appSettings.thresholdLow) },
    ];

    timelineGroups.innerHTML = groups.filter(g => g.items.length > 0).map(g => `
      <div>
        <div class="section-title">
          <h3>${g.label}</h3>
          <span class="badge ${g.cls}">${g.items.length}</span>
        </div>
        <div class="alert-list">
          ${g.items.sort((a, b) => getRemainingDays(a) - getRemainingDays(b)).map(item => buildAlertCard(item, alerts.indexOf(item))).join('')}
        </div>
      </div>`).join('') || '<div class="empty-state"><p>لا توجد عناصر</p></div>';
  }

  calPrev?.addEventListener('click', () => { calDate.setMonth(calDate.getMonth() - 1); buildCalendar(); });
  calNext?.addEventListener('click', () => { calDate.setMonth(calDate.getMonth() + 1); buildCalendar(); });

  buildCalendar();
  buildTimeline();
}

// ══════════════════════════════════════
//  PAGE: MANAGE
// ══════════════════════════════════════

function initManage() {
  const manageList = document.getElementById('manageList');
  const manageCount = document.getElementById('manageCount');
  const addAlertBtn = document.getElementById('addAlertBtn');
  const resetDemoBtn = document.getElementById('resetDemoBtn');
  const itemType = document.getElementById('itemType');
  const itemTitle = document.getElementById('itemTitle');
  const itemDetail = document.getElementById('itemDetail');
  const itemDate = document.getElementById('itemDate');
  const itemDays = document.getElementById('itemDays');
  const itemPriority = document.getElementById('itemPriority');
  const priorityHint = document.getElementById('priorityHint');

  function updatePriorityPreview() {
    if (!itemPriority) return;
    const expiry = itemDate?.value;
    const days = expiry ? getRemainingDays({ expiryDate: expiry }) : (Number(itemDays?.value) || 0);
    if (itemDays && expiry) itemDays.value = days;
    const priority = days > 0 ? calculatePriority(days) : 'عالي';
    itemPriority.value = priority;
    itemPriority.className = 'form-input';
    const map = { 'منخفض': 'priority-low', 'متوسط': 'priority-medium', 'حرج': 'priority-high', 'عالي': 'priority-urgent' };
    if (map[priority]) itemPriority.classList.add(map[priority]);
    if (priorityHint) priorityHint.textContent = expiry ? `متبقي ${days} يوم — ينتهي ${formatDate(expiry)}` : `متبقي ${days} يوم`;
  }

  itemDate?.addEventListener('input', updatePriorityPreview);
  itemDate?.addEventListener('change', updatePriorityPreview);
  itemDays?.addEventListener('input', updatePriorityPreview);
  updatePriorityPreview();

  function renderManageList() {
    if (!manageList) return;
    if (manageCount) manageCount.textContent = alerts.length;
    manageList.innerHTML = alerts.length
      ? alerts.map((item, i) => {
          const days = getRemainingDays(item);
          const pillCls = getDaysPillClass(days);
          const badgeCls = getPriorityBadgeClass(item.priority);
          return `<article class="manage-item">
            <div class="manage-item-top">
              <strong>${item.title}</strong>
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <span class="badge">${item.label}</span>
                <span class="badge ${badgeCls}">${item.priority}</span>
                <span class="days-pill ${pillCls}">${days} يوم</span>
              </div>
            </div>
            <div class="alert-meta">${item.detail}</div>
            <div class="alert-meta">ينتهي: ${formatDate(item.expiryDate) || item.time}</div>
            <div class="manage-actions">
              <button class="action-renew" data-renew="${i}">تجديد الآن</button>
              <button class="action-delete" data-delete="${i}">حذف</button>
            </div>
          </article>`;
        }).join('')
      : '<div class="empty-state"><p>لا توجد عناصر محفوظة. أضف عنصراً جديداً.</p></div>';
  }

  manageList?.addEventListener('click', e => {
    const renewBtn = e.target.closest('[data-renew]');
    const deleteBtn = e.target.closest('[data-delete]');
    if (renewBtn) {
      const i = Number(renewBtn.dataset.renew);
      alerts[i].status = 'تم التجديد';
      alerts[i].urgent = false;
      alerts[i].time = 'تم التجديد';
      alerts[i].expiryDate = addDays(365);
      saveAlerts();
      updateUrgentBadge();
      updateSidebarSummary();
      renderManageList();
    }
    if (deleteBtn) {
      const i = Number(deleteBtn.dataset.delete);
      if (confirm(`هل تريد حذف "${alerts[i].title}"؟`)) {
        alerts.splice(i, 1);
        saveAlerts();
        updateUrgentBadge();
        updateSidebarSummary();
        renderManageList();
      }
    }
  });

  addAlertBtn?.addEventListener('click', () => {
    const title = itemTitle?.value.trim();
    const detail = itemDetail?.value.trim();
    if (!title || !detail) { alert('يرجى ملء العنوان والوصف'); return; }
    const expiryDate = itemDate?.value || addDays(Number(itemDays?.value) || 3);
    const days = getRemainingDays({ expiryDate });
    const priority = calculatePriority(days);
    alerts.unshift({
      type: itemType?.value || 'records',
      label: itemType?.options[itemType.selectedIndex]?.text || 'سجل',
      title, detail, priority,
      status: days <= 2 ? 'مستعجل' : 'قريب',
      urgent: days <= appSettings.thresholdUrgent,
      time: `ينتهي ${formatDate(expiryDate)}`,
      expiryDate
    });
    saveAlerts();
    if (itemTitle) itemTitle.value = '';
    if (itemDetail) itemDetail.value = '';
    if (itemDate) itemDate.value = '';
    if (itemDays) itemDays.value = '3';
    updatePriorityPreview();
    updateUrgentBadge();
    updateSidebarSummary();
    renderManageList();
  });

  resetDemoBtn?.addEventListener('click', () => {
    if (confirm('سيتم استبدال كل البيانات بالبيانات الافتراضية. هل تريد المتابعة؟')) {
      alerts = JSON.parse(JSON.stringify(defaultAlerts));
      saveAlerts();
      updateUrgentBadge();
      updateSidebarSummary();
      renderManageList();
    }
  });

  renderManageList();
}

// ══════════════════════════════════════
//  PAGE: SETTINGS
// ══════════════════════════════════════

function initSettings() {
  const fields = ['notifBrowser', 'notifSound', 'notifDaily', 'notifSms', 'thresholdUrgent', 'thresholdWarning', 'thresholdLow'];

  fields.forEach(key => {
    const el = document.getElementById(key);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!appSettings[key];
    else el.value = appSettings[key];
  });

  document.getElementById('saveSettingsBtn')?.addEventListener('click', () => {
    fields.forEach(key => {
      const el = document.getElementById(key);
      if (!el) return;
      appSettings[key] = el.type === 'checkbox' ? el.checked : Number(el.value) || el.value;
    });
    saveSettings();
    alert('تم حفظ الإعدادات بنجاح!');
  });

  document.getElementById('exportDataBtn')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ alerts, settings: appSettings }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alerts-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('importFile')?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.alerts && Array.isArray(data.alerts)) {
          alerts = data.alerts;
          saveAlerts();
          if (data.settings) { appSettings = { ...defaultSettings, ...data.settings }; saveSettings(); }
          alert(`تم الاستيراد بنجاح! ${alerts.length} عنصر.`);
          location.reload();
        } else { alert('الملف غير صالح'); }
      } catch { alert('خطأ في قراءة الملف'); }
    };
    reader.readAsText(file);
  });

  document.getElementById('resetDemoBtn')?.addEventListener('click', () => {
    if (confirm('هل تريد استعادة البيانات الافتراضية؟')) {
      alerts = JSON.parse(JSON.stringify(defaultAlerts));
      saveAlerts();
      alert('تم استعادة البيانات الافتراضية');
      updateInfoPanel();
    }
  });

  document.getElementById('clearAllBtn')?.addEventListener('click', () => {
    if (confirm('تحذير: سيتم حذف كل البيانات نهائياً. هل أنت متأكد؟')) {
      if (confirm('تأكيد أخير: حذف كل البيانات؟')) {
        alerts = [];
        saveAlerts();
        alert('تم حذف كل البيانات');
        updateInfoPanel();
      }
    }
  });

  function updateInfoPanel() {
    const lastUpdate = document.getElementById('lastUpdateDate');
    const totalItems = document.getElementById('totalItems');
    const storageSize = document.getElementById('storageSize');
    if (lastUpdate) lastUpdate.textContent = today.toLocaleDateString('ar-EG');
    if (totalItems) totalItems.textContent = alerts.length;
    if (storageSize) {
      const size = new Blob([localStorage.getItem(storageKey) || '']).size;
      storageSize.textContent = size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KB`;
    }
  }

  updateInfoPanel();
}

// ══════════════════════════════════════
//  INIT
// ══════════════════════════════════════

updateUrgentBadge();
updateSidebarSummary();

const pageId = document.body.id;
if (pageId === 'page-dashboard') initDashboard();
else if (pageId === 'page-alerts') initAlerts();
else if (pageId === 'page-calendar') initCalendar();
else if (pageId === 'page-manage') initManage();
else if (pageId === 'page-settings') initSettings();
