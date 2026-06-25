import {fetchCart} from './fetch-cart';

export class CartCount extends HTMLElement {
  #abortController;

  connectedCallback() {
    this.#abortController = new AbortController();

    document.addEventListener('cart:change', (event) => this.itemCount = event.detail['cart']['item_count'], {signal: this.#abortController.signal});
    document.addEventListener('cart:refresh', this.#updateFromServer.bind(this), {signal: this.#abortController.signal});
    window.addEventListener('pageshow', this.#updateFromServer.bind(this), {signal: this.#abortController.signal});
  }

  disconnectedCallback() {
    this.#abortController.abort();
  }

  async #updateFromServer() {
    this.itemCount = (await fetchCart)['item_count'];
  }

  set itemCount(count) {
    this.hidden = (count === 0);
    this.querySelector('span').innerText = count;
  }
}

if (!window.customElements.get('cart-count')) {
  window.customElements.define('cart-count', CartCount);
}