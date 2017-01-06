
var gl;
var canvas;
var shaderProgram;
var vertexPositionBuffer;


// Create a place to store vertex colors
var vertexColorBuffer;

var mvMatrix = mat4.create();

var numTicks = 0;

var triangleVertices;
var triangleKeyframeVertices;

/*
 *  Create context. Setup viewport.
 */
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

/*
 *  Compile shader.
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);

  // If we don't find an element with the specified id
  // we do an early exit
  if (!shaderScript) {
    return null;
  }

  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }

  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }

  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

/*
 *  Load vertex and fragment shaders.
 *  Get attribute locations.
 *  Get uniforms locations.
 */
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");

  shaderProgram.ticksUniform = gl.getUniformLocation(shaderProgram, "ticks");
}

/*
 *  Create and bind vertex, index, and color buffers.
 */
function setupBuffers() {

  vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);

  /*
   *  Origin is at top left. Has Width 13 and height 14.333333
   *  x, y, z
   *  Contians 44 vertices.
   */
    triangleVertices = [
      // Vertices for main I part
      13.0, 0.5, 0.0,
      0.0, 0.5, 0.0,
      0.0, -2.0, 0.0,
      1.0, -2.0, 0.0,
      1.0, -9.0, 0.0,
      4.0, -9.0, 0.0,
      4.0, -7.0, 0.0,
      5.0, -7.0, 0.0,
      5.0, -4.0, 0.0,
      4.0, -4.0, 0.0,
      4.0, -2.0, 0.0,
      9.0, -2.0, 0.0,
      9.0, -4.0, 0.0,
      8.0, -4.0, 0.0,
      8.0, -7.0, 0.0,
      9.0, -7.0, 0.0,
      9.0, -9.0, 0.0,
      12.0, -9.0, 0.0,
      12.0, -2.0, 0.0,
      13.0, -2.0, 0.0,

      // vertices for orange blocks
      1.0, -10.0, 0.0,
      1.0, -11.0, 0.0,
      2.0, -11.666666, 0.0,
      2.0, -10.0, 0.0,

      3.0, -10.0, 0.0,
      3.0, -12.333333, 0.0,
      4.0, -13.0, 0.0,
      4.0, -10.0, 0.0,

      5.0, -10.0, 0.0,
      5.0, -13.666666, 0.0,
      6.0, -14.333333, 0.0,
      6.0, -10.0, 0.0,

      7.0, -10.0, 0.0,
      7.0, -14.333333, 0.0,
      8.0, -13.666666, 0.0,
      8.0, -10.0, 0.0,

      9.0, -10.0, 0.0,
      9.0, -13.0, 0.0,
      10.0, -12.333333, 0.0,
      10.0, -10.0, 0.0,

      11.0, -10.0, 0.0,
      11.0, -11.666666, 0.0,
      12.0, -11.0, 0.0,
      12.0, -10.0, 0.0
  ];
    
    // Our other set of vertices to animate the orange strips
    triangleKeyframeVertices = [
        // Vertices for main I part
        13.0, 0.5, 0.0,
        0.0, 0.5, 0.0,
        0.0, -2.0, 0.0,
        1.0, -2.0, 0.0,
        1.0, -9.0, 0.0,
        4.0, -9.0, 0.0,
        4.0, -7.0, 0.0,
        5.0, -7.0, 0.0,
        5.0, -4.0, 0.0,
        4.0, -4.0, 0.0,
        4.0, -2.0, 0.0,
        9.0, -2.0, 0.0,
        9.0, -4.0, 0.0,
        8.0, -4.0, 0.0,
        8.0, -7.0, 0.0,
        9.0, -7.0, 0.0,
        9.0, -9.0, 0.0,
        12.0, -9.0, 0.0,
        12.0, -2.0, 0.0,
        13.0, -2.0, 0.0,

        // vertices for orange blocks
      1.0, -10.0, 0.0,
      1.5, -11.0, 0.0,
      2.5, -11.666666, 0.0,
      2.0, -10.0, 0.0,

      3.0, -10.0, 0.0,
      3.5, -12.333333, 0.0,
      4.5, -13.0, 0.0,
      4.0, -10.0, 0.0,

      5.0, -10.0, 0.0,
      5.5, -13.666666, 0.0,
      6.5, -14.333333, 0.0,
      6.0, -10.0, 0.0,

      7.0, -10.0, 0.0,
      7.5, -14.333333, 0.0,
      8.5, -13.666666, 0.0,
      8.0, -10.0, 0.0,

      9.0, -10.0, 0.0,
      9.5, -13.0, 0.0,
      10.5, -12.333333, 0.0,
      10.0, -10.0, 0.0,

      11.0, -10.0, 0.0,
      11.5, -11.666666, 0.0,
      12.5, -11.0, 0.0,
      12.0, -10.0, 0.0
    ];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.DYNAMIC_DRAW);
  vertexPositionBuffer.itemSize = 3;
  vertexPositionBuffer.numberOfItems = 44;

  indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

  /*
   *  Indices
   *  Every three indices define a triangle.
   *  Uses vertices 0 through 43.
   *  Contains 90 indices.
   */
  var indices = [
      0, 10, 1,
      1, 10, 3,
      1, 3, 2,
      3, 10, 9,
      3, 9, 4,
      4, 5, 6,
      4, 6, 9,
      6, 7, 8,
      6, 8, 9,
      0, 10, 11,
      0, 11, 18,
      0, 18, 19,
      18, 11, 12,
      18, 12, 15,
      13, 12, 15,
      13, 14, 15,
      18, 15, 17,
      15, 16, 17,

      20, 21, 22,
      20, 22, 23,
      24, 25, 26,
      24, 26, 27,
      28, 29, 30,
      28, 30, 31,
      32, 33, 34,
      32, 34, 35,
      36, 37, 38,
      36, 38, 39,
      40, 41, 42,
      40, 42, 43
  ]
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  indexBuffer.numItems = 90;

  vertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);

  /*
   *  Colors for mesh.
   *  One (R, G, B, A) color for each vertex.
   *  Contains 44 colors.
   */
  var colors = [
      // Blue
      19.0/255.0, 40.0/255.0, 75.0/255.0, 1.0,
      19.0/255.0, 40.0/255.0, 75.0/255.0, 1.0,
      19.0/255.0, 40.0/255.0, 75.0/255.0, 1.0,
      19.0/255.0, 40.0/255.0, 75.0/255.0, 1.0,
      19.0/255.0, 40.0/255.0, 75.0/255.0, 1.0,
      19.0/255.0, 40.0/255.0, 75.0/255.0, 1.0,
      19.0/255.0, 40.0/255.0, 75.0/255.0, 1.0,
      19.0/255.0, 40.0/255.0, 75.0/255.0, 1.0,
      19.0/255.0, 40.0/255.0, 75.0/255.0, 1.0,
      19.0/255.0, 40.0/255.0, 75.0/255.0, 1.0,
      19.0/255.0, 40.0/255.0, 75.0/255.0, 1.0,
      19.0/255.0, 40.0/255.0, 75.0/255.0, 1.0,
      19.0/255.0, 40.0/255.0, 75.0/255.0, 1.0,
      19.0/255.0, 40.0/255.0, 75.0/255.0, 1.0,
      19.0/255.0, 40.0/255.0, 75.0/255.0, 1.0,
      19.0/255.0, 40.0/255.0, 75.0/255.0, 1.0,
      19.0/255.0, 40.0/255.0, 75.0/255.0, 1.0,
      19.0/255.0, 40.0/255.0, 75.0/255.0, 1.0,
      19.0/255.0, 40.0/255.0, 75.0/255.0, 1.0,
      19.0/255.0, 40.0/255.0, 75.0/255.0, 1.0,

      // Orange
      233.0/255.0, 74.0/255.0, 55.0/255.0, 1.0,
      233.0/255.0, 74.0/255.0, 55.0/255.0, 1.0,
      233.0/255.0, 74.0/255.0, 55.0/255.0, 1.0,
      233.0/255.0, 74.0/255.0, 55.0/255.0, 1.0,
      233.0/255.0, 74.0/255.0, 55.0/255.0, 1.0,
      233.0/255.0, 74.0/255.0, 55.0/255.0, 1.0,
      233.0/255.0, 74.0/255.0, 55.0/255.0, 1.0,
      233.0/255.0, 74.0/255.0, 55.0/255.0, 1.0,
      233.0/255.0, 74.0/255.0, 55.0/255.0, 1.0,
      233.0/255.0, 74.0/255.0, 55.0/255.0, 1.0,
      233.0/255.0, 74.0/255.0, 55.0/255.0, 1.0,
      233.0/255.0, 74.0/255.0, 55.0/255.0, 1.0,
      233.0/255.0, 74.0/255.0, 55.0/255.0, 1.0,
      233.0/255.0, 74.0/255.0, 55.0/255.0, 1.0,
      233.0/255.0, 74.0/255.0, 55.0/255.0, 1.0,
      233.0/255.0, 74.0/255.0, 55.0/255.0, 1.0,
      233.0/255.0, 74.0/255.0, 55.0/255.0, 1.0,
      233.0/255.0, 74.0/255.0, 55.0/255.0, 1.0,
      233.0/255.0, 74.0/255.0, 55.0/255.0, 1.0,
      233.0/255.0, 74.0/255.0, 55.0/255.0, 1.0,
      233.0/255.0, 74.0/255.0, 55.0/255.0, 1.0,
      233.0/255.0, 74.0/255.0, 55.0/255.0, 1.0,
      233.0/255.0, 74.0/255.0, 55.0/255.0, 1.0,
      233.0/255.0, 74.0/255.0, 55.0/255.0, 1.0
  ];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  vertexColorBuffer.itemSize = 4;
  vertexColorBuffer.numItems = 44;
}

