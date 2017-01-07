var CANVAS_HEIGHT = 800;
var CANVAS_WIDTH  = 900;
var MID_CANVAS = CANVAS_WIDTH /2;

var SPEED_UP = 1.0/3; //4x speed up
var SECOND = 1000 * SPEED_UP;
var UP_FLOOR_DURATION = 8 * SECOND;
var DOWN_FLOOR_DURATION = 10 * SECOND;
var OPEN_CLOSE_DURATION = 3 * SECOND;
var STAY_CLOSED_DURATION = 5 * SECOND;

var FLOOR_DISTANCE = 110;
var FLOOR1Y = 462;
var FLOORS_Y = [FLOOR1Y, FLOOR1Y-FLOOR_DISTANCE, FLOOR1Y-FLOOR_DISTANCE*2, FLOOR1Y-FLOOR_DISTANCE*3, FLOOR1Y-FLOOR_DISTANCE*4];

var panel1 = new Image();
var elevator_shafts = new Image();
var request_panel = new Image();
var elevator1_img = new Image();
var elevator1_ding = new Audio();

var start = null;
var t_last = null;
var elev1 = null;



var circle_btn = {width:40, height:40, lit:false, type: 'circle'};

var panel1_buttons = {
  btn1:  merge(circle_btn, {x: 24,  y:84, floor:1}),
  btn2:  merge(circle_btn, {x: 117, y:84, floor:2}),
  btn3:  merge(circle_btn, {x: 24,  y:23, floor:3}),
  btn4:  merge(circle_btn, {x: 117, y:23, floor:4}),
  btn5:  merge(circle_btn, {x: 73, y:149, floor:5}),
  open:  merge(circle_btn, {x: 24,  y:206}),
  close: merge(circle_btn, {x: 117, y:206})
}


var triangle_btn = {width: 42, height:43, lit:false, type: 'triangle', elev_on_way: false};

var request_buttons = {
  one_up:   merge(triangle_btn, {x: 255, y: 527, dir: 1, floor: 1}),
  two_up:   merge(triangle_btn, {x: 337, y: 527, dir: 1, floor: 2}),
  three_up: merge(triangle_btn, {x: 420, y: 527, dir: 1, floor: 3}),
  two_down:   merge(triangle_btn, {x: 337, y: 579, dir:-1, floor: 2}),
  three_down: merge(triangle_btn, {x: 420, y: 579, dir:-1, floor: 3}),
  four_up:  merge(triangle_btn, {x: 503, y: 579, dir:1, floor: 4}),
  four_down:  merge(triangle_btn, {x: 503, y: 579, dir:-1, floor: 4}),
   five_down:  merge(triangle_btn, {x: 503, y: 579, dir:-1, floor: 5})
}

var all_buttons = mergeToArr(request_buttons, mergeToArr(panel1_buttons));

function init(){
  panel1.src = './img/panel1.png'; 
  elevator_shafts.src = './img/elevator-shafts.png';
 // request_panel.src = 'request-panel.png';
  elevator1_img.src = './img/elevator.png';
  
  elevator1_ding.src = 'ding.mp3';


  elevator1_img.onload = function() {
    elev1 = createElevator();
    
   
    elev1.ding = elevator1_ding;
   
  }

  window.requestAnimationFrame(draw);
}

function draw(t_frame) {
  window.requestAnimationFrame(draw);
  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');

  // this should only happen once.  cannot be init() because canvas had not necessarily loaded yet.
  if(!start) {
    start = t_last = t_frame;
    canvas.addEventListener("mousedown", handleClick, false);
  }

  // clear canvas
  ctx.clearRect(0,0,CANVAS_WIDTH, CANVAS_WIDTH); 
  //draw constants
  ctx.drawImage(panel1, 0, 0);
  ctx.drawImage(elevator_shafts, MID_CANVAS-elevator_shafts.naturalWidth/2, 0);
 //  ctx.drawImage(request_panel, MID_CANVAS-request_panel.naturalWidth/2, CANVAS_HEIGHT - request_panel.naturalHeight);
  
  //draw elevators
  ctx.drawImage(elevator1_img, elev1.x, elev1.y);
  drawElevDoors(ctx, elev1, 'rgb(128,128,128)');
 
  fillInButtons(all_buttons, ctx);

  // modify values based on time difference since last frame
  var time_dx = t_frame - t_last;
  elevator_step(elev1, time_dx, panel1_buttons, request_buttons);
   t_last = t_frame;
}

