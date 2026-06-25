import {inView} from "vendor";

/**
 * Create a SVG filter effect to simulate a pencil style. More info can be found here: https://css-tricks.com/creating-a-pencil-effect-in-svg/
 */
function createPencilFilter(id) {
  return `
    <defs>
      <filter x="-5%" y="-5%" width="110%" height="110%" filterUnits="objectBoundingBox" id="${id}">
        <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="5" stitchTiles="stitch" result="t1"></feTurbulence>
        <feColorMatrix type="matrix" values="0 0 0 0 0, 0 0 0 0 0, 0 0 0 0 0, 0 0 0 -1.5 1.5" result="t2"></feColorMatrix>
        <feComposite operator="in" in2="t2" in="SourceGraphic" result="SourceTextured"></feComposite>
        <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="3" seed="1" result="f1"></feTurbulence>
        <feDisplacementMap xChannelSelector="R" yChannelSelector="G" scale="2.5" in="SourceTextured" in2="f1" result="f4"></feDisplacementMap>
      </filter>
    </defs>
  `;
}

function createCircleSvg(pencilStyle = false) {
  const filterId = crypto.randomUUID();

  return `
    <svg part="shape circle-shape" preserveAspectRatio="none" viewBox="0 0 239 112" fill="none">
      ${pencilStyle ? createPencilFilter(filterId) : ''}
      <path part="path" ${pencilStyle && `filter="url(#${filterId})"`} stroke="currentColor" stroke-linecap="round" stroke-width="${pencilStyle ? 3 : 2}" vector-effect="non-scaling-stroke" d="M209.793 7.563c-3.761-.066-7.336-.809-11.059-1.198-10.522-1.1-21.334-1.187-31.894-1.589-17.861-.68-35.657-.632-53.487.755-17.875 1.39-36.15 3.045-53.724 6.72-17.695 3.699-32.947 11.442-45.652 24.193C8.604 41.836 3.724 46.924 1.712 54.49c-1.766 6.646-.057 13.37 3.04 19.376 7.31 14.176 24.289 21.161 38.576 25.938 31.322 10.471 65.275 12.613 98.066 10.417 18.208-1.22 36.408-3.315 54.221-7.344 9.566-2.164 19.614-4.969 28.225-9.844 9.515-5.388 15.133-14.411 14.02-25.392-1.145-11.3-8.044-20.744-15.828-28.594-15.36-15.49-37.406-23.105-58.153-28.569C140.302 4.271 116.23 1 91.863 1"/>
    </svg>
  `;
}

function createUnderlineSvg(pencilStyle = false) {
  const filterId = crypto.randomUUID();

  return `
    <svg part="shape underline-shape" preserveAspectRatio="none" viewBox="0 0 215 14" fill="none">
      ${pencilStyle ? createPencilFilter(filterId) : ''}
      <path part="path" ${pencilStyle && `filter="url(#${filterId})"`} stroke="currentColor" stroke-linecap="round" stroke-width="${pencilStyle ? 3 : 2}" vector-effect="non-scaling-stroke" d="M1 1c20.54 2.356 41.237 2.634 61.957 2.703 25.31.085 50.625.028 75.928-.467 19.199-.376 38.386-1.092 57.584-1.503 5.836-.125 11.686-.278 17.526-.278.17 0-4.327.618-4.547.644-29.274 3.52-58.822 5.58-88.31 7.542-26.569 1.768-53.22 2.055-79.861 2.552-2.122.039-4.269.06-6.388.176-2.502.137 4.997.4 7.505.443 46.458.782 92.838-1.125 139.285-1.125"/>
    </svg>
  `;
}

export class HighlightedHeading extends HTMLElement {
  #hasRevealed = false;

  constructor() {
    super();

    this.addEventListener('split-lines:split', this.#onSplit.bind(this));
  }

  connectedCallback() {
    if (this.#effect !== 'italic') {
      // If we show animation we reveal when the heading has crossed 25% of the screen, otherwise we preload the effect if animations are turned off
      inView(this, this.#onBecameVisible.bind(this), {margin: this.#showAnimation ? '0% 0% -15% 0%' : '1000px 0px'});
    }
  }

  /**
   * Hide the effect (which basically restores to how it was initially). This is useful when you want to manually trigger the effect again.
   */
  hideEffect() {
    const lines = Array.from(this.querySelectorAll('split-lines')).flatMap(item => item.lines);

    switch (this.#effect) {
      case 'marker':
      case 'tilted-marker':
        lines.forEach(line => {
          line.animate({ clipPath: 'inset(100%)' }, { fill: 'forwards', duration: 0, pseudoElement: '::before' });
          line.animate({ clipPath: 'inset(100%)' }, { fill: 'forwards', duration: 0, pseudoElement: '::after' });
          line.animate({ transform: 'none' }, { fill: 'forwards', duration: 0 });
        });

        break;

      case 'circle':
      case 'circle-pencil':
      case 'underline':
      case 'underline-pencil':
        lines.forEach(line => {
          line.querySelector('svg')?.remove();
        });

        break;
    }
  }

  /**
   * Manually restart the effect
   */
  restartEffect() {
    this.#doTransition({
      lines: Array.from(this.querySelectorAll('split-lines')).flatMap(item => item.lines),
      instant: false
    });
  }

