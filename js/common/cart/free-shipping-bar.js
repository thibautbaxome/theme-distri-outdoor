/**
 * Component that renders a free shipping bar. In this theme everything is rendered server side,
 * but you could optionally use this to do extra animations
 */

export class FreeShippingBar extends HTMLElement {
}

if (!window.customElements.get('free-shipping-bar')) {
  window.customElements.define('free-shipping-bar', FreeShippingBar);
}