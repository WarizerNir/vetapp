/* ==== ДАННЫЕ ==== */
var patients = JSON.parse(localStorage.getItem('vet_patients') || '[]');
var drugs = JSON.parse(localStorage.getItem('vet_drugs') || '[]');
var notes = JSON.parse(localStorage.getItem('vet_notes') || '[]');
var appts = JSON.parse(localStorage.getItem('vet_appointments') || '[]');
var openDrugCats = JSON.parse(localStorage.getItem('vet_open_drug_cats') || '[]');
var openNoteCats = JSON.parse(localStorage.getItem('vet_open_note_cats') || '[]');

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
    type: a.type || 'appointment', note: a.note || ''
  };
});

var currentSpecies = 'dog';
var openedPatientId = null;
var calYear = null, calMonth = null, calSelectedDate = null;
var apptMode = 'base';

var ALL_TABS = ['home', 'calc', 'calendar', 'search', 'add', 'drugs', 'notes', 'settings'];
var MOBILE_NAV = ['home', 'calc', 'calendar', 'search', 'add'];

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
}

function isDesktop() { return window.innerWidth >= 768; }

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
function goHome() { goTo('home'); }

function goTo(tab) {
  document.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
  document.getElementById('tab-' + tab).classList.add('active');

  var titles = {
    home: '🌿 VetApp', calc: '🧮 Калькулятор', calendar: '📅 Календарь',
    search: '🐾 Пациенты', add: '➕ Добавить', drugs: '💊 Препараты',
    notes: '📋 Памятки', settings: '⚙️ Настройки'
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
      MOBILE_NAV.forEach(function(t) { document.getElementById('nav-' + t).classList.toggle('active', t === tab); });
    } else nav.classList.remove('show');
  }

  window.scrollTo(0, 0);
  openedPatientId = null;

  if (tab === 'search') renderSearch();
  if (tab === 'drugs') renderDrugs();
  if (tab === 'notes') renderNotes();
  if (tab === 'settings') updateSettingsInfo();
  if (tab === 'calc') updateIpsForm();
  if (tab === 'home') { updateStats(); renderPermBanner(); }
  if (tab === 'calendar') initCalendar();
  if (tab === 'add' && !document.getElementById('recordDate').value) {
    document.getElementById('recordDate').value = new Date().toISOString().split('T')[0];
  }
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
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      var titles = todayAppts.map(function(a) { return (a.time || '?') + ' — ' + (a.patientName || '?'); }).join('\n');
      new Notification('🔔 Записи на сегодня — VetApp', {
        body: todayAppts.length + ' записей:\n' + titles,
        tag: 'vetapp-today'
      });
    } catch (e) {}
  }
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
    if (perm === 'granted') {
      try {
        new Notification('🌿 VetApp', { body: 'Уведомления включены!', tag: 'vetapp-test' });
      } catch (e) {}
    }
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
        '<input type="time" id="newApptTime" value="10:00">' +
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
  var newTime = prompt('Время (ЧЧ:ММ):', a.time || '10:00');
  if (newTime === null) return;
  var newName = prompt('Имя пациента:', a.patientName || '');
  if (newName === null) return;
  var newNote = prompt('Заметка:', a.note || '');
  if (newNote === null) return;
  a.time = newTime.trim() || a.time;
  a.patientName = newName.trim() || a.patientName;
  a.note = newNote.trim();
  if (a.patientId) {
    var p = patients.find(function(x) { return x.id == a.patientId; });
    if (p && p.name !== a.patientName) a.patientId = null;
  }
  save();
  renderCalendar();
  renderDayPanel();
  var edited = appts.find(function(x) { return x.id === id; });
  if (edited) scheduleApptNotification(edited);
}

