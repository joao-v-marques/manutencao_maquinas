// controle compartilhado dos overlays/modais: abre/fecha, trava o scroll da página, cuida do foco
// e fecha o modal mais recente com Esc (útil quando o detalhe abre por cima do histórico)

const openStack = [];

function syncBodyScrollLock() {
    document.body.classList.toggle("has-modal-open", openStack.length > 0);
}

export function openOverlay(overlay, { focus } = {}) {
    if (!overlay || overlay.classList.contains("is-open")) {
        return;
    }

    // guarda quem abriu o modal para devolver o foco ao fechar (navegação por teclado)
    overlay._returnFocusTo = document.activeElement;

    overlay.classList.add("is-open");
    openStack.push(overlay);
    syncBodyScrollLock();

    const focusTarget = focus || overlay.querySelector(".modal__close");
    if (focusTarget) {
        requestAnimationFrame(() => focusTarget.focus({ preventScroll: true }));
    }
}

export function closeOverlay(overlay) {
    if (!overlay || !overlay.classList.contains("is-open")) {
        return;
    }

    overlay.classList.remove("is-open");

    const index = openStack.lastIndexOf(overlay);
    if (index !== -1) {
        openStack.splice(index, 1);
    }
    syncBodyScrollLock();

    const returnFocusTo = overlay._returnFocusTo;
    if (returnFocusTo && document.contains(returnFocusTo)) {
        returnFocusTo.focus({ preventScroll: true });
    }
}

// liga X, botões de cancelar e clique fora ao fechamento do overlay
export function bindOverlayClose(overlay, closeButtons, onClose) {
    const close = () => {
        closeOverlay(overlay);
        if (onClose) onClose();
    };

    closeButtons.filter(Boolean).forEach(button => button.addEventListener("click", close));

    overlay.addEventListener("mousedown", (e) => {
        if (e.target === overlay) close();
    });

    overlay._close = close;
}

document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || openStack.length === 0) {
        return;
    }

    // o flatpickr aberto trata o próprio Esc; não fechar o modal por baixo dele
    if (document.querySelector(".flatpickr-calendar.open")) {
        return;
    }

    const topOverlay = openStack[openStack.length - 1];
    e.preventDefault();

    if (topOverlay._close) {
        topOverlay._close();
    } else {
        closeOverlay(topOverlay);
    }
});
