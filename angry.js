(function(){

var ANGRY = {};

ANGRY.init = function(){
	var TWorld = new THWAP.World()
		,$dWorld = $("#domWorld")
		,$dView = $("#domViewport")
		,box = new THWAP.Body()
		,temp = ZAP.DOM.CE('div', {color: 'red'})
		,tempRot = 0
		,tempX = 0;
		
	temp.id = "temp";
	$dWorld.append(temp);
	
	ZAP.CGLM.register(function(){
		KEY.dispatcher();
	}, function(deltaTime){
		ZAP.DOM.css(temp, {
			//'-webkit-transform': 'translate3d('+tempX+'px, 0, 0) rotate('+tempRot+'deg)',
			//'-moz-transform': 'translate3d('+tempX+'px, 0, 0) rotate('+tempRot+'deg)',
			//'transform': 'translate3d('+tempX+'px, 0, 0) rotate('+tempRot+'deg)'
			'-webkit-transform': 'rotate('+tempRot+'deg)',
			'-moz-transform': 'rotate('+tempRot+'deg)',
			'transform': 'rotate('+tempRot+'deg)'
			//'-webkit-transition': '-webkit-transform '+ (deltaTime/1000) +'s'
		});
	});
	
	KEY.listen(function(down){
		
		var transform = false;
		
		if(down[27].delta > 0){ ZAP.CGLM.stop(); }
		
		if(down[32].delta > 0){
			tempRot += 5;
			if(tempRot > 360) tempRot = 0;
			transform = true;
		}
		
		if(down[65].delta > 0){ // A
			tempX -= 10;
			transform = true;
		}
		
		if(down[68].delta > 0){ // D
			tempX += 10;
			transform = true;
		}
		
	});
	
	ZAP.CGLM.start();
}

ANGRY.init();
})();
