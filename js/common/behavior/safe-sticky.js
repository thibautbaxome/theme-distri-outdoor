/**
 * When using position: sticky, we may run into case when the element is too long and that part of content cannot
 * be seen (this is the case for instance for filters bar that can grew up very long). This provides a workaround
 * by automatically scrolling into it on scroll up or down
 */

import {inView} from "vendor";

export class SafeSticky extends HTMLElement {
  #resizeObserver = new ResizeObserver(this.#recalculateStyles.bind(this));
  #checkPositionListener = this.#checkPosition.bind(this);
  #initialTop = 0;
  #lastKnownY = 0; // we could initialize it to window.scrollY but this avoids a costly reflow
  #currentTop = 0;
  #position = 'relative';

  connectedCallback() {
    inView(this, () => {
      window.addEventListener('scroll', this.#checkPositionListener);
      this.#resizeObserver.observe(this);

      return () => {
        window.removeEventListener('scroll', this.#checkPositionListener);
        this.#resizeObserver.unobserve(this);
      }
    }, {margin: '500px'});
  }

  disconnectedCallback() {
    window.removeEventListener('scroll', this.#checkPositionListener);
    this.#resizeObserver.unobserve(this);
  }

  #recalculateStyles() {
    this.style.removeProperty('top'); // Ensure we recalculate the styles based on initial value

    const computedStyles = getComputedStyle(this);

    this.#initialTop = parseInt(computedStyles.top);
    this.#position = computedStyles.position;

    this.#checkPosition();
  }

  #checkPosition() {
    if (this.#position !== 'sticky') {
      return this.style.removeProperty('top');
    }

    let bounds = this.getBoundingClientRect(),
      maxTop = bounds.top + window.scrollY - this.offsetTop + this.#initialTop,
      minTop = this.clientHeight - window.innerHeight + 20; // The +20 is an extra offset to create a bit of separation

    if (window.scrollY < this.#lastKnownY) {
      this.#currentTop -= window.scrollY - this.#lastKnownY;
    } else {
      this.#currentTop += this.#lastKnownY - window.scrollY;
    }

    this.#currentTop = Math.min(Math.max(this.#currentTop, -minTop), maxTop, this.#initialTop);
    this.#lastKnownY = window.scrollY;

    this.style.top = `${Math.round(this.#currentTop)}px`;
  }
}

if (!window.customElements.get('safe-sticky')) {
  window.customElements.define('safe-sticky', SafeSticky);
}