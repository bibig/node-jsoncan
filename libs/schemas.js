exports.create = create;

var error = require('./error');
var rander = require('rander');
var safepass = require('safepass');

var ValidKeys = [
  'text', 
  'type',
  'isUnique',
  'unique', // alias isUnique
  'isNull',
  'null', // alias isNull
  'isRequired',
  'required', // alias isRequired
  'shouldAfter', 
  'shouldBefore',
  'length',
  'size', // alias length.
  'max',
  'min',
  'maxValue',
  'minValue',
  'pattern', // regex object.
  'default',
  'format', // a function which format a value for presentation, eg: format date object to 'yyyy-mm-dd' string. 
  'logic', // a function to create value of runtime field.
  'decimals', // for float type.
  'values', // only for enum and map fields.
  'suffix', // for presentation
  'prefix',  // for presentation
  'validate', // a custom validate function, if failed it should return error message directly! passed return null
  'isFake', // for field like 'passwordConfirm', it 's basically same as normal field, except it will never be saved!
  'fake', // alias for isFake
  'isReadOnly', // cannot update value after inserted.
  'readOnly', // alias for isReadOnly
  'step', // only for 'autoIncrement' type
  'autoIncrement', // only for 'autoIncrement' type
  'isIndex', // is index field
  'index'  // alias for isIndex
];

var RequiredKeys = ['type'];

// random, created, modified fields do not need to validate, the values are assigned by system.
var ValidTypes = [
  'string',
  'int',
  'float',
  'boolean',
  'autoIncrement', // auto increment id, used with 'autoIncrement' key
  'increment', // autoIncrement alias
  'map',
  'hash', // map alias
  'enum',
  'password',
  'date',
  'datetime',
  'timestamp', // int, like Date.now()
  'created', // created timestamp
  'modified', // modified timestamp
  'text',
  'ref', // reference
  'primary', // _id type
  'random', // alpha number random, default length 8
  'alias', // logic field, should define a logic function to create its value.
  'email',
  'password',
  'url',
  'uuid',
  'alpha',
  'numeric',
  'alphanumeric',
  'ip', // same as ip4
  'ip4',
  'ip6',
  'creditCard',
  'credit card', // same as creditCard
  'object' // array, hash, function ....
];

// 创建schema
function create (fields) {
  // add _id 字段
  fields._id = {
    text: '_id',
    type: 'primary'
  };
  checkFields(fields);

  return {
    fields: fields,
    inputFields: inputFields,
    isMap: isMap,
    isAliasField: isAliasField,
    isSystemField: isSystemField,
    mapIdToDesc: mapIdToDesc,
    present: present,
    presentAll: presentAll,
    hasFormat: hasFormat,
    hasUniqueField: hasUniqueField,
    hasAutoIncrementField: hasAutoIncrementField,
    formatField: formatField,
    addPrefixAndSuffix:addPrefixAndSuffix,
    forEachField: forEachField,
    forEachUniqueField: forEachUniqueField,
    forEachIndexField: forEachIndexField,
    clearFakeFields: clearFakeFields,
    precise: precise,
    convertEachField: convertEachField,
    convert: convert,
    convertBackEachField: convertBackEachField,
    convertBack: convertBack,
    addAliasValues: addAliasValues,
    addSystemValues: addSystemValues,
    addDefaultValues: addDefaultValues,
    addValues: addValues,
    getField: getField,
    getPrimaryId: getPrimaryId,
    getTimestamp: getTimestamp,
    getRandom: getRandom,
    isValidType: isValidType,
    isValidPassword: isValidPassword,
    getFieldType: function (name) { return this.fields[name].type; },
    isType: function (name, type) { return this.getFieldType(name) == type; },
    isAutoIncrement: isAutoIncrement,
    isField: isField,
    isUnique: isUnique,
    isIndex : isIndex,
    isReadOnly: isReadOnly,
    getUniqueFields: getUniqueFields,
    getAutoIncrementValue: null, // need to inject
    getNextAutoIncrementValue: getNextAutoIncrementValue,
    getReference: getReference,
    getChangedFields: getChangedFields,
    getRealUpdateData: getRealUpdateData,
    filterData: filterData,
    fieldValueConvertFn: fieldValueConvertFn
  };
}


