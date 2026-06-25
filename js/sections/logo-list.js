import {animate, stagger, inView} from "vendor";

export class LogoList extends HTMLElement {
  constructor() {
    super();

    if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
      inView(this, this.#reveal.bind(this));
    }
  }

  #reveal() {
    animate(
      this.querySelectorAll('[reveal-on-scroll="true"]'),
      {opacity: [0, 1], transform: ['translateY(24px)', 'translateY(0)']},
      {duration: 1, delay: stagger(0.05, {ease: 'easeOut'}), ease: [0.22, 1, 0.36, 1]}
    );
  }
}

if (!window.customElements.get('logo-list')) {
  window.customElements.define('logo-list', LogoList);
}