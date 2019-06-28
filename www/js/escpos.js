var ns = null;

function error (msg) {
	throw new Error(msg);
}

function getImgFromDataUrl (dataUrl) {
	var img = new Image();
	img.src = dataUrl;
	return img;
}

function getImageData (img, config) {
	config = config || {};
	var c = document.createElement('canvas');
	var ctx = c.getContext('2d');

	var width = config.width || img.width;
	var height = config.height || img.height;
	ctx.drawImage(img, 0, 0, width, height);
	return ctx.getImageData(0, 0, width, height);
}

function getPixel (img, x, y) {
	var idx = (x + y * img.width) * 4;
	var r = img.data[idx + 0]; 
	var g = img.data[idx + 1]; 
	var b = img.data[idx + 2];
	return [r, g, b];
}

function _check_image_size (size) {
	if (size % 32 === 0)
		return [0, 0];
	else
		var image_border = 32 - (size % 32);
		return image_border % 2 === 0
			? [image_border / 2, image_border / 2] 
			: [image_border / 2, (image_border / 2) + 1];
}

// SEE: https://www.sparkfun.com/datasheets/Components/General/Driver%20board.pdf
// SEE: https://github.com/StadiumRunner/node-escpos.git

var cmds = {

	// Feed control sequences
	CTL_LF: 			[ 0x0a ],						// Print and line feed
	CTL_FF: 			[ 0x0c ],						// Form feed
	CTL_CR: 			[ 0x0d ],						// Carriage return
	CTL_HT: 			[ 0x09 ],						// Horizontal tab
	CTL_VT: 			[ 0x0b ],						// Vertical tab

	// Printer hardware
	HW_INIT: 			[ 0x1b, 0x40 ],					// Clear data in buffer and reset modes
	BUFFER_GO: 			[ 0x1b, 0x64, 0x01 ],			// Solved buffer + 1 line
	HW_SELECT: 			[ 0x1b, 0x3d, 0x01 ],			// Printer select
	HW_RESET: 			[ 0x1b, 0x3f, 0x0a, 0x00 ],		// Reset printer hardware

	// Paper
	PAPER_FULL_CUT: 	[ 0x1d, 0x56, 0x00 ],			// Full cut paper
	PAPER_PART_CUT: 	[ 0x1d, 0x56, 0x01 ],			// Partial cut paper

	// Text format   
	TXT_NORMAL: 		[ 0x1b, 0x21, 0x00 ],			// Normal text
	TXT_2HEIGHT: 		[ 0x1b, 0x21, 0x10 ],			// Double height text
	TXT_2WIDTH: 		[ 0x1b, 0x21, 0x20 ],			// Double width text
	TXT_4SQUARE: 		[ 0x1b, 0x21, 0x30 ],
	TXT_UNDERL_OFF: 	[ 0x1b, 0x2d, 0x00 ],			// Underline font OFF
	TXT_UNDERL_ON: 		[ 0x1b, 0x2d, 0x01 ],			// Underline font 1-dot ON
	TXT_UNDERL2_ON: 	[ 0x1b, 0x2d, 0x02 ],			// Underline font 2-dot ON
	TXT_BOLD_OFF: 		[ 0x1b, 0x45, 0x00 ],			// Bold font OFF
	TXT_BOLD_ON: 		[ 0x1b, 0x45, 0x01 ],			// Bold font ON
	TXT_FONT_A: 		[ 0x1b, 0x4d, 0x00 ],			// Font type A
	TXT_FONT_B: 		[ 0x1b, 0x4d, 0x01 ],			// Font type B
	TXT_ALIGN_LT: 		[ 0x1b, 0x61, 0x00 ],			// Left justification
	TXT_ALIGN_CT: 		[ 0x1b, 0x61, 0x01 ],			// Centering
	TXT_ALIGN_RT: 		[ 0x1b, 0x61, 0x02 ],			// Right justification

	// Image format  
	S_RASTER_N: 		[ 0x1d, 0x76, 0x30, 0x00 ], 	// Set raster image normal size
	S_RASTER_2W: 		[ 0x1d, 0x76, 0x30, 0x01 ], 	// Set raster image double width
	S_RASTER_2H: 		[ 0x1d, 0x76, 0x30, 0x02 ], 	// Set raster image double height
	S_RASTER_Q: 		[ 0x1d, 0x76, 0x30, 0x03 ],	 	// Set raster image quadruple

	// Printing Density
	PD_N50:            [0x1d, 0x7c, 0x00], // Printing Density -50%
	PD_N37:            [0x1d, 0x7c, 0x01], // Printing Density -37.5%
	PD_N25:            [0x1d, 0x7c, 0x02], // Printing Density -25%
	PD_N12:            [0x1d, 0x7c, 0x03], // Printing Density -12.5%
	PD_0:              [0x1d, 0x7c, 0x04], // Printing Density  0%
	PD_P50:            [0x1d, 0x7c, 0x08], // Printing Density +50%
	PD_P37:            [0x1d, 0x7c, 0x07], // Printing Density +37.5%
	PD_P25:            [0x1d, 0x7c, 0x06], // Printing Density +25%
	PD_P12:            [0x1d, 0x7c, 0x05],  // Printing Density +12.5%

	// QRCODE
	QR_SIZE: [0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43], // QRCODE SIZE
	QR_ERRLEVEL: [29, 40, 107, 3, 0, 49, 69, 51], // QRCODE ERROR TOLERRENCE LEVEL
	QR_WRITER_BUFFER: [0x1d, 0x28, 0x6b, 0x2e, 0x00, 0x31, 0x50, 0x30],
	QR_PRINT: [0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30],

	// ADD ROSSES - rosses@gmail.com

	BARCODE_TXT_OFF : [0x1d, 0x48, 0x00], // HRI barcode chars OFF
	BARCODE_TXT_ABV : [0x1d, 0x48, 0x01], // HRI barcode chars above
	BARCODE_TXT_BLW : [0x1d, 0x48, 0x02], // HRI barcode chars below
	BARCODE_TXT_BTH : [0x1d, 0x48, 0x03], // HRI barcode chars both above and below

	BARCODE_FONT_A  : [0x1d, 0x66, 0x00], // Font type A for HRI barcode chars
	BARCODE_FONT_B  : [0x1d, 0x66, 0x01] , // Font type B for HRI barcode chars

	BARCODE_HEIGHT  : [0x1d, 0x68, 0x64] , // Barcode Height [1-255]
	BARCODE_WIDTH   : [0x1d, 0x77, 0x03], // Barcode Width  [2-6]

	BARCODE_UPC_A   : [0x1d, 0x6b, 0x00], // Barcode type UPC-A
	BARCODE_UPC_E   : [0x1d, 0x6b, 0x01], // Barcode type UPC-E
	BARCODE_EAN13   : [0x1d, 0x6b, 0x43, 0x0d], // Barcode type EAN13
	BARCODE_JAN13   : [0x1d, 0x6b, 0x02], // Barcode type JAN13
	BARCODE_EAN8    : [0x1d, 0x6b, 0x03], // Barcode type EAN8
	BARCODE_CODE39  : [0x1d, 0x6b, 0x04], // Barcode type CODE39
	BARCODE_ITF     : [0x1d, 0x6b, 0x05], // Barcode type ITF
	BARCODE_NW7     : [0x1d, 0x6b, 0x06], // Barcode type NW7
	BARCODE_CODE93  : [0x1d, 0x6b, 0x07], // Barcode type CODE93
	BARCODE_CODE128 : [0x1d, 0x6b, 0x08]  // Barcode type CODE128

}


