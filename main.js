/* ═══════════════════════════════════════════════════════════
   CLADAN IT Control · main.js
   Firebase Firestore — datos compartidos entre todos los usuarios
   Sin backend · GitHub Pages ready
═══════════════════════════════════════════════════════════ */
'use strict';

/* ─── AUTH CONFIG ──────────────────────────────────────────
   Login de barrera visual básica. No es seguridad real.
──────────────────────────────────────────────────────── */
const AUTH = { user: 'admin', pass: 'Cambiar123!' };

/* ─── FIREBASE CONFIG ──────────────────────────────────────
   Proyecto: cladan-it
──────────────────────────────────────────────────────── */
const firebaseConfig = {
  apiKey: "AIzaSyDvqKpS1EGOKcMkul7g6dMt9y_dLHkiTbU",
  authDomain: "cladan-it.firebaseapp.com",
  projectId: "cladan-it",
  storageBucket: "cladan-it.firebasestorage.app",
  messagingSenderId: "14974063529",
  appId: "1:14974063529:web:26df326ea25d717fd6aab8"
};

/* ─── COLECCIONES FIRESTORE ────────────────────────────────
   Cada módulo es una colección en Firestore.
   NUNCA renombrar colecciones existentes.
──────────────────────────────────────────────────────── */
const COLS = {
  equipos:     'equipos',
  toners:      'toners',
  usuarios:    'usuarios',
  licencias:   'licencias',
  accesos:     'accesos',
  movimientos: 'movimientos',
  celulares:   'celulares',
};

const SISTEMAS_ACCESO = [
  'Epicor','Microsoft 365','Correo','VPN','Power BI',
  'Carpetas compartidas','Odoo','TS1','TS2','TS3',
  'SharePoint','Teams','Azure','GitHub',
  'Jira','SAP','Salesforce','Zoom','Slack','Otro',
];

/* ─── STATE ─────────────────────────────────────────────── */
let DB = null;           // instancia Firestore
let CHARTS = {};
let editingId = null;
let STATE_DATA = {};     // cache local de colecciones

/* ═══════════════════════════════════════════════════════════
   FIREBASE INIT
═══════════════════════════════════════════════════════════ */
function initFirebase() {
  firebase.initializeApp(firebaseConfig);
  DB = firebase.firestore();
}

/* ─── Firestore helpers ─────────────────────────────────── */
async function fbGetAll(col) {
  try {
    const snap = await DB.collection(col).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) {
    console.error('fbGetAll error:', col, e);
    return [];
  }
}

async function fbSave(col, obj) {
  const { id, ...data } = obj;
  if (id) {
    await DB.collection(col).doc(id).set(data);
  } else {
    const ref = await DB.collection(col).add(data);
    obj.id = ref.id;
  }
  return obj;
}

async function fbDelete(col, id) {
  await DB.collection(col).doc(id).delete();
}

async function fbAdd(col, data) {
  const ref = await DB.collection(col).add(data);
  return { id: ref.id, ...data };
}

/* Cache helpers — evita recargar Firestore en cada render */
async function loadCol(col) {
  const data = await fbGetAll(col);
  STATE_DATA[col] = data;
  return data;
}

function getCached(col) {
  return STATE_DATA[col] || [];
}

/* ─── Movement logger ────────────────────────────────────── */
function logMov(tipo, modulo, descripcion, referencia = '') {
  fbAdd(COLS.movimientos, {
    fecha: new Date().toLocaleString('es-AR'),
    tipo, modulo, descripcion, referencia,
  }).catch(console.error);
}

/* ═══════════════════════════════════════════════════════════
   AUTH
═══════════════════════════════════════════════════════════ */
function initAuth() {
  if (sessionStorage.getItem('cit_auth')) showApp();

  document.getElementById('btn-login').addEventListener('click', doLogin);
  ['l-user','l-pass'].forEach(id =>
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') doLogin();
    })
  );
  document.getElementById('btn-logout').addEventListener('click', () => {
    sessionStorage.removeItem('cit_auth');
    location.reload();
  });
}

function doLogin() {
  const u = document.getElementById('l-user').value.trim();
  const p = document.getElementById('l-pass').value.trim();
  const err = document.getElementById('login-err');
  if (u === AUTH.user && p === AUTH.pass) {
    sessionStorage.setItem('cit_auth', '1');
    document.getElementById('login-screen').classList.add('hidden');
    showApp();
  } else {
    err.classList.remove('hidden');
    document.getElementById('l-pass').value = '';
  }
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
}

/* ═══════════════════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════════════════ */
function initNav() {
  document.querySelectorAll('.nav-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const page = document.getElementById('page-' + btn.dataset.page);
      if (page) page.classList.add('active');
      refreshPage(btn.dataset.page);
    });
  });
}

async function refreshPage(page) {
  showLoading(true);
  try {
    switch(page) {
      case 'dashboard':   await loadAllAndRenderDashboard(); break;
      case 'equipos':     await loadAndRender('equipos', renderEquipos); break;
      case 'toners':      await loadAndRender('toners', renderToners); break;
      case 'usuarios':    await loadAndRender('usuarios', renderUsuarios); break;
      case 'licencias':   await loadAndRender('licencias', renderLicencias); break;
      case 'accesos':     await loadAndRender('accesos', renderAccesos); break;
      case 'celulares':   await loadAndRender('celulares', renderCelulares); break;
      case 'movimientos': await loadAndRender('movimientos', renderMovimientos); break;
      case 'reportes':    await loadAllCollections(); renderReportes(); break;
    }
  } catch(e) {
    toast('Error al cargar datos: ' + e.message, 'error');
  }
  showLoading(false);
}

async function loadAndRender(col, renderFn) {
  await loadCol(col);
  renderFn();
}

async function loadAllCollections() {
  await Promise.all(Object.values(COLS).map(c => loadCol(c)));
}

async function loadAllAndRenderDashboard() {
  await loadAllCollections();
  renderDashboard();
}

function showLoading(on) {
  let el = document.getElementById('loading-bar');
  if (!el) {
    el = document.createElement('div');
    el.id = 'loading-bar';
    el.style.cssText = 'position:fixed;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#2563eb,#06b6d4);z-index:9999;transition:opacity .3s';
    document.body.appendChild(el);
  }
  el.style.opacity = on ? '1' : '0';
}

