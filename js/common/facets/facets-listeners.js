import {Delegate} from "vendor";
import {cachedFetch} from "../utilities";

// Different elements (the form, the sort by, the facet remove...) can actually change the faceting values. To keep it
// easy and to also allow third-party system to reload the facet, this is defined as a global code that listen to the
// "facet:update" event. When dispatching this event, you must have a "url" detail, that contains the new URL with all
// the attributes.

let abortController = null,
  delegate = new Delegate(document.body),
  openDetailsValues = new Set(Array.from(document.querySelectorAll('facets-form details[open] input[name*="filter."]'), item => item.name));

// Keep track of which details are being open and closed
delegate.on('toggle', 'facets-form details', (event, detailsElement) => {
  const inputNames = [...new Set(Array.from(detailsElement.querySelectorAll('input[name*="filter."]'), item => item.name))];

  inputNames.forEach(inputName => {
    detailsElement.open ? openDetailsValues.add(inputName) : openDetailsValues.delete(inputName);
  });
}, true);

document.addEventListener('facet:update', async (event) => {
  if (abortController) {
    abortController.abort();
  }

  abortController = new AbortController();

  const url = event.detail.url,
    shopifySection = document.getElementById(`shopify-section-${url.searchParams.get('section_id')}`);

  // Update the URL (by taking care of removing the "section_id" part)
  const clonedUrl = new URL(url);
  clonedUrl.searchParams.delete('section_id');
  clonedUrl.hash = '';

  if (event.detail.ignoreUrlSearch) {
    clonedUrl.search = '';
  }

  history.replaceState({}, '', clonedUrl.toString());

  try {
    document.documentElement.dispatchEvent(new CustomEvent('theme:loading:start', {bubbles: true}));
    let tempContent;

    if (event.detail.disableCache) {
      tempContent = (new DOMParser().parseFromString(await (await fetch(url.toString(), {signal: abortController.signal})).text(), 'text/html'));
    } else {
      tempContent = (new DOMParser().parseFromString(await (await cachedFetch(url.toString(), {signal: abortController.signal})).text(), 'text/html'));
    }

    document.documentElement.dispatchEvent(new CustomEvent('theme:loading:end', {bubbles: true}));

    // Before re-inserting the nodes, we have to ensure the collapsible are re-open on the proper state
    const newShopifySection = tempContent.querySelector('.shopify-section');
  
    newShopifySection.querySelectorAll('facets-form details').forEach(detailsElement => {
      const inputNames = [...new Set(Array.from(detailsElement.querySelectorAll('input[name*="filter."]'), item => item.name))];

      inputNames.forEach(inputName => {
        detailsElement.toggleAttribute('open', openDetailsValues.has(inputName));
      });
    });

    // We also need to restore focus when the facets are being re-rendered
    const focusedElement = document.activeElement;

    // Replace the content and scroll to the product list
    shopifySection.replaceChildren(...document.importNode(tempContent.querySelector('.shopify-section'), true).childNodes);

    // We then restore the focus to the previously focused element (if it exists)
    if (focusedElement?.id && document.getElementById(focusedElement.id)) {
      document.getElementById(focusedElement.id).focus();
    }

    const scrollToProductList = () => shopifySection.querySelector(event.detail.scrollTo)?.scrollIntoView({block: 'start', behavior: 'smooth'});

    if ('requestIdleCallback' in window) {
      requestIdleCallback(scrollToProductList, {timeout: 500});
    } else {
      requestAnimationFrame(scrollToProductList);
    }
  } catch (e) {
    // This may happen if multiple filters are added in a short period of time, due to request being aborted. We just need to silently fail
  }
});
