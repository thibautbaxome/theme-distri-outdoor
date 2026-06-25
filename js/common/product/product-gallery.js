import {PhotoSwipeLightbox} from "vendor";
import { ScrollCarousel } from "../carousel";
import {matchesMediaQuery, deepQuerySelector} from "../utilities";

/**
 * Product gallery is a custom element wrapping the gallery, thumbnails, AR button... and acting as a conductor to
 * synchronize the different elements together. It is therefore a rather complex component that must be modified
 * with extreme care!
 *
 * It supports the following attributes:
 *
 * - form: the ID of the form on which the gallery is listening to update images
 * - allow-zoom: if available it will allow zoom on the image. This attribute accepts an integer representing the max zoom factor
 *
 * This exposes the following methods:
 *
 * - openLightBox: open the lightbox of zoomed image at the given index (or the default selected index)
 */
export class ProductGallery extends HTMLElement {
  #abortController;
  #photoSwipeInstance;
  #onGestureChangedListener = this.#onGestureChanged.bind(this);
  #settledMedia; /* Keep track of the currently settled media */

  constructor() {
    super();
    this.addEventListener('lightbox:open', (event) => this.openLightBox(event?.detail?.index));
  }

  connectedCallback() {
    this.#abortController = new AbortController();

    if (!this.carousel) {
      return; /* If, for any reason, we do not have any carousel, we can't do anything */
    }

    const form = document.forms[this.getAttribute('form')];

    form.addEventListener('product:rerender', this.#onSectionRerender.bind(this), {signal: this.#abortController.signal} );
    form.addEventListener('variant:change', this.#onVariantChange.bind(this), {signal: this.#abortController.signal});

    this.carousel.addEventListener('carousel:change', this.#onMediaChange.bind(this), {signal: this.#abortController.signal});
    this.carousel.addEventListener('carousel:settle', this.#onMediaSettle.bind(this), {signal: this.#abortController.signal});
    this.carousel.addEventListener('click', this.#onCarouselClick.bind(this), {signal: this.#abortController.signal});

    if (this.hasAttribute('allow-zoom')) {
      this.carousel.addEventListener('gesturestart', this.#onGestureStart.bind(this), {capture: false, signal: this.#abortController.signal});
    }

    // We call the "onMediaChange" method the first time to do some initialization code
    this.#onMediaChange();
  }

  disconnectedCallback() {
    this.#abortController.abort();
  }

  get viewInSpaceButton() {
    return this.querySelector('[data-shopify-xr]');
  }

  get carousel() {
    return this.querySelector('.product-gallery__carousel');
  }

  get customCursor () {
    return this.querySelector('.custom-cursor');
  }

  /**
   * Create the PhotoSwipe instance if it does not already exist. This is done on demand, so until the lightbox is
   * open, nothing is created to not impact performance
   */
  get lightBox() {
    if (this.#photoSwipeInstance) {
      return this.#photoSwipeInstance;
    }

    this.#photoSwipeInstance = new PhotoSwipeLightbox({
      pswpModule: () => import("photoswipe"),
      bgOpacity: 1,
      mainClass: `color-scheme--${this.getAttribute('zoom-color-scheme-id')}`, // This outputs the CSS variables for the color scheme
      maxZoomLevel: parseInt(this.getAttribute('allow-zoom')) || 3,
      closeTitle: window.themeVariables.strings.closeGallery,
      zoomTitle: window.themeVariables.strings.zoomGallery,
      errorMsg: window.themeVariables.strings.errorGallery,

      // UX
      arrowPrev: false,
      arrowNext: false,
      counter: false,
      close: false,
      zoom: false
    });

    // Register UI elements
    this.#photoSwipeInstance.on('uiRegister', this.#registerLightboxUi.bind(this));

    // The filter allow to map an item in the data source to an item in the gallery, and do a nice opening
    this.#photoSwipeInstance.addFilter('thumbEl', (thumbEl, data) => data.thumbnailElement);

    // Finally, we can initialize the PhotoSwipe instance
    this.#photoSwipeInstance.init();

    return this.#photoSwipeInstance;
  }

  get filteredIndexes() {
    return JSON.parse(this.getAttribute('filtered-indexes')).map(index => parseInt(index) - 1);
  }

  /**
   * Open the lightbox at the given index (by default, it opens the selected image)
   */
  openLightBox(index) {
    const images = this.carousel.cells.flatMap(cell => Array.from(cell.querySelectorAll(':scope > img')));

    const dataSource = images.map(image => {
      return {
        thumbnailElement: image,
        src: image.src,
        srcset: image.srcset,
        msrc: image.currentSrc || image.src,
        width: parseInt(image.getAttribute('width')),
        height: parseInt(image.getAttribute('height')),
        alt: image.alt,
        thumbCropped: true
      }
    });

    const imageCells = this.carousel.cells.filter(cell => cell.getAttribute('data-media-type') === 'image');

    this.lightBox.loadAndOpen(index ?? imageCells.indexOf(this.carousel.selectedCell), dataSource);
  }

  /**
   * Add custom elements to PhotoSwipe gallery
   */
  #registerLightboxUi() {
    this.#photoSwipeInstance.pswp.ui.registerElement({
      name: 'close-button circle-button circle-button--xl',
      className: '',
      ariaLabel: window.themeVariables.strings.closeGallery,
      order: 2,
      isButton: true,
      html: `
      <svg aria-hidden="true" focusable="false" fill="none" width="14" class="icon" viewBox="0 0 16 16">
        <path d="m1 1 14 14M1 15 15 1" stroke="currentColor" stroke-width="1"/>
      </svg>
      `,
      onClick: () => {
        this.#photoSwipeInstance.pswp.close();
      }
    });

    if (this.#photoSwipeInstance.pswp.options.dataSource.length > 1) {
      this.#photoSwipeInstance.pswp.ui.registerElement({
        name: 'previous-button circle-button circle-button--xl',
        className: '',
        ariaLabel: window.themeVariables.strings.previous,
        order: 1,
        isButton: true,
        html: `
        <svg aria-hidden="true" focusable="false" width="12" class="icon icon--direction-aware" viewBox="0 0 36 36">
          <path fill="none" stroke="currentColor" stroke-width="2" d="M35 18H3M19.5 34.5 3 18 19.5 1.5"/>
        </svg>
        `,
        onClick: () => {
          this.#photoSwipeInstance.pswp.prev();
        }
      });

      this.#photoSwipeInstance.pswp.ui.registerElement({
        name: 'next-button circle-button circle-button--xl',
        className: '',
        ariaLabel: window.themeVariables.strings.next,
        order: 3,
        isButton: true,
        html: `
        <svg aria-hidden="true" focusable="false" width="12" class="icon icon--direction-aware" viewBox="0 0 36 36">
          <path fill="none" stroke="currentColor" stroke-width="2" d="M1 18h32M16.5 1.5 33 18 16.5 34.5"/>
        </svg>
        `,
        onClick: () => {
          this.#photoSwipeInstance.pswp.next();
        }
      });
    }
  }

  /**
   * When the section is re-rendered upon variant changes, the media might have been filtered
   */
  #onSectionRerender(event) {
    const galleryMarkup = deepQuerySelector(event.detail.htmlFragment, `${this.tagName}[form="${this.getAttribute('form')}"]`);
    
    if (!galleryMarkup) {
      return;
    }

    if (galleryMarkup.filteredIndex !== this.filteredIndexes) {
      // Ensure that we filter the current carousel with the new indexes
      this.carousel.filter(galleryMarkup.filteredIndexes);
      this.setAttribute('filtered-indexes', galleryMarkup.getAttribute('filtered-indexes'));

      if (matchesMediaQuery('md')) {
        // Set new index on button zoom when layout desktop is set to grid
        let buttonIndex = 0;

        Array.from(this.carousel.cells).forEach((item, index) => {
          if (item.getAttribute('data-media-type') === 'image') {
            item.querySelector('.product-zoom-button')?.parentElement.setAttribute('image-index', buttonIndex.toString());
            buttonIndex += 1;
          }
        })
      }
    }
  }

  /**
   * When the variant changes, we check the alt tags for each media and filter them
   */
  #onVariantChange(event) {
    if (!event.detail.variant) {
      return; // If the variant is unavailable (no combination exists), we immediately return
    }
    
    if (event.detail.variant['featured_media'] && event.detail.previousVariant?.['featured_media']?.['id'] !== event.detail.variant['featured_media']['id']) {
      // The position expresses its position among all the possible images. However, due to filtering, some images may
      // not be visible, so we have to map this
      const position = event.detail.variant['featured_media']['position'] - 1,
        filteredIndexBelowPosition = this.filteredIndexes.filter(filteredIndex => filteredIndex < position);

      if (this.carousel.isScrollable) {
        this.carousel.select(position - filteredIndexBelowPosition.length, {instant: true});
      } else {
        this.querySelector(`[data-media-id="${event.detail.variant['featured_media']['id']}"]`)?.scrollIntoView({block: 'start', behavior: 'smooth'});
      }
    }
  }

  /**
   * When the media is about to change, we perform some logic
   */
  #onMediaChange() {
    // The currently settled media is changing, so we perform some logic, such as turning off media
    if (!this.#settledMedia) {
      return;
    }

    if (this.customCursor) {
      this.customCursor.toggleAttribute('hidden', this.carousel.selectedCell.getAttribute('data-media-type') !== 'image');
    }

    if (this.querySelector('.product-zoom-button')) {
      this.querySelector('.product-zoom-button').parentElement.toggleAttribute('hidden', this.carousel.selectedCell.getAttribute('data-media-type') !== 'image')
    }

    switch (this.#settledMedia.getAttribute('data-media-type')) {
      case 'external_video':
      case 'video':
      case 'model':
        this.#settledMedia.firstElementChild.pause();
    }
  }

  /**
   * When the media settles, we have to update various elements such as the AR button, the autoplay strategy...
   */
  #onMediaSettle(event) {
    const media = event ? event.detail.cell : this.carousel.selectedCell;

    switch (media.getAttribute('data-media-type')) {
      case 'image':
        this.viewInSpaceButton?.setAttribute('data-shopify-model3d-id', this.viewInSpaceButton?.getAttribute('data-shopify-model3d-default-id'));
        break;

      case 'external_video':
      case 'video':
        this.viewInSpaceButton?.setAttribute('data-shopify-model3d-id', this.viewInSpaceButton?.getAttribute('data-shopify-model3d-default-id'));

        if (this.hasAttribute('autoplay-media')) {
          media.firstElementChild.play();
        }

        break;

      case 'model':
        if (matchesMediaQuery('md')) {
          media.firstElementChild.play(); // As per Shopify guidelines it must not autoplay on mobile and tablet
        }

        this.viewInSpaceButton?.setAttribute('data-shopify-model3d-id', event.detail.cell.getAttribute('data-media-id'));

        break;
    }

    this.#settledMedia = media;
  }

  /**
   * Detect a click on an image on desktop, and open the lightbox for the corresponding image
   */
  #onCarouselClick(event) {
    if (this.customCursor) {
      if (event.target.matches('button, a[href], button :scope, a[href] :scope') || !window.matchMedia('screen and (pointer: fine)').matches) {
        return;
      }

      if (this.carousel.selectedCell.getAttribute('data-media-type') !== 'image') {
        return; // The next/prev should be disabled for other media than images
      }

      const rect = event.currentTarget.getBoundingClientRect(),
        offsetX = event.clientX - rect.left;

      offsetX > this.carousel.clientWidth / 2 ? this.carousel.next() : this.carousel.previous();
    }
  }

  /**
   * For iOS devices only, we use the gesturechange event to easily detect a "pinch to zoom"
   */
  #onGestureStart(event) {
    event.preventDefault();
    this.carousel.addEventListener('gesturechange', this.#onGestureChangedListener, {capture: false, signal: this.#abortController.signal});
  }

  #onGestureChanged(event) {
    // This is a iOS only feature that allows to natively detects pinch to zoom. We use it as a progressive enhancement
    event.preventDefault();

    if (event.scale > 1.5) {
      this.dispatchEvent(new CustomEvent('lightbox:open', {bubbles: true, detail: {index: this.carousel.selectedIndex}}));
      this.removeEventListener('gesturechange', this.#onGestureChangedListener);
    }
  }
}

/**
 * Custom button that open the lightbox
 */
export class OpenLightBoxButton extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', () => this.dispatchEvent(new CustomEvent('lightbox:open', {bubbles: true, detail: {index: this.hasAttribute('image-index') ? parseInt(this.getAttribute('image-index')) : null}})));
  }
}

if (!window.customElements.get('product-gallery')) {
  window.customElements.define('product-gallery', ProductGallery);
}

if (!window.customElements.get('open-lightbox-button')) {
  window.customElements.define('open-lightbox-button', OpenLightBoxButton);
}