function getField (v) {
  return typeof v == 'string' ? this.fields[v] : v;
}

function getReference (name) {
  var field = this.getField(name);
  // console.log(field.ref);
  return field.ref;
}

function isField (name) {
  return typeof this.fields[name] !== 'undefined';
}

// notice: auto increment fields are unique too.
function isUnique (v) {
  var field = this.getField(v);
  return field.unique === true || field.isUnique === true || this.isAutoIncrement(v);
}

function isIndex (v) {
  var field = this.getField(v);
  return field.isIndex === true || field.index === true;
}

function isAutoIncrement (v) {
  var field = this.getField(v);
  return field.type === 'increment' || field.type == 'autoIncrement';
}

function isReadOnly (v) {
  var field = this.getField(v);
  return field.isReadOnly || field.readOnly || this.isAutoIncrement(v);
}

function isValidKey (key) {
  return ValidKeys.indexOf(key) > -1;
}

function isValidType (type) {
  return ValidTypes.indexOf(type) > -1;
}

function checkFields (fields) {
  Object.keys(fields).forEach(function (name) {
    checkField(name, fields[name]);
  });
}

function checkField (name, field) {
  /*
  var keys = Object.keys(field);
  keys.forEach(function (key) {
    if (!isValidKey(key)) {
      throw error.create(1000, key, name);
    }
  });
  */
  
  RequiredKeys.forEach(function (key) {
    if (field[key] == undefined) {
      throw error(1001, key, name);
    }
  });
  
  if (!isValidType(field.type)) {
    throw error(1002, field.type, name);
  }
}

// 将原始的数据转换为可以放入表示层阅读的数据
function presentAll (data) {
  var presentations = {};
  data = data || {};
  this.forEachField(function (name, field, _this) {
    presentations[name] = _this.present(name, data[name], data);
  }, data);
  
  return presentations;
}

function present (name, value, data) {
  if (this.isMap(name)) {
    value = this.mapIdToDesc(name, value);
  }
  
  if (this.hasFormat(name)) {
    value = this.formatField(name, value, data);
  }

  value = this.addPrefixAndSuffix(name, value);

  return value;
}

// 将map字段的值转换为描述文本
function mapIdToDesc (name, value) {
  value = value + '';
  return this.fields[name].values[value];
}

function hasFormat (name) {
  return typeof this.fields[name].format == 'function';
}

function addPrefixAndSuffix(name, value) {
  var field = this.fields[name];
  
  if (field.prefix) {
    value = field.prefix + '' + value;
  }
  
  if (field.suffix) {
    value = value + '' + field.suffix;
  }
  
  return value;
}

// invoke the format function defined in schema.
function formatField (name, value, data) {
  // console.log(arguments);
  return this.fields[name].format(value, data); 
}

function isSystemField (field) {
  return ['primary', 'created', 'modified', 'random'].indexOf(field.type) > -1 || this.isAutoIncrement(field);
}

function isAliasField (field) {
  return field.type == 'alias' && typeof field.logic == 'function';
}

// 是否是map字段
function isMap (name) {
  var field = this.fields[name];
  if (!field) return false;
  return ( field.type == 'hash' || field.type == 'map' ) && field.values;
}

// ready to deprecate
// 获取所有isInput的fields
function inputFields () {
  var fields = {};
  
  this.forEachField(function (name, field, _this) {
    if (field.isInput) {
      fields[name] = field;
      fields[name].name = name;
    }
  });
  
  return fields;
}

