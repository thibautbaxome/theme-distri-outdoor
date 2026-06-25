/**
 * ---------------------------------------------------------------------------------------------------------------
 * Buy buttons
 *
 * This component is mostly empty as now everything is reloaded from the server. This component is kept for future
 * if we need to do some specific stuff with the buy buttons.
 * ---------------------------------------------------------------------------------------------------------------
 */
export class BuyButtons extends HTMLElement {
  connectedCallback() {
  }
}

if (!window.customElements.get('buy-buttons')) {
  window.customElements.define('buy-buttons', BuyButtons);
}