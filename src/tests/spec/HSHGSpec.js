describe('HSHG', function(){
	
	it('can make a 4x4 Grid with proper offsets', function(){
		var p = HSHG._private();
		var grid = new p.Grid(20, 16);
		
		expect(grid.rowColumnCount).toBe(4);
		grid.initCells();
		
		//  null	4		5		||	6	7	8
		//  null	0		1		||	3	4	5
		//  null	null	null	||	0	1	2
		expect(grid.allCells[0].neighborOffsetArray).toEqual([
			null, null, null, null, 0, 1, null, 4, 5
		]);
		
		expect(grid.allCells[4].neighborOffsetArray).toEqual([
			null, -4, -3, null, 0, 1, null, 4, 5
		]);
		
		console.log(grid.toHash(0,0));
		console.log(grid.toHash(10,10));
		console.log(grid.toHash(10,1000));
		console.log(grid.toHash(10000,100));
		
		//expect(p.hash.length).toBe(0);
		//expect(p.hashLength).toBe(0);
		//expect(p.subLevels.length).toBe(0);
		//expect(p.gridCellSizeCache.length).toBe(0);
		console.log(grid);
	});
	
	it('can add an object to the grid', function(){
		var v1 = new Vertex({ x: 10, y: 1000, radius: 40 }),
			p;
			
		HSHG.init();
		HSHG.addObject(v1);
		p = HSHG._private();
		expect(p._grids.length).toBe(1);
		expect(p._grids[0].occupiedCells.length).toBe(1);
		console.log( HSHG._private() );
	});
	
	it('can add three similar objects to the same grid', function(){
		var v1 = new Vertex({ x: 10, y: 1000, radius: 40 }),
		 	v2 = new Vertex({ x: 10, y: 1000, radius: 45 }),
		 	v3 = new Vertex({ x: 10, y: 1000, radius: 50 }), 
			p;
			
		HSHG.init();
		HSHG.addObject(v1);
		HSHG.addObject(v2);
		HSHG.addObject(v3);
		p = HSHG._private();
		
		expect(p._grids.length).toBe(1);
		
		console.log( HSHG._private() );
	});
});

// used to outline the interface the HSHG expects
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