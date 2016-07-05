/* @flow */

import uuid from 'uuid';
import type {App, WireObject, PreloadData, RouteHandler} from '../app';
import {matchRoute} from '../app';
import type {Environment} from './env';

let _loader: any; // FIXME

export function injectLoader(loader: typeof _loader) {
  _loader = loader;
}

export type AppState = {
  handler: RouteHandler;
  data: WireObject;
};

export class AppController {
  app: App;
  environ: Environment;
  cache: {[token: string]: AppState};
  state: ?AppState;
  subscribers: (() => void)[];
  started: boolean;
  abort: () => void;

  constructor(app: App, environ: Environment) {
    this.app = app;
    this.environ = environ;
    this.cache = {};
    this.state = null;
    this.subscribers = [];
    this.started = false;
    this.abort = () => {};
  }

  subscribe(subscriber: () => void) {
    this.subscribers.push(subscriber);
  }

  unsubscribe(subscriber: () => void) {
    this.subscribers = this.subscribers.filter(s => s !== subscriber);
  }

  start(preloadData?: PreloadData) {
    if (this.started)
      return;

    this.started = true;
    this.environ.setLocationChangeListener(this._onLocationChange.bind(this));

    const appRequest = {
      app: this.app,
      loader: _loader,
      path: this.environ.getPath(),
      query: this.environ.getQuery(),
    };
    const matchedRequest = matchRoute(appRequest);
    if (!matchedRequest) {
      // TODO
      return;
    }
    const handler = matchedRequest.handler;

    const shouldUsePreloadData = !this.environ.getHistoryToken();
    if (shouldUsePreloadData && preloadData) {
      const state = {
        handler,
        data: preloadData,
      };
      this.state = state;
      const token = uuid.v4();
      this.cache[token] = state;
      this.environ.setHistoryToken(token);
      this._emitChange();
    } else {
      this._makeAbortable(handler.load(matchedRequest)).then(data => {
        const state = {
          handler,
          data,
        };
        this.state = state;
        const token = uuid.v4();
        this.cache[token] = state;
        this.environ.setHistoryToken(token);
        this._emitChange();
      }).catch(err => {
        // TODO
      });
    }
  }

  load(path: string, query: {[key: string]: any} = {}) {
    this.abort();

    const appRequest = {
      app: this.app,
      loader: _loader,
      path,
      query,
    };
    const matchedRequest = matchRoute(appRequest);
    if (!matchedRequest) {
      // TODO
      return;
    }
    const handler = matchedRequest.handler;

    this._makeAbortable(handler.load(matchedRequest)).then(data => {
      const state = {
        handler,
        data,
      };
      this.state = state;
      const token = uuid.v4();
      this.cache[token] = state;
      this.environ.pushLocation(path, token); // TODO: query
      this._emitChange();
    }).catch(err => {
      // TODO
    });
  }

  _onLocationChange() {
    this.abort();

    const token = this.environ.getHistoryToken();
    if (!token) {
      // TODO
      return;
    }

    const cachedState = this.cache[token];
    if (cachedState) {
      this.state = cachedState;
      this._emitChange();
    } else {
      const appRequest = {
        app: this.app,
        loader: _loader,
        path: this.environ.getPath(),
        query: this.environ.getQuery(),
      };
      const matchedRequest = matchRoute(appRequest);
      if (!matchedRequest) {
        // TODO
        return;
      }
      const handler = matchedRequest.handler;

      this._makeAbortable(handler.load(matchedRequest)).then(data => {
        const state = {
          handler,
          data,
        };
        this.state = state;
        this.cache[token] = state;
        this._emitChange();
      }).catch(err => {
        // TODO
      });
    }
  }

  _emitChange() {
    this.subscribers.forEach(s => s.apply(null));
  }

  _makeAbortable(promise: Promise<any>) {
    return new Promise((resolve, reject) => {
      this.abort = () => reject(new Error('aborted'));

      promise.then(resolve, reject);
    });
  }
}
