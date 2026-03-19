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
    graphNodes: [],
    blits: 0,
    made: 0,
    createGraphics() {
      context.made += 1
      if (context.made === 1) {
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
      }
      if (context.made === 2) {
        return {
          canvas: { style: {} },
          clear() { context.graphOps += 1 },
          colorMode() {},
          background() {},
          noStroke() {},
          noFill() {},
          fill() {},
          rect() { context.graphOps += 1 },
          stroke() {},
          strokeWeight() {},
          line() { context.graphOps += 1 },
          ellipse(x, y) {
            context.graphOps += 1
            context.graphNodes.push([x, y])
          },
          image() {},
          textAlign() {},
          textSize() {},
          text() { context.graphOps += 1 },
          textWidth() { return 0 },
        }
      }
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
        image() { context.blits += 1 },
        textAlign() {},
        textSize() {},
        text() {},
        textWidth() { return 0 },
      }
    },
  }
  context.HTMLCanvasElement.prototype = { getContext() { return {} } }
  vm.createContext(context)
  vm.runInContext(utilsrc, context, { filename: 'utils.js' })
  vm.runInContext(clientsrc, context, { filename: 'client.js' })
  return context
}

const context = loadApp('?ns=3&self=0&pursue=0&pursuers=0')
vm.runInContext('setup()', context)
const ops = context.graphOps
const blits = context.blits

assert.equal(
  ops > 0,
  true,
  `replicata: load the app with ?ns=3&self=0&pursue=0&pursuers=0 and call setup()
expectata: the mini graph is rendered into its cache during setup
resultata: the cached mini graph used ${ops} drawing operations`,
)

vm.runInContext('draw()', context)
assert.equal(
  context.graphOps,
  ops,
  `replicata: load the app with ?ns=3&self=0&pursue=0&pursuers=0, call setup(), then call draw() once
expectata: the mini graph cache is reused without rerendering the arrows and nodes
resultata: the cached mini graph drawing operations changed from ${ops} to ${context.graphOps}`,
)
assert.equal(
  context.blits - blits,
  1,
  `replicata: load the app with ?ns=3&self=0&pursue=0&pursuers=0, call setup(), then call draw() once
expectata: the cached mini graph is blitted once onto the overlay during draw()
resultata: the cached mini graph was blitted ${context.blits - blits} times during draw()`,
)

context.graphNodes = []
vm.runInContext('cacheMiniGraph()', context)
const moved = JSON.parse(
  vm.runInContext(
    'JSON.stringify({ nodes: graphNodes, want: minipos })',
    context,
  ),
)

assert.deepEqual(
  moved.nodes,
  moved.want,
  `replicata: load the app with ?ns=3&self=0&pursue=0&pursuers=0 and call cacheMiniGraph()
expectata: the mini graph redraws its nodes at the base mini-swimmer positions
resultata: the cached node positions were ${JSON.stringify(moved.nodes)} instead of ${JSON.stringify(moved.want)}`,
)
