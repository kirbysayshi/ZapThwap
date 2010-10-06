(function(){	

//---------------------------------------------------------------------
// ThwapWorld
//---------------------------------------------------------------------
function World(){
	this.dim = [0,0,0];
	this.vlist = []; // vertex list
	this.clist = []; // constraint list
	this.blist = []; // body list, only used for collisions/orientations?
}
World.prototype.addVertex = function(v){
	if(this.vlist.indexOf(v) === -1){
		this.vlist.push(v);
	}
	return this;
}
World.prototype.addConstraint = function(c){
	this.clist.push(c);
	this.addVertex(c.v1);
	this.addVertex(c.v2);
	//this.vlist.push(c.v1, c.v2);
	return this;
}
World.prototype.addBody = function(b){
	this.blist.push(b);
	
	for(var i = 0; i < b.clist.length; i++){
		this.addConstraint(b.clist[i]);
	}
	return this;
}
World.prototype.step = function(dt){
	var  v = this.vlist.length-1
		,c = this.clist.length-1
		,b = this.blist.length-1;
	
	// update verticies
	while(v >= 0){
		this.vlist[v].update(dt);
		v--;
	}

	// update constraints
	while(c >= 0){
		this.clist[c].update(dt);
		c--;
	}

	// update body orientations
	while(b >= 0){
		this.blist[b].computeOrientationMatrix();
		b--;
	}

	return this;
}
//---------------------------------------------------------------------
// ThwapVertex
//---------------------------------------------------------------------
function Vertex(position){
	this.cpos = vec3.create(position || [0,0,0]);
	this.ppos = vec3.create(position || [0,0,0]); 
	this.acel = vec3.create([0,0,0]);
	this.grav = vec3.create([0,0,0]); 
	this.isFree = true;
	this.collidable = true;
	this.rad  = 8;
	this.imass = 1/1;
	this.gfric = 0.1; // basically passive friction
	this.cfric = 0.1; // collision friction
}	
Vertex.prototype.collideConstraint = function(c){
	if(this.collidable === false || c.collidable === false) return;
	
	//---------------------------------------------------------------------
	// detect collision	
	//---------------------------------------------------------------------	
	var edgeRay = vec3.create();
	vec3.subtract(c.v2.cpos, c.v1.cpos, edgeRay);
	var edgeLength = vec3.length(edgeRay);
	
	// normalize edgeRay
	vec3.scale(edgeRay, 1/edgeLength, edgeRay);
	
	// e == segment from vertex to start point of ray (edge), or v1
	// a == length of projection of e onto the edgeRay
	var e = vec3.create();
	vec3.subtract(this.cpos, c.v1.cpos, e)
	var a = vec3.dot(e, edgeRay);
	
	if(a < 0) { return false; } // edge points away from vertex
	var sqArg = (this.rad*this.rad) - vec3.dot(e, e) + (a*a);
	if(sqArg < 0){ return false; } // no intersection
	var t = a - Math.sqrt( sqArg );
	//if(t < 0){ return false; } // intersection is on other side of circle?
	
	console.log("collision");
	
	//---------------------------------------------------------------------
	// handle collision
	//---------------------------------------------------------------------
	var collisionPoint = vec3.create()
		,collisionDepth = this.rad - Math.sqrt(vec3.dot(e, e) - a*a)	
		,edgeNormal = vec3.normalize(
			vec3.create([ 
				c.v1.cpos[1] - c.v2.cpos[1]
				,c.v1.cpos[0] - c.v2.cpos[0]
				,0 
			])
		)
		,D = vec3.create()
	
	vec3.add(this.cpos, vec3.scale(edgeRay, t), collisionPoint);
	vec3.subtract(this.cpos, collisionPoint, D);
	var d2 = vec3.dot(D, D);
	
	// move vertex from plane
	vec3.add(this.cpos, vec3.scale(vec3.create(edgeNormal), collisionDepth), this.cpos);
	
	// calculate velocity, velocity along normal, and collision plane
	var velocity = this.getVelocity()
		,velocityNormal = vec3.create()
		,velocityCollisionPlane = vec3.create();
	vec3.scale(edgeNormal, vec3.dot(velocity, edgeNormal), velocityNormal);
	vec3.subtract(velocity, velocityNormal, velocityCollisionPlane);
	
	// apply more friction when colliding
	vec3.subtract(this.ppos, vec3.scale(velocityCollisionPlane, -this.cfric), this.ppos);
	
	// apply collision to each vertex, if they are not free?
	
	return this;
}
Vertex.prototype.collideVertex = function(){
	if(this.collidable === false) return;
	
	return this;
}
Vertex.prototype.update = function(dt){	
	if(this.isFree === false) return this;
		
	var s = this,
		temp = vec3.create(s.cpos), // save for later
		vel = vec3.create();
		
	// add gravity to acel
	vec3.add(s.acel, s.grav);

	// calculate current velocity (vel is == ) 
	vec3.subtract(s.cpos, s.ppos, vel)
	vec3.add( vel, vec3.scale(s.acel, dt*dt) );
	
	// add new vel to current position
	vec3.add( s.cpos, vel );
	
	// Friction, apply to previous current position, set as previous
	vec3.add( vec3.scale(vel, s.gfric), temp, s.ppos );
	
	// reset acceleration
	s.acel[0] = s.acel[1] = s.acel[2] = 0;
	return this;
}
Vertex.prototype.getVelocity = function(dest){
	if(!dest) { dest = vec3.create(); }
	vec3.subtract(this.cpos, this.ppos, dest);
	return dest;
}
Vertex.prototype.getBoundingBox = function(){
	var min = vec3.create()
		,max = vec3.create()
		,radius = vec3.create([this.rad, this.rad, 0]);
	vec3.subtract(this.cpos, radius, min);
	vec3.add(this.cpos, radius, max);
	return {min: min, max: max};
}
Vertex.prototype.checkBounds = function(){
	this.cpos[0] = Math.min(this.cpos[0] + this.rad, WORLD.dim[0] - this.rad);
	this.cpos[1] = Math.min(this.cpos[1] + this.rad, WORLD.dim[1] - this.rad);
	this.cpos[2] = Math.min(this.cpos[2] + this.rad, WORLD.dim[2] - this.rad);
	
	this.cpos[0] = Math.max(this.cpos[0] - this.rad, this.rad);
	this.cpos[1] = Math.max(this.cpos[1] - this.rad, this.rad);
	this.cpos[2] = Math.max(this.cpos[2] - this.rad, this.rad);
	return this;
}

//---------------------------------------------------------------------
// ThwapConstraint
//---------------------------------------------------------------------
function LinearConstraint(v1, v2, restLen){
	this.v1 = v1;
	this.v2 = v2;
	// restLength[min,max] if both are the same it is very rigid
	if(restLen == undefined){
		var diff = vec3.create();
		vec3.subtract(v2.cpos, v1.cpos, diff);
		var len = vec3.length(diff);
		this.restLength = [len, len]; // calculated
	} else {
		this.restLength = restLen
	}
	
	this.restLength2 = [ 
		this.restLength[0]*this.restLength[0],
		this.restLength[1]*this.restLength[1] ];
	this.imass = v1.imass + v2.imass;
	this.isStatic = false; // cannot move, ie static geometry (like the ground)
	this.collidable = true;
	// normal is assumed to be the "left" side of v2 - v1
	this.normal = vec3.create([0,0,0]);
	this.computeNormal(); // calculate normal here
	
	if(!v1.isFree && !v2.isFree){
		// this flag tells us we don't need to recalculate the normal
		this.isStatic = true;
	}
}
LinearConstraint.prototype.satisfy = function(){
	
	if(this.imass < THWAP.EPSILON) { return this; }
	
	var  v1 = this.v1
		,v2 = this.v2
		,delta = vec3.create()
		,delta2 = 0
		,diff = 0;
	
	vec3.subtract(v2.cpos, v1.cpos, delta);
	delta2 = vec3.dot(delta, delta);
	// square root approximation
	diff = this.restLength2[0] / (delta2 + this.restLength2[0]) - 0.5;
	diff *= -2;
	
	vec3.scale(delta, diff/this.imass);
	vec3.add(v1.cpos, vec3.scale(delta, v1.imass, vec3.create() ));
	vec3.subtract(v2.cpos, vec3.scale(delta, v2.imass, vec3.create() ))
	
	return this;
}
LinearConstraint.prototype.computeNormal = function(){
	if(this.isStatic === true) { return this; }
	
	var diff = vec3.create();
	vec3.subtract(this.v2.cpos, this.v1.cpos, diff);
	this.normal[0] = -diff[1];
	this.normal[1] = -diff[0]; // I think this needs to be negated also
	this.normal[2] = 0;
	return this;
}
LinearConstraint.prototype.update = function(dt){
	this.satisfy()
		.computeNormal();
}
//---------------------------------------------------------------------
// ThwapBody: collection of constraints and vertices, with orientation
//---------------------------------------------------------------------
function Body(){
	this.clist = [];
	this.vlist = [];
	this.regA = {};
	this.regB = {};
	this.solidity = 1; // how many times the constraints and vertices are updated per loop
	this.orientation = mat4.create();
	this.rotation = 0;
	this.boundingPos = vec3.create();
	this.boundingRad = 0;
	//this.dirty = true; // let's optimize later
}
Body.prototype.computeOrientationMatrix = function(){
	//if(this.dirty === false) return this.orientation;
	var regRay = vec3.create()
		,oriRay = vec3.create([1,0,0]) // unit vector!
		,ori4 = mat4.identity(this.orientation);
		
	// create registration ray
	vec3.subtract(this.regB.cpos, this.regA.cpos, regRay);
	vec3.normalize(regRay);

	// compute angle
	this.rotation = Math.acos(vec3.dot(regRay, oriRay));

	// normally the cross product would be used, but we don't need it,
	// since the axis of rotation is implicitly z
	// if z value is negative, rotation should be negative
	if(regRay[1] < 0 && this.rotation > 0) { this.rotation *= -1; }
	// if z value is positive, rotation should be positive
	if(regRay[1] > 0 && this.rotation < 0) { this.rotation *= -1; }

	// move matrix to proper position
	mat4.translate(ori4, this.regA.cpos);
	// apply rotation to matrix...
	mat4.rotateZ(ori4, this.rotation);

	//this.dirty = false;
	return this.orientation;
};
Body.prototype.moveTo = function(vec){
	// make an identity matrix
	var mat = mat4.identity(mat4.create());
	// translate blank matrix to difference between registration A and position
	mat4.translate( mat, vec3.subtract(vec, this.regA.cpos)  );
	
	// apply matrix to each vertex of each constraint
	for(var i = 0; i < this.vlist.length; i++){
		var v = this.vlist[i];
		mat4.multiplyVec3(mat, v.cpos);
		mat4.multiplyVec3(mat, v.ppos);
	}
}
// transform all vertices clockwise by radians
// since +y is down, default rotation is clockwise
Body.prototype.rotate = function(rads){
	var rMatrix = mat4.rotateZ(mat4.identity(mat4.create()), rads);
	
	// apply matrix to each vertex of each constraint
	for(var i = 0; i < this.vlist.length; i++){
		var v = this.vlist[i];
		mat4.multiplyVec3(rMatrix, v.cpos);
	}
};
Body.prototype.update = function(dt){
	for(var k = 0; k < this.solidity; k++){
		var  i = 0
			,j = 0;
		
		for(; i < this.vlist.length; i++){
			this.vlist[i].update(dt);
		}
	
		for(; j < this.clist.length; j++){
			this.clist[j].update(dt);
		}
	}
}
Body.prototype.addAcceleration = function(vec){
	for(var i = 0; i < this.vlist.length; i++){
		vec3.add(this.vlist[i].acel, vec);
	}
}
Body.prototype.computeBoundingSphere = function(){
	if(this.vlist.length <= 0){
		return this;
	}
	var minMax = this.vlist[0].getBoundingBox()
		,min = minMax.min, max = minMax.max;
	
	for(var i = 1; i < this.vlist.length; i++){
		var pMinMax = this.vlist[i].getBoundingBox()
			pMin = pMinMax.min, pMax = pMinMax.max;
		
		if (pMin[0] < min[0]) min[0] = pMin[0];
		if (pMin[1] < min[1]) min[1] = pMin[1];
		if (pMin[2] < min[2]) min[2] = pMin[2];
                                           
		if (pMax[0] > max[0]) max[0] = pMax[0];
		if (pMax[1] > max[1]) max[1] = pMax[1];
		if (pMax[2] > max[2]) max[2] = pMax[2];
	}
	vec3.scale(vec3.add(max, min, vec3.create()), 0.5, this.boundingPos);
	this.boundingRad = vec3.length(vec3.scale(vec3.subtract(max, min, vec3.create()), 0.5));
	return this;
}
Body.prototype.collideWithBody = function(body){
	
}
//---------------------------------------------------------------------
// Export
//---------------------------------------------------------------------
window.THWAP = {
	EPSILON: 0.001
	,Vertex: Vertex
	,LinearConstraint: LinearConstraint
	,Body: Body
	,World: World
};
})();