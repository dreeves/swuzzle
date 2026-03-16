const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const utilsrc = fs.readFileSync(path.join(__dirname, '..', 'utils.js'), 'utf8')
const clientsrc = fs.readFileSync(path.join(__dirname, '..', 'client.js'), 'utf8')
vm.runInThisContext(utilsrc, { filename: 'utils.js' })

function loadApp(search) {
  const context = {
    Math,
    Number,
    console: { log() {} },
    window: {
      location: { search },
      history: { replaceState() {} },
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
    createButton(label) {
      return {
        label,
        position() {},
        style() {},
        mousePressed(fn) { this.onclick = fn },
        attribute(name, value) { this[name] = value },
        removeAttribute(name) { delete this[name] },
      }
    },
    createGraphics() {
      return {
        clear() {},
        colorMode() {},
        noStroke() {},
        fill() {},
        rect() {},
        stroke() {},
        strokeWeight() {},
        line() {},
        ellipse() {},
        textAlign() {},
        textSize() {},
        text() {},
      }
    },
    checks: [],
    createCheckbox(label, checked) {
      const box = {
        label,
        checkedValue: checked,
        position() {},
        style() {},
        changed(fn) { this.onchange = fn },
        checked() { return this.checkedValue },
      }
      context.checks.push(box)
      return box
    },
  }
  context.HTMLCanvasElement.prototype = { getContext() { return {} } }
  vm.createContext(context)
  vm.runInContext(utilsrc, context, { filename: 'utils.js' })
  vm.runInContext(clientsrc, context, { filename: 'client.js' })
  vm.runInContext('setup()', context)
  return context
}

function state(context) {
  return JSON.parse(
    vm.runInContext('JSON.stringify({ allcrush, ci: ci.slice() })', context),
  )
}

const derContext = loadApp('?ns=3&all=0')
const derState = state(derContext)
assert.equal(
  derState.allcrush,
  false,
  `replicata: load the app with ?ns=3&all=0
expectata: derangement mode is active
resultata: allcrush is ${derState.allcrush}`,
)
assert.deepEqual(
  derState.ci,
  allDerangements(3)[0],
  `replicata: load the app with ?ns=3&all=0
expectata: the initial crush map is the first derangement
resultata: the initial crush map is [${derState.ci.join(',')}]`,
)
assert.equal(
  derContext.checks[0].checkedValue,
  false,
  `replicata: load the app with ?ns=3&all=0
expectata: the checkbox starts unchecked in derangement mode
resultata: the checkbox checked state is ${derContext.checks[0].checkedValue}`,
)

const allContext = loadApp('?ns=3&all=1')
const allState = state(allContext)
assert.equal(
  allState.allcrush,
  true,
  `replicata: load the app with ?ns=3&all=1
expectata: all-crush-map mode is active
resultata: allcrush is ${allState.allcrush}`,
)
assert.deepEqual(
  allState.ci,
  [1, 0, 0],
  `replicata: load the app with ?ns=3&all=1
expectata: the initial crush map can be [1,0,0], allowing 0 and 1 to chase each other while 2 chases 0
resultata: the initial crush map is [${allState.ci.join(',')}]`,
)
assert.equal(
  allContext.checks[0].checkedValue,
  true,
  `replicata: load the app with ?ns=3&all=1
expectata: the checkbox starts checked in all-crush-map mode
resultata: the checkbox checked state is ${allContext.checks[0].checkedValue}`,
)
