objective('happn', function() {

  require('./start_stop');

  context('you get what you set', function() {

    context('local (intra_process)', function() {

      it('supports objects', function(done, local) {

        var received = false;

        // Listen on path for object

        local.on('/some/object', function(obj) {

          obj.should.eql( {MY: 'DATA'} );
          
          // _store contains the storage details,
          // it is available but not enumerated in iteration or serialization to
          // 
          obj._store.path.should.equal('/some/object');
          obj._store.id.length;
          obj._store.modified.length;

          // _event contains details of the event,
          // also not enumerable
          //
          obj._event.action.should.equal('/SET@/some/object'); // possibly unnecessary
          obj._event.type.should.equal('data');
          obj._event.id.length;
          obj._event.channel.should.equal('/ALL@/some/object'); // possibly unnecessary

          received = true;

        })
        
        .then(function() {

          // Set the object, listener above receives it

          return local.set('/some/object', {MY: 'DATA'} )
        })

        .then(function() {

          // Fetch the object

          return local.get('/some/object')
        })

        .then(function(obj) {

          // Get what you set.

          obj.should.eql( {MY: 'DATA'} );

          obj._store.path.should.equal('/some/object');
          obj._store.id.length;
          obj._store.modified.length;

          received.should.equal(true);
          done();

        })

        .catch(done);

      });

      it('supports arrays', function(done, local) {

        var received = false;

        local.on('/some/array', function(obj) {

          obj.should.eql( [1,2,3] );
          
          obj._store.path.should.equal('/some/array');
          obj._store.id.length;
          obj._store.modified.length;
          obj._event.action.should.equal('/SET@/some/array');
          obj._event.type.should.equal('data');
          obj._event.id.length;
          obj._event.channel.should.equal('/ALL@/some/array');
          received = true;
        })
        
        .then(function() {
          return local.set('/some/array', [1,2,3] )
        })

        .then(function() {
          return local.get('/some/array')
        })

        .then(function(obj) {

          obj.should.eql( [1,2,3] );

          obj._store.path.should.equal('/some/array');
          obj._store.id.length;
          obj._store.modified.length;
          received.should.equal(true);
          done();
        })

        .catch(done);

      });
  
    });

    context('remote (websocket)', function() {

      it('supports objects', function(done, remote, expect) {

        var received = false;

        remote.on('/some/remote/object', function(obj) {

          expect(obj).to.eql( {MY: 'DATA'} );
          
          obj._store.path.should.equal('/some/remote/object');
          obj._store.id.length;
          obj._store.modified.length;
          obj._event.action.should.equal('/SET@/some/remote/object');
          obj._event.type.should.equal('data');
          obj._event.id.length;
          obj._event.channel.should.equal('/ALL@/some/remote/object');
          received = true;

        })
        
        .then(function() {
          return remote.set('/some/remote/object', {MY: 'DATA'} )
        })

        .then(function() {
          return remote.get('/some/remote/object')
        })

        .then(function(obj) {

          expect(obj).to.eql( {MY: 'DATA'} );

          obj._store.path.should.equal('/some/remote/object');
          obj._store.id.length;
          obj._store.modified.length;
          received.should.equal(true);
          done();
        })

        .catch(done);

      });

      it('supports arrays', function(done, remote, expect) {

        var received = false;

        remote.on('/some/remote/array', function(obj) {

          expect(obj).to.eql( [1,2,3] );
          
          obj._store.path.should.equal('/some/remote/array');
          obj._store.id.length;
          obj._store.modified.length;
          obj._event.action.should.equal('/SET@/some/remote/array');
          obj._event.type.should.equal('data');
          obj._event.id.length;
          obj._event.channel.should.equal('/ALL@/some/remote/array');
          received = true;
        })
        
        .then(function() {
          return remote.set('/some/remote/array', [1,2,3] )
        })

        .then(function() {
          return remote.get('/some/remote/array')
        })

        .then(function(obj) {

          expect(obj).to.eql( [1,2,3] );

          obj._store.path.should.equal('/some/remote/array');
          obj._store.id.length;
          obj._store.modified.length;
          received.should.equal(true);
          done();
        })

        .catch(done);

      });
  
    });

  });

  context('error', function() {

    context('local', function() {

      it('does not hide the _event but does hide _store', function(done, local) {

        local.set('/create/error', {}, {tag: 'TAG'})

        .then(function(r) {
          // done()
        })

        .catch(function(e) {
          Object.keys(e).should.eql(['_event']);
          e._event.status.should.equal('error');
          e._event.error.length;
          done(e);  // not an error?
        })

        .catch(done);

      });

    });

  });


  context('re-setting with _store and _event defined', function() {

    context('local', function() {

    });

    context('remote', function() {

    });

  });

  context('on()', function() {

    context('local', function() {

      it('subscribes to all events on a path', function(done, local) {

        var collect = [];
        var _stores = [];
        var _events = [];

        local.on('/pending/set/one', function(data) {

          // intra-process has SAME object in client and server,
          // -- Need to deep copy this before the set callback
          //    assembles it's result object on it.
          collect.push(JSON.parse(JSON.stringify(data)));
          _stores.push(JSON.parse(JSON.stringify(data._store))); // non enumerable
          _events.push(JSON.parse(JSON.stringify(data._event)));
        })

        .then(function() {
          return local.set('/pending/set/one', {key: 'value1'})
        })

        .then(function() {
          return local.set('/pending/set/one', {key: 'value2', key2: 'merge?'}, {merge: true})
        })

        .then(function() {
          return local.remove('/pending/set/one')
        })

        .then(function() {


          collect[0].key.should.equal('value1');
          collect[1].key.should.equal('value2');
          collect[1].key2.should.equal('merge?');
          collect[2].removed.should.equal(1);

          done();

        })

        .catch(done);

      })

      it('subscribes to only set events on a path', function(done, local) {

        var collect = [];

        local.on('/pending/set/two', {event_type: 'set'}, function(data) {
          collect.push(JSON.parse(JSON.stringify(data)));
        })

        .then(function() {
          return local.set('/pending/set/two', {key: 'value1'})
        })

        .then(function() {
          return local.set('/pending/set/two', {key: 'value2'})
        })

        .then(function() {
          return local.remove('/pending/set/two')
        })

        .then(function() {

          // console.log(collect);

          collect[0].key.should.equal('value1');
          collect[1].key.should.equal('value2');
          collect.length.should.equal(2);

          done();

        })

        .catch(done);

      })

      it('subscribes to only remove events on a path', function(done, local) {

        var collect = [];

        local.on('/pending/set/three', {event_type: 'remove'}, function(data) {
          collect.push(JSON.parse(JSON.stringify(data)));
        })

        .then(function() {
          return local.set('/pending/set/three', {key: 'value1'})
        })

        .then(function() {
          return local.set('/pending/set/three', {key: 'value2'})
        })

        .then(function() {
          return local.remove('/pending/set/three')
        })

        .then(function() {

          // console.log(collect);

          collect[0].removed.should.equal(1);
          collect.length.should.equal(1);
          done();

        })

        .catch(done);

      });
  
      it('has a usefull callback', function(done, local) {

        local.on('/one/two/three', function() {})
        .then(function(r) {
           // r is the handlerId, can be used to remove listener
           done();
        })
        .catch(done);

      });
      
    
    });

    context('remote', function() {


      it('subscribes to all events on a path', function(done, remote) {

        var collect = [];

        remote.on('/pending/set/four', function(data) {

          // intra-process has sme object on client and server
          // need to deep copy this before the set callback
          // assembles it's result object on it. 
          collect.push(JSON.parse(JSON.stringify(data)));
        })

        .then(function() {
          return remote.set('/pending/set/four', {key: 'value1'})
        })

        .then(function() {
          return remote.set('/pending/set/four', {key: 'value2', key2: 'merge?'}, {merge: true})
        })

        .then(function() {
          return remote.remove('/pending/set/four')
        })

        .then(function() {

          collect[0].key.should.equal('value1');

          collect[1].key.should.equal('value2');
          collect[1].key2.should.equal('merge?');

          collect[2].removed.should.equal(1);
          done();

        })

        .catch(done);

      })

      it('subscribes to only set events on a path', function(done, remote) {

        var collect = [];

        remote.on('/pending/set/five', {event_type: 'set'}, function(data) {
          collect.push(JSON.parse(JSON.stringify(data)));
        })

        .then(function() {
          return remote.set('/pending/set/five', {key: 'value1'})
        })

        .then(function() {
          return remote.set('/pending/set/five', {key: 'value2'})
        })

        .then(function() {
          return remote.remove('/pending/set/five')
        })

        .then(function() {

          collect[0].key.should.equal('value1');
          collect[1].key.should.equal('value2');
          collect.length.should.equal(2);
          done();

        })

        .catch(done);

      })

      it('subscribes to only remove events on a path', function(done, remote) {

        var collect = [];

        remote.on('/pending/set/six', {event_type: 'remove'}, function(data) {
          collect.push(JSON.parse(JSON.stringify(data)));
        })

        .then(function() {
          return remote.set('/pending/set/six', {key: 'value1'})
        })

        .then(function() {
          return remote.set('/pending/set/six', {key: 'value2'})
        })

        .then(function() {
          return remote.remove('/pending/set/six')
        })

        .then(function() {

          collect[0].removed.should.equal(1);
          collect.length.should.equal(1);
          done();

        })

        .catch(done);

      })


    });

  });

  context('onAll() and offAll()', function() {

    context('local', function() {

      it('listens to all and then none from local', function(done, local, Promise) {

        var collect = [];

        local.onAll(function(data) {
          collect.push(JSON.parse(JSON.stringify(data)))
        })

        .then(function() {
          return Promise.all([
            local.set('/a', {}),
            local.set('/a/c/d/c', {}),
            local.set('/c/a', {}),
            local.set('/b', {}),
            local.set('/a/b', {}),
          ]);
        })

        .then(function() {
          collect.length.should.equal(5);
          collect.length = 0; // flush
        })

        .then(function() {
          return local.offAll()
        })

        .then(function() {
          collect.length.should.equal(0);
          done();
        })

        .catch(done);

      });

    });

    context('remote', function() {

      it('listens to all and then none from remote', function(done, remote, Promise) {

        var collect = [];

        remote.onAll(function(data) {
          collect.push(JSON.parse(JSON.stringify(data)))
        })

        .then(function() {
          return Promise.all([
            remote.set('/a', {}),
            remote.set('/a/c/d/c', {}),
            remote.set('/c/a', {}),
            remote.set('/b', {}),
            remote.set('/a/b', {}),
          ]);
        })

        .then(function() {
          collect.length.should.equal(5);
          collect.length = 0; // flush
        })

        .then(function() {
          return remote.offAll()
        })

        .then(function() {
          collect.length.should.equal(0);
          done();
        })

        .catch(done);

      });

    });

  });

  context('off()', function() {

    context('local', function() {

      it('removes all subscriptions from a path from local', function(done, local) {

        var collect = [];

        local.on('/temp1/sub/one', function(data) {
          collect.push(JSON.parse(JSON.stringify(data)));
        })

        .then(function(r) {
          // subscribe a second time
          return local.on('/temp1/sub/one', function(data) {
            collect.push(JSON.parse(JSON.stringify(data)));
          })
        })

        .then(function() {
          return local.set('/temp1/sub/one', {key: 1})
        })

        .then(function() {
          collect.length.should.equal(2);
          // unsubscribe
          return local.off('/temp1/sub/one') // unsub
        })

        .then(function(r) {
          // console.log('off result', r);
          return local.set('/temp1/sub/one', {key: 1});
        })

        .then(function() {
          collect.length.should.equal(2);
          done();
        })

        .catch(done);

      });

      it('removes a specific subscription from local', function(local, done) {

        var collect = [];
        var id1, id2;

        local.on('/temp2/sub/one', function(data) {
          collect.push(JSON.parse(JSON.stringify(data)));
        })

        .then(function(id) {
          id1 = id;
          return local.on('/temp2/sub/one', function(data) {
            collect.push(JSON.parse(JSON.stringify(data)));
          })
        })

        .then(function(id) {
          id2 = id;
          return local.set('/temp2/sub/one', {key: 1})
        })

        .then(function() {
          collect.length.should.equal(2);
          // unsubscribe
          return local.off(id1) // unsub
        })

        .then(function(r) {
          // console.log('off result', r);
          return local.set('/temp2/sub/one', {key: 1});
        })

        .then(function() {
          collect.length.should.equal(3);
          done();
        })

        .catch(done);

      });

      xit('has a usefull callback')


    });

    context('remote', function() {

      it('removes all subscriptions from a path from remote', function(done, remote) {

        var collect = [];

        remote.on('/temp1/sub/one', function(data) {
          collect.push(JSON.parse(JSON.stringify(data)));
        })

        .then(function(r) {
          return remote.on('/temp1/sub/one', function(data) {
            collect.push(JSON.parse(JSON.stringify(data)));
          })
        })

        .then(function() {
          return remote.set('/temp1/sub/one', {key: 1})
        })

        .then(function() {
          collect.length.should.equal(2);
          return remote.off('/temp1/sub/one') // unsub
        })

        .then(function() {
          return remote.set('/temp1/sub/one', {key: 1});
        })

        .then(function() {
          collect.length.should.equal(2);
          done();
        })

        .catch(done);

      });

      it('removes a specific subscription from remote', function(remote, done) {

        var collect = [];
        var id1, id2;

        remote.on('/temp2/sub/one', function(data) {
          collect.push(JSON.parse(JSON.stringify(data)));
        })

        .then(function(id) {
          id1 = id;
          return remote.on('/temp2/sub/one', function(data) {
            collect.push(JSON.parse(JSON.stringify(data)));
          })
        })

        .then(function(id) {
          id2 = id;
          return remote.set('/temp2/sub/one', {key: 1})
        })

        .then(function() {
          collect.length.should.equal(2);
          return remote.off(id1) // unsub
        })

        .then(function(r) {
          return remote.set('/temp2/sub/one', {key: 1});
        })

        .then(function() {
          collect.length.should.equal(3);
          done();
        })

        .catch(done);

      });

      xit('has a usefull callback')


    });

  });

  context('set()', function() {

    context('remote', function() {

      it('sets remote object data', function(done, remote) {

        var data = {a:1, b:2};

        remote.set('/the/remote/garden/path', data, {}, function(e, r) {
          if (e) return done(e);

          r._store.path.should.equal('/the/remote/garden/path');
          r._store.id.length;
          r._store.modified.length;

          r._event.type.length;
          r._event.status.length;
          r._event.published.length;
          r._event.id.length;

          r.a.should.equal(1);
          r.b.should.equal(2);
          done();
        });
      });

      it('sets remote array data', function(done, remote, Should) {

        var myData = [{a:1, b:1}, {c:1, d:1}];

        trace.filter = true;

        remote.set('/my/array', myData)

        .then(function(r) {

          r[0].a.should.eql(1);
          r[0].b.should.eql(1);
          r[1].c.should.eql(1);
          r[1].d.should.eql(1);

          Should.not.exist(r[0]._store);
          Should.not.exist(r[1]._store);

          r._store.modified.length;
          r._store.id.length;
          r._store.path.length;

          r._event.type.length;
          r._event.status.length;
          r._event.published.length;
          r._event.id.length;
          done();

        })

        .catch(done);
      });

      it('flushes the _store from the inbound re set', function() {

        console.log('TODO');

      });

      xit('has a created date, second save preserves created date');

    });
    

    context('local', function() {

      it('sets local object data', function(done, local) {

        var data = {a:1, b:2};

        local.set('/the/local/garden/path', data, {}, function(e, r) {
          if (e) return done(e);

          r._store.path.should.equal('/the/local/garden/path');
          r._store.id.length;
          r._store.modified.length;

          r._event.type.length;
          r._event.status.length;
          r._event.published.length;
          r._event.id.length;

          r.a.should.equal(1);
          r.b.should.equal(2);
          done();
        });
      });

      it('sets local array data', function(done, local) {

        var myData = [{a:1, b:1}, {c:1, d:1}];

        local.set('/my/array', myData)

        .then(function(r) {

          r[0].should.eql({a:1, b:1});
          r[1].should.eql({c:1, d:1});

          r._store.modified.length;
          r._store.id.length;
          r._store.path.length;

          r._event.type.length;
          r._event.status.length;
          r._event.published.length;
          r._event.id.length;
          done();

        })

        .catch(done);
      });

      it('flushes the _store from the inbound re set', function(done) {

        console.log('TODO');
        done();

      });

      xit('has a created date, second save preserves created date');

    });


  });

  context('get()', function() {

    before(function(done, local) {

      local.set('/up/for/grabs/obj', {key: 'value'})

      .then(function() {
        return local.set('/up/for/grabs/array', [{key1: 'value1'}, {key2: 'value2'}]);
      })

      .then(done).catch(done);

    });

    context('remote', function() {

      it('gets remote object data', function(done, remote, pubsub) {

        trace.filter = true;

        remote.get('/up/for/grabs/obj')

        .then(function(r) {
          r.key.should.equal('value');
          r._store.id.length // fails if no id
          done();
        })

        .catch(done);

      });

      xit('handles empty result array as not error');


      it('gets remote array data', function(done, remote) {

        trace.filter = true;

        remote.get('/up/for/grabs/array')

        .then(function(r) {

          r[0].key1.should.eql('value1');
          r[1].key2.should.eql('value2');

          r._store.id.length;
          r._store.path.length;
          r._store.modified.length;
          r._event.type.length;
          r._event.status.length;
          r._event.published.length;
          r._event.id.length;
          done();
        })

        .catch(done);
      });

      it('can get remote with *', function(done, remote) {

        remote.set('/at/path/one', {xxx: 'one'})

        .then(function() {

          return remote.set('/at/path/two', {xxx: 'two'})

        })

        .then(function() {

          return remote.get('/at/path/*')

          .then(function(r) {

            r._event.type.length;

            r[0].xxx.length
            r[1].xxx.length;

            r[0]._store.id.length
            r[0]._store.path.length
            // r[0]._store.created.length
            r[0]._store.modified.length

            r[1]._store.id.length
            r[1]._store.path.length
            // r[1]._store.created.length
            r[1]._store.modified.length

            done()
          });

        })

        .catch(done);

      });

      xit('keeps the created date', function(done, remote) {

        var created;

        remote.set('/keeps/created', {data: 'DATA'})

        .then(function(r) {
          created = r._store.created;
          return remote.set('/keeps/created',r)  /// as existing?
          return remote.set('/keeps/created', {data: 'DATA'})  /// as new?
        })

        .then(function(r) {

          console.log('CREATED', created);
          console.log('CREATED', r._store.created);

        })

        .catch(done);

      });

    });

    context('local', function() {

      it('gets local object data', function(done, local) {

        local.get('/up/for/grabs/obj')

        .then(function(r) {

          r.key.should.equal('value');
          r._store.id.length // fails if no id
          r._store.path.length
          r._store.modified.length
          done();
        })

        .catch(done);
      });

      it('gets local array data', function(done, local) {

        trace.filter = true;

        local.get('/up/for/grabs/array')

        .then(function(r) {

          r[0].should.eql({key1: 'value1'});
          r[1].should.eql({key2: 'value2'});

          r._store.id.length;
          r._store.path.length;
          r._store.modified.length;
          r._event.type.length;
          r._event.status.length;
          r._event.published.length;
          r._event.id.length;
          done();
        })

        .catch(done);
      });

      xit('handles empty result array as not error');

      it('can get local with *', function(done, local) {

        local.set('/at/path/one', {xxx: 'one'})

        .then(function() {

          return local.set('/at/path/two', {xxx: 'two'})

        })

        .then(function() {

          return local.get('/at/path/*')

          .then(function(r) {

            r._event.type.length;

            r[0].xxx.length
            r[1].xxx.length;

            r[0]._store.id.length
            r[0]._store.path.length
            // r[0]._store.created.length
            r[0]._store.modified.length

            r[1]._store.id.length
            r[1]._store.path.length
            // r[1]._store.created.length
            r[1]._store.modified.length

            done()
          });

        })

        .catch(done);

      });

    });

  });

  context('getPaths()', function() {

    context('local', function() {

      it('gets path with wildcards', function(done, local, Promise) {

        Promise.all([
          local.set('/wildcard/path/one',   {data: 1}),
          local.set('/wildcard/path/two',   {data: 2}),
          local.set('/wildcard/path/three', {data: 3}),
          local.set('/wildcard/path/four',  {data: 4}),
          local.set('/wildcard/path/five',  {data: 5})
        ])

        .then(function() {

          // return local.getPaths('/wildcar*');
          return local.getPaths('/wildcard/*');

        })

        .then(function(r) {

          r.map(function(item) {
            return item.path;
          }).sort(function(a, b) {
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
          }).should.eql([
            '/wildcard/path/five',
            '/wildcard/path/four', 
            '/wildcard/path/one',   
            '/wildcard/path/three', 
            '/wildcard/path/two',   
          ]);

          done();

        })

        .catch(done);
      });

    });

    context('remote', function() {

      it('gets path with wildcards', function(done, remote, Promise, expect) {

        trace.filter = true;

        Promise.all([
          remote.set('/mildcard/path/one',   {data: 1}),
          remote.set('/mildcard/path/two',   {data: 2}),
          remote.set('/mildcard/path/three', {data: 3}),
          remote.set('/mildcard/path/four',  {data: 4}),
          remote.set('/mildcard/path/five',  {data: 5})
        ])

        .then(function() {

          // return local.getPaths('/wildcar*');
          return remote.getPaths('/mildcard/*');

        })

        .then(function(r) {

          // require('should'); //!!!!!  WTF

          var sort = r.map(function(item) {
            return item.path;
          }).sort(function(a, b) {
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
          });

          // console.log('xxx' , sort.should);

          // should is (semi) broken in callback /?or?/ promise from websocket

          expect(sort).to.eql([
            '/mildcard/path/five',
            '/mildcard/path/four', 
            '/mildcard/path/one',   
            '/mildcard/path/three', 
            '/mildcard/path/two',   
          ]);

          done();

        })

        .catch(done);

      });

    });

  });

  context('setSibling()', function() {

    context('local', function() {

      it('it creates a sibling from local', function(done, local) {

        local.setSibling('/for/sibling', {the: 'SIBLING'})

        .then(function(r) {
          r.the.should.equal('SIBLING');
          r._store.modified.length;
          r._store.path.length;
          r._store.id.length;
          r._event.type.length;
          r._event.status.length;
          r._event.published.length;
          r._event.id.length;
          r._store.path.split('/').length.should.equal(4);
          done();
        })

        .catch(done);

      });

    });


    context('remote', function() {

      it('it creates a sibling from remote', function(done, remote) {

        remote.setSibling('/for/sibling', {the: 'SIBLING'})

        .then(function(r) {
          r.the.should.equal('SIBLING');
          r._store.modified.length;
          r._store.path.length;
          r._store.id.length;
          r._event.type.length;
          r._event.status.length;
          r._event.published.length;
          r._event.id.length;
          r._store.path.split('/').length.should.equal(4);
          done();
        })

        .catch(done);

      });

    });

  });

  context('remove()', function() {

    context('local', function() {

      it('removes one from local', function(done, local) {

        trace.filter = true;

        local.set('/pending/remove', {data: 'DATA'})

        .then(function() {
          return local.get('/pending/remove')
        })

        .then(function(got) {
          return local.remove('/pending/remove')
        })

        .then(function(r) {
          r.removed.should.equal(1);
          done();
        })

        .catch(done);

      });

      it('removes many from local', function(done, local, Promise) {

        trace.filter = true;

        Promise.all([
          local.set('/pending/multiple/remove/a', {data: 'DATA'}),
          local.set('/pending/multiple/remove/b', {data: 'DATA'}),
          local.set('/pending/multiple/remove/c', {data: 'DATA'}),
          local.set('/pending/multiple/remove/d', {data: 'DATA'}),
        ])

        .then(function() {
          return local.remove('/pending/multiple/remove/*')
        })

        .then(function(r) {
          r.removed.should.equal(4);
          done();
        })

        .catch(done);

      });

    });

    context('remote', function() {

      it('removes one from remote', function(done, remote) {

        trace.filter = true;

        remote.set('/pending2/remove', {data: 'DATA'})

        .then(function() {
          return remote.get('/pending2/remove')
        })

        .then(function(got) {
          return remote.remove('/pending2/remove')
        })

        .then(function(r) {
          r.removed.should.equal(1);
          done();
        })

        .catch(done);

      });

      it('removes many from local', function(done, remote, Promise) {

        trace.filter = true;

        Promise.all([
          remote.set('/pending2/multiple/remove/a', {data: 'DATA'}),
          remote.set('/pending2/multiple/remove/b', {data: 'DATA'}),
          remote.set('/pending2/multiple/remove/c', {data: 'DATA'}),
          remote.set('/pending2/multiple/remove/d', {data: 'DATA'}),
        ])

        .then(function() {
          return remote.remove('/pending2/multiple/remove/*')
        })

        .then(function(r) {
          r.removed.should.equal(4);
          done();
        })

        .catch(done);

      });

    });

  });


  context('tagging()', function() {

    context('local',  function() {

      it('can create a new tag on existing record with no new data', function(done, local, expect) {

        local.set('/patha/item/1', {key: 'value'})

        .then(function(r) {
          return local.set('/patha/item/1', null, {tag: 'tagname'});
        })

        .then(function(r) {

          expect(r.snapshot.data).to.eql({key: 'value'});
          done();
        })

        .catch(function(e) {
          console.log(e);
          done(e);
        });

      });

      xit('can create a new tag on existing record with new data', {
        question: 'should the new data appear in the existing record and in the tag?'
      });

      xit('can do "things?" with tags');

      xit('publishes the snapshot?');

    });

    context('remote',  function() {

      it('can create a new tag on existing record with no new data', function(done, remote, expect) {

        remote.set('/pathb/item/1', {key: 'value'})

        .then(function(r) {
          return remote.set('/pathb/item/1', null, {tag: 'tagname'});
        })

        .then(function(r) {
          expect(r.snapshot.data).to.eql({key: 'value'});
          done();
        })

        .catch(done);

      });

      xit('can create a new tag on existing record with new data');

      xit('can do "things?" with tags');

      xit('publishes the snapshot?');

    });

  });

  context('merging', function() {

    context('local', function() {

      xit('merges at path', function(done, local) {

        local.set('/for/local/merge', {key1: 1, key2: 2})

        .then(function() {
          return local.set('/for/local/merge', {key1: 'one', key3: 3}, {merge: true})
        })

        .then(function(r) {

          r.key1.should.equal('one');
          r.key2.should.equal(2);
          r.key3.should.equal(3);

          r._event.type.length;
          r._event.status.length;
          r._event.published.length;
          r._event.id.length;

          r._store.modified.length;
          r._store.path.length;
          r._store.id.length;

          done();

        })

        .catch(done);

      });

    });

    context('remote', function() {

      xit('merges at path', function(done, remote) {

        remote.set('/for/remote/merge', {key1: 1, key2: 2})

        .then(function() {
          return remote.set('/for/remote/merge', {key1: 'one', key3: 3}, {merge: true})
        })

        .then(function(r) {

          r.key1.should.equal('one');
          r.key2.should.equal(2);
          r.key3.should.equal(3);

          r._event.type.length;
          r._event.status.length;
          r._event.published.length;
          r._event.id.length;

          r._store.modified.length;
          r._store.path.length;
          r._store.id.length;

          done();

        })

        .catch(done);

      });

    });

  });

});
