import { nanoid as generateToken } from 'nanoid/non-secure';
import {Observable, Subscription, of} from 'rxjs';
import {switchMap} from 'rxjs/operators';
import {Redirect} from '../app';
import {Location, History} from './history';

export type NavigationEntry<T> = {
  uri: string;
  token: string;
  state: T;
  isRedirect: boolean;
  parentToken: string | null;
};

type NavigationType = 'replace' | 'push' | 'pop';

export interface LoadRequest {
  uri: string;
  stacked: boolean;
}

export type LoadResult<T> = {
  state: T;
  escapeStack?: boolean;
} | Redirect;

export interface NavigationControllerDelegate<T> {
  willLoad(): void;
  didLoad(): void;
  didAbortLoad(): void;
  didCommitLoad(state: T, ancestorStates: T[]): void;
}

export type StateLoader<T> = (request: LoadRequest) => Observable<LoadResult<T>>;

export class NavigationController<T> {
  private entries: {[token: string]: NavigationEntry<T>};
  private entryTokens: string[];
  private currentEntry: NavigationEntry<T> | null;
  private started: boolean;
  private loadSubscription: Subscription;

  constructor(
    private delegate: NavigationControllerDelegate<T>,
    private stateLoader: StateLoader<T>,
    private history: History
  ) {
    this.entries = {};
    this.entryTokens = [];
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

  push(uri: string, options: { stacked: boolean } = { stacked: false }) {
    if (this.history.doesPushLocationRefreshPage()) {
      this.history.pushLocation({ uri, token: null });
      return;
    }
    this.abortLoad();
    this.navigate('push', uri, generateToken(), options.stacked);
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

  private navigate(type: NavigationType, uri: string, token: string, stacked: boolean = false) {
    const sourceToken = this.currentEntry ? this.currentEntry.token : null;
    this.delegate.willLoad();
    this.loadSubscription = this.load(uri, token, sourceToken, stacked).subscribe(entry => {
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
    uri: string,
    token: string,
    sourceToken: string | null,
    isStacked: boolean,
    isRedirect: boolean = false
  ): Observable<NavigationEntry<T>> {
    return this.stateLoader({ uri, stacked: isStacked && sourceToken != null })
      .pipe(switchMap(result => {
        if (result instanceof Redirect) {
          return this.load(
            result.uri,
            generateToken(),
            sourceToken,
            result.options.stacked || false,
            true
          );
        } else {
          return of({
            uri,
            token,
            state: result.state,
            isRedirect,
            parentToken: isStacked && !result.escapeStack ? sourceToken : null,
          });
        }
      }));
  }

  private commit(type: NavigationType, entry: NavigationEntry<T>) {
    this.currentEntry = entry;
    this.entries[entry.token] = entry;
    this.entryTokens.push(entry.token);
    this.pruneOldEntries();
    switch (type) {
      case 'replace':
        if (entry.isRedirect) {
          this.history.replaceLocation({ uri: entry.uri, token: entry.token });
        } else {
          this.history.setHistoryToken(entry.token);
        }
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
    const seen: {[token: string]: boolean} = {};
    while (e && e.parentToken) {
      seen[e.token] = true;
      e = this.entries[e.parentToken];
      if (seen[e.token]) {
        throw new Error('Cycle detected');
      }
      if (e) {
        ancestors.unshift(e.state);
      }
    }
    return ancestors;
  }

  private pruneOldEntries(maxSize: number = 5) {
    let e = this.currentEntry;
    const keep: {[token: string]: boolean} = {};
    while (e && e.parentToken) {
      keep[e.token] = true;
      e = this.entries[e.parentToken];
      if (keep[e.token]) {
        throw new Error('Cycle detected');
      }
    }

    let cachedCount = 0;
    for (var i = this.entryTokens.length - 1; i >= 0; i--) {
      const token = this.entryTokens[i];
      if (keep[token]) {
        continue;
      }
      keep[token] = true;
      cachedCount++;
      if (cachedCount >= maxSize) {
        break;
      }
    }

    Object.keys(this.entries).forEach(token => {
      if (!keep[token]) {
        delete this.entries[token];
      }
    });

    this.entryTokens = this.entryTokens.filter(token => this.entries[token]);
  }
}
