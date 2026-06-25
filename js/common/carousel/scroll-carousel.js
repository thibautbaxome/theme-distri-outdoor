/**
 * A scroll carousel is a specialized kind of carousel that allows to use native scrolling to navigate between
 * a list of cells.
 *
 * Contrary to an effect carousel, a scroll carousel can show several cells at the same time. It can be used along
 * scroll-snapping to have more efficient experiences on mobile, for instance.
 *
 * The base markup of a scroll carousel is as below (the "is-initial" class can be applied to the initial slide on
 * which you want to scroll to ; if none is set the carousel will scroll initially to the first cell)
 *
 * <scroll-carousel>
 *   <div class="item is-initial"></div>
 *   <div class="item"></div>
 *   <div class="item" hidden></div> // Hidden item
 * </effect-carousel>
 *
 * The following attributes can currently be added on an effect-carousel:
 *
 * - cell-selector: allows to filter the cells that are considered as cells
 * - allow-drag: if added, the carousel can be dragged with the mouse on desktop
 * - adaptive-height: if added, the carousel height will adapt to the cell height. This should be avoided when possible
 *                    to minimize layout shift
 * - group-cells: allows to scroll by more than one item at a time when using the prev/next buttons. If a specific number
 *                is given, it will scroll by this amount, otherwise it will scroll to fit what the viewport can accept
 *
 * It has the following public API:
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
 *
 * The component triggers the following events:
 *
 * - carousel:select => event emitted when the select method is called (even if the cell does not change). It is not
 *                      called on manual scroll (to monitor this, use the "carousel:change" event instead)
 * - carousel:change => event emitted when the cell changes
 * - carousel:settle => event emitted when the carousel has settled to a given position
 * - carousel:filter => event emitted when the cells have been filtered
 *
 * - scroll:edge-nearing => event emitted when the carousel nearing one edge of the scroll container
 * - scroll:edge-leaving => event emitted when the carousel leaving one edge of the scroll container
 *
 * To create navigation controls, you can use the dedicated "carousel-navigation", "carousel-prev-button" or
 * "carousel-next-button", which directly integrates with the carousel
 *
 * The carousel supports filtering items by ignoring any cell whose hidden attribute is set. If you want to dynamically
 * hide some cells, you can do so by changing the hidden attribute.
 */
import {inView} from "vendor";
import {throttle} from "../utilities";

export class ScrollCarousel extends HTMLElement {
  #hasPendingProgrammaticScroll = false;
  #onMouseDownListener = this.#onMouseDown.bind(this);
  #onMouseMoveListener = this.#onMouseMove.bind(this);
  #onMouseClickListener = this.#onMouseClick.bind(this);
  #onMouseUpListener = this.#onMouseUp.bind(this);
  #targetIndex = 0; // The cell index to which we are currently going to
  #forceChangeEvent = false;
  #dragPosition = {};
  #isDragging = false;
  #dispatchableScrollEvents = {nearingStart: true, nearingEnd: true, leavingStart: true, leavingEnd: true};
  #scrollTimeout;

