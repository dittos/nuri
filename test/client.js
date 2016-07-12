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

function eventRecorder(callback) {
  const events = [];

  function record(event) {
    events.push(event);
    callback(event);
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
  let currentPath = '/posts/1234';
  let currentToken;
  let env;
  let controller;
  let handler;
  let load;

  beforeEach(() => {
    currentToken = null;
    env = {
      getLocation: () => ({
        path: currentPath,
        query: {},
        token: currentToken,
      }),
      setHistoryToken: (token) => { currentToken = token },
      setLocationChangeListener: noOp,
      pushLocation: (path, token) => {
        currentPath = path;
        currentToken = token;
      },
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
    controller = new AppController(app, env);
  });

  it('should start without preload data', done => {
    const r = eventRecorder(event => {
      if (event === 'didCommitState') {
        assert.deepEqual(r.events, ['willLoad', 'didLoad', 'didCommitState']);
        const state = controller.state;
        assert.equal(state.handler, handler);
        assert.equal(state.data.fromLoader, true);
        assert.ok(currentToken);
        done();
      }
    });
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
        assert.ok(currentToken);
        done();
      }
    });
    controller.subscribe(r.delegate);
    const preloadData = {id: '1234', fromLoader: false};
    controller.start(preloadData);
  });

  it('should ignore preload data when history token is set', done => {
    currentToken = 'token';
    const r = eventRecorder(event => {
      if (event === 'didCommitState') {
        assert.deepEqual(r.events, ['willLoad', 'didLoad', 'didCommitState']);
        const state = controller.state;
        assert.equal(state.handler, handler);
        assert.equal(state.data.fromLoader, true);
        assert.ok(currentToken);
        done();
      }
    });
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
    });
    controller.subscribe(r.delegate);
    controller.start();
    controller.load('/posts/4567');
    controller.load('/posts/9999');
  });
});
