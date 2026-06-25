import {inView} from "vendor";
import {BaseMedia} from "./base-media";
import {matchesMediaQuery} from "../utilities";

const onYouTubePromise = new Promise((resolve) => {
  window.onYouTubeIframeAPIReady = () => resolve();
});

/**
 * ---------------------------------------------------------------------------------------------------------------------
 * VIDEO MEDIA
 *
 * To use it, you need to create a <video-media> element that either uses a native <video> tag outputted using "video_tag"
 * Liquid tag, or a third-party video (YouTube and Vimeo) using the "external_video_tag". When using the external_video_tag,
 * you must make sure to pass the "host" attribute.
 *
 * If you wish to use a poster image, you need to add your own "img" inside the <video-media> itself.
 *
 * Following attributes are supported for every video media in addition to base media attributes:
 *
 * - show-play-button: when passed, a play button will be added on top of the video. If you wish more controls over
 *                     the content, you should use instead custom HTML.
 * ---------------------------------------------------------------------------------------------------------------------
 */
export class VideoMedia extends BaseMedia {
  #mustRemoveControlsAfterSuspend = false;

  connectedCallback() {
    super.connectedCallback();

    // If not autoplaying, we add an event on click to play
    if (!this.hasAttribute('autoplay')) {
      this.addEventListener('click', this.play, {once: true, signal: this._abortController.signal});
    }

    if (this.hasAttribute('show-play-button') && !this.shadowRoot) {
      this.attachShadow({mode: 'open'}).appendChild(document.getElementById('video-media-default-template').content.cloneNode(true));
    }

    if (this.getAttribute('type') === 'video') {
      // For native video, we preload the data when video is nearing the viewport
      inView(this, () => {
        this.querySelector('video')?.setAttribute('preload', 'auto');
      }, {margin: '800px'});
    }
  }

  play({ restart = false } = {}) {
    if (restart && !this.hasAttribute('host')) {
      this.querySelector('video').currentTime = 0;
    }

    super.play();
  }

  _playerTarget() {
    if (this.hasAttribute('host')) {
      this.setAttribute('loaded', '');

      return new Promise(async (resolve) => {
        const templateElement = this.querySelector('template');

        // If the video contains a <template> (which allows to defer the iframe loading) we first transform it
        if (templateElement) {
          templateElement.replaceWith(templateElement.content.firstElementChild.cloneNode(true));
        }

        // We need to mute video on autoplay, and on mobile device (as browsers block autoplay with sound)
        const muteVideo = this.hasAttribute('autoplay') || matchesMediaQuery('md-max');

        // Then, we load the API for the provider (currently Vimeo or YouTube)
        const script = document.createElement('script');
        script.type = 'text/javascript';

        if (this.getAttribute('host') === 'youtube') {
          if (!window.YT || !window.YT.Player) {
            script.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(script);

            await new Promise((resolve) => {
              script.onload = resolve;
            });
          }

          await onYouTubePromise; // For YouTube we have to wait for the global-scope promise to be resolved

          const player = new YT.Player(this.querySelector('iframe'), {
            events: {
              'onReady': () => {
                if (muteVideo) {
                  player.mute();
                }

                resolve(player);
              },

              'onStateChange': (event) => {
                if (event.data === YT.PlayerState.PLAYING) {
                  this.setAttribute('playing', '');
                } else if (event.data === YT.PlayerState.ENDED || event.data === YT.PlayerState.PAUSED) {
                  this.removeAttribute('playing');
                }
              }
            }
          });
        }

        if (this.getAttribute('host') === 'vimeo') {
          if (!window.Vimeo || !window.Vimeo.Player) {
            script.src = 'https://player.vimeo.com/api/player.js';
            document.head.appendChild(script);

            await new Promise((resolve) => {
              script.onload = resolve;
            });
          }

          const player = new Vimeo.Player(this.querySelector('iframe'));

          if (muteVideo) {
            player.setMuted(true);
          }

          player.on('play', () => {
            this.setAttribute('playing', '');
          });

          player.on('pause', () => this.removeAttribute('playing'));
          player.on('ended', () => this.removeAttribute('playing'));

          resolve(player);
        }
      });
    } else {
      const videoElement = this.querySelector('video');

      this.setAttribute('loaded', '');
      this.querySelector('custom-cursor')?.remove();

      videoElement.addEventListener('play', () => {
        this.setAttribute('playing', '');
        this.removeAttribute('suspended'); // In the case the video has been suspended due to low-power mode

        if (this.#mustRemoveControlsAfterSuspend) {
          videoElement.controls = false;
        }
      });

      videoElement.addEventListener('pause', () => {
        if (!videoElement.seeking && videoElement.paused) {
          this.removeAttribute('playing');
        }
      });

      return videoElement;
    }
  }

  _playerHandler(target, prop) {
    if (this.getAttribute('host') === 'youtube') {
      prop === 'play' ? target.playVideo() : target.pauseVideo();
    } else {
      // For the native element or Vimeo, they both map to the "play" and "pause" method

      if (prop === 'play' && !this.hasAttribute('host')) {
        target.play().catch(error => {
          if (error.name === 'NotAllowedError') {
            // This can happen when autoplay is blocked due to low power mode. When this happens, we force showing
            // the controls to allow the customer to load the video
            this.setAttribute('suspended', '');

            if (!this.hasAttribute('controls')) {
              this.#mustRemoveControlsAfterSuspend = true;
              target.controls = true;
            }
          }
        })
      } else {
        target[prop]();
      }
    }
  }
}

if (!window.customElements.get('video-media')) {
  window.customElements.define('video-media', VideoMedia);
}