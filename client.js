/* global [list all the symbols we use here so Glitch doesn't complain!]
stroke, fill, textSize, width, height, push, pop, text, keyCode, noStroke,
createCanvas, windowWidth, windowHeight, textWidth, noFill,
min, max, sin, cos, sqrt, TAU, dist,
range, blink, colorMode, HSB, clear, background,
line, rect, point, ellipse, drawingContext, pixelDensity, noLoop,
midpoint, shuffle, frameRate, randreal,
nextperm, nthperm,
*/

//new p5() // including this lets you use p5's globals everywhere (not needed now)

// Ensure canvas 2d contexts are optimized for frequent getImageData calls
const _origGetContext = HTMLCanvasElement.prototype.getContext
HTMLCanvasElement.prototype.getContext = function(type, attrs = {}) {
  if (type === '2d') attrs.willReadFrequently = true
  return _origGetContext.call(this, type, attrs)
}

// -----------------------------------------------------------------------------
// Constants, Parameters, and Global Variables
// -----------------------------------------------------------------------------

const nsmin = 2
const nsmax = 9
const rawns = getQueryParam('ns', `${nsmin}`)
const ns = Number(rawns)
const rawall = getQueryParam('all', '0')
if (!/^\d+$/.test(rawns) || ns < nsmin || ns > nsmax)
  throw new Error(`Expected ns query parameter to be an integer from ${nsmin} to ${nsmax}; got ${rawns}`)
if (rawall !== '0' && rawall !== '1')
  throw new Error(`Expected all query parameter to be 0 or 1; got ${rawall}`)
const allcrush = rawall === '1'
window.history.replaceState({}, null, swuzurl(ns, allcrush))

const pausems = 1500 // milliseconds to pause between derangements
const infoh = 26/2 // how many pixels high the info lines at the bottom are
// Derangements: permutations with no fixed points (every swimmer chases someone else)
// Crush map: each swimmer chooses a different swimmer to chase; multiple
// swimmers may share a crush.
const derangements = allDerangements(ns)
const ncrush = allcrush ? crushCount(ns) : derangements.length
const rainx = 5, rainy = 20, rainw = 422, rainh = 17 // rainbar position/size
let swm = [] // list of swimmers
let n = 0 // number of derangements drawn so far
let dline = '' // text line with the distance
let xyline = '' // x and y distances
let crushline = '' // text line with crush relationships
let ci = [] // indexes of crushes
let di = [] // initial distances from crushes
let si = [] // state of each swimmer (hot or cold)
let patches = [] // saved pixel patches under swimmer heads
let pauseframes = 0 // countdown for pause between derangements
const headr = 6 // radius of the swimmer head dot
const simstep = 1
const simsubsteps = 2
const coalescepx = 3

// -----------------------------------------------------------------------------
// Displaying things on the screen besides the actual swimmers
// -----------------------------------------------------------------------------

function instructions() {
  stroke('Black'); fill('White')
  textSize(15)
  const pixline = `(${width}x${height} pixels)`
  const countline = allcrush ?
    `${ns} swimmers, ${ncrush} crush maps` :
    `${ns} swimmers, ${ncrush} derangements`
  text('Amorous Swimmers', 5, 15)
  text(countline, 5, rainy + rainh + 15)
  text(pixline, rainx + rainw - textWidth(pixline), rainy + rainh + 15)
}

function swuzurl(n, all) { return `?ns=${n}&all=${all ? 1 : 0}` }

function rainbar() {
  stroke(0, 0, 0.3) // dim gray outline
  noFill()
  rect(rainx, rainy, rainw, rainh)
}

// Fill the rainbow bar proportionally to progress (0 to 1)
function rainfill(frac) {
  noStroke()
  const w = Math.round(rainw * frac)
  for (let i = 0; i <= w; i++) {
    fill(blink(i/rainw), 1, 1)
    rect(rainx+i, rainy, 1, rainh)
  }
}

function infoup() {
  crushline = `Crushes: ${ci.map((crush, swimmer) => `${swimmer}→${crush}`).join(', ')}`
  
  textSize(15)
  const crushw = textWidth(crushline)+3
  textSize(15); noStroke(); fill('Black')
  
  rect(0, height-infoh-3, crushw, infoh+2)
  stroke('Black'); fill('White')
  text(crushline, 3, height-3)
  textSize(15)
  //stroke('white') 
}

