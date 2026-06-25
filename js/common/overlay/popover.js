import { animate, animateSequence, Delegate } from "vendor";
import { DialogElement } from "./dialog-element";
import { matchesMediaQuery } from "../utilities";

/**
 * Represents the actual popover content that wraps the Dialog element, and can be used to perform custom transition. It
 * also supports the following options:
 *
 * - close-on-listbox-change: closes when an option has been change in a listbox sub-component
 * - anchor-vertical: can accept "start", "center" or "end"
 * - anchor-horizontal: can accept "start", "center" or "end"
 *
 * In order to use it, you must create one or multiple controls, and set a unique ID to the popover:
 *
 * <button aria-controls="POPOVER-ID">Open</button>
 * <x-popover id="POPOVER-ID">Popover content</x-popover>
 */
export class Popover extends DialogElement {
  #delegate = new Delegate(this);

  connectedCallback() {
    super.connectedCallback();

    this.controls.forEach(control => control.setAttribute('aria-haspopup', 'dialog')); // Ensure popover is conveyed

    if (this.hasAttribute('close-on-listbox-change')) {
      this.addEventListener('change', this.hide, {signal: this.abortController.signal});
      
      this.#delegate.off();
      this.#delegate.on('click', 'a', this.hide.bind(this));
      this.#delegate.on('click', 'input:checked', this.hide.bind(this));
    }
  }

  get shadowDomTemplate() {
    return document.getElementById(this.getAttribute('template') || 'popover-default-template');
  }

  get shouldLock() {
    return matchesMediaQuery('md-max'); // Popover only lock on mobile and tablet
  }

  get shouldAppendToBody() {
    return matchesMediaQuery('md-max'); // Popover is only moved on mobile, on desktop it opens contextually
  }

  get preventScrollWhenTrapped() {
    return true;
  }

  createEnterAnimationControls() {
    this.getShadowPartByName('content').style.cssText = ''; // Revert all styles

    if (matchesMediaQuery('md-max')) {
      return animateSequence([
        [this.getShadowPartByName('overlay'), { opacity: [0, 1] }, { duration: 0.3, ease: [0.645, 0.045, 0.355, 1] }],
        [this.getShadowPartByName('content'), { transform: ['translateY(100%)', 'translateY(0)'] }, {duration: 0.3, at: '<', ease: [0.645, 0.045, 0.355, 1]}]
      ]);
    } else {
      return animate(this.getShadowPartByName('content'), { opacity: [0, 1] }, { duration: 0.3, ease: 'easeInOut' });
    }
  }

  createLeaveAnimationControls() {
    if (matchesMediaQuery('md-max')) {
      return animateSequence([
        [this.getShadowPartByName('overlay'), { opacity: [1, 0] }, { duration: 0.3, ease: [0.645, 0.045, 0.355, 1] }],
        [this.getShadowPartByName('content'), { transform: ['translateY(0%)', 'translateY(100%)'] }, {duration: 0.3, at: '<', ease: [0.645, 0.045, 0.355, 1]}]
      ]);
    } else {
      return animate(this.getShadowPartByName('content'), { opacity: [1, 0] }, { duration: 0.3, ease: 'easeInOut' });
    }
  }
}

if (!window.customElements.get('x-popover')) {
  window.customElements.define('x-popover', Popover);
}