// SEE: https://github.com/manpaz/python-escpos

/*
"""
@author: Manuel F Martinez <manpaz@bashlinux.com>
@organization: Bashlinux
@copyright: Copyright (c) 2012 Bashlinux
@license: GNU GPL v3
"""
*/
function _print_image (line, size, _raw) {
	var i = 0;
	var count = 0;
	var buffer = [];

	_raw(cmds.S_RASTER_N);

	_raw([((size[0]/size[1])/8), 0, size[1], 0])
	buffer = [];

	while (i < line.length) {
		var hex_string = parseInt(line.slice(i, i + 8), 2);
		buffer.push(hex_string);
		i += 8;
		count += 1;
		if (count % 4 === 0) {
			_raw(buffer);
			buffer = [];
			count = 0;
		};
	}
}


function _convert_image (img, _raw) {
	var pixels = [];
	var pix_line = '';
	var im_left = '';
	var im_right = '';
	var _switch = 0;
	var img_size = [0, 0];

	if (img.width > 512) console.log('WARNING: Image is wider than 512 and could be truncated at print time ');
	if (img.height > 255) error('ImageSizeError');


	var image_border = _check_image_size(img.width);

	for (var i = 0; i < image_border[0]; i++) {
		im_left += '0'; 	
	}; 

	for (var i = 0; i < image_border[1]; i++) {
		im_right += '0';
	};


	for (var y = 0; y < img.height; y++) {
		img_size[1] += 1;
		pix_line += im_left;
		img_size[0] += image_border[0];

		for (var x = 0; x < img.width; x++) {
			img_size[0] += 1;
			var RGB = getPixel(img, x, y);
			var im_color = RGB[0] + RGB[1] + RGB[2];
			var im_pattern = '1X0';
			var pattern_len = im_pattern.length;
			_switch = (_switch - 1) * (-1);

			// console.log(y, x, im_color, pattern_len, _switch + '')
			for (var z = 0; z < pattern_len; z++) {
				if (im_color <= (255 * 3 / pattern_len * (z + 1))) {
					if (im_pattern[z] === 'X') {
						pix_line += _switch;
					} else{
						pix_line += im_pattern[z];
					};
					break;
					
				} else if (im_color > (255 * 3 / pattern_len * pattern_len) && im_color <= (255 * 3)) {
					pix_line += im_pattern.substr(-1);
					break;
				}
			};
	
		};

		pix_line += im_right;
		img_size[0] += image_border[1];
		
	};

	_print_image(pix_line, img_size, _raw);

}

