import {animate, inView} from "vendor";
import {matchesMediaQuery} from "../common/utilities";

export class BeforeAfter extends HTMLElement {
  #onPointerMoveListener = this.#onPointerMove.bind(this);
  #touchStartTimestamp = 0;

  constructor() {
    super();

    this.addEventListener('pointerdown', this.#onPointerDown);
    this.addEventListener('keydown', this.#onKeyboardNavigation);
    this.addEventListener('touchstart', this.#onTouchStart, { passive: false });
  }

  connectedCallback() {
    inView(this, this.#animateInitialPosition.bind(this));
  }

  #onPointerDown(event) {
    if (event.target.tagName === 'A') {
      return; // Allow to follow the links
    }

    document.addEventListener('pointerup', this.#onPointerUp.bind(this), {once: true});

    if (matchesMediaQuery('supports-hover')) {
      document.addEventListener('pointermove', this.#onPointerMoveListener);
      this.#calculatePosition(event);
    }
  }

  #onPointerMove(event) {
    this.#calculatePosition(event);
    this.classList.add('is-dragging');
  }

  #onTouchStart(event) {
    const cursor = this.querySelector('.before-after__cursor');

    if (event.target === cursor || cursor.contains(event.target)) {
      event.preventDefault();
      document.addEventListener('pointermove', this.#onPointerMoveListener);
    } else {
      this.#touchStartTimestamp = event.timeStamp; // Save the timestamp so that we can detect tap
    }
  }

  #onPointerUp(event) {
    document.removeEventListener('pointermove', this.#onPointerMoveListener);
    this.classList.remove('is-dragging');

    if (!matchesMediaQuery('supports-hover')) {
      if (event.timeStamp - this.#touchStartTimestamp <= 250) {
        this.#calculatePosition(event); // Consider the tap only if less than 250ms
      }
    }
  }

  #onKeyboardNavigation(event) {
    if (!event.target.classList.contains('before-after__cursor') 
      || (!this.hasAttribute('vertical') && event.code !== 'ArrowLeft' && event.code !== 'ArrowRight')
      || (this.hasAttribute('vertical') && event.code !== 'ArrowUp' && event.code !== 'ArrowDown')  
    ) {
      return; // If the cursor is not focused, we don't do anything
    }

    event.preventDefault();

    let currentPosition = parseInt(this.style.getPropertyValue('--before-after-cursor-position'));
    
    if (Number.isNaN(currentPosition)) {
      currentPosition = parseInt(getComputedStyle(this).getPropertyValue('--before-after-initial-cursor-position'));
    }
  
    let newPosition;

    if (this.hasAttribute('vertical')) {
      newPosition = event.code === 'ArrowUp' ? currentPosition - 1 : currentPosition + 1;
    } else {
      newPosition = event.code === 'ArrowLeft' ? currentPosition - 1 : currentPosition + 1;
    }

    this.style.setProperty('--before-after-cursor-position', `${Math.min(Math.max(newPosition, 0), 100)}%`);
  }

  #calculatePosition(event) {
    let rectangle = this.getBoundingClientRect(),
      percentage;

    if (this.hasAttribute('vertical')) {
      percentage = ((event.clientY - rectangle.top) / this.clientHeight) * 100;
    } else {
      percentage = ((event.clientX - rectangle.left) / this.clientWidth) * 100;
      percentage = document.dir === 'rtl' ? (100 - percentage) : percentage;
    }

    this.style.setProperty('--before-after-cursor-position', `${Math.min(Math.max(percentage, 0), 100)}%`);
  }

  #animateInitialPosition() {
    if (CSS.registerProperty) {
      animate(this, { '--before-after-cursor-position': 'var(--before-after-initial-cursor-position)' }, { duration: 0.6, ease: [0.85, 0, 0.15, 1] });
    } else {
      this.style.setProperty('--before-after-cursor-position', 'var(--before-after-initial-cursor-position)');
    }
  }
}

if (!window.customElements.get('before-after')) {
  window.customElements.define('before-after', BeforeAfter);
}