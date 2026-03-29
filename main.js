/**
 * main.js — VaultSecurity (Anti-Freeze Edition)
 *
 * CORRECCIONES DE CONGELAMIENTO:
 * 1. Todas las operaciones cripto pesadas (cifrar/descifrar la DB)
 *    se delegan a un Worker Thread separado via runCryptoWorker().
 *    Esto libera el hilo principal de Electron y la UI nunca se bloquea.
 *
 * 2. La lectura de archivos grandes en pick-file ahora usa
 *    Promise.all() para paralelizar la lectura, y el toString('base64')
 *    se mantiene asíncrono dentro del worker process de Node.
 *
 * 3. El wake-up automático se dispara solo DESPUÉS de que la operación
 *    pesada termina, forzando el repintado sin necesidad de que el
 *    usuario minimice/maximice la ventana manualmente.
 *
 * 4. Se eliminó el uso de fs.existsSync() en el hilo principal durante
 *    handlers IPC — reemplazado por fs.promises.access() asíncrono.
 */

const { app, BrowserWindow, ipcMain, dialog, nativeImage } = require('electron');
const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Load environment variables (Google Drive & SMTP Secrets)
require('dotenv').config();

const SECRET_DIR = path.join(app.getPath('userData'), 'VaultSecurityDB');
const DB_FILE = path.join(SECRET_DIR, 'vault_encrypted.json');
const RECOVERY_FILE = path.join(SECRET_DIR, 'vault_recovery.json');
const AUTOLOGIN_FILE = path.join(SECRET_DIR, 'autologin.json');

if (!fs.existsSync(SECRET_DIR)) {
    fs.mkdirSync(SECRET_DIR, { recursive: true });
}

// ─────────────────────────────────────────────
// Helper: ejecuta la operación cripto en un
// Worker Thread para NO bloquear el hilo principal.
// ─────────────────────────────────────────────
function runCryptoWorker(workerData) {
    return new Promise((resolve, reject) => {
        const workerPath = path.join(__dirname, 'crypto-worker.js');
        const worker = new Worker(workerPath, { workerData });
        worker.on('message', resolve);
        worker.on('error', (err) => reject(err));
        worker.on('exit', (code) => {
            if (code !== 0) reject(new Error(`Worker salió con código ${code}`));
        });
    });
}

// ─────────────────────────────────────────────
// Helper: fuerza repintado de la ventana
// después de operaciones pesadas.
// ─────────────────────────────────────────────
function forceRepaint() {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return;
    win.setOpacity(0.99);
    setTimeout(() => win.setOpacity(1), 60);
}

// ─────────────────────────────────────────────
// Ventana principal
// ─────────────────────────────────────────────
function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            backgroundThrottling: false   // ← evita que Chromium baje la tasa de repintado
        },
        autoHideMenuBar: true,
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#0a0a0a',
            symbolColor: '#ffffff'
        }
    });
    mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// ─────────────────────────────────────────────
