/**
 * Get all sibligns of a given node
 */
export function getSiblings(element) {
  let siblings = []; 
  
  // if no parent, return no sibling
  if (!element.parentNode) {
    return siblings;
  }

  // first child of the parent node
  let sibling = element.parentNode.firstChild;
    
  // collecting siblings
  while (sibling) {
    if (sibling.nodeType === 1 && sibling !== element) {
      siblings.push(sibling);
    }

    sibling = sibling.nextSibling;
  }
  
  return siblings;
}

/**
 * This function is similar to the native querySelector, except that it will also recursively check for
 * the content contained within `template` content
 */
export function deepQuerySelector(root, selector) {
  let element = root.querySelector(selector);

  if (element) {
    return element;
  }

  for (const template of root.querySelectorAll('template')) {
    element = deepQuerySelector(template.content, selector);

    if (element) {
      return element;
    }
  }

  return null;
}

/*
 * Allow to limit the execution of a give function to the requestAnimationFrame. This should be used notably when
 * using "scroll" event or any other events that triggers often.
 */
export function throttle(callback) {
  let requestId = null,
    lastArgs;

  const later = (context) => () => {
    requestId = null;
    callback.apply(context, lastArgs);
  }

  const throttled = (...args) => {
    lastArgs = args;

    if (requestId === null) {
      requestId = requestAnimationFrame(later(this));
    }
  }

  throttled.cancel = () => {
    cancelAnimationFrame(requestId);
    requestId = null;
  }

  return throttled;
}

/*
 * Limit the execution of a function by a given delay.
 */
export function debounce(fn, delay) {
  let timer = null;

  return (...args) => {
    clearTimeout(timer);

    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

/*
 * Return a promise that resolves when a specific event on a element is triggered
 */
export function waitForEvent(element, eventName) {
  return new Promise(resolve => {
    const done = (event) => {
      if (event.target === element) {
        element.removeEventListener(eventName, done);
        resolve(event);
      }
    }

    element.addEventListener(eventName, done);
  });
}