import {Drawer} from "../overlay";

/**
 * A facet drawer is a specialized kind of drawer used on collection and search page to filters. Its only difference
 * is that, when closed, the form will be submitted to update the results
 */
export class FacetsDrawer extends Drawer {
  constructor() {
    super();

    this.addEventListener('submit', this.hide);
    this.addEventListener('reset', this.hide);
    this.addEventListener('facet:update', this.hide);
  }
}

if (!window.customElements.get('facets-drawer')) {
  window.customElements.define('facets-drawer', FacetsDrawer);
}