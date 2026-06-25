/**
 * This re-usable custom element allows to show/hide an element based on the visibility of other elements. This
 * requires two elements: a "startMarker" and "endMarker". Basically, this element will be visible when the startMarker
 * has been crossed, and when the endMarker is not yet visible. This is often used for instance to show a sticky add to
 * cart that shows only when a given element has been crossed (eg.: the main add to cart form) but while another element
 * (like a footer) is not yet visible.
 */
export class SandwichVisibility extends HTMLElement {
  #intersectionObserver = new IntersectionObserver(this.#onObserve.bind(this));
  #isStartMarkerOutOfView = false;
  #isEndMarkerInView = false;

  connectedCallback() {
    this.#intersectionObserver.observe(this.startMarker);
    this.#intersectionObserver.observe(this.endMarker);
  }

  get startMarker() {
    console.warn('Must return a start marker element.');
  }

  get endMarker() {
    console.warn('Must return an end marker element.');
  }

  #onObserve(entries) {
    // The logic is to show the sticky add to cart only when we have crossed the main product form, and
    // while the footer is not yet visible
    entries.forEach(entry => {
      if (entry.target === this.startMarker) {
        this.#isStartMarkerOutOfView = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      }

      if (entry.target === this.endMarker) {
        this.#isEndMarkerInView = entry.isIntersecting && entry.boundingClientRect.top < window.innerHeight;
      }
    });

    this.classList.toggle('is-visible', this.#isStartMarkerOutOfView && !this.#isEndMarkerInView);
  }
}