/**
 * Integrate with the "qr-code.js" library of Shopify to generate QR code. This is only used for now in the
 * gift card page, but can be used elsewhere if you need to. You need to ensure that you first load the JS library
 * by using this code:
 *
 * <script src="{{ 'vendor/qrcode.js' | shopify_asset_url }}"></script>
 */
export class QrCode extends HTMLElement {
  connectedCallback() {
    new window.QRCode(this, {
      text: this.getAttribute('identifier'),
      width: this.hasAttribute('width') ? parseInt(this.getAttribute('width')) : 200,
      height: this.hasAttribute('height') ? parseInt(this.getAttribute('height')) : 200,
    });
  }
}

if (!window.customElements.get('qr-code')) {
  window.customElements.define('qr-code', QrCode);
}