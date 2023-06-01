var gl;

function initGL(canvas) {
    try {
        gl = canvas.getContext("webgl2");
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch (e) {
    }
    if (!gl) {
        alert("Could not initialise WebGL, sorry :-(");
    }
}

function getShader(gl, id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
        return null;
    }
    var str ="";
    var k = shaderScript.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }
    var shader;
    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }
    gl.shaderSource(shader, str);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}


//adapted from http://learnwebgl.brown37.net/11_advanced_rendering/shadows.html
function createFrameBufferObject(gl, width, height) {
    var frameBuffer, depthBuffer;
	
    frameBuffer = gl.createFramebuffer();
    
    depthBuffer = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, depthBuffer);
	for(var i = 0; i < 6; i++) gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X+i, 0, gl.RGBA, width, height, 0,gl.RGBA, gl.UNSIGNED_BYTE, null);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	
    frameBuffer.depthBuffer = depthBuffer;
    frameBuffer.width = width;
    frameBuffer.height = height;

    return frameBuffer;
}

var shaderProgram;
var shadowMapShaderProgram;

function initShaders() {
    var fragmentShader = getShader(gl, "fs");
    var vertexShader = getShader(gl, "vs");
    shaderProgram = gl.createProgram();
    if (!shaderProgram) { alert("gak ok deh kakak");}
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }
    gl.useProgram(shaderProgram);
    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);
    shaderProgram.vertexTextureAttribute = gl.getAttribLocation(shaderProgram, "vTexCoord" );
    gl.enableVertexAttribArray( shaderProgram.vertexTextureAttribute );
    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
    shaderProgram.useLightingUniform = gl.getUniformLocation(shaderProgram, "uUseLighting");
    shaderProgram.useMaterialUniform = gl.getUniformLocation(shaderProgram, "uUseMaterial");
    shaderProgram.useTextureUniform = gl.getUniformLocation(shaderProgram, "uUseTexture");
    shaderProgram.ambientColorUniform = gl.getUniformLocation(shaderProgram, "uAmbientColor");
    shaderProgram.pointLightingLocationUniform = gl.getUniformLocation(shaderProgram, "uPointLightingLocation");
    shaderProgram.pointLightingSpecularColorUniform = gl.getUniformLocation(shaderProgram, "uPointLightingSpecularColor");
    shaderProgram.pointLightingDiffuseColorUniform = gl.getUniformLocation(shaderProgram, "uPointLightingDiffuseColor");
    shaderProgram.uMaterialAmbientColorUniform = gl.getUniformLocation(shaderProgram, "uMaterialAmbientColor");
    shaderProgram.uMaterialDiffuseColorUniform = gl.getUniformLocation(shaderProgram, "uMaterialDiffuseColor");
    shaderProgram.uMaterialSpecularColorUniform = gl.getUniformLocation(shaderProgram, "uMaterialSpecularColor");
    shaderProgram.uMaterialShininessUniform = gl.getUniformLocation(shaderProgram, "uMaterialShininess");
    shaderProgram.uFarPlaneUniform = gl.getUniformLocation(shaderProgram, "uFarPlane");
    shaderProgram.shadowMapUniform = gl.getUniformLocation(shaderProgram, "shadowmap");
    
    var shadowMapFragmentShader = getShader(gl, "fs-shadowmap");
    var shadowMapVertexShader = getShader(gl, "vs-shadowmap");
    shadowMapShaderProgram = gl.createProgram();
    gl.attachShader(shadowMapShaderProgram, shadowMapVertexShader);
    gl.attachShader(shadowMapShaderProgram, shadowMapFragmentShader);
    gl.linkProgram(shadowMapShaderProgram);
    if (!gl.getProgramParameter(shadowMapShaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }
    gl.useProgram(shadowMapShaderProgram);
    shadowMapShaderProgram.mvMatrixUniform = gl.getUniformLocation(shadowMapShaderProgram, "uMVMatrix");
    shadowMapShaderProgram.pMatrixUniform = gl.getUniformLocation(shadowMapShaderProgram, "uPMatrix");
    shadowMapShaderProgram.pointLightingLocationUniform = gl.getUniformLocation(shadowMapShaderProgram, "uPointLightingLocation");
    shadowMapShaderProgram.uFarPlaneUniform = gl.getUniformLocation(shadowMapShaderProgram, "uFarPlane");
    shadowMapShaderProgram.vertexPositionAttribute = gl.getAttribLocation(shadowMapShaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shadowMapShaderProgram.vertexPositionAttribute);
    
    gl.useProgram(shaderProgram);
}

var mvMatrix = mat4.create();
var mvMatrixStack = [];
var pMatrix = mat4.create();

function mvPushMatrix() {
    var copy = mat4.create();
    mat4.set(mvMatrix, copy);
    mvMatrixStack.push(copy);
}

function mvPopMatrix(shadow) {
    if (mvMatrixStack.length == 0) {
        throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();    
    if(shadow) {
		gl.uniformMatrix4fv(shadowMapShaderProgram.pMatrixUniform, false, pMatrix);
		gl.uniformMatrix4fv(shadowMapShaderProgram.mvMatrixUniform, false, mvMatrix);
	} else {
		gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
		gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
		var normalMatrix = mat3.create();
		mat4.toInverseMat3(mvMatrix, normalMatrix);
		mat3.transpose(normalMatrix);
		gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);
	}
}

function setMatrixUniforms(shadow) {
    if(shadow) {
		gl.uniformMatrix4fv(shadowMapShaderProgram.pMatrixUniform, false, pMatrix);
		gl.uniformMatrix4fv(shadowMapShaderProgram.mvMatrixUniform, false, mvMatrix);
	} else {
		gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
		gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
		var normalMatrix = mat3.create();
		mat4.toInverseMat3(mvMatrix, normalMatrix);
		mat3.transpose(normalMatrix);
		gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);
	}
}

function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

var cubeVertexPositionBuffer;
var cubeVertexNormalBuffer;
var cubeInsidesVertexNormalBuffer;
var cubeVertexIndexBuffer;
var cubeTextureBuffer;

var cylinderVertexPositionBuffer;
var cylinderVertexNormalBuffer;
var cylinderVertexIndexBuffer;
var cylinderTextureBuffer;

var sphereVertexPositionBuffer;
var sphereVertexNormalBuffer;
var sphereVertexIndexBuffer;
var sphereTextureBuffer;

var shadowFrameBuffer;

// ADD THESE LINES
var doorMaterial;
var octopusMaterial;
var catMaterial;
var carMaterial;
var humanMaterial;
// END ADD THESE LINES

var armMaterial;
var cameraMaterial;
var roomMaterial;

