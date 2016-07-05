import {describe, it, beforeEach} from 'mocha';
import assert from 'assert';
import sinon from 'sinon';
import {
  createApp,
} from '../src/app';
import {
  AppController,
} from '../src/client';

function noOp() {}

describe('AppController', () => {
  const path = '/posts/1234';
  let currentPath;
  let currentToken;
  let env;
  let controller;
  let handler;
  let load;

  beforeEach(() => {
    currentToken = null;
    env = {
      render: noOp,
      setTitle: noOp,
      getPath: () => path,
      getQuery: () => ({}),
      getHistoryToken: () => currentToken,
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
    controller.subscribe(() => {
      const state = controller.state;
      assert.equal(state.handler, handler);
      assert.equal(state.data.fromLoader, true);
      assert.ok(currentToken);
      done();
    });
    controller.start();
  });

  it('should start with preload data and no history token', done => {
    controller.subscribe(() => {
      const state = controller.state;
      assert.equal(state.handler, handler);
      assert.equal(state.data.fromLoader, false);
      assert.ok(currentToken);
      done();
    });
    const preloadData = {id: '1234', fromLoader: false};
    controller.start(preloadData);
  });

  it('should ignore preload data when history token is set', done => {
    currentToken = 'token';
    controller.subscribe(() => {
      const state = controller.state;
      assert.equal(state.handler, handler);
      assert.equal(state.data.fromLoader, true);
      assert.notEqual(currentToken, 'token');
      assert.ok(currentToken);
      done();
    });
    const preloadData = {id: '1234', fromLoader: false};
    controller.start(preloadData);
  });

  it('should cancel inflight load', done => {
    var callCount = 0;
    controller.subscribe(() => {
      callCount++;
      if (callCount === 1) {
        process.nextTick(() => {
          assert.equal(callCount, 1);
          done();
        });
      }
    });
    controller.start();
    controller.load('/posts/4567');
  });
});
