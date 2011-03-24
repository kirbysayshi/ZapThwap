//var ANGRY = (function(){

var ANGRY = {};

//ANGRY.init = function(){
	var TWorld = new THWAP.World()
		,$dWorld = $("#domWorld")
		,$dView = $("#domViewport")
		,$cWorld = $("#cvsWorld")
		,info = $("#info")[0]
		,tsInfo = $("#tsInfo")[0]
		,ctx = $cWorld[0].getContext('2d')
		,box = new ZAP.Entities.Box(62, 64, 'src/zap/defaults/mmzmugs1sheet.gif')
		,box2 = new ZAP.Entities.Box(62, 64, 'src/zap/defaults/mmzmugs1sheet.gif')
		,wall = new ZAP.Entities.Box(600, 200)
		,tsStats;
	
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
		.moveTo([200,340,0])
		.setPassiveFriction(0.001)
		.setCollisionFriction(1)
		.clist.forEach(function(c){
			c.isCollidable = false;
		});
	
	box2.physicsObject
		.moveTo([200,275,0])
		.setPassiveFriction(0.001)
		.setCollisionFriction(1)
		.clist.forEach(function(c){
			c.isCollidable = false;
		});
	
	TWorld
		.addBody(box.physicsObject)
		.addBody(box2.physicsObject)
		.addBody(wall.physicsObject);
	
	//ZAP.CGLM
	//	.setFPS(100)
	//	.setMode('sycnronicity', 5);
	
	ZAP.CGLM
		.setMode('custom')
		.mode
			.setFPS(100)
			.setTimeStep(50)
			.setSpeedX(1);
	
	//ZAP.CGLM
	//	.setMode('realtime')
	//	.mode
	//		.setFPS(100)
	//		.setTimeStep(10)
	//		.setSimTimeScale(1);
	
	ZAP.CGLM.register(function priorityOne(dt, stats){
		//dt *= 0.001; 
		KEY.dispatcher();
		TWorld.step(dt*0.001); // dt comes in ms, we need seconds
		box.physicsObject.addAcceleration([0,1000,0]);
		box2.physicsObject.addAcceleration([0,1000,0]);
		
		tsStats = stats;
	}, function priorityTwo(stats){
		//stats.dt *= 0.001;
		ctx.clearRect(0,0,2000,2000);
		
		box.update(stats.dt);
		box2.update(stats.dt); 
		wall.update(stats.dt);
		
		box.debugDraw(ctx);
		box2.debugDraw(ctx);
		wall.debugDraw(ctx);
		
		info.innerHTML = [
			 'DT: ' + stats.delta
			,'<br /> FPS: ' + stats.fps
			,'<br /> AVG FPS: ' + stats.avgfps
			,'<br /> LAG: ' + stats.lag
			//,'<br /> ITERATIONS: ' + iterations
		].join('');
		
		tsInfo.innerHTML = [
			 'TS: ' + tsStats.delta
			,'<br /> IPS: ' + tsStats.ips
			,'<br /> AVG IPS: ' + tsStats.avgips
			,'<br /> ITERATIONS: ' + tsStats.iterations
		].join('');
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
