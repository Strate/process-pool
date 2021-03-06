import _ from 'lodash'
import Promise from 'bluebird'
import functionLimit from '../functionLimit'
import invert from '../invert'

var delay = time => new Promise(resolve => setTimeout(resolve, time))

describe('function limit', () => {
  it('should limit active promises to two, queuing third call', () => {
    var defs = _.range(0, 3).map(Promise.defer)
    var nCalls = 0
    var pool = functionLimit(() => defs[nCalls++].promise, 2)
    var promises = _.range(0, 3).map(() => pool())

    return delay(10).then(() => {
      nCalls.should.equal(2)
      defs[0].fulfill()
      return promises[0]
    })
    .then(() => {
      nCalls.should.equal(3)
      defs[1].fulfill()
      defs[2].fulfill()
      return Promise.all(promises.slice(1))
    })
  })

  it('should queue a call according to limits until a running function rejects', () => {
    var defs = _.range(0, 3).map(Promise.defer)
    var nCalls = 0
    var pool = functionLimit(() => defs[nCalls++].promise, 2)
    var promises = _.range(0, 3).map(() => pool())

    return delay(10).then(() => {
      nCalls.should.equal(2)
      defs[0].reject()
      return invert(promises[0])
    })
    .then(() => {
      // this would be 2 if the rejection was not caught and another function scheduled
      nCalls.should.equal(3)
      defs[1].fulfill()
      defs[2].fulfill()
      return Promise.all(promises.slice(1))
    })
  })
})