/* Populate sector filter from cached equipos */
function populateSectorFilter(selId) {
  const sel = document.getElementById(selId);
  if (!sel) return;
  const sectores = [...new Set(getCached(COLS.equipos).map(e => e.sector).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">Sector</option>' +
    sectores.map(s => `<option value="${s}">${s}</option>`).join('');
}

function populateMarcaFilter() {
  const sel = document.getElementById('cel-marca');
  if (!sel) return;
  const marcas = [...new Set(getCached(COLS.celulares).map(c => c.marca).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">Marca</option>' +
    marcas.map(m => `<option value="${m}">${m}</option>`).join('');
}

/* ═══════════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════════ */
function renderDashboard() {
  const equipos   = getCached(COLS.equipos);
  const toners    = getCached(COLS.toners);
  const usuarios  = getCached(COLS.usuarios);
  const licencias = getCached(COLS.licencias);
  const accesos   = getCached(COLS.accesos);
  const movs      = getCached(COLS.movimientos);
  const celulares = getCached(COLS.celulares);

  document.getElementById('dash-date').textContent =
    new Date().toLocaleDateString('es-AR',{weekday:'long',year:'numeric',month:'long',day:'numeric'});

  // ── Alertas ──────────────────────────────────────────────
  const alerts = [];
  toners.filter(t => Number(t.stock) <= Number(t.minimo)).forEach(t =>
    alerts.push({ level:'high', icon:'🖨', msg:`Toner <strong>${t.codigo}</strong> stock crítico: ${t.stock} (mín: ${t.minimo})` })
  );
  const nbDisp = equipos.filter(e => e.tipo==='Notebook' && e.estado==='Disponible').length;
  if (nbDisp < 2) alerts.push({ level:'medium', icon:'💻', msg:`Solo <strong>${nbDisp}</strong> notebook(s) disponibles.` });
  usuarios.filter(u => u.estado==='Activo' && !u.equipo).forEach(u =>
    alerts.push({ level:'medium', icon:'👤', msg:`Usuario <strong>${u.nombre}</strong> sin equipo asignado.` })
  );
  const bajasMap = new Set(usuarios.filter(u=>u.estado==='Baja').map(u=>u.usuarioRed));
  accesos.filter(a => a.estado==='Activo' && bajasMap.has(a.usuario)).forEach(a => {
    const sists = Array.isArray(a.sistema) ? a.sistema.join(', ') : (a.sistema||'');
    alerts.push({ level:'high', icon:'🔐', msg:`Accesos activos (<strong>${sists}</strong>) para <strong>${a.usuario}</strong> dado de baja.` });
  });
  licencias.forEach(l => {
    if (!l.vencimiento) return;
    const dias = Math.ceil((new Date(l.vencimiento)-new Date())/86400000);
    if (dias <= 0)  alerts.push({ level:'high',   icon:'🔑', msg:`Licencia <strong>${l.software}</strong> VENCIDA.` });
    else if (dias <= 90) alerts.push({ level:'medium', icon:'🔑', msg:`Licencia <strong>${l.software}</strong> vence en ${dias} días.` });
  });

  document.getElementById('alerts-container').innerHTML =
    alerts.slice(0,8).map(a =>
      `<div class="alert-item alert-${a.level}"><span class="alert-icon">${a.icon}</span><span>${a.msg}</span></div>`
    ).join('');

  // ── KPIs ──────────────────────────────────────────────────
  const kpiData = [
    { lbl:'Total equipos',         val:equipos.filter(e=>e.estado!=='Baja').length,                              sub:'activos', clr:'#2563eb', icon:'💻' },
    { lbl:'Notebooks disponibles', val:equipos.filter(e=>e.tipo==='Notebook'&&e.estado==='Disponible').length,   sub:'listas para asignar', clr:'#10b981', icon:'✓' },
    { lbl:'Notebooks asignadas',   val:equipos.filter(e=>e.tipo==='Notebook'&&e.estado==='Asignado').length,     sub:'en uso', clr:'#0ea5e9', icon:'👤' },
    { lbl:'En reparación',         val:equipos.filter(e=>e.estado==='Reparación').length,                        sub:'fuera de servicio', clr:'#f59e0b', icon:'🔧' },
    { lbl:'Toners críticos',       val:toners.filter(t=>Number(t.stock)<=Number(t.minimo)).length,               sub:'bajo mínimo', clr:'#ef4444', icon:'⚠' },
    { lbl:'Usuarios activos',      val:usuarios.filter(u=>u.estado==='Activo').length,                           sub:'en plantilla', clr:'#10b981', icon:'👥' },
    { lbl:'Usuarios baja',         val:usuarios.filter(u=>u.estado==='Baja').length,                             sub:'desvinculados', clr:'#94a3b8', icon:'↓' },
    { lbl:'Licencias asignadas',   val:licencias.reduce((s,l)=>s+Number(l.asignadas||0),0),                      sub:'total asignaciones', clr:'#8b5cf6', icon:'🔑' },
    { lbl:'Accesos activos',       val:accesos.filter(a=>a.estado==='Activo').length,                            sub:'habilitados', clr:'#0ea5e9', icon:'🔐' },
    { lbl:'Celulares asignados',   val:celulares.filter(c=>c.estado==='Asignado').length,                        sub:`de ${celulares.filter(c=>c.estado!=='Baja').length} en inventario`, clr:'#ec4899', icon:'📱' },
    { lbl:'Equipos obsoletos',     val:equipos.filter(e=>e.estado==='Obsoleto').length,                          sub:'a revisar', clr:'#64748b', icon:'📦' },
  ];
  document.getElementById('kpi-grid').innerHTML = kpiData.map(k =>
    `<div class="kpi-card" style="--kpi-clr:${k.clr}">
      <div class="kpi-icon">${k.icon}</div>
      <div class="kpi-lbl">${k.lbl}</div>
      <div class="kpi-val">${k.val}</div>
      <div class="kpi-sub">${k.sub}</div>
    </div>`).join('');

  // ── Charts ────────────────────────────────────────────────
  const GC = '#1e2f47', GT = '#94a3b8';
  const destroyC = id => { if(CHARTS[id]){CHARTS[id].destroy();delete CHARTS[id];} };

  // Equipos por estado
  destroyC('c-estados');
  const estadoMap = {};
  equipos.filter(e=>e.estado!=='Baja').forEach(e => { estadoMap[e.estado]=(estadoMap[e.estado]||0)+1; });
  CHARTS['c-estados'] = new Chart(document.getElementById('c-estados'),{
    type:'doughnut',
    data:{ labels:Object.keys(estadoMap), datasets:[{ data:Object.values(estadoMap),
      backgroundColor:['#10b981','#2563eb','#f59e0b','#94a3b8','#ef4444'], borderColor:'#111e30', borderWidth:2 }] },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ position:'bottom', labels:{ color:GT, font:{size:11}, padding:10 } } } }
  });

  // Equipos por sector
  destroyC('c-sectores');
  const sectMap = {};
  equipos.filter(e=>e.sector&&e.estado!=='Baja').forEach(e => { sectMap[e.sector]=(sectMap[e.sector]||0)+1; });
  CHARTS['c-sectores'] = new Chart(document.getElementById('c-sectores'),{
    type:'bar', data:{ labels:Object.keys(sectMap),
      datasets:[{ data:Object.values(sectMap), backgroundColor:'#2563eb', borderRadius:4 }] },
    options:barChartOpts(GC,GT)
  });

  // Toners stock
  destroyC('c-toners');
  CHARTS['c-toners'] = new Chart(document.getElementById('c-toners'),{
    type:'bar',
    data:{ labels:toners.map(t=>t.codigo),
      datasets:[
        { label:'Stock', data:toners.map(t=>Number(t.stock)), backgroundColor:toners.map(t=>Number(t.stock)<=Number(t.minimo)?'#ef4444':'#10b981'), borderRadius:4 },
        { label:'Mínimo', data:toners.map(t=>Number(t.minimo)), backgroundColor:'rgba(245,158,11,.4)', borderRadius:4 },
      ]},
    options:{ ...barChartOpts(GC,GT), plugins:{ legend:{ display:true, labels:{color:GT,font:{size:11}} } } }
  });

  // Licencias
  destroyC('c-licencias');
  CHARTS['c-licencias'] = new Chart(document.getElementById('c-licencias'),{
    type:'bar',
    data:{ labels:licencias.map(l=>l.software.substring(0,18)),
      datasets:[
        { label:'Asignadas', data:licencias.map(l=>Number(l.asignadas||0)), backgroundColor:'#2563eb', borderRadius:4 },
        { label:'Total',     data:licencias.map(l=>Number(l.total||0)),     backgroundColor:'rgba(14,165,233,.3)', borderRadius:4 },
      ]},
    options:{ ...barChartOpts(GC,GT), plugins:{ legend:{ display:true, labels:{color:GT,font:{size:11}} } } }
  });

  // Usuarios por sector
  destroyC('c-usuarios-sector');
  const usrSect = {};
  usuarios.filter(u=>u.estado==='Activo').forEach(u => { usrSect[u.sector]=(usrSect[u.sector]||0)+1; });
  CHARTS['c-usuarios-sector'] = new Chart(document.getElementById('c-usuarios-sector'),{
    type:'doughnut',
    data:{ labels:Object.keys(usrSect), datasets:[{ data:Object.values(usrSect),
      backgroundColor:['#2563eb','#0ea5e9','#10b981','#8b5cf6','#f59e0b','#ef4444','#ec4899'],
      borderColor:'#111e30', borderWidth:2 }] },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ position:'bottom', labels:{ color:GT, font:{size:11}, padding:10 } } } }
  });

  // Movimientos mensuales
  destroyC('c-movimientos');
  const movMes = {};
  movs.forEach(m => {
    try {
      const parts = m.fecha.split(' ')[0].split('/');
      const key = `${parts[1]}/${parts[2]}`;
      movMes[key] = (movMes[key]||0)+1;
    } catch{}
  });
  const movKeys = Object.keys(movMes).sort();
  CHARTS['c-movimientos'] = new Chart(document.getElementById('c-movimientos'),{
    type:'line',
    data:{ labels:movKeys, datasets:[{ label:'Movimientos', data:movKeys.map(k=>movMes[k]),
      borderColor:'#2563eb', backgroundColor:'rgba(37,99,235,.1)',
      tension:.3, fill:true, borderWidth:2, pointRadius:3 }] },
    options:{ responsive:true, maintainAspectRatio:false,
      scales:{ x:{grid:{color:GC},ticks:{color:GT,font:{size:10}}}, y:{grid:{color:GC},ticks:{color:GT,font:{size:10}}} },
      plugins:{ legend:{display:false} } }
  });
}

function barChartOpts(gc, gt) {
  return { responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false} },
    scales:{ x:{grid:{color:gc},ticks:{color:gt,font:{size:10}}}, y:{grid:{color:gc},ticks:{color:gt,font:{size:10}}} }
  };
}