// GUARDAR DB  — cifrado en Worker Thread
// ─────────────────────────────────────────────
ipcMain.handle('save-db', async (event, { dataString, masterPassword }) => {
    try {
        const result = await runCryptoWorker({
            operation: 'encrypt',
            dataString,
            masterPassword
        });

        if (!result.success) return { success: false, error: result.error };

        await fs.promises.writeFile(DB_FILE, result.payload, 'utf8');

        // Repintado automático — el usuario YA NO necesita minimizar/maximizar
        forceRepaint();

        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// ─────────────────────────────────────────────
// LEER DB  — descifrado en Worker Thread
// ─────────────────────────────────────────────
ipcMain.handle('read-db', async (event, masterPassword) => {
    try {
        let exists = false;
        try { await fs.promises.access(DB_FILE); exists = true; } catch (_) {}
        if (!exists) return { success: true, data: null };

        const payloadStr = await fs.promises.readFile(DB_FILE, 'utf8');

        const result = await runCryptoWorker({
            operation: 'decrypt',
            dataString: payloadStr,
            masterPassword
        });

        if (!result.success) return { success: false, error: 'Contraseña incorrecta o base de datos corrupta.' };

        forceRepaint();
        return { success: true, data: result.data };
    } catch (err) {
        return { success: false, error: 'Contraseña incorrecta o base de datos corrupta.' };
    }
});

// ─────────────────────────────────────────────
// DESTRUIR DB
// ─────────────────────────────────────────────
ipcMain.handle('destroy-db', async () => {
    try {
        let exists = false;
        try { await fs.promises.access(DB_FILE); exists = true; } catch (_) {}
        if (exists) await fs.promises.unlink(DB_FILE);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// ─────────────────────────────────────────────
// EXPORTAR ARCHIVO
// ─────────────────────────────────────────────
ipcMain.handle('export-file', async (event, { name, dataURL, type }) => {
    try {
        let filters = [];
        const lower = name.toLowerCase();
        if (type === 'image/jpeg' || lower.endsWith('.jpg') || lower.endsWith('.jpeg'))
            filters = [{ name: 'Imagenes JPG', extensions: ['jpg', 'jpeg'] }];
        else if (type === 'image/png' || lower.endsWith('.png'))
            filters = [{ name: 'Imagenes PNG', extensions: ['png'] }];
        else if (type === 'application/pdf' || lower.endsWith('.pdf'))
            filters = [{ name: 'Documentos PDF', extensions: ['pdf'] }];
        else
            filters = [{ name: 'Todos los Archivos', extensions: ['*'] }];

        const { filePath } = await dialog.showSaveDialog({ defaultPath: name, filters });
        if (filePath) {
            const base64Data = dataURL.split(';base64,').pop();
            await fs.promises.writeFile(filePath, base64Data, { encoding: 'base64' });
            return { success: true };
        }
        return { success: false, cancel: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// ─────────────────────────────────────────────
// SELECCIONAR ARCHIVOS DESDE PC
// Mejora: lectura paralela con Promise.all
// ─────────────────────────────────────────────
ipcMain.handle('pick-file', async (event, { filters, properties }) => {
    try {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: properties || ['openFile', 'multiSelections'],
            filters: filters || []
        });
        if (canceled || filePaths.length === 0) return { success: false, cancel: true };

        // Leer todos los archivos en paralelo — evita bloqueo secuencial
        const files = await Promise.all(filePaths.map(async (fp) => {
            const data = await fs.promises.readFile(fp);
            const ext = path.extname(fp).replace('.', '').toLowerCase();
            const mime =
                ext === 'png' ? 'image/png' :
                (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' :
                ext === 'pdf' ? 'application/pdf' :
                'application/octet-stream';
            return { name: path.basename(fp), dataURL: `data:${mime};base64,${data.toString('base64')}` };
        }));

        return { success: true, files };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// ─────────────────────────────────────────────
// PREVISUALIZAR DOCUMENTO
// ─────────────────────────────────────────────
ipcMain.handle('preview-doc', async (event, { name, dataURL }) => {
    try {
        const previewWin = new BrowserWindow({
            width: 800, height: 600, title: name, autoHideMenuBar: true
        });
        previewWin.loadURL(dataURL);
        return true;
    } catch (_) { return false; }
});

// ─────────────────────────────────────────────
// CAMBIAR ÍCONO
// ─────────────────────────────────────────────
ipcMain.handle('change-icon', async (event, dataURL) => {
    try {
        const win = BrowserWindow.getAllWindows()[0];
        if (win) {
            const img = dataURL ? nativeImage.createFromDataURL(dataURL) : nativeImage.createEmpty();
            win.setIcon(img);
        }
        return true;
    } catch (_) { return false; }
});

// ─────────────────────────────────────────────
// DESCARGAR DESDE URL
// ─────────────────────────────────────────────
ipcMain.handle('fetch-url', async (event, url) => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mime = response.headers.get('content-type') || 'application/octet-stream';
        const dataURL = `data:${mime};base64,${buffer.toString('base64')}`;
        let filename = url.split('/').pop().split('?')[0] || 'descarga';
        if (!filename.includes('.')) {
            if (mime.includes('pdf')) filename += '.pdf';
            else if (mime.includes('jpeg')) filename += '.jpg';
            else if (mime.includes('png')) filename += '.png';
        }
        return { success: true, file: { name: filename, dataURL } };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// ─────────────────────────────────────────────
// WAKE-UP MANUAL (ahora también se llama
// automáticamente desde save-db y read-db)
// ─────────────────────────────────────────────
ipcMain.handle('wake-up', async () => {
    forceRepaint();
    return true;
});

// ─────────────────────────────────────────────
// GUARDAR RECUPERACIÓN — Worker Thread
// ─────────────────────────────────────────────
ipcMain.handle('save-recovery', async (event, { email }) => {
    try {
        await fs.promises.writeFile(RECOVERY_FILE, JSON.stringify({ email }), 'utf8');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// ─────────────────────────────────────────────
// LEER CONFIGURACIÓN DE RECUPERACIÓN
// ─────────────────────────────────────────────
ipcMain.handle('read-recovery', async () => {
    try {
        let exists = false;
        try { await fs.promises.access(RECOVERY_FILE); exists = true; } catch (_) {}
        if (!exists) return { success: true, data: null };
        const raw = await fs.promises.readFile(RECOVERY_FILE, 'utf8');
        return { success: true, data: JSON.parse(raw) };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// ─────────────────────────────────────────────
// INTENTAR RECUPERACIÓN — Worker Thread
// ─────────────────────────────────────────────
ipcMain.handle('attempt-recovery', async (event, { answer }) => {
    try {
        let exists = false;
        try { await fs.promises.access(RECOVERY_FILE); exists = true; } catch (_) {}
        if (!exists) return { success: false, error: 'Sin configuración de recuperación.' };

        const raw = await fs.promises.readFile(RECOVERY_FILE, 'utf8');

        const result = await runCryptoWorker({
            operation: 'decrypt-recovery',
            dataString: raw,
            answer
        });

        if (!result.success) return { success: false, error: 'Respuesta incorrecta.' };
        return { success: true, password: result.password };
    } catch (_) {
        return { success: false, error: 'Respuesta incorrecta.' };
    }
});

// ─────────────────────────────────────────────
// GOOGLE DRIVE — OAuth2 + API handlers
// ─────────────────────────────────────────────
const { shell } = require('electron');
const http = require('http');
const { URL } = require('url');

const DRIVE_REDIRECT_URI = 'http://localhost:42813';
const DRIVE_TOKEN_FILE = path.join(SECRET_DIR, 'drive_token.json');
const DRIVE_SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
].join(' ');

let DRIVE_CLIENT_ID = process.env.DRIVE_CLIENT_ID || '';
let DRIVE_CLIENT_SECRET = process.env.DRIVE_CLIENT_SECRET || '';

// Leer credenciales desde el JSON si existe (Prioridad sobre .env)
try {
    const credsFile = fs.readdirSync(__dirname).find(f => f.startsWith('client_secret_') && f.endsWith('.json'));
    if(credsFile) {
        const data = JSON.parse(fs.readFileSync(path.join(__dirname, credsFile), 'utf8'));
        const info = data.installed || data.web;
        if(info) {
            DRIVE_CLIENT_ID = info.client_id;
            DRIVE_CLIENT_SECRET = info.client_secret;
        }
    }
} catch(_) {}

let driveTokens = null;

// Load saved tokens on startup
(async () => {
    try {
        await fs.promises.access(DRIVE_TOKEN_FILE);
        const raw = await fs.promises.readFile(DRIVE_TOKEN_FILE, 'utf8');
        driveTokens = JSON.parse(raw);
    } catch (_) {}
})();

async function refreshDriveToken() {
    if (!driveTokens || !driveTokens.refresh_token) return false;
    try {
        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: DRIVE_CLIENT_ID,
                client_secret: DRIVE_CLIENT_SECRET,
                refresh_token: driveTokens.refresh_token,
                grant_type: 'refresh_token'
            })
        });
        const data = await res.json();
        if (data.access_token) {
            driveTokens.access_token = data.access_token;
            driveTokens.expiry_date = Date.now() + (data.expires_in * 1000);
            await fs.promises.writeFile(DRIVE_TOKEN_FILE, JSON.stringify(driveTokens), 'utf8');
            return true;
        }
        return false;
    } catch (_) { return false; }
}

async function getDriveToken() {
    if (!driveTokens) return null;
    if (!driveTokens.expiry_date || Date.now() > driveTokens.expiry_date - 60000) {
        const ok = await refreshDriveToken();
        if (!ok) return null;
    }
    return driveTokens.access_token;
}

ipcMain.handle('drive-connect', async () => {
    return new Promise((resolve) => {
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${DRIVE_CLIENT_ID}&` +
            `redirect_uri=${encodeURIComponent(DRIVE_REDIRECT_URI)}&` +
            `response_type=code&` +
            `scope=${encodeURIComponent(DRIVE_SCOPES)}&` +
            `access_type=offline&prompt=consent`;

        const server = http.createServer(async (req, res) => {
            try {
                const urlObj = new URL(req.url, DRIVE_REDIRECT_URI);
                const code = urlObj.searchParams.get('code');
                if (!code) { res.end('Error: no code'); server.close(); return resolve({ success: false }); }

                res.end('<html><body style="background:#0a0a0a;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><h2>✅ Conectado a Google Drive.<br>Puedes cerrar esta ventana.</h2></body></html>');
                server.close();

                const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        code,
                        client_id: DRIVE_CLIENT_ID,
                        client_secret: DRIVE_CLIENT_SECRET,
                        redirect_uri: DRIVE_REDIRECT_URI,
                        grant_type: 'authorization_code'
                    })
                });
                const tokens = await tokenRes.json();
                if (!tokens.access_token) return resolve({ success: false, error: 'Token error' });

                tokens.expiry_date = Date.now() + (tokens.expires_in * 1000);
                driveTokens = tokens;
                await fs.promises.writeFile(DRIVE_TOKEN_FILE, JSON.stringify(tokens), 'utf8');

                // Get user info
                const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                    headers: { Authorization: `Bearer ${tokens.access_token}` }
                });
                const user = await userRes.json();
                resolve({ success: true, email: user.email, name: user.name, picture: user.picture });
            } catch (err) {
                server.close();
                resolve({ success: false, error: err.message });
            }
        });

        server.listen(42813, () => shell.openExternal(authUrl));
        server.on('error', () => resolve({ success: false, error: 'Puerto ocupado' }));
    });
});

ipcMain.handle('drive-status', async () => {
    try {
        const token = await getDriveToken();
        if (!token) return { connected: false };

        const [aboutRes, userRes] = await Promise.all([
            fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota', {
                headers: { Authorization: `Bearer ${token}` }
            }),
            fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${token}` }
            })
        ]);

        if (!aboutRes.ok) {
            driveTokens = null;
            return { connected: false };
        }

        const about = await aboutRes.json();
        const user = await userRes.json();
        const q = about.storageQuota;

        return {
            connected: true,
            email: user.email,
            name: user.name,
            picture: user.picture,
            usedBytes: parseInt(q.usage || 0),
            totalBytes: parseInt(q.limit || 0)
        };
    } catch (_) { return { connected: false }; }
});

ipcMain.handle('drive-disconnect', async () => {
    driveTokens = null;
    try { await fs.promises.unlink(DRIVE_TOKEN_FILE); } catch (_) {}
    return { success: true };
});

ipcMain.handle('drive-upload', async (event, { name, dataURL, folderId }) => {
    try {
        const token = await getDriveToken();
        if (!token) return { success: false, error: 'No autenticado' };

        const base64Data = dataURL.split(';base64,').pop();
        const buffer = Buffer.from(base64Data, 'base64');
        const mimeRaw = dataURL.split(';')[0].replace('data:', '');

        const metadata = { name };
        if (folderId) metadata.parents = [folderId];

        // Multipart upload
        const boundary = '-------vault_boundary_' + Date.now();
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelim = `\r\n--${boundary}--`;

        const metaPart = delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata);

        const mediaPart = delimiter +
            `Content-Type: ${mimeRaw}\r\n` +
            'Content-Transfer-Encoding: base64\r\n\r\n' +
            base64Data;

        const body = metaPart + mediaPart + closeDelim;

        const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body
        });

        if (!uploadRes.ok) {
            const err = await uploadRes.text();
            return { success: false, error: err };
        }

        const file = await uploadRes.json();
        return { success: true, fileId: file.id, name: file.name, link: file.webViewLink };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('drive-create-folder', async (event, { name }) => {
    try {
        const token = await getDriveToken();
        if (!token) return { success: false, error: 'No autenticado' };

        const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                mimeType: 'application/vnd.google-apps.folder'
            })
        });

        if (!res.ok) return { success: false, error: await res.text() };
        const folder = await res.json();
        return { success: true, folderId: folder.id, name: folder.name };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('drive-delete', async (event, { fileId }) => {
    try {
        const token = await getDriveToken();
        if (!token) return { success: false, error: 'No autenticado' };

        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });

        if (res.status === 204 || res.ok) return { success: true };
        return { success: false, error: await res.text() };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// ─────────────────────────────────────────────
// AUTO-LOGIN PERSISTENCE
// ─────────────────────────────────────────────
ipcMain.handle('save-autologin', async (event, { masterPassword, enabled }) => {
    try {
        if (!enabled) {
            if (fs.existsSync(AUTOLOGIN_FILE)) await fs.promises.unlink(AUTOLOGIN_FILE);
            return { success: true };
        }
        await fs.promises.writeFile(AUTOLOGIN_FILE, JSON.stringify({ masterPassword }), 'utf8');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('read-autologin', async () => {
    try {
        if (!fs.existsSync(AUTOLOGIN_FILE)) return { success: true, data: null };
        const raw = await fs.promises.readFile(AUTOLOGIN_FILE, 'utf8');
        return { success: true, data: JSON.parse(raw) };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// ─────────────────────────────────────────────
// WHATSAPP BOT — whatsapp-web.js integration
// ─────────────────────────────────────────────
let waClient = null;
let waStatus = 'disconnected'; // disconnected | connecting | ready
let vaultSnapshot = null; // in-memory vault data snapshot for bot commands

// Renderer envía el snapshot del vault cada vez que lo desbloquea
ipcMain.handle('wa-set-vault-data', async (event, data) => {
    vaultSnapshot = data;
    return { success: true };
});

ipcMain.handle('wa-get-status', async () => {
    return { status: waStatus };
});

ipcMain.handle('wa-start', async () => {
    if (waClient) return { success: false, error: 'Ya hay un cliente activo.' };

    try {
        const { Client, LocalAuth } = require('whatsapp-web.js');
        const QRCode = require('qrcode');
        const win = BrowserWindow.getAllWindows()[0];

        waStatus = 'connecting';
        if (win) win.webContents.send('wa-status-change', 'connecting');

        waClient = new Client({
            authStrategy: new LocalAuth({
                dataPath: path.join(SECRET_DIR, 'wa_session')
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu'
                ]
            }
        });

        waClient.on('qr', async (qr) => {
            try {
                const qrDataUrl = await QRCode.toDataURL(qr, {
                    width: 256,
                    margin: 2,
                    color: { dark: '#000000', light: '#ffffff' }
                });
                if (win) win.webContents.send('wa-qr', qrDataUrl);
            } catch (e) {
                console.error('QR generation error:', e);
            }
        });

        waClient.on('ready', () => {
            waStatus = 'ready';
            if (win) win.webContents.send('wa-status-change', 'ready');
        });

        waClient.on('auth_failure', () => {
            waStatus = 'disconnected';
            waClient = null;
            if (win) win.webContents.send('wa-status-change', 'auth_failure');
        });

        waClient.on('disconnected', (reason) => {
            waStatus = 'disconnected';
            waClient = null;
            if (win) win.webContents.send('wa-status-change', 'disconnected');
        });

        waClient.on('message', async (msg) => {
            if (!vaultSnapshot) return;
            // Solo responde a mensajes del mismo usuario (mensajes a sí mismo)
            try {
                const selfId = waClient.info && waClient.info.wid ? waClient.info.wid._serialized : null;
                if (selfId && msg.from !== selfId) return;
            } catch (_) {}

            const body = (msg.body || '').trim();
            const bodyLow = body.toLowerCase();
            let reply = '';

            if (bodyLow === '!ayuda') {
                reply = `🔐 *VaultSecurity Bot* — Comandos disponibles:\n\n` +
                    `📁 *!archivos* — Lista tus archivos guardados\n` +
                    `📁 *!ver archivos* — Detalle completo de archivos\n` +
                    `🖼 *!imagenes* — Lista tus imágenes\n` +
                    `📝 *!notas* — Lista tus notas\n` +
                    `📝 *!ver notas* — Contenido de cada nota\n` +
                    `📅 *!eventos* — Próximos eventos del calendario\n` +
                    `✅ *!tareas* — Lista de tareas pendientes y completadas\n` +
                    `📊 *!estado* — Resumen general de tu bóveda\n` +
                    `🗑 *!eliminar archivo [nombre]* — Mover archivo a papelera\n` +
                    `🗑 *!eliminar nota [título]* — Eliminar nota\n` +
                    `🗑 *!eliminar evento [título]* — Eliminar evento`;

            } else if (bodyLow === '!estado') {
                const docsCount = (vaultSnapshot.folders || []).reduce((a, f) => a + (f.docs ? f.docs.length : 0), 0);
                const imgsCount = (vaultSnapshot.albums || []).reduce((a, a2) => a + (a2.imgs ? a2.imgs.length : 0), 0);
                const notesCount = (vaultSnapshot.notes || []).reduce((a, n) => a + (n.noteItems ? n.noteItems.length : 0), 0);
                const tasksCount = (vaultSnapshot.tasks || []).length;
                const pendingCount = (vaultSnapshot.tasks || []).filter(t => !t.done).length;
                const eventsCount = (vaultSnapshot.calendarEvents || []).length;
                reply = `📊 *Resumen de tu Bóveda:*\n\n` +
                    `📁 Archivos: ${docsCount}\n` +
                    `🖼 Imágenes: ${imgsCount}\n` +
                    `📝 Notas: ${notesCount}\n` +
                    `📅 Eventos: ${eventsCount}\n` +
                    `✅ Tareas: ${tasksCount} (${pendingCount} pendientes)`;

            } else if (bodyLow === '!archivos') {
                const docs = (vaultSnapshot.folders || []).flatMap(f =>
                    (f.docs || []).map(d => d.name)
                );
                reply = docs.length
                    ? `📁 *Archivos guardados (${docs.length}):*\n` + docs.map((n, i) => `${i + 1}. ${n}`).join('\n')
                    : '📁 No hay archivos guardados en la bóveda.';

            } else if (bodyLow === '!ver archivos') {
                const items = (vaultSnapshot.folders || []).flatMap(f =>
                    (f.docs || []).map(d => `• *${d.name}*\n  Carpeta: _${f.name}_`)
                );
                reply = items.length
                    ? `📁 *Detalle de Archivos:*\n\n` + items.join('\n\n')
                    : '📁 No hay archivos.';

            } else if (bodyLow === '!imagenes') {
                const imgs = (vaultSnapshot.albums || []).flatMap(a =>
                    (a.imgs || []).map(img => img.name)
                );
                reply = imgs.length
                    ? `🖼 *Imágenes guardadas (${imgs.length}):*\n` + imgs.map((n, i) => `${i + 1}. ${n}`).join('\n')
                    : '🖼 No hay imágenes guardadas.';

            } else if (bodyLow === '!notas') {
                const noteNames = (vaultSnapshot.notes || []).map(n => n.name);
                reply = noteNames.length
                    ? `📝 *Notas (${noteNames.length}):*\n` + noteNames.map((n, i) => `${i + 1}. ${n}`).join('\n')
                    : '📝 No hay notas guardadas.';

            } else if (bodyLow === '!ver notas') {
                const noteItems = (vaultSnapshot.notes || []).flatMap(n =>
                    (n.noteItems || []).map(ni => {
                        const raw = (ni.content || '').replace(/<[^>]+>/g, '').trim();
                        const preview = raw.length > 300 ? raw.slice(0, 300) + '...' : raw;
                        return `📝 *${ni.title || 'Sin título'}*\n${preview}`;
                    })
                );
                reply = noteItems.length
                    ? `📝 *Contenido de Notas:*\n\n` + noteItems.join('\n\n─────────────\n\n')
                    : '📝 No hay notas.';

            } else if (bodyLow === '!eventos') {
                const now = new Date();
                const upcoming = (vaultSnapshot.calendarEvents || [])
                    .filter(e => new Date(e.date + 'T' + (e.time || '23:59')) >= now)
                    .sort((a, b) => new Date(a.date + 'T' + (a.time || '00:00')) - new Date(b.date + 'T' + (b.time || '00:00')))
                    .slice(0, 10);
                reply = upcoming.length
                    ? `📅 *Próximos Eventos (${upcoming.length}):*\n\n` +
                      upcoming.map(e => `• *${e.title}*\n  📆 ${e.date}${e.time ? ' — ' + e.time : ''}${e.notes ? '\n  📌 ' + e.notes : ''}`).join('\n\n')
                    : '📅 No hay eventos próximos en tu calendario.';

            } else if (bodyLow === '!tareas') {
                const tasks = vaultSnapshot.tasks || [];
                const pending = tasks.filter(t => !t.done);
                const done = tasks.filter(t => t.done);
                if (tasks.length === 0) {
                    reply = '✅ No hay tareas guardadas.';
                } else {
                    reply = `✅ *Lista de Tareas:*\n\n` +
                        `⏳ *Pendientes (${pending.length}):*\n` +
                        (pending.length ? pending.map(t => `• ${t.text}`).join('\n') : '_Ninguna_') +
                        `\n\n✔ *Completadas (${done.length}):*\n` +
                        (done.length ? done.map(t => `• ~${t.text}~`).join('\n') : '_Ninguna_');
                }

            } else if (bodyLow.startsWith('!eliminar archivo ')) {
                const name = body.slice('!eliminar archivo '.length).trim();
                if (win) win.webContents.send('wa-command', { action: 'delete-file', name });
                reply = `🗑 Solicitud enviada para mover *${name}* a la papelera.`;

            } else if (bodyLow.startsWith('!eliminar nota ')) {
                const name = body.slice('!eliminar nota '.length).trim();
                if (win) win.webContents.send('wa-command', { action: 'delete-note', name });
                reply = `🗑 Solicitud enviada para eliminar la nota *${name}*.`;

            } else if (bodyLow.startsWith('!eliminar evento ')) {
                const name = body.slice('!eliminar evento '.length).trim();
                if (win) win.webContents.send('wa-command', { action: 'delete-event', name });
                reply = `🗑 Solicitud enviada para eliminar el evento *${name}*.`;
            }

            if (reply) {
                try { await msg.reply(reply); } catch (e) { console.error('WA reply error:', e); }
            }
        });

        await waClient.initialize();
        return { success: true };
    } catch (err) {
        waStatus = 'disconnected';
        waClient = null;
        console.error('WhatsApp init error:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('wa-stop', async () => {
    if (waClient) {
        try { await waClient.destroy(); } catch (_) {}
        waClient = null;
    }
    waStatus = 'disconnected';
    return { success: true };
});

ipcMain.handle('send-recovery-email', async (event, { to, code }) => {
    try {
        const nodemailer = require('nodemailer');

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const mailOptions = {
            from: process.env.SMTP_FROM || '"VaultSecurity Support" <support@vaultsecurity.com>',
            to: to,
            subject: 'Código de Recuperación - VaultSecurity',
            html: `
                <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #00ffcc; text-align: center;">VaultSecurity</h2>
                    <p>Has solicitado un código de recuperación para tu bóveda segura.</p>
                    <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 30px; font-weight: bold; letter-spacing: 5px; border-radius: 5px; margin: 20px 0;">
                        ${code}
                    </div>
                    <p style="font-size: 12px; color: #666; text-align: center;">Si no has solicitado este código, por favor ignora este correo.</p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Nodemailer Error:', error);
        return { success: false, error: error.message };
    }
});
