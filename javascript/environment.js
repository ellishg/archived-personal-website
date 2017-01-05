/**
 *  @fileoverview Main javascript file for mp3
 *  @author eshoag2@illinois.edu (Ellis Hoag)
 */

var gl;
var canvas;

var skybox_shader;
var teapot_shader;

var projection_matrix = mat4.create();

// Skybox buffer objects
var cube_vertex_buffer;
var cube_index_buffer;

// Images for skybox
var neg_x_img = new Image();
var neg_y_img = new Image();
var neg_z_img = new Image();
var pos_x_img = new Image();
var pos_y_img = new Image();
var pos_z_img = new Image();

var skybox_texture;

var teapot_vertex_buffer;
var teapot_index_buffer;
var teapot_normal_buffer;
var teapot_num_indices;

// Becomes true when teapot.obj has been loaded
var obj_is_loaded = false;

var diffuse_color = new Float32Array([0.5, 0.5, 0.5]);
var specular_color = new Float32Array([1.0, 1.0, 1.0]);

var light_source = new Float32Array([10.0, 10.0, 10.0]);

var reflectiveness = 0.3;
var shininess = 4.0;

var teapot_yaw = 0;
var teapot_pitch = 0;

window.addEventListener("keydown", onKeyDown, false);

/**
 *  This is called when a key is pressed.
 */
function onKeyDown(code) {
  //w
  if (code.keyCode == "87") {
    reflectiveness = Math.min(reflectiveness + 0.1, 1.0);
  }
  //s
  if (code.keyCode == "83") {
    reflectiveness = Math.max(reflectiveness - 0.1, 0.0);
  }
  //a
  if (code.keyCode == "65") {
    shininess = Math.min(shininess + 0.5, 16.0);
  }
  //d
  if (code.keyCode == "68") {
    shininess = Math.max(shininess - 0.5, 1.0);
  }
  //up
  if (code.keyCode == "38") {
    teapot_pitch += 0.1;
  }
  //down
  if (code.keyCode == "40") {
    teapot_pitch -= 0.1;
  }
  //left
  if (code.keyCode == "37") {
    teapot_yaw += 0.1;
  }
  //right
  if (code.keyCode == "39") {
    teapot_yaw -= 0.1;
  }
}

/**
 * Gets a file from the server for processing on the client side.
 *
 * @param  file A string that is the name of the file to get
 * @param  callbackFunction The name of function (NOT a string) that will receive a string holding the file
 *         contents.
 *
 */
function readTextFile(file, callbackFunction)
{
    //console.log("reading "+ file);
    var rawFile = new XMLHttpRequest();
    var allText = [];
    rawFile.open("GET", file, true);

    rawFile.onreadystatechange = function ()
    {
        if(rawFile.readyState === 4)
        {
            if(rawFile.status === 200 || rawFile.status == 0)
            {
                 callbackFunction(rawFile.responseText);
                 //console.log("Got text file!");
            }
        }
    }
    rawFile.send(null);
}

/*
 *  Compile shader.
 */