/* ═══════════════════════════════════════════════════════════
   EQUIPOS
═══════════════════════════════════════════════════════════ */
function renderEquipos() {
  const all = getCached(COLS.equipos);
  const search = (document.getElementById('eq-search')?.value||'').toLowerCase();
  const fTipo   = document.getElementById('eq-tipo')?.value   || '';
  const fEstado = document.getElementById('eq-estado')?.value || '';
  const fSector = document.getElementById('eq-sector')?.value || '';

  populateSectorFilter('eq-sector');

  const data = all.filter(e => {
    if (e.estado==='Baja' && fEstado!=='Baja') return false;
    if (fTipo   && e.tipo   !== fTipo)   return false;
    if (fEstado && e.estado !== fEstado) return false;
    if (fSector && e.sector !== fSector) return false;
    if (search && ![e.marca,e.modelo,e.serie,e.usuario,e.sector,e.obs].join(' ').toLowerCase().includes(search)) return false;
    return true;
  });

  ['eq-search','eq-tipo','eq-estado','eq-sector'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el._bound) { el.addEventListener('input',renderEquipos); el.addEventListener('change',renderEquipos); el._bound=true; }
  });

  if (!data.length) { document.getElementById('equipos-table').innerHTML='<div class="table-empty">Sin resultados.</div>'; return; }

  document.getElementById('equipos-table').innerHTML = `<table>
    <thead><tr><th>Serie</th><th>Tipo</th><th>Marca / Modelo</th><th>CPU / RAM</th>
    <th>SO</th><th>Estado</th><th>Sector</th><th>Usuario</th><th>Garantía</th><th>Acciones</th></tr></thead>
    <tbody>${data.map(e => {
      const gvenc = e.garantia && new Date(e.garantia) < new Date();
      return `<tr class="${e.estado==='Obsoleto'?'row-critical':gvenc?'row-warn':''}">
        <td>${e.serie||'<span class="badge b-red">Sin serie</span>'}</td>
        <td>${e.tipo}</td><td><strong>${e.marca}</strong> ${e.modelo}</td>
        <td style="font-size:11px">${e.cpu?e.cpu+' · ':''} ${e.ram||'—'}</td>
        <td>${e.so||'—'}</td><td>${estadoBadge(e.estado)}</td>
        <td>${e.sector||'—'}</td><td>${e.usuario||'—'}</td>
        <td>${gvenc?'<span class="badge b-red">Vencida</span>':(e.garantia||'—')}</td>
        <td><div class="tbl-actions">
          <button class="btn-ghost btn-sm" onclick="openModal('equipo','${e.id}')">✏</button>
          <button class="btn-ghost btn-sm" style="color:var(--red)" onclick="deleteItem('${COLS.equipos}','${e.id}',renderEquipos)">🗑</button>
        </div></td></tr>`;}).join('')}
    </tbody></table>`;
}

/* ═══════════════════════════════════════════════════════════
   TONERS
═══════════════════════════════════════════════════════════ */
function renderToners() {
  let data = getCached(COLS.toners);
  const search  = (document.getElementById('ton-search')?.value||'').toLowerCase();
  const fSector = document.getElementById('ton-sector')?.value || '';
  const critico = document.getElementById('ton-critico')?.checked;

  if (fSector) data = data.filter(t=>t.sector===fSector);
  if (critico) data = data.filter(t=>Number(t.stock)<=Number(t.minimo));
  if (search)  data = data.filter(t=>[t.codigo,t.marca,t.modelo,t.impresora,t.sector].join(' ').toLowerCase().includes(search));

  ['ton-search','ton-sector','ton-critico'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el._bound) { el.addEventListener('input',renderToners); el.addEventListener('change',renderToners); el._bound=true; }
  });

  if (!data.length) { document.getElementById('toners-table').innerHTML='<div class="table-empty">Sin resultados.</div>'; return; }

  document.getElementById('toners-table').innerHTML = `<table>
    <thead><tr><th>Código</th><th>Marca / Modelo</th><th>Impresora</th>
    <th>Sector</th><th>Stock</th><th>Proveedor</th><th>Costo</th><th>Acciones</th></tr></thead>
    <tbody>${data.map(t => {
      const pct = Number(t.minimo)>0 ? Math.min(100,Math.round(Number(t.stock)/(Number(t.minimo)*2)*100)) : 50;
      const clr = Number(t.stock)===0?'#ef4444':Number(t.stock)<=Number(t.minimo)?'#f59e0b':'#10b981';
      return `<tr class="${Number(t.stock)===0?'row-critical':Number(t.stock)<=Number(t.minimo)?'row-warn':''}">
        <td><strong>${t.codigo}</strong></td><td>${t.marca} ${t.modelo}</td>
        <td style="font-size:11px">${t.impresora}</td><td>${t.sector}</td>
        <td><div class="stock-bar-wrap">
          <div class="stock-bar"><div class="stock-bar-fill" style="width:${pct}%;background:${clr}"></div></div>
          <span class="stock-num" style="color:${clr}">${t.stock}</span></div></td>
        <td>${t.proveedor||'—'}</td>
        <td>$${Number(t.costo||0).toLocaleString('es-AR')}</td>
        <td><div class="tbl-actions">
          <button class="btn-ghost btn-sm" onclick="openStockModal('${t.id}','in')">＋</button>
          <button class="btn-ghost btn-sm" onclick="openStockModal('${t.id}','out')">－</button>
          <button class="btn-ghost btn-sm" onclick="openModal('toner','${t.id}')">✏</button>
          <button class="btn-ghost btn-sm" style="color:var(--red)" onclick="deleteItem('${COLS.toners}','${t.id}',renderToners)">🗑</button>
        </div></td></tr>`;}).join('')}
    </tbody></table>`;
}

function openStockModal(id, dir) {
  const t = getCached(COLS.toners).find(x=>x.id===id);
  if (!t) return;
  document.getElementById('modal-title').textContent = `${dir==='in'?'＋ Entrada':'－ Salida'} de stock · ${t.codigo}`;
  document.getElementById('modal-body').innerHTML = `
    <p style="color:var(--text2);margin-bottom:14px">Stock actual: <strong>${t.stock}</strong> unidades</p>
    <div class="form-group"><label>Cantidad</label><input id="stock-qty" type="number" min="1" value="1" class="form-input"/></div>
    <div class="form-group"><label>Observación</label><input id="stock-obs" type="text" class="form-input" placeholder="Motivo, proveedor…"/></div>
    <div class="form-actions">
      <button class="btn-outline" onclick="closeModal()">Cancelar</button>
      <button class="btn-primary" onclick="applyStock('${id}','${dir}')">Confirmar</button>
    </div>`;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

async function applyStock(id, dir) {
  const qty = parseInt(document.getElementById('stock-qty').value)||0;
  const obs = document.getElementById('stock-obs').value;
  if (qty<=0) { toast('Ingresá una cantidad válida','error'); return; }

  const toners = getCached(COLS.toners);
  const t = toners.find(x=>x.id===id);
  if (!t) return;
  if (dir==='out' && Number(t.stock)<qty) { toast('Stock insuficiente','error'); return; }

  const newStock = dir==='in' ? Number(t.stock)+qty : Number(t.stock)-qty;
  await fbSave(COLS.toners, { ...t, stock: newStock });
  logMov('Toner','Toners',`${dir==='in'?'Entrada':'Salida'}: ${t.codigo} (${dir==='in'?'+':'-'}${qty})${obs?' · '+obs:''}`, t.codigo);
  closeModal();
  await loadAndRender('toners', renderToners);
  toast(`Stock actualizado: ${newStock} unidades`,'success');
}

/* ═══════════════════════════════════════════════════════════
   USUARIOS
═══════════════════════════════════════════════════════════ */
function renderUsuarios() {
  let data = getCached(COLS.usuarios);
  const search  = (document.getElementById('usr-search')?.value||'').toLowerCase();
  const fEstado = document.getElementById('usr-estado')?.value||'';
  const fSector = document.getElementById('usr-sector')?.value||'';

  if (fEstado) data = data.filter(u=>u.estado===fEstado);
  if (fSector) data = data.filter(u=>u.sector===fSector);
  if (search)  data = data.filter(u=>[u.nombre,u.usuarioRed,u.email,u.sector,u.puesto].join(' ').toLowerCase().includes(search));

  ['usr-search','usr-estado','usr-sector'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el._bound) { el.addEventListener('input',renderUsuarios); el.addEventListener('change',renderUsuarios); el._bound=true; }
  });

  if (!data.length) { document.getElementById('usuarios-table').innerHTML='<div class="table-empty">Sin resultados.</div>'; return; }

  document.getElementById('usuarios-table').innerHTML = `<table>
    <thead><tr><th>Nombre</th><th>Usuario red</th><th>Sector / Puesto</th>
    <th>Sucursal</th><th>Estado</th><th>Equipo</th><th>Ingreso</th><th>Acciones</th></tr></thead>
    <tbody>${data.map(u => `<tr>
      <td><strong>${u.nombre}</strong><br><span style="font-size:11px;color:var(--text2)">${u.email}</span></td>
      <td><span class="badge b-cyan">${u.usuarioRed}</span></td>
      <td>${u.sector}<br><span style="font-size:11px;color:var(--text2)">${u.puesto}</span></td>
      <td>${u.sucursal||'—'}</td><td>${estadoBadge(u.estado)}</td>
      <td>${u.equipo?`<span class="badge b-blue">${u.equipo}</span>`:'<span class="badge b-gray">Sin equipo</span>'}</td>
      <td>${u.ingreso||'—'}</td>
      <td><div class="tbl-actions">
        <button class="btn-ghost btn-sm" onclick="openChecklist('${u.id}','alta')">✓</button>
        <button class="btn-ghost btn-sm" onclick="openChecklist('${u.id}','baja')">✗</button>
        <button class="btn-ghost btn-sm" onclick="openModal('usuario','${u.id}')">✏</button>
        <button class="btn-ghost btn-sm" style="color:var(--red)" onclick="deleteItem('${COLS.usuarios}','${u.id}',renderUsuarios)">🗑</button>
      </div></td></tr>`).join('')}
    </tbody></table>`;
}

