export class MultiColumn extends HTMLElement {
  constructor() {
    super();

    if (Shopify.designMode) {
      this.addEventListener('shopify:block:select', (event) => {
        event.target.scrollIntoView({inline: 'center', block: 'nearest', behavior: event.detail['load'] ? 'auto' : 'smooth'});
      });
    }
  }
}

if (!window.customElements.get('multi-column')) {
  window.customElements.define('multi-column', MultiColumn);
}