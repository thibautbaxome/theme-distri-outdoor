/**
 * Gesture area is a class allowing to detect simple gestures (for now, only the swipe are supported). It is not
 * a custom element, so it must be instantiated by itself.
 *
 * To use it, you must instantiate it with a DOM element, that represent the area where the detection must appear. This
 * will allow to trigger on the area the following events: "swipeup", "swipedown", "swipeleft", "swiperight", "tap".
 *
 * const gestureArea = new GestureArea(domElement, options);
 * domElement.addEventListener('swipeup', listener);
 *
 * The options currently support those:
 *
 * - thresholdDistance: the threshold distance before which the events are emitted
 * - thresholdTime: the threshold time (in ms) before which the gesture is ignored if nothing is moved
 * - signal: a signal (coming from AbortController) to automatically cleanup events
 */
export class GestureArea {
  #domElement;
  #thresholdDistance;
  #thresholdTime;
  #signal;
  #firstClientX;
  #tracking = false;
  #start = {};

  constructor(domElement, {thresholdDistance = 80, thresholdTime = 500, signal = null} = {}) {
    this.#domElement = domElement;
    this.#thresholdDistance = thresholdDistance;
    this.#thresholdTime = thresholdTime;
    this.#signal = signal ?? (new AbortController()).signal;

    // Block the vertical scroll on the gesture area to improve user experience
    this.#domElement.addEventListener('touchstart', this.#touchStart.bind(this), {passive: true, signal: this.#signal});
    this.#domElement.addEventListener('touchmove', this.#preventTouch.bind(this), {passive: false, signal: this.#signal});

    this.#domElement.addEventListener('pointerdown', this.#gestureStart.bind(this), {signal: this.#signal});
    this.#domElement.addEventListener('pointermove', this.#gestureMove.bind(this), {passive: false, signal: this.#signal});
    this.#domElement.addEventListener('pointerup', this.#gestureEnd.bind(this), {signal: this.#signal});
    this.#domElement.addEventListener('pointerleave', this.#gestureEnd.bind(this), {signal: this.#signal});
    this.#domElement.addEventListener('pointercancel', this.#gestureEnd.bind(this), {signal: this.#signal});
  }

  #touchStart(event) {
    this.#firstClientX = event.touches[0].clientX; // capture user's starting finger position, for later comparison
  }

  #preventTouch(event) {
    if (Math.abs(event.touches[0].clientX - this.#firstClientX) > 10) {
      event.preventDefault();
    }
  }

  #gestureStart(event) {
    this.#tracking = true;
    this.#start = {
      time: new Date().getTime(),
      x: event.clientX,
      y: event.clientY
    };
  }

  #gestureMove(event) {
    if (this.#tracking) {
      event.preventDefault();
    }
  }

  #gestureEnd(event) {
    if (!this.#tracking) {
      return;
    }

    this.#tracking = false;

    const now = new Date().getTime(),
      deltaTime = now - this.#start.time,
      deltaX = event.clientX - this.#start.x,
      deltaY = event.clientY - this.#start.y;

    if (deltaTime > this.#thresholdTime) {
      return; // Too slow
    }

    let matchedEvent;

    if (deltaX === 0 && deltaY === 0) {
      matchedEvent = 'tap';
    } else if ((deltaX > this.#thresholdDistance) && (Math.abs(deltaY) < this.#thresholdDistance)) {
      matchedEvent = 'swiperight';
    } else if ((-deltaX > this.#thresholdDistance) && (Math.abs(deltaY) < this.#thresholdDistance)) {
      matchedEvent = 'swipeleft';
    } else if ((deltaY > this.#thresholdDistance) && (Math.abs(deltaX) < this.#thresholdDistance)) {
      matchedEvent = 'swipedown';
    } else if ((-deltaY > this.#thresholdDistance) && (Math.abs(deltaX) < this.#thresholdDistance)) {
      matchedEvent = 'swipeup';
    }

    if (matchedEvent) {
      this.#domElement.dispatchEvent(new CustomEvent(matchedEvent, {bubbles: true, composed: true, detail: {originalEvent: event}}));
    }
  }
}