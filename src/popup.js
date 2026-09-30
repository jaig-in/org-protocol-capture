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

import { buildCaptureUri } from './protocol.js';

const api = globalThis.browser ?? globalThis.chrome;
const fields = document.getElementById('capture-fields');
const title = document.getElementById('title');
const url = document.getElementById('url');
const selection = document.getElementById('selection');
const capture = document.getElementById('capture');
const status = document.getElementById('status');
const warning = document.getElementById('warning');
const error = document.getElementById('error');
let container = null;
let ready = false;

function showError(message) {
  error.textContent = message;
  error.hidden = !message;
}

function disableCapture() {
  capture.removeAttribute('href');
  capture.setAttribute('aria-disabled', 'true');
  capture.tabIndex = -1;
}

function updateCapture() {
  if (!ready) return false;
  try {
    capture.href = buildCaptureUri({
      url: url.value,
      title: title.value,
      selection: selection.value,
      container,
    });
    capture.setAttribute('aria-disabled', 'false');
    capture.tabIndex = 0;
    url.removeAttribute('aria-invalid');
    showError('');
    return true;
  } catch (failure) {
    disableCapture();
    url.setAttribute('aria-invalid', 'true');
    showError(failure.message);
    return false;
  }
}

// This function runs only in the active tab's main frame, without page scripts.
function readPage() {
  return {
    title: document.title,
    url: location.href,
    selection: window.getSelection()?.toString() ?? '',
  };
}

async function initialize() {
  try {
    if (!api?.tabs || !api?.scripting) {
      throw new Error('Open this popup from the installed browser extension.');
    }
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    if (!tab || !Number.isInteger(tab.id) || tab.id < 0) {
      throw new Error('No active page is available. Open an http or https page and try again.');
    }
    try {
      buildCaptureUri({ url: tab.url });
    } catch {
      throw new Error('This page cannot be captured. Open an http or https page, then reopen this popup. Browser settings, new tabs, and local files are not supported.');
    }

    title.value = tab.title ?? '';
    url.value = tab.url;
    const notices = [];
    try {
      const results = await api.scripting.executeScript({
        target: { tabId: tab.id, allFrames: false },
        func: readPage,
      });
      const page = results[0]?.result;
      if (!page || typeof page.url !== 'string' || typeof page.title !== 'string' || typeof page.selection !== 'string') {
        throw new Error('Page details were unavailable.');
      }
      title.value = page.title;
      url.value = page.url;
      selection.value = page.selection;
    } catch {
      notices.push('The browser blocked page-text access. Title and URL are available, but selected text was not read. You can add context below.');
    }

    if (api.contextualIdentities && tab.cookieStoreId) {
      if (tab.cookieStoreId === 'firefox-default' || tab.cookieStoreId === 'firefox-private') {
        container = {
          name: tab.cookieStoreId === 'firefox-private' ? 'No container (private window)' : 'No container',
          cookieStoreId: tab.cookieStoreId,
        };
      } else {
        try {
          const identity = await api.contextualIdentities.get(tab.cookieStoreId);
          container = { name: identity.name, cookieStoreId: tab.cookieStoreId };
        } catch {
          container = { name: 'Name unavailable', cookieStoreId: tab.cookieStoreId };
          notices.push('The Firefox container name could not be read. Its cookie-store ID is still included as context.');
        }
      }
      document.getElementById('container-name').textContent = container.name;
      document.getElementById('container-id').textContent = container.cookieStoreId;
      document.getElementById('container-details').hidden = false;
    }

    warning.textContent = notices.join(' ');
    warning.hidden = notices.length === 0;
    fields.disabled = false;
    ready = true;
    status.textContent = 'Review the capture details.';
    updateCapture();
  } catch (failure) {
    disableCapture();
    status.hidden = true;
    showError(failure.message || 'The active page could not be read. Reopen the popup to try again.');
  }
}

for (const field of [title, url, selection]) {
  field.addEventListener('input', updateCapture);
}

capture.addEventListener('click', (event) => {
  if (!ready || !updateCapture()) {
    event.preventDefault();
    return;
  }
  // Leave native link activation synchronous so the browser can ask its handler.
  // A new browsing context protects the source tab; no tabs.update/remove is used.
  status.textContent = 'Capture requested. Check the browser prompt and Emacs; saving is not confirmed.';
});

initialize();
