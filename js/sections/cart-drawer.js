import {Drawer} from "../common/overlay";
import {extractSectionId} from "../common/utilities";
import {fetchCart} from "../common/cart";

export class CartDrawer extends Drawer {
  #sectionId; // We have to save the section ID, as the drawer may be replaced in the DOM

  connectedCallback() {
    super.connectedCallback();

    this.#sectionId ??= extractSectionId(this);

    document.addEventListener('cart:prepare-bundled-sections', this.#onBundleSection.bind(this), {signal: this.abortController.signal});
    document.addEventListener('cart:change', this.#onCartChange.bind(this), {signal: this.abortController.signal});
    document.addEventListener('cart:refresh', this.#refreshCart.bind(this), {signal: this.abortController.signal});
    window.addEventListener('pageshow', this.#onPageShow.bind(this), {signal: this.abortController.signal});
  }

  get initialFocus() {
    return false; // The first focusable element is typically the quantity selector so we don't want to make it the first focusable element
  }

  /**
   * This method is called when the cart is changing, and allow custom sections to order a "re-render"
   */
  #onBundleSection(event) {
    event.detail.sections.add(this.#sectionId);
  }

  /**
   * When the cart changes, we need to re-render the cart drawer
   */
  #onCartChange(event) {
    const html = (new DOMParser()).parseFromString(event.detail.cart['sections'][this.#sectionId], 'text/html'),
      itemCount = event.detail.cart['item_count'],
      newCartDrawer = document.createRange().createContextualFragment(html.getElementById(`shopify-section-${this.#sectionId}`).querySelector('cart-drawer').innerHTML);

    if (itemCount === 0) {
      // Do eventual animation when the item count is 0
      this.replaceChildren(...newCartDrawer.children);
    } else {
      this.replaceChildren(...newCartDrawer.children);
    }

    this.#replaceContent(event.detail.cart['sections'][this.#sectionId]);

    if (window.themeVariables.settings.cartType === 'drawer' && !this.open && event.detail.baseEvent === 'variant:add') {
      this.show(); // When the product is added because of a new variant added, we show the dialog
    }
  }

  /**
   * Modern browsers have a feature called "Back-forward cache" which allows to serve directly from the cache the previous
   * page. Unfortunately, this is causing issues with cart drawer, as it may display stale data. We therefore have to
   * detect the case when a page has been restored from backforward cache, and re-render the section
   */
  async #onPageShow(event) {
    if (!event.persisted) {
      return; // Not save from BF-cache, so nothing to do
    }

    // Here, we don't have any HTML, so we have to re-render it
    this.#refreshCart();
  }

  /**
   * Allow to refresh the cart when the "cart:refresh" event is triggered
   */
  async #refreshCart() {
    this.#replaceContent(await (await fetch(`${Shopify.routes.root}?section_id=${this.#sectionId}`)).text());
  }

  /**
   * The new HTML element to replace
   */
  async #replaceContent(html) {
    const domElement = (new DOMParser()).parseFromString(html, 'text/html'),
      newCartDrawer = document.createRange().createContextualFragment(domElement.getElementById(`shopify-section-${this.#sectionId}`).querySelector('cart-drawer').innerHTML),
      itemCount = (await fetchCart)['item_count'];

    if (itemCount === 0) {
      // Do eventual animation when the item count is 0
      this.replaceChildren(...newCartDrawer.children);
    } else {
      this.replaceChildren(...newCartDrawer.children);
    }

    this.dispatchEvent(new CustomEvent('cart-drawer:refreshed', { bubbles: true }));
  }
}

if (!window.customElements.get('cart-drawer')) {
  window.customElements.define('cart-drawer', CartDrawer);
}
