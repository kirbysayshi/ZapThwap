var KEY = (function(W){
	
	var  down = [] // stores the "custom" events + original
		,handler = [] // one handler callback to rule them all
		,self = {};
	
	function onKeyDown(e){	
		// webkit will repeat this event while held down
		if(down[e.keyCode] === false){
			down[e.keyCode] = { start: +new Date(), original: e };
		}
	}
	
	function onKeyUp(e){
		down[e.keyCode] = false;
	}
	
	self.listen = function(callback){
		handler = callback;
	}
	
	// This should be called every frame, 
	// or however often events should be dispatched
	self.dispatcher = function(){
		for(var i = 0; i < down.length; i++){
			var e = down[i];
			if(e !== false){
				// update event held length
				e.delta = +new Date() - e.start;
			}
		}
		handler(down);
	};

	// init
	for(var i = 0; i < 256; i++){
		down[i] = false;
	}
	
	W.addEventListener("keydown", onKeyDown, false);
	W.addEventListener("keyup", onKeyUp, false);
	
	return self;
	
})(window);