// if a button was clicked then light it up
// NOTE: rect intersection is used for both circle/triangle buttons
function handleClick(event) {
  var click_position = getPosition(event);
  console.log(click_position)
  for (var key in all_buttons) {
    if (all_buttons.hasOwnProperty(key)) {
      if(ptInRect(click_position, all_buttons[key])) {
        all_buttons[key].lit = true;
      }
    }
  }
}

//This will only produce correct values after the image has loaded (so naturalWidth has been set)
function createElevator() {
  x = MID_CANVAS-elevator_shafts.naturalWidth/2 + 2;
  y = FLOORS_Y[0];
  return {
    floor:1,
    direction:null,
    finalStop:null,
    opening: 0, // opening=1, closing = -1, still = 0
    x: x,
    y: y,
    width: elevator1_img.naturalWidth,
    height: elevator1_img.naturalHeight,
    closed_door_percent: 1, // [0-1].  1 means fully closed.  0 means door is fully open
    close_timeout: null,    // gets set to the return of setTimeout for closing the door in case it needs to be cancelled (user hits door open again)
    ding: null
  };
}

function elevator_step(elev, time_dx, elev_btns, main_panel) {
  handleElevOpenClose(elev, time_dx);

  var my_pressed_floors = []
  // first fill my_pressed with lit buttons and my_pressed_floors with lit floors
  for (var key in elev_btns) {
    if(elev_btns.hasOwnProperty(key) && elev_btns[key].lit && elev_btns[key].floor) {
      my_pressed_floors.push(elev_btns[key].floor);
    }
  }
  var request_panel_pressed = [];
  var request_panel_floors = [];
  for(var key in main_panel) {
    if(main_panel.hasOwnProperty(key) && main_panel[key].lit) {
      request_panel_pressed.push(main_panel[key]);
      request_panel_floors.push(main_panel[key].floor);
    }
  }

  if(elev_btns['open'].lit) {
      elev_btns['open'].lit = false;
      if(! isInBetweenFloors(elev)) {
        elev.opening = 1;
        elev.ding.play();
      }
  }
  if(elev_btns['close'].lit) {
      elev_btns['close'].lit = false;
      elev.opening = -1;
  }

  var floor_changed = (elev.floor != getCurrentFloor(elev));
  elev.floor = getCurrentFloor(elev);
  var doors_moving =  (elev.closed_door_percent != 1);
  var curr_floor_req_btn = get_request_btn(elev.floor, elev.direction);

  // elevator is currently not doing anything
  if(elev.finalStop == null) {
    // someone pressed an internal panel button
    if(my_pressed_floors.length != 0) {
      elev.finalStop = my_pressed_floors[0];
    }
    // someone pressed a button from the request panel
    else if(request_panel_pressed.length != 0) {
      for(var i = 0; i < request_panel_pressed.length; i++) {
        if(! request_panel_pressed[i].elev_on_way) {
          elev.finalStop = request_panel_pressed[i].floor;
          request_panel_pressed[i].elev_on_way = true;
          break; // only takes one request_panel job
        }
      }
    }
  }
  // just got to the final stop
  else if(elev.finalStop && elev.floor == elev.finalStop) {
    // request button
    var req_btn = curr_floor_req_btn;
    req_btn = get_request_btn(elev.floor, null); // When at a final stop you can take either direction's calls
    req_btn.lit = false;
    req_btn.elev_on_way = false;
    
    //elev_panel button
    elev_btns['btn' + elev.finalStop].lit = false;
    
    // elev state
    elev.finalStop = null;
    elev.direction = null;
    elev.y = FLOORS_Y[elev.floor-1]; // make sure its pixel perfect
    elev.opening = 1; // open elev doors
    
    elev.ding.play();
  }
  // if elevator is passing through a floor it should stop at (req_btn is lit OR internal button pressed)
  else if((my_pressed_floors.indexOf(elev.floor) != -1 || curr_floor_req_btn.lit) && (!isInBetweenFloors(elev) || floor_changed)) {
    curr_floor_req_btn.lit = false;
    curr_floor_req_btn.elev_on_way = false;

    elev_btns['btn' + elev.floor].lit = false;
    
    elev.y = FLOORS_Y[elev.floor-1];
    elev.opening = 1;
    elev.ding.play();
  }

  // elevator needs to move up/down
  else if(elev.finalStop && elev.floor != elev.finalStop && !doors_moving) {
    var dir = elev.direction = getDirection(elev.floor, elev.finalStop);
    var dur = getDirectionDuration(dir);
    elev.y -= (dir * (time_dx / dur)) * FLOOR_DISTANCE;

    // if finalStop should be adjusted because an internal button has been pressed higher up than the current finalStop
    if(my_pressed_floors.length > 0) {
      var floors = Object.create(my_pressed_floors);
      floors.push(elev.finalStop);// in case current final stop was created from request_panel

      if(dir == 1) {
        elev.finalStop = Math.max.apply(Math, floors);
      } else if(dir == -1) {
        elev.finalStop = Math.min.apply(Math, floors);
      }
    }
  }
}

