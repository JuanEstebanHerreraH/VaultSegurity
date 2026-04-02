<div align="center">

<br>

```
██╗   ██╗ █████╗ ██╗   ██╗██╗  ████████╗
██║   ██║██╔══██╗██║   ██║██║  ╚══██╔══╝
██║   ██║███████║██║   ██║██║     ██║   
╚██╗ ██╔╝██╔══██║██║   ██║██║     ██║   
 ╚████╔╝ ██║  ██║╚██████╔╝███████╗██║   
  ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  
```

### `S E C U R I T Y`

<br>

**La bóveda digital más segura — 100% offline, cifrado AES-256-CBC**

<br>

![Version](https://img.shields.io/badge/versión-1.3.3-00ffcc?style=flat-square&labelColor=0a0a0a)
![License](https://img.shields.io/badge/licencia-MIT-00ffcc?style=flat-square&labelColor=0a0a0a)
![Platform](https://img.shields.io/badge/plataforma-Windows-00ffcc?style=flat-square&labelColor=0a0a0a)
![Status](https://img.shields.io/badge/estado-Activo-00ffcc?style=flat-square&labelColor=0a0a0a)
![Offline](https://img.shields.io/badge/modo-100%25%20Offline-00ffcc?style=flat-square&labelColor=0a0a0a)

<br>

> *⚠️ Contraseña de prueba: `admin` — Cámbiala en Ajustes antes de guardar cualquier dato.*

<br>

</div>

---

## 📑 Tabla de Contenidos

- [¿Qué es VaultSecurity?](#-qué-es-vaultsecurity)
- [Características Principales](#-características-principales)
- [Seguridad](#️-seguridad)
- [Tecnologías](#️-tecnologías)
- [Instalación](#-instalación)
- [Guía de Uso](#-guía-de-uso)
- [Eliminar archivos originales de tu PC](#️-eliminar-archivos-originales-de-tu-pc)
- [Advertencia de Seguridad](#️-advertencia-crítica-de-seguridad)
- [Desarrollo](#-desarrollo)
- [Licencia](#-licencia)

---

## 🔐 ¿Qué es VaultSecurity?

VaultSecurity es una aplicación de escritorio **nativa para Windows** que actúa como una bóveda digital personal. Todo lo que guardas dentro — archivos, imágenes, notas, contraseñas — queda **cifrado con AES-256-CBC** directamente en tu equipo. Sin servidores, sin nube forzada, sin telemetría.

```
Tu archivo → cifrado AES-256 → vault_encrypted.json en %APPDATA%
                                        ↑
                          Nadie puede leer esto sin tu contraseña maestra
```

---

## 🎯 Características Principales

### 🌐 100% Offline por Diseño
- Cero conexión a internet requerida para funcionar
- Protección total contra intercepciones remotas
- Tu privacidad vive exclusivamente en tu máquina

### 🔒 Gestión de Archivos y Carpetas
- Carpetas y álbumes con **contraseñas secundarias individuales**
- Soporte para documentos, imágenes, videos y cualquier tipo de archivo
- Selección múltiple y eliminación por lotes
- Sistema de **etiquetas** (🔴 Importante, 🔵 Personal, 💼 Trabajo, 🧾 Facturas...)
- Búsqueda y filtrado por nombre o etiqueta

### 🗑️ Papelera Funcional
- Los elementos eliminados van a la papelera antes de borrarse definitivamente
- **Restaura** archivos eliminados accidentalmente con un clic
- Vacía la papelera para liberar espacio de forma permanente

### 📝 Bloc de Notas Cifrado
- Editor de texto enriquecido (negrita, cursiva, listas, colores, fuentes)
- Guardado automático mientras escribes
- Exportación nativa a **Microsoft Word (.doc)**

### 📅 Calendario con Recordatorios
- Crea eventos con fecha, hora y notas
- Alarmas con sonidos personalizables (beep, campana, alarma, silencio)
- Vista de próximos eventos directamente en el panel de inicio
- Filtro por prioridad (Alta, Media, Baja)

### ✅ Gestor de Tareas
- Listas de tareas integradas con la app
- Marca tareas como completadas
- Filtros: Todas / Pendientes / Completadas

### 📄 Herramientas PDF Avanzadas
- **Fusiona** múltiples PDFs en un solo archivo
- **Visualiza** páginas individualmente en una cuadrícula interactiva
- **Extrae** páginas seleccionadas a un nuevo PDF
- **Elimina** páginas específicas de un documento

### 🎨 Conversor de Formatos
- Convierte imágenes a **JPG, PNG, WEBP, SVG**
- Convierte texto plano `.txt` a **Word** o **PDF imprimible**
- Procesamiento 100% local, sin servidores externos

### ☁️ Integración con Google Drive *(Opcional)*
- Conecta tu cuenta de Google de forma opcional
- Sube archivos y carpetas directamente a tu Drive desde la bóveda
- Modo **Cloud-Only**: mueve archivos solo a la nube para liberar espacio local
- Restaurar desde la papelera con re-subida automática a Drive

### 🔓 Auto-Login
- Opción para omitir la pantalla de bloqueo al iniciar
- Acceso rápido manteniendo la seguridad del cifrado local

### 🔐 Recuperación de Contraseña
- Registra un **email de recuperación** en Ajustes
- Si olvidas tu contraseña, solicita un **código de 6 dígitos** a tu correo
- Restablece el acceso sin perder ningún dato

### 🎭 Personalización Completa
- Color primario de la interfaz totalmente configurable
- Color base de paneles y sidebar personalizable (con presets rápidos)
- Ajuste de opacidad de paneles
- Colores de iconos y fondo de iconos
- Fuentes personalizadas (carga tu propia fuente `.ttf/.woff`)
- Logo de la app personalizable (sidebar + ícono de ventana)
- Nombre de marca en la sidebar editable
- Fondos individuales por sección
- Temporizador de auto-bloqueo configurable

---

## 🛡️ Seguridad

| Aspecto | Detalle |
|---|---|
| **Algoritmo** | AES-256-CBC (Estándar Militar / Gubernamental) |
| **Almacenamiento** | `%APPDATA%\vault_encrypted.json` |
| **Conectividad** | 100% Offline — sin acceso a internet requerido |
| **Arquitectura** | Desktop nativa, sin dependencias en la nube |
| **Contraseña Maestra** | Control total y exclusivo del usuario |
| **Recuperación** | Vía email de recuperación registrado en Ajustes |
| **Drive (opcional)** | OAuth2 de Google — nunca almacena tu contraseña de Google |

---

## ⚙️ Tecnologías

```
Runtime:           Electron (Node.js + Chromium)
Frontend:          Vanilla JavaScript · HTML5 · CSS3
Encriptación:      crypto — módulo nativo de Node.js (AES-256-CBC)
Manipulación PDF:  pdf-lib · pdfjs-dist
Integración Cloud: Google Drive API v3
Compresión:        JSZip
Empaquetador:      electron-builder
Plataforma:        Windows 10 / 11
```

---

## 📥 Instalación

### 👤 Para Usuarios — Sin Conocimientos Técnicos

1. Ve a la pestaña **[Releases](../../releases)** de este repositorio
2. Descarga el archivo `VaultSecurity Setup x.x.x.exe`
3. Ejecuta el instalador y sigue los pasos (Next → Next → Finish)
4. Abre VaultSecurity desde el menú de inicio
5. Contraseña inicial: `admin` — **cámbiala de inmediato en Ajustes**

> No necesitas instalar Node.js ni ninguna dependencia adicional. Funciona como cualquier app nativa de Windows.

---

### 👨‍💻 Para Desarrolladores — Acceso al Código Fuente

#### Requisitos Previos

- [Node.js](https://nodejs.org/) v16 o superior
- [Git](https://git-scm.com/)
- Editor de código (VS Code recomendado)

#### Pasos

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

**4. Compilar instalador `.exe`**
```bash
npm run dist
```

El instalador compilado aparecerá en la carpeta `dist/`.

---

## 🗑️ Eliminar Archivos Originales de tu PC

Cuando subes un archivo a VaultSecurity, la app **lee el archivo, lo convierte internamente y guarda su propia copia cifrada** dentro del vault. El archivo original en tu PC queda intacto — son dos copias independientes.

**Si quieres que el archivo original deje de existir en tu equipo**, debes borrarlo tú manualmente:

```
1. Sube el archivo a VaultSecurity
2. Confirma que aparece correctamente dentro de la bóveda
3. Borra el archivo original desde el Explorador de Windows
4. Vacía la Papelera de Reciclaje de Windows
```

> VaultSecurity nunca borra archivos de tu sistema operativo de forma automática. Tú tienes el control total.

---

## ⚠️ Advertencia Crítica de Seguridad

### ✅ Recuperación disponible — si la configuraste

Si registraste un **email de recuperación en Ajustes**, puedes recuperar el acceso en cualquier momento:

1. En la pantalla de login, haz clic en *¿Olvidaste tu contraseña?*
2. Recibirás un código de 6 dígitos en tu correo
3. Ingrésalo en la app y establece una nueva contraseña maestra

### ❌ Sin email de recuperación — los datos son irrecuperables

> **Si no configuraste recuperación y olvidas tu contraseña maestra, no hay forma de acceder a tus datos.**
> No hay backdoor, no hay reset remoto. Esta es la naturaleza del cifrado AES-256.

**Recomendaciones:**

```
✔  Configura un email de recuperación en Ajustes lo antes posible
✔  Usa una contraseña maestra fuerte (mayúsculas, números, símbolos)
✔  Guarda una copia de tu contraseña en un lugar seguro fuera del PC
✔  Mantén tu email de recuperación siempre accesible y actualizado
```

---

## 👨‍💻 Desarrollo

### Estructura del Proyecto

```
VaultSecurity/
├── main.js               ← Proceso principal de Electron
├── preload.js            ← Bridge seguro IPC entre main y renderer
├── renderer.js           ← Lógica completa del frontend
├── index.html            ← Estructura HTML de la app
├── css/
│   └── style.css         ← Estilos y temas
├── js/
│   └── calculator.js     ← Módulo calculadora
├── assets/               ← Íconos y recursos estáticos
├── node_modules/
│   ├── pdf-lib/          ← Manipulación de PDFs
│   ├── pdfjs-dist/       ← Renderizado de PDFs
│   └── jszip/            ← Compresión
├── package.json
└── README.md
```

### Scripts Disponibles

```bash
npm start        # Inicia en modo desarrollo
npm run dist     # Compila el instalador .exe para distribución
```

### Contribuciones

¡Las contribuciones son bienvenidas!

1. Haz fork del repositorio
2. Crea una rama para tu feature
   ```bash
   git checkout -b feature/NuevaFuncionalidad
   ```
3. Haz commit de tus cambios
   ```bash
   git commit -m "feat: descripción de la nueva funcionalidad"
   ```
4. Push a tu rama
   ```bash
   git push origin feature/NuevaFuncionalidad
   ```
5. Abre un **Pull Request** describiendo los cambios

---

## 📄 Licencia

Este proyecto está bajo la licencia **MIT**. Consulta el archivo [LICENSE](LICENSE) para más detalles.

---

<div align="center">

<br>

```
[ Tu privacidad no debería depender de que confíes en nadie más que en ti mismo ]
```

**VaultSecurity** — Cifrado local. Control total. Cero compromisos.

<br>

[⭐ Dale una estrella si el proyecto te fue útil](../../stargazers)

<br>

</div>
