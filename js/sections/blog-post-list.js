import {inView, animate, stagger} from "vendor";
import {matchesMediaQuery} from "../common/utilities";
import {ScrollCarousel} from "../common/carousel";

export class BlogPostList extends ScrollCarousel {
  connectedCallback() {
    if (matchesMediaQuery('motion-safe') && this.querySelectorAll(':scope > [reveal-on-scroll="true"]').length > 0) {
      inView(this, this.reveal.bind(this));
    }
  }

  reveal() {
    animate(this.querySelectorAll(':scope > [reveal-on-scroll="true"]'), {
      opacity: [0, 1],
      transform: ['translateY(20px)', 'translateY(0)']
    }, {
      duration: 0.1,
      ease: 'easeInOut',
      delay: stagger(0.05, {startDelay: 0.1, ease: 'easeOut'})
    });
  }
}

if (!window.customElements.get('blog-post-list')) {
  window.customElements.define('blog-post-list', BlogPostList);
}