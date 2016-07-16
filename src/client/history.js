/* @flow */

import querystring from 'querystring';
import type {ParsedURI} from '../app';
import {uriToString} from '../util';

export type Location = ParsedURI & {
  token: ?string;
};

export interface History {
  getLocation(): Location;
  setHistoryToken(token: string): void;
  setLocationChangeListener(listener: (location: Location) => void): void;
  pushLocation(location: Location): void;
  doesPushLocationRefreshPage(): boolean;
}

export function createHistory(): History {
  if (supportsHistory())
    return new BrowserHistory();
  else
    return new FallbackHistory();
}

export class BrowserHistory {
  locationChangeListener: ?(location: Location) => void;

  constructor() {
    this.locationChangeListener = null;
    window.addEventListener('popstate', event => {
      // Ignore extraneous popstate events in WebKit
      // https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onpopstate
      if (event.state !== undefined) {
        const listener = this.locationChangeListener;
        if (listener) {
          listener(this.getLocation());
        }
      }
    }, false);
  }

  getLocation() {
    return {
      path: location.pathname,
      query: querystring.parse(location.search.substring(1)),
      token: history.state && history.state.token,
    };
  }

  setHistoryToken(token: string) {
    const path = location.pathname + location.search;
    history.replaceState({ token }, '', path);
  }

  setLocationChangeListener(listener: (location: Location) => void) {
    this.locationChangeListener = listener;
  }

  pushLocation(location: Location) {
    history.pushState({ token: location.token }, '', uriToString(location));
  }

  doesPushLocationRefreshPage(): boolean {
    return false;
  }
}

export class FallbackHistory {
  getLocation() {
    return {
      path: location.pathname,
      query: querystring.parse(location.search.substring(1)),
      token: null,
    };
  }

  setHistoryToken(token: string) {
    // ignored
  }

  setLocationChangeListener(listener: (location: Location) => void) {
    // ignored
  }

  pushLocation(location: Location) {
    window.location.href = uriToString(location);
  }

  doesPushLocationRefreshPage(): boolean {
    return true;
  }
}

/**
 * Returns true if the HTML5 history API is supported. Taken from Modernizr.
 *
 * https://github.com/Modernizr/Modernizr/blob/master/LICENSE
 * https://github.com/Modernizr/Modernizr/blob/master/feature-detects/history.js
 * changed to avoid false negatives for Windows Phones: https://github.com/reactjs/react-router/issues/586
 */
function supportsHistory() {
  const ua = window.navigator.userAgent;

  if ((ua.indexOf('Android 2.') !== -1 || ua.indexOf('Android 4.0') !== -1) &&
    ua.indexOf('Mobile Safari') !== -1 &&
    ua.indexOf('Chrome') === -1 &&
    ua.indexOf('Windows Phone') === -1
  )
    return false;

  return window.history && 'pushState' in window.history;
}
