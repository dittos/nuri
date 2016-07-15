/* @flow */

import uuid from 'uuid';
import type {App, WireObject, PreloadData, Request, RouteHandler, ParsedURI, Loader, Redirect} from '../app';
import {matchRoute, createRequest, isRedirect} from '../app';
import type {History, Location} from './history';
import {parseURI} from '../util';

let _loader: Loader;

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

  getLoader(): Loader {
    return _loader;
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

  load(uri: ParsedURI) {
    this._setPending({ ...uri, token: generateToken() }, 'push');
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
    return matchRoute(this.app, location);
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

    const location = pending.location;
    const {handler, params} = this._matchRoute(location);
    const request = createRequest({
      app: this.app,
      loader: _loader,
      path: location.path,
      query: location.query,
      params,
    });

    this._notifyDelegate('willLoad');
    const loadPromise = handler.load ?
      handler.load(request)
      : Promise.resolve({});
    loadPromise.then(response => {
      if (pending.aborted)
        return;

      this._notifyDelegate('didLoad');

      if (isRedirect(response)) {
        this._redirect(((response: any): Redirect).uri);
        return;
      }

      const data = response;
      this._commitPending({
        handler,
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
      this.history.pushLocation({ ...location, token });
    }
    this._notifyDelegate('didCommitState');
  }

  _redirect(uri: string) {
    const pending = this.pending;
    if (!pending)
      throw new Error('Unexpected state');

    this.pending = {
      location:{
        ...parseURI(uri),
        token: generateToken(),
      },
      action: pending.action || 'push',
      aborted: false,
    };
    this._load();
  }

  _notifyDelegate(method: $Keys<AppControllerDelegate>) {
    this.subscribers.forEach(s => {
      const fn = (s: any)[method];
      if (fn)
        fn.apply(null);
    });
  }
}