/* version from chaosgame:
function infoup() {
  textSize(30)
  const maxw = textWidth(maxline)+3
  const totw = textWidth(totline)+3
  textSize(15)
  const ppsw = textWidth(ppsline)+3
  textSize(30); noStroke(); fill('Black')
  
  rect(0, height-infoh*2-3, maxw, infoh+2)
  rect(0, height-infoh,     totw, infoh+2)
  rect(totw, height-infoh+11,  ppsw, infoh+2)
  maxline = `max  ${commafy(maxp)}`
  totline = `total: ${commafy(tot)}`
  ppsline = `   (+${commafy(round(pps))}pps)`
  stroke('Black'); fill('White')
  text(maxline, 3, height - infoh - 3*2)
  text(totline, 3, height-3)
  textSize(15); fill(1, 0, .3)
  text(ppsline, totw, height-3)
  textSize(30)
  stroke('Black')
  if (calg===0) { fill(1, 0, .3) } else { fill(tallyhue(calg-1, 8-1), 1, 1) }
  text(':', 60, height - infoh - 3*2)
}
*/

// -----------------------------------------------------------------------------
// The Math
// -----------------------------------------------------------------------------

// Coordinate transform so we can think of the origin as being at the center of 
// the canvas and the edges at -1 to +1 and convert to where the upper left 
// corner is (0,0) and the bottom right is (n-1,n-1)
function coort(x, y) {
  const n = min(width, height)
  const dx = max(0, width - height)
  const dy = max(0, height - width - (2*infoh+5))
  return [n/2 * (1+x) + dx,
          n/2 * (1-y) + dy]
}

// Convert from polar to cartesian, with r=1 and the given theta, using pixel 
// coordinates per coort()
function cart(theta) { return coort(cos(theta), sin(theta)) }

// Generate a list of points, usually spread out on a big circle
function genswimmers(n) {
  //return range(n).map(x => coort(randreal(-1,1), randreal(-1,1)))
  //return [coort(-1,-1), coort(-1,0), coort(-.5,1), coort(0,1)]
  let a = []
  //n -= hub
  if      (n===3)  a = [coort(-1,-1), coort(1,-1), coort(0, sqrt(3)-1)] 
  else if (n===4)  a = [coort(1,1), coort(-1,1), coort(-1,-1), coort(1,-1)]
  else if (n%2==0) a = range(n).map(i => cart(i*TAU/n))
  else             a = range(n).map(i => cart(i/n*TAU + (1/4-1/n)*TAU))
  //if (hub===1) a.push(coort(0,0))
  return a
}

// Current distance between the swimmers
//function sdist() {
//  return dist(swm[0][0], swm[0][1], swm[1][0], swm[1][1])
//}

function pdist(p1, p2) { return dist(p1[0], p1[1], p2[0], p2[1]) }

// Given point p1, return the point that's step pixels from p1 towards p2
function pairstep(p1, p2, step) {
  const d = pdist(p1, p2)
  return d < step ? p1 : midpoint(p1, p2, step / d)
}

// Generate mini swimmer positions for corner graph (HT Codebuff)
// Mirrors genswimmers layout: coort maps (x,y) -> (scale*(1+x), scale*(1-y))
function genMiniSwimmers(n, centerX, centerY, radius) {
  const mc = (x, y) => [centerX + radius*x, centerY - radius*y] // mini coort
  const mp = (theta) => mc(cos(theta), sin(theta))              // mini polar
  let a = []
  if      (n===3)  a = [mc(-1,-1), mc(1,-1), mc(0, sqrt(3)-1)]
  else if (n===4)  a = [mc(1,1), mc(-1,1), mc(-1,-1), mc(1,-1)]
  else if (n%2==0) a = range(n).map(i => mp(i*TAU/n))
  else             a = range(n).map(i => mp(i/n*TAU + (1/4-1/n)*TAU))
  return a
}

// Draw arrow from point a to point b
function drawArrow(a, b, arrowSize = 6) {
  stroke('White')
  strokeWeight(1.5)
  
  // Shorten the line so arrow doesn't overlap with nodes
  const angle = Math.atan2(b[1] - a[1], b[0] - a[0])
  const startX = a[0] + 8 * cos(angle)
  const startY = a[1] + 8 * sin(angle)
  const endX = b[0] - 8 * cos(angle)
  const endY = b[1] - 8 * sin(angle)
  
  line(startX, startY, endX, endY)
  
  // Draw arrowhead
  const x1 = endX - arrowSize * cos(angle - 0.5)
  const y1 = endY - arrowSize * sin(angle - 0.5)
  const x2 = endX - arrowSize * cos(angle + 0.5)
  const y2 = endY - arrowSize * sin(angle + 0.5)
  
  line(endX, endY, x1, y1)
  line(endX, endY, x2, y2)
  
  strokeWeight(1) // Reset stroke weight
}

