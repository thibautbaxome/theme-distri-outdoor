import { ScrollCarousel } from "./scroll-carousel.js";  
import { matchesMediaQuery } from "../utilities";

/**
 * Components to create a "carousel navigation" (such as dots, thumbnails...)
 *
 * It listens to the following events:
 *
 * - carousel:change : adjusts itself whenever the carousel changes
 * - carousel:filter : adjusts itself when the carousel is being filtered
 *
 * It directly integrates with the carousel to update the index.
 */

export class CarouselNavigation extends HTMLElement {
  #abortController;
  #allItems = [];

  connectedCallback() {
    if (!this.carousel) {
      throw 'Carousel navigation component requires an aria-controls attribute that refers to the controlled carousel.'
    }

    this.#abortController = new AbortController();

    this.#allItems = Array.from(this.querySelectorAll('button'));
    this.#allItems.forEach(button => button.addEventListener('click', () => this.onButtonClicked(this.items.indexOf(button)), {signal: this.#abortController.signal}));

    this.carousel.addEventListener('carousel:change', (event) => this.onNavigationChange(event.detail.index), {signal: this.#abortController.signal});
    this.carousel.addEventListener('carousel:filter', this.#onCarouselFilter.bind(this), {signal: this.#abortController.signal});
  }

  disconnectedCallback() {
    this.#abortController.abort();
  }

  get items() {
    return this.#allItems.filter(item => !item.hasAttribute('hidden'));
  }

  get carousel() {
    return document.getElementById(this.getAttribute('aria-controls'));
  }

  get selectedIndex() {
    return this.#allItems.findIndex(button => button.getAttribute('aria-current') === 'true');
  }

  onButtonClicked(newIndex) {
    if (this.carousel.canChangeSlide()) {
      this.carousel.select(newIndex);
      this.onNavigationChange(newIndex);
    }
  }

  onNavigationChange(newIndex) {
    this.items.forEach((button, index) => button.setAttribute('aria-current', newIndex === index ? 'true' : 'false'));

    if (this.hasAttribute('align-selected') && (this.scrollWidth !== this.clientWidth || this.scrollHeight !== this.clientHeight)) {
      this.scrollTo({
        left: this.items[newIndex].offsetLeft - (this.clientWidth / 2) + (this.items[newIndex].clientWidth / 2),
        top: this.items[newIndex].offsetTop - (this.clientHeight / 2) + (this.items[newIndex].clientHeight / 2),
        behavior: matchesMediaQuery('motion-safe') ? 'smooth' : 'auto'
      });
    }
  }

  #onCarouselFilter(event) {
    this.#allItems.forEach((item, index) => {
      item.toggleAttribute('hidden', (event.detail.filteredIndexes || []).includes(index));
    });
  }
}

/**
 * Create a "prev" or "next" button controlling the carousel.
 *
 * It also listens the following events:
 *
 * scroll:edge-nearing : adjusts itself when the controlled element reaches an edge
 * scroll:edge-leaving : adjusts itself when the controlled element leaves an edge
 */

export class CarouselDirectionButton extends HTMLElement {
  #abortController;
  #mutationObserver = new MutationObserver(this.#onCheckScrollability.bind(this));

  connectedCallback() {
    if (!this.carousel) {
      throw 'Carousel prev button component requires an aria-controls attribute that refers to the controlled carousel.'
    }

    this.#abortController = new AbortController();
    this.addEventListener('click', this.#onClick, {signal: this.#abortController.signal});
    this.carousel.addEventListener('scroll:edge-nearing', (event) => this.firstElementChild.disabled = event.detail.position === this.direction, {signal: this.#abortController.signal});
    this.carousel.addEventListener('scroll:edge-leaving', (event) => this.firstElementChild.disabled = event.detail.position === this.direction ? false : this.firstElementChild.disabled, {signal: this.#abortController.signal});

    // We monitor the carousel, to hide buttons when it is not scrollable
    this.#mutationObserver.observe(this.carousel, {attributes: true, attributeFilter: ['class'], childList: false, subtree: false});
    this.#onCheckScrollability();
  }

  disconnectedCallback() {
    this.#abortController.abort();
  }

  get direction() {
    throw 'Carousel direction button cannot be used directly. Use <carousel-prev-button> or <carousel-next-button> instead.';
  }

  get carousel() {
    return document.getElementById(this.getAttribute('aria-controls'));
  }

  #onClick() {
    this.direction === 'start' ? this.carousel.previous() : this.carousel.next();
  }

  #onCheckScrollability() {
    if (this.carousel instanceof ScrollCarousel) {
      this.toggleAttribute('hidden', !this.carousel.isScrollable);
    }
  }
}

export class CarouselPrevButton extends CarouselDirectionButton {
  get direction() {
    return 'start';
  }
}

export class CarouselNextButton extends CarouselDirectionButton {
  get direction() {
    return 'end';
  }
}

/**
 * Allow to create a button that can pause/resume the autoplayer associated with a carousel.
 */
export class CarouselPlayerButton extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('click', this.#togglePlayer.bind(this));
    this.carousel.addEventListener('carousel:select', this.#onPlayerStart.bind(this));
  }

  get carousel() {
    return document.getElementById(this.getAttribute('aria-controls'));
  }

  #togglePlayer() {
    const button = this.querySelector('button');

    // Switch the two icons between pause and play
    button.firstElementChild.classList.toggle('hidden');
    button.lastElementChild.classList.toggle('hidden');

    if (this.carousel.player.paused) {
      this.carousel.player.resume();
    } else {
      this.carousel.player.pause();
    }
  }
  
  #onPlayerStart() {
    const button = this.querySelector('button');

    button.firstElementChild.classList.remove('hidden');
    button.lastElementChild.classList.add('hidden');
  }
}

export class CarouselPageIndicator extends HTMLElement {
  connectedCallback () {
    this.carousel.addEventListener('carousel:change', this.#updateIndicator.bind(this));
  }

  get carousel () {
    return document.getElementById(this.getAttribute('aria-controls'));
  }

  get currentSlideIndex () {
    return this.querySelector('[current-slide-index]');
  }

  get pageSize () {
    return this.querySelector('[page-size]');
  }

  #updateIndicator (event) {
    let pageSize = 0;

    Array.from(this.carousel.children).forEach((item) => {
      if (!item.hidden) {
        pageSize += 1;
      }
    })

    this.pageSize.innerText = pageSize.toString();
    this.currentSlideIndex.innerText = (event.detail.index + 1).toString();
  }
}

if (!window.customElements.get('carousel-prev-button')) {
  window.customElements.define('carousel-prev-button', CarouselPrevButton);
}

if (!window.customElements.get('carousel-next-button')) {
  window.customElements.define('carousel-next-button', CarouselNextButton);
}

if (!window.customElements.get('carousel-navigation')) {
  window.customElements.define('carousel-navigation', CarouselNavigation);
}

if (!window.customElements.get('carousel-player-button')) {
  window.customElements.define('carousel-player-button', CarouselPlayerButton);
}

if (!window.customElements.get('carousel-page-indicator')) {
  window.customElements.define('carousel-page-indicator', CarouselPageIndicator);
}