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
}
Vertex.prototype.collideVertex = function(){
	if(this.collidable === false) return;
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
}

//---------------------------------------------------------------------
// ThwapConstraint
//---------------------------------------------------------------------
function LinearConstraint(v1, v2, restLen){
	this.v1 = v1;
	this.v2 = v2;
	// restLength[min,max] if both are the same it is very rigid
	this.restLength = [0,0]; // todo: calculate this
	this.isStatic = false; // cannot move, ie static geometry (like the ground)
	this.collidable = true;
	this.normal = this.computeNormal(); // calculate normal here
	
	if(!v1.isFree && !v2.isFree){
		// this flag tells us we don't need to recalculate the normal
		this.isStatic = true;
	}
}
LinearConstraint.prototype.satisfy = function(){
	
}
LinearConstraint.prototype.computeNormal = function(){
	
}

//---------------------------------------------------------------------
// ThwapBody: collection of constraints and vertices, with orientation
//---------------------------------------------------------------------
function Body(){
	this.constraints = [];
}
// transform all vertices counter-clockwise by degrees
Body.prototype.rotate = function(degrees){
	
}


//---------------------------------------------------------------------
// Export
//---------------------------------------------------------------------
window.THWAP = {
	Vertex: Vertex
	,LinearConstraint: LinearConstraint
	,World: World
};
})();