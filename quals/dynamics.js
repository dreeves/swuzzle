const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const utilsrc = fs.readFileSync(path.join(__dirname, '..', 'utils.js'), 'utf8')
const clientsrc = fs.readFileSync(path.join(__dirname, '..', 'client.js'), 'utf8')

function loadApp(search) {
  const context = {
    Math,
    Number,
    console: { log() {} },
    document: { body: { appendChild() {} } },
    window: {
      location: { search },
      history: { replaceState() {}, pushState() {} },
    },
    location: { reload() {} },
    HTMLCanvasElement: function HTMLCanvasElement() {},
    windowWidth: 800,
    windowHeight: 600,
    width: 800,
    height: 600,
    HSB: 'HSB',
    LEFT: 'LEFT',
    BASELINE: 'BASELINE',
    CENTER: 'CENTER',
    keyCode: 0,
    TAU: Math.PI * 2,
    min: Math.min,
    max: Math.max,
    sin: Math.sin,
    cos: Math.cos,
    sqrt: Math.sqrt,
    dist(x1, y1, x2, y2) { return Math.hypot(x1 - x2, y1 - y2) },
    stroke() {},
    fill() {},
    textSize() {},
    push() {},
    pop() {},
    text() {},
    noStroke() {},
    createCanvas(w, h) {
      context.width = w
      context.height = h
    },
    textWidth() { return 0 },
    noFill() {},
    colorMode() {},
    clear() {},
    background() {},
    line() {},
    image() {},
    rect() {},
    point() {},
    ellipse() {},
    strokeWeight() {},
    textAlign() {},
    drawingContext: {
      getImageData() { return { data: [] } },
      putImageData() {},
    },
    pixelDensity() { return 1 },
    noLoop() {},
    midpoint: undefined,
    shuffle(x) { return x },
    frameRate() {},
    randreal(a, b) { return (a + b) / 2 },
    createInput() {
      return {
        position() {},
        size() {},
        style() {},
        attribute() {},
        input() {},
        value() {},
      }
    },
    createSlider(_min, _max, value) {
      return {
        sliderValue: value,
        position() {},
        size() {},
        style() {},
        input(fn) { this.oninput = fn },
        changed(fn) { this.onchange = fn },
        value(v) {
          if (arguments.length) this.sliderValue = v
          return this.sliderValue
        },
      }
    },
    createButton() {
      return {
        position() {},
        style() {},
        mousePressed() {},
        attribute() {},
        removeAttribute() {},
      }
    },
    createGraphics() {
      return {
        canvas: { style: {} },
        clear() {},
        colorMode() {},
        background() {},
        noStroke() {},
        noFill() {},
        fill() {},
        rect() {},
        stroke() {},
        strokeWeight() {},
        line() {},
        ellipse() {},
        image() {},
        textAlign() {},
        textSize() {},
        text() {},
        textWidth() { return 0 },
      }
    },
    createCheckbox(label, checked) {
      return {
        label,
        checkedValue: checked,
        position() {},
        style() {},
        changed() {},
        checked() { return this.checkedValue },
      }
    },
  }
  context.HTMLCanvasElement.prototype = { getContext() { return {} } }
  vm.createContext(context)
  vm.runInContext(utilsrc, context, { filename: 'utils.js' })
  vm.runInContext(clientsrc, context, { filename: 'client.js' })
  return context
}

function state(context) {
  return JSON.parse(
    vm.runInContext('JSON.stringify({ swm, crushes, simstep, simsubsteps, pursuitBias })', context),
  )
}

function drawsToCoalesce(context, limit = 5000) {
  vm.runInContext('setup()', context)
  let draws = 0
  for (; draws < limit && !vm.runInContext('coalesced', context); draws++) {
    vm.runInContext('draw()', context)
  }
  return draws
}

function approx(a, b) { return Math.abs(a - b) < 1e-9 }

const context = loadApp('?ns=2&self=0&pursue=0&pursuers=0')
const slowContext = loadApp('?ns=2&self=0&pursue=0&pursuers=0&speed=1000')