function openChecklist(userId, type) {
  const u = getCached(COLS.usuarios).find(x=>x.id===userId);
  if (!u) return;
  const alta = type==='alta';
  const items = alta
    ? ['Crear usuario de red','Configurar email corporativo','Instalar y configurar equipo',
       'Asignar licencias de software','Habilitar accesos a sistemas','Agregar a grupos y carpetas',
       'Configurar VPN si corresponde','Entregar credenciales','Registrar equipo en inventario','Notificar al responsable']
    : ['Revocar acceso Active Directory','Deshabilitar email','Revocar VPN y accesos',
       'Recuperar equipo asignado','Dar de baja licencias','Remover de grupos y carpetas',
       'Backup de datos del usuario','Actualizar inventario','Notificar a RRHH','Documentar motivo de baja'];
  document.getElementById('modal-title').textContent = `${alta?'✓ Checklist Alta':'✗ Checklist Baja'} · ${u.nombre}`;
  document.getElementById('modal-body').innerHTML = `
    <div class="checklist">${items.map((item,i)=>`
      <label class="check-item" id="ci-${i}" onclick="toggleCheckItem(${i})">
        <input type="checkbox" />${item}
      </label>`).join('')}</div>
    <div class="form-actions"><button class="btn-outline" onclick="closeModal()">Cerrar</button></div>`;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function toggleCheckItem(i) {
  const el = document.getElementById(`ci-${i}`);
  if(el) el.classList.toggle('checked');
}

/* ═══════════════════════════════════════════════════════════
   LICENCIAS
═══════════════════════════════════════════════════════════ */
function renderLicencias() {
  let data = getCached(COLS.licencias);
  const search = (document.getElementById('lic-search')?.value||'').toLowerCase();
  if (search) data = data.filter(l=>[l.software,l.tipo,l.proveedor].join(' ').toLowerCase().includes(search));

  const el = document.getElementById('lic-search');
  if (el && !el._bound) { el.addEventListener('input',renderLicencias); el._bound=true; }

  if (!data.length) { document.getElementById('licencias-table').innerHTML='<div class="table-empty">Sin licencias.</div>'; return; }

  document.getElementById('licencias-table').innerHTML = `<table>
    <thead><tr><th>Software</th><th>Tipo</th><th>Total</th><th>Asignadas</th>
    <th>Disponibles</th><th>Vencimiento</th><th>Proveedor</th><th>Costo</th><th>Acciones</th></tr></thead>
    <tbody>${data.map(l => {
      const dispon = Number(l.total)-Number(l.asignadas);
      const dias = l.vencimiento ? Math.ceil((new Date(l.vencimiento)-new Date())/86400000) : null;
      const va = dias!==null && dias<=90;
      return `<tr class="${va?'row-warn':''}">
        <td><strong>${l.software}</strong></td><td>${l.tipo}</td>
        <td>${l.total||'∞'}</td>
        <td><span class="badge ${Number(l.asignadas)>=Number(l.total)&&Number(l.total)>0?'b-red':'b-blue'}">${l.asignadas}</span></td>
        <td><span class="badge ${dispon<=0&&Number(l.total)>0?'b-red':'b-green'}">${Number(l.total)>0?dispon:'∞'}</span></td>
        <td>${l.vencimiento?`${l.vencimiento}${va?` <span class="badge b-amber">${dias}d</span>`:''}` : '—'}</td>
        <td>${l.proveedor||'—'}</td><td>$${Number(l.costo||0).toLocaleString('es-AR')}</td>
        <td><div class="tbl-actions">
          <button class="btn-ghost btn-sm" onclick="openModal('licencia','${l.id}')">✏</button>
          <button class="btn-ghost btn-sm" style="color:var(--red)" onclick="deleteItem('${COLS.licencias}','${l.id}',renderLicencias)">🗑</button>
        </div></td></tr>`;}).join('')}
    </tbody></table>`;
}

/* ═══════════════════════════════════════════════════════════
   ACCESOS
═══════════════════════════════════════════════════════════ */
function renderAccesos() {
  let data = getCached(COLS.accesos);
  const search  = (document.getElementById('acc-search')?.value||'').toLowerCase();
  const fSist   = document.getElementById('acc-sistema')?.value||'';
  const fEstado = document.getElementById('acc-estado')?.value||'';
  const getSistemas = a => Array.isArray(a.sistema) ? a.sistema : (a.sistema?[a.sistema]:[]);

  if (fSist)   data = data.filter(a=>getSistemas(a).includes(fSist));
  if (fEstado) data = data.filter(a=>a.estado===fEstado);
  if (search)  data = data.filter(a=>[a.usuario,getSistemas(a).join(' '),a.perfil,a.autorizante].join(' ').toLowerCase().includes(search));

  ['acc-search','acc-sistema','acc-estado'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el._bound) { el.addEventListener('input',renderAccesos); el.addEventListener('change',renderAccesos); el._bound=true; }
  });

  if (!data.length) { document.getElementById('accesos-table').innerHTML='<div class="table-empty">Sin resultados.</div>'; return; }

  document.getElementById('accesos-table').innerHTML = `<table>
    <thead><tr><th>Usuario</th><th>Sistemas habilitados</th><th>Perfil</th>
    <th>Alta</th><th>Baja</th><th>Autorizante</th><th>Estado</th><th>Acciones</th></tr></thead>
    <tbody>${data.map(a => {
      const sistemas = getSistemas(a);
      const sHTML = sistemas.length
        ? sistemas.map(s=>`<span class="badge b-blue" style="margin:1px 2px;font-size:10px">${sistemaIcon(s)} ${s}</span>`).join('')
        : '<span style="color:var(--text3)">—</span>';
      return `<tr>
        <td><span class="badge b-cyan">${a.usuario}</span></td>
        <td style="white-space:normal;max-width:260px">${sHTML}</td>
        <td>${a.perfil||'—'}</td><td>${a.alta||'—'}</td><td>${a.baja||'—'}</td>
        <td>${a.autorizante||'—'}</td><td>${estadoBadge(a.estado)}</td>
        <td><div class="tbl-actions">
          <button class="btn-ghost btn-sm" onclick="openModal('acceso','${a.id}')">✏</button>
          <button class="btn-ghost btn-sm" style="color:var(--red)" onclick="deleteItem('${COLS.accesos}','${a.id}',renderAccesos)">🗑</button>
        </div></td></tr>`;}).join('')}
    </tbody></table>`;
}

function sistemaIcon(s) {
  const m = {'Epicor':'⚡','Microsoft 365':'📧','Correo':'📬','VPN':'🔒','Power BI':'📊',
    'Carpetas compartidas':'📁','Odoo':'🏭','TS1':'🖥','TS2':'🖥','TS3':'🖥',
    'SharePoint':'📂','Teams':'💬','Azure':'☁','GitHub':'🐙','Jira':'📌',
    'SAP':'🏢','Salesforce':'☁','Zoom':'📹','Slack':'💬','Otro':'🔧'};
  return m[s]||'🔧';
}

/* ═══════════════════════════════════════════════════════════
   CELULARES
═══════════════════════════════════════════════════════════ */
function renderCelulares() {
  const all = getCached(COLS.celulares);
  const search = (document.getElementById('cel-search')?.value||'').toLowerCase();
  const fEst   = document.getElementById('cel-estado')?.value||'';
  const fMarca = document.getElementById('cel-marca')?.value||'';
  populateMarcaFilter();

  const data = all.filter(c => {
    if (c.estado==='Baja' && fEst!=='Baja') return false;
    if (fEst   && c.estado!==fEst)   return false;
    if (fMarca && c.marca!==fMarca)  return false;
    if (search && ![c.marca,c.modelo,c.imei,c.nroLinea,c.usuario,c.sector].join(' ').toLowerCase().includes(search)) return false;
    return true;
  });

  ['cel-search','cel-estado','cel-marca'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el._bound) { el.addEventListener('input',renderCelulares); el.addEventListener('change',renderCelulares); el._bound=true; }
  });

  if (!data.length) { document.getElementById('celulares-table').innerHTML='<div class="table-empty">Sin resultados.</div>'; return; }

  document.getElementById('celulares-table').innerHTML = `<table>
    <thead><tr><th>Marca / Modelo</th><th>IMEI</th><th>Nro Línea</th><th>Operadora</th>
    <th>Estado</th><th>Usuario</th><th>Sector</th><th>Garantía</th><th>Acciones</th></tr></thead>
    <tbody>${data.map(c => {
      const gvenc = c.garantia && new Date(c.garantia)<new Date();
      return `<tr class="${gvenc?'row-warn':''}">
        <td><strong>${c.marca}</strong> ${c.modelo}</td>
        <td style="font-size:11px;font-family:monospace">${c.imei||'—'}</td>
        <td>${c.nroLinea||'—'}</td><td>${c.operadora||'—'}</td>
        <td>${estadoBadge(c.estado)}</td><td>${c.usuario||'—'}</td><td>${c.sector||'—'}</td>
        <td>${gvenc?'<span class="badge b-red">Vencida</span>':(c.garantia||'—')}</td>
        <td><div class="tbl-actions">
          <button class="btn-ghost btn-sm" onclick="openModal('celular','${c.id}')">✏</button>
          <button class="btn-ghost btn-sm" style="color:var(--red)" onclick="deleteItem('${COLS.celulares}','${c.id}',renderCelulares)">🗑</button>
        </div></td></tr>`;}).join('')}
    </tbody></table>`;
}

