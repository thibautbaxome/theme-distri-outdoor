import {Delegate} from "vendor";
import {debounce, cachedFetch} from "../utilities";

/**
 * ---------------------------------------------------------------------------------------------------------------
 * Component that handles the predictive search
 *
 * In order to use this component, you must create a relationship with aria-owns from a form owning the component
 *
 * <form action="{{ routes.search_url }}" method="GET" aria-owns="PREDICTIVE-SEARCH-ID" role="search">
 *   the form
 * </form>
 *
 * <predictive-search id="PREDICTIVE-SEARCH-ID">
 *   <div slot="results">
 *     // The results to show (this will be insereted in JS by the component)
 *   </div>
 *
 *   <div slot="placeholder">
 *     // The placeholder content to show when no terms has been written
 *   </div>
 * </predictive-search>
 * ---------------------------------------------------------------------------------------------------------------
 */
export class PredictiveSearch extends HTMLElement {
  #delegate = new Delegate(this);
  #listenersAbortController;
  #fetchAbortController;
  #searchForm;
  #queryInput;

  constructor() {
    super();

    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(document.createRange().createContextualFragment(`<slot name="placeholder"></slot>`));
  }

  connectedCallback() {
    this.#listenersAbortController = new AbortController();
    this.#searchForm = document.querySelector(`[aria-owns="${this.id}"]`);
    this.#queryInput = this.#searchForm.elements['q'];

    this.#searchForm.addEventListener('submit', this.#onFormSubmitted.bind(this), {signal: this.#listenersAbortController.signal});
    this.#searchForm.addEventListener('reset', this.#onSearchCleared.bind(this), {signal: this.#listenersAbortController.signal});
    this.#queryInput.addEventListener('input', debounce(this.#onInputChanged.bind(this), this.autoCompleteDelay, {signal: this.#listenersAbortController.signal}));
  }

  disconnectedCallback() {
    this.#listenersAbortController.abort();
  }

  /**
   * Return the delay in ms before we send the autocomplete request. Using a value too low can cause the results to
   * refresh too often, so we recommend to keep the default one
   */
  get autoCompleteDelay() {
    return 280;
  }

  /**
   * Check if the store supports the predictive API (some languages do not). When not supported, the predictive
   * search is simply disabled and only the standard search is used
   */
  supportsPredictiveApi() {
    return JSON.parse(document.getElementById('shopify-features').innerHTML)['predictiveSearch'];
  }

  /**
   * Check if the input is not empty, and if so, trigger the predictive search
   */
  #onInputChanged() {
    if (this.#queryInput.value === '') {
      return this.#onSearchCleared();
    }

    this.#fetchAbortController?.abort(); // Abort any existing fetch to make sure we do not have stale data and recreate a new one
    this.#fetchAbortController = new AbortController();

    return this.#doPredictiveSearch();
  }

  /**
   * Prevent the form submission if the query is empty
   */
  #onFormSubmitted(event) {
    if (this.#queryInput.value === '') {
      return event.preventDefault();
    }
  }

  /**
   * Do the actual predictive search
   */
  async #doPredictiveSearch() {
    document.documentElement.dispatchEvent(new CustomEvent('theme:loading:start', {bubbles: true}));

    try {
      const url = `${window.Shopify.routes.root}search${this.supportsPredictiveApi() ? '/suggest' : ''}`,
      queryParams = `q=${encodeURIComponent(this.#queryInput.value)}&section_id=predictive-search&resources[limit]=10&resources[limit_scope]=each`,
      tempDoc = (new DOMParser()).parseFromString(await (await cachedFetch(`${url}?${queryParams}`, {signal: this.#fetchAbortController.signal})).text(), 'text/html');

      this.shadowRoot.innerHTML = `<slot name="results"></slot>`; /* Fallback to empty state */
      this.querySelector('[slot="results"]').replaceChildren(...document.importNode(tempDoc.querySelector('.shopify-section'), true).children);
    } catch (e) {
      if (e.name !== 'AbortError') {
        throw e;
      }
    }

    document.documentElement.dispatchEvent(new CustomEvent('theme:loading:end', {bubbles: true}));
  }

  /**
   * If any search is pending, we abort them, and transition to the idle slot
   */
  #onSearchCleared() {
    this.#fetchAbortController?.abort(); // Abort any existing search
    this.#queryInput.focus();

    this.shadowRoot.innerHTML = `<slot name="placeholder"></slot>`; /* Fallback to placeholder state */
  }
}

if (!window.customElements.get('predictive-search')) {
  window.customElements.define('predictive-search', PredictiveSearch);
}