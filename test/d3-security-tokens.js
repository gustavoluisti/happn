describe('d3-security-tokens', function () {

  require('benchmarket').start();
  after(require('benchmarket').store());

  var expect = require('expect.js');
  var happn = require('../lib/index');
  var service = happn.service;
  var happn_client = happn.client;

  var test_secret = 'test_secret';
  var happnInstance = null;

  var uuid = require('node-uuid');

  /*
   This test demonstrates starting up the happn service -
   the authentication service will use authTokenSecret to encrypt web tokens identifying
   the logon session. The utils setting will set the system to log non priority information
   */

  after(function (done) {
    happnInstance.stop(done);
  });

  var serviceConfig = {
    services:{
      security: {
        config: {
          sessionTokenSecret:"absolutely necessary if you want tokens to carry on working after a restart",
          keyPair: {
            privateKey: 'Kd9FQzddR7G6S9nJ/BK8vLF83AzOphW2lqDOQ/LjU4M=',
            publicKey: 'AlHCtJlFthb359xOxR5kiBLJpfoC2ZLPLWYHN3+hdzf2'
          },
          profiles:[ //profiles are in an array, in descending order of priority, so if you fit more than one profile, the top profile is chosen
            {
              name:"web-session",
              map:{
                user:['WEB_SESSION'],
                session_type:0//token stateless
              },
              policy:{
                ttl: 4000,
                inactivity_threshold:2000//this is costly, as we need to store state on the server side
              }
            }, {
              name:"rest-device",
              map:{
                group:['REST_DEVICES'],
                session_type:0//token stateless
              },
              policy: {
                ttl: 2000//stale after 2 seconds
              }
            },{
              name:"trusted-device",
              map:{
                group:['TRUSTED_DEVICES'],
                session_type:1//stateful connected device
              },
              policy: {
                ttl: 2000,//stale after 2 seconds
                permissions:{//permissions that the holder of this token is limited, regardless of the underlying user
                  '/TRUSTED_DEVICES/*':{actions: ['*']}
                }
              }
            },{
              name:"specific-device",
              map:{
                ip_address:['127.0.0.1'],//match by IP address
                session_type:-1//any type of session
              },
              policy: {
                ttl: Infinity,//this device has this access no matter what
                inactivity_threshold:Infinity,
                permissions:{//this device has read-only access to a specific item
                  '/SPECIFIC_DEVICE/*':{actions: ['get','on']}
                }
              }
            }, {
              name:"default-stateful",// this is the default underlying profile for stateful sessions - would exist regardless of whether you defined it or not
              map:{
                session_type:1//stateful
              },
              policy: {
                ttl: Infinity,
                inactivity_threshold:Infinity
              }
            }, {
              name:"default-stateless",// this is the default underlying profile for ws sessions - would exist regardless of whether you defined it or not
              map:{
                session_type:0//token stateless
              },
              policy: {
                session_ttl: 60000,//session goes stale after a minute
                session_inactivity_threshold:Infinity
              }
            }
          ]
        }
      }
    }
  };

  var getService = function (config, callback) {
    happn.service.create(config,
      function(e, instance){
        if (e) return callback(e);
        callback(null, instance);
      }
    );
  };

  var stopService = function (instance, callback) {
      instance.stop({reconnect:false},callback);
  };

  it('should test the loginDigest function of the happn client', function(){

    var happn = require('../lib/index')
    var happn_client = happn.client;

    var clientInstance = happn_client.__instance({
        username:'_ADMIN',
        keyPair:{
          publicKey: 'AlHCtJlFthb359xOxR5kiBLJpfoC2ZLPLWYHN3+hdzf2',
          privateKey:'Kd9FQzddR7G6S9nJ/BK8vLF83AzOphW2lqDOQ/LjU4M='
        }
    });

    clientInstance.performRequest = function(path, action, data, parameters, callback){

      var nonce_requests = {};

      if (action == 'request-nonce'){

        var nonce = uuid.v4();

        var request = {
          nonce:nonce,
          publicKey:data.publicKey
        };

        nonce_requests[nonce] = request;

        request.__timedOut = setTimeout(function(){

          delete nonce_requests[this.nonce];

        }.bind(request), 3000);

      }

      if (action == 'login'){

      }
    };

    clientInstance.loginDigest()

  });

  xit('should create a user with a public key, then login using a signature', function (callback) {

    this.timeout(20000);

    var config =  {
    sessionTokenSecret:"absolutely necessary if you want tokens to carry on working after a restart",
    profiles:[ //profiles are in an array, in descending order of priority, so if you fit more than one profile, the top profile is chosen
      {
        name:"web-session",
        map:{
          user:['WEB_SESSION'],
          session_type:1//token stateless
        },
        policy:{
          session_ttl: Infinity,
          session_inactivity_threshold:2000//this is costly, as we need to store state on the server side
        }
      }
    };

    getService(config, function (e, instance) {

      if (e) return done(e);

      var testGroup = {
        name: 'CONNECTED_DEVICES',
        permissions:{
          '/CONNECTED_DEVICES/*':{actions: ['*']}
        }
      };

      var testUser = {
        username: 'TEST_USER',
        public_key: 'AlHCtJlFthb359xOxR5kiBLJpfoC2ZLPLWYHN3+hdzf2'
      };

      var addedTestGroup;
      var addedTestuser;

      var testClient;

      serviceInstance.services.security.upsertGroup(testGroup, {overwrite: false}, function (e, result) {

        if (e) return done(e);
        addedTestGroup = result;

        serviceInstance.services.security.upsertUser(testUser, {overwrite: false}, function (e, result) {

          if (e) return done(e);
          addedTestuser = result;

          serviceInstance.services.security.linkGroup(addedTestGroup, addedTestuser, function (e) {

            if (e) return done(e);

            happn.client.create({

              username: testUser.username,
              publicKey: 'AlHCtJlFthb359xOxR5kiBLJpfoC2ZLPLWYHN3+hdzf2',
              privateKey:'Kd9FQzddR7G6S9nJ/BK8vLF83AzOphW2lqDOQ/LjU4M='

              })

              .then(function (clientInstance) {
                testClient = clientInstance;




                done();
              })

              .catch(function (e) {
                done(e);
              });

          });
        });
      });

    });

  });

  xit('should create a user without a public key on the server, should fail to log in because the key is not registered with the username on the server', function (callback) {

  });

  xit('should login with a web session based profile - session timeout should happen, based on inactivity', function (callback) {
    this.timeout(20000);
  });

  xit('should login with a connected device profile - session should go stale, token is renewable using key based cryptography', function (callback) {
    this.timeout(20000);
  });

  xit('log in using a stateful ws session - session should only lapse on disconnection', function (callback) {
    this.timeout(20000);
  });

  xit('log in using the default profile - session should only lapse on disconnection', function (callback) {
    this.timeout(20000);
  });


  require('benchmarket').stop();

});
