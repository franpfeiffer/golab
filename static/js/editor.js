let editor;
let vimModeActive = true;

function runCode() {
    console.log("Running code...");
    const code = editor.getValue();
    const outputElement = document.getElementById("output");
    const spinnerElement = document.getElementById("spinner");

    spinnerElement.style.display = "flex";

    fetch("/run", {
        method: "POST",
        body: code
    })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(text || `HTTP error! status: ${response.status}`);
                });
            }
            return response.text();
        })
        .then(data => {
            outputElement.textContent = data || "// No output";
        })
        .catch(error => {
            outputElement.textContent = error.message || "An error occurred";
            console.error("Error:", error);
        })
        .finally(() => {
            spinnerElement.style.display = "none";
        });
}

function initEditor() {
    console.log("Initializing editor...");

    const extraKeys = {
        "Ctrl-Enter": function(cm) {
            console.log("Ctrl+Enter pressed");
            runCode();
        }
    };

    editor = CodeMirror.fromTextArea(document.getElementById("code"), {
        lineNumbers: true,
        mode: "go",
        theme: "rosepine",
        indentWithTabs: true,
        indentUnit: 4,
        lineWrapping: true,
        matchBrackets: true,
        styleActiveLine: true,
        keyMap: "vim",
        extraKeys: extraKeys,
        cursorBlinkRate: 530,
        showCursorWhenSelecting: true,
    });

    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            console.log("Global Ctrl+Enter detected");
            e.preventDefault();
            runCode();
        }
    });

    const codeTextarea = document.getElementById("code");
    if (codeTextarea.value) {
        editor.setValue(codeTextarea.value);
    }

    setTimeout(function() {
        editor.focus();
    }, 100);

    document.getElementById("run-button").addEventListener("click", function() {
        runCode();
    });

    document.getElementById("vim-toggle").addEventListener("click", function() {
        toggleVimMode();
    });

    editor.on('keydown', function(cm, event) {
        if (event.key === 'Escape' && vimModeActive) {
            setTimeout(function() {
                if (CodeMirror.Vim) {
                    const vimState = CodeMirror.Vim.maybeInitVimState_(editor);
                    if (vimState && vimState.mode !== 'normal') {
                        CodeMirror.Vim.handleKey(editor, '<Esc>', 'mapping');
                    }
                    updateModeDisplay();
                }
                editor.focus();
            }, 0);
        }
    });

    updateVimModeIndicator();

    if (CodeMirror.Vim) {
        try {
            console.log("Setting up Vim key mappings");

            CodeMirror.Vim.defineAction('runCode', runCode);
            CodeMirror.Vim.mapCommand("<C-CR>", 'action', 'runCode', {}, {});

            CodeMirror.Vim.map("<C-Enter>", runCode, "normal");
            CodeMirror.Vim.map("<C-Enter>", runCode, "insert");
        } catch (e) {
            console.error("Error setting up Vim key mappings:", e);
        }

        editor.on('vim-mode-change', function(mode) {
            updateModeDisplay(mode);
        });

        try {
            const originalHandleKey = CodeMirror.Vim.handleKey;
            CodeMirror.Vim.handleKey = function(cm, key, origin) {
                const oldMode = CodeMirror.Vim.maybeInitVimState_(cm).mode;
                const result = originalHandleKey.call(this, cm, key, origin);
                const newMode = CodeMirror.Vim.maybeInitVimState_(cm).mode;

                if (oldMode !== newMode) {
                    cm.trigger('vim-mode-change', newMode);
                }

                return result;
            };
        } catch (e) {
            console.error("Error hijacking Vim state:", e);
        }
    }
    updateModeDisplay();
}

function updateModeDisplay(mode) {
    if (!editor || !vimModeActive) return;

    try {
        if (!mode && CodeMirror.Vim) {
            const vimState = CodeMirror.Vim.maybeInitVimState_(editor);
            if (vimState) {
                mode = vimState.mode;
            }
        }

        const modeDisplay = document.getElementById("vim-mode-display");
        if (modeDisplay) {
            modeDisplay.textContent = mode ? mode.toUpperCase() : "NORMAL";

            modeDisplay.className = "vim-mode-indicator";
            if (mode === "insert") {
                modeDisplay.classList.add("insert-mode");
            } else if (mode === "visual") {
                modeDisplay.classList.add("visual-mode");
            } else {
                modeDisplay.classList.add("normal-mode");
            }
        }
    } catch (e) {
        console.error("Error updating mode display:", e);
    }
}

function toggleVimMode() {
    vimModeActive = !vimModeActive;
    editor.setOption("keyMap", vimModeActive ? "vim" : "default");
    updateVimModeIndicator();

    if (vimModeActive) {
        document.getElementById("vim-mode-display-container").style.display = "flex";
        updateModeDisplay("normal");
    } else {
        document.getElementById("vim-mode-display-container").style.display = "none";
    }

    setTimeout(function() {
        editor.focus();
    }, 100);
}

function updateVimModeIndicator() {
    const vimIndicator = document.getElementById("vim-indicator");
    const vimToggle = document.getElementById("vim-toggle");

    if (vimModeActive) {
        vimIndicator.textContent = "VIM";
        vimIndicator.classList.remove("bg-rosepine-muted");
        vimIndicator.classList.add("bg-rosepine-pine");
        vimToggle.textContent = "Disable Vim";
    } else {
        vimIndicator.textContent = "NORMAL";
        vimIndicator.classList.remove("bg-rosepine-pine");
        vimIndicator.classList.add("bg-rosepine-muted");
        vimToggle.textContent = "Enable Vim";
    }
}

document.addEventListener("DOMContentLoaded", function() {
    if (typeof CodeMirror.Vim === 'undefined') {
        console.log("Vim plugin not loaded yet. Waiting...");
        let checkVimInterval = setInterval(function() {
            if (typeof CodeMirror.Vim !== 'undefined') {
                clearInterval(checkVimInterval);
                console.log("Vim plugin loaded!");
                initEditor();
            }
        }, 100);

        setTimeout(function() {
            if (typeof editor === 'undefined') {
                console.log("Vim plugin didn't load, initializing without Vim");
                clearInterval(checkVimInterval);
                vimModeActive = false;
                initEditor();
            }
        }, 2000);
    } else {
        initEditor();
    }
});
