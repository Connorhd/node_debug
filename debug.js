var fu = require("./fu"),
  url = require("url");

var debug = exports;

debug.listen = function (port, host) {
  fu.listen(port, host);
};

var path = require("path");
fu.get("/", fu.staticHandler(path.join(__dirname, "index.html")));
fu.get("/screen.css", fu.staticHandler(path.join(__dirname, "screen.css")));
fu.get("/jquery.treeview.css", fu.staticHandler(path.join(__dirname, "jquery.treeview.css")));
fu.get("/jquery.js", fu.staticHandler(path.join(__dirname, "jquery.js")));
fu.get("/jquery.cookie.js", fu.staticHandler(path.join(__dirname, "jquery.cookie.js")));
fu.get("/jquery.treeview.js", fu.staticHandler(path.join(__dirname, "jquery.treeview.js")));
fu.get("/jquery.treeview.async.js", fu.staticHandler(path.join(__dirname, "jquery.treeview.async.js")));
fu.get("/treeview-default.gif", fu.staticHandler(path.join(__dirname, "treeview-default.gif")));
fu.get("/treeview-default-line.gif", fu.staticHandler(path.join(__dirname, "treeview-default-line.gif")));

fu.get("/eval", function (req, res) {
  var uri = url.parse(req.url, true);
  if (uri.query.eval !== undefined && uri.query.id !== undefined) {
    res.simpleJSON(200, evalStr(uri.query.eval, uri.query.id));
  } else {
    res.simpleText(200, 'Error');
  }
});

fu.get("/tree", function (req, res) {
  var uri = url.parse(req.url, true);
  if (uri.query.id !== undefined && uri.query.cmd !== undefined) {
    if (uri.query.root !== undefined) {
      res.simpleJSON(200, getObj(uri.query.id, uri.query.cmd, uri.query.root));
    }
  } else {
    res.simpleText(200, 'Error');
  }
});

fu.get("/console", function (req, res) {
  var uri = url.parse(req.url, true);
  if (uri.query.id !== undefined) {
    handleConsole(uri.query.id, res);
  } else {
    res.simpleText(200, 'Error');
  }
});


var SESSION_TIMEOUT = 60 * 1000;

var sessions = [];

function createSession (id) {
  if (sessions[id] === undefined) {
    // Create session
    sessions[id] = {
      timestamp: 0,
      queue: [],
      result: [],
      cmd: 0
    };
  }
}

function handleConsole (id, res) {
  createSession(id);
  
  var session = sessions[id];
  session.timestamp = new Date();
  if (session.queue.length > 0) {
    res.simpleJSON(200, session.queue);
    delete sessions[id].res;
    session.queue = [];
  } else {
    session.res = res;
    session.timeout = setTimeout(function () { closeReq(res); delete sessions[id].res; }, 30000);
  }
}

function closeReq (res) {
  res.simpleJSON(200, []);
}

debug.log = function (msg) {
  if (arguments.length > 1) {
    for (i = 0; i < arguments.length; i++) {
      debug.log(arguments[i]);
    }
    return;
  }
  for (var id in sessions) {
    if (!sessions.hasOwnProperty(id)) continue;
    var session = sessions[id];

    session.cmd += 1;
    session.result[session.cmd] = msg;
    session.queue.push(session.cmd);

    if (session.timeout !== undefined) {
      clearTimeout(session.timeout);
    }
    
    if (session.res !== undefined) {
      session.res.simpleJSON(200, session.queue);
      delete sessions[id].res;
      session.queue = [];
    }
  }
}

// interval to kill off old sessions
setInterval(function () {
  var now = new Date();
  for (var id in sessions) {
    if (!sessions.hasOwnProperty(id)) continue;
    var session = sessions[id];

    if (now - session.timestamp > SESSION_TIMEOUT) {
      delete sessions[id];
    }
  }
}, 1000);

// Determine whether or not an object has children
function hasChildren(obj) {
  var children = false
  
  if (typeof(obj) !== 'string' && !(obj instanceof String)) {
    for (var j in obj) {
      children = true;
      break;
    }
  }
  return children;
}

function getObj(id, cmd, key) {
  if (sessions[id] === undefined || sessions[id].result[cmd] === undefined)
    return {};

  // node.Timer causes a segfault
  if (key === "Timer") {
    return {};
  }

  var obj = sessions[id].result[cmd];
  
  if (key === 'source') {
    var output = {};
    output.id = '_root';

    output.text = obj.toString();
    
    output.text = '<pre class="result">'+output.text+'</pre>'
    
    if (hasChildren(obj) === true) {
      output.hasChildren = true;
    }

    return [output];
  }
  
  if (key === '_root') {
    delete key;
  }
  
  if (key !== undefined) {
    var keys = key.split('.');
  
    keys.forEach(function (x) {
      obj = obj[x];
    });
  }
  
  var output = [];
  var cur;
  var children = false;
  for (var i in obj) {
    // Prevent loops
    if (obj === obj[i])
      continue;
    if (key !== undefined)
      cur = {id: key+'.'+i};
    else
      cur = {id: i};
    cur.text = '<strong><span class="type">'+typeof(obj[i])+'</span>'+i+'</strong>';
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

    if (hasChildren(obj[i]) === true)
     cur.hasChildren = true;

    output.push(cur);
  }
  return output;
}

function evalStr (str, id) {
  createSession(id);
  var result;
  var error = false;
  var output = {};
  try {
    result = eval(str);
    sessions[id].cmd += 1;
    sessions[id].result[sessions[id].cmd] = result;
  } catch (err) {
    error = true;
    output.result = err;
    output.result.stack = output.result.stack.substring(0,output.result.stack.indexOf('at eval at evalStr')-4);
  }
  output.error = error;
  output.str = str;
  output.cmd = sessions[id].cmd;
  return output;
}
