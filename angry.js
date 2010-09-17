(function(){

var ANGRY = {};

ANGRY.init = function(){
	var TWorld = new THWAP.World()
		,$dWorld = $("#domWorld")
		,$dView = $("#domViewport")
		,temp = ZAP.DOM.CE('div', {color: 'red'})
		,tempRot = 0;
		
	temp.id = "temp";
	$dWorld.append(temp);
	
	document.addEventListener('keydown', function(e){
		tempRot += 5;
		ZAP.DOM.css(temp, {
			'-webkit-transform': 'rotate('+tempRot+'deg)',
			'-moz-transform': 'rotate('+tempRot+'deg)',
			'transform': 'rotate('+tempRot+'deg)'
		});
	})
}

ANGRY.init();
})();
