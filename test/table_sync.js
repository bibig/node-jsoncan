
var should  = require('should');
var path    = require('path');
var Jsoncan = require('../index');
var fs      = require('fs');

describe('test sync actions in table.js', function () {
  
  
  var PATH = path.join(__dirname, 'table_sync_test');
  var tableName = 'user';
  var fields = {
    id: {
      text: 'user id',
      type: 'random',
      length: 8,
      isUnique: true
    },
    name: {
      text: 'your name',
      type: 'string',
      max: 30,
      required: true,
      isInput: true
    },
    email: {
      text: 'your email',
      type: 'string',
      max: 30,
      required: true,
      isInput: true,
      isUnique: true
    },
    age: {
      text: 'your age',
      type: 'int',
      required: true,
      isInput: true
    },
    mobile: {
      text: 'your mobile number',
      type: 'string',
      max: 20,
      required: true,
      isInput: true,
      isUnique: true
    },
    balance: {
      text: 'cash remain',
      type: 'float',
      decimals: 2,
      isNull: false,
      default: 0.00
    },
    created: {
      text: 'created at',
      type: 'created'
    },
    modified: {
      text: 'modified at',
      type: 'modified'
    }
  };
  var can;
  var Table;
  var people1 = {
    email: 'tom@hello.com',
    mobile: '18921001800',
    name: 'Tom',
    age: 18
  };
  
  var people2 = {
    email: 'david@hello.com',
    mobile: '18911112222',
    name: 'David',
    age: 22
  };
  
  var people3 = {
    email: 'cici@hello.com',
    mobile: '18933332222',
    name: 'Cici',
    age: 26
  };
  
  var record;
  
  before(function () {
    can = new Jsoncan(PATH);
    Table = can.open(tableName, fields);
  });
  
  after(function (done) {
    can.drop(done);
  });
  
  it('should create all unique fields folds', function () {
    var emailPath = fs.existsSync(Table.conn.getTableUniquePath(tableName, 'email'));
    var mobilePath = fs.existsSync(Table.conn.getTableUniquePath(tableName, 'mobile'));
    var idPath = fs.existsSync(Table.conn.getTableUniquePath(tableName, 'id'));
    
    should.ok(emailPath);
    should.ok(mobilePath);
    should.ok(idPath);
    
  });
  
  it('test insert', function () {
    record = Table.insertSync(people1);
    record.should.have.property('id');
    record.should.have.property('_id');
    record.should.have.property('email', people1.email);
    record.should.have.property('mobile', people1.mobile);
    record.should.have.property('name', people1.name);
    record.should.have.property('balance', 0.00);
    record.should.have.property('created');
    record.should.have.property('modified');
  });
  
  it('link files should be created', function () {
    var emailLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'email', record.email));
    var mobileLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'mobile', record.mobile));
    var idLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'id', record.id));
    
    should.ok(emailLink);
    should.ok(mobileLink);
    should.ok(idLink);
    
  });

  it('test insertAll', function () {
    var records = [people2, people3];
    var list = Table.insertAllSync(records);
    should.ok(list.length == 2);
      
    list[0].should.have.property('id');
    list[0].should.have.property('_id');
    list[0].should.have.property('email', people2.email);
    list[0].should.have.property('mobile', people2.mobile);
    list[0].should.have.property('name', people2.name);
    list[0].should.have.property('created');
    list[0].should.have.property('modified');
    
    list[1].should.have.property('id');
    list[1].should.have.property('_id');
    list[1].should.have.property('email', people3.email);
    list[1].should.have.property('mobile', people3.mobile);
    list[1].should.have.property('name', people3.name);
    list[1].should.have.property('created');
    list[1].should.have.property('modified');
  });
  
  
  it('test query skip,limit', function () {
    var list = Table.query().order('age').skip(2).limit(1).select('name, age').execSync();
    should.equal(list.length, 1);
    should.equal(list[0].name, 'Cici');
  });
  
  it('test insert invalid data, validate shoule work', function () {
    try{
      Table.insertSync({});
    } catch (err) {
      should.exist(err);
      // console.log(err);
      err.should.have.property('code');
      err.should.have.property('invalidMessages');
      err.should.have.property('invalid', true);
      err.invalidMessages.should.have.property('name');
      err.invalidMessages.should.have.property('email');
      err.invalidMessages.should.have.property('mobile');
      err.invalidMessages.should.have.property('age');
    }
  });
  
  it('test insert duplicate', function () {
    try {
      Table.insertSync(people3);
    } catch (err) {
      // console.log(_record);
      should.exist(err);
      // console.log(err);
      err.should.have.property('code');
      err.should.have.property('invalidMessages');
      err.should.have.property('invalid', true);
      err.invalidMessages.should.have.property('email');
      err.invalidMessages.should.have.property('mobile');
      // console.error(err);
      // console.log(err.code);
      // console.log(err.message);
    }
  });
  
  it('test find', function () {
    var data = Table.find(record._id).execSync();
    data.should.have.property('id', record.id);
  });
  
  it('test findById', function () {
    var data = Table.findBy('id', record.id).execSync();
    data.should.have.property('_id', record._id);
  });

  it('test findByEmail', function () {
    var data = Table.findBy('email', record.email).execSync();
    data.should.have.property('_id', record._id);
  });
  
  it('test findByMobile', function () {
    var data = Table.findBy('mobile', record.mobile).execSync();
    data.should.have.property('_id', record._id);
  });
  
  it('test query.execSync', function () {
    var records = Table.query(record).select(['id', 'email', 'name']).execSync();
    should.ok(records.length == 1);
    records[0].should.have.property('id', record.id);
    records[0].should.have.property('email', record.email);
    records[0].should.have.property('name', record.name);
    records[0].should.not.have.property('mobile');
  });
  
  //---read
  it('test read feature, deprecated, using format instead', function () {
    var data = Table.find(record._id).format().execSync();
    data.should.have.property('id', record.id);
  });
  
  it('test readBy feature, deprecated, using format instead', function () {
    var data = Table.findBy('id', record.id).format().execSync();
    data.should.have.property('_id', record._id);
  });
    
  it('test update', function () {
    var email = 'yyy@hello.com';
    var mobile = '1111';
    
    var newRecord = Table.updateSync(record._id, {email: email, mobile: mobile});
    var oldEmailExists = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'email', record.email));
    var oldMobileExists = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'mobile', record.mobile));
    var newEmailExists = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'email', newRecord.email));
    var newMobileExists = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'mobile', newRecord.mobile));

    should.ok( ! oldEmailExists );
    should.ok( ! oldMobileExists);

    should.ok(newEmailExists);
    should.ok(newMobileExists);

    should.ok(newRecord.modified > record.modified);
  });
  
  it('test update duplicate value', function () {
    
    try {
      Table.updateSync(record._id, {mobile: people3.mobile, email: people2.email});
    } catch (err) {
      // console.log(_record);
      should.exist(err);
      // console.log(err);
      err.should.have.property('code');
      err.should.have.property('invalidMessages');
      err.should.have.property('invalid', true);
      err.invalidMessages.should.have.property('email');
      err.invalidMessages.should.have.property('mobile');
      // console.error(err);
      // console.log(err.code);
      // console.log(err.message);
    }
  });
  
  it('test update all', function () {
    Table.updateAllSync({age: ['>', 20]}, {age: 100});
    should.equal(Table.query().where('age', 100).execSync().length, 2);
  });
  
  it('test removeSync', function () {
    Table.removeSync(record._id);

    var primaryIdExists = fs.existsSync(Table.conn.getTableIdFile(tableName, record._id));
    var idExists = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'id', record.id));
    var emailExists = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'email', record.email));
    var mobileExists = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'mobile', record.mobile));
      
    should.ok( ! primaryIdExists );
    should.ok( ! idExists );
    should.ok( ! emailExists );
    should.ok( ! mobileExists );
    
  });
  
  it('after remove, link files should be deleted', function () {
    var emailLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'email', record.email));
    var mobileLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'mobile', record.mobile));
    var idLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'id', record.id));
    
    should.ok(!emailLink);
    should.ok(!mobileLink);
    should.ok(!idLink);
    
  });
  
  it('test remove all', function () {
    Table.removeAllSync({age: ['>', 10]});
    should.ok(Table.query().execSync().length === 0);
  });
  
  it('test find one none exist', function () {
    record = Table.findBy('email', 'nonexist').execSync();
    should.ok(!record);
  });
  
  it('test find all none exist', function () {
    records = Table.query({age: ['>', 10]}).execSync();
    should.ok(records.length === 0);
  });

});