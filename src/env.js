/* @flow */

import querystring from 'querystring';
import React from 'react';
import ReactDOM from 'react-dom';
import type {WireObject} from './app';

export interface Environment {
  render(element: React.Element): any;
  setTitle(title: string): void;
  getPath(): string;
  getQuery(): WireObject;
  getLocationKey(): string;
  getPreloadData(): ?WireObject;
  setLocationChangeListener(listener: () => void): void;
  replaceLocation(key: string): void;
  pushLocation(path: string, key: string): void;
}

// TODO: detect pushState support

export class DefaultEnvironment {
  container: Node;
  locationChangeListener: ?() => void;

  constructor(container: Node) {
    this.container = container;
    this.locationChangeListener = null;
    window.addEventListener('popstate', event => {
      // TODO: normalize difference between browsers
      // https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onpopstate
      if (this.locationChangeListener) {
        this.locationChangeListener();
      }
    }, false);
  }

  render(element: React.Element) {
    ReactDOM.render(element, this.container);
  }

  setTitle(title: string) {
    document.title = title;
  }

  getPath() {
    return location.pathname;
  }

  getQuery() {
    return querystring.parse(location.search.substring(1));
  }

  getLocationKey() {
    return history.state && history.state.key;
  }

  getPreloadData() {
    return window.preloadData;
  }

  setLocationChangeListener(listener: () => void) {
    this.locationChangeListener = listener;
  }

  replaceLocation(key: string) {
    const path = location.pathname + location.search;
    history.replaceState({ key }, '', path);
  }

  pushLocation(path: string, key: string) {
    history.pushState({ key }, '', path);
  }
}
