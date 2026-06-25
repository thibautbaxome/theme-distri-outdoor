import { animate } from "vendor";

export class Toast extends HTMLElement {
  connectedCallback() {
    document.addEventListener('toast:show', this.#onShow.bind(this));
  }

  #onShow(event) {
    const messageFragment = document.createRange().createContextualFragment(`
      <div class="toast__message ${event.detail?.tone === 'error' ? 'toast__message--error' : ''}" role="${event.detail?.tone === 'error' ? 'alert' : 'status'}" aria-live="polite">
        ${event.detail.message}
      </div>
    `);

    const messageElement = messageFragment.firstElementChild;
    this.replaceChildren(messageElement);

    animate(messageElement, { opacity: [0, 1], transform: ['translateY(20px)', 'translateY(0)'] }, { duration: 0.25, ease: 'easeInOut' });

    setTimeout(async () => {
      await animate(messageElement, { opacity: [1, 0], transform: ['scale(1)', 'scale(0.85)'] }, { duration: 0.25, ease: 'easeInOut' });
      messageElement.remove();
    }, event.detail?.duration || 2500);
  }
}

if (!window.customElements.get('x-toast')) {
  window.customElements.define('x-toast', Toast);
}