/* global [list all the symbols we use here so Glitch doesn't complain!]
stroke, fill, textSize, width, height, push, pop, text, keyCode, noStroke,
createCanvas, windowWidth, windowHeight, textWidth, 
min, max, sin, cos, sqrt, TAU, dist, 
range, blink, colorMode, HSB, clear, background, 
line, rect, point, ellipse, 
midpoint, shuffle, frameRate, randreal, 
nextperm, nthperm, 
*/

//new p5() // including this lets you use p5's globals everywhere (not needed now)

// -----------------------------------------------------------------------------
// Constants, Parameters, and Global Variables
// -----------------------------------------------------------------------------

const ns = 5 // number of swimmers
const infoh = 26/2 // how many pixels high the info lines at the bottom are
let swm = [] // list of swimmers
let n = 0 // number of iterations (permutations) drawn so far
let dline = '' // text line with the distance
let xyline = '' // x and y distances
let ci = [] // indexes of crushes
let di = [] // initial distances from crushes
let si = [] // state of each swimmer (hot or cold)

// -----------------------------------------------------------------------------
// Displaying things on the screen besides the actual swimmers
// -----------------------------------------------------------------------------

function instructions() {
  stroke('Black'); fill('White')
  textSize(15)
  const thecopy = `Amorous Swimmers

${" ".repeat(35)}   (${width}x${height} pixels)`
  text(thecopy, 5, 15)
}

function rainbar() {
  noStroke()
  for (let i = 0; i <= 422; i++) {            // rainbow bar from x=5 to x=422+5
    fill(blink(i/422), 1, 1)
    rect(5+i, 20, 1, 17)
  }
}

function infoup() {
  textSize(30)
  const dw  = textWidth(dline)+3
  const xyw = textWidth(xyline)+3
  textSize(30); noStroke(); fill('Black')
  
  rect(0, height-infoh*2-3, dw,  infoh+2)
  rect(0, height-infoh,     xyw, infoh+2)
  rect(dw, height-infoh+11, dw, infoh+2)
  //dline = `d: ${sdist()}`
  xyline = `x,y = ${swm[1][0]-swm[0][0]}, ${swm[0][1]-swm[1][1]}`
  stroke('Black'); fill('White')
  //text(dline,  3, height - infoh - 3*2)
  //text(xyline, 3, height-3)
  textSize(15); fill(1, 0, .3)
  textSize(30)
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

// -----------------------------------------------------------------------------
// Special p5.js functions -----------------------------------------------------
// -----------------------------------------------------------------------------

function draw() {
  let allquiesced = true
  for (let i = 0; i < swm.length; i++) {
    swm[i] = pairstep(swm[i], swm[ci[i]], 1)
    const d = pdist(swm[i], swm[ci[i]])
    if (d > 1) allquiesced = false
  }
  if (allquiesced) {
    n += 1 
    //ci = range(swm.length)
    ci = nthperm(ns, n*1/*7*/-1)
    console.log(ci)
    swm = genswimmers(ns)
    for (let i = 0; i < swm.length; i++) {
      di[i] = pdist(swm[i], swm[ci[i]])
    }
  }
  
  //const d = sdist()
  //const step = .25
  //const s2 = [midpoint(swm[0], swm[1], step/d), [swm[1][0], swm[1][1] - step]]
  //line(swm[0][0], swm[0][1], s2[1][0], s2[1][1])
  //swm = s2
  for (let i = 0; i < swm.length; i++) {
    fill(blink(1 - pdist(swm[i], swm[ci[i]]) / di[i]), 1,1)
    ellipse(swm[i][0], swm[i][1], 2)
  }
  //swm.map(p => { ellipse(p[0], p[1], 1) })
  //infoup()
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
  swm = genswimmers(ns)
  ci = range(swm.length)
  //ci = range(swm.length).map(x => (x+1)%swm.length) // tmp
  si = range(swm.length).map(x => 1)
  for (let i = 0; i < swm.length; i++) {
    di[i] = pdist(swm[i], swm[ci[i]])
  }
  //swm.map(p => { ellipse(p[0], p[1], 8) })
  
  instructions()
  rainbar()
  //stroke('white')
}

// -----------------------------------------------------------------------------
// Bad ideas go below
// -----------------------------------------------------------------------------
