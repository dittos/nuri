import {describe, it, beforeEach} from 'mocha';
import assert from 'assert';
import sinon from 'sinon';
import {Observable} from 'rxjs';
import {
  Redirect,
} from '../lib/app';
import {
  NavigationController,
} from '../lib/client/navigation';

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
    };
    controller = new NavigationController(delegate);
  });

  it('should start without preload data', done => {
    const initialUri = {path: '/posts/1234', query: {}};
    delegate.loadState = (uri) => {
      assert.deepEqual(uri, initialUri);
      return Observable.defer(() => Promise.resolve('blah'));
    };
    delegate.didCommitLoad = (type, entry) => {
      assert.equal(type, 'replace');
      assert.deepEqual(entry.uri, initialUri);
      assert.ok(entry.token);
      assert.equal(entry.state, 'blah');
      assert.deepEqual(events, ['willLoad', 'didLoad']);
      done();
    };
    controller.start({ uri: initialUri, token: null });
  });

  it('should start with preload data and no history token', done => {
    const initialUri = {path: '/posts/1234', query: {}};
    delegate.loadState = (uri) => {
      throw new Error('should not be called');
    };
    delegate.didCommitLoad = (type, entry) => {
      assert.equal(type, 'replace');
      assert.deepEqual(entry.uri, initialUri);
      assert.ok(entry.token);
      assert.equal(entry.state, 'preloadData');
      assert.deepEqual(events, []);
      done();
    };
    controller.start({ uri: initialUri, token: null }, 'preloadData');
  });

  it('should ignore preload data when history token is set', done => {
    const initialUri = {path: '/posts/1234', query: {}};
    delegate.loadState = (uri) => {
      assert.deepEqual(uri, initialUri);
      return Observable.defer(() => Promise.resolve('blah'));
    };
    delegate.didCommitLoad = (type, entry) => {
      assert.equal(type, 'replace');
      assert.deepEqual(entry.uri, initialUri);
      assert.ok(entry.token);
      assert.notEqual(entry.token, 'token');
      assert.equal(entry.state, 'blah');
      assert.deepEqual(events, ['willLoad', 'didLoad']);
      done();
    };
    controller.start({ uri: initialUri, token: 'token' }, 'preloadData');
  });

  it('should cancel inflight load', done => {
    delegate.loadState = (uri) => {
      return Observable.defer(() => Promise.resolve('blah'));
    };
    delegate.didCommitLoad = (type, entry) => {
      assert.deepEqual(events, [
        'willLoad',
        'didAbortLoad',
        'willLoad',
        'didAbortLoad',
        'willLoad',
        'didLoad',
      ]);
      done();
    };
    const initialUri = {path: '/posts/1234', query: {}};
    controller.start({ uri: initialUri, token: null });
    controller.push({path: '/posts/4567'});
    controller.push({path: '/posts/9999'});
  });

  it('should redirect', done => {
    delegate.loadState = (uri) => {
      if (uri.path === '/redirect') {
        return Observable.of(new Redirect('/posts/1'));
      }
      return Observable.defer(() => Promise.resolve('blah'));
    };
    delegate.didCommitLoad = (type, entry) => {
      assert.deepEqual(events, [
        'willLoad',
        'didAbortLoad',
        'willLoad',
        'didLoad',
      ]);
      assert.equal(entry.uri.path, '/posts/1');
      done();
    };
    const initialUri = {path: '/posts/1234', query: {}};
    controller.start({ uri: initialUri, token: null });
    controller.push({path: '/redirect'});
  });
});
