import {Observable} from 'rxjs/Observable';
import 'rxjs/add/observable/defer';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/map';
import {matchRoute, createRequest, isRedirect} from '../app';
import {App, PreloadData, Loader, Redirect, WireObject, RouteHandler, ParsedURI} from '../app';
import {NavigationController, StateLoader} from './navigation';
import {NavigationControllerDelegate, NavigationType, NavigationEntry, LoadResult} from './navigation';
import {History, Location} from './history';

let _loader: Loader;

export function injectLoader(loader: Loader) {
  _loader = loader;
}

export type AppState = {
  handler: RouteHandler;
  data: WireObject;
  scrollX?: number;
  scrollY?: number;
};

export interface AppControllerDelegate {
  willLoad(): void;
  didLoad(): void;
  didAbortLoad(): void;
  didCommitState(state: AppState): void;
}

export class AppController {
  private navigationController: NavigationController<AppState>;
  private delegates: AppControllerDelegate[];

  constructor(public app: App, private history: History) {
    const delegates: AppControllerDelegate[] = [];
    this.delegates = delegates;
    this.navigationController = new NavigationController({
      willLoad() {
        delegates.forEach(delegate => delegate.willLoad());
      },

      didLoad() {
        delegates.forEach(delegate => delegate.didLoad());
      },

      didAbortLoad() {
        delegates.forEach(delegate => delegate.didAbortLoad());
      },

      didCommitLoad(state: AppState) {
        delegates.forEach(delegate => delegate.didCommitState(state));
      },
    }, this.loadState, history);
  }

  start(preloadData?: PreloadData) {
    let preloadState;
    if (preloadData) {
      const location = this.history.getLocation();
      const matchedRequest = this.matchRoute(location.uri);
      preloadState = {
        handler: matchedRequest.handler,
        data: preloadData,
      };
    }
    this.navigationController.start(preloadState);
  }

  load(uri: ParsedURI) {
    this.navigationController.push(uri);
  }

  subscribe(delegate: AppControllerDelegate) {
    this.delegates.push(delegate);
  }

  getLoader(): Loader {
    return _loader;
  }

  private loadState: StateLoader<AppState> = (uri) => {
    const {handler, params} = this.matchRoute(uri);
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
          return response as Redirect;
        } else {
          const data: WireObject = response;
          return {
            handler,
            data,
          };
        }
      });
  }

  private matchRoute(uri: ParsedURI) {
    return matchRoute(this.app, uri);
  }
}
