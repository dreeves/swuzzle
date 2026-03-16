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
    createButton() {
      return {
        position() {},
        style() {},
        mousePressed() {},
        attribute() {},
        removeAttribute() {},
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
    graphOps: 0,
    blits: 0,
    createGraphics() {
      return {
        clear() { context.graphOps += 1 },
        colorMode() {},
        noStroke() {},
        fill() {},
        rect() { context.graphOps += 1 },
        stroke() {},
        strokeWeight() {},
        line() { context.graphOps += 1 },
        ellipse() { context.graphOps += 1 },
        textAlign() {},
        textSize() {},
        text() { context.graphOps += 1 },
      }
    },
    image() { context.blits += 1 },
  }
  context.HTMLCanvasElement.prototype = { getContext() { return {} } }
  vm.createContext(context)
  vm.runInContext(utilsrc, context, { filename: 'utils.js' })
  vm.runInContext(clientsrc, context, { filename: 'client.js' })
  return context
}

const context = loadApp('?ns=3&all=0')
vm.runInContext('setup()', context)
const ops = context.graphOps

assert.equal(
  ops > 0,
  true,
  `replicata: load the app with ?ns=3&all=0 and call setup()
expectata: the mini graph is rendered into its cache during setup
resultata: the cached mini graph used ${ops} drawing operations`,
)

vm.runInContext('draw()', context)
assert.equal(
  context.graphOps,
  ops,
  `replicata: load the app with ?ns=3&all=0, call setup(), then call draw() once
expectata: the mini graph cache is reused without rerendering the arrows and nodes
resultata: the cached mini graph drawing operations changed from ${ops} to ${context.graphOps}`,
)
assert.equal(
  context.blits,
  1,
  `replicata: load the app with ?ns=3&all=0, call setup(), then call draw() once
expectata: the cached mini graph is blitted once onto the main canvas
resultata: the cached mini graph was blitted ${context.blits} times`,
)
