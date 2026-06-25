import {animateSequence} from "vendor";
import {DialogElement} from "./dialog-element";

/**
 * Drawer popover is a simple element that opens inside a drawer, from bottom to top. It is used to show extra
 * information, without leaving the context of the drawer
 */
export class DrawerPopover extends DialogElement {
  get shadowDomTemplate() {
    return document.getElementById(this.getAttribute('template') || 'drawer-popover-default-template');
  }

  createEnterAnimationControls() {
    return animateSequence([
      [this.getShadowPartByName('overlay'), {opacity: [0, 1]}, {duration: 0.25, ease: 'easeInOut'}],
      [this.getShadowPartByName('content'), {opacity: [0, 1], transform: ['translateY(100%)', 'translateY(0)']}, {duration: 0.45, at: '-0.15', ease: [0.86, 0, 0.07, 1]}],
    ]);
  }

  createLeaveAnimationControls() {
    return animateSequence([
      [this.getShadowPartByName('overlay'), {opacity: [1, 0]}, {duration: 0.45, ease: 'easeInOut'}],
      [this.getShadowPartByName('content'), {opacity: [1, 0], transform: ['translateY(0)', 'translateY(100%)']}, {duration: 0.45, at: '<', ease: [0.86, 0, 0.07, 1]}],
    ]);
  }
}

if (!window.customElements.get('x-drawer-popover')) {
  window.customElements.define('x-drawer-popover', DrawerPopover);
}