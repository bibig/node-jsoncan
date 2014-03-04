exports.create = create;

var fs = require('fs');
var path = require('path');

// 创建connection
function create (_path) {
  // console.log(_path);
  if (!fs.existsSync(_path)) {
    try {
      fs.mkdirSync(_path);
    } catch (e) {
      throw new Error('Cannot build the jsoncan data path [' + _path + ']');
    }
  }
  
  return {
    PATH: _path,
    getTablePath: getTablePath,
    getTableIdPath: getTableIdPath,
    getTableIdFile: getTableIdFile,
    getTableUniquePath: getTableUniquePath,
    getTableUniqueFile: getTableUniqueFile,
    createTablePaths: createTablePaths,
    linkTableUniqueFile: linkTableUniqueFile,
    linkTableUniqueFileSync: linkTableUniqueFileSync,
    unlinkTableUniqueFile: unlinkTableUniqueFile,
    unlinkTableUniqueFileSync: unlinkTableUniqueFileSync,
    save: save, // for insert or update
    saveSync: saveSync,
    remove: remove,
    removeSync: removeSync,
    findAll: findAll,
    find: find,
    findBy: findBy,
    findAllSync: findAllSync,
    findSync: findSync,
    findBySync: findBySync
  };
}

function getTablePath (table) {
  return path.join(this.PATH, table);
}

function getTableIdPath (table) {
  return path.join(this.getTablePath(table), '_id');
}

// 获取table数据文件
function getTableIdFile (table, id) {
  return path.join(this.getTableIdPath(table), id + '.js');
}

function getTableUniquePath (table, name) {
  return path.join(this.getTablePath(table), name);
}

function getTableUniqueFile (table, name, value) {
  return path.join(this.getTableUniquePath(table, name), encrypt(value) + '.js');
}

/**
 * 连接表时的初始化任务
 * 1. 创建表的根目录
 * 2. 为schemas中定义的唯一字段创建目录
 * @table: 表名
 * @fields: 表字段的定义信息表
 * 
 */
function createTablePaths (table, fields) {
  var root = this.getTablePath(table);
  var idPath = this.getTableIdPath(table);
  var _this = this;
  
  if (!fs.existsSync(idPath)) {
    if (!fs.existsSync(root)) {
      fs.mkdirSync(root);
    }
    fs.mkdirSync(idPath);
  }
  
  Object.keys(fields).forEach(function (name) {
    var field = fields[name];
    var uniquePath;
    if (field.isUnique) {
      uniquePath = _this.getTableUniquePath(table, name);
      // console.log(uniquePath);
      if (!fs.existsSync(uniquePath)) {
        fs.mkdirSync(uniquePath);   
      }   
    }
  });
}


function encrypt (s) {
  if (typeof s === 'string' && s.length > 0) {
	  return require('crypto').createHash('sha1').update(s).digest('hex');
	} else {
	  throw new Error('invalid string param:' + s);
	}
}

function _findOneCallback (err, data, callback) {
  if (err) {
    // record none exist
    // if (err.errno === 34) {
    if (err.code === "ENOENT") {
      callback(null, null);
    } else {
      callback(err);
    }
  } else {
    callback(null, JSON.parse(data));
  }
}

function _find (file, callback) {
  fs.readFile(file, {encoding: 'utf8'}, function (e, data) {
    if (e) {
      // record does not exist
      // if (e.errno === 34) {
      if (e.code === "ENOENT") {
        callback(null, null);
      } else {
        callback(e);
      }
    } else {
      callback(null, JSON.parse(data));
    }
  });
}

function _findSync (file) {
  try {
    var data = fs.readFileSync(file, {encoding: 'utf8'});
    return JSON.parse(data);
  } catch (e) {
    if (e.code === "ENOENT") {
      return null;
    } else {
      return e;
    }
  }
}


// 得到原始json数据
function find (table, id, callback) {
  _find(this.getTableIdFile(table, id), callback);
}

function findBy (table, fieldName, fieldValue, callback) {
  _find(this.getTableUniqueFile(table, fieldName, fieldValue), callback);
}

// 得到原始json数据
function findSync (table, id) {
  return _findSync(this.getTableIdFile(table, id));
}

function findBySync (table, fieldName, fieldValue) {
  return _findSync(this.getTableUniqueFile(table, fieldName, fieldValue));
}


// 将读出所有记录
function findAll (table, callback) {
  var list = [];
  var _path = this.getTableIdPath(table);
  fs.readdir(_path, function (err, files) {
    if (err) {
      callback(err);
    } else {
      // if none files found, files = []
      files.forEach(function (file) {
        if (isValidFile(file)) {
          list.push(JSON.parse(fs.readFileSync(path.join(_path, file))));
        }
      });
      callback(null, list);
    }
  });
}

function findAllSync (table) {
  var list = [];
  var _path = this.getTableIdPath(table);
  var files = fs.readdirSync(_path);
  
  files.forEach(function (file) {
    if (isValidFile(file)) {
      list.push(JSON.parse(fs.readFileSync(path.join(_path, file))));
    }
  });
  
  return list;
  
}

function isValidFile (file) {
  return file.split('.')[1] == 'js';
}

function remove (table, _id, callback) {
  fs.unlink(this.getTableIdFile(table, _id), callback);
}

function removeSync (table, _id) {
  fs.unlinkSync(this.getTableIdFile(table, _id));
}

function unlinkTableUniqueFile (table, name, value, callback) {
  fs.unlink(this.getTableUniqueFile(table, name, value), callback);
}

function unlinkTableUniqueFileSync (table, name, value) {
  fs.unlinkSync(this.getTableUniqueFile(table, name, value));
}

function linkTableUniqueFile (table, _id, name, value, callback) {
  var idFile = this.getTableIdFile(table, _id);
  var linkFile = this.getTableUniqueFile(table, name, value);
  fs.symlink(idFile, linkFile, callback);
}

function linkTableUniqueFileSync (table, _id, name, value) {
  var idFile = this.getTableIdFile(table, _id);
  var linkFile = this.getTableUniqueFile(table, name, value);
  fs.symlinkSync(idFile, linkFile);
}

function save (table, _id, data, callback) {
  fs.writeFile(this.getTableIdFile(table, _id), JSON.stringify(data), function (err) {
    if (err) {
      callback(err);
    } else {
      callback(null, data);
    }
  });
}

function saveSync (table, _id, data) {
  fs.writeFileSync(this.getTableIdFile(table, _id), JSON.stringify(data));
  return data;
}