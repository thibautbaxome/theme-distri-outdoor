/**
 * Return a promise that is resolved when a video has enough data to load. It also accepts an array as a parameter, in which case
 * it will resolve when all the videos have been loaded. If the array contains videos that are not visible (for instance
 * if they are display: none) those will be resolved immediately
 */
export function videoLoaded(videoOrArray) {
  if (!videoOrArray) {
    return Promise.resolve();
  }

  videoOrArray = videoOrArray instanceof Element ? [videoOrArray] : Array.from(videoOrArray);

  return Promise.all(videoOrArray.map(video => {
    return new Promise((resolve) => {
      if ((video.tagName === 'VIDEO' && video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) || !video.offsetParent || video.parentNode.hasAttribute('suspended')) {
        resolve();
      } else {
        video.oncanplay = () => resolve();
      }
    });
  }));
}

/**
 * Return a promise that is resolved when an image is loaded. It also accepts an array as a parameter, in which case
 * it will resolve when all the images have been loaded. If the array contains image that are not visible (for instance
 * if they are display: none) those will be resolved immediately
 */
export function imageLoaded(imageOrArray) {
  if (!imageOrArray) {
    return Promise.resolve();
  }

  imageOrArray = imageOrArray instanceof Element ? [imageOrArray] : Array.from(imageOrArray);

  return Promise.all(imageOrArray.map(image => {
    return new Promise((resolve) => {
      if ((image.tagName === 'IMG' && image.complete) || !image.offsetParent) {
        resolve();
      } else {
        image.onload = () => resolve();
      }
    });
  }));
}

/**
 * Generate a srcset attribute value based on a preview image and list of desired widths. You can also
 * pass a string that contains a master URL
 */
export function generateSrcset(imageObjectOrString, widths = []) {
  let imageUrl, maxWidth;

  if (typeof imageObjectOrString === 'string') {
    imageUrl = new URL(imageObjectOrString.startsWith('//') ? `https:${imageObjectOrString}` : imageObjectOrString);
    maxWidth = parseInt(imageUrl.searchParams.get('width'));
  } else {
    imageUrl = new URL(imageObjectOrString['src'].startsWith('//') ? `https:${imageObjectOrString['src']}` : imageObjectOrString['src']);
    maxWidth = imageObjectOrString['width'];
  }

  return widths.filter(width => width <= maxWidth).map(width => {
    imageUrl.searchParams.set('width', width.toString());
    return `${imageUrl.href} ${width}w`;
  }).join(', ');
}

/**
 * Generate an img element for a given media object
 */
export function createMediaImg(media, widths = [], attributes = {}) {
  const image = new Image(media['preview_image']['width'], media['preview_image']['height']),
    src = media['preview_image']['src'],
    featuredMediaUrl = new URL(src.startsWith('//') ? `https:${src}` : src);

  for (const attributeKey in attributes) {
    image.setAttribute(attributeKey, attributes[attributeKey]);
  }

  image.alt = media['alt'] || '';
  image.src = featuredMediaUrl.href;
  image.srcset = generateSrcset(media['preview_image'], widths);

  return image;
}