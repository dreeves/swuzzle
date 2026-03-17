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

function approx(a, b) { return Math.abs(a - b) < 1e-9 }

const context = loadApp('?ns=2&self=0&pursue=0&pursuers=0')

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
assert.throws(
  () => vm.runInContext('syncstep([[0,0],[10,0]], [[],[0]], 1)', context),
  /nonempty crush set/,
  `replicata: call syncstep([[0,0],[10,0]], [[],[0]], 1)
expectata: an empty crush set crashes immediately because its centroid is undefined
resultata: syncstep accepted an empty crush set`,
)

vm.runInContext('pursuitBias = 0', context)
vm.runInContext('setup()', context)
let s = state(context)
assert.equal(
  approx(s.swm[0][0], 788),
  true,
  `replicata: load the app with ?ns=2&all=0 and call setup()
expectata: swimmer 0 starts inset from the right edge at x=788
resultata: swimmer 0's x-coordinate is ${s.swm[0][0]}`,
)
assert.equal(
  approx(s.swm[1][0], 212),
  true,
  `replicata: load the app with ?ns=2&all=0 and call setup()
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
