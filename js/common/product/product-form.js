import { announceStatus } from "../utilities";

/**
 * The ProductForm custom elements is a must wrap a product form, and it will power all the Ajax functionalities:
 *
 * <product-form>
 *   {% form 'product', product %}
 * </product-form>
 */
export class ProductForm extends HTMLElement {
  #abortController;

  connectedCallback() {
    this.#abortController = new AbortController();

    if (this.#form) {
      this.#form.addEventListener('submit', this.#onSubmit.bind(this), { signal: this.#abortController.signal });
      this.#form.id.disabled = false;
    }
  }

  disconnectedCallback() {
    this.#abortController.abort();
  }

  get #form() {
    return this.querySelector('form[action*="/cart/add"]');
  }

  async #onSubmit(event) {
    event.preventDefault(); // Prevent default submission

    if (event.submitter?.getAttribute('aria-busy') === 'true') {
      return; // Prevent double submittion
    }

    if (!this.#form.checkValidity()) {
      this.#form.reportValidity();
      return; // If the form is not valid we prevent the submission ; this can happen with line item properties
    }

    const showLoadingBar = event.submitter?.querySelector('button-content') === null;

    // The button is disabled while we send the event
    const submitButtons = Array.from(this.#form.elements).filter(button => button.type === 'submit');

    submitButtons.forEach((submitButton) => {
      // IMPLEMENTATION NOTE: we must be careful to NOT set the button to disabled, because setting the button
      //                      to disable remove the focus of the button, which prevent the focus to be restored
      submitButton.setAttribute('aria-busy', 'true');
    });

    // We emit an event "cart:prepare-bundled-sections", which allows components who wish to add their own sections to be re-rendered
    let sectionsToBundle = new Set();
    document.documentElement.dispatchEvent(new CustomEvent('cart:prepare-bundled-sections', {bubbles: true, detail: {sections: sectionsToBundle}}));

    const formData = new FormData(this.#form);
    formData.set('sections', [...sectionsToBundle].join(',')); // Set the bundled sections

    if (showLoadingBar) {
      document.documentElement.dispatchEvent(new CustomEvent('theme:loading:start', {bubbles: true}));
    }
    
    const response = await fetch(`${Shopify.routes.root}cart/add.js`, {
      body: formData,
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest' // Needed for Shopify to check inventory
      }
    });

    submitButtons.forEach((submitButton) => {
      submitButton.removeAttribute('aria-busy');
    });

    const responseJson = await response.json();

    if (showLoadingBar) {
      document.documentElement.dispatchEvent(new CustomEvent('theme:loading:end', {bubbles: true}));
    }

    if (response.ok) {
      // IMPLEMENTATION NOTE: even when the cart type is set to page, we still do the addition in JavaScript, because
      // if we directly submit the form, Shopify does not do any validation on the inventory stock. However, we
      // just redirect if successful to the cart page
      if (window.themeVariables.settings.cartType === 'page' || window.themeVariables.settings.pageType === 'cart') {
        return window.location.href = `${Shopify.routes.root}cart`;
      }

      // We also retrieve the whole cart content as JSON, so we can emit an event to let other system do additional stuff
      const cartContent = await (await fetch(`${Shopify.routes.root}cart.js`)).json();
      cartContent['sections'] = responseJson['sections'];

      const items = responseJson.hasOwnProperty('items') ? responseJson['items'] : [responseJson];

      // We trigger an event with the elements added to the cart, so that other code can do stuff
      this.#form.dispatchEvent(new CustomEvent('variant:add', {
        bubbles: true,
        detail: {
          items: items,
          cart: cartContent
        }
      }));

      document.documentElement.dispatchEvent(new CustomEvent('cart:change', {
        bubbles: true,
        detail: {
          baseEvent: 'variant:add',
          cart: cartContent
        }
      }));

      if (window.themeVariables.settings.cartType === 'message') {
        document.dispatchEvent(new CustomEvent('toast:show', {
          detail: {
            message: window.themeVariables.strings.addedToCart.replace('{{product_title}}', items?.[0]?.title),
          }
        }));
      } else if (window.themeVariables.settings.cartType === 'drawer') {
        let content = [];
        items.forEach(item => {
          content.push(window.themeVariables.strings.addedToCart.replace('{{product_title}}', item?.title || ''));
        });
        announceStatus(content.join(', '));
      }
    } else {
      // Trigger an error notification
      this.#form.dispatchEvent(new CustomEvent('cart:error', {
        bubbles: true,
        detail: {
          error: responseJson['message']
        }
      }));

      document.dispatchEvent(new CustomEvent('toast:show', {
        detail: {
          message: responseJson['message'],
          tone: 'error'
        }
      }));

      // On some stores, when an error is triggered, Shopify will still add some items. For instance, if a product has an
      // inventory of 2, but the customer try to add 3, Shopify will return an error but still add 2 items to the cart. This
      // behavior is completely inconsistent (and does not follow the documented behavior), but it seems some stores are on
      // a different backend version. This trick ensures that the cart is synced when this happens
      document.documentElement.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
    }
  }
}

if (!window.customElements.get('product-form')) {
  window.customElements.define('product-form', ProductForm);
}