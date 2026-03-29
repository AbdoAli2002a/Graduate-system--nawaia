/*============================================
  ALUMNI AFFAIRS MANAGEMENT SYSTEM
  app.js - Main Application Logic
============================================*/

'use strict';

// ===== CONSTANTS =====
const STORAGE_KEY = 'alumni_db'; // لم يعد يُستخدم للتخزين الرئيسي، يمكن استخدامه لاحقاً للتخزين المؤقت إذا رغبت
const ADMIN_USER = 'abdo';
const ADMIN_PASS = 'abdo2002';
const ROWS_PER_PAGE = 10;

// ===== STATE =====
let state = {
  loggedIn: false,
  alumni: [],
  currentPage: 1,
  filteredAlumni: [],
};

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', async () => {
  await loadDatabase();
  updateHeaderDate();
  setInterval(updateHeaderDate, 60000);
  checkSession();
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
});

// ===== DATE =====
function updateHeaderDate() {
  const now = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const el = document.getElementById('headerDate');
  if (el) el.textContent = now.toLocaleDateString('ar-EG', opts);
}

// ===== DATABASE (Firestore) =====
async function loadDatabase() {
  if (!window.db) {
    console.error('Firestore database (window.db) not found. Did you configure Firebase in index.html?');
    state.alumni = [];
    return;
  }
  try {
    const snapshot = await window.db.collection('alumni').orderBy('createdAt', 'asc').get();
    state.alumni = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })).sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', 'ar'));
  } catch (e) {
    console.error('Error loading data from Firestore', e);
    state.alumni = [];
    showToast('تعذّر تحميل البيانات من الخادم. تأكد من الاتصال بالإنترنت.', 'error');
  }
}

// ===== AUTHENTICATION =====
function checkSession() {
  const session = sessionStorage.getItem('alumni_session');
  if (session === 'ok') {
    state.loggedIn = true;
    showApp();
  } else {
    document.getElementById('loginScreen').style.display = 'flex';
  }
}

function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errEl = document.getElementById('loginError');

  // Animation on submit
  const btn = e.target.querySelector('.btn-login');
  btn.textContent = '...جارٍ التحقق';
  btn.disabled = true;

  setTimeout(() => {
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      sessionStorage.setItem('alumni_session', 'ok');
      state.loggedIn = true;
      errEl.style.display = 'none';
      document.getElementById('loginScreen').style.animation = 'none';
      document.getElementById('loginScreen').style.opacity = '0';
      document.getElementById('loginScreen').style.transition = 'opacity 0.4s ease';
      setTimeout(showApp, 400);
    } else {
      errEl.style.display = 'block';
      btn.innerHTML = '<span>تسجيل الدخول</span><span>←</span>';
      btn.disabled = false;
    }
  }, 600);
}

function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appShell').style.display = 'flex';
  showPage('dashboard', null);
}

function logout() {
  sessionStorage.removeItem('alumni_session');
  state.loggedIn = false;
  document.getElementById('appShell').style.display = 'none';
  const ls = document.getElementById('loginScreen');
  ls.style.opacity = '';
  ls.style.transition = '';
  ls.style.display = 'flex';
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  const btn = document.querySelector('.btn-login');
  btn.innerHTML = '<span>تسجيل الدخول</span><span>←</span>';
  btn.disabled = false;
}

function togglePassword() {
  const inp = document.getElementById('password');
  const btn = document.getElementById('togglePassBtn');
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
  else { inp.type = 'password'; btn.textContent = '👁️'; }
}

// ===== NAVIGATION =====
const PAGE_LABELS = {
  dashboard: 'لوحة التحكم',
  alumniList: 'قائمة الخريجين',
  addAlumni: 'إضافة خريج جديد',
  reports: 'التقارير',
  statistics: 'الإحصائيات والتوظيف',
  viewAlumni: 'ملف الخريج',
};

function showPage(pageId, navEl) {
  // Switch active nav item
  if (navEl) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    navEl.classList.add('active');
  } else {
    // find the right nav
    document.querySelectorAll('.nav-item').forEach(n => {
      const fn = n.getAttribute('onclick') || '';
      if (fn.includes(`'${pageId}'`)) n.classList.add('active');
      else n.classList.remove('active');
    });
  }

  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // Show target
  const target = document.getElementById(`page-${pageId}`);
  if (target) target.classList.add('active');

  // Update breadcrumb
  const bc = document.getElementById('breadcrumb');
  if (bc) bc.textContent = PAGE_LABELS[pageId] || '';

  // Refresh content
  switch (pageId) {
    case 'dashboard': renderDashboard(); break;
    case 'alumniList': renderAlumniList(); break;
    case 'reports': renderReports(); break;
    case 'statistics': renderStatisticsPage(); break;
    case 'addAlumni':
      document.getElementById('formTitle').textContent = 'إضافة خريج جديد';
      document.getElementById('editId').value = '';
      resetForm();
      break;
  }

  // Close sidebar on mobile
  if (window.innerWidth <= 768) hideSibebar();

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const isOpen = sidebar.classList.contains('open');
  if (isOpen) {
    hideSibebar();
  } else {
    sidebar.classList.add('open');
    // show overlay
    let overlay = document.getElementById('sidebarOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'sidebarOverlay';
      overlay.className = 'sidebar-overlay';
      overlay.onclick = hideSibebar;
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'block';
  }
}
function hideSibebar() {
  document.getElementById('sidebar').classList.remove('open');
  const overlay = document.getElementById('sidebarOverlay');
  if (overlay) overlay.style.display = 'none';
}

