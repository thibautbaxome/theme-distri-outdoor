import { animate, animateSequence } from "vendor";
import { EffectCarousel } from "../common/carousel";
import { GestureArea } from "../common/behavior";

export class LinksWithImage extends HTMLElement {
  connectedCallback() {
    if (Shopify.designMode) {
      this.addEventListener('shopify:block:select', (event) => this.#onItemChange(event.target, !event.detail.load));
    }

    this.querySelectorAll('.big-link').forEach(
      item => item.addEventListener('mouseenter', this.#onItemChange.bind(this, item))
    );
  }

  #onItemChange(item, transition = true) {
    const toImage = this.querySelector(`[data-image-block-id="${item.getAttribute('data-block-id')}"]`);

    // We can only switch if the new block has an associated image
    if (toImage) {
      animate(this.querySelectorAll(`[data-image-block-id]:not([data-image-block-id="${item.getAttribute('data-block-id')}"])`), { opacity: 0 }, {duration: transition ? 0.15 : 0, ease: 'easeInOut'});
      animate(toImage, { opacity: 1 }, {duration: transition ? 0.15 : 0, ease: 'easeInOut'});
    }
  }
}

export class LinksWithImageCarousel extends EffectCarousel {
  createOnChangeAnimationControls(fromSlide, toSlide) {
    const toImage = this.parentElement.querySelector(`[data-image-block-id="${toSlide.getAttribute('data-block-id')}"]`);

    // We can only switch if the new block has an associated image
    if (toImage) {
      animate(this.parentElement.querySelectorAll(`[data-image-block-id]:not([data-image-block-id="${toSlide.getAttribute('data-block-id')}"])`), { opacity: 0, visibility: 'hidden' }, {duration: 0.25, delay: 0.1, ease: 'easeInOut'});
      animate(toImage, { opacity: 1, visibility: 'visible' }, {duration: 0.25, delay: 0.1, ease: 'easeInOut'});
    }

    return animateSequence([
      [ fromSlide, { opacity: 0, transform: [null, 'translateY(-10px)'] }, { duration: 0.35, ease: [0.55, 0.055, 0.675, 0.19] } ],
      [ toSlide, { opacity: 1, transform: ['translateY(10px)', 'translateY(0)'] }, { duration: 0.35, at: '+0.2', ease: [0.25, 0.46, 0.45, 0.94] } ]
    ]);
  }
}

export class LinksWithImageMobileImageList extends HTMLElement {
  connectedCallback() {
    new GestureArea(this, { thresholdDistance: 80 });

    this.addEventListener('swipeleft', () => this.nextElementSibling.next());
    this.addEventListener('swiperight', () => this.nextElementSibling.previous());
  }
}

if (!window.customElements.get('links-with-image')) {
  window.customElements.define('links-with-image', LinksWithImage);
}

if (!window.customElements.get('links-with-image-carousel')) {
  window.customElements.define('links-with-image-carousel', LinksWithImageCarousel);
}

if (!window.customElements.get('links-with-image-mobile-image-list')) {
  window.customElements.define('links-with-image-mobile-image-list', LinksWithImageMobileImageList);
}