function handleElevOpenClose(elev, time_dx) {
  // if elevator door is opening
  // open it then then open set a timer to close it later
  if(elev.opening == 1) {
    elev.closed_door_percent -= (time_dx / OPEN_CLOSE_DURATION)
    elev.closed_door_percent = Math.max(elev.closed_door_percent, 0);
    clearTimeout(elev.close_timeout);
    // just fully opened
    if(elev.closed_door_percent == 0) {
      elev.close_timeout = setTimeout(function() { elev.opening = -1 }, STAY_CLOSED_DURATION);
    }
  }
  // if elevator door is closing
  else if(elev.opening == -1) {
    elev.closed_door_percent += (time_dx / OPEN_CLOSE_DURATION)
    elev.closed_door_percent = Math.min(elev.closed_door_percent, 1);
  }
  // no longer opening or closing (or is in the wait before a close)
  if(elev.closed_door_percent == 1 || elev.closed_door_percent == 0) {
    elev.opening = 0;
  }
}

function getDirection(fromFloor, toFloor) {
  return toFloor < fromFloor ? -1 : 1;
}

function getDirectionDuration(dir) {
  return dir == 1? UP_FLOOR_DURATION : DOWN_FLOOR_DURATION;
}

function getCurrentFloor(elev) {
  for(var i = 0; i < FLOORS_Y.length; i++) {
    if(elev.y == FLOORS_Y[i]) {
      return i+1;
    }
  }

  var fl = 0;
  var down_padding = (elev.direction == -1)? FLOOR_DISTANCE : 0;
  while(FLOORS_Y[fl] + down_padding >= elev.y) {
    fl += 1;
  }
  return fl;
}

function isInBetweenFloors(elev) {
  for(var i = 0; i < FLOORS_Y.length; i++) {
    if(elev.y == FLOORS_Y[i]) {
      return false;
    }
  }
  return true;
}
// get the request_panel btn for a specified floor and direction
// if direction is null then return a either btn for that floor.  It will prefer a lit btn
function get_request_btn(floor, direction) {
  if(direction == null) {
    var btn1 = get_request_btn(floor, 1);
    var btn2 = get_request_btn(floor, -1);
    if(! btn1) {
      return btn2;
    } 
    else if(! btn2) {
      return btn1;
    }
    else {
      return (btn1.lit)? btn1 : btn2;
    }
  }

  for(var key in request_buttons) {
    if(request_buttons.hasOwnProperty(key)) {
      if(request_buttons[key].floor == floor && (direction == null || request_buttons[key].dir == direction)) {
        return request_buttons[key];
      }
    }
  }
}


function drawElevDoors(ctx, elev, color) {
  ctx.save();
  ctx.fillStyle = color;
  var elev_door_fully_closed_width = elev.width-6;
  var partial_closed_px = Math.round(elev_door_fully_closed_width * elev.closed_door_percent);

  roundRect(ctx, elev.x+3, elev.y+3, partial_closed_px, elev.height-6,undefined, true, false);
  ctx.restore();
}