// ===== DASHBOARD =====
function renderDashboard() {
  const alumni = state.alumni;
  const total = alumni.length;
  const males = alumni.filter(a => a.gender === 'ذكر').length;
  const females = alumni.filter(a => a.gender === 'أنثى').length;
  const withPayment = alumni.filter(a => a.payReceipt).length;

  const stats = [
    { label: 'إجمالي الخريجين', value: total, icon: '👥', color: '#4361ee' },
    { label: 'خريجون ذكور', value: males, icon: '👨', color: '#4cc9f0' },
    { label: 'خريجات إناث', value: females, icon: '👩', color: '#f72585' },
    { label: 'سداد منجز', value: withPayment, icon: '💳', color: '#2dc653' },
  ];

  document.getElementById('statsGrid').innerHTML = stats.map(s => `
    <div class="stat-card">
      <div class="stat-icon" style="background:${s.color}20">${s.icon}</div>
      <div class="stat-info">
        <div class="stat-value" style="color:${s.color}">${s.value}</div>
        <div class="stat-label">${s.label}</div>
      </div>
    </div>
  `).join('');

  // Recent alumni
  const recent = [...alumni].reverse().slice(0, 6);
  const rl = document.getElementById('recentList');
  if (!recent.length) {
    rl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-title">لا يوجد خريجون مسجلون بعد</div></div>';
  } else {
    rl.innerHTML = recent.map(a => `
      <div class="recent-list-item">
        <div class="recent-avatar">${a.fullName ? a.fullName[0] : '?'}</div>
        <div>
          <div class="recent-name">${a.fullName || '—'}</div>
          <div class="recent-sub">رقم: ${a.gradNum || '—'} | ${a.gender || '—'}</div>
        </div>
      </div>
    `).join('');
  }

  // Quick stats
  const govMap = {};
  alumni.forEach(a => { if (a.governorate) govMap[a.governorate] = (govMap[a.governorate] || 0) + 1; });
  const topGov = Object.entries(govMap).sort((x, y) => y[1] - x[1])[0];

  const relMap = {};
  alumni.forEach(a => { if (a.religion) relMap[a.religion] = (relMap[a.religion] || 0) + 1; });

  const qs = document.getElementById('quickStats');
  qs.innerHTML = [
    { label: 'أدوا الخدمة العسكرية', val: alumni.filter(a => a.military === 'أدى الخدمة').length },
    { label: 'معفوون من الخدمة', val: alumni.filter(a => a.military === 'معفى').length },
    { label: 'أعلى محافظة تمثيلاً', val: topGov ? `${topGov[0]} (${topGov[1]})` : '—' },
    { label: 'بيانات الهوية مكتملة', val: alumni.filter(a => a.nationalId && a.idIssueDate).length },
    { label: 'لديهم بريد إلكتروني', val: alumni.filter(a => a.email).length },
    { label: 'صورة الخريج مُرفقة', val: alumni.filter(a => a.photo).length },
  ].map(i => `
    <div class="quick-stat-item">
      <span class="quick-stat-label">${i.label}</span>
      <span class="quick-stat-val">${i.val}</span>
    </div>
  `).join('');
}

// ===== ALUMNI LIST =====
function renderAlumniList() {
  state.currentPage = 1;
  state.filteredAlumni = [...state.alumni];
  renderTable();
}

function doSearch() {
  const q = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
  const df = document.getElementById('filterDepartment')?.value || '';
  const gf = document.getElementById('filterGender')?.value || '';
  const mf = document.getElementById('filterMilitary')?.value || '';

  state.filteredAlumni = state.alumni.filter(a => {
    const matchQ = !q ||
      (a.fullName || '').toLowerCase().includes(q) ||
      (a.nationalId || '').toLowerCase().includes(q) ||
      (a.gradNum || '').toLowerCase().includes(q) ||
      (a.gradEstimate || '').toLowerCase().includes(q) ||
      (a.gradTotal || '').toString().toLowerCase().includes(q) ||
      (a.gradPercent || '').toString().toLowerCase().includes(q) ||
      (a.phone || '').includes(q) ||
      (a.email || '').toLowerCase().includes(q);
    const matchD = !df || a.department === df;
    const matchG = !gf || a.gender === gf;
    const matchM = !mf || a.military === mf;
    return matchQ && matchD && matchG && matchM;
  });
  state.currentPage = 1;
  renderTable();
}

