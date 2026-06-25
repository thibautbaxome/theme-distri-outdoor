import {animate} from "vendor";

export class LoadingBar extends HTMLElement {
  constructor() {
    super();

    document.addEventListener('theme:loading:start', this.#onLoadingStart.bind(this));
    document.addEventListener('theme:loading:end', this.#onLoadingEnd.bind(this));
  }

  #onLoadingStart() {
    animate(this, {opacity: [0, 1], transform: ['scaleX(0)', 'scaleX(0.4)']}, {duration: 0.25});
  }

  async #onLoadingEnd() {
    await animate(this, {transform: ['scaleX(0)', 'scaleX(1)']}, {duration: 0.25});
    animate(this, {opacity: 0}, {duration: 0.25});
  }
}

if (!window.customElements.get('loading-bar')) {
  window.customElements.define('loading-bar', LoadingBar);
}