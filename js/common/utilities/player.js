/**
 * A simple player that wrap around setTimeout.
 *
 * const player = new Player(durationInSeconds);
 * player.addEventListener('player:end', () => console.log('Do something'));
 *
 * The player emits the following events:
 *
 * - player:start             => when the player starts from zero
 * - player:end               => when the player timer reached the end
 * - player:pause             => when the player is paused
 * - player:visibility-pause  => when the player is paused due to a visibility change (the player:pause is also dispatched)
 * - player:resume            => when the player is resumed from a paused status
 * - player:visibility-resume => when the player is resumed due to a visibility change (the player:resume is also dispatched)
 */
export class Player extends EventTarget {
  #callback;
  #duration;
  #remainingTime;
  #startTime;
  #timer;
  #state = 'paused';
  #onVisibilityChangeListener = this.#onVisibilityChange.bind(this);
  #mustResumeOnVisibility = true;

  constructor(durationInSec, stopOnVisibility = true) {
    super();

    this.#callback = () => this.dispatchEvent(new CustomEvent('player:end'));

    if (durationInSec !== undefined) {
      this.setDuration(durationInSec);
    }

    if (stopOnVisibility) {
      document.addEventListener('visibilitychange', this.#onVisibilityChangeListener);
    }
  }

  get paused() {
    return this.#state === 'paused';
  }

  setDuration(durationInSec) {
    this.#duration = this.#remainingTime = durationInSec * 1000; /* We convert to ms as this is what setTimeout uses */
  }

  pause() {
    if (this.#state !== 'started') {
      return;
    }

    clearTimeout(this.#timer);

    this.#state = 'paused';
    this.#remainingTime -= new Date().getTime() - this.#startTime;

    this.dispatchEvent(new CustomEvent('player:pause', { detail: {duration: this.#duration / 1000, remainingTime: this.#remainingTime / 1000} }));
  }

  resume(restartTimer = false) {
    if (this.#state !== 'stopped') {
      if (restartTimer) {
        this.start();
      } else {
        clearTimeout(this.#timer);

        this.#startTime = new Date().getTime();
        this.#state = 'started';
        this.#timer = setTimeout(this.#callback, this.#remainingTime);

        this.dispatchEvent(new CustomEvent('player:resume', { detail: {duration: this.#duration / 1000, remainingTime: this.#remainingTime / 1000} }));
      }
    }
  }

  start() {
    clearTimeout(this.#timer); // Clear existing timeout that may exist

    this.#startTime = new Date().getTime();
    this.#state = 'started';
    this.#remainingTime = this.#duration;
    this.#timer = setTimeout(this.#callback, this.#remainingTime);

    this.dispatchEvent(new CustomEvent('player:start', { detail: {duration: this.#duration / 1000, remainingTime: this.#remainingTime / 1000} }));
  }

  stop() {
    clearTimeout(this.#timer);

    this.#state = 'stopped';
    this.dispatchEvent(new CustomEvent('player:stop'));
  }

  #onVisibilityChange() {
    if (undefined === this.#duration) {
      return; // The initial duration has not been set yet so we return
    }

    if (document.visibilityState === 'hidden') {
      this.#mustResumeOnVisibility = this.#state === 'started';
      this.pause();
      this.dispatchEvent(new CustomEvent('player:visibility-pause'));
    } else if (document.visibilityState === 'visible' && this.#mustResumeOnVisibility) {
      this.resume();
      this.dispatchEvent(new CustomEvent('player:visibility-resume'));
    }
  }
}