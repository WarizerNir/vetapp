/* ==== ДАННЫЕ ==== */
/* =========================================================
   ВЕРСИОНИРОВАНИЕ СХЕМЫ ДАННЫХ
   =========================================================
   SCHEMA_VERSION — текущая версия структуры данных.
   При изменении структуры (новые поля, переименование) — поднять на 1.
*/

var SCHEMA_VERSION = 2;

function getSavedSchemaVersion() {
  var v = parseInt(localStorage.getItem('vet_schema_version'), 10);
  return isNaN(v) ? 1 : v;
}

function setSavedSchemaVersion(v) {
  localStorage.setItem('vet_schema_version', String(v));
}

/* Миграция данных со старой версии на текущую.
   Вызывается ОДИН раз при запуске приложения, если сохранённая версия < текущей. */
function migrateData(fromVersion) {
  console.log('Миграция данных с версии ' + fromVersion + ' на ' + SCHEMA_VERSION);

  // Версия 1 → 2: добавили birthDate, textBlocks, formatDose
  if (fromVersion < 2) {
    // patients: добавляем birthDate, если нет
    patients.forEach(function(p) {
      if (p.birthDate === undefined) p.birthDate = '';
    });

    // textBlocks: если ключа нет — создаём пустой массив
    if (!localStorage.getItem('vet_text_blocks')) {
      localStorage.setItem('vet_text_blocks', JSON.stringify([]));
    }
  }

  setSavedSchemaVersion(SCHEMA_VERSION);
  console.log('Миграция завершена. Версия: ' + SCHEMA_VERSION);
}
var patients = JSON.parse(localStorage.getItem('vet_patients') || '[]');
var drugs = JSON.parse(localStorage.getItem('vet_drugs') || '[]');
var notes = JSON.parse(localStorage.getItem('vet_notes') || '[]');
var appts = JSON.parse(localStorage.getItem('vet_appointments') || '[]');
var openDrugCats = JSON.parse(localStorage.getItem('vet_open_drug_cats') || '[]');
var openNoteCats = JSON.parse(localStorage.getItem('vet_open_note_cats') || '[]');

var templates = JSON.parse(localStorage.getItem('vet_templates') || '[]');
templates = templates.map(function(t) {
  return {
    id: t.id || Date.now() + Math.random(),
    name: t.name || '',
    type: t.type || 'appointment',
    drug: t.drug || '',
    complaint: t.complaint || '',
    anamnesis: t.anamnesis || '',
    exam: t.exam || '',
    diagnosis: t.diagnosis || '',
    treatment: t.treatment || '',
    recommendations: t.recommendations || '',
    note: t.note || ''
  };
});

var textBlocks = JSON.parse(localStorage.getItem('vet_text_blocks') || '[]');
textBlocks = textBlocks.map(function(t) {
  return {
    id: t.id || Date.now() + Math.random(),
    name: t.name || '',
    text: t.text || ''
  };
});

drugs = drugs.map(function(d) {
  return {
    id: d.id || Date.now() + Math.random(),
    name: d.name || '', category: d.category || '',
    doseDog: d.doseDog || d.dose || '', doseCat: d.doseCat || '', note: d.note || ''
  };
});
notes = notes.map(function(n) {
  return {
    id: n.id || Date.now() + Math.random(),
    title: n.title || '', category: n.category || '',
    body: n.body || n.content || ''
  };
});
appts = appts.map(function(a) {
  return {
    id: a.id || Date.now() + Math.random(),
    date: a.date || '', time: a.time || '',
    patientId: a.patientId || null, patientName: a.patientName || '',
    patientSpecies: a.patientSpecies || '', patientPhone: a.patientPhone || '',
    type: a.type || 'appointment', note: a.note || '',
    sourceRecordId: a.sourceRecordId || null
  };
});
patients = patients.map(function(p) {
  return {
    id: p.id || Date.now() + Math.random(),
    name: p.name || '', species: p.species || '',
    owner: p.owner || '', phone: p.phone || '',
    important: p.important || '',
    records: (p.records || []).map(function(r) {
      return {
        id: r.id || Date.now() + Math.random(),
        type: r.type || 'appointment', date: r.date || '',
        weight: r.weight || '', temperature: r.temperature || '',
        complaint: r.complaint || '', anamnesis: r.anamnesis || '',
        exam: r.exam || '', diagnosis: r.diagnosis || '',
        treatment: r.treatment || '', recommendations: r.recommendations || '',
        drug: r.drug || '', nextDate: r.nextDate || '', note: r.note || ''
      };
    })
  };
});

var currentSpecies = 'dog';
var openedPatientId = null;
var openedNoteId = null;
var calYear = null, calMonth = null, calSelectedDate = null;
var apptMode = 'base';

var ALL_TABS = ['home', 'calc', 'calendar', 'search', 'drugs', 'notes', 'stats', 'settings'];
var MOBILE_NAV = ['home', 'calc', 'calendar', 'search'];

var MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
var MONTHS_RU_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
var WEEKDAYS_RU = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];

var IPS_DRUGS = {
  lidocaine2: { name: 'Лидокаин 2%', unit: 'мкг/кг/мин', conc: 20000, dMin: 15, dMax: 50, dDef: 50, hint: 'Дозы 15–50 мкг/кг/мин. 20 мг/мл.' },
  lidocaine10: { name: 'Лидокаин 10%', unit: 'мкг/кг/мин', conc: 100000, dMin: 15, dMax: 50, dDef: 50, hint: 'Дозы 15–50 мкг/кг/мин. 100 мг/мл.' },
  domitor: { name: 'Домитор', unit: 'мкг/кг/ч', conc: 1000, dMin: 0.25, dMax: 1, dDef: 0.5, hint: 'Дозы 0.25–1 мкг/кг/ч.' },
  ddm01: { name: 'Дексмедетомидин 0.1', unit: 'мкг/кг/ч', conc: 100, dMin: 0.2, dMax: 2, dDef: 0.5, hint: 'Дозы 0.2–2 мкг/кг/ч.' },
  ddm05: { name: 'Дексмедетомидин 0.5', unit: 'мкг/кг/ч', conc: 500, dMin: 0.2, dMax: 2, dDef: 0.5, hint: 'Дозы 0.2–2 мкг/кг/ч.' },
  zoletil: { name: 'Золетил', unit: 'мг/кг/ч', conc: 100000, dMin: 0.1, dMax: 4, dDef: 0.2, hint: 'Кошки 0.1–0.3, собаки 0.3–0.5 мг/кг/ч.' },
  tramadol: { name: 'Трамадол', unit: 'мг/кг/ч', conc: 50000, dMin: 0.1, dMax: 0.3, dDef: 0.2, hint: 'Дозы 0.1–0.3 мг/кг/ч.' },
  cerucal: { name: 'Церукал', unit: 'мг/кг/ч', conc: 5000, dMin: 0.05, dMax: 0.2, dDef: 0.1, hint: 'Дозы 0.05–0.2 мг/кг/ч.' },
  noradrenaline: { name: 'Норадреналин', unit: 'мкг/кг/мин', conc: 2000, dMin: 0.05, dMax: 2, dDef: 0.1, hint: '0.05–2 мкг/кг/мин. Только с NaCl 0.9%!' },
  dopamine4: { name: 'Допамин 4%', unit: 'мкг/кг/мин', conc: 40000, dMin: 4, dMax: 10, dDef: 5, hint: '4–10 мкг/кг/мин. Только с NaCl 0.9%!' },
  dopamine05: { name: 'Допамин 0.5%', unit: 'мкг/кг/мин', conc: 5000, dMin: 4, dMax: 10, dDef: 5, hint: '4–10 мкг/кг/мин. Только с NaCl 0.9%!' },
  dobutamine: { name: 'Добутамин', unit: 'мкг/кг/мин', conc: 12500, dMin: 2, dMax: 20, dDef: 5, hint: '2–20 мкг/кг/мин.' }
};

function save() {
  localStorage.setItem('vet_patients', JSON.stringify(patients));
  localStorage.setItem('vet_drugs', JSON.stringify(drugs));
  localStorage.setItem('vet_notes', JSON.stringify(notes));
  localStorage.setItem('vet_appointments', JSON.stringify(appts));
  localStorage.setItem('vet_templates', JSON.stringify(templates));
  localStorage.setItem('vet_text_blocks', JSON.stringify(textBlocks));
}

function isDesktop() { return window.innerWidth >= 768; }

/* ==== УНИВЕРСАЛЬНАЯ МОДАЛКА ==== */
function openModal(title, bodyHtml, buttons) {
  document.getElementById('modalTitle').innerHTML = title + ' <button class="modal-close" onclick="closeModal()">×</button>';
  document.getElementById('modalBody').innerHTML = bodyHtml;
  var footer = document.getElementById('modalFooter');
  footer.innerHTML = '';
  if (buttons && buttons.length) {
    footer.style.display = '';
    buttons.forEach(function(b) {
      var btn = document.createElement('button');
      btn.className = b.className || 'modal-btn-primary';
      btn.textContent = b.text;
      btn.onclick = b.onClick;
      footer.appendChild(btn);
    });
  } else {
    footer.style.display = 'none';
  }
  attachTemplateButtonsToLabels();
  document.getElementById('modalOverlay').classList.add('show');
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
  document.getElementById('modalFooter').style.display = '';
}

/* =========================================================
   UNDO — отмена удаления (30 секунд)
   ========================================================= */
var undoState = null;       // { label, restore, timer }
var UNDO_TIMEOUT = 30000;   // 30 секунд

function showUndo(label, restoreFn) {
  // Если уже что-то висит — финализируем его перед новым
  if (undoState) {
    clearTimeout(undoState.timer);
    undoState = null;
  }

  var toast = document.getElementById('undoToast');
  var text = document.getElementById('undoText');
  if (!toast || !text) {
    // Если тоста нет — просто удаляем без отмены
    restoreFn();
    return;
  }

  text.textContent = label || 'Удалено';
  toast.classList.add('show');

  undoState = {
    label: label,
    restore: restoreFn,
    timer: setTimeout(function() {
      dismissUndo();
    }, UNDO_TIMEOUT)
  };
}

function confirmUndo() {
  if (!undoState) return;
  clearTimeout(undoState.timer);
  var restore = undoState.restore;
  undoState = null;
  var toast = document.getElementById('undoToast');
  if (toast) toast.classList.remove('show');
  if (typeof restore === 'function') restore();
}

function dismissUndo() {
  if (undoState) clearTimeout(undoState.timer);
  undoState = null;
  var toast = document.getElementById('undoToast');
  if (toast) toast.classList.remove('show');
}

/* ==== ТЕМА ==== */
function setTheme(mode) { localStorage.setItem('vet_theme', mode); applyTheme(mode); }
function applyTheme(mode) {
  var effective = mode;
  if (mode === 'system') effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', effective);
  ['light','dark','system'].forEach(function(m) {
    var btn = document.getElementById('theme-' + m);
    if (btn) btn.classList.toggle('active', m === mode);
  });
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
  var saved = localStorage.getItem('vet_theme') || 'system';
  if (saved === 'system') applyTheme('system');
});

/* ==== НАВИГАЦИЯ ==== */
var navStack = [];

function goHome() {
  if (navStack.length > 0) {
    var prev = navStack.pop();
    if (prev === 'search') {
      goTo('search');
      return;
    }
  }
  goTo('home');
}

function pushNav(from) {
  navStack = [from]; // держим только последний экран — глубину не копим
}
function goTo(tab) {
  document.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
  var target = document.getElementById('tab-' + tab);
  if (target) target.classList.add('active');

  var titles = {
    home: '🌿 VetApp', calc: '🧮 Калькулятор', calendar: '📅 Календарь',
    search: '🐾 Пациенты', drugs: '💊 Препараты',
    notes: '📋 Памятки', stats: '📊 Статистика', settings: '⚙️ Настройки'
  };
  document.getElementById('appTitle').textContent = titles[tab] || 'VetApp';

  var header = document.getElementById('appHeader');
  if (!isDesktop() && tab !== 'home') header.classList.add('show-back');
  else header.classList.remove('show-back');

  var nav = document.getElementById('bottomNav');
  if (isDesktop()) {
    nav.classList.add('show');
    ALL_TABS.forEach(function(t) {
      var btn = document.getElementById('nav-' + t);
      if (btn) btn.classList.toggle('active', t === tab);
    });
  } else {
    if (MOBILE_NAV.indexOf(tab) > -1) {
      nav.classList.add('show');
      MOBILE_NAV.forEach(function(t) {
        var btn = document.getElementById('nav-' + t);
        if (btn) btn.classList.toggle('active', t === tab);
      });
    } else nav.classList.remove('show');
  }

  window.scrollTo(0, 0);
  openedPatientId = null;
  openedNoteId = null;
  navStack = [];

  if (tab === 'search') renderSearch();
  if (tab === 'drugs') renderDrugs();
  if (tab === 'notes') renderNotes();
  if (tab === 'settings') { updateSettingsInfo(); renderTemplatesSettings(); renderTextBlocksSettings(); }
  if (tab === 'calc') { resetAllCalcs(); updateIpsForm(); updateFoodCoefs(); }
    if (tab === 'home') { updateStats(); renderPermBanner(); updateHeroStatus(); renderHomeVaccBlock(); renderHomeTodayBlock(); }
  if (tab === 'stats') renderStatsTab();
  if (tab === 'calendar') initCalendar();
}

function toggleAcc(id) { document.getElementById(id).classList.toggle('open'); }

function updateStats() {
  document.getElementById('statPatients').textContent = patients.length;
  document.getElementById('statDrugs').textContent = drugs.length;
  document.getElementById('statNotes').textContent = notes.length;
  document.getElementById('statAppts').textContent = appts.length;
  updateTodayBadges();
}

function updateTodayBadges() {
  var today = formatDate(new Date());
  var todayCount = appts.filter(function(a) { return a.date === today; }).length;
  var calBadge = document.getElementById('calendarBadge');
  var navBadge = document.getElementById('navCalendarBadge');
  if (todayCount > 0) {
    if (calBadge) { calBadge.textContent = todayCount; calBadge.style.display = 'flex'; }
    if (navBadge) { navBadge.textContent = todayCount; navBadge.style.display = 'flex'; }
  } else {
    if (calBadge) calBadge.style.display = 'none';
    if (navBadge) navBadge.style.display = 'none';
  }
}

/* ==== УВЕДОМЛЕНИЯ ==== */
function checkTodayApptsAndNotify() {
  var today = formatDate(new Date());
  var todayAppts = appts.filter(function(a) { return a.date === today; })
    .sort(function(a, b) { return (a.time || '').localeCompare(b.time || ''); });
  if (todayAppts.length === 0) return;
  var lastShown = localStorage.getItem('vet_notif_last_date');
  if (lastShown === today) return;
  localStorage.setItem('vet_notif_last_date', today);
  showNotifModal(todayAppts);
}

function showNotifModal(list) {
  var overlay = document.getElementById('notifOverlay');
  var listBox = document.getElementById('notifList');
  var sub = document.getElementById('notifSub');
  sub.textContent = list.length + ' записей на сегодня';
  listBox.innerHTML = list.map(function(a) {
    var typeLabels = { appointment: '📋 Приём', vaccination: '💉 Вакцинация', surgery: '🔪 Операция', other: '📌 Другое' };
    var typeCls = { appointment: '', vaccination: 'type-vax', surgery: 'type-surgery', other: 'type-other' };
    var meta = [];
    if (a.patientSpecies) meta.push(a.patientSpecies);
    if (a.patientPhone) meta.push('📞 ' + a.patientPhone);
    if (a.note) meta.push(a.note);
    return '<div class="notif-appt ' + (typeCls[a.type] || '') + '">' +
      '<div class="notif-time">' + (a.time || '?') + '</div>' +
      '<div class="notif-patient">' + (a.patientName || '—') + '</div>' +
      '<div class="notif-meta">' + (typeLabels[a.type] || '📋 Приём') + (meta.length ? ' • ' + meta.join(' • ') : '') + '</div>' +
      '</div>';
  }).join('');
  overlay.classList.add('show');
}

function closeNotif() {
  document.getElementById('notifOverlay').classList.remove('show');
}

function goToCalendarToday() {
  closeNotif();
  calSelectedDate = formatDate(new Date());
  goTo('calendar');
}

function requestNotificationPermission() {
  if (!('Notification' in window)) {
    alert('Этот браузер не поддерживает уведомления.');
    updatePermInfo();
    return;
  }
  Notification.requestPermission().then(function(perm) {
    updatePermInfo();
  });
}

function updatePermInfo() {
  var info = document.getElementById('permInfo');
  var btn = document.getElementById('permBtn');
  if (!info || !btn) return;
  if (!('Notification' in window)) {
    info.textContent = 'Статус: не поддерживается. Работает в APK.';
    btn.style.display = 'none';
    return;
  }
  var p = Notification.permission;
  if (p === 'granted') {
    info.textContent = '✅ Уведомления разрешены.';
    btn.textContent = '✅ Включены';
    btn.disabled = true;
    btn.style.opacity = '0.6';
  } else if (p === 'denied') {
    info.textContent = '❌ Запрещены в настройках браузера.';
    btn.textContent = '❌ Запрещено';
  } else {
    info.textContent = 'Статус: не запрошены.';
    btn.textContent = '🔔 Разрешить уведомления';
    btn.disabled = false;
    btn.style.opacity = '1';
  }
}

function renderPermBanner() {
  var box = document.getElementById('permBannerPlaceholder');
  if (!box) return;
  if (!('Notification' in window)) { box.innerHTML = ''; return; }
  if (Notification.permission === 'granted' || Notification.permission === 'denied') { box.innerHTML = ''; return; }
  box.innerHTML = '<div class="perm-banner"><div class="perm-text">🔔 Разреши уведомления — буду напоминать о записях.</div><button onclick="requestNotificationPermission()">Разрешить</button></div>';
}

