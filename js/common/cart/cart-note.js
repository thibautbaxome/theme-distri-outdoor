/**
 * Custom element that can wrap any textarea. It will automatically save in Ajax the note
 */
export class CartNote extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('change', this.#onNoteChanged);
  }

  #onNoteChanged(event) {
    if (event.target.getAttribute('name') !== 'note') {
      return;
    }

    fetch(`${Shopify.routes.root}cart/update.js`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({note: event.target.value}),
      keepalive: true // Allows to make sure the request is fired even when submitting the form
    });
  }
}

if (!window.customElements.get('cart-note')) {
  window.customElements.define('cart-note', CartNote);
}