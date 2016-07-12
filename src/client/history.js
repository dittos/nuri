/* @flow */

import querystring from 'querystring';
import type {WireObject} from '../app';

export type Location = {
  token: ?string;
  path: string;
  query: WireObject;
};

export interface History {
  getLocation(): Location;
  setHistoryToken(token: string): void;
  setLocationChangeListener(listener: (location: Location) => void): void;
  pushLocation(path: string, token: string): void;
}

// TODO: detect pushState support

export class BrowserHistory {
  locationChangeListener: ?(location: Location) => void;

  constructor() {
    this.locationChangeListener = null;
    window.addEventListener('popstate', event => {
      // TODO: normalize difference between browsers
      // https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onpopstate
      const listener = this.locationChangeListener;
      if (listener) {
        listener(this.getLocation());
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

  pushLocation(path: string, token: string) {
    history.pushState({ token }, '', path);
  }
}
