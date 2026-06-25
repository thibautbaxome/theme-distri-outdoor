/**
 * Specialized drawer that handles the quick buy feature. Contrary to standard drawers, the content is loaded asynchronously
 * for performance reason (a page may have a lot of products, so it would be too costly to preload them all).
 *
 * In order to make it work, you need to ensure that you add the "handle" attribute to the "<quick-buy-drawer>" element,
 * so that the code can properly generate the Ajax call. The product template must also ensure to contain a <template>
 * element with the ID "quick-buy-content".
 */

import {Modal} from "../overlay";
import {cachedFetch} from "../utilities";

export class QuickBuyModal extends Modal {
  constructor() {
    super();

    this.addEventListener('dialog:after-hide', this.#onAfterHide.bind(this));
  }

  get shouldAppendToBody() {
    return true;
  }

  async show() {
    const showLoadingBar = this.controls.every(control => control.querySelector('button-content') === null);

    [this, ...this.controls].forEach(control => control.setAttribute('aria-busy', 'true'));
    
    const promise = new Promise(async (resolve, reject) => {
      if (showLoadingBar) {
        document.documentElement.dispatchEvent(new CustomEvent('theme:loading:start', {bubbles: true}));
      }

      const responseContent = await (await cachedFetch(this.getAttribute('product-url'))).text();

      // The content is part of the returned HTML, we parse it and inject it into the drawer (noscript code is executed when inserted
      // dynamically, so we must make sure they are removed
      const tempDoc = (new DOMParser()).parseFromString(responseContent, 'text/html');
      const quickBuyContent = tempDoc.getElementById('quick-buy-content');
      
      // The content is inside a template so we have to clone it

      this.replaceChildren(quickBuyContent.content.cloneNode(true).firstElementChild);

      [this, ...this.controls].forEach(control => control.setAttribute('aria-busy', 'false'));

      resolve();

      if (showLoadingBar) {
        document.documentElement.dispatchEvent(new CustomEvent('theme:loading:end', {bubbles: true}));
      }
    });

    return super.show({ conditionToFulfill: promise });
  }

  #onAfterHide() {
    this.innerHTML = ''; // Restore the HTML so that it does not cause duplicate ID
  }
}

if (!window.customElements.get('quick-buy-modal')) {
  window.customElements.define('quick-buy-modal', QuickBuyModal);
}