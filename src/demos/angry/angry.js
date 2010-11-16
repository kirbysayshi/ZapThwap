//var ANGRY = (function(){

var ANGRY = {};

//ANGRY.init = function(){
	var TWorld = new THWAP.World()
		,$dWorld = $("#domWorld")
		,$dView = $("#domViewport")
		,$cWorld = $("#cvsWorld")
		,info = $("#info")[0]
		,ctx = $cWorld[0].getContext('2d')
		,box = new ZAP.Entities.Box(62, 64, 'src/zap/defaults/mmzmugs1sheet.gif')
		,box2 = new ZAP.Entities.Box(62, 64, 'src/zap/defaults/mmzmugs1sheet.gif')
		,wall = new ZAP.Entities.Box(600, 200);
	
	box.spriteObject.attachTo($dWorld[0]);
	box2.spriteObject.attachTo($dWorld[0]);
	wall.spriteObject.attachTo($dWorld[0]);
	
	wall.physicsObject.moveTo([0,400,0]);
	
	wall.physicsObject.vlist.forEach(function(v){
		v.isFree = false;
		v.isCollidable = false;
	});
	
	wall.physicsObject.clist.forEach(function(c){
		c.isFree = false;
		//c.isCollidable = false;
	});
	
	box.physicsObject
		.moveTo([80,340,0])
		.setPassiveFriction(0.001)
		.setCollisionFriction(1)
		.clist.forEach(function(c){
			c.isCollidable = false;
			c.iterations = 1;
		});
	
	box2.physicsObject
		.moveTo([80,275,0])
		.setPassiveFriction(0.001)
		.setCollisionFriction(1)
		.clist.forEach(function(c){
			c.isCollidable = false;
		});
	
	TWorld
		.addBody(box.physicsObject)
		.addBody(box2.physicsObject)
		.addBody(wall.physicsObject);
	
	ZAP.CGLM
		.setFPS(100)
		.setMode('accuracy', 10);
	
	ZAP.CGLM.register(function priorityOne(dt){
		//dt *= 0.001; 
		KEY.dispatcher();
		TWorld.step(dt*0.001); // dt comes in ms, we need seconds
		box.physicsObject.addAcceleration([0,1000,0]);
		box2.physicsObject.addAcceleration([0,1000,0]);
		
		box.update(dt);
		box2.update(dt); 
		wall.update(dt);
	}, function priorityTwo(dt, fps, afps, lag, iterations){
		dt *= 0.001;
		ctx.clearRect(0,0,2000,2000);
		box.debugDraw(ctx);
		box2.debugDraw(ctx);
		wall.debugDraw(ctx);
		info.innerHTML = "DT: " + dt + " FPS: " + fps + ", AVG FPS: " + afps + " LAG: " + lag + " ITERATIONS: " + iterations;
	});
	
	KEY.listen(function(down){
		
		var transform = false;
		
		if(down[27].delta > 0){ ZAP.CGLM.stop(); }
		
		if(down[32].delta > 0 && down[32].delta < 100){
			console.log(box.physicsObject.vlist[0].getBoundingBox());
		}
		
		if(down[87].delta > 0 && down[87].delta < 100){ // W
			box.physicsObject.addAcceleration([0,-10000,0]);
		}
		
		if(down[83].delta > 0){ // S
			box.physicsObject.addAcceleration([0,1000,0]);
		}
		
		if(down[65].delta > 0){ // A
			box.physicsObject.addAcceleration([-1000,0,0]);
		}
		
		if(down[68].delta > 0){ // D
			box.physicsObject.addAcceleration([1000,0,0]);
		}
		
	});

//body.onload = ZAP.CGLM.start;
ZAP.CGLM.start();
//}

//return new ANGRY.init();
//})();
