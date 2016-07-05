import React from 'react';
import {createApp, Link} from '../src';

const app = createApp();

app.route('/', {
  component(props) {
    function addItem() {
      props.writeData(data => {
        data.posts.push({
          id: Date.now(),
          title: new Date().toString()
        });
      });
    }

    return <div>
      <ul>
        {props.data.posts.map(post =>
          <li key={post.id}>
            <Link to={`/posts/${post.id}`}>{post.title}</Link>
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
