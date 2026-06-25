import {throttle} from "../utilities";

/**
 * Component that break a given text element into multiple <span> (one for each line). For performance reason, the
 * text is not automatically broke up. Instead, it is done on demand when calling the `lines` property on the custom element.
 *
 * It also supports the following options:  
 *
 * - preserve-letters: if attribute is added, each letter is separately added in the DOM (useful for animation)
 * - split-on-insert: if present, lines are immediately split as soon as it is added to the dom
 */
export class SplitLines extends HTMLElement {
  #requireSplit = true;
  #lastScreenWidth = window.innerWidth;

  constructor() {
    super();

    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(document.createRange().createContextualFragment('<slot></slot>'));

    window.addEventListener('resize', throttle(this.#onWindowResized.bind(this)));
    (new MutationObserver(this.#split.bind(this, true))).observe(this, {characterData: true, attributes: false, childList: false, subtree: true});
  }

  connectedCallback() {
    if (this.hasAttribute('split-on-insert')) {
      this.#split();
    }
  }

  get lines() {
    this.#split();
    return Array.from(this.shadowRoot.children);
  }

  get #preserveLetters() {
    return this.hasAttribute('preserve-letters');
  }

  #split(force = false) {
    if (!this.#requireSplit && !force) {
      return; // No need to re-split if already done, unless forced
    }

    // We then split by letters
    this.shadowRoot.innerHTML = this.textContent.replace(/./g, '<span part="letter">$&</span>').replace(/\s/g, ' ');

    // Calculate the bounds for each letter (map allow to preserve order of insertion, compared to plain object)
    const bounds = new Map();

    Array.from(this.shadowRoot.children).forEach(letter => {
      const key = Math.round(letter.offsetTop);

      if (this.#preserveLetters) {
        bounds.set(key, (bounds.get(key) || '').concat(letter.outerHTML));
      } else {
        bounds.set(key, (bounds.get(key) || '').concat(letter.textContent));
      }
    });

    // Finally, we have to create one span for each line and revert original layout. The second level span is used for our animation purpose
    this.shadowRoot.replaceChildren(...Array.from(bounds.values(), line => {
      return document.createRange().createContextualFragment(`<span part="line" style="display: inline-block;">${line}</span>`);
    }));

    // It has been split so we no longer requires one
    this.#requireSplit = false;
    this.classList.add('is-split');

    // We trigger an event when the item is split, to allow elements to react
    this.dispatchEvent(new CustomEvent('split-lines:split', { bubbles: true, detail: { lines: Array.from(this.shadowRoot.children) } }));
  }

  #onWindowResized() {
    // NOTE: it would be more efficient to use ResizeObserver, but unfortunately it does not work with inline
    // elements, which is problematic in the context of this component
    if (this.#lastScreenWidth === window.innerWidth) {
      return; // No need to re-split if width of the screen has not changed
    }

    this.#split(true);
    this.#lastScreenWidth = window.innerWidth;
  }
}

if (!window.customElements.get('split-lines')) {
  window.customElements.define('split-lines', SplitLines);
}