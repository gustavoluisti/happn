module.exports = function() {

  before(function(done, Index) {
    this.timeout(1000);
    var _this = this;
    Index.service.create({
      mode:'embedded',
      services:{
        auth:{
          path:'./services/auth/service.js',
          config:{
            authTokenSecret:'a256a2fd43bf441483c5177fc85fd9d3',
            systemSecret: 'happn'
          }
        },
        data:{
          path:'./services/data_embedded/service.js',
          config:{}
        },
        pubsub:{
          path:'./services/pubsub/service.js',
          config:{}
        }
      },
    }, 
    function(e, server){
      
      if (e) return done(e);

      mock('server', server);                 // mock
      mock('data', server.services.data);     // mock
      mock('pubsub', server.services.pubsub); // mock

      Index.client.create({
        plugin: Index.client_plugins.intra_process,
        context: server
      })

      .then(function(client) {
        mock('local', client);                // mock intra-process client
        return Index.client.create({});
      })

      .then(function(client) {
        mock('remote', client);               // mock socket client
      })

      .then(done)

      .catch(done);

    });
  });

  after(function(server, done) {
    console.log('STOP');
    server.stop(done);
  });

}
