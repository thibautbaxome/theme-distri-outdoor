import { animate, animateSequence, stagger, frame, Delegate } from "vendor";
import { DialogElement } from "../common/overlay/dialog-element";
import { throttle } from "../common/utilities";

/**
 * Provides basic functionality for the header
 */
export class Header extends HTMLElement {
  #headerTrackerIntersectionObserver = new IntersectionObserver(this.#onHeaderTrackerIntersection.bind(this));
  #abortController;
  #scrollYTrackingPosition = 0;
  #isVisible = true;

  connectedCallback() {
    this.#abortController = new AbortController();
    this.#headerTrackerIntersectionObserver.observe(document.getElementById('header-scroll-tracker'));

    if (this.hasAttribute('hide-on-scroll')) {
      window.addEventListener('scroll', throttle(this.#detectScrollDirection.bind(this)), {signal: this.#abortController.signal, passive: true});
      window.addEventListener('pointermove', this.#detectMousePosition.bind(this), {signal: this.#abortController.signal});
    }

    document.addEventListener('header:allow-transparent-header', () => this.classList.remove('is-solid'), {signal: this.#abortController.signal});
    document.addEventListener('header:disable-transparent-header', () => this.classList.add('is-solid'), {signal: this.#abortController.signal});
  }

  disconnectedCallback() {
    this.#abortController.abort();
  }

  #onHeaderTrackerIntersection(entries) {
    this.classList.toggle('is-solid', !entries[0].isIntersecting);
  }

  #detectMousePosition(event) {
    if (event.clientY < 100 && window.matchMedia('screen and (pointer: fine)').matches) {
      this.#setVisibility(true);
      this.#scrollYTrackingPosition = 0;
    }
  }

  #detectScrollDirection() {
    let isVisible;
    let absScrollY = Math.abs(window.scrollY); // Due to elastic bounding on iOS, the value can be negative so we need to use absolute value

    if (absScrollY > this.#scrollYTrackingPosition && (absScrollY - this.#scrollYTrackingPosition) > 100) {
      isVisible = false;
      this.#scrollYTrackingPosition = absScrollY;
    } else if (absScrollY < this.#scrollYTrackingPosition) {
      this.#scrollYTrackingPosition = absScrollY;
      isVisible = true;
    }

    if (isVisible !== undefined) {
      this.#setVisibility(isVisible);
    }
  }

  #setVisibility(isVisible) {
    if (isVisible !== this.#isVisible) {
      if (!isVisible && this.querySelectorAll('[open]').length > 0) {
        return; // We don't hide the header if there is an open dialog
      }

      this.#isVisible = isVisible;

      document.documentElement.style.setProperty('--header-is-visible', isVisible ? '1' : '0');
      this.classList.toggle('is-hidden', !isVisible);
    }
  }
}

/**
 * Dropdown menu dialog
 */

export class HeaderDropdownMenu extends DialogElement {
  get trapStack() {
    return []; // Return a new, empty stack for drop-down menu, so that when another dialog is closed, they all closed
  }

  createEnterAnimationControls() {
    const timelineSteps = [[this, { opacity: [0, 1] }, { duration: 0.2 }]];

    if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
      timelineSteps.push([this.querySelectorAll(':scope > ul > li'), { opacity: [0, 1], transform: ['translateY(0.8em)', 'translateY(0)'] }, { duration: 0.1, at: '-0.1', delay: stagger(0.05), ease: 'easeInOut' }]);
    }

    return animateSequence(timelineSteps);
  }

  createLeaveAnimationControls() {
    return animateSequence([
      [this, { opacity: [1, 0] }, { duration: 0.2 }]
    ]);
  }
}

/**
 * Mega menu dialog
 */

export class HeaderMegaMenu extends DialogElement {
  createEnterAnimationControls() {
    const timelineSteps = [[this, { opacity: [0, 1] }, { duration: 0.2, ease: 'easeInOut' }]];

    // We only perform animation if there are navigation links. If we only have promo blocks, we don't perform stagger animations
    const links = this.querySelectorAll('.mega-menu__navigation > *');

    if (links.length > 0 && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
      timelineSteps.push(
        [links, { opacity: [0, 1], transform: ['translateY(1em)', 'translateY(0)'] }, { duration: 0.2, at: '-0.1', delay: stagger(0.05), ease: 'easeInOut' }],
        [this.querySelectorAll('.menu-promo'), { opacity: [0, 1] }, { duration: 0.3, at: '-0.1', ease: 'easeInOut' }]
      );
    }

    return animateSequence(timelineSteps);
  }

  createLeaveAnimationControls() {
    return animateSequence([
      [this, { opacity: [1, 0] }, { duration: 0.2 }]
    ])
  }
}

/**
 * Drawer (used for the main menu)
 */

export class HeaderMenuDrawer extends DialogElement {
  #delegate = new Delegate(this);
  #isTransitioningPanel = false;

  constructor() {
    super();

    this.addEventListener('dialog:before-show', this.#onBeforeShow.bind(this));
    this.addEventListener('dialog:after-hide', this.#onAfterHide.bind(this));
    this.#delegate.on('click', '[data-panel-toggle]', (event, target) => this.#onSwitchToPanel(target.getAttribute('aria-controls')));

    if (window.onscrollend !== undefined) {
      // For modern browsers we use scrollend instead as it is more efficient and enough to check on end
      window.addEventListener('scrollend', this.#calculateOffsets.bind(this));
    } else {
      window.addEventListener('scroll', this.#calculateOffsets.bind(this));
    }
  }

  get shouldLock() {
    return true;
  }

  createEnterAnimationControls() {
    const timelineSteps = [
      [this.getShadowPartByName('overlay'), { opacity: [0, 1] }, { duration: 0.2 }]
    ];

    if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
      timelineSteps.push(
        [this.getShadowPartByName('content'), { transform: ['translateX(calc(var(--transform-logical-flip) * -100%))', 'translateX(0)'] }, { duration: 0.35, at: '<', ease: [0.2, 0.4, 0.2, 1] }]
      )
    } else {
      timelineSteps.push(
        [this.getShadowPartByName('content'), { opacity: [0, 1] }, { duration: 0.2, at: '<' }]
      )
    }

    return animateSequence(timelineSteps);
  }

  createLeaveAnimationControls() {
    const timelineSteps = [
      [this.getShadowPartByName('overlay'), { opacity: [1, 0] }, { duration: 0.25 }]
    ]

    if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
      timelineSteps.push(
        [this.shadowRoot.querySelector('slot').assignedElements(), { opacity: [1, 0] }, { duration: 0.15, ease: 'easeInOut', at: '<' }],
        [this.getShadowPartByName('content'), { transform: ['translateX(0)', 'translateX(calc(var(--transform-logical-flip) * -100%))'] }, { duration: 0.25, ease: [0.645, 0.045, 0.355, 1] }]
      );
    } else {
      timelineSteps.push(
        [this.getShadowPartByName('content'), { opacity: [1, 0] }, { duration: 0.2, at: '<' }]
      );
    }

    return animateSequence(timelineSteps);
  }

  /**
   * Before the drawer is open, we calculate the offsets and show the main panel
   */
  #onBeforeShow() {
    this.#calculateOffsets();
    this.querySelector(`#menu-drawer-panel-main`)?.show({ initial: true });
  }

  /**
   * After the drawer is fully closed, we hide all existing panels
   */
  #onAfterHide() {
    this.querySelectorAll('header-menu-drawer-panel').forEach(panel => panel.hide({ instant: true }));
  }

  /**
   * Handle the switch panel event
   */
  async #onSwitchToPanel(panelId) {
    if (this.#isTransitioningPanel) {
      return; // We do not allow to switch panels while a transition is already in progress
    }
    
    const fromPanel = this.querySelector(`header-menu-drawer-panel.is-visible`);
    const toPanel = this.querySelector(`header-menu-drawer-panel#${panelId}`);
    
    this.#isTransitioningPanel = true;

    // The two animations have to be performed at the same time
    const hidePromise = fromPanel.hide();
    const showPromise = toPanel.show({ initial: false });

    Promise.all([hidePromise, showPromise]).then(() => {
      this.#isTransitioningPanel = false;
    });
  }

  #calculateOffsets() {
    if (!this.open) {
      return; // We do a quick reject if the drawer is not opened as we do not need to calculate offsets
    }

    const boundingRect = this.getShadowPartByName('content').getBoundingClientRect();
    this.style.setProperty('--menu-offset-top', `${boundingRect.top}px`);
  }
}

