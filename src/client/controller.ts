import {Observable} from 'rxjs/Observable';
import 'rxjs/add/observable/defer';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/map';
import {matchRoute, createRequest, isRedirect} from '../app';
import {App, PreloadData, Loader, Redirect, WireObject, RouteHandler, ParsedURI} from '../app';
import {NavigationController, StateLoader} from './navigation';
import {History} from './history';
import { parseURI, uriToString } from '../util';

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
  didCommitState(state: AppState, ancestorStates: AppState[]): void;
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

      didCommitLoad(state: AppState, ancestorStates: AppState[]) {
        delegates.forEach(delegate => delegate.didCommitState(state, ancestorStates));
      },
    }, this.loadState, history);
  }

  start(preloadData?: PreloadData) {
    let preloadState;
    if (preloadData) {
      const location = this.history.getLocation();
      const matchedRequest = this.matchRoute(parseURI(location.uri));
      preloadState = {
        handler: matchedRequest.handler,
        data: preloadData,
      };
    }
    this.navigationController.start(preloadState);
  }

  load(uri: ParsedURI | string, options: {
    stacked: boolean;
    returnToParent: boolean;
  } = { stacked: false, returnToParent: false }) {
    if (options.returnToParent && this.navigationController.hasParent()) {
      this.navigationController.returnToParent();
    } else {
      this.navigationController.push(uriToString(uri), options);
    }
  }

  subscribe(delegate: AppControllerDelegate) {
    this.delegates.push(delegate);
  }

  getLoader(): Loader {
    return _loader;
  }

  private loadState: StateLoader<AppState> = ({ uri, stacked }) => {
    const parsedURI = parseURI(uri);
    const {handler, params} = this.matchRoute(parsedURI);
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
      path: parsedURI.path,
      query: parsedURI.query,
      params,
      stacked,
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
