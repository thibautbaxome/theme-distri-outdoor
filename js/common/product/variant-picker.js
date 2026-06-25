import { Delegate } from "vendor";
import { deepQuerySelector } from "../utilities/dom";

/**
 * ---------------------------------------------------------------------------------------------------------------
 * Custom elements that manage the variant picker for products. Since the version 10 of Prestige, and in order
 * to support combined listing and unlimited variants, the theme now uses a simpler approach involving re-rendering
 * the section through the Section Rendering API whenever a variant changes.
 *
 * The following attributes are supported:
 *
 * - form-id: (REQUIRED) the ID of the form that contains the variant picker
 * - section-id: (REQUIRED) the ID of the section that contains the variant picker
 * - handle: (REQUIRED) must represent the handle of the product so that product info can be extracted
 * - update-url: (OPTIONAL) if defined, the URL will change when variant changes
 *
 * In order for this component to work, developers must ensure that all option values have the data-option-position
 * attribute, and a reference to the product form, which is needed to coordinate changes.
 *
 * It also offers a method called "selectCombination" to which you can pass a list of option values.
 * ---------------------------------------------------------------------------------------------------------------
 */

/* Implementation note: for now we don't clear the cache of preloaded HTML, as it is not a big deal if we keep it in memory */
const CACHE_EVICTION_TIME = 1000 * 60 * 5; // 5 minutes

export class VariantPicker extends HTMLElement {
  static #preloadedHtml = new Map();

  #delegate = new Delegate(document.body);
  #intersectionObserver = new IntersectionObserver(this.#onIntersection.bind(this));
  #form;
  #selectedVariant;

  async connectedCallback() {
    // First, let's fetch all the data from the product
    this.#selectedVariant = JSON.parse(this.querySelector('script[data-variant]')?.textContent || '{}');
    this.#form = document.forms[this.getAttribute('form-id')];

    // Listen to the changes of input inside the product variant selectors
    this.#delegate.on('change', `input[data-option-position][form="${this.getAttribute('form-id')}"]`, this.#onOptionChanged.bind(this));
    this.#delegate.on('pointerenter', `input[data-option-position][form="${this.getAttribute('form-id')}"]:not(:checked) + label`, this.#onOptionPreload.bind(this), true);
    this.#delegate.on('touchstart', `input[data-option-position][form="${this.getAttribute('form-id')}"]:not(:checked) + label`, this.#onOptionPreload.bind(this), true);

    this.#intersectionObserver.observe(this);

    if (Shopify.designMode) {
      document.addEventListener('shopify:section:unload', () => {
        VariantPicker.#preloadedHtml.clear();
      });
    }
  }

  disconnectedCallback() {
    this.#delegate.off();
    this.#intersectionObserver.unobserve(this);
  }

  get selectedVariant() {
    return this.#selectedVariant;
  }

  get productHandle() {
    return this.getAttribute('handle');
  }

  get updateUrl() {
    return this.hasAttribute('update-url');
  }

