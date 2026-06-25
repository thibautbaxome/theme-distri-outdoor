import {animateSequence} from "vendor";
import {DialogElement} from "./dialog-element";

export class Modal extends DialogElement {
  connectedCallback() {
    super.connectedCallback();

    this.setAttribute('aria-modal', 'true'); // Add extra accessibility
  }

  get shouldLock() {
    return true;
  }

  get shadowDomTemplate() {
    return document.getElementById('modal-default-template');
  }

  createEnterAnimationControls() {
    return animateSequence([
      [this.getShadowPartByName('overlay'), {opacity: [0, 1]}, {duration: 0.25}],
      [this.getShadowPartByName('content'), {opacity: [0, 1], transform: ['translateY(40px)', 'translateY(0)']}, {duration: 0.25, at: '-0.15'}],
    ]);
  }

  createLeaveAnimationControls() {
    return animateSequence([
      [this.getShadowPartByName('overlay'), {opacity: [1, 0]}, {duration: 0.15}],
      [this.getShadowPartByName('content'), {opacity: [1, 0], transform: ['translateY(0)', 'translateY(40px)']}, {duration: 0.15, at: '<'}],
    ]);
  }
}

if (!window.customElements.get('x-modal')) {
  window.customElements.define('x-modal', Modal);
}