const sync = JSON.parse(
  vm.runInContext(
    `JSON.stringify(syncstep([[0,0],[10,0],[0,10]], [1,2,0], 1))`,
    context,
  ),
)
assert.equal(
  approx(sync[2][0], 0),
  true,
  `replicata: call syncstep([[0,0],[10,0],[0,10]], [1,2,0], 1)
expectata: swimmer 2 uses swimmer 0's old x-coordinate, so its new x-coordinate stays 0
resultata: swimmer 2's new x-coordinate is ${sync[2][0]}`,
)
assert.equal(
  approx(sync[2][1], 9),
  true,
  `replicata: call syncstep([[0,0],[10,0],[0,10]], [1,2,0], 1)
expectata: swimmer 2 moves one pixel toward swimmer 0's old position, landing at y=9
resultata: swimmer 2's new y-coordinate is ${sync[2][1]}`,
)

const multisync = JSON.parse(
  vm.runInContext(
    `JSON.stringify(syncstep([[0,0],[10,0],[0,10]], [[1,2],[2],[0]], 1))`,
    context,
  ),
)
assert.equal(
  approx(multisync[0][0], Math.SQRT1_2),
  true,
  `replicata: call syncstep([[0,0],[10,0],[0,10]], [[1,2],[2],[0]], 1)
expectata: swimmer 0 moves one pixel toward the centroid of swimmers 1 and 2, so its x-coordinate becomes sqrt(1/2)
resultata: swimmer 0's new x-coordinate is ${multisync[0][0]}`,
)
assert.equal(
  approx(multisync[0][1], Math.SQRT1_2),
  true,
  `replicata: call syncstep([[0,0],[10,0],[0,10]], [[1,2],[2],[0]], 1)
expectata: swimmer 0 moves one pixel toward the centroid of swimmers 1 and 2, so its y-coordinate becomes sqrt(1/2)
resultata: swimmer 0's new y-coordinate is ${multisync[0][1]}`,
)
const randomStep = JSON.parse(
  vm.runInContext(
    `JSON.stringify(randomstep([[100,100],[110,100]], [[0,1],[-1,0]], 1))`,
    context,
  ),
)
assert.equal(
  approx(randomStep[0][0], 101),
  true,
  `replicata: call randomstep([[100,100],[110,100]], [[0,1],[-1,0]], 1)
expectata: swimmer 0 moves one pixel toward swimmer 1 when its random weight is +1
resultata: swimmer 0's new x-coordinate is ${randomStep[0][0]}`,
)
assert.equal(
  approx(randomStep[1][0], 111),
  true,
  `replicata: call randomstep([[100,100],[110,100]], [[0,1],[-1,0]], 1)
expectata: swimmer 1 moves one pixel away from swimmer 0 when its random weight is -1
resultata: swimmer 1's new x-coordinate is ${randomStep[1][0]}`,
)
const randomNorm = JSON.parse(
  vm.runInContext(
    `JSON.stringify(randomstep([[100,100],[110,100]], [[0,0.25],[-0.25,0]], 1))`,
    context,
  ),
)
assert.equal(
  approx(randomNorm[0][0], 101),
  true,
  `replicata: call randomstep([[100,100],[110,100]], [[0,0.25],[-0.25,0]], 1)
expectata: renormalizing the weighted sum makes a nonzero random direction move at constant speed regardless of its raw magnitude
resultata: swimmer 0's new x-coordinate is ${randomNorm[0][0]}`,
)
assert.equal(
  approx(randomNorm[1][0], 111),
  true,
  `replicata: call randomstep([[100,100],[110,100]], [[0,0.25],[-0.25,0]], 1)
expectata: renormalizing the weighted sum makes swimmer 1 move one pixel even when the raw weight magnitude is 0.25
resultata: swimmer 1's new x-coordinate is ${randomNorm[1][0]}`,
)
const unsignedWeights = JSON.parse(
  vm.runInContext(
    `(() => {
      const oldrandreal = randreal
      signedRandom = false
      randreal = (a, b) => (a + b) / 2
      const weights = genRandomWeights(2)
      randreal = oldrandreal
      return JSON.stringify(weights)
    })()`,
    context,
  ),
)
assert.deepEqual(
  unsignedWeights,
  [[0, 0.5], [0.5, 0]],
  `replicata: set signedRandom=false and call genRandomWeights(2) with the qual stub randreal(a,b)=(a+b)/2
expectata: U[0,1] mode samples nonnegative off-diagonal weights, so the midpoint sample is 0.5
resultata: genRandomWeights(2) returned ${JSON.stringify(unsignedWeights)}`,
)
vm.runInContext('signedRandom = true', context)
const randomEdge = JSON.parse(
  vm.runInContext(
    `JSON.stringify({
      touch: randomstep([[width-headr-0.25,100],[width+100,100]], [[0,1],[0,0]], 1),
      stop: randomstep([[width-headr,100],[width+100,100]], [[0,1],[0,0]], 1),
    })`,
    context,
  ),
)
assert.equal(
  approx(randomEdge.touch[0][0], 794),
  true,
  `replicata: call randomstep([[width-headr-0.25,100],[width+100,100]], [[0,1],[0,0]], 1) on the default 800px-wide screen
expectata: a swimmer that would step past the right edge lands on the edge at x=794 instead
resultata: swimmer 0 landed at x=${randomEdge.touch[0][0]}`,
)
assert.equal(
  approx(randomEdge.stop[0][0], 794),
  true,
  `replicata: call randomstep([[width-headr,100],[width+100,100]], [[0,1],[0,0]], 1) on the default 800px-wide screen
expectata: a swimmer already touching the right edge stays put there
resultata: swimmer 0 landed at x=${randomEdge.stop[0][0]}`,
)

