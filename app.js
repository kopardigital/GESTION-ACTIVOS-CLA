/* ═══════════════════════════════════════════════════════════
   CLADAN IT Control · app.js
   100% client-side · LocalStorage · GitHub Pages ready
═══════════════════════════════════════════════════════════ */
'use strict';

/* ─── AUTH CONFIG ─────────────────────────────────────────
   ⚠ Credenciales visibles en código fuente.
   Solo barrera visual. No usar en producción sin backend.
──────────────────────────────────────────────────────── */
const AUTH = { user: 'admin', pass: 'Cambiar123!' };

/* ─── VERSIÓN DE DATOS ───────────────────────────────────
   Clave: APP_DATA_VERSION en localStorage
   v1.0 → estructura original (equipos,toners,usuarios,licencias,accesos,movimientos)
   v1.1 → agrega módulo celulares + nuevos sistemas en accesos
   NUNCA eliminar claves existentes de KEYS. Solo agregar.
──────────────────────────────────────────────────────── */
const DATA_VERSION = '1.1';
const DATA_VERSION_KEY = 'APP_DATA_VERSION';

/* ─── STORAGE KEYS ──────────────────────────────────────
   REGLA: Nunca renombrar ni eliminar claves existentes.
   Los datos de usuarios reales viven aquí.
   Lista completa de claves usadas en localStorage:
   - cit_equipos      → inventario de equipos
   - cit_toners       → stock de toners
   - cit_usuarios     → plantilla de usuarios
   - cit_licencias    → licencias de software
   - cit_accesos      → control de accesos a sistemas
   - cit_movimientos  → historial de movimientos
   - cit_celulares    → celulares corporativos (v1.1 nuevo)
   - APP_DATA_VERSION → versión actual de la estructura
──────────────────────────────────────────────────────── */
const KEYS = {
  equipos: 'cit_equipos', toners: 'cit_toners', usuarios: 'cit_usuarios',
  licencias: 'cit_licencias', accesos: 'cit_accesos', movimientos: 'cit_movimientos',
  celulares: 'cit_celulares',   // ← agregado en v1.1
};

/* ─── SISTEMAS DE ACCESO ─────────────────────────────────
   Lista centralizada usada en form y filtro de accesos.
   Agregados en v1.1: TS1, TS2, TS3, SharePoint, Teams,
   Azure, GitHub, Jira, SAP, Salesforce, Zoom, Slack.
   Los registros existentes con valores anteriores
   se siguen mostrando sin problema (campo libre).
──────────────────────────────────────────────────────── */
const SISTEMAS_ACCESO = [
  'Epicor','Microsoft 365','Correo','VPN','Power BI',
  'Carpetas compartidas','Odoo',
  'TS1','TS2','TS3',
  'SharePoint','Teams','Azure','GitHub',
  'Jira','SAP','Salesforce','Zoom','Slack','Otro',
];

/* ─── STATE ─────────────────────────────────────────────── */
let CHARTS = {};
let editingId = null;

/* ═══════════════════════════════════════════════════════════
   STORAGE HELPERS
═══════════════════════════════════════════════════════════ */
const load  = key => JSON.parse(localStorage.getItem(KEYS[key]) || '[]');
const save  = (key, data) => localStorage.setItem(KEYS[key], JSON.stringify(data));
const uid   = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const today = () => new Date().toISOString().slice(0, 10);
const now   = () => new Date().toLocaleString('es-AR');

/* ─── Movement logger ────────────────────────────────────── */
function logMov(tipo, modulo, descripcion, referencia = '') {
  const movs = load('movimientos');
  movs.unshift({ id: uid(), fecha: now(), tipo, modulo, descripcion, referencia });
  save('movimientos', movs.slice(0, 500)); // keep last 500
}

/* ═══════════════════════════════════════════════════════════
   MIGRACIÓN AUTOMÁTICA DE DATOS
   Reglas:
   - NUNCA eliminar datos existentes
   - SOLO agregar campos con valor por defecto
   - Detectar versión anterior y actualizar a la actual
   - Idempotente: puede ejecutarse múltiples veces sin daño
═══════════════════════════════════════════════════════════ */
function migrateData() {
  const currentVersion = localStorage.getItem(DATA_VERSION_KEY) || '1.0';

  // ── Migración de v1.0 → v1.1 ──────────────────────────
  if (currentVersion === '1.0') {
    console.log('[CIT] Migrando datos de v1.0 → v1.1…');

    // 1. Inicializar cit_celulares si no existe (módulo nuevo)
    if (!localStorage.getItem(KEYS.celulares)) {
      localStorage.setItem(KEYS.celulares, JSON.stringify([]));
      console.log('[CIT] ✓ cit_celulares inicializado (vacío)');
    }

    // 2. Los accesos existentes son compatibles: el campo "sistema"
    //    sigue siendo texto libre. Los nuevos valores (TS1/TS2/TS3…)
    //    se incorporan solo en el <select> del formulario.
    //    No se toca ningún registro guardado.
    console.log('[CIT] ✓ Accesos: compatibilidad hacia atrás OK (campo texto libre)');

    // 3. Los equipos, toners, usuarios, licencias y movimientos
    //    no requieren cambios estructurales en v1.1.
    console.log('[CIT] ✓ Módulos existentes: sin cambios requeridos');

    // Marcar como migrado
    localStorage.setItem(DATA_VERSION_KEY, DATA_VERSION);
    console.log('[CIT] ✓ Migración v1.0→v1.1 completada');
  }

  // Si ya es v1.1 o superior, no hace nada
  if (currentVersion === DATA_VERSION) return;

  // Asegurar que la clave de versión siempre esté actualizada
  localStorage.setItem(DATA_VERSION_KEY, DATA_VERSION);
}