function loadShaderFromDOM(id)
{
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
  while (currentChild)
  {
    if (currentChild.nodeType == 3)
    { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }

  var shader;
  if (shaderScript.type == "x-shader/x-fragment")
  {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  }
  else if (shaderScript.type == "x-shader/x-vertex")
  {
    shader = gl.createShader(gl.VERTEX_SHADER);
  }
  else {
    return null;
  }

  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
  {
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
  skyboxVertexShader = loadShaderFromDOM("skybox_vertex_shader");
  skyboxFragmentShader = loadShaderFromDOM("skybox_fragment_shader");

  skybox_shader = gl.createProgram();
  gl.attachShader(skybox_shader, skyboxVertexShader);
  gl.attachShader(skybox_shader, skyboxFragmentShader);
  gl.linkProgram(skybox_shader);

  if (!gl.getProgramParameter(skybox_shader, gl.LINK_STATUS))
  {
    alert("Failed to setup skybox_shader");
  }

  gl.useProgram(skybox_shader);

  skybox_shader.vertex_attribute = gl.getAttribLocation(skybox_shader, "vertex_position");
  gl.enableVertexAttribArray(skybox_shader.vertex_attribute);

  skybox_shader.modelview_uniform = gl.getUniformLocation(skybox_shader, "modelview_matrix");
  skybox_shader.projection_uniform = gl.getUniformLocation(skybox_shader, "projection_matrix");

  skybox_shader.cube_sampler_uniform = gl.getUniformLocation(skybox_shader, "sampler");

  teapotVertexShader = loadShaderFromDOM("teapot_vertex_shader");
  teapotFragmentShader = loadShaderFromDOM("teapot_fragment_shader");

  teapot_shader = gl.createProgram();
  gl.attachShader(teapot_shader, teapotVertexShader);
  gl.attachShader(teapot_shader, teapotFragmentShader);
  gl.linkProgram(teapot_shader);

  if (!gl.getProgramParameter(teapot_shader, gl.LINK_STATUS))
  {
    alert("Failed to setup teapot_shader");
  }

  gl.useProgram(teapot_shader);

  teapot_shader.vertex_attribute = gl.getAttribLocation(teapot_shader, "vertex_position");
  gl.enableVertexAttribArray(teapot_shader.vertex_attribute);

  teapot_shader.normal_attribute = gl.getAttribLocation(teapot_shader, "normal");
  gl.enableVertexAttribArray(teapot_shader.normal_attribute);

  teapot_shader.model_uniform = gl.getUniformLocation(teapot_shader, "model_matrix");
  teapot_shader.view_uniform = gl.getUniformLocation(teapot_shader, "view_matrix");
  teapot_shader.normal_model_uniform = gl.getUniformLocation(teapot_shader, "normal_model_matrix");
  teapot_shader.normal_view_uniform = gl.getUniformLocation(teapot_shader, "normal_view_matrix");
  teapot_shader.projection_uniform = gl.getUniformLocation(teapot_shader, "projection_matrix");

  teapot_shader.diffuse_color = gl.getUniformLocation(teapot_shader, "diffuse_color");
  teapot_shader.specular_color = gl.getUniformLocation(teapot_shader, "specular_color");

  teapot_shader.light_source = gl.getUniformLocation(teapot_shader, "light_source");

  teapot_shader.cube_sampler_uniform = gl.getUniformLocation(teapot_shader, "sampler");

  teapot_shader.reflectiveness_uniform = gl.getUniformLocation(teapot_shader, "reflectiveness");
  teapot_shader.shininess_uniform = gl.getUniformLocation(teapot_shader, "shininess");
}

/**
  * Sets up vertex and index buffers for teapot and skybox.
  * Also loads skybox images and the teapot object file.
  */
function setupBuffers()
{
  var cube_vertices = [
    // Front face
    -1.0, -1.0,  1.0,
     1.0, -1.0,  1.0,
     1.0,  1.0,  1.0,
    -1.0,  1.0,  1.0,

    // Back face
    -1.0, -1.0, -1.0,
    -1.0,  1.0, -1.0,
     1.0,  1.0, -1.0,
     1.0, -1.0, -1.0,

    // Top face
    -1.0,  1.0, -1.0,
    -1.0,  1.0,  1.0,
     1.0,  1.0,  1.0,
     1.0,  1.0, -1.0,

    // Bottom face
    -1.0, -1.0, -1.0,
     1.0, -1.0, -1.0,
     1.0, -1.0,  1.0,
    -1.0, -1.0,  1.0,

    // Right face
     1.0, -1.0, -1.0,
     1.0,  1.0, -1.0,
     1.0,  1.0,  1.0,
     1.0, -1.0,  1.0,

    // Left face
    -1.0, -1.0, -1.0,
    -1.0, -1.0,  1.0,
    -1.0,  1.0,  1.0,
    -1.0,  1.0, -1.0
  ];

  var cube_indices = [
    0,  1,  2,      0,  2,  3,    // front
    4,  5,  6,      4,  6,  7,    // back
    8,  9,  10,     8,  10, 11,   // top
    12, 13, 14,     12, 14, 15,   // bottom
    16, 17, 18,     16, 18, 19,   // right
    20, 21, 22,     20, 22, 23    // left
  ];

  neg_x_img.onload = function() {handleTextureLoaded(neg_x_img, skybox_texture, gl.TEXTURE_CUBE_MAP_NEGATIVE_X);}
  neg_x_img.src = "javascript/canary/neg-x.png";
  neg_y_img.onload = function() {handleTextureLoaded(neg_y_img, skybox_texture, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y);}
  neg_y_img.src = "javascript/canary/neg-y.png";
  neg_z_img.onload = function() {handleTextureLoaded(neg_z_img, skybox_texture, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z);}
  neg_z_img.src = "javascript/canary/neg-z.png";
  pos_x_img.onload = function() {handleTextureLoaded(pos_x_img, skybox_texture, gl.TEXTURE_CUBE_MAP_POSITIVE_X);}
  pos_x_img.src = "javascript/canary/pos-x.png";
  pos_y_img.onload = function() {handleTextureLoaded(pos_y_img, skybox_texture, gl.TEXTURE_CUBE_MAP_POSITIVE_Y);}
  pos_y_img.src = "javascript/canary/pos-y.png";
  pos_z_img.onload = function() {handleTextureLoaded(pos_z_img, skybox_texture, gl.TEXTURE_CUBE_MAP_POSITIVE_Z);}
  pos_z_img.src = "javascript/canary/pos-z.png";

  cube_vertex_buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cube_vertex_buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cube_vertices), gl.STATIC_DRAW);

  cube_index_buffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cube_index_buffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cube_indices), gl.STATIC_DRAW);

  skybox_texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, skybox_texture);
  //gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  readTextFile("javascript/teapot_0.obj", parse_obj);
}

