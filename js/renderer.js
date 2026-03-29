document.addEventListener('DOMContentLoaded', async () => {

    let state = {
        passwordHash: 'admin', 
        globalTimeoutMinutes: 5,
        globalBg: '',
        primaryColor: '#00ffcc',
        folders: [],
        albums: [],
        notes: [],
        sectionBgs: {},
        panelOpacity: 0.65,
        fontFamily: 'Inter',
        fontSize: 16,
        timerColor: '#ff4444',
        calendarEvents: [],
        tasks: [],
        lightMode: false,
        buttonStyle: 'default',
        buttonTextColor: 'black',
        skipLockScreen: false,
        recoveryEmail: '',
        trash: []
    };

    let secretKey = 'admin'; 
    let inactivitySeconds = 0;
    let timerInterval = null;
    let isSaving = false;

    async function loadSecureDB(pwd) {
        if(!window.api) return false;
        const res = await window.api.readDB(pwd);
        if(res.success && res.data) {
            try { 
                const loaded = JSON.parse(res.data);
                state = { ...state, ...loaded };
                if(!state.notes) state.notes = [];
                if(!state.folders) state.folders = [];
                if(!state.albums) state.albums = [];
                if(!state.sectionBgs) state.sectionBgs = {};
                if(!state.trash) state.trash = [];
                if(!state.tasks) state.tasks = [];
                if(!state.calendarEvents) state.calendarEvents = [];
                return true; 
            } catch(e) { return false; }
        } else if (res.success && !res.data) {
            return true;
        }
        return false;
    }

    async function saveSecureDB(customMsg = "Guardando...") {
        if(!window.api || !secretKey || isSaving) return;
        isSaving = true;

        const loader = document.getElementById('global-loader');
        if(loader) {
            const h2 = loader.querySelector('h2');
            if(h2) h2.innerText = customMsg;
            loader.classList.remove('hidden');
            loader.style.display = 'flex';
        }

        // Dos frames de animacion para que Chromium dibuje el loader
        // ANTES de que JSON.stringify bloquee el hilo de la UI.
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        await new Promise(r => setTimeout(r, 30));

        try {
            state.globalTimeoutMinutes = parseInt(state.globalTimeoutMinutes) || 5;
            const dataString = JSON.stringify(state);
            const res = await window.api.saveDB({ dataString, masterPassword: secretKey });
            if (res && res.error) console.error("IPC Save failed: " + res.error);
            updateDashboardStats();
            // Keep WhatsApp bot snapshot fresh
            if (window.api && window.api.waSetVaultData) {
                window.api.waSetVaultData({
                    folders: state.folders, albums: state.albums,
                    notes: state.notes, calendarEvents: state.calendarEvents, tasks: state.tasks
                });
            }
        } catch(e) {
            console.error("Save Error:", e);
        }

        if(loader) {
            loader.classList.add('hidden');
            loader.style.display = '';
        }
        if(window.api && window.api.wakeUp) window.api.wakeUp();
        isSaving = false;
    }

    function applyTheme() {
        document.documentElement.style.setProperty('--primary-color', state.primaryColor);
        document.documentElement.style.setProperty('--glass-bg-alpha', state.panelOpacity || 0.65);
        document.documentElement.style.setProperty('--glass-bg', `rgba(20, 20, 20, ${state.panelOpacity || 0.65})`);
        document.documentElement.style.setProperty('--timer-color', state.timerColor || '#ff4444');
        document.documentElement.style.setProperty('--icon-bg', state.iconBg || 'rgba(255,255,255,0.03)');
        document.documentElement.style.setProperty('--icon-color', state.iconColor || '#ffffff');
        document.body.style.fontFamily = state.fontFamily || 'Inter';
        
        // Apply font size
        const fs = state.fontSize || 16;
        document.documentElement.style.setProperty('--font-size', fs + 'px');
        document.body.style.fontSize = fs + 'px';
        document.querySelectorAll('p, span, div, li, td, th, label, input, textarea, select, button').forEach(el => {
            if (!el.style.fontSize) el.style.fontSize = '';
        });
        
        document.getElementById('setting-theme').value = state.primaryColor;
        document.getElementById('setting-opacity').value = state.panelOpacity || 0.65;
        document.getElementById('opacity-val-lbl').innerText = Math.round((state.panelOpacity || 0.65) * 100) + '%';
        document.getElementById('setting-font').value = state.fontFamily || 'Inter';
        document.getElementById('setting-timer-color').value = state.timerColor || '#ff4444';
        document.getElementById('setting-icon-bg').value = state.iconBg || '#222222';
        document.getElementById('setting-icon-color').value = state.iconColor || '#ffffff';
        document.getElementById('setting-bg').value = state.globalBg || '';
        
        // Update fontsize slider
        const fsSlider = document.getElementById('setting-fontsize');
        if(fsSlider) { fsSlider.value = fs; document.getElementById('fontsize-val-lbl').innerText = fs + 'px'; }
        
        const btnLight = document.getElementById('btn-toggle-light');
        if(state.lightMode) {
            document.body.classList.add('light-mode');
            if(btnLight) btnLight.innerText = "Modo Claro: Encendido";
        } else {
            document.body.classList.remove('light-mode');
            if(btnLight) btnLight.innerText = "Modo Claro: Apagado";
        }

        // Estilo de botones
        document.body.classList.remove('style-pink', 'style-multicolor', 'btn-text-white', 'btn-text-black');
        if(state.buttonStyle === 'multicolor') document.body.classList.add('style-multicolor');
        
        // Color de texto en botones
        const txtColor = state.buttonTextColor || 'black';
        document.body.classList.add(`btn-text-${txtColor}`);
        const btnTextColorSel = document.getElementById('setting-btn-text-color');
        if(btnTextColorSel) btnTextColorSel.value = txtColor;

        const btnStyleSel = document.getElementById('setting-btn-style');
        if(btnStyleSel) btnStyleSel.value = state.buttonStyle || 'default';

        const skipLockCheck = document.getElementById('setting-skip-lock');
        if(skipLockCheck) skipLockCheck.checked = !!state.skipLockScreen;

        const recoveryEmailInput = document.getElementById('setting-recovery-email');
        if(recoveryEmailInput) recoveryEmailInput.value = state.recoveryEmail || '';
        
        // Show gmail linked badge
        const badge = document.getElementById('recovery-email-badge');
        const badgeSpan = document.getElementById('recovery-email-display');
        if(badge && badgeSpan) {
            if(state.recoveryEmail) {
                badge.style.display = 'inline-flex';
                badgeSpan.innerText = state.recoveryEmail;
            } else {
                badge.style.display = 'none';
            }
        }

        // Iconos sidebar:
        document.body.classList.remove('sidebar-multicolor');
        if(state.buttonStyle === 'multicolor') {
            document.body.classList.add('sidebar-multicolor');
        }
        document.documentElement.style.setProperty('--icon-box-color', state.primaryColor);
    }

    function applyBackground(targetSection) {
        let bg = state.sectionBgs[targetSection] || state.globalBg;
        document.getElementById('local-bg-input').value = state.sectionBgs[targetSection] || '';
        
        const appBg = document.getElementById('app-background');
        if(!bg) {
            appBg.style.background = '#0a0a0a';
        } else if(bg.startsWith('#')) {
            appBg.style.background = bg;
        } else if(bg.startsWith('url(')) {
            appBg.style.background = `${bg} center/cover no-repeat fixed`;
        } else if(bg.startsWith('data:')) {
            appBg.style.background = `radial-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.8)), url('${bg}') center/cover no-repeat fixed`;
        } else {
            appBg.style.background = `url('${bg}') center/cover no-repeat fixed`;
        }
    }

    // --- Timers & Auto Lock ---
    const clockEl = document.getElementById('internal-clock');
    setInterval(() => clockEl.innerText = new Date().toLocaleTimeString('en-US', { hour12: true }), 1000);

    function startInactivityTimer() {
        if(timerInterval) clearInterval(timerInterval);
        inactivitySeconds = 0;
        const countdownEl = document.getElementById('countdown-timer');
        
        timerInterval = setInterval(() => {
            inactivitySeconds++;
            const maxMins = parseInt(state.globalTimeoutMinutes) || 5;
            const remaining = (maxMins * 60) - inactivitySeconds;
            
            if(remaining <= 0) lockApp();
            else countdownEl.innerText = Math.floor(remaining / 60).toString().padStart(2,'0') + `:` + (remaining % 60).toString().padStart(2,'0');
        }, 1000);
    }

    const resetInactivity = () => { inactivitySeconds = 0; };
    document.body.addEventListener('mousemove', resetInactivity);
    document.body.addEventListener('keydown', resetInactivity);
    document.body.addEventListener('click', resetInactivity);

    // --- Authentication ---
    const loginOverlay = document.getElementById('login-overlay');
    const appShell = document.getElementById('app-shell');
    const masterPassword = document.getElementById('master-password');

    function lockApp() {
        if(timerInterval) clearInterval(timerInterval);
        appShell.classList.add('hidden');
        loginOverlay.classList.remove('hidden');
        loginOverlay.classList.add('active');
        secretKey = null; 
        inactivitySeconds = 0;
    }

    document.getElementById('btn-login').addEventListener('click', async () => {
        const input = masterPassword.value.trim();
        if(!input) return alert("Por favor ingresa una contraseña.");
        handleLogin(input);
    });

    async function handleLogin(input, auto = false) {
        document.getElementById('login-error').classList.add('hidden');
        
        const success = await loadSecureDB(input);

        if(success) {
            secretKey = input;
            state.passwordHash = input;
            
            if(!auto) saveSecureDB();
            
            loginOverlay.classList.add('hidden');
            appShell.classList.remove('hidden');
            masterPassword.value = '';
            
            document.getElementById('setting-timeout').value = state.globalTimeoutMinutes;

            applyTheme();
            applyBackground('dashboard');
            startInactivityTimer();
            renderSpaces();
            renderTrash();
            renderTasks();
            initDriveUI();

            // Sync vault snapshot to main process for WhatsApp bot commands
            if (window.api && window.api.waSetVaultData) {
                window.api.waSetVaultData({
                    folders: state.folders, albums: state.albums,
                    notes: state.notes, calendarEvents: state.calendarEvents, tasks: state.tasks
                });
            }

            if(state.skipLockScreen && !auto) {
                await window.api.saveAutologin({ masterPassword: secretKey, enabled: true });
            }
        } else {
            document.getElementById('login-error').classList.remove('hidden');
        }
    }

    // Auto-login check
    (async () => {
        const res = await window.api.readAutologin();
        if(res.success && res.data && res.data.masterPassword) {
            const skipLockCheck = document.getElementById('setting-skip-lock');
            if(skipLockCheck) skipLockCheck.checked = true;
            handleLogin(res.data.masterPassword, true);
        }
    })();

    document.getElementById('btn-lock').addEventListener('click', lockApp);

    // --- Routing ---
    const sections = document.querySelectorAll('.app-section');
    let currentNavTarget = 'dashboard';
    
    document.querySelectorAll('.nav-links li[data-target], .sidebar-bottom li[data-target]').forEach(link => {
        link.addEventListener('click', () => {
            document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
            if(link.parentElement.classList.contains('nav-links')) link.classList.add('active');

            currentNavTarget = link.getAttribute('data-target');
            sections.forEach(s => s.classList.add('hidden'));
            document.getElementById(`section-${currentNavTarget}`).classList.remove('hidden');
            document.getElementById('current-section-title').innerText = link.innerText.trim();
            
            applyBackground(currentNavTarget);

            // Re-render sections that need fresh data on every visit
            if(currentNavTarget === 'calendar') renderCalendar();
            if(currentNavTarget === 'tasklist') renderTasks();
        });
    });

    document.getElementById('local-bg-input').addEventListener('change', (e) => {
        state.sectionBgs[currentNavTarget] = e.target.value.trim();
        saveSecureDB(); applyBackground(currentNavTarget);
    });
    document.getElementById('btn-pick-local-bg').addEventListener('click', async () => {
        const res = await window.api.pickFile({ filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg', 'gif'] }]});
        if(res.success) {
            state.sectionBgs[currentNavTarget] = res.files[0].dataURL;
            saveSecureDB(); applyBackground(currentNavTarget);
        }
    });

    // --- Folders & Albums & Notes Logic ---
    let currentSpaceId = null;
    let editingSpace = false;
    let viewMode = 'folder'; 

    let isSelecting = false;
    let selectedIds = new Set();

    window.openCreateModal = function(mode) {
        viewMode = mode;
        editingSpace = false;
        let title = "Nueva Carpeta";
        if(mode === 'album') title = "Nuevo Álbum";
        if(mode === 'note') title = "Nuevo Grupo de Notas";
        
        document.getElementById('modal-folder-title').innerText = title;
        document.getElementById('folder-name').value = '';
        document.getElementById('folder-pass').value = '';
        document.getElementById('folder-bg').value = '';
        document.getElementById('folder-icon').value = mode === 'folder' ? 'folder' : (mode === 'album' ? 'images' : 'journal');
        
        const driveOpt = document.getElementById('drive-link-option');
        if(driveOpt) {
            if(mode === 'note') driveOpt.classList.add('hidden');
            else driveOpt.classList.remove('hidden');
        }
        
        document.getElementById('edit-folder-modal').classList.remove('hidden');
    }

    document.getElementById('btn-edit-folder').addEventListener('click', () => {
        editingSpace = true;
        const spaceArr = viewMode === 'folder' ? state.folders : (viewMode === 'album' ? state.albums : state.notes);
        const s = spaceArr.find(x => x.id === currentSpaceId);
        if(!s) return;
        
        document.getElementById('modal-folder-title').innerText = "Editar Grupo";
        document.getElementById('folder-name').value = s.name;
        document.getElementById('folder-pass').value = s.password || "";
        document.getElementById('folder-bg').value = s.bg || "";
        document.getElementById('folder-icon').value = s.icon || "";

        // Mostrar estado de vinculacion Drive y opcion de desvincular
        const driveOpt = document.getElementById('drive-link-option');
        const driveCb = document.getElementById('folder-drive-link');
        const driveUnlinkBtn = document.getElementById('btn-folder-drive-unlink');
        if(driveOpt && viewMode !== 'note') {
            driveOpt.classList.remove('hidden');
            if(driveCb) driveCb.checked = !!s.driveFolderId;
            if(driveUnlinkBtn) driveUnlinkBtn.style.display = s.driveFolderId ? 'flex' : 'none';
        }

        document.getElementById('edit-folder-modal').classList.remove('hidden');
    });

    document.getElementById('btn-folder-cancel').addEventListener('click', () => document.getElementById('edit-folder-modal').classList.add('hidden'));

    document.getElementById('btn-pick-folder-icon').addEventListener('click', async () => {
        const res = await window.api.pickFile({ filters: [{ name: 'Images', extensions: ['jpg', 'png'] }]});
        if(res.success) document.getElementById('folder-icon').value = res.files[0].dataURL;
    });
    document.getElementById('btn-pick-folder-bg').addEventListener('click', async () => {
        const res = await window.api.pickFile({ filters: [{ name: 'Images', extensions: ['jpg', 'png'] }]});
        if(res.success) document.getElementById('folder-bg').value = res.files[0].dataURL;
    });

    document.getElementById('btn-folder-save').addEventListener('click', async () => {
        const name = document.getElementById('folder-name').value;
        if(!name) return;

        const wantsDrive = document.getElementById('folder-drive-link') && document.getElementById('folder-drive-link').checked;
        const spaceArr = viewMode === 'folder' ? state.folders : (viewMode === 'album' ? state.albums : state.notes);

        if(!editingSpace) {
            const newSpace = {
                id: viewMode + '_' + Date.now(),
                name: name,
                password: document.getElementById('folder-pass').value,
                bg: document.getElementById('folder-bg').value,
                icon: document.getElementById('folder-icon').value,
                driveFolderId: null,
                docs: [], imgs: [], noteItems: []
            };
            spaceArr.push(newSpace);

            if (wantsDrive) {
                const driveStatus = await window.api.driveStatus();
                if (driveStatus.connected) {
                    showToast("Creando carpeta en Drive...");
                    const res = await window.api.driveCreateFolder({ name: name + " (VaultSecurity)" });
                    if (res.success) {
                        newSpace.driveFolderId = res.folderId;
                        showToast("Carpeta vinculada a Drive.");
                    }
                }
            }
        } else {
            const s = spaceArr.find(x => x.id === currentSpaceId);
            if(s) {
                s.name = name;
                s.password = document.getElementById('folder-pass').value;
                s.bg = document.getElementById('folder-bg').value;
                s.icon = document.getElementById('folder-icon').value;
                document.getElementById('current-folder-title').innerText = s.name;

                if(wantsDrive && !s.driveFolderId) {
                    const driveStatus = await window.api.driveStatus();
                    if(driveStatus.connected) {
                        const res = await window.api.driveCreateFolder({ name: name + " (VaultSecurity)" });
                        if(res.success) { s.driveFolderId = res.folderId; showToast("Carpeta vinculada a Drive."); }
                    }
                }
            }
        }
        saveSecureDB(); renderSpaces();
        if(currentSpaceId) {
            const updated = spaceArr.find(x => x.id === currentSpaceId);
            if(updated) enterSpace(updated, true);
        }
        document.getElementById('edit-folder-modal').classList.add('hidden');
        const driveCb = document.getElementById('folder-drive-link');
        if(driveCb) driveCb.checked = false;
        const unlinkBtn = document.getElementById('btn-folder-drive-unlink');
        if(unlinkBtn) unlinkBtn.style.display = 'none';
    });

    // Desvincular Drive de la carpeta actual
    const btnFolderDriveUnlink = document.getElementById('btn-folder-drive-unlink');
    if(btnFolderDriveUnlink) {
        btnFolderDriveUnlink.addEventListener('click', async (e) => {
            e.stopPropagation();
            const spaceArr = viewMode === 'folder' ? state.folders : (viewMode === 'album' ? state.albums : state.notes);
            const s = spaceArr.find(x => x.id === currentSpaceId);
            if(s) {
                s.driveFolderId = null;
                saveSecureDB();
                renderSpaces();
                showToast("Carpeta desvinculada de Google Drive.");
                btnFolderDriveUnlink.style.display = 'none';
                const driveCb = document.getElementById('folder-drive-link');
                if(driveCb) driveCb.checked = false;
            }
        });
    }

    const catPasswordModal = document.getElementById('cat-password-modal');
    let pendingSpaceUnlock = null;

    function renderSpaces() {
        _renderList(state.folders, document.getElementById('folders-grid'), 'folder');
        _renderList(state.albums, document.getElementById('albums-grid'), 'album');
        _renderList(state.notes, document.getElementById('notes-grid'), 'note');
        updateDashboardStats();
    }

    function _renderList(itemsArray, container, mode) {
        container.innerHTML = '';
        itemsArray.forEach(item => {
            const card = document.createElement('div');
            card.className = 'category-card ' + (item.password ? 'locked ' : '') + ((isDashSelecting && dashSelectType === mode && dashSelectedIds.has(item.id)) ? 'selected' : '');
            
            let iconHtml = '';
            if(item.icon && (item.icon.startsWith('data:') || item.icon.startsWith('http'))) {
                iconHtml = `<img src="${item.icon}" style="width:48px; height:48px; border-radius:8px; margin-bottom:15px; object-fit:cover; display:inline-block;">`;
            } else {
                iconHtml = `<ion-icon name="${item.icon || 'folder'}" class="main-icon"></ion-icon>`;
            }

            const driveBadge = item.driveFolderId
                ? `<span title="Vinculada a Google Drive" style="position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,0.7);border-radius:4px;padding:2px 4px;display:flex;align-items:center;"><svg width="12" height="12" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg"><path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/><path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/><path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/><path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/><path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/><path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/></svg></span>`
                : '';
            card.innerHTML = `${iconHtml}<br><span>${item.name}</span>${item.password ? '<ion-icon name="lock-closed" class="cat-lock"></ion-icon>' : ''}${driveBadge}`;
            
            if(isDashSelecting && dashSelectType === mode) {
                card.classList.add('selectable-item');
            }

            card.addEventListener('click', () => {
                if(isDashSelecting && dashSelectType === mode) {
                    if(dashSelectedIds.has(item.id)) {
                        dashSelectedIds.delete(item.id);
                        card.classList.remove('selected');
                    } else {
                        dashSelectedIds.add(item.id);
                        card.classList.add('selected');
                    }
                    const btnDel = document.querySelector(`.btn-dash-del[data-type="${mode}"]`);
                    if(btnDel) btnDel.innerHTML = `<ion-icon name="trash"></ion-icon> (${dashSelectedIds.size})`;
                    return;
                }

                viewMode = mode;
                if(item.password) {
                    pendingSpaceUnlock = item;
                    document.getElementById('cat-error').classList.add('hidden');
                    catPasswordModal.classList.remove('hidden');
                } else enterSpace(item);
            });
            container.appendChild(card);
        });
    }

    // --- Dashboard Multi Selection ---
    let isDashSelecting = false;
    let dashSelectType = null;
    let dashSelectedIds = new Set();
    
    document.querySelectorAll('.btn-dash-multi').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.getAttribute('data-type');
            isDashSelecting = !isDashSelecting;
            dashSelectType = isDashSelecting ? type : null;
            
            btn.classList.toggle('active', isDashSelecting);
            const btnDel = document.querySelector(`.btn-dash-del[data-type="${type}"]`);
            if(isDashSelecting) {
                btnDel.classList.remove('hidden');
                btnDel.innerHTML = `<ion-icon name="trash"></ion-icon> (0)`;
                dashSelectedIds.clear();
            } else {
                btnDel.classList.add('hidden');
                dashSelectedIds.clear();
            }
            renderSpaces();
        });
    });

    document.querySelectorAll('.btn-dash-del').forEach(btn => {
        btn.addEventListener('click', () => {
            if(dashSelectedIds.size === 0) return;
            const type = btn.getAttribute('data-type');
            triggerAction('delete-dash-multi', { targetType: type, ids: Array.from(dashSelectedIds) });
        });
    });


    document.getElementById('btn-cat-cancel').addEventListener('click', () => {
        catPasswordModal.classList.add('hidden');
        document.getElementById('cat-password').value = '';
    });
    
    document.getElementById('btn-cat-unlock').addEventListener('click', () => {
        const pass = document.getElementById('cat-password').value;
        if(pass === pendingSpaceUnlock.password) {
            catPasswordModal.classList.add('hidden');
            document.getElementById('cat-password').value = '';
            enterSpace(pendingSpaceUnlock);
        } else document.getElementById('cat-error').classList.remove('hidden');
    });

    document.getElementById('btn-toggle-multi').addEventListener('click', () => {
        isSelecting = !isSelecting;
        document.getElementById('btn-toggle-multi').classList.toggle('active', isSelecting);
        
        let container = document.getElementById('selectable-container');
        if(isSelecting) {
            container.classList.add('selection-active');
            document.getElementById('btn-delete-multi').classList.remove('hidden');
        } else {
            container.classList.remove('selection-active');
            document.getElementById('btn-delete-multi').classList.add('hidden');
            selectedIds.clear();
            document.getElementById('multi-count').innerText = "0";
            // Also redraw to clear ui selections
            const spaceArr = viewMode === 'folder' ? state.folders : (viewMode === 'album' ? state.albums : state.notes);
            const s = spaceArr.find(x => x.id === currentSpaceId);
            if(s) renderSpaceItems(s);
        }
    });

    document.getElementById('btn-delete-multi').addEventListener('click', () => {
        if(selectedIds.size === 0) return;
        triggerAction('delete-multi', { ids: Array.from(selectedIds) });
    });

    function toggleSelection(id, element) {
        if(selectedIds.has(id)) {
            selectedIds.delete(id);
            element.classList.remove('selected');
        } else {
            selectedIds.add(id);
            element.classList.add('selected');
        }
        document.getElementById('multi-count').innerText = selectedIds.size;
    }

    function enterSpace(space, overrideBg = false) {
        currentSpaceId = space.id;
        isSelecting = false;
        selectedIds.clear();
        document.getElementById('selectable-container').classList.remove('selection-active');
        document.getElementById('btn-delete-multi').classList.add('hidden');
        
        sections.forEach(s => s.classList.add('hidden'));
        document.getElementById('section-folder-view').classList.remove('hidden');
        document.getElementById('current-folder-title').innerText = space.name;
        
        const actDocs = document.getElementById('folder-actions-docs');
        const actImgs = document.getElementById('folder-actions-imgs');
        const actNotes = document.getElementById('folder-actions-notes');
        
        document.getElementById('btn-upload-docs').style.display = 'none';
        document.getElementById('btn-upload-imgs').style.display = 'none';
        document.getElementById('btn-new-note-item').style.display = 'none';

        if(viewMode === 'folder') document.getElementById('btn-upload-docs').style.display = 'flex';
        if(viewMode === 'album') document.getElementById('btn-upload-imgs').style.display = 'flex';
        if(viewMode === 'note') document.getElementById('btn-new-note-item').style.display = 'flex';

        // Apply folder specific background, properly formatted if data URI
        if(space.bg) {
            const appBg = document.getElementById('app-background');
            if(space.bg.startsWith('data:')) {
                appBg.style.background = `radial-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.8)), url('${space.bg}') center/cover no-repeat fixed`;
            } else {
                appBg.style.background = `url('${space.bg}') center/cover no-repeat fixed`;
            }
        } else if (overrideBg || !space.bg) {
            applyBackground(currentNavTarget);
        }
        
        renderSpaceItems(space);
    }

    document.getElementById('btn-back-folders').addEventListener('click', () => {
        currentSpaceId = null;
        document.getElementById('section-folder-view').classList.add('hidden');
        const target = viewMode === 'folder' ? 'section-documents' : (viewMode === 'album' ? 'section-galleries' : 'section-notes');
        document.getElementById(target).classList.remove('hidden');
        applyBackground(currentNavTarget); // reset to section bg
    });

    document.getElementById('btn-upload-docs').addEventListener('click', async () => {
        const res = await window.api.pickFile({ filters: [{name: 'Archivos', extensions: ['*']}] });
        if(res.success && res.files) appendFilesToSpace(res.files, 'docs');
    });

    document.getElementById('btn-upload-imgs').addEventListener('click', async () => {
        const res = await window.api.pickFile({ filters: [{name: 'Imágenes', extensions: ['jpg','png','jpeg','gif', 'webp']}] });
        if(res.success && res.files) appendFilesToSpace(res.files, 'imgs');
    });

    async function appendFilesToSpace(files, listType) {
        const spaceArr = viewMode === 'folder' ? state.folders : state.albums;
        const s = spaceArr.find(x => x.id === currentSpaceId);
        s[listType] = s[listType] || [];
        const newItems = [];
        files.forEach(f => {
            newItems.push({ id: Date.now()+Math.random(), name: f.name, data: f.dataURL, driveFileId: null });
        });
        s[listType].push(...newItems);
        saveSecureDB();
        renderSpaceItems(s);
    }

    async function uploadFileToDrive(item, space) {
        if(!window.api.driveUpload) return;
        const driveStatus = await window.api.driveStatus();
        if(!driveStatus.connected) { showToast("Drive no conectado. Vincula tu cuenta en Ajustes."); return; }

        let folderId = space ? space.driveFolderId : null;

        // If space has no Drive folder yet, create one
        if(space && !folderId) {
            showToast("Creando carpeta en Drive...");
            const res = await window.api.driveCreateFolder({ name: space.name + " (VaultSecurity)" });
            if(res.success) {
                space.driveFolderId = res.folderId;
                folderId = res.folderId;
                saveSecureDB();
            }
        }

        showToast("Subiendo a Google Drive...");
        const res = await window.api.driveUpload({ name: item.name, dataURL: item.data, folderId });
        if(res.success) {
            item.driveFileId = res.fileId;
            saveSecureDB();
            showToast("Subido a Drive correctamente.");
        } else {
            showToast("Error al subir a Drive: " + res.error);
        }
    }

    // Export / Delete Security Setup
    let pendingAction = null; 
    
    document.getElementById('btn-export-confirm').addEventListener('click', async () => {
        const pass = document.getElementById('export-password').value;
        if(pass === secretKey || pass === state.passwordHash) {
            document.getElementById('export-auth-modal').classList.add('hidden');
            document.getElementById('export-password').value = '';
            
            if(pendingAction.type === 'export') {
                const mimeRaw = pendingAction.data.split(';')[0];
                const type = mimeRaw.replace('data:', '');
                const res = await window.api.exportFile({ name: pendingAction.name, dataURL: pendingAction.data, type });
                if(res.success) showToast("Archivo exportado exitosamente.");

            } else if (pendingAction.type === 'drive-upload-item') {
                // Upload specific file to Drive without deleting
                const item = pendingAction.item;
                const space = pendingAction.space;
                await uploadFileToDrive(item, space);

            } else if (pendingAction.type === 'delete-item') {
                const spaceArr = viewMode === 'folder' ? state.folders : (viewMode === 'album' ? state.albums : state.notes);
                const s = spaceArr.find(x => x.id === currentSpaceId);
                const item = s[pendingAction.listType].find(i => i.id === pendingAction.id);
                if(item) {
                    // Delete from Drive if it has driveFileId
                    if(item.driveFileId && window.api.driveDelete) {
                        await window.api.driveDelete({ fileId: item.driveFileId });
                    }
                    // Move to trash
                    if(!state.trash) state.trash = [];
                    state.trash.push({
                        trashId: 'tr_' + Date.now() + Math.random(),
                        deletedAt: new Date().toISOString(),
                        itemType: 'file',
                        fileType: pendingAction.listType,
                        parentSpaceId: currentSpaceId,
                        parentSpaceMode: viewMode,
                        item: { ...item }
                    });
                }
                s[pendingAction.listType] = s[pendingAction.listType].filter(i => i.id !== pendingAction.id);
                saveSecureDB(); renderSpaceItems(s); renderTrash();

            } else if (pendingAction.type === 'delete-folder') {
                const spaceArr = viewMode === 'folder' ? state.folders : (viewMode === 'album' ? state.albums : state.notes);
                const s = spaceArr.find(x => x.id === currentSpaceId);
                if(s) {
                    if(!state.trash) state.trash = [];
                    state.trash.push({
                        trashId: 'tr_' + Date.now() + Math.random(),
                        deletedAt: new Date().toISOString(),
                        itemType: 'space',
                        spaceMode: viewMode,
                        item: JSON.parse(JSON.stringify(s))
                    });
                    const idx = spaceArr.findIndex(x => x.id === currentSpaceId);
                    spaceArr.splice(idx, 1);
                }
                saveSecureDB();
                document.getElementById('btn-back-folders').click();
                renderSpaces(); renderTrash();

            } else if (pendingAction.type === 'delete-note') {
                const space = state.notes.find(x => x.id === currentSpaceId);
                const note = space.noteItems.find(x => x.id === pendingAction.id);
                if(note) {
                    if(!state.trash) state.trash = [];
                    state.trash.push({
                        trashId: 'tr_' + Date.now() + Math.random(),
                        deletedAt: new Date().toISOString(),
                        itemType: 'note',
                        parentSpaceId: currentSpaceId,
                        item: { ...note }
                    });
                }
                space.noteItems = space.noteItems.filter(x => x.id !== pendingAction.id);
                saveSecureDB();
                renderSpaceItems(space); renderTrash();

            } else if (pendingAction.type === 'delete-multi') {
                const spaceArr = viewMode === 'folder' ? state.folders : (viewMode === 'album' ? state.albums : state.notes);
                const s = spaceArr.find(x => x.id === currentSpaceId);
                const lType = viewMode === 'folder' ? 'docs' : (viewMode === 'album' ? 'imgs' : 'noteItems');
                if(!state.trash) state.trash = [];
                for(const id of pendingAction.ids) {
                    const item = s[lType].find(i => String(i.id) === String(id));
                    if(item) {
                        if(item.driveFileId && window.api.driveDelete) await window.api.driveDelete({ fileId: item.driveFileId });
                        state.trash.push({
                            trashId: 'tr_' + Date.now() + Math.random(),
                            deletedAt: new Date().toISOString(),
                            itemType: 'file', fileType: lType,
                            parentSpaceId: currentSpaceId, parentSpaceMode: viewMode,
                            item: { ...item }
                        });
                    }
                }
                s[lType] = s[lType].filter(i => !pendingAction.ids.includes(String(i.id)) && !pendingAction.ids.includes(i.id));
                selectedIds.clear();
                document.getElementById('multi-count').innerText = '0';
                saveSecureDB(); renderSpaceItems(s); renderTrash();

            } else if (pendingAction.type === 'delete-dash-multi') {
                const t = pendingAction.targetType;
                if(!state.trash) state.trash = [];
                const arr = t === 'folder' ? state.folders : (t === 'album' ? state.albums : state.notes);
                for(const id of pendingAction.ids) {
                    const sp = arr.find(x => x.id === id);
                    if(sp) state.trash.push({
                        trashId: 'tr_' + Date.now() + Math.random(),
                        deletedAt: new Date().toISOString(),
                        itemType: 'space', spaceMode: t,
                        item: JSON.parse(JSON.stringify(sp))
                    });
                }
                if(t === 'folder') state.folders = state.folders.filter(x => !pendingAction.ids.includes(x.id));
                if(t === 'album') state.albums = state.albums.filter(x => !pendingAction.ids.includes(x.id));
                if(t === 'note') state.notes = state.notes.filter(x => !pendingAction.ids.includes(x.id));
                dashSelectedIds.clear();
                const btnDel = document.querySelector(`.btn-dash-del[data-type="${t}"]`);
                if(btnDel) btnDel.innerHTML = `<ion-icon name="trash"></ion-icon> (0)`;
                saveSecureDB(); renderSpaces(); renderTrash();
            }

        } else {
            document.getElementById('export-error').classList.remove('hidden');
        }
    });

    window.triggerAction = function(actionType, payload, e) {
        if(e) { e.preventDefault(); e.stopPropagation(); }
        pendingAction = { ...payload, type: actionType };
        document.getElementById('export-error').classList.add('hidden');
        document.getElementById('export-auth-modal').classList.remove('hidden');
    };

    document.getElementById('btn-delete-folder').addEventListener('click', () => {
        triggerAction('delete-folder', { });
    });

    function renderSpaceItems(space) {
        const docList = document.getElementById('current-folder-docs');
        const imgList = document.getElementById('current-folder-imgs');
        const noteList = document.getElementById('current-folder-notes');
        
        docList.innerHTML = ''; imgList.innerHTML = ''; noteList.innerHTML = '';
        
        if(viewMode === 'folder') {
            (space.docs || []).forEach(doc => {
                const d = document.createElement('div');
                d.className = 'file-item selectable-item ' + (selectedIds.has(doc.id) ? 'selected' : '');
                const driveBtn = (doc.driveFileId || viewMode === 'note')
                    ? (viewMode === 'note' ? '' : `<button class="btn-action-sm" style="opacity:0.5; cursor:default;" title="Ya en Drive" disabled>
                        <svg width="14" height="14" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg"><path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/><path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/><path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/><path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/><path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/><path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/></svg>
                       </button>`)
                    : `<button class="btn-action-sm drive-upload-btn" data-doc-id="${doc.id}" title="Subir a Google Drive">
                        <svg width="14" height="14" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg"><path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/><path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/><path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/><path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/><path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/><path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/></svg>
                       </button>`;
                d.innerHTML = `
                    <div class="file-label">
                        <ion-icon name="document-text"></ion-icon><span>${doc.name}</span>
                    </div>
                    <div style="display:flex; gap:5px; align-items:center;">
                        ${driveBtn}
                        <button class="btn-action-sm" data-export-id="${doc.id}" title="Exportar"><ion-icon name="download"></ion-icon></button>
                        <button class="btn-action-sm danger" data-del-id="${doc.id}" title="Mover a Papelera"><ion-icon name="trash"></ion-icon></button>
                    </div>`;
                
                d.querySelector('.file-label').addEventListener('click', (e) => {
                    if (isSelecting) toggleSelection(doc.id, d);
                    else window.api.previewDoc({name: doc.name, dataURL: doc.data});
                });
                const exportBtn = d.querySelector(`[data-export-id="${doc.id}"]`);
                if(exportBtn) exportBtn.addEventListener('click', (e) => { e.stopPropagation(); triggerAction('export', {name: doc.name, data: doc.data}, e); });
                const delBtn = d.querySelector(`[data-del-id="${doc.id}"]`);
                if(delBtn) delBtn.addEventListener('click', (e) => { e.stopPropagation(); triggerAction('delete-item', {id: doc.id, listType: 'docs'}, e); });
                const drvBtn = d.querySelector(`.drive-upload-btn[data-doc-id="${doc.id}"]`);
                if(drvBtn) drvBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const driveStatus = await window.api.driveStatus();
                    if(!driveStatus.connected) { showToast("Vincula tu cuenta de Drive en Ajustes primero."); return; }
                    await uploadFileToDrive(doc, space);
                    renderSpaceItems(space);
                });
                docList.appendChild(d);
            });
        }
        
        if(viewMode === 'album') {
            (space.imgs || []).forEach(img => {
                const w = document.createElement('div');
                w.className = 'img-wrap selectable-item ' + (selectedIds.has(img.id) ? 'selected' : '');
                const driveSvg = `<svg width="13" height="13" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg"><path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/><path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/><path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/><path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/><path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/><path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/></svg>`;
                w.innerHTML = `
                    <div class="img-item" style="background-image:url('${img.data}'); position:relative;">
                        ${img.driveFileId ? `<span style="position:absolute;top:5px;right:5px;background:rgba(0,0,0,0.7);border-radius:4px;padding:2px 4px;" title="En Drive">${driveSvg}</span>` : ''}
                    </div>
                    <div class="img-actions-bar">
                        ${img.driveFileId ? `<button class="btn-action-sm" style="opacity:0.5;cursor:default;" disabled title="Ya en Drive">${driveSvg}</button>`
                            : `<button class="btn-action-sm drive-img-btn" data-img-id="${img.id}" title="Subir a Drive">${driveSvg}</button>`}
                        <button class="btn-action-sm" data-export-img="${img.id}" title="Guardar a PC"><ion-icon name="download"></ion-icon></button>
                        <button class="btn-action-sm danger" data-del-img="${img.id}" title="Mover a Papelera"><ion-icon name="trash"></ion-icon></button>
                    </div>
                `;
                w.querySelector('.img-item').addEventListener('click', (e) => { 
                    if (isSelecting) toggleSelection(img.id, w);
                    else window.api.previewDoc({name: img.name, dataURL: img.data});
                });
                const expBtn = w.querySelector(`[data-export-img="${img.id}"]`);
                if(expBtn) expBtn.addEventListener('click', (e) => { e.stopPropagation(); triggerAction('export', {name: img.name, data: img.data}, e); });
                const delBtn = w.querySelector(`[data-del-img="${img.id}"]`);
                if(delBtn) delBtn.addEventListener('click', (e) => { e.stopPropagation(); triggerAction('delete-item', {id: img.id, listType: 'imgs'}, e); });
                const drvBtn = w.querySelector(`.drive-img-btn[data-img-id="${img.id}"]`);
                if(drvBtn) drvBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const driveStatus = await window.api.driveStatus();
                    if(!driveStatus.connected) { showToast("Vincula tu cuenta de Drive en Ajustes primero."); return; }
                    await uploadFileToDrive(img, space);
                    renderSpaceItems(space);
                });
                imgList.appendChild(w);
            });
        }
        
        if(viewMode === 'note') {
            (space.noteItems || []).forEach(note => {
                const card = document.createElement('div');
                card.className = 'category-card selectable-item ' + (selectedIds.has(note.id) ? 'selected' : '');
                card.innerHTML = `<ion-icon name="document" class="main-icon"></ion-icon><span>${note.title}</span>`;
                card.style.position = 'relative';

                const xBtn = document.createElement('button');
                xBtn.className = 'btn-action-sm danger';
                xBtn.style = 'position:absolute; top:-10px; right:-10px; z-index:10; border-radius:50%; width:30px; height:30px; align-items:center;';
                xBtn.innerHTML = '<ion-icon name="close"></ion-icon>';
                xBtn.addEventListener('click', (e) => triggerAction('delete-note', {id: note.id}, e));
                card.appendChild(xBtn);

                card.addEventListener('click', (e) => {
                    // if they hit the close button, ignore here
                    if(e.target.closest('button')) return;
                    if(isSelecting) toggleSelection(note.id, card);
                    else openNoteEditor(note.id);
                });
                noteList.appendChild(card);
            });
        }
    }

    // --- Notes Editor ---
    let currentNoteId = null;
    let saveNoteTimeout = null;
    
    document.getElementById('btn-new-note-item').addEventListener('click', () => {
        document.getElementById('new-note-title').value = '';
        document.getElementById('note-name-modal').classList.remove('hidden');
    });
    
    document.getElementById('btn-note-create-confirm').addEventListener('click', () => {
        const space = state.notes.find(x => x.id === currentSpaceId);
        const title = document.getElementById('new-note-title').value || "Sin Título";
        const newId = 'n_' + Date.now();
        if(!space.noteItems) space.noteItems = [];
        space.noteItems.push({ id: newId, title: title, html: '<p><br></p>' });
        saveSecureDB();
        document.getElementById('note-name-modal').classList.add('hidden');
        renderSpaceItems(space);
        openNoteEditor(newId);
    });

    function openNoteEditor(nId) {
        currentNoteId = nId;
        const space = state.notes.find(x => x.id === currentSpaceId);
        const note = space.noteItems.find(x => x.id === nId);
        
        document.getElementById('section-folder-view').classList.add('hidden');
        document.getElementById('section-notepad-editor').classList.remove('hidden');
        document.getElementById('current-note-title').innerText = note.title;
        document.getElementById('rich-editor').innerHTML = note.html;
    }

    document.getElementById('btn-back-to-group').addEventListener('click', () => {
        saveCurrentNote();
        currentNoteId = null;
        document.getElementById('section-notepad-editor').classList.add('hidden');
        document.getElementById('section-folder-view').classList.remove('hidden');
        const space = state.notes.find(x => x.id === currentSpaceId);
        renderSpaceItems(space);
    });

    const indSync = document.getElementById('note-saving-indicator');
    document.getElementById('btn-save-note').addEventListener('click', () => {
        saveCurrentNote();
        indSync.innerText = "Guardado localmente.";
        indSync.classList.remove('hidden');
        setTimeout(() => indSync.classList.add('hidden'), 2000);
    });

    document.getElementById('btn-export-note').addEventListener('click', () => {
        const space = state.notes.find(x => x.id === currentSpaceId);
        const note = space.noteItems.find(x => x.id === currentNoteId);
        if(!note) return;
        
        const extractedHtml = document.getElementById('rich-editor').innerHTML;
        const htmlDoc = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${note.title}</title></head><body>
        <div style="font-family:Arial,sans-serif; font-size: 14pt;">${extractedHtml}</div></body></html>`;

        const b64 = btoa(unescape(encodeURIComponent(htmlDoc)));
        const dataURL = `data:application/msword;base64,${b64}`;
        triggerAction('export', { name: note.title + '.doc', data: dataURL });
    });

    function saveCurrentNote() {
        if(!currentNoteId || !currentSpaceId) return;
        const space = state.notes.find(x => x.id === currentSpaceId);
        const note = space.noteItems.find(x => x.id === currentNoteId);
        if(note) {
            note.html = document.getElementById('rich-editor').innerHTML;
            saveSecureDB();
        }
    }

    // Rich Editor Toolbar commands
    const editor = document.getElementById('rich-editor');
    document.querySelectorAll('.tool-btn[data-cmd]').forEach(btn => {
        btn.addEventListener('mousedown', (e) => {
            e.preventDefault(); 
            const cmd = btn.getAttribute('data-cmd');
            document.execCommand(cmd, false, null);
            checkFormatState();
        });
    });

    function checkFormatState() {
        document.querySelectorAll('.tool-btn[data-cmd]').forEach(btn => {
            const cmd = btn.getAttribute('data-cmd');
            try { 
                if(document.queryCommandState(cmd)) btn.classList.add('active'); 
                else btn.classList.remove('active'); 
            } catch(e) {}
        });
    }
    editor.addEventListener('keyup', checkFormatState);
    editor.addEventListener('mouseup', checkFormatState);

    document.getElementById('font-select').addEventListener('change', function(e) {
        editor.focus(); document.execCommand('fontName', false, this.value);
    });
    document.getElementById('format-select').addEventListener('change', function(e) {
        editor.focus(); document.execCommand('formatBlock', false, this.value);
    });

    editor.addEventListener('input', () => {
        clearTimeout(saveNoteTimeout);
        indSync.innerText = "Escribiendo...";
        indSync.classList.remove('hidden');
        saveNoteTimeout = setTimeout(() => {
            saveCurrentNote();
            indSync.innerText = "Protegido";
            setTimeout(() => indSync.classList.add('hidden'), 2000);
        }, 1500);
    });

    // --- Settings Listeners ---
    document.getElementById('btn-save-appearance').addEventListener('click', () => {
        state.primaryColor = document.getElementById('setting-theme').value;
        state.panelOpacity = parseFloat(document.getElementById('setting-opacity').value);
        state.fontFamily = document.getElementById('setting-font').value;
        state.globalBg = document.getElementById('setting-bg').value;
        state.buttonStyle = document.getElementById('setting-btn-style').value;
        state.buttonTextColor = document.getElementById('setting-btn-text-color').value;
        state.fontSize = parseInt(document.getElementById('setting-fontsize').value) || 16;
        state.timerColor = document.getElementById('setting-timer-color').value;
        state.iconBg = document.getElementById('setting-icon-bg').value;
        state.iconColor = document.getElementById('setting-icon-color').value;
        applyTheme();
        applyBackground('dashboard');
        saveSecureDB();
        const notice = document.getElementById('settings-save-notice');
        notice.innerText = "✓ Apariencia guardada.";
        setTimeout(() => notice.innerText = "", 2500);
    });

    // Font size slider live preview
    document.getElementById('setting-fontsize').addEventListener('input', (e) => {
        const fs = parseInt(e.target.value);
        document.getElementById('fontsize-val-lbl').innerText = fs + 'px';
        document.documentElement.style.setProperty('--font-size', fs + 'px');
        document.body.style.fontSize = fs + 'px';
    });

    // Live preview for timer and icons
    document.getElementById('setting-timer-color').addEventListener('input', (e) => {
        document.documentElement.style.setProperty('--timer-color', e.target.value);
    });
    document.getElementById('setting-icon-bg').addEventListener('input', (e) => {
        document.documentElement.style.setProperty('--icon-bg', e.target.value);
    });
    document.getElementById('setting-icon-color').addEventListener('input', (e) => {
        document.documentElement.style.setProperty('--icon-color', e.target.value);
    });

    document.getElementById('btn-toggle-light').addEventListener('click', async () => {
        state.lightMode = !state.lightMode;
        applyTheme();
        await saveSecureDB("Aplicando Tema...");
    });

    document.getElementById('setting-opacity').addEventListener('input', (e) => {
        document.getElementById('opacity-val-lbl').innerText = Math.round(e.target.value * 100) + '%';
    });

    document.getElementById('btn-save-sec').addEventListener('click', async () => {
        state.globalTimeoutMinutes = parseInt(document.getElementById('setting-timeout').value) || 5;
        state.timerColor = document.getElementById('setting-timer-color').value;
        state.skipLockScreen = document.getElementById('setting-skip-lock').checked;
        
        if(state.skipLockScreen) {
            await window.api.saveAutologin({ masterPassword: secretKey, enabled: true });
        } else {
            await window.api.saveAutologin({ enabled: false });
        }

        applyTheme();
        startInactivityTimer();
        await saveSecureDB();
        const notice = document.getElementById('settings-save-notice');
        notice.innerText = "✓ Seguridad guardada.";
        setTimeout(() => notice.innerText = "", 2500);
    });

    document.getElementById('btn-change-pwd').addEventListener('click', async () => {
        const oldP = document.getElementById('pwd-old').value;
        const newP = document.getElementById('pwd-new').value;
        const confP = document.getElementById('pwd-confirm').value;
        const notice = document.getElementById('settings-save-notice');

        if(oldP !== state.passwordHash && oldP !== secretKey) {
            notice.style.color = '#f87171';
            notice.innerText = "Contraseña actual incorrecta.";
            return;
        }
        if(!newP) {
            notice.style.color = '#f87171';
            notice.innerText = "Ingresa una nueva contraseña válida.";
            return;
        }
        if(newP !== confP) {
            notice.style.color = '#f87171';
            notice.innerText = "Las nuevas contraseñas no coinciden.";
            return;
        }

        notice.style.color = '';
        notice.innerText = "Guardando...";

        state.passwordHash = newP;
        secretKey = newP;

        // Also update autologin file with new password if skip-lock is enabled
        if(state.skipLockScreen) {
            await window.api.saveAutologin({ masterPassword: newP, enabled: true });
        }

        await saveSecureDB("Cambiando Contraseña...");

        notice.style.color = 'var(--primary-color)';
        notice.innerText = "✓ Contraseña cambiada con éxito.";
        setTimeout(() => { notice.innerText = ''; notice.style.color = ''; }, 4000);

        document.getElementById('pwd-old').value = '';
        document.getElementById('pwd-new').value = '';
        document.getElementById('pwd-confirm').value = '';
    });

    document.getElementById('btn-save-recovery-email').addEventListener('click', async () => {
        const email = document.getElementById('setting-recovery-email').value.trim();
        state.recoveryEmail = email;
        await saveSecureDB();
        if(email && window.api.saveRecovery) {
            await window.api.saveRecovery({ email });
        }
        // Show linked badge
        const badge = document.getElementById('recovery-email-badge');
        const badgeSpan = document.getElementById('recovery-email-display');
        if(badge && badgeSpan) {
            if(email) {
                badge.style.display = 'inline-flex';
                badgeSpan.innerText = email;
            } else {
                badge.style.display = 'none';
            }
        }
        const notice = document.getElementById('settings-save-notice');
        notice.style.color = 'var(--primary-color)';
        notice.innerText = email ? `✓ Gmail vinculado: ${email}` : "✓ Correo eliminado.";
        setTimeout(() => { notice.innerText = ''; notice.style.color = ''; }, 3000);
    });

    // --- Forgot Password Logic ---
    let generatedRecoveryCode = '';

    document.getElementById('link-forgot-pwd').addEventListener('click', async (e) => {
        e.preventDefault();
        
        // We need to try to load the DB first to check for recovery email
        // Or if the app is already loaded (but locked), we just check state.
        // Since the app might be freshly opened, we check if state.recoveryEmail exists.
        // If not, we might need to load it from an unencrypted or easily accessible part?
        // But usually recoveryEmail is inside the encrypted DB.
        // This is a Catch-22: if you forget the password, you can't read the DB to find the recovery email.
        
        // BETTER APPROACH: Save recovery email in a separate, unencrypted file if desired,
        // OR simply rely on the fact that if they are in the app, it's already loaded but locked.
        // However, if the app just started, state is default.
        
        // Let's check if we can read the vault_recovery.json (unencrypted metadata)
        // I'll add a call to read recovery info.
        
        const loader = document.getElementById('global-loader');
        loader.querySelector('h2').innerText = "Iniciando recuperación...";
        loader.classList.remove('hidden');

        // Try to get recovery email from unencrypted source if possible
        // For now, I'll use the one in state if it's there, otherwise I'll try to peek.
        if(!state.recoveryEmail) {
            // Internal trick: maybe the user already put it in and it's in the DB.
            // But we can't read the DB without the password.
            // SO: We MUST save the recovery email in a separate file when it's set.
            // I'll update the save listener for recovery email.
        }

        // Ceder dos frames para que el loader sea visible antes de procesar
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        await new Promise(r => setTimeout(r, 20));

        if(!state.recoveryEmail) {
            const recoveryRes = await window.api.readRecovery();
            if(recoveryRes.success && recoveryRes.data) {
                try {
                    const recData = typeof recoveryRes.data === 'string' ? JSON.parse(recoveryRes.data) : recoveryRes.data;
                    state.recoveryEmail = recData.email || '';
                } catch(_) {}
            }
        }

        if(!state.recoveryEmail) {
            loader.classList.add('hidden');
            loader.style.display = '';
            showToast("No hay correo de recuperación configurado. Ve a Ajustes para agregarlo.");
            return;
        }

        generatedRecoveryCode = Math.floor(100000 + Math.random() * 900000).toString();
        const res = await window.api.sendRecoveryEmail({ to: state.recoveryEmail, code: generatedRecoveryCode });
        
        loader.classList.add('hidden');
        if(res.success) {
            showToast("Código enviado a " + state.recoveryEmail);
            document.getElementById('recovery-modal').classList.remove('hidden');
        } else {
            alert("Error enviando el correo: " + res.error);
        }
    });

    document.getElementById('btn-verify-recovery-code').addEventListener('click', () => {
        const input = document.getElementById('recovery-code-input').value.trim();
        if(input === generatedRecoveryCode) {
            document.getElementById('recovery-modal').classList.add('hidden');
            document.getElementById('reset-pwd-modal').classList.remove('hidden');
        } else {
            document.getElementById('recovery-code-error').classList.remove('hidden');
            setTimeout(() => document.getElementById('recovery-code-error').classList.add('hidden'), 3000);
        }
    });

    document.getElementById('btn-confirm-reset-pwd').addEventListener('click', async () => {
        const newP = document.getElementById('reset-pwd-new').value;
        const confP = document.getElementById('reset-pwd-confirm').value;
        
        if(!newP || newP !== confP) {
            alert("Las contraseñas no coinciden o son inválidas.");
            return;
        }

        state.passwordHash = newP;
        secretKey = newP;
        
        // We must successfully save the DB with the NEW password
        await saveSecureDB("Restableciendo Acceso...");
        
        // Unlock app
        document.getElementById('reset-pwd-modal').classList.add('hidden');
        handleLogin(newP);
        showToast("Contraseña restablecida con éxito.");
    });

    document.getElementById('btn-pick-global-bg').addEventListener('click', async () => {
        const res = await window.api.pickFile({ filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg', 'gif'] }]});
        if(res.success) {
            document.getElementById('setting-bg').value = res.files[0].dataURL;
        }
    });

    // --- Universal Converter Modal ---
    let pendingConversionFile = null;

    document.getElementById('btn-conv-pick-file').addEventListener('click', async () => {
        const res = await window.api.pickFile({ filters: [{name: 'Archivos', extensions: ['*']}] });
        if(res.success && res.files) {
            pendingConversionFile = res.files[0];
            document.getElementById('conv-sel-file').innerText = pendingConversionFile.name;
            document.getElementById('conv-options-box').classList.remove('hidden');
        }
    });

    document.querySelectorAll('.conv-opt').forEach(btn => {
        btn.addEventListener('click', async () => {
            if(!pendingConversionFile) return alert("Selecciona un archivo arriba primero.");
            const type = btn.getAttribute('data-type');
            
            const loader = document.getElementById('global-loader');
            if(loader) {
                loader.querySelector('h2').innerText = "Convirtiendo Archivo...";
                loader.classList.remove('hidden');
            }
            const hideLoader = () => { if(loader) loader.classList.add('hidden'); };
            
            const isImgConv = type.startsWith('img-');
            if(isImgConv) {
                const outFormat = type.split('-')[1]; // jpeg, png, webp, svg
                const canvas = document.getElementById('conversion-canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                img.onload = async () => {
                    canvas.width = img.width; canvas.height = img.height;
                    
                    if(outFormat === 'jpeg') { 
                        ctx.fillStyle = "#ffffff"; ctx.fillRect(0,0, canvas.width, canvas.height); 
                    }
                    
                    if(outFormat === 'svg') {
                        // Creating a pure SVG wrapper since converting bitmap to vector offline requires tracing.
                        const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="${img.width}" height="${img.height}">
                            <image href="${pendingConversionFile.dataURL}" width="100%" height="100%"/>
                        </svg>`;
                        const finalData = `data:image/svg+xml;base64,${btoa(svgData)}`;
                        const res = await window.api.exportFile({ 
                            name: pendingConversionFile.name.split('.')[0] + '.svg', 
                            dataURL: finalData, type: 'image/svg+xml'
                        });
                        if(res.success) alert("Conversión Finalizada con Éxito.");
                        return;
                    }

                    ctx.drawImage(img, 0, 0);
                    
                    const mimeMap = { 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp' };
                    const mime = mimeMap[outFormat];
                    const finalData = canvas.toDataURL(mime, 0.9);
                    
                    const res = await window.api.exportFile({ 
                        name: pendingConversionFile.name.split('.')[0] + '.' + outFormat, 
                        dataURL: finalData,
                        type: mime
                    });
                    hideLoader();
                    if(res.success) alert("Conversión Finalizada con Éxito.");
                };
                img.src = pendingConversionFile.dataURL;
            } else if (type === 'img-pptx') {
                if(!pendingConversionFile.dataURL.startsWith('data:image/')) return alert("El conversor PPTX actualmente solo admite imágenes (offline).");
                try {
                    let pptx = new PptxGenJS();
                    let slide = pptx.addSlide();
                    slide.addImage({ data: pendingConversionFile.dataURL, x: 0, y: 0, w: '100%', h: '100%' });
                    
                    pptx.write('base64').then(async (base64) => {
                        const finalData = 'data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,' + base64;
                        const res = await window.api.exportFile({ 
                            name: pendingConversionFile.name.split('.')[0] + '.pptx', 
                            dataURL: finalData,
                            type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
                        });
                        if(res.success) alert("Conversión a PPTX Finalizada con Éxito.");
                    }).catch(e => {
                        console.error(e);
                        alert("Error creando PPTX.");
                    });
                } catch(e) { console.error(e); alert("pptxgenjs failed"); }
            } else if (type === 'txt-word' || type === 'txt-pdf') {
                if(pendingConversionFile.name.endsWith('.pdf')) {
                    if (type === 'txt-word') {
                        // Word Native Support: Export the PDF with .doc extension, MS Word handles conversion natively.
                        const res = await window.api.exportFile({ 
                            name: pendingConversionFile.name.split('.')[0] + '.doc', 
                            dataURL: pendingConversionFile.dataURL,
                            type: 'application/msword'
                        });
                        if(res.success) return alert("PDF Extraido Exitosamente. MS Word lo convertirá automáticamente al abrirlo.");
                    } else {
                        return alert('Por seguridad y vulnerabilidades (0 Dependencias Externas), VaultSecurity NO trae un motor de decodificación incrustado. El archivo ya es un PDF.');
                    }
                }
                
                if(!pendingConversionFile.name.endsWith('.txt')) {
                    return alert('Por favor sube un archivo de Texto plano (.txt) para convertirlo a Word/PDF.');
                }
                
                const base64Data = pendingConversionFile.dataURL.split(',')[1];
                const decodedStr = decodeURIComponent(escape(atob(base64Data)));
                
                let outContent = "";
                let mime = "";
                let ext = "";

                if(type === 'txt-word') {
                    mime = 'application/msword'; ext = '.doc';
                    outContent = `
                        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                        <head><meta charset='utf-8'><title>Doc</title></head><body>
                        <div style="font-family:Arial,sans-serif; font-size: 14pt;">
                        ${decodedStr.replace(/\n/g, '<br>')}
                        </div></body></html>
                    `;
                } else {
                    mime = 'text/html'; ext = '.pdf';
                    outContent = `<head><title>PDF (Offline View)</title></head><body style="padding:40px; font-family:sans-serif;">${decodedStr.replace(/\n/g, '<br>')}
                    <hr><i>PDF Offline generado por VaultSecurity. Manda a imprimir esta página (Ctrl+P) y elige "Guardar como PDF".</i></body>`;
                    if(confirm("Para crear un PDF sin acceso a internet, VaultSecurity generará un documento imprimible. Por favor oprime Ctrl+P y elige 'Guardar como PDF' en la ventana que se abrirá.")) {
                        // Let user print it using window.open
                    }
                }

                const outB64 = btoa(unescape(encodeURIComponent(outContent)));
                const docDataURL = `data:${mime};base64,${outB64}`;

                const res = await window.api.exportFile({ 
                    name: pendingConversionFile.name.split('.')[0] + ext, 
                    dataURL: docDataURL,
                    type: mime
                });
                if(res.success) alert(`Conversión a ${ext.toUpperCase()} Exitosa.`);
            }
        });
    });

    // --- PDF Tools Logic ---
    let pdfFilesList = [];
    window.currentPdfPreviewIndex = -1;
    
    // Explicit configuracion para la web worker nativa de electron (local)
    if(window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'node_modules/pdfjs-dist/build/pdf.worker.min.js';
    }

    window.previewPdf = async function(index) {
        if(!window.pdfjsLib) return alert("El motor PDF nativo aún está cargando o reportó un error de lectura.");
        const file = pdfFilesList[index];
        if(!file) return;
        
        window.currentPdfPreviewIndex = index;
        const container = document.getElementById('pdf-preview-container');
        container.innerHTML = '<div style="color:var(--text-muted); grid-column: 1 / -1; text-align:center;">Analizando páginas en memoria, por favor espera...</div>';
        
        try {
            const arr = Uint8Array.from(atob(file.dataURL.split(',')[1]), c => c.charCodeAt(0));
            const loadingTask = window.pdfjsLib.getDocument({data: arr});
            const pdfDocument = await loadingTask.promise;
            const numPages = pdfDocument.numPages;
            
            container.innerHTML = '';
            file.selectedPages = file.selectedPages || new Set();
            updatePdfSelectionInfo(file);
            
            for(let i=1; i<=numPages; i++) {
                const page = await pdfDocument.getPage(i);
                const viewport = page.getViewport({scale: 0.5});
                
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                canvas.style = `width:100%; height:auto; border-radius:4px; box-shadow:0 2px 5px rgba(0,0,0,0.5); background:white;`;
                
                const ctx = canvas.getContext('2d');
                await page.render({canvasContext: ctx, viewport: viewport}).promise;
                
                const wrapper = document.createElement('div');
                const isSelected = file.selectedPages.has(i-1);
                wrapper.style = `position:relative; cursor:pointer; padding:5px; border-radius:6px; transition:0.2s; border:2px solid ${isSelected ? 'var(--primary-color)' : 'transparent'}; background:${isSelected ? 'rgba(0,255,204,0.1)' : 'transparent'}`;
                
                wrapper.innerHTML = `<div style="text-align:center; font-size:10px; font-weight:bold; margin-bottom:5px; color:${isSelected ? 'var(--primary-color)' : 'var(--text-muted)'}">Pág ${i}</div>`;
                wrapper.appendChild(canvas);
                
                if(isSelected) {
                    const checkIcon = document.createElement('div');
                    checkIcon.style = `position:absolute; top:35px; right:15px; background:var(--primary-color); color:black; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-weight:bold; box-shadow:0 2px 5px rgba(0,0,0,0.5); font-size:16px;`;
                    checkIcon.innerHTML = `<ion-icon name="checkmark"></ion-icon>`;
                    wrapper.appendChild(checkIcon);
                }
                
                wrapper.onclick = () => {
                    if(file.selectedPages.has(i-1)) file.selectedPages.delete(i-1);
                    else file.selectedPages.add(i-1);
                    updatePdfSelectionInfo(file);
                    previewPdf(index);
                };
                
                container.appendChild(wrapper);
            }
        } catch(e) {
            console.error(e);
            container.innerHTML = '<div style="color:var(--danger); grid-column: 1 / -1; text-align:center;">Error renderizando visualización del PDF.</div>';
        }
    };

    function updatePdfSelectionInfo(file) {
        document.getElementById('pdf-selection-info').innerText = `${file.selectedPages ? file.selectedPages.size : 0} hojas seleccionadas`;
    }

    function renderPdfList() {
        const container = document.getElementById('pdf-list-container');
        container.innerHTML = '';
        pdfFilesList.forEach((pdf, index) => {
            const el = document.createElement('div');
            el.className = 'file-item';
            el.style = `background-color: ${index === window.currentPdfPreviewIndex ? 'rgba(0,255,204,0.1)' : 'rgba(0,0,0,0.4)'}; flex-direction: column; align-items: stretch; border: 1px solid ${index === window.currentPdfPreviewIndex ? 'var(--primary-color)' : 'var(--glass-border)'};`;
            el.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div class="file-label" style="cursor:pointer; flex:1;" onclick="previewPdf(${index})" title="Haz click para previsualizar este documento">
                        <ion-icon name="document" style="margin-right:5px; color:${index === window.currentPdfPreviewIndex ? 'var(--primary-color)' : 'var(--text-muted)'}"></ion-icon>
                        <span style="font-size: 13px; word-break: break-all; font-weight:${index === window.currentPdfPreviewIndex ? 'bold' : 'normal'}">${pdf.name}</span>
                    </div>
                    <div style="display:flex; gap:5px; flex-shrink: 0; margin-left:10px;">
                        <button class="btn-action-sm" onclick="movePdf(${index}, -1)" ${index === 0 ? 'disabled style="opacity:0.3"' : ''} title="Subir"><ion-icon name="chevron-up"></ion-icon></button>
                        <button class="btn-action-sm" onclick="movePdf(${index}, 1)" ${index === pdfFilesList.length - 1 ? 'disabled style="opacity:0.3"' : ''} title="Bajar"><ion-icon name="chevron-down"></ion-icon></button>
                        <button class="btn-action-sm danger" onclick="removePdf(${index})" title="Quitar"><ion-icon name="close"></ion-icon></button>
                    </div>
                </div>
            `;
            container.appendChild(el);
        });
        
        if(pdfFilesList.length === 0) {
            document.getElementById('pdf-preview-container').innerHTML = '<div style="color:var(--text-muted); grid-column: 1 / -1; text-align:center;">Selecciona un PDF en la lista para escanear sus páginas.</div>';
            document.getElementById('pdf-selection-info').innerText = "0 hojas seleccionadas";
            window.currentPdfPreviewIndex = -1;
        }
    }

    window.movePdf = function(index, dir) {
        if(index + dir < 0 || index + dir >= pdfFilesList.length) return;
        const temp = pdfFilesList[index];
        pdfFilesList[index] = pdfFilesList[index + dir];
        pdfFilesList[index + dir] = temp;
        // If the moved one is the active one, update index
        if(window.currentPdfPreviewIndex === index) window.currentPdfPreviewIndex += dir;
        else if(window.currentPdfPreviewIndex === index + dir) window.currentPdfPreviewIndex -= dir;
        renderPdfList();
    };

    window.removePdf = function(index) {
        pdfFilesList.splice(index, 1);
        if(window.currentPdfPreviewIndex === index) {
            window.currentPdfPreviewIndex = -1;
            document.getElementById('pdf-preview-container').innerHTML = '<div style="color:var(--text-muted); grid-column: 1 / -1; text-align:center;">Selecciona un PDF en la lista para escanear sus páginas.</div>';
            document.getElementById('pdf-selection-info').innerText = "0 hojas seleccionadas";
        } else if(window.currentPdfPreviewIndex > index) {
            window.currentPdfPreviewIndex--;
        }
        renderPdfList();
    };

    document.getElementById('btn-pdf-add').addEventListener('click', async () => {
        const res = await window.api.pickFile({ filters: [{name: 'PDF', extensions: ['pdf']}] });
        if(res.success && res.files) {
            res.files.forEach(f => f.selectedPages = new Set());
            pdfFilesList.push(...res.files);
            renderPdfList();
            if(window.currentPdfPreviewIndex === -1) previewPdf(0);
        }
    });

    document.getElementById('btn-pdf-clear').addEventListener('click', () => {
        if(pdfFilesList.length===0) return;
        pdfFilesList = [];
        renderPdfList();
    });

    document.getElementById('btn-pdf-export-selected').addEventListener('click', async () => {
        const file = pdfFilesList[window.currentPdfPreviewIndex];
        if(!file || !file.selectedPages || file.selectedPages.size === 0) return alert("Selecciona en la cuadrícula qué hojas quieres exportar.");
        
        try {
            const arr = Uint8Array.from(atob(file.dataURL.split(',')[1]), c => c.charCodeAt(0));
            const pdfDoc = await PDFLib.PDFDocument.load(arr);
            const exportPdf = await PDFLib.PDFDocument.create();
            
            const indices = Array.from(file.selectedPages).sort((a,b)=>a-b);
            const copiedPages = await exportPdf.copyPages(pdfDoc, indices);
            copiedPages.forEach(p => exportPdf.addPage(p));
            
            const pdfBytes = await exportPdf.saveAsBase64({ dataUri: true });
            const res = await window.api.exportFile({
                name: `Extraccion_${file.name}`,
                dataURL: pdfBytes,
                type: "application/pdf"
            });
            if(res.success) {
                alert("Se han exportado tus hojas seleccionadas en un nuevo archivo.");
                file.selectedPages.clear();
                previewPdf(window.currentPdfPreviewIndex);
            }
        } catch(e) { console.error(e); alert("Hubo un error al exportar la selección."); }
    });

    document.getElementById('btn-pdf-delete-selected').addEventListener('click', async () => {
        const file = pdfFilesList[window.currentPdfPreviewIndex];
        if(!file || !file.selectedPages || file.selectedPages.size === 0) return alert("Selecciona qué hojas deseas eliminar y purgar del documento activo.");
        
        if(!confirm(`Se PURGARÁN DE FORMA DEFINITIVA las ${file.selectedPages.size} hojas seleccionadas dentro de la sesión de este archivo. ¿Continuar?`)) return;
        
        try {
            const arr = Uint8Array.from(atob(file.dataURL.split(',')[1]), c => c.charCodeAt(0));
            const pdfDoc = await PDFLib.PDFDocument.load(arr);
            const total = pdfDoc.getPageCount();
            const exportPdf = await PDFLib.PDFDocument.create();
            
            // Collect pages to keep (not selected)
            const keepIndices = [];
            for(let i=0; i<total; i++) {
                if(!file.selectedPages.has(i)) keepIndices.push(i);
            }
            
            if(keepIndices.length === 0) {
                return alert("No puedes eliminar absolutamente TODAS las hojas, destrúyelo explícitamente quitándolo de la lista.");
            }
            
            const copiedPages = await exportPdf.copyPages(pdfDoc, keepIndices);
            copiedPages.forEach(p => exportPdf.addPage(p));
            
            const pdfBytes = await exportPdf.saveAsBase64({ dataUri: true });
            file.dataURL = pdfBytes; // Overwrite memory
            file.selectedPages.clear();
            
            previewPdf(window.currentPdfPreviewIndex);
            alert("Las hojas fueron eliminadas exitosamente de la sesión actual de la app.");
        } catch(e) { console.error(e); alert("Hubo un error al destruir las hojas."); }
    });

    document.getElementById('btn-pdf-merge').addEventListener('click', async () => {
        if(pdfFilesList.length < 2) return alert("Añade al menos 2 PDFs para combinarlos.");
        try {
            const mergedPdf = await PDFLib.PDFDocument.create();
            let added = 0;
            for(let file of pdfFilesList) {
                const arr = Uint8Array.from(atob(file.dataURL.split(',')[1]), c => c.charCodeAt(0));
                const pdfDoc = await PDFLib.PDFDocument.load(arr);
                
                // If they selected explicitly some pages on this file, merge only those.
                // Otherwise, merge all.
                let indices = [];
                if(file.selectedPages && file.selectedPages.size > 0) {
                    indices = Array.from(file.selectedPages).sort((a,b)=>a-b);
                } else {
                    indices = Array.from({length: pdfDoc.getPageCount()}, (_, i) => i);
                }
                
                const copiedPages = await mergedPdf.copyPages(pdfDoc, indices);
                copiedPages.forEach(page => { mergedPdf.addPage(page); added++; });
            }
            
            if(added === 0) return alert("No hay hojas efectivas para unir.");
            const pdfBytes = await mergedPdf.saveAsBase64({ dataUri: true });
            const res = await window.api.exportFile({
                name: "Unidos_" + Date.now() + ".pdf",
                dataURL: pdfBytes,
                type: "application/pdf"
            });
            if(res.success) alert("Archivos Unidos y Exportados exitosamente!");
        } catch(e) { console.error(e); alert("Hubo un error interno al crear el PDF unificado."); }
    });

    // ─── Toast notification ───
    function showToast(msg, duration = 3000) {
        let t = document.getElementById('vault-toast');
        if(!t) {
            t = document.createElement('div');
            t.id = 'vault-toast';
            t.style = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%) translateY(20px);background:rgba(20,20,20,0.95);color:white;padding:12px 24px;border-radius:30px;font-size:14px;z-index:99999;border:1px solid var(--glass-border);transition:all 0.3s;opacity:0;backdrop-filter:blur(10px);';
            document.body.appendChild(t);
        }
        t.innerText = msg;
        t.style.opacity = '1';
        t.style.transform = 'translateX(-50%) translateY(0)';
        clearTimeout(t._timeout);
        t._timeout = setTimeout(() => {
            t.style.opacity = '0';
            t.style.transform = 'translateX(-50%) translateY(20px)';
        }, duration);
    }

    // ─── Trash rendering ───
    function renderTrash() {
        if(!state.trash) state.trash = [];
        const list = document.getElementById('trash-list');
        const emptyMsg = document.getElementById('trash-empty-msg');
        if(!list) return;

        // Clear non-empty items
        Array.from(list.children).forEach(c => { if(c.id !== 'trash-empty-msg') c.remove(); });

        if(state.trash.length === 0) {
            if(emptyMsg) emptyMsg.style.display = '';
            return;
        }
        if(emptyMsg) emptyMsg.style.display = 'none';

        [...state.trash].reverse().forEach(entry => {
            const el = document.createElement('div');
            el.style = 'display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.04);border:1px solid var(--glass-border);border-radius:10px;padding:14px 18px;gap:10px;';

            let icon = 'document-text';
            let label = '';
            const isDriveItem = entry.item && entry.item.driveFileId;

            if(entry.itemType === 'space') {
                icon = entry.spaceMode === 'album' ? 'images' : (entry.spaceMode === 'note' ? 'journal' : 'folder');
                label = `<b>${entry.item.name}</b> <span style="font-size:11px;color:var(--text-muted);">(${entry.spaceMode === 'folder' ? 'Carpeta' : entry.spaceMode === 'album' ? 'Album' : 'Grupo de Notas'})</span>`;
            } else if(entry.itemType === 'note') {
                icon = 'document';
                label = `<b>${entry.item.title}</b> <span style="font-size:11px;color:var(--text-muted);">(Nota)</span>`;
            } else {
                label = `<b>${entry.item.name}</b>`;
                if(isDriveItem) label += ` <span style="font-size:11px;padding:2px 6px;background:rgba(66,133,244,0.2);border-radius:4px;color:#4285f4;">Drive</span>`;
            }

            const dateStr = new Date(entry.deletedAt).toLocaleDateString('es', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});

            el.innerHTML = `
                <div style="display:flex;align-items:center;gap:12px;flex:1;">
                    <ion-icon name="${icon}" style="font-size:22px;color:var(--text-muted);flex-shrink:0;"></ion-icon>
                    <div>
                        <div style="font-size:14px;">${label}</div>
                        <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Eliminado: ${dateStr}</div>
                        ${isDriveItem ? '<div class="trash-drive-notice"><ion-icon name="cloud-done" style="vertical-align:middle"></ion-icon> ¿Subir de nuevo a Drive al restaurar?</div>' : ''}
                    </div>
                </div>
                <div style="display:flex;gap:5px;flex-shrink:0;align-items:center;">
                    ${isDriveItem ? `<button class="btn-action-sm btn-restore-drive" data-restore-drive="${entry.trashId}" title="Restaurar + subir a Drive" style="width:32px;height:32px;padding:0;min-height:0;border-radius:8px;">
                        <ion-icon name="cloud-upload-outline"></ion-icon>
                    </button>` : ''}
                    <button class="btn-action-sm" data-restore="${entry.trashId}" title="Restaurar" style="width:32px;height:32px;padding:0;min-height:0;border-radius:8px;color:var(--primary-color);border-color:rgba(0,255,204,0.3);">
                        <ion-icon name="arrow-undo"></ion-icon>
                    </button>
                    <button class="btn-action-sm danger" data-perma-del="${entry.trashId}" title="Eliminar definitivamente" style="width:32px;height:32px;padding:0;min-height:0;border-radius:8px;">
                        <ion-icon name="trash"></ion-icon>
                    </button>
                </div>
            `;

            // Restore button
            el.querySelector(`[data-restore="${entry.trashId}"]`).addEventListener('click', () => {
                restoreFromTrash(entry.trashId, false);
            });
            // Perma delete
            el.querySelector(`[data-perma-del="${entry.trashId}"]`).addEventListener('click', () => {
                state.trash = state.trash.filter(x => x.trashId !== entry.trashId);
                saveSecureDB(); renderTrash();
            });
            // Restore + re-upload to Drive
            const drvRestBtn = el.querySelector(`[data-restore-drive="${entry.trashId}"]`);
            if(drvRestBtn) drvRestBtn.addEventListener('click', () => restoreFromTrash(entry.trashId, true));

            list.appendChild(el);
        });
    }

    async function restoreFromTrash(trashId, reuploadToDrive = false) {
        const entry = state.trash.find(x => x.trashId === trashId);
        if(!entry) return;

        if(entry.itemType === 'space') {
            const arr = entry.spaceMode === 'folder' ? state.folders : (entry.spaceMode === 'album' ? state.albums : state.notes);
            arr.push(entry.item);
            showToast(`"${entry.item.name}" restaurado correctamente.`);

        } else if(entry.itemType === 'note') {
            const space = state.notes.find(x => x.id === entry.parentSpaceId);
            if(space) {
                if(!space.noteItems) space.noteItems = [];
                space.noteItems.push(entry.item);
                showToast(`Nota "${entry.item.title}" restaurada.`);
            } else { showToast("El grupo original ya no existe. Nota no restaurada."); }

        } else {
            // file
            const arr = entry.parentSpaceMode === 'folder' ? state.folders : state.albums;
            const space = arr.find(x => x.id === entry.parentSpaceId);
            if(space) {
                const lType = entry.fileType || (entry.parentSpaceMode === 'folder' ? 'docs' : 'imgs');
                if(!space[lType]) space[lType] = [];
                const restoredItem = { ...entry.item, driveFileId: null };
                space[lType].push(restoredItem);
                if(reuploadToDrive) {
                    showToast("Volviendo a subir a Google Drive...");
                    await uploadFileToDrive(restoredItem, space);
                }
                showToast(`"${entry.item.name}" restaurado al lugar original.`);
            } else { showToast("La carpeta original ya no existe."); }
        }

        state.trash = state.trash.filter(x => x.trashId !== trashId);
        saveSecureDB(); renderSpaces(); renderTrash();
    }

    // ─── Empty Trash ───
    document.getElementById('btn-empty-trash').addEventListener('click', () => {
        if(!state.trash || state.trash.length === 0) return showToast("La papelera ya esta vacia.");
        state.trash = [];
        saveSecureDB(); renderTrash();
        showToast("Papelera vaciada permanentemente.");
    });

    // ─── Drive UI init ───
    async function initDriveUI() {
        const status = await window.api.driveStatus();
        updateDriveUI(status);
    }

    function updateDriveUI(status) {
        const miniPanel = document.getElementById('drive-mini-status');
        const infoText = document.getElementById('drive-info-text');
        const btnConnect = document.getElementById('btn-drive-connect');
        const btnDisconnect = document.getElementById('btn-drive-disconnect');
        
        const profilePicSettings = document.getElementById('drive-profile-pic-settings');
        const profilePicMini = document.getElementById('drive-profile-pic-mini');
        const userNameText = document.getElementById('drive-user-name');
        const spaceBar = document.getElementById('drive-space-bar');
        const spaceText = document.getElementById('drive-space-text');

        if(status.connected) {
            const usedGB = (status.usedBytes / 1e9).toFixed(2);
            const totalGB = status.totalBytes > 0 ? (status.totalBytes / 1e9).toFixed(1) : '?';
            const pct = status.totalBytes > 0 ? Math.min(100, Math.round(status.usedBytes / status.totalBytes * 100)) : 0;
            const barColor = pct > 85 ? '#ea4335' : pct > 60 ? '#ffba00' : '#00ac47';

            if(miniPanel) {
                miniPanel.innerHTML = `
                    <div style="font-size:12px;font-weight:bold;color:white;margin-bottom:4px;">${status.email}</div>
                    <div style="font-size:11px;color:var(--text-muted);">${usedGB} GB / ${totalGB} GB</div>`;
            }
            
            if(profilePicMini) {
                profilePicMini.classList.remove('hidden');
                profilePicMini.innerHTML = status.picture ? `<img src="${status.picture}" class="drive-profile-pic">` : '';
            }

            if(infoText) infoText.innerHTML = '';
            if(userNameText) { userNameText.innerText = status.name; userNameText.style.display = 'block'; }
            if(infoText) { infoText.innerText = status.email; infoText.style.color = 'var(--text-muted)'; }
            
            if(profilePicSettings) {
                profilePicSettings.style.display = 'block';
                if(status.picture) profilePicSettings.style.backgroundImage = `url('${status.picture}')`;
            }

            if(spaceBar) spaceBar.style.display = 'block';
            const spaceFill = document.getElementById('drive-space-fill');
            if(spaceFill) {
                spaceFill.style.width = pct + '%';
                spaceFill.style.background = barColor;
            }
            if(spaceText) {
                spaceText.innerText = `${usedGB} GB de ${totalGB} GB usados (${pct}%)`;
                spaceText.style.display = 'block';
            }

            if(btnConnect) btnConnect.style.display = 'none';
            if(btnDisconnect) btnDisconnect.style.display = 'block';
        } else {
            if(miniPanel) miniPanel.innerHTML = `<span style="color:var(--text-muted);font-size:13px;">No vinculado</span>`;
            if(profilePicMini) profilePicMini.classList.add('hidden');
            if(infoText) {
                infoText.innerHTML = `<p style="color:var(--text-muted);font-size:13px;margin:0;">No hay cuenta vinculada. Conecta para sincronizar archivos con Google Drive.</p>`;
            }
            if(userNameText) userNameText.style.display = 'none';
            if(profilePicSettings) profilePicSettings.style.display = 'none';
            if(spaceBar) spaceBar.style.display = 'none';
            if(spaceText) spaceText.style.display = 'none';
            
            if(btnConnect) btnConnect.style.display = 'block';
            if(btnDisconnect) btnDisconnect.style.display = 'none';
        }
    }

    document.getElementById('btn-drive-connect').addEventListener('click', async () => {
        showToast("Abriendo navegador para autorizar Drive...", 5000);
        const res = await window.api.driveConnect();
        if(res.success) {
            showToast("Google Drive conectado: " + res.email);
            const status = await window.api.driveStatus();
            updateDriveUI(status);
        } else {
            showToast("Error al conectar Drive. Intenta de nuevo.");
        }
    });

    document.getElementById('btn-drive-disconnect').addEventListener('click', async () => {
        await window.api.driveDisconnect();
        updateDriveUI({ connected: false });
        showToast("Cuenta de Google Drive desconectada.");
    });

    function updateDashboardStats() {
        let docsCount = state.folders.reduce((acc, f) => acc + (f.docs ? f.docs.length : 0), 0);
        let imgsCount = state.albums.reduce((acc, a) => acc + (a.imgs ? a.imgs.length : 0), 0);
        let notesCount = state.notes.reduce((acc, n) => acc + (n.noteItems ? n.noteItems.length : 0), 0);
        const stD = document.getElementById('stat-docs'); if(stD) stD.innerText = docsCount + " Archivos";
        const stI = document.getElementById('stat-imgs'); if(stI) stI.innerText = imgsCount + " Imágenes";
        const stN = document.getElementById('stat-notes'); if(stN) stN.innerText = notesCount + " Notas";
        
        // Render Dashboard Upcoming Events
        if(!state.calendarEvents) return;
        const container = document.getElementById('dashboard-events-list');
        if(!container) return;
        
        const now = new Date();
        const sortedEvents = [...state.calendarEvents].sort((a,b) => {
            return new Date(a.date+'T'+(a.time||'00:00')) - new Date(b.date+'T'+(b.time||'00:00'));
        });
        const upcoming = sortedEvents.filter(e => {
            const evDate = new Date(e.date+'T'+(e.time||'23:59'));
            return evDate >= now && !e.triggered;
        }).slice(0, 3);
        
        if(upcoming.length === 0) {
            container.innerHTML = '<div style="color:var(--text-muted); font-size:14px;">No hay eventos próximos.</div>';
            return;
        }
        
        container.innerHTML = upcoming.map(ev => `
            <div style="background:rgba(0,0,0,0.2); padding: 12px; border-radius:6px; border-left:4px solid var(--primary-color);">
                <div style="font-weight:bold; font-size:14px;">${ev.title}</div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:3px;"><ion-icon name="calendar"></ion-icon> ${ev.date} ${ev.time ? ' - ' + ev.time : ''}</div>
            </div>
        `).join('');
    }

    // --- Calendar & Notes Logic ---
    let currentDate = new Date();
    
    function renderCalendar() {
        if(!state.calendarEvents) state.calendarEvents = [];
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
        document.getElementById('cal-month-year').innerText = `${monthNames[month]} ${year}`;
        
        const grid = document.getElementById('calendar-grid');
        const frag = document.createDocumentFragment();
        
        // Padding days
        for(let i = 0; i < firstDay; i++) {
            frag.appendChild(document.createElement('div'));
        }
        
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

        for(let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
            const isToday = dateStr === todayStr;
            const eventsForDay = state.calendarEvents.filter(e => e.date === dateStr);
            
            const el = document.createElement('div');
            el.style.cssText = `padding:8px;border-radius:8px;border:1px solid var(--glass-border);background:${isToday?'rgba(0,255,204,0.2)':'rgba(255,255,255,0.05)'};cursor:pointer;text-align:center;position:relative;min-height:52px;transition:border-color 0.15s;`;
            el.innerHTML = `<div style="font-weight:bold;${isToday?'color:var(--primary-color)':''}">${i}</div>${eventsForDay.length?`<div style="font-size:9px;color:var(--primary-color);margin-top:3px;">${eventsForDay.length} ev.</div>`:''}`;
            el.onmouseenter = () => el.style.borderColor = 'var(--primary-color)';
            el.onmouseleave = () => el.style.borderColor = 'var(--glass-border)';
            el.onclick = () => {
                document.getElementById('ev-date').value = dateStr;
                openCalendarDayModal(dateStr, eventsForDay);
            };
            frag.appendChild(el);
        }
        
        grid.innerHTML = '';
        grid.appendChild(frag);
        renderEventsList();
    }
    
    document.getElementById('cal-prev').onclick = () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); };
    document.getElementById('cal-next').onclick = () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); };
    
    window.openCalendarDayModal = function(dateStr, eventsForDay) {
        document.getElementById('day-modal-title').innerText = `Eventos: ${dateStr}`;
        const list = document.getElementById('day-events-list');
        list.innerHTML = '';
        
        if(eventsForDay.length === 0) {
            list.innerHTML = '<div style="color:var(--text-muted); font-size:14px; text-align:center;">No hay eventos este día.</div>';
        } else {
            eventsForDay.forEach(ev => {
                const el = document.createElement('div');
                el.style = "background:rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; position:relative; cursor:pointer;";
                el.onclick = (e) => { 
                    if(!e.target.closest('.delete-btn')) {
                        editCalendarEvent(ev.id); 
                    }
                };
                el.innerHTML = `
                    <div style="font-weight:bold; color:var(--primary-color); margin-bottom:5px;">${ev.title}</div>
                    <div style="font-size:12px; color:var(--text-muted);"><ion-icon name="time"></ion-icon> ${ev.time} | <ion-icon name="notifications"></ion-icon> ${ev.sound==='none'?'Silencio':ev.sound}</div>
                    ${ev.notes ? `<div style="font-size:13px; margin-top:5px; border-top:1px solid rgba(255,255,255,0.1); padding-top:5px;">${ev.notes}</div>` : ''}
                    <button class="delete-btn btn-action-sm danger" style="position:absolute; top:8px; right:8px; border-radius:50%; width:26px; height:26px; min-height:0; padding:0;" onclick="removeCalendarEvent('${ev.id}'); document.getElementById('calendar-day-modal').classList.add('hidden');"><ion-icon name="close"></ion-icon></button>
                `;
                list.appendChild(el);
            });
        }
        
        document.getElementById('calendar-day-modal').classList.remove('hidden');
    };

    window.editCalendarEvent = function(id) {
        document.getElementById('calendar-day-modal').classList.add('hidden');
        const ev = state.calendarEvents.find(e => e.id === id);
        if(!ev) return;
        window.currentEditEventId = id;
        document.getElementById('ev-date').value = ev.date;
        document.getElementById('ev-time').value = ev.time || '';
        document.getElementById('ev-title').value = ev.title;
        document.getElementById('ev-notes').value = ev.notes || '';
        document.getElementById('ev-sound').value = ev.sound || 'beep';
        document.getElementById('calendar-event-modal').classList.remove('hidden');
    };

    document.getElementById('btn-open-new-event').onclick = () => {
        window.currentEditEventId = null;
        document.getElementById('calendar-day-modal').classList.add('hidden');
        openCalendarEventModal();
    };

    window.openCalendarEventModal = function() {
        document.getElementById('ev-title').value = '';
        document.getElementById('ev-time').value = '';
        document.getElementById('ev-notes').value = '';
        document.getElementById('ev-sound').value = 'beep';
        if(!document.getElementById('ev-date').value) {
            const d = new Date();
            document.getElementById('ev-date').value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        }
        document.getElementById('calendar-event-modal').classList.remove('hidden');
    }
    
    document.getElementById('btn-save-event').onclick = () => {
        const date = document.getElementById('ev-date').value;
        let time = document.getElementById('ev-time').value;
        const title = document.getElementById('ev-title').value.trim();
        const notes = document.getElementById('ev-notes').value.trim();
        const sound = document.getElementById('ev-sound').value;
        
        if(!date || !title) return alert("La Fecha y el Título son campos requeridos.");
        
        if(!time) {
            alert("Aviso: No se ha puesto la hora para el evento, por lo tanto la alarma no sonará hasta que se edite y se asigne una hora.");
            time = ""; // Keep empty
        }
        
        if(window.currentEditEventId) {
            const evIndex = state.calendarEvents.findIndex(e => e.id === window.currentEditEventId);
            if(evIndex > -1) {
                state.calendarEvents[evIndex].date = date;
                state.calendarEvents[evIndex].time = time;
                state.calendarEvents[evIndex].title = title;
                state.calendarEvents[evIndex].notes = notes;
                state.calendarEvents[evIndex].sound = sound;
                state.calendarEvents[evIndex].triggered = false;
            }
            window.currentEditEventId = null;
        } else {
            state.calendarEvents.push({
                id: Date.now().toString(),
                date, time, title, notes, sound,
                triggered: false
            });
        }
        saveSecureDB();
        document.getElementById('calendar-event-modal').classList.add('hidden');
        renderCalendar();
        updateDashboardStats();
    };

    window.removeCalendarEvent = function(id) {
        state.calendarEvents = state.calendarEvents.filter(e => e.id !== id);
        saveSecureDB();
        renderCalendar();
        updateDashboardStats();
    }
    
    function renderEventsList() {
        if(!state.calendarEvents) state.calendarEvents = [];
        const container = document.getElementById('calendar-events-list');
        const pastContainer = document.getElementById('calendar-past-list');
        if(container) container.innerHTML = '';
        if(pastContainer) pastContainer.innerHTML = '';

        const sortedEvents = [...state.calendarEvents].sort((a,b) => {
            return new Date(a.date+'T'+(a.time||'00:00')) - new Date(b.date+'T'+(b.time||'00:00'));
        });

        const now = new Date();
        const upcoming = sortedEvents.filter(e => new Date(e.date+'T'+(e.time||'23:59')) >= now);
        const past = sortedEvents.filter(e => new Date(e.date+'T'+(e.time||'23:59')) < now).reverse();

        function makeEventCard(ev) {
            const el = document.createElement('div');
            el.className = 'glass-panel';
            el.style = 'padding:15px; border-radius:8px; position:relative;';
            el.innerHTML = `
                <div style="font-weight:bold; color:var(--primary-color); margin-bottom:5px;">${ev.title}</div>
                <div style="font-size:12px; color:var(--text-muted);"><ion-icon name="calendar"></ion-icon> ${ev.date} ${ev.time ? 'a las '+ev.time : ''}</div>
                ${ev.notes ? `<div style="font-size:13px; margin-top:5px; border-top:1px solid rgba(255,255,255,0.1); padding-top:5px;">${ev.notes}</div>` : ''}
                <button class="btn-action-sm danger" style="position:absolute; top:8px; right:8px; border-radius:50%; width:26px; height:26px; min-height:0; padding:0;" onclick="removeCalendarEvent('${ev.id}')"><ion-icon name="close"></ion-icon></button>
            `;
            return el;
        }

        if(container) {
            if(upcoming.length === 0) {
                container.innerHTML = '<div style="color:var(--text-muted); font-size:14px;">No hay eventos próximos.</div>';
            } else {
                upcoming.slice(0,10).forEach(ev => container.appendChild(makeEventCard(ev)));
            }
        }

        if(pastContainer) {
            if(past.length === 0) {
                pastContainer.innerHTML = '<div style="color:var(--text-muted); font-size:13px;">No hay eventos pasados.</div>';
            } else {
                past.slice(0,20).forEach(ev => {
                    const el = makeEventCard(ev);
                    el.style = 'padding:15px; border-radius:8px; position:relative; opacity:0.7;';
                    pastContainer.appendChild(el);
                });
            }
        }
    }

    // Toggle past events panel
    const btnPast = document.getElementById('btn-show-past-events');
    if(btnPast) {
        let pastVisible = false;
        btnPast.addEventListener('click', () => {
            pastVisible = !pastVisible;
            const pastContainer = document.getElementById('calendar-past-list');
            if(pastContainer) {
                pastContainer.style.display = pastVisible ? 'flex' : 'none';
                btnPast.innerHTML = pastVisible
                    ? '<ion-icon name="eye-off-outline"></ion-icon> Ocultar'
                    : '<ion-icon name="time-outline"></ion-icon> Pasados';
            }
            renderEventsList();
        });
    }

    function playBeep(type = 'beep') {
        if(type === 'none') return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            if(type === 'alarm') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(440, ctx.currentTime);
                osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
                osc.frequency.setValueAtTime(440, ctx.currentTime + 0.4);
                osc.frequency.setValueAtTime(880, ctx.currentTime + 0.6);
                gain.gain.setValueAtTime(0.5, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 1.5);
            } else if (type === 'bell') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1200, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 1);
                gain.gain.setValueAtTime(0.8, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 1.5);
            } else {
                osc.type = 'sine';
                osc.frequency.value = 880; 
                gain.gain.setValueAtTime(0.5, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 1);
            }
        } catch(e) {}
    }

    // Alarm Checker: run every 30 seconds
    setInterval(() => {
        if(!state.calendarEvents) return;
        const now = new Date();
        let needsSave = false;
        
        state.calendarEvents.forEach(ev => {
            if(!ev.time || ev.triggered) return;
            const evTime = new Date(ev.date + 'T' + ev.time);
            const diffMs = now - evTime;
            if(diffMs >= 0 && diffMs <= 5 * 60000) {
                ev.triggered = true;
                needsSave = true;
                playBeep(ev.sound || 'beep');
                setTimeout(() => alert(`⏰ NOTIFICACIÓN DE EVENTO ⏰\n\n${ev.title}\n${ev.notes || ''}`), 500);
            } else if (diffMs > 5 * 60000) {
                ev.triggered = true;
                needsSave = true;
            }
        });
        if(needsSave) {
            saveSecureDB();
            renderEventsList();
            updateDashboardStats();
        }
    }, 30000);

    // ─────────────────────────────────────────────
    // SISTEMA DE TAREAS
    // ─────────────────────────────────────────────
    let taskFilter = 'all';

    function saveTasks() { saveSecureDB(); }

    function renderTasks() {
        if(!state.tasks) state.tasks = [];
        const list = document.getElementById('task-list');
        const emptyMsg = document.getElementById('task-empty-msg');
        if(!list) return;

        let filtered = state.tasks;
        if(taskFilter === 'pending') filtered = state.tasks.filter(t => !t.done);
        if(taskFilter === 'done')    filtered = state.tasks.filter(t => t.done);

        // Clear non-empty items
        Array.from(list.children).forEach(c => { if(c.id !== 'task-empty-msg') c.remove(); });

        if(filtered.length === 0) {
            if(emptyMsg) emptyMsg.style.display = '';
            return;
        }
        if(emptyMsg) emptyMsg.style.display = 'none';

        const frag = document.createDocumentFragment();
        filtered.forEach(task => {
            const el = document.createElement('div');
            el.style.cssText = `display:flex;align-items:center;gap:12px;padding:14px 16px;background:rgba(255,255,255,0.04);border:1px solid var(--glass-border);border-radius:10px;transition:0.2s;${task.done?'opacity:0.5;':''}`;

            const priBadge = task.priority
                ? `<span style="font-size:10px;padding:2px 8px;border-radius:20px;background:${task.priority==='alta'?'rgba(255,68,68,0.2)':task.priority==='media'?'rgba(255,170,0,0.2)':'rgba(0,255,204,0.1)'};color:${task.priority==='alta'?'#f87171':task.priority==='media'?'#ffba00':'var(--primary-color)'};">${task.priority}</span>`
                : '';

            el.innerHTML = `
                <div data-check="${task.id}" style="width:22px;height:22px;border-radius:6px;border:2px solid ${task.done?'var(--primary-color)':'var(--glass-border)'};background:${task.done?'var(--primary-color)':'transparent'};display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:0.2s;">
                    ${task.done?'<ion-icon name="checkmark" style="color:black;font-size:14px;"></ion-icon>':''}
                </div>
                <span style="flex:1;font-size:14px;${task.done?'text-decoration:line-through;color:var(--text-muted);':''}">${task.text}</span>
                ${priBadge}
                <button data-del-task="${task.id}" class="btn-action-sm danger" style="width:28px;height:28px;min-height:0;padding:0;border-radius:50%;flex-shrink:0;"><ion-icon name="close"></ion-icon></button>
            `;

            el.querySelector(`[data-check="${task.id}"]`).addEventListener('click', () => {
                const t = state.tasks.find(x => x.id === task.id);
                if(t) { t.done = !t.done; saveTasks(); renderTasks(); }
            });
            el.querySelector(`[data-del-task="${task.id}"]`).addEventListener('click', (e) => {
                e.stopPropagation();
                state.tasks = state.tasks.filter(x => x.id !== task.id);
                saveTasks(); renderTasks();
            });

            frag.appendChild(el);
        });
        list.appendChild(frag);
    }

    // Add task
    const btnAddTask = document.getElementById('btn-add-task');
    const taskInput = document.getElementById('task-input');

    function addTask() {
        if(!taskInput) return;
        const text = taskInput.value.trim();
        if(!text) return;
        if(!state.tasks) state.tasks = [];
        state.tasks.push({ id: 'task_' + Date.now(), text, done: false, createdAt: new Date().toISOString() });
        taskInput.value = '';
        saveTasks(); renderTasks();
    }

    if(btnAddTask) btnAddTask.addEventListener('click', addTask);
    if(taskInput) taskInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') addTask(); });

    // Filter buttons
    document.querySelectorAll('.task-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.task-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            taskFilter = btn.getAttribute('data-filter');
            renderTasks();
        });
    });


    // --- WhatsApp Bot Panel ---
    const waPanel = document.getElementById('wa-panel');
    document.getElementById('btn-whatsapp').addEventListener('click', () => {
        waPanel.classList.toggle('open');
        // Actualizar estado de la bóveda en el panel
        let vaultStatusEl = document.getElementById('wa-vault-status');
        if (!vaultStatusEl) {
            vaultStatusEl = document.createElement('div');
            vaultStatusEl.id = 'wa-vault-status';
            vaultStatusEl.style = 'margin:12px 0 4px 0; padding:10px 14px; border-radius:10px; display:flex; align-items:center; gap:10px; font-size:13px; font-weight:600;';
            const waContent = waPanel.querySelector('.wa-card') || waPanel.children[1];
            if (waContent) waContent.insertBefore(vaultStatusEl, waContent.firstChild);
        }
        if (secretKey) {
            vaultStatusEl.style.background = 'rgba(37,211,102,0.12)';
            vaultStatusEl.style.border = '1px solid rgba(37,211,102,0.3)';
            vaultStatusEl.innerHTML = `<span style="width:9px;height:9px;border-radius:50%;background:#25d366;box-shadow:0 0 8px #25d366;flex-shrink:0;display:inline-block;"></span> Bóveda desbloqueada — Bot puede operar`;
            vaultStatusEl.style.color = '#25d366';
        } else {
            vaultStatusEl.style.background = 'rgba(255,68,68,0.1)';
            vaultStatusEl.style.border = '1px solid rgba(255,68,68,0.3)';
            vaultStatusEl.innerHTML = `<span style="width:9px;height:9px;border-radius:50%;background:#ff4444;flex-shrink:0;display:inline-block;"></span> Bóveda bloqueada — Desbloquea para activar el bot`;
            vaultStatusEl.style.color = '#ff4444';
        }
    });
    document.getElementById('btn-close-wa').addEventListener('click', () => {
        waPanel.classList.remove('open');
    });

    // ── WhatsApp Bot — IPC event listeners (push from main) ──────────────
    const waBtn = document.getElementById('btn-wa-connect');
    const waDot = document.getElementById('wa-dot');
    const waStatusText = document.getElementById('wa-status-text');
    const waQrContainer = document.getElementById('wa-qr-container');
    const waConnectStatus = document.getElementById('wa-connect-status');

    const WA_ICON_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

    function waSetUIConnected() {
        if (waDot) { waDot.className = 'wa-status-dot'; waDot.style.background = '#25d366'; waDot.style.boxShadow = '0 0 8px #25d366'; }
        if (waStatusText) waStatusText.innerText = '✅ Bot conectado y activo. Escríbete un mensaje a ti mismo en WhatsApp con !ayuda.';
        if (waBtn) { waBtn.disabled = false; waBtn.innerHTML = WA_ICON_SVG + ' Desconectar Bot'; waBtn.style.background = 'rgba(255,68,68,0.2)'; waBtn.style.borderColor = 'rgba(255,68,68,0.5)'; }
        if (waConnectStatus) { waConnectStatus.style.color = '#25d366'; waConnectStatus.innerText = ''; }
        if (waQrContainer) waQrContainer.innerHTML = `<div style="padding:20px;text-align:center;color:#25d366;font-size:13px;font-weight:600;"><div style="font-size:36px;margin-bottom:10px;">✅</div>WhatsApp vinculado correctamente.<br><span style="color:var(--text-muted);font-size:12px;">Escríbete !ayuda para ver comandos.</span></div>`;
    }

    function waSetUIDisconnected(msg) {
        if (waDot) { waDot.className = 'wa-status-dot'; waDot.style.background = '#888'; waDot.style.boxShadow = 'none'; }
        if (waStatusText) waStatusText.innerText = msg || 'Escanea el código QR con WhatsApp para vincular el bot a tu cuenta.';
        if (waBtn) { waBtn.disabled = false; waBtn.innerHTML = WA_ICON_SVG + ' Conectar Bot'; waBtn.style.background = ''; waBtn.style.borderColor = ''; }
        if (waConnectStatus) waConnectStatus.innerText = '';
        if (waQrContainer) waQrContainer.innerHTML = `<svg width="80" height="80" viewBox="0 0 24 24" fill="#128c7e"><path d="M3 3h7v7H3zm1 1v5h5V4zm1 1h3v3H5zm8-2h7v7h-7zm1 1v5h5V4zm1 1h3v3h-3zM3 13h7v7H3zm1 1v5h5v-5zm1 1h3v3H5zm11 0h2v2h-2zm-3 0h2v2h-2zm3 3h2v2h-2zm-3 3h2v2h-2zm3 0h2v2h-2z"/></svg><div class="wa-qr-placeholder">Presiona <b>"Conectar Bot"</b> para generar el código QR.</div>`;
    }

    // Recibir QR generado por main.js
    if (window.api && window.api.onWaQr) {
        window.api.onWaQr((qrDataUrl) => {
            if (waQrContainer) {
                waQrContainer.innerHTML = `
                    <div style="text-align:center;">
                        <img src="${qrDataUrl}" style="width:220px;height:220px;border-radius:12px;border:3px solid #25d366;" />
                        <div style="color:#25d366;font-size:12px;margin-top:10px;font-weight:600;">📱 Escanea con WhatsApp</div>
                        <div style="color:var(--text-muted);font-size:11px;margin-top:4px;">WhatsApp → ⋮ → Dispositivos Vinculados → Vincular Dispositivo</div>
                    </div>`;
            }
            if (waStatusText) waStatusText.innerText = '⏳ QR generado. Escanéalo con tu teléfono...';
            if (waConnectStatus) { waConnectStatus.style.color = '#25d366'; waConnectStatus.innerText = 'Esperando escaneo del QR...'; }
        });
    }

    // Recibir cambios de estado desde main.js
    if (window.api && window.api.onWaStatusChange) {
        window.api.onWaStatusChange((status) => {
            if (status === 'ready') {
                waSetUIConnected();
            } else if (status === 'connecting') {
                if (waDot) { waDot.style.background = '#ffaa00'; waDot.style.boxShadow = '0 0 8px #ffaa00'; }
                if (waStatusText) waStatusText.innerText = '⏳ Iniciando bot, generando código QR...';
            } else if (status === 'auth_failure') {
                waSetUIDisconnected('❌ Falló la autenticación. Intenta de nuevo.');
                showToast('Bot WhatsApp: Falló la autenticación.');
            } else {
                waSetUIDisconnected('Bot desconectado.');
            }
        });
    }

    // Recibir comandos remotos del bot (ej: eliminar archivos)
    if (window.api && window.api.onWaCommand) {
        window.api.onWaCommand(async (cmd) => {
            if (cmd.action === 'delete-file') {
                const nameL = cmd.name.toLowerCase();
                let found = false;
                state.folders.forEach(f => {
                    const idx = (f.docs || []).findIndex(d => d.name.toLowerCase().includes(nameL));
                    if (idx > -1) {
                        const [removed] = f.docs.splice(idx, 1);
                        state.trash.push({ ...removed, trashType: 'doc', trashDate: new Date().toISOString() });
                        found = true;
                    }
                });
                if (found) { saveSecureDB(); showToast(`Bot WA: "${cmd.name}" movido a la papelera.`); }
            } else if (cmd.action === 'delete-note') {
                const nameL = cmd.name.toLowerCase();
                let found = false;
                state.notes.forEach(n => {
                    const idx = (n.noteItems || []).findIndex(ni => (ni.title || '').toLowerCase().includes(nameL));
                    if (idx > -1) { n.noteItems.splice(idx, 1); found = true; }
                });
                if (found) { saveSecureDB(); showToast(`Bot WA: Nota "${cmd.name}" eliminada.`); }
            } else if (cmd.action === 'delete-event') {
                const nameL = cmd.name.toLowerCase();
                const before = state.calendarEvents.length;
                state.calendarEvents = state.calendarEvents.filter(e => !e.title.toLowerCase().includes(nameL));
                if (state.calendarEvents.length < before) { saveSecureDB(); renderCalendar(); showToast(`Bot WA: Evento "${cmd.name}" eliminado.`); }
            }
            // Actualizar snapshot del vault después del cambio
            if (window.api && window.api.waSetVaultData) {
                window.api.waSetVaultData({
                    folders: state.folders, albums: state.albums,
                    notes: state.notes, calendarEvents: state.calendarEvents, tasks: state.tasks
                });
            }
        });
    }

    let waBotActive = false;

    waBtn.addEventListener('click', async () => {
        if (!secretKey) return showToast('Desbloquea la bóveda antes de activar el bot.');

        if (waBotActive) {
            // Desconectar
            waBotActive = false;
            if (waBtn) { waBtn.disabled = true; waBtn.innerHTML = `<span style="width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 0.8s linear infinite;display:inline-block;"></span> Desconectando...`; }
            await window.api.waStop();
            waSetUIDisconnected('Bot desconectado manualmente.');
            return;
        }

        // Conectar — primero enviar snapshot del vault a main
        if (window.api && window.api.waSetVaultData) {
            await window.api.waSetVaultData({
                folders: state.folders,
                albums: state.albums,
                notes: state.notes,
                calendarEvents: state.calendarEvents,
                tasks: state.tasks
            });
        }

        waBotActive = true;
        waBtn.disabled = true;
        waBtn.innerHTML = `<span style="width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 0.8s linear infinite;display:inline-block;"></span> Iniciando...`;
        if (waDot) { waDot.style.background = '#ffaa00'; }
        if (waStatusText) waStatusText.innerText = '⏳ Iniciando bot de WhatsApp...';
        if (waQrContainer) waQrContainer.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:20px;font-size:13px;"><span style="width:32px;height:32px;border:3px solid rgba(255,255,255,0.15);border-top-color:#25d366;border-radius:50%;animation:spin 0.8s linear infinite;display:inline-block;margin-bottom:12px;"></span><br>Preparando bot, espera unos segundos...</div>`;
        if (waConnectStatus) waConnectStatus.innerText = '';

        const res = await window.api.waStart();
        if (!res.success) {
            waBotActive = false;
            waSetUIDisconnected('❌ Error al iniciar el bot: ' + (res.error || 'error desconocido'));
            showToast('Error iniciando bot WhatsApp: ' + (res.error || ''));
        }
        // El QR llega por onWaQr; el estado 'ready' llega por onWaStatusChange
    });

});