function initBuffers() {
    //DEFINING CUBE
    cubeVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
    vertices = [
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
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    cubeVertexPositionBuffer.itemSize = 3;
    cubeVertexPositionBuffer.numItems = 24;
    cubeVertexNormalBuffer = gl.createBuffer();
    cubeInsidesVertexNormalBuffer = gl.createBuffer();
    var vertexNormals = [
        // Front face
         0.0,  0.0,  1.0,
         0.0,  0.0,  1.0,
         0.0,  0.0,  1.0,
         0.0,  0.0,  1.0,
        // Back face
         0.0,  0.0, -1.0,
         0.0,  0.0, -1.0,
         0.0,  0.0, -1.0,
         0.0,  0.0, -1.0,
        // Top face
         0.0,  1.0,  0.0,
         0.0,  1.0,  0.0,
         0.0,  1.0,  0.0,
         0.0,  1.0,  0.0,
        // Bottom face
         0.0, -1.0,  0.0,
         0.0, -1.0,  0.0,
         0.0, -1.0,  0.0,
         0.0, -1.0,  0.0,
        // Right face
         1.0,  0.0,  0.0,
         1.0,  0.0,  0.0,
         1.0,  0.0,  0.0,
         1.0,  0.0,  0.0,
        // Left face
        -1.0,  0.0,  0.0,
        -1.0,  0.0,  0.0,
        -1.0,  0.0,  0.0,
        -1.0,  0.0,  0.0,
    ];
    var vertexInsidesNormals = [];
    for(var i = 0; i < vertexNormals.length; i++) {
        vertexInsidesNormals.push(vertexNormals[i] * -1);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormals), gl.STATIC_DRAW);
    cubeVertexNormalBuffer.itemSize = 3;
    cubeVertexNormalBuffer.numItems = 24;
    
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeInsidesVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexInsidesNormals), gl.STATIC_DRAW);
    cubeInsidesVertexNormalBuffer.itemSize = 3;
    cubeInsidesVertexNormalBuffer.numItems = 24;
    
    cubeVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
    var cubeVertexIndices = [
        0, 1, 2,      0, 2, 3,    // Front face
        4, 5, 6,      4, 6, 7,    // Back face
        8, 9, 10,     8, 10, 11,  // Top face
        12, 13, 14,   12, 14, 15, // Bottom face
        16, 17, 18,   16, 18, 19, // Right face
        20, 21, 22,   20, 22, 23  // Left face
    ];
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
    cubeVertexIndexBuffer.itemSize = 1;
    cubeVertexIndexBuffer.numItems = 36;
    
    var textureCubeCoords = [
      // Front face
      0.0, 0.0,
      1.0, 0.0,
      1.0, 1.0,
      0.0, 1.0,

      // Back face
      1.0, 0.0,
      1.0, 1.0,
      0.0, 1.0,
      0.0, 0.0,

      // Top face
      0.0, 1.0,
      0.0, 0.0,
      1.0, 0.0,
      1.0, 1.0,

      // Bottom face
      1.0, 1.0,
      0.0, 1.0,
      0.0, 0.0,
      1.0, 0.0,

      // Right face
      1.0, 0.0,
      1.0, 1.0,
      0.0, 1.0,
      0.0, 0.0,

      // Left face
      0.0, 0.0,
      1.0, 0.0,
      1.0, 1.0,
      0.0, 1.0,
    ];
    cubeTextureBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeTextureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCubeCoords), gl.STATIC_DRAW);
    cubeTextureBuffer.itemSize = 2;
    cubeTextureBuffer.numItems = 24;
        
    //DEFINING CYLINDER
    //try making it with 20 segments
    var segment = 20;
    var deltaTheta = Math.PI * 360 / (180 * segment);
    var x, z;
    var cylinderBotVertices = [0, 0, 0];
    var cylinderTopVertices = [0, 1, 0];
    var cylinderSideVertices = [];
    var cylinderBotNormals = [0.0, -1.0, 0.0];
    var cylinderTopNormals = [0.0, 1.0, 0.0];
    var cylinderSideNormals = [];
    var cylinderBotTopTextureCoordinates = [0.5, 0.5];
    var cylinderSideTextureCoordinates = [];
    for(var i = 0; i <= segment; i++) {
        x = Math.cos(deltaTheta * i);
        z = Math.sin(deltaTheta * i);
        
        cylinderBotVertices.push(x, 0, z);
        cylinderBotNormals.push(0.0, -1.0, 0.0);
        cylinderBotTopTextureCoordinates.push((x+1)/2, (z+1)/2);
        
        cylinderSideVertices.push(x, 0, z);
        cylinderSideNormals.push(x, 0, z);
        cylinderSideTextureCoordinates.push(i / segment, 0.0);
        cylinderSideVertices.push(x, 1, z);
        cylinderSideNormals.push(x, 0, z);
        cylinderSideTextureCoordinates.push(i / segment, 1.0);
        
        cylinderTopVertices.push(x, 1, z);
        cylinderTopNormals.push(0.0, 1.0, 0.0);
    }
    cylinderVertexPositionBuffer = gl.createBuffer();
    cylinderVertexNormalBuffer = gl.createBuffer();
    cylinderTextureBuffer = gl.createBuffer();
    var cylinderVertices = cylinderBotVertices.concat(cylinderSideVertices).concat(cylinderTopVertices);
    var cylinderNormals = cylinderBotNormals.concat(cylinderSideNormals).concat(cylinderTopNormals);
    var cylinderTextureCoordinates = cylinderBotTopTextureCoordinates.concat(cylinderSideTextureCoordinates).concat(cylinderBotTopTextureCoordinates);
    gl.bindBuffer(gl.ARRAY_BUFFER, cylinderVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cylinderVertices), gl.STATIC_DRAW);
    cylinderVertexPositionBuffer.itemSize = 3;
    cylinderVertexPositionBuffer.numItems = cylinderVertices.length / 3;
    
    gl.bindBuffer(gl.ARRAY_BUFFER, cylinderVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cylinderNormals), gl.STATIC_DRAW);
    cylinderVertexNormalBuffer.itemSize = 3;
    cylinderVertexNormalBuffer.numItems = cylinderNormals.length / 3;
    
    gl.bindBuffer(gl.ARRAY_BUFFER, cylinderTextureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cylinderTextureCoordinates), gl.STATIC_DRAW);
    cylinderTextureBuffer.itemSize = 2;
    cylinderTextureBuffer.numItems = cylinderTextureCoordinates.length / 2;
    
    var cylinderIndices = [];
    //bot vertices
    for(var i = 2; i < cylinderBotVertices.length / 3; i++) {
        cylinderIndices.push(0, i-1, i);
    }
    cylinderIndices.push(0, cylinderBotVertices.length/3-1, 1);
    var offset = cylinderBotVertices.length/3;
    //side vertices
    for(var i = 2; i < cylinderSideVertices.length/3; i++) {
        cylinderIndices.push(offset+i-2, offset+i-1, offset+i);
    }
    cylinderIndices.push(offset+cylinderSideVertices.length/3-2, offset+cylinderSideVertices.length/3-1, offset);
    cylinderIndices.push(offset+cylinderSideVertices.length/3-1, offset, offset+1);
    offset += cylinderSideVertices.length/3;
    for(var i = 2; i < cylinderTopVertices.length/3; i++) {
        cylinderIndices.push(offset, offset+i-1, offset+i);
    }
    cylinderIndices.push(offset, offset+cylinderTopVertices.length/3-1, offset+1);
    //console.log(cylinderVertices.length);
    //console.log(cylinderIndices);
    
    cylinderVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cylinderVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cylinderIndices), gl.STATIC_DRAW);
    cylinderVertexIndexBuffer.itemSize = 1;
    cylinderVertexIndexBuffer.numItems = cylinderIndices.length;
    
    //DEFINING SPHERE
    var latitudeBands = 30;
    var longitudeBands = 30;
    var radius = 0.5;
    var vertexPositionData = [];
    var normalData = [];
    for (var latNumber=0; latNumber <= latitudeBands; latNumber++) {
        var theta = latNumber * Math.PI / latitudeBands;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);
        for (var longNumber=0; longNumber <= longitudeBands; longNumber++) {
            var phi = longNumber * 2 * Math.PI / longitudeBands;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);
            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = sinPhi * sinTheta;
            var u = 1 - (longNumber / longitudeBands);
            var v = 1 - (latNumber / latitudeBands);
            normalData.push(-x);
            normalData.push(-y);
            normalData.push(-z);
            vertexPositionData.push(radius * x);
            vertexPositionData.push(radius * y);
            vertexPositionData.push(radius * z);
        }
    }
    var indexData = [];
    for (var latNumber=0; latNumber < latitudeBands; latNumber++) {
        for (var longNumber=0; longNumber < longitudeBands; longNumber++) {
            var first = (latNumber * (longitudeBands + 1)) + longNumber;
            var second = first + longitudeBands + 1;
            indexData.push(first);
            indexData.push(second);
            indexData.push(first + 1);
            indexData.push(second);
            indexData.push(second + 1);
            indexData.push(first + 1);
        }
    }
    sphereVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalData), gl.STATIC_DRAW);
    sphereVertexNormalBuffer.itemSize = 3;
    sphereVertexNormalBuffer.numItems = normalData.length / 3;
    sphereVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositionData), gl.STATIC_DRAW);
    sphereVertexPositionBuffer.itemSize = 3;
    sphereVertexPositionBuffer.numItems = vertexPositionData.length / 3;
    sphereVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STREAM_DRAW);
    sphereVertexIndexBuffer.itemSize = 1;
    sphereVertexIndexBuffer.numItems = indexData.length;
    
    //don't use textures for spheres. Thus, mark all as 0
    sphereTextureBuffer = gl.createBuffer();
    var sphereTextures = [];
    for(var i = 0; i < normalData.length / 3; i++) {
		sphereTextures.push(0.0, 0.0);
	}
	
	gl.bindBuffer(gl.ARRAY_BUFFER, sphereTextureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereTextures), gl.STATIC_DRAW);
    sphereTextureBuffer.itemSize = 2;
    sphereTextureBuffer.numItems = normalData.length / 3;
    
	shadowFrameBuffer = createFrameBufferObject(gl, 512, 512);
}

function initializeAtrributes() {
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
	gl.vertexAttribPointer(shadowMapShaderProgram.vertexPositionAttribute, cubeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, cubeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexNormalBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, cubeVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeTextureBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexTextureAttribute, cubeTextureBuffer.itemSize, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
}

function setupToDrawCube(shadow) {
	if(shadow) {
		gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
		gl.vertexAttribPointer(shadowMapShaderProgram.vertexPositionAttribute, cubeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
	} else {
		gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
		gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, cubeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexNormalBuffer);
		gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, cubeVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, cubeTextureBuffer);
		gl.vertexAttribPointer(shaderProgram.vertexTextureAttribute, cubeTextureBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
	}
}

function setupToDrawCubeInsides(shadow) {
	if(shadow) {
		gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
		gl.vertexAttribPointer(shadowMapShaderProgram.vertexPositionAttribute, cubeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
	} else {
		gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
		gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, cubeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, cubeInsidesVertexNormalBuffer);
		gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, cubeInsidesVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, cubeTextureBuffer);
		gl.vertexAttribPointer(shaderProgram.vertexTextureAttribute, cubeTextureBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
	}
}

function setupToDrawCylinder(shadow) {
	if(shadow) {
		gl.bindBuffer(gl.ARRAY_BUFFER, cylinderVertexPositionBuffer);
		gl.vertexAttribPointer(shadowMapShaderProgram.vertexPositionAttribute, cylinderVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cylinderVertexIndexBuffer);
	} else {
		gl.bindBuffer(gl.ARRAY_BUFFER, cylinderVertexPositionBuffer);
		gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, cylinderVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, cylinderVertexNormalBuffer);
		gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, cylinderVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, cylinderTextureBuffer);
		gl.vertexAttribPointer(shaderProgram.vertexTextureAttribute, cylinderTextureBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cylinderVertexIndexBuffer);
	}
}

