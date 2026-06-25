import {animate, animateSequence} from "vendor";
import {Modal} from "../common/overlay";
import {matchesMediaQuery} from "../common/utilities";

export class NewsModal extends Modal {
  constructor() {
    super();

    this.addEventListener('dialog:before-show', this.#onBeforeShow);
    this.addEventListener('dialog:after-hide', this.#onAfterHide);
    this.addEventListener('news-modal-panel:check-unread', this.#checkUnread);
  }

  async connectedCallback() {
    super.connectedCallback();

    await customElements.whenDefined('news-modal-button');
    this.#checkUnread();
  }

  createEnterAnimationControls() {
    return animate(this.getShadowPartByName('content'), {opacity: [0, 1], transform: ['translateY(-40px)', 'translateY(0)']}, {duration: 0.15, ease: [0.86, 0, 0.07, 1]});
  }

  createLeaveAnimationControls() {
    return animate(this.getShadowPartByName('content'), {opacity: [1, 0], transform: ['translateY(0)', 'translateY(-40px)']}, {duration: 0.15, ease: [0.86, 0, 0.07, 1]});
  }

  #onBeforeShow() {
    const newsModalButton = document.querySelector(`.header [aria-controls="${this.id}"]`);
    const header = newsModalButton?.closest('.shopify-section');

    this.style.setProperty('--modal-news-margin-block-start', header?.getBoundingClientRect().top + header.offsetHeight + 'px');

    if (matchesMediaQuery('sm')) {
      this.style.setProperty('--modal-news-margin-inline-end', (document.dir === 'ltr') ? window.innerWidth - (newsModalButton?.getBoundingClientRect().left  + newsModalButton?.clientWidth) + 'px' : newsModalButton?.getBoundingClientRect().left + 'px');
    }

    if (matchesMediaQuery('sm-max')) {
      this.dispatchEvent(new CustomEvent('header:disable-transparent-header', { bubbles: true }));
    }
  }

  #onAfterHide() {
    if (matchesMediaQuery('sm-max')) {
      this.dispatchEvent(new CustomEvent('header:allow-transparent-header', { bubbles: true }));
    }

    Array.from(this.querySelectorAll('.news-modal-panel')).forEach((item) => {
      item.removeAttribute('open');
    });
  }

  #checkUnread() {
    this.dispatchEvent(new CustomEvent('news-modal:update-status', {
      detail: {
        hasUnread: Array.from(this.querySelectorAll('.news-modal-panel')).some(panel => !panel.isRead)
      },
      bubbles: true
    }));
  }
}

export class NewsPanelToggleButton extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('click', this.#onClick);
  }

  async connectedCallback () {
    await customElements.whenDefined('news-modal-panel');
    this.querySelector('button').classList.toggle('visited', this.controlledPanel.isRead);
  }

  get controlledPanel() {
    return document.getElementById(this.querySelector('button').getAttribute('aria-controls'));
  }

  #onClick() {
    this.controlledPanel.isOpen = !this.controlledPanel.isOpen;
    this.querySelector('button').classList.toggle('visited', this.controlledPanel.isRead);
    this.dispatchEvent(new CustomEvent('news-modal-panel:check-unread', {bubbles: true}));
  }
}

export class NewsModalPanel extends HTMLElement {
  #initialHeight;
  #newsModalContent = this.closest('.modal--news').shadowRoot.querySelector('[part="content"]');

  static get observedAttributes() {
    return ['open'];
  };

  constructor() {
    super();

    if (Shopify.designMode) {
      this.addEventListener('shopify:block:select', (event) => this.#show({animatePanel: !event.detail.load}));
      this.addEventListener('shopify:block:deselect', this.#hide);
    }
  }

  get controls() {
    return Array.from(this.getRootNode().querySelectorAll(`[aria-controls="${this.id}"]`)); // getRootNode ensure it works in DocumentFragment as well
  }

  get isRead() {
    return JSON.parse(localStorage.getItem('news-id-list') || '[]').includes(this.id);
  }

  get isOpen() {
    return this.hasAttribute('open');
  }

  set isOpen(value) {
    this.toggleAttribute('open', value);
  }

  #markAsRead() {
    let newsRead = JSON.parse(localStorage.getItem('news-id-list') || '[]');

    if (!this.isRead) {
      newsRead.push(this.id);
      localStorage.setItem('news-id-list', JSON.stringify(newsRead));
    }
  }

  #show({animatePanel = true} = {}) {
    this.#initialHeight = this.#newsModalContent?.offsetHeight; // Save height to restore the initial state.

    const animation = animateSequence([
      [this, {transform: ['translateY(-10px', 'translateY(0)'], opacity: [0, 1], visibility: ['hidden', 'visible']}, {duration: 0.30, ease: [0.86, 0, 0.07, 1]}],
      [this.#newsModalContent, {height: [this.#initialHeight + 'px', Math.max(this.#initialHeight, (this.scrollHeight / 1.3)) + 'px']}, {duration: 0.30, ease: [0.86, 0, 0.07, 1], at: '<'}]
    ]);

    if (!animatePanel) {
      animation.complete();
    }
  }

  #hide() {
    const animation = animateSequence([
      [this, {transform: ['translateY(0', 'translateY(-10px)'], opacity: [1, 0], visibility: ['visible', 'hidden']}, {duration: 0.30, ease: [0.86, 0, 0.07, 1]}],
      [this.#newsModalContent, {height: [Math.max(this.#initialHeight, (this.scrollHeight / 1.3)) + 'px', this.#initialHeight + 'px']}, {duration: 0.30, ease: [0.86, 0, 0.07, 1], at: '<'}]
    ])
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case 'open':
        this.controls.forEach(activator => activator.setAttribute('aria-expanded', this.isRead.toString()));

        if (oldValue === null && newValue === '') {
          this.#show();
        } else {
          this.#hide();
        }

        this.#markAsRead();

        break;
    }
  }
}

export class NewsModalButton extends HTMLElement {
  #onUpdatedListener = this.#onModalUpdated.bind(this);

  connectedCallback () {
    document.documentElement.addEventListener('news-modal:update-status', this.#onUpdatedListener);
  }

  disconnectedCallback() {
    document.documentElement.removeEventListener('news-modal:update-status', this.#onUpdatedListener);
  }

  #onModalUpdated(event) {
    this.querySelector('button').classList.toggle('active', event.detail.hasUnread);
  }
}

if (!window.customElements.get('news-modal')) {
  window.customElements.define('news-modal', NewsModal);
}

if (!window.customElements.get('news-panel-toggle-button')) {
  window.customElements.define('news-panel-toggle-button', NewsPanelToggleButton);
}

if (!window.customElements.get('news-modal-panel')) {
  window.customElements.define('news-modal-panel', NewsModalPanel);
}

if (!window.customElements.get('news-modal-button')) {
  window.customElements.define('news-modal-button', NewsModalButton);
}