function renderTable() {
  const filtered = state.filteredAlumni;
  const total = filtered.length;
  const pages = Math.ceil(total / ROWS_PER_PAGE);
  const start = (state.currentPage - 1) * ROWS_PER_PAGE;
  const slice = filtered.slice(start, start + ROWS_PER_PAGE);

  const tbody = document.getElementById('alumniTableBody');
  const noMsg = document.getElementById('noResultsMsg');

  if (!total) {
    tbody.innerHTML = '';
    noMsg.style.display = 'block';
  } else {
    noMsg.style.display = 'none';
    tbody.innerHTML = slice.map((a, i) => `
      <tr>
        <td>${start + i + 1}</td>
        <td><strong>${a.gradNum || '—'}</strong></td>
        <td>${a.gradEstimate || '—'}</td>
        <td>${a.gradTotal || '—'}</td>
        <td>${a.gradPercent || '—'}</td>
        <td>${a.fullName || '—'}</td>
        <td><span class="badge" style="background:#e0f7fa; color:#006064">${a.department || '—'}</span></td>
        <td>${a.nationalId || '—'}</td>
        <td dir="ltr">${a.phone || '—'}</td>
        <td><span class="badge ${a.gender === 'ذكر' ? 'badge-male' : 'badge-female'}">${a.gender || '—'}</span></td>
        <td>${a.nationality || '—'}</td>
        <td>${a.governorate || '—'}</td>
        <td class="actions-cell">
          <button class="btn btn-view" onclick="viewAlumni('${a.id}')">عرض</button>
          <button class="btn btn-edit" onclick="editAlumni('${a.id}')">تعديل</button>
          <button class="btn btn-del" onclick="confirmDelete('${a.id}')">حذف</button>
        </td>
      </tr>
    `).join('');
  }

  // Pagination
  const pgEl = document.getElementById('pagination');
  if (pages <= 1) { pgEl.innerHTML = ''; return; }
  let html = '';
  if (state.currentPage > 1) html += `<button class="page-btn" onclick="goPage(${state.currentPage - 1})">‹ السابق</button>`;
  for (let p = Math.max(1, state.currentPage - 2); p <= Math.min(pages, state.currentPage + 2); p++) {
    html += `<button class="page-btn ${p === state.currentPage ? 'active' : ''}" onclick="goPage(${p})">${p}</button>`;
  }
  if (state.currentPage < pages) html += `<button class="page-btn" onclick="goPage(${state.currentPage + 1})">التالي ›</button>`;
  pgEl.innerHTML = html;
}

function goPage(p) {
  state.currentPage = p;
  renderTable();
}

// ===== ALUMNI FORM =====
function getFormData() {
  const getVal = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  return {
    fullName: getVal('f_fullName'),
    department: getVal('f_department'),
    nationalId: getVal('f_nationalId'),
    phone: getVal('f_phone'),
    dob: getVal('f_dob'),
    pob: getVal('f_pob'),
    email: getVal('f_email'),
    address: getVal('f_address'),
    gender: getVal('f_gender'),
    nationality: getVal('f_nationality'),
    religion: getVal('f_religion'),
    gradNum: getVal('f_gradNum'),
    gradEstimate: getVal('f_gradEstimate'),
    gradTotal: getVal('f_gradTotal'),
    gradPercent: getVal('f_gradPercent'),
    idIssueDate: getVal('f_idIssueDate'),
    idIssuePlace: getVal('f_idIssuePlace'),
    military: getVal('f_military'),
    militaryNum: getVal('f_militaryNum'),
    governorate: getVal('f_governorate'),
    payReceipt: getVal('f_payReceipt'),
    payDate: getVal('f_payDate'),
    occupation: getVal('f_occupation'),
    empYear: getVal('f_empYear'),
    expYears: getVal('f_expYears'),
    coursesAttended: getVal('f_coursesAttended'),
    coursesNeeded: getVal('f_coursesNeeded'),
    sigAr: getVal('f_sigAr'),
    sigEn: getVal('f_sigEn'),
    hsType: getVal('f_hsType'),
    hsGrade: getVal('f_hsGrade'),
    enrollDate: getVal('f_enrollDate'),
  };
}

