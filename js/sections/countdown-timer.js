import {animate, inView} from "vendor";

/**
 * Countdown timer section. In order to works, it must have flips.
 */
export class CountdownTimer extends HTMLElement {
  #flips;
  #expirationDate;
  #interval;
  #isVisible;

  connectedCallback() {
    this.#flips = Array.from(this.querySelectorAll('countdown-timer-flip'));

    const expiresAt = this.getAttribute('expires-at');

    if (expiresAt !== '') {
      this.#expirationDate = new Date(expiresAt);
      this.#interval = setInterval(this.#recalculateFlips.bind(this), 1000);

      this.#recalculateFlips(); // Make sure we recalculate immediately without waiting 1s for the first run
    }

    inView(this, () => {
      this.#isVisible = true;
      return () => this.#isVisible = false;
    }, {margin: '500px'});
  }

  disconnectedCallback() {
    clearInterval(this.#interval);
  }

  get daysFlip() {
    return this.#flips.find(flip => flip.getAttribute('type') === 'days');
  }

  get hoursFlip() {
    return this.#flips.find(flip => flip.getAttribute('type') === 'hours');
  }

  get minutesFlip() {
    return this.#flips.find(flip => flip.getAttribute('type') === 'minutes');
  }

  get secondsFlip() {
    return this.#flips.find(flip => flip.getAttribute('type') === 'seconds');
  }

  #recalculateFlips() {
    const dateNow = new Date();

    if (this.#expirationDate < dateNow) {
      if (this.getAttribute('expiration-behavior') === 'hide') {
        this.closest('.shopify-section, [data-block-id]').remove();
      } else {
        return clearInterval(this.#interval);
      }
    }

    if (!this.#isVisible) {
      return; // No need to trigger re-render if the section is not in view
    }

    let delta = Math.abs(this.#expirationDate - dateNow) / 1000;

    const days = Math.floor(delta / 86400);
    delta -= days * 86400;

    const hours = Math.floor(delta / 3600) % 24;
    delta -= hours * 3600;

    const minutes = Math.floor(delta / 60) % 60;
    delta -= minutes * 60;

    const seconds = Math.floor(delta % 60);

    this.daysFlip?.updateValue(days);
    this.hoursFlip?.updateValue(hours);
    this.minutesFlip?.updateValue(minutes);
    this.secondsFlip?.updateValue(seconds);
  }
}

/**
 * Represents the flip for a given unit
 */
export class CountdownTimerFlip extends HTMLElement {
  constructor() {
    super();

    if (this.hasAttribute('animate')) {
      this.attachShadow({mode: 'open'});

      let flipHtml = [...this.textContent].map(() => `<countdown-timer-flip-digit part="digit" style="display: inline-block">0</countdown-timer-flip-digit>`);
      this.shadowRoot.appendChild(document.createRange().createContextualFragment(flipHtml.join('')));
    }
  }

  updateValue(value) {
    const newValue = Math.min(99, value).toString().padStart(2, '0');
    
    if (this.hasAttribute('animate')) {
      [...newValue].forEach((digit, index) => {
        this.shadowRoot.children[index].setAttribute('number', digit);
      });
    } else {
      this.textContent = newValue;
    }
  }
}

/**
 * Represents a single digit in a flip, to animate it
 */
export class CountdownTimerFlipDigit extends HTMLElement {
  static observedAttributes = ['number'];

  constructor() {
    super();
    this.attachShadow({mode: 'open'}).appendChild(document.createRange().createContextualFragment('<div><slot></slot></div>'));
  }

  async attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === null || oldValue === newValue) {
      return this.textContent = newValue; // No animation to do so we return
    }

    // Else, we need to animate very quickly
    await animate(this.shadowRoot.firstElementChild, {transform: ['translateY(0)', 'translateY(-50%)']}, {duration: 0.3, ease: [0.36, 0, 0.66, -0.56]});
    this.textContent = newValue;
    animate(this.shadowRoot.firstElementChild, {transform: ['translateY(100%)', 'translateY(0px)']}, {duration: 0.2, ease: [0.22, 1, 0.36, 1]});
  }
}

if (!window.customElements.get('countdown-timer')) {
  window.customElements.define('countdown-timer', CountdownTimer);
}

if (!window.customElements.get('countdown-timer-flip')) {
  window.customElements.define('countdown-timer-flip', CountdownTimerFlip);
}

if (!window.customElements.get('countdown-timer-flip-digit')) {
  window.customElements.define('countdown-timer-flip-digit', CountdownTimerFlipDigit);
}