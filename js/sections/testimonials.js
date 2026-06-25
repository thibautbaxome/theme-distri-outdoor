import { animate, animateSequence } from "vendor";
import {EffectCarousel} from "../common/carousel/effect-carousel.js";

export class TestimonialsCarousel extends EffectCarousel {
  createOnChangeAnimationControls(fromSlide, toSlide, {direction} = {}) {
    const toInfo = this.closest('.testimonials').querySelector(`[data-info-block-id="${toSlide.getAttribute('data-block-id')}"]`);
    const fromInfo = this.closest('.testimonials').querySelectorAll(`[data-info-block-id]:not([data-info-block-id="${toSlide.getAttribute('data-block-id')}"])`);

    // We can only switch if the new block has an associated info (image or product or both)
    if (toInfo && toInfo) {
      animate(fromInfo, { opacity: 0, visibility: 'hidden' }, {duration: 0.25, delay: 0.1, ease: 'easeInOut'});
      animate(toInfo, { opacity: [0, 1], visibility: ['hidden', 'visible'] }, {duration: 0.25, delay: 0.1, ease: 'easeInOut'});
    }

    return animateSequence([
      [fromSlide, { visibility: ['visible', 'hidden'], opacity: [1, 0], transform: ['translateY(0)', 'translateY(-1em)'] }, { duration: 0.3, at: 0, ease: [0.55, 0.055, 0.675, 0.19] }],
      [toSlide, { visibility: ['hidden', 'visible'], opacity: [0, 1], transform: ['translateY(1em)', 'translateY(0)'] }, { duration: 0.5, at: '+0.2', ease: [0.25, 0.46, 0.45, 0.94] }],
    ]);
  }
}

if (!window.customElements.get('testimonials-carousel')) {
  window.customElements.define('testimonials-carousel', TestimonialsCarousel);
}