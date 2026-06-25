import {animate, FocusTrap, Delegate} from "vendor";
import {matchesMediaQuery} from "../utilities";

/**
 * Custom dialog element. This element does not extend the native DialogElement, which is not yet well-supported on
 * Safari browser. This class can be used to represent a dialog box such as a drawer, dismissible alert, subwindow...
 *
 * When interacting with it, you should avoid using directly the open attribute, but instead you should use the
 * "show"/"hide" methods. Those returns a promise that resolve once the element has been closed or open
 *
 * Each dialog triggers the following events. None of those events bubble, so you need to attach directly to the
 * correct element.
 *
 * - dialog:before-show     => triggers once a dialog is going to open (it also receives the activator element in the details)
 * - dialog:after-show      => triggers once a dialog has finished showing (it also receives the activator element in the details)
 * - dialog:before-hide     => triggers once a dialog is going to hide
 * - dialog:after-hide      => triggers once a dialog has finished hiding
 *
 * In order to provide custom animation, you need to define two methods that will return a Motion animation controls:
 *
 * - createEnterAnimationControls => return a Motion controls for the entering animation
 * - createLeaveAnimationControls => return a Motion controls for the leaving animation
 */

let lockLayerCount = 0;

export class DialogElement extends HTMLElement {
  static get observedAttributes() {
    return ['open'];
  };

  #isLocked = false;
  #delegate = new Delegate(document.body);
  #focusLeaveDelegate = new Delegate(document.body);
  #abortController;
  #focusTrap;
  #isTransitioningToState;
  #originalParentBeforeAppend;
  #pendingAnimationControls;