/* ==== ГЛАВНАЯ: СТАТУС В ГЕРОЕ ==== */
function updateHeroStatus() {
  var el = document.getElementById('heroStatus');
  if (!el) return;

  var today = formatDate(new Date());
  var todayAppts = appts.filter(function(a) { return a.date === today; });

  if (todayAppts.length > 0) {
    el.innerHTML = 'Сегодня <strong>' + todayAppts.length + '</strong> ' +
      pluralAppts(todayAppts.length) + ' — вперёд!';
  } else {
    el.textContent = 'Что будем делать сегодня?';
  }
}

function pluralAppts(n) {
  var last = n % 10;
  var lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return 'приёмов';
  if (last === 1) return 'приём';
  if (last >= 2 && last <= 4) return 'приёма';
  return 'приёмов';
}

/* ==== БЛОК ВАКЦИНАЦИЙ НА ГЛАВНОЙ ==== */
function renderHomeVaccBlock() {
  var box = document.getElementById('homeVaccBlock');
  if (!box) return;

  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var overdue = [];
  var upcoming = [];

  patients.forEach(function(p) {
    (p.records || []).forEach(function(r) {
      if (r.type !== 'vaccination') return;
      var nextStr = calcNextVaccinationDate(r.date);
      if (!nextStr) return;
      var next = new Date(nextStr + 'T12:00:00');
      var daysLeft = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
      var item = {
        patientId: p.id,
        patientName: p.name || '—',
        owner: p.owner || '',
        drug: r.drug || '',
        nextDate: nextStr,
        daysLeft: daysLeft
      };
      if (daysLeft < 0) overdue.push(item);
      else if (daysLeft <= 30) upcoming.push(item);
    });
  });

  if (overdue.length === 0 && upcoming.length === 0) {
    box.innerHTML = '';
    return;
  }

  overdue.sort(function(a, b) { return a.daysLeft - b.daysLeft; });
  upcoming.sort(function(a, b) { return a.daysLeft - b.daysLeft; });

  var html = '<div class="vacc-block">';

  if (overdue.length > 0) {
    html += '<div class="vacc-header">⚠️ Просрочено: ' + overdue.length + '</div>';
    html += overdue.slice(0, 5).map(function(it) { return renderVaccRow(it, true); }).join('');
    if (overdue.length > 5) {
      html += '<div class="vacc-more">и ещё ' + (overdue.length - 5) + '...</div>';
    }
  }

  if (upcoming.length > 0) {
    html += '<div class="vacc-header vacc-header-soon">💉 Пора привить: ' + upcoming.length + '</div>';
    html += upcoming.slice(0, 5).map(function(it) { return renderVaccRow(it, false); }).join('');
    if (upcoming.length > 5) {
      html += '<div class="vacc-more">и ещё ' + (upcoming.length - 5) + '...</div>';
    }
  }

  html += '</div>';
  box.innerHTML = html;
}

/* ==== БЛОК «СЕГОДНЯ» НА ГЛАВНОЙ ==== */
function renderHomeTodayBlock() {
  var box = document.getElementById('homeTodayBlock');
  if (!box) return;

  var today = formatDate(new Date());
  var todayAppts = appts
    .filter(function(a) { return a.date === today; })
    .sort(function(a, b) { return (a.time || '').localeCompare(b.time || ''); });

  if (todayAppts.length === 0) {
    box.innerHTML = '';
    return;
  }

  var typeIcons = {
    appointment: '📋', vaccination: '💉',
    surgery: '🔪', other: '📌'
  };
  var typeLabels = {
    appointment: 'Приём', vaccination: 'Вакцинация',
    surgery: 'Операция', other: 'Другое'
  };

  var html = '<div class="today-block">' +
    '<div class="today-header">' +
      '<span>📅 Сегодня</span>' +
      '<span class="today-count">' + todayAppts.length + '</span>' +
    '</div>';

  html += todayAppts.slice(0, 5).map(function(a) {
    var name = a.patientName || '—';
    var meta = [];
    if (a.patientSpecies) meta.push(a.patientSpecies);
    if (a.note) meta.push(a.note);
    else meta.push(typeLabels[a.type] || 'Приём');
    return '<div class="today-row" onclick="goToCalendarTodayHome()">' +
      '<div class="today-time">' + (a.time || '—') + '</div>' +
      '<div class="today-body">' +
        '<div class="today-name">' + name + '</div>' +
        '<div class="today-meta">' + meta.join(' • ') + '</div>' +
      '</div>' +
      '<div class="today-type">' + (typeIcons[a.type] || '📋') + '</div>' +
    '</div>';
  }).join('');

  if (todayAppts.length > 5) {
    html += '<div class="today-more" onclick="goToCalendarTodayHome()">и ещё ' + (todayAppts.length - 5) + '... →</div>';
  }

  html += '</div>';
  box.innerHTML = html;
}

function goToCalendarTodayHome() {
  calSelectedDate = formatDate(new Date());
  goTo('calendar');
}

function renderVaccRow(it, isOverdue) {
  var daysText = isOverdue
    ? 'просрочено на ' + Math.abs(it.daysLeft) + ' дн.'
    : (it.daysLeft === 0 ? 'сегодня!' : 'через ' + it.daysLeft + ' дн.');
  var meta = [];
  if (it.owner) meta.push(it.owner);
  if (it.drug) meta.push(it.drug);
  return '<div class="vacc-row ' + (isOverdue ? 'overdue' : '') + '" onclick="openPatient(' + it.patientId + ', \'home\')">' +
    '<div class="vacc-row-main">' +
      '<div class="vacc-name">' + it.patientName + '</div>' +
      '<div class="vacc-meta">' + meta.join(' • ') + '</div>' +
    '</div>' +
    '<div class="vacc-row-side">' +
      '<div class="vacc-date">' + formatDateRu(it.nextDate) + '</div>' +
      '<div class="vacc-days">' + daysText + '</div>' +
    '</div>' +
  '</div>';
}
/* ==== СТАТИСТИКА ==== */
var statsViewYear = null;
var statsViewMonth = null;

function getMonthStats(year, month) {
  var prefix = year + '-' + String(month + 1).padStart(2, '0');

  var counts = { appointment: 0, vaccination: 0, surgery: 0, other: 0 };
  var total = 0;
  var patientsSet = {};

  patients.forEach(function(p) {
    (p.records || []).forEach(function(r) {
      if (!r.date || r.date.indexOf(prefix) !== 0) return;
      var t = r.type || 'appointment';
      if (counts[t] === undefined) counts[t] = 0;
      counts[t]++;
      total++;
      patientsSet[p.id] = true;
    });
  });

  var newPatients = 0;
  patients.forEach(function(p) {
    if (!p.id) return;
    var d = new Date(p.id);
    if (isNaN(d)) return;
    if (d.getFullYear() === year && d.getMonth() === month) newPatients++;
  });

  return {
    counts: counts,
    total: total,
    newPatients: newPatients,
    uniquePatients: Object.keys(patientsSet).length
  };
}

function renderStatsTab() {
  if (statsViewYear === null || statsViewMonth === null) {
    var now = new Date();
    statsViewYear = now.getFullYear();
    statsViewMonth = now.getMonth();
  }

  var box = document.getElementById('statsContent');
  if (!box) return;

  var cur = getMonthStats(statsViewYear, statsViewMonth);
  var prevDate = new Date(statsViewYear, statsViewMonth - 1, 1);
  var prev = getMonthStats(prevDate.getFullYear(), prevDate.getMonth());

  var isCurrentMonth = (function() {
    var n = new Date();
    return n.getFullYear() === statsViewYear && n.getMonth() === statsViewMonth;
  })();

  var html = '<div class="card">';

  html += '<div class="stats-month-nav">' +
    '<button onclick="statsPrevMonth()">‹</button>' +
    '<div class="stats-month-label">' + MONTHS_RU[statsViewMonth] + ' ' + statsViewYear + '</div>' +
    '<button onclick="statsNextMonth()" ' + (isCurrentMonth ? 'disabled style="opacity:0.3;cursor:default;"' : '') + '>›</button>' +
  '</div>';

  if (cur.total === 0 && cur.newPatients === 0) {
    html += '<div class="stats-empty">За этот месяц пока пусто</div>';
  } else {
    html += '<div class="stats-grid">' +
      '<div class="stats-cell"><div class="sc-num">' + cur.counts.appointment + '</div><div class="sc-label">📋 Приёмов</div></div>' +
      '<div class="stats-cell"><div class="sc-num">' + cur.counts.vaccination + '</div><div class="sc-label">💉 Вакцинаций</div></div>' +
      '<div class="stats-cell"><div class="sc-num">' + cur.counts.surgery + '</div><div class="sc-label">🔪 Операций</div></div>' +
      '<div class="stats-cell"><div class="sc-num">' + cur.counts.other + '</div><div class="sc-label">📌 Другое</div></div>' +
    '</div>';

    html += '<div class="stats-compare" style="margin-top:10px;">' +
      '🐾 Новых пациентов: <b>' + cur.newPatients + '</b><br>' +
      '👥 Всего пациентов в приёмах: <b>' + cur.uniquePatients + '</b><br>' +
      '📈 Всего записей: <b>' + cur.total + '</b>' +
    '</div>';
  }

  html += '</div>';

  html += '<div class="card">';
  html += '<div class="stats-section-title">' + MONTHS_RU[prevDate.getMonth()] + ' ' + prevDate.getFullYear() + '</div>';

  if (prev.total === 0 && prev.newPatients === 0) {
    html += '<div class="stats-empty">Нет данных</div>';
  } else {
    html += '<div class="stats-compare">' +
      '📋 ' + prev.counts.appointment + ' • ' +
      '💉 ' + prev.counts.vaccination + ' • ' +
      '🔪 ' + prev.counts.surgery + ' • ' +
      '📌 ' + prev.counts.other + '<br>' +
      '🐾 Новых пациентов: <b>' + prev.newPatients + '</b> • ' +
      '📈 Всего: <b>' + prev.total + '</b>' +
    '</div>';
  }
  html += '</div>';

  var totalPatients = patients.length;
  var totalRecords = 0;
  var totalByType = { appointment: 0, vaccination: 0, surgery: 0, other: 0 };
  patients.forEach(function(p) {
    (p.records || []).forEach(function(r) {
      totalRecords++;
      var t = r.type || 'appointment';
      if (totalByType[t] === undefined) totalByType[t] = 0;
      totalByType[t]++;
    });
  });

  html += '<div class="card">';
  html += '<div class="stats-section-title">Всего за всё время</div>';
  html += '<div class="stats-compare">' +
    '👥 Пациентов в базе: <b>' + totalPatients + '</b><br>' +
    '📈 Записей: <b>' + totalRecords + '</b><br>' +
    '📋 ' + totalByType.appointment + ' • ' +
    '💉 ' + totalByType.vaccination + ' • ' +
    '🔪 ' + totalByType.surgery + ' • ' +
    '📌 ' + totalByType.other +
  '</div>';
  html += '</div>';

  box.innerHTML = html;
}

function statsPrevMonth() {
  statsViewMonth--;
  if (statsViewMonth < 0) { statsViewMonth = 11; statsViewYear--; }
  renderStatsTab();
}

function statsNextMonth() {
  var now = new Date();
  if (statsViewYear === now.getFullYear() && statsViewMonth === now.getMonth()) return;
  statsViewMonth++;
  if (statsViewMonth > 11) { statsViewMonth = 0; statsViewYear++; }
  renderStatsTab();
}

/* ==== КАЛЕНДАРЬ ==== */
function initCalendar() {
  if (calYear === null || calMonth === null) {
    var now = new Date();
    calYear = now.getFullYear();
    calMonth = now.getMonth();
  }
  renderCalendar();
  renderDayPanel();
}

function calPrevMonth() { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); }
function calNextMonth() { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); }
function calGoToday() {
  var now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
  calSelectedDate = formatDate(now);
  renderCalendar();
  renderDayPanel();
}