function fillInButtons(btns, ctx) {
  //draw fills for lit buttons
  for (var key in btns) {
    if (btns.hasOwnProperty(key) && btns[key].lit) {
      if(btns[key].type == "circle") {
        fillInCircle(btns[key], 'rgba(255,0,0,0.5)', ctx);
      } else {
        fillInTriangle(btns[key], 'rgb(248,231,28)', ctx);
      }
    }
  }
}


function fillInCircle(btn, col, ctx) {
  ctx.save();
  if(typeof col !== "undefined") {
    ctx.fillStyle=col;
  }

  ctx.beginPath();
  ctx.arc(btn.x + btn.width/2, btn.y + btn.height/2, 20, 0, 2 * Math.PI);
  ctx.fill();

  ctx.restore();
}

function fillInTriangle(btn, col, ctx) {
  ctx.save();
  if(typeof col !== "undefined") {
    ctx.fillStyle=col;
  }
  
  if(typeof btn.dir !== "undefined" && btn.dir == -1) {
    triangle(ctx, btn.x+btn.width, btn.y + btn.height, -btn.width, -btn.height);
  }
  else {
    triangle(ctx, btn.x, btn.y, btn.width, btn.height);
  }

  ctx.restore();
}

function triangle(ctx, x, y, width, height) {
  ctx.beginPath();
  ctx.moveTo(x,y+height);
  ctx.lineTo(x+width, y+height);
  ctx.lineTo(x+width/2, y);
  ctx.fill();
}

function ptInRect(pt, rect) {
  return pt.x >= rect.x && pt.x <= rect.x + rect.width &&
         pt.y >= rect.y && pt.y <= rect.y + rect.height;
}

/**
 * Overwrites obj1's values with obj2's and adds obj2's if non existent in obj1
 * @param obj1
 * @param obj2
 * @returns obj3 a new object based on obj1 and obj2
 */
function merge(obj1,obj2){
    var obj3 = {};
    for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    return obj3;
}

function mergeToArr(obj1, obj2) {
  var arr = []
  for (var attrname in obj1) { arr.push(obj1[attrname]); }
  for (var attrname in obj2) { arr.push(obj2[attrname]); }
  return arr;
}

function toArr(obj) {
  var arr = []
  for (var attrname in obj) { arr.push(obj[attrname]); }
  return arr;
}

/**
 * TAKEN FROM: http://stackoverflow.com/questions/1255512/how-to-draw-a-rounded-rectangle-on-html-canvas
 * Draws a rounded rectangle using the current state of the canvas. 
 * If you omit the last three params, it will draw a rectangle 
 * outline with a 5 pixel border radius 
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} x The top left x coordinate
 * @param {Number} y The top left y coordinate 
 * @param {Number} width The width of the rectangle 
 * @param {Number} height The height of the rectangle
 * @param {Number} radius The corner radius. Defaults to 5;
 * @param {Boolean} fill Whether to fill the rectangle. Defaults to false.
 * @param {Boolean} stroke Whether to stroke the rectangle. Defaults to true.
 */
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  if (typeof stroke == "undefined" ) {
    stroke = true;
  }
  if (typeof radius === "undefined") {
    radius = 5;
  }
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (stroke) {
    ctx.stroke();
  }
  if (fill) {
    ctx.fill();
  }        
}

/*
 * http://diveintohtml5.info/canvas.html
 */
function getPosition(e){
    var canvas = document.getElementById('canvas');
    var x;
    var y;
    if (e.pageX != undefined && e.pageY != undefined) {
      x = e.pageX;
      y = e.pageY;
    } else {
      x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
      y = e.clientY + document.body.scrollTop  + document.documentElement.scrollTop;
    }
    
    x -= canvas.offsetLeft;
    y -= canvas.offsetTop;
    return {x:x, y:y};
}


init();
$(document).ready(function(){
if ('serviceWorker' in navigator) { 
navigator.serviceWorker 
.register('./service-worker.js') 
.then(function() { console.log('Service Worker Registered'); }); 
}
});