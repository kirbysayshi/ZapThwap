(function(){

// declare namespace
var ENT = window.THWAP.Entities = {};

//---------------------------------------------------------------------
// SingleVertexBody: for use as a projectile and... other stuff
//---------------------------------------------------------------------
function SingleVertexBody(rad){
	THWAP.Body.call(this);
	var v = new THWAP.Vertex([0,0,0]);
	this.vlist.push(v);
	this.regA = this.regB = v; // there's only one!
}
SingleVertexBody.prototype = new THWAP.Body();
SingleVertexBody.constructor = SingleVertexBody;

SingleVertexBody.prototype.computeOrientationMatrix = function(){
	// this is all irrelevant to compute for only one vertex
	return this;
}

//---------------------------------------------------------------------
// RectangleBody: max of 4 verticies, 6 constraints
//---------------------------------------------------------------------
function RectangleBody(w, h){
	THWAP.Body.call(this);

	var corners = [
		 vec3.create([0, 0, 0])
		,vec3.create([w, 0, 0])
		,vec3.create([w, h, 0])
		,vec3.create([0, h, 0])
	];
	
	for(var c = 0; c < corners.length; c++){
		var q = new THWAP.Vertex(corners[c]);
		q.rad = 1;
		this.vlist.push(q);
	}
	
	// these are done manually to make sure that all normals point outward
	this.clist.push(
		new THWAP.LinearConstraint(this.vlist[0], this.vlist[1], 5),
		new THWAP.LinearConstraint(this.vlist[1], this.vlist[2], 5),
		new THWAP.LinearConstraint(this.vlist[2], this.vlist[3], 5),
		new THWAP.LinearConstraint(this.vlist[3], this.vlist[0], 5),
		new THWAP.LinearConstraint(this.vlist[0], this.vlist[2], 5),
		new THWAP.LinearConstraint(this.vlist[1], this.vlist[3], 5)
	);

	//this.createConstraints(5);
	
	this.regA = this.vlist[0];
	this.regB = this.vlist[1];
}
RectangleBody.prototype = new THWAP.Body();
RectangleBody.constructor = RectangleBody;

//---------------------------------------------------------------------
// ComplexRectangleBody: can be square or not
//---------------------------------------------------------------------
function ComplexRectangleBody(w, h){
	THWAP.Body.call(this);
	
	var  fillers = []
		,fRad = Math.min(w, h) / 2
		,cornerRad = fRad / 8
		,widerThanTall = w > h ? true : false
		,widthFillerCount = ~~(w / fRad)
		,heightFillerCount = ~~(h / fRad);
	
	if(widerThanTall === true){
		for(var i = 1; i < widthFillerCount; i++){
			fillers.push( vec3.create([i*fRad, fRad, 0]) )
		}
	} else {
		for(var i = 1; i < heightFillerCount; i++){
			fillers.push( vec3.create([fRad, i*fRad, 0]) )
		}
	}

	var corners = [
		 vec3.create([cornerRad, cornerRad, 0])
		,vec3.create([w-cornerRad, cornerRad, 0])
		,vec3.create([w-cornerRad, h-cornerRad, 0])
		,vec3.create([cornerRad,  h-cornerRad, 0])
	];
	
	for(var c = 0; c < corners.length; c++){
		var q = new THWAP.Vertex(corners[c]);
		q.rad = cornerRad;
		this.vlist.push(q);
	}
	
	this.clist.push(
		new THWAP.LinearConstraint(this.vlist[0], this.vlist[1], 5),
		new THWAP.LinearConstraint(this.vlist[1], this.vlist[2], 5),
		new THWAP.LinearConstraint(this.vlist[2], this.vlist[3], 5),
		new THWAP.LinearConstraint(this.vlist[3], this.vlist[0], 5)
	);
	
	for(var v = 0; v < fillers.length; v++){
		var p = new THWAP.Vertex(fillers[v]);
		p.rad = fRad;
		this.vlist.push(p);
	}

	this.createConstraints(5);
	
	// this exploits the idea that corners were added first
	this.regA = this.vlist[0];
	this.regB = this.vlist[1];
}
ComplexRectangleBody.prototype = new THWAP.Body();
ComplexRectangleBody.constructor = ComplexRectangleBody;

//---------------------------------------------------------------------
// CircleBox: Four closely-overlapping circles. Very sturdy
//---------------------------------------------------------------------
function CircleBox(w){
	THWAP.Body.call(this);
	
	var  rad = w * Math.sqrt(2) / 2
		,s = w / 2
		,corners = [
			 vec3.create([0, 0, 0])
			,vec3.create([s, 0, 0])
			,vec3.create([s, s, 0])
			,vec3.create([0, s, 0])
		];
	
	for(var c = 0; c < corners.length; c++){
		var q = new THWAP.Vertex(corners[c]);
		q.rad = rad;
		this.vlist.push(q);
	}

	this.createConstraints(5);
	this.regA = this.vlist[0];
	this.regB = this.vlist[1];
}
CircleBox.prototype = new THWAP.Body();
CircleBox.constructor = CircleBox;

//---------------------------------------------------------------------
// SolidSphere: 
// This blows up unless two or more vertices are heavier than the others
//---------------------------------------------------------------------
function SolidSphere(rad){
	THWAP.Body.call(this);
	
	var vCount = 8;
	
	for(var i = 0; i < vCount; i++){
		var t = (Math.PI * 2) * (i / vCount)
			,pos = vec3.scale( [Math.cos(t), Math.sin(t), 0], rad )
			,p = new THWAP.Vertex(pos);
		p.rad = rad;
		this.vlist.push(p);
	}
	
	this.createConstraints(5);
	this.clist.forEach(function(c){
		c.isCollidable = false;
	});
	
	// the loop operates counter-clockwise
	this.regA = this.vlist[2];
	this.regB = this.vlist[0];
	
	// make it not blow up... it needs an anchor, 
	// otherwise it spins out of control
	this.vlist[0].imass = 1/10;
	this.vlist[2].imass = 1/10;
}
SolidSphere.prototype = new THWAP.Body();
SolidSphere.constructor = SolidSphere;

//---------------------------------------------------------------------
// BoundsBox: Keeps things in... sort of
//---------------------------------------------------------------------
function BoundsBox(tL, bR){
	THWAP.Body.call(this);
	
	// this goes counter-clockwise to have the normals point inward
	var vs = [
		 vec3.create([tL[0],tL[1],0])
		,vec3.create([tL[0],bR[1],0])
		,vec3.create([bR[0],bR[1],0])
		,vec3.create([bR[0],tL[1],0])
	];
	
	for(var i = 0; i < vs.length; i++){
		var v = new THWAP.Vertex(vs[i]);
		v.isFree = false;
		v.rad = 20;
		v.cfric = 0;
		v.imass = 1/10;
		this.vlist.push(v);
		
		// connect previous to new 
		if(i > 0 && i < vs.length){
			var c = new THWAP.LinearConstraint(this.vlist[i-1], v);
			c.isCollidable = true;
			c.isFree = false;
			this.clist.push(c);
		}
		
		// connect last to first
		if(i == vs.length - 1){
			var c = new THWAP.LinearConstraint(v, this.vlist[0]);
			c.isCollidable = true;
			c.isFree = false;
			this.clist.push(c);
		}
	}
	this.regA = this.vlist[0];
	this.regB = this.vlist[this.vlist.length-1];
}
BoundsBox.prototype = new THWAP.Body();
BoundsBox.constructor = BoundsBox;

//---------------------------------------------------------------------
// Export to global space!
//---------------------------------------------------------------------
ENT.SingleVertexBody = SingleVertexBody;
ENT.RectangleBody = RectangleBody;
ENT.ComplexRectangleBody = ComplexRectangleBody;
ENT.CircleBox = CircleBox;
ENT.SolidSphere = SolidSphere;
ENT.BoundsBox = BoundsBox;

})();