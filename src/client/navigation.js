/* @flow */

import {v4 as generateToken} from 'uuid';
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/switchMap';
import {Subscription} from 'rxjs/Subscription';
import {Redirect} from '../app';
import type {ParsedURI} from '../app';
import type {Location} from './history';
import {parseURI} from '../util';

export type NavigationEntry<T> = {|
  uri: ParsedURI;
  token: string;
  state: T;
  isRedirect: boolean;
|};

export type NavigationType = 'replace' | 'push' | 'pop';

export type LoadResult<T> = T | Redirect;

export interface NavigationControllerDelegate<T> {
  willLoad(): void;
  didLoad(): void;
  didAbortLoad(): void;
  didCommitLoad(type: NavigationType, entry: NavigationEntry<T>): void;

  loadState(uri: ParsedURI): Observable<LoadResult<T>>;
}

export class NavigationController<T> {
  delegate: NavigationControllerDelegate<T>;
  entries: {[token: string]: NavigationEntry<T>};
  currentEntry: ?NavigationEntry<T>;
  started: boolean;
  loadSubscription: Subscription;

  constructor(delegate: NavigationControllerDelegate<T>) {
    this.delegate = delegate;
    this.entries = {};
    this.currentEntry = null;
    this.started = false;
    // Subscription.EMPTY is missing in flow-typed
    this.loadSubscription = (Subscription: any).EMPTY;
  }

  start({ uri, token }: Location, preloadState?: T) {
    if (this.started)
      return;

    this.started = true;
    const shouldUsePreloadData = !token;
    if (shouldUsePreloadData && preloadState) {
      this._commit('replace', {
        uri,
        token: generateToken(),
        state: preloadState,
        isRedirect: false,
      });
    } else {
      this._navigate('replace', uri, generateToken());
    }
  }

  push(uri: ParsedURI) {
    this._abortLoad();
    this._navigate('push', uri, generateToken());
  }

  pop(location: Location) {
    this._abortLoad();

    const token = location.token;
    const loadedEntry = token && this.entries[token];
    if (loadedEntry) {
      this._commit('pop', loadedEntry);
    } else {
      this._navigate('pop', location.uri, token || generateToken());
    }
  }

  _abortLoad() {
    if (!this.loadSubscription.closed) {
      this.loadSubscription.unsubscribe();
      this.delegate.didAbortLoad();
    }
  }

  _navigate(type: NavigationType, uri: ParsedURI, token: string) {
    this.delegate.willLoad();
    this.loadSubscription = this._load(uri, token).subscribe(entry => {
      this.delegate.didLoad();
      if (entry.isRedirect && type === 'pop') {
        // 'pop' does not apply changed uri to address bar
        // TODO: test this behavior
        type = 'push';
      }
      this._commit(type, entry);
    }); // TODO: handle onError
  }

  _load(uri: ParsedURI, token: string, isRedirect: boolean = false): Observable<NavigationEntry<T>> {
    return this.delegate.loadState(uri)
      .switchMap(result => {
        if (result instanceof Redirect) {
          return this._load(parseURI(result.uri), generateToken(), true);
        } else {
          return Observable.of({
            uri,
            token,
            state: result,
            isRedirect,
          });
        }
      });
  }

  _commit(type: NavigationType, entry: NavigationEntry<T>) {
    this.currentEntry = entry;
    this.entries[entry.token] = entry;
    this.delegate.didCommitLoad(type, entry);
  }
}
