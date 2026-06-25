export class ShareButton extends HTMLElement {
  constructor() {
    super();

    if (navigator.share) {
      this.querySelector('.share-buttons--native').removeAttribute('hidden');
      this.addEventListener('click', this.#showSystemShare);
    }
  }

  async #showSystemShare() {
    try {
      await navigator.share({
        title: this.hasAttribute('share-title') ? this.getAttribute('share-title') : document.title,
        url: this.hasAttribute('share-url') ? this.getAttribute('share-url') : window.location.href
      });
    } catch (error) {
      // This happen when the user cancels the share dialog
    }
  }
}

if (!window.customElements.get('share-button')) {
  window.customElements.define('share-button', ShareButton);
}
