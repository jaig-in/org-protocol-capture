export function buildCaptureUri({ url, title = '', selection = '', container = null }) {
  if (typeof url !== 'string') {
    throw new TypeError('Enter an absolute http or https URL.');
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new TypeError('Enter an absolute http or https URL.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new TypeError('Only http and https pages can be captured.');
  }

  let body = selection;
  if (container) {
    body += `${body ? '\n\n' : ''}Firefox container: ${container.name}\nCookie store: ${container.cookieStoreId}`;
  }

  const parameters = new URLSearchParams({ template: 'p', url, title, body });
  return `org-protocol://capture?${parameters}`;
}
