// ===================== SISTEM PROJECT =====================
let projects = JSON.parse(localStorage.getItem('IDE_PROJECTS') || '[]');
let currentProjectId = localStorage.getItem('IDE_CURRENT_PROJECT');
let currentTab = 'html';
let autoSaveTimer = null;

// Struktur data project
const Project = {
    create(name = 'Project Baru') {
        return {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            name: name,
            description: '',
            html: ``,
            css: ``,
            js: ``,
            inject: ``,
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            tags: [],
            cursorPositions: {
                html: 0,
                css: 0,
                js: 0,
                inject: 0
            }
        };
    }
};

// ===================== ELEMENTS =====================
const codeEditor = document.getElementById('codeEditor');
const lineNumbers = document.getElementById('lineNumbers');
const tabs = document.querySelectorAll('.tab');
const currentTabTitle = document.getElementById('currentTabTitle');
const previewOverlay = document.getElementById('previewOverlay');
const previewContent = document.getElementById('previewContent');
const previewClose = document.getElementById('previewClose');



// NEW FUNCTION
let injectCode = null;


// ===================== MANAJEMEN PROJECT =====================
function saveProjects() {
    localStorage.setItem('IDE_PROJECTS', JSON.stringify(projects));
}

function getCurrentProject() {
    return projects.find(p => p.id === currentProjectId) || projects[0] || Project.create();
}

function setCurrentProject(projectId) {
    currentProjectId = projectId;
    localStorage.setItem('IDE_CURRENT_PROJECT', projectId);
    loadProject(projectId);
}

function createNewProject(name = null) {
    const projectName = name || `Project ${projects.length + 1}`;
    const newProject = Project.create(projectName);
    projects.unshift(newProject); // Tambah di awal
    saveProjects();
    setCurrentProject(newProject.id);
    showStatus(`Project "${projectName}" dibuat`, 'success');
    return newProject;
}

function duplicateProject(projectId) {
    const original = projects.find(p => p.id === projectId);
    if (!original) return;
    
    const duplicate = {
        ...JSON.parse(JSON.stringify(original)),
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        name: `${original.name} (Copy)`,
        created: new Date().toISOString(),
        modified: new Date().toISOString()
    };
    
    projects.unshift(duplicate);
    saveProjects();
    setCurrentProject(duplicate.id);
    showStatus(`Project "${duplicate.name}" dibuat`, 'success');
}

function deleteProject(projectId) {
    if (!confirm('Hapus project ini?')) return;
    
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) return;
    
    const projectName = projects[projectIndex].name;
    projects.splice(projectIndex, 1);
    saveProjects();
    
    // Jika project yang dihapus sedang aktif, buka project lain
    if (currentProjectId === projectId) {
        if (projects.length > 0) {
            setCurrentProject(projects[0].id);
        } else {
            createNewProject();
        }
    }
    
    showStatus(`Project "${projectName}" dihapus`, 'warning');
    updateProjectsList();
}

function renameProject(projectId, newName) {
    const project = projects.find(p => p.id === projectId);
    if (!project || !newName.trim()) return;
    
    const oldName = project.name;
    project.name = newName.trim();
    project.modified = new Date().toISOString();
    saveProjects();
    
    if (projectId === currentProjectId) {
        updateProjectTitle();
    }
    
    showStatus(`Project "${oldName}" diubah menjadi "${project.name}"`, 'success');
    updateProjectsList();
}

function loadProject(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    currentProjectId = projectId;
    localStorage.setItem('IDE_CURRENT_PROJECT', projectId);

    // Load ke editor
    codeEditor.value = project[currentTab];
   
    //Update UI
    updateProjectTitle();
    updateLineNumbers();
    restoreCursorPosition();
    hideProjectsModal();

    // Update codeData untuk preview
    window.codeData = {
        html: project.html,
        css: project.css,
        js: project.js,
        inject: project.inject
    };

    //showStatus(`Project "${project.name}" dimuat`, 'success');
}

