// Copyright (C) 2026 Jai G
//
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 3, or (at your option)
// any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

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
