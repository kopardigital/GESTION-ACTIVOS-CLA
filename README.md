# CLADAN IT Control

Sistema de gestión interna de inventario IT, toners, usuarios, licencias, accesos y celulares. 100% estático, sin backend, publicable en **GitHub Pages**.

![Version](https://img.shields.io/badge/versión-1.1-1d4ed8?style=for-the-badge)
![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-Ready-10b981?style=for-the-badge)
![Sin backend](https://img.shields.io/badge/Sin_backend-LocalStorage-f59e0b?style=for-the-badge)

---

## ⚠ ANTES DE ACTUALIZAR — HACER BACKUP

Si ya tenés el sistema con datos cargados, seguí estos pasos **antes** de reemplazar los archivos:

1. Abrí el sistema en el navegador.
2. Andá a **Config / Backup → Backup de datos**.
3. Hacé click en **Exportar backup JSON**.
4. Guardá el archivo descargado en un lugar seguro.
5. Reemplazá los archivos del repositorio con la nueva versión.
6. Si algo falla, restaurar desde **Importar backup JSON**.

---

## 🔄 Changelog

### v1.1 — Actualización de compatibilidad (actual)
**Cambios que NO afectan datos existentes:**
- ✅ Módulo nuevo: **Celulares corporativos** (`cit_celulares` en localStorage)
- ✅ Control Accesos: **nuevos sistemas disponibles** en el selector (TS1, TS2, TS3, SharePoint, Teams, Azure, GitHub, Jira, SAP, Salesforce, Zoom, Slack)
- ✅ Los accesos ya cargados con valores anteriores se siguen mostrando correctamente
- ✅ Función `migrateData()` automática: detecta versión anterior y adapta sin tocar datos
- ✅ Versioning en localStorage con clave `APP_DATA_VERSION`
- ✅ Backup ahora incluye número de versión en el nombre del archivo
- ✅ Import de backup re-ejecuta migración automáticamente
- ✅ Panel de versión en Config con conteo de registros por módulo
- ✅ KPI de celulares en Dashboard
- ✅ Celulares incluidos en Reportes y exportación PDF

### v1.0 — Versión original
- Módulos: Equipos, Toners, Usuarios, Licencias, Accesos, Movimientos
- Dashboard con KPIs y 6 gráficos
- Export Excel, PDF y backup JSON

---

## 🗄 Claves de localStorage

> **REGLA DE ORO:** Estas claves nunca se renombran ni eliminan. Solo se agregan nuevas.

| Clave localStorage | Módulo | Desde |
|--------------------|--------|-------|
| `cit_equipos` | Inventario de equipos | v1.0 |
| `cit_toners` | Stock de toners | v1.0 |
| `cit_usuarios` | Plantilla de usuarios | v1.0 |
| `cit_licencias` | Licencias de software | v1.0 |
| `cit_accesos` | Control de accesos a sistemas | v1.0 |
| `cit_movimientos` | Historial de movimientos | v1.0 |
| `cit_celulares` | Celulares corporativos | v1.1 ← nuevo |
| `APP_DATA_VERSION` | Versión de estructura de datos | v1.1 ← nuevo |

---

## 🔁 Compatibilidad hacia atrás

La función `migrateData()` en `app.js` se ejecuta automáticamente al cargar el sistema:

```javascript
// Se llama en DOMContentLoaded, ANTES de loadDemoData
migrateData();
```

Qué hace en la migración v1.0 → v1.1:
1. Detecta que `APP_DATA_VERSION` no existe o vale `"1.0"`
2. Crea `cit_celulares` vacío **si no existe** (sin tocar datos existentes)
3. Confirma compatibilidad de accesos (campo texto libre, no se modifica)
4. Marca `APP_DATA_VERSION = "1.1"`

**Idempotente:** puede ejecutarse múltiples veces sin efectos secundarios.

---

## 🚀 Acceso rápido

**Credenciales demo:**
- Usuario: `admin`
- Contraseña: `Cambiar123!`

---

## ⚠ Advertencias de seguridad

> **Este sistema usa login del lado cliente (JavaScript puro).**
>
> Las credenciales están en `app.js` (constante `AUTH`), visibles en el código fuente.
>
> **Reglas antes de publicar en GitHub:**
> - ✖ No subir datos reales de empleados, equipos o licencias al repo
> - ✖ No usar contraseñas reales en el objeto `AUTH`
> - ✔ Los datos viven solo en el **LocalStorage del navegador** del usuario
> - ✔ Exportar backup JSON periódicamente

---

## 📦 Módulos

| Módulo | Descripción |
|--------|-------------|
| **Dashboard** | KPIs (incl. celulares), 6 gráficos, alertas |
| **Equipos** | Alta/Edición/Baja, filtros, export Excel/PDF |
| **Toners** | Stock con alerta crítica, entrada/salida |
| **Usuarios** | Plantilla, checklist alta/baja |
| **Licencias** | Control asignaciones, alertas de vencimiento |
| **Accesos** | Por sistema (Epicor, M365, VPN, TS1, TS2, TS3, etc.) |
| **Celulares** | Marca, modelo, IMEI, línea, operadora, usuario ← v1.1 |
| **Movimientos** | Historial automático |
| **Reportes** | 14 reportes predefinidos exportables |
| **Config** | Backup JSON, versión, exportaciones masivas |

---

## 🌐 Publicar en GitHub Pages

1. Subir `index.html`, `style.css`, `app.js`, `README.md`
2. **Settings → Pages → Source: main / root**
3. Cambiar credenciales en `app.js` → `const AUTH`
4. Limpiar datos demo desde **Config → Limpiar datos demo**

---

## 📄 Licencia

MIT — libre uso con atribución.
