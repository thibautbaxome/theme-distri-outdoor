/**
 * An effect carousel is a special carousel whose cells are transitioned using animations. An effect carousel can
 * only show one cell at a time, and is a good candidate for large, impactful sections for which a standard scroll
 * is too bland.
 *
 * Similar to scroll-carousel, an effect carousel has a simple API, and integrates natively with the controls. If
 * you need to have a custom transition, you can create your own class extending EffectCarousel.
 *
 * The base markup for an effect carousel is as below (the "is-selected" class must be applied on the default cell)
 *
 * <effect-carousel>
 *   <div class="item is-selected"></div>
 *   <div class="item"></div>
 *   <div class="item" hidden></div> // Hidden item
 * </effect-carousel>
 *
 * The following attributes can currently be added on an effect-carousel:
 *
 * - cell-selector: allows to filter the cells that are considered as cells
 * - allow-swipe: if added, then the carousel can be swiped left and right
 * - disabled-on: accept a breakpoint name (sm, md, sm-max...). If matched, the carousel is not initialized
 * - disable-keyboard-navigation: if added, the keyboard navigation is disabled. Keyboard navigation is good for accessibility
 *                                so this should only be disabled in rare circumstances.
 * - autoplay: if defined, slides auto-rotate (you can also pass a value in seconds representing the interval)
 *
 * It has the following public API (next, prev and select returns a promise that resolve when the animation is finished):
 *
 * - next({instant = false} = {})
 * - prev({instant = false} = {})
 * - select(index, {instant = false, direction = ''} = {})
 *
 * It has the following properties:
 *
 * - allCells => get all the cells, even the hidden ones
 * - cells => get all the cells, excepted the hidden ones
 * - selectedCell => get the selected cell element
 * - selectedIndex => get the zero-index selected cell (this ignores any hidden slides)
 * - player => get the player instance allowing to control the autoplay
 *
 * The component triggers the following events:
 *
 * - carousel:select => event emitted when the select method is called (even if the cell does not change)
 * - carousel:change => event emitted when the cell changes
 * - carousel:settle => event emitted when the cell changes and that any transition has finished
 * - carousel:filter => event emitted when the cells have been filtered
 *
 * To create navigation controls, you can use the dedicated "carousel-navigation", "carousel-prev-button" or
 * "carousel-next-button", which directly integrates with the carousel
 *
 * The carousel supports filtering items by ignoring any cell whose hidden attribute is set. If you want to dynamically
 * hide some cells, you can do so by changing the hidden attribute.
 *
 * To customize animation, this component offers two different hooks that you may implement. Those two hooks must either
 * return a Motion-based animation controls.
 *
 * - getPlayerDurationForSlide: return the duration (in seconds) for a given slide. This is used to control the duration of
 *      the autoplay. By default, it uses the autoplay attribute, but you can override it to have a different duration per slide.
 * - createOnBecameVisibleAnimationControls: return the animation controls that execute the initial animation when the component
 *      become visible in view. This one will be executed only once, and allows to provide a different animation for the
 *      initial transition. It accepts in parameter the "toSlide" (the entering slide). A "carousel:settle" event is
 *      emitted once this promise/animation has finished.
 * - createOnChangeAnimationControls: return the animation controls that execute the animation when it changes from one
 *      slide to another. This one will be executed each time the slide changes. It accepts in parameter the "fromSlide",
 *      "toSlide" as well as an optional direction option ("previous" or "next"). A "carousel:settle" event is emitted
 *      once this promise/animation has finished. To control precisely the leaving and entering, you can optionally return
 *      an object defining "leaveControls" and "enterControls" functions:
 *
 *      return {
 *        leaveControls: () => animate(),
 *        enterControls: () => animate()
 *      }
 */

import {animate, animateSequence, inView} from "vendor";
import {GestureArea} from "../behavior";
import {matchesMediaQuery, mediaQueryListener, Player} from "../utilities";

export class EffectCarousel extends HTMLElement {
  #listenersAbortController;
  #gestureArea;
  #player;
  #targetIndex = 0;
  #preventInitialTransition = false;
  #hasPendingTransition = false;

  constructor() {
    super();

    this.#setupListeners();
    inView(this, () => this.onBecameVisible());

    // NOTE: this is done to handle an edge case where a user would switch very fast between two same cells (A to B and
    // B to A). When doing that the is-selected class would be removed from the destination, so this allows to normalize it
    this.addEventListener('carousel:settle', (event) => {
      this.allCells.forEach(cell => cell.classList.toggle('is-selected', cell === event.detail.cell));
    });
  }

