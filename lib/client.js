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
  render: typeof ReactDOM.render,
  document: Document,
  location: Location,
  preloadData: Wire,
};

let _environ: Environment;

export function injectEnvironment(environ: Environment) {
  _environ = environ;
}

function injectDefaultEnvironment() {
  _environ = {
    render: ReactDOM.render,
    document,
    location,
    preloadData: window.preloadData,
  };
}

function createRequest(app: App): Request {
  return {
    app,
    loader: _loader,
    path: _environ.location.pathname,
    query: querystring.parse(_environ.location.search.substring(1)),
  };
}

export function render(app: App, container: Node): Promise<any> {
  if (!_environ) {
    injectDefaultEnvironment();
  }

  const request = createRequest(app);
  const matchedRequest = matchRoute(request);
  if (!matchedRequest)
    return Promise.reject();

  const handler = matchedRequest.handler;
  var dataPromise;
  if (_environ.preloadData) {
    dataPromise = _environ.preloadData;
  } else {
    dataPromise = handler.load(matchedRequest);
  }
  return Promise.resolve(dataPromise).then(data => {
    const element = React.createElement(handler.component, { data });
    if (handler.renderTitle) {
      _environ.document.title = handler.renderTitle(data);
    }
    _environ.render(element, container);
  });
}
