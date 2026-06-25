import { SandwichVisibility } from '../behavior';

export class CollectionFacetsFloatingButton extends SandwichVisibility {
  get startMarker() {
    return document.querySelector('.collection__toolbar');
  }

  get endMarker() {
    return document.querySelector('.shopify-section--footer');
  }
}

if (!window.customElements.get('collection-facets-floating-button')) {
  window.customElements.define('collection-facets-floating-button', CollectionFacetsFloatingButton);
}