  constructor() {
    super();

    // We've found that under some circumstances, Safari put the initial offsetLeft at a value different than 0. We could not
    // find the exact cause, but it seems to be a bug involving scroll-snap-align with, maybe, container queries. To workaround this,
    // we force the scroll to be 0 initially.
    this.scrollTo({ left: 0, behavior: 'instant' });

    this.#setupListeners();

    (new ResizeObserver(this.#onResize.bind(this))).observe(this);
    (new MutationObserver(this.#onMutate.bind(this)).observe(this, {subtree: true, attributes: true, attributeFilter: ['hidden']}));
  }

  connectedCallback() {
    // We check if there is a cell with the "is-initial" class and scroll to it eventually
    this.#targetIndex = Math.max(0, this.cells.findIndex(item => item.classList.contains('is-initial')));

    // @TODO: when browsers will support the "scroll-start-target", we can remove that to prevent reflow on load
    if (this.#targetIndex > 0) {
      this.select(this.#targetIndex, {instant: true});
    }

    if (this.adaptiveHeight) {
      this.#adaptHeight();
    }

    inView(this, () => this.#preloadImages());
  }

  disconnectedCallback() {
    this.removeEventListener('mousemove', this.#onMouseMoveListener);
    document.removeEventListener('mouseup', this.#onMouseUpListener);
  }

  /**
   * -------------------------------------------------------------------------------------------------------------------
   * PUBLIC API (PROPERTIES)
   * -------------------------------------------------------------------------------------------------------------------
   */

  canChangeSlide() {
    return true;
  }

  get cellSelector() {
    return this.hasAttribute('cell-selector') ? this.getAttribute('cell-selector') : null;
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

  get cellAlign() {
    // We use the scroll-snap-align defined on the first cell, by convention (fallbacks to center if none is set)
    const scrollSnapAlign = getComputedStyle(this.cells[0]).scrollSnapAlign;
    return scrollSnapAlign === 'none' ? 'center' : scrollSnapAlign;
  }

  get groupCells() {
    if (this.hasAttribute('group-cells')) {
      // If group-cells is not a number, then we calculate the number of cells that can fit. We are doing a simplification
      // here by assuming all cells make the same width
      const number = parseInt(this.getAttribute('group-cells'));
      return isNaN(number) ? Math.floor(this.clientWidth / this.cells[0].clientWidth) : number;
    } else {
      return 1;
    }
  }

  get adaptiveHeight() {
    return this.hasAttribute('adaptive-height');
  }

  get isScrollable() {
    // This is needed to take into account a rounding issue on Safari when the user zoom in the page. Safari, for some
    // reasons, returns a 1px difference, which must be ignored
    const differenceWidth = this.scrollWidth - this.clientWidth;
    const differenceHeight = this.scrollHeight - this.clientHeight;
    
    return differenceWidth > 1 || differenceHeight > 1;
  }

  /**
   * -------------------------------------------------------------------------------------------------------------------
   * PUBLIC API (METHODS)
   * -------------------------------------------------------------------------------------------------------------------
   */

  previous({instant = false} = {}) {
    this.select(Math.max(this.#targetIndex - this.groupCells, 0), {instant});
  }

  next({instant = false} = {}) {
    this.select(Math.min(this.#targetIndex + this.groupCells, this.cells.length - 1), {instant});
  }

  select(index, {instant = false} = {}) {
    if (!(index in this.cells)) {
      return; // If the requested index is not part of the cells, we immediately return without doing anything
    }

    // Send select event even when it has not changed
    this.dispatchEvent(new CustomEvent('carousel:select', {detail: {index: index, cell: this.cells[index]}}));

    if (('checkVisibility' in this && this.checkVisibility()) || (this.offsetWidth > 0 && this.offsetHeight > 0)) {
      const targetScrollLeft = this.#calculateLeftScroll(this.cells[index]);

      if (this.scrollLeft !== targetScrollLeft) {
        this.#updateTargetIndex(index);
        this.#hasPendingProgrammaticScroll = true;

        this.scrollTo({left: targetScrollLeft, behavior: instant ? 'auto' : 'smooth'});
      } else {
        this.#updateTargetIndex(this.#calculateClosestIndexToAlignment());
      }
    } else {
      this.#targetIndex = index; // If the carousel is hidden, we cannot scroll, so we just save the current targeted index
      this.#forceChangeEvent = true; // Force the change event to be emitted on next update
    }
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

    this.#forceChangeEvent = true;
    this.dispatchEvent(new CustomEvent('carousel:filter', {detail: {filteredIndexes: indexes}}));
  }

  /**
   * -------------------------------------------------------------------------------------------------------------------
   * PRIVATE METHODS
   * -------------------------------------------------------------------------------------------------------------------
   */

  /**
   * Setup all the listeners needed for the carousel to work properly
   */
  #setupListeners() {
    if (this.allCells.length > 1) {
      this.addEventListener('carousel:change', this.#preloadImages);
      this.addEventListener('scroll', throttle(this.#onScroll.bind(this)));
      this.addEventListener('scrollend', this.#onScrollEnd);

      if (this.hasAttribute('allow-drag')) {
        const mediaQuery = window.matchMedia('screen and (pointer: fine)');

        mediaQuery.addEventListener('change', (event) => {
          if (event.matches) {
            this.addEventListener('mousedown', this.#onMouseDownListener);
          } else {
            this.removeEventListener('mousedown', this.#onMouseDownListener)
          }
        });

        if (mediaQuery.matches) {
          this.addEventListener('mousedown', this.#onMouseDownListener);
        }
      }

      if (this.adaptiveHeight) {
        this.addEventListener('carousel:settle', this.#adaptHeight);
      }

      if (Shopify.designMode) {
        this.addEventListener('shopify:block:select', (event) => this.select(this.cells.indexOf(event.target), {instant: event.detail.load}));
      }
    }
  }

  #updateTargetIndex(newValue) {
    if (newValue === this.#targetIndex && !this.#forceChangeEvent) {
      return; // Already the same target index, so we do nothing
    }

    this.#targetIndex = newValue;
    this.#forceChangeEvent = false;
    this.dispatchEvent(new CustomEvent('carousel:change', {detail: {index: newValue, cell: this.cells[newValue]}}));
  }

  /**
   * -------------------------------------------------------------------------------------------------------------------
   * SCROLL MANAGEMENT
   * -------------------------------------------------------------------------------------------------------------------
   */

  #onScroll() {
    const scrollEdgeThreshold = 100,
      normalizedScrollLeft = Math.round(Math.abs(this.scrollLeft - Math.abs(parseInt(getComputedStyle(this).marginInlineStart) || 0))); // Allow to handle RTL

    /**
     * Detect the leaving/nearing an edge (this has to be done for both programmatic and manual scrolling)
     */

    if ((normalizedScrollLeft < scrollEdgeThreshold) && this.#dispatchableScrollEvents['nearingStart']) {
      this.dispatchEvent(new CustomEvent('scroll:edge-nearing', {detail: {position: 'start'}}));
      this.#dispatchableScrollEvents['nearingStart'] = false;
      this.#dispatchableScrollEvents['leavingStart'] = true;
    }

    if ((normalizedScrollLeft >= scrollEdgeThreshold) && this.#dispatchableScrollEvents['leavingStart']) {
      this.dispatchEvent(new CustomEvent('scroll:edge-leaving', {detail: {position: 'start'}}));
      this.#dispatchableScrollEvents['leavingStart'] = false;
      this.#dispatchableScrollEvents['nearingStart'] = true;
    }

    if (((this.scrollWidth - this.clientWidth) < (normalizedScrollLeft + scrollEdgeThreshold)) && this.#dispatchableScrollEvents['nearingEnd']) {
      this.dispatchEvent(new CustomEvent('scroll:edge-nearing', {detail: {position: 'end'}}));
      this.#dispatchableScrollEvents['nearingEnd'] = false;
      this.#dispatchableScrollEvents['leavingEnd'] = true;
    }

    if (((this.scrollWidth - this.clientWidth) >= (normalizedScrollLeft + scrollEdgeThreshold)) && this.#dispatchableScrollEvents['leavingEnd']) {
      this.dispatchEvent(new CustomEvent('scroll:edge-leaving', {detail: {position: 'end'}}));
      this.#dispatchableScrollEvents['leavingEnd'] = false;
      this.#dispatchableScrollEvents['nearingEnd'] = true;
    }

    // Polyfill the scrollend event, which is currently only available on Chrome
    if (!('onscrollend' in window)) {
      clearTimeout(this.#scrollTimeout);

      this.#scrollTimeout = setTimeout(() => {
        this.dispatchEvent(new CustomEvent('scrollend', {bubbles: true}));
      }, 75);
    }

    /**
     * For manual scrolling only, detect when the slide changes. What we need to do is, based on the cell-align
     * attribute, find the cell
     */

    if (this.#hasPendingProgrammaticScroll) {
      return;
    }

    this.#updateTargetIndex(this.#calculateClosestIndexToAlignment());
  }

  #onScrollEnd() {
    this.#hasPendingProgrammaticScroll = false; // Restore the flag to ensure we can catch other scroll events

    if (!this.#isDragging) {
      this.style.removeProperty('scroll-snap-type');
    }

    /**
     * On iOS, there can be an issue under a very, very specific condition: if you initiate a manual scroll with touch
     * and then filter the cells (for instance by using the image variant grouping), this can lead to the incorrect
     * image being selected. I have found a fix but, unfortunately, it causes a problem on a more much widespread use case,
     * so I preferred to not include this fix as it solves a very, very rare issue, but in turn bring a problem on a more
     * general use case. However, I am keeping the code below in case a merchant would complain about it
     */
    
    this.#updateTargetIndex(this.#calculateClosestIndexToAlignment()); // Ensure the target index is restored to its closest position
    this.dispatchEvent(new CustomEvent('carousel:settle', {detail: {index: this.selectedIndex, cell: this.selectedCell}}));

    /**
     * On iOS, there can be an issue under a very, very specific condition: if you initiate a manual scroll with touch
     * and then filter the cells (for instance by using the image variant grouping), this can lead to the incorrect
     * image being selected. I have found a fix but, unfortunately, it causes a problem on a more much widespread use case,
     * so I preferred to not include this fix as it solves a very, very rare issue, but in turn bring a problem on a more
     * general use case. However, I am keeping the code below in case a merchant would complain about it. You also need to comment
     * the line with the codde: this.#updateTargetIndex(this.#calculateClosestIndexToAlignment());
     */
    //this.scrollTo({ left: this.#calculateLeftScroll(this.selectedCell), behavior: 'instant' });
  }

  /**
   * Calculate the amount to scroll to align the cell with the "cell-align" rule
   */
  #calculateLeftScroll(cell) {
    let scrollLeft;

    switch (this.cellAlign) {
      case 'start':
        // We need to align the start edge of the target to the start edge of the parent
        scrollLeft = document.dir === 'ltr'
          ? cell.offsetLeft - (parseInt(getComputedStyle(this).scrollPaddingInlineStart) || 0) - (parseInt(getComputedStyle(this).marginInlineStart) || 0) - (parseInt(getComputedStyle(this).paddingInlineStart) || 0)
          : (cell.offsetLeft + cell.offsetWidth) - this.clientWidth + (parseInt(getComputedStyle(this).scrollPaddingInlineStart) || 0) + (parseInt(getComputedStyle(this).marginInlineStart) || 0) + (parseInt(getComputedStyle(this).paddingInlineStart) || 0);

        break;

      case 'center':
        // We need to align the center of the target slide to the center of the scrollable container
        scrollLeft = Math.round(cell.offsetLeft - (this.clientWidth / 2) + (cell.clientWidth / 2));

        break;

      case 'end':
        // We need to align the end edge of the target to the end edge of the parent
        scrollLeft = document.dir === 'ltr'
          ? (cell.offsetLeft + cell.offsetWidth) - this.clientWidth + (parseInt(getComputedStyle(this).scrollPaddingInlineEnd) || 0) + (parseInt(getComputedStyle(this).marginInlineEnd) || 0) + (parseInt(getComputedStyle(this).paddingInlineEnd) || 0)
          : cell.offsetLeft - (parseInt(getComputedStyle(this).scrollPaddingInlineEnd) || 0) - (parseInt(getComputedStyle(this).marginInlineEnd) || 0) - (parseInt(getComputedStyle(this).paddingInlineEnd) || 0);

        break;
    }

    // We have to clamp the value to make sure it stays within the bounds

    return document.dir === 'ltr'
      ? Math.min(Math.max(scrollLeft, 0), this.scrollWidth - this.clientWidth)
      : Math.min(Math.max(scrollLeft, this.clientWidth - this.scrollWidth), 0);
  }

  #calculateClosestIndexToAlignment() {
    let cellAlign = this.cellAlign,
      offsetAccumulators,
      targetPoint;

    if (cellAlign === 'center') {
      // When aligning at the middle, we consider the selected slide the one whose middle point is closer to center of scroller
      offsetAccumulators = this.cells.map(cell => Math.round(cell.offsetLeft + cell.clientWidth / 2));
      targetPoint = Math.round(this.scrollLeft + this.clientWidth / 2);
    } else if ((cellAlign === 'start' && document.dir === 'ltr') || (cellAlign === 'end' && document.dir === 'rtl')) {
      // When aligning on the start, we want to consider as the selected the "offsetLeft" that is the closest to start edge of scroller
      offsetAccumulators = this.cells.map(cell => cell.offsetLeft - (parseInt(getComputedStyle(this).scrollPaddingInlineStart) || 0) - (parseInt(getComputedStyle(this).marginInlineStart) || 0) - (parseInt(getComputedStyle(this).paddingInlineStart) || 0));
      targetPoint = this.scrollLeft;
    } else {
      // When aligning on the end, we want to consider as the selected the "offsetRight" that is the closest to end edge of scroller
      offsetAccumulators = this.cells.map(cell => cell.offsetLeft + cell.clientWidth);
      targetPoint = this.scrollLeft + this.clientWidth;
    }

    return offsetAccumulators.indexOf(offsetAccumulators.reduce((prev, curr) => Math.abs(curr - targetPoint) < Math.abs(prev - targetPoint) ? curr : prev));
  }

  /**
   * -------------------------------------------------------------------------------------------------------------------
   * DRAG FEATURE
   * -------------------------------------------------------------------------------------------------------------------
   */

  #onMouseDown(event) {
    this.#dragPosition = {
      // The current scroll
      left: this.scrollLeft,
      top: this.scrollTop,

      // Get the current mouse position
      x: event.clientX,
      y: event.clientY,
    };

    this.#isDragging = true;
    this.style.setProperty('scroll-snap-type', 'none');

    this.addEventListener('mousemove', this.#onMouseMoveListener);
    this.addEventListener('click', this.#onMouseClickListener, {once: true});
    document.addEventListener('mouseup', this.#onMouseUpListener); // Attaching to document this one allows to catch outside release
  }

  #onMouseMove(event) {
    event.preventDefault();

    // How far the mouse has been moved
    const [dx, dy] = [event.clientX - this.#dragPosition.x, event.clientY - this.#dragPosition.y];

    // Scroll the element
    this.scrollTop = this.#dragPosition.top - dy;
    this.scrollLeft = this.#dragPosition.left - dx;
  }

  #onMouseClick(event) {
    if ((event.clientX - this.#dragPosition.x) !== 0) {
      event.preventDefault();
    }
  }

  #onMouseUp(event) {
    this.#isDragging = false;

    // If we have not dragged at all, then we have to remove the scroll-snap
    if ((event.clientX - this.#dragPosition.x) === 0) {
      this.style.removeProperty('scroll-snap-type');
    } else if (!this.#hasPendingProgrammaticScroll) {
      this.scrollTo({left: this.#calculateLeftScroll(this.selectedCell), behavior: 'smooth'});
    }

    this.removeEventListener('mousemove', this.#onMouseMoveListener);
    document.removeEventListener('mouseup', this.#onMouseUpListener);
  }

  /**
   * -------------------------------------------------------------------------------------------------------------------
   * OTHER
   * -------------------------------------------------------------------------------------------------------------------
   */

  #onResize() {
    if (this.selectedIndex !== this.#calculateClosestIndexToAlignment()) {
      this.select(this.selectedIndex, {instant: true}); // Force the carousel to be repositioned (in case the carousel went from a display none to block for instance)
    }

    if (this.adaptiveHeight) {
      this.#adaptHeight();
    }

    this.classList.toggle('is-scrollable', this.scrollWidth > this.clientWidth);
  }

  #onMutate() {
    // This method is called when one of the cells is becoming hidden. We therefore have to toggle the attribute to force re-emitting change event
    this.#forceChangeEvent = true;
  }

  #adaptHeight() {
    if (this.clientHeight === this.selectedCell.clientHeight) {
      return;
    }

    this.style.maxHeight = null;

    if (this.isScrollable) {
      this.style.maxHeight = `${this.selectedCell.clientHeight}px`;
    }
  }

  #preloadImages() {
    // We preload next and previous image to improve perceived performance
    requestAnimationFrame(() => {
      const previousSlide = this.cells[Math.max(this.selectedIndex - 1, 0)],
      nextSlide = this.cells[Math.min(this.selectedIndex + 1, this.cells.length - 1)];

      [previousSlide, this.selectedCell, nextSlide].filter(item => item !== null).forEach(item => {
        Array.from(item.querySelectorAll('img[loading="lazy"]')).forEach(img => img.removeAttribute('loading'));
        Array.from(item.querySelectorAll('video[preload="none"]')).forEach(video => video.setAttribute('preload', 'metadata'));
      });
    });
  }
}

if (!window.customElements.get('scroll-carousel')) {
  window.customElements.define('scroll-carousel', ScrollCarousel);
}