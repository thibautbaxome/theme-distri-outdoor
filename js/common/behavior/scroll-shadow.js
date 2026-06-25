import {throttle} from "../utilities";

/**
 * Streamlined version of this: https://github.com/ingmarh/scroll-shadow-element
 */
const template = `
  <style>
    :host {
      display: block;
      contain: layout;
      position: relative;
    }
    
    :host([hidden]) {
      display: none;
    }
    
    s {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      pointer-events: none;
      margin: var(--scroll-shadow-margin, 0px);
      background-image:
        var(--scroll-shadow-top, linear-gradient(to bottom, rgb(var(--background)), rgb(var(--background) / 0))),
        var(--scroll-shadow-bottom, linear-gradient(to top, rgb(var(--background)), rgb(var(--background) / 0))),
        var(--scroll-shadow-left, linear-gradient(to right, rgb(var(--background)), rgb(var(--background) / 0))),
        var(--scroll-shadow-right, linear-gradient(to left, rgb(var(--background)), rgb(var(--background) / 0)));
      background-position: top, bottom, left, right;
      background-repeat: no-repeat;
      background-size: 100% var(--top, 0), 100% var(--bottom, 0), var(--left, 0) 100%, var(--right, 0) 100%;
    }
  </style>
  <slot></slot>
  <s part="s"></s>
`;

class Updater {
  constructor(targetElement) {
    this.scheduleUpdate = throttle(() => this.update(targetElement, getComputedStyle(targetElement)));
    this.resizeObserver = new ResizeObserver(this.scheduleUpdate.bind(this));
  }

  start(element) {
    if (this.element) {
      this.stop();
    }

    if (element) {
      element.addEventListener('scroll', this.scheduleUpdate);
      this.resizeObserver.observe(element);
      this.element = element;
    }
  }

  stop() {
    if (!this.element) {
      return;
    }

    this.element.removeEventListener('scroll', this.scheduleUpdate);
    this.resizeObserver.unobserve(this.element);
    this.element = null;
  }

  update(targetElement, style) {
    if (!this.element) {
      return;
    }

    const maxSize = style.getPropertyValue('--scroll-shadow-size') ? parseInt(style.getPropertyValue('--scroll-shadow-size')) : 30;

    const scroll = {
      top: Math.max(this.element.scrollTop, 0),
      bottom: Math.max(this.element.scrollHeight - this.element.offsetHeight - this.element.scrollTop, 0),
      left: Math.max(this.element.scrollLeft, 0),
      right: Math.max(this.element.scrollWidth - this.element.offsetWidth - this.element.scrollLeft, 0),
    }

    requestAnimationFrame(() => {
      for (const position of ['top', 'bottom', 'left', 'right']) {
        targetElement.style.setProperty(
          `--${position}`,
          `${scroll[position] > maxSize ? maxSize : scroll[position]}px`
        )
      }
    });
  }
}

export class ScrollShadow extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = template;
    this.updater = new Updater(this.shadowRoot.lastElementChild);
  }

  connectedCallback() {
    this.shadowRoot.querySelector('slot').addEventListener('slotchange', this.start);
    this.start();
  }

  disconnectedCallback() {
    this.updater.stop();
  }

  start() {
    if (this.firstElementChild) {
      this.updater.start(this.firstElementChild);
    }
  }
}

if ('ResizeObserver' in window && !window.customElements.get('scroll-shadow')) {
  window.customElements.define('scroll-shadow', ScrollShadow);
}