/*
 *  We animate our object by interpolation here
 *  This could easly be put in the vertex shader
 *  by passing both sets of vertices...but this is fine for now
 */
function animate()
{    
    var verts = new Array();
    
    // Increment numTicks for animations
    // We use t for our keyframe animations
    var t = Math.sin(numTicks++ / 40.0);
    
    for (i = 0; i < triangleVertices.length; i++) {
        // For each vertex we interpolate between the two points by t
        verts[i] = triangleVertices[i] * (1 - t) + triangleKeyframeVertices[i] * t;
    }
    
    // We need to send the verts to the buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.DYNAMIC_DRAW);
}

function draw() {

  // Setup viewport
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  // Clear screen
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Create modelView matrix
  mat4.identity(mvMatrix);
  mat4.scale(mvMatrix, mvMatrix, vec3.fromValues(0.1, 0.1, 1));
  // Object moves in a circle
  mat4.translate(mvMatrix, mvMatrix, vec3.fromValues(-8 + Math.sin(numTicks / 100.0), 8 + Math.cos(numTicks / 100.0), 0));

  // Object rotates slightly
  mat4.rotateZ(mvMatrix, mvMatrix, 0.05 * Math.sin(numTicks / 50.0));

  // Load model view matrix to shader
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

  // Load numTicks to shader
  gl.uniform1f(shaderProgram.ticksUniform, numTicks);

  // Load vertex buffer to shader
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

  // Load color buffer to shader
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

  // Bind index buffer
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

  // Draw our object using indices
  gl.drawElements(gl.TRIANGLES, indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
  //gl.drawArrays(gl.TRIANGLES, 0, vertexPositionBuffer.numberOfItems);
}

/*
 *  Initialize program
 */
function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders();
  setupBuffers();
  // Background color
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  tick();
}

/*
 *  Draw function. Is called every frame.
 */
function tick() {
    requestAnimFrame(tick);
    animate();
    draw();
}
