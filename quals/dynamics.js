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
