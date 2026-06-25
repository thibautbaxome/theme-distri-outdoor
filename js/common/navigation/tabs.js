import {Delegate, animate} from "vendor";

/**
 * Custom elements that handle tabs. Here is a minimal markup that shows how to use it (the selected-index attribute
 * is optional, and default to 0):
 *
 * <x-tabs selected-index="0">
 *   <template shadowrootmode="open">
 *     <slot role="tablist" part="tab-list" name="tab"></slot>
 *     <slot part="tab-panels" name="tabpanel"></slot>
 *   </template>
 *
 *   <button type="button" slot="tab">Tab 1</button>
 *   <div slot="tabpanel">I am content of tab 1</div>
 *   <button type="button" slot="tab">Tab 2</button>
 *   <div slot="tabpanel">I am content of tab 2</div>
 * </x-tabs>
 *
 * It is also possible to manually set up the ID relationship to have the tab panels outside the component:
 *
 * <x-tabs selected-index="0">
 *   <template shadowrootmode="open">
 *     <slot role="tablist" part="tab-list" name="tab"></slot>
 *   </template>
 *
 *   <button type="button" aria-controls="one" slot="title">Tab 1</button>
 *   <button type="button" aria-controls="two" slot="title">Tab 2</button>
 * </x-tabs>
 *
 * <div id="one" role="tabpanel">I am content of tab 1</div>
 * <div id="two" role="tabpanel">I am content of tab 2</div>
 *
 * The declarative template is optional (but recommended for sections that are above the fold to avoid FOUC). If none
 * is passed, the default template will be used.
 *
 * By providing your own markup for the template, you can customize the way your tabs appear by assigning "part"
 * to the wrapper and then style them using ::part() selector (https://developer.mozilla.org/en-US/docs/Web/CSS/::part)
 *
 * The tabs can be dynamically added or removed by simply adding or removing new slots inside the component
 */
export class Tabs extends HTMLElement {
  static get observedAttributes() {
    return ['selected-index'];
  };

  #componentID = crypto.randomUUID ? crypto.randomUUID() : Math.floor(Math.random() * 10000);
  #buttons = [];
  #panels = [];
  #delegate = new Delegate(this);

