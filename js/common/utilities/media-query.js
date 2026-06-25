/**
 * Allow to reuse the media query defines in the CSS
 */
export function matchesMediaQuery(breakpointName) {
  if (!window.themeVariables.mediaQueries.hasOwnProperty(breakpointName)) {
    return false;
  }

  return window.matchMedia(window.themeVariables.mediaQueries[breakpointName]).matches;
}

/**
 * Allows to be notified when a breakpoint changes
 */
export function mediaQueryListener(breakpointName, func) {
  if (!window.themeVariables.mediaQueries.hasOwnProperty(breakpointName)) {
    throw `Media query ${breakpointName} does not exist`
  }

  return window.matchMedia(window.themeVariables.mediaQueries[breakpointName]).addEventListener('change', func);
}