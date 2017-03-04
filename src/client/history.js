/* @flow */

import querystring from 'querystring';
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/observable/fromEvent';
import 'rxjs/add/observable/never';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/map';
import type {ParsedURI} from '../app';
import {uriToString} from '../util';

export type Location = {|
  uri: ParsedURI;
  token: string | null;
|};

export interface History {
  getLocation(): Location;
  setHistoryToken(token: string): void;
  locationChanges(): Observable<Location>;
  pushLocation(location: Location): void;
  doesPushLocationRefreshPage(): boolean;
}

export function createHistory(): History {
  if (supportsHistory())
    return new BrowserHistory();
  else
    return new FallbackHistory();
}

export class BrowserHistory implements History {
  locationChanges() {
    return Observable.fromEvent(window, 'popstate')
      // Ignore extraneous popstate events in WebKit
      // https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onpopstate
      .filter(event => event.state !== undefined)
      .map(() => this.getLocation());
  }

  getLocation() {
    return {
      uri: {
        path: location.pathname,
        query: querystring.parse(location.search.substring(1)),
      },
      token: history.state && history.state.token,
    };
  }

  setHistoryToken(token: string) {
    const path = location.pathname + location.search;
    history.replaceState({ token }, '', path);
  }

  pushLocation({ token, uri }: Location) {
    history.pushState({ token }, '', uriToString(uri));
  }

  doesPushLocationRefreshPage(): boolean {
    return false;
  }
}

export class FallbackHistory implements History {
  getLocation() {
    return {
      uri: {
        path: location.pathname,
        query: querystring.parse(location.search.substring(1)),
      },
      token: null,
    };
  }

  // eslint-disable-next-line no-unused-vars
  setHistoryToken(token: string) {
    // ignored
  }

  locationChanges() {
    return Observable.never();
  }

  pushLocation({ uri }: Location) {
    window.location.href = uriToString(uri);
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