function deleteAppt(id) {
  if (!confirm('Удалить запись?')) return;
  cancelApptNotification(id);
  appts = appts.filter(function(a) { return a.id !== id; });
  save();
  updateStats();
  renderCalendar();
  renderDayPanel();
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
  if (d.doseDog) sub.push('🐕 ' + d.doseDog + ' мг/кг');
  if (d.doseCat) sub.push('🐈 ' + d.doseCat + ' мг/кг');
  return '<div class="item-ac" onclick="selectDrug(\'' + d.id + '\')">' +
    '<div class="ac-name">' + d.name + (d.category ? ' <span class="cat-label">' + d.category + '</span>' : '') + '</div>' +
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
function applyDrugToForm(drug) {
  var dose = currentSpecies === 'dog' ? drug.doseDog : drug.doseCat;
  document.getElementById('calcDose').value = dose || '';
  var hint = document.getElementById('doseHint');
  if (dose) hint.textContent = 'Доза из базы: ' + dose + ' мг/кг для ' + (currentSpecies === 'dog' ? 'собаки' : 'кошки');
  else hint.textContent = 'Доза для этого вида не указана. Введи вручную.';
  hint.classList.add('show');
}
document.addEventListener('click', function(e) {
  if (!e.target.closest('.autocomplete-wrap')) {
    document.getElementById('drugAutocomplete').classList.remove('show');
  }
});

function calcByDrug() {
  var w = parseFloat(document.getElementById('calcWeight').value);
  var d = parseFloat(document.getElementById('calcDose').value);
  var drugName = document.getElementById('drugSearch').value.trim();
  var res = document.getElementById('calcResult');
  if (!w || !d) { res.textContent = '⚠️ Заполни вес и дозу'; res.classList.add('show', 'error'); return; }
  var totalMg = w * d;
  var out = drugName ? drugName + ' • ' + (currentSpecies === 'dog' ? 'собака' : 'кошка') + '\n' : '';
  out += 'Доза: ' + d + ' мг/кг × ' + w + ' кг\n\n→ Нужно дать: ' + totalMg.toFixed(2) + ' мг';
  res.textContent = out;
  res.classList.add('show');
  res.classList.remove('error');
}
function calcDose() {
  var w = parseFloat(document.getElementById('weight').value);
  var d = parseFloat(document.getElementById('dose').value);
  var res = document.getElementById('manualResult');
  if (!w || !d) { res.textContent = '⚠️ Заполни вес и дозу'; res.classList.add('show', 'error'); return; }
  res.textContent = 'Доза: ' + d + ' мг/кг × ' + w + ' кг\n\n→ Нужно дать: ' + (w * d).toFixed(2) + ' мг';
  res.classList.add('show');
  res.classList.remove('error');
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
}

/* ==== ПАЦИЕНТЫ ==== */
function toggleRecordFields() {
  var type = document.getElementById('recordType').value;
  document.getElementById('appointmentFields').style.display = type === 'appointment' ? 'block' : 'none';
  document.getElementById('vaccinationFields').style.display = type === 'vaccination' ? 'block' : 'none';
}
function savePatient() {
  var name = document.getElementById('pName').value.trim();
  var date = document.getElementById('recordDate').value;
  if (!name) return alert('Введи кличку');
  if (!date) return alert('Выбери дату');
  var patient = {
    id: Date.now(), name: name,
    species: document.getElementById('pSpecies').value.trim(),
    owner: document.getElementById('pOwner').value.trim(),
    phone: document.getElementById('pPhone').value.trim(),
    records: []
  };
  var type = document.getElementById('recordType').value;
  if (type === 'vaccination') {
    var drug = document.getElementById('vaxDrug').value.trim();
    if (!drug) return alert('Укажи препарат');
    patient.records.push({ id: Date.now()+1, type: 'vaccination', drug: drug, date: date });
  } else {
    var note = document.getElementById('note').value.trim();
    patient.records.push({ id: Date.now()+1, type: 'appointment', date: date, note: note });
  }
  patients.push(patient);
  save();
  ['pName','pSpecies','pOwner','pPhone','note','vaxDrug'].forEach(function(id) { document.getElementById(id).value = ''; });
  document.getElementById('recordDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('recordType').value = 'appointment';
  toggleRecordFields();
  updateStats();
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
    box.innerHTML = '<div class="empty">' + (q ? 'Ничего не найдено' : 'Пока никого нет') + '</div>';
    return;
  }
  box.innerHTML = list.map(function(p) {
    return '<div class="item clickable" onclick="openPatient(' + p.id + ')">' +
      '<div class="name">' + p.name + (p.species ? ' (' + p.species + ')' : '') + '</div>' +
      '<div class="info">' + (p.owner || '') + (p.phone ? ' • ' + p.phone : '') + '</div>' +
      '<div class="sub">Записей: ' + (p.records || []).length + '</div>' +
      '<div class="open-hint">Нажми, чтобы открыть →</div>' +
    '</div>';
  }).join('');
}
function openPatient(id) {
  var patient = patients.find(function(p) { return p.id === id; });
  if (!patient) return;
  openedPatientId = id;
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
  var records = (p.records || []).slice().sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
  var recordsHtml;
  if (records.length === 0) {
    recordsHtml = '<div class="empty">Записей нет</div>';
  } else {
    recordsHtml = records.map(function(r) {
      if (r.type === 'vaccination') {
        var nextDate = new Date(r.date);
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        var daysLeft = Math.ceil((nextDate - new Date()) / (1000 * 60 * 60 * 24));
        var badge = '';
        if (daysLeft < 0) badge = '<span class="badge" style="background:#ffcdd2;color:#c62828;">Просрочено</span>';
        else if (daysLeft < 30) badge = '<span class="badge">Через ' + daysLeft + ' дн.</span>';
        return '<div class="record-item vax">' +
          '<div class="rtype">💉 Вакцинация ' + badge + '</div>' +
          '<div class="rline"><b>Препарат:</b> ' + r.drug + '</div>' +
          '<div class="rline"><b>Дата:</b> ' + r.date + '</div>' +
          '<div class="rline"><b>Следующая:</b> ' + nextDate.toLocaleDateString('ru-RU') + '</div>' +
          '<div class="actions">' +
            '<button class="btn btn-small btn-blue" onclick="editRecord(' + r.id + ')">Изменить</button>' +
            '<button class="btn btn-small btn-red" onclick="deleteRecord(' + r.id + ')">Удалить</button>' +
          '</div>' +
        '</div>';
      } else {
        return '<div class="record-item">' +
          '<div class="rtype">📋 Приём</div>' +
          '<div class="rline"><b>Дата:</b> ' + r.date + '</div>' +
          (r.note ? '<div class="rline"><b>Заметка:</b> ' + r.note + '</div>' : '') +
          '<div class="actions">' +
            '<button class="btn btn-small btn-blue" onclick="editRecord(' + r.id + ')">Изменить</button>' +
            '<button class="btn btn-small btn-red" onclick="deleteRecord(' + r.id + ')">Удалить</button>' +
          '</div>' +
        '</div>';
      }
    }).join('');
  }
  box.innerHTML =
    '<div class="patient-header">' +
      '<div class="pname">' + p.name + '</div>' +
      '<div class="pmeta">' +
        (p.species ? '<b>Вид:</b> ' + p.species + '<br>' : '') +
        (p.owner ? '<b>Владелец:</b> ' + p.owner + '<br>' : '') +
        (p.phone ? '<b>Телефон:</b> ' + p.phone : '') +
      '</div>' +
      '<div class="inline-actions">' +
        '<button class="btn btn-blue btn-small" onclick="toggleEditPatient()">✏️ Редактировать</button>' +
      '</div>' +
    '</div>' +
    '<div class="card" id="editPatientCard" style="display:none">' +
      '<h3>✏️ Редактировать</h3>' +
      '<label>Кличка</label><input type="text" id="epName" value="' + (p.name || '') + '">' +
      '<label>Вид</label><input type="text" id="epSpecies" value="' + (p.species || '') + '">' +
      '<label>Владелец</label><input type="text" id="epOwner" value="' + (p.owner || '') + '">' +
      '<label>Телефон</label><input type="tel" id="epPhone" value="' + (p.phone || '') + '">' +
      '<button class="btn btn-green" onclick="savePatientEdit()">Сохранить</button>' +
    '</div>' +
    '<div class="card">' +
      '<h3>➕ Добавить запись</h3>' +
      '<label>Дата</label><input type="date" id="newRecordDate">' +
      '<label>Тип</label>' +
      '<select id="newRecordType" onchange="toggleNewRecordFields()">' +
        '<option value="appointment">📋 Приём</option>' +
        '<option value="vaccination">💉 Вакцинация</option>' +
      '</select>' +
      '<div id="newAppointmentFields"><label>Заметка</label><input type="text" id="newNote" placeholder="осмотр"></div>' +
      '<div id="newVaccinationFields" style="display:none"><label>Препарат</label><input type="text" id="newVaxDrug" placeholder="Нобивак"></div>' +
      '<button class="btn" onclick="addRecordToPatient()">Добавить</button>' +
    '</div>' +
    '<div class="card"><h3>📅 История (' + records.length + ')</h3>' + recordsHtml + '</div>' +
    '<div class="card"><h3>🗑 Удаление</h3><button class="btn btn-red" onclick="deletePatient(' + p.id + ')">Удалить пациента</button></div>';
  document.getElementById('newRecordDate').value = new Date().toISOString().split('T')[0];
}
function toggleEditPatient() {
  var card = document.getElementById('editPatientCard');
  card.style.display = card.style.display === 'none' ? 'block' : 'none';
}
function savePatientEdit() {
  var p = patients.find(function(x) { return x.id === openedPatientId; });
  if (!p) return;
  var name = document.getElementById('epName').value.trim();
  if (!name) return alert('Кличка не может быть пустой');
  p.name = name;
  p.species = document.getElementById('epSpecies').value.trim();
  p.owner = document.getElementById('epOwner').value.trim();
  p.phone = document.getElementById('epPhone').value.trim();
  save();
  document.getElementById('appTitle').textContent = p.name;
  renderPatientCard();
  alert('Сохранено');
}
function toggleNewRecordFields() {
  var type = document.getElementById('newRecordType').value;
  document.getElementById('newAppointmentFields').style.display = type === 'appointment' ? 'block' : 'none';
  document.getElementById('newVaccinationFields').style.display = type === 'vaccination' ? 'block' : 'none';
}
function addRecordToPatient() {
  var p = patients.find(function(x) { return x.id === openedPatientId; });
  if (!p) return;
  var date = document.getElementById('newRecordDate').value;
  if (!date) return alert('Выбери дату');
  var type = document.getElementById('newRecordType').value;
  if (type === 'vaccination') {
    var drug = document.getElementById('newVaxDrug').value.trim();
    if (!drug) return alert('Укажи препарат');
    p.records.push({ id: Date.now(), type: 'vaccination', drug: drug, date: date });
  } else {
    var note = document.getElementById('newNote').value.trim();
    p.records.push({ id: Date.now(), type: 'appointment', date: date, note: note });
  }
  save();
  renderPatientCard();
}
function editRecord(recordId) {
  var p = patients.find(function(x) { return x.id === openedPatientId; });
  if (!p) return;
  var r = p.records.find(function(x) { return x.id === recordId; });
  if (!r) return;
  var date = prompt('Дата (ГГГГ-ММ-ДД):', r.date);
  if (date === null) return;
  if (r.type === 'vaccination') {
    var drug = prompt('Препарат:', r.drug || '');
    if (drug === null) return;
    r.drug = drug.trim();
  } else {
    var note = prompt('Заметка:', r.note || '');
    if (note === null) return;
    r.note = note.trim();
  }
  r.date = date.trim();
  save();
  renderPatientCard();
}
function deleteRecord(recordId) {
  if (!confirm('Удалить запись?')) return;
  var p = patients.find(function(x) { return x.id === openedPatientId; });
  if (!p) return;
  p.records = p.records.filter(function(x) { return x.id !== recordId; });
  save();
  renderPatientCard();
}
function deletePatient(id) {
  if (!confirm('Удалить пациента и все записи?')) return;
  patients = patients.filter(function(p) { return p.id !== id; });
  save();
  updateStats();
  goTo('search');
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
  if (!confirm('Удалить препарат?')) return;
  drugs = drugs.filter(function(d) { return d.id !== id; });
  save();
  renderDrugs();
  updateStats();
}
function editDrug(id) {
  var drug = drugs.find(function(d) { return d.id === id; });
  if (!drug) return;
  var name = prompt('Название:', drug.name);
  if (name === null) return;
  var category = prompt('Категория:', drug.category || '');
  if (category === null) return;
  var doseDog = prompt('Доза для собаки:', drug.doseDog || '');
  if (doseDog === null) return;
  var doseCat = prompt('Доза для кошки:', drug.doseCat || '');
  if (doseCat === null) return;
  var note = prompt('Заметка:', drug.note || '');
  if (note === null) return;
  drug.name = name.trim() || drug.name;
  drug.category = category.trim();
  drug.doseDog = doseDog.trim();
  drug.doseCat = doseCat.trim();
  drug.note = note.trim();
  save();
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
    if (list.length === 0) { box.innerHTML = '<div class="empty">Ничего не найдено</div>'; return; }
    var sorted = list.slice().sort(function(a, b) { return (a.name || '').localeCompare(b.name || ''); });
    box.innerHTML = sorted.slice(0, 200).map(function(d) { return renderDrugCard(d); }).join('');
    return;
  }
  if (drugs.length === 0) { box.innerHTML = '<div class="empty">База пуста. Добавь первый препарат.</div>'; return; }
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
function renderDrugCard(d) {
  var details = [];
  if (d.doseDog) details.push('🐕 ' + d.doseDog + ' мг/кг');
  if (d.doseCat) details.push('🐈 ' + d.doseCat + ' мг/кг');
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
  if (!confirm('Удалить памятку?')) return;
  notes = notes.filter(function(n) { return n.id !== id; });
  save();
  renderNotes();
  updateSettingsInfo();
  updateStats();
}
function editNote(id) {
  var n = notes.find(function(x) { return x.id === id; });
  if (!n) return;
  var newTitle = prompt('Название:', n.title);
  if (newTitle === null) return;
  var newCategory = prompt('Категория:', n.category || '');
  if (newCategory === null) return;
  var newBody = prompt('Текст:', n.body);
  if (newBody === null) return;
  n.title = newTitle.trim() || n.title;
  n.category = newCategory.trim();
  n.body = newBody.trim() || n.body;
  save();
  renderNotes();
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
    if (list.length === 0) { box.innerHTML = '<div class="empty">Ничего не найдено</div>'; return; }
    var sorted = list.slice().sort(function(a, b) { return (a.title || '').localeCompare(b.title || ''); });
    box.innerHTML = sorted.map(function(n) { return renderNoteCard(n); }).join('');
    return;
  }
  if (notes.length === 0) { box.innerHTML = '<div class="empty">Памяток пока нет</div>'; return; }
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
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function updateSettingsInfo() {
  document.getElementById('patientsInfo').textContent = 'Пациентов: ' + patients.length;
  document.getElementById('drugsInfo').textContent = 'Препаратов: ' + drugs.length;
  document.getElementById('notesInfo').textContent = 'Памяток: ' + notes.length;
  document.getElementById('apptsInfo').textContent = 'Записей: ' + appts.length;
  document.getElementById('fullInfo').textContent = 'Пациентов: ' + patients.length + ' • Препаратов: ' + drugs.length + ' • Памяток: ' + notes.length + ' • Записей: ' + appts.length;
  updatePermInfo();
}

function downloadJSON(data, filename) {
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function exportPatients() { downloadJSON({ type: 'vetapp-patients', version: 1, exportedAt: new Date().toISOString(), patients: patients }, 'vetapp-patients-' + new Date().toISOString().split('T')[0] + '.json'); }
function exportDrugs() { downloadJSON({ type: 'vetapp-drugs', version: 2, exportedAt: new Date().toISOString(), drugs: drugs }, 'vetapp-drugs-' + new Date().toISOString().split('T')[0] + '.json'); }
function exportNotes() { downloadJSON({ type: 'vetapp-notes', version: 2, exportedAt: new Date().toISOString(), notes: notes }, 'vetapp-notes-' + new Date().toISOString().split('T')[0] + '.json'); }
function exportAppts() { downloadJSON({ type: 'vetapp-appts', version: 1, exportedAt: new Date().toISOString(), appointments: appts }, 'vetapp-appts-' + new Date().toISOString().split('T')[0] + '.json'); }
function exportAll() { downloadJSON({ type: 'vetapp-full', version: 3, exportedAt: new Date().toISOString(), patients: patients, drugs: drugs, notes: notes, appointments: appts }, 'vetapp-backup-' + new Date().toISOString().split('T')[0] + '.json'); }

function importPatients(event) {
  var file = event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      var imported = data.patients || (Array.isArray(data) ? data : null);
      if (!imported) throw new Error('Нет пациентов');
      if (!confirm('Импортировать пациентов?\nВ файле: ' + imported.length + '\nУ тебя: ' + patients.length + '\n\nТекущие будут заменены!')) { event.target.value = ''; return; }
      patients = imported;
      save();
      updateSettingsInfo();
      updateStats();
      alert('✅ Загружено ' + patients.length);
    } catch (err) { alert('Ошибка: ' + err.message); }
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
function importNotes(event) {
  var file = event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      var imported = data.notes || (Array.isArray(data) ? data : null);
      if (!imported) throw new Error('Нет памяток');
      var added = 0, updated = 0, skipped = 0;
      imported.forEach(function(n) {
        if (!n.title) { skipped++; return; }
        var ex = notes.find(function(x) { return x.title.toLowerCase() === n.title.toLowerCase(); });
        if (ex) {
          if (n.category) ex.category = n.category;
          if (n.body) ex.body = n.body;
          updated++;
        } else {
          notes.push({ id: Date.now() + Math.random(), title: n.title, category: n.category || '', body: n.body || n.content || '' });
          added++;
        }
      });
      save();
      updateSettingsInfo();
      updateStats();
      renderNotes();
      alert('✅ Добавлено: ' + added + ', обновлено: ' + updated + ', пропущено: ' + skipped + '. Всего: ' + notes.length);
    } catch (err) { alert('Ошибка: ' + err.message); }
    event.target.value = '';
  };
  reader.readAsText(file);
}
function importAppts(event) {
  var file = event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      var imported = data.appointments || (Array.isArray(data) ? data : null);
      if (!imported) throw new Error('Нет записей');
      if (!confirm('Импортировать записи?\nВ файле: ' + imported.length + '\nУ тебя: ' + appts.length + '\n\nТекущие будут заменены!')) { event.target.value = ''; return; }
      appts = imported.map(function(a) {
        return {
          id: a.id || Date.now() + Math.random(),
          date: a.date || '', time: a.time || '',
          patientId: a.patientId || null, patientName: a.patientName || '',
          patientSpecies: a.patientSpecies || '', patientPhone: a.patientPhone || '',
          type: a.type || 'appointment', note: a.note || ''
        };
      });
      save();
      updateSettingsInfo();
      updateStats();
      alert('✅ Загружено ' + appts.length + ' записей');
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
      if (!confirm('Полный импорт:\nПациентов: ' + data.patients.length + '\nПрепаратов: ' + (data.drugs || []).length + '\nПамяток: ' + (data.notes || []).length + '\nЗаписей: ' + (data.appointments || []).length + '\n\nВСЕ данные будут заменены!')) { event.target.value = ''; return; }
      patients = data.patients;
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
  patients = []; drugs = []; notes = []; appts = []; openDrugCats = []; openNoteCats = [];
  updateSettingsInfo();
  updateStats();
  renderSearch();
  renderDrugs();
  renderNotes();
  alert('Удалено');
}

