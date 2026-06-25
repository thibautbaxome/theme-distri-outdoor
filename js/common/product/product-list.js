import { inView, animate, stagger } from "vendor";
import { matchesMediaQuery } from "../utilities";
import { ScrollCarousel } from "../carousel";

export class ProductList extends ScrollCarousel {
  connectedCallback() {
    if (matchesMediaQuery('motion-safe') && this.querySelectorAll('product-card[reveal-on-scroll="true"]').length > 0) {
      inView(this, this.reveal.bind(this));
    }
  }

  async reveal() {
    animate(this.querySelectorAll('product-card[reveal-on-scroll="true"], .product-list__promo[reveal-on-scroll="true"]'), {
      opacity: [0, 1],
      transform: ['translateY(20px)', 'translateY(0)']
    }, {
      duration: 0.1,
      ease: 'easeInOut',
      delay: window.themeVariables.settings.staggerProducts ? stagger(0.05, {startDelay: 0.1, ease: 'easeOut'}) : 0
    });
  }
}

if (!window.customElements.get('product-list')) {
  window.customElements.define('product-list', ProductList);
}