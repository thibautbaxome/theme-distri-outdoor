import {animate, animateSequence, scroll, stagger, inView} from "vendor";

export class ReadingText extends HTMLElement {
  #resizeObserver = new ResizeObserver(this.#calculateScrollingHeight.bind(this));
  #enterEffectDone = false;

  connectedCallback() {
    inView(this, this.#setupEffect.bind(this), {margin: '50% 0% 50% 0%'}); // Allow to initialize a bit before it is visible

    if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
      inView(this, this.#showEnterEffect.bind(this), {margin: '-50% 0% -50% 0%'});
    }
  }

  disconnectedCallback() {
    this.#resizeObserver?.disconnect();
  }

  get #textStartOpacity() {
    return parseFloat(this.getAttribute('text-start-opacity'));
  }

  get #lines() {
    return this.querySelector('split-lines')?.lines;
  }

  get #chars() {
    return this.#lines?.flatMap(line => Array.from(line.children));
  }

  get #animatableElements() {
    return [this.querySelector('.subheading'), ...this.#lines].filter(item => item !== null);
  }

  #setupEffect() {
    this.#resizeObserver.observe(this);
  }

  // Create the effect performed when the section becomes visible in the viewport
  #showEnterEffect() {
    if (!this.#enterEffectDone) {
      this.querySelector('[reveal-on-scroll]')?.removeAttribute('reveal-on-scroll');

      this.#enterEffectDone = true;

      const timelineSteps = [
        [
          this.#animatableElements, 
          { opacity: [0, 1], transform: ['translateY(1em)', 'translateY(0)'] }, 
          { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: stagger(0.08) }
        ]
      ];

      if (this.querySelector('.button')) {
        timelineSteps.push([
          this.querySelector('.button'),
          { opacity: [0, this.#textStartOpacity], transform: ['translateY(1em)', 'translateY(0)'] }, 
          { duration: 0.6, at: 0.6, ease: [0.22, 1, 0.36, 1] }
        ]);
      }
    
      animateSequence(timelineSteps);
    }

    return this.#showLeaveEffect.bind(this);
  }

  // Create an effect when the section is left from the top
  #showLeaveEffect(leaveInfo) {
    if (leaveInfo.boundingClientRect.top < 0) {
      return; // If superior to zero this means we left from the bottom, so we don't trigger the leave animation
    }

    animateSequence([
      [
        [...this.#animatableElements, this.querySelector('.button')].filter(item => item !== null),
        { opacity: [null, 0], transform: ['translateY(0)', 'translateY(0.2em)'] },
        { duration: 0.2 }
      ]
    ]);

    this.#enterEffectDone = false;
  }

  // Setup the different timelines to perform the reveal animation on letters on scroll
  #startLettersAnimation() {
    const lettersToSimultaenouslyReveal = 15;
    const step = 100 / (this.#chars.length + lettersToSimultaenouslyReveal);

    if (window.ViewTimeline) {
      const timeline = new ViewTimeline({
        subject: this,
        axis: 'block',
        inset: `${getComputedStyle(this).getPropertyValue('--sticky-area-height')} 0px`
      });

      [...this.#chars, this.querySelector('.button')].forEach((item, index) => {
        // Ensure existing animations are all cancelled if this is called more than once
        item?.getAnimations().forEach(animation => animation.cancel());

        item?.animate({
          opacity: [this.#textStartOpacity, 1]
        }, {
          fill: 'both',
          timeline: timeline,
          rangeStart: `contain ${index * step}%`,
          rangeEnd: `contain ${(index + (lettersToSimultaenouslyReveal + 1)) * step}%`
        });
      });
    } else {
      [...this.#chars, this.querySelector('.button')].forEach((item, index) => {
        scroll(
          animate(item, {opacity: [this.#textStartOpacity, 1]}),
          {
            target: this,
            offset: [`${index * step}% ${(index + (lettersToSimultaenouslyReveal + 1)) * step}%`, `${(index + (lettersToSimultaenouslyReveal + 1)) * step}% ${index * step}%`]
          }
        )
      });
    }
  }

  // Calculate the section height based on the number of letters
  #calculateScrollingHeight() {
    this.style.setProperty(
      '--reading-text-scroll-height',
      `${parseFloat(this.getAttribute('reading-speed')) * this.#chars.length}vh`
    );

    this.#startLettersAnimation();
  }
}

if (!window.customElements.get('reading-text')) {
  window.customElements.define('reading-text', ReadingText);
}