/* ==== СТАРТ ==== */
document.getElementById('recordDate').value = new Date().toISOString().split('T')[0];
applyTheme(localStorage.getItem('vet_theme') || 'system');
updateIpsForm();
updateStats();
goHome();
updatePermInfo();

setTimeout(function() {
  checkTodayApptsAndNotify();
}, 800);
setTimeout(function() {
  rescheduleAllNotifications();
}, 1500);

/* ==== ЛОКАЛЬНЫЕ УВЕДОМЛЕНИЯ (Capacitor) ==== */
var LocalNotifications = null;
try {
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
    LocalNotifications = window.Capacitor.Plugins.LocalNotifications;
  }
} catch (e) { LocalNotifications = null; }

// Утреннее уведомление в 8:00
var MORNING_HOUR = 8;
var MORNING_MINUTE = 0;

function isNativeApp() {
  return LocalNotifications !== null;
}

// Запрос разрешения на уведомления
async function requestLocalNotificationPermission() {
  if (!isNativeApp()) {
    console.log('LocalNotifications недоступен (не APK)');
    return false;
  }
  try {
    var perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      perm = await LocalNotifications.requestPermissions();
    }
    return perm.display === 'granted';
  } catch (e) {
    console.error('Ошибка запроса разрешения:', e);
    return false;
  }
}