// Pick the corner farthest from all swimmer starting positions,
// avoiding the title/rainbow bar area at the top left
function bestCorner(positions) {
  const gs = 140 // graph area size
  const top = rainy + rainh + gs/2 // below the rainbow bar
  const corners = [
    [width - gs/2,  top],           // top-right (below title)
    [gs/2,          height - gs/2], // bottom-left
    [width - gs/2,  height - gs/2], // bottom-right
  ]
  return argmin(corners, c =>
    -Math.min(...positions.map(p => pdist(p, c)))
  )
}

// Draw mini graph in corner
function drawMiniGraph() {
  const graphSize = 120
  const corner = bestCorner(genswimmers(ns))
  const centerX = corner[0]
  const centerY = corner[1]
  const radius = 40
  const gx = centerX - graphSize/2 - 10
  const gy = centerY - graphSize/2 - 10

  // Background
  noStroke()
  fill(0, 0, 0, 0.7)
  rect(gx, gy, graphSize + 20, graphSize + 20)
  
  const miniPos = genMiniSwimmers(ns, centerX, centerY, radius)
  
  // Draw arrows
  for (let i = 0; i < ns; i++) {
    if (i !== ci[i]) { // Don't draw self-arrows
      drawArrow(miniPos[i], miniPos[ci[i]], 4)
    }
  }
  
  // Draw nodes
  for (let i = 0; i < ns; i++) {
    noStroke()
    fill('White')
    ellipse(miniPos[i][0], miniPos[i][1], 12)
    fill('Black')
    textAlign(CENTER, CENTER)
    textSize(10)
    text(i, miniPos[i][0], miniPos[i][1])
  }
  
  // Reset text alignment
  textAlign(LEFT, BASELINE)
}

function traildots() {
  for (let i = 0; i < swm.length; i++) {
    fill(blink(1 - pdist(swm[i], swm[ci[i]]) / di[i]), 1,1)
    ellipse(swm[i][0], swm[i][1], 2)
  }
}

function styleButton(button) {
  button.style('background-color', '#333')
  button.style('color', 'white')
  button.style('padding', '10px')
  button.style('border', 'none')
  button.style('border-radius', '5px')
  button.style('font-size', '18px')
  button.style('cursor', 'pointer')
  button.style('box-shadow', '0 2px 4px rgba(0, 0, 0, 0.5)')
}

function setButtonState(button, enabled) {
  if (enabled) {
    button.style('background-color', '#333')
    button.style('color', 'white')
    button.removeAttribute('disabled')
  } else {
    button.style('background-color', '#666')
    button.style('color', '#222')
    button.attribute('disabled', '')
  }
}

function loadCrushMap() {
  ci = allcrush ? nthCrush(ns, n) : derangements[n]
  swm = genswimmers(ns)
  for (let i = 0; i < swm.length; i++) {
    di[i] = pdist(swm[i], swm[ci[i]])
  }
}

function syncstep(points, crushes, step) {
  return points.map((p, i) => pairstep(p, points[crushes[i]], step))
}

function advanceswimmers() {
  let allquiesced = false
  for (let i = 0; i < simsubsteps; i++) {
    swm = syncstep(swm, ci, simstep)
    traildots()
    allquiesced = swm.every((p, j) => pdist(p, swm[ci[j]]) <= simstep)
  }
  return allquiesced
}

// -----------------------------------------------------------------------------
// Special p5.js functions -----------------------------------------------------
// -----------------------------------------------------------------------------

