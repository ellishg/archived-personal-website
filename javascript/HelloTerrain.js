/**
 *  @fileoverview Main javascript file for flight simulator
 *  @author eshoag2@illinois.edu (Ellis Hoag)
 */

var gl;
var canvas;
var shaderProgram;
var vertexPositionBuffer;

// Create a place to store terrain geometry
var tVertexPositionBuffer;

//Create a place to store normals for shading
var tVertexNormalBuffer;

// Create a place to store the terrain triangles
var tIndexTriBuffer;
var tColorBuffer;

var locX = 0;
var locY = -2;
var locZ = 0;

var move = 0;
var moveSpeed = 0.005;
var moveUp = 0;

var dirY = 0.003;

var pitch = 0;
var roll = 0;

var movingPitchToZero = 0;
var movingRollToZero = 0;

var rotY = 0;
var rotX = 0;
var rotSpeed = 0.005;

// View parameters
var eyePt = vec3.fromValues(0.0, 0.0, 0.5);
var up = vec3.fromValues(0.0, 0.0, 1.0);
var viewPt = vec3.fromValues(0.0, -1.0, 0.4);

var lightLocation = [1, 1, 0];
var ambientLightColor = [0.0, 0.0, 0.0];
var diffuseLightColor = [0.0, 0.0, 0.0];
var specularLightColor = [0.0, 0.0, 0.0];

var camera_quaternion = quat.create();

// Create the normal
var nMatrix = mat3.create();

// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();

var mvMatrixStack = [];

window.addEventListener("keydown", onKeyDown, false);
window.addEventListener("keyup", onKeyUp, false);

/**
 *  This is called when a key is presses. It is used to set the pitch and roll
 */
function onKeyDown(code) {

    //right arrow
    if (code.keyCode == "39") {
        move = moveSpeed;
        rotY = rotSpeed;
        movingRollToZero = 0;
    }
    //left arrow
    if (code.keyCode == "37") {
        move = -moveSpeed;
        rotY = -rotSpeed;
        movingRollToZero = 0;
    }
    //up
    if (code.keyCode == "38") {
        moveUp = -moveSpeed;
        rotX = rotSpeed;
        movingPitchToZero = 0;
    }
    //down
    if (code.keyCode == "40") {
        moveUp = moveSpeed;
        rotX = -rotSpeed;
        movingPitchToZero = 0;
    }
}

/**
 *  This is called when a key is released. It is used to reset the pitch and roll.
 */
function onKeyUp(code) {

    if (code.keyCode == "39") {
        move = 0;
        rotY = 0;
        movingRollToZero = 1;
    }
    if (code.keyCode == "37") {
        move = 0;
        rotY = 0;
        movingRollToZero = 1;
    }
    //up
    if (code.keyCode == "38") {
        moveUp = 0;
        rotX = 0;
        movingPitchToZero = 1;
    }
    //down
    if (code.keyCode == "40") {
        moveUp = 0;
        rotX = 0;
        movingPitchToZero = 1;
    }
}


//-------------------------------------------------------------------------
/**
 *  This sets up the vertex, normal, color, and index buffers. It calls terrainFromIteration to get the entries
 */
function setupTerrainBuffers() {

    var vTerrain=[];
    var fTerrain=[];
    var nTerrain=[];
    var colorTerrain=[];
    var gridN=50;

    var numT = terrainFromIteration(gridN, -1,1,-1,1, vTerrain, colorTerrain, fTerrain, nTerrain);
    console.log("Generated ", numT, " triangles");
    tVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vTerrain), gl.STATIC_DRAW);
    tVertexPositionBuffer.itemSize = 3;
    tVertexPositionBuffer.numItems = (gridN+1)*(gridN+1);

    // Specify normals to be able to do lighting calculations
    tVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nTerrain),
                  gl.STATIC_DRAW);
    tVertexNormalBuffer.itemSize = 3;
    tVertexNormalBuffer.numItems = (gridN+1)*(gridN+1);

    // Specify faces of the terrain
    tIndexTriBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(fTerrain),
                  gl.STATIC_DRAW);
    tIndexTriBuffer.itemSize = 1;
    tIndexTriBuffer.numItems = numT*3;

    tColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorTerrain), gl.STATIC_DRAW);
    tColorBuffer.itemSize = 3;
    tColorBuffer.numItems = (gridN + 1) * (gridN + 1);

}

