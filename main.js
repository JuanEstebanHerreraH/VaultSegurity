const { app, BrowserWindow, ipcMain, dialog, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const SECRET_DIR = path.join(app.getPath('userData'), 'VaultSecurityDB');
const DB_FILE = path.join(SECRET_DIR, 'vault_encrypted.json');

if (!fs.existsSync(SECRET_DIR)) {
    fs.mkdirSync(SECRET_DIR, { recursive: true });
}

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
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
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('save-db', async (event, { dataString, masterPassword }) => {
    try {
        const key = crypto.createHash('sha256').update(masterPassword).digest();
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(dataString, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const payload = JSON.stringify({ iv: iv.toString('hex'), data: encrypted });
        await fs.promises.writeFile(DB_FILE, payload, 'utf8');
        return { success: true };
    } catch(err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('read-db', async (event, masterPassword) => {
    try {
        if(!fs.existsSync(DB_FILE)) return { success: true, data: null };
        const payloadStr = await fs.promises.readFile(DB_FILE, 'utf8');
        const payload = JSON.parse(payloadStr);
        const key = crypto.createHash('sha256').update(masterPassword).digest();
        const iv = Buffer.from(payload.iv, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(payload.data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return { success: true, data: decrypted };
    } catch(err) {
        return { success: false, error: "Contraseña incorrecta o base de datos corrupta." };
    }
});

ipcMain.handle('destroy-db', async (event) => {
    try {
        if(fs.existsSync(DB_FILE)) {
            await fs.promises.unlink(DB_FILE);
        }
        return { success: true };
    } catch(err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('export-file', async (event, { name, dataURL, type }) => {
    try {
        let filters = [];
        if(type === 'image/jpeg' || name.toLowerCase().endsWith('.jpg') || name.toLowerCase().endsWith('.jpeg')) filters = [{ name: 'Imagenes JPG', extensions: ['jpg', 'jpeg'] }];
        else if (type === 'image/png' || name.toLowerCase().endsWith('.png')) filters = [{ name: 'Imagenes PNG', extensions: ['png'] }];
        else if (type === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) filters = [{ name: 'Documentos PDF', extensions: ['pdf'] }];
        else filters = [{ name: 'Todos los Archivos', extensions: ['*'] }];

        const { filePath } = await dialog.showSaveDialog({ 
            defaultPath: name,
            filters: filters
        });
        if(filePath) {
            const base64Data = dataURL.split(';base64,').pop();
            await fs.promises.writeFile(filePath, base64Data, {encoding: 'base64'});
            return { success: true };
        }
        return { success: false, cancel: true };
    } catch(err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('pick-file', async (event, { filters, properties }) => {
    try {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: properties || ['openFile', 'multiSelections'],
            filters: filters || []
        });
        if(canceled || filePaths.length === 0) return { success: false, cancel: true };
        
        let files = [];
        for(let fp of filePaths) {
            const data = await fs.promises.readFile(fp);
            const ext = path.extname(fp).replace('.','').toLowerCase();
            const mime = ext === 'png' ? 'image/png' : (ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : (ext === 'pdf' ? 'application/pdf' : 'application/octet-stream'));
            const dataURL = `data:${mime};base64,${data.toString('base64')}`;
            files.push({ name: path.basename(fp), dataURL });
        }
        return { success: true, files };
    } catch(e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('preview-doc', async (event, { name, dataURL }) => {
    try {
        const previewWin = new BrowserWindow({
            width: 800, height: 600, title: name, autoHideMenuBar: true
        });
        
        // Use an iframe or direct pass depending on the type
        previewWin.loadURL(dataURL);
        return true;
    } catch(e) { return false; }
});

ipcMain.handle('change-icon', async (event, dataURL) => {
    try {
        const win = BrowserWindow.getAllWindows()[0];
        if(win) {
            if(!dataURL) {
                // Return to default icon implies creating an empty native image on windows, or reading package app icon
                win.setIcon(nativeImage.createEmpty()); 
            } else {
                const img = nativeImage.createFromDataURL(dataURL);
                win.setIcon(img);
            }
        }
        return true;
    } catch(e) { return false; }
});
