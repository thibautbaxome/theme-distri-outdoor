import { inView, animate } from "vendor";
import { matchesMediaQuery } from "../utilities/media-query";

/**
 * Simple marquee component. In order to work, you need to add all the item for a given line under a div, as shown
 * below. The component will then take care of duplicating the content to ensure it works properly.
 *
 * <marquee-text>
 *   <div>
 *    <span>Text 1</span>
 *    <span>Text 2</span>
 *   </div>
 * </marquee-text>
 *
 * This component supports the following attributes:
 *
 * - speed: a value between 0.1 and 1 (higher is faster). The value is normalized based on the content so even if the
 *          content differs between different sections, the actual speed is the same
 * - direction: either "start-to-end" or "end-to-start"
 * - vertical: if present, the marquee will be vertical instead of horizontal. You can also pass a breakpoint (eg. vertical="sm") to
 *             control when it should switch to vertical
 */

export class MarqueeText extends HTMLElement {
  #resizeObserver = new ResizeObserver(this.#createElements.bind(this));
  #currentAnimation;

  static get observedAttributes() {
    return ['speed'];
  };

  constructor() {
    super();

    // Defer the initialization of the marquee when it is about to be seen, to improve performance
    inView(this, this.#initializeShadowDom.bind(this), {margin: '400px'});

    if (this.hasAttribute('pause-on-hover')) {
      this.addEventListener('pointerenter', () => this.#currentAnimation?.pause());
      this.addEventListener('pointerleave', () => this.#currentAnimation?.play());
    }
  }

  get #isVertical() {
    if (!this.hasAttribute('vertical')) {
      return false;
    }

    return this.getAttribute('vertical') === '' || matchesMediaQuery(this.getAttribute('vertical'));
  }

  get #direction() {
    return this.getAttribute('direction') === 'end-to-start' ? -1 : 1;
  }

  get #scroller() {
    return this.shadowRoot.querySelector('[part="scroller"]');
  }

  #initializeShadowDom() {
    // First, we attach the shadow DOM that creates the scroller

    if (!this.shadowRoot) {
      this.attachShadow({mode: 'open'}).appendChild(document.createRange().createContextualFragment(`
        <slot part="scroller"></slot>
      `));

      this.#resizeObserver.observe(this);
    }
  }

  #createElements() {
    const duplicateCount = (this.#isVertical) ? Math.ceil(this.clientHeight / this.firstElementChild.clientHeight) : Math.ceil(this.clientWidth / this.firstElementChild.clientWidth);
    const fragment = document.createDocumentFragment();

    fragment.appendChild(this.firstElementChild.cloneNode(true));

    for (let i = 1 ; i <= duplicateCount ; ++i) {
      for (let y = 0 ; y < 2 ; ++y) {
        // We add one before and one after
        const node = this.firstElementChild.cloneNode(true);
        const value = 100 * i * (y % 2 === 0 ? -1 : 1); // We add both before and after to ensure that the whole line is visible

        node.setAttribute('aria-hidden', 'true');
        node.style.cssText = (this.#isVertical) ? `position: absolute; inset-block-start: ${value}%;` : `position: absolute; inset-inline-start: calc(${value}%);`
        fragment.appendChild(node);
      }
    }

    this.replaceChildren(fragment);

    // Finally, we can start the animation of the parent

    let transform = (this.#isVertical) ?  ['translateY(0)', `translateY(${this.#direction * this.firstElementChild.clientHeight}px)`] : ['translateX(0px)', `translateX(calc(var(--transform-logical-flip) * ${this.#direction * this.firstElementChild.clientWidth}px))`];
    let speedMultiplier = (this.#isVertical) ? (this.#scroller.clientHeight / 300) : (this.#scroller.clientWidth / 300);

    this.#currentAnimation = animate(this.#scroller, {transform: transform}, {
      duration: (1 / parseFloat(this.getAttribute('speed'))) * speedMultiplier,
      ease: 'linear',
      repeat: Infinity
    })
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'speed' && oldValue !== null && oldValue !== newValue) {
      this.#initializeShadowDom();
      this.#createElements();
    }
  }
}

if (!window.customElements.get('marquee-text')) {
  window.customElements.define('marquee-text', MarqueeText);
}