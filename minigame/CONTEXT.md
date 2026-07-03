# Requisitos de Integração de Jogos — Kamale Games

Este documento estabelece as regras e o protocolo técnico para integrar novos minijogos à plataforma. Siga essas diretrizes para manter a consistência com o sistema de controle físico (D-pad) e a navegação por teclado.

---

## 1. Comunicação Hub-Iframe

Os jogos rodam dentro de iframes no documento principal (`index.html`). O controle de inputs e o rastreamento de foco dependem de mensagens trocadas via `postMessage`.

### Envio de Inputs (Hub → Iframe)
O Hub captura eventos de teclado e botões móveis (D-pad) e os repassa para o iframe. Seu jogo deve escutar mensagens com a estrutura abaixo:

```javascript
window.addEventListener('message', function(e) {
    var d = e.data;
    if (!d || d.type !== 'KAMALE_INPUT') return;
    
    // Cria e dispara o evento correspondente no escopo do iframe
    var evt = new KeyboardEvent(d.event, {
        key: d.key,
        code: d.key,
        bubbles: true,
        cancelable: true
    });
    window.dispatchEvent(evt);
});
```

### Reporte de Estado de Foco (Iframe → Hub)
O Hub precisa saber se o jogo está em uma tela de menu para gerenciar o foco. Sempre que o foco mudar ou uma tela nova for exibida, envie a mensagem:

```javascript
window.parent.postMessage({
    type: 'KAMALE_MENU_STATE',
    onMenu: true, // true se estiver em menus/telas de pausa/game over
    focusIndex: currentFocusedIndex,
    totalItems: focusableElements.length
}, '*');
```

---

## 2. Controle de Foco e Navegação

Cada jogo gerencia seu próprio índice de foco interno para elementos interativos.

### Ordem do Menu Superior (Header)
Os elementos do topo do jogo (se existirem na página) devem ser adicionados ao array de foco sempre na ordem estrita:
1. `google-login-btn` (Entrar)
2. `apoie-btn` (Apoie)
3. `home-btn` (Voltar / Home)

Essa ordem garante consistência visual de leitura da direita para a esquerda.

### Obtenção de Elementos Focáveis
Implemente uma função similar a esta em seu script principal:

```javascript
function getFocusableElements(activeScreen) {
    if (!activeScreen) return [];
    
    // Elementos da tela ativa
    const elements = Array.from(activeScreen.querySelectorAll('button, input, a, .room-item'))
        .filter(el => !el.classList.contains('modal-close-btn'));

    // Elementos do topo (header)
    const topRow = document.querySelector('.game-top-row');
    if (topRow && activeScreen !== topRow) {
        const loginBtn = topRow.querySelector('#google-login-btn');
        const apoieBtn = topRow.querySelector('.apoie-btn');
        const homeBtn = topRow.querySelector('.home-btn');
        
        [loginBtn, apoieBtn, homeBtn].forEach(el => {
            if (el && !elements.includes(el)) elements.push(el);
        });
    }

    // Filtra visibilidade e estado desabilitado
    return elements.filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               !el.disabled && 
               el.offsetParent !== null;
    });
}
```

---

## 3. Estado de Pausa e Overlays

O menu de pausa deve dar controle de reinício imediato ou saída ao usuário.

### Estrutura do Overlay de Pausa
O elemento `#pause-overlay` de todo jogo deve conter obrigatoriamente:
- Botão com ID `pause-reset-btn` (Reiniciar Jogo)
- Botão com ID `pause-menu-btn` (Menu Inicial do jogo)

Exemplo HTML:
```html
<div id="pause-overlay" class="overlay hidden">
    <div class="game-over-content">
        <div class="game-over-title">⏸ Pausado</div>
        <button id="pause-reset-btn" class="menu-btn menu-btn-secondary">
            Reiniciar 🔄
        </button>
        <button id="pause-menu-btn" class="menu-btn menu-btn-back">
            Menu Inicial ←
        </button>
    </div>
</div>
```

### Comportamento das Ações de Pausa
- **Reiniciar (`pause-reset-btn`):** O jogo fecha o overlay de pausa, limpa o loop anterior, redefine o score e as coordenadas, define `isPaused = false` e inicia a lógica de jogo do zero.
- **Menu Inicial (`pause-menu-btn`):** O jogo fecha o overlay de pausa, para os loops de atualização e exibe o `#menu-screen`.

---

## 4. Proteção contra Perda de Foco em Gameplay

Quando o jogo estiver ativo (jogando) e **não** estiver pausado:
1. O comando "ArrowUp" ou "Cima" do D-pad **não** deve mover o foco para a barra superior do site.
2. A navegação superior do site só pode ser acessada se a partida estiver em um menu (ex: tela inicial, fim de jogo, lobby) ou se a partida estiver em estado de pausa ativa.
3. No hub principal, a transição para o header ao pressionar UP no primeiro botão do menu do jogo sempre seleciona o botão "Entrar" (`google-login-btn`) primeiro, depois "Apoie", e por último "Voltar" (`home-btn`).
