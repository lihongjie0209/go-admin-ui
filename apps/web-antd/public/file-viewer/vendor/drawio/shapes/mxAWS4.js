/**
 * Copyright (c) 2006-2018, JGraph Holdings Ltd
 */

//**********************************************************************************************************************************************************
//Product Icon
//**********************************************************************************************************************************************************
/**
* Extends mxShape.
*/
function mxShapeAws4ProductIcon(bounds, fill, stroke, strokewidth)
{
	mxShape.call(this);
	this.bounds = bounds;
	this.fill = fill;
	this.stroke = stroke;
	this.strokewidth = (strokewidth == null) ? 1 : strokewidth;
};

/**
* Extends mxShape.
*/
mxUtils.extend(mxShapeAws4ProductIcon, mxShape);

mxShapeAws4ProductIcon.prototype.cst = {
		PRODUCT_ICON : 'mxgraph.aws4.productIcon'
};

/**
* Function: paintVertexShape
* 
* Paints the vertex shape.
*/
mxShapeAws4ProductIcon.prototype.paintVertexShape = function(c, x, y, w, h)
{
	c.translate(x, y);

	const opacity = parseFloat(mxUtils.getValue(this.style, 'opacity', '100'));
	let op1 = opacity;
	let op2 = opacity;
	
	if (fillColor == 'none')
	{
		op1 = 0;
	}
	
	if (gradientColor == 'none')
	{
		op2 = 0;
	}

	const ind = 1;
	const strokeColor = mxUtils.getValue(this.state.style, 'strokeColor', 'none');
	c.setFillColor(strokeColor);

	c.begin();
	c.moveTo(0, 0);
	c.lineTo(w, 0);
	c.lineTo(w, h);
	c.lineTo(0, h);
	c.close();
	c.fill();

	c.setShadow(false);
	const fillColor = mxUtils.getValue(this.state.style, 'fillColor', '#ffffff');
	const gradientColor = mxUtils.getValue(this.state.style, 'gradientColor', fillColor);
	const gradientDir = mxUtils.getValue(this.state.style, 'gradientDirection', 'south');
	
	c.setFillColor(fillColor);
	c.setGradient(fillColor, gradientColor, 0, 0, w, h, gradientDir, op1, op2);	

	c.begin();
	c.moveTo(ind, ind);
	c.lineTo(w - ind, ind);
	c.lineTo(w - ind, w - ind);
	c.lineTo(ind, w - ind);
	c.close();
	c.fill();
	

	const prIcon = mxUtils.getValue(this.state.style, 'prIcon', '');
	const stencil = mxStencilRegistry.getStencil(prIcon);

	if (stencil != null)
	{
		c.setFillColor(strokeColor);
		c.setStrokeColor('none');
//		stencil.drawShape(c, this, w * 0.1, h * 0.1, w * 0.8, h * 0.8);
		stencil.drawShape(c, this, ind + w * 0.15, ind + w * 0.15, w * 0.7 - 2 * ind, w * 0.7 - 2 * ind);
	}

};

mxCellRenderer.registerShape(mxShapeAws4ProductIcon.prototype.cst.PRODUCT_ICON, mxShapeAws4ProductIcon);

//**********************************************************************************************************************************************************
//Resource Icon
//**********************************************************************************************************************************************************
/**
* Extends mxShape.
*/
function mxShapeAws4ResourceIcon(bounds, fill, stroke, strokewidth)
{
	mxShape.call(this);
	this.bounds = bounds;
	this.fill = fill;
	this.stroke = stroke;
	this.strokewidth = (strokewidth == null) ? 1 : strokewidth;
};

/**
* Extends mxShape.
*/
mxUtils.extend(mxShapeAws4ResourceIcon, mxShape);

mxShapeAws4ResourceIcon.prototype.cst = {
		RESOURCE_ICON : 'mxgraph.aws4.resourceIcon'
};

/**
* Function: paintVertexShape
* 
* Paints the vertex shape.
*/
mxShapeAws4ResourceIcon.prototype.paintVertexShape = function(c, x, y, w, h)
{
	c.translate(x, y);

	c.begin();
	c.moveTo(0, 0);
	c.lineTo(w, 0);
	c.lineTo(w, h);
	c.lineTo(0, h);
	c.close();
	c.fill();

	c.setShadow(false);
	
	const prIcon = mxUtils.getValue(this.state.style, 'resIcon', '');
	const stencil = mxStencilRegistry.getStencil(prIcon);

	if (stencil != null)
	{
		const strokeColor = mxUtils.getValue(this.state.style, 'strokeColor', '#000000');
		c.setFillColor(strokeColor);
		c.setStrokeColor('none');
		stencil.drawShape(c, this, w * 0.1, h * 0.1, w * 0.8, h * 0.8);
	}

};

