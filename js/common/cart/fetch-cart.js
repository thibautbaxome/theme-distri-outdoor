/**
 * Allow to get the freshest content of the cart globally, to reduce the number of needed of JS request
 */
const createCartPromise = () => {
  return new Promise(async (resolve) => {
    resolve((await (await fetch(`${Shopify.routes.root}cart.js`)).json()));
  });
}

let fetchCart = createCartPromise();

document.addEventListener('cart:change', (event) => {
  fetchCart = event.detail['cart'];
});

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    fetchCart = createCartPromise(); // If the page is reloaded from BF cache, we re-generate the promise
  }
});

document.addEventListener('cart:refresh', () => {
  fetchCart = createCartPromise(); // When the cart:refresh event is programmatically call we re-generate the promise
});

export {fetchCart};