/* ═══════════════════════════════════════════════════════════
   AUTH
═══════════════════════════════════════════════════════ */
function initAuth() {
  if (sessionStorage.getItem('cit_auth')) showApp();

  document.getElementById('btn-login').addEventListener('click', doLogin);
  ['l-user', 'l-pass'].forEach(id =>
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
═══════════════════════════════════════════════════════ */
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

function refreshPage(page) {
  switch(page) {
    case 'dashboard':   renderDashboard(); break;
    case 'equipos':     renderEquipos(); populateSectorFilter('eq-sector'); break;
    case 'toners':      renderToners(); populateSectorFilter('ton-sector'); break;
    case 'usuarios':    renderUsuarios(); populateSectorFilter('usr-sector'); break;
    case 'licencias':   renderLicencias(); break;
    case 'accesos':     renderAccesos(); break;
    case 'celulares':   renderCelulares(); populateMarcaFilter(); break;
    case 'movimientos': renderMovimientos(); break;
    case 'reportes':    renderReportes(); break;
  }
}

function populateSectorFilter(selId) {
  const sel = document.getElementById(selId);
  if (!sel) return;
  const equipos = load('equipos');
  const sectores = [...new Set(equipos.map(e => e.sector).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">Sector</option>' +
    sectores.map(s => `<option value="${s}">${s}</option>`).join('');
}

function populateMarcaFilter() {
  const sel = document.getElementById('cel-marca');
  if (!sel) return;
  const celulares = load('celulares');
  const marcas = [...new Set(celulares.map(c => c.marca).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">Marca</option>' +
    marcas.map(m => `<option value="${m}">${m}</option>`).join('');
}

/* ═══════════════════════════════════════════════════════════
   DEMO DATA
═══════════════════════════════════════════════════════ */
function loadDemoData(force = false) {
  if (!force && load('equipos').length > 0) return;

  const sectores = ['Administración','Comercial','IT','Producción','RRHH','Contabilidad','Logística'];
  const sucursales = ['Casa Central','Sucursal Norte','Sucursal Sur'];

  const equipos = [
    { id: uid(), tipo: 'Notebook', marca: 'Lenovo', modelo: 'ThinkPad E14', serie: 'LNV2024001', cpu: 'Intel Core i5-1235U', ram: '16 GB', disco: 'SSD 512 GB', so: 'Windows 11 Pro', estado: 'Asignado', usuario: 'Juan Pérez', sector: 'Comercial', sucursal: 'Casa Central', compra: '2023-03-15', garantia: '2026-03-15', obs: '' },
    { id: uid(), tipo: 'Notebook', marca: 'Dell', modelo: 'Latitude 5540', serie: 'DLL2024002', cpu: 'Intel Core i7-1355U', ram: '16 GB', disco: 'SSD 512 GB', so: 'Windows 11 Pro', estado: 'Asignado', usuario: 'María García', sector: 'Administración', sucursal: 'Casa Central', compra: '2024-01-10', garantia: '2027-01-10', obs: '' },
    { id: uid(), tipo: 'Notebook', marca: 'HP', modelo: 'EliteBook 840 G9', serie: 'HP2024003', cpu: 'Intel Core i5-1235U', ram: '8 GB', disco: 'SSD 256 GB', so: 'Windows 10 Pro', estado: 'Disponible', usuario: '', sector: 'IT', sucursal: 'Casa Central', compra: '2022-06-20', garantia: '2025-06-20', obs: '' },
    { id: uid(), tipo: 'Notebook', marca: 'Lenovo', modelo: 'IdeaPad 3', serie: 'LNV2023004', cpu: 'AMD Ryzen 5 5600U', ram: '8 GB', disco: 'SSD 256 GB', so: 'Windows 11 Home', estado: 'Reparación', usuario: '', sector: 'IT', sucursal: 'Casa Central', compra: '2021-09-01', garantia: '2024-09-01', obs: 'Pantalla rota, enviada a servicio técnico' },
    { id: uid(), tipo: 'Desktop', marca: 'HP', modelo: 'ProDesk 400 G7', serie: 'HP2023005', cpu: 'Intel Core i3-10300', ram: '8 GB', disco: 'HDD 1 TB', so: 'Windows 10 Pro', estado: 'Asignado', usuario: 'Carlos López', sector: 'Contabilidad', sucursal: 'Casa Central', compra: '2021-04-12', garantia: '2024-04-12', obs: '' },
    { id: uid(), tipo: 'Desktop', marca: 'Dell', modelo: 'OptiPlex 3090', serie: 'DLL2022006', cpu: 'Intel Core i5-10400', ram: '16 GB', disco: 'SSD 512 GB', so: 'Windows 10 Pro', estado: 'Asignado', usuario: 'Ana Martínez', sector: 'RRHH', sucursal: 'Sucursal Norte', compra: '2022-02-28', garantia: '2025-02-28', obs: '' },
    { id: uid(), tipo: 'Impresora', marca: 'HP', modelo: 'LaserJet M404n', serie: 'HPLJ2023001', cpu: '', ram: '', disco: '', so: '', estado: 'Disponible', usuario: '', sector: 'Administración', sucursal: 'Casa Central', compra: '2023-07-01', garantia: '2026-07-01', obs: 'Impresora de red piso 2' },
    { id: uid(), tipo: 'Impresora', marca: 'Samsung', modelo: 'SL-M3375FD', serie: 'SAM2022002', cpu: '', ram: '', disco: '', so: '', estado: 'Disponible', usuario: '', sector: 'Comercial', sucursal: 'Casa Central', compra: '2020-11-15', garantia: '2023-11-15', obs: 'Garantía vencida' },
    { id: uid(), tipo: 'Notebook', marca: 'Toshiba', modelo: 'Satellite L50', serie: 'TOS2018001', cpu: 'Intel Core i3-5200U', ram: '4 GB', disco: 'HDD 500 GB', so: 'Windows 7', estado: 'Obsoleto', usuario: '', sector: 'IT', sucursal: 'Casa Central', compra: '2018-05-10', garantia: '2021-05-10', obs: 'Sin uso, candidato a baja' },
    { id: uid(), tipo: 'Monitor', marca: 'LG', modelo: '24MK600M-B', serie: 'LGM2023001', cpu: '', ram: '', disco: '', so: '', estado: 'Disponible', usuario: '', sector: 'IT', sucursal: 'Casa Central', compra: '2023-01-15', garantia: '2026-01-15', obs: '' },
    { id: uid(), tipo: 'Notebook', marca: 'Dell', modelo: 'Vostro 15 3510', serie: 'DLL2024010', cpu: 'Intel Core i5-1135G7', ram: '8 GB', disco: 'SSD 256 GB', so: 'Windows 11 Pro', estado: 'Asignado', usuario: 'Roberto Silva', sector: 'Logística', sucursal: 'Sucursal Sur', compra: '2024-02-01', garantia: '2027-02-01', obs: '' },
    { id: uid(), tipo: 'Notebook', marca: 'HP', modelo: 'ProBook 450 G9', serie: 'HP2023011', cpu: 'Intel Core i7-1255U', ram: '16 GB', disco: 'SSD 512 GB', so: 'Windows 11 Pro', estado: 'Disponible', usuario: '', sector: 'IT', sucursal: 'Casa Central', compra: '2023-08-20', garantia: '2026-08-20', obs: '' },
  ];

  const toners = [
    { id: uid(), codigo: 'TNR-HP-83A', marca: 'HP', modelo: 'CF283A (83A)', impresora: 'HP LaserJet M225/M201', sector: 'Administración', stock: 2, minimo: 3, proveedor: 'Proveedor Tech SA', ultima: '2024-03-01', costo: 8500, obs: '⚠ Stock crítico' },
    { id: uid(), codigo: 'TNR-HP-05A', marca: 'HP', modelo: 'CE505A (05A)', impresora: 'HP LaserJet P2035/P2055', sector: 'Comercial', stock: 5, minimo: 2, proveedor: 'Suministros Norte SRL', ultima: '2024-04-15', costo: 11200, obs: '' },
    { id: uid(), codigo: 'TNR-SAM-D101', marca: 'Samsung', modelo: 'MLT-D101S', impresora: 'Samsung ML-2165/SCX-3405', sector: 'Comercial', stock: 1, minimo: 2, proveedor: 'Proveedor Tech SA', ultima: '2024-02-20', costo: 7300, obs: '⚠ Stock crítico' },
    { id: uid(), codigo: 'TNR-HP-M404', marca: 'HP', modelo: 'CF259A (59A)', impresora: 'HP LaserJet M404/M428', sector: 'Administración', stock: 4, minimo: 2, proveedor: 'Suministros Norte SRL', ultima: '2024-05-01', costo: 14500, obs: '' },
    { id: uid(), codigo: 'TNR-BRO-TN1060', marca: 'Brother', modelo: 'TN-1060', impresora: 'Brother HL-1112/DCP-1512', sector: 'RRHH', stock: 3, minimo: 1, proveedor: 'Proveedor Tech SA', ultima: '2024-01-10', costo: 6800, obs: '' },
    { id: uid(), codigo: 'TNR-SAM-D111S', marca: 'Samsung', modelo: 'MLT-D111S', impresora: 'Samsung SL-M2020/M2070', sector: 'Contabilidad', stock: 0, minimo: 2, proveedor: 'Suministros Norte SRL', ultima: '2023-12-01', costo: 7900, obs: '⚠ Sin stock' },
  ];

  const usuarios = [
    { id: uid(), nombre: 'Juan Pérez', usuarioRed: 'jperez', email: 'jperez@cladan.com', sector: 'Comercial', puesto: 'Vendedor Senior', sucursal: 'Casa Central', responsable: 'Diego Ramírez', estado: 'Activo', ingreso: '2020-03-01', baja: '', equipo: 'LNV2024001', licencias: 'Microsoft 365, Epicor', accesos: 'Epicor, Microsoft 365, VPN', obs: '' },
    { id: uid(), nombre: 'María García', usuarioRed: 'mgarcia', email: 'mgarcia@cladan.com', sector: 'Administración', puesto: 'Asistente Administrativa', sucursal: 'Casa Central', responsable: 'Laura Torres', estado: 'Activo', ingreso: '2019-07-15', baja: '', equipo: 'DLL2024002', licencias: 'Microsoft 365', accesos: 'Microsoft 365, Correo', obs: '' },
    { id: uid(), nombre: 'Carlos López', usuarioRed: 'clopez', email: 'clopez@cladan.com', sector: 'Contabilidad', puesto: 'Contador', sucursal: 'Casa Central', responsable: 'Claudia Vera', estado: 'Activo', ingreso: '2018-01-10', baja: '', equipo: 'HP2023005', licencias: 'Microsoft 365, Power BI', accesos: 'Microsoft 365, Power BI, Correo', obs: '' },
    { id: uid(), nombre: 'Ana Martínez', usuarioRed: 'amartinez', email: 'amartinez@cladan.com', sector: 'RRHH', puesto: 'Analista RRHH', sucursal: 'Sucursal Norte', responsable: 'Patricia Méndez', estado: 'Activo', ingreso: '2021-05-20', baja: '', equipo: 'DLL2022006', licencias: 'Microsoft 365', accesos: 'Microsoft 365, Carpetas compartidas', obs: '' },
    { id: uid(), nombre: 'Roberto Silva', usuarioRed: 'rsilva', email: 'rsilva@cladan.com', sector: 'Logística', puesto: 'Coordinador', sucursal: 'Sucursal Sur', responsable: 'Miguel Gómez', estado: 'Activo', ingreso: '2022-09-01', baja: '', equipo: 'DLL2024010', licencias: 'Microsoft 365, Odoo', accesos: 'Microsoft 365, Odoo, VPN', obs: '' },
    { id: uid(), nombre: 'Laura Torres', usuarioRed: 'ltorres', email: 'ltorres@cladan.com', sector: 'Administración', puesto: 'Jefa Administrativa', sucursal: 'Casa Central', responsable: 'Directorio', estado: 'Activo', ingreso: '2015-03-01', baja: '', equipo: '', licencias: 'Microsoft 365', accesos: 'Microsoft 365, Correo, Carpetas compartidas', obs: 'Sin equipo asignado' },
    { id: uid(), nombre: 'Pablo Rodríguez', usuarioRed: 'prodriguez', email: 'prodriguez@cladan.com', sector: 'IT', puesto: 'Técnico IT', sucursal: 'Casa Central', responsable: 'Jefe IT', estado: 'Baja', ingreso: '2020-06-15', baja: '2024-02-28', equipo: '', licencias: '', accesos: '', obs: 'Desvinculado' },
  ];

  const licencias = [
    { id: uid(), software: 'Microsoft 365 Business Standard', tipo: 'Suscripción anual', total: 10, asignadas: 8, vencimiento: '2025-01-31', proveedor: 'Microsoft', costo: 285000, obs: 'Renovar antes de enero 2025' },
    { id: uid(), software: 'Epicor ERP', tipo: 'Licencia perpetua + mantenimiento', total: 5, asignadas: 3, vencimiento: '2025-06-30', proveedor: 'Epicor Software', costo: 1200000, obs: '' },
    { id: uid(), software: 'Power BI Pro', tipo: 'Suscripción mensual', total: 3, asignadas: 2, vencimiento: '2025-03-31', proveedor: 'Microsoft', costo: 45000, obs: '' },
    { id: uid(), software: 'Odoo Community', tipo: 'Open Source', total: 0, asignadas: 2, vencimiento: '', proveedor: 'Odoo SA', costo: 0, obs: 'Sin costo de licencia' },
    { id: uid(), software: 'Adobe Acrobat Pro', tipo: 'Suscripción anual', total: 2, asignadas: 1, vencimiento: '2024-12-15', proveedor: 'Adobe', costo: 95000, obs: '⚠ Vence pronto' },
    { id: uid(), software: 'AutoCAD LT', tipo: 'Licencia perpetua', total: 1, asignadas: 0, vencimiento: '', proveedor: 'Autodesk', costo: 480000, obs: 'Sin uso actualmente' },
  ];

  const accesos = [
    { id: uid(), usuario: 'jperez', sistema: 'Epicor', perfil: 'Ventas', alta: '2020-03-01', baja: '', autorizante: 'Diego Ramírez', estado: 'Activo', obs: '' },
    { id: uid(), usuario: 'jperez', sistema: 'Microsoft 365', perfil: 'Usuario estándar', alta: '2020-03-01', baja: '', autorizante: 'IT', estado: 'Activo', obs: '' },
    { id: uid(), usuario: 'mgarcia', sistema: 'Microsoft 365', perfil: 'Usuario estándar', alta: '2019-07-15', baja: '', autorizante: 'IT', estado: 'Activo', obs: '' },
    { id: uid(), usuario: 'mgarcia', sistema: 'Correo', perfil: 'mgarcia@cladan.com', alta: '2019-07-15', baja: '', autorizante: 'IT', estado: 'Activo', obs: '' },
    { id: uid(), usuario: 'clopez', sistema: 'Power BI', perfil: 'Viewer', alta: '2021-01-10', baja: '', autorizante: 'Laura Torres', estado: 'Activo', obs: '' },
    { id: uid(), usuario: 'rsilva', sistema: 'VPN', perfil: 'Acceso completo', alta: '2022-09-01', baja: '', autorizante: 'Jefe IT', estado: 'Activo', obs: '' },
    { id: uid(), usuario: 'rsilva', sistema: 'Odoo', perfil: 'Logística', alta: '2022-09-01', baja: '', autorizante: 'Miguel Gómez', estado: 'Activo', obs: '' },
    { id: uid(), usuario: 'prodriguez', sistema: 'Microsoft 365', perfil: 'Usuario estándar', alta: '2020-06-15', baja: '2024-02-28', autorizante: 'IT', estado: 'Inactivo', obs: 'Baja por desvinculación' },
    { id: uid(), usuario: 'prodriguez', sistema: 'VPN', perfil: 'Acceso completo', alta: '2020-06-15', baja: '2024-02-28', autorizante: 'Jefe IT', estado: 'Inactivo', obs: 'Baja por desvinculación' },
  ];

  // seed movimientos
  const movs = [
    { id: uid(), fecha: '15/01/2024 09:00:00', tipo: 'Equipo', modulo: 'Equipos', descripcion: 'Alta de equipo Lenovo ThinkPad E14', referencia: 'LNV2024001' },
    { id: uid(), fecha: '15/01/2024 09:05:00', tipo: 'Equipo', modulo: 'Equipos', descripcion: 'Asignación de equipo a Juan Pérez', referencia: 'LNV2024001' },
    { id: uid(), fecha: '10/01/2024 10:00:00', tipo: 'Equipo', modulo: 'Equipos', descripcion: 'Alta de equipo Dell Latitude 5540', referencia: 'DLL2024002' },
    { id: uid(), fecha: '10/01/2024 10:05:00', tipo: 'Equipo', modulo: 'Equipos', descripcion: 'Asignación de equipo a María García', referencia: 'DLL2024002' },
    { id: uid(), fecha: '01/03/2024 11:00:00', tipo: 'Toner', modulo: 'Toners', descripcion: 'Entrada de stock: HP CF283A (+3 unidades)', referencia: 'TNR-HP-83A' },
    { id: uid(), fecha: '28/02/2024 14:30:00', tipo: 'Usuario', modulo: 'Usuarios', descripcion: 'Baja de usuario Pablo Rodríguez', referencia: 'prodriguez' },
    { id: uid(), fecha: '28/02/2024 14:35:00', tipo: 'Acceso', modulo: 'Accesos', descripcion: 'Baja de acceso VPN usuario prodriguez', referencia: 'prodriguez' },
    { id: uid(), fecha: '01/02/2024 09:00:00', tipo: 'Equipo', modulo: 'Equipos', descripcion: 'Alta de equipo Dell Vostro 15 3510', referencia: 'DLL2024010' },
    { id: uid(), fecha: '01/04/2024 16:00:00', tipo: 'Toner', modulo: 'Toners', descripcion: 'Salida de stock: Samsung MLT-D101S (-1 unidad)', referencia: 'TNR-SAM-D101' },
    { id: uid(), fecha: '15/05/2024 08:45:00', tipo: 'Licencia', modulo: 'Licencias', descripcion: 'Asignación licencia Power BI Pro a clopez', referencia: 'Power BI Pro' },
  ];

  save('equipos', equipos);
  save('toners', toners);
  save('usuarios', usuarios);
  save('licencias', licencias);
  save('accesos', accesos);
  save('movimientos', movs);

  // ── Celulares demo (v1.1) ──
  const celulares = [
    { id: uid(), marca: 'Samsung', modelo: 'Galaxy A54', imei: '352099001234561', nroLinea: '11-5001-0001', operadora: 'Personal', estado: 'Asignado', usuario: 'Juan Pérez', sector: 'Comercial', sucursal: 'Casa Central', compra: '2023-05-10', garantia: '2025-05-10', obs: '' },
    { id: uid(), marca: 'iPhone', modelo: 'iPhone 14', imei: '353490011234562', nroLinea: '11-5001-0002', operadora: 'Claro', estado: 'Asignado', usuario: 'Laura Torres', sector: 'Administración', sucursal: 'Casa Central', compra: '2023-03-01', garantia: '2025-03-01', obs: '' },
    { id: uid(), marca: 'Motorola', modelo: 'Moto G82', imei: '357849051234563', nroLinea: '11-5001-0003', operadora: 'Movistar', estado: 'Disponible', usuario: '', sector: 'IT', sucursal: 'Casa Central', compra: '2022-11-20', garantia: '2024-11-20', obs: 'Sin asignar' },
    { id: uid(), marca: 'Samsung', modelo: 'Galaxy A34', imei: '352099001234564', nroLinea: '11-5001-0004', operadora: 'Personal', estado: 'Asignado', usuario: 'Roberto Silva', sector: 'Logística', sucursal: 'Sucursal Sur', compra: '2024-01-15', garantia: '2026-01-15', obs: '' },
    { id: uid(), marca: 'iPhone', modelo: 'iPhone 13', imei: '353490011234565', nroLinea: '', operadora: '', estado: 'Baja', usuario: '', sector: 'IT', sucursal: 'Casa Central', compra: '2021-09-10', garantia: '2023-09-10', obs: 'Pantalla rota, dado de baja' },
  ];
  save('celulares', celulares);

  // Marcar versión de datos
  localStorage.setItem(DATA_VERSION_KEY, DATA_VERSION);

  toast('Datos demo cargados correctamente', 'success');
}

/* ═══════════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════ */
function renderDashboard() {
  const equipos   = load('equipos');
  const toners    = load('toners');
  const usuarios  = load('usuarios');
  const licencias = load('licencias');
  const accesos   = load('accesos');
  const movs      = load('movimientos');
  const celulares = load('celulares');

  // Date
  document.getElementById('dash-date').textContent =
    new Date().toLocaleDateString('es-AR', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  // ── Alerts ──────────────────────────────────────
  const alertsCont = document.getElementById('alerts-container');
  const alerts = [];

  toners.filter(t => t.stock <= t.minimo).forEach(t =>
    alerts.push({ level: 'high', icon: '🖨', msg: `Toner <strong>${t.codigo}</strong> con stock crítico: ${t.stock} unidades (mínimo: ${t.minimo})` })
  );

  const notebooksDisp = equipos.filter(e => e.tipo === 'Notebook' && e.estado === 'Disponible').length;
  if (notebooksDisp < 2) alerts.push({ level: 'medium', icon: '💻', msg: `Solo <strong>${notebooksDisp}</strong> notebook(s) disponibles para asignación.` });

  usuarios.filter(u => u.estado === 'Activo' && !u.equipo).forEach(u =>
    alerts.push({ level: 'medium', icon: '👤', msg: `Usuario <strong>${u.nombre}</strong> (${u.sector}) activo sin equipo asignado.` })
  );

  equipos.filter(e => e.estado === 'Asignado').forEach(eq => {
    const usr = usuarios.find(u => u.usuarioRed === eq.usuario || u.nombre === eq.usuario);
    if (usr && usr.estado === 'Baja') {
      alerts.push({ level: 'high', icon: '⚠', msg: `Equipo <strong>${eq.serie}</strong> asignado a <strong>${eq.usuario}</strong> que está dado de baja.` });
    }
  });

  licencias.forEach(l => {
    if (l.vencimiento) {
      const diasRestantes = Math.ceil((new Date(l.vencimiento) - new Date()) / 86400000);
      if (diasRestantes <= 90 && diasRestantes > 0)
        alerts.push({ level: 'medium', icon: '🔑', msg: `Licencia <strong>${l.software}</strong> vence en ${diasRestantes} días (${l.vencimiento}).` });
      if (diasRestantes <= 0)
        alerts.push({ level: 'high', icon: '🔑', msg: `Licencia <strong>${l.software}</strong> VENCIDA (${l.vencimiento}).` });
    }
    if (l.total > 0 && l.asignadas >= l.total)
      alerts.push({ level: 'medium', icon: '🔑', msg: `Licencia <strong>${l.software}</strong> sin disponibilidad (${l.asignadas}/${l.total} asignadas).` });
  });

  equipos.filter(e => !e.serie).forEach(e =>
    alerts.push({ level: 'low', icon: '💻', msg: `Equipo <strong>${e.marca} ${e.modelo}</strong> sin número de serie registrado.` })
  );

  const usuariosDataBaja = usuarios.filter(u => u.estado === 'Baja');
  accesos.filter(a => a.estado === 'Activo').forEach(a => {
    if (usuariosDataBaja.find(u => u.usuarioRed === a.usuario))
      alerts.push({ level: 'high', icon: '🔐', msg: `Acceso activo a <strong>${a.sistema}</strong> para usuario <strong>${a.usuario}</strong> que está dado de baja.` });
  });

  alertsCont.innerHTML = alerts.slice(0, 8).map(a =>
    `<div class="alert-item alert-${a.level}"><span class="alert-icon">${a.icon}</span><span>${a.msg}</span></div>`
  ).join('');

  // ── KPIs ──────────────────────────────────────
  const kpiData = [
    { lbl: 'Total equipos',          val: equipos.filter(e=>e.estado!=='Baja').length, sub: 'activos en inventario', clr: '#2563eb', icon: '💻' },
    { lbl: 'Notebooks disponibles',  val: equipos.filter(e=>e.tipo==='Notebook'&&e.estado==='Disponible').length, sub: 'listas para asignar', clr: '#10b981', icon: '✓' },
    { lbl: 'Notebooks asignadas',    val: equipos.filter(e=>e.tipo==='Notebook'&&e.estado==='Asignado').length, sub: 'en uso', clr: '#0ea5e9', icon: '👤' },
    { lbl: 'En reparación',          val: equipos.filter(e=>e.estado==='Reparación').length, sub: 'fuera de servicio', clr: '#f59e0b', icon: '🔧' },
    { lbl: 'Toners stock crítico',   val: toners.filter(t=>t.stock<=t.minimo).length, sub: 'bajo mínimo', clr: '#ef4444', icon: '⚠' },
    { lbl: 'Usuarios activos',       val: usuarios.filter(u=>u.estado==='Activo').length, sub: 'en plantilla', clr: '#10b981', icon: '👥' },
    { lbl: 'Usuarios dados de baja', val: usuarios.filter(u=>u.estado==='Baja').length, sub: 'desvinculados', clr: '#94a3b8', icon: '↓' },
    { lbl: 'Licencias asignadas',    val: licencias.reduce((s,l)=>s+l.asignadas,0), sub: 'total asignaciones', clr: '#8b5cf6', icon: '🔑' },
    { lbl: 'Accesos activos',        val: accesos.filter(a=>a.estado==='Activo').length, sub: 'habilitados', clr: '#0ea5e9', icon: '🔐' },
    { lbl: 'Celulares asignados',    val: celulares.filter(c=>c.estado==='Asignado').length, sub: `de ${celulares.filter(c=>c.estado!=='Baja').length} en inventario`, clr: '#ec4899', icon: '📱' },
    { lbl: 'Equipos obsoletos',      val: equipos.filter(e=>e.estado==='Obsoleto').length, sub: 'a revisar', clr: '#64748b', icon: '📦' },
  ];

  document.getElementById('kpi-grid').innerHTML = kpiData.map(k => `
    <div class="kpi-card" style="--kpi-clr:${k.clr}">
      <div class="kpi-icon">${k.icon}</div>
      <div class="kpi-lbl">${k.lbl}</div>
      <div class="kpi-val">${k.val}</div>
      <div class="kpi-sub">${k.sub}</div>
    </div>`).join('');

  // ── Charts ──────────────────────────────────────
  const CGRID = '#1e2f47'; const CTEXT = '#94a3b8';
  const chartDefaults = { color: CTEXT, gridColor: CGRID };

  const destroyChart = id => { if (CHARTS[id]) { CHARTS[id].destroy(); delete CHARTS[id]; } };

  // Equipos por estado
  destroyChart('c-estados');
  const estadoMap = {};
  equipos.filter(e=>e.estado!=='Baja').forEach(e => { estadoMap[e.estado] = (estadoMap[e.estado]||0)+1; });
  CHARTS['c-estados'] = new Chart(document.getElementById('c-estados'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(estadoMap),
      datasets: [{ data: Object.values(estadoMap),
        backgroundColor: ['#10b981','#2563eb','#f59e0b','#94a3b8','#ef4444'],
        borderColor: '#111e30', borderWidth: 2 }]
    },
    options: doughnutOpts(chartDefaults)
  });

  // Equipos por sector
  destroyChart('c-sectores');
  const sectorMap = {};
  equipos.filter(e=>e.sector&&e.estado!=='Baja').forEach(e => { sectorMap[e.sector] = (sectorMap[e.sector]||0)+1; });
  CHARTS['c-sectores'] = new Chart(document.getElementById('c-sectores'), {
    type: 'bar',
    data: {
      labels: Object.keys(sectorMap),
      datasets: [{ data: Object.values(sectorMap), backgroundColor: '#2563eb', borderRadius: 4 }]
    },
    options: barOpts(chartDefaults)
  });

  // Stock toners
  destroyChart('c-toners');
  CHARTS['c-toners'] = new Chart(document.getElementById('c-toners'), {
    type: 'bar',
    data: {
      labels: toners.map(t => t.codigo),
      datasets: [
        { label: 'Stock', data: toners.map(t=>t.stock), backgroundColor: toners.map(t=>t.stock<=t.minimo?'#ef4444':'#10b981'), borderRadius: 4 },
        { label: 'Mínimo', data: toners.map(t=>t.minimo), backgroundColor: 'rgba(245,158,11,.4)', borderRadius: 4 },
      ]
    },
    options: { ...barOpts(chartDefaults), plugins: { legend: { display: true, labels: { color: CTEXT, font:{size:11} } } } }
  });

  // Licencias
  destroyChart('c-licencias');
  const licLabels = licencias.map(l => l.software.substring(0,18));
  CHARTS['c-licencias'] = new Chart(document.getElementById('c-licencias'), {
    type: 'bar',
    data: {
      labels: licLabels,
      datasets: [
        { label: 'Asignadas', data: licencias.map(l=>l.asignadas), backgroundColor: '#2563eb', borderRadius: 4 },
        { label: 'Total', data: licencias.map(l=>l.total), backgroundColor: 'rgba(14,165,233,.3)', borderRadius: 4 },
      ]
    },
    options: { ...barOpts(chartDefaults), plugins: { legend: { display: true, labels: { color: CTEXT, font:{size:11} } } } }
  });

  // Usuarios por sector
  destroyChart('c-usuarios-sector');
  const usrSector = {};
  usuarios.filter(u=>u.estado==='Activo').forEach(u => { usrSector[u.sector] = (usrSector[u.sector]||0)+1; });
  CHARTS['c-usuarios-sector'] = new Chart(document.getElementById('c-usuarios-sector'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(usrSector),
      datasets: [{ data: Object.values(usrSector),
        backgroundColor: ['#2563eb','#0ea5e9','#10b981','#8b5cf6','#f59e0b','#ef4444','#ec4899'],
        borderColor: '#111e30', borderWidth: 2 }]
    },
    options: doughnutOpts(chartDefaults)
  });

  // Movimientos mensuales
  destroyChart('c-movimientos');
  const movMes = {};
  movs.forEach(m => {
    try {
      const parts = m.fecha.split(' ')[0].split('/');
      const key = `${parts[1]}/${parts[2]}`;
      movMes[key] = (movMes[key]||0)+1;
    } catch {}
  });
  const movKeys = Object.keys(movMes).sort();
  CHARTS['c-movimientos'] = new Chart(document.getElementById('c-movimientos'), {
    type: 'line',
    data: {
      labels: movKeys,
      datasets: [{ label: 'Movimientos', data: movKeys.map(k=>movMes[k]),
        borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,.1)',
        tension: .3, fill: true, borderWidth: 2, pointRadius: 3 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: { grid:{color:CGRID}, ticks:{color:CTEXT,font:{size:10}} },
        y: { grid:{color:CGRID}, ticks:{color:CTEXT,font:{size:10}} },
      },
      plugins: { legend:{display:false} }
    }
  });
}

function doughnutOpts(d) {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position:'bottom', labels: { color:d.color, font:{size:11}, padding:10 } } }
  };
}
function barOpts(d) {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display:false } },
    scales: {
      x: { grid:{color:d.gridColor}, ticks:{color:d.color,font:{size:10}} },
      y: { grid:{color:d.gridColor}, ticks:{color:d.color,font:{size:10}} }
    }
  };
}

