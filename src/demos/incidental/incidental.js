function Incidental(){
	
	this.cvs = document.getElementById('cvsWorld');
	this.ctx = this.cvs.getContext('2d');
	this.info = document.getElementById('info');
	this.viewDimensions = [this.ctx.canvas.width, this.ctx.canvas.height];
	this.world = new THWAP.World();
	this.grid = new HSHG();
	//this.player = new THWAP.Entities.RectangleBody(30, 50);
	//this.player = new THWAP.Entities.SolidSphere(30, 50);
	this.player = new THWAP.Entities.SingleVertexBody(50);
	this.bounds = new THWAP.Entities.BoundsBox([0,-10000,0], [this.viewDimensions[0],0,0]);
	this.drawingScale = 1;
	this.objectLimits = [ 100,100,0 ];
	
	var self = this;
	
	(function(p){
		
		// augment the player physobj to have a collision callback and jump flag
		function setJump(){
			p.canJump = true;
		}

		p.vlist.forEach(function(v){
			v.eventCallbacks
				.onConstraintCollisionDetection = setJump;
			
			v.rad = 20;
		});

		p.computeBoundingBox(); // to access valid boundingPos
		//var dangly = new THWAP.Vertex( vec3.add(p.boundingPos, [0,50,0], [0,0,0]) );
		//dangly.imass = 1/2;
		//dangly.isCollidable = false;
		//p.vlist.push(dangly);
		//p.createConstraints(1);
		//p.clist[p.clist.length-1].isCollidable = false;
		//p.clist[p.clist.length-2].isCollidable = false;
		//p.clist[p.clist.length-3].isCollidable = false;
		//p.clist[p.clist.length-4].isCollidable = false;
		
		//p.vlist[2].imass = 1/10;
		//p.vlist[3].imass = 1/10;

		setJump();
		
		p.moveTo([self.viewDimensions[0]/2,-200,0])
			.setPassiveFriction(0.01)
			.setCollisionFriction(0.05);
		
		p.addAccelerationToDangly = function(vec){
			vec3.add(dangly.acel, vec);
		}
			
	})(this.player);
	
	// add bodies to world		
	this.world.handleCollisions = false;
	this.world
		.addBody(this.player)
		.addBody(this.bounds);
	
	// this is necessary, since it's not computed on creation
	this.bounds.computeBoundingBox();
	
	// add bodies to collision grid
	this.grid.addObject(this.player)
	this.grid.addObject(this.bounds);
	
	// Attach key input
	KEY.listen(function(down){
		
		// ESC = stop simulation (pause)
		if(down[27].delta > 0){ 
			ZAP.CGLM.stop();
			console.log(THWAP.Instrumentation.library);
		}
		
		// A = left
		if(down[65].delta > 0 ){ 
			self.player.addAcceleration(
				self.player.canJump === true 
				? [-3000,10000,0]
				: [-600,0,0] );
			
			self.player.addAcceleration(
				self.player.canJump === true 
				? [0,-3000,0]
				: [0,0,0] );
		}

		// D = right
		if(down[68].delta > 0 ){ 
			self.player.addAcceleration(
				self.player.canJump === true
				? [3000,10000,0]
				: [600,0,0] );
	
			self.player.addAcceleration(
				self.player.canJump === true 
				? [0,-3000,0]
				: [0,0,0] );
		}
		
		// SPACE = jump
		if(down[32].delta > 0 && self.player.canJump === true){
			self.player.addAcceleration([0,-90000,0]);
			self.player.canJump = false;
		}
	});
	
	self.cvs.addEventListener('click', function(){
		self.spawnFallingObject();
	}, false);
	
	this.spawnFallingObject = function(){
		var obj = new THWAP.Entities.RectangleBody(
			Math.random() * self.objectLimits[0],
			Math.random() * self.objectLimits[1]);
		
		var playerPos = self.player.boundingPos;
		
		obj.moveTo([self.viewDimensions[0] * Math.random(), -1000, 0])
			.setPassiveFriction(0.05)
			.setCollisionFriction(0.9)
			.computeBoundingBox();
		
		obj.clist.forEach(function(c){
			c.iterations = 20;
		})
		
		obj.vlist.forEach(function(v){
			v.rad = 10;
			v.imass = 1/5;
		});
		
		self.grid.addObject(obj);
		self.world.addBody(obj);
	}
	
	this.onPriorityUpdate = function(dt){
		// physics. this will run more times than frames, hopefully
		
		var collisions, i, pair;
		
		KEY.dispatcher(); // update keypress deltas and call KEY.listen's callback
		
		// apply gravity to world
		for(i = 0; i < self.world.blist.length; i++){
			self.world.blist[i].addAcceleration([0,5000,0]);
		}
		
		// collision handling
		self.grid.update();
		collisions = self.grid.queryForCollisionPairs();
		for(i = 0; i < collisions.length; i++){
			pair = collisions[i];
			pair[0].collideWithBody(pair[1]);
		}
		
		self.world.step(dt*0.001); // dt comes in ms, Thwap needs seconds
	}
	
	this.onSecondaryUpdate = function(stats){
		// drawing
		
		var  i, offset = ZAP.Scroller.getOffset(self.player.boundingPos);
		
		self.ctx.clearRect(0, 0, 
			self.viewDimensions[0],self.viewDimensions[1]);
		
		// debug draw is just basic, and expected to be overridden
		for(i = 0; i < self.world.blist.length; i++){
			self.world.blist[i].debugDraw(self.ctx, offset, self.drawingScale);
		}
		
		self.info.innerHTML = [
			 'DT: ' + stats.delta
			,'<br /> FPS: ' + stats.fps
			,'<br /> AVG FPS: ' + stats.avgfps
			,'<br /> LAG: ' + stats.lag
			//,'<br /> ITERATIONS: ' + iterations
		].join('');

		
	}
	
	// set scrolling dimensions and scale
	ZAP.Scroller.set(this.viewDimensions, this.drawingScale);
	
	// configure the CGLM
	ZAP.CGLM
		.setMode('custom')
		.mode
			.setFPS(30)
			.setTimeStep(10)
			.setSpeedX(1);
			//.setSimTimeScale(1);
	
	// prime CGLM callbacks and begin rendering, simulation!
	ZAP.CGLM
		.register(this.onPriorityUpdate, this.onSecondaryUpdate)
		.start();
}

var theIncident = new Incidental();