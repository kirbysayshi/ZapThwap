(function(){	

// TODO: add 'bounciness' factor for single-vertex bodies. perhaps just
// 		override collision methods for single-vertex to have more bounce?
// TODO: cleanup isFree vs imass. they should both technically be the same
// TODO: possibly compute constraint "forces" first, and THEN satisfy constraints
//		to avoid introducing more energy into the system? Adding force vs moving
//		cpos is unknown
// TODO: allow vertices to be collidable but not have collision response implemented
//		so collision could be detected with a callback, but not auto-responded to
// TODO: //THWAP.Instrumentation
// TODO: Fix ZAP.CGLM timestep...

//---------------------------------------------------------------------
// ThwapWorld
//---------------------------------------------------------------------
function World(){
	//this.dim = [0,0,0];
	this.vlist = []; // vertex list
	this.clist = []; // constraint list
	this.blist = []; // body list, only used for collisions/orientations?
	this.lastdt = 0.016;
	this.handleCollisions = true;
}
World.prototype.addVertex = function(v){
	if(this.vlist.indexOf(v) === -1){
		this.vlist.push(v);
		THWAP.Instrumentation.library.maxVertices++;
	}
	return this;
}
World.prototype.addConstraint = function(c){
	if(this.clist.indexOf(c) === -1){
		this.clist.push(c);
		THWAP.Instrumentation.library.maxConstraints++;
	}
	
	this.addVertex(c.v1);
	this.addVertex(c.v2);
	return this;
}
World.prototype.addBody = function(b){
	if(this.blist.indexOf(b) === -1){
		this.blist.push(b);
		THWAP.Instrumentation.library.maxBodies++;
	}
	
	for(var i = 0; i < b.clist.length; i++){
		this.addConstraint(b.clist[i]);
	}
	
	for(var j = 0; j < b.vlist.length; j++){
		this.addVertex(b.vlist[j]);
	}
	
	return this;
}
World.prototype.step = function(dt){
	var  v = this.vlist.length-1
		,c = this.clist.length-1
		,b = this.blist.length-1
		,o = this.blist.length;
	
	// archive previous instrumentation data
	THWAP.Instrumentation.archiveThisStep();
	
	// update verticies
	while(v >= 0){
		this.vlist[v].update(dt, this.lastdt);
		v--;
	}

	// update constraints
	while(c >= 0){
		this.clist[c].update(dt);
		c--;
	}

	// update body orientations, bounding spheres/boxes, collide all bodies
	while(b >= 0){
		var body = this.blist[b]
			.computeOrientationMatrix()
			.computeBoundingSphere()
			.computeBoundingBox();
		
		if( this.handleCollisions === true ){
			for(var i = b - 1; i >= 0; i--){
				body.collideWithBody(this.blist[i]);
			}
		}
		
		b--;
	}
	
	this.lastdt = dt;
	return this;
}

//---------------------------------------------------------------------
// Vertex
//---------------------------------------------------------------------
function Vertex(position){
	this.cpos = vec3.create(position || [0,0,0]);
	this.ppos = vec3.create(position || [0,0,0]); 
	this.acel = vec3.create([0,0,0]);
	this.grav = vec3.create([0,0,0]); 
	this.isFree = true;
	this.isCollidable = true;
	this.rad  = 8;
	this.imass = 1/1;
	this.gfric = 0.1; // basically passive friction
	this.cfric = 0.1; // collision friction
	
	this.eventCallbacks = {
		//onCreate: function(){}
		//onDestroy: function(){}
		 onPreUpdate: function(){}
		,onPostUpdate: function(){}
		,onVertexCollisionDetection: function(vertex, collisionDepth){}
		,onVertexCollisionResponse: function(vertex, velocityAlongCollsionPlane){}
		,onConstraintCollisionDetection: function(constraint, collisionEdge, collisionT){}
		,onConstraintCollisionResponse: function(constraint, velocity, collisionDepth){}
	}
}	
Vertex.prototype.collideConstraint = function(c){
	if(this.isCollidable === false || c.isCollidable === false
		|| this == c.v1 || this == c.v2
		//|| this.isFree === false
		) return this;
	
	// INSTRUMENTATION
	THWAP.Instrumentation.log('VCCollisionTests', [this, c]);
	
	//---------------------------------------------------------------------
	// Attempt to discard quickly
	//---------------------------------------------------------------------
	var diff = vec3.subtract(this.cpos, c.boundingPos, vec3.create())
		,comboRad = this.rad + c.boundingRad
		,diff2 = vec3.dot(diff, diff)
		,comboRad2 = comboRad*comboRad;

	// early out, too far apart
	if(diff2 > comboRad2){
		return this;
	}
	
	//---------------------------------------------------------------------
	// detect collision	
	//---------------------------------------------------------------------	
	var edgeRay = vec3.subtract(c.v2.cpos, c.v1.cpos, vec3.create());
	var edgeLength = vec3.length(edgeRay);
	
	// normalize edgeRay
	vec3.scale(edgeRay, 1/edgeLength);
	
	// e == segment from vertex to start point of ray (edge), or v1
	// a == length of projection of e onto the edgeRay
	var e = vec3.create();
	vec3.subtract(this.cpos, c.v1.cpos, e)
	var a = vec3.dot(e, edgeRay);
	
	if(a < 0) { return false; } // edge points away from vertex
	var sqArg = (this.rad*this.rad) - vec3.dot(e, e) + (a*a);
	if(sqArg < 0){ return false; } // no intersection
	var t = a - Math.sqrt( sqArg );
	if(t < 0 || t > edgeLength) { return false; } // intersection point not within segment
	
	// vertex constraint collision detection callback
	this.eventCallbacks.onConstraintCollisionDetection.call(this, c, edgeRay, t);
	c.eventCallbacks.onVertexCollisionDetection.call(c, this, edgeRay, t);
	
	//---------------------------------------------------------------------
	// handle collision
	//---------------------------------------------------------------------
	var collisionPoint = vec3.create()
		,collisionDepth = this.rad - Math.sqrt(vec3.dot(e, e) - a*a)
		,edgeNormal = c.normal
		,D = vec3.create()
	
	vec3.add(this.cpos, vec3.scale(edgeRay, t), collisionPoint);
	vec3.subtract(this.cpos, collisionPoint, D);
	var d2 = vec3.dot(D, D);
	
	// calculate velocity, velocity along normal, and collision plane
	var velocity = this.getVelocity()
		,velocityNormal = vec3.create()
		,velocityCollisionPlane = vec3.create();
	vec3.scale(edgeNormal, vec3.dot(velocity, edgeNormal), velocityNormal);
	vec3.subtract(velocity, velocityNormal, velocityCollisionPlane);
	
	if(this.isFree === true){
		// move vertex from plane
		vec3.add(this.cpos, vec3.scale(vec3.create(edgeNormal), collisionDepth), this.cpos);
		//vec3.add(this.ppos, vec3.scale(vec3.create(edgeNormal), -collisionDepth), this.ppos);
	
		// apply more friction when colliding
		vec3.subtract(this.ppos, vec3.scale(velocityCollisionPlane, -this.cfric*this.imass), this.ppos);
	}
	
	// apply collision to each vertex, if they are free
	if(c.isFree === true){
		// move vertex from plane
		vec3.add(c.v1.cpos, vec3.scale(vec3.negate(vec3.create(edgeNormal)), collisionDepth), c.v1.cpos);
		vec3.add(c.v2.cpos, vec3.scale(vec3.negate(vec3.create(edgeNormal)), collisionDepth), c.v2.cpos);

		// apply more friction when colliding
		vec3.negate(vec3.scale(velocityCollisionPlane, -(c.v1.cfric + c.v2.cfric) /2));
		vec3.subtract(c.v1.ppos, velocityCollisionPlane, c.v1.ppos);
		vec3.subtract(c.v2.ppos, velocityCollisionPlane, c.v2.ppos);
	}
	
	// vertex constraint collision reponse callback
	this.eventCallbacks.onConstraintCollisionResponse.call(this, c, velocity, collisionDepth);
	c.eventCallbacks.onVertexCollisionResponse.call(c, this, velocity, collisionDepth);
	
	// INSTRUMENTATION
	THWAP.Instrumentation.log('VCCollisionResponses', [this, c]);
	
	return this;
}
Vertex.prototype.collideVertex = function(vert){
	if(this.isCollidable === false || vert.isCollidable === false) return;
	
	// TODO: cache all indexed vars
	// TODO: swap out with ov3 for just this method
	
	// INSTRUMENTATION
	THWAP.Instrumentation.log('VVCollisionTests', [this, vert]);
	
	var  tcpos = this.cpos, vcpos = vert.cpos
		,tppos = this.ppos, vppos = vert.ppos
		,diff = vec3.subtract(tcpos, vcpos, [])
		,diffLength = vec3.length(diff)
		,comboRad = this.rad + vert.rad
		,depth = comboRad - diffLength
		,comboInvMass = this.imass + vert.imass
		,velDiff = [], velNorm, velColl;
		
	// early out, too far apart
	if(diffLength > comboRad) return false;
	
	// collision detection callbacks
	this.eventCallbacks.onVertexCollisionDetection.call(this, vert, depth);
	vert.eventCallbacks.onVertexCollisionDetection.call(vert, this, depth);
	
	// normalize diff
	if(diffLength !== 0){ // verticies on top of each other
		diff[0] /= diffLength;
		diff[1] /= diffLength;
		diff[2] /= diffLength;
	}
	
	// velocity diff, velocity along normal, and velocity along collision plane
	velDiff[0] = (vcpos[0] - vppos[0]) - (tcpos[0] - tppos[0]);
	velDiff[1] = (vcpos[1] - vppos[1]) - (tcpos[1] - tppos[1]);
	velDiff[2] = (vcpos[2] - vppos[2]) - (tcpos[2] - tppos[2]);
	
	velNorm = vec3.scale(diff, vec3.dot(velDiff, diff), []);
	velColl = vec3.subtract(velDiff, velNorm, []);
	
	// friction / damping
	velColl[0] /= comboInvMass;
	velColl[1] /= comboInvMass;
	velColl[2] /= comboInvMass;
	
	if(this.isFree === true) {
		// move particle from plane
		vec3.add(tcpos, vec3.scale(diff, (depth*this.imass), []));
		// friction / damping
		vec3.subtract(tcpos, vec3.scale(velColl, (this.cfric*this.imass), []));
	}
	if(vert.isFree === true) {
		// move particle from plane
		vec3.subtract(vcpos, vec3.scale(diff, (depth*vert.imass), []));
		// friction / damping
		vec3.add(vcpos, vec3.scale(velColl, (vert.cfric*vert.imass), []));
	}
	
	// collision response callbacks
	this.eventCallbacks.onVertexCollisionResponse.call(this, vert, velColl);
	vert.eventCallbacks.onVertexCollisionResponse.call(vert, this, velColl);
	
	// INSTRUMENTATION
	THWAP.Instrumentation.log('VVCollisionResponses', [this, vert]);
	
	return this;
}
Vertex.prototype.update = function(dt, ldt){	
	if(this.isFree === false) return this;
		
	var s = this,
		temp = vec3.create(s.cpos), // save for later
		vel = vec3.create();
	
	// pre-update event!
	s.eventCallbacks.onPreUpdate.call(this);
		
	// add gravity to acel
	vec3.add(s.acel, s.grav);

	// calculate current velocity (vel is == ) 
	vec3.subtract(s.cpos, s.ppos, vel)
	vec3.add( vec3.scale(vel, dt / ldt), vec3.scale(s.acel, dt*dt) );
	
	// add new vel to current position
	vec3.add( s.cpos, vel );
	
	// Friction, apply to previous current position, set as previous
	vec3.add( vec3.scale(vel, s.gfric), temp, s.ppos );
	
	// reset acceleration
	s.acel[0] = s.acel[1] = s.acel[2] = 0;
	
	// post-update event!
	s.eventCallbacks.onPostUpdate.call(this);
	
	// INSTRUMENTATION
	THWAP.Instrumentation.log('VUpdates', this);
	
	return this;
}
Vertex.prototype.getVelocity = function(dest){
	if(!dest) { dest = vec3.create(); }
	vec3.subtract(this.cpos, this.ppos, dest);
	return dest;
}
Vertex.prototype.getBoundingBox = function(){
	var  min = []
		,max = []
		,radius = [this.rad, this.rad, 0];
	vec3.subtract(this.cpos, radius, min);
	vec3.add(this.cpos, radius, max);
	return {min: min, max: max};
}
Vertex.prototype.debugDraw = function(ctx){
	
}
Vertex.prototype.toString = function(){
	return '[Object Vertex] cpos: ' + this.cpos;
}
//---------------------------------------------------------------------
// Constraint
//---------------------------------------------------------------------
function LinearConstraint(v1, v2, iterations, restLen){
	this.v1 = v1;
	this.v2 = v2;
	// restLength[min,max] if both are the same it is very rigid
	if(restLen == undefined){
		var diff = vec3.subtract(v2.cpos, v1.cpos, vec3.create())
			,len = vec3.length(diff);
		this.restLength = len;//[len, len]; // calculated
	} else {
		this.restLength = restLen
	}
	
	this.iterations = iterations || 5
	this.restLength2 = this.restLength*this.restLength;
	this.imass = v1.imass + v2.imass;
	this.isFree = true; // cannot move, ie static geometry (like the ground)
	this.isCollidable = true;
	// normal is assumed to be the "left" side of v2 - v1
	this.normal = vec3.create([0,0,0]);
	this.computeNormal(); // calculate normal here
	
	this.boundingRad = 0;
	this.boundingPos = vec3.create([0,0,0]);
	this.computeBoundingSphere(); // calculate initially
	
	if(v1.isFree || v2.isFree){
		this.isFree = true;
	} else {
		// this flag tells us we don't need to recalculate the normal
		this.isFree = false;
	}
	
	this.eventCallbacks = {
		//onCreate: function(){}
		//onDestroy: function(){}
		 onPreUpdate: function(){}
		,onPostUpdate: function(){}
		,onVertexCollisionDetection: function(vertex, collisionEdge, collisionT){}
		,onVertexCollisionResponse: function(vertex, velocity, collisionDepth){}
	}
}
LinearConstraint.prototype.satisfy = function(){
	if(this.imass < THWAP.EPSILON) { return this; }
	if(this.isFree === false) { return this; } // this is a hack until I rectify imass and isFree
	
	for(var i = 0; i < this.iterations; i++){
		var  v1 = this.v1
			,v2 = this.v2
			,delta = []
			,delta2 = 0
			,diff = 0;
	
		vec3.subtract(v2.cpos, v1.cpos, delta);
		delta2 = vec3.dot(delta, delta);

		diff = (vec3.length(delta) - this.restLength) / this.restLength;

		vec3.scale(delta, diff/this.imass);
		vec3.add(v1.cpos, vec3.scale(delta, v1.imass, [] ));
		vec3.subtract(v2.cpos, vec3.scale(delta, v2.imass, [] ))
	}
	return this;
}
LinearConstraint.prototype.computeNormal = function(){
	if(this.isFree === false) { return this; }
	
	var diff = vec3.create();
	vec3.subtract(this.v2.cpos, this.v1.cpos, diff);
	this.normal[0] = diff[1];
	this.normal[1] = -diff[0];
	this.normal[2] = 0;
	vec3.normalize(this.normal);
	return this;
}
LinearConstraint.prototype.computeBoundingSphere = function(){
	if(this.isFree === false) { return this; }
	
	// use bounding pos temporarily to avoid creating new array
	this.boundingRad = vec3.length(
		vec3.subtract(this.v2.cpos, this.v1.cpos, this.boundingPos)) / 2;
		
	vec3.scale(vec3.add(this.v1.cpos, this.v2.cpos, this.boundingPos), 0.5);
	
	return this;
}
LinearConstraint.prototype.update = function(dt){
	this.eventCallbacks.onPreUpdate.call(this);
	this.satisfy()
		.computeBoundingSphere()
		.computeNormal();
	this.eventCallbacks.onPostUpdate.call(this);
	// INSTRUMENTATION
	THWAP.Instrumentation.log('CUpdates', this);
	return this;
}
LinearConstraint.prototype.debugDrawNormal = function(ctx, offset, scale){
	offset = offset || [0,0,0];
	scale = scale || 1;
	ctx.save();
	ctx.strokeStyle = "red";
	ctx.lineWidth = 2;
	ctx.beginPath();
	
	var midpoint = [
		(this.v1.cpos[0] + this.v2.cpos[0]) / 2,
		(this.v1.cpos[1] + this.v2.cpos[1]) / 2,
		0
	];
	var normalEnd = vec3.add(vec3.scale(this.normal, this.restLength / 8, vec3.create()), midpoint);
	ctx.moveTo((midpoint[0]  + offset[0])*scale, (midpoint[1]  + offset[1])*scale);
	ctx.lineTo((normalEnd[0] + offset[0])*scale, (normalEnd[1] + offset[1])*scale);
	
	ctx.stroke();
	ctx.restore();
}
//---------------------------------------------------------------------
// Body: collection of constraints and vertices, with orientation
//---------------------------------------------------------------------
function Body(){
	this.clist = [];
	this.vlist = [];
	this.regA = {};
	this.regB = {};
	this.solidity = 1; // how many times the constraints and vertices are updated per loop
	this.orientation = mat4.identity(mat4.create());
	this.rotation = 0;
	this.boundingPos = vec3.create([0,0,0]);
	this.boundingRad = 0;
	this.aabb = this.computeBoundingBox();
	//this.dirty = true; // let's optimize later
}
Body.prototype.computeOrientationMatrix = function(){
	//if(this.dirty === false) return this.orientation;
	var  regRay = vec3.create()
		,offset = vec3.create()
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

	// scale regRay to radius, create diagonal offset using perpendicular
	vec3.scale(regRay, this.regA.rad);
	offset[0] = -(regRay[0] - regRay[1]);
	offset[1] = -(regRay[1] + regRay[0]);
	offset[2] =   regRay[2] + regRay[2]  ;

	// move matrix to proper position, assuming that edges 
	// of body match outside edge of vertex
	mat4.translate(ori4, vec3.add(offset, this.regA.cpos));
	
	// finally apply rotation to matrix...
	mat4.rotateZ(ori4, this.rotation);

	// set as new orientation
	mat4.set(this.orientation, ori4);

	//this.dirty = false;
	return this;
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
	
	// recompute constraint bounding spheres and positions
	for(var j = 0; j < this.clist.length; j++){
		var c = this.clist[j],
			wasFree = c.isFree;
		c.isFree = true; // to avoid the early abort
		c.computeBoundingSphere();
		c.isFree = wasFree;
	}
	
	return this;
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
	
	// recompute constraint bounding spheres and positions
	for(var j = 0; j < this.clist.length; j++){
		var c = this.clist[j];
		c.isFree = true; // to avoid the early abort
		c.computeBoundingSphere();
		c.isFree = false;
	}
	return this;
};
Body.prototype.addAcceleration = function(vec){
	for(var i = 0; i < this.vlist.length; i++){
		vec3.add(this.vlist[i].acel, vec);
	}
	return this;
}
Body.prototype.computeBoundingSphere = function(){
	if(this.vlist.length <= 0){
		return this;
	}
	var minMax = this.vlist[0].getBoundingBox()
		,min = [ Number.MAX_VALUE,  Number.MAX_VALUE,  Number.MAX_VALUE]
		,max = [-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE];
	
	for(var i = 0; i < this.vlist.length; i++){
		var  pMinMax = this.vlist[i].getBoundingBox()
			,pMin = pMinMax.min, pMax = pMinMax.max;
		
		if (pMin[0] < min[0]) min[0] = pMin[0];
		if (pMin[1] < min[1]) min[1] = pMin[1];
		if (pMin[2] < min[2]) min[2] = pMin[2];
                                           
		if (pMax[0] > max[0]) max[0] = pMax[0];
		if (pMax[1] > max[1]) max[1] = pMax[1];
		if (pMax[2] > max[2]) max[2] = pMax[2];
	}
	// determine midpoint of vector between min and max
	vec3.scale(vec3.add(max, min, vec3.create()), 0.5, this.boundingPos);
	
	this.boundingRad = vec3.length(
		vec3.scale(vec3.subtract(max, min, vec3.create()), 0.5)
	);
	return this;
}
Body.prototype.computeBoundingBox = function(){
	
	var i
		,vlist = this.vlist
		,min = [ Number.MAX_VALUE,  Number.MAX_VALUE,  Number.MAX_VALUE]
		,max = [-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE]
		,pAABB
		,pMin
		,pMax;
	
	for(i = 0; i < vlist.length; i++){
		pAABB = vlist[i].getBoundingBox();
		pMin = pAABB.min;
		pMax = pAABB.max;
		
		if (pMin[0] < min[0]) min[0] = pMin[0];
		if (pMin[1] < min[1]) min[1] = pMin[1];
		if (pMin[2] < min[2]) min[2] = pMin[2];
                                           
		if (pMax[0] > max[0]) max[0] = pMax[0];
		if (pMax[1] > max[1]) max[1] = pMax[1];
		if (pMax[2] > max[2]) max[2] = pMax[2];
	}
	
	this.aabb = {
		min: pMin, max: pMax
	};
	
	return this;
}
Body.prototype.getAABB = function(){
	return this.aabb;
}
Body.prototype.collideWithBody = function(body){
	
	if(body == this){ return false; }
	
	var v = 0, c = 0, bv = 0, bc = 0
		,vl = this.vlist.length
		,cl = this.clist.length
		,bvl = body.vlist.length
		,bcl = body.clist.length
		,diff = [], distance;

	// test for early early out
	vec3.subtract(body.boundingPos, this.boundingPos, diff);
	if(vec3.length(diff) > body.boundingRad + this.boundingrad){
		return false;
	}

	// collide all this vertices - body vertices
	for(v = 0; v < vl; v++){
		for(bv = 0; bv < bvl; bv++){
			this.vlist[v].collideVertex( body.vlist[bv] );
		}
	}

	// collide all this constraints - body vertices
	for(c = 0; c < cl; c++){
		for(bv = 0; bv < bvl; bv++){
			body.vlist[bv].collideConstraint( this.clist[c] );
		}
	}

	// collide all body constraints - this vertices
	for(bc = 0; bc < bcl; bc++){
		for(v = 0; v < vl; v++){
			this.vlist[v].collideConstraint( body.clist[bc] );
		}
	}

	return this;
}
Body.prototype.resetCollisionCaches = function(){
	this.hasCollidedVsWith.length = 0;
	this.hasCollidedCsWith.length = 0;
	return this;
}
Body.prototype.setPassiveFriction = function(fric){
	for(var i = 0; i < this.vlist.length; i++){
		var v = this.vlist[i];
		v.gfric = fric;
	}
	return this;
}
Body.prototype.setCollisionFriction = function(fric){
	for(var i = 0; i < this.vlist.length; i++){
		var v = this.vlist[i];
		v.cfric = fric;
	}
	return this;
}
Body.prototype.createConstraints = function(iterations){
	for(var i = 0; i < this.vlist.length; i++){
		for(var j = i+1; j < this.vlist.length; j++){

			// check to make sure this constraint doesn't exist yet
			var ok = true;
			for(var c = 0; c < this.clist.length; c++){
				var con = this.clist[c];
				if(con.v1 == this.vlist[i] && con.v2 == this.vlist[j]
				|| con.v1 == this.vlist[j] && con.v2 == this.vlist[i]){
					ok = false;
				}
			}
			
			if(ok === true){
				this.clist.push( 
					new THWAP.LinearConstraint(this.vlist[i], this.vlist[j], iterations) 
				);
			}
		}
	}
}
Body.prototype.debugDraw = function(ctx, offset, scale){	
	offset = offset || [0,0,0];
	scale = scale || 1;
	ctx.save();
	ctx.strokeStyle = 'rgba(142,142,142,0.5)';

	// draw constraints and their normals
	for(var i = 0; i < this.clist.length; i++){
		var c = this.clist[i];
		c.debugDrawNormal(ctx, offset, scale);
		ctx.beginPath();
		ctx.moveTo( (c.v1.cpos[0] + offset[0])*scale, (c.v1.cpos[1] + offset[1])*scale );
		ctx.lineTo( (c.v2.cpos[0] + offset[0])*scale, (c.v2.cpos[1] + offset[1])*scale );
		ctx.stroke();
		
		// draw bounding sphere for each constraint
		//ctx.save();
		//ctx.strokeStyle = 'rgba(0,248,0,1)';
		//ctx.fillStyle = 'rgba(0,248,0,0.2)';
		//ctx.beginPath();
		//ctx.arc(
		//	c.boundingPos[0] + offset[0], 
		//	c.boundingPos[1] + offset[1], 
		//	c.boundingRad, 0, Math.PI*2, false);
		//ctx.stroke();
		//ctx.restore();
	}
	
	// draw vertices 
	for(var j = 0; j < this.vlist.length; j++){
		ctx.beginPath();
		var v = this.vlist[j];
		ctx.arc( (v.cpos[0] + offset[0])*scale, (v.cpos[1] + offset[1])*scale, v.rad*scale, 0, Math.PI*2, false);
		ctx.stroke();
		
		// draw vertex bounding box
		//var mm = v.getBoundingBox();
		//ctx.strokeRect(
		//	 mm.min[0] + offset[0]
		//	,mm.min[1] + offset[1]
		//	,2*(mm.max[0]-v.cpos[0])
		//	,2*(mm.max[1]-v.cpos[1])
		//);
	}	
	
	// draw body bounding sphere
	ctx.beginPath();
	ctx.arc(
		 (this.boundingPos[0] + offset[0])*scale
		,(this.boundingPos[1] + offset[1])*scale 
		,(this.boundingRad)*scale, 0, Math.PI*2, false);
	ctx.stroke();
	
	ctx.restore();
}

var Instrumentation = {
	sample: true
	,thisStep: {
		 VVCollisionTests: []
		,VCCollisionTests: []
		,VVCollisionResponses: []
		,VCCollisionResponses: []
		,VUpdates: []
		,CUpdates: []
	}
	,library: {
		 maxVertices: 0
		,maxConstraints: 0
		,maxBodies: 0
		
		,totalVVCollisionTests: 0
		,totalVCCollisionTests: 0
		,totalVVCollisionResponses: 0
		,totalVCCollisionResponses: 0
		,totalVUpdates: 0
		,totalCUpdates: 0
		,totalTimeSteps: 0
	}
	
	,log: function(prop, data){
		if(this.sample === true){
			this.thisStep[prop].push(data);
		}
	}
	,totalResetOfTheSun: function(){
		for(var i in this.thisStep){
			this.thisStep[i].length = 0;
		}
		
		for(var j in this.library){
			this.library[j] = 0;
		}
	}
	,archiveThisStep: function(){
		if(this.sample === true){
			for(var i in this.thisStep){
				this.library['total' + i] += this.thisStep[i].length;
				this.thisStep[i].length = 0;
			}	
			this.library.totalTimeSteps++;
		}
	}
	,query: function(){}
};

// detects 2d collisions
var PositronCollider = {
	circleVsCircle: function(posA, radA, posB, radB, callback){
		
		var  bToA = vec3.subtract(posA, posB, vec3.create())
			,distance = vec3.length(bToA)
			,comboRad = radA + radB
			,depth = comboRad - distance;

		if(distance > comboRad){
			return false;
		} else {
			callback(depth, bToA, distance);
			return true;
		}
		
	}
	,circleVsBoundingBox: function(){}
	,vertexVsVertex: function(vertexA, vertexB, handler){
		if(vertexA.isCollidable === false || vertexB.isCollidable === false) return;

		// INSTRUMENTATION
		//THWAP.Instrumentation.log('VVCollisionTests', [vertexA, vertexB]);

		this.circleVsCircle(vertexA.cpos, vertexA.rad, vertexB.cpos, vertexB.rad, 
			function(depth, bToA, distance){
				handler(vertexA, vertexB, depth, bToA, distance);
			});
		
	}
	,vertexVsConstraint: function(vertex, constraint, handler){
		if(vertex.isCollidable === false || constraint.isCollidable === false
			|| vertex == constraint.v1 || vertex == constraint.v2
			) return this;

		var diff = vec3.subtract(vertex.cpos, constraint.boundingPos, vec3.create())
			,comboRad = vertex.rad + constraint.boundingRad
			,diff2 = vec3.dot(diff, diff)
			,comboRad2 = comboRad*comboRad
			
			,edgeRay, edgeLength, e, a, eDotE, sqArg, t, collisionDepth;

		// INSTRUMENTATION
		//THWAP.Instrumentation.log('VCCollisionTests', [vertex, constraint]);

		// early out, too far apart
		if(diff2 > comboRad2){
			return vertex;
		}
		
		edgeRay = vec3.subtract(constraint.v2.cpos, constraint.v1.cpos, vec3.create());
		edgeLength = vec3.length(edgeRay);

		// normalize edgeRay
		vec3.scale(edgeRay, 1/edgeLength);

		// e == segment from vertex to start point of ray (edge), or v1
		// a == length of projection of e onto the edgeRay
		e = vec3.create();
		vec3.subtract(vertex.cpos, constraint.v1.cpos, e)
		a = vec3.dot(e, edgeRay);

		if(a < 0) { return false; } // edge points away from vertex
		eDotE = vec3.dot(e, e);
		sqArg = (vertex.rad*vertex.rad) - eDotE + (a*a);
		if(sqArg < 0){ return false; } // no intersection
		t = a - Math.sqrt( sqArg );
		if(t < 0 || t > edgeLength) { return false; } // intersection point not within segment
		
		collisionDepth = vertex.rad - Math.sqrt(eDotE - a*a);
		
		handler();
		
	}
	,vertexVsBody: function(){}
	,bodyVsBody: function(bodyA, bodyB, callback){
		if(bodyA == bodyB){ return false; }

		var va = 0, ca = 0, vb = 0, cb = 0
			,bodyA_vlist_length = bodyA.vlist.length
			,bodyA_clist_length = bodyA.clist.length
			,bodyB_vlist_length = bodyB.vlist.length
			,bodyB_clist_length = bodyB.clist.length;

		// collide all A vertices - B vertices
		for(va = 0; va < bodyA_vlist_length; va++){
			for(vb = 0; vb < bodyB_vlist_length; vb++){
				bodyA.vlist[va].collideVertex( bodyB.vlist[vb] );
			}
		}

		// collide all A constraints - B vertices
		for(ca = 0; ca < bodyA_clist_length; ca++){
			for(vb = 0; vb < bodyB_vlist_length; vb++){
				bodyB.vlist[bv].collideConstraint( bodyA.clist[ca] );
			}
		}

		// collide all B constraints - A vertices
		for(cb = 0; cb < bodyB_clist_length; cb++){
			for(va = 0; va < bodyA_vlist_length; va++){
				bodyA.vlist[va].collideConstraint( bodyB.clist[cb] );
			}
		}
	}
};

// responds to collisions
var CollisionResolver = {
	vertexVsVertex: function(vertexA, vertexB, depth, bToA, distance, callback){
		// normalize bToA
		if(distance !== 0){ // verticies on top of each other
			bToA[0] /= distance;
			bToA[1] /= distance;
			bToA[2] /= distance;
		}

		// velocity diff, velocity along normal, and velocity along collision plane
		var  vertexAVel = vec3.subtract(vertexA.cpos, vertexA.ppos, vec3.create())
			,vertexBVel = vec3.subtract(vertexB.cpos, vertexB.ppos, vec3.create())
			,velDiff = vec3.subtract(vertexAVel, vertexBVel, vec3.create())
			,velNorm = vec3.scale(diff, vec3.dot(velDiff, bToA), vec3.create())
			,velColl = vec3.subtract(velDiff, velNorm, vec3.create());

		// friction / damping
		velColl[0] /= comboInvMass;
		velColl[1] /= comboInvMass;
		velColl[2] /= comboInvMass;

		if(vertexA.isFree === true) {
			// move particle from plane
			vec3.add(vertexA.cpos, vec3.scale(bToA, (depth*vertexA.imass), vec3.create()));
			// friction / damping
			vec3.subtract(vertexA.cpos, vec3.scale(velColl, (vertexA.cfric*vertexA.imass), vec3.create()));
		}
		if(vertexB.isFree === true) {
			// move particle from plane
			vec3.subtract(vertexB.cpos, vec3.scale(bToA, (depth*vertexB.imass), vec3.create()));
			// friction / damping
			vec3.add(vertexB.cpos, vec3.scale(velColl, (vertexB.cfric*vertexB.imass), vec3.create()));
		}

		// collision response callbacks
		vertexA.eventCallbacks.onVertexCollisionResponse.call(vertexA, vertexB, velColl);
		vertexB.eventCallbacks.onVertexCollisionResponse.call(vertexB, vertexA, velColl);

		// INSTRUMENTATION
		//THWAP.Instrumentation.log('VVCollisionResponses', [vertexA, vertexB]);

	}
	,vertexVsConstraint: function(vertex, constraint, edgeRay, t, collisionDepth){
		var collisionPoint = vec3.create()
			,edgeNormal = constraint.normal
			,D = vec3.create()
			,d2, velocity, velocityNormal, velocityCollisionPlane;

		vec3.add(vertex.cpos, vec3.scale(edgeRay, t), collisionPoint);
		vec3.subtract(vertex.cpos, collisionPoint, D);
		d2 = vec3.dot(D, D);

		// calculate velocity, velocity along normal, and collision plane
		velocity = vertex.getVelocity();
		velocityNormal = vec3.create();
		velocityCollisionPlane = vec3.create();
		vec3.scale(edgeNormal, vec3.dot(velocity, edgeNormal), velocityNormal);
		vec3.subtract(velocity, velocityNormal, velocityCollisionPlane);

		if(vertex.isFree === true){
			// move vertex from plane
			vec3.add(vertex.cpos, vec3.scale(vec3.create(edgeNormal), collisionDepth), vertex.cpos);
			//vec3.add(this.ppos, vec3.scale(vec3.create(edgeNormal), -collisionDepth), this.ppos);

			// apply more friction when colliding
			vec3.subtract(vertex.ppos, vec3.scale(velocityCollisionPlane, -vertex.cfric*vertex.imass), vertex.ppos);
		}

		// apply collision to each vertex, if they are free
		if(constraint.isFree === true){
			// move vertex from plane
			vec3.add(constraint.v1.cpos, vec3.scale(vec3.negate(vec3.create(edgeNormal)), collisionDepth), constraint.v1.cpos);
			vec3.add(constraint.v2.cpos, vec3.scale(vec3.negate(vec3.create(edgeNormal)), collisionDepth), constraint.v2.cpos);

			// apply more friction when colliding
			vec3.negate(vec3.scale(velocityCollisionPlane, -(constraint.v1.cfric + constraint.v2.cfric) /2));
			vec3.subtract(constraint.v1.ppos, velocityCollisionPlane, constraint.v1.ppos);
			vec3.subtract(constraint.v2.ppos, velocityCollisionPlane, constraint.v2.ppos);
		}

		// vertex constraint collision reponse callback
		vertex.eventCallbacks.onConstraintCollisionResponse.call(vertex, constraint, velocity, collisionDepth);
		constraint.eventCallbacks.onVertexCollisionResponse.call(constraint, vertex, velocity, collisionDepth);

		// INSTRUMENTATION
		//THWAP.Instrumentation.log('VCCollisionResponses', [vertex, constraint]);

		return vertex;
	}
};

//---------------------------------------------------------------------
// Export
//---------------------------------------------------------------------
window.THWAP = {
	EPSILON: 0.001
	,Vertex: Vertex
	,LinearConstraint: LinearConstraint
	,Body: Body
	,World: World
	,Instrumentation: Instrumentation
};
})();