/* ═══════════════════════════════════════════════════════════
   EQUIPOS
═══════════════════════════════════════════════════════ */
function renderEquipos() {
  const all = load('equipos');
  const search = (document.getElementById('eq-search')?.value || '').toLowerCase();
  const fTipo   = document.getElementById('eq-tipo')?.value   || '';
  const fEstado = document.getElementById('eq-estado')?.value || '';
  const fSector = document.getElementById('eq-sector')?.value || '';

  const data = all.filter(e => {
    if (e.estado === 'Baja' && fEstado !== 'Baja') return false;
    if (fTipo   && e.tipo   !== fTipo)   return false;
    if (fEstado && e.estado !== fEstado) return false;
    if (fSector && e.sector !== fSector) return false;
    if (search) {
      const row = [e.marca,e.modelo,e.serie,e.usuario,e.sector,e.obs].join(' ').toLowerCase();
      if (!row.includes(search)) return false;
    }
    return true;
  });

  if (!data.length) {
    document.getElementById('equipos-table').innerHTML =
      '<div class="table-empty">Sin resultados para los filtros aplicados.</div>';
    return;
  }

  document.getElementById('equipos-table').innerHTML = `<table>
    <thead><tr>
      <th>Serie</th><th>Tipo</th><th>Marca / Modelo</th><th>CPU / RAM</th>
      <th>SO</th><th>Estado</th><th>Sector</th><th>Usuario</th><th>Garantía</th><th>Acciones</th>
    </tr></thead>
    <tbody>${data.map(e => {
      const gvenc = e.garantia && new Date(e.garantia) < new Date();
      return `<tr class="${e.estado==='Obsoleto'?'row-critical':gvenc?'row-warn':''}">
        <td>${e.serie||'<span class="badge b-red">Sin serie</span>'}</td>
        <td>${e.tipo}</td>
        <td><strong>${e.marca}</strong> ${e.modelo}</td>
        <td><span style="font-size:11px">${e.cpu?e.cpu+' · ':''} ${e.ram||'—'}</span></td>
        <td>${e.so||'—'}</td>
        <td>${estadoBadge(e.estado)}</td>
        <td>${e.sector||'—'}</td>
        <td>${e.usuario||'—'}</td>
        <td>${gvenc?'<span class="badge b-red">Vencida</span>':(e.garantia||'—')}</td>
        <td><div class="tbl-actions">
          <button class="btn-ghost btn-sm" onclick="openModal('equipo','${e.id}')">✏</button>
          <button class="btn-ghost btn-sm" style="color:var(--red)" onclick="deleteItem('equipos','${e.id}')">🗑</button>
        </div></td>
      </tr>`;}).join('')}
    </tbody></table>`;
}

