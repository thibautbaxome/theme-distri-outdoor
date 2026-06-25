import { ProductLoader } from "../product";
import { BaseMedia } from "./base-media";

/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 3D MODEL
 *
 * To use it, you need to create a <model-media> that uses the "model_viewer_tag" Liquid tag. You also need to pass the
 * handle of the product so that it is properly initialized.
 * ---------------------------------------------------------------------------------------------------------------------
 */
export class ModelMedia extends BaseMedia {
  connectedCallback() {
    super.connectedCallback();
    this.player; // For the model, we call the getter to force the creation of the player
  }

  _playerTarget() {
    return new Promise((resolve) => {
      this.setAttribute('loaded', '');

      window.Shopify.loadFeatures([
        {
          name: 'shopify-xr',
          version: '1.0',
          onLoad: this._setupShopifyXr.bind(this)
        },
        {
          name: 'model-viewer-ui',
          version: '1.0',
          onLoad: () => {
            const modelViewer = this.querySelector('model-viewer');

            modelViewer.addEventListener('shopify_model_viewer_ui_toggle_play', () => this.setAttribute('playing', ''));
            modelViewer.addEventListener('shopify_model_viewer_ui_toggle_pause', () => this.removeAttribute('playing'));

            resolve(new window.Shopify.ModelViewerUI(modelViewer, {focusOnPlay: true}));
          }
        }
      ]);
    });
  }

  _playerHandler(target, prop) {
    target[prop]();
  }

  async _setupShopifyXr() {
    if (!window.ShopifyXR) {
      document.addEventListener('shopify_xr_initialized', this._setupShopifyXr.bind(this));
    } else {
      const models = (await ProductLoader.load(this.getAttribute('handle')))['media'].filter(media => media['media_type'] === 'model');
      window.ShopifyXR.addModels(models);
      window.ShopifyXR.setupXRElements();
    }
  }
}

if (!window.customElements.get('model-media')) {
  window.customElements.define('model-media', ModelMedia);
}