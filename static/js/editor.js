let editor;
let vimModeActive = true;

function runCode() {
    const code = editor.getValue();
    const outputElement = document.getElementById("output");
    const spinnerElement = document.getElementById("spinner");

    spinnerElement.style.display = "flex";

    fetch("/run", {
        method: "POST",
        body: code
    })
        .then(async response => {
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
    const extraKeys = {
        "Ctrl-Enter": function() {
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

    setupVimModeDetection();

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
    }

    updateModeDisplay();
}

function setupVimModeDetection() {
    if (!CodeMirror.Vim) return;

    try {
        const originalHandleKey = CodeMirror.Vim.handleKey;
        CodeMirror.Vim.handleKey = function(cm, key, origin) {
            const vimState = CodeMirror.Vim.maybeInitVimState_(cm);
            const oldMode = vimState ? vimState.mode : 'normal';

            const result = originalHandleKey.call(this, cm, key, origin);

            const newVimState = CodeMirror.Vim.maybeInitVimState_(cm);
            const newMode = newVimState ? newVimState.mode : 'normal';

            if (oldMode !== newMode) {
                cm.signal(cm, 'vim-mode-change', newMode);
                updateModeDisplay(newMode);
            }

            return result;
        };

        editor.on('keyHandled', function() {
            setTimeout(updateModeDisplay, 0);
        });

        editor.on('vim-mode-change', function(mode) {
            updateModeDisplay(mode);
        });

        editor.on('vim-command-done', function() {
            updateModeDisplay();
        });

        editor.on('focus', function() {
            updateModeDisplay();
        });

    } catch (e) {
        console.error("Error setting up Vim mode detection:", e);
    }

    editor.on('keydown', function() {
        setTimeout(updateModeDisplay, 0);
    });
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
            let displayText = "NORMAL";
            if (mode === "insert") {
                displayText = "INSERT";
            } else if (mode === "visual") {
                displayText = "VISUAL";
            } else if (mode === "visual-line") {
                displayText = "VISUAL LINE";
            } else if (mode === "visual-block") {
                displayText = "VISUAL BLOCK";
            } else if (mode === "replace") {
                displayText = "REPLACE";
            }

            modeDisplay.textContent = displayText;

            modeDisplay.className = "vim-mode-indicator";
            if (mode === "insert" || mode === "replace") {
                modeDisplay.classList.add("insert-mode");
            } else if (mode && mode.startsWith("visual")) {
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