  get #effect() {
    return this.getAttribute('effect');
  }

  get #showAnimation() {
    return window.themeVariables.settings.showHeadingEffectAnimation && window.matchMedia('(prefers-reduced-motion: no-preference)').matches && !this.hasAttribute('instant');
  }

  /**
   * Initialize the effect by splitting the heading.  
   */
  #onBecameVisible() {
    if (this.#effect !== 'italic') {
      this.#doTransition({
        lines: Array.from(this.querySelectorAll('split-lines')).flatMap(item => item.lines),
        instant: !this.#showAnimation
      });
    }
  }

  /**
   * Do the actual transition based on the effect
   */
  #doTransition({ lines, instant }) {
    switch (this.#effect) {
      case 'marker':
      case 'tilted-marker':
        lines.forEach((line, index) => {
          line.style.zIndex = lines.length - index;
          line.setAttribute('data-content', line.textContent);

          line.animate(
            {
              clipPath: document.dir === 'ltr' ? ['inset(0 100% 0 0)', 'inset(0 0 0 0)'] : ['inset(0 0 0 100%)', 'inset(0 0 0 0)']
            },
            {
              fill: 'forwards',
              duration: instant ? 0 : 700,
              delay: instant ? 0 : 350 * index,
              easing: 'cubic-bezier(0.85, 0, 0.15, 1)',
              pseudoElement: '::before'
            }
          );

          line.animate(
            {
              clipPath: document.dir === 'ltr' ? ['inset(0 100% 0 0)', 'inset(0 0 0 0)'] : ['inset(0 0 0 100%)', 'inset(0 0 0 0)']
            },
            {
              fill: 'forwards',
              duration: instant ? 0 : 700,
              delay: instant ? 0 : 350 * index,
              easing: 'cubic-bezier(0.85, 0, 0.15, 1)',
              pseudoElement: '::after'
            }
          );

          if (this.#effect === 'tilted-marker') {
            line.animate(
              {
                transform: ['rotate(0)', 'rotate(-4deg)']
              },
              {
                fill: 'forwards',
                duration: instant ? 0 : 700,
                delay: instant ? 0 : 350 * index,
                easing: 'cubic-bezier(0.85, 0, 0.15, 1)'
              }
            );
          }
        });

        break;

      case 'circle':
      case 'circle-pencil':
      case 'underline':
      case 'underline-pencil':
        const pencilStyle = this.#effect.includes('pencil');

        lines.forEach((line, index) => {
          line.querySelector('svg')?.remove(); // Remove any existing one
          line.insertAdjacentHTML('beforeend', this.#effect.includes('circle') ? createCircleSvg(pencilStyle) : createUnderlineSvg(pencilStyle));

          if (!instant) {
            const svg = line.querySelector('svg');
            const path = line.querySelector('path');
            const scaleFactor = Math.max(svg.getBoundingClientRect().width, svg.getBoundingClientRect().height) / Math.max(svg.getBBox().width, svg.getBBox().height);
            const adjustedPathLength = path.getTotalLength() * scaleFactor;

            path.setAttribute('stroke-dasharray', adjustedPathLength);
            path.setAttribute('stroke-dashoffset', adjustedPathLength);

            path.animate(
              {
                strokeDashoffset: [adjustedPathLength, 0]
              },
              {
                fill: 'forwards',
                easing: 'cubic-bezier(0.83, 0, 0.17, 1)',
                duration: 1000,
                delay: 500 * index
              }
            );
          }
        });
    }

    this.#hasRevealed = true;
  }

  #onSplit(event) {
    if (this.#hasRevealed) {
      this.#doTransition({ lines: event.detail.lines, instant: true });
    }
  }
}

if (!window.customElements.get('highlighted-heading')) {
  window.customElements.define('highlighted-heading', HighlightedHeading);
}