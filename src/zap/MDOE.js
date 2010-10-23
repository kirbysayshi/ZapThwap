var MDOE = {
	 doList: []
	,globalForces: []
	,globalForcesDirty = true
	,globalForcesTotal = vec3.create([0,0,0])
	,getGlobalForcesTotal: function(){
		if(MDOE.globalForcesDirty === false) { 
			return MDOE.globalForcesTotal; 
		}
		
		var total = vec3.set(MDOE.globalForcesTotal, [0,0,0]);
		return MDOE.globalForces.forEach(function(f){
			vec3.add(total, f);
		});
	}
	,step: function(dt){
		var doList = MDOE.doList;
		for(var i = 0; i < doList.length; i++){
			doList[i].update(dt);
		}
	}
}

function DeformableObject(){
	this.pList = [];
	this.oMassCenter = [0,0,0];
	this.cMassCenter = [0,0,0];
	this.alpha = 0;
	this.beta = 0;
	this.elasticity = 0;
	
	this.q = [];
	this.p = [];
	this.A_qq = mat4.create();
	this.dirty = true;
}
DeformableObject.prototype.update = function(dt){
	this.setupCalculations();
	this.updateGoalPositions(dt);
	for(var i = 0; i < this.pList.length; i++){
		this.pList[i].update(dt);
	}
}
DeformableObject.prototype.updateGoalPositions = function(dt){
	
}
DeformableObject.prototype.updateCenterOfMass = function(dt){
	
}
DeformableObject.prototype.calculateA_pqMatrix = function(){
	
}
DeformableObject.prototype.calculateRotationMatrix = function(A_pq){
	
}
DeformableObject.prototype.addParticle = function(p){

}
DeformableObject.prototype.removeParticle = function(p){

}
DeformableObject.prototype.setupCalculations = function(){
	if(this.dirty === false) { return; }
	
	this.dirty = false;
}
DeformableObject.prototype.draw = function(ctx){

}

function Particle(owner, position, radius, mass){
	this.mass = mass || 1;
	this.radius = radius || 10;
	this.cpos = vec3.create(position); // current position
	this.opos = vec3.create(position); // original position
	this.gpos = vec3.create(position); // goal position
	this.rpos = vec3.create(position); // roof position?
	this.velocity = [0,0,0];
	this.acceleration = [0,0,0];
	this.owner = owner; // the body this particle belongs to
}
Particle.prototype.update = function(dt){
	var  gForce = MDOE.getGlobalForcesTotal()
		,posDiff = vec3.subtract(this.gpos, this.rpos, vec3.create([0,0,0]))
	
	this.velocity[0] += ((this.gpos[0] - this.rpos[0]) / dt) 
		* this.owner.alpha + (gForce[0]/this.mass)*dt;
	this.velocity[1] += ((this.gpos[1] - this.rpos[1]) / dt) 
		* this.owner.alpha + (gForce[1]/this.mass)*dt;
	this.velocity[2] += ((this.gpos[2] - this.rpos[2]) / dt) 
		* this.owner.alpha + (gForce[2]/this.mass)*dt;
}
Particle.prototype.getWillCollideWith = function(newPos){
	var doList = MDOE.doList;
	for(var i = 0; i < doList.length; i++){
		var  dObj = doList[i]
			,pList = dObj.pList
			,pCount = pList.length - 1;
		
		if(dObj === this.owner) { continue; }
		
		while(pCount-- >= 0){
			var  p = pList[pCount]
				,distance = vec3.length(
					vec3.subtract(newPos, p.cpos, [0,0,0])
				);
				
			if(distance < this.radius + p.radius){
				return p;
			}
		}
	}
}
Particle.prototype.draw = function(ctx){
	
}