function draw() {
  const ctx = drawingContext
  const pd = pixelDensity()

  // During pause, keep heads visible at coalesced positions
  if (pauseframes > 0) {
    pauseframes -= 1
    if (pauseframes > 0) return
    // Pause just ended — restore old heads, start next derangement
    for (let i = 0; i < patches.length; i++) {
      ctx.putImageData(patches[i].data, patches[i].x * pd, patches[i].y * pd)
    }
    patches = []
    n += 1
    if (n >= ncrush) {
      // Clear the mini graph area
      const corner = bestCorner(genswimmers(ns))
      noStroke(); fill(0, 0, 0)
      rect(corner[0] - 80, corner[1] - 80, 160, 160)
      noLoop()
      return
    }
    loadCrushMap()
    console.log(ci)
  } else {
    // Restore pixels under old heads (putImageData = direct pixel copy, no alpha)
    for (let i = 0; i < patches.length; i++) {
      ctx.putImageData(patches[i].data, patches[i].x * pd, patches[i].y * pd)
    }

    if (advanceswimmers()) {
      pauseframes = Math.round(pausems / 1000 * 60)
    }
  }

  //const d = sdist()
  //const step = .25
  //const s2 = [midpoint(swm[0], swm[1], step/d), [swm[1][0], swm[1][1] - step]]
  //line(swm[0][0], swm[0][1], s2[1][0], s2[1][1])
  //swm = s2
  // Draw trail dots
  // Group swimmers by proximity (within 2px = converged)
  // Treat swimmers closer than coalescepx as visually coalesced.
  const groups = []
  for (let i = 0; i < swm.length; i++) {
    const g = groups.find(g => g.some(j => pdist(swm[i], swm[j]) < coalescepx))
    if (g) g.push(i); else groups.push([i])
  }
  // Save all patches first (before any heads are drawn)
  // maxpad covers the largest possible circle (all ns swimmers converged)
  patches = []
  const maxr = headr * sqrt(ns)
  const maxpad = maxr + 2
  const maxs = maxpad * 2 * pd
  for (const g of groups) {
    const x = Math.round(swm[g[0]][0]) - maxpad
    const y = Math.round(swm[g[0]][1]) - maxpad
    patches.push({ data: ctx.getImageData(x * pd, y * pd, maxs, maxs), x, y })
  }
  // Then draw all heads (area proportional to group size)
  // Numbers arranged in a mini circle inside the head
  noStroke()
  textAlign(CENTER, CENTER)
  textSize(9)
  for (const g of groups) {
    const r = headr * sqrt(g.length)
    const cx = swm[g[0]][0], cy = swm[g[0]][1]
    fill(1, 0, 1) // bright white head
    ellipse(cx, cy, r * 2)
    fill(0, 0, 0) // black numbers
    const off = g.length === 1 ? 0 : r * 0.45
    for (let j = 0; j < g.length; j++) {
      const a = j / g.length * TAU + TAU/8 // TAU/8 makes pairs kitty-corner
      text(g[j], cx + off * cos(a), cy - off * sin(a))
    }
  }
  textAlign(LEFT, BASELINE)
  //swm.map(p => { ellipse(p[0], p[1], 1) })
  //infoup()
  //noStroke() // Restore no stroke for swimmers
  drawMiniGraph()
  rainfill(n / ncrush)
}

function setup() {
  createCanvas(windowWidth, windowHeight) // fill the window
  console.log(`Canvas created. Screen is ${width}x${height} pixels`)
  frameRate(60) // 60 fps is about the most it can do
  colorMode(HSB, 1)
  clear()
  background('Black')
  fill('BlueViolet')
  stroke('BlueViolet')

  //const y = -.95
  //swm = [coort(-.5, y), coort(.5, y)]
  //initd = dist(swm[0][0], swm[0][1], swm[1][0], swm[1][1])
  loadCrushMap()
  //ci = range(swm.length).map(x => (x+1)%swm.length) // tmp
  si = range(swm.length).map(x => 1)
  //swm.map(p => { ellipse(p[0], p[1], 8) })
  
  instructions()
  rainbar()  

  const crushBox = createCheckbox('all crush maps', allcrush)
  crushBox.position(2, 86)
  crushBox.style('color', 'white')
  crushBox.style('font-size', '14px')
  crushBox.style('user-select', 'none')
  crushBox.style('accent-color', '#333')
  crushBox.changed(() => rage(swuzurl(ns, crushBox.checked())))
  
  const backButton = createButton('◀️')
  backButton.position(318, 84)
  styleButton(backButton)
  setButtonState(backButton, ns > nsmin)
  backButton.mousePressed(() => rage(swuzurl(ns-1, allcrush)))

  const fwdButton = createButton('▶️')
  fwdButton.position(365, 84)
  styleButton(fwdButton)
  setButtonState(fwdButton, ns < nsmax)
  fwdButton.mousePressed(() => rage(swuzurl(ns+1, allcrush)))

  //stroke('white')
}

// -----------------------------------------------------------------------------
// Bad ideas go below
// -----------------------------------------------------------------------------
