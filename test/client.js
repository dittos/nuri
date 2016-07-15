import {describe, it, beforeEach} from 'mocha';
import assert from 'assert';
import sinon from 'sinon';
import {
  createApp,
} from '../src/app';
import {
  AppController,
} from '../src/client/controller';

function noOp() {}

function eventRecorder(callback, testDone) {
  const events = [];

  function record(event) {
    events.push(event);
    try {
      callback(event);
    } catch (e) {
      testDone(e);
    }
  }

  return {
    events,

    delegate: {
      willLoad() { record('willLoad'); },
      didLoad() { record('didLoad') },
      didAbortLoad() { record('didAbortLoad') },
      didCommitState() { record('didCommitState') },
    }
  };
}

describe('AppController', () => {
  let currentLocation;
  let env;
  let controller;
  let handler;
  let load;

  beforeEach(() => {
    currentLocation = {path: '/posts/1234', query: {}, token: null};
    env = {
      getLocation: () => currentLocation,
      setHistoryToken: (token) => { currentLocation.token = token },
      setLocationChangeListener: noOp,
      pushLocation: location => { currentLocation = location },
    };
    const app = createApp();
    handler = {
      load(request) {
        return Promise.resolve({
          id: request.params.id,
          fromLoader: true
        });
      }
    };
    app.route('/posts/:id', handler);
    app.route('/redirect', {
      load({ redirect }) {
        return redirect('/posts/1');
      }
    });
    controller = new AppController(app, env);
  });

  it('should start without preload data', done => {
    const r = eventRecorder(event => {
      if (event === 'didCommitState') {
        assert.deepEqual(r.events, ['willLoad', 'didLoad', 'didCommitState']);
        const state = controller.state;
        assert.equal(state.handler, handler);
        assert.equal(state.data.fromLoader, true);
        assert.ok(currentLocation.token);
        done();
      }
    }, done);
    controller.subscribe(r.delegate);
    controller.start();
  });

  it('should start with preload data and no history token', done => {
    const r = eventRecorder(event => {
      if (event === 'didCommitState') {
        assert.deepEqual(r.events, ['didCommitState']);
        const state = controller.state;
        assert.equal(state.handler, handler);
        assert.equal(state.data.fromLoader, false);
        assert.ok(currentLocation.token);
        done();
      }
    }, done);
    controller.subscribe(r.delegate);
    const preloadData = {id: '1234', fromLoader: false};
    controller.start(preloadData);
  });

  it('should ignore preload data when history token is set', done => {
    currentLocation.token = 'token';
    const r = eventRecorder(event => {
      if (event === 'didCommitState') {
        assert.deepEqual(r.events, ['willLoad', 'didLoad', 'didCommitState']);
        const state = controller.state;
        assert.equal(state.handler, handler);
        assert.equal(state.data.fromLoader, true);
        assert.ok(currentLocation.token);
        done();
      }
    }, done);
    controller.subscribe(r.delegate);
    const preloadData = {id: '1234', fromLoader: false};
    controller.start(preloadData);
  });

  it('should cancel inflight load', done => {
    const r = eventRecorder(event => {
      if (event === 'didCommitState') {
        assert.deepEqual(r.events, [
          'willLoad',
          'didAbortLoad',
          'willLoad',
          'didAbortLoad',
          'willLoad',
          'didLoad',
          'didCommitState'
        ]);
        done();
      }
    }, done);
    controller.subscribe(r.delegate);
    controller.start();
    controller.load({path: '/posts/4567'});
    controller.load({path: '/posts/9999'});
  });

  it('should redirect', done => {
    const r = eventRecorder(event => {
      if (event === 'didCommitState') {
        assert.deepEqual(r.events, [
          'willLoad',
          'didAbortLoad',
          'willLoad',
          'didLoad',
          'willLoad',
          'didLoad',
          'didCommitState'
        ]);
        assert.equal(currentLocation.path, '/posts/1');
        done();
      }
    }, done);
    controller.subscribe(r.delegate);
    controller.start();
    controller.load({path: '/redirect'});
  });
});
