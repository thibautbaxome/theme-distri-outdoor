import {inView} from "vendor";

/**
 * ---------------------------------------------------------------------------------------------------------------------
 * BASE MEDIA
 *
 * It provides the basic functionality for the different types of media. It supports the "group" attribute, which
 * allows to assign a specific identifier to a group of media. When one media of this group is played, all the other
 * ones are automatically paused, which prevent several media to play at the same time.
 *
 * Following attributes are supported for every media:
 *
 * - autoplay: when the media is visible in the viewport, the media will autoplay
 * ---------------------------------------------------------------------------------------------------------------------
 */
export class BaseMedia extends HTMLElement {
  static get observedAttributes() {
    return ['playing'];
  }

  connectedCallback() {
    this._abortController = new AbortController();

    /* We autoplay only when the video appears in the viewport. This can cause a small delay before the video is
       actually visible, but videos have such a massive impact on performance that applying a strict lazy-loading
       when autoplaying is better for performance score and mobile performance. If you wish to autoplay the video
       a bit before it appears in the viewport, you can set the third margin value to a positive value (eg.: 0px 0px 500px 0px) */
    if (this.hasAttribute('autoplay')) {
      inView(this, this.play.bind(this), {margin: '0px 0px 0px 0px'});
    }
  }

  disconnectedCallback() {
    this._abortController.abort(); // Clean all the listeners
  }

  get playing() {
    return this.hasAttribute('playing');
  }

  get player() {
    return this._playerProxy = this._playerProxy || new Proxy(this._playerTarget(), {
      get: (target, prop) => {
        return async () => {
          target = await target;
          this._playerHandler(target, prop);
        }
      }
    });
  }

  play() {
    // The offsetParent allows to ensure we do not play video that are not visible in the DOM (eg. with display: none)
    if (!this.playing && this.offsetParent !== null) {
      this.player.play(); // Defer the implementation details to the media player
    }
  }

  pause() {
    // Wrapping under a condition prevent to get the loader, which would initialize the underlying player
    if (this.playing) {
      this.player.pause(); // Defer the implementation details to the media player
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    // Trigger extra events so that other system can hook into the system
    if (name === 'playing') {
      if (oldValue === null && newValue === '') {
        this.dispatchEvent(new CustomEvent('media:play', {bubbles: true}));

        if (this.hasAttribute('group')) {
          Array.from(document.querySelectorAll(`[group="${this.getAttribute('group')}"]`)).filter(item => item !== this).forEach(itemToPause => {
            itemToPause.pause();
          });
        }
      } else if (newValue === null) {
        this.dispatchEvent(new CustomEvent('media:pause', {bubbles: true}));
      }
    }
  }
}