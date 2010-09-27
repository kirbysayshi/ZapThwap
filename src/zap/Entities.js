ZAP.Entities = (function(){

//---------------------------------------------------------------------
// Sprite: a bitmap-based animation sequence
//---------------------------------------------------------------------
function Sprite(){
	this.al = [];
	this.am = [];
	this.current = "";
	this.direction = "right";
	this.aframe = 0;
	this.aticker = 0;
	this.pos = vec3.create([0,0,0]);
}
Sprite.prototype.setAnimations = function(labels, metrics){
	this.al = labels;
	this.am = metrics;
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
};

//---------------------------------------------------------------------
// DOMSprite < Sprite: bitmap animation using a DOM node (div)
//---------------------------------------------------------------------
function DOMSprite(img, aniLabels, aniMetrics){
	Sprite.call(this);

	this.setAnimations(aniLabels, aniMetrics);

	this.el = document.createElement('div');
	this.elStyle = this.el.style;
	this.elStyle.position = 'absolute';
	this.elStyle.backgroundImage = 'url(img/' + img + ')';
	this.elStyle.left = '0px';
	this.elStyle.top = '0px';

}; ZAP.inherits(DOMSprite, Sprite);
DOMSprite.prototype.attachTo = function(element){
	element.appendChild(this.el);
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

	// set proper background and width/height		
	this.elStyle.backgroundPosition = 
		(curAFrame.x * -1) + "px " + (curAFrame.y * -1) + "px";
	this.elStyle.width = curAFrame.w + "px";
	this.elStyle.height = curAFrame.h + "px";

	// set proper top/left based on physics
	this.elStyle.left = this.pos[0] + "px";
	this.elStyle.top = this.pos[1] + "px";
}

function Box(w, h){
	this.materialType = "";
	this.spriteObject = new DOMSprite('', [], []);
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
	
}


return {
	Sprite: Sprite,
	DOMSprite: DOMSprite,
	Box: Box
}

})();