import { Popover } from "../overlay";

export class SortByPopover extends Popover {
  get shouldAppendToBody() {
    return false;
  }
}

if (!window.customElements.get('sort-by-popover')) {
  window.customElements.define('sort-by-popover', SortByPopover);
}
