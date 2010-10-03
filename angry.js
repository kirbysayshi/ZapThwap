var ANGRY = (function(){

var ANGRY = {};

ANGRY.init = function(){
	var TWorld = new THWAP.World()
		,$dWorld = $("#domWorld")
		,$dView = $("#domViewport")
		,$cWorld = $("#cvsWorld")
		,ctx = $cWorld[0].getContext('2d')
		,box = new ZAP.Entities.Box(62, 64, 'src/zap/defaults/mmzmugs1sheet.gif')
		,wall = new THWAP.LinearConstraint(
			 new THWAP.Vertex([100,100,0])
			,new THWAP.Vertex(100,300,0)
		);
	
	box.spriteObject.attachTo($dWorld[0]);
	
	
	
	ZAP.CGLM.register(function priorityOne(dt){
		KEY.dispatcher();
		
		box.update(dt);
	}, function priorityTwo(dt){
		ctx.clearRect(0,0,2000,2000);
		box.debugDraw(ctx, [0,0,0]);
	});
	
	KEY.listen(function(down){
		
		var transform = false;
		
		if(down[27].delta > 0){ ZAP.CGLM.stop(); }
		
		if(down[32].delta > 0){
			
		}
		
		if(down[87].delta > 0){ // W
			box.physicsObject.addAcceleration([0,-0.01,0]);
		}
		
		if(down[83].delta > 0){ // S
			box.physicsObject.addAcceleration([0,0.01,0]);
		}
		
		if(down[65].delta > 0){ // A
			box.physicsObject.addAcceleration([-0.01,0,0]);
		}
		
		if(down[68].delta > 0){ // D
			box.physicsObject.addAcceleration([0.01,0,0]);
		}
		
	});
	
	ZAP.CGLM.start();
}

return new ANGRY.init();
})();
