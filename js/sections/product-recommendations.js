import {extractSectionId} from "../common/utilities";

export class ProductRecommendations extends HTMLElement {
  #isLoaded = false;

  connectedCallback() {
    this.#loadRecommendations();
  }

  async #loadRecommendations() {
    if (this.#isLoaded) {
      return;
    }

    this.#isLoaded = true;

    const intent = this.getAttribute('intent') || 'related',
      url = `${Shopify.routes.root}recommendations/products?product_id=${this.getAttribute('product')}&limit=${this.getAttribute('limit') || 4}&section_id=${extractSectionId(this)}&intent=${intent}`,
      response = await fetch(url, {priority: intent === 'related' ? 'low' : 'auto'});

    const tempDiv = (new DOMParser()).parseFromString(await response.text(), 'text/html'),
      productRecommendationsElement = tempDiv.querySelector('product-recommendations');

    if (productRecommendationsElement.childElementCount > 0) {
      this.replaceChildren(...document.importNode(productRecommendationsElement, true).childNodes);
      this.hidden = false;
    } else {
      this.remove();
    }
  }
}

if (!window.customElements.get('product-recommendations')) {
  window.customElements.define('product-recommendations', ProductRecommendations);
}