// auth.js — Login com Google compartilhado entre todos os jogos KamaleMiniGame

(function () {
    'use strict';

    var GOOGLE_ICON_SVG = '<svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';

    var authProvider = new firebase.auth.GoogleAuthProvider();

    function getBallCopaUrl() {
        var base = document.querySelector('script[src$="auth.js"]');
        if (base) {
            var src = base.getAttribute('src');
            var prefix = src.replace('auth.js', '');
            return prefix + 'bola-da-copa-26.png';
        }
        return 'bola-da-copa-26.png';
    }

    function getApoieUrl() {
        var base = document.querySelector('script[src$="auth.js"]');
        if (base) {
            var src = base.getAttribute('src');
            var prefix = src.replace('auth.js', '');
            return prefix + 'apoie.html';
        }
        return 'apoie.html';
    }

    function getInitials(name) {
        if (!name) return '?';
        var parts = name.trim().split(/\s+/);
        return (parts[0][0] + (parts[parts.length - 1][0] || '')).toUpperCase();
    }

    function onPhotoError(img) {
        var user = firebase.auth().currentUser;
        var fallback = document.createElement('span');
        fallback.style.cssText = 'width:24px;height:24px;border-radius:50%;background:#ffd100;color:#000;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;';
        fallback.textContent = getInitials(user ? user.displayName : '');
        img.parentNode.replaceChild(fallback, img);
    }

    function renderLoggedOut(btn) {
        btn.innerHTML = '';
        btn.appendChild(createGoogleIcon());
        var span = document.createElement('span');
        span.style.cssText = 'margin-left:6px;font-size:0.7rem;color:#fff;';
        span.textContent = 'Entrar';
        btn.appendChild(span);
        btn.style.borderRadius = '9999px';
        btn.classList.add('loaded');
        btn.title = 'Entrar';
    }

    function renderLoggedIn(btn, user, isSupporter) {
        var firstName = (user.displayName || '').split(/\s+/)[0] || '';
        var fallback = document.createElement('span');
        fallback.style.cssText = 'width:20px;height:20px;border-radius:50%;background:#ffd100;color:#000;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;flex-shrink:0;';
        fallback.textContent = getInitials(user.displayName);

        var img = document.createElement('img');
        img.src = user.photoURL;
        img.alt = user.displayName || '';
        img.style.cssText = 'width:20px;height:20px;border-radius:50%;flex-shrink:0;';
        img.onerror = function () { this.parentNode.replaceChild(fallback, this); };

        var nameSpan = document.createElement('span');
        nameSpan.textContent = firstName + (isSupporter ? ' ⭐' : '');
        nameSpan.style.cssText = 'margin-left:6px;font-size:0.7rem;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';

        btn.innerHTML = '';
        btn.appendChild(img);
        btn.appendChild(nameSpan);
        btn.style.borderRadius = '9999px';
        btn.classList.add('loaded');
        btn.title = (user.displayName || user.email) + (isSupporter ? ' ⭐ Apoiador' : '');
    }

    function createGoogleIcon() {
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '16');
        svg.setAttribute('height', '16');
        svg.setAttribute('viewBox', '0 0 48 48');
        svg.innerHTML = '<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>';
        return svg;
    }

    function createPreferencesModal() {
        if (document.getElementById('auth-modal-overlay')) return;

        var overlay = document.createElement('div');
        overlay.id = 'auth-modal-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;';

        var modal = document.createElement('div');
        modal.style.cssText = 'background:#1a1a2e;border:2px solid #ffd100;border-radius:12px;padding:24px;min-width:260px;max-width:320px;text-align:center;font-family:Share Tech Mono,monospace;color:#fff;';

        modal.innerHTML =
            '<style>@keyframes modal-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}.modal-skeleton{display:inline-block;background:linear-gradient(90deg,#333 25%,#444 50%,#333 75%);background-size:200% 100%;animation:modal-shimmer 1.2s infinite;border-radius:4px;}</style>' +
            '<div id="auth-modal-content"></div>';

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closePreferencesModal();
        });
    }

    function openPreferencesModal() {
        var user = firebase.auth().currentUser;
        if (!user) return;

        createPreferencesModal();

        var content = document.getElementById('auth-modal-content');
        content.innerHTML =
            '<div style="margin-bottom:16px;">' +
                '<div id="auth-modal-avatar" style="margin:0 auto 8px;width:64px;height:64px;border-radius:50%;border:2px solid #ffd100;overflow:hidden;"></div>' +
                '<div style="font-size:0.9rem;color:#ffd100;">' + (user.displayName || '') + '</div>' +
                '<div style="font-size:0.7rem;color:#aaa;">' + (user.email || '') + '</div>' +
                '<div id="auth-modal-nickname" style="margin-top:8px;display:flex;align-items:center;justify-content:center;gap:6px;">' +
                    '<span id="auth-nickname-text" style="font-size:0.75rem;color:#ccc;"><span class="modal-skeleton" style="width:70px;height:12px;display:inline-block;"></span></span>' +
                    '<button id="auth-nickname-edit" style="background:none;border:none;cursor:pointer;padding:2px;" title="Editar nickname">' +
                        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffd100" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                            '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>' +
                        '</svg>' +
                    '</button>' +
                '</div>' +
                '<div id="auth-modal-supporter" style="margin-top:8px;"><span class="modal-skeleton" style="width:80px;height:18px;border-radius:20px;display:inline-block;"></span></div>' +
                '<div id="auth-modal-theme" style="margin-top:12px;padding-top:10px;border-top:1px solid #333;display:flex;align-items:center;justify-content:space-between;">' +
                    '<span style="font-size:0.75rem;color:#aaa;">Tema</span>' +
                    '<div id="theme-toggle-area" style="display:flex;align-items:center;gap:8px;">' +
                        '<span class="modal-skeleton" style="width:36px;height:20px;border-radius:10px;display:inline-block;"></span>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div id="auth-modal-actions">' +
                '<button id="auth-modal-logout" style="width:100%;padding:10px;background:#e74c3c;color:#fff;border:none;border-radius:8px;font-family:inherit;font-size:0.85rem;cursor:pointer;">Sair da conta</button>' +
            '</div>' +
            '<button id="auth-modal-close" style="width:100%;padding:10px;background:transparent;color:#aaa;border:1px solid #444;border-radius:8px;font-family:inherit;font-size:0.8rem;cursor:pointer;margin-top:8px;">Fechar</button>';

        var avatarContainer = document.getElementById('auth-modal-avatar');
        var img = document.createElement('img');
        img.src = user.photoURL;
        img.alt = user.displayName || '';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
        img.onerror = function () {
            avatarContainer.textContent = getInitials(user.displayName);
            avatarContainer.style.cssText += 'display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:bold;color:#000;background:#ffd100;';
        };
        avatarContainer.appendChild(img);

        var nicknameText = document.getElementById('auth-nickname-text');
        var nicknameRef = firebase.database().ref('users/' + user.uid + '/nickname');
        nicknameRef.once('value').then(function (snap) {
            nicknameText.textContent = snap.exists() ? snap.val() : user.displayName || '';
        });

        document.getElementById('auth-nickname-edit').addEventListener('click', function () {
            var current = nicknameText.textContent;
            var input = document.createElement('input');
            input.type = 'text';
            input.value = current;
            input.maxLength = 20;
            input.style.cssText = 'width:120px;padding:4px 8px;border-radius:6px;border:1px solid #ffd100;background:#0a0a0a;color:#fff;font-family:inherit;font-size:0.75rem;text-align:center;outline:none;';
            nicknameText.replaceWith(input);
            input.focus();
            input.select();

            function save() {
                var val = input.value.trim() || current;
                nicknameRef.set(val);
                nicknameText.textContent = val;
                input.replaceWith(nicknameText);
                localStorage.setItem('kamale_cached_nickname', val);
                var cached = localStorage.getItem('kamale_cached_user');
                if (cached) {
                    try {
                        var parsed = JSON.parse(cached);
                        parsed.nickname = val;
                        localStorage.setItem('kamale_cached_user', JSON.stringify(parsed));
                    } catch(e) {}
                }
            }
            input.addEventListener('blur', save);
            input.addEventListener('keydown', function (e) {
                e.stopPropagation();
                if (e.key === 'Enter') { e.preventDefault(); save(); }
                if (e.key === 'Escape') { input.value = current; save(); }
            });
            input.addEventListener('keyup', function (e) { e.stopPropagation(); });
            input.addEventListener('keypress', function (e) { e.stopPropagation(); });
        });

        document.getElementById('auth-modal-logout').addEventListener('click', function () {
            signOutUser();
            closePreferencesModal();
        });

        document.getElementById('auth-modal-close').addEventListener('click', closePreferencesModal);

        checkSupporter(user.uid).then(function (isSupporter) {
            if (isSupporter) {
                document.getElementById('auth-modal-supporter').innerHTML = '<span style="display:inline-block;padding:4px 12px;background:#ffd100;color:#000;border-radius:20px;font-size:0.7rem;font-weight:bold;">⭐ Apoiador</span>';
                
                // Adicionar seção de itens
                var itemsSection = document.createElement('div');
                itemsSection.id = 'auth-modal-items';
                itemsSection.style.cssText = 'margin-top:16px;padding-top:12px;border-top:1px solid #333;';
                itemsSection.innerHTML =
                    '<div style="font-size:0.75rem;color:#aaa;margin-bottom:8px;text-align:left;">Seus Itens:</div>' +
                    '<div id="auth-items-list" style="display:flex;flex-direction:column;gap:8px;">' +
                        '<div class="modal-skeleton" style="width:100%;height:40px;border-radius:8px;"></div>' +
                    '</div>';
                content.insertBefore(itemsSection, document.getElementById('auth-modal-actions'));
                
                // Carregar itens do usuário
                loadUserItems(user.uid);
                
                // Separar ações com borda
                var actionsDiv = document.getElementById('auth-modal-actions');
                actionsDiv.style.cssText = 'margin-top:16px;padding-top:12px;border-top:1px solid #333;';
                actionsDiv.innerHTML =
                    '<button id="auth-modal-logout" style="width:100%;padding:10px;background:#e74c3c;color:#fff;border:none;border-radius:8px;font-family:inherit;font-size:0.85rem;cursor:pointer;">Sair da conta</button>';
                document.getElementById('auth-modal-logout').addEventListener('click', function () {
                    signOutUser();
                    closePreferencesModal();
                });
            } else {
                document.getElementById('auth-modal-supporter').innerHTML = '<a href="' + getApoieUrl() + '" style="display:inline-block;padding:4px 12px;background:#3acc7a;color:#fff;border-radius:20px;font-size:0.7rem;font-weight:bold;text-decoration:none;">Torne-se apoiador</a>';
            }
        });

        // Carregar tema do usuário
        var themeRef = firebase.database().ref('users/' + user.uid + '/theme');
        themeRef.once('value').then(function (snap) {
            var isDark = snap.val() !== 'light';
            var themeArea = document.getElementById('theme-toggle-area');
            if (!themeArea) return;
            themeArea.innerHTML =
                '<label style="position:relative;display:inline-flex;align-items:center;width:36px;height:20px;cursor:pointer;">' +
                    '<input type="checkbox" id="theme-toggle" style="opacity:0;width:0;height:0;" ' + (isDark ? 'checked' : '') + '>' +
                    '<span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:' + (isDark ? '#ffd100' : '#444') + ';transition:.3s;border-radius:10px;"></span>' +
                    '<span style="position:absolute;height:16px;width:16px;left:' + (isDark ? '18px' : '2px') + ';bottom:2px;background-color:' + (isDark ? '#1a1a2e' : '#fff') + ';transition:.3s;border-radius:50%;z-index:2;"></span>' +
                '</label>';
            applyTheme(isDark ? 'dark' : 'light');

            document.getElementById('theme-toggle').addEventListener('change', function () {
                var dark = this.checked;
                var theme = dark ? 'dark' : 'light';
                themeRef.set(theme);
                applyTheme(theme);
                var bg = this.nextElementSibling;
                var dot = bg.nextElementSibling;
                bg.style.backgroundColor = dark ? '#ffd100' : '#444';
                dot.style.left = dark ? '18px' : '2px';
                dot.style.backgroundColor = dark ? '#1a1a2e' : '#fff';
            });
        });
    }

    function applyTheme(theme) {
        var isLight = theme === 'light';
        if (isLight) {
            document.body.classList.add('theme-light');
        } else {
            document.body.classList.remove('theme-light');
        }
        var isInIframe = window.self !== window.top;
        document.body.style.backgroundColor = isLight ? (isInIframe ? '#e0e0e0' : '#d4d4d4') : '';
        document.body.style.color = isLight ? '#1a1a1a' : '';
        document.body.dataset.theme = theme;
        localStorage.setItem('kamale_cached_theme', theme);
        try {
            var boards = document.querySelectorAll('#game-board');
            boards.forEach(function(b) {
                b.style.backgroundColor = isLight ? '#e0e0e0' : '';
            });
        } catch(e) {}
        try {
            var menus = document.querySelectorAll('#menu-screen');
            menus.forEach(function(m) {
                m.style.backgroundColor = isLight ? '#e0e0e0' : '';
            });
        } catch(e) {}
        try {
            var screens = document.querySelectorAll('.screen');
            screens.forEach(function(s) {
                s.style.backgroundColor = isLight ? '#e0e0e0' : '';
            });
        } catch(e) {}
        try {
            var containers = document.querySelectorAll('#app-container');
            containers.forEach(function(c) {
                c.style.backgroundColor = isLight ? '#e0e0e0' : '';
            });
        } catch(e) {}
        try {
            var canvases = document.querySelectorAll('canvas');
            canvases.forEach(function(c) {
                c.style.backgroundColor = isLight ? '#e0e0e0' : '';
            });
        } catch(e) {}
        try {
            var iframe = document.getElementById('game-iframe');
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage({ type: 'KAMALE_THEME', theme: theme }, '*');
            }
        } catch(e) {}
        try {
            var toggleInput = document.getElementById('theme-toggle-input');
            if (toggleInput) {
                toggleInput.checked = theme === 'dark';
                var knob = document.getElementById('tgl-knob');
                if (knob) knob.textContent = theme === 'dark' ? '🌙' : '☀️';
            }
        } catch(e) {}
    }

    function toggleTheme() {
        var current = document.body.classList.contains('theme-light') ? 'light' : 'dark';
        var next = current === 'light' ? 'dark' : 'light';
        applyTheme(next);
        var user = firebase.auth().currentUser;
        if (user) {
            firebase.database().ref('users/' + user.uid + '/theme').set(next);
        }
        return next;
    }

    function getTheme() {
        return document.body.classList.contains('theme-light') ? 'light' : 'dark';
    }

    function injectThemeCSS() {
        if (document.getElementById('kamale-theme-css')) return;
        var s = document.createElement('style');
        s.id = 'kamale-theme-css';
        s.textContent =
            '.theme-light, .theme-light body {' +
                'background-color:#d4d4d4 !important;' +
                'color:#1a1a1a !important;' +
            '}' +
            '.theme-light .header-sub { color:#777; }' +
            '.theme-light .footer { color:#999; }' +
            '.theme-light #game-board {' +
                'border-color:rgba(0,0,0,0.08) !important;' +
                'background-color:#e0e0e0 !important;' +
            '}' +
            '.theme-light .header-logo { color:#7a5c00; }' +
            '.theme-light .logo-mini { color:#1a1a1a !important; }' +
            '.theme-light .card-label { color:#555; }' +
            '.theme-light .menu-title { color:#1a1a1a !important; }' +
            '.theme-light .game-over-title { color:#1a1a1a !important; }' +
            '.theme-light #apoie-screen .apoie-desc { color:#555; }' +
            '.theme-light .apoie-back-btn { color:#888;border-color:#bbb; }' +
            '.theme-light .toast { background-color:#cfcfcf;color:#333;border-color:#bbb; }' +
            '.theme-light .toast.toast-info { background-color:#c0c0c0;color:#333;border-color:#bbb; }' +
            '.theme-light .toast.toast-success { background-color:#b8d8b8;color:#2e7d32;border-color:#8fbc8f; }' +
            '.theme-light #app-container { background-color:#e0e0e0 !important; }' +
            '.theme-light #menu-screen { background-color:#e0e0e0 !important; }' +
            '.theme-light .screen { background-color:#e0e0e0 !important; }' +
            '.theme-light .game-section { background-color:#e0e0e0 !important; }' +
            '.theme-light .overlay { background-color:rgba(224,224,224,0.92) !important; }' +
            '.theme-light .menu-content { background-color:#e0e0e0 !important;border-color:rgba(0,0,0,0.08) !important; }' +
            '.theme-light .game-over-content { background-color:#e0e0e0 !important;border-color:rgba(0,0,0,0.08) !important; }' +
            '.theme-light .instructions-content { background-color:#e0e0e0 !important;border-color:rgba(0,0,0,0.08) !important; }' +
            '.theme-light .room-item { border-color:#bbb !important;background-color:#e8e8e8 !important; }' +
            '.theme-light .lobby-player-card { border-color:#bbb !important; }' +
            '.theme-light .mp-room-code, .theme-light .lobby-code {' +
                'background-color:#e0e0e0 !important;border-color:#bbb !important;color:#1a1a1a !important;' +
            '}' +
            '.theme-light .mp-divider { color:#999 !important; }' +
            '.theme-light .instructions-list li .key-hint { border-color:#bbb !important;background-color:#e0e0e0 !important;color:#333 !important; }' +
            '.theme-light #highscore-display, .theme-light #score-display,' +
            '.theme-light .mp-room-code-label, .theme-light .mp-player-count { color:#444 !important; }' +
            '.theme-light .level-btn { background-color:#cfcfcf !important;color:#1a1a1a !important;border-color:#bbb !important; }' +
            '.home-btn.focused { background-color:#e07777!important;border-color:#ffaaaa!important;outline:none!important;transform:translateY(-1px) scale(1.08)!important; }' +
            '.google-login-btn.focused { background-color:#353535!important;border-color:#ffd100!important;outline:none!important;transform:translateY(-1px) scale(1.08)!important; }' +
            '.help-btn.focused { background-color:#ffd100!important;border-color:#cca700!important;color:#000!important;outline:none!important;transform:translateY(-1px) scale(1.08)!important; }' +
            '.apoie-btn.focused { background-color:#ffd100!important;border-color:#cca700!important;color:#000!important;box-shadow:0 0 15px rgba(255,209,0,0.5),0 4px 0 #cca700!important; }';
            
        document.head.appendChild(s);
    }

    function injectErgonomicMobileCSS() {
        var existing = document.getElementById('kamale-mobile-ergonomics');
        if (existing) existing.remove();
        var s = document.createElement('style');
        s.id = 'kamale-mobile-ergonomics';
        s.textContent =
            '@media (max-width: 768px) {' +
                'html, body { min-height: 100vh !important; min-height: 100dvh !important; max-height: 100vh !important; max-height: 100dvh !important; overflow: hidden !important; margin: 0 !important; padding: 0 !important; }' +
                '#app-container, .app-container { width: 100vw !important; max-width: 100vw !important; height: 100vh !important; height: 100dvh !important; padding: clamp(4px, 1vh, 8px) clamp(8px, 3vw, 16px) clamp(16px, 3vh, 28px) !important; padding-bottom: calc(clamp(12px, 2vh, 20px) + env(safe-area-inset-bottom, 12px)) !important; box-sizing: border-box !important; display: flex !important; flex-direction: column !important; justify-content: space-evenly !important; align-items: center !important; gap: clamp(4px, 1vh, 10px) !important; }' +
                '.game-top-row { width: 100% !important; max-width: min(96vw, 500px) !important; flex-shrink: 0 !important; margin-bottom: 6px !important; }' +
                '.game-section, #boards-wrapper { width: 100% !important; max-width: min(96vw, 500px) !important; flex: 1 !important; display: flex !important; align-items: center !important; justify-content: center !important; min-height: 0 !important; margin: 0 !important; }' +
                '#game-board { width: min(94vw, calc(100vh - 245px), calc(100dvh - 245px), 440px) !important; height: min(94vw, calc(100vh - 245px), calc(100dvh - 245px), 440px) !important; max-width: none !important; max-height: none !important; aspect-ratio: 1 / 1 !important; border-radius: 16px !important; margin: 0 auto !important; flex-shrink: 0 !important; }' +
                '#game-board:has(#game-canvas[width="240"]), #game-board:has(#game-canvas[width="300"]), .block-game #game-board, body:has(#action-a[aria-label*="Rotacionar"]) #game-board { height: min(calc(100vh - 245px), calc(100dvh - 245px), 510px) !important; max-height: min(calc(100vh - 245px), calc(100dvh - 245px), 510px) !important; width: auto !important; aspect-ratio: 1 / 1.5 !important; margin: 0 auto !important; flex-shrink: 0 !important; }' +
                '#controls-wrapper { width: 100% !important; max-width: min(96vw, 520px) !important; flex-shrink: 0 !important; margin-top: 15px !important; margin-bottom: 0 !important; padding: 0 clamp(8px, 4vw, 24px) !important; box-sizing: border-box !important; display: flex !important; align-items: center !important; justify-content: space-between !important; z-index: 50 !important; }' +
                '#dpad-container { display: grid !important; grid-template-columns: repeat(3, clamp(45px, 13vw, 56px)) !important; grid-template-rows: repeat(3, clamp(45px, 13vw, 56px)) !important; gap: clamp(4px, 1vw, 6px) !important; flex-shrink: 0 !important; }' +
                '.dpad-btn { font-size: clamp(1.1rem, 3.5vw, 1.35rem) !important; border-radius: 12px !important; box-shadow: 0 4px 0 #141414 !important; display: flex !important; align-items: center !important; justify-content: center !important; }' +
                '.action-btn { width: clamp(70px, 20vw, 84px) !important; height: clamp(70px, 20vw, 84px) !important; font-size: clamp(1.5rem, 5vw, 1.8rem) !important; box-shadow: 0 5px 0 #141414 !important; border-radius: 50% !important; display: flex !important; align-items: center !important; justify-content: center !important; flex-shrink: 0 !important; }' +
                '.action-btn.action-a, .action-btn.action-power { width: clamp(70px, 20vw, 84px) !important; height: clamp(70px, 20vw, 84px) !important; }' +
                '.pause-btn-wrapper { display: flex !important; flex-direction: column !important; justify-content: center !important; align-items: center !important; gap: 8px !important; min-height: auto !important; flex-shrink: 0 !important; }' +
                '.pause-btn { width: 42px !important; height: 42px !important; padding: 0 !important; border-radius: 50% !important; font-size: 1rem !important; display: flex !important; align-items: center !important; justify-content: center !important; }' +
                '.reset-btn { padding: 6px 14px !important; font-size: clamp(0.72rem, 2.2vw, 0.82rem) !important; border-radius: 9999px !important; }' +
                'body:has(.games-grid) #app-container, body:has(.games-grid) .app-container { justify-content: center !important; gap: clamp(14px, 2.5vh, 26px) !important; }' +
                'body:has(.games-grid) #game-board { width: min(94vw, calc(100vh - 245px), calc(100dvh - 245px), 440px) !important; height: min(94vw, calc(100vh - 245px), calc(100dvh - 245px), 440px) !important; aspect-ratio: 1 / 1 !important; }' +
                'body:has(.games-grid):not(.game-active) #game-board { padding: clamp(10px, 3vw, 18px) !important; gap: clamp(8px, 2vw, 14px) !important; }' +
                'body:has(.games-grid) #controls-wrapper { margin-top: 15px !important; margin-bottom: clamp(24px, 5vh, 55px) !important; }' +
            '}';
        document.head.appendChild(s);
    }

    function initHapticFeedback() {
        if (!('vibrate' in navigator)) return;
        var lastVibrate = 0;
        function triggerVibration(e) {
            var now = Date.now();
            if (now - lastVibrate < 40) return;
            var target = e.target.closest('button, .dpad-btn, .action-btn, .menu-btn, .reset-btn, .pause-btn, .back-btn, .apoie-btn, .modal-close-btn, .game-card');
            if (!target || target.disabled) return;
            lastVibrate = now;
            try {
                if (target.classList.contains('action-btn') || target.id === 'action-a' || target.id === 'action-power' || target.classList.contains('game-card')) {
                    navigator.vibrate(25);
                } else if (target.classList.contains('reset-btn') || target.classList.contains('pause-btn')) {
                    navigator.vibrate([15, 30, 15]);
                } else {
                    navigator.vibrate(15);
                }
            } catch (err) {}
        }
        document.addEventListener('touchstart', triggerVibration, { passive: true });
        document.addEventListener('pointerdown', triggerVibration, { passive: true });
    }

    function loadTheme() {
        var user = firebase.auth().currentUser;
        if (!user) return;
        firebase.database().ref('users/' + user.uid + '/theme').once('value').then(function (snap) {
            var theme = snap.val() === 'light' ? 'light' : 'dark';
            applyTheme(theme);
            localStorage.setItem('kamale_cached_theme', theme);
            var cached = localStorage.getItem('kamale_cached_user');
            if (cached) {
                try {
                    var parsed = JSON.parse(cached);
                    parsed.theme = theme;
                    localStorage.setItem('kamale_cached_user', JSON.stringify(parsed));
                } catch(e) {}
            }
        });
    }

    function closePreferencesModal() {
        var overlay = document.getElementById('auth-modal-overlay');
        if (overlay) overlay.remove();
    }

    function loadUserItems(uid) {
        var itemsRef = firebase.database().ref('users/' + uid + '/items');
        itemsRef.once('value').then(function (snap) {
            var items = snap.val() || {};
            var itemsList = document.getElementById('auth-items-list');
            if (!itemsList) return;
            
            // Item: Bola da Copa
            var ballCopaEnabled = items.ball_copa !== false; // Padrão: true
            var itemHTML =
                '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px;background:#0a0a0a;border-radius:8px;border:1px solid #333;">' +
                    '<div style="display:flex;align-items:center;gap:8px;">' +
                        '<img src="' + getBallCopaUrl() + '" style="width:28px;height:28px;border-radius:50%;object-fit:cover;' + (ballCopaEnabled ? '' : 'opacity:0.4;filter:grayscale(100%);') + '" alt="Bola da Copa">' +
                        '<span style="font-size:0.75rem;color:#fff;">Bola da Copa</span>' +
                    '</div>' +
                    '<label style="position:relative;display:inline-flex;align-items:center;width:36px;height:20px;cursor:pointer;">' +
                        '<input type="checkbox" id="toggle-ball-copa" data-item="ball_copa" style="opacity:0;width:0;height:0;" ' + (ballCopaEnabled ? 'checked' : '') + '>' +
                        '<span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:' + (ballCopaEnabled ? '#3acc7a' : '#e74c3c') + ';transition:.3s;border-radius:10px;"></span>' +
                        '<span style="position:absolute;height:16px;width:16px;left:' + (ballCopaEnabled ? '18px' : '2px') + ';bottom:2px;background-color:#fff;transition:.3s;border-radius:50%;z-index:2;"></span>' +
                    '</label>' +
                '</div>';
            itemsList.innerHTML = itemHTML;
            
            // Event listener para toggle
            document.getElementById('toggle-ball-copa').addEventListener('change', function () {
                var enabled = this.checked;
                firebase.database().ref('users/' + uid + '/items/ball_copa').set(enabled);
                
                // Atualizar visual
                var container = this.closest('label');
                var img = container.closest('div').querySelector('img');
                var toggleBg = container.querySelector('span:first-of-type');
                var toggleDot = container.querySelector('span:last-of-type');
                
                if (enabled) {
                    img.style.opacity = '1';
                    img.style.filter = 'none';
                    toggleBg.style.backgroundColor = '#3acc7a';
                    toggleDot.style.left = '18px';
                } else {
                    img.style.opacity = '0.4';
                    img.style.filter = 'grayscale(100%)';
                    toggleBg.style.backgroundColor = '#e74c3c';
                    toggleDot.style.left = '2px';
                }
            });
        });
    }

    function generateUniqueNickname(displayName) {
        var firstName = (displayName || '').split(/\s+/)[0].toLowerCase();
        if (!firstName) firstName = 'jogador';

        return firebase.database().ref('users').once('value').then(function (snap) {
            var used = {};
            snap.forEach(function (child) {
                var nick = (child.val().nickname || '').toLowerCase();
                if (nick === firstName) {
                    used[0] = true;
                } else if (nick.startsWith(firstName)) {
                    var suffix = nick.substring(firstName.length);
                    if (/^\d+$/.test(suffix)) {
                        used[parseInt(suffix)] = true;
                    }
                }
            });

            if (!used[0]) return firstName;

            var next = 1;
            while (used[next]) next++;

            return firstName + next;
        });
    }

    function saveUserToDatabase(user) {
        if (!user) return;
        var ref = firebase.database().ref('users/' + user.uid);
        return ref.once('value').then(function (snap) {
            var data = snap.exists() ? snap.val() : {};
            var theme = data.theme || 'dark';
            var nickname = data.nickname;
            
            var savePromise;
            if (nickname) {
                savePromise = ref.set({
                    name: user.displayName || data.name || '',
                    email: user.email || data.email || '',
                    photo: user.photoURL || data.photo || '',
                    nickname: nickname,
                    items: data.items || {},
                    theme: theme
                });
            } else {
                savePromise = generateUniqueNickname(user.displayName).then(function (nick) {
                    nickname = nick;
                    return ref.set({
                        name: user.displayName || data.name || '',
                        email: user.email || data.email || '',
                        photo: user.photoURL || data.photo || '',
                        nickname: nickname,
                        items: data.items || {},
                        theme: theme
                    });
                });
            }
            
            return savePromise.then(function () {
                localStorage.setItem('kamale_cached_nickname', nickname);
                localStorage.setItem('kamale_cached_theme', theme);
                var userData = {
                    uid: user.uid,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    nickname: nickname,
                    theme: theme
                };
                localStorage.setItem('kamale_cached_user', JSON.stringify(userData));
            });
        });
    }

    function signInWithGoogle() {
        return firebase.auth().signInWithPopup(authProvider)
            .then(function (result) {
                return saveUserToDatabase(result.user);
            })
            .catch(function (error) {
                if (error.code !== 'auth/popup-closed-by-user') {
                    console.error('Erro no login Google:', error);
                }
            });
    }

    function signOutUser() {
        localStorage.removeItem('kamale_cached_user');
        return firebase.auth().signOut();
    }

    var supporterCache = {};
    var authLoaded = false;

    function checkSupporter(uid) {
        if (supporterCache[uid] !== undefined) {
            return Promise.resolve(supporterCache[uid]);
        }
        return firebase.database().ref('supporters/' + uid).once('value').then(function (snap) {
            supporterCache[uid] = snap.exists();
            return snap.exists();
        });
    }

    function renderAllButtons(user) {
        var btns = document.querySelectorAll('.google-login-btn');
        var displayUser = user;
        if (!displayUser) {
            var cached = localStorage.getItem('kamale_cached_user');
            if (cached) {
                try {
                    displayUser = JSON.parse(cached);
                } catch(e) {}
            }
        }
        if (!displayUser) {
            btns.forEach(function (btn) { renderLoggedOut(btn); });
            return;
        }
        checkSupporter(displayUser.uid).then(function (isSupporter) {
            btns.forEach(function (btn) { renderLoggedIn(btn, displayUser, isSupporter); });
        });
    }

    function initAuth() {
        injectThemeCSS();
        // Apenas injetar CSS ergonômico móvel fora de um iframe
        if (!window.location.search.includes('iframe=true') && window.self === window.top) {
            injectErgonomicMobileCSS();
        }
        initHapticFeedback();

        // Apply cached theme immediately on load
        var cachedTheme = localStorage.getItem('kamale_cached_theme');
        if (cachedTheme) {
            applyTheme(cachedTheme);
        }

        var cachedUser = firebase.auth().currentUser;
        if (!cachedUser) {
            var cached = localStorage.getItem('kamale_cached_user');
            if (cached) {
                try {
                    cachedUser = JSON.parse(cached);
                } catch(e) {}
            }
        }
        if (cachedUser) {
            renderAllButtons(cachedUser);
            loadTheme();
            authLoaded = true;
        }

        firebase.auth().onAuthStateChanged(function (user) {
            if (user) {
                var cached = localStorage.getItem('kamale_cached_user');
                var currentCached = {};
                if (cached) {
                    try { currentCached = JSON.parse(cached); } catch(e) {}
                }
                var userData = {
                    uid: user.uid,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    nickname: currentCached.nickname || localStorage.getItem('kamale_cached_nickname') || user.displayName || '',
                    theme: currentCached.theme || localStorage.getItem('kamale_cached_theme') || 'dark'
                };
                localStorage.setItem('kamale_cached_user', JSON.stringify(userData));

                // Fetch database updates asynchronously
                firebase.database().ref('users/' + user.uid + '/nickname').once('value').then(function (snap) {
                    if (snap.exists()) {
                        var nick = snap.val();
                        localStorage.setItem('kamale_cached_nickname', nick);
                        var c = localStorage.getItem('kamale_cached_user');
                        if (c) {
                            try {
                                var p = JSON.parse(c);
                                p.nickname = nick;
                                localStorage.setItem('kamale_cached_user', JSON.stringify(p));
                            } catch(e) {}
                        }
                    }
                });
            }
            renderAllButtons(user);
            if (user) loadTheme();
            authLoaded = true;
        });

        var btns = document.querySelectorAll('.google-login-btn');
        btns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (!authLoaded) return;
                var currentUser = firebase.auth().currentUser;
                if (!currentUser) {
                    var cached = localStorage.getItem('kamale_cached_user');
                    if (cached) {
                        try {
                            currentUser = JSON.parse(cached);
                        } catch(e) {}
                    }
                }
                if (currentUser) {
                    openPreferencesModal();
                } else {
                    signInWithGoogle();
                }
            });
        });

        // Listen for theme changes from parent hub
        window.addEventListener('message', function (e) {
            if (e.data && e.data.type === 'KAMALE_THEME') {
                applyTheme(e.data.theme);
            }
        });

        // Request current theme from parent (in case we're in an iframe)
        if (window.self !== window.top) {
            window.parent.postMessage({ type: 'KAMALE_THEME_REQUEST' }, '*');
        }
    }

    window.KamaleAuth = {
        signIn: signInWithGoogle,
        signOut: signOutUser,
        init: initAuth,
        getUser: function () {
            var user = firebase.auth().currentUser;
            if (!user) {
                var cached = localStorage.getItem('kamale_cached_user');
                if (cached) {
                    try {
                        return JSON.parse(cached);
                    } catch(e) {}
                }
            }
            return user;
        },
        applyTheme: applyTheme,
        toggleTheme: toggleTheme,
        getTheme: getTheme
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuth);
    } else {
        initAuth();
    }
})();