function estadoBadge(s) {
  const m = { Disponible:'b-green', Asignado:'b-blue', Reparación:'b-amber', Obsoleto:'b-red', Baja:'b-gray', Activo:'b-green', Inactivo:'b-gray', Licencia:'b-amber' };
  return `<span class="badge ${m[s]||'b-gray'}">${s}</span>`;
}

/* ═══════════════════════════════════════════════════════════
   TONERS
═══════════════════════════════════════════════════════ */
function renderToners() {
  let data = load('toners');
  const search = (document.getElementById('ton-search')?.value || '').toLowerCase();
  const fSector  = document.getElementById('ton-sector')?.value  || '';
  const critico  = document.getElementById('ton-critico')?.checked;

  if (fSector) data = data.filter(t => t.sector === fSector);
  if (critico) data = data.filter(t => t.stock <= t.minimo);
  if (search)  data = data.filter(t => [t.codigo,t.marca,t.modelo,t.impresora,t.sector].join(' ').toLowerCase().includes(search));

  if (!data.length) {
    document.getElementById('toners-table').innerHTML = '<div class="table-empty">Sin resultados.</div>';
    return;
  }

  document.getElementById('toners-table').innerHTML = `<table>
    <thead><tr>
      <th>Código</th><th>Marca / Modelo</th><th>Impresora</th><th>Sector</th>
      <th>Stock</th><th>Proveedor</th><th>Costo</th><th>Acciones</th>
    </tr></thead>
    <tbody>${data.map(t => {
      const pct = t.minimo > 0 ? Math.min(100, Math.round(t.stock / (t.minimo * 2) * 100)) : 50;
      const clr = t.stock === 0 ? '#ef4444' : t.stock <= t.minimo ? '#f59e0b' : '#10b981';
      return `<tr class="${t.stock===0?'row-critical':t.stock<=t.minimo?'row-warn':''}">
        <td><strong>${t.codigo}</strong></td>
        <td>${t.marca} ${t.modelo}</td>
        <td style="font-size:11px">${t.impresora}</td>
        <td>${t.sector}</td>
        <td>
          <div class="stock-bar-wrap">
            <div class="stock-bar"><div class="stock-bar-fill" style="width:${pct}%;background:${clr}"></div></div>
            <span class="stock-num" style="color:${clr}">${t.stock}</span>
          </div>
        </td>
        <td>${t.proveedor||'—'}</td>
        <td>$${Number(t.costo||0).toLocaleString('es-AR')}</td>
        <td><div class="tbl-actions">
          <button class="btn-ghost btn-sm" onclick="openStockModal('${t.id}','in')">＋</button>
          <button class="btn-ghost btn-sm" onclick="openStockModal('${t.id}','out')">－</button>
          <button class="btn-ghost btn-sm" onclick="openModal('toner','${t.id}')">✏</button>
          <button class="btn-ghost btn-sm" style="color:var(--red)" onclick="deleteItem('toners','${t.id}')">🗑</button>
        </div></td>
      </tr>`;}).join('')}
    </tbody></table>`;
}