function formatDate(d) {
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function renderCalendar() {
  document.getElementById('calMonthLabel').textContent = MONTHS_RU[calMonth] + ' ' + calYear;
  var grid = document.getElementById('calGrid');
  var today = formatDate(new Date());
  var firstDay = new Date(calYear, calMonth, 1);
  var lastDay = new Date(calYear, calMonth + 1, 0);
  var startWeekday = firstDay.getDay();
  if (startWeekday === 0) startWeekday = 7;
  startWeekday--;
  var daysInMonth = lastDay.getDate();
  var prevMonthLastDay = new Date(calYear, calMonth, 0).getDate();
  var html = '';
  var i;
  for (i = startWeekday - 1; i >= 0; i--) {
    html += '<div class="cal-day other-month">' + (prevMonthLastDay - i) + '</div>';
  }
  for (var d = 1; d <= daysInMonth; d++) {
    var dateStr = calYear + '-' + String(calMonth+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    var isToday = dateStr === today;
    var isSelected = dateStr === calSelectedDate;
    var count = appts.filter(function(a) { return a.date === dateStr; }).length;
    var dotsHtml = '';
    if (count > 0) {
      dotsHtml = '<div class="dots">';
      for (var k = 0; k < Math.min(count, 3); k++) dotsHtml += '<div class="dot"></div>';
      dotsHtml += '</div>';
    }
    var cls = 'cal-day';
    if (isToday) cls += ' today';
    if (isSelected) cls += ' selected';
    html += '<div class="' + cls + '" onclick="calSelectDay(\'' + dateStr + '\')">' + d + dotsHtml + '</div>';
  }
  var totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
  var nextDays = totalCells - (startWeekday + daysInMonth);
  for (var n = 1; n <= nextDays; n++) {
    html += '<div class="cal-day other-month">' + n + '</div>';
  }
  grid.innerHTML = html;
}

function calSelectDay(dateStr) {
  if (calSelectedDate === dateStr) calSelectedDate = null;
  else { calSelectedDate = dateStr; apptMode = 'base'; }
  renderCalendar();
  renderDayPanel();
}

function renderDayPanel() {
  var panel = document.getElementById('calDayPanel');
  if (!calSelectedDate) { panel.innerHTML = ''; return; }
  var dateObj = new Date(calSelectedDate + 'T12:00:00');
  var dayName = WEEKDAYS_RU[dateObj.getDay()];
  var title = dateObj.getDate() + ' ' + MONTHS_RU_GEN[dateObj.getMonth()] + ' ' + dateObj.getFullYear() + ', ' + dayName;
  var dayAppts = appts.filter(function(a) { return a.date === calSelectedDate; })
    .sort(function(a, b) { return (a.time || '').localeCompare(b.time || ''); });
  var apptsHtml = dayAppts.length === 0
    ? '<div class="appt-empty">Записей нет</div>'
    : dayAppts.map(function(a) { return renderApptCard(a); }).join('');
  var patientsOptions = patients.map(function(p) {
    return '<option value="' + p.id + '">' + p.name + (p.owner ? ' (' + p.owner + ')' : '') + (p.phone ? ' • ' + p.phone : '') + '</option>';
  }).join('');

  panel.innerHTML =
    '<div class="card">' +
      '<div class="cal-day-title">' + title + '</div>' +
      apptsHtml +
    '</div>' +
    '<div class="card">' +
      '<h3>➕ Новая запись</h3>' +
      '<div class="appt-form">' +
        '<h4>Записать на ' + dateObj.getDate() + ' ' + MONTHS_RU_GEN[dateObj.getMonth()] + '</h4>' +
        '<label>Время</label>' +
        '<input type="time" id="newApptTime" value="10:00" readonly onclick="openTimePicker(\'newApptTime\')">' +
        '<label>Пациент</label>' +
        '<div class="mode-switch">' +
          '<button id="mode-base" class="' + (apptMode === 'base' ? 'active' : '') + '" onclick="setApptMode(\'base\')">🐾 Из базы</button>' +
          '<button id="mode-manual" class="' + (apptMode === 'manual' ? 'active' : '') + '" onclick="setApptMode(\'manual\')">✏️ Новый</button>' +
        '</div>' +
        '<div id="apptBaseBlock" style="display:' + (apptMode === 'base' ? 'block' : 'none') + '">' +
          '<select id="newApptPatient"><option value="">— выбери пациента —</option>' + patientsOptions + '</select>' +
        '</div>' +
        '<div id="apptManualBlock" style="display:' + (apptMode === 'manual' ? 'block' : 'none') + '">' +
          '<label>Кличка / имя пациента *</label>' +
          '<input type="text" id="newApptPatientName" placeholder="Например, кот Джордж">' +
          '<label>Вид (необязательно)</label>' +
          '<input type="text" id="newApptPatientSpecies" placeholder="Кот / Собака">' +
          '<label>Телефон владельца (необязательно)</label>' +
          '<input type="tel" id="newApptPatientPhone" placeholder="+7...">' +
        '</div>' +
        '<label>Тип записи</label>' +
        '<select id="newApptType">' +
          '<option value="appointment">📋 Приём</option>' +
          '<option value="vaccination">💉 Вакцинация</option>' +
          '<option value="surgery">🔪 Операция</option>' +
          '<option value="other">📌 Другое</option>' +
        '</select>' +
        '<label>Заметка (необязательно)</label>' +
        '<input type="text" id="newApptNote" placeholder="Например, повторный осмотр">' +
        '<button class="btn" onclick="addAppt()">Записать</button>' +
      '</div>' +
    '</div>';
}

function setApptMode(mode) {
  apptMode = mode;
  document.getElementById('mode-base').classList.toggle('active', mode === 'base');
  document.getElementById('mode-manual').classList.toggle('active', mode === 'manual');
  document.getElementById('apptBaseBlock').style.display = mode === 'base' ? 'block' : 'none';
  document.getElementById('apptManualBlock').style.display = mode === 'manual' ? 'block' : 'none';
}

function renderApptCard(a) {
  var typeLabels = { appointment: '📋 Приём', vaccination: '💉 Вакцинация', surgery: '🔪 Операция', other: '📌 Другое' };
  var typeCls = { appointment: '', vaccination: 'type-vax', surgery: 'type-surgery', other: 'type-other' };
  var typeLabel = typeLabels[a.type] || '📋 Приём';
  var cls = typeCls[a.type] || '';
  var patientName = a.patientName || '—';
  var species = a.patientSpecies || '';
  var phone = a.patientPhone || '';
  if (a.patientId) {
    var p = patients.find(function(x) { return x.id == a.patientId; });
    if (p) { patientName = p.name; species = p.species || species; phone = p.phone || phone; }
  }
  var meta = [];
  if (species) meta.push(species);
  if (phone) meta.push('📞 ' + phone);
  return '<div class="appt-card ' + cls + '">' +
    '<div class="appt-time">' + (a.time || '—') + '</div>' +
    '<div class="appt-body">' +
      '<div class="appt-patient">' + patientName + '</div>' +
      '<div class="appt-type">' + typeLabel + (meta.length ? ' • ' + meta.join(' • ') : '') + '</div>' +
      (a.note ? '<div class="appt-note">' + a.note + '</div>' : '') +
    '</div>' +
    '<div class="appt-actions">' +
      '<button class="btn-edit" onclick="editAppt(' + a.id + ')" title="Изменить">✏️</button>' +
      '<button class="btn-del" onclick="deleteAppt(' + a.id + ')" title="Удалить">🗑</button>' +
    '</div>' +
  '</div>';
}

function addAppt() {
  var time = document.getElementById('newApptTime').value;
  if (!time) return alert('Укажи время');
  var type = document.getElementById('newApptType').value;
  var note = document.getElementById('newApptNote').value.trim();
  var patientId = null, patientName = '', patientSpecies = '', patientPhone = '';
  if (apptMode === 'base') {
    var pid = document.getElementById('newApptPatient').value;
    if (!pid) return alert('Выбери пациента из базы или переключись на «Новый»');
    var p = patients.find(function(x) { return x.id == pid; });
    if (!p) return alert('Пациент не найден');
    patientId = p.id; patientName = p.name; patientSpecies = p.species || ''; patientPhone = p.phone || '';
  } else {
    patientName = document.getElementById('newApptPatientName').value.trim();
    if (!patientName) return alert('Введи кличку пациента');
    patientSpecies = document.getElementById('newApptPatientSpecies').value.trim();
    patientPhone = document.getElementById('newApptPatientPhone').value.trim();
  }
  appts.push({
    id: Date.now(), date: calSelectedDate, time: time,
    patientId: patientId, patientName: patientName,
    patientSpecies: patientSpecies, patientPhone: patientPhone,
    type: type, note: note
  });
  save();
  updateStats();
  renderCalendar();
  renderDayPanel();
  scheduleApptNotification(appts[appts.length - 1]);
}

function editAppt(id) {
  var a = appts.find(function(x) { return x.id === id; });
  if (!a) return;

  var typeOptions =
    '<option value="appointment"' + (a.type === 'appointment' ? ' selected' : '') + '>📋 Приём</option>' +
    '<option value="vaccination"' + (a.type === 'vaccination' ? ' selected' : '') + '>💉 Вакцинация</option>' +
    '<option value="surgery"' + (a.type === 'surgery' ? ' selected' : '') + '>🔪 Операция</option>' +
    '<option value="other"' + (a.type === 'other' ? ' selected' : '') + '>📌 Другое</option>';

  var patientsOptions = '<option value="">— без привязки —</option>' + patients.map(function(p) {
    var sel = (a.patientId && p.id == a.patientId) ? ' selected' : '';
    return '<option value="' + p.id + '"' + sel + '>' + escapeHtml(p.name) + (p.owner ? ' (' + escapeHtml(p.owner) + ')' : '') + '</option>';
  }).join('');

  var body =
     '<label>Время *</label>' +
    '<input type="time" id="editApptTime" value="' + escapeAttr(a.time || '10:00') + '" readonly onclick="openTimePicker(\'editApptTime\')">' +
    '<label>Тип записи</label>' +
    '<select id="editApptType">' + typeOptions + '</select>' +
    '<label>Пациент из базы</label>' +
    '<select id="editApptPatient" onchange="onEditApptPatientChange()">' + patientsOptions + '</select>' +
    '<div id="editApptManualWrap" style="display:' + (a.patientId ? 'none' : 'block') + '">' +
      '<label>Или впиши имя вручную</label>' +
      '<input type="text" id="editApptName" value="' + escapeAttr(a.patientName || '') + '" placeholder="Кот Джордж">' +
      '<label>Вид</label>' +
      '<input type="text" id="editApptSpecies" value="' + escapeAttr(a.patientSpecies || '') + '" placeholder="Кот / Собака">' +
      '<label>Телефон владельца</label>' +
      '<input type="tel" id="editApptPhone" value="' + escapeAttr(a.patientPhone || '') + '" placeholder="+7...">' +
    '</div>' +
    '<label>Заметка</label>' +
    '<input type="text" id="editApptNote" value="' + escapeAttr(a.note || '') + '" placeholder="повторный осмотр">';

  openModal('✏️ Редактировать запись', body, [
    { text: 'Отмена', className: 'modal-btn-secondary', onClick: closeModal },
    { text: 'Сохранить', className: 'modal-btn-primary', onClick: function() { saveApptFromModal(id); } }
  ]);
}

function onEditApptPatientChange() {
  var sel = document.getElementById('editApptPatient');
  var wrap = document.getElementById('editApptManualWrap');
  wrap.style.display = sel.value ? 'none' : 'block';
}

function saveApptFromModal(id) {
  var a = appts.find(function(x) { return x.id === id; });
  if (!a) return;

  var time = document.getElementById('editApptTime').value;
  if (!time) return alert('Укажи время');

  var type = document.getElementById('editApptType').value;
  var note = document.getElementById('editApptNote').value.trim();
  var pid = document.getElementById('editApptPatient').value;

  if (pid) {
    var p = patients.find(function(x) { return x.id == pid; });
    if (!p) return alert('Пациент не найден');
    a.patientId = p.id;
    a.patientName = p.name || '';
    a.patientSpecies = p.species || '';
    a.patientPhone = p.phone || '';
  } else {
    var name = document.getElementById('editApptName').value.trim();
    if (!name) return alert('Впиши имя или выбери пациента из базы');
    a.patientId = null;
    a.patientName = name;
    a.patientSpecies = document.getElementById('editApptSpecies').value.trim();
    a.patientPhone = document.getElementById('editApptPhone').value.trim();
  }

  a.time = time;
  a.type = type;
  a.note = note;

  save();
  closeModal();
  renderCalendar();
  renderDayPanel();
  scheduleApptNotification(a);
}

function deleteAppt(id) {
  var a = appts.find(function(x) { return x.id === id; });
  if (!a) return;
  var backup = JSON.parse(JSON.stringify(a));

  cancelApptNotification(id);
  appts = appts.filter(function(x) { return x.id !== id; });
  save();
  updateStats();
  renderCalendar();
  renderDayPanel();

  showUndo('Запись в календаре удалена', function() {
    appts.push(backup);
    save();
    updateStats();
    renderCalendar();
    renderDayPanel();
    scheduleApptNotification(backup);
  });
}

/* ==== КАЛЬКУЛЯТОРЫ ==== */
function setSpecies(sp) {
  currentSpecies = sp;
  document.getElementById('sp-dog').classList.toggle('active', sp === 'dog');
  document.getElementById('sp-cat').classList.toggle('active', sp === 'cat');
  var drugName = document.getElementById('drugSearch').value.trim();
  var drug = drugs.find(function(d) { return d.name.toLowerCase() === drugName.toLowerCase(); });
  if (drug) applyDrugToForm(drug);
}

function showDrugAutocomplete() {
  var q = (document.getElementById('drugSearch').value || '').toLowerCase().trim();
  var box = document.getElementById('drugAutocomplete');
  if (!q) {
    var list = drugs.slice(0, 10);
    if (list.length === 0) { box.classList.remove('show'); return; }
    box.innerHTML = list.map(function(d) { return renderAcItem(d); }).join('');
    box.classList.add('show');
    return;
  }
  var filtered = drugs.filter(function(d) { return d.name.toLowerCase().indexOf(q) > -1; }).slice(0, 15);
  if (filtered.length === 0) { box.classList.remove('show'); return; }
  box.innerHTML = filtered.map(function(d) { return renderAcItem(d); }).join('');
  box.classList.add('show');
}
function renderAcItem(d) {
  var sub = [];
  if (d.doseDog) sub.push('🐕 ' + formatDose(d.doseDog));
  if (d.doseCat) sub.push('🐈 ' + formatDose(d.doseCat));
  return '<div class="item-ac" onclick="selectDrug(\'' + d.id + '\')">' +
    '<div class="ac-name">' + escapeHtml(d.name) + (d.category ? ' <span class="cat-label">' + escapeHtml(d.category) + '</span>' : '') + '</div>' +
    (sub.length ? '<div class="ac-sub">' + sub.join(' • ') + '</div>' : '') +
  '</div>';
}
function selectDrug(id) {
  var drug = drugs.find(function(d) { return d.id == id; });
  if (!drug) return;
  document.getElementById('drugSearch').value = drug.name;
  document.getElementById('drugAutocomplete').classList.remove('show');
  applyDrugToForm(drug);
}
/* Разбирает строку дозы. Возвращает { min, max, isRange, raw }
   Примеры: "12.5" -> {12.5, 12.5, false}; "0.1-0.2" -> {0.1, 0.2, true}
   Поддерживает дефис, тире, точку с запятой, "до". */
function parseDoseRange(v) {
  var raw = String(v || '').trim();
  if (!raw) return { min: NaN, max: NaN, isRange: false, raw: raw };

  var normalized = raw.replace(/,/g, '.').replace(/[–—−]/g, '-').replace(/\s+до\s+/i, '-');
  var parts = normalized.split('-').map(function(s) { return parseFloat(s.trim()); }).filter(function(n) { return !isNaN(n); });

  if (parts.length === 0) return { min: NaN, max: NaN, isRange: false, raw: raw };
  if (parts.length === 1) return { min: parts[0], max: parts[0], isRange: false, raw: raw };
  return { min: parts[0], max: parts[1], isRange: true, raw: raw };
}

function applyDrugToForm(drug) {
  var rawDose = currentSpecies === 'dog' ? drug.doseDog : drug.doseCat;
  var parsed = parseDoseRange(rawDose);

  var doseInput = document.getElementById('calcDose');
  var hint = document.getElementById('doseHint');

  if (!rawDose || isNaN(parsed.min)) {
    doseInput.value = '';
    hint.textContent = 'Доза для этого вида не указана. Введи вручную.';
    hint.classList.add('show');
    return;
  }

  // Подставляем нижнюю границу — безопаснее для расчёта.
  doseInput.value = parsed.min;

  if (parsed.isRange) {
    hint.textContent = 'Диапазон из базы: ' + formatDose(parsed.raw) + ' для ' +
      (currentSpecies === 'dog' ? 'собаки' : 'кошки') +
      '. Подставил нижнюю границу (' + parsed.min + ') — можешь заменить на верхнюю (' + parsed.max + ').';
  } else {
    hint.textContent = 'Доза из базы: ' + formatDose(parsed.raw) + ' для ' +
      (currentSpecies === 'dog' ? 'собаки' : 'кошки') + '.';
  }
  hint.classList.add('show');
}
document.addEventListener('click', function(e) {
  if (!e.target.closest('.autocomplete-wrap')) {
    var el = document.getElementById('drugAutocomplete');
    if (el) el.classList.remove('show');
  }
});

/* ==== АВТООЧИСТКА КАЛЬКУЛЯТОРОВ ==== */
var calcResetTimer = null;

function scheduleCalcReset() {
  if (calcResetTimer) clearTimeout(calcResetTimer);
  calcResetTimer = setTimeout(function() {
    resetAllCalcs();
  }, 60000); // 60 секунд
}

function resetAllCalcs() {
  var tab = document.getElementById('tab-calc');
  if (!tab) return;

  // Чистим все текстовые и числовые поля
  tab.querySelectorAll('input[type="number"], input[type="text"]').forEach(function(el) {
    el.value = '';
  });

  // Скрываем и обнуляем все результаты
  tab.querySelectorAll('.result').forEach(function(el) {
    el.textContent = '';
    el.classList.remove('show', 'error');
  });

  // Скрываем подсказки (кроме foodHint — он статичный)
  ['doseHint', 'ipsHint'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('show');
  });

  // Возвращаем вид к собаке
  currentSpecies = 'dog';
  var dogBtn = document.getElementById('sp-dog');
  var catBtn = document.getElementById('sp-cat');
  if (dogBtn) dogBtn.classList.add('active');
  if (catBtn) catBtn.classList.remove('active');

  calcResetTimer = null;
}

function calcByDrug() {
  var w = parseFloat(document.getElementById('calcWeight').value);
  var d = parseFloat(String(document.getElementById('calcDose').value).replace(',', '.'));
  var drugName = document.getElementById('drugSearch').value.trim();
  var res = document.getElementById('calcResult');
  if (!w || !d) { res.textContent = '⚠️ Заполни вес и дозу'; res.classList.add('show', 'error'); return; }
  var totalMg = w * d;
  var out = drugName ? drugName + ' • ' + (currentSpecies === 'dog' ? 'собака' : 'кошка') + '\n' : '';
  out += 'Доза: ' + d + ' мг/кг × ' + w + ' кг\n\n→ Нужно дать: ' + totalMg.toFixed(2) + ' мг';
  res.textContent = out;
  res.classList.add('show');
  res.classList.remove('error');
  scheduleCalcReset();
}
function updateIpsForm() {
  var key = document.getElementById('ipsDrug').value;
  var d = IPS_DRUGS[key];
  if (!d) return;
  document.getElementById('ipsHint').textContent = d.hint;
  document.getElementById('ipsHint').classList.add('show');
  document.getElementById('ipsDose').placeholder = d.dMin + '–' + d.dMax;
  document.getElementById('ipsDose').value = d.dDef;
}
function calcIps() {
  var key = document.getElementById('ipsDrug').value;
  var d = IPS_DRUGS[key];
  if (!d) return;
  var w = parseFloat(document.getElementById('ipsWeight').value);
  var dose = parseFloat(document.getElementById('ipsDose').value);
  var syringe = parseFloat(document.getElementById('ipsSyringe').value);
  var rate = parseFloat(document.getElementById('ipsRate').value);
  var res = document.getElementById('ipsResult');
  if (!w || !dose || !syringe || !rate) { res.textContent = '⚠️ Заполни все поля'; res.classList.add('show', 'error'); return; }
  var mcgPerHour;
  if (d.unit === 'мкг/кг/мин') mcgPerHour = dose * w * 60;
  else if (d.unit === 'мкг/кг/ч') mcgPerHour = dose * w;
  else if (d.unit === 'мг/кг/ч') mcgPerHour = dose * w * 1000;
  var mlPerHour = mcgPerHour / d.conc;
  var drugInSyringe = (syringe / rate) * mlPerHour;
  var out = d.name + '\nДоза: ' + dose + ' ' + d.unit + ' × ' + w + ' кг\n\n→ Препарата: ' + mlPerHour.toFixed(4) + ' мл/ч\n\nДля шприца ' + syringe + ' мл:\n→ Набрать ' + drugInSyringe.toFixed(4) + ' мл препарата\n→ Довести до ' + syringe + ' мл\n→ Скорость ' + rate + ' мл/ч';
  if (d.name.indexOf('Норадреналин') > -1 || d.name.indexOf('Допамин') > -1 || d.name.indexOf('Добутамин') > -1) out += '\n\n⚠️ Только с NaCl 0.9%!';
  res.textContent = out;
  res.classList.add('show');
  res.classList.remove('error');
  scheduleCalcReset();
}
function calcInf() {
  var w = parseFloat(document.getElementById('infWeight').value);
  var rate = parseFloat(document.getElementById('infRate').value);
  var drop = parseFloat(document.getElementById('infDrop').value);
  var res = document.getElementById('infResult');
  if (!w || !rate) { res.textContent = '⚠️ Заполни вес и скорость'; res.classList.add('show', 'error'); return; }
  var mlPerHour = w * rate;
  var out = 'Скорость: ' + mlPerHour.toFixed(2) + ' мл/ч\nЗа сутки: ' + (mlPerHour * 24).toFixed(0) + ' мл\n';
  if (drop) out += 'Капель/мин: ' + ((mlPerHour * drop) / 60).toFixed(0);
  res.textContent = out;
  res.classList.add('show');
  res.classList.remove('error');
  scheduleCalcReset();
}
function calcAlb() {
  var conc = parseFloat(document.getElementById('albConc').value);
  var current = parseFloat(document.getElementById('albCurrent').value);
  var target = parseFloat(document.getElementById('albTarget').value);
  var w = parseFloat(document.getElementById('albWeight').value);
  var time = parseFloat(document.getElementById('albTime').value);
  var res = document.getElementById('albResult');
  if (!current || !target || !w) { res.textContent = '⚠️ Заполни альбумин и вес'; res.classList.add('show', 'error'); return; }
  var k = conc === 20 ? 5 : 10;
  var volume = k * (target - current) * 0.3 * w;
  if (volume <= 0) { res.textContent = '⚠️ Целевой альбумин ниже текущего'; res.classList.add('show', 'error'); return; }
  var totalVolume = volume * 2;
  var rate = totalVolume / time;
  var out = 'Альбумин ' + conc + '%\n→ Альбумина: ' + volume.toFixed(1) + ' мл\n→ + NaCl 0.9%: ' + volume.toFixed(1) + ' мл\n→ Общий объём: ' + totalVolume.toFixed(1) + ' мл\n→ ИПС: ' + rate.toFixed(1) + ' мл/ч на ' + time + ' ч';
  if (conc === 20) out += '\n\n⚠️ В ПВК разводить 1:1!';
  res.textContent = out;
  res.classList.add('show');
  res.classList.remove('error');
  scheduleCalcReset();
}
function calcK() {
  var w = parseFloat(document.getElementById('kWeight').value);
  var level = parseFloat(document.getElementById('kLevel').value);
  var res = document.getElementById('kResult');
  if (!w || !level) { res.textContent = '⚠️ Заполни вес и калий'; res.classList.add('show', 'error'); return; }
  var hours;
  if (level <= 2.0) hours = 8;
  else if (level <= 2.5) hours = 7;
  else if (level <= 3.0) hours = 6;
  else if (level <= 3.5) hours = 4;
  else hours = 3;
  var totalVolume = 0.8 * w * hours;
  var rate = (totalVolume * 2) / hours;
  var out = 'Калий: ' + level + ' ммоль/л\n→ Время: ' + hours + ' ч\n→ Калия хлорида 4%: ' + totalVolume.toFixed(1) + ' мл\n→ + NaCl 0.9%: ' + totalVolume.toFixed(1) + ' мл\n→ ИПС: ' + rate.toFixed(1) + ' мл/ч\n\n⚠️ В ПВК разводить 1:1!';
  res.textContent = out;
  res.classList.add('show');
  res.classList.remove('error');
  scheduleCalcReset();
}
function calcBlood() {
  var w = parseFloat(document.getElementById('bWeight').value);
  var current = parseFloat(document.getElementById('bCurrent').value);
  var target = parseFloat(document.getElementById('bTarget').value);
  var res = document.getElementById('bloodResult');
  if (!w || !current || !target) { res.textContent = '⚠️ Заполни все поля'; res.classList.add('show', 'error'); return; }
  var diff = target - current;
  if (diff <= 0) { res.textContent = '⚠️ Целевой Ht ниже текущего'; res.classList.add('show', 'error'); return; }
  var volume = 2 * w * diff;
  res.textContent = 'Текущий Ht: ' + current + '%\nЦелевой Ht: ' + target + '%\nРазница: ' + diff + '%\n\n→ Цельная кровь: ' + volume.toFixed(0) + ' мл';
  res.classList.add('show');
  res.classList.remove('error');
  scheduleCalcReset();
}

/* ==== КАЛЬКУЛЯТОР КОРМА ==== */
var currentFoodSpecies = 'dog';

var FOOD_COEFS = {
  dog: [
    { v: 1.0, t: 'Похудение' },
    { v: 1.4, t: 'Пожилая / малоподвижная' },
    { v: 1.6, t: 'Взрослая стерилизованная' },
    { v: 1.8, t: 'Взрослая не стерилизованная' },
    { v: 2.0, t: 'Активная / щенок 4+ мес' },
    { v: 3.0, t: 'Рабочая / щенок 0–4 мес' },
    { v: 5.0, t: 'Лактация' }
  ],
  cat: [
    { v: 0.8, t: 'Похудение' },
    { v: 1.0, t: 'Пожилая / малоподвижная' },
    { v: 1.2, t: 'Взрослая стерилизованная' },
    { v: 1.4, t: 'Взрослая не стерилизованная' },
    { v: 1.6, t: 'Активная' },
    { v: 2.0, t: 'Котёнок 4+ мес' },
    { v: 2.5, t: 'Котёнок 0–4 мес' },
    { v: 5.0, t: 'Лактация' }
  ]
};

function setFoodSpecies(sp) {
  currentFoodSpecies = sp;
  var dogBtn = document.getElementById('food-dog');
  var catBtn = document.getElementById('food-cat');
  if (dogBtn) dogBtn.classList.toggle('active', sp === 'dog');
  if (catBtn) catBtn.classList.toggle('active', sp === 'cat');
  updateFoodCoefs();
}

function updateFoodCoefs() {
  var sel = document.getElementById('foodCoef');
  if (!sel) return;
  var list = FOOD_COEFS[currentFoodSpecies] || [];
  sel.innerHTML = list.map(function(c) {
    return '<option value="' + c.v + '">' + c.v + ' — ' + c.t + '</option>';
  }).join('');
}

function calcFood() {
  var w = parseFloat(document.getElementById('foodWeight').value);
  var k = parseFloat(document.getElementById('foodCoef').value);
  var kcal = parseFloat(document.getElementById('foodKcal').value);
  var res = document.getElementById('foodResult');

  if (!w || !k) {
    res.textContent = '⚠️ Заполни вес и коэффициент';
    res.classList.add('show', 'error');
    return;
  }

  var rer = 70 * Math.pow(w, 0.75);
  var mer = rer * k;

  var out = 'Вес: ' + w + ' кг\n' +
            'Коэффициент: ' + k + '\n\n' +
            'RER (энергия покоя): ' + rer.toFixed(1) + ' ккал/сут\n' +
            'MER (суточная потребность): ' + mer.toFixed(1) + ' ккал/сут';

  if (kcal && kcal > 0) {
    var grams = (mer * 100) / kcal;
    out += '\n\nПри калорийности ' + kcal + ' ккал/100 г:\n→ ' + grams.toFixed(0) + ' г корма в сутки';
  }

  res.textContent = out;
  res.classList.add('show');
  res.classList.remove('error');
  scheduleCalcReset();
}
/* ==== ПАЦИЕНТЫ ==== */
function savePatient() {
  var name = document.getElementById('pName').value.trim();
  if (!name) return alert('Введи кличку');
  var patient = {
    id: Date.now(),
    name: name,
    species: document.getElementById('pSpecies').value.trim(),
    birthDate: document.getElementById('pBirthDate').value,
    owner: document.getElementById('pOwner').value.trim(),
    phone: document.getElementById('pPhone').value.trim(),
    important: '',
    records: []
  };
  patients.push(patient);
  save();
  ['pName','pSpecies','pBirthDate','pOwner','pPhone'].forEach(function(id) {
    document.getElementById(id).value = '';
  });
  updateStats();
  renderSearch();
  alert('Пациент сохранён');
}

function renderSearch() {
  var q = (document.getElementById('searchPatient').value || '').toLowerCase().trim();
  var box = document.getElementById('searchList');
  var list = patients;
  if (q) {
    list = patients.filter(function(p) {
      return (p.name || '').toLowerCase().indexOf(q) > -1 ||
             (p.owner || '').toLowerCase().indexOf(q) > -1 ||
             (p.phone || '').toLowerCase().indexOf(q) > -1 ||
             (p.species || '').toLowerCase().indexOf(q) > -1;
    });
  }
   if (list.length === 0) {
    if (q) {
      box.innerHTML = '<div class="empty"><div class="empty-icon">🔍</div><div class="empty-title">Ничего не найдено</div><div class="empty-hint">Попробуй другое имя, телефон или вид</div></div>';
    } else {
      box.innerHTML = '<div class="empty"><div class="empty-icon">🐾</div><div class="empty-title">Пока никого нет</div><div class="empty-hint">Открой форму «➕ Новый пациент» выше и добавь первого</div></div>';
    }
    return;
  }
  box.innerHTML = list.map(function(p) {
    var impBadge = p.important ? ' <span class="badge" style="background:#ffcdd2;color:#c62828;">⚠️</span>' : '';
    return '<div class="item clickable" onclick="openPatient(' + p.id + ', \'search\')">' +
      '<div class="name">' + p.name + (p.species ? ' (' + p.species + ')' : '') + impBadge + '</div>' +
      '<div class="info">' + (p.owner || '') + (p.phone ? ' • ' + p.phone : '') + '</div>' +
      '<div class="sub">Записей: ' + (p.records || []).length + '</div>' +
      '<div class="open-hint">Нажми, чтобы открыть →</div>' +
    '</div>';
  }).join('');
}

function openPatient(id, from) {
  var patient = patients.find(function(p) { return p.id === id; });
  if (!patient) return;
  openedPatientId = id;
  openedNoteId = null;
  pushNav(from || 'home');
  document.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
  document.getElementById('tab-patient').classList.add('active');
  document.getElementById('bottomNav').classList.remove('show');
  document.getElementById('appHeader').classList.add('show-back');
  document.getElementById('appTitle').textContent = patient.name;
  window.scrollTo(0, 0);
  renderPatientCard();
}

function renderPatientCard() {
  var p = patients.find(function(x) { return x.id === openedPatientId; });
  if (!p) { goTo('search'); return; }
  var box = document.getElementById('patientContent');

  var importantHtml = '';
  if (p.important && p.important.trim()) {
    importantHtml = '<div class="important-banner">' +
      '<div class="imp-title">⚠️ ВАЖНО</div>' +
      '<div class="imp-text">' + escapeHtml(p.important) + '</div>' +
    '</div>';
  }

  var records = (p.records || []).slice().sort(function(a, b) {
    return (b.date || '').localeCompare(a.date || '');
  });
  var recordsHtml;
  if (records.length === 0) {
    recordsHtml = '<div class="empty">Записей нет. Нажми «➕ Добавить запись» ниже.</div>';
  } else {
    recordsHtml = records.map(function(r) { return renderRecordV2(r); }).join('');
  }

  box.innerHTML = importantHtml +
    '<div class="patient-header">' +
      '<div class="pname">' + p.name + '</div>' +
      '<div class="pmeta">' +
        (p.species ? '<b>Вид:</b> ' + escapeHtml(p.species) + '<br>' : '') +
        (p.birthDate ? '<b>Возраст:</b> ' + calcAge(p.birthDate) + ' <span style="color:var(--text-light);">(род. ' + formatDateRu(p.birthDate) + ')</span><br>' : '') +
        (p.owner ? '<b>Владелец:</b> ' + escapeHtml(p.owner) + '<br>' : '') +
        (p.phone ? '<b>Телефон:</b> ' + escapeHtml(p.phone) : '') +
      '</div>' +
      '<div class="inline-actions">' +
        (p.phone ? '<button class="btn btn-green btn-small" onclick="callPatient(\'' + escapeAttr(p.phone) + '\')">📞 Позвонить</button>' : '') +
        '<button class="btn btn-blue btn-small" onclick="openPatientEditModal()">✏️ Редактировать</button>' +
        '<button class="btn btn-red btn-small" onclick="openImportantModal()">⚠️ Важно</button>' +
      '</div>' +
    '</div>' +

    '<div class="card">' +
      '<h3>📅 История (' + records.length + ')</h3>' +
      recordsHtml +
    '</div>' +

    '<div class="card">' +
      '<button class="btn btn-green" onclick="openAddRecordModal()">➕ Добавить запись</button>' +
    '</div>' +

    '<div class="card"><h3>🗑 Удаление</h3><button class="btn btn-red" onclick="deletePatient(' + p.id + ')">Удалить пациента</button></div>';
}

function renderRecordV2(r) {
  var typeLabels = { appointment: '📋 Приём', vaccination: '💉 Вакцинация', surgery: '🔪 Операция', other: '📌 Другое' };
  var typeLabel = typeLabels[r.type] || '📋 Приём';
  var cls = '';
  if (r.type === 'vaccination') cls = 'type-vax';
  else if (r.type === 'surgery') cls = 'type-surgery';
  else if (r.type === 'other') cls = 'type-other';

  var rows = [];
  if (r.weight) rows.push('<div class="r-row"><span class="r-label">Вес:</span>' + r.weight + ' кг</div>');
  if (r.temperature) rows.push('<div class="r-row"><span class="r-label">Температура:</span>' + r.temperature + ' °C</div>');
  if (r.complaint) rows.push('<div class="r-row"><span class="r-label">Цель обращения:</span>' + escapeHtml(r.complaint) + '</div>');
  if (r.anamnesis) rows.push('<div class="r-row"><span class="r-label">Анамнез:</span>' + escapeHtml(r.anamnesis) + '</div>');
  if (r.exam) rows.push('<div class="r-row"><span class="r-label">Осмотр:</span>' + escapeHtml(r.exam) + '</div>');
  if (r.diagnosis) rows.push('<div class="r-row"><span class="r-label">Диагноз:</span>' + escapeHtml(r.diagnosis) + '</div>');
  if (r.treatment) rows.push('<div class="r-row"><span class="r-label">Лечение:</span>' + escapeHtml(r.treatment) + '</div>');
  if (r.recommendations) rows.push('<div class="r-row"><span class="r-label">Рекомендации:</span>' + escapeHtml(r.recommendations) + '</div>');

  if (r.type === 'vaccination') {
    if (r.drug) rows.push('<div class="r-row"><span class="r-label">Препарат:</span>' + escapeHtml(r.drug) + '</div>');
    var nextDate = calcNextVaccinationDate(r.date);
    if (nextDate) {
      var daysLeft = Math.ceil((new Date(nextDate) - new Date()) / (1000 * 60 * 60 * 24));
      var badge = '';
      if (daysLeft < 0) badge = ' <span class="badge" style="background:#ffcdd2;color:#c62828;">Просрочено</span>';
      else if (daysLeft < 30) badge = ' <span class="badge">Через ' + daysLeft + ' дн.</span>';
      rows.push('<div class="r-row"><span class="r-label">Следующая:</span>' + nextDate + badge + '</div>');
    }
  }

  if (r.note) rows.push('<div class="r-row"><span class="r-label">Заметка:</span>' + escapeHtml(r.note) + '</div>');

  return '<div class="record-v2 ' + cls + '">' +
    '<div class="r-head">' +
      '<div class="r-type">' + typeLabel + '</div>' +
      '<div class="r-date">' + (r.date || '—') + '</div>' +
    '</div>' +
    rows.join('') +
    '<div class="r-actions">' +
      '<button class="btn-share-r" onclick="shareRecordToOwner(' + r.id + ')">📤 Владельцу</button>' +
      '<button class="btn-edit-r" onclick="openEditRecordModal(' + r.id + ')">✏️ Изменить</button>' +
      '<button class="btn-del-r" onclick="deleteRecord(' + r.id + ')">🗑 Удалить</button>' +
    '</div>' +
  '</div>';
}

/* ==== МОДАЛКА: РЕДАКТИРОВАНИЕ ПАЦИЕНТА ==== */
function openPatientEditModal() {
  var p = patients.find(function(x) { return x.id === openedPatientId; });
  if (!p) return;
  var body =
    '<label>Кличка *</label><input type="text" id="epName" value="' + escapeAttr(p.name || '') + '">' +
    '<label>Вид</label><input type="text" id="epSpecies" value="' + escapeAttr(p.species || '') + '">' +
        '<label>Дата рождения</label><input type="date" id="epBirthDate" value="' + escapeAttr(p.birthDate || '') + '" readonly onclick="openDatePicker(\'epBirthDate\')">' +
    '<label>Владелец</label><input type="text" id="epOwner" value="' + escapeAttr(p.owner || '') + '">' +
    '<label>Телефон</label><input type="tel" id="epPhone" value="' + escapeAttr(p.phone || '') + '">';
  openModal('✏️ Редактировать пациента', body, [
    { text: 'Отмена', className: 'modal-btn-secondary', onClick: closeModal },
    { text: 'Сохранить', className: 'modal-btn-primary', onClick: savePatientFromModal }
  ]);
}

function savePatientFromModal() {
  var p = patients.find(function(x) { return x.id === openedPatientId; });
  if (!p) return;
  var name = document.getElementById('epName').value.trim();
  if (!name) return alert('Кличка не может быть пустой');
  p.name = name;
  p.species = document.getElementById('epSpecies').value.trim();
  p.birthDate = document.getElementById('epBirthDate').value;
  p.owner = document.getElementById('epOwner').value.trim();
  p.phone = document.getElementById('epPhone').value.trim();
  save();
  document.getElementById('appTitle').textContent = p.name;
  closeModal();
  renderPatientCard();
  renderSearch();
}

/* ==== МОДАЛКА: ВАЖНО ==== */
function openImportantModal() {
  var p = patients.find(function(x) { return x.id === openedPatientId; });
  if (!p) return;
  var body =
    '<p style="font-size:13px;color:var(--text-dim);margin-bottom:8px;">Аллергии, особенности, характер, хронические болячки — всё, что важно помнить всегда.</p>' +
    '<textarea id="impText" rows="6" placeholder="Например: аллергия на лидокаин; агрессивный, боится намордника...">' + escapeHtml(p.important || '') + '</textarea>';
  openModal('⚠️ Важно про пациента', body, [
    { text: 'Отмена', className: 'modal-btn-secondary', onClick: closeModal },
    { text: 'Сохранить', className: 'modal-btn-primary', onClick: saveImportant }
  ]);
}

function saveImportant() {
  var p = patients.find(function(x) { return x.id === openedPatientId; });
  if (!p) return;
  p.important = document.getElementById('impText').value.trim();
  save();
  closeModal();
  renderPatientCard();
  renderSearch();
}

/* ==== ШАБЛОНЫ ЗАПИСЕЙ ==== */
function applyTemplateToAddForm(templateId) {
  if (!templateId) return;
  var t = templates.find(function(x) { return x.id == templateId; });
  if (!t) return;
  if (t.type) {
    var recType = document.getElementById('recType');
    if (recType) { recType.value = t.type; toggleRecTypeFields(); }
  }
  var map = {
    recDrug: t.drug,
    recComplaint: t.complaint,
    recAnamnesis: t.anamnesis,
    recExam: t.exam,
    recDiagnosis: t.diagnosis,
    recTreatment: t.treatment,
    recRecommendations: t.recommendations,
    recNote: t.note
  };
  Object.keys(map).forEach(function(id) {
    var el = document.getElementById(id);
    if (el && map[id]) el.value = map[id];
  });
}

function applyTemplateToEditForm(templateId) {
  if (!templateId) return;
  var t = templates.find(function(x) { return x.id == templateId; });
  if (!t) return;
  if (t.type) {
    var recType = document.getElementById('recType');
    if (recType) { recType.value = t.type; toggleRecTypeFields(); }
  }
  var map = {
    recDrug: t.drug,
    recComplaint: t.complaint,
    recAnamnesis: t.anamnesis,
    recExam: t.exam,
    recDiagnosis: t.diagnosis,
    recTreatment: t.treatment,
    recRecommendations: t.recommendations,
    recNote: t.note
  };
  Object.keys(map).forEach(function(id) {
    var el = document.getElementById(id);
    if (el && map[id]) el.value = map[id];
  });
}

function renderTemplatesSettings() {
  var box = document.getElementById('templatesList');
  if (!box) return;
  if (templates.length === 0) {
    box.innerHTML = '<div class="empty"><div class="empty-icon">💾</div><div class="empty-title">Шаблонов пока нет</div><div class="empty-hint">Создай первый — приём или вакцинация заполнятся в один тап</div></div>';
    return;
  }
  var typeLabels = { appointment: '📋', vaccination: '💉', surgery: '🔪', other: '📌' };
  box.innerHTML = templates.map(function(t) {
    var preview = t.treatment || t.recommendations || t.diagnosis || '';
    if (preview.length > 70) preview = preview.substring(0, 70) + '...';
    return '<div class="item">' +
      '<div class="name">' + (typeLabels[t.type] || '📋') + ' ' + escapeHtml(t.name) + '</div>' +
      (preview ? '<div class="sub">' + escapeHtml(preview) + '</div>' : '') +
      '<button class="btn btn-small btn-blue" onclick="openTemplateModal(' + t.id + ')">Изменить</button>' +
      '<button class="btn btn-small btn-red" onclick="deleteTemplate(' + t.id + ')">Удалить</button>' +
    '</div>';
  }).join('');
}

/* =========================================================
   БЫСТРЫЕ ТЕКСТЫ (вставка в поля записи)
   ========================================================= */
var tbpTargetField = null;

function openTextBlockPicker(fieldId) {
  tbpTargetField = fieldId;
  document.getElementById('tbpSearch').value = '';
  document.getElementById('tbpNewBlock').style.display = 'none';
  document.getElementById('tbpNewName').value = '';
  document.getElementById('tbpNewText').value = '';
  renderTextBlockPicker();
  document.getElementById('tbpOverlay').classList.add('show');
}

function closeTextBlockPicker() {
  document.getElementById('tbpOverlay').classList.remove('show');
  tbpTargetField = null;
}

function renderTextBlockPicker() {
  var box = document.getElementById('tbpList');
  var q = (document.getElementById('tbpSearch').value || '').toLowerCase().trim();
  var list = textBlocks;
  if (q) {
    list = textBlocks.filter(function(t) {
      return (t.name || '').toLowerCase().indexOf(q) > -1 ||
             (t.text || '').toLowerCase().indexOf(q) > -1;
    });
  }
  if (list.length === 0) {
    box.innerHTML = '<div class="tbp-empty">' + (q ? 'Ничего не найдено' : 'Пока пусто — нажми «➕ Создать новый»') + '</div>';
    return;
  }
  box.innerHTML = list.map(function(t) {
    var preview = (t.text || '').substring(0, 100);
    if ((t.text || '').length > 100) preview += '...';
    return '<div class="tbp-item" onclick="insertTextBlock(' + t.id + ')">' +
      '<div class="tbp-item-name">' + escapeHtml(t.name) + '</div>' +
      '<div class="tbp-item-preview">' + escapeHtml(preview) + '</div>' +
    '</div>';
  }).join('');
}

function insertTextBlock(blockId) {
  var t = textBlocks.find(function(x) { return x.id === blockId; });
  if (!t || !tbpTargetField) { closeTextBlockPicker(); return; }
  var field = document.getElementById(tbpTargetField);
  if (!field) { closeTextBlockPicker(); return; }

  var insertion = '— ' + t.name + ' —\n' + t.text;
  var current = field.value || '';

  if (current.trim()) {
    field.value = current.replace(/\s+$/, '') + '\n\n' + insertion;
  } else {
    field.value = insertion;
  }

  closeTextBlockPicker();
}

function toggleNewTextBlockForm() {
  var el = document.getElementById('tbpNewBlock');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function saveNewTextBlockFromPicker() {
  var name = document.getElementById('tbpNewName').value.trim();
  var text = document.getElementById('tbpNewText').value.trim();
  if (!name) return alert('Введи название');
  if (!text) return alert('Введи текст');

  var block = { id: Date.now(), name: name, text: text };
  textBlocks.push(block);
  save();

  // Сразу вставляем
  var field = document.getElementById(tbpTargetField);
  if (field) {
    var insertion = '— ' + block.name + ' —\n' + block.text;
    var current = field.value || '';
    if (current.trim()) {
      field.value = current.replace(/\s+$/, '') + '\n\n' + insertion;
    } else {
      field.value = insertion;
    }
  }

  closeTextBlockPicker();
}

function renderTextBlocksSettings() {
  var box = document.getElementById('textBlocksList');
  if (!box) return;
  if (textBlocks.length === 0) {
    box.innerHTML = '<div class="empty"><div class="empty-icon">📋</div><div class="empty-title">Пока пусто</div><div class="empty-hint">Создай первый блок — например «Диета при ожирении»</div></div>';
    return;
  }
  box.innerHTML = textBlocks.map(function(t) {
    var preview = (t.text || '').substring(0, 80);
    if ((t.text || '').length > 80) preview += '...';
    return '<div class="item">' +
      '<div class="name">' + escapeHtml(t.name) + '</div>' +
      '<div class="sub">' + escapeHtml(preview) + '</div>' +
      '<button class="btn btn-small btn-blue" onclick="openTextBlockModal(' + t.id + ')">Изменить</button>' +
      '<button class="btn btn-small btn-red" onclick="deleteTextBlock(' + t.id + ')">Удалить</button>' +
    '</div>';
  }).join('');
}

function openTextBlockModal(editId) {
  var t = null;
  if (editId) {
    t = textBlocks.find(function(x) { return x.id === editId; });
    if (!t) return;
  }
  t = t || { name: '', text: '' };
  var body =
    '<label>Название *</label>' +
    '<input type="text" id="tbName" value="' + escapeAttr(t.name) + '" placeholder="Например: Диета при ожирении">' +
    '<label>Текст *</label>' +
    '<textarea id="tbText" rows="8" placeholder="Текст, который вставится в поле">' + escapeHtml(t.text) + '</textarea>';
  openModal(editId ? '✏️ Редактировать блок' : '➕ Новый быстрый текст', body, [
    { text: 'Отмена', className: 'modal-btn-secondary', onClick: closeModal },
    { text: 'Сохранить', className: 'modal-btn-primary', onClick: function() { saveTextBlockFromModal(editId); } }
  ]);
}

function saveTextBlockFromModal(editId) {
  var name = document.getElementById('tbName').value.trim();
  var text = document.getElementById('tbText').value.trim();
  if (!name) return alert('Введи название');
  if (!text) return alert('Введи текст');

  if (editId) {
    var t = textBlocks.find(function(x) { return x.id === editId; });
    if (t) { t.name = name; t.text = text; }
  } else {
    textBlocks.push({ id: Date.now(), name: name, text: text });
  }
  save();
  closeModal();
  renderTextBlocksSettings();
}

function deleteTextBlock(id) {
  var t = textBlocks.find(function(x) { return x.id === id; });
  if (!t) return;
  var backup = JSON.parse(JSON.stringify(t));

  textBlocks = textBlocks.filter(function(x) { return x.id !== id; });
  save();
  renderTextBlocksSettings();

  showUndo('Быстрый текст удалён', function() {
    textBlocks.push(backup);
    save();
    renderTextBlocksSettings();
  });
}

/* Автоматически добавляет иконку 📋 к полям записи в любой модалке */
function attachTemplateButtonsToLabels() {
  var fieldIds = ['recAnamnesis', 'recExam', 'recDiagnosis', 'recTreatment', 'recRecommendations', 'recNote'];
  fieldIds.forEach(function(fieldId) {
    var field = document.getElementById(fieldId);
    if (!field) return;
    var label = field.previousElementSibling;
    if (!label || label.tagName !== 'LABEL') return;
    if (label.querySelector('.tpl-btn')) return;

    var btn = document.createElement('span');
    btn.className = 'tpl-btn';
    btn.textContent = '📋';
    btn.title = 'Вставить быстрый текст';
    btn.onclick = (function(id) {
      return function() { openTextBlockPicker(id); };
    })(fieldId);

    label.appendChild(document.createTextNode(' '));
    label.appendChild(btn);
  });
}

function openTemplateModal(editId) {
  var t = null;
  if (editId) {
    t = templates.find(function(x) { return x.id === editId; });
    if (!t) return;
  }
  t = t || { name:'', type:'appointment', drug:'', complaint:'', anamnesis:'', exam:'', diagnosis:'', treatment:'', recommendations:'', note:'' };

  var vaxDisplay = t.type === 'vaccination' ? 'block' : 'none';
  var body =
    '<label>Название *</label>' +
    '<input type="text" id="tplName" value="' + escapeAttr(t.name) + '" placeholder="Например: Вакцинация комплексная">' +
    '<label>Тип записи</label>' +
    '<select id="tplType" onchange="toggleTplVaxFields()">' +
      '<option value="appointment"' + (t.type === 'appointment' ? ' selected' : '') + '>📋 Приём</option>' +
      '<option value="vaccination"' + (t.type === 'vaccination' ? ' selected' : '') + '>💉 Вакцинация</option>' +
      '<option value="surgery"' + (t.type === 'surgery' ? ' selected' : '') + '>🔪 Операция</option>' +
      '<option value="other"' + (t.type === 'other' ? ' selected' : '') + '>📌 Другое</option>' +
    '</select>' +
    '<div id="tplVaxFields" style="display:' + vaxDisplay + '">' +
      '<label>Препарат</label>' +
      '<input type="text" id="tplDrug" value="' + escapeAttr(t.drug) + '" placeholder="Нобивак DHPPi">' +
    '</div>' +
    '<label>Цель обращения</label>' +
    '<input type="text" id="tplComplaint" value="' + escapeAttr(t.complaint) + '">' +
    '<label>Анамнез</label>' +
    '<textarea id="tplAnamnesis" rows="2">' + escapeHtml(t.anamnesis) + '</textarea>' +
    '<label>Осмотр</label>' +
    '<textarea id="tplExam" rows="2">' + escapeHtml(t.exam) + '</textarea>' +
    '<label>Диагноз</label>' +
    '<input type="text" id="tplDiagnosis" value="' + escapeAttr(t.diagnosis) + '">' +
    '<label>Лечение / назначения</label>' +
    '<textarea id="tplTreatment" rows="3">' + escapeHtml(t.treatment) + '</textarea>' +
    '<label>Рекомендации владельцу</label>' +
    '<textarea id="tplRecommendations" rows="2">' + escapeHtml(t.recommendations) + '</textarea>' +
    '<label>Заметка (личное)</label>' +
    '<input type="text" id="tplNote" value="' + escapeAttr(t.note) + '">';

  openModal(editId ? '✏️ Редактировать шаблон' : '➕ Новый шаблон', body, [
    { text: 'Отмена', className: 'modal-btn-secondary', onClick: closeModal },
    { text: 'Сохранить', className: 'modal-btn-primary', onClick: function() { saveTemplateFromModal(editId); } }
  ]);
}

function toggleTplVaxFields() {
  var type = document.getElementById('tplType').value;
  document.getElementById('tplVaxFields').style.display = type === 'vaccination' ? 'block' : 'none';
}

function saveTemplateFromModal(editId) {
  var name = document.getElementById('tplName').value.trim();
  if (!name) return alert('Введи название шаблона');
  var data = {
    name: name,
    type: document.getElementById('tplType').value,
    drug: document.getElementById('tplDrug') ? document.getElementById('tplDrug').value.trim() : '',
    complaint: document.getElementById('tplComplaint').value.trim(),
    anamnesis: document.getElementById('tplAnamnesis').value.trim(),
    exam: document.getElementById('tplExam').value.trim(),
    diagnosis: document.getElementById('tplDiagnosis').value.trim(),
    treatment: document.getElementById('tplTreatment').value.trim(),
    recommendations: document.getElementById('tplRecommendations').value.trim(),
    note: document.getElementById('tplNote').value.trim()
  };

  if (editId) {
    var t = templates.find(function(x) { return x.id === editId; });
    if (t) {
      Object.keys(data).forEach(function(k) { t[k] = data[k]; });
    }
  } else {
    data.id = Date.now();
    templates.push(data);
  }
  save();
  closeModal();
  renderTemplatesSettings();
}

function deleteTemplate(id) {
  var t = templates.find(function(x) { return x.id === id; });
  if (!t) return;
  var backup = JSON.parse(JSON.stringify(t));

  templates = templates.filter(function(x) { return x.id !== id; });
  save();
  renderTemplatesSettings();

  showUndo('Шаблон удалён', function() {
    templates.push(backup);
    save();
    renderTemplatesSettings();
  });
}

/* ==== МОДАЛКА: ДОБАВЛЕНИЕ ЗАПИСИ ==== */
function openAddRecordModal() {
  var today = new Date().toISOString().split('T')[0];
  var tplOptions = '<option value="">— без шаблона —</option>' + templates.map(function(t) {
    return '<option value="' + t.id + '">' + t.name + '</option>';
  }).join('');
  var body =
    '<label>📋 Шаблон</label>' +
    '<select id="recTemplate" onchange="applyTemplateToAddForm(this.value)">' + tplOptions + '</select>' +
    '<label>Дата *</label><input type="date" id="recDate" value="' + today + '" readonly onclick="openDatePicker(\'recDate\')">' +
    '<label>Тип записи</label>' +
    '<select id="recType" onchange="toggleRecTypeFields()">' +
      '<option value="appointment">📋 Приём</option>' +
      '<option value="vaccination">💉 Вакцинация</option>' +
      '<option value="surgery">🔪 Операция</option>' +
      '<option value="other">📌 Другое</option>' +
    '</select>' +
        '<div id="recVaxFields" style="display:none">' +
      '<label>Препарат</label><input type="text" id="recDrug" placeholder="Нобивак DHPPi">' +
      '<p style="font-size:12px;color:var(--text-dim);margin-top:6px;">Следующая вакцинация будет через год — приложение посчитает само.</p>' +
    '</div>' +
    '<label>Вес (кг)</label><input type="number" id="recWeight" step="0.1" placeholder="12.5">' +
    '<label>Температура (°C)</label><input type="number" id="recTemp" step="0.1" placeholder="38.5">' +
    '<label>Цель обращения</label><input type="text" id="recComplaint" placeholder="жалобы, причина визита">' +
    '<label>Анамнез</label><textarea id="recAnamnesis" rows="2" placeholder="что было до"></textarea>' +
    '<label>Осмотр</label><textarea id="recExam" rows="2" placeholder="что нашли при осмотре"></textarea>' +
    '<label>Диагноз</label><input type="text" id="recDiagnosis" placeholder="диагноз">' +
    '<label>Лечение / назначения</label><textarea id="recTreatment" rows="3" placeholder="что делали, что назначили"></textarea>' +
    '<label>Рекомендации владельцу</label><textarea id="recRecommendations" rows="2" placeholder="уход, контроль"></textarea>' +
    '<label>Заметка (личное)</label><input type="text" id="recNote" placeholder="только для себя">';
  openModal('➕ Новая запись', body, [
    { text: 'Отмена', className: 'modal-btn-secondary', onClick: closeModal },
    { text: 'Добавить', className: 'modal-btn-primary', onClick: saveNewRecordFromModal }
  ]);
}

function toggleRecTypeFields() {
  var type = document.getElementById('recType').value;
  document.getElementById('recVaxFields').style.display = type === 'vaccination' ? 'block' : 'none';
}

function saveNewRecordFromModal() {
  var p = patients.find(function(x) { return x.id === openedPatientId; });
  if (!p) return;
  var date = document.getElementById('recDate').value;
  if (!date) return alert('Выбери дату');
  var type = document.getElementById('recType').value;
  var drug = document.getElementById('recDrug') ? document.getElementById('recDrug').value.trim() : '';
  if (type === 'vaccination' && !drug) return alert('Укажи препарат');

  var record = {
    id: Date.now(),
    type: type,
    date: date,
    weight: document.getElementById('recWeight').value.trim(),
    temperature: document.getElementById('recTemp').value.trim(),
    complaint: document.getElementById('recComplaint').value.trim(),
    anamnesis: document.getElementById('recAnamnesis').value.trim(),
    exam: document.getElementById('recExam').value.trim(),
    diagnosis: document.getElementById('recDiagnosis').value.trim(),
    treatment: document.getElementById('recTreatment').value.trim(),
    recommendations: document.getElementById('recRecommendations').value.trim(),
    drug: drug,
    nextDate: '',
    note: document.getElementById('recNote').value.trim()
  };
    p.records.push(record);
  save();
  if (record.type === 'vaccination') {
    syncVaccinationToCalendar(p, record);
    scheduleVaccinationNotification(p, record);
  }
  closeModal();
  renderPatientCard();
}
/* ==== МОДАЛКА: РЕДАКТИРОВАНИЕ ЗАПИСИ ==== */
function openEditRecordModal(recordId) {
  var p = patients.find(function(x) { return x.id === openedPatientId; });
  if (!p) return;
  var r = p.records.find(function(x) { return x.id === recordId; });
  if (!r) return;

  var vaxDisplay = r.type === 'vaccination' ? 'block' : 'none';
  var tplOptions = '<option value="">— без шаблона —</option>' + templates.map(function(t) {
    return '<option value="' + t.id + '">' + t.name + '</option>';
  }).join('');
  var body =
    '<label>📋 Шаблон (заменит поля ниже)</label>' +
    '<select id="recTemplate" onchange="applyTemplateToEditForm(this.value)">' + tplOptions + '</select>' +
    '<label>Дата *</label><input type="date" id="recDate" value="' + escapeAttr(r.date || '') + '">' +
    '<label>Тип записи</label>' +
    '<select id="recType" onchange="toggleRecTypeFields()">' +
      '<option value="appointment"' + (r.type === 'appointment' ? ' selected' : '') + '>📋 Приём</option>' +
      '<option value="vaccination"' + (r.type === 'vaccination' ? ' selected' : '') + '>💉 Вакцинация</option>' +
      '<option value="surgery"' + (r.type === 'surgery' ? ' selected' : '') + '>🔪 Операция</option>' +
      '<option value="other"' + (r.type === 'other' ? ' selected' : '') + '>📌 Другое</option>' +
    '</select>' +
        '<div id="recVaxFields" style="display:' + vaxDisplay + '">' +
      '<label>Препарат</label><input type="text" id="recDrug" value="' + escapeAttr(r.drug || '') + '" placeholder="Нобивак DHPPi">' +
      '<p style="font-size:12px;color:var(--text-dim);margin-top:6px;">Следующая вакцинация будет через год — приложение посчитает само.</p>' +
    '</div>' +
    '<label>Вес (кг)</label><input type="number" id="recWeight" step="0.1" value="' + escapeAttr(r.weight || '') + '">' +
    '<label>Температура (°C)</label><input type="number" id="recTemp" step="0.1" value="' + escapeAttr(r.temperature || '') + '">' +
    '<label>Цель обращения</label><input type="text" id="recComplaint" value="' + escapeAttr(r.complaint || '') + '">' +
    '<label>Анамнез</label><textarea id="recAnamnesis" rows="2">' + escapeHtml(r.anamnesis || '') + '</textarea>' +
    '<label>Осмотр</label><textarea id="recExam" rows="2">' + escapeHtml(r.exam || '') + '</textarea>' +
    '<label>Диагноз</label><input type="text" id="recDiagnosis" value="' + escapeAttr(r.diagnosis || '') + '">' +
    '<label>Лечение / назначения</label><textarea id="recTreatment" rows="3">' + escapeHtml(r.treatment || '') + '</textarea>' +
    '<label>Рекомендации владельцу</label><textarea id="recRecommendations" rows="2">' + escapeHtml(r.recommendations || '') + '</textarea>' +
    '<label>Заметка (личное)</label><input type="text" id="recNote" value="' + escapeAttr(r.note || '') + '">';

  openModal('✏️ Редактировать запись', body, [
    { text: 'Отмена', className: 'modal-btn-secondary', onClick: closeModal },
    { text: 'Сохранить', className: 'modal-btn-primary', onClick: function() { saveEditRecordFromModal(recordId); } }
  ]);
}

function saveEditRecordFromModal(recordId) {
  var p = patients.find(function(x) { return x.id === openedPatientId; });
  if (!p) return;
  var r = p.records.find(function(x) { return x.id === recordId; });
  if (!r) return;

  var date = document.getElementById('recDate').value;
  if (!date) return alert('Выбери дату');
  var type = document.getElementById('recType').value;
  var drug = document.getElementById('recDrug') ? document.getElementById('recDrug').value.trim() : '';
  if (type === 'vaccination' && !drug) return alert('Укажи препарат');

  r.type = type;
  r.date = date;
  r.weight = document.getElementById('recWeight').value.trim();
  r.temperature = document.getElementById('recTemp').value.trim();
  r.complaint = document.getElementById('recComplaint').value.trim();
  r.anamnesis = document.getElementById('recAnamnesis').value.trim();
  r.exam = document.getElementById('recExam').value.trim();
  r.diagnosis = document.getElementById('recDiagnosis').value.trim();
  r.treatment = document.getElementById('recTreatment').value.trim();
  r.recommendations = document.getElementById('recRecommendations').value.trim();
  r.drug = drug;
  r.nextDate = '';
  r.note = document.getElementById('recNote').value.trim();
  save();
  cancelVaccinationNotification(r.id);
  syncVaccinationToCalendar(p, r);
  if (r.type === 'vaccination') {
    scheduleVaccinationNotification(p, r);
  }
  closeModal();
  renderPatientCard();
}

function deleteRecord(recordId) {
  var p = patients.find(function(x) { return x.id === openedPatientId; });
  if (!p) return;
  var rec = p.records.find(function(x) { return x.id === recordId; });
  if (!rec) return;

  // Запоминаем для восстановления
  var backupRecord = JSON.parse(JSON.stringify(rec));
  var backupPatientId = p.id;

  // Связанная запись в календаре
  var linkedBackup = null;
  var linked = appts.find(function(a) { return a.sourceRecordId === recordId; });
  if (linked) {
    linkedBackup = JSON.parse(JSON.stringify(linked));
    cancelApptNotification(linked.id);
    appts = appts.filter(function(a) { return a.sourceRecordId !== recordId; });
  }
  cancelVaccinationNotification(recordId);

  // Удаляем
  p.records = p.records.filter(function(x) { return x.id !== recordId; });
  save();
  updateStats();
  renderPatientCard();

  // Показываем тост
  showUndo('Запись удалена', function() {
    var patient = patients.find(function(x) { return x.id === backupPatientId; });
    if (!patient) return;
    patient.records.push(backupRecord);
    if (linkedBackup) {
      appts.push(linkedBackup);
    }
    save();
    updateStats();
    renderPatientCard();
    if (linkedBackup) scheduleApptNotification(linkedBackup);
  });
}
function deletePatient(id) {
  var patient = patients.find(function(p) { return p.id === id; });
  if (!patient) return;

  // Запоминаем
  var backupPatient = JSON.parse(JSON.stringify(patient));
  var linkedAppts = appts.filter(function(a) { return a.sourceRecordId !== null && a.patientId === id; });
  var backupAppts = JSON.parse(JSON.stringify(linkedAppts));

  linkedAppts.forEach(function(a) { cancelApptNotification(a.id); });
  appts = appts.filter(function(a) { return !(a.sourceRecordId !== null && a.patientId === id); });
  patients = patients.filter(function(p) { return p.id !== id; });
  save();
  updateStats();
  goTo('search');

  showUndo('Пациент удалён', function() {
    patients.push(backupPatient);
    backupAppts.forEach(function(a) { appts.push(a); });
    save();
    updateStats();
    renderSearch();
    backupAppts.forEach(function(a) { scheduleApptNotification(a); });
  });
}

/* ==== ПРЕПАРАТЫ ==== */
function addDrug() {
  var name = document.getElementById('dName').value.trim();
  if (!name) return alert('Введи название');
  var drug = {
    id: Date.now(), name: name,
    category: document.getElementById('dCategory').value,
    doseDog: document.getElementById('dDoseDog').value.trim(),
    doseCat: document.getElementById('dDoseCat').value.trim(),
    note: document.getElementById('dNote').value.trim()
  };
  drugs.push(drug);
  save();
  ['dName','dDoseDog','dDoseCat','dNote'].forEach(function(id) { document.getElementById(id).value = ''; });
  document.getElementById('dCategory').value = '';
  renderDrugs();
  updateStats();
  alert('Препарат сохранён');
}
function deleteDrug(id) {
  var drug = drugs.find(function(d) { return d.id === id; });
  if (!drug) return;
  var backup = JSON.parse(JSON.stringify(drug));

  drugs = drugs.filter(function(d) { return d.id !== id; });
  save();
  renderDrugs();
  updateStats();

  showUndo('Препарат удалён', function() {
    drugs.push(backup);
    save();
    renderDrugs();
    updateStats();
  });
}
function editDrug(id) {
  var drug = drugs.find(function(d) { return d.id === id; });
  if (!drug) return;

  var catOptions = buildCategoryOptions('dCategory', drug.category);
  var body =
    '<label>Название *</label>' +
    '<input type="text" id="editDrugName" value="' + escapeAttr(drug.name || '') + '">' +
    '<label>Категория</label>' +
    '<select id="editDrugCategory">' + catOptions + '</select>' +
    '<div class="section-title">🐕 Доза для собаки (мг/кг)</div>' +
    '<input type="text" id="editDrugDoseDog" value="' + escapeAttr(drug.doseDog || '') + '">' +
    '<div class="section-title">🐈 Доза для кошки (мг/кг)</div>' +
    '<input type="text" id="editDrugDoseCat" value="' + escapeAttr(drug.doseCat || '') + '">' +
    '<label>Заметка</label>' +
    '<input type="text" id="editDrugNote" value="' + escapeAttr(drug.note || '') + '">';

  openModal('✏️ Редактировать препарат', body, [
    { text: 'Отмена', className: 'modal-btn-secondary', onClick: closeModal },
    { text: 'Сохранить', className: 'modal-btn-primary', onClick: function() { saveDrugFromModal(id); } }
  ]);
}

function saveDrugFromModal(id) {
  var drug = drugs.find(function(d) { return d.id === id; });
  if (!drug) return;
  var name = document.getElementById('editDrugName').value.trim();
  if (!name) return alert('Введи название');
  drug.name = name;
  drug.category = document.getElementById('editDrugCategory').value;
  drug.doseDog = document.getElementById('editDrugDoseDog').value.trim();
  drug.doseCat = document.getElementById('editDrugDoseCat').value.trim();
  drug.note = document.getElementById('editDrugNote').value.trim();
  save();
  closeModal();
  renderDrugs();
}
function toggleDrugCat(cat) {
  var idx = openDrugCats.indexOf(cat);
  if (idx > -1) openDrugCats.splice(idx, 1);
  else openDrugCats.push(cat);
  localStorage.setItem('vet_open_drug_cats', JSON.stringify(openDrugCats));
  renderDrugs();
}
function renderDrugs() {
  var q = (document.getElementById('searchDrug').value || '').toLowerCase().trim();
  var box = document.getElementById('drugsList');
  if (q) {
    var list = drugs.filter(function(d) { return (d.name || '').toLowerCase().indexOf(q) > -1; });
    if (list.length === 0) { box.innerHTML = '<div class="empty"><div class="empty-icon">🔍</div><div class="empty-title">Ничего не найдено</div><div class="empty-hint">Попробуй другое название или очисти поиск</div></div>'; return; }
    var sorted = list.slice().sort(function(a, b) { return (a.name || '').localeCompare(b.name || ''); });
    box.innerHTML = sorted.slice(0, 200).map(function(d) { return renderDrugCard(d); }).join('');
    return;
  }
  if (drugs.length === 0) { box.innerHTML = '<div class="empty"><div class="empty-icon">💊</div><div class="empty-title">База пуста</div><div class="empty-hint">Открой форму «➕ Добавить препарат» выше и занеси первый</div></div>'; return; }
  var groups = {};
  drugs.forEach(function(d) {
    var cat = d.category || '📋 Без категории';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(d);
  });
  var catNames = Object.keys(groups).sort();
  box.innerHTML = catNames.map(function(cat) {
    var items = groups[cat].slice().sort(function(a, b) { return (a.name || '').localeCompare(b.name || ''); });
    var isOpen = openDrugCats.indexOf(cat) > -1;
    return '<div class="acc ' + (isOpen ? 'open' : '') + '" id="drugcat-' + encodeURIComponent(cat) + '">' +
      '<div class="acc-header" onclick="toggleDrugCat(\'' + cat.replace(/'/g, "\\'") + '\')">' +
        '<span>' + cat + ' <span class="cat-count">' + items.length + '</span></span>' +
        '<span class="arrow">▼</span>' +
      '</div>' +
      '<div class="acc-body">' + items.map(function(d) { return renderDrugCard(d); }).join('') + '</div>' +
    '</div>';
  }).join('');
}
function formatDose(dose) {
  if (!dose) return '';
  var s = String(dose).trim();
  // Если "мг/кг" или "мкг/кг" уже есть в строке — не добавляем
  if (/мг\/кг|мкг\/кг/i.test(s)) return s;
  return s + ' мг/кг';
}

function renderDrugCard(d) {
  var details = [];
  if (d.doseDog) details.push('🐕 ' + formatDose(d.doseDog));
  if (d.doseCat) details.push('🐈 ' + formatDose(d.doseCat));
  return '<div class="item">' +
    '<div class="name">' + d.name + '</div>' +
    (details.length ? '<div class="info">' + details.join(' • ') + '</div>' : '') +
    (d.note ? '<div class="sub">' + d.note + '</div>' : '') +
    '<button class="btn btn-small btn-blue" onclick="editDrug(' + d.id + ')">Изменить</button>' +
    '<button class="btn btn-small btn-red" onclick="deleteDrug(' + d.id + ')">Удалить</button>' +
  '</div>';
}

/* ==== ПАМЯТКИ ==== */
function addNote() {
  var title = document.getElementById('noteTitle').value.trim();
  var body = document.getElementById('noteBody').value.trim();
  if (!title) return alert('Введи название');
  if (!body) return alert('Введи текст');
  notes.push({
    id: Date.now(), title: title,
    category: document.getElementById('noteCategory').value,
    body: body
  });
  save();
  document.getElementById('noteTitle').value = '';
  document.getElementById('noteBody').value = '';
  document.getElementById('noteCategory').value = '';
  renderNotes();
  updateSettingsInfo();
  updateStats();
  alert('Памятка сохранена');
}
function deleteNote(id) {
  var note = notes.find(function(n) { return n.id === id; });
  if (!note) return;
  var backup = JSON.parse(JSON.stringify(note));

  notes = notes.filter(function(n) { return n.id !== id; });
  save();
  renderNotes();
  updateSettingsInfo();
  updateStats();

  showUndo('Памятка удалена', function() {
    notes.push(backup);
    save();
    renderNotes();
    updateSettingsInfo();
    updateStats();
  });
}
function editNote(id) {
  var n = notes.find(function(x) { return x.id === id; });
  if (!n) return;

  var catOptions = buildCategoryOptions('noteCategory', n.category);
  var body =
    '<label>Название *</label>' +
    '<input type="text" id="editNoteTitle" value="' + escapeAttr(n.title || '') + '">' +
    '<label>Категория</label>' +
    '<select id="editNoteCategory">' + catOptions + '</select>' +
    '<label>Текст *</label>' +
    '<textarea id="editNoteBody" rows="10">' + escapeHtml(n.body || '') + '</textarea>';

  openModal('✏️ Редактировать памятку', body, [
    { text: 'Отмена', className: 'modal-btn-secondary', onClick: closeModal },
    { text: 'Сохранить', className: 'modal-btn-primary', onClick: function() { saveNoteFromModal(id); } }
  ]);
}

function saveNoteFromModal(id) {
  var n = notes.find(function(x) { return x.id === id; });
  if (!n) return;
  var title = document.getElementById('editNoteTitle').value.trim();
  if (!title) return alert('Введи название');
  var body = document.getElementById('editNoteBody').value.trim();
  if (!body) return alert('Введи текст');
  n.title = title;
  n.category = document.getElementById('editNoteCategory').value;
  n.body = body;
  save();
  closeModal();
  renderNotes();
  if (openedNoteId === id) {
    viewNote(id);
  }
}
function toggleNoteCat(cat) {
  var idx = openNoteCats.indexOf(cat);
  if (idx > -1) openNoteCats.splice(idx, 1);
  else openNoteCats.push(cat);
  localStorage.setItem('vet_open_note_cats', JSON.stringify(openNoteCats));
  renderNotes();
}
function renderNotes() {
  var q = (document.getElementById('searchNote').value || '').toLowerCase().trim();
  var box = document.getElementById('notesList');
  if (q) {
    var list = notes.filter(function(n) {
      return (n.title || '').toLowerCase().indexOf(q) > -1 ||
             (n.body || '').toLowerCase().indexOf(q) > -1;
    });
    if (list.length === 0) { box.innerHTML = '<div class="empty"><div class="empty-icon">🔍</div><div class="empty-title">Ничего не найдено</div><div class="empty-hint">Попробуй другое название или очисти поиск</div></div>'; return; }
    var sorted = list.slice().sort(function(a, b) { return (a.title || '').localeCompare(b.title || ''); });
    box.innerHTML = sorted.map(function(n) { return renderNoteCard(n); }).join('');
    return;
  }
  if (notes.length === 0) { box.innerHTML = '<div class="empty"><div class="empty-icon">📋</div><div class="empty-title">Памяток пока нет</div><div class="empty-hint">Открой форму «➕ Добавить памятку» выше — пригодятся протоколы и справочники</div></div>'; return; }
  var groups = {};
  notes.forEach(function(n) {
    var cat = n.category || '📋 Без категории';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(n);
  });
  var catNames = Object.keys(groups).sort();
  box.innerHTML = catNames.map(function(cat) {
    var items = groups[cat].slice().sort(function(a, b) { return (a.title || '').localeCompare(b.title || ''); });
    var isOpen = openNoteCats.indexOf(cat) > -1;
    return '<div class="acc ' + (isOpen ? 'open' : '') + '" id="notecat-' + encodeURIComponent(cat) + '">' +
      '<div class="acc-header" onclick="toggleNoteCat(\'' + cat.replace(/'/g, "\\'") + '\')">' +
        '<span>' + cat + ' <span class="cat-count">' + items.length + '</span></span>' +
        '<span class="arrow">▼</span>' +
      '</div>' +
      '<div class="acc-body">' + items.map(function(n) { return renderNoteCard(n); }).join('') + '</div>' +
    '</div>';
  }).join('');
}
function renderNoteCard(n) {
  var preview = (n.body || '').substring(0, 80);
  return '<div class="item" style="cursor:default;">' +
    '<div class="name">' + n.title + '</div>' +
    '<div class="sub">' + preview + ((n.body || '').length > 80 ? '...' : '') + '</div>' +
    '<button class="btn btn-small btn-green" onclick="viewNote(' + n.id + ')">Открыть</button>' +
    '<button class="btn btn-small btn-blue" onclick="editNote(' + n.id + ')">Изменить</button>' +
    '<button class="btn btn-small btn-red" onclick="deleteNote(' + n.id + ')">Удалить</button>' +
  '</div>';
}
function viewNote(id) {
  var n = notes.find(function(x) { return x.id === id; });
  if (!n) return;
  openedPatientId = null;
  openedNoteId = id;
  document.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
  document.getElementById('tab-patient').classList.add('active');
  document.getElementById('bottomNav').classList.remove('show');
  document.getElementById('appHeader').classList.add('show-back');
  document.getElementById('appTitle').textContent = n.title;
  window.scrollTo(0, 0);
  document.getElementById('patientContent').innerHTML =
    '<div class="patient-header">' +
      '<div class="pname">' + n.title + '</div>' +
      (n.category ? '<div class="pmeta"><span class="cat-label">' + n.category + '</span></div>' : '') +
    '</div>' +
    '<div class="card"><div class="note-content">' + escapeHtml(n.body || '') + '</div></div>' +
    '<div class="card">' +
      '<button class="btn btn-blue" onclick="editNote(' + n.id + ')">✏️ Изменить</button>' +
      '<button class="btn btn-red" onclick="deleteNoteAndReturn(' + n.id + ')">🗑 Удалить</button>' +
    '</div>';
}
function deleteNoteAndReturn(id) {
  if (!confirm('Удалить памятку?')) return;
  notes = notes.filter(function(n) { return n.id !== id; });
  save();
  updateSettingsInfo();
  updateStats();
  goTo('notes');
}
function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ==== ВСПОМОГАТЕЛЬНЫЕ: КАТЕГОРИИ ИЗ СЕЛЕКТОВ ==== */
function buildCategoryOptions(selectId, currentValue) {
  var sel = document.getElementById(selectId);
  if (!sel) return '<option value="">— без категории —</option>';
  var opts = sel.getElementsByTagName('option');
  var html = '<option value="">— без категории —</option>';
  var found = false;
  for (var i = 0; i < opts.length; i++) {
    var v = opts[i].value;
    if (!v) continue;
    var sel_attr = (v === currentValue) ? ' selected' : '';
    if (v === currentValue) found = true;
    html += '<option value="' + v + '"' + sel_attr + '>' + v + '</option>';
  }
  // Если у записи категория из старого набора — добавим её отдельной строкой, чтобы не потерять
  if (currentValue && !found) {
    html += '<option value="' + escapeAttr(currentValue) + '" selected>📎 ' + escapeHtml(currentValue) + ' (старая)</option>';
  }
  return html;
}

function escapeAttr(text) {
  if (!text) return '';
  return String(text).replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
function updateSettingsInfo() {
  var drugsInfo = document.getElementById('drugsInfo');
  if (drugsInfo) drugsInfo.textContent = 'Препаратов: ' + drugs.length;
  var notesInfo = document.getElementById('notesInfo');
  if (notesInfo) notesInfo.textContent = 'Памяток: ' + notes.length;
  var fullInfo = document.getElementById('fullInfo');
  if (fullInfo) fullInfo.textContent = 'Пациентов: ' + patients.length + ' • Препаратов: ' + drugs.length + ' • Памяток: ' + notes.length + ' • Записей: ' + appts.length;
  var baseInfo = document.getElementById('baseInfo');
  if (baseInfo) baseInfo.textContent = 'В файле будет: ' + drugs.length + ' препаратов, ' + notes.length + ' памяток';
  updatePermInfo();
}

var Share = window.Capacitor?.Plugins?.Share;
var FsPlugin = window.Capacitor?.Plugins?.Filesystem;

async function downloadJSON(data, filename) {
  var jsonString = JSON.stringify(data, null, 2);

  // Если мы в APK — сохраняем файл и открываем «Поделиться»
  if (Share && FsPlugin) {
    try {
      // 1. Записываем файл во временную папку Cache
      var result = await FsPlugin.writeFile({
        path: filename,
        data: jsonString,
        directory: 'CACHE',
        encoding: 'utf8'
      });

      // 2. Открываем системное «Поделиться»
      await Share.share({
        title: 'VetApp — бэкап',
        text: 'Файл бэкапа VetApp: ' + filename,
        url: result.uri,
        dialogTitle: 'Куда отправить бэкап?'
      });

      return;
    } catch (e) {
      console.error('Ошибка сохранения через Capacitor:', e);
      alert('Ошибка экспорта: ' + (e.message || e));
      return;
    }
  }

  // Фолбэк для браузера (если открываешь как сайт)
  var blob = new Blob([jsonString], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function exportAll() { downloadJSON({ type: 'vetapp-full', version: 5, schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), patients: patients, drugs: drugs, notes: notes, appointments: appts, templates: templates, textBlocks: textBlocks }, 'vetapp-backup-' + new Date().toISOString().split('T')[0] + '.json'); }
function exportBase() {
  downloadJSON({
    type: 'vetapp-base',
    version: 1,
    exportedAt: new Date().toISOString(),
    drugs: drugs,
    notes: notes
  }, 'vetapp-base-' + new Date().toISOString().split('T')[0] + '.json');
}

function importBase(event) {
  var file = event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      var importedDrugs = data.drugs || [];
      var importedNotes = data.notes || [];

      if (importedDrugs.length === 0 && importedNotes.length === 0) {
        throw new Error('В файле нет ни препаратов, ни памяток');
      }

      if (!confirm('Импорт базы коллеги:\n\nПрепаратов: ' + importedDrugs.length + '\nПамяток: ' + importedNotes.length + '\n\nТвои препараты и памятки будут дополнены/обновлены.\nПациенты и записи НЕ тронутся.\n\nПродолжить?')) {
        event.target.value = '';
        return;
      }

      var drugsAdded = 0, drugsUpdated = 0;
      importedDrugs.forEach(function(n) {
        if (!n.name) return;
        var ex = drugs.find(function(d) { return d.name.toLowerCase() === n.name.toLowerCase(); });
        if (ex) {
          if (n.category) ex.category = n.category;
          if (n.doseDog) ex.doseDog = n.doseDog;
          if (n.doseCat) ex.doseCat = n.doseCat;
          if (n.note) ex.note = n.note;
          drugsUpdated++;
        } else {
          drugs.push({
            id: Date.now() + Math.random(),
            name: n.name,
            category: n.category || '',
            doseDog: n.doseDog || '',
            doseCat: n.doseCat || '',
            note: n.note || ''
          });
          drugsAdded++;
        }
      });

      var notesAdded = 0, notesUpdated = 0;
      importedNotes.forEach(function(n) {
        if (!n.title) return;
        var ex = notes.find(function(x) { return x.title.toLowerCase() === n.title.toLowerCase(); });
        if (ex) {
          if (n.category) ex.category = n.category;
          if (n.body) ex.body = n.body;
          notesUpdated++;
        } else {
          notes.push({
            id: Date.now() + Math.random(),
            title: n.title,
            category: n.category || '',
            body: n.body || n.content || ''
          });
          notesAdded++;
        }
      });

      save();
      updateSettingsInfo();
      updateStats();
      renderDrugs();
      renderNotes();
      alert(
        '✅ База коллеги принята!\n\n' +
        'Препараты: добавлено ' + drugsAdded + ', обновлено ' + drugsUpdated + '\n' +
        'Памятки: добавлено ' + notesAdded + ', обновлено ' + notesUpdated + '\n\n' +
        'Всего препаратов: ' + drugs.length + '\n' +
        'Всего памяток: ' + notes.length
      );
    } catch (err) {
      alert('Ошибка импорта базы: ' + err.message);
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

function importDrugs(event) {
  var file = event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      var imported = data.drugs || (Array.isArray(data) ? data : null);
      if (!imported) throw new Error('Нет препаратов');
      var added = 0, updated = 0, skipped = 0;
      imported.forEach(function(n) {
        if (!n.name) { skipped++; return; }
        var ex = drugs.find(function(d) { return d.name.toLowerCase() === n.name.toLowerCase(); });
        if (ex) {
          if (n.category) ex.category = n.category;
          if (n.doseDog) ex.doseDog = n.doseDog;
          if (n.doseCat) ex.doseCat = n.doseCat;
          if (n.note) ex.note = n.note;
          updated++;
        } else {
          drugs.push({ id: Date.now() + Math.random(), name: n.name, category: n.category || '', doseDog: n.doseDog || '', doseCat: n.doseCat || '', note: n.note || '' });
          added++;
        }
      });
      save();
      updateSettingsInfo();
      updateStats();
      renderDrugs();
      alert('✅ Добавлено: ' + added + ', обновлено: ' + updated + ', пропущено: ' + skipped + '. Всего: ' + drugs.length);
    } catch (err) { alert('Ошибка: ' + err.message); }
    event.target.value = '';
  };
  reader.readAsText(file);
}

function importAll(event) {
  var file = event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      if (!data.patients) throw new Error('Неверный формат');

      // Проверка версии схемы бэкапа
      var backupVersion = data.schemaVersion || 1;
      if (backupVersion > SCHEMA_VERSION) {
        if (!confirm('⚠️ Бэкап из более новой версии приложения (' + backupVersion + ').\nТвоя версия: ' + SCHEMA_VERSION + '.\n\nНекоторые данные могут быть потеряны или не прочитаны.\n\nПродолжить?')) {
          event.target.value = '';
          return;
        }
      }

            if (!confirm('Полный импорт:\nПациентов: ' + data.patients.length + '\nПрепаратов: ' + (data.drugs || []).length + '\nПамяток: ' + (data.notes || []).length + '\nЗаписей: ' + (data.appointments || []).length + '\n\nВСЕ данные будут заменены!')) { event.target.value = ''; return; }
      patients = data.patients.map(function(p) {
        return {
          id: p.id || Date.now() + Math.random(),
          name: p.name || '', species: p.species || '',
          birthDate: p.birthDate || '',
          owner: p.owner || '', phone: p.phone || '',
          important: p.important || '',
          records: (p.records || []).map(function(r) {
            return {
              id: r.id || Date.now() + Math.random(),
              type: r.type || 'appointment', date: r.date || '',
              weight: r.weight || '', temperature: r.temperature || '',
              complaint: r.complaint || '', anamnesis: r.anamnesis || '',
              exam: r.exam || '', diagnosis: r.diagnosis || '',
              treatment: r.treatment || '', recommendations: r.recommendations || '',
              drug: r.drug || '', nextDate: r.nextDate || '', note: r.note || ''
            };
          })
        };
      });
      drugs = (data.drugs || []).map(function(d) {
        return {
          id: d.id || Date.now() + Math.random(), name: d.name || '', category: d.category || '',
          doseDog: d.doseDog || d.dose || '', doseCat: d.doseCat || '', note: d.note || ''
        };
      });
      notes = (data.notes || []).map(function(n) {
        return {
          id: n.id || Date.now() + Math.random(), title: n.title || '', category: n.category || '',
          body: n.body || n.content || ''
        };
      });
      appts = (data.appointments || []).map(function(a) {
        return {
          id: a.id || Date.now() + Math.random(), date: a.date || '', time: a.time || '',
          patientId: a.patientId || null, patientName: a.patientName || '',
          patientSpecies: a.patientSpecies || '', patientPhone: a.patientPhone || '',
          type: a.type || 'appointment', note: a.note || ''
        };
      });
      templates = (data.templates || []).map(function(t) {
        return {
          id: t.id || Date.now() + Math.random(),
          name: t.name || '', type: t.type || 'appointment',
          drug: t.drug || '', complaint: t.complaint || '',
          anamnesis: t.anamnesis || '', exam: t.exam || '',
          diagnosis: t.diagnosis || '', treatment: t.treatment || '',
          recommendations: t.recommendations || '', note: t.note || ''
        };
      });
      textBlocks = (data.textBlocks || []).map(function(t) {
        return {
          id: t.id || Date.now() + Math.random(),
          name: t.name || '',
          text: t.text || ''
        };
      });
      setSavedSchemaVersion(SCHEMA_VERSION);
      save();
      updateSettingsInfo();
      updateStats();
      renderSearch();
      renderDrugs();
      renderNotes();
      alert('✅ Данные импортированы!');
    } catch (err) { alert('Ошибка: ' + err.message); }
    event.target.value = '';
  };
  reader.readAsText(file);
}
function clearAll() {
  if (!confirm('Удалить ВСЕ данные?')) return;
  if (!confirm('Точно?')) return;
  localStorage.removeItem('vet_patients');
  localStorage.removeItem('vet_drugs');
  localStorage.removeItem('vet_notes');
  localStorage.removeItem('vet_appointments');
  localStorage.removeItem('vet_open_drug_cats');
  localStorage.removeItem('vet_open_note_cats');
  localStorage.removeItem('vet_notif_last_date');
   localStorage.removeItem('vet_templates');
  localStorage.removeItem('vet_text_blocks');
  localStorage.removeItem('vet_schema_version');
  patients = []; drugs = []; notes = []; appts = []; templates = []; textBlocks = []; openDrugCats = []; openNoteCats = [];
  setSavedSchemaVersion(SCHEMA_VERSION);
  updateSettingsInfo();
  updateStats();
  renderSearch();
  renderDrugs();
  renderNotes();
  alert('Удалено');
}

/* ==== СТАРТ ==== */
applyTheme(localStorage.getItem('vet_theme') || 'system');

// Проверка версии схемы и миграция
(function() {
  var savedVersion = getSavedSchemaVersion();
  if (savedVersion < SCHEMA_VERSION) {
    migrateData(savedVersion);
    save();
  } else if (savedVersion > SCHEMA_VERSION) {
    console.warn('Данные из более новой версии приложения. Текущая: ' + SCHEMA_VERSION + ', сохранённая: ' + savedVersion);
  }
})();

updateIpsForm();
updateFoodCoefs();
updateStats();
goHome();
updatePermInfo();

/* ==== СИСТЕМНАЯ КНОПКА "НАЗАД" И СВАЙП (Android) ==== */
function setupBackButton() {
  var CapApp = window.Capacitor?.Plugins?.App;
  if (!CapApp || !CapApp.addListener) {
    console.log('Плагин @capacitor/app не найден — системная кнопка работает стандартно');
    return;
  }

  CapApp.addListener('backButton', function() {
    // 1. Открытая модалка
    var modal = document.getElementById('modalOverlay');
    if (modal && modal.classList.contains('show')) { closeModal(); return; }

    // 2. Пикер даты
    var dp = document.getElementById('datePickerOverlay');
    if (dp && dp.classList.contains('show')) { closeDatePicker(); return; }

    // 3. Пикер времени
    var tp = document.getElementById('timePickerOverlay');
    if (tp && tp.classList.contains('show')) { closeTimePicker(); return; }

    // 4. Пикер быстрых текстов
    var tbp = document.getElementById('tbpOverlay');
    if (tbp && tbp.classList.contains('show')) { closeTextBlockPicker(); return; }

    // 5. Модалка уведомлений
    var notif = document.getElementById('notifOverlay');
    if (notif && notif.classList.contains('show')) { closeNotif(); return; }

    // 6. Открыта карточка пациента / памятки
    var tabPatient = document.getElementById('tab-patient');
    if (tabPatient && tabPatient.classList.contains('active')) {
      goHome();
      return;
    }

    // 7. Открыта не главная вкладка
    var tabHome = document.getElementById('tab-home');
    if (tabHome && !tabHome.classList.contains('active')) {
      goTo('home');
      return;
    }

    // 8. Мы на главной — сворачиваем приложение
    CapApp.exitApp();
  });
}

setupBackButton();

setTimeout(function() {
  checkTodayApptsAndNotify();
}, 800);
setTimeout(function() {
  rescheduleAllNotifications();
}, 1500);

setTimeout(function() {
  rescheduleAllVaccinationNotifications();
}, 2000);

/* ==== ЛОКАЛЬНЫЕ УВЕДОМЛЕНИЯ (Capacitor) ==== */
var LocalNotifications = null;
try {
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
    LocalNotifications = window.Capacitor.Plugins.LocalNotifications;
  }
} catch (e) { LocalNotifications = null; }

var MORNING_HOUR = 8;
var MORNING_MINUTE = 0;

function isNativeApp() { return LocalNotifications !== null; }

async function createNotificationChannel() {
  if (!isNativeApp()) return;
  try {
    await LocalNotifications.createChannel({
      id: 'vetapp-main',
      name: 'VetApp',
      description: 'Напоминания о записях и вакцинациях',
      importance: 5,          // 5 = MAX — уведомление всплывает, звучит и вибрирует
      visibility: 1,          // 1 = PUBLIC — показывать на экране блокировки
      vibration: true,        // вибрация
      lights: true,           // мигание светодиода
      lightColor: '#2e7d32',  // зелёный цвет (под стиль приложения)
      sound: 'default'        // системный звук (потом можно поставить свой)
    });
    console.log('Канал уведомлений создан');
  } catch (e) {
    console.error('Ошибка создания канала:', e);
  }
}

async function requestLocalNotificationPermission() {
  if (!isNativeApp()) return false;
  try {
    var perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions();
    return perm.display === 'granted';
  } catch (e) { console.error('Ошибка запроса разрешения:', e); return false; }
}

async function scheduleMorningNotification() {
  if (!isNativeApp()) return;
  try {
    var granted = await requestLocalNotificationPermission();
    if (!granted) return;
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
    var today = formatDate(new Date());
    var todayAppts = appts.filter(function(a) { return a.date === today; })
      .sort(function(a, b) { return (a.time || '').localeCompare(b.time || ''); });
    if (todayAppts.length === 0) return;
    var body = todayAppts.map(function(a) { return (a.time || '?') + ' — ' + (a.patientName || '—'); }).join('\n');
    var now = new Date();
    var target = new Date();
    target.setHours(MORNING_HOUR, MORNING_MINUTE, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
               var listText = todayAppts.map(function(a) {
      return (a.time || '?') + ' — ' + (a.patientName || '—');
    }).join('\n');

    await LocalNotifications.schedule({
      notifications: [{
        id: 1,
        title: '📅 Сегодня ' + todayAppts.length + ' записей — VetApp',
        body: body,
        largeBody: listText,
        summaryText: 'VetApp — сводка на день',
        schedule: { at: target, allowWhileIdle: true },
        channelId: 'vetapp-main',
        smallIcon: 'ic_launcher',
        iconColor: '#2e7d32',
        sound: 'default',
        foreground: true,
        ongoing: false
      }]
    });
  } catch (e) { console.error('Ошибка утреннего уведомления:', e); }
}

async function scheduleApptNotification(appt) {
  if (!isNativeApp()) return;
  if (!appt.date || !appt.time) return;
  try {
    var granted = await requestLocalNotificationPermission();
    if (!granted) return;
    var parts = appt.date.split('-');
    var timeParts = appt.time.split(':');
    var when = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), parseInt(timeParts[0]), parseInt(timeParts[1]), 0, 0);
    var notifyAt = new Date(when.getTime() - 60 * 60 * 1000);
    if (notifyAt <= new Date()) return;
    var notifId = 1000 + (appt.id % 100000);
    await LocalNotifications.cancel({ notifications: [{ id: notifId }] });
      await LocalNotifications.schedule({
  notifications: [{
    id: notifId,
    title: '🔔 Через час — ' + (appt.patientName || 'запись'),
    body: (appt.time || '') + ' • ' + (appt.patientSpecies || '') + (appt.note ? ' • ' + appt.note : ''),
    schedule: { at: notifyAt, allowWhileIdle: true },
    channelId: 'vetapp-main',
    smallIcon: 'ic_launcher',
    iconColor: '#2e7d32',
    sound: 'default',
    foreground: true,        // <-- ВОТ ЭТО! Всплывающее уведомление даже когда приложение открыто
    largeBody: (appt.time || '') + '\n' + (appt.patientName || '') + '\n' + (appt.note || ''),  // развёрнутый текст
    summaryText: 'VetApp — напоминание',  // подпись в развёрнутом виде
    ongoing: false
  }]
});
  } catch (e) { console.error('Ошибка напоминания:', e); }
}

async function cancelApptNotification(apptId) {
  if (!isNativeApp()) return;
  try {
    var notifId = 1000 + (apptId % 100000);
    await LocalNotifications.cancel({ notifications: [{ id: notifId }] });
  } catch (e) { console.error('Ошибка отмены:', e); }
}

async function rescheduleAllNotifications() {
  if (!isNativeApp()) return;
  try {
    var granted = await requestLocalNotificationPermission();
    if (!granted) return;
    await createNotificationChannel();
    await scheduleMorningNotification();
    var now = new Date();
    appts.forEach(function(a) {
      if (!a.date || !a.time) return;
      var parts = a.date.split('-');
      var timeParts = a.time.split(':');
      var when = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), parseInt(timeParts[0]), parseInt(timeParts[1]));
      if (when > now) scheduleApptNotification(a);
    });
  } catch (e) { console.error('Ошибка rescheduleAll:', e); }
}

