/* @flow */

import {Observable} from 'rxjs/Observable';
import 'rxjs/add/observable/defer';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/map';
import {matchRoute, createRequest, isRedirect} from '../app';
import type {App, PreloadData, Loader, Redirect, WireObject, RouteHandler, ParsedURI} from '../app';
import {NavigationController} from './navigation';
import type {NavigationControllerDelegate, NavigationType, NavigationEntry, LoadResult} from './navigation';
import type {History} from './history';

let _loader: Loader;

export function injectLoader(loader: typeof _loader) {
  _loader = loader;
}

export type AppState = {|
  handler: RouteHandler;
  data: WireObject;
  scrollX?: number;
  scrollY?: number;
|};

interface AppControllerDelegate {
  willLoad(): void;
  didLoad(): void;
  didAbortLoad(): void;
  didCommitState(state: AppState): void;
}

export class AppController {
  app: App;
  _priv: AppControllerPrivate;

  constructor(app: App, history: History) {
    this.app = app;
    this._priv = new AppControllerPrivate(app, history);
  }

  start(preloadData?: PreloadData) {
    this._priv.start(preloadData);
  }

  load(uri: ParsedURI) {
    this._priv.load(uri);
  }

  subscribe(delegate: AppControllerDelegate) {
    this._priv.subscribe(delegate);
  }

  getLoader(): Loader {
    return _loader;
  }
}

class AppControllerPrivate implements NavigationControllerDelegate<AppState> {
  app: App;
  _history: History;
  _navigationController: NavigationController<AppState>;
  _delegates: AppControllerDelegate[];
  
  constructor(app: App, history: History) {
    this.app = app;
    this._history = history;
    this._navigationController = new NavigationController(this);
    this._delegates = [];
  }

  start(preloadData?: PreloadData) {
    this._history.locationChanges().subscribe(location => {
      this._navigationController.pop(location);
    });

    const location = this._history.getLocation();
    let preloadState;
    if (preloadData) {
      const matchedRequest = this._matchRoute(location.uri);
      preloadState = {
        handler: matchedRequest.handler,
        data: preloadData,
      };
    }
    this._navigationController.start(location, preloadState);
  }

  subscribe(delegate: AppControllerDelegate) {
    this._delegates.push(delegate);
  }

  willLoad() {
    this._delegates.forEach(delegate => delegate.willLoad());
  }

  didLoad() {
    this._delegates.forEach(delegate => delegate.didLoad());
  }

  didAbortLoad() {
    this._delegates.forEach(delegate => delegate.didAbortLoad());
  }

  didCommitLoad(type: NavigationType, { uri, token, state }: NavigationEntry<AppState>) {
    switch (type) {
      case 'replace':
        this._history.setHistoryToken(token);
        break;
      case 'push':
        this._history.pushLocation({ uri, token });
        break;
      case 'pop':
        // Keep history untouched as the event originates from history
        break;
    }
    this._delegates.forEach(delegate => delegate.didCommitState(state));
  }

  load(uri: ParsedURI) {
    if (this._history.doesPushLocationRefreshPage()) {
      this._history.pushLocation({ uri, token: null });
    } else {
      this._navigationController.push(uri);
    }
  }

  loadState(uri: ParsedURI): Observable<LoadResult<AppState>> {
    const {handler, params} = this._matchRoute(uri);
    const load = handler.load;
    if (!load) {
      return Observable.of({
        handler,
        data: {},
      });
    }
    const request = createRequest({
      app: this.app,
      loader: _loader,
      path: uri.path,
      query: uri.query,
      params,
    });
    return Observable.defer(() => load(request))
      .map(response => {
        if (isRedirect(response)) {
          return ((response: any): Redirect);
        } else {
          const data: WireObject = response;
          return {
            handler,
            data,
          };
        }
      });
  }

  _matchRoute(uri: ParsedURI) {
    return matchRoute(this.app, uri);
  }
}