/* ═══════════════════════════════════════════════════════════
   MOVIMIENTOS
═══════════════════════════════════════════════════════════ */
function renderMovimientos() {
  let data = getCached(COLS.movimientos);
  const search = (document.getElementById('mov-search')?.value||'').toLowerCase();
  const fTipo  = document.getElementById('mov-tipo')?.value||'';
  if (fTipo)   data = data.filter(m=>m.tipo===fTipo);
  if (search)  data = data.filter(m=>[m.descripcion,m.referencia,m.modulo].join(' ').toLowerCase().includes(search));

  ['mov-search','mov-tipo'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el._bound) { el.addEventListener('input',renderMovimientos); el.addEventListener('change',renderMovimientos); el._bound=true; }
  });

  if (!data.length) { document.getElementById('movimientos-table').innerHTML='<div class="table-empty">Sin movimientos.</div>'; return; }

  const colorMap = {Equipo:'b-blue',Toner:'b-cyan',Usuario:'b-green',Licencia:'b-purple',Acceso:'b-amber',Celular:'b-red'};
  document.getElementById('movimientos-table').innerHTML = `<table>
    <thead><tr><th>Fecha</th><th>Tipo</th><th>Módulo</th><th>Descripción</th><th>Referencia</th></tr></thead>
    <tbody>${data.slice(0,200).map(m=>`<tr>
      <td style="font-size:11px">${m.fecha}</td>
      <td><span class="badge ${colorMap[m.tipo]||'b-gray'}">${m.tipo}</span></td>
      <td>${m.modulo}</td><td>${m.descripcion}</td>
      <td style="font-size:11px;color:var(--text2)">${m.referencia||'—'}</td>
    </tr>`).join('')}
    </tbody></table>`;
}

/* ═══════════════════════════════════════════════════════════
   REPORTES
═══════════════════════════════════════════════════════════ */
function renderReportes() {
  const equipos   = getCached(COLS.equipos);
  const toners    = getCached(COLS.toners);
  const usuarios  = getCached(COLS.usuarios);
  const licencias = getCached(COLS.licencias);
  const accesos   = getCached(COLS.accesos);
  const celulares = getCached(COLS.celulares);

  const reports = [
    { icon:'💻', title:'Inventario general',       desc:`${equipos.filter(e=>e.estado!=='Baja').length} equipos activos.`,          action: ()=>exportExcelData('Equipos', equipos) },
    { icon:'👤', title:'Equipos por usuario',      desc:'Equipos asignados a cada usuario.',                                         action: ()=>exportExcelData('Equipos x Usuario', equipos.filter(e=>e.estado==='Asignado'),['serie','tipo','marca','modelo','usuario','sector']) },
    { icon:'🏢', title:'Equipos por sector',       desc:'Distribución por área.',                                                    action: ()=>exportExcelData('Equipos x Sector', equipos.filter(e=>e.estado!=='Baja'),['sector','tipo','marca','modelo','serie','estado']) },
    { icon:'🖨', title:'Toners bajo stock',        desc:`${toners.filter(t=>Number(t.stock)<=Number(t.minimo)).length} críticos.`,   action: ()=>exportExcelData('Toners Críticos', toners.filter(t=>Number(t.stock)<=Number(t.minimo))) },
    { icon:'✓',  title:'Usuarios activos',         desc:`${usuarios.filter(u=>u.estado==='Activo').length} en plantilla.`,           action: ()=>exportExcelData('Usuarios Activos', usuarios.filter(u=>u.estado==='Activo')) },
    { icon:'↓',  title:'Usuarios dados de baja',   desc:`${usuarios.filter(u=>u.estado==='Baja').length} desvinculados.`,            action: ()=>exportExcelData('Usuarios Baja', usuarios.filter(u=>u.estado==='Baja')) },
    { icon:'🔑', title:'Licencias',                desc:'Detalle de asignaciones.',                                                  action: ()=>exportExcelData('Licencias', licencias) },
    { icon:'🔐', title:'Accesos activos',          desc:`${accesos.filter(a=>a.estado==='Activo').length} habilitados.`,             action: ()=>exportExcelData('Accesos Activos', accesos.filter(a=>a.estado==='Activo').map(a=>({...a,sistema:Array.isArray(a.sistema)?a.sistema.join(', '):a.sistema}))) },
    { icon:'🔧', title:'Equipos en reparación',    desc:`${equipos.filter(e=>e.estado==='Reparación').length} en servicio técnico.`, action: ()=>exportExcelData('Reparación', equipos.filter(e=>e.estado==='Reparación')) },
    { icon:'📱', title:'Celulares corporativos',   desc:`${celulares.filter(c=>c.estado!=='Baja').length} en inventario.`,           action: ()=>exportExcelData('Celulares', celulares) },
    { icon:'⚠',  title:'Garantías vencidas',       desc:'Equipos con garantía expirada.',                                           action: ()=>exportExcelData('Garantías Vencidas', equipos.filter(e=>e.garantia&&new Date(e.garantia)<new Date())) },
    { icon:'📄', title:'Reporte general PDF',      desc:'Informe ejecutivo completo.',                                               action: ()=>exportPDFGeneral() },
  ];

  document.getElementById('report-grid').innerHTML = reports.map((r,i)=>`
    <div class="report-card">
      <h3>${r.icon} ${r.title}</h3><p>${r.desc}</p>
      <button class="btn-primary" onclick="window._reportActions[${i}]()">Generar reporte</button>
    </div>`).join('');
  window._reportActions = reports.map(r=>r.action);
}

/* ═══════════════════════════════════════════════════════════
   MODALS
═══════════════════════════════════════════════════════════ */
function openModal(type, id=null) {
  editingId = id;
  const forms   = { equipo:formEquipo, toner:formToner, usuario:formUsuario, licencia:formLicencia, acceso:formAcceso, celular:formCelular };
  const titles  = { equipo:id?'Editar equipo':'Nuevo equipo', toner:id?'Editar toner':'Nuevo toner',
    usuario:id?'Editar usuario':'Nuevo usuario', licencia:id?'Editar licencia':'Nueva licencia',
    acceso:id?'Editar acceso':'Nuevo acceso', celular:id?'Editar celular':'Nuevo celular' };
  document.getElementById('modal-title').textContent = titles[type];
  document.getElementById('modal-body').innerHTML = forms[type](id);
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); editingId=null; }
function closeModalOverlay(e) { if(e.target===document.getElementById('modal-overlay')) closeModal(); }

/* ─── helpers para forms ─────────────────────────────────── */
const g = id => { const el=document.getElementById(id); return el?el.value.trim():''; };
const vf = (d,f,def='') => d&&d[f]!==undefined ? d[f] : def;
const opt = (vals,cur) => vals.map(o=>`<option ${o===cur?'selected':''}>${o}</option>`).join('');

function getRecord(col, id) {
  return id ? getCached(col).find(x=>x.id===id) || {} : {};
}

/* ─── EQUIPO FORM ────────────────────────────────────────── */
function formEquipo(id) {
  const d = getRecord(COLS.equipos, id);
  return `
  <div class="form-row">
    <div class="form-group"><label>Tipo</label>
      <select id="f-tipo" class="form-input">${opt(['Notebook','Desktop','Impresora','Monitor','Servidor','Otro'],vf(d,'tipo'))}</select></div>
    <div class="form-group"><label>Estado</label>
      <select id="f-estado" class="form-input">${opt(['Disponible','Asignado','Reparación','Obsoleto','Baja'],vf(d,'estado','Disponible'))}</select></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Marca</label><input id="f-marca" class="form-input" value="${vf(d,'marca')}"/></div>
    <div class="form-group"><label>Modelo</label><input id="f-modelo" class="form-input" value="${vf(d,'modelo')}"/></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Número de serie</label><input id="f-serie" class="form-input" value="${vf(d,'serie')}"/></div>
    <div class="form-group"><label>Sistema operativo</label><input id="f-so" class="form-input" value="${vf(d,'so')}"/></div>
  </div>
  <div class="form-row cols3">
    <div class="form-group"><label>Procesador</label><input id="f-cpu" class="form-input" value="${vf(d,'cpu')}"/></div>
    <div class="form-group"><label>RAM</label><input id="f-ram" class="form-input" value="${vf(d,'ram')}"/></div>
    <div class="form-group"><label>Disco</label><input id="f-disco" class="form-input" value="${vf(d,'disco')}"/></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Sector</label><input id="f-sector" class="form-input" value="${vf(d,'sector')}"/></div>
    <div class="form-group"><label>Sucursal</label><input id="f-sucursal" class="form-input" value="${vf(d,'sucursal')}"/></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Usuario asignado</label><input id="f-usuario" class="form-input" value="${vf(d,'usuario')}"/></div>
    <div class="form-group"><label>Fecha de compra</label><input id="f-compra" type="date" class="form-input" value="${vf(d,'compra')}"/></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Garantía hasta</label><input id="f-garantia" type="date" class="form-input" value="${vf(d,'garantia')}"/></div>
    <div class="form-group"><label>Observaciones</label><input id="f-obs" class="form-input" value="${vf(d,'obs')}"/></div>
  </div>
  <div class="form-actions">
    <button class="btn-outline" onclick="closeModal()">Cancelar</button>
    <button class="btn-primary" onclick="saveEquipo()">Guardar</button>
  </div>`;
}

