import {Observable, fromEvent, never} from 'rxjs';
import {filter, map} from 'rxjs/operators';

export type Location = {
  uri: string;
  token: string | null;
};

export interface History {
  getLocation(): Location;
  setHistoryToken(token: string): void;
  locationChanges(): Observable<Location>;
  pushLocation(location: Location): void;
  doesPushLocationRefreshPage(): boolean;
  back(): void;
  replaceLocation(location: Location): void;
}

export function createHistory(): History {
  if (supportsHistory())
    return new BrowserHistory();
  else
    return new FallbackHistory();
}

export class BrowserHistory implements History {
  locationChanges() {
    return fromEvent(window, 'popstate')
      // Ignore extraneous popstate events in WebKit
      // https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onpopstate
      .pipe(
        filter((event: PopStateEvent) => event.state !== undefined),
        map(() => this.getLocation())
      );
  }

  getLocation() {
    return {
      uri: location.pathname + location.search,
      token: history.state && history.state.token,
    };
  }

  setHistoryToken(token: string) {
    const path = location.pathname + location.search;
    history.replaceState({ token }, '', path);
  }

  pushLocation({ token, uri }: Location) {
    history.pushState({ token }, '', uri);
  }

  replaceLocation({ token, uri }: Location) {
    history.replaceState({ token }, '', uri);
  }

  doesPushLocationRefreshPage(): boolean {
    return false;
  }

  back() {
    history.back();
  }
}

export class FallbackHistory implements History {
  getLocation() {
    return {
      uri: location.pathname + location.search,
      token: null,
    };
  }

  // eslint-disable-next-line no-unused-vars
  setHistoryToken(token: string) {
    // ignored
  }

  locationChanges(): Observable<Location> {
    return never();
  }

  pushLocation({ uri }: Location) {
    window.location.href = uri;
  }

  doesPushLocationRefreshPage(): boolean {
    return true;
  }

  replaceLocation({ uri }: Location) {
    window.location.replace(uri);
  }

  back() {
    history.back();
  }
}

/**
 * Returns true if the HTML5 history API is supported. Taken from Modernizr.
 *
 * https://github.com/Modernizr/Modernizr/blob/master/LICENSE
 * https://github.com/Modernizr/Modernizr/blob/master/feature-detects/history.js
 * changed to avoid false negatives for Windows Phones: https://github.com/reactjs/react-router/issues/586
 */
function supportsHistory() {
  const ua = window.navigator.userAgent;

  if ((ua.indexOf('Android 2.') !== -1 || ua.indexOf('Android 4.0') !== -1) &&
    ua.indexOf('Mobile Safari') !== -1 &&
    ua.indexOf('Chrome') === -1 &&
    ua.indexOf('Windows Phone') === -1
  )
    return false;

  return window.history && 'pushState' in window.history;
}
