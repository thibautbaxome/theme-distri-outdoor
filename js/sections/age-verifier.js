import {DialogElement} from "../common/overlay";

export class AgeVerifierModal extends DialogElement {
  connectedCallback() {
    super.connectedCallback();

    if (this.verificationType === 'date') {
      this.#form.addEventListener('submit', this.#checkBirthDate.bind(this));
    } else {
      this.querySelector('.age-verifier__confirm-button')?.addEventListener('click', this.#accessAuthorized.bind(this));
      this.querySelector('.age-verifier__decline-button')?.addEventListener('click', this.#accessDenied.bind(this));
    }

    if (localStorage.getItem('authorized-access') === null && !Shopify.designMode) {
      this.show();
    }
  }

  get verificationType() {
    return this.getAttribute('verification-type');
  }

  get #form() {
    return this.querySelector('form');
  }

  get requiredAge() {
    return parseInt(this.getAttribute('required-age'));
  }

  get shouldLock() {
    return true;
  }

  get escapeDeactivates() {
    return false;
  }

  #checkBirthDate(event) {
    if (event) {
      event.preventDefault();
    }

    const month = this.querySelector('[name="age-verifier[month]"]').value;
    const day = this.querySelector('[name="age-verifier[day]"]').value;
    const year = this.querySelector('[name="age-verifier[year]"]').value;
    const birthDate = new Date(year, (month - 1), day);
    const customerAge = this.#getCustomerAge(new Date(parseInt(year), (parseInt(month) - 1), parseInt(day)));

    // Check date timestamp
    if (isNaN(birthDate.valueOf())) {
      return;
    }

    if (customerAge >= this.requiredAge) {
      this.#accessAuthorized();
    } else {
      this.#accessDenied();
    }
  }

  #accessAuthorized() {
    this.hide();
    localStorage.setItem('authorized-access', 'true');
  }

  #accessDenied() {
    this.querySelector('.banner').hidden = false;
  }

  #getCustomerAge(birthDate) {
    // Calculate the difference in milliseconds between the current date and the provided date of birth
    const diffMs = Math.max(Date.now() - birthDate.getTime(), 0);

    // Create a new Date object representing the difference in milliseconds and store it in the variable age_dt (age Date object)
    const ageDt = new Date(diffMs);

    // Calculate the absolute value of the difference in years between the age Date object and the year 1970 (UNIX epoch)
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  }
}

if (!window.customElements.get('age-verifier-modal')) {
  window.customElements.define('age-verifier-modal', AgeVerifierModal);
}