function setupToDrawSphere(shadow) {
	if(shadow) {
		gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
		gl.vertexAttribPointer(shadowMapShaderProgram.vertexPositionAttribute, sphereVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereVertexIndexBuffer);
	} else {
		gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
		gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, sphereVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
		gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, sphereVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, sphereTextureBuffer);
		gl.vertexAttribPointer(shaderProgram.vertexTextureAttribute, sphereTextureBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereVertexIndexBuffer);
	}
}

function setupMaterialBrass() {
    gl.uniform3f(shaderProgram.uMaterialAmbientColorUniform, 0.329412, 0.223529, 0.027451);
    gl.uniform3f(shaderProgram.uMaterialDiffuseColorUniform, 0.780392, 0.568627, 0.113725);
    gl.uniform3f(shaderProgram.uMaterialSpecularColorUniform, 0.992157, 0.941176, 0.807843);
    gl.uniform1f(shaderProgram.uMaterialShininessUniform, 27.8974);
}

function setupMaterialBronze() {
    gl.uniform3f(shaderProgram.uMaterialAmbientColorUniform, 0.2125, 0.1275, 0.054);
    gl.uniform3f(shaderProgram.uMaterialDiffuseColorUniform, 0.714, 0.4284, 0.18144);
    gl.uniform3f(shaderProgram.uMaterialSpecularColorUniform, 0.393548, 0.271906, 0.166721);
    gl.uniform1f(shaderProgram.uMaterialShininessUniform, 25.6);
}

function setupMaterialChrome() {
    gl.uniform3f(shaderProgram.uMaterialAmbientColorUniform, 0.25, 0.25, 0.25);
    gl.uniform3f(shaderProgram.uMaterialDiffuseColorUniform, 0.4, 0.4, 0.4774597);
    gl.uniform3f(shaderProgram.uMaterialSpecularColorUniform, 0.774597, 0.271906, 0.774597);
    gl.uniform1f(shaderProgram.uMaterialShininessUniform, 76.8);
}

function setupMaterial(material, shadow) {
	if(!shadow) {
		gl.uniform1i(shaderProgram.useMaterialUniform, true);
		if(material == "brass") {
			setupMaterialBrass();
		} else if(material == "bronze") {
			setupMaterialBronze();
		} else if(material == "chrome") {
			setupMaterialChrome();
		} else if(material == "none") {
			setupMaterialChrome();
			gl.uniform1i(shaderProgram.useMaterialUniform, false);
		}
	}
}

function chooseTexture(i, shadow) {
	if(!shadow) gl.uniform1i(gl.getUniformLocation(shaderProgram, "thetexture"), i);
}
	

var animating = 1;

var lightSourceNode;
var roomNode;

// ADD THESE LINESE
var doorFrameLeftNode; var baseDoorAngle = 0;
var doorFrameBottomNode; 
var doorFrameTopNode; 
var doorInsideNode; var doorInsideAngle = 0; var doorInsideDirection = 1;
var doorHandleShortNode; var doorHandleAngle = 0; var doorHandleDirection = 1;
var doorHandleLongNode;

var baseOctopusNode; var baseOctopusAngle = 0;
var firstOctopusLegNode; var firstOctopusLegAngle = 0; var firstOctopusLegDirection = 1;
var firstOctopusLowerLegNode; var firstOctopusLowerLegAngle = 0; var firstOctopusLowerLegDirection = 1;
var secondOctopusLegNode; var secondOctopusLegAngle = 0; var secondOctopusLegDirection = 1;
var secondOctopusLowerLegNode; var secondOctopusLowerLegAngle = 0; var secondOctopusLowerLegDirection = 1;
var thirdOctopusLegNode; var thirdOctopusLegAngle = 0; var thirdOctopusLegDirection = 1;
var thirdOctopusLowerLegNode; var thirdOctopusLowerLegAngle = 0; var thirdOctopusLowerLegDirection = 1;
var fourthOctopusLegNode; var fourthOctopusLegAngle = 0; var fourthOctopusLegDirection = 1;
var fourthOctopusLowerLegNode; var fourthOctopusLowerLegAngle = 0; var fourthOctopusLowerLegDirection = 1;

var catHeadNode; var catHeadAngle = 0; var catHeadDirection = 1;
var catBodyNode; var catBodyAngle = 0; var catBodyDirection = 1;
var firstcatLegNode; var firstcatLegAngle = 0; var firstcatLegDirection = 1;
var secondcatLegNode; var secondcatLegAngle = 0; var secondcatLegDirection = 1;
var thirdcatLegNode; var thirdcatLegAngle = 0; var thirdcatLegDirection = 1;
var fourthcatLegNode; var fourthcatLegAngle = 0; var fourthcatLegDirection = 1;

var carBodyNode; var carBodyAngle = 0; var carBodyDirection = 1;
var carFrontNode;
var carFirstWheelNode; var carWheelAngle = 0;
var carSecondWheelNode; 
var carThirdWheelNode;
var carFourthWheelNode;

var humanRightLegNode; var humanRightLegAngle = 0;
var humanBodyNode;
var humanHeadNode; var humanHeadAngle = 0; var humanHeadDirection = 1;
var humanLeftLegNode; var humanLeftLegAngle = 0;
var humanRightArmNode; var humanRightArmAngle = 0; var humanRightArmDirection = 1;
var humanFaceNode; var humanFaceAngle = 0; var humanFaceDirection = 1;
var humanLeftArmNode; var humanLeftArmAngle = 0; var humanLeftArmDirection = 1;
// END ADD THESE LINES