const randomDrawContext = loadApp('?ns=2&self=0&pursue=0&pursuers=0&random=1')
const randomDrawState = JSON.parse(
  vm.runInContext(
    `(() => {
      const seq = [0, 1, -1, 0]
      randreal = () => {
        const next = seq.shift()
        if (next === undefined) throw new Error('Expected another random weight')
        return next
      }
      setup()
      simsubsteps = 1
      swm = [[100,100],[110,100]]
      const before = JSON.stringify(randomWeights)
      draw()
      draw()
      return JSON.stringify({ before, after: JSON.stringify(randomWeights), randomWeights, swm, coalesced, n: n.toString() })
    })()`,
    randomDrawContext,
  ),
)
assert.deepEqual(
  randomDrawState.randomWeights,
  [[0, 1], [-1, 0]],
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0&random=1, make randreal() yield [0,1,-1,0], and call setup()
expectata: random mode stores one fixed random weight for each ordered swimmer pair
resultata: randomWeights is ${JSON.stringify(randomDrawState.randomWeights)}`,
)
assert.equal(
  randomDrawState.after,
  randomDrawState.before,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0&random=1, make randreal() yield [0,1,-1,0], call setup(), and then call draw() twice
expectata: the sampled random weights stay fixed for the whole scene
resultata: the weights changed from ${randomDrawState.before} to ${randomDrawState.after}`,
)
assert.deepEqual(
  randomDrawState.swm,
  [[101, 100], [111, 100]],
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0&random=1, force randomWeights to [[0,1],[-1,0]], set swm=[[100,100],[110,100]], and call draw() twice with simsubsteps=1
expectata: the random-mode draw path advances at constant speed using the normalized weighted unit-vector field, so the swimmers land at [[101,100],[111,100]]
resultata: swm is ${JSON.stringify(randomDrawState.swm)}`,
)
assert.equal(
  randomDrawState.coalesced,
  false,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0&random=1, force randomWeights to [[0,1],[-1,0]], and call draw() once
expectata: random mode bypasses the crush-map pause/coalescence state machine
resultata: coalesced is ${randomDrawState.coalesced} and n is ${randomDrawState.n}`,
)
const randomResetContext = loadApp('?ns=2&self=0&pursue=0&pursuers=0&random=1')
const randomResetState = JSON.parse(
  vm.runInContext(
    `(() => {
      const seq = [0, 0, 0, 0, 0, 1, -1, 0]
      randreal = () => {
        const next = seq.shift()
        if (next === undefined) throw new Error('Expected another random weight')
        return next
      }
      setup()
      let cleared = 0
      trail.clear = () => { cleared += 1 }
      trail.background = () => { cleared += 1 }
      const first = JSON.stringify(randomWeights)
      draw()
      return JSON.stringify({ first, second: JSON.stringify(randomWeights), swm, baseswm, cleared, scenes: scenes.toString() })
    })()`,
    randomResetContext,
  ),
)
assert.equal(
  randomResetState.first === randomResetState.second,
  false,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0&random=1, make the first random scene use all-zero weights, and call draw() once
expectata: a quiescent random scene immediately reloads with a fresh set of random weights
resultata: the weights stayed at ${randomResetState.first}`,
)
assert.deepEqual(
  randomResetState.swm,
  randomResetState.baseswm,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0&random=1, make the first random scene use all-zero weights, and call draw() once
expectata: after reloading a quiescent random scene, the swimmers restart from the base positions
resultata: swm was ${JSON.stringify(randomResetState.swm)} instead of ${JSON.stringify(randomResetState.baseswm)}`,
)
assert.equal(
  randomResetState.cleared,
  0,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0&random=1, make the first random scene use all-zero weights, stub trail.clear/background after setup(), and call draw() once
expectata: rolling to the next random scene preserves the existing trail instead of clearing the screen
resultata: trail.clear/background ran ${randomResetState.cleared} times`,
)
assert.equal(
  randomResetState.scenes,
  '1',
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0&random=1, make the first random scene use all-zero weights, and call draw() once
expectata: rolling to the next random scene increments the running scene counter to 1 completed scene
resultata: scenes became ${randomResetState.scenes}`,
)
const randomCoalesceContext = loadApp('?ns=2&self=0&pursue=0&pursuers=0&random=1')
const randomCoalesceState = JSON.parse(
  vm.runInContext(
    `(() => {
      const seq = [0, 1, -1, 0, 0, 0.25, 0.75, 0]
      randreal = () => {
        const next = seq.shift()
        if (next === undefined) throw new Error('Expected another random weight')
        return next
      }
      setup()
      simsubsteps = 1
      swm = [[100,100],[102,100]]
      const before = JSON.stringify(randomWeights)
      draw()
      return JSON.stringify({ before, after: JSON.stringify(randomWeights), swm, baseswm })
    })()`,
    randomCoalesceContext,
  ),
)
assert.equal(
  randomCoalesceState.before === randomCoalesceState.after,
  false,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0&random=1, place the swimmers at [[100,100],[102,100]], and call draw()
expectata: once all swimmers are inside one coalesced display group, random mode ends the scene and samples fresh weights
resultata: the weights stayed at ${randomCoalesceState.before}`,
)
assert.deepEqual(
  randomCoalesceState.swm,
  randomCoalesceState.baseswm,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0&random=1, place the swimmers at [[100,100],[102,100]], and call draw()
expectata: once all swimmers coalesce, random mode restarts from the base positions
resultata: swm was ${JSON.stringify(randomCoalesceState.swm)} instead of ${JSON.stringify(randomCoalesceState.baseswm)}`,
)

