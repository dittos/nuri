/* @flow */

import querystring from 'querystring';
import React from 'react';
import ReactDOM from 'react-dom';
import type {App, Request, WireObject, RouteHandler, RouteComponent} from './app';
import {matchRoute, createRouteElement} from './app';

let _loader: any; // FIXME

export function injectLoader(loader: typeof _loader) {
  _loader = loader;
}

type Environment = {
  render: (element: React.Element) => any,
  document: Document,
  location: Location,
  preloadData: WireObject,
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
  routeState: ?RouteState;

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
      if (handler.renderTitle) {
        this.environ.document.title = handler.renderTitle(data);
      }
      this.routeState = new RouteState(this.environ, handler.component, data);
      this.routeState.render();
      return this;
    });
  }
}

class RouteState {
  environ: Environment;
  component: RouteComponent;
  data: WireObject;

  constructor(environ: Environment, component: RouteComponent, data: WireObject) {
    this.environ = environ;
    this.component = component;
    this.data = data;
  }

  setData(updates: WireObject) {
    Object.assign(this.data, updates);
    this.render();
  }

  render() {
    const element = createRouteElement(this.component, {
      data: this.data,
      setData: this.setData.bind(this),
    });
    this.environ.render(element);
  }
}

export function render(app: App, container: Node): Promise<ClientApp> {
  const environ = createDefaultEnvironment(container);
  return new ClientApp(app, environ).start();
}
