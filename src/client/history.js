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
}

// TODO: detect pushState support

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
}
