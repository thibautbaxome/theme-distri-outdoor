import {Delegate} from "vendor";

/**
 * Custom element for managing a line item
 */
export class LineItem extends HTMLElement {
  #delegate = new Delegate(this);

  constructor() {
    super();

    this.#delegate.on('change', '[data-line-key]', this.#onQuantityChanged.bind(this));
    this.#delegate.on('click', `[href*="${Shopify.routes.root}cart/change"]`, this.#onChangeLinkClicked.bind(this));
  }

  #onQuantityChanged(event, target) {
    this.#changeLineItemQuantity(target.getAttribute('data-line-key'), parseInt(target.value));
  }

  #onChangeLinkClicked(event, target) {
    event.preventDefault();

    const url = new URL(target.href);
    this.#changeLineItemQuantity(url.searchParams.get('id'), parseInt(url.searchParams.get('quantity')));
  }

  async #changeLineItemQuantity(lineKey, targetQuantity) {
    document.documentElement.dispatchEvent(new CustomEvent('theme:loading:start', {bubbles: true}));

    // Otherwise, we change the quantity in JS and emit various events for other systems to hook up.
    const lineItem = this.closest('line-item');

    // First, we emit a "line-item:will-change"
    lineItem?.dispatchEvent(new CustomEvent('line-item:will-change', {bubbles: true, detail: {targetQuantity: targetQuantity}}));

    // We emit an event "cart:prepare-bundled-sections", which allows components who wish to add their own sections to be re-rendered
    let sectionsToBundle = new Set();
    document.documentElement.dispatchEvent(new CustomEvent('cart:prepare-bundled-sections', {bubbles: true, detail: {sections: sectionsToBundle}}));

    // Then update the cart
    const response = await fetch(`${Shopify.routes.root}cart/change.js`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: lineKey,
        quantity: targetQuantity,
        sections: [...sectionsToBundle].join(',')
      })
    });

    document.documentElement.dispatchEvent(new CustomEvent('theme:loading:end', {bubbles: true}));

    if (!response.ok) {
      const responseContent = await response.json();

      const errorContainer = this.querySelector('.line-item__error-container');
      errorContainer.innerHTML = ''; // Ensure errors are not duplicated

      const errorSvg = `<svg width="13" viewBox="0 0 13 13"><circle cx="6.5" cy="6.5" r="5.5" stroke="#fff" stroke-width="2"></circle><circle cx="6.5" cy="6.5" r="5.5" fill="#EB001B" stroke="#EB001B" stroke-width=".7"></circle><path fill="#fff" d="m5.874 3.528.1 4.044h1.053l.1-4.044zm.627 6.133c.38 0 .68-.288.68-.656s-.3-.656-.68-.656-.681.288-.681.656.3.656.68.656"></path><path fill="#fff" stroke="#EB001B" stroke-width=".7" d="M5.874 3.178h-.359l.01.359.1 4.044.008.341h1.736l.008-.341.1-4.044.01-.359H5.873Zm.627 6.833c.56 0 1.03-.432 1.03-1.006s-.47-1.006-1.03-1.006-1.031.432-1.031 1.006.47 1.006 1.03 1.006Z"></path></svg>`;
      errorContainer.insertAdjacentHTML('afterbegin', `<p class="h-stack gap-1.5 text-sm text-error" role="alert">${errorSvg} ${responseContent['description']}</p>`);

      // We restore the default value of the input
      this.querySelector('quantity-selector')?.restoreDefaultValue();
    } else {
      const cartContent = await response.json();

      if (window.themeVariables.settings.pageType === 'cart') {
        // On the cart page, we reload the whole page to ensure all apps are reloaded, as many apps rely on initial loading to work properly
        window.location.reload();
      } else {
        // And finally, emit changed events
        const lineItemAfterChange = cartContent['items'].filter(lineItem => lineItem['key'] === lineKey);
  
        lineItem?.dispatchEvent(new CustomEvent('line-item:change', {
          bubbles: true,
          detail: {
            quantity: lineItemAfterChange.length === 0 ? 0 : lineItemAfterChange[0]['quantity'],
            cart: cartContent
          }
        }));
  
        document.documentElement.dispatchEvent(new CustomEvent('cart:change', {
          bubbles: true,
          detail: {
            baseEvent: 'line-item:change',
            cart: cartContent
          }
        }));
      }
    }
  }
}

if (!window.customElements.get('line-item')) {
  window.customElements.define('line-item', LineItem);
}