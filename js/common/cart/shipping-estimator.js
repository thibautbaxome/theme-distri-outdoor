/**
 * Custom element that handle a shipping estimator form
 */
export class ShippingEstimator extends HTMLElement {
  #estimateShippingListener = this.#estimateShipping.bind(this);

  connectedCallback() {
    this.submitButton = this.querySelector('[type="button"]');
    this.resultsElement = this.querySelector('[aria-live="polite"]');

    this.submitButton.addEventListener('click', this.#estimateShippingListener);
  }

  disconnectedCallback() {
    this.submitButton.removeEventListener('click', this.#estimateShippingListener);
  }

  /**
   * @doc https://shopify.dev/docs/themes/ajax-api/reference/cart#generate-shipping-rates
   */
  async #estimateShipping(event) {
    event.preventDefault();

    const zip = this.querySelector('[name="address[zip]"]').value,
      country = this.querySelector('[name="address[country]"]').value,
      province = this.querySelector('[name="address[province]"]').value;

    this.submitButton.setAttribute('aria-busy', 'true');

    // First, we prepare the rates
    const prepareResponse = await fetch(`${Shopify.routes.root}cart/prepare_shipping_rates.json?shipping_address[zip]=${zip}&shipping_address[country]=${country}&shipping_address[province]=${province}`, {method: 'POST'});

    if (prepareResponse.ok) {
      const shippingRates = await this.#getAsyncShippingRates(zip, country, province);
      this.#formatShippingRates(shippingRates);
    } else {
      const jsonError = await prepareResponse.json();
      this.#formatError(jsonError);
    }

    this.resultsElement.hidden = false;
    this.submitButton.removeAttribute('aria-busy');
  }

  async #getAsyncShippingRates(zip, country, province) {
    const response = await fetch(`${Shopify.routes.root}cart/async_shipping_rates.json?shipping_address[zip]=${zip}&shipping_address[country]=${country}&shipping_address[province]=${province}`);
    const responseAsText = await response.text();

    if (responseAsText === 'null') {
      return this.#getAsyncShippingRates(zip, country, province); // poll until Shopify returns non-null values
    } else {
      return JSON.parse(responseAsText)['shipping_rates'];
    }
  }

  #formatShippingRates(shippingRates) {
    // We create our HTML for the rates
    let formattedShippingRates = shippingRates.map((shippingRate) => {
      let formattedPrice;
      try {
        formattedPrice = new Intl.NumberFormat(document.documentElement.lang || 'fr', { style: 'currency', currency: shippingRate['currency'] }).format(parseFloat(shippingRate['price']));
      } catch (e) {
        formattedPrice = `${shippingRate['price']} ${shippingRate['currency']}`;
      }
      return `<li>${shippingRate['presentment_name']} : ${formattedPrice}</li>`;
    });

    this.resultsElement.innerHTML = `
      <div class="v-stack gap-2">
        <p>${shippingRates.length === 0 ? window.themeVariables.strings.shippingEstimatorNoResults : (shippingRates.length === 1 ? window.themeVariables.strings.shippingEstimatorOneResult : window.themeVariables.strings.shippingEstimatorMultipleResults)}</p>
        ${formattedShippingRates === '' ? '' : `<ul class="list-disc" role="list">${formattedShippingRates.join('')}</ul>`}
      </div>
    `;
  }

  #formatError(errors) {
    // We create our HTML for the rates
    let formattedShippingRates = Object.keys(errors).map((errorKey) => {
      return `<li>${errors[errorKey]}</li>`;
    });

    this.resultsElement.innerHTML = `
      <div class="v-stack gap-1">
        <p>${window.themeVariables.strings.shippingEstimatorError}</p>
        <ul class="list-disc" role="list">${formattedShippingRates}</ul>
      </div>
    `;
  }
}

if (!window.customElements.get('shipping-estimator')) {
  window.customElements.define('shipping-estimator', ShippingEstimator);
}