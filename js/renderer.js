document.addEventListener('DOMContentLoaded', async () => {

    let state = {
        passwordHash: 'admin', 
        globalTimeoutMinutes: 5,
        globalBg: '',
        primaryColor: '#00ffcc',
        folders: [],   // type: 'doc'
        albums: [],    // type: 'img'
        notes: [],     // type: 'note'
        sectionBgs: {},
        panelOpacity: 0.65,
        fontFamily: 'Inter',
        timerColor: '#ff4444',
        calendarEvents: [],
        lightMode: false
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
                if(!state.sectionBgs) state.sectionBgs = {};
                return true; 
            } catch(e) { return false; }
        } else if (res.success && !res.data) {
            return true;
        }
        return false;
    }

    async function saveSecureDB(customMsg = "Procesando Bóveda...") {
        if(!window.api || !secretKey || isSaving) return;
        isSaving = true;
        
        const loader = document.getElementById('global-loader');
        if(loader) {
            const h2 = loader.querySelector('h2');
            if(h2) h2.innerText = customMsg;
            loader.classList.remove('hidden');
        }
        
        // Timeout para forzar el ciclo de dibujado de Chromium antes de bloquear el hilo
        await new Promise(r => setTimeout(r, 100));
        
        try {
            state.globalTimeoutMinutes = parseInt(state.globalTimeoutMinutes) || 5;
            const dataString = JSON.stringify(state);
            const res = await window.api.saveDB({ dataString, masterPassword: secretKey });
            if (res && res.error) {
                console.error("IPC Save failed: " + res.error);
            }
            updateDashboardStats();
        } catch(e) {
            console.error("Save Error:", e);
        }
        
        if(loader) loader.classList.add('hidden');
        if(window.api.wakeUp) await window.api.wakeUp();
        isSaving = false;
    }

    function applyTheme() {
        document.documentElement.style.setProperty('--primary-color', state.primaryColor);
        document.documentElement.style.setProperty('--glass-bg-alpha', state.panelOpacity || 0.65);
        document.documentElement.style.setProperty('--glass-bg', `rgba(20, 20, 20, ${state.panelOpacity || 0.65})`);
        document.documentElement.style.setProperty('--timer-color', state.timerColor || '#ff4444');
        document.body.style.fontFamily = state.fontFamily || 'Inter';
        
        document.getElementById('setting-theme').value = state.primaryColor;
        document.getElementById('setting-opacity').value = state.panelOpacity || 0.65;
        document.getElementById('opacity-val-lbl').innerText = Math.round((state.panelOpacity || 0.65) * 100) + '%';
        document.getElementById('setting-font').value = state.fontFamily || 'Inter';
        document.getElementById('setting-timer-color').value = state.timerColor || '#ff4444';
        document.getElementById('setting-bg').value = state.globalBg || '';
        
        const btnLight = document.getElementById('btn-toggle-light');
        if(state.lightMode) {
            document.body.classList.add('light-mode');
            if(btnLight) btnLight.innerText = "Modo Claro: Encendido";
        } else {
            document.body.classList.remove('light-mode');
            if(btnLight) btnLight.innerText = "Modo Claro: Apagado";
        }
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
        document.getElementById('login-error').classList.add('hidden');
        
        const isNewInstance = !await window.api.readDB('admin').then(r => r.data || !r.success ? false : true); 
        const success = await loadSecureDB(input);

        if(success || (isNewInstance && input === state.passwordHash)) {
            secretKey = input;
            state.passwordHash = input;
            saveSecureDB();
            
            loginOverlay.classList.add('hidden');
            appShell.classList.remove('hidden');
            masterPassword.value = '';
            
            document.getElementById('setting-timeout').value = state.globalTimeoutMinutes;

            applyTheme();
            applyBackground('dashboard');
            startInactivityTimer();
            renderSpaces();
        } else {
            document.getElementById('login-error').classList.remove('hidden');
        }
    });

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

    document.getElementById('btn-folder-save').addEventListener('click', () => {
        const name = document.getElementById('folder-name').value;
        if(!name) return;

        const spaceArr = viewMode === 'folder' ? state.folders : (viewMode === 'album' ? state.albums : state.notes);
        if(!editingSpace) {
            spaceArr.push({
                id: viewMode + '_' + Date.now(),
                name: name,
                password: document.getElementById('folder-pass').value,
                bg: document.getElementById('folder-bg').value,
                icon: document.getElementById('folder-icon').value,
                docs: [], imgs: [], noteItems: []
            });
        } else {
            const s = spaceArr.find(x => x.id === currentSpaceId);
            if(s) {
                s.name = name;
                s.password = document.getElementById('folder-pass').value;
                s.bg = document.getElementById('folder-bg').value;
                s.icon = document.getElementById('folder-icon').value;
                document.getElementById('current-folder-title').innerText = s.name;
            }
        }
        saveSecureDB(); renderSpaces();
        if(currentSpaceId) {
            const updated = spaceArr.find(x => x.id === currentSpaceId);
            enterSpace(updated, true); // reapply BG if editing active space
        }
        document.getElementById('edit-folder-modal').classList.add('hidden');
    });

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

            card.innerHTML = `${iconHtml}<br><span>${item.name}</span>${item.password ? '<ion-icon name="lock-closed" class="cat-lock"></ion-icon>' : ''}`;
            
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

    function appendFilesToSpace(files, listType) {
        const spaceArr = viewMode === 'folder' ? state.folders : state.albums;
        const s = spaceArr.find(x => x.id === currentSpaceId);
        s[listType] = s[listType] || [];
        files.forEach(f => {
            s[listType].push({ id: Date.now()+Math.random(), name: f.name, data: f.dataURL });
        });
        saveSecureDB();
        renderSpaceItems(s);
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
                if(res.success) alert("Archivo exportado exitosamente.");
            } else if (pendingAction.type === 'delete-item') {
                const spaceArr = viewMode === 'folder' ? state.folders : (viewMode === 'album' ? state.albums : state.notes);
                const s = spaceArr.find(x => x.id === currentSpaceId);
                s[pendingAction.listType] = s[pendingAction.listType].filter(i => i.id !== pendingAction.id);
                saveSecureDB(); renderSpaceItems(s);
            } else if (pendingAction.type === 'delete-folder') {
                const spaceArr = viewMode === 'folder' ? state.folders : (viewMode === 'album' ? state.albums : state.notes);
                const idx = spaceArr.findIndex(x => x.id === currentSpaceId);
                spaceArr.splice(idx, 1);
                saveSecureDB();
                document.getElementById('btn-back-folders').click();
                renderSpaces();
            } else if (pendingAction.type === 'delete-note') {
                const space = state.notes.find(x => x.id === currentSpaceId);
                space.noteItems = space.noteItems.filter(x => x.id !== pendingAction.id);
                saveSecureDB();
                renderSpaceItems(space);
            } else if (pendingAction.type === 'delete-multi') {
                const spaceArr = viewMode === 'folder' ? state.folders : (viewMode === 'album' ? state.albums : state.notes);
                const s = spaceArr.find(x => x.id === currentSpaceId);
                const lType = viewMode === 'folder' ? 'docs' : (viewMode === 'album' ? 'imgs' : 'noteItems');
                
                s[lType] = s[lType].filter(i => !pendingAction.ids.includes(i.id));
                selectedIds.clear();
                document.getElementById('multi-count').innerText = '0';
                saveSecureDB();
                renderSpaceItems(s);
            } else if (pendingAction.type === 'delete-dash-multi') {
                const t = pendingAction.targetType;
                if(t === 'folder') state.folders = state.folders.filter(x => !pendingAction.ids.includes(x.id));
                if(t === 'album') state.albums = state.albums.filter(x => !pendingAction.ids.includes(x.id));
                if(t === 'note') state.notes = state.notes.filter(x => !pendingAction.ids.includes(x.id));
                
                dashSelectedIds.clear();
                const btnDel = document.querySelector(`.btn-dash-del[data-type="${t}"]`);
                if(btnDel) btnDel.innerHTML = `<ion-icon name="trash"></ion-icon> (0)`;
                saveSecureDB();
                renderSpaces();
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
                d.innerHTML = `
                    <div class="file-label">
                        <ion-icon name="document-text"></ion-icon><span>${doc.name}</span>
                    </div>
                    <div style="display:flex; gap:5px;">
                        <button class="btn-action-sm" onclick="triggerAction('export', {name: '${doc.name}', data: '${doc.data}'}, event)" title="Exportar Extracción"><ion-icon name="download"></ion-icon></button>
                        <button class="btn-action-sm danger" onclick="triggerAction('delete-item', {id: ${doc.id}, listType: 'docs'}, event)" title="Eliminar Permanente"><ion-icon name="trash"></ion-icon></button>
                    </div>`;
                
                d.querySelector('.file-label').addEventListener('click', (e) => {
                    if (isSelecting) toggleSelection(doc.id, d);
                    else window.api.previewDoc({name: doc.name, dataURL: doc.data});
                });
                docList.appendChild(d);
            });
        }
        
        if(viewMode === 'album') {
            (space.imgs || []).forEach(img => {
                const w = document.createElement('div');
                w.className = 'img-wrap selectable-item ' + (selectedIds.has(img.id) ? 'selected' : '');
                w.innerHTML = `
                    <div class="img-item" style="background-image:url('${img.data}')"></div>
                    <div class="img-actions-bar">
                        <button class="btn-action-sm" onclick="triggerAction('export', {name: '${img.name}', data: '${img.data}'}, event)" title="Guardar a PC"><ion-icon name="download"></ion-icon></button>
                        <button class="btn-action-sm danger" onclick="triggerAction('delete-item', {id: ${img.id}, listType: 'imgs'}, event)" title="Destruir"><ion-icon name="trash"></ion-icon></button>
                    </div>
                `;
                w.querySelector('.img-item').addEventListener('click', (e) => { 
                    if (isSelecting) toggleSelection(img.id, w);
                    else window.api.previewDoc({name: img.name, dataURL: img.data});
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
        applyTheme();
        applyBackground('dashboard');
        saveSecureDB();
        const notice = document.getElementById('settings-save-notice');
        notice.innerText = "Apariencia guardada.";
        setTimeout(() => notice.innerText = "", 2000);
    });

    document.getElementById('btn-toggle-light').addEventListener('click', async () => {
        state.lightMode = !state.lightMode;
        applyTheme();
        await saveSecureDB("Aplicando Tema...");
    });

    document.getElementById('setting-opacity').addEventListener('input', (e) => {
        document.getElementById('opacity-val-lbl').innerText = Math.round(e.target.value * 100) + '%';
    });

    document.getElementById('btn-save-sec').addEventListener('click', () => {
        state.globalTimeoutMinutes = parseInt(document.getElementById('setting-timeout').value) || 5;
        state.timerColor = document.getElementById('setting-timer-color').value;
        applyTheme();
        startInactivityTimer();
        saveSecureDB();
        const notice = document.getElementById('settings-save-notice');
        notice.innerText = "Ajustes de seguridad guardados.";
        setTimeout(() => notice.innerText = "", 2000);
    });

    document.getElementById('btn-change-pwd').addEventListener('click', async () => {
        const oldP = document.getElementById('pwd-old').value;
        const newP = document.getElementById('pwd-new').value;
        const confP = document.getElementById('pwd-confirm').value;
        if(oldP !== state.passwordHash && oldP !== secretKey) return alert("Contraseña actual incorrecta.");
        if(newP !== confP) return alert("Las nuevas contraseñas no coinciden.");
        if(!newP) return alert("Ingresa una nueva contraseña válida.");
        state.passwordHash = newP;
        secretKey = newP;
        await saveSecureDB();
        alert("Contraseña Maestra cambiada con éxito.");
        document.getElementById('pwd-old').value = '';
        document.getElementById('pwd-new').value = '';
        document.getElementById('pwd-confirm').value = '';
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
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'node_modules/pdfjs-dist/build/pdf.worker.min.js';

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
        
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        document.getElementById('cal-month-year').innerText = `${monthNames[month]} ${year}`;
        
        const grid = document.getElementById('calendar-grid');
        grid.innerHTML = '';
        
        // paddings
        for(let i=0; i < firstDay; i++) {
            grid.innerHTML += `<div></div>`;
        }
        
        const today = new Date();
        for(let i=1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
            const isToday = i === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            
            const eventsForDay = state.calendarEvents.filter(e => e.date === dateStr);
            const hasEvents = eventsForDay.length > 0;
            
            const el = document.createElement('div');
            el.style = `padding: 10px; border-radius:8px; border:1px solid var(--glass-border); background: ${isToday ? 'rgba(0,255,204,0.2)' : 'rgba(255,255,255,0.05)'}; cursor:pointer; text-align:center; position:relative; min-height:60px; transition:0.2s`;
            el.innerHTML = `
                <div style="font-weight:bold; ${isToday ? 'color:var(--primary-color)' : ''}">${i}</div>
                ${hasEvents ? `<div style="font-size:10px; color:var(--primary-color); margin-top:5px;">${eventsForDay.length} Eventos</div>` : ''}
            `;
            el.onmouseenter = () => el.style.borderColor = 'var(--primary-color)';
            el.onmouseleave = () => el.style.borderColor = 'var(--glass-border)';
            
            el.onclick = () => {
                document.getElementById('ev-date').value = dateStr;
                openCalendarDayModal(dateStr, eventsForDay);
            };
            grid.appendChild(el);
        }
        
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
                    <button class="delete-btn btn-action-sm danger" style="position:absolute; top:10px; right:10px; border-radius:50%; width:30px; height:30px;" onclick="removeCalendarEvent('${ev.id}'); document.getElementById('calendar-day-modal').classList.add('hidden');"><ion-icon name="trash"></ion-icon></button>
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
        container.innerHTML = '';
        
        const sortedEvents = [...state.calendarEvents].sort((a,b) => {
            return new Date(a.date+'T'+(a.time||'00:00')) - new Date(b.date+'T'+(b.time||'00:00'));
        });
        
        const now = new Date();
        const upcoming = sortedEvents.filter(e => {
            const evDate = new Date(e.date+'T'+(e.time||'23:59'));
            return evDate >= now;
        }).slice(0, 10);
        
        if(upcoming.length === 0) {
            container.innerHTML = '<div style="color:var(--text-muted); font-size:14px;">No hay eventos próximos.</div>';
            return;
        }
        
        upcoming.forEach(ev => {
            const el = document.createElement('div');
            el.className = 'glass-panel';
            el.style = "padding: 15px; border-radius: 8px; position:relative;";
            el.innerHTML = `
                <div style="font-weight:bold; color:var(--primary-color); margin-bottom:5px;">${ev.title}</div>
                <div style="font-size:12px; color:var(--text-muted);"><ion-icon name="calendar"></ion-icon> ${ev.date} ${ev.time ? 'A las '+ev.time : ''}</div>
                ${ev.notes ? `<div style="font-size:13px; margin-top:5px; border-top:1px solid rgba(255,255,255,0.1); padding-top:5px;">${ev.notes}</div>` : ''}
                <button class="btn-action-sm danger" style="position:absolute; top:10px; right:10px; border-radius:50%; width:30px; height:30px;" onclick="removeCalendarEvent('${ev.id}')"><ion-icon name="close"></ion-icon></button>
            `;
            container.appendChild(el);
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
                setTimeout(() => {
                    alert(`⏰ NOTIFICACIÓN DE EVENTO ⏰\n\n${ev.title}\n${ev.notes || ''}`);
                }, 500);
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

    // Patch initial load of calendar
    const origRender = renderSpaces;
    renderSpaces = function() {
        origRender();
        renderCalendar();
    }

});