function _dataUrl (dataUrl, config, _raw) {
	var img = getImgFromDataUrl(dataUrl);
	var im = getImageData(img, config);
	_convert_image(im, _raw);
}

function _image (img, config, _raw) {
	var im = getImageData(img, config);
	_convert_image(im, _raw);
}

function _text (text, encoding, _raw) {
	var buf = text;
	_raw(buf);
}

function _barcode (text, _raw) {
	var buf = text;
	_raw(buf);
}

var defaults = {
	align: 'left',
	font: 'a',
	type: 'normal',
	width: 1,
	height: 1,
	density: 0
};


function _set (config, _raw) {
	var align = (config.align || defaults.align).toUpperCase();
	var font = (config.font || defaults.font).toUpperCase();
	var type = (config.type || defaults.type).toUpperCase();
	var width = config.width || defaults.width;
	var height = config.height || defaults.height;
	var density = config.density || defaults.density;

	if (height == 2 && width == 2) {
		_raw(cmds.TXT_NORMAL);
		_raw(cmds.TXT_4SQUARE);
	} else if (height == 2 && width != 2) {
		_raw(cmds.TXT_NORMAL);
		_raw(cmds.TXT_2HEIGHT);
	} else if (width == 2 && height != 2) {
		_raw(cmds.TXT_NORMAL);
		_raw(cmds.TXT_2WIDTH);
	} else {
		_raw(cmds.TXT_NORMAL);
	}

	if (type == 'B') {
		_raw(cmds.TXT_BOLD_ON);
		_raw(cmds.TXT_UNDERL_OFF);
	} else if (type == 'U') {
		_raw(cmds.TXT_BOLD_OFF);
		_raw(cmds.TXT_UNDERL_ON);
	} else if (type == 'U2') {
		_raw(cmds.TXT_BOLD_OFF);
		_raw(cmds.TXT_UNDERL2_ON);		
	} else if (type == 'BU') {
		_raw(cmds.TXT_BOLD_ON);
		_raw(cmds.TXT_UNDERL_ON);		
	} else if (type == 'BU2') {
		_raw(cmds.TXT_BOLD_ON);
		_raw(cmds.TXT_UNDERL2_ON);		
	} else if (type == 'NORMAL') {
		_raw(cmds.TXT_BOLD_OFF);
		_raw(cmds.TXT_UNDERL_OFF);		
	}

	if (font == 'B') {
		_raw(cmds.TXT_FONT_B);
	} else {
		_raw(cmds.TXT_FONT_A);
	}

	if (align == 'CENTER') {
		_raw(cmds.TXT_ALIGN_CT);
	} else if (align == 'RIGHT') {
		_raw(cmds.TXT_ALIGN_RT);
	} else if (align == 'LEFT') {
		_raw(cmds.TXT_ALIGN_LT);
	}

	if (density == 0) {
		_raw(cmds.PD_N50);
	} else if (density == 1) {
		_raw(cmds.PD_N37);
	} else if (density == 2) {
		_raw(cmds.PD_N25);
	} else if (density == 3) {
		_raw(cmds.PD_N12);
	} else if (density == 4) {
		_raw(cmds.PD_0);
	} else if (density == 5) {
		_raw(cmds.PD_P12);
	} else if (density == 6) {			
		_raw(cmds.PD_P25);
	} else if (density == 7) {
		_raw(cmds.PD_P37);
	} else if (density == 8) {
		_raw(cmds.PD_P50);
	}
}

