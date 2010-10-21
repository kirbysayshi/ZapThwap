//var ANGRY = (function(){

var ANGRY = {};

//ANGRY.init = function(){
	var TWorld = new THWAP.World()
		,$dWorld = $("#domWorld")
		,$dView = $("#domViewport")
		,$cWorld = $("#cvsWorld")
		,ctx = $cWorld[0].getContext('2d')
		,box = new ZAP.Entities.Box(62, 64, 'src/zap/defaults/mmzmugs1sheet.gif')
		,box2 = new ZAP.Entities.Box(62, 64, 'src/zap/defaults/mmzmugs1sheet.gif')
		,wall = new ZAP.Entities.Box(600, 200);
	
	box.spriteObject.attachTo($dWorld[0]);
	box2.spriteObject.attachTo($dWorld[0]);
	wall.spriteObject.attachTo($dWorld[0]);
	
	wall.physicsObject.moveTo([0,400,0]);
	for(var i = 0; i < wall.physicsObject.vlist.length; i++){
		wall.physicsObject.vlist[i].isFree = false;
		wall.physicsObject.vlist[i].isCollidable = false;
	}
	for(var c = 0; c < wall.physicsObject.clist.length; c++){
		wall.physicsObject.clist[c].isFree = false;
	}
	
	box.physicsObject
		.moveTo([80,340,0])
		.setPassiveFriction(0.001)
		.setCollisionFriction(0.5);
	
	box2.physicsObject
		.moveTo([81,275,0])
		.setPassiveFriction(0.001)
		.setCollisionFriction(0.5);
	
	TWorld
		.addBody(box.physicsObject)
		.addBody(box2.physicsObject)
		.addBody(wall.physicsObject);
	
	//console.log(box.physicsObject.clist.length);
	//console.log(box.physicsObject.vlist.length);
	
	ZAP.CGLM.setFPS(100);
	
	ZAP.CGLM.register(function priorityOne(dt){
		dt *= 0.001; // dt comes in ms, we need seconds
		KEY.dispatcher();
		TWorld.step(dt);
		box.physicsObject.addAcceleration([0,1000,0]);
		box2.physicsObject.addAcceleration([0,1000,0]);
		
		box.update(dt);
		box2.update(dt); 
		wall.update(dt);
	}, function priorityTwo(dt){
		dt *= 0.001;
		ctx.clearRect(0,0,2000,2000);
		box.debugDraw(ctx, [0,0,0]);
		box2.debugDraw(ctx, [0,0,0]);
		wall.debugDraw(ctx, [0,0,0]);
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
	
	ZAP.CGLM.start();
//}

//return new ANGRY.init();
//})();
