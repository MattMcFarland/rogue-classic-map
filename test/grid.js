const grid = require('../lib')
const test = require('tape')

test('Classic Rogue Generator', t => {
  t.doesNotThrow(grid())
})
