<div align="center">

# 🔐 VaultSecurity

### La Bóveda Digital más Segura del Mundo

*Archivos · Notas · Fotos · Videos · Documentos — 100% Offline*

---

![Version](https://img.shields.io/badge/versión-1.0.0-blue?style=for-the-badge)
![Windows](https://img.shields.io/badge/Windows_10%2F11-0078D4?style=for-the-badge&logo=windows&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![License](https://img.shields.io/badge/licencia-MIT-brightgreen?style=for-the-badge)

</div>

---

## 📌 ¿Qué es VaultSecurity?

VaultSecurity es una aplicación de escritorio nativa para Windows que protege tus archivos, fotos, videos, documentos y notas personales con encriptación militar **AES-256-CBC**. Funciona **100% offline**, sin ninguna conexión a internet, sin almacenamiento en la nube y sin servidores externos. Todo queda en tu computador y bajo tu control absoluto.

> 🔑 **Contraseña de prueba: `admin`** — Cámbiala en Ajustes antes de guardar información real.

---

## 🧩 Características principales

| Ícono | Función | Descripción |
|:---:|---|---|
| 🌐 | **100% Offline** | Cero conexión a internet, cero nube, cero servidores externos |
| 🔐 | **Encriptación AES-256-CBC** | Estándar militar a nivel byte en todos tus archivos |
| 📁 | **Gestión de Archivos** | Carpetas con contraseñas secundarias, soporte fotos, videos y docs |
| 📝 | **Bloc de Notas Blindado** | Texto enriquecido RTF con exportación nativa a Word (.docx) |
| 🎨 | **Conversor de Formatos** | Convierte imágenes a JPG, PNG, WEBP, Word o SVG — todo local |
| 🎭 | **Personalización** | Fondos, colores de interfaz y Auto-Bloqueo por inactividad |
| ⏱️ | **Auto-Bloqueo** | Bloqueo automático configurable tras tiempo de inactividad |

---

## 🛡️ Seguridad

| Aspecto | Detalle |
|---|---|
| **Encriptación** | AES-256-CBC (Estándar Militar) |
| **Almacenamiento** | `%APPDATA%\vault_encrypted.json` — solo en tu equipo |
| **Conectividad** | 100% Offline — sin acceso a internet por diseño |
| **Arquitectura** | Desktop nativa sin dependencias en la nube |
| **Contraseña Maestra** | Control total y exclusivo del usuario — sin recuperación |

---

## ⚙️ Stack tecnológico

```
Frontend:     Vanilla JavaScript + HTML5 + CSS3
Backend:      Node.js
Empaquetador: Electron
Encriptación: crypto (módulo nativo de Node.js)
Plataforma:   Windows 10 / 11+
```

---

## 📥 Instalación

### 👤 Para usuarios (sin conocimientos técnicos)

1. Ve a la pestaña **[Releases](../../releases)** de este repositorio
2. Descarga el archivo: **`VaultSecurity Setup x.x.x.exe`**
3. Haz doble clic en el instalador
4. Sigue los pasos: Next → Next → Finish
5. ¡Listo! VaultSecurity aparecerá en tu menú de inicio

**No necesitas instalar Node.js ni nada adicional.** Funciona como cualquier app nativa de Windows.

> 🔑 Contraseña de prueba: **`admin`** — cámbiala en Ajustes al iniciar.

---

### 👨‍💻 Para desarrolladores (código fuente)

#### Requisitos previos
- Node.js v16+ → [Descargar](https://nodejs.org/)
- Git → [Descargar](https://git-scm.com/)
- Editor de código (VS Code recomendado)

**1. Clonar el repositorio**
```bash
git clone https://github.com/JuanEstebanHerreraH/VaultSecurity.git
cd VaultSecurity
```

**2. Instalar dependencias**
```bash
npm install
```

**3. Iniciar en modo desarrollo**
```bash
npm start
```

**4. Compilar el instalador .exe**
```bash
npm run dist
# Salida: carpeta dist/
```

---

## 🚀 Guía de uso

### Primer inicio
1. Abre VaultSecurity
2. Crea tu **Contraseña Maestra** (guárdala bien ⚠️)
3. Comienza a añadir archivos, carpetas y notas seguras

### Flujo básico

| Acción | Pasos |
|---|---|
| **Crear carpeta** | Botón "+" → Asigna contraseña secundaria (opcional) |
| **Subir archivos** | Arrastra y suelta, o clic en "Importar" |
| **Notas seguras** | Bloc de notas → crea contenido enriquecido → exporta a Word |
| **Convertir imagen** | Selecciona imagen → elige formato destino → guarda |
| **Personalizar** | Ajustes → Fondo, Colores, tiempo de Auto-Bloqueo |

---

## ⚠️ Advertencia crítica de seguridad

> ### 🔴 LEE ESTO ANTES DE USAR LA APP

Tu contraseña maestra está cifrada con **AES-256-CBC**. Esto significa:

- ✅ **NADIE** sin la contraseña puede acceder a tus datos
- ✅ Tus datos son completamente locales y privados
- ❌ **NO existe recuperación de contraseña**
- ❌ **NO existe reset**
- ❌ **NO hay excepciones**

> ### ⚠️ SI OLVIDAS TU CONTRASEÑA MAESTRA, LOS DATOS SON IRRECUPERABLES

**Recomendaciones:**
1. 🔐 Usa una contraseña fuerte (mayúsculas, minúsculas, números, símbolos)
2. 📋 Guarda una copia en un lugar físico seguro (no en tu PC)
3. 🧠 Memorízala
4. 🔄 Prueba acceder ocasionalmente para confirmar que la recuerdas

---

## 📁 Estructura del proyecto

```
VaultSecurity/
├── 📁 src/
│   ├── main.js               # Punto de entrada de Electron
│   ├── 📁 crypto/            # Encriptación AES-256
│   ├── 📁 ui/                # Interfaz de usuario
│   └── 📁 modules/           # Funcionalidades principales
├── 📁 assets/                # Imágenes y recursos
├── package.json
└── README.md
```

### Scripts disponibles

```bash
npm start         # Inicia en modo desarrollo
npm run dist      # Compila el instalador .exe
npm run dev       # Modo desarrollo con hot-reload
npm test          # Ejecuta pruebas unitarias
```

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Para contribuir:

1. Haz **fork** del proyecto
2. Crea tu rama: `git checkout -b feature/NuevaFuncion`
3. Commit: `git commit -m 'feat: agrega NuevaFuncion'`
4. Push: `git push origin feature/NuevaFuncion`
5. Abre un **Pull Request**

---

## 📄 Licencia

Este proyecto está bajo la licencia **MIT**. Ver el archivo [LICENSE](LICENSE) para más detalles.

---

<div align="center">

### 🔐 Tu Privacidad es Sagrada

**VaultSecurity** — Donde tu seguridad es nuestra prioridad

[⭐ Dale una estrella si te fue útil](../../)

</div>
