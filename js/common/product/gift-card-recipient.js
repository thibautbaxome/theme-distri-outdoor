/**
 * This component must appear within a product form, and allows a customer to add extra information to the
 *
 */
export class GiftCardRecipient extends HTMLElement {
  #recipientCheckbox;
  #recipientOtherProperties = [];
  #recipientSendOnProperty;
  #offsetProperty;
  #recipientFieldsContainer;

  connectedCallback() {
    const properties = Array.from(this.querySelectorAll('[name*="properties"]')),
      checkboxPropertyName = 'properties[__shopify_send_gift_card_to_recipient]';

    this.#recipientCheckbox = properties.find(input => input.name === checkboxPropertyName);
    this.#recipientOtherProperties = properties.filter(input => input.name !== checkboxPropertyName);
    this.#recipientFieldsContainer = this.querySelector('.gift-card-recipient__fields');

    this.#offsetProperty = this.querySelector('[name="properties[__shopify_offset]"]');

    if (this.#offsetProperty) {
      this.#offsetProperty.value = new Date().getTimezoneOffset().toString();
    }

    this.#recipientSendOnProperty = this.querySelector('[name="properties[Send on]"]');

    // Shopify requires the date to be maximum 90 days in the future
    const minDate = new Date();
    const maxDate = new Date();
    maxDate.setDate(minDate.getDate() + 90)

    this.#recipientSendOnProperty?.setAttribute('min', this.#formatDate(minDate));
    this.#recipientSendOnProperty?.setAttribute('max', this.#formatDate(maxDate));

    this.#recipientCheckbox?.addEventListener('change', this.#synchronizeProperties.bind(this));
    this.#synchronizeProperties();
  }

  #synchronizeProperties() {
    this.#recipientOtherProperties.forEach(property => property.disabled = !this.#recipientCheckbox.checked);
    this.#recipientFieldsContainer.toggleAttribute('hidden', !this.#recipientCheckbox.checked);
  }

  #formatDate(date) {
    const offset = date.getTimezoneOffset()
    const offsetDate = new Date(date.getTime() - (offset * 60 * 1000));

    return offsetDate.toISOString().split('T')[0];
  }
}

if (!window.customElements.get('gift-card-recipient')) {
  window.customElements.define('gift-card-recipient', GiftCardRecipient);
}
