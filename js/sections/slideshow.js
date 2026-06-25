import {animate, animateSequence} from "vendor";
import {EffectCarousel} from "../common/carousel/effect-carousel.js";

export class Slideshow extends EffectCarousel {
  #navigationButtonAnimationControls;
  #completedHighlightedHeadings = [];

  constructor() {
    super();

    this.addEventListener('carousel:change', this.#onSlideChange.bind(this));
    
    if (this.player) {
      this.player.addEventListener('player:start', this.#onPlayerStart.bind(this));
      this.player.addEventListener('player:pause', this.#onPlayerPause.bind(this));
      this.player.addEventListener('player:stop', this.#onPlayerStop.bind(this));
      this.player.addEventListener('player:resume', this.#onPlayerResume.bind(this));
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this.#onSlideChange({ detail: { cell: this.selectedCell } }); // On first load we simulate a slide change to start the video if needed

    // If the first slide contains highlighted headings, we add them to the list of already animated headings to avoid doing that twice
    this.#completedHighlightedHeadings.push(...Array.from(this.selectedCell.querySelectorAll('highlighted-heading')));
  }

  get blockChangeWhenTransitioning() {
    return this.#effect !== 'fade';
  }

  get #effect() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return 'fade'; // Ensure that we use a simple fade effect when the user prefers reduced motion
    }

    return this.getAttribute('transition');
  }

  /**
   * If the slide is a video, we return the video duration instead of the default slide duration
   */
  async getPlayerDurationForSlide(slide) {
    if (slide.getAttribute('data-slide-type') === 'video') {
      const video = Array.from(slide.querySelectorAll('video')).filter(video => video.offsetParent !== null).pop();

      if (isNaN(video.duration)) {
        // If the video metadata is not loaded yet, we have to wait for the metadata to be loaded
        await new Promise(resolve => {
          video.onloadedmetadata = () => resolve();
        });
      }

      return video.duration;
    }

    return super.getPlayerDurationForSlide(slide);
  }

  /**
   * Reference for animations: https://tympanus.net/Development/SlideshowAnimations/index.html
   */
  createOnChangeAnimationControls(fromSlide, toSlide, {direction} = {}) {
    let flip;
    let toSlideHighlightedHeadings = Array.from(toSlide.querySelectorAll('highlighted-heading'));
    
    // If the animation has already been revealed at least one, we filter them
    toSlideHighlightedHeadings = toSlideHighlightedHeadings.filter(heading => !this.#completedHighlightedHeadings.includes(heading));

    // We hide any effect on the highlighted headings before we start the animation
    toSlideHighlightedHeadings.forEach(highlightedHeading => highlightedHeading.hideEffect());

    let animationControls;

    switch (this.#effect) {
      case 'fade':
        // Fade is the default effect so we just return the default animation
        animationControls = super.createOnChangeAnimationControls(fromSlide, toSlide, {direction});
        break;

      case 'vertical_reveal':
        flip = direction === 'next'
          ? (document.dir === 'rtl' ? -1 : 1)
          : (document.dir === 'rtl' ? 1 : -1);

        animationControls = animateSequence([
          [fromSlide, { transform: ['translateY(0)', `translateY(${flip * -100}%)`] }, { duration: 0.3, ease: [0.55, 0.085, 0.68, 0.53], at: 0 }],
          [fromSlide.firstElementChild, { transform: ['translateY(0)', `translateY(${flip * 75}%)`] }, { duration: 0.3, ease: [0.55, 0.085, 0.68, 0.53], at: 0 }],
          {name: 'middle', at: '+0.1'},
          [toSlide, { transform: [`translateY(${flip * 100}%)`, 'translateY(0)'], opacity: [1, 1] }, { duration: 0.7, ease: [0.19, 1, 0.22, 1], at: 'middle' }],
          [toSlide.firstElementChild, { transform: [`translateY(${flip * -75}%)`, 'translateY(0)'] }, { duration: 0.7, ease: [0.19, 1, 0.22, 1], at: 'middle' }]
        ]);

        break;

      case 'curtain':
        flip = direction === 'next'
          ? (document.dir === 'rtl' ? -1 : 1)
          : (document.dir === 'rtl' ? 1 : -1);

        animationControls = animateSequence([
          [fromSlide, { transform: ['translateX(0)', `translateX(${flip * -100}%)`] }, { ease: [0.770, 0, 0.175, 1], at: 0 }],
          [fromSlide.firstElementChild, { transform: ['translateX(0)', `translateX(${flip * 30}%)`] }, { ease: [0.770, 0, 0.175, 1], at: 0 }],
          [toSlide, { transform: [`translateX(${flip * 100}%)`, 'translateX(0)'] }, { ease: [0.770, 0, 0.175, 1], at: 0 }],
          [toSlide.firstElementChild, { transform: [`translateX(${flip * -30}%)`, 'translateX(0)'] }, { ease: [0.770, 0, 0.175, 1], at: 0 }]
        ], {
          duration: window.innerWidth < 699 ? 0.8 : 1
        });

        break;

      case 'distortion':
        flip = direction === 'next'
          ? (document.dir === 'rtl' ? -1 : 1)
          : (document.dir === 'rtl' ? 1 : -1);

        if (direction === 'next' || (direction.dir === 'rtl' && direction === 'prev')) {
          fromSlide.firstElementChild.style.transformOrigin = '100% 50%';
          toSlide.firstElementChild.style.transformOrigin = '0% 50%';
        } else {
          fromSlide.firstElementChild.style.transformOrigin = '0% 50%';
          toSlide.firstElementChild.style.transformOrigin = '100% 50%';
        }
        
        animationControls = animateSequence([
          [fromSlide, { transform: ['translateX(0)', `translateX(${flip * -100}%)`] }, { ease: [0.645, 0.045, 0.355, 1], at: 0 }],
          [fromSlide.firstElementChild, { transform: ['scaleX(1)', 'scaleX(2.5)'] }, { ease: [0.645, 0.045, 0.355, 1], at: 0 }],
          [toSlide, { transform: [`translateX(${flip * 100}%)`, 'translateX(0)'] }, { ease: [0.645, 0.045, 0.355, 1], at: 0 }],
          [toSlide.firstElementChild, { transform: [`translateX(${flip * -100}%) scaleX(2.5)`, 'translateX(0) scaleX(1)'] }, { ease: [0.645, 0.045, 0.355, 1], at: 0 }]
        ], {
          duration: window.innerWidth < 699 ? 0.6 : 0.8,
        });

        break;

      case 'perspective':
        animationControls = animateSequence([
          [fromSlide, { transform: ['scale(1)', 'scale(0.9)'], opacity: [1, 0.3] }, { duration: 0.15, ease: [0.445, 0.05, 0.55, 0.95] }],
          {name: 'middle', at: '+0.1'},
          [fromSlide, { transform: ['translateY(0) scale(0.9)', `translateY(-20%) scale(0.9)`], opacity: [0.3, 0] }, { at: 'middle', ease: [0.770, 0, 0.175, 1] }],
          [toSlide, { transform: [`translateY(100%) scale(1)`, `translateY(0) scale(1)`], opacity: [1, 1] }, { at: 'middle', ease: [0.770, 0, 0.175, 1] }],
          [toSlide.firstElementChild, { transform: [`translateY(-50%)`, 'translateY(0)'] }, { at: 'middle', ease: [0.770, 0, 0.175, 1] }]
        ], {
          duration: 0.7
        });

        break;

      case 'scale_down':
        flip = direction === 'next'
          ? (document.dir === 'rtl' ? -1 : 1)
          : (document.dir === 'rtl' ? 1 : -1);

        animationControls = animateSequence([
          [fromSlide, { opacity: [1, 0], transform: ['scale(1)', `scale(0.7)`] }, { duration: 0.5, ease: [0.645, 0.045, 0.355, 1], at: 0 }],
          [toSlide, { opacity: [1, 1], transform: [`translateY(${flip * 100}%)`, 'translateY(0)'] }, { duration: 0.7, ease: [0.645, 0.045, 0.355, 1], at: '<' }]
        ]);

        break;
    }

    return animationControls.then(() => {
      // We perform the highlight heading animation (if any)
      toSlideHighlightedHeadings.forEach(highlightedHeading => highlightedHeading.restartEffect());
      this.#completedHighlightedHeadings.push(...toSlideHighlightedHeadings);
    });
  }

  #onSlideChange(event) {
    this.querySelectorAll('video-media').forEach(video => {
      customElements.upgrade(video); // Needed to work with re-rendering of sections in the theme editor
      video.pause(); // Pause any video
    });

    if (event.detail.cell.getAttribute('data-slide-type') === 'video') {
      event.detail.cell.querySelectorAll('video-media').forEach(video => video.play({ restart: true })); // Play video of the active slide
    }
  }

  #onPlayerStart(event) { 
    // If there is a pending animation for another control, we finish it immediately
    this.#navigationButtonAnimationControls?.complete();

    requestAnimationFrame(() => {
      this.querySelectorAll('.scroll-marker[aria-current="false"] .scroll-marker-group__line-progress').forEach(button => button.style.transform = null);
    });
    
    this.#navigationButtonAnimationControls = animate(
      this.querySelectorAll('.scroll-marker[aria-current="true"] .scroll-marker-group__line-progress'),
      {
        transform: ['scaleX(0)', 'scaleX(1)']
      }, 
      {
        duration: event.detail.duration, 
        ease: 'linear'
      }
    );
  }

  #onPlayerStop() {
    this.#navigationButtonAnimationControls?.complete();
  }

  #onPlayerPause() {
    this.#navigationButtonAnimationControls?.pause();
    this.selectedCell.querySelectorAll('video-media').forEach(video => video.pause()); // Pause any video
  }

  #onPlayerResume() {
    this.#navigationButtonAnimationControls?.play();
    this.selectedCell.querySelectorAll('video-media').forEach(video => video.play()); // Play any video
  }
}

if (!window.customElements.get('slideshow-carousel')) {
  window.customElements.define('slideshow-carousel', Slideshow);
}