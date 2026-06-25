import {extractSectionId} from "../common/utilities";

export class RecentlyViewedProducts extends HTMLElement {
  #isLoaded = false;

  connectedCallback() {
    this.#loadProducts();
  }

  get #searchQueryString() {
    const items = new Set(JSON.parse(localStorage.getItem('theme:recently-viewed-products') || '[]'));

    if (this.hasAttribute('exclude-id')) {
      items.delete(parseInt(this.getAttribute('exclude-id')));
    }

    return Array.from(items.values(), item => `id:${item}`).slice(0, parseInt(this.getAttribute('products-count'))).join(' OR ');
  }

  async #loadProducts() {
    if (this.#isLoaded) {
      return;
    }

    this.#isLoaded = true;

    const section = this.closest('.shopify-section'),
      url = `${Shopify.routes.root}search?type=product&q=${this.#searchQueryString}&section_id=${extractSectionId(section)}`,
      response = await fetch(url, {priority: 'low'});

    const tempDiv = (new DOMParser()).parseFromString(await response.text(), 'text/html'),
      recentlyViewedProductsElement = tempDiv.querySelector('recently-viewed-products');

    if (recentlyViewedProductsElement.childElementCount > 0) {
      this.replaceChildren(...document.importNode(recentlyViewedProductsElement, true).childNodes);
    } else {
      section.remove();
    }
  }
}

if (!window.customElements.get('recently-viewed-products')) {
  window.customElements.define('recently-viewed-products', RecentlyViewedProducts);
}