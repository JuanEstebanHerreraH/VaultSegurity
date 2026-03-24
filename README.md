<div align="center">

# 🔐 VaultSecurity

**La Bóveda Digital más Segura del Mundo**

*Una aplicación de escritorio 100% offline con encriptación militar AES-256-CBC*

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Windows](https://img.shields.io/badge/platform-Windows-0078D4.svg)
![Status](https://img.shields.io/badge/status-Active-brightgreen.svg)

</div>

---

## 📑 Tabla de Contenidos

- [🎯 Características Principales](#características-principales)
- [🛡️ Seguridad](#seguridad)
- [⚙️ Tecnologías](#tecnologías)
- [📥 Instalación](#instalación)
- [🚀 Guía de Uso](#guía-de-uso)
- [⚠️ Advertencia Crítica de Seguridad](#advertencia-crítica-de-seguridad)
- [👨‍💻 Desarrollo](#desarrollo)
- [📝 Licencia](#licencia)

---

## 🎯 Características Principales

### 🌐 100% Offline
- **Cero conexión a Internet** por diseño
- Completamente desconectado de la nube
- Protección contra intercepciones y hackeos remotos
- Tu privacidad es totalmente local

### 🔐 Encriptación Militar AES-256-CBC
- Encriptación a nivel byte de todos tus archivos
- Estándar militar de máxima seguridad
- Almacenamiento profundo en `%APPDATA%\vault_encrypted.json`
- Sin la Contraseña Maestra, los datos son imposibles de recuperar

### 📁 Gestión de Archivos Avanzada
- Crear carpetas y álbumes con contraseñas secundarias individuales
- Soporte para fotos, videos y documentos
- Selección y eliminación múltiple
- Interfaz intuitiva y segura

### 📝 Bloc de Notas Blindado
- Soporte de texto enriquecido (RTF)
- Iteración de HTML para listas, colores y fuentes personalizadas
- Exportación nativa a **Microsoft Word (.docx)**
- Edición segura y cifrada

### 🎨 Conversor de Formatos Integrado
- Convierte imágenes a **JPEG, PNG, WEBP o SVG**
- Procesamiento 100% local sin subir datos a servidores externos
- Sin dependencias de terceros
- Rápido y eficiente

### 🎭 Personalización Completa
- Cambia fondos de pantalla con imágenes locales
- Personaliza los colores de la interfaz
- Configura tiempo de Auto-Bloqueo por inactividad
- Experiencia visual única y segura

---

## 🛡️ Seguridad

| Aspecto | Detalles |
|--------|---------|
| **Encriptación** | AES-256-CBC (Estándar Militar) |
| **Almacenamiento** | Archivo `vault_encrypted.json` en `%APPDATA%` |
| **Conectividad** | 100% Offline - Cero acceso a Internet |
| **Arquitectura** | Desktop Nativa sin dependencias en la nube |
| **Contraseña Maestra** | Control total y exclusivo del usuario |

---

## ⚙️ Tecnologías

```
Frontend:     Vanilla JavaScript + HTML5 + CSS3
Backend:      Node.js
Empaquetador: Electron
Encriptación: crypto (Node.js nativo)
Plataforma:   Windows 10/11+
```

---

## 📥 Instalación

### 👤 Para Usuarios Normales (Recomendado)

¡No necesitas saber programar ni instalar herramientas de desarrollo!

1. Ve a la sección **[Releases](../../releases)** a la derecha de este repositorio en GitHub.
2. Descarga **únicamente** el archivo que dice **`VaultSecurity Setup X.X.X.exe`** (el Instalador oficial).
3. Haz doble clic en el instalador descargado.
4. ¡Listo! VaultSecurity se instalará automáticamente y aparecerá un acceso directo en tu escritorio.

> **⚠️ IMPORTANTE:** *Nunca descargues el código fuente (el botón verde "Code -> Download ZIP") ni intentes abrir un ejecutable "suelto" sin usar el Instalador Oficial.* Hacer eso causará errores de librerías faltantes como `La ejecución de código no puede continuar porque no se encontró ffmpeg.dll`. Siempre instala el programa usando el **Setup.exe** oficial desde la pestaña Releases.

---

### 👨‍💻 Para Desarrolladores (Código Fuente)

Si quieres modificar el código o crear tu propia versión desde cero:

#### Requisitos Previos
- **Node.js** v16 o superior ([Descargar aquí](https://nodejs.org/))
- **Git** ([Descargar aquí](https://git-scm.com/))

#### Pasos para compilar
1. Clona este repositorio y entra a la carpeta:
```bash
git clone https://github.com/JuanEstebanHerreraH/VaultSecurity.git
cd VaultSecurity
```

2. Instala las dependencias necesarias:
```bash
npm install
```

3. Inicia la aplicación en modo desarrollo para hacer pruebas:
```bash
npm start
```

4. **Crear el Instalador (`.exe`)**:
```bash
npm run dist
```
> **Nota para desarrolladores en Windows:** Si al ejecutar `npm run dist` te sale un error de *"Cannot create symbolic link"*, debes abrir tu terminal como **Administrador** o activar el **Modo de programador** en la Configuración de Windows.

Al terminar de compilar, el instalador final aparecerá dentro de la nueva carpeta `dist/` (se llamará algo como `VaultSecurity Setup X.X.X.exe`). **Este archivo "Setup" es el único que debes subir a la sección "Releases" de GitHub para que los usuarios lo descarguen.**

---

## 🚀 Guía de Uso

### Primer Inicio
1. Abre VaultSecurity
2. Crea tu **Contraseña Maestra** (recuérdala bien ⚠️)
3. Comienza a añadir archivos, carpetas y notas

### Flujo Básico
- **Crear Carpeta**: Botón "+" → Asigna contraseña secundaria (opcional)
- **Subir Archivos**: Arrastra y suelta o haz clic en "Importar"
- **Notas Seguras**: Accede al bloc de notas y crea contenido enriquecido
- **Convertir Imágenes**: Selecciona una imagen → Elige formato de destino
- **Personalizar**: Ajustes → Fondo, Colores, Auto-Bloqueo

---

## ⚠️ Advertencia Crítica de Seguridad

> ### 🔴 INFORMACIÓN CRUCIAL

**RECUERDA TU CONTRASEÑA MAESTRA**

- ✅ Tu contraseña está cifrada con **AES-256-CBC**
- ✅ Todos tus datos se almacenan de forma **segura y local**
- ✅ **NADIE** sin la contraseña maestra puede acceder

**⚠️ PERO RECUERDA:**

> ### **SI OLVIDAS TU CONTRASEÑA MAESTRA, LOS DATOS SON LITERALMENTE IRRECUPERABLES**

No hay "recuperación de contraseña", no hay "reset", no hay excepciones. Esta es la naturaleza de la encriptación militar. Es tu responsabilidad guardar tu contraseña en un lugar seguro.

**Recomendaciones:**
1. 🔐 Usa una contraseña fuerte (mayúsculas, minúsculas, números, símbolos)
2. 📋 Guarda una copia en un lugar seguro (no en tu PC)
3. 🧠 Memorízala si es posible
4. 🔄 Prueba acceder ocasionalmente para confirmar que la recuerdas

---

## 👨‍💻 Desarrollo

### Estructura del Proyecto
```
VaultSecurity/
├── src/
│   ├── main.js           (Punto de entrada de Electron)
│   ├── crypto/           (Encriptación AES-256)
│   ├── ui/               (Interfaz de usuario)
│   └── modules/          (Funcionalidades principales)
├── assets/               (Imágenes y recursos)
├── package.json
└── README.md
```

### Scripts Disponibles
```bash
npm start         # Inicia en modo desarrollo
npm run dist      # Compila el instalador .exe
npm run dev       # Modo desarrollo con hot-reload
npm test          # Ejecuta pruebas unitarias
```

### Contribuciones
Las contribuciones son bienvenidas. Por favor:
1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la licencia **MIT**. Ver el archivo [LICENSE](LICENSE) para más detalles.

---

<div align="center">

### 🔐 Tu Privacidad es Sagrada

**VaultSecurity** - Donde tu seguridad es nuestra prioridad

[⭐ Dale una estrella si te gustó el proyecto](../../)

</div>
