(function(){	

//---------------------------------------------------------------------
// ThwapWorld
//---------------------------------------------------------------------
function World(){
	this.dim = [0,0,0];
	this.vlist = [];
	this.clist = [];
	this.blist = [];
}
World.prototype.addVertex = function(v){
	this.vlist.push(v);
}
World.prototype.addBody = function(b){
	this.blist.push(b);
	for(var i = 0; i < b.constraints.length; i++){
		var c = b.constraints[i];
		this.clist.push(c);
		this.vlist.push(c.v1, c.v2);
	}
}

//---------------------------------------------------------------------
// ThwapVertex
//---------------------------------------------------------------------
function Vertex(position){
	this.cpos = position || vec3.create([0,0,0]);
	this.ppos = position || vec3.create([0,0,0]); 
	this.acel = vec3.create([0,0,0]);
	this.grav = vec3.create([0,0,0]); 
	this.isFree = false;
	this.collidable = true;
	this.rad  = 8;
	this.mass = 10;
	this.gfric = 0.01; // basically passive friction
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
	var s = this,
		temp = vec3.create(s.cpos), // save for later
		vel = vec3.create();
		
	// add gravity to acel
	vec3.add(s.acel, s.grav);

	// calculate current velocity (vel is == ) 
	vec3.add( vec3.subtract(s.cpos, s.ppos, vel), vec3.scale(s.acel, dt*dt) );
	
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
		vec3.subtract(v1.cpos, v2.cpos, diff);
		var len = vec3.length(diff);
		this.restLength = [len, len]; // calculated
	} else {
		this.restLength = restLen
	}
	
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
	
}
LinearConstraint.prototype.computeNormal = function(){
	var diff = vec3.create();
	vec3.subtract(this.v2.cpos, this.v1.cpos, diff);
	this.normal[0] = -diff[1];
	this.normal[1] = -diff[0]; // I think this needs to be negated also
	this.normal[2] = 0;
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
	//this.dirty = true; // let's optimize later
}
Body.prototype.computeOrientationMatrix = function(){
	//if(this.dirty === false) return this.orientation;
	var regRay = vec3.create()
		,oriRay = vec3.create([1,0,0]) // unit vector!
		//,w = vec3.create() // the normal of rotation, the z axis
		,ori4 = mat4.identity(this.orientation);
		
	// create registration ray
	vec3.subtract(this.regB.cpos, this.regA.cpos, regRay);
	vec3.normalize(regRay);
	
	// determine normal of rotation... but we know it's the z
	//vec3.cross(oriRay, regRay, w);

	this.rotation = Math.acos(vec3.dot(regRay, oriRay));
	//this.rotation = Math.asin(vec3.length(w));

	// normally the cross product would be used, but we don't need it
	// if z value is negative, rotation should be negative
	if(regRay[1] < 0 && this.rotation > 0) { this.rotation *= -1; }
	// if z value is positive, rotation should be positive
	if(regRay[1] > 0 && this.rotation < 0) { this.rotation *= -1; }

	mat4.translate(ori4, this.regA.cpos);
	mat4.rotateZ(ori4, this.rotation);
	//mat4.rotate(ori4, this.rotation, w);
	//this.dirty = false;
	return this.orientation;
};
Body.prototype.moveTo = function(vec){
	// make an identity matrix
	var mat = mat4.identity(mat4.create());
	// translate blank matrix to difference between registration A and position
	mat4.translate(
		mat, vec3.subtract(vec, this.regA.cpos)
	);
	
	// apply matrix to each vertex of each constraint
	for(var i = 0; i < this.vlist.length; i++){
		var v = this.vlist[i];
		mat4.multiplyVec3(mat, v.cpos);
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
			this.clist[j].satisfy(dt);
		}
	}
}

// Taken from http://blog.jcoglan.com/2007/07/23/writing-a-linked-list-in-javascript/
function LL(){}
LL.prototype = {
	length: 0
	,first: null
	,last: null
	,append: function(node){
		if(this.first == null){
			this.first = node;
			this.last = node;
		} else {
			node.prev = this.last;
			node.next = this.first;
			this.first.prev = node;
			this.last.next = node;
			this.last = node;
		}
		this.length++;
	}
	,insertAfter: function(node, newNode){
		newNode.prev = node;
		newNodw.next = node.next;
		node.next.prev = newNode;
		node.next = newNode;
		if (newNode.prev == this.last) { this.last = newNode; }
		this.length++;
	}
	,remove: function(node){
		if(this.length > 1){
			node.prev.next = node.next;
			node.next.prev = node.prev;
			if(node == this.first) { this.first = node.next; }
			if(node == this.last) { this.last = node.prev; }
		} else {
			this.first = null;
			this.last = null
		}
		node.prev = null;
		node.next = null;
		this.length--;
	}
};

function LLNode(obj){
	this.prev = null; 
	this.next = null;
	this.obj = obj;
};


//---------------------------------------------------------------------
// Export
//---------------------------------------------------------------------
window.THWAP = {
	Vertex: Vertex
	,LinearConstraint: LinearConstraint
	,Body: Body
	,World: World
};
})();