import {animate, scroll} from "vendor";

export class DynamicGrid extends HTMLElement {
  constructor() {
    super();

    if (Shopify.designMode) {
      this.closest('.shopify-section').addEventListener('shopify:section:select', () => this.classList.add('editor-is-selected'));
      this.closest('.shopify-section').addEventListener('shopify:section:deselect', () => this.classList.remove('editor-is-selected'));

      this.addEventListener('shopify:block:select', (event) => event.target.classList.add('editor-is-selected'));
      this.addEventListener('shopify:block:deselect', (event) => event.target.classList.remove('editor-is-selected'));
    }
  }

  connectedCallback() {
    if (!window.ViewTimeline) {
      this.#setupEmulateScrollTimeline(); // On browsers supporting ViewTimeline, this is done all in CSS
    }
  }

  /**
   * On older browsers, we fallback to a more standard "scroll listener" based approach, by using MotionJS.
   */
  #setupEmulateScrollTimeline() {
    Array.from(this.querySelectorAll('.dynamic-grid__cell')).forEach(element => {
      const parallaxSpeed = parseInt(element.style.getPropertyValue('--parallax-speed'));

      if (parallaxSpeed === 0) {
        return; // If parallax is set to zero we don't even try to set up a scroll-linked effect
      }

      const offsetAmount = `${(parallaxSpeed * 10) / 2}vmin`

      scroll(
        animate(element, {
          transform: element.getAttribute('data-parallax-direction') === 'horizontal'
            ? [`translateX(calc(-1 * ${offsetAmount}))`, `translateX(${offsetAmount})`]
            : [`translateY(calc(-1 * ${offsetAmount}))`, `translateY(${offsetAmount})`]
        }), {
          offset: ["start end", "end start"],
          target: this.closest('.shopify-section')
        }
      )
    });
  }
}

if (!window.customElements.get('dynamic-grid')) {
  window.customElements.define('dynamic-grid', DynamicGrid);
}