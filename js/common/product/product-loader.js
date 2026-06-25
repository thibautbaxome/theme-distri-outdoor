/**
 * This class allows fetching in Ajax info about product, and store the data locally so that if fetches several
 * times it does not do many Ajax calls
 */

let loadedProducts = {};

export class ProductLoader {
  static load(productHandle) {
    if (!productHandle) {
      return;
    }

    if (loadedProducts[productHandle]) {
      return loadedProducts[productHandle];
    }

    loadedProducts[productHandle] = new Promise(async (resolve, reject) => {
      const response = await fetch(`${Shopify.routes.root}products/${productHandle}.js`);

      if (response.ok) {
        const responseAsJson = await response.json();
        resolve(responseAsJson);
      } else {
        reject(`
          Attempted to load information for product with handle ${productHandle}, but this product is in "draft" mode. You won't be able to
          switch between variants or access to per-variant information. To fully preview this product, change temporarily its status
          to "active".
        `);
      }
    });

    return loadedProducts[productHandle];
  }
}