const target0 = JSON.parse(
  vm.runInContext(
    `pursuitBias = 0; JSON.stringify(targetpoint([[0,0],[2,0],[10,0]], [1,2], 0))`,
    context,
  ),
)
assert.equal(
  approx(target0[0], 6),
  true,
  `replicata: set pursuitBias to 0 and call targetpoint([[0,0],[2,0],[10,0]], [1,2], 0)
expectata: zero bias gives the centroid, so the x-coordinate is 6
resultata: the x-coordinate is ${target0[0]}`,
)
const centroidCounterexample = JSON.parse(
  vm.runInContext(
    `pursuitBias = 0; JSON.stringify({
      withself: syncstep([[0,0],[0.2,0],[1,0]], [[0,1,2],[0],[0]], 0.5),
      withoutself: syncstep([[0,0],[0.2,0],[1,0]], [[1,2],[0],[0]], 0.5),
    })`,
    context,
  ),
)
assert.equal(
  approx(centroidCounterexample.withself[0][0], centroidCounterexample.withoutself[0][0]),
  false,
  `replicata: set pursuitBias to 0 and compare syncstep([[0,0],[0.2,0],[1,0]], [[0,1,2],[0],[0]], 0.5) to syncstep([[0,0],[0.2,0],[1,0]], [[1,2],[0],[0]], 0.5)
expectata: including self in a nonsingleton crush set is not an exact simulator-level equivalence, because pairstep can freeze one target while advancing toward the other
resultata: swimmer 0 ended at x=${centroidCounterexample.withself[0][0]} with self included and x=${centroidCounterexample.withoutself[0][0]} without self`,
)
const targetNear = JSON.parse(
  vm.runInContext(
    `pursuitBias = -6; JSON.stringify(targetpoint([[0,0],[2,0],[10,0]], [1,2], 0))`,
    context,
  ),
)
assert.equal(
  targetNear[0] < 4,
  true,
  `replicata: set pursuitBias to -6 and call targetpoint([[0,0],[2,0],[10,0]], [1,2], 0)
expectata: negative bias favors the nearer crush, pushing the x-coordinate well left of the centroid
resultata: the x-coordinate is ${targetNear[0]}`,
)
const targetFar = JSON.parse(
  vm.runInContext(
    `pursuitBias = 6; JSON.stringify(targetpoint([[0,0],[2,0],[10,0]], [1,2], 0))`,
    context,
  ),
)
assert.equal(
  targetFar[0] > 8,
  true,
  `replicata: set pursuitBias to 6 and call targetpoint([[0,0],[2,0],[10,0]], [1,2], 0)
expectata: positive bias favors the farther crush, pushing the x-coordinate well right of the centroid
resultata: the x-coordinate is ${targetFar[0]}`,
)
const targetNearest = JSON.parse(
  vm.runInContext(
    `pursuitBias = -Infinity; JSON.stringify(targetpoint([[0,0],[2,0],[10,0]], [1,2], 0))`,
    context,
  ),
)
assert.equal(
  approx(targetNearest[0], 2),
  true,
  `replicata: set pursuitBias to -Infinity and call targetpoint([[0,0],[2,0],[10,0]], [1,2], 0)
expectata: negative infinite bias pursues the exact nearest crush, so the x-coordinate is 2
resultata: the x-coordinate is ${targetNearest[0]}`,
)
const targetFarthest = JSON.parse(
  vm.runInContext(
    `pursuitBias = Infinity; JSON.stringify(targetpoint([[0,0],[2,0],[10,0]], [1,2], 0))`,
    context,
  ),
)
assert.equal(
  approx(targetFarthest[0], 10),
  true,
  `replicata: set pursuitBias to Infinity and call targetpoint([[0,0],[2,0],[10,0]], [1,2], 0)
expectata: positive infinite bias pursues the exact farthest crush, so the x-coordinate is 10
resultata: the x-coordinate is ${targetFarthest[0]}`,
)
const targetTie = JSON.parse(
  vm.runInContext(
    `pursuitBias = -Infinity; JSON.stringify(targetpoint([[0,0],[-2,0],[2,0]], [1,2], 0))`,
    context,
  ),
)
assert.equal(
  approx(targetTie[0], 0),
  true,
  `replicata: set pursuitBias to -Infinity and call targetpoint([[0,0],[-2,0],[2,0]], [1,2], 0)
expectata: tied nearest crushes follow the exact beta->-Infinity limit, so the target is their centroid at x=0
resultata: the x-coordinate is ${targetTie[0]}`,
)
assert.throws(
  () => vm.runInContext('syncstep([[0,0],[10,0]], [[],[0]], 1)', context),
  /nonempty crush set/,
  `replicata: call syncstep([[0,0],[10,0]], [[],[0]], 1)
expectata: an empty crush set crashes immediately because its centroid is undefined
resultata: syncstep accepted an empty crush set`,
)

