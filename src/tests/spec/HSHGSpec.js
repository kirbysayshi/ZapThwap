describe('HSHG', function(){
	
	var 
	twoVs = [
		 new Vertex({
			name: 'left', x: 0, y: 0, radius: 50
		})
		,new Vertex({
			name: 'right', x: 50, y: 0, radius: 50
		})
	]
	,threeVs = [
		 new Vertex({
			name: 'left', x: 100, y: 100, radius: 10
		})
		,new Vertex({
			name: 'middle', x: 150, y: 150, radius: 100
		})
		,new Vertex({
			name: 'right', x: 200, y: 100, radius: 10
		})
	]
	
	it('can reset itself', function(){
		HSHG.reset();
		var p = HSHG._private();
		expect(p.hash.length).toBe(0);
		expect(p.hashLength).toBe(0);
		expect(p.subLevels.length).toBe(0);
		expect(p.gridCellSizeCache.length).toBe(0);
	});
	
	it('can map two vertices', function(){
		HSHG.reset();
		HSHG.mapScene( twoVs );
	});
	
	it('can find two candidates for point [25,0] at level 7', function(){
		HSHG.reset();
		HSHG.mapScene( twoVs );
		var c = HSHG.findCandidatesForPointAtGridLevel([25,0], 7);
		expect(c.length).toBe(2);
		expect(c).toContain(twoVs[0]);
		expect(c).toContain(twoVs[1]);
	});
	
	it('puts a vertex at (0,0) with radius 50 into subdivision level 7, grid size 128, and finds longest edge to be 100', function(){
		HSHG.reset();
		var aabb = twoVs[0].getAABB();
		var p = HSHG._private();
		var longest = p.getLongestAABBEdge(aabb.min, aabb.max);
		var level = p.getSubdivisionLevel(longest);
		var gridCellSize = p.getGridCellSize(level);
		expect(longest).toBe(100);
		expect(level).toBe(7);
		expect(gridCellSize).toBe(128);
	});
	
	it('can find zero candidates for point [300,0] at level 7', function(){
		HSHG.reset();
		HSHG.mapScene( twoVs );
		var c = HSHG.findCandidatesForPointAtGridLevel([300,0], 7);
		expect(c.length).toBe(0);
		expect(c).not.toContain(twoVs[0]);
		expect(c).not.toContain(twoVs[1]);
	});
	
});

// used to outline the interface th HSHG expects
function Vertex(args /*x, y, radius*/){
	var argProp;
	
	for(argProp in args){
		if(args.hasOwnProperty(argProp)){
			this[ argProp ] = args[argProp]; 
		}
	}
}

Vertex.prototype.getAABB = function(){
	var rad = this.radius
		,x = this.x
		,y = this.y;
	return this.aabb = { 
		 min: [ x - rad, y - rad ]
		,max: [ x + rad, y + rad ]
	};
}

Vertex.prototype.draw = function(ctx, color){
	ctx.strokeStyle = color;
	ctx.beginPath();
	ctx.arc( this.x, this.y, this.radius, 0, Math.PI*2, false);
	ctx.strokeRect(this.aabb.min[0], this.aabb.min[1], this.radius*2, this.radius*2);
	ctx.stroke();
}