async function saveEquipo() {
  const obj = { tipo:g('f-tipo'),estado:g('f-estado'),marca:g('f-marca'),modelo:g('f-modelo'),
    serie:g('f-serie'),so:g('f-so'),cpu:g('f-cpu'),ram:g('f-ram'),disco:g('f-disco'),
    sector:g('f-sector'),sucursal:g('f-sucursal'),usuario:g('f-usuario'),
    compra:g('f-compra'),garantia:g('f-garantia'),obs:g('f-obs') };
  if (!obj.marca||!obj.modelo) { toast('Completá marca y modelo','error'); return; }
  if (editingId) obj.id = editingId;
  await fbSave(COLS.equipos, obj);
  logMov('Equipo','Equipos',`${editingId?'Edición':'Alta'}: ${obj.marca} ${obj.modelo}`,obj.serie);
  closeModal(); await loadAndRender('equipos', renderEquipos);
  toast(`Equipo ${editingId?'actualizado':'creado'}`,'success');
}

/* ─── TONER FORM ─────────────────────────────────────────── */
function formToner(id) {
  const d = getRecord(COLS.toners, id);
  return `
  <div class="form-row">
    <div class="form-group"><label>Código</label><input id="f-codigo" class="form-input" value="${vf(d,'codigo')}"/></div>
    <div class="form-group"><label>Marca</label><input id="f-marca" class="form-input" value="${vf(d,'marca')}"/></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Modelo / Nro</label><input id="f-modelo" class="form-input" value="${vf(d,'modelo')}"/></div>
    <div class="form-group"><label>Impresora compatible</label><input id="f-impresora" class="form-input" value="${vf(d,'impresora')}"/></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Sector</label><input id="f-sector" class="form-input" value="${vf(d,'sector')}"/></div>
    <div class="form-group"><label>Proveedor</label><input id="f-proveedor" class="form-input" value="${vf(d,'proveedor')}"/></div>
  </div>
  <div class="form-row cols3">
    <div class="form-group"><label>Stock actual</label><input id="f-stock" type="number" class="form-input" value="${vf(d,'stock',0)}"/></div>
    <div class="form-group"><label>Stock mínimo</label><input id="f-minimo" type="number" class="form-input" value="${vf(d,'minimo',1)}"/></div>
    <div class="form-group"><label>Costo AR$</label><input id="f-costo" type="number" class="form-input" value="${vf(d,'costo',0)}"/></div>
  </div>
  <div class="form-group"><label>Última compra</label><input id="f-ultima" type="date" class="form-input" value="${vf(d,'ultima')}"/></div>
  <div class="form-group"><label>Observaciones</label><textarea id="f-obs" class="form-input">${vf(d,'obs')}</textarea></div>
  <div class="form-actions">
    <button class="btn-outline" onclick="closeModal()">Cancelar</button>
    <button class="btn-primary" onclick="saveToner()">Guardar</button>
  </div>`;
}

async function saveToner() {
  const obj = { codigo:g('f-codigo'),marca:g('f-marca'),modelo:g('f-modelo'),impresora:g('f-impresora'),
    sector:g('f-sector'),proveedor:g('f-proveedor'),stock:parseInt(g('f-stock'))||0,
    minimo:parseInt(g('f-minimo'))||1,costo:parseFloat(g('f-costo'))||0,ultima:g('f-ultima'),obs:g('f-obs') };
  if (!obj.codigo) { toast('Ingresá el código del toner','error'); return; }
  if (editingId) obj.id = editingId;
  await fbSave(COLS.toners, obj);
  logMov('Toner','Toners',`${editingId?'Edición':'Alta'}: ${obj.codigo}`,obj.codigo);
  closeModal(); await loadAndRender('toners', renderToners);
  toast(`Toner ${editingId?'actualizado':'creado'}`,'success');
}

/* ─── USUARIO FORM ───────────────────────────────────────── */
function formUsuario(id) {
  const d = getRecord(COLS.usuarios, id);
  return `
  <div class="form-row">
    <div class="form-group"><label>Nombre y apellido</label><input id="f-nombre" class="form-input" value="${vf(d,'nombre')}"/></div>
    <div class="form-group"><label>Usuario de red</label><input id="f-uRed" class="form-input" value="${vf(d,'usuarioRed')}"/></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Email</label><input id="f-email" type="email" class="form-input" value="${vf(d,'email')}"/></div>
    <div class="form-group"><label>Estado</label>
      <select id="f-estado" class="form-input">${opt(['Activo','Baja','Licencia'],vf(d,'estado','Activo'))}</select></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Sector</label><input id="f-sector" class="form-input" value="${vf(d,'sector')}"/></div>
    <div class="form-group"><label>Puesto</label><input id="f-puesto" class="form-input" value="${vf(d,'puesto')}"/></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Sucursal</label><input id="f-sucursal" class="form-input" value="${vf(d,'sucursal')}"/></div>
    <div class="form-group"><label>Responsable</label><input id="f-resp" class="form-input" value="${vf(d,'responsable')}"/></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Fecha ingreso</label><input id="f-ingreso" type="date" class="form-input" value="${vf(d,'ingreso')}"/></div>
    <div class="form-group"><label>Fecha baja</label><input id="f-baja" type="date" class="form-input" value="${vf(d,'baja')}"/></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Equipo asignado (serie)</label><input id="f-equipo" class="form-input" value="${vf(d,'equipo')}"/></div>
    <div class="form-group"><label>Licencias</label><input id="f-licencias" class="form-input" value="${vf(d,'licencias')}"/></div>
  </div>
  <div class="form-group"><label>Accesos</label><input id="f-accesos" class="form-input" value="${vf(d,'accesos')}"/></div>
  <div class="form-group"><label>Observaciones</label><textarea id="f-obs" class="form-input">${vf(d,'obs')}</textarea></div>
  <div class="form-actions">
    <button class="btn-outline" onclick="closeModal()">Cancelar</button>
    <button class="btn-primary" onclick="saveUsuario()">Guardar</button>
  </div>`;
}

async function saveUsuario() {
  const obj = { nombre:g('f-nombre'),usuarioRed:g('f-uRed'),email:g('f-email'),
    estado:g('f-estado'),sector:g('f-sector'),puesto:g('f-puesto'),
    sucursal:g('f-sucursal'),responsable:g('f-resp'),ingreso:g('f-ingreso'),
    baja:g('f-baja'),equipo:g('f-equipo'),licencias:g('f-licencias'),
    accesos:g('f-accesos'),obs:g('f-obs') };
  if (!obj.nombre||!obj.usuarioRed) { toast('Nombre y usuario de red son requeridos','error'); return; }
  if (editingId) obj.id = editingId;
  await fbSave(COLS.usuarios, obj);
  logMov('Usuario','Usuarios',`${editingId?'Edición':'Alta'}: ${obj.nombre}`,obj.usuarioRed);
  closeModal(); await loadAndRender('usuarios', renderUsuarios);
  toast(`Usuario ${editingId?'actualizado':'creado'}`,'success');
}

/* ─── LICENCIA FORM ──────────────────────────────────────── */
function formLicencia(id) {
  const d = getRecord(COLS.licencias, id);
  return `
  <div class="form-group"><label>Software</label><input id="f-sw" class="form-input" value="${vf(d,'software')}"/></div>
  <div class="form-row">
    <div class="form-group"><label>Tipo de licencia</label><input id="f-tipo" class="form-input" value="${vf(d,'tipo')}"/></div>
    <div class="form-group"><label>Proveedor</label><input id="f-prov" class="form-input" value="${vf(d,'proveedor')}"/></div>
  </div>
  <div class="form-row cols3">
    <div class="form-group"><label>Total licencias</label><input id="f-total" type="number" class="form-input" value="${vf(d,'total',0)}"/></div>
    <div class="form-group"><label>Asignadas</label><input id="f-asig" type="number" class="form-input" value="${vf(d,'asignadas',0)}"/></div>
    <div class="form-group"><label>Costo AR$</label><input id="f-costo" type="number" class="form-input" value="${vf(d,'costo',0)}"/></div>
  </div>
  <div class="form-group"><label>Vencimiento</label><input id="f-venc" type="date" class="form-input" value="${vf(d,'vencimiento')}"/></div>
  <div class="form-group"><label>Observaciones</label><textarea id="f-obs" class="form-input">${vf(d,'obs')}</textarea></div>
  <div class="form-actions">
    <button class="btn-outline" onclick="closeModal()">Cancelar</button>
    <button class="btn-primary" onclick="saveLicencia()">Guardar</button>
  </div>`;
}

async function saveLicencia() {
  const obj = { software:g('f-sw'),tipo:g('f-tipo'),proveedor:g('f-prov'),
    total:parseInt(g('f-total'))||0,asignadas:parseInt(g('f-asig'))||0,
    costo:parseFloat(g('f-costo'))||0,vencimiento:g('f-venc'),obs:g('f-obs') };
  if (!obj.software) { toast('Ingresá el nombre del software','error'); return; }
  if (editingId) obj.id = editingId;
  await fbSave(COLS.licencias, obj);
  logMov('Licencia','Licencias',`${editingId?'Edición':'Alta'}: ${obj.software}`,obj.software);
  closeModal(); await loadAndRender('licencias', renderLicencias);
  toast(`Licencia ${editingId?'actualizada':'creada'}`,'success');
}

