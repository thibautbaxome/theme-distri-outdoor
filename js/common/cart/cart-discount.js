import {fetchCart} from "./fetch-cart";

class AbstractCartDiscount extends HTMLElement {
  async getDiscountCodes() {
    return (await fetchCart)['discount_codes'].filter(discount => discount.applicable).map(discount => discount.code.toLowerCase());
  }

  async toggleDiscount(event) {
    let target = event.currentTarget;

    target.setAttribute('aria-busy', 'true');

    let discountCodes = await this.getDiscountCodes();

    if (target.hasAttribute('discount-code')) {
      discountCodes = discountCodes.filter(discount => discount !== target.getAttribute('discount-code').toLowerCase());
    }

    let discount = ((discountCodes.length > 0) ? discountCodes.join(',') + ',' : '') + (event.target.value || '');

    const response = await fetch(`${Shopify.routes.root}cart/update.js`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      keepalive: true,
      body: JSON.stringify({discount})
    });

    target.setAttribute('aria-busy', 'false');

    if (!response.ok) {
      this.dispatchEvent(new CustomEvent('cart:discount:error', {bubbles: true}));
      return;
    }

    const responseJson = await response.json();

    if (responseJson.discount_codes.some(obj => obj.applicable === false)) {
      this.dispatchEvent(new CustomEvent('cart:discount:error', {bubbles: true}));
      return;
    } else {
      this.dispatchEvent(new CustomEvent('cart:refresh', {bubbles: true}));
    }

    if (window.themeVariables.settings.pageType === 'cart') {
      window.location.reload();
    }
  }
}

export class CartDiscountBanner extends HTMLElement {
  #abortController;

  connectedCallback() {
    this.#abortController = new AbortController();

    document.addEventListener('cart:discount:error', this.#onCartDiscountError.bind(this), {signal: this.#abortController.signal});
  }

  disconnectedCallback() {
    this.#abortController.abort();
  }

  #onCartDiscountError() {
    this.hidden = false;
  }
}

export class CartDiscountField extends AbstractCartDiscount {
  #hiddenDiscountInputOriginalValue;

  constructor() {
    super();

    this.#hiddenDiscountInputOriginalValue = this.#hiddenDiscountInput.value;

    this.addEventListener('change', this.toggleDiscount.bind(this));
    this.addEventListener('input', this.#updateHiddenInput);
  }

  get #hiddenDiscountInput() {
    return this.querySelector('[name="discount"]');
  }

  #updateHiddenInput(event) {
    // We have to update the internal hidden input to ensure that if the user submit the form without blurring the field
    // it still get submitted
    this.#hiddenDiscountInput.value = [this.#hiddenDiscountInputOriginalValue, event.target.value]
      .filter(val => val && val.trim() !== '')
      .join(',');
  }
}

export class CartDiscountRemoveButton extends AbstractCartDiscount {
  constructor() {
    super();
    this.addEventListener('click', this.toggleDiscount.bind(this));
  }
}

if (!window.customElements.get('cart-discount-field')) {
  window.customElements.define('cart-discount-field', CartDiscountField);
}

if (!window.customElements.get('cart-discount-remove-button')) {
  window.customElements.define('cart-discount-remove-button', CartDiscountRemoveButton);
}

if (!window.customElements.get('cart-discount-banner')) {
  window.customElements.define('cart-discount-banner', CartDiscountBanner);
}