function _cut (_raw) {
	_raw(cmds.PAPER_FULL_CUT);
}

function _hw (hw, _raw) {
	hw = hw || 'init';
	hw = hw.toUpperCase();

	if (hw == 'INIT') {
		_raw(cmds.HW_INIT);
	} else if (hw == 'SELECT') {
		_raw(cmds.HW_SELECT);
	} else if (hw == 'RESET') {
		_raw(cmds, HW_RESET);
	}
}

function _newLine (count, _raw) {
	count = count || 1;
	var buf = [ cmds.CTL_CR, cmds.CTL_LF ];
	for (var i = 0; i < count; i++) {
		_raw(cmds.CTL_CR);
		_raw(cmds.CTL_LF);
	}
}

function _pad (count, _raw) {
	count = count || 1;
	var buf = [ 0x1b, 0x4a, 0xff, 0x1b, 0x4a, 0xff ];
	for (var i = 0; i < count; i++) {
		_raw(buf);
	}	
}

function _qr (str, size, _raw) {
	size = size || 6;
	var encoder = new TextEncoder('utf8');
	var data = encoder.encode(str);
	data = Array.prototype.slice.call(data);
	var buf = []
	var tmp = [].concat(cmds.QR_WRITER_BUFFER);
	tmp[3] = data.length + 3; // set buffer length

	buf = buf.concat(cmds.QR_SIZE, size, cmds.QR_ERRLEVEL, tmp, data, cmds.QR_PRINT)
	_raw(buf);

}	