  constructor() {
    super();

    this.setAttribute('role', 'dialog'); // Improve accessibility by setting proper ARIA role

    // If we have a shadow DOM, we create it now
    if (this.shadowDomTemplate) {
      this.attachShadow({mode: 'open'}).appendChild(this.shadowDomTemplate.content.cloneNode(true));
      this.shadowRoot.addEventListener('slotchange', (event) => this.#updateSlotVisibility(event.target));
    }

    // This allows the dialog to be closed through event (used for close button for instance). We make sure to stop
    // propagation so that if dialog are nested they only close the closest one
    this.addEventListener('dialog:force-close', (event) => {
      this.hide();
      event.stopPropagation();
    });
  }

  connectedCallback() {
    if (this.id) {
      // We have two strategies to open a dialog: either by click (the standard) or by hovering. To enable open on hover, you need
      // to add the special "data-open-on-hover" attribute to the activator element. This can only be done on device with precise pointer,
      // so we scope the condition
      this.#delegate.off();
      this.#delegate.on('click', `[aria-controls="${this.id}"]`, this.#onActivatorClicked.bind(this));

      if (window.matchMedia('screen and (pointer: fine)').matches) {
        this.#delegate.on('pointerenter', `[aria-controls="${this.id}"][data-open-on-hover]`, this.#onActivatorPointerEnter.bind(this), true);
      }
    }

    this.#abortController = new AbortController(); // Once a signal is aborted we have to create a new one, so it is in the connectedCallback

    // If the dialog element has a shadow DOM, we add a click listener on the overlay to close the dialog
    if (this.shadowDomTemplate) {
      this.getShadowPartByName('overlay')?.addEventListener('click', this.hide.bind(this), {signal: this.abortController.signal});
      Array.from(this.shadowRoot.querySelectorAll('slot')).forEach(slot => this.#updateSlotVisibility(slot));
    }

    if (Shopify.designMode) {
      /*this.addEventListener('shopify:block:select', (event) => this.show({ animate: !event.detail.load }), {signal: this.abortController.signal});
      this.addEventListener('shopify:block:deselect', this.hide, {signal: this.abortController.signal});*/

      this._shopifySection = this._shopifySection || this.closest('.shopify-section');

      // The element may not be inside a section, so we wrap the code (for instance if included statically in "theme.liquid" layout
      if (this._shopifySection) {
        // We handle section select/deselect events only if the dialog has the "handle-editor-events" attribute
        if (this.hasAttribute('handle-editor-events')) {
          this._shopifySection.addEventListener('shopify:section:select', (event) => this.show({ animate: !event.detail.load }), {signal: this.abortController.signal});
          this._shopifySection.addEventListener('shopify:section:deselect', this.hide.bind(this), {signal: this.abortController.signal});
        }

        // Remove the element when the section is unloaded
        this._shopifySection.addEventListener('shopify:section:unload', () => this.remove(), {signal: this.abortController.signal});
      }
    }
  }

  disconnectedCallback() {
    this.#delegate.off();
    this.abortController.abort();
    this.focusTrap?.deactivate({onDeactivate: () => {}});

    if (this.#isLocked) {
      this.#isLocked = false;
      document.documentElement.classList.toggle('lock', --lockLayerCount > 0);
    }
  }

  /**
   * Open the dialog element (the animation can be disabled by passing false as an argument). It optionally accepts two parameters:
   *
   * animate: if set to false, the dialog will open immediately without any animation
   * activator: the activator that has been used to show the dialog (if any)
   */
  async show({ animate = true, activator, conditionToFulfill } = {}) {
    if (this.#isTransitioningToState === 'open' && this.open) {
      return Promise.resolve(); // Nothing if already open
    }

    this.#isTransitioningToState = 'open';
    this.#pendingAnimationControls?.cancel();
    
    this.controls.forEach(activator => activator.setAttribute('aria-expanded', 'true'));
    this.setAttribute('open', '');

    if (conditionToFulfill) {
      await conditionToFulfill;
    }

    this.#originalParentBeforeAppend = null;

    this.style.removeProperty('display'); // This allows to remove the previously forced display, and get the computed one from CSS
    this.style.setProperty('display', this.shadowRoot ? 'contents' : getComputedStyle(this).display);
    this.dispatchEvent(new CustomEvent('dialog:before-show', { detail: { activator } }));

    if (this.shouldAppendToBody && this.parentElement !== document.body) {
      this.#originalParentBeforeAppend = this.parentElement;
      document.body.append(this);
    }

    const animationControls = this.createEnterAnimationControls();

    this.#pendingAnimationControls = animationControls;

    if (!animate) {
      animationControls.complete();
    }

    animationControls.then(() => {
      this.#pendingAnimationControls = null;
      this.dispatchEvent(new CustomEvent('dialog:after-show', { detail: { activator }}));
      this.#isTransitioningToState = null;
    });

    if (this.shouldTrapFocus) {
      this.focusTrap.activate({
        checkCanFocusTrap: () => animationControls
      });
    }

    if (this.shouldLock) {
      lockLayerCount += 1;
      this.#isLocked = true;
      document.documentElement.classList.add('lock');
    }

    return animationControls;
  }

  /**
   * Hide the dialog element
   */
  hide() {
    if (this.#isTransitioningToState === 'close' && !this.open) {
      return Promise.resolve(); // Nothing if already closed
    }

    this.#isTransitioningToState = 'close';
    this.#pendingAnimationControls?.cancel();

    this.controls.forEach(activator => activator.setAttribute('aria-expanded', 'false'));
    this.removeAttribute('open');
    this.dispatchEvent(new CustomEvent('dialog:before-hide'));

    const hideTransitionPromise = this.createLeaveAnimationControls();

    this.#pendingAnimationControls = hideTransitionPromise;

    hideTransitionPromise.then(() => {
      this.#pendingAnimationControls = null;

      // Restore the node original position if it has been moved, once the close animation is over
      if (this.parentElement === document.body && this.#originalParentBeforeAppend) {
        // When using the section rendering API, if the drawer is moved in the body and then re-inserted,
        // it is possible that the section rendering API have re-rendered the node, which would cause a
        // duplicate element. This allows to ensure we do not have a duplicate. In the future, a better
        // approach will be to use the <dialog> native element so that we don't have to move nodes around
        if (document.getElementById(this.id) !== this) {
          return this.remove();
        }

        this.#originalParentBeforeAppend.appendChild(this);
        this.#originalParentBeforeAppend = null;
      }

      this.style.setProperty('display', 'none');
      this.dispatchEvent(new CustomEvent('dialog:after-hide'));

      this.#isTransitioningToState = null;
    });

    this.focusTrap?.deactivate({
      checkCanReturnFocus: () => hideTransitionPromise
    });

    // Remove the lock only if we have removed al the layers
    if (this.shouldLock) {
      this.#isLocked = false;
      document.documentElement.classList.toggle('lock', --lockLayerCount > 0);
    }

    return hideTransitionPromise;
  }

  /**
   * Get the abort controller used to clean listeners. You can retrieve it in children classes to add your own listeners
   * that will be cleaned when the element is removed or re-rendered
   */
  get abortController() {
    return this.#abortController;
  }

  /**
   * Get all the elements controlling this dialog (typically, button). An element controls this dialog if it has an
   * aria-controls attribute matching the ID of this dialog element
   */
  get controls() {
    return Array.from(this.getRootNode().querySelectorAll(`[aria-controls="${this.id}"]`)); // getRootNode ensure it works in DocumentFragment as well
  }

  /**
   * Returns if the dialog is open or closed
   */
  get open() {
    return this.hasAttribute('open');
  }

  /**
   * If true is returned, then FocusTrap will activate and manage all the focus management. This is required for good
   * accessibility (such as keyboard management) and should normally not be set to false in children classes unless
   * there is a very good reason to do so
   */
  get shouldTrapFocus() {
    return true;
  }

  /**
   * When the dialog focus is trapped, define if the page is lock (not scrollable). This is usually desirable on
   * full screen modals
   */
  get shouldLock() {
    return false;
  }

  /**
   * By default, when the focus is trapped on an element, a click outside the trapped element close it. Sometimes, it
   * may be desirable to turn off all interactions so that all clicks outside don't do anything
   */
  get clickOutsideDeactivates() {
    return true;
  }

  /**
   * Sometimes (especially for drawer) we need to ensure that an element is on top of everything else. To do that,
   * we need to move the element to the body. We are doing that on open, and then restore the initial position on
   * close
   */
  get shouldAppendToBody() {
    return this.hasAttribute('append-to-body') ? true : false;
  }

  /**
   * Decide which element to focus first when the dialog focus is trapped. By default, the first focusable element
   * will be focused, but this can be overridden by passing a selector in the "initial-focus" attribute
   */
  get initialFocus() {
    return this.hasAttribute('initial-focus')
      ? this.getAttribute('initial-focus') === 'false' ? false : this.querySelector(this.getAttribute('initial-focus'))
      : this.hasAttribute('tabindex') ? this : (this.querySelector('input:not([type="hidden"])') || false);
  }

  /**
   * If set to true, then focus trap will not automatically scroll to the first focused element, which can cause
   * annoying experience.
   */
  get preventScrollWhenTrapped() {
    return true;
  }

  /**
   * Allow custom elements to define their own, custom trap stack. If none is defined, the default one will be used
   */
  get trapStack() {
    return null;
  }

  /**
   * If set to true, dialog can be close by clicking "escape"
   */
  get escapeDeactivates() {
    return true;
  }

  /**
   * Get the focus trap element configured with all the other attributes
   */
  get focusTrap() {
    return this.#focusTrap = this.#focusTrap || new FocusTrap.createFocusTrap(this, {
      onDeactivate: this.hide.bind(this),
      allowOutsideClick: this.clickOutsideDeactivates ? this.#allowOutsideClick.bind(this) : false,
      initialFocus: matchesMediaQuery('supports-hover') ? this.initialFocus : false,
      fallbackFocus: this,
      preventScroll: this.preventScrollWhenTrapped,
      escapeDeactivates: this.escapeDeactivates,
      tabbableOptions: {
        getShadowRoot: true,
      },
      trapStack: this.trapStack
    });
  }

