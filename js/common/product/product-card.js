import {createMediaImg} from "../utilities";
import {Delegate} from "vendor";

/**
 * This custom element is used for the product card
 */
export class ProductCard extends HTMLElement {
  #delegate = new Delegate(this);

  connectedCallback() {
    this.#delegate.on('change', '.product-card__swatch-list [type="radio"]', this.#onSwatchChanged.bind(this));
    this.#delegate.on('pointerover', '.product-card__swatch-list [type="radio"] + label', this.#onSwatchHovered.bind(this), true);
  }

  disconnectedCallback() {
    this.#delegate.off();
  }

  async #onSwatchHovered(event, target) {
    const control = target.control;
    const primaryMediaElement = this.querySelector('.product-card__image--primary')

    if (control.hasAttribute('data-variant-media')) {
      this.#createMediaImg(JSON.parse(control.getAttribute('data-variant-media')), primaryMediaElement.className, primaryMediaElement.sizes); // Preload the image
    }
  }

  async #onSwatchChanged(event, target) {
    // First, we update the URL
    if (target.hasAttribute('data-product-url')) {
      this.querySelectorAll(`a[href^="${Shopify.routes.root}products/"`).forEach(link => {
        link.href = target.getAttribute('data-product-url');
      });
      
      this.querySelector('quick-buy-modal')?.setAttribute('product-url', target.getAttribute('data-product-url'));
    } else if (target.hasAttribute('data-variant-id')) {
      this.querySelectorAll(`a[href^="${Shopify.routes.root}products/"`).forEach(link => {
        const url = new URL(link.href);
        url.searchParams.set('variant', target.getAttribute('data-variant-id'));
        link.href = `${url.pathname}${url.search}${url.hash}`;
      });

      const quickBuyModal = this.querySelector('quick-buy-modal');

      if (quickBuyModal) {
        const url = quickBuyModal.getAttribute('product-url').split('?')[0];
        quickBuyModal.setAttribute('product-url', `${url}?variant=${target.getAttribute('data-variant-id')}`);
      }
    }

    // Then we update the images
    if (!target.hasAttribute('data-variant-media')) {
      return;
    }
    
    let newMedia = JSON.parse(target.getAttribute('data-variant-media')),
      primaryMediaElement = this.querySelector('.product-card__image--primary'),
      secondaryMediaElement = this.querySelector('.product-card__image--secondary'),
      newPrimaryMediaElement = this.#createMediaImg(newMedia, primaryMediaElement.className, primaryMediaElement.sizes),
      newSecondaryMediaElement = null;

    if (target.hasAttribute('data-variant-secondary-media')) {
      let newSecondaryMedia = JSON.parse(target.getAttribute('data-variant-secondary-media'));
      newSecondaryMediaElement = this.#createMediaImg(newSecondaryMedia, secondaryMediaElement.className, secondaryMediaElement.sizes);
      newSecondaryMediaElement.ariaHidden = 'true';
    }

    if (primaryMediaElement.src !== newPrimaryMediaElement.src) {
      // We first add into the DOM the alternate image (if exists) to allow the browser to preload it
      if (secondaryMediaElement && newSecondaryMediaElement) {
        secondaryMediaElement.replaceWith(newSecondaryMediaElement);
      }
      
      // Transition the primary image
      const shouldTransition = target.closest('.product-card__info') !== null;
      
      if (shouldTransition) {
        await primaryMediaElement.animate({opacity: [1, 0]}, {duration: 150, easing: 'ease-in', fill: 'forwards'}).finished;
        await new Promise(resolve => newPrimaryMediaElement.complete ? resolve() : newPrimaryMediaElement.onload = () => resolve());
      }
        
      primaryMediaElement.replaceWith(newPrimaryMediaElement);
      
      if (shouldTransition) {
        newPrimaryMediaElement.animate({opacity: [0, 1]}, {duration: 150, easing: 'ease-in'});
      }
    }
  }

  #createMediaImg(media, className, sizes) {
    return createMediaImg(media, [200, 300, 400, 500, 600, 700, 800, 1000, 1200, 1400, 1600, 1800], {class: className, sizes});
  }
}

if (!window.customElements.get('product-card')) {
  window.customElements.define('product-card', ProductCard);
}