import { animate, animateSequence } from "vendor";
import { EffectCarousel } from '../common/carousel/effect-carousel';

export class PressCarousel extends EffectCarousel {
  createOnBecameVisibleAnimationControls(toSlide) {
    if (toSlide.hasAttribute('reveal-on-scroll') && toSlide.getAttribute('reveal-on-scroll') === 'true') {
      return animate(toSlide, { opacity: [0, 1], transform: ['translateY(1em)', 'translateY(0)'] }, { duration: 0.5, delay: 0.25, ease: [0.25, 0.46, 0.45, 0.94] });
    }

    return super.createOnBecameVisibleAnimationControls(toSlide);
  }

  createOnChangeAnimationControls(fromSlide, toSlide) {
    return animateSequence([
      [fromSlide, { opacity: [1, 0], transform: ['translateY(0)', 'translateY(-1em)'] }, { duration: 0.5, ease: [0.55, 0.055, 0.675, 0.19] }],
      [toSlide, { opacity: [0, 1], transform: ['translateY(1em)', 'translateY(0)'] }, { duration: 0.5, at: '+0.2', ease: [0.25, 0.46, 0.45, 0.94] }],
    ]);
  }
}

if (!window.customElements.get('press-carousel')) {
  window.customElements.define('press-carousel', PressCarousel);
}