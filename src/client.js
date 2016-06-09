/* @flow */

import React from 'react';
import type {App, Request, WireObject, RouteHandler, RouteComponent} from './app';
import type {Environment} from './env';
import {matchRoute, createRouteElement} from './app';
import {DefaultEnvironment} from './env';

let _loader: any; // FIXME

export function injectLoader(loader: typeof _loader) {
  _loader = loader;
}

function createRequestFromEnvironment(app: App, environ: Environment): Request {
  return {
    app,
    loader: _loader,
    path: environ.getPath(),
    query: environ.getQuery(),
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
    var dataPromise = this.environ.getPreloadData();
    if (!dataPromise) {
      dataPromise = handler.load(matchedRequest);
    }
    return Promise.resolve(dataPromise).then(data => {
      if (handler.renderTitle) {
        this.environ.setTitle(handler.renderTitle(data));
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
    const nextData = {};
    Object.assign(nextData, this.data, updates);
    this.data = nextData;
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
  const environ = new DefaultEnvironment(container);
  return new ClientApp(app, environ).start();
}