async function saveAlumni(e) {
  e.preventDefault();
  const data = getFormData();

  if (!data.fullName || !data.nationalId) {
    showToast('الرجاء إدخال الاسم الكامل والرقم القوميعلى الأقل', 'error');
    return;
  }

  if (!window.db) {
    showToast('قاعدة البيانات غير مهيأة. تأكد من إعداد Firebase في الملف index.html.', 'error');
    return;
  }

  const editId = document.getElementById('editId').value;
  const now = new Date().toISOString();

  // Handle photo upload (convert to base64)
  const photoInput = document.getElementById('f_photo');
  const idCardInput = document.getElementById('f_idCard');

  const processImages = async () => {
    let photoData = '';
    let idCardData = '';

    if (photoInput.files[0]) {
      photoData = await fileToBase64(photoInput.files[0]);
    }
    if (idCardInput.files[0]) {
      idCardData = await fileToBase64(idCardInput.files[0]);
    }

    try {
      if (editId) {
        // Edit existing in Firestore
        const idx = state.alumni.findIndex(a => a.id === editId);
        if (idx > -1) {
          const updated = {
            ...state.alumni[idx],
            ...data,
            updatedAt: now,
            photo: photoData || state.alumni[idx].photo || '',
            idCard: idCardData || state.alumni[idx].idCard || '',
          };
          await window.db.collection('alumni').doc(editId).set(updated);
          state.alumni[idx] = updated;
          state.alumni.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', 'ar'));
          showToast('✅ تم تحديث بيانات الخريج بنجاح', 'success');
        }
      } else {
        // Check for duplicate nationalId
        const dup = state.alumni.find(a => a.nationalId === data.nationalId);
        if (dup) {
          showToast('⚠️ الرقم القوميمسجل مسبقاً. يرجى المراجعة.', 'error');
          return;
        }
        const newAlumnus = {
          ...data,
          photo: photoData,
          idCard: idCardData,
          createdAt: now,
          updatedAt: now,
        };
        const docRef = await window.db.collection('alumni').add(newAlumnus);
        newAlumnus.id = docRef.id;
        state.alumni.push(newAlumnus);
        state.alumni.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', 'ar'));
        showToast('✅ تم إضافة الخريج بنجاح', 'success');
      }

      resetForm();
      setTimeout(() => showPage('alumniList', null), 800);
    } catch (err) {
      console.error('Error saving alumnus to Firestore', err);
      showToast('حدث خطأ أثناء حفظ البيانات في الخادم.', 'error');
    }
  };

  processImages();
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resetForm() {
  document.getElementById('alumniForm').reset();
  document.getElementById('editId').value = '';
  document.getElementById('photoPreview').style.display = 'none';
  document.getElementById('idCardPreview').style.display = 'none';
}

function editAlumni(id) {
  const a = state.alumni.find(x => x.id === id);
  if (!a) return;

  showPage('addAlumni', null);
  document.getElementById('formTitle').textContent = 'تعديل بيانات الخريج';
  document.getElementById('editId').value = id;

  // Fill form fields
  const fields = [
    'fullName', 'department', 'nationalId', 'phone', 'dob', 'pob', 'email', 'address', 'gender',
    'nationality', 'religion', 'gradNum', 'idIssueDate', 'idIssuePlace', 'military',
    'militaryNum', 'governorate', 'payReceipt', 'payDate', 'occupation', 'empYear',
    'expYears', 'coursesAttended', 'coursesNeeded', 'sigAr',
    'sigEn', 'hsType', 'hsGrade', 'enrollDate',
    'gradEstimate', 'gradTotal', 'gradPercent'
  ];
  fields.forEach(f => {
    const el = document.getElementById('f_' + f);
    if (el && a[f] !== undefined) el.value = a[f];
  });

  // Show existing images
  if (a.photo) {
    const prev = document.getElementById('photoPreview');
    prev.src = a.photo;
    prev.style.display = 'block';
  }
  if (a.idCard) {
    const prev = document.getElementById('idCardPreview');
    prev.src = a.idCard;
    prev.style.display = 'block';
  }
}

// ===== PROFILE VIEW =====
function viewAlumni(id) {
  const a = state.alumni.find(x => x.id === id);
  if (!a) return;

  showPage('viewAlumni', null);
  document.getElementById('breadcrumb').textContent = `ملف الخريج: ${a.fullName}`;

  const genderBadge = a.gender === 'ذكر'
    ? '<span class="profile-tag" style="background:rgba(67,97,238,0.15);color:#7289f5">ذكر</span>'
    : a.gender === 'أنثى'
      ? '<span class="profile-tag" style="background:rgba(247,37,133,0.12);color:#f72585">أنثى</span>'
      : '';

  const photoEl = a.photo
    ? `<img src="${a.photo}" class="profile-photo" alt="صورة الخريج" />`
    : `<div class="profile-photo">${a.fullName ? a.fullName[0] : '?'}</div>`;

  const deptBadge = a.department
    ? `<span class="profile-tag" style="background:rgba(0,150,136,0.15);color:#00796b">القسم: ${a.department}</span>`
    : '';

  const idCardEl = a.idCard
    ? `<div class="form-group"><div class="profile-field-label">صورة بطاقة الهوية</div><img src="${a.idCard}" style="max-width:300px;border-radius:10px;border:2px solid var(--border);margin-top:8px;" alt="بطاقة الهوية" /></div>`
    : '';

  function field(label, val) {
    const display = val || '<span class="profile-field-empty">غير مُدخل</span>';
    return `<div class="profile-field"><div class="profile-field-label">${label}</div><div class="profile-field-value">${display}</div></div>`;
  }

  document.getElementById('profileContent').innerHTML = `
    <div class="profile-header">
      ${photoEl}
      <div class="profile-meta">
        <div class="profile-name">${a.fullName || '—'}</div>
        <div class="profile-tags">
          ${deptBadge}
          ${genderBadge}
          ${a.nationality ? `<span class="profile-tag">${a.nationality}</span>` : ''}
          ${a.gradNum ? `<span class="profile-tag">رقم الخريج: ${a.gradNum}</span>` : ''}
          ${a.religion ? `<span class="profile-tag">${a.religion}</span>` : ''}
        </div>
        <div class="recent-sub" style="font-size:0.85rem;">سُجِّل: ${a.createdAt ? new Date(a.createdAt).toLocaleDateString('ar-EG') : '—'}</div>
      </div>
    </div>
    <div class="profile-sections">

      <div>
        <div class="profile-section-title">👤 البيانات الشخصية</div>
        <div class="profile-grid">
          ${field('الاسم الكامل', a.fullName)}
          ${field('القسم', a.department)}
          ${field('الرقم القومي', a.nationalId)}
          ${field('تاريخ الميلاد', a.dob ? new Date(a.dob).toLocaleDateString('ar-EG') : '')}
          ${field('محل الميلاد', a.pob)}
          ${field('الجنس', a.gender)}
          ${field('الجنسية', a.nationality)}
          ${field('الديانة', a.religion)}
          ${field('رقم الهاتف', a.phone)}
          ${field('البريد الإلكتروني', a.email)}
          ${field('العنوان', a.address)}
          ${field('محافظة الإقامة', a.governorate)}
        </div>
      </div>

      <div>
        <div class="profile-section-title">💼 بيانات التوظيف والدورات</div>
        <div class="profile-grid">
          ${field('المهنة / الوظيفة', a.occupation)}
          ${field('سنة التوظيف', a.empYear)}
          ${field('سنوات الخبرة', a.expYears)}
          ${field('الدورات الحاصل عليها', a.coursesAttended)}
          ${field('الكورسات التي يحتاجها', a.coursesNeeded)}
        </div>
      </div>

      <div>
        <div class="profile-section-title">🎓 بيانات الخريج</div>
        <div class="profile-grid">
          ${field('رقم الخريج', a.gradNum)}
          ${field('تاريخ الالتحاق بالكلية', a.enrollDate ? new Date(a.enrollDate).toLocaleDateString('ar-EG') : '')}
          ${field('نوع شهادة الثانوية', a.hsType)}
          ${field('درجة الثانوية', a.hsGrade)}
          ${field('التقدير', a.gradEstimate)}
          ${field('المجموع', a.gradTotal)}
          ${field('النسبة', a.gradPercent)}
        </div>
      </div>

      <div>
        <div class="profile-section-title">🪪 الهوية والخدمة العسكرية</div>
        <div class="profile-grid">
          ${field('تاريخ إصدار البطاقة', a.idIssueDate ? new Date(a.idIssueDate).toLocaleDateString('ar-EG') : '')}
          ${field('مكان إصدار البطاقة', a.idIssuePlace)}
          ${field('الحالة العسكرية', a.military)}
          ${field('الرقم العسكري', a.militaryNum)}
        </div>
        ${idCardEl}
      </div>

      <div>
        <div class="profile-section-title">💳 السداد والتوقيعات</div>
        <div class="profile-grid">
          ${field('رقم إيصال الدفع', a.payReceipt)}
          ${field('تاريخ الدفع', a.payDate ? new Date(a.payDate).toLocaleDateString('ar-EG') : '')}
          ${field('التوقيع بالعربية', a.sigAr)}
          ${field('التوقيع بالإنجليزية', a.sigEn)}
        </div>
      </div>

    </div>
  `;
}

// ===== DELETE =====
let pendingDeleteId = null;

function confirmDelete(id) {
  pendingDeleteId = id;
  const overlay = document.getElementById('confirmOverlay');
  overlay.style.display = 'flex';
  document.getElementById('confirmYesBtn').onclick = async () => {
    if (!window.db) {
      showToast('قاعدة البيانات غير مهيأة. تعذّر الحذف.', 'error');
      return;
    }
    try {
      await window.db.collection('alumni').doc(pendingDeleteId).delete();
      state.alumni = state.alumni.filter(a => a.id !== pendingDeleteId);
      closeConfirm();
      renderAlumniList();
      showToast('🗑️ تم حذف السجل بنجاح', 'success');
    } catch (err) {
      console.error('Error deleting alumnus from Firestore', err);
      showToast('حدث خطأ أثناء حذف السجل من الخادم.', 'error');
    }
  };
}

function closeConfirm() {
  document.getElementById('confirmOverlay').style.display = 'none';
  pendingDeleteId = null;
}

// ===== REPORTS =====
function renderReports() {
  const alumni = state.alumni;
  const total = alumni.length;

  // Stat cards
  document.getElementById('reportGrid').innerHTML = [
    { label: 'إجمالي الخريجين', val: total, icon: '👥' },
    { label: 'ذكور', val: alumni.filter(a => a.gender === 'ذكر').length, icon: '👨' },
    { label: 'إناث', val: alumni.filter(a => a.gender === 'أنثى').length, icon: '👩' },
    { label: 'أدوا الخدمة العسكرية', val: alumni.filter(a => a.military === 'أدى الخدمة').length, icon: '⚔️' },
    { label: 'معفوون', val: alumni.filter(a => a.military === 'معفى').length, icon: '✅' },
    { label: 'سداد مكتمل', val: alumni.filter(a => a.payReceipt).length, icon: '💳' },
  ].map(s => `
    <div class="report-stat">
      <div style="font-size:2.2rem">${s.icon}</div>
      <div class="report-stat-value">${s.val}</div>
      <div class="report-stat-label">${s.label}</div>
    </div>
  `).join('');

  // Bar chart helper
  function buildBarChart(containerId, dataMap) {
    const container = document.getElementById(containerId);
    const max = Math.max(...Object.values(dataMap), 1);
    container.innerHTML = Object.entries(dataMap)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => `
        <div class="bar-row">
          <div class="bar-label">${label}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${Math.round((count / max) * 100)}%">
              <span class="bar-count">${count}</span>
            </div>
          </div>
        </div>
      `).join('') || '<div style="color:var(--text-muted);padding:12px;">لا توجد بيانات</div>';
  }

  // Gender chart
  const genderMap = {};
  alumni.forEach(a => { if (a.gender) genderMap[a.gender] = (genderMap[a.gender] || 0) + 1; });
  buildBarChart('genderChart', genderMap);

  // Governorate chart
  const govMap = {};
  alumni.forEach(a => { if (a.governorate) govMap[a.governorate] = (govMap[a.governorate] || 0) + 1; });
  buildBarChart('govChart', govMap);

  // Department chart
  const deptMap = {};
  alumni.forEach(a => { if (a.department) deptMap[a.department] = (deptMap[a.department] || 0) + 1; });
  buildBarChart('deptChart', deptMap);

  // Military chart
  const milMap = {};
  alumni.forEach(a => { if (a.military) milMap[a.military] = (milMap[a.military] || 0) + 1; });
  buildBarChart('militaryChart', milMap);

  // Full table
  renderReportTable(alumni, "قائمة الخريجين الكاملة");
}

