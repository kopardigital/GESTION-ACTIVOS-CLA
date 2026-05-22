# CLADAN IT Control

Sistema de gestión interna de inventario IT, toners, usuarios, licencias y accesos. 100% estático, sin backend, publicable en **GitHub Pages**.

![Version](https://img.shields.io/badge/versión-1.0-1d4ed8?style=for-the-badge)
![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-Ready-10b981?style=for-the-badge)
![Sin backend](https://img.shields.io/badge/Sin_backend-LocalStorage-f59e0b?style=for-the-badge)

---

## 🚀 Acceso rápido

Abrí `index.html` directamente en el navegador o publicá en GitHub Pages.

**Credenciales demo:**
- Usuario: `admin`
- Contraseña: `Cambiar123!`

---

## ⚠ Advertencias de seguridad

> **Este sistema usa login del lado cliente (JavaScript puro).**
>
> Las credenciales están en `app.js` (constante `AUTH`), visibles en el código fuente. Cualquier persona con acceso al repositorio puede leerlas.
>
> **Reglas antes de publicar en GitHub:**
> - ✖ No subir datos reales de empleados, equipos o licencias.
> - ✖ No usar contraseñas reales en el objeto `AUTH`.
> - ✔ Los datos del sistema viven solo en el **LocalStorage del navegador** del usuario.
> - ✔ Exportar backup JSON periódicamente para resguardar la información.
>
> **Para seguridad real** se requiere backend con base de datos, autenticación con hash de contraseñas y HTTPS. Este sistema es adecuado solo para entornos de confianza o uso personal.

---

## 📁 Estructura

```
cladan-it/
├── index.html    ← Estructura HTML completa
├── style.css     ← Estilos y diseño responsive
├── app.js        ← Lógica, módulos, exports, datos demo
└── README.md     ← Esta documentación
```

---

## 📦 Módulos

| Módulo | Funcionalidades |
|--------|----------------|
| **Dashboard** | KPIs, 6 gráficos, alertas automáticas |
| **Equipos** | Alta/Edición/Baja, filtros, export Excel/PDF |
| **Toners** | Stock con alerta crítica, entrada/salida, historial |
| **Usuarios** | Plantilla, checklist alta/baja, filtros |
| **Licencias** | Control de asignaciones, alertas de vencimiento |
| **Accesos** | Registro por sistema (Epicor, M365, VPN, etc.) |
| **Movimientos** | Historial automático de todas las operaciones |
| **Reportes** | 12 reportes predefinidos exportables |
| **Config** | Backup JSON, importar, limpiar, exportaciones masivas |

---

## 🔔 Alertas automáticas

El dashboard detecta y muestra alertas de:
- Toner bajo stock mínimo
- Notebooks disponibles escasas
- Usuario activo sin equipo
- Equipo asignado a usuario dado de baja
- Licencias próximas a vencer (90 días)
- Licencias vencidas
- Licencias sin disponibilidad
- Accesos activos de usuarios dados de baja
- Equipos sin número de serie

---

## 💾 Almacenamiento

Todo se guarda en `localStorage` del navegador con estas claves:

| Clave | Contenido |
|-------|-----------|
| `cit_equipos` | Inventario de equipos |
| `cit_toners` | Stock de toners |
| `cit_usuarios` | Plantilla de usuarios |
| `cit_licencias` | Licencias de software |
| `cit_accesos` | Control de accesos |
| `cit_movimientos` | Historial de movimientos |

**Importante:** Los datos no se sincronizan entre navegadores ni dispositivos. Usar el backup JSON para transferir datos.

---

## 🌐 Publicar en GitHub Pages

1. Crear repositorio en GitHub.
2. Subir `index.html`, `style.css`, `app.js`, `README.md`.
3. Ir a **Settings → Pages → Source: main / root**.
4. Acceder en `https://TU-USUARIO.github.io/NOMBRE-REPO/`.

### Antes de publicar
- [ ] Cambiar credenciales en `app.js` → `const AUTH = { user: '...', pass: '...' }`
- [ ] Limpiar datos demo desde **Config → Limpiar datos demo**
- [ ] No incluir en el repositorio archivos con datos reales

---

## 🛠 Tecnologías

| Librería | Versión | Uso |
|----------|---------|-----|
| SheetJS (xlsx) | 0.18.5 | Importar/exportar Excel |
| Chart.js | 4.4.1 | Gráficos del dashboard |
| html2canvas | 1.4.1 | Captura para PDF |
| jsPDF | 2.5.1 | Generación de PDF |

Todas las librerías se cargan por CDN desde `cdnjs.cloudflare.com`.

---

## ⚙ Configuración

En `app.js`, modificar según necesidades:

```javascript
// Credenciales de acceso (¡NO usar reales en GitHub público!)
const AUTH = { user: 'admin', pass: 'Cambiar123!' };

// Claves de localStorage (no cambiar si ya hay datos guardados)
const KEYS = {
  equipos: 'cit_equipos',
  toners:  'cit_toners',
  ...
};
```

---

## 💡 Limitaciones

- Sin sincronización entre usuarios/dispositivos.
- El login no protege los datos — son visibles desde DevTools.
- LocalStorage tiene límite de ~5MB por dominio.
- El PDF se genera en el cliente; en dispositivos lentos puede demorar.
- Sin historial de versiones de datos.

Para superar estas limitaciones se requiere implementar backend.

---

## 📄 Licencia

MIT — libre uso con atribución.
