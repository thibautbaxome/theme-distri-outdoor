import { deepQuerySelector } from "../utilities/dom";

/**
 * This component allows to dynamically update itself when something is re-rendered. To work properly, it needs a unique
 * ID that will be used to identify the content to replace. It will listen to an event "product:rerender". This event contain
 * the following details:
 *
 * {
 *   "htmlFragment": "", // A document fragment containing the new HTML
 *   "productChange": false // true if the re-render happens because of a combined product re-render, false otherwise
 * }
 *
 * By default, this component will match in the new HTML if there is an updated HTML with the given ID and, if so, it will
 * replace the whole content with the new one. When a component is emitting the "liquid:rerender" event, it can also
 * include as part of the details
 *
 * It supports the following options:
 *
 * - id: (REQUIRED) the ID of the element to replace
 * - allow-partial-rerender: (OPTIONAL) if set to true, the component will try to detect if it can partially update blocks instead of replacing the whole section,
                                        which allows to preserve things like collapsible, gallery position... Typically, full reload will happen when 
                                        changing combined product, while partial reload will happen when changing variant.
 */
export class ProductRerender extends HTMLElement {
  #abortController;

  connectedCallback() {
    this.#abortController = new AbortController();

    if (!this.id || !this.hasAttribute('observe-form')) {
      console.warn('The <product-rerender> requires an ID to identify the element to re-render, and an "observe-form" attribute referencing to the form to monitor.');
    }

    document.forms[this.getAttribute('observe-form')].addEventListener('product:rerender', this.#onRerender.bind(this), { signal: this.#abortController.signal });
  }

  disconnectedCallback() {
    this.#abortController.abort();
  }

  #onRerender(event) {
    const matchingElement = deepQuerySelector(event.detail.htmlFragment, `#${this.id}`);

    if (!matchingElement) {
      return;
    }

    // As we re-render the code, focus will be lost. We therefore first save the ID of the focused element
    const focusedElement = document.activeElement;

    if (!this.hasAttribute('allow-partial-rerender') || event.detail.productChange) {
      // If a given <product-rerender> does not allow partial re-render we replace the whole content
      this.replaceWith(matchingElement);
    } else {
      // When doing a partial re-render, we limit to a subset of blocks that have the attribute "data-block-allow-rerender"

      this.querySelectorAll(`[data-block-type][data-block-allow-rerender`).forEach(element => {
        // Try to get a block with the same ID
        const matchingBlock = matchingElement.querySelector(`[data-block-type][data-block-id="${element.getAttribute('data-block-id')}"]`);

        if (matchingBlock) {
          // We do an exception here for the buy buttons, where we should not replace the whole block (which contains the form), but
          // just the buttons themselves. This edge case is only for the buy buttons in the product page.
          const blockType = matchingBlock.getAttribute('data-block-type');

          if (blockType === 'buy-buttons') {
            const existingQuantity = element.querySelector('quantity-selector')?.quantity;
            const buyButtons = matchingBlock.querySelector('buy-buttons');

            element.querySelector('buy-buttons').replaceWith(buyButtons);

            const newQuantitySelector = buyButtons.querySelector('quantity-selector');

            if (newQuantitySelector) {
              newQuantitySelector.quantity = existingQuantity;
            }
          } else if (blockType === 'payment-terms') {
            element.querySelector('[name="id"]').value = matchingBlock.querySelector('[name="id"]').value;
            element.querySelector('[name="id"]').dispatchEvent(new Event('change', { bubbles: true}));
          } else {
            element.replaceWith(matchingBlock);
          }
        }
      });
    }

    // We then restore the focus to the previously focused element (if it exists)
    if (focusedElement.id) {
      const element = document.getElementById(focusedElement.id);

      if (this.contains(element)) {
        element.focus();
      }
    }
  }
}

if (!window.customElements.get('product-rerender')) {
  window.customElements.define('product-rerender', ProductRerender);
}