function saveCurrentTab() {
    const project = getCurrentProject();
    if (!project) return;
    
    project[currentTab] = codeEditor.value;
    project.modified = new Date().toISOString();
    saveCursorPosition();
    saveProjects();
    
    // Update UI
    updateProjectsList();
    document.querySelector(`[data-tab="${currentTab}"]`)?.classList.remove('unsaved');
}

// ===================== PROJECT MODAL UI =====================
function showProjectsModal() {
    const modal = document.getElementById('projectsModal');
    
    updateProjectsList();
    modal.style.display = 'flex';
}

function hideProjectsModal() {
    const modal = document.getElementById('projectsModal');
    if (modal) modal.style.display = 'none';
}

function updateProjectsList() {
    const grid = document.getElementById('projectsGrid');
    if (!grid) return;
    
    const searchTerm = document.getElementById('projectSearch')?.value.toLowerCase() || '';
    const filteredProjects = projects.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        p.description.toLowerCase().includes(searchTerm) ||
        p.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
    
    grid.innerHTML = '';
    
    if (filteredProjects.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>Tidak ada project</h3>
                <p>Buat project baru untuk memulai</p>
                <button class="btn btn-primary" onclick="createNewProject()">
                    <i class="fas fa-plus"></i> Buat Project
                </button>
            </div>
        `;
        return;
    }
    
    filteredProjects.forEach(project => {
        const isCurrent = project.id === currentProjectId;
        const modifiedDate = new Date(project.modified).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        
        const projectCard = document.createElement('div');
        projectCard.className = `project-card ${isCurrent ? 'active' : ''}`;
        projectCard.innerHTML = `
            <div class="project-card-header">
                <div class="project-icon">
                    <i class="fas fa-code"></i>
                </div>
                <div class="project-info">
                    <h3 class="project-name">${project.name}</h3>
                    <p class="project-date">Diubah: ${modifiedDate}</p>
                </div>
                <div class="project-actions">
                    <button class="btn-icon ${isCurrent ? 'active' : ''}" onclick="setCurrentProject('${project.id}')" 
                            title="${isCurrent ? 'Sedang aktif' : 'Buka project'}">
                        <i class="fas fa-${isCurrent ? 'check' : 'folder-open'}"></i>
                    </button>
                    <button class="btn-icon" onclick="duplicateProject('${project.id}')" title="Duplikat">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="btn-icon" onclick="editProjectName('${project.id}')" title="Ubah nama">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-danger" onclick="deleteProject('${project.id}')" title="Hapus">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="project-card-body">
                <div class="project-stats">
                    <span><i class="fas fa-file-code"></i> ${project.html.length} chars</span>
                    <span><i class="fas fa-paint-brush"></i> ${project.css.length} chars</span>
                    <span><i class="fas fa-code"></i> ${project.js.length} chars</span>
                </div>
                ${project.description ? `<p class="project-description">${project.description}</p>` : ''}
                ${project.tags.length > 0 ? `
                    <div class="project-tags">
                        ${project.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
        
        grid.appendChild(projectCard);
    });
    
    // Update stats
    document.getElementById('projectCount').textContent = projects.length;
    if (projects.length > 0) {
        const lastProject = projects.reduce((latest, current) => 
            new Date(current.modified) > new Date(latest.modified) ? current : latest
        );
        document.getElementById('lastModified').textContent = 
            new Date(lastProject.modified).toLocaleDateString('id-ID');
    }
}

function filterProjects() {
    updateProjectsList();
}

function editProjectName(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    const newName = prompt('Nama project baru:', project.name);
    if (newName && newName.trim() !== project.name) {
        renameProject(projectId, newName);
    }
}

function exportAllProjects() {
    const dataStr = JSON.stringify(projects, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `ide-projects-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showStatus('Semua project diexport', 'success');
}

function importProjects() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = event => {
            try {
                const importedProjects = JSON.parse(event.target.result);
                
                // Validasi struktur
                if (!Array.isArray(importedProjects)) {
                    throw new Error('Format file tidak valid');
                }
                
                // Generate ID baru untuk menghindari konflik
                importedProjects.forEach(project => {
                    project.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
                    project.modified = new Date().toISOString();
                });
                
                // Tambahkan ke daftar
                projects.unshift(...importedProjects);
                saveProjects();
                updateProjectsList();
                
                showStatus(`${importedProjects.length} project diimport`, 'success');
            } catch (error) {
                showStatus('Error mengimport project: ' + error.message, 'error');
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

function clearAllProjects() {
    if (!confirm('Hapus SEMUA project? Tindakan ini tidak dapat dibatalkan!')) return;
    
    projects = [];
    saveProjects();
    createNewProject();
    updateProjectsList();
    showStatus('Semua project dihapus', 'warning');
}

function updateProjectTitle() {
    const project = getCurrentProject();
    if (project) {
        currentTabTitle.textContent = project.name;
        document.title = `${project.name} - Web IDE`;
    }
}


// ===================== CURSOR MANAGEMENT =====================
function saveCursorPosition() {
    const project = getCurrentProject();
    if (!project || !codeEditor) return;
    
    const pos = codeEditor.selectionStart || 0;
    project.cursorPositions[currentTab] = pos;
    saveProjects();
}

function restoreCursorPosition() {
    const project = getCurrentProject();
    if (!project || !codeEditor) return;
    
    const pos = project.cursorPositions[currentTab] || 0;
    const safePos = Math.min(pos, codeEditor.value.length);
    
    setTimeout(() => {
        codeEditor.focus();
        codeEditor.setSelectionRange(safePos, safePos);
        scrollToCursor();
    }, 100);
}

function scrollToCursor() {
    if (!codeEditor) return;
    
    const pos = codeEditor.selectionStart || 0;
    const textUptoCursor = codeEditor.value.substring(0, pos);
    const line = textUptoCursor.split("\n").length;
    const lineHeight = 22; // Approximate line height
    const targetScroll = (line - 1) * lineHeight - codeEditor.clientHeight / 2;
    codeEditor.scrollTop = Math.max(0, targetScroll);
}

// ===================== EDITOR FUNCTIONS =====================
function updateLineNumbers() {
    if (!codeEditor || !lineNumbers) return;
    
    const lines = codeEditor.value.split('\n');
    let numbers = '';
    
    lines.forEach((_, i) => {
        numbers += (i + 1) + '<br>';
    });
    
    lineNumbers.innerHTML = numbers;
    lineNumbers.scrollTop = codeEditor.scrollTop;
}

function switchTab(tabName) {
    // Simpan tab sebelumnya
    const project = getCurrentProject();
    if (project) {
        project[currentTab] = codeEditor.value;
        saveCursorPosition();
    }
    
    // Update UI tabs
    tabs.forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Switch content
    currentTab = tabName;
    const projectData = getCurrentProject();
    codeEditor.value = projectData[tabName] || '';
    
    // Update UI
    updateLineNumbers();
    //currentTabTitle.textContent = `${tabName.toUpperCase()} Editor`;
    
    // Restore cursor
    setTimeout(restoreCursorPosition, 50);
}

function generatePreviewHTML() {
    const project = getCurrentProject();
    if (!project) return '';
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${project.name} - Preview</title>
            <style>${project.css}</style>
        </head>
        <body>
            ${project.html}
            <script>
                // Error handling
                window.addEventListener('error', function(e) {
                    console.error('Preview Error:', e.error);
                });
                
                // Message handler untuk inject
                window.addEventListener("message", function(event) {
                    try {
                        if (typeof event.data === 'string') {
                            eval(event.data);
                        }
                    } catch(e) {
                        console.error("Inject Error:", e);
                    }
                });
                
                // Main JS
                try {
                    ${project.js}
                } catch(error) {
                    console.error("JavaScript Error:", error);
                }
            <\/script>
        </body>
        </html>
    `;
}

function showPreview() {
    const fullHTML = generatePreviewHTML();
    previewContent.innerHTML = '';
    
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width:100%;height:100%;border:none;background:white;';
    previewContent.appendChild(iframe);
    
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(fullHTML);
    iframeDoc.close();
    
    previewOverlay.style.display = 'flex';
    document.body.classList.add('preview-fullscreen');
}

function hidePreview() {
    previewOverlay.style.display = 'none';
    document.body.classList.remove('preview-fullscreen');
}

function runInjectScript() {
    const project = getCurrentProject();
    if (!project) return;
    
    const code = document.getElementById("injectArea").value;
    if (!code.trim()) {
        showStatus("Inject script kosong", "warning");
        return;
    }
    
    const iframe = previewContent.querySelector('iframe');
    if (!iframe) {
        showStatus("Preview belum dibuka", "error");
        return;
    }
    
    try {
        iframe.contentWindow.postMessage(code, "*");
        showStatus("Inject script dijalankan", "success");
    } catch (err) {
        showStatus("Error: " + err.message, "error");
    }
}



function formatCode() {
    let code = codeEditor.value;
    
    switch(currentTab) {
        case 'html':
            code = html_beautify(code, {
                indent_size: 2,
                indent_char: ' ',
                max_preserve_newlines: 1,
                preserve_newlines: true,
                keep_array_indentation: false,
                break_chained_methods: false,
                indent_scripts: 'normal',
                brace_style: 'collapse',
                space_before_conditional: true,
                unescape_strings: false,
                jslint_happy: false,
                end_with_newline: false,
                wrap_line_length: 0,
                indent_inner_html: false,
                comma_first: false,
                e4x: false,
                indent_empty_lines: false
            });
            break;
        case 'css':
            code = css_beautify(code, {
                indent_size: 2,
                indent_char: ' ',
                indent_with_tabs: false,
                end_with_newline: false,
                selector_separator_newline: true,
                newline_between_rules: true
            });
            break;
        case 'js':
            code = js_beautify(code, {
                indent_size: 2,
                indent_char: ' ',
                indent_with_tabs: false,
                preserve_newlines: true,
                max_preserve_newlines: 3,
                space_in_paren: false,
                jslint_happy: false,
                space_after_anon_function: false,
                brace_style: 'collapse',
                keep_array_indentation: false,
                keep_function_indentation: false,
                space_before_conditional: true,
                break_chained_methods: false,
                eval_code: false,
                unescape_strings: false,
                wrap_line_length: 0,
                end_with_newline: false
            });
            break;
    case 'inject':
      code = js_beautify(code, {
        indent_size: 2,
        indent_char: ' ',
        indent_with_tabs: false,
        preserve_newlines: true,
        max_preserve_newlines: 3,
        space_in_paren: false,
        jslint_happy: false,
        space_after_anon_function: false,
        brace_style: 'collapse',
        keep_array_indentation: false,
        keep_function_indentation: false,
        space_before_conditional: true,
        break_chained_methods: false,
        eval_code: false,
        unescape_strings: false,
        wrap_line_length: 0,
        end_with_newline: false
      });
      break;
    }
    
    codeEditor.value = code;
    updateLineNumbers();
    saveCurrentTab();
    showStatus("Kode diformat", "success");
}





// ===================== STATUS MESSAGE =====================
function showStatus(message, type = 'info') {
    const status = document.getElementById('statusMessage');
    if (!status) return;
    
    const colors = {
        success: '#4CAF50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196F3'
    };
    
    status.textContent = message;
    status.style.background = colors[type] || colors.info;
    status.style.opacity = '1';
    
    setTimeout(() => {
        status.style.opacity = '0';
    }, 3000);
}



// ===================== MODIFIKASI TOMBOL RUN SCRIPT =====================
const btnRun = document.getElementById("btnInjectScript");
btnRun.onclick = () => { try {
    // Pastikan tab inject aktif
    if (currentTab !== "inject") {
      document.querySelectorAll(".tab")[3].click();
    }

    // Ambil kode dari editor
    const code = codeEditor.value;
    if (!code.trim()) {
      showStatus("Tidak ada kode untuk dijalankan", "warning");
      return;
    }

    // Gunakan Function() agar berjalan di global scope
    const runInGlobalScope = new Function(code);
    runInGlobalScope();
    
    showStatus("Script berhasil dijalankan", "success");

  } catch (e) {
    showStatus(e.message, "error");
  }
};



// ===================== EVENT LISTENERS =====================
tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

codeEditor.addEventListener('input', function() {
    updateLineNumbers();
    
    // Auto save setelah 2 detik
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        saveCurrentTab();
    }, 2000);
});

codeEditor.addEventListener('scroll', () => {
    lineNumbers.scrollTop = codeEditor.scrollTop;
});

// Cursor events
['keyup', 'click', 'select'].forEach(event => {
    codeEditor.addEventListener(event, saveCursorPosition);
});

// ===================== BUTTON HANDLERS =====================
document.getElementById('themeToggle').addEventListener('click', function() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    this.innerHTML = isLight ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    localStorage.setItem('IDE_THEME', isLight ? 'light' : 'dark');
});

// Project management button
document.getElementById('btnProjects').addEventListener('click', showProjectsModal);

document.getElementById('btnNewProject').addEventListener('click', () => {
    const name = prompt('Nama project baru:', `Project ${projects.length + 1}`);
    createNewProject(name);
});

document.getElementById('btnSave').addEventListener('click', () => {
    saveCurrentTab();
    showStatus("Project disimpan", "success");
});

document.getElementById('btnClear').addEventListener('click', function() {
        codeEditor.value = '';
        updateLineNumbers();
        saveCurrentTab();
});

document.getElementById('btnCopy').addEventListener('click', async function() {
    try {
        await navigator.clipboard.writeText(codeEditor.value);
        showStatus('Kode disalin', 'success');
    } catch {
        codeEditor.select();
        document.execCommand('copy');
        showStatus('Kode disalin (fallback)', 'success');
    }
});

document.getElementById('btnFormat').addEventListener('click', formatCode);
document.getElementById('btnFullscreenPreview').addEventListener('click', showPreview);
document.getElementById('btnInjectRun').addEventListener('click', runInjectScript);
previewClose.addEventListener('click', hidePreview);

document.getElementById("btnReload").addEventListener("click", function() {
        location.reload();
});



// ===================== FIND & REPLACE =====================

document.getElementById('btnFind').addEventListener('click', () => {
    document.getElementById('findPanel').style.display = 'block';
    document.getElementById('findInput').focus();
});

document.getElementById('findClose').addEventListener('click', () => {
    document.getElementById('findPanel').style.display = 'none';
});



function countOccurrences(text, word) {
    if (!word) return 0;
    return text.split(word).length - 1;
}


// FIND NEXT
document.getElementById('btnFindNext').addEventListener('click', () => {
    const word = findInput.value;
    if (!word) return;

    const content = codeEditor.value;
    let startPos = codeEditor.selectionEnd;

    let index = content.indexOf(word, startPos);

    if (index === -1) {
        index = content.indexOf(word, 0);
    }

    if (index === -1) {
        showStatus('Teks tidak ditemukan', 'warning');
        return;
    }

    codeEditor.focus();
    codeEditor.setSelectionRange(index, index + word.length);
    scrollToCursor();
});


// REPLACE (ganti teks yang sedang terpilih)
document.getElementById('btnReplace').addEventListener('click', () => {
    const word = findInput.value;
    const replace = replaceInput.value;

    if (!word) return;

    const text = codeEditor.value;
    const start = codeEditor.selectionStart;
    const end = codeEditor.selectionEnd;

    if (text.substring(start, end) === word) {

        codeEditor.value =
            text.substring(0, start) +
            replace +
            text.substring(end);

        const newEnd = start + replace.length;

        codeEditor.focus();
        codeEditor.setSelectionRange(start, newEnd);

        scrollToCursor();
    }

    document.getElementById('btnFindNext').click();
});


// REPLACE ALL (ganti semua kemunculan teks)
document.getElementById('btnReplaceAll').addEventListener('click', () => {
    const word = findInput.value;
    const replace = replaceInput.value;

    if (!word) return;

    const content = codeEditor.value;

    const newText = content.split(word).join(replace);
    codeEditor.value = newText;

    showStatus(`Semua '${word}' diganti`, 'success');

    codeEditor.focus();
});



// SCROLL SAAT KETIK KATA PENCARIAN
/*
findInput.addEventListener('input', () => {
    const word = findInput.value.trim();
    if (!word) return;

    const txt = codeEditor.value;
    const index = txt.indexOf(word);

    if (index < 0) {
        showStatus('Teks tidak ditemukan', 'warning');
        return;
    }

    const before = txt.substring(0, index);
    const lineNumber = before.split("\n").length - 1;

    const lineHeight = parseInt(getComputedStyle(codeEditor).lineHeight);
    const targetScroll = lineNumber * lineHeight - codeEditor.clientHeight / 3;

    codeEditor.scrollTo({
        top: targetScroll < 0 ? 0 : targetScroll,
        behavior: "smooth"
    });
});
*/



findInput.addEventListener('input', () => {
    const word = findInput.value.trim();
    if (!word) {
        replaceInput.placeholder = "Ganti..";
        return;
    }

    const txt = codeEditor.value;
    const positions = [];
    const barisArr = [];

    let idx = txt.indexOf(word);
    while (idx !== -1) {
        positions.push(idx);
        const lineNumber = txt.substring(0, idx).split("\n").length;
        barisArr.push(lineNumber);
        idx = txt.indexOf(word, idx + word.length);
    }

    if (positions.length > 0) {
        replaceInput.placeholder = `Ditemukan: ${positions.length}`;

        // Scroll ke hasil pertama
        const firstLine = barisArr[0] - 1;
        const lineHeight = parseInt(getComputedStyle(codeEditor).lineHeight);
        const targetScroll = firstLine * lineHeight - codeEditor.clientHeight / 3;

        codeEditor.scrollTo({
            top: targetScroll < 0 ? 0 : targetScroll,
            behavior: "smooth"
        });
    } else {
        replaceInput.placeholder = "...";
    }
});






// ===================== KEYBOARD SHORTCUTS =====================
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + S untuk save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveCurrentTab();
        showStatus("Disimpan", "success");
    }
    
    // Ctrl/Cmd + P untuk project manager
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        showProjectsModal();
    }
    
    // Ctrl/Cmd + F untuk find
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        document.getElementById('btnFind').click();
    }
    
    // Tab untuk indent
    if (e.key === 'Tab' && document.activeElement === codeEditor) {
        e.preventDefault();
        const start = codeEditor.selectionStart;
        const end = codeEditor.selectionEnd;
        codeEditor.value = codeEditor.value.substring(0, start) + '  ' + codeEditor.value.substring(end);
        codeEditor.selectionStart = codeEditor.selectionEnd = start + 2;
        updateLineNumbers();
    }
    
    // Escape untuk close
    if (e.key === 'Escape') {
        if (previewOverlay.style.display === 'flex') {
            hidePreview();
        }
        if (document.getElementById('projectsModal')?.style.display === 'flex') {
            hideProjectsModal();
        }
    }
    
    // Ctrl/Cmd + Enter untuk preview
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        showPreview();
    }
});



// ===================== INITIALIZATION =====================
document.addEventListener('DOMContentLoaded', function() {
    // Load theme
    const savedTheme = localStorage.getItem('IDE_THEME');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        document.querySelector('#themeToggle i').className = 'fas fa-moon';
    }
    
    // Initialize projects
    if (projects.length === 0) {
        const defaultProject = Project.create('Project 1');
        projects.push(defaultProject);
        saveProjects();
    }
    
    // Set current project
    if (!currentProjectId || !projects.find(p => p.id === currentProjectId)) {
        currentProjectId = projects[0].id;
        localStorage.setItem('IDE_CURRENT_PROJECT', currentProjectId);
    }
    
    // Load project
    loadProject(currentProjectId);
    
    // Auto save interval
    setInterval(() => {
        const project = getCurrentProject();
        if (project) {
            project.modified = new Date().toISOString();
            saveProjects();
        }
    }, 30000); // Auto update timestamp

});
