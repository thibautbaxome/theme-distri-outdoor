/* Exports */
export * from './common/actions';
export * from './common/animation';
export * from './common/behavior';
export * from './common/carousel';
export * from './common/cart';
export * from './common/collection';
export * from './common/facets';
export * from './common/feedback';
export * from './common/form';
export * from './common/media';
export * from './common/navigation';
export * from './common/overlay';
export * from './common/product';
export * from './common/search';
export * from './common/typography';
export * from './common/utilities';

/* Export of sections */
export {AgeVerifierModal} from './sections/age-verifier'
export {AccountLogin} from "./sections/customer";
export {AnnouncementBar} from "./sections/announcement-bar";
export {BeforeAfter} from "./sections/before-after-image";
export {BlogPostList} from "./sections/blog-post-list";
export {CartDrawer} from "./sections/cart-drawer";
export {CountdownTimer, CountdownTimerFlip} from "./sections/countdown-timer";
export {FeaturedCollectionsTabs} from "./sections/featured-collections";
export {Header, HeaderDropdownMenu, HeaderMegaMenu, HeaderMenuDrawer, HeaderMenuDrawerPanel, HeaderMenuDropdownSidebar} from "./sections/header";
export {FeaturedLinks, FeaturedLinksImageCursor} from "./sections/featured-links";
export {LinksWithImage, LinksWithImageCarousel} from "./sections/links-with-image";
export {LogoList} from "./sections/logo-list";
export {SearchResultPanel} from "./sections/main-search";
export {MultiColumn} from "./sections/multi-column";
export {NewsModal, NewsPanelToggleButton, NewsModalPanel, NewsModalButton} from "./sections/news-modal";
export {NewsletterPopup} from "./sections/newsletter-popup";
export {PressCarousel} from "./sections/press";
export {ProductRecommendations} from "./sections/product-recommendations";
export {ReadingText} from "./sections/reading-text";
export {RecentlyViewedProducts} from "./sections/recently-viewed-products";
export {Slideshow} from "./sections/slideshow";
export {DynamicGrid} from "./sections/dynamic-grid";
export {TestimonialsCarousel} from "./sections/testimonials";
export {Timeline} from "./sections/timeline";

/* Imports */
import {Delegate} from "vendor";

(() => {
  const delegateDocument = (new Delegate(document.documentElement));

  /**
   * Allow to add smooth scroll on a given hash link
   */
  delegateDocument.on('click', 'a[href*="#"]', (event, target) => {
    if (event.defaultPrevented || target.matches('[allow-hash-change]') || target.pathname !== window.location.pathname || target.search !== window.location.search) {
      return; // Discard if the anchor tag is on a different page
    }

    const url = new URL(target.href);

    if (url.hash === '') {
      return;
    }

    const anchorElement = document.querySelector(url.hash);

    if (anchorElement) {
      event.preventDefault();
      anchorElement.scrollIntoView({block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: no-preference)').matches ? 'smooth' : 'auto'});

      // Because we prevent the normal hash change, we emit a fake event "hashchange:simulate" to notify it
      document.documentElement.dispatchEvent(new CustomEvent('hashchange:simulate', {bubbles: true, detail: {hash: url.hash}}));
    }
  });

  /**
   * To preserve pinch to zoom on Android device, we set a maximum-scale of 5 (which is also recommended for Lighthouse).
   * The issue is that, on iOS, if form input font size is less than 16px, iOS will force a zoom on input, which is
   * quite annoying for user experience. As a consequence, we detect iOS here, and manually change the viewport
   */
  if (navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform)) {
    document.head.querySelector('meta[name="viewport"]').content = "width=device-width, initial-scale=1.0, height=device-height, minimum-scale=1.0, maximum-scale=1.0";
  }

  /**
   * By default, we do not make table scroll on mobile. However, some merchants want to do that, so to make support easier,
   * we wrap each table around a wrapper, which allows our support team to easily add a custom code
   */

  Array.from(document.querySelectorAll('.prose table')).forEach((table) => {
    table.outerHTML = '<div class="table-scroller">' + table.outerHTML + '</div>';
  });
})();
