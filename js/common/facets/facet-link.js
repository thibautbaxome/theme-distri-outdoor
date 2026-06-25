import {extractSectionId} from "../utilities";

/**
 * Component that wraps any link to automatically update the collection by updating the collection with the
 * href attribute of the link
 */
export class FacetLink extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('click', this.#onFacetUpdate.bind(this));
  }

  #onFacetUpdate(event) {
    event.preventDefault();

    const sectionId = extractSectionId(event.target),
      url = new URL(this.firstElementChild.href);

    url.searchParams.set('section_id', sectionId);

    // @TODO: implementation note: this is done mostly for the "sort by" because Shopify does not offer any way to
    //        get a URL with filtered being applied. We therefore have to use this hack to merge the parameters
    if (this.hasAttribute('merge-params')) {
      // When merging params, we take the existing URL and mix the params with the new URL
      const existingParams = new URLSearchParams(window.location.search);
      
      for (const [key, value] of url.searchParams) {
        existingParams.set(key, value);
      }

      url.search = existingParams.toString();
    }

    this.dispatchEvent(new CustomEvent('facet:update', {
      bubbles: true,
      detail: {
        url: url,
        scrollTo: url.hash,
        disableCache: this.hasAttribute('disable-cache'),
        ignoreUrlSearch: this.hasAttribute('ignore-url-search')
      }
    }));
  }
}

if (!window.customElements.get('facet-link')) {
  window.customElements.define('facet-link', FacetLink);
}
