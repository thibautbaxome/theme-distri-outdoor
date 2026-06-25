import {animateSequence} from "vendor";
import {DialogElement} from "./dialog-element";

/**
 * Define drawer custom element. A drawer is meant to be used whenever you have an off-screen element. To use it,
 * you need to define slot for "header", "footer" and for the default slot. You can also set the "open-from" attribute which can
 * accept the value "right", "left", "top" or "bottom" to define the position from which the drawer is opened.
 *
 * By default, the theme uses the "drawer-default-template" ShadowDOM template (defined in the "shadow-dom-templates.liquid"
 * snippet). However, you can override the template used if you have very custom needs by setting the "template" attribute.
 *
 * Usage:
 *
 * <x-drawer open-from="left">
 *   <h2 slot="header">Title</h2>
 *   <div>BODY</div>
 *   <button slot="footer">Something</button>
 * </x-drawer>
 */
export class Drawer extends DialogElement {
  connectedCallback() {
    super.connectedCallback();

    this.setAttribute('aria-modal', 'true'); // Add extra accessibility
  }

  get shadowDomTemplate() {
    return document.getElementById(this.getAttribute('template') || 'drawer-default-template');
  }

  get shouldLock() {
    return true; // Drawer always lock the scroll
  }

  get shouldAppendToBody() {
    return true;
  }

  get openFrom() {
    return this.getAttribute('open-from') || 'right';
  }

  createEnterAnimationControls() {
    let contentTransform = this.openFrom === 'right'
      ? ['translateX(calc(var(--transform-logical-flip) * 100%)', 'translateX(0)']
      : ['translateX(calc(-1 * var(--transform-logical-flip) * 100%)', 'translateX(0)'];

    this.getShadowPartByName('content').style.marginInlineStart = this.openFrom === 'right' ? 'auto' : '0';

    return animateSequence([
      [this.getShadowPartByName('overlay'), {opacity: [0, 1]}, {duration: 0.25, ease: 'easeInOut'}],
      [this.getShadowPartByName('content'), {opacity: [0, 1], transform: contentTransform}, {duration: 0.45, at: '-0.15', ease: [0.86, 0, 0.07, 1]}],
    ]);
  }

  createLeaveAnimationControls() {
    let contentTransform = this.openFrom === 'right'
      ? ['translateX(0)', 'translateX(calc(var(--transform-logical-flip) * 100%)']
      : ['translateX(0)', 'translateX(calc(-1 * var(--transform-logical-flip) * 100%)'];

    return animateSequence([
      [this.getShadowPartByName('overlay'), {opacity: [1, 0]}, {duration: 0.45, ease: 'easeInOut'}],
      [this.getShadowPartByName('content'), {opacity: [1, 0], transform: contentTransform}, {duration: 0.45, at: '<', ease: [0.86, 0, 0.07, 1]}],
    ]);
  }
}

if (!window.customElements.get('x-drawer')) {
  window.customElements.define('x-drawer', Drawer);
}