//var ANGRY = (function(){

var ANGRY = {};

//ANGRY.init = function(){
	var TWorld = new THWAP.World()
		,$dWorld = $("#domWorld")
		,$dView = $("#domViewport")
		,$cWorld = $("#cvsWorld")
		,ctx = $cWorld[0].getContext('2d')
		,box = new ZAP.Entities.Box(62, 64, 'src/zap/defaults/mmzmugs1sheet.gif')
		,wall = new ZAP.Entities.Box(600, 20);
	
	box.spriteObject.attachTo($dWorld[0]);
	wall.spriteObject.attachTo($dWorld[0]);
	
	wall.physicsObject.moveTo([0,300,0]);
	
	TWorld
		.addBody(box.physicsObject)
		.addBody(wall.physicsObject);
	
	ZAP.CGLM.register(function priorityOne(dt){
		KEY.dispatcher();
		TWorld.step(dt);
		box.update(dt);
		wall.update(dt);
	}, function priorityTwo(dt){
		ctx.clearRect(0,0,2000,2000);
		box.debugDraw(ctx, [0,0,0]);
		wall.debugDraw(ctx, [0,0,0]);
	});
	
	KEY.listen(function(down){
		
		var transform = false;
		
		if(down[27].delta > 0){ ZAP.CGLM.stop(); }
		
		if(down[32].delta > 0){
			
		}
		
		if(down[87].delta > 0){ // W
			box.physicsObject.addAcceleration([0,-0.001,0]);
		}
		
		if(down[83].delta > 0){ // S
			box.physicsObject.addAcceleration([0,0.001,0]);
		}
		
		if(down[65].delta > 0){ // A
			box.physicsObject.addAcceleration([-0.001,0,0]);
		}
		
		if(down[68].delta > 0){ // D
			box.physicsObject.addAcceleration([0.001,0,0]);
		}
		
	});
	
	ZAP.CGLM.start();
//}

//return new ANGRY.init();
//})();