function drawLightSource(shadow) {
    mvPushMatrix();
    //item specific modifications
    //draw
    setupToDrawSphere(shadow);
    setMatrixUniforms(shadow);
    chooseTexture(1, shadow);
    setupMaterial("bronze", shadow);
    gl.drawElements(gl.TRIANGLES, sphereVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix(shadow);
}

function drawRoom(shadow) {
    mvPushMatrix();
    //item specific modifications
    mat4.scale(mvMatrix, [16.0, 5.0, 30.0]);
    //draw
    setupToDrawCubeInsides(shadow);
    setMatrixUniforms(shadow);
    chooseTexture(1, shadow);
    setupMaterial(roomMaterial, shadow);
    gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix(shadow);
}

// ADD THESE LINES
//==================DRAW DOOR==================//
function drawDoorFrameLeft(shadow) {
    mvPushMatrix();
    //item specific modifications
    mat4.scale(mvMatrix, [0.25, 3.0, 0.25]);
    //draw
    setupToDrawCube(shadow);
    setMatrixUniforms(shadow);
    chooseTexture(2, shadow);
    setupMaterial(doorMaterial, shadow);
    gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix(shadow);
}

function drawDoorFrameBottom(shadow) {
    mvPushMatrix();
    //item specific modifications
    mat4.scale(mvMatrix, [2.0, 0.25, 0.25]);
    //draw
    setupToDrawCube(shadow);
    setMatrixUniforms(shadow);
    chooseTexture(2, shadow);
    setupMaterial(doorMaterial, shadow);
    gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix(shadow);
}

function drawDoorInside(shadow) {
    mvPushMatrix();
    //item specific modifications
    mat4.scale(mvMatrix, [1.75, 3.0, 0.25]);
    //draw
    setupToDrawCube(shadow);
    setMatrixUniforms(shadow);
    chooseTexture(8, shadow);
    setupMaterial(doorMaterial, shadow);
    gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix(shadow);
}

function drawDoorFrameTop(shadow) {
    mvPushMatrix();
    //item specific modifications
    mat4.scale(mvMatrix, [2.0, 0.25, 0.25]);
    //draw
    setupToDrawCube(shadow);
    setMatrixUniforms(shadow);
    chooseTexture(2, shadow);
    setupMaterial(doorMaterial, shadow);
    gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix(shadow);
}

function drawHandleShort(shadow) {
    mvPushMatrix();
    //item specific modifications
    mat4.scale(mvMatrix, [0.25, 0.25, 0.25]);
    //draw
    setupToDrawCube(shadow);
    setMatrixUniforms(shadow);
    chooseTexture(2, shadow);
    setupMaterial(doorMaterial, shadow);
    gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix(shadow);
}

function drawHandleLong(shadow) {
    mvPushMatrix();
    //item specific modifications
    mat4.scale(mvMatrix, [0.75, 0.25, 0.25]);
    //draw
    setupToDrawCube(shadow);
    setMatrixUniforms(shadow);
    chooseTexture(2, shadow);
    setupMaterial(doorMaterial, shadow);
    gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix(shadow);
}

//==================DRAW OCTOPUS==================//

function drawOctopusBase(shadow) {
    mvPushMatrix();
    //item specific modifications
    mat4.scale(mvMatrix, [1, 1.25, 1]);
    //draw
    setupToDrawCube(shadow);
    setMatrixUniforms(shadow);
    chooseTexture(2, shadow);
    setupMaterial(octopusMaterial, shadow);
    gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix(shadow);
}

function drawOctopusLeg(shadow) {
    mvPushMatrix();
    //item specific modifications
    mat4.scale(mvMatrix, [0.2, 1, 0.2]);
    //draw
    setupToDrawCube(shadow);
    setMatrixUniforms(shadow);
    chooseTexture(1, shadow);
    setupMaterial(octopusMaterial, shadow);
    gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix(shadow);
}

function drawOctopusLowerLeg(shadow) {
    mvPushMatrix();
    //item specific modifications
    mat4.scale(mvMatrix, [0.2, 1, 0.2]);
    //draw
    setupToDrawCube(shadow);
    setMatrixUniforms(shadow);
    chooseTexture(1, shadow);
    setupMaterial(octopusMaterial, shadow);
    gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix(shadow);
}


//==================DRAW CAT==================//

function drawcatHead(shadow){
    mvPushMatrix();
    //item specific modifications
    mat4.scale(mvMatrix, [0.6, 0.6, 0.6]);
    //draw
    setupToDrawCube(shadow);
    setMatrixUniforms(shadow);
    chooseTexture(8, shadow);
    setupMaterial(catMaterial, shadow);
    gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix(shadow);
}

function drawcatBody(shadow){
    mvPushMatrix();
    //item specific modifications
    mat4.scale(mvMatrix, [0.8, 0.8, 1.6]);
    //draw
    setupToDrawCube(shadow);
    setMatrixUniforms(shadow);
    chooseTexture(2, shadow);
    setupMaterial(catMaterial, shadow);
    gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix(shadow);
}

function drawcatLeg(shadow){
    mvPushMatrix();
    //item specific modifications
    mat4.scale(mvMatrix, [0.2, 0.4, 0.2]);
    //draw
    setupToDrawCube(shadow);
    setMatrixUniforms(shadow);
    chooseTexture(8, shadow);
    setupMaterial(catMaterial, shadow);
    gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix(shadow);
}

//==================DRAW CAR==================//

function drawCarBody(shadow){
    mvPushMatrix();
    //item specific modifications
    mat4.scale(mvMatrix, [1.5, 0.5, 0.75]);
    //draw
    setupToDrawCube(shadow);
    setMatrixUniforms(shadow);
    chooseTexture(8, shadow);
    setupMaterial(carMaterial, shadow);
    gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix(shadow);
}

function drawCarFront(shadow){
    mvPushMatrix();
    //item specific modifications
    mat4.scale(mvMatrix, [0.25, 0.25, 0.75]);
    //draw
    setupToDrawCube(shadow);
    setMatrixUniforms(shadow);
    chooseTexture(8, shadow);
    setupMaterial(carMaterial, shadow);
    gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix(shadow);
}

function drawCarWheel(shadow){
    mvPushMatrix();
    //item specific modifications
    mat4.scale(mvMatrix, [0.3, 0.2, 0.3]);
    //draw
    setupToDrawCylinder(shadow)
    setMatrixUniforms(shadow);
    chooseTexture(1, shadow);
    setupMaterial(carMaterial, shadow);
    gl.drawElements(gl.TRIANGLES, cylinderVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix(shadow);
}

//======================DRAW HUMAN=========================//

function drawHumanLeg(shadow) {
    mvPushMatrix();
    //item specific modifications
    mat4.scale(mvMatrix, [0.3, 1.0, 0.3]);
    //draw
    setupToDrawCube(shadow);
    setMatrixUniforms(shadow);
    chooseTexture(2, shadow);
    setupMaterial(humanMaterial, shadow);
    gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix(shadow);
}

function drawHumanBody(shadow) {
    mvPushMatrix();
    //item specific modifications
    mat4.scale(mvMatrix, [1.5, 1.5, 0.5]);
    //draw
    setupToDrawCube(shadow);
    setMatrixUniforms(shadow);
    chooseTexture(8, shadow);
    setupMaterial(humanMaterial, shadow);
    gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix(shadow);
}

function drawHumanHead(shadow) {
    mvPushMatrix();
    //item specific modifications
    mat4.scale(mvMatrix, [0.75, 0.75, 0.75]);
    //draw
    setupToDrawCube(shadow);
    setMatrixUniforms(shadow);
    chooseTexture(7, shadow);
    setupMaterial(humanMaterial, shadow);
    gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix(shadow);
}

function drawHumanHand(shadow) {
    mvPushMatrix();
    //item specific modifications
    mat4.scale(mvMatrix, [0.3, 1.0, 0.3]);
    //draw
    setupToDrawCube(shadow);
    setMatrixUniforms(shadow);
    chooseTexture(6, shadow);
    setupMaterial(humanMaterial, shadow);
    gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix(shadow);
}

// END ADD THESE LINES

function initObjectTree() {
    lightSourceNode = {"draw" : drawLightSource, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(lightSourceNode.matrix, [document.getElementById("lightPositionX").value / 10.0, document.getElementById("lightPositionY").value / 10.0, document.getElementById("lightPositionZ").value / 10.0]);
    
    roomNode = {"draw" : drawRoom, "matrix" : mat4.identity(mat4.create())};
    
    // ADD THESE LINES
    //==================DOOR==================//
    doorFrameLeftNode = {"draw" : drawDoorFrameLeft, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(doorFrameLeftNode.matrix, [10.0, -1.0, 0.0]);
    mat4.rotate(doorFrameLeftNode.matrix, baseDoorAngle, [0.0, 1.0, 0.0]);

    doorFrameBottomNode = {"draw" : drawDoorFrameBottom, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(doorFrameBottomNode.matrix, [1.75, -3.25, 0.0]);

    doorInsideNode = {"draw" : drawDoorInside, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(doorInsideNode.matrix, [2.25, 3.25, 0.0]);
    mat4.rotate(doorInsideNode.matrix, doorInsideAngle, [0.0, 1.0, 0.0]);
    mat4.translate(doorInsideNode.matrix, [-2.0, 0.0, 0.0]);

    doorFrameTopNode = {"draw" : drawDoorFrameTop, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(doorFrameTopNode.matrix, [1.75, 3.25, 0.0]);

    doorHandleShortNode = {"draw" : drawHandleShort, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(doorHandleShortNode.matrix, [-1.5, 0, -0.5]);
    mat4.rotate(doorHandleShortNode.matrix, doorHandleAngle, [0.0, 0.0, 1.0]);

    doorHandleLongNode = {"draw" : drawHandleLong, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(doorHandleLongNode.matrix, [0.5, 0, -0.5]);

    //==================OCTOPUS==================//    
    baseOctopusNode = {"draw" : drawOctopusBase, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(baseOctopusNode.matrix, [-8.0, 1.0, 0.0]);
    mat4.rotate(baseOctopusNode.matrix, baseOctopusAngle, [0.0, 1.0, 0.0]);
    
    firstOctopusLegNode = {"draw" : drawOctopusLeg, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(firstOctopusLegNode.matrix, [0.45, -1, 0.45]);
    mat4.rotate(firstOctopusLegNode.matrix, firstOctopusLegAngle, [-1.0, 0.0, 1.0]);
    mat4.translate(firstOctopusLegNode.matrix, [0.0, -1, 0.0]);
    
    secondOctopusLegNode = {"draw" : drawOctopusLeg, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(secondOctopusLegNode.matrix, [-0.45, -1, 0.45]);
    mat4.rotate(secondOctopusLegNode.matrix, secondOctopusLegAngle, [-1.0, 0.0, -1.0]);
    mat4.translate(secondOctopusLegNode.matrix, [0.0, -1, 0.0]);
    
    thirdOctopusLegNode = {"draw" : drawOctopusLeg, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(thirdOctopusLegNode.matrix, [0.45, -1, -0.45]);
    mat4.rotate(thirdOctopusLegNode.matrix, thirdOctopusLegAngle, [1.0, 0.0, 1.0]);
    mat4.translate(thirdOctopusLegNode.matrix, [0.0, -1, 0.0]);

    fourthOctopusLegNode = {"draw" : drawOctopusLeg, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(fourthOctopusLegNode.matrix, [-0.45, -1, -0.45]);
    mat4.rotate(fourthOctopusLegNode.matrix, fourthOctopusLegAngle, [1.0, 0.0, -1.0]);
    mat4.translate(fourthOctopusLegNode.matrix, [0.0, -1, 0.0]);

    firstOctopusLowerLegNode = {"draw" : drawOctopusLowerLeg, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(firstOctopusLowerLegNode.matrix, [0, -1, 0]);
    mat4.rotate(firstOctopusLowerLegNode.matrix, firstOctopusLowerLegAngle, [-1.0, 0.0, 1.0]);
    mat4.translate(firstOctopusLowerLegNode.matrix, [0, -1, 0]);
    
    secondOctopusLowerLegNode = {"draw" : drawOctopusLowerLeg, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(secondOctopusLowerLegNode.matrix, [0, -1, 0]);
    mat4.rotate(secondOctopusLowerLegNode.matrix, secondOctopusLowerLegAngle, [-1.0, 0.0, -1.0]);
    mat4.translate(secondOctopusLowerLegNode.matrix, [0, -1, 0]);
    
    thirdOctopusLowerLegNode = {"draw" : drawOctopusLowerLeg, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(thirdOctopusLowerLegNode.matrix, [0, -1, 0]);
    mat4.rotate(thirdOctopusLowerLegNode.matrix, thirdOctopusLowerLegAngle, [1.0, 0.0, 1.0]);
    mat4.translate(thirdOctopusLowerLegNode.matrix, [0, -1, 0]);

    fourthOctopusLowerLegNode = {"draw" : drawOctopusLowerLeg, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(fourthOctopusLowerLegNode.matrix, [0, -1, 0]);
    mat4.rotate(fourthOctopusLowerLegNode.matrix, fourthOctopusLowerLegAngle, [1.0, 0.0, -1.0]);
    mat4.translate(fourthOctopusLowerLegNode.matrix, [0, -1, 0]);

    
    //==================CAT==================//

    catHeadNode = {"draw" : drawcatHead, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(catHeadNode.matrix, [0.0, 0.4, 1.4]); 
    mat4.rotate(catHeadNode.matrix, catHeadAngle, [1.0, 0.0, 0.0]);
    mat4.translate(catHeadNode.matrix, [0.0, 0.0, 0.75]); 

    catBodyNode = {"draw" : drawcatBody, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(catBodyNode.matrix, [-1.0, -3.0, 0]); 
    mat4.rotate(catBodyNode.matrix, catBodyAngle, [0.0, 1.0, 0.0]);
    
    firstcatLegNode = {"draw" : drawcatLeg, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(firstcatLegNode.matrix, [0.5, -1.2 , -1.25]); 

    secondcatLegNode = {"draw" : drawcatLeg, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(secondcatLegNode.matrix, [-0.5, -1.2 , -1.25]); 

    thirdcatLegNode = {"draw" : drawcatLeg, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(thirdcatLegNode.matrix, [0.5, -1.2 , 1.25]);

    fourthcatLegNode = {"draw" : drawcatLeg, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(fourthcatLegNode.matrix, [-0.5, -1.2 , 1.25]);

    //==================CAR==================//
    carBodyNode = {"draw" : drawCarBody, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(carBodyNode.matrix, [-5.0, -4.0, 4.0]);
    mat4.rotate(carBodyNode.matrix, carBodyAngle, [0.0, 1.0, 0.0]);

    carFrontNode = {"draw" : drawCarFront, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(carFrontNode.matrix, [1.75, -0.25, 0.0]);

    carFirstWheelNode = {"draw" : drawCarWheel, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(carFirstWheelNode.matrix, [1.0, -0.5, 0.75]);
    mat4.rotate(carFirstWheelNode.matrix, Math.PI/2, [1.0, 0.0, 0.0]);

    carSecondWheelNode = {"draw" : drawCarWheel, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(carSecondWheelNode.matrix, [1.0, -0.5, -0.9]);
    mat4.rotate(carSecondWheelNode.matrix, Math.PI/2, [1.0, 0.0, 0.0]);

    carThirdWheelNode = {"draw" : drawCarWheel, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(carThirdWheelNode.matrix, [-1.0, -0.5, 0.75]);
    mat4.rotate(carThirdWheelNode.matrix, Math.PI/2, [1.0, 0.0, 0.0]);

    carFourthWheelNode = {"draw" : drawCarWheel, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(carFourthWheelNode.matrix, [-1.0, -0.5, -0.9]);
    mat4.rotate(carFourthWheelNode.matrix, Math.PI/2, [1.0, 0.0, 0.0]);
    
    //==================HUMAN==================//
    
    humanRightLegNode = {"draw" : drawHumanLeg, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(humanRightLegNode.matrix, [4.5, -3.5, -5.5]);
    mat4.rotate(humanRightLegNode.matrix, humanRightLegAngle, [0.0, 1.0, 0.0]);
    
    humanLeftLegNode = {"draw" : drawHumanLeg, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(humanLeftLegNode.matrix, [-1.5, 0, 0]);
    
    humanBodyNode = {"draw" : drawHumanBody, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(humanBodyNode.matrix, [-0.65, 2.5, 0.0]);
    
    humanRightArmNode = {"draw" : drawHumanHand, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(humanRightArmNode.matrix, [1.2, 2.75, 0]);
    
    humanLeftArmNode = {"draw" : drawHumanHand, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(humanLeftArmNode.matrix, [-2.5, 2.75, 0]);
    
    humanHeadNode = {"draw" : drawHumanHead, "matrix" : mat4.identity(mat4.create())};
    mat4.translate(humanHeadNode.matrix, [-0.7, 4.75, 0.0]);    

    // END ADD THESE LINES

    // ADD THESE LINES
    doorFrameLeftNode.child = doorFrameBottomNode;
    doorFrameBottomNode.sibling = doorFrameTopNode
    doorFrameBottomNode.child = doorInsideNode;
    doorInsideNode.child = doorHandleShortNode;
    doorHandleShortNode.child = doorHandleLongNode;

    doorFrameLeftNode.sibling = baseOctopusNode;
    baseOctopusNode.child = firstOctopusLegNode;
    firstOctopusLegNode.sibling = secondOctopusLegNode;
    firstOctopusLegNode.child = firstOctopusLowerLegNode;
    secondOctopusLegNode.sibling = thirdOctopusLegNode;
    secondOctopusLegNode.child = secondOctopusLowerLegNode;
    thirdOctopusLegNode.sibling = fourthOctopusLegNode;
    thirdOctopusLegNode.child = thirdOctopusLowerLegNode;
    fourthOctopusLegNode.child = fourthOctopusLowerLegNode;

    baseOctopusNode.sibling = catBodyNode;
    catBodyNode.child = catHeadNode;
    catHeadNode.sibling = firstcatLegNode;
    firstcatLegNode.sibling = secondcatLegNode;
    secondcatLegNode.sibling = thirdcatLegNode;
    thirdcatLegNode.sibling = fourthcatLegNode;

    catBodyNode.sibling = carBodyNode;
    carBodyNode.child = carFrontNode;
    carFrontNode.sibling = carFirstWheelNode;
    carFirstWheelNode.sibling = carSecondWheelNode;
    carSecondWheelNode.sibling = carThirdWheelNode;
    carThirdWheelNode.sibling = carFourthWheelNode;

    carBodyNode.sibling = humanRightLegNode;
    humanRightLegNode.child = humanBodyNode;
    humanBodyNode.sibling = humanHeadNode;
    humanHeadNode.sibling = humanLeftLegNode;
    humanLeftLegNode.sibling = humanRightArmNode;
    humanRightArmNode.sibling = humanLeftArmNode;
    // END ADD THESE LINES
}

function traverse(node, shadow) {
    mvPushMatrix();
    //modifications
    mat4.multiply(mvMatrix, node.matrix);
    //draw
    node.draw(shadow);
    if("child" in node) traverse(node.child, shadow);
    mvPopMatrix(shadow);
    if("sibling" in node) traverse(node.sibling, shadow);
}

var shadowMapLookAtMatrix = mat4.create();
var shadowMapPerspectiveMatrix = mat4.create();
var shadowMapTransform = mat4.create();

// a representation of vector 3
// taken from http://learnwebgl.brown37.net/lib/learn_webgl_vector3.js
var Vector3 = function () {

	var self = this;

	/** ---------------------------------------------------------------------
	* Create a new 3-component vector.
	* @param dx Number The change in x of the vector.
	* @param dy Number The change in y of the vector.
	* @param dz Number The change in z of the vector.
	* @return Float32Array A new 3-component vector
	*/
	self.create = function (dx, dy, dz) {
		var v = new Float32Array(3);
		v[0] = 0;
		v[1] = 0;
		v[2] = 0;
		if (arguments.length >= 1) { v[0] = dx; }
		if (arguments.length >= 2) { v[1] = dy; }
		if (arguments.length >= 3) { v[2] = dz; }
		return v;
	};

	/** ---------------------------------------------------------------------
	* Create a new 3-component vector and set its components equal to an existing vector.
	* @param from Float32Array An existing vector.
	* @return Float32Array A new 3-component vector with the same values as "from"
	*/
	self.createFrom = function (from) {
		var v = new Float32Array(3);
		v[0] = from[0];
		v[1] = from[1];
		v[2] = from[2];
		return v;
	};

	/** ---------------------------------------------------------------------
	* Create a vector using two existing points.
	* @param tail Float32Array A 3-component point.
	* @param head Float32Array A 3-component point.
	* @return Float32Array A new 3-component vector defined by 2 points
	*/
	self.createFrom2Points = function (tail, head) {
		var v = new Float32Array(3);
		self.subtract(v, head, tail);
		return v;
	};

	/** ---------------------------------------------------------------------
	* Copy a 3-component vector into another 3-component vector
	* @param to Float32Array A 3-component vector that you want changed.
	* @param from Float32Array A 3-component vector that is the source of data
	* @returns Float32Array The "to" 3-component vector
	*/
	self.copy = function (to, from) {
		to[0] = from[0];
		to[1] = from[1];
		to[2] = from[2];
		return to;
	};

	/** ---------------------------------------------------------------------
	* Set the components of a 3-component vector.
	* @param v Float32Array The vector to change.
	* @param dx Number The change in x of the vector.
	* @param dy Number The change in y of the vector.
	* @param dz Number The change in z of the vector.
	*/
	self.set = function (v, dx, dy, dz) {
		v[0] = dx;
		v[1] = dy;
		v[2] = dz;
	};

	/** ---------------------------------------------------------------------
	* Calculate the length of a vector.
	* @param v Float32Array A 3-component vector.
	* @return Number The length of a vector
	*/
	self.length = function (v) {
		return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
	};

	/** ---------------------------------------------------------------------
	* Make a vector have a length of 1.
	* @param v Float32Array A 3-component vector.
	* @return Float32Array The input vector normalized to unit length. Or null if the vector is zero length.
	*/
	self.normalize = function (v) {
		var length, percent;

		length = self.length(v);
		if (Math.abs(length) < 0.0000001) {
		  return null; // Invalid vector
		}

		percent = 1.0 / length;
		v[0] = v[0] * percent;
		v[1] = v[1] * percent;
		v[2] = v[2] * percent;
		return v;
	};

	/** ---------------------------------------------------------------------
	* Add two vectors:  result = V0 + v1
	* @param result Float32Array A 3-component vector.
	* @param v0 Float32Array A 3-component vector.
	* @param v1 Float32Array A 3-component vector.
	*/
	self.add = function (result, v0, v1) {
		result[0] = v0[0] + v1[0];
		result[1] = v0[1] + v1[1];
		result[2] = v0[2] + v1[2];
	};

	/** ---------------------------------------------------------------------
	* Subtract two vectors:  result = v0 - v1
	* @param result Float32Array A 3-component vector.
	* @param v0 Float32Array A 3-component vector.
	* @param v1 Float32Array A 3-component vector.
	*/
	self.subtract = function (result, v0, v1) {
	result[0] = v0[0] - v1[0];
	result[1] = v0[1] - v1[1];
	result[2] = v0[2] - v1[2];
	};

	/** ---------------------------------------------------------------------
	* Scale a vector:  result = s * v0
	* @param result Float32Array A 3-component vector.
	* @param v0 Float32Array A 3-component vector.
	* @param s Number A scale factor.
	*/
	self.scale = function (result, v0, s) {
		result[0] = v0[0] * s;
		result[1] = v0[1] * s;
		result[2] = v0[2] * s;
	};

	/** ---------------------------------------------------------------------
	* Calculate the cross product of 2 vectors: result = v0 x v1 (order matters)
	* @param result Float32Array A 3-component vector.
	* @param v0 Float32Array A 3-component vector.
	* @param v1 Float32Array A 3-component vector.
	*/
	self.crossProduct = function (result, v0, v1) {
		result[0] = v0[1] * v1[2] - v0[2] * v1[1];
		result[1] = v0[2] * v1[0] - v0[0] * v1[2];
		result[2] = v0[0] * v1[1] - v0[1] * v1[0];
	};

	/** ---------------------------------------------------------------------
	* Calculate the dot product of 2 vectors
	* @param v0 Float32Array A 3-component vector.
	* @param v1 Float32Array A 3-component vector.
	* @return Number Float32Array The dot product of v0 and v1
	*/
	self.dotProduct = function (v0, v1) {
		return v0[0] * v1[0] + v0[1] * v1[1] + v0[2] * v1[2];
	};

	/** ---------------------------------------------------------------------
	* Print a vector on the console.
	* @param name String A description of the vector to be printed.
	* @param v Float32Array A 3-component vector.
	*/
	self.print = function (name, v) {
		var maximum, order, digits;

		maximum = Math.max(v[0], v[1], v[2]);
		order = Math.floor(Math.log(maximum) / Math.LN10 + 0.000000001);
		digits = (order <= 0) ? 5 : (order > 5) ? 0 : (5 - order);

		console.log("Vector3: " + name + ": " + v[0].toFixed(digits) + " "
											  + v[1].toFixed(digits) + " "
											  + v[2].toFixed(digits));
	};
};

var V = new Vector3();
var center = V.create();
var eye = V.create();
var up = V.create();
var u = V.create();
var v = V.create();
var n = V.create();

// a method to generate lookat matrix
// taken from http://learnwebgl.brown37.net/lib/learn_webgl_matrix.js because mat4.lookat seems buggy
lookAt = function (M, eye_x, eye_y, eye_z, center_x, center_y, center_z, up_dx, up_dy, up_dz) {

    // Local coordinate system for the camera:
    //   u maps to the x-axis
    //   v maps to the y-axis
    //   n maps to the z-axis

    V.set(center, center_x, center_y, center_z);
    V.set(eye, eye_x, eye_y, eye_z);
    V.set(up, up_dx, up_dy, up_dz);

    V.subtract(n, eye, center);  // n = eye - center
    V.normalize(n);

    V.crossProduct(u, up, n);
    V.normalize(u);

    V.crossProduct(v, n, u);
    V.normalize(v);

    var tx = - V.dotProduct(u,eye);
    var ty = - V.dotProduct(v,eye);
    var tz = - V.dotProduct(n,eye);

    // Set the camera matrix
    M[0] = u[0];  M[4] = u[1];  M[8]  = u[2];  M[12] = tx;
    M[1] = v[0];  M[5] = v[1];  M[9]  = v[2];  M[13] = ty;
    M[2] = n[0];  M[6] = n[1];  M[10] = n[2];  M[14] = tz;
    M[3] = 0;     M[7] = 0;     M[11] = 0;     M[15] = 1;
};

//draws shadowmap for the side of the texture
//0: positive x, ..., 5: negative z
function drawShadowMap(side) {
	var centers = [
		1.0, 0.0,  0.0, //positive x
		-1.0, 0.0, 0.0, //negative x
		0.0,  1.0, 0.0, //positive y
		0.0, -1.0, 0.0, //negative y
		0.0, 0.0, 1.0, //positive z
		0.0, 0.0, -1.0, //negative z
	];
	
	var upVectors = [
		0.0, -1.0,  0.0, //positive x
		0.0, -1.0, 0.0, //negative x
		0.0, 0.0, 1.0, //positive y
		0.0, 0.0, -1.0, //negative y
		0.0, -1.0, 0.0, //positive z
		0.0, -1.0, 0.0, //negative z
	];
	gl.useProgram(shadowMapShaderProgram);
	gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFrameBuffer);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X+side, shadowFrameBuffer.depthBuffer, 0);
	
	gl.viewport(0, 0, shadowFrameBuffer.width, shadowFrameBuffer.height);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	shadowMapLookAtMatrix = mat4.create();
	lookAt(shadowMapLookAtMatrix,
                  parseFloat(document.getElementById("lightPositionX").value / 10.0),
				  parseFloat(document.getElementById("lightPositionY").value / 10.0),
				  parseFloat(document.getElementById("lightPositionZ").value / 10.0),
                  parseFloat(document.getElementById("lightPositionX").value / 10.0)+centers[side*3], 
                  parseFloat(document.getElementById("lightPositionY").value / 10.0)+centers[side*3+1], 
                  parseFloat(document.getElementById("lightPositionZ").value / 10.0)+centers[side*3+2],
                  upVectors[side*3],
                  upVectors[side*3+1],
                  upVectors[side*3+2]);
    mat4.perspective(90, shadowFrameBuffer.width / shadowFrameBuffer.height, 0.1, 100.0, shadowMapTransform);
    mat4.multiply(shadowMapTransform, shadowMapLookAtMatrix);
    mat4.set(shadowMapTransform, pMatrix);
    
    gl.uniform3f(
        shadowMapShaderProgram.pointLightingLocationUniform,
        parseFloat(document.getElementById("lightPositionX").value / 10.0),
        parseFloat(document.getElementById("lightPositionY").value / 10.0),
        parseFloat(document.getElementById("lightPositionZ").value / 10.0)
    );
    gl.uniform1f(shadowMapShaderProgram.uFarPlaneUniform, 100.0);
    
    mat4.identity(mvMatrix);
    traverse(roomNode, true);
    mat4.translate(mvMatrix, [0, 0, -20]);
    traverse(doorFrameLeftNode, true);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER,  null);
}

var lookAtMatrix;
function drawScene() {
	lookAtMatrix = mat4.create();
	gl.useProgram(shaderProgram);
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    pMatrix = mat4.create();
    lookAt(lookAtMatrix,
		  0.0, 0.0, 0.0,
		  0.0, 0.0, -10.0,
		  0.0, 1.0, 0.0);
    var cameraZoom = document.getElementById("cameraZoom").value
    mat4.perspective(cameraZoom, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);
    mat4.multiply(pMatrix, lookAtMatrix);
    
    gl.uniform1i(shaderProgram.useLightingUniform, document.getElementById("lighting").checked);
	gl.uniform1i(shaderProgram.useTextureUniform, document.getElementById("texture").checked);
	
    gl.uniform3f(
        shaderProgram.ambientColorUniform,
        parseFloat(document.getElementById("ambientR").value),
        parseFloat(document.getElementById("ambientG").value),
        parseFloat(document.getElementById("ambientB").value)
    );
    gl.uniform3f(
        shaderProgram.pointLightingLocationUniform,
        parseFloat(document.getElementById("lightPositionX").value / 10.0),
        parseFloat(document.getElementById("lightPositionY").value / 10.0),
        parseFloat(document.getElementById("lightPositionZ").value / 10.0)
    );
    gl.uniform3f(
        shaderProgram.pointLightingDiffuseColorUniform,
        parseFloat(document.getElementById("pointR").value),
        parseFloat(document.getElementById("pointG").value),
        parseFloat(document.getElementById("pointB").value)
    );
    gl.uniform3f(
        shaderProgram.pointLightingSpecularColorUniform,
        parseFloat(document.getElementById("pointR").value),
        parseFloat(document.getElementById("pointG").value),
        parseFloat(document.getElementById("pointB").value)
    );
    
    gl.activeTexture(gl.TEXTURE31);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, shadowFrameBuffer.depthBuffer);
    gl.uniform1i(shaderProgram.shadowMapUniform, 31);
    
    gl.uniform1f(shaderProgram.uFarPlaneUniform, 100.0);
    
    mat4.identity(mvMatrix);
    traverse(lightSourceNode, false);
    traverse(roomNode, false);
    
    mat4.translate(mvMatrix, [0, 0, -20]);
    traverse(doorFrameLeftNode, false);
    
}

function animate() {
    if (animating) {
        //var update = (0.05 * Math.PI * (timeNow - lastTime)/ 180); //use elapsed time, which is faulty on changing tabs
        var update = (0.05 * Math.PI * 10/ 180);
        
        // ADD THESE LINES
        // DOOR
        baseDoorAngle = (baseDoorAngle + update)%(2*Math.PI);
        document.getElementById("baseDoorRotationSlider").value = baseDoorAngle * 180 / (Math.PI);

        doorInsideAngle -= (update*1.5)*doorInsideDirection;
        if(doorInsideAngle > 0 && doorInsideDirection == -1) doorInsideDirection *= -1;
        if(doorInsideAngle < -Math.PI/3 && doorInsideDirection == 1) doorInsideDirection *= -1;
        document.getElementById("doorInsideRotationSlider").value = doorInsideAngle * 180 / (Math.PI);

        doorHandleAngle -= (update)*doorHandleDirection;
        if(doorHandleAngle > 0 && doorHandleDirection == -1) doorHandleDirection *= -1;
        if(doorHandleAngle < -Math.PI/4 && doorHandleDirection == 1) doorHandleDirection *= -1;
        document.getElementById("doorHandleRotationSlider").value = doorHandleAngle * 180 / (Math.PI);

        //OCTOPUS
        baseOctopusAngle = (baseOctopusAngle + update)%(2*Math.PI);
        document.getElementById("baseOctopusRotationSlider").value = baseOctopusAngle * 180 / (Math.PI);
        
        firstOctopusLegAngle += update*firstOctopusLegDirection;
        if(firstOctopusLegAngle < 0 && firstOctopusLegDirection == -1) firstOctopusLegDirection *= -1;
        if(firstOctopusLegAngle > Math.PI/2 && firstOctopusLegDirection == 1) firstOctopusLegDirection *= -1;
        document.getElementById("firstOctopusLegRotationSlider").value = firstOctopusLegAngle * 180 / (Math.PI);
        
        firstOctopusLowerLegAngle += -update*firstOctopusLegDirection;
        if(firstOctopusLowerLegAngle < -Math.PI/2 && firstOctopusLegDirection == -1)firstOctopusLegDirection *= -1;
        if(firstOctopusLowerLegAngle > 0 && firstOctopusLegDirection == 1) firstOctopusLegDirection *= -1;
        document.getElementById("firstOctopusLowerLegRotationSlider").value = firstOctopusLowerLegAngle * 180 / (Math.PI);
        
        secondOctopusLegAngle += update*secondOctopusLegDirection;
        if(secondOctopusLegAngle < 0 && secondOctopusLegDirection == -1) secondOctopusLegDirection *= -1;
        if(secondOctopusLegAngle > Math.PI/2 && secondOctopusLegDirection == 1) secondOctopusLegDirection *= -1;
        document.getElementById("secondOctopusLegRotationSlider").value = secondOctopusLegAngle * 180 / (Math.PI);
        
        secondOctopusLowerLegAngle += -update*secondOctopusLegDirection;
        if(secondOctopusLowerLegAngle < -Math.PI/2 && secondOctopusLegDirection == -1)secondOctopusLegDirection *= -1;
        if(secondOctopusLowerLegAngle > 0 && secondOctopusLegDirection == 1) secondOctopusLegDirection *= -1;
        document.getElementById("secondOctopusLowerLegRotationSlider").value = secondOctopusLowerLegAngle * 180 / (Math.PI);
        
        thirdOctopusLegAngle += update*thirdOctopusLegDirection;
        if(thirdOctopusLegAngle < 0 && thirdOctopusLegDirection == -1) thirdOctopusLegDirection *= -1;
        if(thirdOctopusLegAngle > Math.PI/2 && thirdOctopusLegDirection == 1) thirdOctopusLegDirection *= -1;
        document.getElementById("thirdOctopusLegRotationSlider").value = thirdOctopusLegAngle * 180 / (Math.PI);
        
        thirdOctopusLowerLegAngle += -update*thirdOctopusLegDirection;
        if(thirdOctopusLowerLegAngle < -Math.PI/2 && thirdOctopusLegDirection == -1)thirdOctopusLegDirection *= -1;
        if(thirdOctopusLowerLegAngle > 0 && thirdOctopusLegDirection == 1) thirdOctopusLegDirection *= -1;
        document.getElementById("thirdOctopusLowerLegRotationSlider").value = thirdOctopusLowerLegAngle * 180 / (Math.PI);
        
        fourthOctopusLegAngle += update*fourthOctopusLegDirection;
        if(fourthOctopusLegAngle < 0 && fourthOctopusLegDirection == -1) fourthOctopusLegDirection *= -1;
        if(fourthOctopusLegAngle > Math.PI/2 && fourthOctopusLegDirection == 1) fourthOctopusLegDirection *= -1;
        document.getElementById("fourthOctopusLegRotationSlider").value = fourthOctopusLegAngle * 180 / (Math.PI);
        
        fourthOctopusLowerLegAngle += -update*fourthOctopusLegDirection;
        if(fourthOctopusLowerLegAngle < -Math.PI/2 && fourthOctopusLegDirection == -1)fourthOctopusLegDirection *= -1;
        if(fourthOctopusLowerLegAngle > 0 && fourthOctopusLegDirection == 1) fourthOctopusLegDirection *= -1;
        document.getElementById("fourthOctopusLowerLegRotationSlider").value = fourthOctopusLowerLegAngle * 180 / (Math.PI);
        
        //==================cat==================//
        catBodyAngle = (catBodyAngle + update)%(2*Math.PI);
        document.getElementById("baseCatRotationSlider").value = catBodyAngle * 180 / (Math.PI);
        
        catHeadAngle -= (update)*catHeadDirection;
        if(catHeadAngle > Math.PI/12 && catHeadDirection == -1) catHeadDirection *= -1;
        if(catHeadAngle < -Math.PI/12 && catHeadDirection == 1) catHeadDirection *= -1;
        document.getElementById("catHeadRotationSlider").value = catHeadAngle * 180 / (Math.PI);

        //==================car==================//
        carBodyAngle = (carBodyAngle + update)%(2*Math.PI);
        document.getElementById("baseCarRotationSlider").value = carBodyAngle * 180 / (Math.PI);
        
        //==================human=================//
        humanRightLegAngle = (humanRightLegAngle + update)%(2*Math.PI);
        document.getElementById("baseHumanRotationSlider").value = humanRightLegAngle * 180 / (Math.PI);

        // END ADD THESE LINES

    }
    initObjectTree();
}

function tick() {
    requestAnimationFrame(tick);
    for(var i = 0; i < 6; i++) {
		drawShadowMap(i);
    }
    drawScene();
    animate();
}
    
function initInputs() {
    document.getElementById("animation").checked = true;
    document.getElementById("lighting").checked = true;
    document.getElementById("texture").checked = true;
    document.getElementById("animation").onchange = function() {
        animating ^= 1;
        if(animating) {
            document.getElementById("baseDoorRotationSlider").disabled = true;
            document.getElementById("doorInsideRotationSlider").disabled = true;
            document.getElementById("doorHandleRotationSlider").disabled = true;
            document.getElementById("baseOctopusRotationSlider").disabled = true;
            document.getElementById("firstOctopusLegRotationSlider").disabled = true;
            document.getElementById("firstOctopusLowerLegRotationSlider").disabled = true;
            document.getElementById("secondOctopusLegRotationSlider").disabled = true;
            document.getElementById("secondOctopusLowerLegRotationSlider").disabled = true;
            document.getElementById("thirdOctopusLegRotationSlider").disabled = true;
            document.getElementById("thirdOctopusLowerLegRotationSlider").disabled = true;
            document.getElementById("fourthOctopusLegRotationSlider").disabled = true;
            document.getElementById("fourthOctopusLowerLegRotationSlider").disabled = true;
            document.getElementById("baseCatRotationSlider").disabled = true;
            document.getElementById("catHeadRotationSlider").disabled = true;
            document.getElementById("baseCarRotationSlider").disabled = true;
            document.getElementById("baseHumanRotationSlider").disabled = true;
        } else {
            document.getElementById("baseDoorRotationSlider").disabled = false;
            document.getElementById("doorInsideRotationSlider").disabled = false;
            document.getElementById("doorHandleRotationSlider").disabled = false;
            document.getElementById("baseOctopusRotationSlider").disabled = false;
            document.getElementById("firstOctopusLegRotationSlider").disabled = false;
            document.getElementById("firstOctopusLowerLegRotationSlider").disabled = false;
            document.getElementById("secondOctopusLegRotationSlider").disabled = false;
            document.getElementById("secondOctopusLowerLegRotationSlider").disabled = false;
            document.getElementById("thirdOctopusLegRotationSlider").disabled = false;
            document.getElementById("thirdOctopusLowerLegRotationSlider").disabled = false;
            document.getElementById("fourthOctopusLegRotationSlider").disabled = false;
            document.getElementById("fourthOctopusLowerLegRotationSlider").disabled = false;
            document.getElementById("baseCatRotationSlider").disabled = false;
            document.getElementById("catHeadRotationSlider").disabled = false;
            document.getElementById("baseCarRotationSlider").disabled = false;
            document.getElementById("baseHumanRotationSlider").disabled = false;
        }
    };
    // ADD THESE LINES
    document.getElementById("door-material").onchange = function() {
        doorMaterial = document.getElementById("door-material").value;
    }
    document.getElementById("baseDoorRotationSlider").oninput = function() {
        baseDoorAngle = document.getElementById("baseDoorRotationSlider").value * Math.PI / 180;
    }
    document.getElementById("doorInsideRotationSlider").oninput = function() {
        doorInsideAngle = document.getElementById("doorInsideRotationSlider").value * Math.PI / 180;
    }
    document.getElementById("doorHandleRotationSlider").oninput = function() {
        doorHandleAngle = document.getElementById("doorHandleRotationSlider").value * Math.PI / 180;
    }
    document.getElementById("baseOctopusRotationSlider").oninput = function() {
        baseOctopusAngle = document.getElementById("baseOctopusRotationSlider").value * Math.PI / 180;
    }
    document.getElementById("firstOctopusLegRotationSlider").oninput = function() {
        firstOctopusLegAngle = document.getElementById("firstOctopusLegRotationSlider").value * Math.PI / 180;
    }
    document.getElementById("firstOctopusLowerLegRotationSlider").oninput = function() {
        firstOctopusLowerLegAngle = document.getElementById("firstOctopusLowerLegRotationSlider").value * Math.PI / 180;
    }
    document.getElementById("secondOctopusLegRotationSlider").oninput = function() {
        secondOctopusLegAngle = document.getElementById("secondOctopusLegRotationSlider").value * Math.PI / 180;
    }
    document.getElementById("secondOctopusLowerLegRotationSlider").oninput = function() {
        secondOctopusLowerLegAngle = document.getElementById("secondOctopusLowerLegRotationSlider").value * Math.PI / 180;
    }
    document.getElementById("thirdOctopusLegRotationSlider").oninput = function() {
        thirdOctopusLegAngle = document.getElementById("thirdOctopusLegRotationSlider").value * Math.PI / 180;
    }
    document.getElementById("thirdOctopusLowerLegRotationSlider").oninput = function() {
        thirdOctopusLowerLegAngle = document.getElementById("thirdOctopusLowerLegRotationSlider").value * Math.PI / 180;
    }
    document.getElementById("fourthOctopusLegRotationSlider").oninput = function() {
        fourthOctopusLegAngle = document.getElementById("fourthOctopusLegRotationSlider").value * Math.PI / 180;
    }
    document.getElementById("fourthOctopusLowerLegRotationSlider").oninput = function() {
        fourthOctopusLowerLegAngle = document.getElementById("fourthOctopusLowerLegRotationSlider").value * Math.PI / 180;
    }
    document.getElementById("octopus-material").onchange = function() {
        octopusMaterial = document.getElementById("octopus-material").value;
    }
    document.getElementById("cat-material").onchange = function() {
        catMaterial = document.getElementById("cat-material").value;
    }
    document.getElementById("car-material").onchange = function() {
        carMaterial = document.getElementById("car-material").value;
    }
    document.getElementById("human-material").onchange = function() {
        humanMaterial = document.getElementById("human-material").value;
    }
    document.getElementById("baseCatRotationSlider").oninput = function() {
        catBodyAngle = document.getElementById("baseCatRotationSlider").value * Math.PI / 180;
    }
    document.getElementById("catHeadRotationSlider").oninput = function() {
        catHeadAngle = document.getElementById("catHeadRotationSlider").value * Math.PI / 180;
    }
    document.getElementById("baseCarRotationSlider").oninput = function() {
        carBodyAngle = document.getElementById("baseCarRotationSlider").value * Math.PI / 180;
    }
    document.getElementById("baseHumanRotationSlider").oninput = function() {
        humanRightLegAngle = document.getElementById("baseHumanRotationSlider").value * Math.PI / 180;
    }
    // END ADD THESE LINES
    document.getElementById("room-material").onchange = function() {
        roomMaterial = document.getElementById("room-material").value;
    }
}

function configureTexture(image, textureno) {
    var texture = gl.createTexture();
    gl.activeTexture(textureno);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB,
         gl.RGB, gl.UNSIGNED_BYTE, image );
    gl.generateMipmap( gl.TEXTURE_2D );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
                      gl.NEAREST_MIPMAP_LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
    
}

function initTexture() {
    var image0 = new Image();
    image0.onload = function() {
       configureTexture(image0, gl.TEXTURE0);
    }
    image0.src = "img/arm_texture2.jpg"
    
    var image1 = new Image();
    image1.onload = function() {
       configureTexture(image1, gl.TEXTURE1);
    }
    image1.src = "img/wall2.jpg"
    
    var image2 = new Image();
    image2.onload = function() {
       configureTexture(image2, gl.TEXTURE2);
    }
    image2.src = "img/blue.jpg"
    
    var image3 = new Image();
    image3.onload = function() {
       configureTexture(image3, gl.TEXTURE3);
    }
    image3.src = "img/deep_blue.jpg"
    
    var image6 = new Image();
    image6.onload = function() {
       configureTexture(image6, gl.TEXTURE6);
    }
    image6.src = "img/black.jpg"
    
    var image7 = new Image();
    image7.onload = function() {
       configureTexture(image7, gl.TEXTURE7);
    }
    image7.src = "img/red.jpg"
    
    var image8 = new Image();
    image8.onload = function() {
       configureTexture(image8, gl.TEXTURE8);
    }
    image8.src = "img/glass.jpg"
}

function webGLStart() {
    var canvas = document.getElementById("canvas");
    canvas.height = window.innerHeight * 0.9;
    canvas.width = window.innerWidth;

    // ADD THESE LINES
    doorMaterial = document.getElementById("door-material").value;
    octopusMaterial = document.getElementById("octopus-material").value;
    catMaterial = document.getElementById("cat-material").value;
    carMaterial = document.getElementById("car-material").value;
    humanMaterial = document.getElementById("human-material").value;
    // END ADD THESE LINES

    initGL(canvas);
    initShaders();
    initBuffers();
    initObjectTree();
    initInputs();
    initTexture();
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    initializeAtrributes()
    tick();
}
    
function openNav() {
    document.getElementById("mySidenav").style.width = "360px";
}

function closeNav() {
    document.getElementById("mySidenav").style.width = "0";
}
