import {animate, animateSequence} from "vendor";
import {matchesMediaQuery} from "../utilities/media-query";

/**
 * This component helps to coordinate the hover effect (which is not 100% possible in CSS), as well as the
 * loading status for the button
 */
export class ButtonContent extends HTMLElement {
  #isLoading = false;
  #mutationObserver;
  #abortController;

  constructor() {
    super();

    this.#mutationObserver = new MutationObserver(this.#onObserveAttributes.bind(this));
  }

  connectedCallback() {
    this.style.transform = ''; // This is to solve an edge case that can happen when the DOM element is removed before the end animation is over
    this.#mutationObserver.observe(this.parentElement, { attributes: true, attributeFilter: ['aria-busy'], attributeOldValue: true });

    this.#abortController = new AbortController();

    if (this.hasAttribute('rotated-text') && matchesMediaQuery('supports-hover') && matchesMediaQuery('motion-safe')) {
      this.parentElement.addEventListener('mouseenter', this.#startHoverEffect.bind(this), { signal: this.#abortController.signal });
      this.parentElement.addEventListener('mouseleave', this.#finishHoverEffect.bind(this), { signal: this.#abortController.signal });
    }
  }

  disconnectedCallback() {
    this.#mutationObserver.disconnect();
    this.#abortController.abort();
  }

  #startHoverEffect() {
    if (this.#isLoading) {
      return; // We do not allow rotating while spinning
    }

    const contentWidth = getComputedStyle(this, '::before').width;

    this.getAnimations().forEach(animation => animation.cancel());

    // Define a constant speed in pixels per second (adjust to make it faster/slower)
    const SPEED_PX_PER_SECOND = 100;

    // Calculate the total distance the animation needs to travel
    const distance = this.clientWidth + parseFloat(contentWidth);

        // Calculate duration based on distance and desired speed
    const animationDuration = distance / SPEED_PX_PER_SECOND;

    return animate(
      this, 
      { transform: [null, `translateX(calc(var(--transform-logical-flip) * (50% + ${contentWidth} / 2)))`] },
      { repeat: Infinity, ease: 'linear', duration: animationDuration }
    );
  }

  #finishHoverEffect() {
    if (!this?.checkVisibility()) {
      return;
    }

    return animate(
      this, 
      { transform: [null, 'translateX(0px)'] },
      { ease: [0.33, 1, 0.68, 1], duration: 0.2 }
    )
  }

  /**
   * Detect whenever the button (the parent) has the attribute "aria-busy" being added, so that we display the transient content or not
   */
  #onObserveAttributes(mutationList) {
    mutationList.forEach(mutation => {
      switch (mutation.type) {
        case 'attributes':
          switch (mutation.attributeName) {
            case 'aria-busy':
              if (mutation.oldValue === mutation.target.getAttribute('aria-busy')) {
                break; // We return if the value is the same
              }

              this.#onLoadingChanged(mutation.target.getAttribute('aria-busy') === 'true');
              break;
          }

          break;
      }
    });
  }

  async #onLoadingChanged(loading) {
    // If there is no shadow root yet, we create the shadow root to ease transitions
    if (!this.shadowRoot) {
      this.attachShadow({mode: 'open'});

      let transientContent = '';

      if (this.closest('copy-button')) {
        // If we are inside a copy-button, we show a text instead
        transientContent = `
          <span class="transient" style="display: flex; align-items: center; gap: 8px">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 12 12">
              <path stroke="currentColor" stroke-width="1.5" d="M1.5 4.643 5 8.5l5.5-6"/>
            </svg>

            <span>Copied</span>
          </span>
        `
      } else {
        transientContent = `
          <svg class="transient" width="20" viewBox="0 0 120 30" fill="currentColor" style="opacity: 0">
            <circle cx="15" cy="15" r="15">
              <animate attributeName="r" from="15" to="15" begin="0s" dur="0.8s" values="15;9;15" calcMode="linear" repeatCount="indefinite"/>
              <animate attributeName="fill-opacity" from="1" to="1" begin="0s" dur="0.8s" values="1;.5;1" calcMode="linear" repeatCount="indefinite"/>
            </circle>
            <circle cx="60" cy="15" r="9" fill-opacity="0.3">
              <animate attributeName="r" from="9" to="9" begin="0s" dur="0.8s" values="9;15;9" calcMode="linear" repeatCount="indefinite"/>
              <animate attributeName="fill-opacity" from="0.5" to="0.5" begin="0s" dur="0.8s" values=".5;1;.5" calcMode="linear" repeatCount="indefinite"/>
            </circle>
            <circle cx="105" cy="15" r="15">
              <animate attributeName="r" from="15" to="15" begin="0s" dur="0.8s" values="15;9;15" calcMode="linear" repeatCount="indefinite"/>
              <animate attributeName="fill-opacity" from="1" to="1" begin="0s" dur="0.8s" values="1;.5;1" calcMode="linear" repeatCount="indefinite"/>
            </circle>
          </svg>
        `;
      }

      this.shadowRoot.appendChild(document.createRange().createContextualFragment(`
        <style>
          :host {
            display: grid !important;
            place-items: center !important;
          }

          .transient {
            opacity: 0;
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
          }
        </style>

        ${transientContent}

        <div part="content">
          <slot></slot>
        </div>
      `));
    }

    this.#isLoading = loading;

    const transientContent = this.shadowRoot.querySelector('.transient');
    const content = this.shadowRoot.querySelector('[part="content"]');

    if (!this?.checkVisibility()) {
      return;
    }
    
    if (loading) {
      if (this.hasAttribute('rotated-text')) {
        await this.#finishHoverEffect();
      }

      if (this.#isLoading) {
        // The status might have changed already, so we check again
        animateSequence([
          [content, { transform: ['translateY(0)', 'translateY(-10px)'], opacity: [1, 0] }, { duration: 0.18 }],
          [transientContent, { transform: ['translate(-50%, calc(-50% + 10px))', 'translate(-50%, -50%)'], opacity: [0, 1] }, { duration: 0.18 }]
        ]);
      }
    } else {
      animateSequence([
        [transientContent, { transform: ['translate(-50%, -50%)', 'translateY(-50%, calc(-50% + 10px))'], opacity: [1, 0] }, { duration: 0.18 }],
        [content, { transform: ['translateY(10px)', 'translateY(0)'], opacity: [0, 1] }, { duration: 0.18 }]
      ]);
    }
  }
}

if (!window.customElements.get('button-content')) {
  window.customElements.define('button-content', ButtonContent);
}