// Утреннее уведомление (сводка на сегодня)
async function scheduleMorningNotification() {
  if (!isNativeApp()) return;
  try {
    var granted = await requestLocalNotificationPermission();
    if (!granted) return;

    // Отменяем предыдущее утреннее (если было)
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });

    // Считаем, сколько записей на сегодня
    var today = formatDate(new Date());
    var todayAppts = appts.filter(function(a) { return a.date === today; })
      .sort(function(a, b) { return (a.time || '').localeCompare(b.time || ''); });

    if (todayAppts.length === 0) return; // Нечего показывать

    // Формируем текст
    var body = todayAppts.map(function(a) {
      return (a.time || '?') + ' — ' + (a.patientName || '—');
    }).join('\n');

    // Ставим на завтра в 8:00 (или сегодня, если 8:00 ещё не прошло)
    var now = new Date();
    var target = new Date();
    target.setHours(MORNING_HOUR, MORNING_MINUTE, 0, 0);
    if (target <= now) {
      target.setDate(target.getDate() + 1); // Если 8:00 уже прошло — ставим на завтра
    }

    await LocalNotifications.schedule({
      notifications: [{
        id: 1,
        title: '📅 Сегодня ' + todayAppts.length + ' записей',
        body: body,
        schedule: { at: target },
        smallIcon: 'ic_launcher',
        sound: null,
        ongoing: false
      }]
    });
    console.log('Утреннее уведомление запланировано на', target);
  } catch (e) {
    console.error('Ошибка утреннего уведомления:', e);
  }
}

