export class LayoutSelectorButton extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('change', this.#onChange);
  }

  #onChange(event) {
    let attributes = {};

    if (event.target.name === 'desktop-layout') {
      attributes['product_card_desktop_layout'] = event.target.value;
    } else if (event.target.name === 'mobile-items-per-row') {
      attributes['product_card_mobile_items_per_row'] = parseInt(event.target.value);
    }

    fetch(`${Shopify.routes.root}cart/update.js`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        attributes
      })
    });

    const productList = this.closest('.collection').querySelector('.product-list');

    if (event.target.name === 'mobile-items-per-row') {
      productList.setAttribute('mobile-items-per-row', event.target.value);
    } else if (event.target.name === 'desktop-layout') {
      productList.setAttribute('desktop-layout', event.target.value);
    }

    if (window.themeVariables.settings.staggerProducts) {
      this.closest('.collection').querySelector('product-list').reveal();
    }
  }
}

if (!window.customElements.get('collection-layout-selector-button')) {
  window.customElements.define('collection-layout-selector-button', LayoutSelectorButton);
}