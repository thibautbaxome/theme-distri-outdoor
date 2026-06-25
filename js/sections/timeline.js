import { animateSequence, Delegate } from "vendor";

export class Timeline extends HTMLElement {
  #delegate = new Delegate(this);

  connectedCallback() {
    this.#delegate.on('click', '.timeline__nav button[aria-current="false"]', (event, target) => this.select({ blockId: target.dataset.blockId }));
    this.addEventListener('shopify:block:select', (event) => this.select({ blockId: event.detail.blockId, instant: event.detail.load }));
  }

  disconnectedCallback() {
    this.#delegate.off();
  }

  async select({ blockId, instant = false } = {}) {
    const fromPicture = this.querySelector('.timeline__image.is-selected');
    const toPicture = this.querySelector(`.timeline__image[data-block-id="${blockId}"]`);

    const fromContent = this.querySelector('.timeline__content.is-selected');
    const toContent = this.querySelector(`.timeline__content[data-block-id="${blockId}"]`);

    // Toggle the classes
    if (toPicture && fromPicture !== toPicture) {
      fromPicture.classList.remove('is-selected');
      toPicture.classList.add('is-selected');
    }

    // Toggle the buttons
    this.querySelectorAll('.timeline__nav button').forEach((button) => {
      const isCurrent = button.dataset.blockId === blockId;
      button.setAttribute('aria-current', isCurrent ? 'true' : 'false');

      if (isCurrent && (button.offsetParent.scrollWidth !== button.offsetParent.clientWidth || button.offsetParent.scrollHeight !== button.offsetParent.clientHeight)) {
        button.offsetParent.scrollTo({
          left: button.offsetLeft - (button.offsetParent.clientWidth / 2) + (button.clientWidth / 2),
          top: button.offsetTop - (button.offsetParent.clientHeight / 2) + (button.clientHeight / 2),
          behavior: 'smooth'
        });
      }
    });

    fromContent.classList.remove('is-selected');
    toContent.classList.add('is-selected');

    const timelineSteps = [];

    if (toPicture && fromPicture !== toPicture) {
      fromPicture.classList.remove('is-selected');
      toPicture.classList.add('is-selected');

      // We transition the image
      timelineSteps.push(
        [fromPicture, { visibility: ['visible', 'hidden'], opacity: [1, 0], transform: ['scale(1)', 'scale(1.05)'] }, { duration: 0.5, delay: 0.2, ease: [0.4, 0, 0.2, 1] }],
        [toPicture, { visibility: ['hidden', 'visible'], opacity: [0, 1], transform: ['scale(1.05)', 'scale(1)'] }, { duration: 0.5, at: '<', delay: 0.2, ease: [0.4, 0, 0.2, 1] }],
      );
    }
    
    timelineSteps.push(
      [fromContent, { visibility: ['visible', 'hidden'], opacity: [1, 0], transform: ['translateY(0)', 'translateY(-1em)'] }, { duration: 0.3, at: 0, ease: [0.55, 0.055, 0.675, 0.19] }],
      [toContent, { visibility: ['hidden', 'visible'], opacity: [0, 1], transform: ['translateY(1em)', 'translateY(0)'] }, { duration: 0.5, at: '+0.2', ease: [0.25, 0.46, 0.45, 0.94] }],
    );

    const animationControls = animateSequence(timelineSteps);

    if (instant) {
      animationControls.complete();
    }

    await animationControls;
  }
}

if (!window.customElements.get('time-line')) {
  window.customElements.define('time-line', Timeline);
}