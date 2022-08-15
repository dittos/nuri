import {describe, it} from 'mocha';
import assert from 'assert';
import {Script} from 'vm';
import {globalVariableName, preludeScript} from '../../lib/bootstrap';
import {onPreloadDataReady} from '../../lib/client/bootstrap';

describe('bootstrap', () => {
  describe('preludeScript', () => {
    it('should set global veriable', () => {
      const globalScope = {}
      const script = new Script(preludeScript)
      script.runInNewContext({window: globalScope})
      assert.notEqual(globalScope[globalVariableName], null)
    })
  })

  describe('onPreloadDataReady', () => {
    it('should enqueue callback if global variable is not called yet', () => {
      const globalScope = {}
      const script = new Script(preludeScript)
      script.runInNewContext({window: globalScope})

      let capturedData = null
      const callback = (data) => capturedData = data
      onPreloadDataReady(callback, globalScope)
      assert.equal(capturedData, null)

      globalScope[globalVariableName]('hi')
      assert.equal(capturedData, 'hi')
    })

    it('should call callback immediately if global variable is already called', () => {
      const globalScope = {}
      const script = new Script(preludeScript)
      script.runInNewContext({window: globalScope})

      globalScope[globalVariableName]('hi')

      let capturedData = null
      const callback = (data) => capturedData = data
      onPreloadDataReady(callback, globalScope)
      assert.equal(capturedData, 'hi')
    })
  })
})
