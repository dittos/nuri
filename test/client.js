import {describe, it} from 'mocha';
import assert from 'assert';
import sinon from 'sinon';
import React from 'react';
import {createApp} from '../src/app';
import {
  injectLoader,
  render,
  ClientApp,
} from '../src/client';
import {DefaultEnvironment} from '../src/env';

function Component(props) {
  return React.createElement('div', null, props.data.post.title);
}

const handler = {
  component: Component,

  load(request) {
    return request.loader().then(post => ({
      path: request.path,
      post,
    }))
  },

  renderTitle(data) { return data.post.title; },
  renderMeta(data) { return {description: data.post.title}; },
};

describe('Client', () => {
  it('should render app without preload data', done => {
    const app = createApp();
    app.route('/posts/:id', handler);

    injectLoader(() => Promise.resolve({ title: 'Hello!' }));

    const path = '/posts/1234';
    const doc = {};

    const env = {
      render: sinon.mock().once(),
      setTitle: sinon.mock().once().withExactArgs('Hello!'),
      getPath: () => path,
      getQuery: () => ({}),
      getPreloadData: () => ({
        path,
        post: { title: 'Hello!' },
      }),
    };
    const clientApp = new ClientApp(app, env);
    clientApp.start().then(() => {
      const element = env.render.firstCall.args[0];
      assert.deepEqual(element.props.data, {
        path,
        post: { title: 'Hello!' }
      });
      env.render.verify();
      env.setTitle.verify();
      done();
    }).catch(done);
  });

  it('should render app with preload data', done => {
    const app = createApp();
    app.route('/posts/:id', handler);

    const path = '/posts/1234';
    const doc = {};

    const loader = sinon.mock().never();
    injectLoader(loader);

    const env = {
      render: sinon.mock().once(),
      setTitle: sinon.mock().once().withExactArgs('Hello!'),
      getPath: () => path,
      getQuery: () => ({}),
      getPreloadData: () => ({
        path,
        post: { title: 'Hello!' },
      }),
    };
    const clientApp = new ClientApp(app, env);
    clientApp.start().then(() => {
      loader.verify();
      const element = env.render.firstCall.args[0];
      assert.deepEqual(element.props.data, {
        path,
        post: { title: 'Hello!' }
      });
      env.render.verify();
      env.setTitle.verify();

      env.render = sinon.mock().once();
      element.props.writeData(data => {
        data.post.title = 'Updated';
      });
      const updatedElement = env.render.firstCall.args[0];
      assert.deepEqual(updatedElement.props.data, {
        path,
        post: { title: 'Updated' }
      });
      env.render.verify();
      done();
    }).catch(done);
  });
});
