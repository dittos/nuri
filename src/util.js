/* @flow */

import querystring from 'querystring';
import type {ParsedURI} from './app';

export function uriToString(parsed: ParsedURI): string {
  var path = parsed.path;
  const query = querystring.stringify(parsed.query);
  if (query)
    path += '?' + query;
  return path;
}

export function parseURI(uri: string): ParsedURI {
  const queryStart = uri.indexOf('?');
  if (queryStart < 0)
    return {
      path: uri,
      query: {},
    };
  else
    return {
      path: uri.substring(0, queryStart),
      query: querystring.parse(uri.substring(queryStart + 1)),
    };
}
