import {throttle} from "../utilities";

/**
 * Custom element allowing to keep track of the height of a given element, and output it as a CSS variable.
 */
export class HeightObserver extends HTMLElement {
  #resizeObserver = new ResizeObserver(throttle(this.#updateCustomProperties.bind(this)));

  connectedCallback() {
    this.#resizeObserver.observe(this);

    if (!window.ResizeObserver) {
      document.documentElement.style.setProperty(`--${this.getAttribute('variable')}-height`, `${this.clientHeight.toFixed(2)}px`);
    }
  }

  disconnectedCallback() {
    this.#resizeObserver.unobserve(this);
  }

  #updateCustomProperties(entries) {
    entries.forEach((entry) => {
      if (entry.target === this) {
        const height = entry.borderBoxSize ? (entry.borderBoxSize.length > 0 ? entry.borderBoxSize[0].blockSize : entry.borderBoxSize.blockSize) : entry.target.clientHeight;
        document.documentElement.style.setProperty(`--${this.getAttribute('variable')}-height`, `${height.toFixed(2)}px`);
      }
    });
  }
}

if (!window.customElements.get('height-observer')) {
  window.customElements.define('height-observer', HeightObserver);
}