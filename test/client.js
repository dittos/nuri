import {describe, it, beforeEach} from 'mocha';
import assert from 'assert';
import sinon from 'sinon';
import {Observable, Subject} from 'rxjs';
import {
  Redirect,
} from '../lib/app';
import {
  NavigationController,
} from '../lib/client/navigation';

class MockHistory {
  constructor(initialLocation) {
    this.locations = [initialLocation];
    this.locationSubject = new Subject();
  }
  getLocation() {
    return this.locations[this.locations.length - 1];
  }
  setHistoryToken(token) {
    this.getLocation().token = token;
  }
  locationChanges() {
    return this.locationSubject;
  }
  pushLocation(location) {
    this.locations.push(location);
  }
  doesPushLocationRefreshPage() {
    return false;
  }
}

describe('NavigationController', () => {
  let events;
  let delegate;
  let controller;

  beforeEach(() => {
    events = [];
    delegate = {
      willLoad() { events.push('willLoad'); },
      didLoad() { events.push('didLoad') },
      didAbortLoad() { events.push('didAbortLoad') },
      didCommitLoad() {},
    };
    controller = null;
  });

  it('should start without preload data', done => {
    const initialUri = {path: '/posts/1234', query: {}};
    const stateLoader = (uri) => {
      assert.deepEqual(uri, initialUri);
      return Observable.defer(() => Promise.resolve('blah'));
    };
    const history = new MockHistory({uri: initialUri, token: null});
    controller = new NavigationController(delegate, stateLoader, history);
    
    delegate.didCommitLoad = (state) => {
      assert.equal(history.locations.length, 1);
      assert.ok(history.locations[0].token);
      assert.equal(state, 'blah');
      assert.deepEqual(events, ['willLoad', 'didLoad']);
      done();
    };
    controller.start();
  });

  it('should start with preload data and no history token', done => {
    const initialUri = {path: '/posts/1234', query: {}};
    const stateLoader = (uri) => {
      throw new Error('should not be called');
    };
    const history = new MockHistory({uri: initialUri, token: null});
    controller = new NavigationController(delegate, stateLoader, history);

    delegate.didCommitLoad = (state) => {
      assert.equal(history.locations.length, 1);
      assert.ok(history.locations[0].token);
      assert.equal(state, 'preloadData');
      assert.deepEqual(events, []);
      done();
    };
    controller.start('preloadData');
  });

  it('should start with preload data and history token set', done => {
    const initialUri = {path: '/posts/1234', query: {}};
    const stateLoader = (uri) => {
      assert.deepEqual(uri, initialUri);
      return Observable.defer(() => Promise.resolve('blah'));
    };
    const history = new MockHistory({uri: initialUri, token: 'initial'});
    controller = new NavigationController(delegate, stateLoader, history);

    delegate.didCommitLoad = (state) => {
      assert.equal(history.locations.length, 1);
      assert.notEqual(history.locations[0].token, 'initial');
      assert.equal(state, 'blah');
      assert.deepEqual(events, ['willLoad', 'didLoad']);
      done();
    };
    controller.start('preloadData');
  });

  it('should cancel inflight load', done => {
    const stateLoader = (uri) => {
      return Observable.defer(() => Promise.resolve('blah'));
    };
    const initialUri = {path: '/posts/1234', query: {}};
    const history = new MockHistory({uri: initialUri, token: null});
    controller = new NavigationController(delegate, stateLoader, history);

    delegate.didCommitLoad = (state) => {
      assert.deepEqual(events, [
        'willLoad',
        'didAbortLoad',
        'willLoad',
        'didAbortLoad',
        'willLoad',
        'didLoad',
      ]);
      assert.equal(history.locations.length, 2);
      assert.equal(history.locations[1].uri.path, '/posts/9999');
      done();
    };
    controller.start();
    controller.push({path: '/posts/4567'});
    controller.push({path: '/posts/9999'});
  });

  it('should redirect', done => {
    const initialUri = {path: '/posts/1234', query: {}};
    const stateLoader = (uri) => {
      if (uri.path === '/redirect') {
        return Observable.of(new Redirect('/posts/1'));
      }
      return Observable.defer(() => Promise.resolve('blah'));
    };
    const history = new MockHistory({uri: initialUri, token: null});
    controller = new NavigationController(delegate, stateLoader, history);

    delegate.didCommitLoad = (state) => {
      assert.deepEqual(events, [
        'willLoad',
        'didAbortLoad',
        'willLoad',
        'didLoad',
      ]);
      assert.equal(history.locations.length, 2);
      assert.equal(history.locations[1].uri.path, '/posts/1');
      done();
    };
    controller.start();
    controller.push({path: '/redirect'});
  });

  it('should restore previous state on passive location change', done => {
    const initialUri = {path: '/posts/1234', query: {}};
    const stateLoader = (uri) => {
      return Observable.defer(() => Promise.resolve('blah'));
    };
    const history = new MockHistory({uri: initialUri, token: null});
    controller = new NavigationController(delegate, stateLoader, history);

    controller.start('initial');
    delegate.didCommitLoad = () => {
      setImmediate(() => {
        delegate.didCommitLoad = (state) => {
          assert.deepEqual(events, [
            'willLoad',
            'didLoad',
          ]);
          assert.equal(history.locations.length, 1);
          assert.equal(history.locations[0].uri.path, '/posts/1234');
          assert.equal(state, 'initial');
          done();
        };
        history.locations.pop();
        history.locationSubject.next(history.locations[0]);
      });
    };
    controller.push({path: '/test'});
  });
});