/* ==== ВАКЦИНАЦИИ: СИНХРОНИЗАЦИЯ + УВЕДОМЛЕНИЯ ==== */

// Считает дату следующей вакцинации: date + 1 год
function calcNextVaccinationDate(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr + 'T12:00:00');
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
}

// Синхронизирует запись-вакцинацию с календарём
function syncVaccinationToCalendar(patient, record) {
  if (!patient || !record) return;

  // Ищем связанную запись в календаре
  var existing = appts.find(function(a) {
    return a.sourceRecordId === record.id;
  });

  // Если это не вакцинация — удаляем из календаря и выходим
  if (record.type !== 'vaccination') {
    if (existing) {
      cancelApptNotification(existing.id);
      appts = appts.filter(function(a) { return a.sourceRecordId !== record.id; });
      save();
      updateStats();
    }
    return;
  }

  // Считаем дату следующей вакцинации
  var nextDate = calcNextVaccinationDate(record.date);
  if (!nextDate) return;

  // Если запись в календаре уже есть — обновляем
  if (existing) {
    existing.date = nextDate;
    existing.patientId = patient.id;
    existing.patientName = patient.name || '';
    existing.patientSpecies = patient.species || '';
    existing.patientPhone = patient.phone || '';
    existing.type = 'vaccination';
    existing.note = 'Плановая вакцинация' + (record.drug ? ' — ' + record.drug : '');
    save();
    updateStats();
    scheduleApptNotification(existing);
  } else {
    // Создаём новую
    var newAppt = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      date: nextDate,
      time: '10:00',
      patientId: patient.id,
      patientName: patient.name || '',
      patientSpecies: patient.species || '',
      patientPhone: patient.phone || '',
      type: 'vaccination',
      note: 'Плановая вакцинация' + (record.drug ? ' — ' + record.drug : ''),
      sourceRecordId: record.id
    };
    appts.push(newAppt);
    save();
    updateStats();
    scheduleApptNotification(newAppt);
  }
}