  /**
   * Select a variant using a list of option values. The list of option values might lead to no variant (for instance)
   * in the case of a combination that does not exist
   */
  async selectCombination({ optionValues, productChange }) {
    const previousVariant = this.selectedVariant;

    // Now, we use the Section Rendering API to re-render the whole section with the new option values
    const newContent = document.createRange().createContextualFragment(await this.#renderForCombination(optionValues));

    // When we change a combination, it can either change a variant or, in the case of combined products, the whole
    // product. However, when using combined product, we actually redirect to the new product URL, as it is litterally a different product
    if (!productChange) {
      // We get the updated variant picker, which contains the data about the new variant in JSON
      const newVariantPicker = deepQuerySelector(newContent, `${this.tagName}[form-id="${this.getAttribute('form-id')}"]`);
      const newVariant = JSON.parse(newVariantPicker.querySelector('script[data-variant]')?.textContent || '{}');

      this.#selectedVariant = newVariant;

      // We update the master selector, as other systems are listening to it
      this.#form.id.value = this.#selectedVariant?.id;
      this.#form.id.dispatchEvent(new Event('change', { bubbles: true }));

      // Update the URL if needed
      if (this.updateUrl && this.#selectedVariant?.id) {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('variant', this.#selectedVariant.id);

        window.history.replaceState({path: newUrl.toString()}, '', newUrl.toString());
      }
    }

    // Then, we send an event "product:rerender", so that other systems in the app can re-render as a result of the variant change
    // In case we are having a product change (combined product), we reload all block types, otherwise we limit to some specific block
    // types only
    this.#form.dispatchEvent(new CustomEvent('product:rerender', {
      detail: {
        htmlFragment: newContent,
        productChange: productChange
      }
    }));

    if (!productChange) {
      this.#form.dispatchEvent(new CustomEvent('variant:change', {
        bubbles: true,
        detail: {
          formId: this.#form.id,
          variant: this.#selectedVariant,
          previousVariant: previousVariant
        }
      }));
    }

    // Re-render dynamic payment buttons upon rendering (this is needed when the variant picker is re-rendered)
    Shopify?.PaymentButton?.init();
  }

  /**
   * Get the option values for the active combination
   */
  #getActiveOptionValues() {
    return Array.from(this.#form.elements).filter(item => item.matches('input[data-option-position]:checked'))
      .sort((a, b) => parseInt(a.getAttribute('data-option-position')) - parseInt(b.getAttribute('data-option-position')))
      .map(input => input.value);
  }

  /**
   * Get the option values for a given input
   */
  #getOptionValuesFromOption(input) {
    // Implementation note: the order of values IS important and must follow exactly the option order.
    const optionValues = [input, ...Array.from(this.#form.elements).filter(item => item.matches(`input[data-option-position]:not([name="${input.name}"]):checked`))]
      .sort((a, b) => parseInt(a.getAttribute('data-option-position')) - parseInt(b.getAttribute('data-option-position')))
      .map(input => input.value);

    return optionValues;
  }

  /**
   * Callback called whenever one variant option changes. This method will re-render the section by using the section rendering API
   */
  async #onOptionChanged(event) {
    if (!event.target.name.includes('option')) {
      return;
    }

    this.selectCombination({ 
      optionValues: this.#getActiveOptionValues(), 
      productChange: event.target.hasAttribute('data-product-url') 
    });
  }

  /**
   * To improve the user experience, we preload a variant whenever the user hovers over a specific option
   */
  #onOptionPreload(event, target) {
    this.#renderForCombination(this.#getOptionValuesFromOption(target.control));
  }

  /**
   * When the variant picker is intersecting the viewport, we preload the options to improve the user experience
   * so that switching variants is nearly instant
   */
  #onIntersection(entries) {
    const prerenderOptions = () => {
      Array.from(this.#form.elements).filter(item => item.matches('input[data-option-position]:not(:checked)')).forEach(input => {
        this.#renderForCombination(this.#getOptionValuesFromOption(input));
      });
    }

    if (entries[0].isIntersecting) {
      // Preloading the options is just "a nice to have", so we give it a lower priority
      if (window.requestIdleCallback) {
        window.requestIdleCallback(prerenderOptions, { timeout: 2000 });
      } else {
        prerenderOptions();
      }
    }
  }

  /**
   * Re-renders the section or page for a specific variant, and store the resulted HTML in memory
   */
  async #renderForCombination(optionValues) {
    const optionValuesAsString = optionValues.join(',');
    const hashKey = this.#createHashKeyForHtml(optionValuesAsString);
    
    let productUrl = `${Shopify.routes.root}products/${this.productHandle}`;

    // In context of combined listing product, a product is a different product and not a variant, and we have to use the correct URL
    for (const optionValue of optionValues) {
      const inputForOptionValue = Array.from(this.#form.elements).find(item => item.matches(`input[value="${optionValue}"]`));

      if (inputForOptionValue?.dataset.productUrl) {
        productUrl = inputForOptionValue.dataset.productUrl;
        break;
      }
    }
    
    if (!VariantPicker.#preloadedHtml.has(hashKey)) {
      const sectionQueryParam = this.getAttribute('context') === 'quick_buy' ? '' : `&section_id=${this.getAttribute('section-id')}`;

      const promise = new Promise(async (resolve) => {
        resolve((await (await fetch(`${productUrl}?option_values=${optionValuesAsString}${sectionQueryParam}`)).text()));
      });
      
      VariantPicker.#preloadedHtml.set(hashKey, { htmlPromise: promise, timestamp: Date.now() });

      // On memory constrained devices such as mobile phone, storing the HTML of potentially thousands of variants can cause
      // the device to hang up. We therefore limit the number of preloaded HTML to 100
      if (VariantPicker.#preloadedHtml.size > 100) {
        VariantPicker.#preloadedHtml.delete(Array.from(VariantPicker.#preloadedHtml.keys())[0]);
      }
    }
    
    return VariantPicker.#preloadedHtml.get(hashKey).htmlPromise;
  }

  #createHashKeyForHtml(optionValuesAsString) {
    return `${optionValuesAsString}-${this.getAttribute('section-id')}`;
  }
}

if (!window.customElements.get('variant-picker')) {
  window.customElements.define('variant-picker', VariantPicker);
}