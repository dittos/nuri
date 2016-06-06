import {describe, it} from 'mocha';
import assert from 'assert';
import React from 'react';
import {createApp} from '../lib/app';
import {
  injectLoader,
  injectEnvironment,
  render,
} from '../lib/client';

function Component(props) {
  return React.createElement('div', null, props.data.post.title);
}

describe('Client', () => {
  it('should render app', done => {
    const app = createApp();
    const loader = new Object();
    injectLoader(loader);

    const handler = {
      component: Component,

      load(request) {
        assert.equal(request.loader, loader);
        return Promise.resolve({
          path: request.path,
          post: { title: 'Hello!' },
        })
      },

      renderTitle(data) { return data.post.title; },
      renderMeta(data) { return {description: data.post.title}; },
    };
    app.route('/posts/:id', handler);

    const path = '/posts/1234';
    const doc = {};
    injectEnvironment({
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

    render(app, null).catch(done);
  });
});