  /**
   * Get the ShadowDOM template (if any). If there is one defined, the dialog automatically constructs it with the
   * shadow DOM. It will first attempt to check the "template" attribute and, if none is found, will fallback with
   * the first template children tag
   */
  get shadowDomTemplate() {
    if (this.hasAttribute('template')) {
      return document.getElementById(this.getAttribute('template'));
    }

    return this.querySelector(':scope > template');
  }

  /**
   * For dialog that use Shadow DOM, this allows a quick retrieval of parts by name
   */
  getShadowPartByName(name) {
    return this.shadowRoot?.querySelector(`[part="${name}"]`);
  }

  /**
   * Callback called when attributes changes. To show/hide the dialog, you should use exclusively the "show" and "hide"
   * methods. However, the theme might insert dialog that we want to be pre-opened (for instance if it has an error). To
   * do that, we monitor the "open" attribute and open the dialog if it is set
   */
  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case 'open':
        if (oldValue === null && newValue === '') {
          this.show();
        } else if (oldValue !== null && newValue === null) {
          this.hide();
        }

        break;
    }
  }

  /**
   * Create the animation controls for the enter animation
   */
  createEnterAnimationControls() {
    return animate(this, {}, {duration: 0}); // By default, no animation is performed
  }

  /**
   * Create the animation controls for the leave animation
   */
  createLeaveAnimationControls() {
    return animate(this, {}, {duration: 0}); // By default, no animation is performed
  }

  /**
   * When "clickOutsideDeactivates" is true, this method is called on the final click destination. If this method
   * returns true, then the dialog closes (if false, the dialog remains in its current state). By default, this
   * will close the dialog if a click is done outside the dialog. However, this may be overridden in children classes
   * to provide custom behavior (for instance, to only allow some elements to close the dialog)
   */
  hideForOutsideClickTarget(target) {
    if (this.controls.includes(target) && target.hasAttribute('data-open-on-hover')) {
      return false;
    }
    
    return !this.contains(target);
  }

  /**
   * When "clickOutsideDeactivates" is set to true, this method allows to control which element, when clicked, allows
   * to pass-through and have its behavior being executed
   */
  allowOutsideClickForTarget(target) {
    if (this.controls.includes(target) && target.hasAttribute('data-open-on-hover')) {
      return true;
    }

    return false;
  }

  /**
   * If "clickOutsideDeactivates" is true, then this listener will be called on every click outside the element. This
   * allows function separates touch and non-touch events
   */
  #allowOutsideClick(event) {
    if ('TouchEvent' in window && event instanceof TouchEvent) {
      return this.#allowOutsideClickTouch(event);
    } else {
      return this.#allowOutsideClickMouse(event);
    }
  }

  /**
   * If "clickOutsideDeactivates" is true, this listener will be called on every touch click outside the trapped
   * element. By default, this will allow any click outside to cause the dialog to close
   */
  #allowOutsideClickTouch(event) {
    /* On touch device, we only remove the trap focus even the end touch position is not inside the container */
    event.target.addEventListener('touchend', (subEvent) => {
      const endTarget = document.elementFromPoint(subEvent.changedTouches.item(0).clientX, subEvent.changedTouches.item(0).clientY);

      if (this.hideForOutsideClickTarget(endTarget)) {
        this.hide();
      }
    }, {once: true, signal: this.abortController.signal});

    return this.allowOutsideClickForTarget(event.target);
  }

  /**
   * If "clickOutsideDeactivates" is true, this listener will be called on every mouse click outside the trapped
   * element. By default, this will allow any click outside to cause the dialog to close.
   */
  #allowOutsideClickMouse(event) {
    if (event.type !== 'click') {
      return false;
    }

    if (this.hideForOutsideClickTarget(event.target)) {
      this.hide();
    }

    if (this.allowOutsideClickForTarget(event.target)) {
      return true;
    }

    let target = event.target,
      closestControl = event.target.closest('[aria-controls]');

    if (closestControl && closestControl.getAttribute('aria-controls') === this.id) {
      target = closestControl;
    }

    return this.id !== target.getAttribute('aria-controls');
  }

  /**
   * This function is called whenever an activator (an element controlling this dialog) is called. This simply open
   * the dialog if closed, or close it if open
   */
  #onActivatorClicked(event, activator) {
    // If it is already open AND that the element is a link with the attribute data-open-on-hover, we follow the link instead of closing the dialog
    if (this.open && this.controls.includes(event.target) && event.target.tagName === 'A' && event.target.hasAttribute('data-open-on-hover')) {
      return;
    }

    event?.preventDefault(); // Make sure that activators implemented as links are not followed
    this.open ? this.hide() : this.show({ activator });
  }

  /**
   * This function is called whenever an activator with the attribute "data-open-on-hover" is hovered.
   */
  #onActivatorPointerEnter() {
    if (!this.open) {
      this.show();

      this.#focusLeaveDelegate.off().on('pointerenter', (event) => {
        // We want to hide only we the cursor has entered another target that is not the modal itself or one of the controls
        if (event.target.contains(this) 
          || this.contains(event.target)
          || event.target.getAttribute('aria-controls') === this.id
          || event.target.closest('[aria-controls]')?.getAttribute('aria-controls') === this.id) {
          return;
        }

        this.#focusLeaveDelegate.off(); // We remove the listener as soon as we have detected a leave
        this.hide();
      }, true);
    }
  }

  /**
   * Hide the slots that do not have any children
   */
  #updateSlotVisibility(slot) {
    if (!['header', 'footer'].includes(slot.name)) {
      return;
    }

    slot.parentElement.hidden = slot.assignedElements({flatten: true}).length === 0;
  }
}

export class DialogCloseButton extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', () => this.dispatchEvent(new CustomEvent('dialog:force-close', {bubbles: true, cancelable: true, composed: true})));
  }
}

if (!window.customElements.get('dialog-element')) {
  window.customElements.define('dialog-element', DialogElement);
}

if (!window.customElements.get('dialog-close-button')) {
  window.customElements.define('dialog-close-button', DialogCloseButton);
}