/**
  * Parses an object file. Creates teapot vertices and indices.
  */
function parse_obj(text)
{
  var vertices = [];
  var indices = [];

  var lines = text.split("\n");
  var max = 0;

  for (var i in lines)
  {
    if (lines[i].startsWith('v'))
    {
      var points = lines[i].substring(2).split(" ");
      vertices.push(parseFloat(points[0]));
      vertices.push(parseFloat(points[1]));
      vertices.push(parseFloat(points[2]));
    }
    if (lines[i].startsWith('f'))
    {
      var points = lines[i].substring(3).split(" ");
      indices.push(parseInt(points[0] - 1));
      indices.push(parseInt(points[1] - 1));
      indices.push(parseInt(points[2] - 1));
    }
  }
  teapot_num_indices = indices.length;

  teapot_vertex_buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, teapot_vertex_buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  teapot_index_buffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapot_index_buffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  var normals = [];
  generate_normals(normals, vertices, indices);

  teapot_normal_buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, teapot_normal_buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

  obj_is_loaded = true;
}

/**
 *  We generate our normals here using our vertices and indices.
 *  We sum together all the normals of each vertex using its neighboring faces.
 *  Then we normalize them so that each vertex normal is the average of each
 *  of its neighboring faces.
 */
function generate_normals(normals, vertices, indices) {

    for (var i = 0; i < vertices.length / 3; i++) {
        normals[3 * i + 0] = 0;
        normals[3 * i + 1] = 0;
        normals[3 * i + 2] = 0;
    }

    for (var i = 0; i < indices.length; i += 3) {

        var i0 = indices[i];
        var i1 = indices[i + 1];
        var i2 = indices[i + 2];

        var v0X = vertices[3 * i0 + 0];
        var v0Y = vertices[3 * i0 + 1];
        var v0Z = vertices[3 * i0 + 2];
        var v1X = vertices[3 * i1 + 0];
        var v1Y = vertices[3 * i1 + 1];
        var v1Z = vertices[3 * i1 + 2];
        var v2X = vertices[3 * i2 + 0];
        var v2Y = vertices[3 * i2 + 1];
        var v2Z = vertices[3 * i2 + 2];

        var aX = v1X - v0X;
        var aY = v1Y - v0Y;
        var aZ = v1Z - v0Z;

        var bX = v2X - v0X;
        var bY = v2Y - v0Y;
        var bZ = v2Z - v0Z;

        var normX = aY * bZ - aZ * bY;
        var normY = aZ * bX - aX * bZ;
        var normZ = aX * bY - aY * bX;

        var mag = Math.sqrt(normX * normX + normY * normY + normZ * normZ);

        normals[3 * i0 + 0] += normX / mag;
        normals[3 * i0 + 1] += normY / mag;
        normals[3 * i0 + 2] += normZ / mag;

        normals[3 * i1 + 0] += normX / mag;
        normals[3 * i1 + 1] += normY / mag;
        normals[3 * i1 + 2] += normZ / mag;

        normals[3 * i2 + 0] += normX / mag;
        normals[3 * i2 + 1] += normY / mag;
        normals[3 * i2 + 2] += normZ / mag;
    }


    for (var i = 0; i < normals.length / 3; i++) {
        var normX = normals[3 * i + 0];
        var normY = normals[3 * i + 1];
        var normZ = normals[3 * i + 2];

        var mag = Math.sqrt(normX * normX + normY * normY + normZ * normZ);

        normals[3 * i + 0] += normX / mag;
        normals[3 * i + 1] += normY / mag;
        normals[3 * i + 2] += normZ / mag;
    }
}

/**
  * Helper function to check if value is a power of 2.
  */
function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}

/**
  * Takes images and sets up for a cube texture map.
  */
function handleTextureLoaded(image, texture, cube_side) {
  //console.log("handleTextureLoaded, image = " + image);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
  gl.texImage2D(cube_side, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
  // Check if the image is a power of 2 in both dimensions.
  if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
     // Yes, it's a power of 2. Generate mips.
     gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
     //gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
     //console.log("Loaded power of 2 texture");
  } else {
     // No, it's not a power of 2. Turn off mips and set wrapping to clamp to edge
     //gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
     //gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
     //gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
     console.log("Loaded non-power of 2 texture");
  }
  //gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}

/*
 *  Create context. Setup viewport.
 */
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++)
  {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context)
    {
      break;
    }
  }
  if (context)
  {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  }
  else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

