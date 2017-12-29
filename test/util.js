import {describe, it} from 'mocha';
import assert from 'assert';
import * as util from '../lib/util';

describe('uriToString', () => {
  it('should convert uri with path', () => {
    assert.equal(util.uriToString({path: '/', query: {}}), '/');
  });

  it('should convert uri with path and query', () => {
    assert.equal(util.uriToString({path: '/', query: {a: 'b'}}), '/?a=b');
  });
});

describe('parseURI', () => {
  it('should convert uri with path', () => {
    assert.deepEqual(util.parseURI('/'), {path: '/', query: {}});
  });

  it('should convert uri with path and query', () => {
    assert.deepEqual(util.parseURI('/?a=b'), {path: '/', query: {a: 'b'}});
  });
});