/* ─── ACCESO FORM ────────────────────────────────────────── */
function formAcceso(id) {
  const d = getRecord(COLS.accesos, id);
  const curSistemas = Array.isArray(d.sistema) ? d.sistema : (d.sistema?[d.sistema]:[]);
  const checkboxes = SISTEMAS_ACCESO.map((s,i) => {
    const checked = curSistemas.includes(s) ? 'checked' : '';
    return `<label class="sis-check-item ${checked?'checked':''}" id="sislbl-${i}" onclick="toggleSisCheck(${i})">
      <input type="checkbox" id="sis-${i}" value="${s}" ${checked} onclick="event.stopPropagation()"/><span>${sistemaIcon(s)} ${s}</span>
    </label>`;
  }).join('');

  return `
  <div class="form-row">
    <div class="form-group"><label>Usuario de red</label><input id="f-usr" class="form-input" value="${vf(d,'usuario')}"/></div>
    <div class="form-group"><label>Estado</label>
      <select id="f-estado" class="form-input">${opt(['Activo','Inactivo'],vf(d,'estado','Activo'))}</select></div>
  </div>
  <div class="form-group">
    <label>Sistemas habilitados <span style="color:var(--text3);font-weight:400;text-transform:none">(seleccioná uno o varios)</span></label>
    <div class="sis-check-grid">${checkboxes}</div>
    <div id="sis-preview" style="margin-top:6px;font-size:11px;color:var(--text2)"></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Perfil / Rol</label><input id="f-perfil" class="form-input" value="${vf(d,'perfil')}"/></div>
    <div class="form-group"><label>Autorizante</label><input id="f-auth" class="form-input" value="${vf(d,'autorizante')}"/></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Fecha alta</label><input id="f-alta" type="date" class="form-input" value="${vf(d,'alta')}"/></div>
    <div class="form-group"><label>Fecha baja</label><input id="f-baja" type="date" class="form-input" value="${vf(d,'baja')}"/></div>
  </div>
  <div class="form-group"><label>Observaciones</label><textarea id="f-obs" class="form-input">${vf(d,'obs')}</textarea></div>
  <div class="form-actions">
    <button class="btn-outline" onclick="closeModal()">Cancelar</button>
    <button class="btn-primary" onclick="saveAcceso()">Guardar</button>
  </div>
  <script>(function(){updateSisPreview();})()<\/script>`;
}

function toggleSisCheck(i) {
  const cb=document.getElementById(`sis-${i}`), lbl=document.getElementById(`sislbl-${i}`);
  if(!cb||!lbl) return;
  cb.checked=!cb.checked; lbl.classList.toggle('checked',cb.checked); updateSisPreview();
}

function updateSisPreview() {
  const sel = SISTEMAS_ACCESO.filter((_,i)=>{ const cb=document.getElementById(`sis-${i}`); return cb&&cb.checked; });
  const p = document.getElementById('sis-preview');
  if(p) p.textContent = sel.length ? `✓ ${sel.length} sistema(s): ${sel.join(', ')}` : 'Ningún sistema seleccionado';
}

async function saveAcceso() {
  const sistemas = SISTEMAS_ACCESO.filter((_,i)=>{ const cb=document.getElementById(`sis-${i}`); return cb&&cb.checked; });
  const obj = { usuario:g('f-usr'),sistema:sistemas,perfil:g('f-perfil'),
    estado:g('f-estado'),alta:g('f-alta'),baja:g('f-baja'),autorizante:g('f-auth'),obs:g('f-obs') };
  if (!obj.usuario) { toast('El usuario de red es requerido','error'); return; }
  if (!obj.sistema.length) { toast('Seleccioná al menos un sistema','error'); return; }
  if (editingId) obj.id = editingId;
  await fbSave(COLS.accesos, obj);
  logMov('Acceso','Accesos',`${editingId?'Edición':'Alta'}: ${obj.usuario} → ${obj.sistema.join(', ')}`,obj.usuario);
  closeModal(); await loadAndRender('accesos', renderAccesos);
  toast(`Acceso ${editingId?'actualizado':'creado'}`,'success');
}

/* ─── CELULAR FORM ───────────────────────────────────────── */
function formCelular(id) {
  const d = getRecord(COLS.celulares, id);
  return `
  <div class="form-row">
    <div class="form-group"><label>Marca</label>
      <select id="f-marca" class="form-input">${opt(['iPhone','Samsung','Motorola','Xiaomi','LG','Nokia','Huawei','Otro'],vf(d,'marca'))}</select></div>
    <div class="form-group"><label>Modelo</label><input id="f-modelo" class="form-input" value="${vf(d,'modelo')}" placeholder="ej: Galaxy A54"/></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>IMEI</label><input id="f-imei" class="form-input" value="${vf(d,'imei')}"/></div>
    <div class="form-group"><label>Nro de línea</label><input id="f-linea" class="form-input" value="${vf(d,'nroLinea')}"/></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Operadora</label>
      <select id="f-operadora" class="form-input">${opt(['Personal','Claro','Movistar','Tuenti','Sin línea','Otra'],vf(d,'operadora'))}</select></div>
    <div class="form-group"><label>Estado</label>
      <select id="f-estado" class="form-input">${opt(['Disponible','Asignado','Reparación','Baja'],vf(d,'estado','Disponible'))}</select></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Usuario asignado</label><input id="f-usuario" class="form-input" value="${vf(d,'usuario')}"/></div>
    <div class="form-group"><label>Sector</label><input id="f-sector" class="form-input" value="${vf(d,'sector')}"/></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Sucursal</label><input id="f-sucursal" class="form-input" value="${vf(d,'sucursal')}"/></div>
    <div class="form-group"><label>Fecha de compra</label><input id="f-compra" type="date" class="form-input" value="${vf(d,'compra')}"/></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Garantía hasta</label><input id="f-garantia" type="date" class="form-input" value="${vf(d,'garantia')}"/></div>
    <div class="form-group"></div>
  </div>
  <div class="form-group"><label>Observaciones</label><textarea id="f-obs" class="form-input">${vf(d,'obs')}</textarea></div>
  <div class="form-actions">
    <button class="btn-outline" onclick="closeModal()">Cancelar</button>
    <button class="btn-primary" onclick="saveCelular()">Guardar</button>
  </div>`;
}

async function saveCelular() {
  const obj = { marca:g('f-marca'),modelo:g('f-modelo'),imei:g('f-imei'),
    nroLinea:g('f-linea'),operadora:g('f-operadora'),estado:g('f-estado'),
    usuario:g('f-usuario'),sector:g('f-sector'),sucursal:g('f-sucursal'),
    compra:g('f-compra'),garantia:g('f-garantia'),obs:g('f-obs') };
  if (!obj.marca||!obj.modelo) { toast('Marca y modelo son requeridos','error'); return; }
  if (editingId) obj.id = editingId;
  await fbSave(COLS.celulares, obj);
  logMov('Celular','Celulares',`${editingId?'Edición':'Alta'}: ${obj.marca} ${obj.modelo}`,obj.imei||obj.modelo);
  closeModal(); await loadAndRender('celulares', renderCelulares);
  toast(`Celular ${editingId?'actualizado':'registrado'}`,'success');
}

/* ═══════════════════════════════════════════════════════════
   DELETE
═══════════════════════════════════════════════════════════ */
async function deleteItem(col, id, renderFn) {
  if (!confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return;
  await fbDelete(col, id);
  // Actualizar cache
  if (STATE_DATA[col]) STATE_DATA[col] = STATE_DATA[col].filter(x=>x.id!==id);
  if (renderFn) renderFn();
  toast('Registro eliminado','info');
}

/* ═══════════════════════════════════════════════════════════
   CONFIG — BACKUP / EXPORT
═══════════════════════════════════════════════════════════ */
async function exportBackup() {
  toast('Generando backup…','info');
  const backup = { _exported: new Date().toLocaleString('es-AR'), _version: '2.0-firebase' };
  await Promise.all(Object.entries(COLS).map(async ([k,col]) => {
    backup[k] = await fbGetAll(col);
  }));
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type:'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href=url; a.download=`CLADAN_IT_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(url);
  toast('Backup exportado','success');
}

async function importBackup(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!confirm(`¿Importar backup? Esto AGREGARÁ los registros del backup a Firestore (no borra los existentes).`)) return;
      let total = 0;
      for (const [k, col] of Object.entries(COLS)) {
        const arr = data[k] || [];
        for (const item of arr) {
          const { id, ...rest } = item;
          await DB.collection(col).add(rest);
          total++;
        }
      }
      toast(`Importados ${total} registros a Firestore`,'success');
      await loadAllAndRenderDashboard();
    } catch(e) {
      toast('Error al importar: '+e.message,'error');
    }
    input.value='';
  };
  reader.readAsText(file);
}