/*
 *  Initialize program
 */
function startup()
{
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders();
  setupBuffers();

  gl.clearColor(0.2, 0.2, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  mat4.perspective(projection_matrix, 45 * Math.PI / 180, gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);

  tick();
}

/**
  * Main draw function. Draws the skybox and teapot.
  */
function draw()
{
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var view_matrix = mat4.create();
  var normal_view_matrix = mat4.create();

  mat4.translate(view_matrix, view_matrix, vec3.fromValues(0.0, 0.0, -1.0));
  // don't translate normals

  mat4.rotate(view_matrix, view_matrix, teapot_yaw, vec3.fromValues(0.0, 1.0, 0.0));
  mat4.rotate(normal_view_matrix, normal_view_matrix, teapot_yaw, vec3.fromValues(0.0, 1.0, 0.0));

  render_skybox(view_matrix);

  if (obj_is_loaded)
  {
    render_teapot(view_matrix, normal_view_matrix);
  }
}

/**
 * Draws the teapot.
 */
function render_teapot(view_matrix, normal_view_matrix)
{
  var model_matrix = mat4.create();
  var normal_model_matrix = mat4.create();

  mat4.scale(model_matrix, model_matrix, vec3.fromValues(0.1, 0.1, 0.1));
  mat4.scale(normal_model_matrix, normal_model_matrix, vec3.fromValues(0.1, 0.1, 0.1));

  mat4.translate(model_matrix, model_matrix, vec3.fromValues(0.0, -2.0, 0.0));
  // don't translate normals

  mat4.rotate(model_matrix, model_matrix, teapot_pitch, vec3.fromValues(0.0, 0.0, 1.0));
  mat4.rotate(normal_model_matrix, normal_model_matrix, teapot_pitch, vec3.fromValues(0.0, 0.0, 1.0));

  mat4.rotate(model_matrix, model_matrix, teapot_yaw, vec3.fromValues(0.0, 1.0, 0.0));
  mat4.rotate(normal_model_matrix, normal_model_matrix, teapot_yaw, vec3.fromValues(0.0, 1.0, 0.0));

  gl.useProgram(teapot_shader);

  gl.bindBuffer(gl.ARRAY_BUFFER, teapot_vertex_buffer);
  gl.vertexAttribPointer(teapot_shader.vertex_attribute, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, teapot_normal_buffer);
  gl.vertexAttribPointer(teapot_shader.normal_attribute, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapot_index_buffer);

  gl.uniform3fv(teapot_shader.diffuse_color, diffuse_color);
  gl.uniform3fv(teapot_shader.specular_color, specular_color);

  gl.uniform3fv(teapot_shader.light_source, light_source);

  gl.uniform1f(teapot_shader.reflectiveness_uniform, reflectiveness);
  gl.uniform1f(teapot_shader.shininess_uniform, shininess);

  gl.uniformMatrix4fv(teapot_shader.model_uniform, false, model_matrix);
  gl.uniformMatrix4fv(teapot_shader.view_uniform, false, view_matrix);
  gl.uniformMatrix4fv(teapot_shader.normal_model_uniform, false, normal_model_matrix);
  gl.uniformMatrix4fv(teapot_shader.normal_view_uniform, false, normal_view_matrix);
  gl.uniformMatrix4fv(teapot_shader.projection_uniform, false, projection_matrix);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, skybox_texture);
  gl.uniform1i(teapot_shader.cube_sampler, 0);

  gl.drawElements(gl.TRIANGLES, teapot_num_indices, gl.UNSIGNED_SHORT, 0);
}

/**
 * Draws the skybox.
 */
function render_skybox(view_matrix)
{
  var modelview_matrix = mat4.create();

  mat4.scale(modelview_matrix, view_matrix, vec3.fromValues(10.0, 10.0, 10.0));

  gl.useProgram(skybox_shader);

  gl.bindBuffer(gl.ARRAY_BUFFER, cube_vertex_buffer);
  gl.vertexAttribPointer(skybox_shader.vertex_attribute, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cube_index_buffer);

  gl.uniformMatrix4fv(skybox_shader.modelview_uniform, false, modelview_matrix);
  gl.uniformMatrix4fv(skybox_shader.projection_uniform, false, projection_matrix);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, skybox_texture);
  gl.uniform1i(skybox_shader.cube_sampler, 0);

  gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
}

/*
 *  Draw function. Is called every frame.
 */
function tick()
{
  requestAnimFrame(tick);
  draw();
}
