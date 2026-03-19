const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const utilsrc = fs.readFileSync(path.join(__dirname, '..', 'utils.js'), 'utf8')
const clientsrc = fs.readFileSync(path.join(__dirname, '..', 'client.js'), 'utf8')

;(async () => {

function loadApp(search) {
  const tones = []
  const contexts = []
  const buttons = []
  class AudioContextStub {
    constructor() {
      this.currentTime = 1
      this.destination = {}
      this.resumeCalls = 0
      this.state = 'suspended'
      contexts.push(this)
    }
    resume() {
      this.resumeCalls += 1
      this.state = 'running'
    }
    createOscillator() {
      const tone = { set: [], ramp: [], type: null, stop: null, start: null }
      tones.push(tone)
      return {
        set type(v) { tone.type = v },
        get type() { return tone.type },
        frequency: {
          set value(v) { tone.freq = v },
          get value() { return tone.freq },
          setValueAtTime(v, t) { tone.set.push({ v, t }) },
          exponentialRampToValueAtTime(v, t) { tone.ramp.push({ v, t }) },
        },
        connect() {},
        start(t) { tone.start = t },
        stop(t) { tone.stop = t },
      }
    }
    createBufferSource() {
      return { buffer: null, connect() {}, start() {} }
    }
    createBuffer() { return {} }
    createGain() {
      return {
        gain: {
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
      }
    }
  }
  const context = {
    Math,
    Number,
    console: { log() {} },
    document: { body: { appendChild() {} } },
    window: {
      location: { search },
      history: {
        replaceState() {},
        pushState() { context.pushes += 1 },
      },
      AudioContext: AudioContextStub,
      webkitAudioContext: AudioContextStub,
      loop() { context.loopCalls += 1 },
    },
    location: { reload() { context.reloads += 1 } },
    HTMLCanvasElement: function HTMLCanvasElement() {},
    pushes: 0,
    reloads: 0,
    loopCalls: 0,
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
      const button = {
        position() {},
        style() {},
        mousePressed(fn) { this.onclick = fn },
        attribute() {},
        removeAttribute() {},
      }
      buttons.push(button)
      return button
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
  vm.runInContext('setup()', context)
  return { context, tones, contexts, buttons }
}

const { context, tones, contexts } = loadApp('?ns=3&self=0&pursue=0&pursuers=0')
vm.runInContext('playBloops = true', context)
vm.runInContext(
  'swm = [[0,0], [1,0], [10,0]]; crushes = [[1],[2],[0]]; hearts = []; pulses = []; hitseen = new Set(); updatehits()',
  context,
)
assert.equal(
  tones.length,
  0,
  `replicata: load the app, let a swimmer reach its crush before the first audio-unlock gesture, and inspect the scheduled tones
expectata: no tone is scheduled yet because audio is still locked
resultata: ${tones.length} bloops were scheduled before unlock`,
)
vm.runInContext('window.onpointerdown()', context)
assert.equal(
  contexts.length,
  1,
  `replicata: load the app and trigger the first audio-unlock gesture
expectata: exactly one audio context is created for that unlock
resultata: ${contexts.length} audio contexts were created`,
)
// After unlock, hits produce tones synchronously (and each bloop also calls resume)
vm.runInContext(
  'swm = [[0,0], [1,0], [10,0]]; crushes = [[1],[2],[0]]; hearts = []; pulses = []; hitseen = new Set(); updatehits()',
  context,
)
assert.equal(
  tones.length,
  1,
  `replicata: unlock audio, arrange one swimmer to reach its crush, then call updatehits()
expectata: one bloop is scheduled immediately
resultata: ${tones.length} bloops were scheduled`,
)

const one = tones[0].set[0].v
vm.runInContext(
  'swm = [[0,0], [0,0], [10,0]]; crushes = [[1],[0],[0]]; hearts = []; pulses = []; hitseen = new Set(); updatehits()',
  context,
)
assert.equal(
  tones.length,
  2,
  `replicata: unlock audio, arrange two swimmers to reach their crushes simultaneously, then call updatehits()
expectata: one additional bloop is scheduled for that hit frame
resultata: ${tones.length} bloops were scheduled total`,
)

const two = tones[1].set[0].v
assert.equal(
  two < one,
  true,
  `replicata: compare the bloop frequency for one simultaneous hit versus two simultaneous hits
expectata: the two-hit bloop starts at a lower pitch
resultata: the one-hit frequency was ${one} and the two-hit frequency was ${two}`,
)

const ctl = loadApp('?ns=3&self=0&pursue=0&pursuers=0')
vm.runInContext('playBloops = true', ctl.context)
vm.runInContext('window.onpointerdown()', ctl.context)
vm.runInContext('window.onpointerdown()', ctl.context)
assert.equal(
  ctl.contexts.length,
  1,
  `replicata: load the app and trigger two audio-unlock gestures in a row
expectata: the app reuses the same audio context instead of allocating a second one
resultata: ${ctl.contexts.length} audio contexts were created`,
)
vm.runInContext(
  'swm = [[0,0], [1,0], [10,0], [20,0]]; crushes = [[1],[2],[3],[0]]; hearts = []; pulses = []; hitseen = new Set(); updatehits()',
  ctl.context,
)
assert.equal(
  ctl.tones.length,
  1,
  `replicata: load the app, unlock audio once, then arrange one crush-hit
expectata: one bloop is scheduled after unlock
resultata: ${ctl.tones.length} bloops were scheduled`,
)
})().catch(err => {
  console.error(err)
  process.exit(1)
})
