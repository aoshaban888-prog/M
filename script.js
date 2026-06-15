const today = new Date();
function addDays(days) {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const defaultAlerts = [
  {
    type: 'records',
    label: 'سجل',
    title: 'سجل موظف رقم 104 يحتاج تجديد',
    detail: 'تبقى 2 يوم حتى انتهاء الصلاحية',
    priority: 'عالي',
    status: 'مستعجل',
    urgent: true,
    time: 'اليوم 10:30',
    expiryDate: addDays(2)
  },
  {
    type: 'subscriptions',
    label: 'اشتراك',
    title: 'اشتراك خدمة أساسية على وشك الانتهاء',
    detail: 'تبقى 3 أيام للتجديد',
    priority: 'متوسط',
    status: 'قريب',
    urgent: false,
    time: 'اليوم 12:15',
    expiryDate: addDays(7)
  },
  {
    type: 'residences',
    label: 'إقامة',
    title: 'إقامة مقيم رقم 221 ستنتهي خلال 5 أيام',
    detail: 'يجب مراجعة التمديد قبل الموعد',
    priority: 'حرج',
    status: 'يحتاج متابعة',
    urgent: true,
    time: 'غداً 09:00',
    expiryDate: addDays(15)
  },
  {
    type: 'records',
    label: 'سجل',
    title: 'سجل ملف مراجعة قديم يحتاج تحديث',
    detail: 'تم إرفاق ملاحظات جديدة ولم يتم اعتمادها بعد',
    priority: 'منخفض',
    status: 'قيد المراجعة',
    urgent: false,
    time: 'الخميس 14:00',
    expiryDate: addDays(45)
  }
];

const storageKey = 'alerts-admin-data';
let alerts = JSON.parse(localStorage.getItem(storageKey) || 'null') || defaultAlerts;

function getRemainingDays(item) {
  if (item.expiryDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(item.expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diff = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }

  const matchedDays = String(item.time || '').match(/\b(\d+)\s*يوم/);
  return matchedDays ? Number(matchedDays[1]) : 0;
}

const list = document.getElementById('alertList');
const searchBox = document.getElementById('searchBox');
const chipGroup = document.getElementById('filterChips');
const lastSync = document.getElementById('lastSync');
const navLinks = document.querySelectorAll('.nav-link');
const manageList = document.getElementById('manageList');
const addAlertBtn = document.getElementById('addAlertBtn');
const resetDemoBtn = document.getElementById('resetDemoBtn');
const itemType = document.getElementById('itemType');
const itemTitle = document.getElementById('itemTitle');
const itemDetail = document.getElementById('itemDetail');
const itemPriority = document.getElementById('itemPriority');
const itemDays = document.getElementById('itemDays');
const priorityHint = document.getElementById('priorityHint');

function calculatePriority(daysLeft) {
  if (daysLeft <= 7) return 'عالي';
  if (daysLeft <= 15) return 'حرج';
  if (daysLeft <= 30) return 'متوسط';
  return 'منخفض';
}

function getRemainingDaysFromInput() {
  const expiryDate = itemDate.value;
  return expiryDate ? getRemainingDays({ expiryDate }) : (Number(itemDays.value) || 0);
}

function getInputPriority() {
  const daysLeft = getRemainingDaysFromInput();
  return daysLeft > 0 ? calculatePriority(daysLeft) : 'عالي';
}

function getPriorityTone(priority) {
  if (priority === 'منخفض') return 'priority-low';
  if (priority === 'متوسط') return 'priority-medium';
  if (priority === 'حرج') return 'priority-high';
  return 'priority-urgent';
}

function updatePriorityPreview() {
  if (!itemPriority) return;

  const expiryDate = itemDate.value;
  const remainingDays = getRemainingDaysFromInput();
  const priority = remainingDays > 0 ? calculatePriority(remainingDays) : 'عالي';

  if (itemDays && expiryDate) {
    itemDays.value = String(remainingDays);
  }

  itemPriority.value = priority;
  itemPriority.classList.remove('priority-low', 'priority-medium', 'priority-high', 'priority-urgent');
  itemPriority.classList.add(getPriorityTone(priority));

  if (priorityHint) {
    priorityHint.textContent = expiryDate
      ? `متبقي ${remainingDays} يوم حسب التاريخ ${new Date(expiryDate).toLocaleDateString('ar-EG')}`
      : `متبقي ${remainingDays} يوم حسب القيمة المدخلة`;
  }
}
const itemDate = document.getElementById('itemDate');

[itemDays, itemDate].forEach(input => {
  input?.addEventListener('input', updatePriorityPreview);
  input?.addEventListener('change', updatePriorityPreview);
});

let activeFilter = 'all';
let warnedAboutExpiry = false;

function playExpirySound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.25);

    gainNode.gain.setValueAtTime(0.02, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.35);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.35);
  } catch (error) {
    console.warn('تعذر تشغيل صوت التنبيه:', error);
  }
}

function notifyExpiryWarning() {
  if (!('Notification' in window) || Notification.permission === 'granted') {
    new Notification('تنبيه تجديد قريب', {
      body: 'يوجد عنصر أو أكثر يقترب من تاريخ التجديد خلال 30 يومًا.'
    });
    playExpirySound();
    return;
  }

  if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification('تنبيه تجديد قريب', {
          body: 'يوجد عنصر أو أكثر يقترب من تاريخ التجديد خلال 30 يومًا.'
        });
        playExpirySound();
      }
    });
  }
}

function saveAlerts() {
  localStorage.setItem(storageKey, JSON.stringify(alerts));
}

updatePriorityPreview();

