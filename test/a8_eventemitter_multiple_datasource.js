
var expect = require('expect.js');
var async = require('async');
var fs = require('fs');
var happn = require('../lib/index');

describe('8_eventemitter_stoppingstarting', function() {

  var testport = 8000;
  var test_secret = 'test_secret';
  var mode = "embedded";
  var default_timeout = 10000;
  var happnInstance = null;
  var tempFile = __dirname + '/tmp/testdata_' + require('shortid').generate() + '.db';
  var tempFile1 = __dirname + '/tmp/testdata_' + require('shortid').generate() + '.db';
  var test_id = Date.now() + '_' + require('shortid').generate();

  var persistKey = '/persistence_test/' + require('shortid').generate();
  var services = [];

  var singleClient;
  var multipleClient;

  //console.log('persisted data file', tempFile1);

  var getService = function(config, callback){
   happn.service.create(config,
      callback
    );
  }

  var getClient = function(service, callback){
    happn.client.create({
        plugin: happn.client_plugins.intra_process,
        context: service
      }, function(e, instance) {

        if (e) return callback(e);

       callback(null, instance);

    });
  }

  before('should initialize the services', function(callback) {

    this.timeout(20000);

    var serviceConfigs = [
      {
        port:55001,
        services: {
          auth: {
            path: './services/auth/service.js',
            config: {
              authTokenSecret: 'a256a2fd43bf441483c5177fc85fd9d3',
              systemSecret: test_secret
            }
          },
          data: {
            path: './services/data_embedded/service.js',
            config:{
               filename:tempFile
            }
          },
          pubsub: {
            path: './services/pubsub/service.js',
            config: {}
          }
        },
        utils: {
          log_level: 'info|error|warning',
          log_component: 'prepare'
        }
      },
      {
        services: {
          auth: {
            path: './services/auth/service.js',
            config: {
              authTokenSecret: 'a256a2fd43bf441483c5177fc85fd9d3',
              systemSecret: test_secret
            }
          },
          data: {
            path: './services/data_embedded/service.js',
            config: {
              datastores:[
                {
                  name:'memory',
                  isDefault:true,
                  patterns:[
                    '/a8_eventemitter_multiple_datasource/' + test_id + '/memorytest/*',
                    '/a8_eventemitter_multiple_datasource/' + test_id + '/memorynonwildcard'
                  ]
                },
                {
                  name:'persisted',
                  settings:{
                    filename:tempFile1
                  },
                  patterns:[
                    '/a8_eventemitter_multiple_datasource/' + test_id + '/persistedtest/*',
                    '/a8_eventemitter_multiple_datasource/' + test_id + '/persistednonwildcard'
                  ]
                }
              ]
            }
          },
          pubsub: {
            path: './services/pubsub/service.js',
            config: {}
          }
        },
        utils: {
          log_level: 'info|error|warning',
          log_component: 'prepare'
        }
      }
    ];

  async.each(serviceConfigs,
    function(serviceConfig, serviceConfigCallback){
       getService(serviceConfig, function(e, happnService){

        if (e) return serviceConfigCallback(e);

        services.push(happnService);
        serviceConfigCallback();

      });
    },
    callback);
  });

  before('should initialize the clients', function (callback) {
    this.timeout(default_timeout);

    getClient(services[0], function(e, client){

      if (e) return callback(e);

      singleClient = client;

      getClient(services[1], function(e, client){

        if (e) return callback(e);

        multipleClient = client;

        callback();

      });

    });
  
  });

  after('should delete the temp data files', function(callback) {

    this.timeout(20000);
    
    fs.unlink(tempFile, function(e){
      if (e) return callback(e);
      fs.unlink(tempFile1, function(e){
        if (e) return callback(e);

        async.each(services, function(currentService, eachServiceCB){
           currentService.stop(eachServiceCB);
        }, callback)

      });
    });

  });



  it('should push some data into the single datastore service', function(callback) {

   this.timeout(4000);

    try {
      var test_path_end = require('shortid').generate();
      var test_path = '/a8_eventemitter_multiple_datasource/' + test_id + '/set/' + test_path_end;

      singleClient.set(test_path, {
        property1: 'property1',
        property2: 'property2',
        property3: 'property3'
      }, {}, function (e, result) {

        if (!e) {
          singleClient.get(test_path, null, function (e, results) {
            expect(results.property1 == 'property1').to.be(true);
            callback(e);
          });
        }
        else
          callback(e);
      });

    } catch (e) {
      callback(e);
    }

  });

  it('should push some data into the multiple datastore', function(callback) {

     this.timeout(4000);

    try {
      var test_path_end = require('shortid').generate();
      var test_path = '/a8_eventemitter_multiple_datasource/' + test_id + '/set/' + test_path_end;

      multipleClient.set(test_path, {
        property1: 'property1',
        property2: 'property2',
        property3: 'property3'
      }, {}, function (e, result) {

        if (!e) {
          multipleClient.get(test_path, null, function (e, results) {
            expect(results.property1 == 'property1').to.be(true);
            callback(e);
          });
        }
        else
          callback(e);
      });

    } catch (e) {
      callback(e);
    }

  });

  var findRecordInDataFile = function(path, filepath, callback){

    try{

      //console.log('looking in: '+ filepath);

       var fs = require('fs'), byline = require('byline');
       var stream = byline(fs.createReadStream(filepath, { encoding: 'utf8' }));
       var found = false;

       stream.on('data', function(line) {

        if (found)
          return;

         var record = JSON.parse(line);

         if (record._id == path){
          found = true;
          stream.end();
          return callback(null, record);
         }
          
        });

       stream.on('end', function(){

          if (!found)
            callback(null, null);

       });

    }catch(e){
      callback(e);
    }
  }

  it('should push some data into the multiple datastore, memory datastore, wildcard pattern', function(callback) {

     this.timeout(4000);

    try {
      var test_path_end = require('shortid').generate();
      var test_path = '/a8_eventemitter_multiple_datasource/' + test_id + '/memorytest/' + test_path_end;

      multipleClient.set(test_path, {
        property1: 'property1',
        property2: 'property2',
        property3: 'property3'
      }, {}, function (e, result) {

        if (!e) {
          multipleClient.get(test_path, null, function (e, results) {

            expect(results.property1 == 'property1').to.be(true);

            findRecordInDataFile(test_path, tempFile1, function(e, record){

              if (e) return callback(e);

              if (record)
                callback(new Error('record found in persisted file, meant to be in memory'));
              else
                callback();

            });

          });
        }
        else
          callback(e);
      });

    } catch (e) {
      callback(e);
    }

  });

  it('should push some data into the multiple datastore, persisted datastore, wildcard pattern', function(callback) {

     this.timeout(4000);

    try {
      var test_path_end = require('shortid').generate();
      var test_path = '/a8_eventemitter_multiple_datasource/' + test_id + '/persistedtest/' + test_path_end;

      multipleClient.set(test_path, {
        property1: 'property1',
        property2: 'property2',
        property3: 'property3'
      }, {}, function (e, result) {

        if (!e) {
          multipleClient.get(test_path, null, function (e, results) {

            expect(results.property1 == 'property1').to.be(true);

            findRecordInDataFile(test_path, tempFile1, function(e, record){

              if (e) return callback(e);

              //console.log('rec: ', record);

              if (record)
                callback();
              else
                callback(new Error('record not found in persisted file'));

            });

          });
        }
        else
          callback(e);
      });

    } catch (e) {
      callback(e);
    }

  });

it('should push some data into the multiple datastore, memory datastore, exact pattern', function(callback) {

     this.timeout(4000);

    try {
      var test_path = '/a8_eventemitter_multiple_datasource/' + test_id + '/memorynonwildcard';

      multipleClient.set(test_path, {
        property1: 'property1',
        property2: 'property2',
        property3: 'property3'
      }, {}, function (e, result) {

        if (!e) {
          multipleClient.get(test_path, null, function (e, results) {

            expect(results.property1 == 'property1').to.be(true);

            findRecordInDataFile(test_path, tempFile1, function(e, record){

              if (e) return callback(e);

              if (record)
                callback(new Error('record found in persisted file, meant to be in memory'));
              else
                callback();

            });

          });
        }
        else
          callback(e);
      });

    } catch (e) {
      callback(e);
    }

  });

  it('should push some data into the multiple datastore, persisted datastore, exact pattern', function(callback) {

     this.timeout(4000);

    try {
      var test_path = '/a8_eventemitter_multiple_datasource/' + test_id + '/persistednonwildcard';

      multipleClient.set(test_path, {
        property1: 'property1',
        property2: 'property2',
        property3: 'property3'
      }, {}, function (e, result) {

        if (!e) {
          multipleClient.get(test_path, null, function (e, results) {

            expect(results.property1 == 'property1').to.be(true);

            findRecordInDataFile(test_path, tempFile1, function(e, record){

              if (e) return callback(e);

              //console.log('rec: ', record);

              if (record)
                callback();
              else
                callback(new Error('record not found in persisted file'));

            });

          });
        }
        else
          callback(e);
      });

    } catch (e) {
      callback(e);
    }

  });

  it('should push some data into the multiple datastore, default pattern', function(callback) {

     this.timeout(4000);

    try {
      var test_path = '/a8_eventemitter_multiple_datasource/' + test_id + '/default';

      multipleClient.set(test_path, {
        property1: 'property1',
        property2: 'property2',
        property3: 'property3'
      }, {}, function (e, result) {

        if (!e) {
          multipleClient.get(test_path, null, function (e, results) {

            expect(results.property1 == 'property1').to.be(true);

            findRecordInDataFile(test_path, tempFile1, function(e, record){

              if (e) return callback(e);

              if (record)
                callback(new Error('record found in persisted file, meant to be in memory'));
              else
                callback();

            });

          });
        }
        else
          callback(e);
      });

    } catch (e) {
      callback(e);
    }

  });

  it('should tag some persisted data for the multiple datastore', function (callback) {

    var randomTag = require('shortid').generate();

    var test_path = '/a8_eventemitter_multiple_datasource/' + test_id + '/persistedtest/tag'

    multipleClient.set(test_path, {
      property1: 'property1',
      property2: 'property2',
      property3: 'property3'
    }, {noPublish: true}, function (e, result) {

      ////////////////////console.log('did set');
      ////////////////////console.log([e, result]);

      if (e) return callback(e);

      multipleClient.set(test_path, null, {
        tag: randomTag,
        merge: true,
        noPublish: true
      }, function (e, result) {

        //console.log(e);

        if (e) return callback(e);

        expect(result.data.property1).to.be('property1');
        expect(result.data.property2).to.be('property2');
        expect(result.data.property3).to.be('property3');

        var tagged_path = result._meta.path;

        multipleClient.get(tagged_path, null, function (e, tagged) {

          expect(e).to.be(null);
          
          expect(tagged.data.property1).to.be('property1');
          expect(tagged.data.property2).to.be('property2');
          expect(tagged.data.property3).to.be('property3');
            
          findRecordInDataFile(tagged_path, tempFile1, function(e, record){

            if (e) return callback(e);

            if (record)
              callback();
            else
              callback(new Error('record not found in persisted file'));

          });

        });

      });

    });

  });

});