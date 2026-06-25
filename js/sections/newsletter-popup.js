import {Modal} from "../common/overlay/modal";

export class NewsletterPopup extends Modal {
  connectedCallback() {
    super.connectedCallback();

    if (this.shouldAppearAutomatically) {
      setTimeout(() => this.show(), this.apparitionDelay);
    }
  }

  get apparitionDelay() {
    return parseInt(this.getAttribute('apparition-delay') || 0) * 1000;
  }

  get shouldAppendToBody() {
    return false; // Newsletter is already appended to the body
  }

  get shouldAppearAutomatically() {
    return !(localStorage.getItem('theme:popup-filled') === 'true' // Never open if popup has been filled successfully
      || (this.hasAttribute('only-once') && localStorage.getItem('theme:popup-appeared') === 'true'));
  }

  attributeChangedCallback(name, oldValue, newValue) {
    super.attributeChangedCallback(name, oldValue, newValue);

    if (name === 'open' && this.open) {
      localStorage.setItem('theme:popup-appeared', 'true');
    }
  }
}

if (!window.customElements.get('newsletter-popup')) {
  window.customElements.define('newsletter-popup', NewsletterPopup);
}