function getUniqueFields () {
  var map = {};
  this.forEachUniqueField(function (name, field, _this) {
    map[name] = _this.isAutoIncrement(field) ? ( field.autoIncrement || 1 ) : 0;
  });
  // console.log('in schemas.getUniqueFields()');
  // console.log(map);
  return map;
}

/**
 * 是否有unique字段
 * @return boolean
 */
function hasUniqueField () {
  return Object.keys(this.getUniqueFields()).length > 0;
}

function hasAutoIncrementField () {
  var result = false;
  this.forEachField(function (name, field, _this) {
    if (result) { return; }
    if (_this.isAutoIncrement(field)) { result = true; }
  });
  
  return result;
}

/**
 * 遍历每一个表字段
 * @callback(field name, field object, context)
 */
function forEachField (callback, fields, filter) {
  var _this = this;
  var targets;

  if (Array.isArray(fields)) {
    targets = fields;
  } else if ( fields && typeof fields == 'object') {
    targets = Object.keys(fields);
  } else {
    targets = Object.keys(this.fields);
  }
  
  targets.forEach(function (name) {
    var field = _this.fields[name];
    if (typeof field === 'undefined') return;
    if (typeof filter == 'function') {
      if (!filter(field)) return;
    }
    callback(name, field, _this);
  });
}

function forEachUniqueField (callback, fields) {
  var _this = this;
  this.forEachField(callback, fields, function (field) {
    return _this.isUnique(field);
  });
}

function forEachIndexField (callback, fields) {
  var _this = this;
  this.forEachField(callback, fields, function (field) {
    return _this.isIndex(field);
  });
}

/**
 * remove all the fake fields data
 * @data, ready to save
 */

function clearFakeFields (data) {
  var noFake = {};
  this.forEachField(function (name, field, self) {
    noFake[name] = data[name];
  }, data, function (field) {
    return ! (field.isFake || field.fake);
  });
  
  return noFake;
}