// ===== PRINT =====
function printTable() {
  window.print();
}

function printReport() {
  // Show all elements when printing comprehensive report
  document.querySelectorAll('.report-grid, .report-section').forEach(el => el.style.display = 'grid');
  document.querySelectorAll('.report-section').forEach(el => el.style.display = 'block');

  // Re-render the full table to ensure all data is there
  renderReportTable(state.alumni, "قائمة الخريجين الكاملة");

  window.print();

  // Restore elements if they were hidden by filtered print
  document.querySelectorAll('.report-grid, .report-section').forEach(el => el.style.display = '');
}

function printFilteredReport() {
  const dept = document.getElementById('printDeptFilter').value;
  if (!dept) {
    showToast('الرجاء اختيار القسم أولاً', 'error');
    return;
  }

  // Filter the data
  const filtered = state.alumni.filter(a => a.department === dept);

  if (filtered.length === 0) {
    showToast('لا يوجد خريجون مسجلون في هذا القسم', 'warning');
    return;
  }

  // Hide the charts and cards for filtered printing
  document.querySelectorAll('.report-grid, .report-section').forEach(el => el.style.display = 'none');

  // Render the table with filtered data
  renderReportTable(filtered, `قائمة خريجي قسم: ${dept}`);

  window.print();

  // Restore original display
  document.querySelectorAll('.report-grid, .report-section').forEach(el => el.style.display = '');
  renderReportTable(state.alumni, "قائمة الخريجين الكاملة");
}

