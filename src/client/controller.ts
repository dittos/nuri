import {defer, of} from 'rxjs';
import {catchError, map, switchMap} from 'rxjs/operators';
import {matchRoute, createRequest, isRedirect, matchLazyRoute, RouteMatch} from '../app';
import {App, PreloadData, WireObject, RouteHandler, ParsedURI} from '../app';
import {NavigationController, StateLoader} from './navigation';
import {History} from './history';
import { parseURI, uriToString } from '../util';

export type AppState = {
  scrollX?: number;
  scrollY?: number;
} & ({
  status: 'ok';
  handler: RouteHandler<any, any>;
  data: WireObject;
} | {
  status: 'error';
  error: any;
});

export interface AppControllerDelegate {
  willLoad(): void;
  didLoad(): void;
  didAbortLoad(): void;
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

      didCommitLoad(state: AppState, ancestorStates: AppState[]) {
        delegates.forEach(delegate => delegate.didCommitState(state, ancestorStates));
      },
    }, this.loadState, history);
  }

  start(preloadData?: PreloadData) {
    let preloadState: AppState | undefined;
    if (preloadData) {
      const location = this.history.getLocation();
      const matchedRequest = this.matchRoute(parseURI(location.uri));
      preloadState = matchedRequest ? {
        status: 'ok',
        handler: matchedRequest.handler,
        data: preloadData,
      } : {
        status: 'error',
        error: 'Not Found',
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
    const match = this.matchRoute(parsedURI);
    if (!match) {
      const lazyMatch = matchLazyRoute<L>(this.app, parsedURI);
      if (lazyMatch) {
        return defer(() => lazyMatch.handler())
          .pipe(
            switchMap(handler => {
              return this.loadStateFromMatch({
                handler,
                params: lazyMatch.params,
                routeId: undefined,
              }, uri, parsedURI, stacked);
            }),
          );
      }
      return of({
        state: {
          status: 'error' as const,
          error: 'Not Found',
        },
        escapeStack: true,
      })
    }
    return this.loadStateFromMatch(match, uri, parsedURI, stacked);
  };

  private loadStateFromMatch(match: RouteMatch<L>, uri: string, parsedURI: ParsedURI, stacked: boolean) {
    const {handler, params} = match;
    const load = handler.load;
    if (!load) {
      return of({
        state: {
          status: 'ok' as const,
          handler,
          data: {},
        }
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
      .pipe(
        map(response => {
          if (isRedirect(response)) {
            return response;
          } else {
            const data: WireObject = response;
            return {
              state: {
                status: 'ok' as const,
                handler,
                data,
              }
            };
          }
        }),
        catchError(error => {
          return of({
            state: {
              status: 'error' as const,
              error,
            },
            escapeStack: true,
          });
        })
      );
  }

  private matchRoute(uri: ParsedURI) {
    return matchRoute<L>(this.app, uri);
  }
}