// Напоминание за час до записи
async function scheduleApptNotification(appt) {
  if (!isNativeApp()) return;
  if (!appt.date || !appt.time) return;
  try {
    var granted = await requestLocalNotificationPermission();
    if (!granted) return;

    // Парсим дату и время
    var parts = appt.date.split('-');
    var timeParts = appt.time.split(':');
    var when = new Date(
      parseInt(parts[0]),
      parseInt(parts[1]) - 1,
      parseInt(parts[2]),
      parseInt(timeParts[0]),
      parseInt(timeParts[1]),
      0,
      0
    );

    // Уведомление за час
    var notifyAt = new Date(when.getTime() - 60 * 60 * 1000);
    if (notifyAt <= new Date()) return; // Если уже прошло — не ставим

    // Уникальный ID уведомления на основе id записи
    var notifId = 1000 + (appt.id % 100000);

    // Отменяем предыдущее (если было)
    await LocalNotifications.cancel({ notifications: [{ id: notifId }] });

    await LocalNotifications.schedule({
      notifications: [{
        id: notifId,
        title: '🔔 Через час — ' + (appt.patientName || 'запись'),
        body: (appt.time || '') + ' • ' + (appt.patientSpecies || '') + (appt.note ? ' • ' + appt.note : ''),
        schedule: { at: notifyAt },
        smallIcon: 'ic_launcher',
        sound: null,
        ongoing: false
      }]
    });
    console.log('Напоминание на', notifyAt, 'для', appt.patientName);
  } catch (e) {
    console.error('Ошибка напоминания:', e);
  }
}

// Отмена уведомления для удалённой записи
async function cancelApptNotification(apptId) {
  if (!isNativeApp()) return;
  try {
    var notifId = 1000 + (apptId % 100000);
    await LocalNotifications.cancel({ notifications: [{ id: notifId }] });
  } catch (e) {
    console.error('Ошибка отмены:', e);
  }
}

// Пересчёт всех уведомлений (вызываем при старте)
async function rescheduleAllNotifications() {
  if (!isNativeApp()) return;
  try {
    var granted = await requestLocalNotificationPermission();
    if (!granted) return;

    // Утреннее
    await scheduleMorningNotification();

    // Все будущие записи
    var now = new Date();
    appts.forEach(function(a) {
      if (!a.date || !a.time) return;
      var parts = a.date.split('-');
      var timeParts = a.time.split(':');
      var when = new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2]),
        parseInt(timeParts[0]),
        parseInt(timeParts[1])
      );
      if (when > now) scheduleApptNotification(a);
    });
  } catch (e) {
    console.error('Ошибка rescheduleAll:', e);
  }
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