function renderReportTable(alumniData, title) {
  const container = document.getElementById('fullReportTableContainer');

  // Update the title if it exists
  const titleEl = container.previousElementSibling;
  if (titleEl && titleEl.tagName === 'H3') {
    titleEl.innerHTML = `📋 ${title}`;
  }

  if (!alumniData.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-title">لا توجد بيانات لعرضها</div></div>';
    return;
  }
  container.innerHTML = `
    <table class="data-table" id="reportTable">
      <thead>
        <tr>
          <th>#</th>
          <th>رقم الخريج</th>
          <th>التقدير</th>
          <th>المجموع</th>
          <th>النسبة</th>
          <th>الاسم الكامل</th>
          <th>القسم</th>
          <th>الرقم القومي</th>
          <th>الهاتف</th>
          <th>الجنس</th>
          <th>المحافظة</th>
          <th>الحالة العسكرية</th>
          <th>المهنة</th>
          <th>تاريخ الالتحاق</th>
        </tr>
      </thead>
      <tbody>
        ${alumniData.map((a, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${a.gradNum || '—'}</td>
            <td>${a.gradEstimate || '—'}</td>
            <td>${a.gradTotal || '—'}</td>
            <td>${a.gradPercent || '—'}</td>
            <td>${a.fullName || '—'}</td>
            <td>${a.department || '—'}</td>
            <td>${a.nationalId || '—'}</td>
            <td dir="ltr">${a.phone || '—'}</td>
            <td>${a.gender || '—'}</td>
            <td>${a.governorate || '—'}</td>
            <td>${a.military || '—'}</td>
            <td>${a.occupation || '—'}</td>
            <td>${a.enrollDate ? new Date(a.enrollDate).toLocaleDateString('ar-EG') : '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function printProfile() {
  window.print();
}

// ===== IMAGE PREVIEW =====
function previewImage(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      preview.src = e.target.result;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// ===== TOAST =====
let toastTimer;
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

// ===== UTILITIES =====
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

// ===== STATISTICS AND EMPLOYMENT =====
function renderStatisticsPage() {
  const alumni = state.alumni;
  if (!alumni) return;

  // Populate Year Filter
  const yearFilter = document.getElementById('statsYearFilter');
  const selectedYear = yearFilter.value;
  
  const years = new Set();
  alumni.forEach(a => { if (a.empYear) years.add(a.empYear); });
  const sortedYears = Array.from(years).sort((a, b) => b - a);
  
  yearFilter.innerHTML = '<option value="">كل سنوات التوظيف</option>' + 
    sortedYears.map(y => `<option value="${y}" ${y == selectedYear ? 'selected' : ''}>${y}</option>`).join('');

  // Filter Data
  const filtered = selectedYear ? alumni.filter(a => a.empYear == selectedYear) : alumni;
  
  // 1. Employment Rate (from total alumni without year filter)
  const total = alumni.length;
  const employed = alumni.filter(a => a.occupation || a.empYear).length;
  const unemployed = total - employed;
  const rateMap = { 'موظف': employed, 'غير موظف': unemployed };
  
  if (!window.statsCharts) window.statsCharts = {};

  function initChart(canvasId, type, label, dataMap, colors) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    if (window.statsCharts[canvasId]) {
      window.statsCharts[canvasId].destroy();
    }
    
    // Sort data for bar charts, otherwise just use as is
    let entries = Object.entries(dataMap);
    if (type === 'bar') entries.sort((a, b) => b[1] - a[1]);
    
    const labels = entries.map(e => e[0] === 'undefined' ? 'غير محدد' : e[0]);
    const data = entries.map(e => e[1]);
    
    window.statsCharts[canvasId] = new Chart(ctx, {
      type: type,
      data: {
        labels: labels,
        datasets: [{
          label: label,
          data: data,
          backgroundColor: colors || ['#4361ee', '#f72585', '#4cc9f0', '#2dc653', '#f8961e', '#f9c74f', '#9d4edd', '#00b4d8', '#8338ec', '#ff006e'],
          borderRadius: type === 'bar' ? 4 : 0,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: type !== 'bar',
            position: type === 'pie' || type === 'doughnut' ? 'right' : 'top',
            labels: { font: { family: "'Cairo', sans-serif" } }
          }
        },
        scales: type === 'bar' ? {
          y: { beginAtZero: true, ticks: { stepSize: 1, font: { family: "'Cairo', sans-serif" } } },
          x: { ticks: { font: { family: "'Cairo', sans-serif" } } }
        } : {}
      }
    });
  }

  initChart('employmentRateChart', 'doughnut', 'معدل التوظيف', rateMap, ['#2dc653', '#f72585']);

  // 2. Occupation Chart
  const occMap = {};
  filtered.forEach(a => { 
    if (a.occupation) occMap[a.occupation] = (occMap[a.occupation] || 0) + 1; 
  });
  initChart('occupationChart', 'pie', 'الوظائف', occMap);

  // 3. Experience Chart
  const expMap = {};
  filtered.forEach(a => { 
    if (a.expYears) expMap[`${a.expYears} سنوات`] = (expMap[`${a.expYears} سنوات`] || 0) + 1; 
  });
  initChart('experienceChart', 'bar', 'عدد الموظفين', expMap, ['#4361ee']);

  // 4. Courses Stats
  let attendedList = [];
  let neededList = [];
  filtered.forEach(a => {
    if(a.coursesAttended) attendedList = attendedList.concat(a.coursesAttended.split(/[,،\n]+/).map(s=>s.trim()).filter(Boolean));
    if(a.coursesNeeded) neededList = neededList.concat(a.coursesNeeded.split(/[,،\n]+/).map(s=>s.trim()).filter(Boolean));
  });
  
  const topAttended = getTopOccurrence(attendedList, 5);
  const topNeeded = getTopOccurrence(neededList, 5);

  const coursesContainer = document.getElementById('coursesStats');
  if (coursesContainer) {
    coursesContainer.innerHTML = `
      <div style="margin-bottom:15px;">
        <strong style="color:var(--primary-color);">الدورات الأكثر حضوراً:</strong>
        <ul style="margin-top:8px; padding-right:20px; color:var(--text-color); line-height:1.6;">
          ${topAttended.map(c => `<li>${c[0]} <span style="color:var(--text-muted); font-size:0.9em;">(${c[1]} خريج)</span></li>`).join('') || '<li>لا توجد استجابات</li>'}
        </ul>
      </div>
      <div>
        <strong style="color:var(--secondary-color);">الكورسات المرجوة:</strong>
        <ul style="margin-top:8px; padding-right:20px; color:var(--text-color); line-height:1.6;">
          ${topNeeded.map(c => `<li>${c[0]} <span style="color:var(--text-muted); font-size:0.9em;">(${c[1]} طلب)</span></li>`).join('') || '<li>لا توجد استجابات</li>'}
        </ul>
      </div>
    `;
  }

  // 5. Employment Table
  const employedAlumni = filtered.filter(a => a.occupation || a.empYear);
  renderEmploymentTable(employedAlumni);

  // 6. Grid Stats
  const avgExp = employedAlumni.length ? 
      (employedAlumni.reduce((sum, a) => sum + (Number(a.expYears)||0), 0) / employedAlumni.length).toFixed(1) : 0;
      
  document.getElementById('employmentStatsGrid').innerHTML = `
    <div class="report-stat">
      <div style="font-size:2.2rem">💼</div>
      <div class="report-stat-value">${employedAlumni.length}</div>
      <div class="report-stat-label">الموظفين${selectedYear?' في '+selectedYear:''}</div>
    </div>
    <div class="report-stat">
      <div style="font-size:2.2rem">📈</div>
      <div class="report-stat-value">${avgExp}</div>
      <div class="report-stat-label">متوسط سنوات الخبرة</div>
    </div>
    <div class="report-stat">
      <div style="font-size:2.2rem">🎓</div>
      <div class="report-stat-value">${new Set(attendedList).size}</div>
      <div class="report-stat-label">دورات فريدة مسجلة</div>
    </div>
  `;
}

function getTopOccurrence(arr, topN) {
  const counts = {};
  arr.forEach(item => counts[item] = (counts[item] || 0) + 1);
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, topN);
}

function renderEmploymentTable(data) {
  const container = document.getElementById('employmentTableContainer');
  if(!container) return;
  if (!data.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💼</div><div class="empty-state-title">لا يوجد موظفين لعرضهم</div></div>';
    return;
  }
  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>الاسم الكامل</th>
          <th>القسم</th>
          <th dir="rtl">الهاتف</th>
          <th>المهنة</th>
          <th>سنة التوظيف</th>
          <th>سنوات الخبرة</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(a => `
          <tr>
            <td>${a.fullName || '—'}</td>
            <td><span class="badge" style="background:#e0f7fa; color:#006064">${a.department || '—'}</span></td>
            <td dir="ltr">${a.phone || '—'}</td>
            <td><strong>${a.occupation || '—'}</strong></td>
            <td>${a.empYear || '—'}</td>
            <td>${a.expYears || '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function printStatistics() {
  window.print();
}