const trailState = JSON.parse(
  vm.runInContext(
    `(() => {
      const oldns = ns
      const oldswm = swm
      const oldcrushes = crushes
      const olddi = di
      const dots = []
      ns = 3
      swm = [[15, 17]]
      crushes = [[0]]
      di = [1]
      traildots({
        fill() {},
        ellipse(x, y) { dots.push([Number(x.toFixed(6)), Number(y.toFixed(6))]) },
      })
      ns = oldns
      swm = oldswm
      crushes = oldcrushes
      di = olddi
      return JSON.stringify({ dots })
    })()`,
    context,
  ),
)
assert.equal(
  trailState.dots.length,
  1,
  `replicata: set ns=3 with one generic swimmer point and call traildots() with a fake graphics context
expectata: traildots stamps only the actual swimmer trail point
resultata: it stamped ${trailState.dots.length} points: ${JSON.stringify(trailState.dots)}`,
)
const nextMapState = JSON.parse(
  vm.runInContext(
    `(() => {
      const oldns = ns
      const oldself = selfPursuit
      const oldpursue = pursueMany
      const oldpursuers = manyPursuers
      setup()
      setmode(3, false, false, true)
      const first = JSON.stringify(crushes)
      while (!coalesced) draw()
      pauseframes = 0
      draw()
      const out = JSON.stringify({
        first,
        second: JSON.stringify(crushes),
        n: n.toString(),
        scenes: scenes.toString(),
        coalesced,
        swm,
        baseswm,
      })
      setmode(oldns, oldself, oldpursue, oldpursuers)
      return out
    })()`,
    context,
  ),
)
assert.equal(
  nextMapState.n,
  '1',
  `replicata: load the app with ?ns=3&self=0&pursue=0&pursuers=0, let the first crushmap coalesce, set pauseframes to 0, and call draw()
expectata: the app advances directly to the next crushmap
resultata: n became ${nextMapState.n}`,
)
assert.equal(
  nextMapState.coalesced,
  false,
  `replicata: load the app with ?ns=3&self=0&pursue=0&pursuers=0, let the first crushmap coalesce, set pauseframes to 0, and call draw()
expectata: the app leaves the coalesced state after loading the next crushmap
resultata: coalesced was ${nextMapState.coalesced}`,
)
assert.equal(
  nextMapState.first === nextMapState.second,
  false,
  `replicata: load the app with ?ns=3&self=0&pursue=0&pursuers=0, let the first crushmap coalesce, set pauseframes to 0, and call draw()
expectata: a different crushmap is loaded after the pause
resultata: the app kept the same crushmap ${nextMapState.first}`,
)
assert.deepEqual(
  nextMapState.swm,
  nextMapState.baseswm,
  `replicata: load the app with ?ns=3&self=0&pursue=0&pursuers=0, let the first crushmap coalesce, set pauseframes to 0, and call draw()
expectata: the new crushmap starts from the base swimmer positions
resultata: swm was ${JSON.stringify(nextMapState.swm)} instead of ${JSON.stringify(nextMapState.baseswm)}`,
)
assert.equal(
  nextMapState.scenes,
  '1',
  `replicata: load the app with ?ns=3&self=0&pursue=0&pursuers=0, let the first crushmap coalesce, set pauseframes to 0, and call draw()
expectata: advancing to the second crushmap increments the running scene counter to 1 completed scene
resultata: scenes became ${nextMapState.scenes}`,
)
const visualCoalesceState = JSON.parse(
  vm.runInContext(
    `(() => {
      setup()
      simsubsteps = 1
      swm = [[100,100],[102,100]]
      crushes = [[1],[0]]
      di = [2,2]
      draw()
      return JSON.stringify({ coalesced, pauseframes })
    })()`,
    context,
  ),
)
assert.equal(
  visualCoalesceState.coalesced,
  true,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0, place the swimmers at [[100,100],[102,100]], and call draw()
expectata: once all swimmers are inside one coalesced display group, the crush-map scene enters the coalesced pause state
resultata: coalesced was ${visualCoalesceState.coalesced} with pauseframes=${visualCoalesceState.pauseframes}`,
)

const tiePath = JSON.parse(
  vm.runInContext(
    `(() => {
      pursuitBias = Infinity
      let pts = genswimmers(3)
      const crushmap = [[1,2],[1],[2]]
      let steps = -1
      for (let t = 0; t < 2000; t++) {
        pts = syncstep(pts, crushmap, simstep)
        const tg = targetpoints(pts, crushmap)
        if (pts.every((p, j) => pdist(p, tg[j]) < simstep)) {
          steps = t
          break
        }
      }
      return JSON.stringify({
        steps,
        target: targetpoint(pts, [1,2], 0).map(x => Number(x.toFixed(6))),
        swimmer: pts[0].map(x => Number(x.toFixed(6))),
      })
    })()`,
    context,
  ),
)
assert.equal(
  tiePath.steps >= 0,
  true,
  `replicata: set pursuitBias to Infinity and iterate syncstep() on the 3-swimmer crush map [[1,2],[1],[2]]
expectata: the tied farthest crushes stay tied, so swimmer 0 converges to the midpoint and the map quiesces in finite time
resultata: it ${tiePath.steps >= 0 ? 'did' : 'did not'} quiesce; final swimmer/target were ${JSON.stringify([tiePath.swimmer, tiePath.target])}`,
)
assert.equal(
  Math.hypot(tiePath.swimmer[0] - tiePath.target[0], tiePath.swimmer[1] - tiePath.target[1]) < 0.5,
  true,
  `replicata: set pursuitBias to Infinity and iterate syncstep() on the 3-swimmer crush map [[1,2],[1],[2]] until it quiesces
expectata: swimmer 0 ends within one simstep of the tied-extremum midpoint target
resultata: the final swimmer and target were ${JSON.stringify([tiePath.swimmer, tiePath.target])}`,
)

vm.runInContext('pursuitBias = 0', context)
vm.runInContext('setup()', context)
assert.equal(
  vm.runInContext('typeof biasSlider.onchange', context),
  'function',
  `replicata: call setup() and inspect biasSlider.onchange
expectata: the bias slider installs a release handler so the center detent can snap on mouse-up
resultata: typeof biasSlider.onchange is ${vm.runInContext('typeof biasSlider.onchange', context)}`,
)
assert.equal(
  vm.runInContext('typeof biasSlider.oninput', context),
  'function',
  `replicata: call setup() and inspect biasSlider.oninput
expectata: the bias slider installs a drag handler so bias preview updates while dragging
resultata: typeof biasSlider.oninput is ${vm.runInContext('typeof biasSlider.oninput', context)}`,
)
vm.runInContext('setbias(biasmin)', context)
assert.equal(
  vm.runInContext('pursuitBias', context),
  -Infinity,
  `replicata: call setup() and then call setbias(biasmin)
expectata: the left slider endpoint stores negative infinite bias
resultata: pursuitBias is ${vm.runInContext('pursuitBias', context)}`,
)
assert.equal(
  vm.runInContext('biasSlider.value()', context),
  -6,
  `replicata: call setup() and then call setbias(biasmin)
expectata: the slider thumb stays at the left endpoint while internal bias is infinite
resultata: the slider value is ${vm.runInContext('biasSlider.value()', context)}`,
)
vm.runInContext('setbias(biasmax)', context)
assert.equal(
  vm.runInContext('pursuitBias', context),
  Infinity,
  `replicata: call setup() and then call setbias(biasmax)
expectata: the right slider endpoint stores positive infinite bias
resultata: pursuitBias is ${vm.runInContext('pursuitBias', context)}`,
)
assert.equal(
  vm.runInContext('biasSlider.value()', context),
  6,
  `replicata: call setup() and then call setbias(biasmax)
expectata: the slider thumb stays at the right endpoint while internal bias is infinite
resultata: the slider value is ${vm.runInContext('biasSlider.value()', context)}`,
)
vm.runInContext('setbias(0)', context)
vm.runInContext('biasSlider.value(0.2); biasSlider.oninput()', context)
assert.equal(
  vm.runInContext('pursuitBias', context),
  0.2,
  `replicata: call setup(), move the bias slider to 0.2, and trigger its drag handler
expectata: dragging previews the raw bias before the center detent commits
resultata: pursuitBias is ${vm.runInContext('pursuitBias', context)}`,
)
assert.equal(
  vm.runInContext('biasSlider.value()', context),
  0.2,
  `replicata: call setup(), move the bias slider to 0.2, and trigger its drag handler
expectata: dragging leaves the slider thumb at the dragged position before release
resultata: the slider value is ${vm.runInContext('biasSlider.value()', context)}`,
)
vm.runInContext('biasSlider.onchange()', context)
assert.equal(
  vm.runInContext('pursuitBias', context),
  0,
  `replicata: call setup(), move the bias slider to 0.2, and trigger its release handler
expectata: the slider detent snaps small released bias values to 0
resultata: pursuitBias is ${vm.runInContext('pursuitBias', context)}`,
)
assert.equal(
  vm.runInContext('biasSlider.value()', context),
  0,
  `replicata: call setup(), move the bias slider to 0.2, and trigger its release handler
expectata: the slider thumb snaps back to the center detent at 0 on release
resultata: the slider value is ${vm.runInContext('biasSlider.value()', context)}`,
)
vm.runInContext('biasSlider.value(0.4); biasSlider.onchange()', context)
assert.equal(
  vm.runInContext('pursuitBias', context),
  0.4,
  `replicata: call setup(), move the bias slider to 0.4, and trigger its release handler
expectata: released values outside the detent keep their bias
resultata: pursuitBias is ${vm.runInContext('pursuitBias', context)}`,
)
assert.equal(
  vm.runInContext('biasSlider.value()', context),
  0.4,
  `replicata: call setup(), move the bias slider to 0.4, and trigger its release handler
expectata: the slider thumb stays off center outside the detent
resultata: the slider value is ${vm.runInContext('biasSlider.value()', context)}`,
)
vm.runInContext('setbias(0)', context)
let s = state(context)
assert.equal(
  approx(s.swm[0][0], 788),
  true,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0 and call setup()
expectata: swimmer 0 starts inset from the right edge at x=788
resultata: swimmer 0's x-coordinate is ${s.swm[0][0]}`,
)
assert.equal(
  approx(s.swm[1][0], 212),
  true,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0 and call setup()
expectata: swimmer 1 starts inset from the left edge at x=212
resultata: swimmer 1's x-coordinate is ${s.swm[1][0]}`,
)