function openStockModal(id, dir) {
  const toners = load('toners');
  const t = toners.find(x => x.id === id);
  if (!t) return;
  const label = dir === 'in' ? 'Entrada de stock' : 'Salida de stock';
  const icon  = dir === 'in' ? '＋' : '－';
  document.getElementById('modal-title').textContent = `${icon} ${label} · ${t.codigo}`;
  document.getElementById('modal-body').innerHTML = `
    <p style="color:var(--text2);margin-bottom:14px">Stock actual: <strong>${t.stock}</strong> unidades</p>
    <div class="form-group">
      <label>Cantidad</label>
      <input id="stock-qty" type="number" min="1" value="1" class="form-input" />
    </div>
    <div class="form-group">
      <label>Observación</label>
      <input id="stock-obs" type="text" class="form-input" placeholder="Motivo, proveedor, etc." />
    </div>
    <div class="form-actions">
      <button class="btn-outline" onclick="closeModal()">Cancelar</button>
      <button class="btn-primary" onclick="applyStock('${id}','${dir}')">Confirmar</button>
    </div>`;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function applyStock(id, dir) {
  const qty = parseInt(document.getElementById('stock-qty').value) || 0;
  const obs = document.getElementById('stock-obs').value;
  if (qty <= 0) { toast('Ingresá una cantidad válida', 'error'); return; }

  const toners = load('toners');
  const idx = toners.findIndex(x => x.id === id);
  if (idx < 0) return;

  if (dir === 'out' && toners[idx].stock < qty) {
    toast('Stock insuficiente', 'error'); return;
  }

  toners[idx].stock = dir === 'in' ? toners[idx].stock + qty : toners[idx].stock - qty;
  save('toners', toners);
  logMov('Toner', 'Toners', `${dir==='in'?'Entrada':'Salida'} de stock: ${toners[idx].codigo} (${dir==='in'?'+':'-'}${qty})${obs?' · '+obs:''}`, toners[idx].codigo);
  closeModal();
  renderToners();
  toast(`Stock actualizado: ${toners[idx].stock} unidades`, 'success');
}

/* ═══════════════════════════════════════════════════════════
   USUARIOS
═══════════════════════════════════════════════════════ */
function renderUsuarios() {
  let data = load('usuarios');
  const search = (document.getElementById('usr-search')?.value || '').toLowerCase();
  const fEstado = document.getElementById('usr-estado')?.value || '';
  const fSector = document.getElementById('usr-sector')?.value || '';

  if (fEstado) data = data.filter(u => u.estado === fEstado);
  if (fSector) data = data.filter(u => u.sector === fSector);
  if (search)  data = data.filter(u => [u.nombre,u.usuarioRed,u.email,u.sector,u.puesto].join(' ').toLowerCase().includes(search));

  if (!data.length) {
    document.getElementById('usuarios-table').innerHTML = '<div class="table-empty">Sin resultados.</div>';
    return;
  }

  document.getElementById('usuarios-table').innerHTML = `<table>
    <thead><tr>
      <th>Nombre</th><th>Usuario red</th><th>Sector / Puesto</th><th>Sucursal</th>
      <th>Estado</th><th>Equipo</th><th>Ingreso</th><th>Acciones</th>
    </tr></thead>
    <tbody>${data.map(u => `<tr>
      <td><strong>${u.nombre}</strong><br><span style="font-size:11px;color:var(--text2)">${u.email}</span></td>
      <td><span class="badge b-cyan">${u.usuarioRed}</span></td>
      <td>${u.sector}<br><span style="font-size:11px;color:var(--text2)">${u.puesto}</span></td>
      <td>${u.sucursal||'—'}</td>
      <td>${estadoBadge(u.estado)}</td>
      <td>${u.equipo?`<span class="badge b-blue">${u.equipo}</span>`:'<span class="badge b-gray">Sin equipo</span>'}</td>
      <td>${u.ingreso||'—'}</td>
      <td><div class="tbl-actions">
        <button class="btn-ghost btn-sm" onclick="openChecklist('${u.id}','alta')">✓ Alta</button>
        <button class="btn-ghost btn-sm" onclick="openChecklist('${u.id}','baja')">✗ Baja</button>
        <button class="btn-ghost btn-sm" onclick="openModal('usuario','${u.id}')">✏</button>
        <button class="btn-ghost btn-sm" style="color:var(--red)" onclick="deleteItem('usuarios','${u.id}')">🗑</button>
      </div></td>
    </tr>`).join('')}
    </tbody></table>`;
}

function openChecklist(userId, type) {
  const u = load('usuarios').find(x => x.id === userId);
  if (!u) return;
  const alta = type === 'alta';
  const items = alta
    ? ['Crear usuario de red en Active Directory', 'Configurar email corporativo', 'Instalar y configurar equipo', 'Asignar licencias de software', 'Habilitar accesos a sistemas', 'Agregar a grupos y carpetas compartidas', 'Configurar VPN si corresponde', 'Entregar credenciales y documentación', 'Registrar equipo asignado en inventario', 'Notificar al responsable de área']
    : ['Revocar acceso Active Directory', 'Deshabilitar email corporativo', 'Revocar VPN y accesos a sistemas', 'Recuperar equipo asignado', 'Dar de baja licencias asignadas', 'Remover de grupos y carpetas', 'Hacer backup de datos del usuario', 'Actualizar inventario (estado equipo)', 'Notificar a RRHH y responsable', 'Documentar motivo de baja'];

  document.getElementById('modal-title').textContent = `${alta?'✓ Checklist Alta':'✗ Checklist Baja'} · ${u.nombre}`;
  document.getElementById('modal-body').innerHTML = `
    <div class="checklist" id="checklist-items">
      ${items.map((item,i) => `
        <label class="check-item" id="ci-${i}" onclick="toggleCheckItem(${i})">
          <input type="checkbox" /> ${item}
        </label>`).join('')}
    </div>
    <div style="margin-top:14px; color:var(--text2); font-size:12px">
      Marcá cada paso completado como registro del proceso.
    </div>
    <div class="form-actions">
      <button class="btn-outline" onclick="closeModal()">Cerrar</button>
    </div>`;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function toggleCheckItem(i) {
  const el = document.getElementById(`ci-${i}`);
  el.classList.toggle('checked');
}

/* ═══════════════════════════════════════════════════════════
   LICENCIAS
═══════════════════════════════════════════════════════ */
function renderLicencias() {
  let data = load('licencias');
  const search = (document.getElementById('lic-search')?.value || '').toLowerCase();
  if (search) data = data.filter(l => [l.software,l.tipo,l.proveedor,l.obs].join(' ').toLowerCase().includes(search));

  document.getElementById('licencias-table').innerHTML = !data.length
    ? '<div class="table-empty">Sin licencias registradas.</div>'
    : `<table>
    <thead><tr>
      <th>Software</th><th>Tipo</th><th>Total</th><th>Asignadas</th><th>Disponibles</th>
      <th>Vencimiento</th><th>Proveedor</th><th>Costo</th><th>Acciones</th>
    </tr></thead>
    <tbody>${data.map(l => {
      const dispon = l.total - l.asignadas;
      const diasRestantes = l.vencimiento ? Math.ceil((new Date(l.vencimiento)-new Date())/86400000) : null;
      const vencAlert = diasRestantes !== null && diasRestantes <= 90;
      return `<tr class="${vencAlert?'row-warn':''}">
        <td><strong>${l.software}</strong></td>
        <td>${l.tipo}</td>
        <td>${l.total||'∞'}</td>
        <td><span class="badge ${l.asignadas>=l.total&&l.total>0?'b-red':'b-blue'}">${l.asignadas}</span></td>
        <td><span class="badge ${dispon<=0&&l.total>0?'b-red':'b-green'}">${l.total>0?dispon:'∞'}</span></td>
        <td>${l.vencimiento?`${l.vencimiento}${vencAlert?` <span class="badge b-amber">${diasRestantes}d</span>`:''}` : '—'}</td>
        <td>${l.proveedor||'—'}</td>
        <td>$${Number(l.costo||0).toLocaleString('es-AR')}</td>
        <td><div class="tbl-actions">
          <button class="btn-ghost btn-sm" onclick="openModal('licencia','${l.id}')">✏</button>
          <button class="btn-ghost btn-sm" style="color:var(--red)" onclick="deleteItem('licencias','${l.id}')">🗑</button>
        </div></td>
      </tr>`;}).join('')}
    </tbody></table>`;
}

/* ═══════════════════════════════════════════════════════════
   ACCESOS
═══════════════════════════════════════════════════════ */
function renderAccesos() {
  let data = load('accesos');
  const search  = (document.getElementById('acc-search')?.value  || '').toLowerCase();
  const fSist   = document.getElementById('acc-sistema')?.value  || '';
  const fEstado = document.getElementById('acc-estado')?.value   || '';

  if (fSist)   data = data.filter(a => a.sistema === fSist);
  if (fEstado) data = data.filter(a => a.estado === fEstado);
  if (search)  data = data.filter(a => [a.usuario,a.sistema,a.perfil,a.autorizante].join(' ').toLowerCase().includes(search));

  document.getElementById('accesos-table').innerHTML = !data.length
    ? '<div class="table-empty">Sin resultados.</div>'
    : `<table>
    <thead><tr>
      <th>Usuario</th><th>Sistema</th><th>Perfil / Rol</th><th>Alta</th>
      <th>Baja</th><th>Autorizante</th><th>Estado</th><th>Acciones</th>
    </tr></thead>
    <tbody>${data.map(a => `<tr>
      <td><span class="badge b-cyan">${a.usuario}</span></td>
      <td>${sistemaIcon(a.sistema)} ${a.sistema}</td>
      <td>${a.perfil||'—'}</td>
      <td>${a.alta||'—'}</td>
      <td>${a.baja||'—'}</td>
      <td>${a.autorizante||'—'}</td>
      <td>${estadoBadge(a.estado)}</td>
      <td><div class="tbl-actions">
        <button class="btn-ghost btn-sm" onclick="openModal('acceso','${a.id}')">✏</button>
        <button class="btn-ghost btn-sm" style="color:var(--red)" onclick="deleteItem('accesos','${a.id}')">🗑</button>
      </div></td>
    </tr>`).join('')}
    </tbody></table>`;
}

function sistemaIcon(s) {
  const m = { 'Epicor':'⚡','Microsoft 365':'📧','Correo':'📬','VPN':'🔒','Power BI':'📊','Carpetas compartidas':'📁','Odoo':'🏭','Otro':'🔧' };
  return m[s]||'🔧';
}

/* ═══════════════════════════════════════════════════════════
   MOVIMIENTOS
═══════════════════════════════════════════════════════ */
function renderMovimientos() {
  let data = load('movimientos');
  const search = (document.getElementById('mov-search')?.value||'').toLowerCase();
  const fTipo  = document.getElementById('mov-tipo')?.value  || '';
  const fDesde = document.getElementById('mov-desde')?.value || '';
  const fHasta = document.getElementById('mov-hasta')?.value || '';

  if (fTipo) data = data.filter(m => m.tipo === fTipo);
  if (search) data = data.filter(m => [m.descripcion,m.referencia,m.modulo].join(' ').toLowerCase().includes(search));

  document.getElementById('movimientos-table').innerHTML = !data.length
    ? '<div class="table-empty">Sin movimientos registrados.</div>'
    : `<table>
    <thead><tr><th>Fecha</th><th>Tipo</th><th>Módulo</th><th>Descripción</th><th>Referencia</th></tr></thead>
    <tbody>${data.slice(0, 200).map(m => {
      const colorMap = { Equipo:'b-blue', Toner:'b-cyan', Usuario:'b-green', Licencia:'b-purple', Acceso:'b-amber' };
      return `<tr>
        <td style="font-size:11px">${m.fecha}</td>
        <td><span class="badge ${colorMap[m.tipo]||'b-gray'}">${m.tipo}</span></td>
        <td>${m.modulo}</td>
        <td>${m.descripcion}</td>
        <td><span style="font-size:11px;color:var(--text2)">${m.referencia||'—'}</span></td>
      </tr>`;}).join('')}
    </tbody></table>`;
}

/* ═══════════════════════════════════════════════════════════
   REPORTES
═══════════════════════════════════════════════════════ */
function renderReportes() {
  const equipos   = load('equipos');
  const toners    = load('toners');
  const usuarios  = load('usuarios');
  const licencias = load('licencias');
  const accesos   = load('accesos');
  const celulares = load('celulares');

  const reports = [
    { icon:'💻', title:'Inventario general', desc:`${equipos.filter(e=>e.estado!=='Baja').length} equipos activos registrados.`, action: () => exportExcelModule('equipos') },
    { icon:'👤', title:'Equipos por usuario', desc:'Lista de equipos asignados a cada usuario.', action: () => exportReportXLS('Equipos por Usuario', equipos.filter(e=>e.estado==='Asignado'), ['serie','tipo','marca','modelo','usuario','sector']) },
    { icon:'🏢', title:'Equipos por sector', desc:'Distribución de equipos por área.', action: () => exportReportXLS('Equipos por Sector', equipos.filter(e=>e.estado!=='Baja'), ['sector','tipo','marca','modelo','serie','estado']) },
    { icon:'🖨', title:'Toners bajo stock', desc:`${toners.filter(t=>t.stock<=t.minimo).length} toners con stock crítico.`, action: () => exportReportXLS('Toners Stock Crítico', toners.filter(t=>t.stock<=t.minimo), ['codigo','marca','modelo','impresora','sector','stock','minimo']) },
    { icon:'✓', title:'Usuarios activos', desc:`${usuarios.filter(u=>u.estado==='Activo').length} usuarios activos en plantilla.`, action: () => exportReportXLS('Usuarios Activos', usuarios.filter(u=>u.estado==='Activo'), ['nombre','usuarioRed','email','sector','puesto','sucursal','equipo']) },
    { icon:'↓', title:'Usuarios dados de baja', desc:`${usuarios.filter(u=>u.estado==='Baja').length} desvinculados.`, action: () => exportReportXLS('Usuarios Baja', usuarios.filter(u=>u.estado==='Baja'), ['nombre','usuarioRed','sector','ingreso','baja','obs']) },
    { icon:'🔑', title:'Licencias asignadas', desc:'Detalle de asignaciones de software.', action: () => exportExcelModule('licencias') },
    { icon:'🔐', title:'Accesos activos', desc:`${accesos.filter(a=>a.estado==='Activo').length} accesos habilitados.`, action: () => exportReportXLS('Accesos Activos', accesos.filter(a=>a.estado==='Activo'), ['usuario','sistema','perfil','alta','autorizante']) },
    { icon:'🔧', title:'Equipos en reparación', desc:`${equipos.filter(e=>e.estado==='Reparación').length} equipos en servicio técnico.`, action: () => exportReportXLS('En Reparación', equipos.filter(e=>e.estado==='Reparación'), ['serie','tipo','marca','modelo','sector','obs']) },
    { icon:'📦', title:'Equipos obsoletos', desc:`${equipos.filter(e=>e.estado==='Obsoleto').length} equipos fuera de servicio.`, action: () => exportReportXLS('Obsoletos', equipos.filter(e=>e.estado==='Obsoleto'), ['serie','tipo','marca','modelo','compra','garantia','obs']) },
    { icon:'⚠', title:'Garantías vencidas', desc:'Equipos con garantía expirada.', action: () => exportReportXLS('Garantías Vencidas', equipos.filter(e=>e.garantia&&new Date(e.garantia)<new Date()), ['serie','tipo','marca','modelo','compra','garantia','sector','estado']) },
    { icon:'📱', title:'Celulares corporativos', desc:`${celulares.filter(c=>c.estado!=='Baja').length} celulares en inventario · ${celulares.filter(c=>c.estado==='Asignado').length} asignados.`, action: () => exportExcelModule('celulares') },
    { icon:'📱', title:'Celulares asignados', desc:'Lista de celulares por usuario.', action: () => exportReportXLS('Celulares Asignados', celulares.filter(c=>c.estado==='Asignado'), ['marca','modelo','imei','nroLinea','operadora','usuario','sector','sucursal']) },
    { icon:'📄', title:'Reporte general PDF', desc:'Exportar informe ejecutivo completo en PDF.', action: () => exportPDFGeneral() },
  ];

  document.getElementById('report-grid').innerHTML = reports.map(r => `
    <div class="report-card">
      <h3>${r.icon} ${r.title}</h3>
      <p>${r.desc}</p>
      <button class="btn-primary" onclick="reportActions[${reports.indexOf(r)}]()">Generar reporte</button>
    </div>`).join('');

  window.reportActions = reports.map(r => r.action);
}

/* ═══════════════════════════════════════════════════════════
   MODALS – Generic CRUD
═══════════════════════════════════════════════════════ */
function openModal(type, id = null) {
  editingId = id;
  const forms = {
    equipo:   formEquipo,
    toner:    formToner,
    usuario:  formUsuario,
    licencia: formLicencia,
    acceso:   formAcceso,
    celular:  formCelular,
  };
  const titles = {
    equipo: id ? 'Editar equipo' : 'Nuevo equipo',
    toner:  id ? 'Editar toner'  : 'Nuevo toner',
    usuario: id ? 'Editar usuario' : 'Nuevo usuario',
    licencia: id ? 'Editar licencia' : 'Nueva licencia',
    acceso:  id ? 'Editar acceso'  : 'Nuevo acceso',
    celular: id ? 'Editar celular' : 'Nuevo celular',
  };
  document.getElementById('modal-title').textContent = titles[type];
  document.getElementById('modal-body').innerHTML = forms[type](id);
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  editingId = null;
}
function closeModalOverlay(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

/* ── EQUIPO FORM ─────────────────────────────────────────── */
function formEquipo(id) {
  const d = id ? load('equipos').find(x=>x.id===id) : {};
  const v = (f, def='') => d[f] !== undefined ? d[f] : def;
  const opt = (vals, cur) => vals.map(o=>`<option ${o===cur?'selected':''}>${o}</option>`).join('');

  return `
  <div class="form-row">
    <div class="form-group">
      <label>Tipo</label>
      <select id="f-tipo" class="form-input">${opt(['Notebook','Desktop','Impresora','Monitor','Servidor','Otro'],v('tipo'))}</select>
    </div>
    <div class="form-group">
      <label>Estado</label>
      <select id="f-estado" class="form-input">${opt(['Disponible','Asignado','Reparación','Obsoleto','Baja'],v('estado','Disponible'))}</select>
    </div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Marca</label><input id="f-marca" class="form-input" value="${v('marca')}" /></div>
    <div class="form-group"><label>Modelo</label><input id="f-modelo" class="form-input" value="${v('modelo')}" /></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Número de serie</label><input id="f-serie" class="form-input" value="${v('serie')}" /></div>
    <div class="form-group"><label>Sistema operativo</label><input id="f-so" class="form-input" value="${v('so')}" /></div>
  </div>
  <div class="form-row cols3">
    <div class="form-group"><label>Procesador</label><input id="f-cpu" class="form-input" value="${v('cpu')}" /></div>
    <div class="form-group"><label>RAM</label><input id="f-ram" class="form-input" value="${v('ram')}" /></div>
    <div class="form-group"><label>Disco</label><input id="f-disco" class="form-input" value="${v('disco')}" /></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Sector</label><input id="f-sector" class="form-input" value="${v('sector')}" /></div>
    <div class="form-group"><label>Sucursal</label><input id="f-sucursal" class="form-input" value="${v('sucursal')}" /></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Usuario asignado</label><input id="f-usuario" class="form-input" value="${v('usuario')}" /></div>
    <div class="form-group"><label>Fecha de compra</label><input id="f-compra" type="date" class="form-input" value="${v('compra')}" /></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Garantía hasta</label><input id="f-garantia" type="date" class="form-input" value="${v('garantia')}" /></div>
    <div class="form-group"><label>Observaciones</label><input id="f-obs" class="form-input" value="${v('obs')}" /></div>
  </div>
  <div class="form-actions">
    <button class="btn-outline" onclick="closeModal()">Cancelar</button>
    <button class="btn-primary" onclick="saveEquipo()">Guardar</button>
  </div>`;
}

function saveEquipo() {
  const obj = {
    id: editingId || uid(),
    tipo: g('f-tipo'), estado: g('f-estado'), marca: g('f-marca'), modelo: g('f-modelo'),
    serie: g('f-serie'), so: g('f-so'), cpu: g('f-cpu'), ram: g('f-ram'), disco: g('f-disco'),
    sector: g('f-sector'), sucursal: g('f-sucursal'), usuario: g('f-usuario'),
    compra: g('f-compra'), garantia: g('f-garantia'), obs: g('f-obs'),
  };
  if (!obj.marca || !obj.modelo) { toast('Completá marca y modelo', 'error'); return; }
  upsert('equipos', obj);
  logMov('Equipo', 'Equipos', `${editingId?'Edición':'Alta'} de equipo ${obj.marca} ${obj.modelo}`, obj.serie);
  closeModal(); renderEquipos();
  toast(`Equipo ${editingId?'actualizado':'creado'}`, 'success');
}

/* ── TONER FORM ─────────────────────────────────────────── */
function formToner(id) {
  const d = id ? load('toners').find(x=>x.id===id) : {};
  const v = (f, def='') => d[f] !== undefined ? d[f] : def;
  return `
  <div class="form-row">
    <div class="form-group"><label>Código</label><input id="f-codigo" class="form-input" value="${v('codigo')}" /></div>
    <div class="form-group"><label>Marca</label><input id="f-marca" class="form-input" value="${v('marca')}" /></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Modelo / Nro</label><input id="f-modelo" class="form-input" value="${v('modelo')}" /></div>
    <div class="form-group"><label>Impresora compatible</label><input id="f-impresora" class="form-input" value="${v('impresora')}" /></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Sector</label><input id="f-sector" class="form-input" value="${v('sector')}" /></div>
    <div class="form-group"><label>Proveedor</label><input id="f-proveedor" class="form-input" value="${v('proveedor')}" /></div>
  </div>
  <div class="form-row cols3">
    <div class="form-group"><label>Stock actual</label><input id="f-stock" type="number" class="form-input" value="${v('stock',0)}" /></div>
    <div class="form-group"><label>Stock mínimo</label><input id="f-minimo" type="number" class="form-input" value="${v('minimo',1)}" /></div>
    <div class="form-group"><label>Costo AR$</label><input id="f-costo" type="number" class="form-input" value="${v('costo',0)}" /></div>
  </div>
  <div class="form-group">
    <label>Última compra</label><input id="f-ultima" type="date" class="form-input" value="${v('ultima')}" />
  </div>
  <div class="form-group"><label>Observaciones</label><textarea id="f-obs" class="form-input">${v('obs')}</textarea></div>
  <div class="form-actions">
    <button class="btn-outline" onclick="closeModal()">Cancelar</button>
    <button class="btn-primary" onclick="saveToner()">Guardar</button>
  </div>`;
}

function saveToner() {
  const obj = {
    id: editingId || uid(),
    codigo: g('f-codigo'), marca: g('f-marca'), modelo: g('f-modelo'),
    impresora: g('f-impresora'), sector: g('f-sector'), proveedor: g('f-proveedor'),
    stock: parseInt(g('f-stock'))||0, minimo: parseInt(g('f-minimo'))||1,
    costo: parseFloat(g('f-costo'))||0, ultima: g('f-ultima'), obs: g('f-obs'),
  };
  if (!obj.codigo) { toast('Ingresá el código del toner', 'error'); return; }
  upsert('toners', obj);
  logMov('Toner', 'Toners', `${editingId?'Edición':'Alta'} de toner ${obj.codigo}`, obj.codigo);
  closeModal(); renderToners();
  toast(`Toner ${editingId?'actualizado':'creado'}`, 'success');
}

/* ── USUARIO FORM ───────────────────────────────────────── */
function formUsuario(id) {
  const d = id ? load('usuarios').find(x=>x.id===id) : {};
  const v = (f, def='') => d[f] !== undefined ? d[f] : def;
  const opt = (vals, cur) => vals.map(o=>`<option ${o===cur?'selected':''}>${o}</option>`).join('');
  return `
  <div class="form-row">
    <div class="form-group"><label>Nombre y apellido</label><input id="f-nombre" class="form-input" value="${v('nombre')}" /></div>
    <div class="form-group"><label>Usuario de red</label><input id="f-uRed" class="form-input" value="${v('usuarioRed')}" /></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Email</label><input id="f-email" type="email" class="form-input" value="${v('email')}" /></div>
    <div class="form-group"><label>Estado</label>
      <select id="f-estado" class="form-input">${opt(['Activo','Baja','Licencia'],v('estado','Activo'))}</select>
    </div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Sector</label><input id="f-sector" class="form-input" value="${v('sector')}" /></div>
    <div class="form-group"><label>Puesto</label><input id="f-puesto" class="form-input" value="${v('puesto')}" /></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Sucursal</label><input id="f-sucursal" class="form-input" value="${v('sucursal')}" /></div>
    <div class="form-group"><label>Responsable</label><input id="f-resp" class="form-input" value="${v('responsable')}" /></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Fecha ingreso</label><input id="f-ingreso" type="date" class="form-input" value="${v('ingreso')}" /></div>
    <div class="form-group"><label>Fecha baja</label><input id="f-baja" type="date" class="form-input" value="${v('baja')}" /></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Equipo asignado (serie)</label><input id="f-equipo" class="form-input" value="${v('equipo')}" /></div>
    <div class="form-group"><label>Licencias</label><input id="f-licencias" class="form-input" value="${v('licencias')}" /></div>
  </div>
  <div class="form-group"><label>Accesos</label><input id="f-accesos" class="form-input" value="${v('accesos')}" /></div>
  <div class="form-group"><label>Observaciones</label><textarea id="f-obs" class="form-input">${v('obs')}</textarea></div>
  <div class="form-actions">
    <button class="btn-outline" onclick="closeModal()">Cancelar</button>
    <button class="btn-primary" onclick="saveUsuario()">Guardar</button>
  </div>`;
}

function saveUsuario() {
  const obj = {
    id: editingId || uid(),
    nombre: g('f-nombre'), usuarioRed: g('f-uRed'), email: g('f-email'),
    estado: g('f-estado'), sector: g('f-sector'), puesto: g('f-puesto'),
    sucursal: g('f-sucursal'), responsable: g('f-resp'),
    ingreso: g('f-ingreso'), baja: g('f-baja'),
    equipo: g('f-equipo'), licencias: g('f-licencias'),
    accesos: g('f-accesos'), obs: g('f-obs'),
  };
  if (!obj.nombre || !obj.usuarioRed) { toast('Nombre y usuario de red son requeridos', 'error'); return; }
  upsert('usuarios', obj);
  logMov('Usuario', 'Usuarios', `${editingId?'Edición':'Alta'} de usuario ${obj.nombre}`, obj.usuarioRed);
  closeModal(); renderUsuarios();
  toast(`Usuario ${editingId?'actualizado':'creado'}`, 'success');
}

/* ── LICENCIA FORM ──────────────────────────────────────── */
function formLicencia(id) {
  const d = id ? load('licencias').find(x=>x.id===id) : {};
  const v = (f, def='') => d[f] !== undefined ? d[f] : def;
  return `
  <div class="form-group"><label>Software</label><input id="f-sw" class="form-input" value="${v('software')}" /></div>
  <div class="form-row">
    <div class="form-group"><label>Tipo de licencia</label><input id="f-tipo" class="form-input" value="${v('tipo')}" /></div>
    <div class="form-group"><label>Proveedor</label><input id="f-prov" class="form-input" value="${v('proveedor')}" /></div>
  </div>
  <div class="form-row cols3">
    <div class="form-group"><label>Total licencias</label><input id="f-total" type="number" class="form-input" value="${v('total',0)}" /></div>
    <div class="form-group"><label>Asignadas</label><input id="f-asig" type="number" class="form-input" value="${v('asignadas',0)}" /></div>
    <div class="form-group"><label>Costo AR$</label><input id="f-costo" type="number" class="form-input" value="${v('costo',0)}" /></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Vencimiento</label><input id="f-venc" type="date" class="form-input" value="${v('vencimiento')}" /></div>
    <div class="form-group"></div>
  </div>
  <div class="form-group"><label>Observaciones</label><textarea id="f-obs" class="form-input">${v('obs')}</textarea></div>
  <div class="form-actions">
    <button class="btn-outline" onclick="closeModal()">Cancelar</button>
    <button class="btn-primary" onclick="saveLicencia()">Guardar</button>
  </div>`;
}

function saveLicencia() {
  const obj = {
    id: editingId || uid(),
    software: g('f-sw'), tipo: g('f-tipo'), proveedor: g('f-prov'),
    total: parseInt(g('f-total'))||0, asignadas: parseInt(g('f-asig'))||0,
    costo: parseFloat(g('f-costo'))||0, vencimiento: g('f-venc'), obs: g('f-obs'),
  };
  if (!obj.software) { toast('Ingresá el nombre del software', 'error'); return; }
  upsert('licencias', obj);
  logMov('Licencia', 'Licencias', `${editingId?'Edición':'Alta'} de licencia ${obj.software}`, obj.software);
  closeModal(); renderLicencias();
  toast(`Licencia ${editingId?'actualizada':'creada'}`, 'success');
}

/* ── ACCESO FORM ────────────────────────────────────────── */
function formAcceso(id) {
  const d = id ? load('accesos').find(x=>x.id===id) : {};
  const v = (f, def='') => d[f] !== undefined ? d[f] : def;
  const sistOpts = ['Epicor','Microsoft 365','Correo','VPN','Power BI','Carpetas compartidas','Odoo','Otro'];
  const opt = (vals, cur) => vals.map(o=>`<option ${o===cur?'selected':''}>${o}</option>`).join('');
  return `
  <div class="form-row">
    <div class="form-group"><label>Usuario de red</label><input id="f-usr" class="form-input" value="${v('usuario')}" /></div>
    <div class="form-group"><label>Sistema</label>
      <select id="f-sis" class="form-input">${opt(sistOpts,v('sistema'))}</select>
    </div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Perfil / Rol</label><input id="f-perfil" class="form-input" value="${v('perfil')}" /></div>
    <div class="form-group"><label>Estado</label>
      <select id="f-estado" class="form-input">${opt(['Activo','Inactivo'],v('estado','Activo'))}</select>
    </div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Fecha alta</label><input id="f-alta" type="date" class="form-input" value="${v('alta')}" /></div>
    <div class="form-group"><label>Fecha baja</label><input id="f-baja" type="date" class="form-input" value="${v('baja')}" /></div>
  </div>
  <div class="form-group"><label>Autorizante</label><input id="f-auth" class="form-input" value="${v('autorizante')}" /></div>
  <div class="form-group"><label>Observaciones</label><textarea id="f-obs" class="form-input">${v('obs')}</textarea></div>
  <div class="form-actions">
    <button class="btn-outline" onclick="closeModal()">Cancelar</button>
    <button class="btn-primary" onclick="saveAcceso()">Guardar</button>
  </div>`;
}

function saveAcceso() {
  const obj = {
    id: editingId || uid(),
    usuario: g('f-usr'), sistema: g('f-sis'), perfil: g('f-perfil'),
    estado: g('f-estado'), alta: g('f-alta'), baja: g('f-baja'),
    autorizante: g('f-auth'), obs: g('f-obs'),
  };
  if (!obj.usuario || !obj.sistema) { toast('Usuario y sistema son requeridos', 'error'); return; }
  upsert('accesos', obj);
  logMov('Acceso', 'Accesos', `${editingId?'Edición':'Alta'} de acceso ${obj.usuario} → ${obj.sistema}`, obj.usuario);
  closeModal(); renderAccesos();
  toast(`Acceso ${editingId?'actualizado':'creado'}`, 'success');
}

/* ── ACCESO FORM ────────────────────────────────────────── */
function formAcceso(id) {
  const d = id ? load('accesos').find(x=>x.id===id) : {};
  const v = (f, def='') => d[f] !== undefined ? d[f] : def;
  // Usar SISTEMAS_ACCESO centralizado (v1.1 ampliado con TS1/TS2/TS3 y más)
  // Si el registro existente tiene un valor no listado, se agrega dinámicamente
  const curSistema = v('sistema');
  const sistList = curSistema && !SISTEMAS_ACCESO.includes(curSistema)
    ? [...SISTEMAS_ACCESO.slice(0,-1), curSistema, 'Otro']
    : SISTEMAS_ACCESO;
  const opt = (vals, cur) => vals.map(o=>`<option ${o===cur?'selected':''}>${o}</option>`).join('');
  return `
  <div class="form-row">
    <div class="form-group"><label>Usuario de red</label><input id="f-usr" class="form-input" value="${v('usuario')}" /></div>
    <div class="form-group"><label>Sistema</label>
      <select id="f-sis" class="form-input">${opt(sistList,curSistema)}</select>
    </div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Perfil / Rol</label><input id="f-perfil" class="form-input" value="${v('perfil')}" /></div>
    <div class="form-group"><label>Estado</label>
      <select id="f-estado" class="form-input">${opt(['Activo','Inactivo'],v('estado','Activo'))}</select>
    </div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Fecha alta</label><input id="f-alta" type="date" class="form-input" value="${v('alta')}" /></div>
    <div class="form-group"><label>Fecha baja</label><input id="f-baja" type="date" class="form-input" value="${v('baja')}" /></div>
  </div>
  <div class="form-group"><label>Autorizante</label><input id="f-auth" class="form-input" value="${v('autorizante')}" /></div>
  <div class="form-group"><label>Observaciones</label><textarea id="f-obs" class="form-input">${v('obs')}</textarea></div>
  <div class="form-actions">
    <button class="btn-outline" onclick="closeModal()">Cancelar</button>
    <button class="btn-primary" onclick="saveAcceso()">Guardar</button>
  </div>`;
}

function saveAcceso() {
  const obj = {
    id: editingId || uid(),
    usuario: g('f-usr'), sistema: g('f-sis'), perfil: g('f-perfil'),
    estado: g('f-estado'), alta: g('f-alta'), baja: g('f-baja'),
    autorizante: g('f-auth'), obs: g('f-obs'),
  };
  if (!obj.usuario || !obj.sistema) { toast('Usuario y sistema son requeridos', 'error'); return; }
  upsert('accesos', obj);
  logMov('Acceso', 'Accesos', `${editingId?'Edición':'Alta'} de acceso ${obj.usuario} → ${obj.sistema}`, obj.usuario);
  closeModal(); renderAccesos();
  toast(`Acceso ${editingId?'actualizado':'creado'}`, 'success');
}

/* ── CELULAR FORM ───────────────────────────────────────── */
function formCelular(id) {
  const d = id ? load('celulares').find(x=>x.id===id) : {};
  const v = (f, def='') => d[f] !== undefined ? d[f] : def;
  const opt = (vals, cur) => vals.map(o=>`<option ${o===cur?'selected':''}>${o}</option>`).join('');
  return `
  <div class="form-row">
    <div class="form-group"><label>Marca</label>
      <select id="f-marca" class="form-input">
        ${opt(['iPhone','Samsung','Motorola','Xiaomi','LG','Nokia','Huawei','Otro'],v('marca'))}
      </select>
    </div>
    <div class="form-group"><label>Modelo</label><input id="f-modelo" class="form-input" value="${v('modelo')}" placeholder="ej: Galaxy A54, iPhone 14" /></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>IMEI</label><input id="f-imei" class="form-input" value="${v('imei')}" placeholder="15 dígitos" /></div>
    <div class="form-group"><label>Nro de línea</label><input id="f-linea" class="form-input" value="${v('nroLinea')}" placeholder="ej: 11-5000-0000" /></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Operadora</label>
      <select id="f-operadora" class="form-input">
        ${opt(['Personal','Claro','Movistar','Tuenti','Sin línea','Otra'],v('operadora'))}
      </select>
    </div>
    <div class="form-group"><label>Estado</label>
      <select id="f-estado" class="form-input">
        ${opt(['Disponible','Asignado','Reparación','Baja'],v('estado','Disponible'))}
      </select>
    </div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Usuario asignado</label><input id="f-usuario" class="form-input" value="${v('usuario')}" /></div>
    <div class="form-group"><label>Sector</label><input id="f-sector" class="form-input" value="${v('sector')}" /></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Sucursal</label><input id="f-sucursal" class="form-input" value="${v('sucursal')}" /></div>
    <div class="form-group"><label>Fecha de compra</label><input id="f-compra" type="date" class="form-input" value="${v('compra')}" /></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Garantía hasta</label><input id="f-garantia" type="date" class="form-input" value="${v('garantia')}" /></div>
    <div class="form-group"></div>
  </div>
  <div class="form-group"><label>Observaciones</label><textarea id="f-obs" class="form-input">${v('obs')}</textarea></div>
  <div class="form-actions">
    <button class="btn-outline" onclick="closeModal()">Cancelar</button>
    <button class="btn-primary" onclick="saveCelular()">Guardar</button>
  </div>`;
}

function saveCelular() {
  const obj = {
    id: editingId || uid(),
    marca: g('f-marca'), modelo: g('f-modelo'), imei: g('f-imei'),
    nroLinea: g('f-linea'), operadora: g('f-operadora'),
    estado: g('f-estado'), usuario: g('f-usuario'), sector: g('f-sector'),
    sucursal: g('f-sucursal'), compra: g('f-compra'), garantia: g('f-garantia'),
    obs: g('f-obs'),
  };
  if (!obj.marca || !obj.modelo) { toast('Marca y modelo son requeridos', 'error'); return; }
  upsert('celulares', obj);
  logMov('Celular', 'Celulares', `${editingId?'Edición':'Alta'} de celular ${obj.marca} ${obj.modelo}${obj.usuario?' → '+obj.usuario:''}`, obj.imei||obj.modelo);
  closeModal(); renderCelulares(); populateMarcaFilter();
  toast(`Celular ${editingId?'actualizado':'registrado'}`, 'success');
}

/* ═══════════════════════════════════════════════════════════
   CELULARES – RENDER
═══════════════════════════════════════════════════════ */
function renderCelulares() {
  const all    = load('celulares');
  const search = (document.getElementById('cel-search')?.value || '').toLowerCase();
  const fEst   = document.getElementById('cel-estado')?.value || '';
  const fMarca = document.getElementById('cel-marca')?.value  || '';

  const data = all.filter(c => {
    if (c.estado === 'Baja' && fEst !== 'Baja') return false;
    if (fEst   && c.estado !== fEst)   return false;
    if (fMarca && c.marca  !== fMarca) return false;
    if (search) {
      const row = [c.marca,c.modelo,c.imei,c.nroLinea,c.usuario,c.sector,c.operadora,c.obs].join(' ').toLowerCase();
      if (!row.includes(search)) return false;
    }
    return true;
  });

  const cont = document.getElementById('celulares-table');
  if (!data.length) {
    cont.innerHTML = '<div class="table-empty">Sin resultados para los filtros aplicados.</div>';
    return;
  }

  cont.innerHTML = `<table>
    <thead><tr>
      <th>Marca / Modelo</th><th>IMEI</th><th>Nro Línea</th><th>Operadora</th>
      <th>Estado</th><th>Usuario</th><th>Sector</th><th>Garantía</th><th>Acciones</th>
    </tr></thead>
    <tbody>${data.map(c => {
      const gvenc = c.garantia && new Date(c.garantia) < new Date();
      return `<tr class="${gvenc?'row-warn':''}">
        <td><strong>${c.marca}</strong> ${c.modelo}</td>
        <td><span style="font-size:11px;font-family:monospace">${c.imei||'—'}</span></td>
        <td>${c.nroLinea||'—'}</td>
        <td>${c.operadora||'—'}</td>
        <td>${estadoBadge(c.estado)}</td>
        <td>${c.usuario||'—'}</td>
        <td>${c.sector||'—'}</td>
        <td>${gvenc?'<span class="badge b-red">Vencida</span>':(c.garantia||'—')}</td>
        <td><div class="tbl-actions">
          <button class="btn-ghost btn-sm" onclick="openModal('celular','${c.id}')">✏</button>
          <button class="btn-ghost btn-sm" style="color:var(--red)" onclick="deleteItem('celulares','${c.id}')">🗑</button>
        </div></td>
      </tr>`;}).join('')}
    </tbody></table>`;
}

/* ═══════════════════════════════════════════════════════════
   UPSERT & DELETE
═══════════════════════════════════════════════════════ */
function upsert(key, obj) {
  const data = load(key);
  const idx  = data.findIndex(x => x.id === obj.id);
  if (idx >= 0) data[idx] = obj;
  else data.unshift(obj);
  save(key, data);
}

function deleteItem(key, id) {
  if (!confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return;
  const data = load(key).filter(x => x.id !== id);
  save(key, data);
  const renders = {
    equipos: renderEquipos, toners: renderToners, usuarios: renderUsuarios,
    licencias: renderLicencias, accesos: renderAccesos, celulares: renderCelulares,
  };
  if (renders[key]) renders[key]();
  toast('Registro eliminado', 'info');
}

/* ═══════════════════════════════════════════════════════════
   EXPORTS
═══════════════════════════════════════════════════════ */
function exportExcelModule(key) {
  const data = load(key);
  if (!data.length) { toast('Sin datos para exportar', 'error'); return; }
  const ws   = XLSX.utils.json_to_sheet(data.map(r => { const {id,...rest} = r; return rest; }));
  const wb   = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, key);
  XLSX.writeFile(wb, `CLADAN_IT_${key}_${today()}.xlsx`);
  toast(`Exportado: ${key}.xlsx`, 'success');
}

function exportReportXLS(title, data, fields) {
  if (!data.length) { toast('Sin datos', 'error'); return; }
  const rows = data.map(r => Object.fromEntries(fields.map(f => [f, r[f]||''])));
  const ws   = XLSX.utils.json_to_sheet(rows);
  const wb   = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.substring(0,30));
  XLSX.writeFile(wb, `CLADAN_IT_${title.replace(/\s+/g,'_')}_${today()}.xlsx`);
  toast('Reporte exportado', 'success');
}

function exportBackup() {
  const backup = {};
  Object.keys(KEYS).forEach(k => { backup[k] = load(k); });
  backup._exported = now();
  backup._version  = DATA_VERSION;
  backup._versionKey = DATA_VERSION_KEY;
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `CLADAN_IT_backup_v${DATA_VERSION}_${today()}.json`;
  a.click(); URL.revokeObjectURL(url);
  toast('Backup exportado correctamente', 'success');
}

function importBackup(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      let count = 0;
      // Restaurar todos los módulos conocidos (compatibilidad hacia atrás)
      Object.keys(KEYS).forEach(k => {
        if (data[k] !== undefined) { save(k, data[k]); count++; }
      });
      // Restaurar versión si está en el backup
      if (data._version) {
        localStorage.setItem(DATA_VERSION_KEY, data._version);
        // Re-ejecutar migración por si el backup era de una versión anterior
        migrateData();
      }
      toast(`Backup importado: ${count} módulos restaurados`, 'success');
      renderDashboard();
    } catch {
      toast('Error al leer el archivo JSON', 'error');
    }
    input.value = '';
  };
  reader.readAsText(file);
}

