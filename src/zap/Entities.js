ZAP.Entities = (function(){

//---------------------------------------------------------------------
// Sprite: a bitmap-based animation sequence
//---------------------------------------------------------------------
function Sprite(){
	this.al = [];
	this.am = [];
	this.current = '';
	this.direction = "right";
	this.aframe = 0;
	this.aticker = 0;
	this.pos = vec3.create([0,0,0]); // TODO: is this needed?
	this.orientation = mat4.identity(mat4.create());
}
Sprite.prototype.setAnimations = function(labels, metrics){
	this.al = labels;
	this.am = metrics;
	this.current = labels[0];
	return this;
};
Sprite.prototype.updateAnimation = function(deltaTime){
	var curAnimSeq = this.am[this.al.indexOf(this.current)]
		,curAFrame = curAnimSeq[ this.aframe ];

	if(curAFrame == undefined) { curAFrame = curAnimSeq[0]; }

	this.aticker += deltaTime;

	if(this.aticker > curAFrame.d){
		this.aticker = 0;
		this.aframe++;
	}

	if(this.aframe >= curAnimSeq.length){
		this.aframe = 0;
	}
	return this;
};
Sprite.prototype.setOrientationMatrix = function(matrix4){
	mat4.set(matrix4, this.orientation);
	return this;
}
Sprite.prototype.setCurrentAnimation = function(name){
	this.aticker = 0;
	this.aframe = 0;
	this.current = name;
}

//---------------------------------------------------------------------
// DOMSprite < Sprite: bitmap animation using a DOM node (div)
//---------------------------------------------------------------------
function DOMSprite(imgPath, aniLabels, aniMetrics){
	Sprite.call(this);

	this.setAnimations(aniLabels, aniMetrics);

	this.el = document.createElement('div');
	this.elStyle = this.el.style;
	this.elStyle.position = 'absolute';
	this.elStyle.backgroundImage = 'url(' + imgPath + ')';
	this.className = 'DOMSprite';
	//this.elStyle.left = '0px';
	//this.elStyle.top = '0px';

}; ZAP.inherits(DOMSprite, Sprite);
DOMSprite.prototype.attachTo = function(element){
	element.appendChild(this.el);
	return this;
};
DOMSprite.prototype.draw = function(){
	var curAnimSeq = this.am[this.al.indexOf(this.current)]
		,curAFrame = curAnimSeq[ this.aframe ];

	// remove mirror class
	this.el.className.replace(/\bx-mirror\b/gi, '');

	// apply mirror class if necessary
	if(this.direction == "left"){
		this.el.className += " x-mirror";
	}

	// TODO: is it too slow to use ZAP.DOM.css() here?

	// set proper background and width/height		
	this.elStyle.backgroundPosition = 
		(curAFrame.x * -1) + "px " + (curAFrame.y * -1) + "px";
	this.elStyle.width = curAFrame.w + "px";
	this.elStyle.height = curAFrame.h + "px";

	// set proper top/left based on this.pos (updated by physics)
	this.elStyle.left = this.pos[0] + "px";
	this.elStyle.top = this.pos[1] + "px";
	
	// set orientation
	this.elStyle.webkitTransform = 
		'matrix3d(' + this.orientation.map(function zeroClampTMatrix(e){
			if( e < ZAP.EPSILON && e > -ZAP.EPSILON) e = 0;
			return e;
		}).join(', ') + ')';
	
	this.elStyle.webkitTransformOrigin = '0 0';
	this.elStyle.MozTransformOrigin = '0 0';
	
	//console.log(this.elStyle.webkitTransform);
	
	return this;
}

//---------------------------------------------------------------------
// Box, has a physics and sprite object 
//---------------------------------------------------------------------
function Box(w, h, img, al, am){
	this.materialType = "";
	this.spriteObject = new DOMSprite(
		 img || 'defaults/mmzmugs1sheet.gif'
		,al || ['faces']
		,am || [
			[	// faces
				 { x: 3  , y: 4, w: 62, h: 64, d: 1000}
				,{ x: 70 , y: 4, w: 62, h: 64, d: 1000}
				,{ x: 137, y: 4, w: 62, h: 64, d: 1000}
			]
		]);
	this.physicsObject = new THWAP.Body();
	
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
		, vec3.create([w-cornerRad, cornerRad, 0])
		, vec3.create([w-cornerRad, h-cornerRad, 0])
		, vec3.create([cornerRad,  h-cornerRad, 0])
	];
	
	for(var c = 0; c < corners.length; c++){
		var q = new THWAP.Vertex(corners[c]);
		q.rad = cornerRad;
		this.physicsObject.vlist.push(q);
	}
	
	for(var v = 0; v < fillers.length; v++){
		var p = new THWAP.Vertex(fillers[v]);
		p.rad = fRad;
		this.physicsObject.vlist.push(p);
	}

	this.physicsObject.createConstraints(5);
	
	// this exploits the idea that corners were added first
	this.physicsObject.regA = this.physicsObject.vlist[0];
	this.physicsObject.regB = this.physicsObject.vlist[1];

}
Box.prototype = {
	update: function(dt){
		// this only handles the sprite, physics are handled by THWAP.step()
		
		this.spriteObject
			.updateAnimation(dt)
			.setOrientationMatrix
				(this.physicsObject.orientation)
			.draw();
	}
	,debugDraw: function(ctx){
		var  v1 = this.physicsObject.vlist[0]
			,v2 = this.physicsObject.vlist[1]
			,v3 = this.physicsObject.vlist[2]
			,v4 = this.physicsObject.vlist[3];

		ctx.save();
		ctx.strokeStyle = 'rgba(142,142,142,0.5)';

		
		for(var i = 0; i < this.physicsObject.clist.length; i++){
			var c = this.physicsObject.clist[i];
			c.debugDrawNormal(ctx);
			ctx.beginPath();
			ctx.moveTo(c.v1.cpos[0], c.v1.cpos[1]);
			ctx.lineTo(c.v2.cpos[0], c.v2.cpos[1]);
			ctx.stroke();
		}
		

		// draw vertices
		ctx.fillStyle = "#FF0000"; // red
		ctx.beginPath();
		ctx.arc(v1.cpos[0], v1.cpos[1], v1.rad, 0, Math.PI*2, false);
		ctx.fill();
		ctx.fillStyle = "#CC66FF"; // purple
		ctx.beginPath();
		ctx.arc(v2.cpos[0], v2.cpos[1], v2.rad, 0, Math.PI*2, false);
		ctx.fill();
		ctx.fillStyle = "#33FFFF"; // aquamarine
		ctx.beginPath();
		ctx.arc(v3.cpos[0], v3.cpos[1], v3.rad, 0, Math.PI*2, false);
		ctx.fill();
		ctx.fillStyle = "#99CC33"; // green
		ctx.beginPath();
		ctx.arc(v4.cpos[0], v4.cpos[1], v4.rad, 0, Math.PI*2, false);
		ctx.fill();
		
		
		for(var j = 0; j < this.physicsObject.vlist.length; j++){
			ctx.beginPath();
			var v = this.physicsObject.vlist[j];
			ctx.arc(v.cpos[0], v.cpos[1], v.rad, 0, Math.PI*2, false);
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
		
		var phys = this.physicsObject;
		ctx.beginPath();
		ctx.arc(phys.boundingPos[0], phys.boundingPos[1], phys.boundingRad, 0, Math.PI*2, false);
		ctx.stroke();
		
		ctx.restore();
	}
}


return {
	Sprite: Sprite,
	DOMSprite: DOMSprite,
	Box: Box
}

})();