function escpos (_raw) {
	var print = function() {};

	print.dataUrl = function(dataUrl) {
		_dataUrl(dataUrl, _raw);
		return print;
	};

	print.image = function(img, config) {
		config = config || {};
		_image(img, config, _raw);
		return print;
	};

	print.lineasLoop = function (arrLineas, isPedido) {
		var padMaterial = "            ";
		var padCantidad = "            ";
		var padMonto = "      ";
		for (i = 0; i < arrLineas.length ; i++) {

			var add_material = arrLineas[i].material + padMaterial.substring(0, padMaterial.length - arrLineas[i].material.length);
			var add_cantidad = arrLineas[i].cantidad + padCantidad.substring(0, padCantidad.length - arrLineas[i].cantidad.length);
			var add_monto = arrLineas[i].precio + padMonto.substring(0, padMonto.length - arrLineas[i].precio.length);
			if (isPedido == 1) { 
			var end = add_material + add_cantidad + "     " + add_monto;
			}
			else {
				var end = add_material + add_cantidad + "     ";
			}
			_text(end.toBytes(), 1, _raw);
			_newLine(1, _raw);
		}
		return print;
	};
	print.texto = function(text, encoding) {
		/*
		encoding = encoding || 'gbk';
		var encoder = new TextEncoder(encoding, {NONSTANDARD_allowLegacyEncoding: true});
		text = encoder.encode(text);
		text = Array.prototype.slice.call(text);
		*/
		_text(text.toBytes(), encoding, _raw);
		return print;
	};

	print.text = function(text, encoding) {
		encoding = encoding || 'gbk';
		var encoder = new TextEncoder(encoding, {NONSTANDARD_allowLegacyEncoding: true});
		text = encoder.encode(text);
		text = Array.prototype.slice.call(text);
		_text(text, encoding, _raw);
		return print;
	};
	
	print.barcode = function(codigo, type, width, height, position, font) {
		if (codigo != '') {
			// centrar
			_barcode([0x1B, 0x61, 01], _raw);
			// barcode h
			_barcode([0x1D, 0x68, height], _raw);
			//_barcode(cmds['BARCODE_EAN13'], _raw);
			//_barcode([0x1d, 0x6b, 0x41, 0x0c], _raw);  //UPC BARCODE - No sirve tiene DV
			_barcode([0x1d, 0x6b, 0x49, 0x0c], _raw); // cODE 128
			_barcode(codigo.toBytes(), _raw);
			_barcode([0x00], _raw);
			_barcode(cmds.CTL_CR, _raw);
			//_barcode(codigo.toBytes(), _raw);
			//_barcode(cmds.CTL_CR, _raw);
			return print;
		}
	};

	print.barcodeCliente = function(codigo, type, width, height, position, font) {
		if (codigo != '') {
			_barcode([0x1B, 0x61, 01], _raw);
			//_barcode(cmds.CTL_CR, _raw);
			_barcode(codigo.toBytes(), _raw);
			_barcode(cmds.CTL_LF, _raw);
			_barcode("COPIA CLIENTE".toBytes(), _raw);
			_barcode(cmds.CTL_LF, _raw);
			return print;
		}
	};


	print.barcode2 = function(codigo, type, width, height, position, font) {
		for (var z = 0; z < codigo.length; z++) {
			var cc = codigo[z];
			_barcode([0x1B, 0x61, 01], _raw); //centra
			_barcode([0x1D, 0x68, 60], _raw); //height 4
			_barcode([0x1d, 0x77, 0x01], _raw); // width 1
			_barcode([0x1d, 0x6b, 0x49, 0x10], _raw);  //code128 largo 16
			_barcode(cc.toBytes(), _raw); // codigo
			_barcode([0x00], _raw); // 00
			_barcode(cmds.CTL_CR, _raw);
		}
		return print;

		/*if (codigo != '') {
			_barcode([0x1B, 0x61, 01], _raw); //centra
			_barcode([0x1D, 0x68, 60], _raw); //height 4
			_barcode([0x1d, 0x77, 0x01], _raw); // width 1
			_barcode([0x1d, 0x6b, 0x49, 0x10], _raw);  //code128 largo 16
			_barcode(codigo.toBytes(), _raw); // codigo
			_barcode([0x00], _raw); // 00
			_barcode(cmds.CTL_CR, _raw);
			return print;
		}*/
	};


	print.barcode2Cliente = function(codigo, type, width, height, position, font) {
		for (var z = 0; z < codigo.length; z++) {
			var cc = codigo[z];
			_barcode([0x1B, 0x61, 01], _raw);
			_barcode(cc.toBytes(), _raw);
			_barcode(cmds.CTL_LF, _raw);
			_barcode("COPIA CLIENTE".toBytes(), _raw);
			_barcode(cmds.CTL_LF, _raw);
		}
		
		return print;

		/*if (codigo != '') {
			_barcode([0x1B, 0x61, 01], _raw);
			_barcode(codigo.toBytes(), _raw);
			_barcode(cmds.CTL_LF, _raw);
			_barcode("COPIA CLIENTE".toBytes(), _raw);
			_barcode(cmds.CTL_LF, _raw);
			return print;
		}*/
	};

	
	/*
	print.barcode = function(codes, qty, type, width, height, position, font) {
		for (i=0; i<codes.length; i++) {
			var code = codes[i];
			var uri = "http://www.barcodes4.me/barcode/c39/"+code+".png"
			_dataUrl(uri, {width: 250, height: 100}, _raw);
			_text((codes[i]+' x '+qty[i]).toBytes(), '', _raw);
		}
		return print;
	}
	*/

	print.chinese2x = function(flag) {
		var n = flag ? 1 : 0;
		_raw([28, 87, n]);
		return print;
	};

	print.set = function(config) {
		_set(config, _raw);
		return print;
	};

	print.hw = function(hw) {
		_hw(hw, _raw);
		return print;
	};

	print.cut = function() {
		var END = [0x0a, 0x0a, 0x0a, 0x0a, 0x0a, 0x0a];
		_raw(END);
		_cut(_raw);
		return print;
	};

	print.buffer_go = function() {
		_raw(cmds.BUFFER_GO);
		return print;
	}
	print.newLine = function(count) {
		_newLine(count, _raw);
		return print;
	};

	print.pad = function(count) {
		_pad(count, _raw);
		return print;
	};

	print.qr = function(str, size) {
		_qr(str, size, _raw);
		return print;
	};

	return print;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = escpos;
}