function precise(num, decimals) {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * convert value for json file, accoring to the field type
 */
function convertEachField (data, fields) {
  this.forEachField(function (name, field, _this) {
    data[name] = _this.convert(field, data[name]);
  }, fields);
  return data;
}

/**
 * convert for json file
 */
function convert (field, value) {
  // console.log('convert field: %s = %s', field.type, value);
  // string to date object
  if ((field.type == 'date' || field.type == 'datetime')) {
    if (typeof (value) == 'string') {
      return new Date(value).getTime();
    } else if ( value instanceof Date) {
      return value.getTime();
    }
  }

  if ((field.type == 'int') && typeof (value) == 'string') {
    return parseInt(value, 10);
  }

  if ((field.type == 'float') && typeof (value) == 'string') {
    return precise(value, field.decimals || 2);
  }

  if (field.type == 'password') {
    return safepass.hash(value);
  }
  
  if (field.type == 'boolean' && typeof value != 'boolean') {
    return value === 1 || value === '1' || value === 'on' || value === 'true';
  }
  
  if (field.type == 'ref') {
    if (typeof value == 'object') {
      return value._id;
    }
  }
  
  return value;
}

/**
 * convert back from json
 */
function convertBackEachField (data) {
  this.forEachField(function (name, field, _this) {
    data[name] = _this.convertBack(field, data[name]);
  }, data);
  return data;
}

function convertBack (field, value) {
  if ((field.type == 'date' || field.type == 'datetime')) {
    if (typeof value == 'number' ) {
      return new Date(value);
    }
  }
  return value;
}

// convert string to fited type
function fieldValueConvertFn (field) {
  field = this.getField(field);
  switch (field.type) {
    case 'int':
    case 'autoIncrement':
    case 'increment':
    case 'date':
    case 'datetime':
    case 'created':
    case 'modified':
      return function (s) { return parseInt(s, 10); };
    case 'float':
      return function (s) { return parseFloat(s); };
    default:
      return function (s) { return s; };
  }
}

// 得到当前时戳
function getTimestamp () {
  return (new Date()).getTime();
}

function getPrimaryId () {
  return require('crypto').randomBytes(16).toString('hex');
}

/** 
 * 获取随机字符串或数字
 * @type: 类型(string or int)
 * @len: 长度
 */
function getRandom (type, len) {
  len = len || 8;  
  switch (type) {
    case 'int':
      return rander.number(len);
    case 'string':
    default:
      return rander.string(len);
  }
}

function addDefaultValues (data, fields) {
  var filtered = {};
  this.forEachField(function (name, field) {
    if (data[name] !== undefined) return; // data中已经设置, 注意可以为空值，null值
    if (field.default !== undefined) {
      if (typeof field.default == 'function') {
        data[name] = field.default();
      } else {
        data[name] = field.default;
      }
    } else { // if not set default value then set value to null
      // data[name] = null;
    }
  }, fields);
  return data;
}

function addSystemValues (data) {
  var _this = this;
  
  this.forEachField(function (name, field) {
    switch (field.type) {
      case 'primary':
        if (!data[name]) {
          data[name] = _this.getPrimaryId();
        }
        break;
      case 'random':
        if (!data[name]) {
          data[name] = _this.getRandom();
        }
        break;
      case 'increment':
      case 'autoIncrement':
        // console.log('autoIncrement: %s', _this.getAutoIncrementValue(name));
        if (!data[name]) {
          data[name] = parseInt(_this.getAutoIncrementValue(name) || 1, 10);
        }
        break;
      case 'created':
        if (!data[name]) {
          data[name] = _this.getTimestamp();
        }
        break;
      case 'modified':
        data[name] = _this.getTimestamp();
        break;
    }
  }, null, function (field) {
    return _this.isSystemField(field);
  });
  
  return data;
}

function addAliasValues (data) {
  this.forEachField(function (name, field, _this) {
    data[name] = field.logic(data);
  }, null, function (field) {
    return isAliasField(field);
  });
  
  return data;
}

function addValues (data) {
  data = clone(data); // do not dirty the param data, object param is dangerous.
  data = this.addDefaultValues(data);
  data = this.addSystemValues(data);
  data = this.addAliasValues(data);
  return data;
}

/**
 * filter dirty data, only include those who are defined in schemas
 * @data: ready to save
 */
function filterData (data) {
  var safe = {};
  
  this.forEachField(function (name, field, _this) {
    if (_this.isSystemField(field)) { return; }
    if (data[name] !== undefined) {
      safe[name] = data[name];
    }
  });
  
  return safe;
}

function clone (data) {
  var _data = {};
  
  Object.keys(data).forEach(function (name) {
    _data[name] = data[name];
  });
  
  return _data;
}

/**
 * 检查密码是否正确
 * @hash: 数据库中保存的原值
 * @pass: 要检测的值
 * @return boolean
 */ 

function isValidPassword (hash, pass) {
  return safepass.set(hash).isValid(pass);
}

function getNextAutoIncrementValue (name, currentValue) {
  var step = this.fields[name].step || 1;
  return parseInt(currentValue, 10) + parseInt(step, 10);
}

function getChangedFields (data, record) {
  var fields = [];
  this.forEachField(function (name, field, self) {
    if (self.isReadOnly(field)) { return; }
    if (data[name] == undefined) { return; }
    
    if (data[name] != record[name]) {
      fields.push(name);
    }
  }, data);
  return fields;
}

/** 
 * 无论是sync or async都要处理的部分
 * 如果unique字段更改，需要删除旧的link文件，建立新的link文件
 * @data: 要保存的数据
 * @record: 当前数据库中的数据
 */ 
function getRealUpdateData (data, record) {
  var target = {}; // 避免data中夹杂schemas没有定义的数据
  this.forEachField(function (name, field) {
    if (data[name] == undefined) {
      target[name] = record[name];
    } else {
      target[name] = data[name];
    }
  });
  return this.addValues(target);
}
