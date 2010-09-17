//light, jquery style framework from dejoya
(function(){
	var undefined,window=this,$=function(els){return new $.fn.init(els)};
	$.fn=$.prototype={
		init : function(els){
			if(els.nodeName){this[0]=[els];this.length=1;return this}
			if(typeof els=="string"){
				var arr=[],q=document.querySelectorAll(els),i=0,l=q.length;
				for(;i<l;i++){arr[i]=q[i]}
				this[0]=arr
			}
			else this[0]=$.isArray(els)?els:$.toArray(els);
			this.length=this[0].length;
			return this
		},
		addClass:function(cls){return this.each(function(){$.hasClass(this,cls)?"":this.className+=' '+cls})},
		append:function(ele){return this.each(function(){this.appendChild(ele)})},
		bind:function(type,fn){return this.each(function(){this.addEventListener(type,fn,false)})},
		css:function(obj){for(var n in obj){this.setStyle(n,obj[n])}return this},
		each:function(fn){$.each(this[0],fn);return this},
		findClass:function(cls){var els=[];this.each(function(){$(this.getElementsByTagName('*')).each(function(){if($.hasClass(this,cls))els.push(this)})});return $(els)},
		get:function(ind){return ind==undefined?this[0]:this[0][ind]},
		getStyle:function(prop){return document.defaultView.getComputedStyle(this[0][0],null).getPropertyValue(prop)},
		hasClass:function(cls){var ret=false;this.each(function(){if($.hasClass(this,cls)){ret=true;return false}});return ret},
		html:function(html){return html===undefined?this[0][0].innerHTML:this.each(function(){this.innerHTML=html})},
		offset:function(){var x=0,y=0,o=this[0][0];do{x+=o.offsetLeft;y+=o.offsetTop}while(o=o.offsetParent);return{left:x,top:y}}, 
		remove:function(){return this.each(function(){this.parentNode.removeChild(this)})},
		removeClass:function(cls){return this.each(function(){if($.hasClass(this,cls))this.className=this.className.replace($.classRegex(cls),' ')})},
		setStyle:function(prop,val){return this.each(function(){this.style[prop]=val})},
		unbind:function(type,fn){return this.each(function(){this.removeEventListener(type,fn,false)})},
		val:function(val){if(val==undefined)return this[0][0].value;else return this.each(function(){this.value=val})},
		tween: function(fn,dur,cb){return this.each(function(){var d=new Date(),now=d.getTime(),end=d.getTime()+dur,inter=dur/60,self=this;setTimeout(function(){if(now<end){now+=inter;fn.call(self);var callee=arguments.callee;setTimeout(function(){callee()},inter);}else cb(self);},inter)})}
	};
	$.fn.init.prototype=$.fn;
	$.extend=function(o){for(var i=1,a=arguments,l=a.length,p;i<l;i++){for(p in a[i]){o[p]=a[i][p]}}return o};	
	$.extend($,{
		classRegex:function(cls){return new RegExp('(?:\\s|^)'+cls+'(?:\\s|$)')},
		each:function(o,cb){
			var l=o.lenth;
			if(l===undefined){for(var name in o)if(cb.call(o[name],name,o[name])===false)break}
			else for(var val=o[0],i=0;i<l&&cb.call(val,i,val)!==false;val=o[++i]){}
			return o
		},
		hasClass:function(ele,cls){return this.classRegex(cls).test(ele.className)},
		isArray:function(o){return Object.prototype.toString.call(o)==="[object Array]"},
		toArray:function(o){var ret=[];if(o){var l=o.length;if(l==null||typeof o=="string"||o.setTimeout)ret[0]=o;else while(l)ret[--l]=o[l]}return ret}
	});
	window.$ = $;
})();