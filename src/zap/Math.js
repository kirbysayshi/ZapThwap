var ov3 = function(x, y, z){
	this.x = x || 0;
	this.y = y || 0;
	this.z = z || 0;
}

ov3.prototype.addEq = function(vec){
	this.x += vec.x;
	this.y += vec.y;
	this.z += vec.z;	
	return this;
}
ov3.prototype.subEq = function(vec){
	this.x -= vec.x;
	this.y -= vec.y;
	this.z -= vec.z;	
	return this;
}
ov3.prototype.scale = function(scalar){
	this.x *= scalar;
	this.y *= scalar;
	this.z *= scalar;	
	return this;
}
ov3.prototype.normalize = function(){
	var len = Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z);
	if(!len){ this.x = this.y = this.z = 0; return this; }
	len = 1 / len;
	this.x *= len;
	this.y *= len;
	this.z *= len;
	return this;
}
ov3.prototype.toArray = function(){
	return [this.x, this.y, this.z];
}
ov3.prototype.toString = function(){
	return '[ ov3: ' + this.x + ', ' + this.y + ', ' + this.z + ']';
}


ov3.clone = function(vec){
	return new ov3(vec.x, vec.y, vec.z);
}
ov3.fromArray = function(arr){
	return new ov3(arr[0], arr[1], arr[2]);
}
ov3.add = function(vec1, vec2){
	return new ov3( 
		vec1.x + vec2.x, 
		vec1.y + vec2.y, 
		vec1.z + vec2.z );
}
ov3.sub = function(vec1, vec2){
	return new ov3( 
		vec1.x - vec2.x, 
		vec1.y - vec2.y, 
		vec1.z - vec2.z );
}
ov3.length = function(vec){
	return Math.sqrt(vec.x*vec.x + vec.y*vec.y + vec.z*vec.z);
}
ov3.length2 = function(vec){
	return vec.x*vec.x + vec.y*vec.y + vec.z*vec.z;
}
ov3.dot = function(vec1, vec2){
	return vec1.x*vec2.x + vec1.y*vec2.y + vec1.z*vec2.z;
}
ov3.direction = function(vec, vec2) {
	var  dest = new ov3()
		,x = vec.x - vec2.x
		,y = vec.y - vec2.y
		,z = vec.z - vec2.z
		,len = Math.sqrt(x*x + y*y + z*z);
	
	if (!len) { return dest; }
	
	len = 1 / len;
	dest.x = x * len; 
	dest.y = y * len; 
	dest.z = z * len;
	return dest; 
}
ov3.cross = function(vec1, vec2){ 
	return new ov3(
		 vec1.y*vec2z - vec1.z*vec2.y
		,vec1.z*vec2x - vec1.x*vec2.z
		,vec1.x*vec2y - vec1.y*vec2.x
	);
};