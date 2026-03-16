const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const utilsrc = fs.readFileSync(path.join(__dirname, '..', 'utils.js'), 'utf8')
vm.runInThisContext(utilsrc, { filename: 'utils.js' })

for (const ns of [2, 3, 4, 5, 6, 7, 8, 9]) {
  const got = crushCount(ns)
  const want = (ns-1) ** ns
  assert.equal(
    got,
    want,
    `replicata: call crushCount(${ns})
expectata: the number of no-self crush maps is (${ns}-1)^${ns} = ${want}
resultata: the count is ${got}`,
  )
}

const crushes3 = range(crushCount(3)).map(i => nthCrush(3, i))
const uniq3 = new Set(crushes3.map(c => JSON.stringify(c)))

assert.equal(
  uniq3.size,
  8,
  `replicata: enumerate nthCrush(3, i) for all valid i
expectata: there are 8 distinct no-self crush maps
resultata: there are ${uniq3.size} distinct maps`,
)

assert.equal(
  uniq3.has(JSON.stringify([1, 0, 0])),
  true,
  `replicata: enumerate nthCrush(3, i) for all valid i
expectata: the crush map [1,0,0] is present so 0 and 1 can chase each other while 2 chases 0
resultata: [1,0,0] was ${uniq3.has(JSON.stringify([1, 0, 0])) ? '' : 'not '}present`,
)

assert.equal(
  crushes3.every(c => c.every((crush, swimmer) => crush !== swimmer)),
  true,
  `replicata: enumerate nthCrush(3, i) for all valid i
expectata: no swimmer ever crushes on itself
resultata: at least one crush map had a self-crush`,
)
