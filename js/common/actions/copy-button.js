export class CopyButton extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', this.#copyToClipboard);
  }

  async #copyToClipboard() {
    if (!navigator.clipboard) {
      return;
    }

    this.querySelector('button')?.setAttribute('aria-busy', 'true');
    await navigator.clipboard.writeText(this.getAttribute('data-text') ?? '');

    setTimeout(() => {
      this.querySelector('button')?.setAttribute('aria-busy', 'false');
    }, 2000);
  }
}

if (!window.customElements.get('copy-button')) {
  window.customElements.define('copy-button', CopyButton);
}
