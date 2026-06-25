import {animate} from "vendor";
import {EffectCarousel} from "../common/carousel";

export class AnnouncementBar extends EffectCarousel {
  createOnChangeAnimationControls(fromSlide, toSlide) {
    return {
      leaveControls: () => animate(fromSlide, {opacity: [1, 0], transform: ['translateY(0)', 'translateY(-10px)']}, {duration: 0.25, ease: [0.55, 0.055, 0.675, 0.19]}),
      enterControls: () => animate(toSlide, {opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0px)']}, {duration: 0.4, ease: [0.215, 0.61, 0.355, 1]})
    }
  }
}

if (!window.customElements.get('announcement-bar')) {
  window.customElements.define('announcement-bar', AnnouncementBar);
}