function clearDemoData() {
  if (!confirm('¿Eliminar TODOS los datos demo? Esta acción no se puede deshacer.')) return;
  Object.keys(KEYS).forEach(k => save(k, []));
  // Conservar la versión de datos aunque se limpie el contenido
  localStorage.setItem(DATA_VERSION_KEY, DATA_VERSION);
  renderDashboard();
  toast('Datos eliminados. Sistema en blanco listo para uso.', 'info');
}

async function exportPDFGeneral() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  const equipos   = load('equipos');
  const toners    = load('toners');
  const usuarios  = load('usuarios');
  const licencias = load('licencias');
  const celulares = load('celulares');
  const W = 210; let y = 0;

  // Header
  doc.setFillColor(15, 28, 46);
  doc.rect(0, 0, W, 30, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(18); doc.setTextColor(255,255,255);
  doc.text('CLADAN IT Control', 14, 14);
  doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(148,163,184);
  doc.text('Informe General de Inventario IT', 14, 21);
  doc.text('Generado: ' + new Date().toLocaleString('es-AR'), W-14, 21, { align:'right' });
  y = 40;

  const section = (title) => {
    if (y > 255) { doc.addPage(); y = 16; }
    doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(29,78,216);
    doc.text(title, 14, y); y += 8;
    doc.setDrawColor(29,78,216); doc.line(14, y-2, W-14, y-2);
    y += 2;
  };

  const row = (label, val) => {
    if (y > 270) { doc.addPage(); y = 16; }
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(148,163,184);
    doc.text(String(label), 14, y);
    doc.setFont('helvetica','normal'); doc.setTextColor(226,232,240);
    doc.text(String(val||'—'), 70, y);
    y += 6;
  };

  // KPIs
  section('RESUMEN EJECUTIVO');
  const kpis = [
    ['Total de equipos', equipos.filter(e=>e.estado!=='Baja').length],
    ['Notebooks disponibles', equipos.filter(e=>e.tipo==='Notebook'&&e.estado==='Disponible').length],
    ['Notebooks asignadas', equipos.filter(e=>e.tipo==='Notebook'&&e.estado==='Asignado').length],
    ['Equipos en reparación', equipos.filter(e=>e.estado==='Reparación').length],
    ['Toners con stock crítico', toners.filter(t=>t.stock<=t.minimo).length],
    ['Usuarios activos', usuarios.filter(u=>u.estado==='Activo').length],
    ['Licencias asignadas', licencias.reduce((s,l)=>s+l.asignadas,0)],
    ['Celulares asignados', celulares.filter(c=>c.estado==='Asignado').length],
  ];
  kpis.forEach(([l,v]) => row(l, v));
  y += 4;

  // Equipos table
  section('INVENTARIO DE EQUIPOS');
  const eqTable = [['Serie','Tipo','Marca','Modelo','Estado','Sector','Usuario']];
  equipos.filter(e=>e.estado!=='Baja').slice(0,20).forEach(e =>
    eqTable.push([e.serie||'—',e.tipo,e.marca,e.modelo,e.estado,e.sector||'—',e.usuario||'—'])
  );
  drawTable(doc, eqTable, 14, y, [25,20,22,30,20,25,28]); y += eqTable.length * 7 + 8;
  if (equipos.length > 20) { doc.setFontSize(8); doc.setTextColor(100); doc.text(`(y ${equipos.length-20} equipos más…)`, 14, y); y += 8; }

  // Toners
  if (y > 220) { doc.addPage(); y = 16; }
  section('STOCK DE TONERS');
  const tonTable = [['Código','Modelo','Impresora','Sector','Stock','Mínimo']];
  toners.forEach(t => tonTable.push([t.codigo,t.modelo,t.impresora,t.sector,String(t.stock),String(t.minimo)]));
  drawTable(doc, tonTable, 14, y, [28,28,40,28,14,14]); y += tonTable.length * 7 + 8;

  // Usuarios
  if (y > 220) { doc.addPage(); y = 16; }
  section('USUARIOS ACTIVOS');
  const usrTable = [['Nombre','Usuario','Sector','Puesto','Equipo']];
  usuarios.filter(u=>u.estado==='Activo').forEach(u =>
    usrTable.push([u.nombre,u.usuarioRed,u.sector,u.puesto,u.equipo||'—'])
  );
  drawTable(doc, usrTable, 14, y, [42,24,26,30,34]); y += usrTable.length * 7 + 8;

  // Celulares
  if (celulares.length > 0) {
    if (y > 220) { doc.addPage(); y = 16; }
    section('CELULARES CORPORATIVOS');
    const celTable = [['Marca','Modelo','IMEI','Línea','Operadora','Estado','Usuario']];
    celulares.filter(c=>c.estado!=='Baja').forEach(c =>
      celTable.push([c.marca,c.modelo,c.imei||'—',c.nroLinea||'—',c.operadora||'—',c.estado,c.usuario||'—'])
    );
    drawTable(doc, celTable, 14, y, [20,24,32,22,20,18,30]); y += celTable.length * 7 + 8;
  }

  // Footer
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setTextColor(75,85,99);
    doc.text(`CLADAN IT Control · Generado ${new Date().toLocaleString('es-AR')} · Página ${i}/${pages}`, W/2, 292, { align:'center' });
    doc.setDrawColor(31,45,69); doc.line(14, 288, W-14, 288);
  }

  doc.save(`CLADAN_IT_Informe_${today()}.pdf`);
  toast('PDF generado', 'success');
}

