/**
 * Allows to create a country selector. To make it work, you need to create two selectors: one country selector with
 * the name="address[country]" generated with country_option_tags or all_country_option_tags ; and an empty selector
 * with the name="address[province]".
 */
export class CountrySelector extends HTMLElement {
  #onCountryChangedListener = this.#onCountryChanged.bind(this);

  connectedCallback() {
    this.countryElement = this.querySelector('[name="address[country]"]');
    this.provinceElement = this.querySelector('[name="address[province]"]');

    this.countryElement.addEventListener('change', this.#onCountryChangedListener);

    if (this.hasAttribute('country') && this.getAttribute('country') !== '') {
      this.countryElement.selectedIndex = Math.max(0, Array.from(this.countryElement.options).findIndex(option => option.textContent === this.getAttribute('country')));
    }

    this.countryElement.dispatchEvent(new Event('change'));
  }

  disconnectedCallback() {
    this.countryElement.removeEventListener('change', this.#onCountryChangedListener);
  }

  #onCountryChanged() {
    // Get the current country, and check if it has province or not
    const option = this.countryElement.options[this.countryElement.selectedIndex],
      provinces = JSON.parse(option.getAttribute('data-provinces'));

    this.provinceElement.closest('.form-control').hidden = (provinces.length === 0);

    if (provinces.length === 0) {
      return;
    }

    // First remove all options from the province selector
    this.provinceElement.innerHTML = '';

    // We need to build the provinces array
    provinces.forEach((data) => {
      const selected = data[1] === this.getAttribute('province') || data[0] === this.getAttribute('province');
      this.provinceElement.options.add(new Option(data[1], data[0], selected, selected));
    });
  }
}

if (!window.customElements.get('country-selector')) {
  window.customElements.define('country-selector', CountrySelector);
}
