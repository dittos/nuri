/* @flow */

import querystring from 'querystring';
import type {WireObject} from '../app';

export interface Environment {
  getPath(): string;
  getQuery(): WireObject;
  getHistoryToken(): ?string;
  setHistoryToken(token: string): void;
  setLocationChangeListener(listener: () => void): void;
  pushLocation(path: string, token: string): void;
  setScrollChangeListener(listener: (x: number, y: number) => void): void;
}

// TODO: detect pushState support

export class BrowserEnvironment {
  locationChangeListener: ?() => void;
  scrollChangeListener: ?(x: number, y: number) => void;

  constructor() {
    this.locationChangeListener = null;
    window.addEventListener('popstate', event => {
      // TODO: normalize difference between browsers
      // https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onpopstate
      if (this.locationChangeListener) {
        this.locationChangeListener();
      }
    }, false);
    window.addEventListener('scroll', () => {
      if (this.scrollChangeListener) {
        this.scrollChangeListener(
          window.pageXOffset || document.documentElement.scrollLeft,
          window.pageYOffset || document.documentElement.scrollTop
        );
      }
    }, false);
  }

  getPath() {
    return location.pathname;
  }

  getQuery() {
    return querystring.parse(location.search.substring(1));
  }

  getHistoryToken() {
    return history.state && history.state.token;
  }

  setHistoryToken(token: string) {
    const path = location.pathname + location.search;
    history.replaceState({ token }, '', path);
  }

  setLocationChangeListener(listener: () => void) {
    this.locationChangeListener = listener;
  }

  pushLocation(path: string, token: string) {
    history.pushState({ token }, '', path);
  }

  setScrollChangeListener(listener: (x: number, y: number) => void) {
    this.scrollChangeListener = listener;
  }
}
