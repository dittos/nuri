/* @flow */

import uuid from 'uuid';
import type {App, WireObject, PreloadData, MatchedRequest, RouteHandler} from '../app';
import {matchRoute} from '../app';
import type {Environment} from './env';

let _loader: any; // FIXME

export function injectLoader(loader: typeof _loader) {
  _loader = loader;
}

export type AppState = {
  handler: RouteHandler;
  data: WireObject;
  scrollX: number;
  scrollY: number;
};

export class AppController {
  app: App;
  environ: Environment;
  cache: {[token: string]: AppState};
  state: ?AppState;
  subscribers: (() => void)[];
  started: boolean;
  loading: boolean;
  abort: () => void;

  constructor(app: App, environ: Environment) {
    this.app = app;
    this.environ = environ;
    this.cache = {};
    this.state = null;
    this.subscribers = [];
    this.started = false;
    this.loading = false;
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
    this.environ.setScrollChangeListener(this._onScrollChange.bind(this));

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
        scrollX: 0,
        scrollY: 0,
      };
      this.state = state;
      const token = uuid.v4();
      this.cache[token] = state;
      this.environ.setHistoryToken(token);
      this._emitChange();
    } else {
      this._load(handler, matchedRequest).then(data => {
        const state = {
          handler,
          data,
          scrollX: 0,
          scrollY: 0,
        };
        this.state = state;
        const token = uuid.v4();
        this.cache[token] = state;
        this.environ.setHistoryToken(token);
        this._emitChange();
      }).catch(err => {
        // TODO
        return Promise.reject(err);
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

    this._load(handler, matchedRequest).then(data => {
      const state = {
        handler,
        data,
        scrollX: 0,
        scrollY: 0,
      };
      this.state = state;
      const token = uuid.v4();
      this.cache[token] = state;
      this.environ.pushLocation(path, token); // TODO: query
      this._emitChange();
    }).catch(err => {
      // TODO
      return Promise.reject(err);
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

      this._load(handler, matchedRequest).then(data => {
        const state = {
          handler,
          data,
          scrollX: 0,
          scrollY: 0,
        };
        this.state = state;
        this.cache[token] = state;
        this._emitChange();
      }).catch(err => {
        // TODO
        return Promise.reject(err);
      });
    }
  }

  _onScrollChange(x: number, y: number) {
    if (this.state) {
      this.state.scrollX = x;
      this.state.scrollY = y;
      // FIXME: doesn't emit change
    }
  }

  _emitChange() {
    this.subscribers.forEach(s => s.apply(null));
  }

  _load(handler: RouteHandler, matchedRequest: MatchedRequest) {
    this.loading = true;
    this._emitChange();

    return this._makeAbortable(handler.load(matchedRequest)).then(r => {
      this.loading = false;
      this._emitChange();
      return r;
    }).catch(err => {
      // TODO
      return Promise.reject(err);
    });
  }

  _makeAbortable(promise: Promise<any>) {
    return new Promise((resolve, reject) => {
      this.abort = () => reject(new Error('aborted'));

      promise.then(resolve, reject);
    });
  }
}