/**
 * This component controls the first level of the drawer menu
 */
export class HeaderMenuDrawerPanel extends HTMLElement {
  async show({ initial = true } = {}) {
    this.classList.add('is-visible');

    if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
      const rtlFlip = document.dir === 'rtl' ? -1 : 1;

      /**
       * The initial transition is when the drawer is first opened, so we stagger the elements. Non-initial transitions happen
       * when changing from one panel to another. For those animation, the new panel comes from the right and the old panel goes to the left.
       */
      if (initial) {
        return animateSequence([
          [this.querySelectorAll('.menu-drawer__panel-body > *'), { opacity: [0, 1], transform: ['translateY(1em)', 'translateY(0)'] }, { duration: 0.2, delay: stagger(0.1, { startDelay: 0.4 }) }],
          [this.querySelector('.menu-drawer__panel-footer'), { opacity: [0, 1], transform: ['translateY(1em)', 'translateY(0)'] }, { duration: 0.2, at: '-0.1', ease: 'easeInOut' }]
        ]);
      } else {
        if (this.hasAttribute('data-main-panel')) {
          return animateSequence([
            [this, { background: ['rgb(0 0 0 / 0.15)', 'rgb(0 0 0 / 0)'], transform: [`translateX(${-30 * rtlFlip}%)`, 'translateX(0)'] }, { duration: 0.25, ease: 'easeInOut' }],
          ]);
        } else {
          return animateSequence([
            [this, { transform: [`translateX(${rtlFlip * 100}%)`, 'translateX(0)'] }, { duration: 0.4, ease: [0.645, 0.045, 0.355, 1] }],
          ]);
        }
      }
    } else {
      return animateSequence([
        [this, { opacity: [0, 1] }, { duration: 0.2 } ]
      ])
    }
  }

  async hide({ instant = false } = {}) {
    let promise = Promise.resolve();

    if (!instant) {
      if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
        const rtlFlip = document.dir === 'rtl' ? -1 : 1;

        if (this.hasAttribute('data-main-panel')) {
          promise = animateSequence([
            [this, { background: ['rgb(0 0 0 / 0)', 'rgb(0 0 0 / 0.15)'], transform: ['translateX(0)', `translateX(${-30 * rtlFlip}%)`] }, { duration: 0.4, ease: [0.645, 0.045, 0.355, 1] }],
          ]);
        } else {
          promise = animateSequence([
            [this, { transform: ['translateX(0%)', `translateX(${100 * rtlFlip}%)`] }, { duration: 0.25, ease: 'easeInOut' }],
          ]);
        }
      } else {
        promise = animateSequence([
          [this, { opacity: [1, 0] }, { duration: 0.2 } ]
        ]);
      }
    }

    return promise.then(() => {
      frame.render(() => {
        this.style = '';
        this.classList.remove('is-visible');
      })
    });
  }
}

