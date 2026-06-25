import {animate} from "vendor";

export class AccountLogin extends HTMLElement {
  constructor() {
    super();

    window.addEventListener('hashchange', this.#switchForm.bind(this));

    if (window.location.hash === '#recover') {
      this.#loginForm.hidden = true;
      this.#recoverForm.hidden = false;
    }
  }

  get #loginForm() {
    return this.querySelector('#login');
  }

  get #recoverForm() {
    return this.querySelector('#recover');
  }

  async #switchForm() {
    const fromForm = window.location.hash === '#recover' ? this.#loginForm : this.#recoverForm,
      toForm = window.location.hash === '#recover' ? this.#recoverForm : this.#loginForm;

    await animate(fromForm, {opacity: [1, 0], transform: ['translateY(0)', 'translateY(-10px)']}, {duration: 0.25, ease: 'easeInOut'});
    fromForm.hidden = true;

    toForm.hidden = false;
    await animate(toForm, {opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0)']}, {duration: 0.25, ease: 'easeInOut'});
  }
}

if (!window.customElements.get('account-login')) {
  window.customElements.define('account-login', AccountLogin);
}