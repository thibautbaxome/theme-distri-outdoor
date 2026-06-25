/**
 * Create a bounding client rect where transforms are removed. This is useful to calculate various transforms
 *
 * SOURCE: https://gist.github.com/andreiglingeanu/aa3aef6c8dffb2105736148b2cab3617
 */

export function getUntransformedBoundingClientReact(element) {
	let { top, left, width, height } = element.getBoundingClientRect();
	let transformArr = parseTransform(element);

  if (transformArr.length === 0) {
    return { top, left, width, height };
  } else if (transformArr.length === 6) {
		let t = transformArr;
		let det = t[0] * t[3] - t[1] * t[2];

		return {
			width: width / t[0],
			height: height / t[3],
			left: (left * t[3] - top * t[2] + t[2] * t[5] - t[4] * t[3]) / det,
			top: (-left * t[1] + top * t[0] + t[4] * t[1] - t[0] * t[5]) / det
		}
	} else {
		console.warn('Cannot nullify 3D matrix transforms');
	}
}

function parseTransform(element) {
  let transform = window.getComputedStyle(element).transform;
  return transform.split(/\(|,|\)/).slice(1, -1).map((v) => parseFloat(v));
}