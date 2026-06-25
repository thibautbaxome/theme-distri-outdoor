import { announceStatus } from '../utilities';

/**
 * Custom element that that handles quantity selector + and -
 */
export class QuantitySelector extends HTMLElement {
  #abortController;
  #decreaseButton;
  #increaseButton;
  #inputElement;

  connectedCallback() {
    this.#abortController = new AbortController();
    this.#decreaseButton = this.querySelector('button:first-of-type');
    this.#increaseButton = this.querySelector('button:last-of-type');
    this.#inputElement = this.querySelector('input');

    this.#decreaseButton?.addEventListener('click', this.#onDecreaseQuantity.bind(this), {signal: this.#abortController.signal});
    this.#increaseButton?.addEventListener('click', this.#onIncreaseQuantity.bind(this), {signal: this.#abortController.signal});
    this.#inputElement?.addEventListener('input', this.#updateUI.bind(this), {signal: this.#abortController.signal});
  }

  disconnectedCallback() {
    this.#abortController.abort();
  }

  get quantity() {
    return this.#inputElement.value;
  }

  set quantity(quantity) {
    this.#inputElement.value = quantity;
    this.#inputElement.dispatchEvent(new Event('change', { bubbles: true }));
    this.#updateUI();
  }

  restoreDefaultValue() {
    // We must make sure to NOT dispatch the change event when restored, as it would cause the whole UI to re-render and hide error messages
    this.#inputElement.value = this.#inputElement.defaultValue;
    this.#updateUI();
  }

  #onDecreaseQuantity() {
    // We are doing an exception on the decrease button, which is used in the quick order list, to allow a customer to go back to 0 even
    // if there is a minimum quantity
    if (this.hasAttribute('allow-reset-to-zero') && this.#inputElement.value === this.#inputElement.min) {
      this.#inputElement.value = 0;
    } else {
      this.#inputElement.stepDown();
    }

    announceStatus(this.#inputElement.value);

    this.#inputElement.dispatchEvent(new Event('change', { bubbles: true })); // stepDown does not emit "change" event so we must do it manually
    this.#updateUI();
  }

  #onIncreaseQuantity() {
    this.#inputElement.stepUp();

    announceStatus(this.#inputElement.value);
    
    this.#inputElement.dispatchEvent(new Event('change', { bubbles: true })); // stepUp does not emit "change" event so we must do it manually
    this.#updateUI();
  }

  #updateUI() {
    if (this.#decreaseButton) {
      this.#decreaseButton.disabled = parseInt(this.#inputElement.value) <= parseInt(this.#inputElement.min);
    }

    if (this.#increaseButton) {
      this.#increaseButton.disabled = this.#inputElement.hasAttribute('max') ? parseInt(this.#inputElement.value) >= parseInt(this.#inputElement.max) : false;
    }
  }
}

/**
 * Provide a custom input selector for number with validation rules.
 */
export class QuantityInput extends HTMLElement {
  constructor() {
    super();

    this.#inputElement.addEventListener('input', this.#onValueInput.bind(this));
    this.#inputElement.addEventListener('change', this.#onValueChange.bind(this));
    this.#inputElement.addEventListener('focus', () => this.#inputElement.select());
  }

  connectedCallback() {
    this.style.setProperty('--quantity-selector-character-count', `${this.#inputElement.value.length}ch`);
  }

  get #inputElement() {
    return this.firstElementChild;
  }

  get quantity() {
    return parseInt(this.#inputElement.value);
  }

  #onValueInput() {
    if (this.#inputElement.value === '') {
      this.#inputElement.value = this.#inputElement.min || 1;
    }

    this.style.setProperty('--quantity-selector-character-count', `${this.#inputElement.value.length}ch`);
  }

  #onValueChange() {
    if (!this.#inputElement.checkValidity()) {
      this.#inputElement.stepDown();
    }
  }
}

if (!window.customElements.get('quantity-selector')) {
  window.customElements.define('quantity-selector', QuantitySelector);
}

if (!window.customElements.get('quantity-input')) {
  window.customElements.define('quantity-input', QuantityInput);
}