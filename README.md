# Nuri

**Nuri** is a URL routing library for React with integrated data fetching and server-side rendering support.

## Writing a Nuri app

### Write shared (isomorphic) app code

*app.js*

```js
import React from 'react';
import {createApp} from 'nuri';

var app = createApp();

app.route(
  // Path pattern is similar to Express
  '/posts/:id',
  
  {
    // `Post` component is rendered on path `/posts/blahblah`
    component: Post,
    
    // `load` hook returns promise
    // The component is rendered after the promise resolved
    load: (request) => {
      // What is `loader`? It'll be explained later.
      return request.loader('/api/posts/' + request.params.id);
    },
    
    // Set document title (optional)
    renderTitle: (data) => data.title,
  }
});

function Post(props) {
  // Data loaded by `load` hook is provided as `data` prop.
  return <h1>{props.data.title}</h1>;
}

export default app;
```

### Boot the app in the browser

(Assuming you are using bundler)

```js
import {injectLoader, render} from 'nuri/client';
import {app} from './app';

// Inject loader to be accesible from `load` hook
injectLoader(function loader(path) {
  return fetch(path).then(r => r.json());
});

render(
  // Render `app` to DOM node
  app,
  document.getElementById('container'),
  
  // Provide the data preloaded from server.
  // If exist, for the first route, `load` hook is skipped and
  // component is rendered immediately without additional data fetching.
  window.preloadData
);
```

### Server-side rendering

```js
import 'isomorphic-fetch';
import {injectLoaderFactory, render} from 'nuri/server';
import app from './app';

// Loader Factory is called per request and returned loader is passed into `load` hook
injectLoaderFactory(serverRequest => {
  return function loader(path) {
    return fetch('http://localhost:9000' + path).then(r => r.json());
  };
});

// Let's use fake server request
// This would come from server library in real app
var serverRequest = {
  path: '/posts/123',
  query: {},
};

render(app, serverRequest).then(result => {
  // `result` contains several properties:
  // - html: prerendered HTML markup
  // - preloadData: fetched data from `load` hook
  // - title: document title from `renderTitle` hook
  // - meta: arbitary metadata from `renderMeta` hook (useful for SEO!)
  
  // Generate full HTML page with these information.
  // Use any templating engine you like. Or just concat strings.
});
```
