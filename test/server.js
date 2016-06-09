import {describe, it} from 'mocha';
import assert from 'assert';
import React from 'react';
import {createApp} from '../src/app';
import {
  injectLoaderFactory,
  createRequest,
  render,
} from '../src/server';

function Component(props) {
  return React.createElement('div', null, props.data.post.title);
}

injectLoaderFactory(serverRequest => serverRequest);

describe('Server', () => {
  it('should create request from server-request', () => {
    const app = createApp();
    // something similar to Express request object
    const serverRequest = {
      path: '/posts/1234',
      query: {}
    };
    const request = createRequest(app, serverRequest);
    assert.equal(request.path, serverRequest.path);
    assert.deepEqual(request.query, serverRequest.query);
  });

  it('should render request', done => {
    const app = createApp();
    // something similar to Express request object
    const serverRequest = {
      path: '/posts/1234',
      query: {}
    };

    const handler = {
      component: Component,

      load(request) {
        assert.equal(request.loader, serverRequest);
        return Promise.resolve({
          path: request.path,
          post: { title: 'Hello!' },
        })
      },

      renderTitle(data) { return data.post.title; },
      renderMeta(data) { return {description: data.post.title}; },
    };
    app.route('/posts/:id', handler);

    const request = createRequest(app, serverRequest);
    render(request).then(result => {
      assert.equal(result.html.replace(/data-react-checksum=".+"/g, 'CHECKSUM'),
        '<div data-reactroot="" data-reactid="1" CHECKSUM>Hello!</div>');
      assert.deepEqual(result.preloadData, {
        path: request.path,
        post: { title: 'Hello!' }
      });
      assert.equal(result.title, 'Hello!');
      assert.deepEqual(result.meta, {description: 'Hello!'});
      done();
    }).catch(done);
  });
});
