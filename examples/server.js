import 'isomorphic-fetch';
import express from 'express';
import {injectLoaderFactory, createRequest, render} from '../src/server';
import app from './app';

const server = express();

injectLoaderFactory(serverRequest => {
  // TODO: pass cookies/etc.
  return function loader(path) {
    return fetch('http://localhost:9000' + path).then(r => r.json());
  };
});

function h(s) { return s; }

function sendResponse(res, result) {
  res.end(`<!DOCTYPE html>
<html>
  <head>
    <title>${h(result.title || 'Title')}</title>
    <!--
    ${JSON.stringify(result.meta)}
    -->
  </head>
  <body>
    <div id="app">${result.html}</div>
    <script>
    window.preloadData = ${JSON.stringify(result.preloadData)}
    </script>
    <script src="/assets/bundle.js"></script>
  </body>
</html>`);
}

server.use('/assets', express.static(__dirname + '/build'));

server.get('/api/posts', (req, res) => {
  res.send([
    {id: 2, title: 'This is ReSP'},
    {id: 1, title: 'Hello World!'},
  ]).end();
});

server.get('/api/posts/:id', (req, res) => {
  res.send(
    {id: 2, title: 'This is ReSP'}
  ).end();
});

server.get('*', (req, res, next) => {
  render(createRequest(app, req)).then(result => {
    sendResponse(res, result);
  }).catch(next);
});

server.listen(9000, () => {
  console.log('Server running at port 9000');
});
