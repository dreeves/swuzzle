const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const utilsrc = fs.readFileSync(path.join(__dirname, '..', 'utils.js'), 'utf8')
vm.runInThisContext(utilsrc, { filename: 'utils.js' })

const expect = new Map([
  [2, 1],
  [3, 2],
  [4, 9],
  [5, 44],
  [6, 265],
  [7, 1854],
  [8, 14833],
  [9, 133496],
])

expect.forEach((want, ns) => {
  const got = allDerangements(ns).length
  assert.equal(
    got,
    want,
    `replicata: call allDerangements(${ns})
expectata: derangement count ${want}
resultata: derangement count ${got}`,
  )
})