/**
 * Header menu dropdown sidebar
 *
 * This component is used when desktop layout is configured to "logo center, navigation left" and that
 * secondary menu are displayed in a sidebar. It is pretty similar to the drawer menu, but the logic is different
 * as it starts at the second level instead of the first, and the transition between panels is also very different, so
 * we preferred to create its own component to keep the logic clearer.
 */

export class HeaderMenuDropdownSidebar extends DialogElement {
  #delegate = new Delegate(this);

  constructor() {
    super();

    this.#delegate.on('click', '[aria-current="false"][data-link-position]', this.#onFirstLevelClicked.bind(this));

    this.addEventListener('dialog:before-show', this.#onBeforeShow.bind(this));
    this.addEventListener('dialog:after-hide', this.#onAfterHide.bind(this));

    if (window.onscrollend !== undefined) {
      // For modern browsers we use scrollend instead as it is more efficient and enough to check on end
      window.addEventListener('scrollend', this.#calculateOffsets.bind(this));
    } else {
      window.addEventListener('scroll', this.#calculateOffsets.bind(this));
    }
  }

  get shouldLock() {
    return true;
  }

  createEnterAnimationControls() {
    const timelineSteps = [
      [this.getShadowPartByName('overlay'), { opacity: [0, 1] }, { duration: 0.2 }]
    ];

    if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
      timelineSteps.push(
        [this.getShadowPartByName('content'), { transform: ['translateX(calc(var(--transform-logical-flip) * -100%))', 'translateX(0)'] }, { duration: 0.35, at: '<', ease: [0.2, 0.4, 0.2, 1] }],
        [this.querySelectorAll('.menu-drawer__panel-body'), { opacity: [0, 1], transform: ['translateY(1em)', 'translateY(0)'] }, { duration: 0.2, delay: stagger(0.1) }],
        [this.querySelector('.menu-drawer__panel-footer'), { opacity: [0, 1], transform: ['translateY(1em)', 'translateY(0)'] }, { duration: 0.2, at: '-0.1', ease: 'easeInOut' }]
      )
    } else {
      timelineSteps.push(
        [this.getShadowPartByName('content'), { opacity: [0, 1] }, { duration: 0.2, at: '<' }]
      )
    }

    return animateSequence(timelineSteps);
  }

  createLeaveAnimationControls() {
    const timelineSteps = [
      [this.getShadowPartByName('overlay'), { opacity: [1, 0] }, { duration: 0.25 }]
    ]

    if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
      timelineSteps.push(
        [this.querySelectorAll('.menu-drawer__panel-body, .menu-drawer__panel-footer'), { opacity: [1, 0] }, { duration: 0.15, ease: 'easeInOut', at: '<' }],
        [this.getShadowPartByName('content'), { transform: ['translateX(0)', 'translateX(calc(var(--transform-logical-flip) * -100%))'] }, { duration: 0.25, at: '<', ease: [0.645, 0.045, 0.355, 1] }]
      );
    } else {
      timelineSteps.push(
        [this.getShadowPartByName('content'), { opacity: [1, 0] }, { duration: 0.2, at: '<' }]
      );
    }

    return animateSequence(timelineSteps);
  }

  /**
   * Before the drawer is open, we calculate the offsets and show the main panel
   */
  #onBeforeShow(event) {
    this.#calculateOffsets(); 
    this.#selectSidebarPosition(event.detail?.activator?.getAttribute('data-link-position'));
  }

  /**
   * When the drawer is fully closed, we hide all existing sidebar levels
   */
  #onAfterHide() {
    this.querySelectorAll('.menu-drawer__dropdown-sidebar-level').forEach(level => level.classList.remove('is-visible'));
    this.querySelectorAll('[aria-current][data-link-position]').forEach(activator => activator.setAttribute('aria-current', 'false'));
  }