mxCellRenderer.registerShape(mxShapeAws4ResourceIcon.prototype.cst.RESOURCE_ICON, mxShapeAws4ResourceIcon);

//**********************************************************************************************************************************************************
//Group
//**********************************************************************************************************************************************************
/**
* Extends mxShape.
*/
function mxShapeAws4Group(bounds, fill, stroke, strokewidth)
{
	mxShape.call(this);
	this.bounds = bounds;
	this.fill = fill;
	this.stroke = stroke;
	this.strokewidth = (strokewidth == null) ? 1 : strokewidth;
};

/**
* Extends mxShape.
*/
mxUtils.extend(mxShapeAws4Group, mxShape);

mxShapeAws4Group.prototype.cst = {
		GROUP : 'mxgraph.aws4.group'
};

/**
* Function: paintVertexShape
* 
* Paints the vertex shape.
*/
mxShapeAws4Group.prototype.paintVertexShape = function(c, x, y, w, h)
{
	c.translate(x, y);
	const grStroke = mxUtils.getValue(this.state.style, 'grStroke', '1');
	
	let size = 25;

	if (this.style != null && mxUtils.getValue(this.style, mxConstants.STYLE_POINTER_EVENTS, '1') == '0')
	{
		c.pointerEvents = false;
	}

	c.begin();
	c.moveTo(0, 0);
	c.lineTo(w, 0);
	c.lineTo(w, h);
	c.lineTo(0, h);
	c.close();

	if (grStroke == '1' || this.outline)
	{
		c.fillAndStroke();
	}
	else
	{
		c.fill();
	}
	
	c.pointerEvents = true;
	c.setShadow(false);

	const grIcon = mxUtils.getValue(this.state.style, 'grIcon', '');
	const stencil = mxStencilRegistry.getStencil(grIcon);

	if (stencil != null)
	{
		const strokeColor = mxUtils.getValue(this.state.style, 'strokeColor', '#000000');
		size = mxUtils.getValue(this.state.style, 'grIconSize', size);
		c.setFillAlpha(this.strokeOpacity / 100);
		c.setFillColor(strokeColor);
		c.setStrokeColor('none');
		stencil.drawShape(c, this, 0, 0, size, size);
	}

};

mxCellRenderer.registerShape(mxShapeAws4Group.prototype.cst.GROUP, mxShapeAws4Group);

//**********************************************************************************************************************************************************
//Group Center
//**********************************************************************************************************************************************************
/**
* Extends mxShape.
*/
function mxShapeAws4GroupCenter(bounds, fill, stroke, strokewidth)
{
	mxShape.call(this);
	this.bounds = bounds;
	this.fill = fill;
	this.stroke = stroke;
	this.strokewidth = (strokewidth == null) ? 1 : strokewidth;
};

/**
* Extends mxShape.
*/
mxUtils.extend(mxShapeAws4GroupCenter, mxShape);

mxShapeAws4GroupCenter.prototype.cst = {
		GROUP_CENTER : 'mxgraph.aws4.groupCenter'
};

/**
* Function: paintVertexShape
* 
* Paints the vertex shape.
*/
mxShapeAws4GroupCenter.prototype.paintVertexShape = function(c, x, y, w, h)
{
	c.translate(x, y);
	const grStroke = mxUtils.getValue(this.state.style, 'grStroke', '1');

	let size = 25;

	c.begin();
	c.moveTo(0, 0);
	c.lineTo(w, 0);
	c.lineTo(w, h);
	c.lineTo(0, h);
	c.close();
	
	if (grStroke == '1' || this.outline)
	{
		c.fillAndStroke();
	}
	else
	{
		c.fill();
	}
	
	c.setShadow(false);
	const grIcon = mxUtils.getValue(this.state.style, 'grIcon', '');
	const stencil = mxStencilRegistry.getStencil(grIcon);

	if (stencil != null)
	{
		const strokeColor = mxUtils.getValue(this.state.style, 'strokeColor', '#000000');
		size = mxUtils.getValue(this.state.style, 'grIconSize', size);
		c.setFillAlpha(this.strokeOpacity / 100);
		c.setFillColor(strokeColor);
		c.setStrokeColor('none');
		stencil.drawShape(c, this, (w - size) * 0.5, 0, size, size);
	}

};

