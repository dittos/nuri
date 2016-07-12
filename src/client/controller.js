/* @flow */

import uuid from 'uuid';
import type {App, WireObject, PreloadData, MatchedRequest, RouteHandler} from '../app';
import {matchRoute} from '../app';
import type {History, Location} from './history';

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

export interface AppControllerDelegate {
  willLoad(): void;
  didLoad(): void;
  didAbortLoad(): void;
  didCommitState(): void;
};

type TokenAction = 'replace' | 'push';
type PendingNavigation = {
  action?: TokenAction;
  location: Location;
  aborted: boolean;
};

const generateToken = uuid.v4;
function noOp() {}

export class AppController {
  app: App;
  history: History;
  cache: {[token: string]: AppState};
  state: ?AppState;
  subscribers: AppControllerDelegate[];
  started: boolean;
  pending: ?PendingNavigation;

  constructor(app: App, history: History) {
    this.app = app;
    this.history = history;
    this.cache = {};
    this.state = null;
    this.subscribers = [];
    this.started = false;
    this.pending = null;
  }

  subscribe(subscriber: AppControllerDelegate) {
    this.subscribers.push(subscriber);
  }

  unsubscribe(subscriber: AppControllerDelegate) {
    this.subscribers = this.subscribers.filter(s => s !== subscriber);
  }

  start(preloadData?: PreloadData) {
    if (this.started)
      return;

    this.started = true;
    this.history.setLocationChangeListener(this._onLocationChange.bind(this));

    const location = this.history.getLocation();
    const shouldUsePreloadData = !location.token;
    location.token = generateToken();
    this._setPending(location, 'replace');
    if (shouldUsePreloadData && preloadData) {
      const matchedRequest = this._matchRoute(location);
      this._commitPending({
        handler: matchedRequest.handler,
        data: preloadData,
        scrollX: 0,
        scrollY: 0,
      });
    } else {
      this._load();
    }
  }

  load(path: string, query: {[key: string]: any} = {}) {
    this._setPending({path, query, token: generateToken()}, 'push');
    this._load();
  }

  _onLocationChange(location: Location) {
    const token = location.token;
    if (!token) {
      // TODO
      throw new Error('Unexpected state');
    }

    this._setPending(location);
    const cachedState = this.cache[token];
    if (cachedState) {
      this._commitPending(cachedState);
    } else {
      this._load();
    }
  }

  _matchRoute(location: Location) {
    const appRequest = {
      app: this.app,
      loader: _loader,
      path: location.path,
      query: location.query,
    };
    return matchRoute(appRequest);
  }

  _setPending(location: Location, action?: TokenAction) {
    if (this.pending) {
      this.pending.aborted = true;
      this.pending = null;
      this._notifyDelegate('didAbortLoad');
    }
    this.pending = {
      location,
      action,
      aborted: false,
    };
  }

  _load() {
    const pending = this.pending;
    if (!pending)
      throw new Error('Unexpected state');

    const matchedRequest = this._matchRoute(pending.location);
    this._notifyDelegate('willLoad');
    matchedRequest.handler.load(matchedRequest).then(data => {
      if (pending.aborted)
        return;

      this._notifyDelegate('didLoad');
      this._commitPending({
        handler: matchedRequest.handler,
        data,
        scrollX: 0,
        scrollY: 0,
      });
    }).catch(err => {
      if (!pending.aborted) {
        // TODO
        return Promise.reject(err);
      }
    });
  }

  _commitPending(state: AppState) {
    if (!this.pending)
      throw new Error('Unexpected state');

    const {location, action} = this.pending;
    this.pending = null;
    const token = location.token || generateToken();
    this.state = state;
    this.cache[token] = state;
    if (action === 'replace') {
      this.history.setHistoryToken(token);
    } else if (action === 'push') {
      this.history.pushLocation(location.path, token); // TODO: query
    }
    this._notifyDelegate('didCommitState');
  }

  _notifyDelegate(method: $Keys<AppControllerDelegate>) {
    this.subscribers.forEach(s => (s: any)[method].apply(null));
  }
}