//-------------------------------------------------------------------------
/**
 *  This draws the terrain using the vertex, normal, color, and index buffers.
 */
function drawTerrain(){
 gl.polygonOffset(0,0);
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, tVertexPositionBuffer.itemSize,
                         gl.FLOAT, false, 0, 0);

 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute,
                           tVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);

 gl.bindBuffer(gl.ARRAY_BUFFER, tColorBuffer);
 gl.vertexAttribPointer(shaderProgram.colorAttribute, tColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

 //Draw
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);
 gl.drawElements(gl.TRIANGLES, tIndexTriBuffer.numItems, gl.UNSIGNED_SHORT,0);
}

//-------------------------------------------------------------------------
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform,
                      false, pMatrix);
}

//-------------------------------------------------------------------------
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


//----------------------------------------------------------------------------------
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
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

//----------------------------------------------------------------------------------
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

//----------------------------------------------------------------------------------
/**
 *  This sets up the shaders. It sets up the attributes in the shader programs.
 */
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert(gl.getProgramInfoLog(shaderProgram));
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.colorAttribute = gl.getAttribLocation(shaderProgram, "aColor");
  gl.enableVertexAttribArray(shaderProgram.colorAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
}


//-------------------------------------------------------------------------
function uploadLightsToShader(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//----------------------------------------------------------------------------------
function setupBuffers() {
    setupTerrainBuffers();
}

//----------------------------------------------------------------------------------
/**
 *  We draw everything here. We draw nine terrains so that we can "simulate" and infinite terrain.
 *  If we go to far forwards we seamlessly jump back to a more central point.
 *  We also control pitch and yaw here. They are both bounded and will bounce back to zero when we are not turning.
 *  We use quaternions here to take care of pitch and yaw.
 */
function draw() {
    var transformVec = vec3.create();
    var scaleVec = vec3.create();

    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective
    mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);

    // Then generate the lookat matrix and initialize the MV matrix to that view
    mat4.lookAt(mvMatrix,eyePt,viewPt,up);

    locY += dirY;
    locX += move;
    locZ += moveUp;
    pitch += rotX;
    roll += rotY;
    if (locX > 2) {
        locX = 0;
    }
    if (locX < -2) {
        locX = 0;
    }
    if (locY > 0) {
        locY = -2;
    }
    if (locZ < -0.1) {
        locZ = -0.1;
    }
    if (locZ > 0.3) {
        locZ = 0.3;
    }
    if (pitch > 0.2) {
        pitch = 0.2;
    }
    if (pitch < -0.2) {
        pitch = -0.2;
    }
    if (roll > 0.7) {
        roll = 0.7;
    }
    if (roll < -0.7) {
        roll = -0.7;
    }

    if (movingPitchToZero == 1) {
        pitch /= 1.03;
        if (Math.abs(pitch) < 0.01) {
            pitch = 0;
            movingPitchToZero = 0;
        }
    }
    if (movingRollToZero == 1) {
        roll /= 1.03;
        if (Math.abs(roll) < 0.01) {
            roll = 0;
            movingRollToZero = 0;
        }
    }


    quat.identity(camera_quaternion);
    quat.rotateX(camera_quaternion, camera_quaternion, pitch);
    quat.rotateY(camera_quaternion, camera_quaternion, roll);

    var rotMat = mat4.create();
    mat4.fromQuat(rotMat, camera_quaternion);
    mat4.multiply(mvMatrix, mvMatrix, rotMat);

    var locVec = vec3.fromValues(locX, locY, locZ);
    mat4.translate(mvMatrix, mvMatrix, locVec);

    //Draw Terrain
    mvPushMatrix();
    vec3.set(transformVec,0.0,-0.25,-3.0);
    setMatrixUniforms();
    uploadLightsToShader(lightLocation, ambientLightColor, diffuseLightColor, specularLightColor);
    drawTerrain();
    mvPopMatrix();

    // left
    mvPushMatrix();
    vec3.set(transformVec, -2.0, 0.0, 0.0);
    vec3.set(scaleVec, -1, 1, 1);
    mat4.translate(mvMatrix, mvMatrix, transformVec);
    //mat4.scale(mvMatrix, mvMatrix, scaleVec);
    setMatrixUniforms();
    uploadLightsToShader(lightLocation, ambientLightColor, diffuseLightColor, specularLightColor);
    drawTerrain();
    mvPopMatrix();

    //right
    mvPushMatrix();
    vec3.set(transformVec, 2.0, 0.0, 0.0);
    vec3.set(scaleVec, -1, 1, 1);
    mat4.translate(mvMatrix, mvMatrix, transformVec);
    //mat4.scale(mvMatrix, mvMatrix, scaleVec);
    setMatrixUniforms();
    uploadLightsToShader(lightLocation, ambientLightColor, diffuseLightColor, specularLightColor);
    drawTerrain();
    mvPopMatrix();

    //up
    mvPushMatrix();
    vec3.set(transformVec, 0.0, 2.0, 0.0);
    vec3.set(scaleVec, 1, -1, 1);
    mat4.translate(mvMatrix, mvMatrix, transformVec);
    //mat4.scale(mvMatrix, mvMatrix, scaleVec);
    setMatrixUniforms();
    uploadLightsToShader(lightLocation, ambientLightColor, diffuseLightColor, specularLightColor);
    drawTerrain();
    mvPopMatrix();

    //down
    mvPushMatrix();
    vec3.set(transformVec, 0.0, -2.0, 0.0);
    vec3.set(scaleVec, 1, -1, 1);
    mat4.translate(mvMatrix, mvMatrix, transformVec);
    //mat4.scale(mvMatrix, mvMatrix, scaleVec);
    setMatrixUniforms();
    uploadLightsToShader(lightLocation, ambientLightColor, diffuseLightColor, specularLightColor);
    drawTerrain();
    mvPopMatrix();

    //up left
    mvPushMatrix();
    vec3.set(transformVec, -2.0, 2.0, 0.0);
    vec3.set(scaleVec, -1, -1, 1);
    mat4.translate(mvMatrix, mvMatrix, transformVec);
    //mat4.scale(mvMatrix, mvMatrix, scaleVec);
    setMatrixUniforms();
    uploadLightsToShader(lightLocation, ambientLightColor, diffuseLightColor, specularLightColor);
    drawTerrain();
    mvPopMatrix();

    //up right
    mvPushMatrix();
    vec3.set(transformVec, 2.0, 2.0, 0.0);
    vec3.set(scaleVec, -1, -1, 1);
    mat4.translate(mvMatrix, mvMatrix, transformVec);
    mat4.scale(mvMatrix, mvMatrix, scaleVec);
    setMatrixUniforms();
    uploadLightsToShader(lightLocation, ambientLightColor, diffuseLightColor, specularLightColor);
    drawTerrain();
    mvPopMatrix();

    //down left
    mvPushMatrix();
    vec3.set(transformVec, -2.0, -2.0, 0.0);
    vec3.set(scaleVec, -1, -1, 1);
    mat4.translate(mvMatrix, mvMatrix, transformVec);
    //mat4.scale(mvMatrix, mvMatrix, scaleVec);
    setMatrixUniforms();
    uploadLightsToShader(lightLocation, ambientLightColor, diffuseLightColor, specularLightColor);
    drawTerrain();
    mvPopMatrix();

    //down right
    mvPushMatrix();
    vec3.set(transformVec, 2.0, -2.0, 0.0);
    vec3.set(scaleVec, -1, -1, 1);
    mat4.translate(mvMatrix, mvMatrix, transformVec);
    //mat4.scale(mvMatrix, mvMatrix, scaleVec);
    setMatrixUniforms();
    uploadLightsToShader(lightLocation, ambientLightColor, diffuseLightColor, specularLightColor);
    drawTerrain();
    mvPopMatrix();

}


//----------------------------------------------------------------------------------
function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders();
  setupBuffers();
  gl.clearColor(0.0, 0.0, 0.5, 1.0);
  gl.enable(gl.DEPTH_TEST);

  quat.identity(camera_quaternion);

  tick();
}

//----------------------------------------------------------------------------------
function tick() {
    requestAnimFrame(tick);
    draw();
    animate();
}
