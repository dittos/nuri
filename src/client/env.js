/* @flow */

import querystring from 'querystring';
import React from 'react';
import ReactDOM from 'react-dom';
import type {WireObject} from '../app';

export interface Environment {
  render(element: React.Element): any;
  setTitle(title: string): void;
  getPath(): string;
  getQuery(): WireObject;
  getHistoryToken(): ?string;
  setHistoryToken(token: string): void;
  setLocationChangeListener(listener: () => void): void;
  pushLocation(path: string, token: string): void;
}

// TODO: detect pushState support

export class BrowserEnvironment {
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
}