// Планирует уведомления по вакцинации (за 7 дней и в день Х)
async function scheduleVaccinationNotification(patient, record) {
  if (!isNativeApp()) return;
  if (!record || record.type !== 'vaccination') return;

  var nextDate = calcNextVaccinationDate(record.date);
  if (!nextDate) return;

  try {
    var granted = await requestLocalNotificationPermission();
    if (!granted) return;

    var parts = nextDate.split('-');
    var when = new Date(
      parseInt(parts[0]),
      parseInt(parts[1]) - 1,
      parseInt(parts[2]),
      9, 0, 0, 0
    );

    var now = new Date();
    var patientName = patient.name || 'пациент';
    var drugName = record.drug || 'вакцинация';

    var idWeek = 200000 + (record.id % 90000);
    var idDay = 300000 + (record.id % 90000);

    // За 7 дней
    var weekBefore = new Date(when.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (weekBefore > now) {
      await LocalNotifications.cancel({ notifications: [{ id: idWeek }] });
      await LocalNotifications.schedule({
        notifications: [{
          id: idWeek,
          title: '💉 Через неделю — вакцинация',
          body: patientName + ' • ' + drugName,
          largeBody: 'Пациент: ' + patientName + '\nПрепарат: ' + drugName + '\nДата вакцинации: ' + nextDate,
          summaryText: 'VetApp — вакцинация',
          schedule: { at: weekBefore, allowWhileIdle: true },
          channelId: 'vetapp-main',
          smallIcon: 'ic_launcher',
          iconColor: '#2e7d32',
          sound: 'default',
          foreground: true,
          ongoing: false
        }]
      });
    }

    // В день вакцинации в 9:00
    if (when > now) {
      await LocalNotifications.cancel({ notifications: [{ id: idDay }] });
      await LocalNotifications.schedule({
        notifications: [{
          id: idDay,
          title: '💉 Сегодня вакцинация!',
          body: patientName + ' • ' + drugName,
          largeBody: 'Пациент: ' + patientName + '\nПрепарат: ' + drugName + '\nДата: ' + nextDate,
          summaryText: 'VetApp — вакцинация',
          schedule: { at: when, allowWhileIdle: true },
          channelId: 'vetapp-main',
          smallIcon: 'ic_launcher',
          iconColor: '#e67e22',
          sound: 'default',
          foreground: true,
          ongoing: false
        }]
      });
    }
  } catch (e) {
    console.error('Ошибка планирования вакцинации:', e);
  }
}

// Пересчёт всех вакцинаций при старте приложения
async function rescheduleAllVaccinationNotifications() {
  if (!isNativeApp()) return;
  try {
    var granted = await requestLocalNotificationPermission();
    if (!granted) return;

    patients.forEach(function(p) {
      (p.records || []).forEach(function(r) {
        if (r.type === 'vaccination') {
          syncVaccinationToCalendar(p, r);
          scheduleVaccinationNotification(p, r);
        }
      });
    });
  } catch (e) {
    console.error('Ошибка пересчёта вакцинаций:', e);
  }
}

// Отмена уведомлений для удалённой записи
async function cancelVaccinationNotification(recordId) {
  if (!isNativeApp()) return;
  try {
    var idWeek = 200000 + (recordId % 90000);
    var idDay = 300000 + (recordId % 90000);
    await LocalNotifications.cancel({ notifications: [{ id: idWeek }, { id: idDay }] });
  } catch (e) {
    console.error('Ошибка отмены уведомления вакцинации:', e);
  }
}

/* ==== ЭКСПОРТ НАЗНАЧЕНИЙ ДЛЯ ВЛАДЕЛЬЦА ==== */

function formatDateRu(dateStr) {
  if (!dateStr) return '—';
  var parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return parts[2] + '.' + parts[1] + '.' + parts[0];
}

function buildOwnerText(patient, record) {
  if (!patient || !record) return '';

  var lines = [];

  if (record.type === 'vaccination') {
    // Текст для вакцинации
    lines.push('💉 Вакцинация — VetApp');
    lines.push('');
    lines.push('Пациент: ' + (patient.name || '—') + (patient.species ? ' (' + patient.species + ')' : ''));
    if (patient.owner) lines.push('Владелец: ' + patient.owner);
    lines.push('Дата: ' + formatDateRu(record.date));
    if (record.drug) lines.push('Препарат: ' + record.drug);

    var nextDate = calcNextVaccinationDate(record.date);
    if (nextDate) {
      lines.push('');
      lines.push('Следующая вакцинация: ' + formatDateRu(nextDate));
      lines.push('');
      lines.push('Рекомендуем записаться заранее.');
    }
  } else {
    // Текст для приёма / операции / другого
    var typeLabels = {
      appointment: '📋 Выписка из VetApp',
      surgery: '🔪 Выписка после операции — VetApp',
      other: '📌 Запись из VetApp'
    };
    lines.push(typeLabels[record.type] || '📋 Выписка из VetApp');
    lines.push('');
    lines.push('Пациент: ' + (patient.name || '—') + (patient.species ? ' (' + patient.species + ')' : ''));
    if (patient.owner) lines.push('Владелец: ' + patient.owner);
    lines.push('Дата приёма: ' + formatDateRu(record.date));
    if (record.weight) lines.push('Вес: ' + record.weight + ' кг');
    if (record.temperature) lines.push('Температура: ' + record.temperature + ' °C');

    if (record.complaint) {
      lines.push('');
      lines.push('Цель обращения: ' + record.complaint);
    }
    if (record.diagnosis) {
      lines.push('');
      lines.push('Диагноз: ' + record.diagnosis);
    }
    if (record.treatment) {
      lines.push('');
      lines.push('Назначения:');
      lines.push(record.treatment);
    }
    if (record.recommendations) {
      lines.push('');
      lines.push('Рекомендации:');
      lines.push(record.recommendations);
    }
    if (record.note) {
      lines.push('');
      lines.push('Примечание: ' + record.note);
    }
  }

  return lines.join('\n');
}

async function shareRecordToOwner(recordId) {
  var p = patients.find(function(x) { return x.id === openedPatientId; });
  if (!p) {
    alert('Пациент не найден');
    return;
  }
  var r = p.records.find(function(x) { return x.id === recordId; });
  if (!r) {
    alert('Запись не найдена');
    return;
  }

  var text = buildOwnerText(p, r);
  if (!text) {
    alert('Нечего отправлять');
    return;
  }

  var Share = window.Capacitor?.Plugins?.Share;
  var Clipboard = window.Capacitor?.Plugins?.Clipboard;

  if (Share) {
    try {
      await Share.share({
        title: 'Выписка VetApp — ' + (p.name || ''),
        text: text,
        dialogTitle: 'Отправить владельцу'
      });
      return;
    } catch (e) {
      console.error('Ошибка Share:', e);
    }
  }

  // Фолбэк для браузера — копирование в буфер
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      alert('Текст скопирован в буфер обмена');
    } else {
      alert(text);
    }
  } catch (e) {
    console.error('Ошибка копирования:', e);
    alert(text);
  }
}

