export class ConfirmButton extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('click', (event) => {
      if (!window.confirm(this.getAttribute('data-message') ?? 'Once confirmed, this action cannot be undone.')) {
        event.preventDefault();
      }
    });
  }
}

if (!window.customElements.get('confirm-button')) {
  window.customElements.define('confirm-button', ConfirmButton);
}