  connectedCallback() {
    this.#targetIndex = Math.max(0, this.cells.findIndex(item => item.classList.contains('is-selected')));
    inView(this, () => this.#preloadImages());
  }

  /**
   * -------------------------------------------------------------------------------------------------------------------
   * PUBLIC API (PROPERTIES)
   * -------------------------------------------------------------------------------------------------------------------
   */

  get allowSwipe() {
    return this.hasAttribute('allow-swipe');
  }

  get cellSelector() {
    return this.hasAttribute('cell-selector') ? this.getAttribute('cell-selector') : null;
  }

  get blockChangeWhenTransitioning() {
    return false;
  }

  get allCells() {
    return this.cellSelector ? Array.from(this.querySelectorAll(this.cellSelector)): Array.from(this.children);
  }

  get cells() {
    return this.allCells.filter(cell => !cell.hasAttribute('hidden'));
  }

  get selectedCell() {
    return this.cells[this.selectedIndex];
  }

  get selectedIndex() {
    return this.#targetIndex;
  }

  get player() {
    return this.#player;
  }

  /**
   * -------------------------------------------------------------------------------------------------------------------
   * PUBLIC API (METHODS)
   * -------------------------------------------------------------------------------------------------------------------
   */

  canChangeSlide() {
    return !(this.blockChangeWhenTransitioning && this.#hasPendingTransition);
  }

  previous({instant = false} = {}) {
    return this.select(((this.selectedIndex - 1) + this.cells.length) % this.cells.length, {instant, direction: 'previous'});
  }

  next({instant = false} = {}) {
    return this.select(((this.selectedIndex + 1) + this.cells.length) % this.cells.length, {instant, direction: 'next'});
  }

  async select(index, {instant = false, direction = null} = {}) {
    if (!(index in this.cells) || (this.blockChangeWhenTransitioning && this.#hasPendingTransition)) {
      return Promise.resolve(); // If the requested index is not part of the cells, we immediately return without doing anything
    }

    this.dispatchEvent(new CustomEvent('carousel:select', {detail: {index: index, cell: this.cells[index]}}));

    if (index === this.selectedIndex) {
      return Promise.resolve(); // No more work to do
    }

    this.#player?.pause(); // Pause existing timer to make sure it does not go to next slide

    const [fromSlide, toSlide] = [this.selectedCell, this.cells[index]];
    direction ??= (index > this.selectedIndex) ? 'next' : 'previous'; // If no direction we infer it from the current index

    // Dispatch the event as it has now changed thanks to the classes. We make sure to keep the internal new index as well
    this.#targetIndex = index;
    this.dispatchEvent(new CustomEvent('carousel:change', {detail: {index: index, cell: this.cells[index]}}));

    const animationControls = this.createOnChangeAnimationControls(fromSlide, toSlide, {direction});
    this.#hasPendingTransition = true;

    if ('leaveControls' in animationControls && 'enterControls' in animationControls) {
      const leaveAnimationControls = animationControls.leaveControls();

      if (instant) {
        leaveAnimationControls.complete();
      }

      await leaveAnimationControls;

      this.#player?.setDuration(await this.getPlayerDurationForSlide(toSlide));
      this.#player?.resume(true);

      fromSlide.classList.remove('is-selected');
      toSlide.classList.add('is-selected');

      const enterAnimationControls = animationControls.enterControls();

      if (instant) {
        enterAnimationControls.complete();
      }

      await enterAnimationControls;
    } else {
      if (instant) {
        animationControls.complete();
      }

      this.#player?.setDuration(await this.getPlayerDurationForSlide(toSlide));
      this.#player?.resume(true);

      toSlide.classList.add('is-selected');

      await animationControls;

      fromSlide.classList.remove('is-selected');
    }

    this.#hasPendingTransition = false;
    this.dispatchEvent(new CustomEvent('carousel:settle', {detail: {index: index, cell: this.cells[index]}}));
  }

  /**
   * Filter cells by indexes. This will automatically add the "hidden" attribute to cells whose index belong to this
   * list. It will also take care of properly adjusting the controls. As a reaction, a "carousel:filter" with the
   * filtered indexes will be emitted.
   */
  filter(indexes = []) {
    this.allCells.forEach((cell, index) => {
      cell.toggleAttribute('hidden', indexes.includes(index));
    });

    this.dispatchEvent(new CustomEvent('carousel:filter', {detail: {filteredIndexes: indexes}}));
  }

  async onBecameVisible() {
    const animationControls = this.createOnBecameVisibleAnimationControls(this.selectedCell);

    // Remove all the reveal on scroll attributes so that the animation can fire. It is important, for timing reason,
    // to remove the attribute AFTER creating the animation
    [this.selectedCell, ...this.selectedCell.querySelectorAll('[reveal-on-scroll]')].forEach((element) => {
      element.removeAttribute('reveal-on-scroll');
    });

    if (this.#preventInitialTransition && typeof animationControls.complete === 'function') {
      animationControls.complete(); // Happens in the theme editor when we reload the section
    }

    return animationControls.then(async () => {
      this.#player?.setDuration(await this.getPlayerDurationForSlide(this.selectedCell));
      this.#player?.resume(true); // Unpause the timer and restart from zero
      this.dispatchEvent(new CustomEvent('carousel:settle', {detail: {index: this.selectedIndex, cell: this.selectedCell}}));
    });
  }

  /**
   * The animation controls when the carousel enter into the view for the first time (by default, none)
   */
  createOnBecameVisibleAnimationControls(toSlide) {
    return animate(toSlide, {}, {duration: 0}); // By default, we do not perform specific animation
  }

  /**
   * Define the transition when the slide changes
   */
  createOnChangeAnimationControls(fromSlide, toSlide, {direction} = {}) {
    return animateSequence([
      [fromSlide, {opacity: [1, 0]}, {duration: 0.3}],
      [toSlide, {opacity: [0, 1]}, {duration: 0.3, at: '<'}]
    ]);
  }

  /**
   * This method is called whenever the slide changes. By default, it uses the duration set on the autoplay attribute,
   * but this can be overridden for each slide (the argument gives the new current slide). This can be useful for
   * slideshow for instance, to have a different duration for video slide.
   *
   * Please note this is an async function, because the metadata (video duration) might not be available yet.
   */
  async getPlayerDurationForSlide(slide) {
    return this.getAttribute('autoplay') ?? 5;
  }

  /**
   * When the breakpoint changes (for instance from mobile to desktop), we may have to clean up the existing
   * attributes leave by Motion
   */
  cleanUpAnimations() {
    this.allCells.forEach(cell => {
      cell.style.removeProperty('opacity');
      cell.style.removeProperty('visibility');
    });
  }

  /**
   * -------------------------------------------------------------------------------------------------------------------
   * PRIVATE
   * -------------------------------------------------------------------------------------------------------------------
   */

  async #setupListeners() {
    if (this.hasAttribute('disabled-on')) {
      // We set up a listener so that we can re-initialize if breakpoint changes
      mediaQueryListener(this.getAttribute('disabled-on'), (event) => {
        if (event.matches) {
          this.#listenersAbortController?.abort(); // Remove all the listeners as it is disabled!
          this.cleanUpAnimations(); // We may have had animations done, so we have to call a cleanup method
        } else {
          this.#setupListeners(); // Otherwise we re-setup the listeners
        }
      });

      if (matchesMediaQuery(this.getAttribute('disabled-on'))) {
        return; // Nothing to initialize as the carousel is disabled here
      }
    }

    this.#listenersAbortController = new AbortController();

    const listenerOptions = {signal: this.#listenersAbortController.signal};

    if (Shopify.designMode) {
      this.closest('.shopify-section').addEventListener('shopify:section:select', (event) => this.#preventInitialTransition = event.detail.load, listenerOptions);
    }

    if (this.allCells.length > 1) {
      this.addEventListener('carousel:change', this.#preloadImages);

      if (this.allowSwipe) {
        this.#gestureArea = new GestureArea(this, {signal: this.#listenersAbortController.signal});

        this.addEventListener('swipeleft', this.next, listenerOptions);
        this.addEventListener('swiperight', this.previous, listenerOptions);
      }

      if (!this.hasAttribute('disable-keyboard-navigation')) {
        this.tabIndex = 0; // Needed to allow keyboard navigation
        this.addEventListener('keydown', this.#onKeyboardNavigation, listenerOptions);
      }

      if (Shopify.designMode) {
        this.addEventListener('shopify:block:select', (event) => this.select(this.cells.indexOf(event.target), {instant: event.detail.load}), listenerOptions);
      }

      if (this.hasAttribute('autoplay')) {
        this.#player ??= new Player();
        this.#player.addEventListener('player:end', this.next.bind(this), listenerOptions);

        if (this.hasAttribute('pause-on-hover')) {
          this.addEventListener('mouseenter', () => this.#player.pause(), listenerOptions);
          this.addEventListener('mouseleave', () => this.#player.resume(), listenerOptions);
        }

        if (Shopify.designMode) {
          this.addEventListener('shopify:block:select', () => this.#player.stop(), listenerOptions);
          this.addEventListener('shopify:block:deselect', () => this.#player.start(), listenerOptions);
        }
      }
    }
  }

  /**
   * -------------------------------------------------------------------------------------------------------------------
   * OTHER
   * -------------------------------------------------------------------------------------------------------------------
   */

  #onKeyboardNavigation(event) {
    if (event.target !== this) {
      return;
    }

    if (event.code === 'ArrowLeft') {
      this.previous();
    } else if (event.code === 'ArrowRight') {
      this.next();
    }
  }

  #preloadImages() {
    // We preload next and previous image to improve perceived performance
    const previousSlide = this.cells[((this.selectedIndex - 1) + this.cells.length) % this.cells.length],
      nextSlide = this.cells[((this.selectedIndex + 1) + this.cells.length) % this.cells.length];

    [previousSlide, this.selectedCell, nextSlide].forEach(item => {
      Array.from(item.querySelectorAll('img[loading="lazy"]')).forEach(img => img.removeAttribute('loading'));
      Array.from(item.querySelectorAll('video[preload="none"]')).forEach(video => video.setAttribute('preload', 'metadata'));
    });
  }
}

if (!window.customElements.get('effect-carousel')) {
  window.customElements.define('effect-carousel', EffectCarousel);
}