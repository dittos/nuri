import {describe, it} from 'mocha';
import assert from 'assert';
import React from 'react';
import {createApp} from '../lib/app';
import {
  injectLoader,
  render,
  ClientApp,
} from '../lib/client';

function Component(props) {
  return React.createElement('div', null, props.data.post.title);
}

const handler = {
  component: Component,

  load(request) {
    return request.loader.get().then(post => ({
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

    injectLoader({
      get() {
        return Promise.resolve({ title: 'Hello!' });
      }
    });

    const path = '/posts/1234';
    const doc = {};
    const clientApp = new ClientApp(app, {
      location: {
        pathname: path,
        search: '',
      },
      document: doc,
      render(element) {
        assert.deepEqual(element.props.data, {
          path,
          post: { title: 'Hello!' }
        });
        assert.equal(doc.title, 'Hello!');
        done();
      }
    });
    clientApp.start().catch(done);
  });

  it('should render app with preload data', done => {
    const app = createApp();
    app.route('/posts/:id', handler);

    injectLoader({
      get() {
        assert.fail('should not be called because preload data exists');
      }
    });

    const path = '/posts/1234';
    const doc = {};
    let setData;
    const environ = {
      location: {
        pathname: path,
        search: '',
      },
      document: doc,
      preloadData: {
        path,
        post: { title: 'Hello!' },
      },
      render(element) {
        assert.deepEqual(element.props.data, {
          path,
          post: { title: 'Hello!' }
        });
        assert.equal(doc.title, 'Hello!');
        setData = element.props.setData;
      }
    };
    const clientApp = new ClientApp(app, environ);
    clientApp.start().then(() => {
      environ.render = element => {
        assert.deepEqual(element.props.data, {
          path,
          post: { title: 'Updated' }
        });
        done();
      };
      setData({ post: {title: 'Updated'} });
    }).catch(done);
  });
});
