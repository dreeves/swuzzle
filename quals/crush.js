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

assert.equal(
  crushMapCount(3, { selfPursuit: false, pursueMany: true, manyPursuers: false }).toString(),
  '2',
  `replicata: call crushMapCount(3, { selfPursuit: false, pursueMany: true, manyPursuers: false })
expectata: allowing multiple crushes changes nothing when multiple pursuers are forbidden, so the count stays at the derangement count 2
resultata: the count is ${crushMapCount(3, { selfPursuit: false, pursueMany: true, manyPursuers: false })}`,
)
assert.equal(
  crushMapCount(3, { selfPursuit: true, pursueMany: true, manyPursuers: true }).toString(),
  '343',
  `replicata: call crushMapCount(3, { selfPursuit: true, pursueMany: true, manyPursuers: true })
expectata: the all-subsets family count is (2^3-1)^3 = 343
resultata: the count is ${crushMapCount(3, { selfPursuit: true, pursueMany: true, manyPursuers: true })}`,
)
assert.equal(
  connectedCrushMapCount(3, { selfPursuit: true, pursueMany: true, manyPursuers: true }).toString(),
  '318',
  `replicata: call connectedCrushMapCount(3, { selfPursuit: true, pursueMany: true, manyPursuers: true })
expectata: among the 343 all-subsets crush maps on 3 swimmers, exactly 318 are weakly connected
resultata: the connected count is ${connectedCrushMapCount(3, { selfPursuit: true, pursueMany: true, manyPursuers: true })}`,
)
assert.equal(
  connectedCrushMapCount(6, { selfPursuit: false, pursueMany: false, manyPursuers: true }).toString(),
  '13800',
  `replicata: call connectedCrushMapCount(6, { selfPursuit: false, pursueMany: false, manyPursuers: true })
expectata: among the 15625 no-self crush maps on 6 swimmers, exactly 13800 are weakly connected
resultata: the connected count is ${connectedCrushMapCount(6, { selfPursuit: false, pursueMany: false, manyPursuers: true })}`,
)
assert.equal(
  connectedCrushMapCount(6, { selfPursuit: false, pursueMany: false, manyPursuers: false }).toString(),
  '120',
  `replicata: call connectedCrushMapCount(6, { selfPursuit: false, pursueMany: false, manyPursuers: false })
expectata: the connected derangements on 6 swimmers are exactly the 6-cycles, so the count is 120
resultata: the connected count is ${connectedCrushMapCount(6, { selfPursuit: false, pursueMany: false, manyPursuers: false })}`,
)

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

assert.deepEqual(
  nthCrushMap(3, 0n, { selfPursuit: true, pursueMany: true, manyPursuers: true }),
  [[0], [0], [0]],
  `replicata: call nthCrushMap(3, 0n, { selfPursuit: true, pursueMany: true, manyPursuers: true })
expectata: the first all-subsets crush map gives every swimmer the singleton crush set {0}
resultata: the crush map is ${JSON.stringify(nthCrushMap(3, 0n, { selfPursuit: true, pursueMany: true, manyPursuers: true }))}`,
)

const cyc6 = [[1], [2], [0], [4], [5], [3]]
const fork6 = [[1], [0], [0], [4], [3], [3]]
const mix6 = [[1], [2], [0], [4], [3], [3]]

assert.equal(
  componentKey(cyc6, [0, 1, 2]) === componentKey(cyc6, [3, 4, 5]),
  false,
  `replicata: call componentKey([[1],[2],[0],[4],[5],[3]], [0,1,2]) and componentKey([[1],[2],[0],[4],[5],[3]], [3,4,5])
expectata: translated copies of the same 3-cycle on different parts of the 6-gon keep different keys so the absolute final image can stay symmetric
resultata: the two keys were ${JSON.stringify([componentKey(cyc6, [0, 1, 2]), componentKey(cyc6, [3, 4, 5])])}`,
)

assert.equal(
  motifKey(cyc6, [0, 1, 2]) === motifKey(cyc6, [3, 4, 5]),
  true,
  `replicata: call motifKey([[1],[2],[0],[4],[5],[3]], [0,1,2]) and motifKey([[1],[2],[0],[4],[5],[3]], [3,4,5])
expectata: translated copies of the same connected motif share a whole-polygon motif key, so disconnected unions can be recognized as redundant
resultata: the two keys were ${JSON.stringify([motifKey(cyc6, [0, 1, 2]), motifKey(cyc6, [3, 4, 5])])}`,
)

assert.deepEqual(
  weakCrushComponents(mix6),
  [[0, 1, 2], [3, 4, 5]],
  `replicata: call weakCrushComponents([[1],[2],[0],[4],[3],[3]])
expectata: the mixed 6-swimmer crush map splits into the 0/1/2 and 3/4/5 components
resultata: the components are ${JSON.stringify(weakCrushComponents(mix6))}`,
)
assert.equal(
  connectedCrushMap(mix6),
  false,
  `replicata: call connectedCrushMap([[1],[2],[0],[4],[3],[3]])
expectata: the mixed 6-swimmer crush map is disconnected because it has separate 0/1/2 and 3/4/5 weak components
resultata: connectedCrushMap returned ${connectedCrushMap(mix6)}`,
)

const seen6 = new Set([...componentKeys(cyc6), ...componentKeys(fork6)])
assert.equal(
  redundantCrushMap(mix6, seen6),
  true,
  `replicata: mark the components from [[1],[2],[0],[4],[5],[3]] and [[1],[0],[0],[4],[3],[3]] as seen, then call redundantCrushMap([[1],[2],[0],[4],[3],[3]], seen)
expectata: the mixed 6-swimmer crush map is redundant because both of its components were already seen
resultata: redundantCrushMap returned ${redundantCrushMap(mix6, seen6)}`,
)

const all3opts = { selfPursuit: true, pursueMany: true, manyPursuers: true }
const orb3 = [[0], [1], [2]]

assert.equal(
  orbitKey(orb3),
  orbitKey(actCrushMap(orb3, { flip: false, k: 1 })),
  `replicata: call orbitKey([[0],[1],[2]]) and orbitKey(actCrushMap([[0],[1],[2]], { flip: false, k: 1 }))
expectata: rotating a crush map stays in the same whole-map dihedral orbit
resultata: the orbit keys were ${JSON.stringify([orbitKey(orb3), orbitKey(actCrushMap(orb3, { flip: false, k: 1 }))])}`,
)

const all3orbits = new Set(
  range(Number(crushMapCount(3, all3opts))).map(i =>
    orbitKey(nthCrushMap(3, BigInt(i), all3opts))),
)
assert.equal(
  all3orbits.size,
  70,
  `replicata: enumerate orbitKey(nthCrushMap(3, i, { selfPursuit: true, pursueMany: true, manyPursuers: true })) over all valid i
expectata: the 343 all-subsets crush maps on 3 swimmers collapse to 70 whole-map dihedral orbit classes
resultata: there were ${all3orbits.size} orbit classes`,
)

assert.equal(
  isOrbitRep([[0], [0], [0]]),
  true,
  `replicata: call isOrbitRep([[0],[0],[0]])
expectata: the lexicographically first all-subsets crush map is its orbit representative
resultata: isOrbitRep returned ${isOrbitRep([[0], [0], [0]])}`,
)