function drawTable(doc, rows, startX, startY, colWidths) {
  const rowH = 7;
  rows.forEach((row, ri) => {
    if (ri === 0) {
      doc.setFillColor(22, 35, 54);
    } else {
      doc.setFillColor(ri%2===0 ? 15 : 22, ri%2===0 ? 28 : 35, ri%2===0 ? 46 : 54);
    }
    let cx = startX;
    colWidths.forEach(cw => { doc.rect(cx, startY + ri*rowH, cw, rowH, 'F'); cx += cw; });
    cx = startX;
    doc.setFont('helvetica', ri===0?'bold':'normal');
    doc.setFontSize(ri===0 ? 7.5 : 7);
    doc.setTextColor(ri===0 ? 226 : 200, ri===0 ? 232 : 208, ri===0 ? 240 : 218);
    row.forEach((cell, ci) => {
      const txt = String(cell||'').substring(0, 16);
      doc.text(txt, cx + 2, startY + ri*rowH + 4.5);
      cx += colWidths[ci];
    });
  });
}

async function exportPDFModule(module) {
  toast('Generando PDF…', 'info');
  await exportPDFGeneral();
}

/* ═══════════════════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════════════ */
const g = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };

function showVersionInfo() {
  const storedVersion = localStorage.getItem(DATA_VERSION_KEY) || 'Sin versión (v1.0 original)';
  const counts = Object.keys(KEYS).map(k => {
    const data = load(k);
    return `${k}: ${data.length} registros`;
  });
  const info = `CLADAN IT Control\nVersión de app: ${DATA_VERSION}\nVersión de datos: ${storedVersion}\n\nRegistros en localStorage:\n${counts.join('\n')}`;
  alert(info);
}

function toast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  t.classList.remove('hidden');
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => t.classList.add('hidden'), 3000);
}

/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initNav();
  // ── Migración automática ──────────────────────────────
  // Se ejecuta ANTES de loadDemoData para no sobreescribir datos reales.
  // Solo actúa si hay datos existentes y la versión es anterior.
  migrateData();
  // ── Datos demo ────────────────────────────────────────
  // Solo carga si no hay datos previos (detecta equipos existentes).
  loadDemoData();
  if (sessionStorage.getItem('cit_auth')) {
    renderDashboard();
  }
});
