import {cachedFetch} from "../utilities";

/**
 * Wrap a <form> element and monitor its changes to update collection pages
 */
export class FacetsForm extends HTMLElement {
  #isDirty = false;

  constructor() {
    super();

    this.addEventListener('change', this.#onFormChanged);
    this.addEventListener('submit', this.#onFormSubmitted, {capture: true});
    this.addEventListener('reset', this.#onFormResetted);
  }

  get #form() {
    return this.querySelector('form');
  }

  #buildUrl({ clearParams = false } = {}) {
    const searchParams = new URLSearchParams(new FormData(this.#form)),
      url = new URL(this.#form.action);

    url.search = ''; // Clear the parameters from the action, which fixes issue inside the theme editor

    if (!clearParams) {
      searchParams.forEach((value, key) => url.searchParams.append(key, value));

      ['page', 'filter.v.price.gte', 'filter.v.price.lte'].forEach(optionToClear => {
        if (url.searchParams.get(optionToClear) === '') {
          url.searchParams.delete(optionToClear);
        }
      });
    }

    // Append the section ID
    url.searchParams.set('section_id', this.getAttribute('section-id'));

    return url;
  }

  #onFormChanged() {
    this.#isDirty = true;

    if (this.hasAttribute('update-on-change')) {
      // Using "form.submit()" does not trigger the submit event, so we have to use requestSubmit. However, this is not supported in all browsers,
      // so we have to fallback to the old way. The old way is going to be deprecated in the future.
      if (HTMLFormElement.prototype.requestSubmit) {
        this.#form.requestSubmit();
      } else {
        this.#form.dispatchEvent(new Event('submit', {bubbles: true}));
      }
    } else {
      // Otherwise, we just "fetch" the data so that it is in cache for faster result
      cachedFetch(this.#buildUrl().toString());
    }
  }

  #onFormSubmitted(event) {
    event.preventDefault();

    if (!this.#isDirty) {
      return; // Nothing has changed so no need to update it
    }

    this.dispatchEvent(new CustomEvent('facet:update', {
      bubbles: true,
      detail: {
        url: this.#buildUrl(),
        scrollTo: this.#form.getAttribute('scroll-to')
      }
    }));

    this.#isDirty = false;
  }

  #onFormResetted(event) {
    event.preventDefault();

    this.dispatchEvent(new CustomEvent('facet:update', {
      bubbles: true,
      detail: {
        url: this.#buildUrl({ clearParams: true })
      }
    }));

    this.#isDirty = false;
  }
}

if (!window.customElements.get('facets-form')) {
  window.customElements.define('facets-form', FacetsForm);
}
