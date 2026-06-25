/**
 * Programmatically play a media on click
 */
export class MediaPlayButton extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('click', this.#playMedia);
  }

  #playMedia() {
    document.getElementById(this.getAttribute('aria-controls'))?.play();
  }
}

if (!window.customElements.get('media-play-button')) {
  window.customElements.define('media-play-button', MediaPlayButton);
}