function exportExcelData(name, data, fields=null) {
  if (!data.length) { toast('Sin datos para exportar','error'); return; }
  const rows = data.map(r => {
    const out = {};
    const keys = fields || Object.keys(r).filter(k=>k!=='id');
    keys.forEach(k => { out[k] = Array.isArray(r[k]) ? r[k].join(', ') : (r[k]??''); });
    return out;
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, name.substring(0,30));
  XLSX.writeFile(wb, `CLADAN_IT_${name.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.xlsx`);
  toast('Excel exportado','success');
}

async function exportPDFGeneral() {
  toast('Generando PDF…','info');
  await loadAllCollections();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  const equipos   = getCached(COLS.equipos);
  const toners    = getCached(COLS.toners);
  const usuarios  = getCached(COLS.usuarios);
  const licencias = getCached(COLS.licencias);
  const celulares = getCached(COLS.celulares);
  const W = 210; let y = 0;

  doc.setFillColor(15,28,46); doc.rect(0,0,W,30,'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(18); doc.setTextColor(255,255,255);
  doc.text('CLADAN IT Control',14,14);
  doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(148,163,184);
  doc.text('Informe General',14,21);
  doc.text('Generado: '+new Date().toLocaleString('es-AR'),W-14,21,{align:'right'});
  y=40;

  const section = t => {
    if(y>255){doc.addPage();y=16;}
    doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(29,78,216);
    doc.text(t,14,y); y+=8;
    doc.setDrawColor(29,78,216); doc.line(14,y-2,W-14,y-2); y+=2;
  };

  section('RESUMEN EJECUTIVO');
  const kpis=[
    ['Total equipos',equipos.filter(e=>e.estado!=='Baja').length],
    ['Notebooks disponibles',equipos.filter(e=>e.tipo==='Notebook'&&e.estado==='Disponible').length],
    ['Usuarios activos',usuarios.filter(u=>u.estado==='Activo').length],
    ['Toners críticos',toners.filter(t=>Number(t.stock)<=Number(t.minimo)).length],
    ['Licencias asignadas',licencias.reduce((s,l)=>s+Number(l.asignadas||0),0)],
    ['Celulares asignados',celulares.filter(c=>c.estado==='Asignado').length],
  ];
  kpis.forEach(([l,v])=>{
    if(y>270){doc.addPage();y=16;}
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(148,163,184);
    doc.text(String(l),14,y);
    doc.setFont('helvetica','normal'); doc.setTextColor(226,232,240);
    doc.text(String(v),80,y); y+=6;
  });
  y+=4;

  const drawTable = (rows,x,sy,cws) => {
    rows.forEach((row,ri)=>{
      if(sy+ri*7>275){return;}
      doc.setFillColor(ri===0?26:ri%2===0?15:22,ri===0?34:ri%2===0?24:30,ri===0?54:ri%2===0?46:54);
      let cx=x; cws.forEach(cw=>{doc.rect(cx,sy+ri*7,cw,7,'F');cx+=cw;});
      cx=x;
      doc.setFont('helvetica',ri===0?'bold':'normal');
      doc.setFontSize(ri===0?7.5:7);
      doc.setTextColor(ri===0?226:200,ri===0?232:208,ri===0?240:218);
      row.forEach((cell,ci)=>{doc.text(String(cell||'').substring(0,14),cx+2,sy+ri*7+4.5);cx+=cws[ci];});
    });
  };

  if(y>220){doc.addPage();y=16;}
  section('EQUIPOS');
  const eqT=[['Serie','Tipo','Marca','Modelo','Estado','Sector','Usuario']];
  equipos.filter(e=>e.estado!=='Baja').slice(0,20).forEach(e=>eqT.push([e.serie||'—',e.tipo,e.marca,e.modelo,e.estado,e.sector||'—',e.usuario||'—']));
  drawTable(eqT,14,y,[25,20,22,30,20,25,28]); y+=eqT.length*7+8;

  if(y>220){doc.addPage();y=16;}
  section('USUARIOS ACTIVOS');
  const usT=[['Nombre','Usuario','Sector','Puesto','Equipo']];
  usuarios.filter(u=>u.estado==='Activo').forEach(u=>usT.push([u.nombre,u.usuarioRed,u.sector,u.puesto,u.equipo||'—']));
  drawTable(usT,14,y,[42,24,26,30,34]); y+=usT.length*7+8;

  const pages=doc.internal.getNumberOfPages();
  for(let i=1;i<=pages;i++){
    doc.setPage(i);
    doc.setFontSize(7); doc.setTextColor(75,85,99);
    doc.text(`CLADAN IT Control · ${new Date().toLocaleString('es-AR')} · Pág ${i}/${pages}`,W/2,292,{align:'center'});
    doc.setDrawColor(31,45,69); doc.line(14,288,W-14,288);
  }
  doc.save(`CLADAN_IT_Informe_${new Date().toISOString().slice(0,10)}.pdf`);
  toast('PDF generado','success');
}

/* ═══════════════════════════════════════════════════════════
   DEMO DATA — solo desde Config
═══════════════════════════════════════════════════════════ */
async function loadDemoData() {
  if (!confirm('¿Cargar datos demo? Esto AGREGA registros de prueba a Firestore.')) return;
  toast('Cargando datos demo…','info');

  const uid = () => Math.random().toString(36).slice(2);

  const equipos = [
    {tipo:'Notebook',marca:'Lenovo',modelo:'ThinkPad E14',serie:'LNV2024001',cpu:'Intel Core i5-1235U',ram:'16 GB',disco:'SSD 512 GB',so:'Windows 11 Pro',estado:'Asignado',usuario:'Juan Pérez',sector:'Comercial',sucursal:'Casa Central',compra:'2023-03-15',garantia:'2026-03-15',obs:''},
    {tipo:'Notebook',marca:'Dell',modelo:'Latitude 5540',serie:'DLL2024002',cpu:'Intel Core i7-1355U',ram:'16 GB',disco:'SSD 512 GB',so:'Windows 11 Pro',estado:'Asignado',usuario:'María García',sector:'Administración',sucursal:'Casa Central',compra:'2024-01-10',garantia:'2027-01-10',obs:''},
    {tipo:'Notebook',marca:'HP',modelo:'EliteBook 840 G9',serie:'HP2024003',cpu:'Intel Core i5-1235U',ram:'8 GB',disco:'SSD 256 GB',so:'Windows 10 Pro',estado:'Disponible',usuario:'',sector:'IT',sucursal:'Casa Central',compra:'2022-06-20',garantia:'2025-06-20',obs:''},
    {tipo:'Desktop',marca:'HP',modelo:'ProDesk 400 G7',serie:'HP2023005',cpu:'Intel Core i3-10300',ram:'8 GB',disco:'HDD 1 TB',so:'Windows 10 Pro',estado:'Asignado',usuario:'Carlos López',sector:'Contabilidad',sucursal:'Casa Central',compra:'2021-04-12',garantia:'2024-04-12',obs:''},
    {tipo:'Impresora',marca:'HP',modelo:'LaserJet M404n',serie:'HPLJ2023001',cpu:'',ram:'',disco:'',so:'',estado:'Disponible',usuario:'',sector:'Administración',sucursal:'Casa Central',compra:'2023-07-01',garantia:'2026-07-01',obs:''},
  ];
  const toners = [
    {codigo:'TNR-HP-83A',marca:'HP',modelo:'CF283A (83A)',impresora:'HP LaserJet M225',sector:'Administración',stock:2,minimo:3,proveedor:'Proveedor Tech SA',ultima:'2024-03-01',costo:8500,obs:'Stock crítico'},
    {codigo:'TNR-HP-05A',marca:'HP',modelo:'CE505A (05A)',impresora:'HP LaserJet P2035',sector:'Comercial',stock:5,minimo:2,proveedor:'Suministros Norte SRL',ultima:'2024-04-15',costo:11200,obs:''},
  ];
  const usuarios = [
    {nombre:'Juan Pérez',usuarioRed:'jperez',email:'jperez@cladan.com',sector:'Comercial',puesto:'Vendedor Senior',sucursal:'Casa Central',responsable:'Diego Ramírez',estado:'Activo',ingreso:'2020-03-01',baja:'',equipo:'LNV2024001',licencias:'Microsoft 365',accesos:'Epicor, VPN',obs:''},
    {nombre:'María García',usuarioRed:'mgarcia',email:'mgarcia@cladan.com',sector:'Administración',puesto:'Asistente Administrativa',sucursal:'Casa Central',responsable:'Laura Torres',estado:'Activo',ingreso:'2019-07-15',baja:'',equipo:'DLL2024002',licencias:'Microsoft 365',accesos:'Correo',obs:''},
  ];

  for (const e of equipos) await DB.collection(COLS.equipos).add(e);
  for (const t of toners)  await DB.collection(COLS.toners).add(t);
  for (const u of usuarios) await DB.collection(COLS.usuarios).add(u);

  toast('Datos demo cargados en Firestore','success');
  await loadAllAndRenderDashboard();
}

/* ═══════════════════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════════════════ */
function estadoBadge(s) {
  const m={Disponible:'b-green',Asignado:'b-blue',Reparación:'b-amber',Obsoleto:'b-red',Baja:'b-gray',Activo:'b-green',Inactivo:'b-gray',Licencia:'b-amber'};
  return `<span class="badge ${m[s]||'b-gray'}">${s}</span>`;
}

function toast(msg, type='info') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className=`toast ${type}`;
  t.classList.remove('hidden');
  clearTimeout(t._to);
  t._to = setTimeout(()=>t.classList.add('hidden'), 3500);
}

function showVersionInfo() {
  alert(`CLADAN IT Control\nFirebase Firestore\nProyecto: cladan-it\n\nTodos los datos se guardan en la nube.\nCualquier usuario ve los mismos datos.`);
}

/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  try {
    initFirebase();
  } catch(e) {
    alert('Error al conectar con Firebase: ' + e.message);
    return;
  }
  initAuth();
  initNav();
  if (sessionStorage.getItem('cit_auth')) {
    loadAllAndRenderDashboard();
  }
});
