/* @flow */

import querystring from 'querystring';
import React from 'react';
import ReactDOM from 'react-dom';
import type {App, Request, Wire} from './app';
import {matchRoute} from './app';

let _loader: any; // FIXME

export function injectLoader(loader: typeof _loader) {
  _loader = loader;
}

type Environment = {
  render: (element: React.Element) => any,
  document: Document,
  location: Location,
  preloadData: Wire,
};

function createDefaultEnvironment(container: Node): Environment {
  return {
    render: element => ReactDOM.render(element, container),
    document,
    location,
    preloadData: window.preloadData,
  };
}

function createRequestFromEnvironment(app: App, environ: Environment): Request {
  return {
    app,
    loader: _loader,
    path: environ.location.pathname,
    query: querystring.parse(environ.location.search.substring(1)),
  };
}

export class ClientApp {
  app: App;
  environ: Environment;

  constructor(app: App, environ: Environment) {
    this.app = app;
    this.environ = environ;
  }

  start(): Promise<ClientApp> {
    const request = createRequestFromEnvironment(this.app, this.environ);
    const matchedRequest = matchRoute(request);
    if (!matchedRequest)
      return Promise.reject();

    const handler = matchedRequest.handler;
    var dataPromise;
    if (this.environ.preloadData) {
      dataPromise = this.environ.preloadData;
    } else {
      dataPromise = handler.load(matchedRequest);
    }
    return Promise.resolve(dataPromise).then(data => {
      const element = React.createElement(handler.component, { data });
      if (handler.renderTitle) {
        this.environ.document.title = handler.renderTitle(data);
      }
      this.environ.render(element);
      return this;
    });
  }
}

export function render(app: App, container: Node): Promise<ClientApp> {
  const environ = createDefaultEnvironment(container);
  return new ClientApp(app, environ).start();
}
