/**
 * Extract the ID of the closest section for a given element (or itself if it is a section)
 */
export function extractSectionId(element) {
  if (element.hasAttribute('section-id')) {
    return element.getAttribute('section-id'); // First, we check on the element itself
  }

  const sectionElement = element.classList.contains('shopify-section') ? element : element.closest('.shopify-section');

  if (sectionElement) {
    return sectionElement.id.replace('shopify-section-', '');
  }

  // Otherwise we check if there is an element with a section-id attribute
  const elementWithSectionId = element.closest('[section-id]');

  return elementWithSectionId ? elementWithSectionId.getAttribute('section-id') : null;
}