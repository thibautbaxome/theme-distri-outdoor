import { extractSectionId } from "../theme";

/**
 * Due to a limitation of Shopify search, the search results are returned mixed (so products are mixed with articles, pages, etc).
 * This makes it nearly impossible to show a proper search result page with each resource separated. As a consequence, when this is
 * the case, we perform an Ajax request to get the search results and display them in a panel, separately.
 */
export class SearchResultPanel extends HTMLElement {
  async connectedCallback() {
    if (!this.hasAttribute('load-from-url')) {
      return;
    }

    const textResponse = await (await fetch(encodeURI(`${this.getAttribute('load-from-url')}&section_id=${extractSectionId(this)}`))).text();
    const temporaryContent = new DOMParser().parseFromString(textResponse, 'text/html');

    const searchResultsPanel = temporaryContent.querySelector(`#${this.getAttribute('id')}`);

    if (searchResultsPanel) {
      this.replaceChildren(...searchResultsPanel.children);
    } else {
      // If we don't have panel, this means that there are no results for this resource type, so we remove itself and the associated tab
      document.querySelector(`[aria-controls="${this.id}"]`).remove();
      this.remove();
    }
  }
}

if (!window.customElements.get('search-result-panel')) {
  window.customElements.define('search-result-panel', SearchResultPanel);
}