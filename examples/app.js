import React from 'react';
import {createApp} from '../lib/app';

const app = createApp();

app.route('/', {
  component(props) {
    function addItem() {
      props.setData({ posts: [
        {
          id: Date.now(),
          title: new Date().toString()
        },
        ...props.data.posts
      ] });
    }

    return <div>
      <ul>
        {props.data.posts.map(post =>
          <li key={post.id}>
            <a href={`/posts/${post.id}`}>{post.title}</a>
          </li>
        )}
      </ul>
      <button onClick={addItem}>Add Item</button>
    </div>;
  },

  load(request) {
    return request.loader('/api/posts').then(posts => ({ posts }));
  }
});

app.route('/posts/:id', {
  component(props) {
    return <div>
      <h1>{props.data.title}</h1>
    </div>;
  },

  load(request) {
    return request.loader(`/api/posts/${request.params.id}`);
  },

  renderTitle(data) {
    return data.title;
  }
});

export default app;
