import { inView, scroll } from "vendor";

/**
 * Simple component that represents a progress bar. In order to use it, you must make sure to set the
 * "aria-valuemin", "aria-valuemax" and "aria-valuenow".
 *
 * It supports the following attribute:
 *
 * - animate-on-scroll: if added, the progress bar will initially be set when it becomes visible on scroll
 * - track-scroll-target: if passed the ID of a scroll container, the progress bar will be updated based on the scroll position
 *                        within this container
 */

const progressValuesMapping = new Map();

export class ProgressBar extends HTMLElement {
  static get observedAttributes() {
    return ['aria-valuenow', 'aria-valuemax'];
  }

  #allowUpdatingProgress = !this.hasAttribute('animate-on-scroll') || this.hasAttribute('track-scroll-target');

  connectedCallback() {
    if (this.hasAttribute('track-scroll-target')) {
      inView(this, this.#setupTargetTracking.bind(this));
    } else {
      if (this.hasAttribute('animate-on-scroll')) {
        inView(this, () => {
          this.#allowUpdatingProgress = true;
          this.#animateProgress();
        });
      } else {
        this.#animateProgress();
      }
    }
  }

  disconnectedCallback() {
    // If the progress bar has an ID, we save the value in the local storage, so that if it is re-added to the DOM
    // we can do a smooth animation from the previous value. This is useful for instance for inventory where the
    // elements is removed from the DOM
    if (this.id) {
      progressValuesMapping.set(this.id, this.progress);
    }
  }

  get progress() {
    return Math.min(1, this.getAttribute('aria-valuenow') / this.getAttribute('aria-valuemax'));
  }

  set valueMax(value) {
    this.setAttribute('aria-valuemax', value);
  }

  set valueNow(value) {
    this.setAttribute('aria-valuenow', value);
  }

  attributeChangedCallback() {
    // If the progress bar is tracking the scroll target, we update the progress based on the scroll position
    // and not when the attribute changes
    if (!this.hasAttribute('track-scroll-target')) {
      this.#animateProgress();
    }
  }

  #setupTargetTracking() {
    const scrollTarget = document.getElementById(this.getAttribute('track-scroll-target'));
    const initialValue = (scrollTarget.clientWidth / scrollTarget.scrollWidth);

    scroll((progress) => {
      this.style.setProperty('--progress-bar-progress', initialValue + (Math.abs(progress) * (1 - initialValue)));
    }, {
      container: scrollTarget,
      axis: 'x'
    });
  }

  #animateProgress() {
    if (!this.#allowUpdatingProgress) {
      return; // We don't want to animate the progress if the component is not visible
    }

    // If we have a previous value in the set, we animate from it
    let previousValue = progressValuesMapping.get(this.id);
    
    this.animate({
      '--progress-bar-progress': previousValue ? [previousValue, this.progress] : this.progress,
    }, {
      duration: 450,
      easing: 'ease-out',
      fill: 'both'
    });

    // As we have trnasitioned to it, we now remove the previous value
    progressValuesMapping.delete(this.id);
  }
}

if (!window.customElements.get('progress-bar')) {
  window.customElements.define('progress-bar', ProgressBar);
}