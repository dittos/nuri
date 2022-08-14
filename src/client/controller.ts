import {defer, of} from 'rxjs';
import {map} from 'rxjs/operators';
import {matchRoute, createRequest, isRedirect} from '../app';
import {App, PreloadData, WireObject, RouteHandler, ParsedURI} from '../app';
import {NavigationController, StateLoader} from './navigation';
import {History} from './history';
import { parseURI, uriToString } from '../util';

export type AppState = {
  handler: RouteHandler<any, any>;
  data: WireObject;
  scrollX?: number;
  scrollY?: number;
};

export interface AppControllerDelegate {
  willLoad(): void;
  didLoad(): void;
  didAbortLoad(): void;
  didFailLoad(error: any): void;
  didCommitState(state: AppState, ancestorStates: AppState[]): void;
}

export class AppController<L> {
  private navigationController: NavigationController<AppState>;
  private delegates: AppControllerDelegate[];

  constructor(public app: App<L>, private history: History, private loader: L) {
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

      didFailLoad(error: any) {
        delegates.forEach(delegate => delegate.didFailLoad(error));
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

  getLoader(): L {
    return this.loader;
  }

  private loadState: StateLoader<AppState> = ({ uri, stacked }) => {
    const parsedURI = parseURI(uri);
    const {handler, params} = this.matchRoute(parsedURI);
    const load = handler.load;
    if (!load) {
      return of({
        handler,
        data: {},
      });
    }
    const request = createRequest<L>({
      loader: this.loader,
      uri,
      path: parsedURI.path,
      query: parsedURI.query,
      params,
      stacked,
    });
    return defer(() => load(request))
      .pipe(map(response => {
        if (isRedirect(response)) {
          return response;
        } else {
          const data: WireObject = response;
          return {
            handler,
            data,
          };
        }
      }));
  }

  private matchRoute(uri: ParsedURI) {
    return matchRoute<L>(this.app, uri);
  }
}
