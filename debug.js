var fu = require("fu.js");

var debug = exports;

debug.listen = function(port, host) {
	fu.listen(port, host);
};

fu.get("/", fu.staticHandler("index.html"));
fu.get("/screen.css", fu.staticHandler("screen.css"));
fu.get("/jquery.treeview.css", fu.staticHandler("jquery.treeview.css"));
fu.get("/jquery.js", fu.staticHandler("jquery.js"));
fu.get("/jquery.cookie.js", fu.staticHandler("jquery.cookie.js"));
fu.get("/jquery.treeview.js", fu.staticHandler("jquery.treeview.js"));
fu.get("/jquery.treeview.async.js", fu.staticHandler("jquery.treeview.async.js"));
fu.get("/treeview-default.gif", fu.staticHandler("treeview-default.gif"));
fu.get("/treeview-default-line.gif", fu.staticHandler("treeview-default-line.gif"));

fu.get("/eval", function (req, res) {
	if (req.uri.params.eval !== undefined) {
		res.simpleJSON(200, evalStr(req.uri.params.eval));
	} else {
		res.simpleText(200, 'Error');
	}
});

fu.get("/tree", function (req, res) {
	if (req.uri.params.root !== undefined && req.uri.params.root !== 'source') {
		res.simpleJSON(200, getObj(req.uri.params.root));
	} else {
		res.simpleJSON(200, getObj('process'));
	}

});

function getObj(key) {
	var obj = process;
	var keys = key.split('.');
	
	keys.forEach(function (x) {
		obj = obj[x];
	});
		
	var output = [];
	var cur;
	var children = false;
	for (var i in obj) {
		// Prevent loops
		if (obj === obj[i])
			continue;
		cur = {id: key+'.'+i};
		cur.text = '<strong>'+i+' - '+typeof(obj[i])+'</strong>';
		var str;
		try {
			str = JSON.stringify(obj[i]);
		} catch (e) {
			str = undefined;
		}
		if (str == undefined) {
			try {
				str = obj[i].toString();
			} catch (e) {
				str = '';
			}
		}
		cur.text += '<pre>'+str+'</pre>';
		if (typeof(obj[i]) !== 'string') {
			children = false
			for (var j in obj[i]) {
				children = true;
				break;
			}
			if ((key+'.'+i) == 'process.node.Timer') {
				children = false
			}
			if (children === true) {
				cur.hasChildren = true;
			}
		}
		output.push(cur);
	}
	return output;
}

function evalStr(str) {
	var result;
	var error = false;
	try {
		result = eval(str);
		try {
			result = JSON.stringify(result);
		} catch (e) {
			result = result.toString();
		}
	} catch (err) {
		error = true;
		result = err;
	}
	var output = {result: result};
	output.error = error;
	output.str = str;
	return output;
}