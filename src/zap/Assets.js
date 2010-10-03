var Assets = (function(){
	
	var db = { assets: [], callbacks: {} }
		,nLoaded = 0
		,nTotal = 0
		,callback = function(){} //onCompleteCallback
		,self = {};
	
	//---------------------------------------------------------------------
	// Private Methods
	//---------------------------------------------------------------------
		
	function onLoad(handle){
		nLoaded++;
		if(db.callbacks[handle] !== undefined){
			db.callbacks[handle](); // this is completely untested
		}
		if(nLoaded == nTotal){
			onComplete();
		}
	}
	
	function onError(e, image){
		console.log("ERROR: ", e);
	}
	
	function onComplete(){
		callback(db.assets);
		console.log("all assets loaded");
		console.log(this);
	}
	
	//---------------------------------------------------------------------
	// Public Methods
	//---------------------------------------------------------------------	
	
	self.onComplete = function(cb){
		callback = cb;
	}
	
	self.queue = function(options){
		if(options.src === undefined || options.type === undefined){ return false; }
		if(options.name === undefined) { options.name = type + '_' + Math.floor(Math.random()*26000000); }
		nTotal++;
		
		switch(options.type){
			case 'image':	
				var i = new Image();
				i.onload = function(e){ onLoad(i) };
				i.onerror = function(e){ onError(e, i);	}
				i.src = options.src;
				db.assets[options.name] = i;
			
				if(options.callback !== undefined){
					db.callbacks[i] = callback;
				}
			break;
			case 'text':
				var request = new XMLHttpRequest()
					,text = "";
				
				request.onreadystatechange = function () {
					if (request.readyState == 4 && request.status == 200) {
						db.assets[options.name] = request.responseText;
						onLoad(request.responseText);
					}
				};
				
				request.open('GET', options.src, true);
				request.overrideMimeType('text/plain');
				request.setRequestHeader('Content-Type', 'text/plain');
				request.send(null);
				
				if(options.callback !== undefined){
					db.callbacks[i] = callback;
				}
			break;
		}
	};
	
	self.getStatus = function(){
		if(db.assets.length > 0)
			return { percent: nLoaded / nTotal, count: nLoaded +"/"+ nTotal };
		else
			return { percent: '0', count: '0/0'};
	}
	
	self.getAsset = function(name){
		if(nLoaded !== nTotal){ throw "ASSET_INAPPROPRIATE_ACCESS_ERROR"; }
		else if( db.assets[name] !== undefined ){
			return db.assets[name];
		}
	}
	
	return self;	
})();