const cachedMap = new Map();

export function cachedFetch(url, options) {
  const cacheKey = url; // Use the URL as the cache key to sessionStorage

  if (cachedMap.has(cacheKey)) {
    return Promise.resolve(new Response(new Blob([cachedMap.get(cacheKey)])));
  }

  return fetch(url, options).then(response => {
    // Only cache if successful and non-binary type
    if (response.status === 200) {
      const contentType = response.headers.get('Content-Type')
      if (contentType && (contentType.match(/application\/json/i) || contentType.match(/text\//i))) {
        response.clone().text().then(content => {
          cachedMap.set(cacheKey, content);
        });
      }
    }

    return response;
  });
}