  /**
   * When the drawer is opened and that we clicked on a different link, we change the position
   */
  #onFirstLevelClicked(event, target) {
    this.#selectSidebarPosition(target.getAttribute('data-link-position'));
  }

  /**
   * When select the correct sidebar position
   */
  async #selectSidebarPosition(position) {
    const sidebarLevels = Array.from(this.querySelectorAll('.menu-drawer__dropdown-sidebar-level[data-level-position]'));
    const selectedSidebarLevel = sidebarLevels.find(level => level.classList.contains('is-visible'));
    const activators = Array.from(this.querySelectorAll(`[aria-current][data-link-position]`));
    
    activators.forEach(activator => activator.setAttribute('aria-current', 'false'));
    (activators.find(activator => activator.getAttribute('data-link-position') === position) ?? activators[0]).setAttribute('aria-current', 'true');
    
    if (selectedSidebarLevel && position) {
      // If there is already a selected level, we animate the transition
      const transitionTo = sidebarLevels.find(level => level.getAttribute('data-level-position') === position);
      
      // We temporarily transition the element to be visible to get the height, so that we can perform an animation
      transitionTo.classList.add('is-visible');
      const toHeight = transitionTo.clientHeight;
      transitionTo.classList.remove('is-visible');

      await animate(selectedSidebarLevel, { opacity: [1, 0], height: [`${selectedSidebarLevel.clientHeight}px`, `${toHeight}px`] }, { duration: 0.15, ease: 'easeInOut' });
      selectedSidebarLevel.style.cssText = '';
      selectedSidebarLevel.classList.remove('is-visible');

      transitionTo.classList.add('is-visible');
      animate(transitionTo, { opacity: [0, 1] }, { duration: 0.15, ease: 'easeInOut' });
    } else {
      sidebarLevels.forEach(level => level.classList.remove('is-visible'));
      (sidebarLevels.find(level => level.getAttribute('data-level-position') === position) ?? sidebarLevels[0]).classList.add('is-visible');
    }
  }

  #calculateOffsets() {
    if (!this.open) {
      return; // We do a quick reject if the drawer is not opened as we do not need to calculate offsets
    }

    const boundingRect = this.getShadowPartByName('content').getBoundingClientRect();
    this.style.setProperty('--menu-offset-top', `${boundingRect.top}px`);
  }
}

if (!window.customElements.get('x-header')) {
  window.customElements.define('x-header', Header);
}

if (!window.customElements.get('header-dropdown-menu')) {
  window.customElements.define('header-dropdown-menu', HeaderDropdownMenu);
}

if (!window.customElements.get('header-mega-menu')) {
  window.customElements.define('header-mega-menu', HeaderMegaMenu);
}

if (!window.customElements.get('header-menu-drawer')) {
  window.customElements.define('header-menu-drawer', HeaderMenuDrawer);
}

if (!window.customElements.get('header-menu-drawer-panel')) {
  window.customElements.define('header-menu-drawer-panel', HeaderMenuDrawerPanel);
}

if (!window.customElements.get('header-menu-dropdown-sidebar')) {
  window.customElements.define('header-menu-dropdown-sidebar', HeaderMenuDropdownSidebar);
}