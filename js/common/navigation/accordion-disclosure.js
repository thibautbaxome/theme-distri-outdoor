import {animateSequence} from "vendor";

/**
 * Base component for an animated disclosure. This component must wrap a <details> element. It provides a default animation,
 * but it can be overriden by providing custom `createOpenAnimationControls` and `createCloseAnimationControls` methods.
 */
export class AccordionDisclosure extends HTMLElement {
  #detailsElement = this.querySelector('details');
  #summaryElement = this.#detailsElement.firstElementChild;
  #contentElement = this.#detailsElement.lastElementChild;

  constructor() {
    super();

    if (Shopify.designMode) {
      this.addEventListener('shopify:block:select', (event) => this.#open({ instant: event.detail.load }));
      this.addEventListener('shopify:block:deselect', this.#close);
    }

    this.#summaryElement.addEventListener('click', this.#onSummaryClick.bind(this));
    this.classList.toggle('is-open', this.#detailsElement.open);
  }

  createOpenAnimationControls() {
    return animateSequence([
      [this.#detailsElement, {height: [`${this.#summaryElement.clientHeight}px`, `${this.#detailsElement.clientHeight}px`]}, {duration: 0.25, ease: 'easeInOut'}],
      [this.#contentElement, {opacity: [0, 1], transform: ['translateY(4px)', `translateY(0px)`]}, {duration: 0.15, at: '-0.1'}]
    ]);
  }

  createCloseAnimationControls() {
    return animateSequence([
      [this.#contentElement, {opacity: 0}, {duration: 0.15}],
      [this.#detailsElement, {height: [`${this.#detailsElement.clientHeight}px`, `${this.#summaryElement.clientHeight}px`]}, {duration: 0.25, at: '<', ease: 'easeInOut'}]
    ]);
  }

  #onSummaryClick(event) {
    event.preventDefault();
    this.classList.toggle('is-open');

    if (this.classList.contains('is-open')) {
      this.#open();
    } else {
      this.#close();
    }
  }

  async #open({ instant = false } = {}) {
    this.classList.add('is-open');
    this.#detailsElement.open = true;
    this.#detailsElement.style.overflow = 'hidden';

    const animationControls = this.createOpenAnimationControls();

    if (instant) {
      animationControls.complete();
    }

    await animationControls;

    this.#detailsElement.style.height = null; // Remove the fixed height to allow item to grow dynamically
    this.#detailsElement.style.overflow = null;
  }

  async #close() {
    this.classList.remove('is-open');
    const animationControls = this.createCloseAnimationControls();

    await animationControls;

    if (!this.classList.contains('is-open')) {
      this.#detailsElement.style.height = null; // Remove the fixed height to allow item to grow dynamically
      this.#detailsElement.open = false;
    }
  }
}

if (!window.customElements.get('accordion-disclosure')) {
  window.customElements.define('accordion-disclosure', AccordionDisclosure);
}