function renderManageList() {
  manageList.innerHTML = alerts.map((item, index) => `
    <article class="manage-item">
      <div class="manage-item-top">
        <strong>${item.title}</strong>
        <span class="badge">${item.label} • ${item.priority}</span>
      </div>
      <div class="alert-meta">${item.detail}</div>
      <div class="alert-meta">متبقي: ${item.time}</div>
      <div class="manage-actions">
        <button class="action-renew" data-renew="${index}">تجديد الآن</button>
        <button class="action-delete" data-delete="${index}">حذف</button>
      </div>
    </article>
  `).join('');
}

function renderAlerts(filter = '', category = activeFilter) {
  const query = filter.trim().toLowerCase();
  const items = alerts.filter(item => {
    const matchText = item.title.toLowerCase().includes(query) ||
      item.label.toLowerCase().includes(query) ||
      item.detail.toLowerCase().includes(query);
    const matchCategory = category === 'all' ||
      (category === 'records' && item.type === 'records') ||
      (category === 'subscriptions' && item.type === 'subscriptions') ||
      (category === 'residences' && item.type === 'residences') ||
      (category === 'urgent' && item.urgent);
    return matchText && matchCategory;
  });

  const expiringBanner = document.getElementById('expiringBanner');
  const expiringItems = alerts.filter(item => getRemainingDays(item) <= 30);
  if (expiringBanner) {
    expiringBanner.style.display = expiringItems.length ? 'block' : 'none';
  }

  if (expiringItems.length && !warnedAboutExpiry) {
    warnedAboutExpiry = true;
    notifyExpiryWarning();
  }

  if (!expiringItems.length) {
    warnedAboutExpiry = false;
  }

  list.innerHTML = items.length
    ? items.map(item => {
        const remainingDays = getRemainingDays(item);
        const isExpiringSoon = remainingDays <= 30;
        const statusText = isExpiringSoon ? 'شارف على الانتهاء' : item.status;

        return `
          <article class="alert-item">
            <div class="alert-top">
              <span class="alert-tag">${item.label} • ${item.priority}</span>
              <span class="badge">${statusText}</span>
            </div>
            <strong>${item.title}</strong>
            <div class="alert-meta">${item.detail} • ${item.time}${isExpiringSoon ? ' • متبقي ' + remainingDays + ' يوم' : ''}</div>
          </article>
        `;
      }).join('')
    : '<p class="muted">لا يوجد تنبيهات تطابق البحث الحالي.</p>';

  if (lastSync) lastSync.textContent = 'آخر تحديث: ' + new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

searchBox?.addEventListener('input', (e) => renderAlerts(e.target.value));

function setActiveLink(id) {
  navLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === '#' + id);
  });
}

navLinks.forEach(link => {
  link.addEventListener('click', (event) => {
    const targetId = link.getAttribute('href')?.replace('#', '');
    const target = targetId ? document.getElementById(targetId) : null;
    if (!target) return;

    event.preventDefault();
    setActiveLink(targetId);
    history.replaceState(null, '', '#' + targetId);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

const sections = document.querySelectorAll('main section[id], article[id]');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      setActiveLink(entry.target.id);
    }
  });
}, { threshold: 0.35 });

sections.forEach(section => observer.observe(section));

chipGroup?.addEventListener('click', (e) => {
  const button = e.target.closest('button[data-filter]');
  if (!button) return;

  activeFilter = button.dataset.filter;
  document.querySelectorAll('#filterChips .chip').forEach(chip => chip.classList.remove('active'));
  button.classList.add('active');

  renderAlerts(searchBox?.value, activeFilter);
});

function addAlert() {
  const title = itemTitle.value.trim();
  const detail = itemDetail.value.trim();
  if (!title || !detail) return;

  const expiryDate = itemDate.value || new Date(Date.now() + (Number(itemDays.value) || 0) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const days = getRemainingDays({ expiryDate });
  const remainingDays = days;
  const priority = calculatePriority(remainingDays);
  const isExpiringSoon = remainingDays <= 30;
  const displayDate = new Date(expiryDate).toLocaleDateString('ar-EG');
  const dateValue = itemDate.value ? `ينتهي في ${displayDate}` : `متبقي ${days} يوم`;

  if (itemPriority) itemPriority.value = priority;

  alerts.unshift({
    type: itemType.value,
    label: itemType.options[itemType.selectedIndex].text,
    title,
    detail,
    priority,
    status: isExpiringSoon ? 'شارف على الانتهاء' : (days <= 2 ? 'مستعجل' : 'قريب'),
    urgent: isExpiringSoon || days <= 2,
    time: dateValue,
    expiryDate
  });

  saveAlerts();
  renderAll();
  itemTitle.value = '';
  itemDetail.value = '';
  itemDays.value = '3';
  itemDate.value = '';
}

function renewItem(index) {
  alerts[index].status = 'تم التجديد';
  alerts[index].urgent = false;
  alerts[index].time = 'تم التجديد الآن';
  saveAlerts();
  renderAll();
}

function deleteItem(index) {
  const confirmed = window.confirm('هل ترغب في تأكيد الحذف؟');

  if (!confirmed) {
    return;
  }

  alerts.splice(index, 1);
  saveAlerts();
  renderAll();
}

function renderAll() {
  renderAlerts(searchBox.value, activeFilter);
  renderManageList();
}

addAlertBtn.addEventListener('click', addAlert);
resetDemoBtn.addEventListener('click', () => {
  alerts = JSON.parse(JSON.stringify(defaultAlerts));
  saveAlerts();
  renderAll();
});

manageList.addEventListener('click', (e) => {
  const renewBtn = e.target.closest('[data-renew]');
  const deleteBtn = e.target.closest('[data-delete]');
  if (renewBtn) renewItem(Number(renewBtn.dataset.renew));
  if (deleteBtn) deleteItem(Number(deleteBtn.dataset.delete));
});

renderAll();
