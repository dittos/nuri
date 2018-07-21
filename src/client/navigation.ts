import {v4 as generateToken} from 'uuid';
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/switchMap';
import {Subscription} from 'rxjs/Subscription';
import {Redirect} from '../app';
import {ParsedURI} from '../app';
import {Location, History} from './history';
import {parseURI} from '../util';

export type NavigationEntry<T> = {
  uri: ParsedURI;
  token: string;
  state: T;
  isRedirect: boolean;
  parentToken: string | null;
};

type NavigationType = 'replace' | 'push' | 'pop';

export interface LoadRequest {
  uri: ParsedURI;
  stacked: boolean;
}

export type LoadResult<T> = T | Redirect;

export interface NavigationControllerDelegate<T> {
  willLoad(): void;
  didLoad(): void;
  didAbortLoad(): void;
  didCommitLoad(state: T, ancestorStates: T[]): void;
}

export type StateLoader<T> = (request: LoadRequest) => Observable<LoadResult<T>>;

export class NavigationController<T> {
  private entries: {[token: string]: NavigationEntry<T>};
  private currentEntry: NavigationEntry<T> | null;
  private started: boolean;
  private loadSubscription: Subscription;

  constructor(
    private delegate: NavigationControllerDelegate<T>,
    private stateLoader: StateLoader<T>,
    private history: History
  ) {
    this.entries = {};
    this.currentEntry = null;
    this.started = false;
    this.loadSubscription = Subscription.EMPTY;
  }

  start(preloadState?: T) {
    if (this.started)
      return;

    this.started = true;

    this.history.locationChanges().subscribe((loc: Location) => {
      this.pop(loc);
    });

    const location = this.history.getLocation();
    // If the controller is started with token, preload data could be stale,
    // so it is safe to ignore it.
    const shouldUsePreloadData = !location.token;
    if (shouldUsePreloadData && preloadState) {
      this.commit('replace', {
        uri: location.uri,
        token: generateToken(),
        state: preloadState,
        isRedirect: false,
        parentToken: null,
      });
    } else {
      this.navigate('replace', location.uri, generateToken());
    }
  }

  push(uri: ParsedURI, options: { stacked: boolean } = { stacked: false }) {
    if (this.history.doesPushLocationRefreshPage()) {
      this.history.pushLocation({ uri, token: null });
      return;
    }
    this.abortLoad();
    const parentToken = options.stacked && this.currentEntry ? this.currentEntry.token : null;
    this.navigate('push', uri, generateToken(), parentToken);
  }

  hasParent(): boolean {
    return this.currentEntry ? this.currentEntry.parentToken != null : false;
  }

  returnToParent() {
    this.history.back();
  }

  private pop(location: Location) {
    this.abortLoad();

    const token = location.token;
    const loadedEntry = token && this.entries[token];
    if (loadedEntry) {
      this.commit('pop', loadedEntry);
    } else {
      this.navigate('pop', location.uri, token || generateToken());
    }
  }

  private abortLoad() {
    if (!this.loadSubscription.closed) {
      this.loadSubscription.unsubscribe();
      this.delegate.didAbortLoad();
    }
  }

  private navigate(type: NavigationType, uri: ParsedURI, token: string, parentToken: string | null = null) {
    this.delegate.willLoad();
    this.loadSubscription = this.load(uri, token, parentToken).subscribe(entry => {
      this.delegate.didLoad();
      if (entry.isRedirect && type === 'pop') {
        // 'pop' does not apply changed uri to address bar
        // TODO: test this behavior
        type = 'push';
      }
      this.commit(type, entry);
    }); // TODO: handle onError
  }

  private load(
    uri: ParsedURI,
    token: string,
    parentToken: string | null,
    isRedirect: boolean = false
  ): Observable<NavigationEntry<T>> {
    return this.stateLoader({ uri, stacked: parentToken != null })
      .switchMap(result => {
        if (result instanceof Redirect) {
          return this.load(parseURI(result.uri), generateToken(), parentToken, true);
        } else {
          return Observable.of({
            uri,
            token,
            state: result,
            isRedirect,
            parentToken,
          });
        }
      });
  }

  private commit(type: NavigationType, entry: NavigationEntry<T>) {
    this.currentEntry = entry;
    this.entries[entry.token] = entry;
    switch (type) {
      case 'replace':
        this.history.setHistoryToken(entry.token);
        break;
      case 'push':
        this.history.pushLocation({ uri: entry.uri, token: entry.token });
        break;
      case 'pop':
        // Keep history untouched as the event originates from history
        break;
    }
    this.delegate.didCommitLoad(entry.state, this.getAncestorStates());
  }

  private getAncestorStates(): T[] {
    const ancestors: T[] = [];
    let e = this.currentEntry;
    const seen = {};
    while (e && e.parentToken) {
      seen[e.token] = true;
      e = this.entries[e.parentToken];
      if (seen[e.token]) {
        throw new Error('Cycle detected');
      }
      if (e) {
        ancestors.push(e.state);
      }
    }
    return ancestors;
  }
}
