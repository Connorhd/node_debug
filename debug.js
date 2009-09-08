var fu = require("fu.js");

var debug = exports;

debug.listen = function (port, host) {
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
  if (req.uri.params.eval !== undefined && req.uri.params.id !== undefined) {
    res.simpleJSON(200, evalStr(req.uri.params.eval, req.uri.params.id));
  } else {
    res.simpleText(200, 'Error');
  }
});

fu.get("/tree", function (req, res) {
  if (req.uri.params.id !== undefined && req.uri.params.cmd !== undefined) {
    if (req.uri.params.root !== undefined) {
      res.simpleJSON(200, getObj(req.uri.params.id, req.uri.params.cmd, req.uri.params.root));
    }
  } else {
    res.simpleText(200, 'Error');
  }
});

fu.get("/console", function (req, res) {
  if (req.uri.params.id !== undefined) {
    handleConsole(req.uri.params.id, res);
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
  for (var id in sessions) {
    if (!sessions.hasOwnProperty(id)) continue;
    var session = sessions[id];
    
    session.queue.push(msg);
    
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
  
  if (typeof(obj) !== 'string') {
    for (var j in obj) {
      children = true;
      break;
    }
  }
  return children;
}

function getObj (id, cmd, key) {
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

    try {
      output.text = JSON.stringify(obj);
    } catch (e) {
      output.text = obj.toString();
    }
    
    output.text = '<code class="result">'+output.text+'</code>'
    
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
  }
  output.error = error;
  output.str = str;
  output.cmd = sessions[id].cmd;
  return output;
}