  constructor() {
    super();
    
    if (!this.shadowRoot) {
      // Create a shadow root from template if the browser does not support declarative Shadow DOM
      const template = this.querySelector('template') || this.defaultTemplate;
      this.attachShadow({mode: 'open'}).appendChild(template.content.cloneNode(true));
    }

    if (Shopify.designMode) {
      this.addEventListener('shopify:block:select', (event) => this.selectedIndex = this.#buttons.indexOf(event.target));
    }

    this.#delegate.on('click', 'button[role="tab"]', this.#onButtonClicked.bind(this));
    this.shadowRoot.addEventListener('slotchange', this.#onSlotChange.bind(this));
    this.addEventListener('keydown', this.#handleKeyboard);
  }

  connectedCallback() {
    this.#setupComponent();
    this.selectedIndex = this.selectedIndex; // Force an attribute to be set if none is already here
  }

  /**
   * --------------------------------------------------------------------------
   * GETTERS AND SETTERS
   * --------------------------------------------------------------------------
   */

  get defaultTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <slot role="tablist" part="tab-list" name="tab"></slot>
      <slot part="tab-panels" name="tabpanel"></slot>
    `;
    
    return template;
  }

  get animationDuration() {
    return this.hasAttribute('animation-duration') ? parseFloat(this.getAttribute('animation-duration')) : 0.15;
  }

  get selectedIndex() {
    return parseInt(this.getAttribute('selected-index')) || 0;
  }

  set selectedIndex(index) {
    this.setAttribute('selected-index', Math.min(Math.max(index, 0), this.#buttons.length - 1).toString());
    this.style.setProperty('--selected-index', this.selectedIndex.toString()); // Set it as CSS variable, to allow interesting effects

    this.#buttons.forEach((button, i) => {
      if (i === index) {
        button.removeAttribute('tabindex');
        this.scrollTo({ left: button.offsetLeft - (this.clientWidth / 2) + (button.clientWidth / 2), behavior: 'smooth' });
      } else {
        button.tabIndex = -1;
      }
    });
  }

  /**
   * --------------------------------------------------------------------------
   * METHODS
   * --------------------------------------------------------------------------
   */

  attributeChangedCallback(name, oldValue, newValue) {
    this.#buttons.forEach((button, index) => button.setAttribute('aria-selected', index === parseInt(newValue) ? 'true' : 'false'));

    if (name === 'selected-index' && oldValue !== null && oldValue !== newValue) {
      this.transition(this.#panels[parseInt(oldValue)], this.#panels[parseInt(newValue)]);
    }
  }

  /**
   * Perform a custom transition (can be overridden in subclasses). To "from" and "to" are hash representing the panel
   */
  async transition(fromPanel, toPanel) {
    // Hide existing panel
    await animate(fromPanel, {opacity: [1, 0], transform: ['translateY(0)', 'translateY(10px)']}, {duration: this.animationDuration});
    fromPanel.hidden = true;

    // Reveal new panel
    toPanel.hidden = false;
    await animate(toPanel, {opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0)']}, {duration: this.animationDuration});
  }

  #setupComponent() {
    this.#buttons = Array.from(this.shadowRoot.querySelector('slot[name="tab"]').assignedNodes(), (item) => item.matches('button') && item || item.querySelector('button')).filter(button => button !== null);
    this.#panels = [];

    // If we only have one button, we don't need to set the role and aria attributes as it won't work as a tab system
    if (this.#buttons.length > 0) {
      this.#buttons.forEach((button, index) => {
        button.setAttribute('role', 'tab');
        button.id = `tab-${this.#componentID}-${index}`;

        let panel;

        if (button.hasAttribute('aria-controls')) {
          // If there is a manual relationship, then we re-use this one
          panel = document.getElementById(button.getAttribute('aria-controls'));
        } else {
          // Otherwise, we look into the component to find the corresponding panel
          panel = this.shadowRoot.querySelector('slot[name="tabpanel"]').assignedNodes()[index];
          panel.id = `tab-panel-${this.#componentID}-${index}`;

          button.setAttribute('aria-controls', `tab-panel-${this.#componentID}-${index}`);
        }

        if (!panel) {
          //console.warn(`The tab ${button.textContent} does not have a corresponding panel`);
        } else {
          panel.setAttribute('role', 'tabpanel');
          panel.setAttribute('aria-labelledby', `tab-${this.#componentID}-${index}`);
          panel.hidden = index !== this.selectedIndex;

          if (!panel.matches(':scope:has(a[href], button:not([disabled]), details, iframe, object, input:not([disabled]), select:not([disabled]), textarea:not([disabled]))')) {
            panel.tabIndex = 0; // Make it focusable if it is not
          }

          this.#panels[index] = panel;
        }
      });
    }

    // When a tab is dynamically removed, it may leave the tab in a state where no tab is selected. In this case, we select the first one
    if (!this.#buttons.find(button => button.getAttribute('aria-selected') === 'true')) {
      this.selectedIndex = 0;
    }

    this.style.setProperty('--item-count', this.#buttons.length.toString());
  }

  #onButtonClicked(event, button) {
    this.selectedIndex = this.#buttons.indexOf(button);
  }

  #onSlotChange(event) {
    this.#setupComponent();
  }

  /**
   * As per https://www.w3.org/WAI/ARIA/apg/example-index/tabs/tabs-automatic.html, when a tab is currently focused,
   * left and right arrow should switch the tab
   */
  #handleKeyboard(event) {
    const index = this.#buttons.indexOf(document.activeElement);

    if (index === -1) {
      return; // If button is not focused or key does not match, we do nothing
    }

    if (event.key === 'ArrowLeft') {
      this.selectedIndex = (this.selectedIndex - 1 + this.#buttons.length) % this.#buttons.length;
      this.#buttons[this.selectedIndex].focus(); // Set the focus on the new index
    } else if (event.key === 'ArrowRight') {
      this.selectedIndex = (this.selectedIndex + 1 + this.#buttons.length) % this.#buttons.length;
      this.#buttons[this.selectedIndex].focus(); // Set the focus on the new index
    }
  }
}

if (!window.customElements.get('x-tabs')) {
  window.customElements.define('x-tabs', Tabs);
}