vm.runInContext('draw()', context)
s = state(context)
assert.equal(
  s.pursuitBias,
  0,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0 and inspect pursuitBias
expectata: the default pursuit bias is 0 so the centroid rule is active
resultata: pursuitBias is ${s.pursuitBias}`,
)
assert.equal(
  s.simstep,
  0.5,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0 and inspect simstep
expectata: each simulation substep is 0.5 pixels
resultata: simstep is ${s.simstep}`,
)
assert.equal(
  s.simsubsteps,
  12,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0 and inspect simsubsteps
expectata: each rendered frame performs 12 simulation substeps
resultata: simsubsteps is ${s.simsubsteps}`,
)
vm.runInContext('setup()', slowContext)
const slowState = state(slowContext)
assert.equal(
  slowState.simsubsteps,
  2,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0&speed=1000 and inspect simsubsteps
expectata: snail speed performs 2 simulation substeps per rendered frame
resultata: simsubsteps is ${slowState.simsubsteps}`,
)
const rocketDraws = drawsToCoalesce(loadApp('?ns=2&self=0&pursue=0&pursuers=0&speed=100'))
const snailDraws = drawsToCoalesce(loadApp('?ns=2&self=0&pursue=0&pursuers=0&speed=1000'))
assert.equal(
  snailDraws > rocketDraws,
  true,
  `replicata: compare how many draw() calls it takes the first 2-swimmer crushmap to coalesce at speed=1000 versus speed=100
expectata: the snail URL param makes the same run take more rendered frames than the rocket URL param
resultata: speed=1000 took ${snailDraws} draw calls and speed=100 took ${rocketDraws}`,
)
const pausedContext = loadApp('?ns=2&self=0&pursue=0&pursuers=0&speed=1000&paused=1')
vm.runInContext('setup()', pausedContext)
const stepBefore = JSON.parse(vm.runInContext('JSON.stringify(swm)', pausedContext))
vm.runInContext('draw()', pausedContext)
const stepAfter = JSON.parse(vm.runInContext('JSON.stringify(swm)', pausedContext))
assert.deepEqual(
  stepAfter,
  stepBefore,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0&speed=1000&paused=1, call setup(), then call draw() once
expectata: paused startup state does not advance until a step gesture
resultata: swm changed from ${JSON.stringify(stepBefore)} to ${JSON.stringify(stepAfter)}`,
)
vm.runInContext('setSpeed("step")', pausedContext)
vm.runInContext('draw()', pausedContext)
const steppedState = state(pausedContext)
assert.equal(
  approx(steppedState.swm[0][0], 787),
  true,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0&speed=1000&paused=1, call setup(), click the step control once, then call draw()
expectata: the paused URL preserves the snail run speed, so one manual step advances swimmer 0 by 1 pixel
resultata: swimmer 0's x-coordinate is ${steppedState.swm[0][0]}`,
)
assert.equal(
  approx(steppedState.swm[1][0], 213),
  true,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0&speed=1000&paused=1, call setup(), click the step control once, then call draw()
expectata: the paused URL preserves the snail run speed, so one manual step advances swimmer 1 by 1 pixel
resultata: swimmer 1's x-coordinate is ${steppedState.swm[1][0]}`,
)
assert.equal(
  approx(s.swm[0][0], 782),
  true,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0, call setup(), then call draw() once
expectata: swimmer 0 advances 6 pixels in one rendered frame
resultata: swimmer 0's x-coordinate is ${s.swm[0][0]}`,
)
assert.equal(
  approx(s.swm[1][0], 218),
  true,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0, call setup(), then call draw() once
expectata: swimmer 1 advances 6 pixels in one rendered frame
resultata: swimmer 1's x-coordinate is ${s.swm[1][0]}`,
)
