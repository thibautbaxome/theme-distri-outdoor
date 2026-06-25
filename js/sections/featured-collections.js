import { Tabs } from "../common/navigation/tabs";

export class FeaturedCollectionsTabs extends Tabs {
  async transition(fromPanel, toPanel) {
    super.transition(fromPanel, toPanel);

    if (window.themeVariables.settings.staggerProducts) {
      toPanel.querySelector('product-list').reveal();
    }

    if (toPanel.hasAttribute('data-url')) {
      this.nextElementSibling?.setAttribute('href', toPanel.getAttribute('data-url'));
    }
  }
}

if (!window.customElements.get('featured-collections-tabs')) {
  window.customElements.define('featured-collections-tabs', FeaturedCollectionsTabs);
}