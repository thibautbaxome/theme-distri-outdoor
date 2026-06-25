/**
 * Price range component is used on faceting (collection and search page) and allows to synchronize a multi-range selector
 * with input values.
 */
export class PriceRange extends HTMLElement {
  #abortController;
  
  connectedCallback() {
    this.#abortController = new AbortController();

    const rangeLowerBound = this.querySelector('input[type="range"]:first-child'),
      rangeHigherBound = this.querySelector('input[type="range"]:last-child'),
      textInputLowerBound = this.querySelector('input[name="filter.v.price.gte"]'),
      textInputHigherBound = this.querySelector('input[name="filter.v.price.lte"]');

    // Select whole text on focus for text field to improve user experience
    textInputLowerBound.addEventListener('focus', () => textInputLowerBound.select(), {signal: this.#abortController.signal});
    textInputHigherBound.addEventListener('focus', () => textInputHigherBound.select(), {signal: this.#abortController.signal});

    // Keep in sync the range with the text input fields
    textInputLowerBound.addEventListener('change', (event) => {
      event.preventDefault();
      event.target.value = Math.max(Math.min(parseInt(event.target.value), parseInt(textInputHigherBound.value || event.target.max) - 1), event.target.min);
      rangeLowerBound.value = event.target.value;
      rangeLowerBound.parentElement.style.setProperty('--range-min', `${parseInt(rangeLowerBound.value) / parseInt(rangeLowerBound.max) * 100}%`);
    }, {signal: this.#abortController.signal});

    textInputHigherBound.addEventListener('change', (event) => {
      event.preventDefault();
      event.target.value = Math.min(Math.max(parseInt(event.target.value), parseInt(textInputLowerBound.value || event.target.min) + 1), event.target.max);
      rangeHigherBound.value = event.target.value;
      rangeHigherBound.parentElement.style.setProperty('--range-max', `${parseInt(rangeHigherBound.value) / parseInt(rangeHigherBound.max) * 100}%`);
    }, {signal: this.#abortController.signal});

    rangeLowerBound.addEventListener('change', (event) => {
      event.stopPropagation(); // Prevent to make sure that only one (the input field) value is propagated to parent
      textInputLowerBound.value = event.target.value;
      textInputLowerBound.dispatchEvent(new Event('change', {bubbles: true}));
    }, {signal: this.#abortController.signal});

    rangeHigherBound.addEventListener('change', (event) => {
      event.stopPropagation(); // Prevent to make sure that only one (the input field) value is propagated to parent
      textInputHigherBound.value = event.target.value;
      textInputHigherBound.dispatchEvent(new Event('change', {bubbles: true}));
    }, {signal: this.#abortController.signal});

    // We also have to bound the two range sliders
    rangeLowerBound.addEventListener('input', (event) => {
      event.target.value = Math.min(parseInt(event.target.value), parseInt(textInputHigherBound.value || event.target.max) - 1); // Bound the value
      event.target.parentElement.style.setProperty('--range-min', `${parseInt(event.target.value) / parseInt(event.target.max) * 100}%`);
      textInputLowerBound.value = event.target.value;
    }, {signal: this.#abortController.signal});

    rangeHigherBound.addEventListener('input', (event) => {
      event.target.value = Math.max(parseInt(event.target.value), parseInt(textInputLowerBound.value || event.target.min) + 1); // Bound the value
      event.target.parentElement.style.setProperty('--range-max', `${parseInt(event.target.value) / parseInt(event.target.max) * 100}%`);
      textInputHigherBound.value = event.target.value;
    }, {signal: this.#abortController.signal});
  }

  disconnectedCallback() {
    this.#abortController.abort();
  }
}

if (!window.customElements.get('price-range')) {
  window.customElements.define('price-range', PriceRange);
}