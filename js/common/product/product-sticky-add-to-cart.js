import { SandwichVisibility } from "../behavior";

export class ProductStickyAddToCart extends SandwichVisibility {
  get startMarker() {
    return document.getElementById(this.getAttribute('main-product-form'));
  }

  get endMarker() {
    return document.querySelector('.shopify-section--footer');
  }
}

if (!window.customElements.get('product-sticky-add-to-cart')) {
  window.customElements.define('product-sticky-add-to-cart', ProductStickyAddToCart);
}