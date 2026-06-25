import {animate, spring, frame} from "vendor";
import {CustomCursor} from "../common/behavior";

export class FeaturedLinks extends HTMLElement { 
  connectedCallback() {
    if (Shopify.designMode) {
      this.addEventListener('shopify:block:select', (event) => this.#onItemChange(event.target, !event.detail.load));
    }

    Array.from(this.querySelectorAll('.big-link')).forEach(
      item => item.addEventListener('mouseenter', this.#onItemChange.bind(this, item))
    );
  }

  #onItemChange(item, transition = true) {
    const toImage = this.querySelector(`.featured-links__cursor-image[data-block-id="${item.getAttribute('data-block-id')}"]`);

    // We can only switch if the new block has an associated image
    if (toImage) {
      animate(this.querySelectorAll(`.featured-links__cursor-image:not([data-block-id="${item.getAttribute('data-block-id')}"])`), {opacity: 0}, {duration: transition ? 0.15 : 0, ease: 'easeInOut'});
      animate(toImage, {opacity: 1}, {duration: transition ? 0.15 : 0, delay: 0.15, ease: 'easeInOut'});
    }
  }
}

export class FeaturedLinksImageCursor extends CustomCursor {
  applyTransform({ mouseX, mouseY, containerBoundingRect }) {
    const minRotation = -8;
    const maxRotation = 8;
    const minTranslateOffset = -20;
    const maxTranslateOffset = 20;
    
    // Perform linear interpolation
    const rotation = (maxRotation - minRotation) * ((mouseX) / (containerBoundingRect.width)) + minRotation;
    const translateOffset = (maxTranslateOffset - minTranslateOffset) * ((mouseY) / (containerBoundingRect.height)) + minTranslateOffset;
    
    const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

    // Firefox has a huge performance problem when using the spring animation, so for Firefox we use a simpler animation type
    if (isFirefox) {
      this.animate({ 
        translate: [`${mouseX.toFixed(3)}px ${(mouseY - 350 * (translateOffset / 100)).toFixed(3)}px`],
        rotate: [`${rotation}deg`]
      }, { duration: 0.1, fill: 'both' });
    } else {
      frame.postRender(() => {
        animate(this, {
          transform: [null, `translate(${mouseX.toFixed(3)}px, ${(mouseY - 350 * (translateOffset / 100)).toFixed(3)}px) rotate(${rotation}deg)`]
        }, {
          duration: 0,
          type: spring,
          stiffness: 150, 
          damping: 15
        });
      });
    }
  }
}

if (!window.customElements.get('featured-links')) {
  window.customElements.define('featured-links', FeaturedLinks);
}

if (!window.customElements.get('featured-links-image-cursor')) {
  window.customElements.define('featured-links-image-cursor', FeaturedLinksImageCursor);
}