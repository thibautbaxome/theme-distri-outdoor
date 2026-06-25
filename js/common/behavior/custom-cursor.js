/**
 * Custom cursor that can be styled in CSS. The custom cursor is always expressed related to its first positioned parent
 *
 * It supports the following options:
 *
 * - for-links: boolean - if true, the cursor will only appear when hovering over a link or a button
 */
export class CustomCursor extends HTMLElement {
  #abortController;
  #scheduleSizeRecalculation = true;
  #parentBoundingClientReact;
  #clientWidth;
  #clientHeight;

  connectedCallback() {
    this.#abortController = new AbortController();

    this.parentElement.addEventListener('pointermove', this.#onPointerMove.bind(this), {passive: true, signal: this.#abortController.signal});
    this.parentElement.addEventListener('pointerleave', this.#onPointerLeave.bind(this), {signal: this.#abortController.signal});

    window.addEventListener('scroll', () => this.#scheduleSizeRecalculation = true);
    window.addEventListener('resize', () => this.#scheduleSizeRecalculation = true);
  }

  disconnectedCallback() {
    this.#abortController.abort();
  }

  /**
   * This method is public to allow sub-classes to eventually adjust the logic
   */
  applyTransform({ mouseX, mouseY }) {
    this.animate({ translate: `${mouseX.toFixed(3)}px ${mouseY.toFixed(3)}px` }, { duration: 0, fill: 'forwards' });
  }

  #onPointerLeave() {
    this.classList.remove('is-visible', 'is-half-start', 'is-half-end');
  }

  #onPointerMove(event) {
    // Hide the custom cursor whenever it goes over a button or a link
    const isLink = event.target.matches('button, a[href], button :scope, a[href] :scope');

    if ((!this.hasAttribute('for-links') && isLink) || (this.hasAttribute('for-links') && !isLink)) {
      return this.classList.remove('is-visible');
    }

    const { mouseX, mouseY, containerBoundingRect } = this.#calculateCoordinates(event);

    this.applyTransform({ mouseX, mouseY, containerBoundingRect });
  }

  /**
   * Retrieving all the dimensions on every pointermove can be expensive, so we precompute them once, and only recalculate them when the window is resized
   */
  #precomputeDimensions() {
    if (!this.#scheduleSizeRecalculation) {
      return;
    }

    this.#clientWidth = this.clientWidth;
    this.#clientHeight = this.clientHeight;
    this.#parentBoundingClientReact = this.parentElement.getBoundingClientRect();
    this.#scheduleSizeRecalculation = false;
  }

  #calculateCoordinates(event) {
    this.#precomputeDimensions();

    const parentBoundingRect = this.#parentBoundingClientReact,
      parentXCenter = (parentBoundingRect.left + parentBoundingRect.right) / 2,
      isOnStartHalfPart = event.pageX < parentXCenter;

    this.classList.toggle('is-half-start', isOnStartHalfPart);
    this.classList.toggle('is-half-end', !isOnStartHalfPart);
    this.classList.add('is-visible');

    const mouseY = event.clientY - parentBoundingRect.y - this.#clientHeight / 2,
      mouseX = event.clientX - parentBoundingRect.x - this.#clientWidth / 2;

    return { mouseX, mouseY, containerBoundingRect: parentBoundingRect };
  }
}

if (!window.customElements.get('custom-cursor')) {
  window.customElements.define('custom-cursor', CustomCursor);
}