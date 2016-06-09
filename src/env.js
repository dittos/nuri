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
  getPreloadData(): ?WireObject;
}

export class DefaultEnvironment {
  container: Node;

  constructor(container: Node) {
    this.container = container;
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

  getPreloadData() {
    return window.preloadData;
  }
}
