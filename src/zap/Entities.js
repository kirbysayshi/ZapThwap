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
		'matrix3d(' + this.orientation.map(function(e){
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
	var  v1 = new THWAP.Vertex(vec3.create([0,0,0]))
		,v2 = new THWAP.Vertex(vec3.create([w,0,0]))
		,v3 = new THWAP.Vertex(vec3.create([w,h,0]))
		,v4 = new THWAP.Vertex(vec3.create([0,h,0]))
		,tc = new THWAP.LinearConstraint(v1,v2) // top
		,rc = new THWAP.LinearConstraint(v2,v3) // right
		,bc = new THWAP.LinearConstraint(v3,v4) // bottom
		,lc = new THWAP.LinearConstraint(v4,v1) // left
		,dc = new THWAP.LinearConstraint(v1,v3) // cross down
		,uc = new THWAP.LinearConstraint(v4,v2); // cross up
	dc.collidable = false; uc.collidable = false;
	this.physicsObject.vlist.push(v1, v2, v3, v4);
	this.physicsObject.clist.push(tc, rc, bc, lc, dc, uc);
	this.physicsObject.regA = v1;
	this.physicsObject.regB = v2;
}
Box.prototype = {
	update: function(dt){
		// this should be handled by THWAP
		//this.physicsObject
		//	.update(dt);
		
		this.spriteObject
			.updateAnimation(dt)
			.setOrientationMatrix(
				this.physicsObject.computeOrientationMatrix())
			.draw();
	}
	,debugDraw: function(ctx, offset){
		var  v1 = this.physicsObject.vlist[0]
			,v2 = this.physicsObject.vlist[1]
			,v3 = this.physicsObject.vlist[2]
			,v4 = this.physicsObject.vlist[3];

		ctx.save();

		ctx.beginPath();
		for(var i = 0; i < this.physicsObject.clist.length; i++){
			var c = this.physicsObject.clist[i];
			ctx.moveTo(c.v1.cpos[0] + offset[0], c.v1.cpos[1] + offset[1]);
			ctx.lineTo(c.v2.cpos[0] + offset[0], c.v2.cpos[1] + offset[1]);
		}
		ctx.stroke();

		// draw vertices
		ctx.fillStyle = "#FF0000"; // red
		ctx.beginPath();
		ctx.arc(v1.cpos[0] + offset[0], v1.cpos[1] + offset[1], v1.rad, 0, Math.PI*2, false);
		ctx.fill();
		ctx.fillStyle = "#CC66FF"; // purple
		ctx.beginPath();
		ctx.arc(v2.cpos[0] + offset[0], v2.cpos[1] + offset[1], v2.rad, 0, Math.PI*2, false);
		ctx.fill();
		ctx.fillStyle = "#33FFFF"; // aquamarine
		ctx.beginPath();
		ctx.arc(v3.cpos[0] + offset[0], v3.cpos[1] + offset[1], v3.rad, 0, Math.PI*2, false);
		ctx.fill();
		ctx.fillStyle = "#99CC33"; // green
		ctx.beginPath();
		ctx.arc(v4.cpos[0] + offset[0], v4.cpos[1] + offset[1], v4.rad, 0, Math.PI*2, false);
		ctx.fill();
		
		ctx.restore();
	}
}


return {
	Sprite: Sprite,
	DOMSprite: DOMSprite,
	Box: Box
}

})();