mxCellRenderer.registerShape(mxShapeAws4GroupCenter.prototype.cst.GROUP_CENTER, mxShapeAws4GroupCenter);

////**********************************************************************************************************************************************************
////Resource Icon
////**********************************************************************************************************************************************************
///**
//* Extends mxShape.
//*/
//function mxShapeAws4ResourceIcon(bounds, fill, stroke, strokewidth)
//{
//	mxShape.call(this);
//	this.bounds = bounds;
//	this.fill = fill;
//	this.stroke = stroke;
//	this.strokewidth = (strokewidth != null) ? strokewidth : 1;
//};
//
///**
//* Extends mxShape.
//*/
//mxUtils.extend(mxShapeAws4ResourceIcon, mxShape);
//
//mxShapeAws4ResourceIcon.prototype.cst = {
//		RESOURCE_ICON : 'mxgraph.aws4.resourceIcon'
//};
//
///**
//* Function: paintVertexShape
//* 
//* Paints the vertex shape.
//*/
//mxShapeAws4ResourceIcon.prototype.paintVertexShape = function(c, x, y, w, h)
//{
//	c.translate(x, y);
//
//	c.begin();
//	c.moveTo(0, 0);
//	c.lineTo(w, 0);
//	c.lineTo(w, h);
//	c.lineTo(0, h);
//	c.close();
//	c.fillAndStroke();
//
//	var prIcon = mxUtils.getValue(this.state.style, 'resIcon', '');
//	var stencil = mxStencilRegistry.getStencil(prIcon);
//
//	if (stencil != null)
//	{
//		var strokeColor = mxUtils.getValue(this.state.style, 'strokeColor', '#000000');
//		c.setFillColor(strokeColor);
//		c.setStrokeColor('none');
//		stencil.drawShape(c, this, w * 0.1, h * 0.1, w * 0.8, h * 0.8);
//	}
//
//};

//**********************************************************************************************************************************************************
//Group2
//**********************************************************************************************************************************************************
/**
* Extends mxShape.
*/
function mxShapeAws4Group2(bounds, fill, stroke, strokewidth)
{
	mxShape.call(this);
	this.bounds = bounds;
	this.fill = fill;
	this.stroke = stroke;
	this.strokewidth = (strokewidth == null) ? 1 : strokewidth;
};

/**
* Extends mxShape.
*/
mxUtils.extend(mxShapeAws4Group2, mxShape);

mxShapeAws4Group2.prototype.cst = {
		GROUP2 : 'mxgraph.aws4.group2'
};

/**
* Function: paintVertexShape
* 
* Paints the vertex shape.
*/
mxShapeAws4Group2.prototype.paintVertexShape = function(c, x, y, w, h)
{
	c.translate(x, y);

	let size = 25;

	c.begin();
	c.moveTo(0, 0);
	c.lineTo(w, 0);
	c.lineTo(w, h);
	c.lineTo(0, h);
	c.close();
	c.fillAndStroke();

	c.setShadow(false);

	const strokeColor = mxUtils.getValue(this.state.style, 'strokeColor', '#000000');
	c.setFillColor(strokeColor);

	c.begin();
	c.moveTo(0, 0);
	c.lineTo(size, 0);
	c.lineTo(size, size);
	c.lineTo(0, size);
	c.close();
	c.fill();

	const grIcon = mxUtils.getValue(this.state.style, 'grIcon', '');
	const stencil = mxStencilRegistry.getStencil(grIcon);

	if (stencil != null)
	{
		size = mxUtils.getValue(this.state.style, 'grIconSize', size);
		c.setFillAlpha(this.strokeOpacity / 100);
		c.setFillColor('#ffffff');
		c.setStrokeColor('none');
		stencil.drawShape(c, this, size * 0.1, size * 0.1, size * 0.8, size * 0.8);
	}

};

mxCellRenderer.registerShape(mxShapeAws4Group2.prototype.cst.GROUP2, mxShapeAws4Group2);

