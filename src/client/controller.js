/* @flow */

import uuid from 'uuid';
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/observable/defer';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/switchMap';
import {Subject} from 'rxjs/Subject';
import {Subscription} from 'rxjs/Subscription';
import type {App, WireObject, PreloadData, Request, RouteHandler, ParsedURI, Loader, Redirect, Response} from '../app';
import {matchRoute, createRequest, isRedirect} from '../app';
import type {History, Location} from './history';
import {parseURI} from '../util';

let _loader: Loader;

export function injectLoader(loader: typeof _loader) {
  _loader = loader;
}

export type AppState = {|
  location: Location;
  handler: RouteHandler;
  data: WireObject;
  scrollX?: number;
  scrollY?: number;
|};

export interface AppControllerDelegate {
  willLoad(): void;
  didLoad(): void;
  didAbortLoad(): void;
  didCommitState(): void;
};

type TokenAction = 'replace' | 'push' | 'pop';

const generateToken = uuid.v4;
function noOp() {}

export class AppController {
  app: App;
  history: History;
  cache: {[token: string]: AppState};
  state: ?AppState;
  subject: Subject<$Keys<AppControllerDelegate>>;
  started: boolean;
  loadSubscription: Subscription;

  constructor(app: App, history: History) {
    this.app = app;
    this.history = history;
    this.cache = {};
    this.state = null;
    this.subject = new Subject();
    this.started = false;
    // Subscription.EMPTY is missing in flow-typed
    this.loadSubscription = (Subscription: any).EMPTY;
  }

  getLoader(): Loader {
    return _loader;
  }

  subscribe(subscriber: AppControllerDelegate): Subscription {
    return this.subject.subscribe(method => {
      const fn = (subscriber: any)[method];
      if (fn)
        fn.apply(null);
    });
  }

  start(preloadData?: PreloadData) {
    if (this.started)
      return;

    this.started = true;
    this.history.locationChanges().subscribe(this._onLocationChange.bind(this));

    const location = this.history.getLocation();
    const shouldUsePreloadData = !location.token;
    location.token = generateToken();
    if (shouldUsePreloadData && preloadData) {
      const matchedRequest = this._matchRoute(location);
      this._commitState('replace', {
        location,
        handler: matchedRequest.handler,
        data: preloadData,
      });
    } else {
      this._handleAction('replace', location);
    }
  }

  load(uri: ParsedURI) {
    if (this.history.doesPushLocationRefreshPage()) {
      this.history.pushLocation({ ...uri, token: null });
      return;
    }
    this._abortLoad();
    this._handleAction('push', { ...uri, token: generateToken() });
  }

  _onLocationChange(location: Location) {
    this._abortLoad();

    const token = location.token;
    const cachedState = token && this.cache[token];
    if (cachedState) {
      this._commitState('pop', cachedState);
    } else {
      this._handleAction('pop', location);
    }
  }

  _matchRoute(location: Location) {
    return matchRoute(this.app, location);
  }

  _abortLoad() {
    if (!this.loadSubscription.closed) {
      this.loadSubscription.unsubscribe();
      this.subject.next('didAbortLoad');
    }
  }

  _handleAction(action: TokenAction, location: Location) {
    this.subject.next('willLoad');
    this.loadSubscription = this._load(location).subscribe(state => {
      this.subject.next('didLoad');
      if (state.location.isRedirect && action === 'pop') {
        // 'pop' does not apply changed uri to address bar
        // TODO: test this behavior
        action = 'push';
      }
      this._commitState(action, state);
    }); // TODO: handle onError
  }

  _load(location: Location): Observable<AppState> {
    const {handler, params} = this._matchRoute(location);
    const load = handler.load;
    if (!load) {
      return Observable.of({
        location,
        handler,
        data: {},
      });
    }
    const request = createRequest({
      app: this.app,
      loader: _loader,
      path: location.path,
      query: location.query,
      params,
    });
    return Observable.defer(() => load(request))
      .switchMap(response => {
        if (isRedirect(response)) {
          const redirectURI = ((response: any): Redirect).uri;
          return this._load({
            ...parseURI(redirectURI),
            token: generateToken(),
            isRedirect: true,
          });
        } else {
          const data: WireObject = response;
          return Observable.of({
            location,
            handler,
            data,
          });
        }
      });
  }

  _commitState(action: TokenAction, state: AppState) {
    const location = state.location;
    const token = location.token || generateToken();
    this.state = state;
    this.cache[token] = state;
    switch (action) {
      case 'replace':
        this.history.setHistoryToken(token);
        break;
      case 'push':
        this.history.pushLocation({ ...location, token });
        break;
      case 'pop':
        // Keep history untouched as the event originates from history
        break;
    }
    this.subject.next('didCommitState');
  }
}