window.shareRecordToOwner = shareRecordToOwner;

/* ==== ПИКЕР ДАТЫ ==== */
var datePickerTarget = null;
var datePickerYear = null;
var datePickerMonth = null;

function openDatePicker(inputId) {
  datePickerTarget = inputId;
  var input = document.getElementById(inputId);
  if (!input) return;

  var current = input.value;
  var today = new Date();

  if (current && /^\d{4}-\d{2}-\d{2}$/.test(current)) {
    var parts = current.split('-');
    datePickerYear = parseInt(parts[0], 10);
    datePickerMonth = parseInt(parts[1], 10) - 1;
  } else {
    datePickerYear = today.getFullYear();
    datePickerMonth = today.getMonth();
  }

  renderDatePicker();
  document.getElementById('datePickerOverlay').classList.add('show');
}

function renderDatePicker() {
  document.getElementById('datePickerTitle').textContent = MONTHS_RU[datePickerMonth] + ' ' + datePickerYear;

  var grid = document.getElementById('datePickerGrid');
  var input = document.getElementById(datePickerTarget);
  var selectedIso = input ? input.value : '';
  var today = formatDate(new Date());

  var firstDay = new Date(datePickerYear, datePickerMonth, 1);
  var lastDay = new Date(datePickerYear, datePickerMonth + 1, 0);
  var startWeekday = firstDay.getDay();
  if (startWeekday === 0) startWeekday = 7;
  startWeekday--;

  var daysInMonth = lastDay.getDate();
  var prevMonthLastDay = new Date(datePickerYear, datePickerMonth, 0).getDate();

  var html = '';
  var i;
  for (i = startWeekday - 1; i >= 0; i--) {
    html += '<div class="dp-day other">' + (prevMonthLastDay - i) + '</div>';
  }
  for (var d = 1; d <= daysInMonth; d++) {
    var dateStr = datePickerYear + '-' + String(datePickerMonth + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    var cls = 'dp-day';
    if (dateStr === today) cls += ' today';
    if (dateStr === selectedIso) cls += ' selected';
    html += '<div class="' + cls + '" onclick="pickDate(\'' + dateStr + '\')">' + d + '</div>';
  }
  var totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
  var nextDays = totalCells - (startWeekday + daysInMonth);
  for (var n = 1; n <= nextDays; n++) {
    html += '<div class="dp-day other">' + n + '</div>';
  }
  grid.innerHTML = html;
}

function datePickerPrev() {
  datePickerMonth--;
  if (datePickerMonth < 0) { datePickerMonth = 11; datePickerYear--; }
  renderDatePicker();
}
function datePickerNext() {
  datePickerMonth++;
  if (datePickerMonth > 11) { datePickerMonth = 0; datePickerYear++; }
  renderDatePicker();
}
function datePickerToday() {
  pickDate(formatDate(new Date()));
}
function pickDate(isoDate) {
  var input = document.getElementById(datePickerTarget);
  if (input) input.value = isoDate;
  closeDatePicker();
}
function closeDatePicker() {
  document.getElementById('datePickerOverlay').classList.remove('show');
  datePickerTarget = null;
}

/* ==== ПИКЕР ВРЕМЕНИ ==== */
var timePickerTarget = null;

function openTimePicker(inputId) {
  timePickerTarget = inputId;
  var input = document.getElementById(inputId);
  if (!input) return;

  var current = input.value || '10:00';
  var parts = current.split(':');
  var hh = (parts[0] || '10').padStart(2, '0');
  var mm = (parts[1] || '00').padStart(2, '0');

  var hhSel = document.getElementById('timePickerHours');
  var mmSel = document.getElementById('timePickerMinutes');

  if (hhSel.options.length === 0) {
    for (var h = 0; h < 24; h++) {
      var hv = String(h).padStart(2, '0');
      var opt = document.createElement('option');
      opt.value = hv;
      opt.textContent = hv;
      hhSel.appendChild(opt);
    }
  }
  if (mmSel.options.length === 0) {
    for (var m = 0; m < 60; m += 5) {
      var mv = String(m).padStart(2, '0');
      var opt = document.createElement('option');
      opt.value = mv;
      opt.textContent = mv;
      mmSel.appendChild(opt);
    }
  }

  hhSel.value = hh;
  mmSel.value = mm;

  // Если в текущем значении минуты не кратны 5 — добавим их в список
  if (!mmSel.querySelector('option[value="' + mm + '"]')) {
    var opt = document.createElement('option');
    opt.value = mm;
    opt.textContent = mm;
    mmSel.appendChild(opt);
    mmSel.value = mm;
  }

  document.getElementById('timePickerOverlay').classList.add('show');
}

function pickTime() {
  var hh = document.getElementById('timePickerHours').value;
  var mm = document.getElementById('timePickerMinutes').value;
  var input = document.getElementById(timePickerTarget);
  if (input) input.value = hh + ':' + mm;
  closeTimePicker();
}
function closeTimePicker() {
  document.getElementById('timePickerOverlay').classList.remove('show');
  timePickerTarget = null;
}

/* ==== АВТООБНОВЛЕНИЕ APK ==== */
var Filesystem = window.Capacitor?.Plugins?.Filesystem;
var FileOpener = window.Capacitor?.Plugins?.FileOpener;

var UPDATE_JSON_URL = 'https://warizernir.github.io/vetapp/version.json';

async function checkForUpdate() {
    if (!Filesystem || !FileOpener) {
        console.log('Не APK, пропускаю проверку обновлений');
        return;
    }
    try {
        var res = await fetch(UPDATE_JSON_URL + '?t=' + Date.now());
        var info = await res.json();
        var App = window.Capacitor?.Plugins?.App;
        var appInfo = await App.getInfo();
        var currentCode = parseInt(appInfo.build, 10) || 0;
        if (info.versionCode <= currentCode) {
            console.log('Версия актуальна:', currentCode);
            return;
        }
        if (!confirm('Доступно обновление VetApp ' + info.versionName + '\n\n' +
                     (info.changelog || '') + '\n\nУстановить?')) {
            return;
        }
        var download = await Filesystem.downloadFile({
            url: info.apkUrl,
            path: 'VetApp-' + info.versionCode + '.apk',
            directory: 'CACHE'
        });
        await FileOpener.open({
            filePath: download.path,
            contentType: 'application/vnd.android.package-archive'
        });
    } catch (e) {
        console.error('Ошибка обновления:', e);
    }
}

setTimeout(checkForUpdate, 3000);

/* ==== ЗВОНОК ИЗ ПРИЛОЖЕНИЯ ==== */
var AppLauncher = window.Capacitor?.Plugins?.AppLauncher;

async function callPatient(phone) {
  if (!phone) {
    alert('У пациента не указан телефон');
    return;
  }
  var cleanPhone = String(phone).replace(/[^0-9+]/g, '');
  var telUrl = 'tel:' + cleanPhone;

  if (AppLauncher) {
    try {
      await AppLauncher.openUrl({ url: telUrl });
      return;
    } catch (e) {
      console.error('Ошибка AppLauncher:', e);
    }
  }
  window.location.href = telUrl;
}

window.callPatient = callPatient;

/* ==== ВОЗРАСТ ИЗ ДАТЫ РОЖДЕНИЯ ==== */
function calcAge(birthDateStr) {
  if (!birthDateStr) return '';
  var birth = new Date(birthDateStr + 'T12:00:00');
  if (isNaN(birth)) return '';

  var now = new Date();
  var years = now.getFullYear() - birth.getFullYear();
  var months = now.getMonth() - birth.getMonth();

  if (months < 0) {
    years--;
    months += 12;
  }
  // Корректировка по дню месяца
  if (now.getDate() < birth.getDate()) {
    months--;
    if (months < 0) {
      years--;
      months += 12;
    }
  }

  if (years < 0) return ''; // дата в будущем
  if (years === 0 && months === 0) return 'меньше месяца';
  if (years === 0) return months + ' мес.';
  if (months === 0) return years + ' ' + pluralYears(years);
  return years + ' ' + pluralYears(years) + ' ' + months + ' мес.';
}

function pluralYears(n) {
  var last = n % 10;
  var lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return 'лет';
  if (last === 1) return 'год';
  if (last >= 2 && last <= 4) return 'года';
  return 'лет';
}