"use strict";

require('../configureForTest');
var conf = require('nconf');
var expect = require('chai').expect;

//var util = require('util');

var Activity = conf.get('beans').get('activity');


describe('Activity resource management', function () {
  it('adds a member to the default resource', function (done) {
    var activity = new Activity();
    activity.addMemberId('memberID', 'default');
    expect(activity.registeredMembers('default')).to.contain('memberID');
    done();
  });

  it('adds a member to a desired resource', function (done) {
    var activity = new Activity({url: 'myURL', resources: {Einzelzimmer: { _registeredMembers: []}, Doppelzimmer: { _registeredMembers: []}}});
    activity.addMemberId('memberID', 'Einzelzimmer');
    expect(activity.registeredMembers('Einzelzimmer')).to.contain('memberID');
    expect(activity.registeredMembers('Doppelzimmer')).to.be.empty;
    done();
  });

  it('removes a registered member from the default resource (created in compatibility mode)', function (done) {
    var activity = new Activity(
      {url: 'myURL', registeredMembers: ['memberID']}
    );
    activity.removeMemberId('memberID', 'default');
    expect(activity.registeredMembers('default')).to.be.empty;
    done();
  });

  it('removes a registered member from a desired resource', function (done) {
    var activity = new Activity(
      {url: 'myURL', resources: {
        Einzelzimmer: { _registeredMembers: ['memberID']},
        Doppelzimmer: { _registeredMembers: ['memberID']}
      }});

    activity.removeMemberId('memberID', 'Doppelzimmer');
    expect(activity.registeredMembers('Einzelzimmer')).to.contain('memberID');
    expect(activity.registeredMembers('Doppelzimmer')).to.be.empty;
    done();
  });

  it('does not do anything if the desired resource does not exist', function (done) {
    var activity = new Activity(
      {url: 'myURL', resources: {
        default: { _registeredMembers: ['memberID']}
      }});

    activity.addMemberId('memberID', 'Einzelzimmer');
    activity.removeMemberId('memberID', 'Doppelzimmer');
    expect(activity.registeredMembers('default')).to.contain('memberID');
    done();
  });

  it('returns no members if the desired resource does not exist', function (done) {
    var activity = new Activity();

    expect(activity.registeredMembers('Nicht Existente Ressource')).to.be.empty;
    done();
  });

  it('resets for copied activity (original created from compatibility mode)', function (done) {
    var activity = new Activity().fillFromUI({
      id: 'ID',
      title: 'Title',
      startDate: '4.4.2013',
      endDate: '5.4.2013',
      url: 'myURL',
      registeredMembers: ['memberID']
    });
    activity = activity.resetForClone();
    expect(activity.registeredMembers('default')).to.be.empty;
    expect(activity.startDate()).to.equal('04.04.2013');
    expect(activity.endDate()).to.equal('05.04.2013');
    expect(!!activity.id()).to.be.false;
    expect(!!activity.url()).to.be.false;
    done();
  });

  it('does not copy a registered member from an existing activity', function (done) {
    // this constructor behaviour also affects loading of stored activities
    var activity = new Activity({url: 'url'});
    activity.addMemberId('memberID', 'default');
    var copy = new Activity().copyFrom(activity);
    expect(copy.registeredMembers('default')).to.be.empty;
    done();
  });

  it('can add a new member to a copied activity', function (done) {
    var activity = new Activity({url: 'url'});
    activity.addMemberId('memberID', 'default');
    var copy = new Activity().copyFrom(activity);
    copy.addMemberId('memberID', 'default');
    expect(copy.registeredMembers('default')).to.contain('memberID');
    done();
  });

  it('does not add a state property to any of its resources when copying', function (done) {
    var activity = new Activity({url: 'url'});
    activity.addMemberId('memberID', 'default');
    var copy = new Activity().copyFrom(activity);
    expect(copy.state.resources.default.state).to.be.undefined;
    done();
  });

  it('preserves all resources of a copied activity (i.e. the copy accepts registrations for the resources)', function (done) {
    var activity = new Activity({url: 'url', resources: {
      default: { _registeredMembers: []},
      Einzelzimmer: { _registeredMembers: []},
      Doppelzimmer: { _registeredMembers: []}
    }});
    var copy = new Activity().copyFrom(activity);
    copy.addMemberId('memberID', 'default');
    expect(copy.registeredMembers('default')).to.contain('memberID');
    copy.addMemberId('memberID2', 'Einzelzimmer');
    expect(copy.registeredMembers('Einzelzimmer')).to.contain('memberID2');
    copy.addMemberId('memberID3', 'Doppelzimmer');
    expect(copy.registeredMembers('Doppelzimmer')).to.contain('memberID3');
    done();
  });

  it('empties all resources of a copied activity but keeps the original intact', function (done) {
    var activity = new Activity({url: 'url', resources: {
      default: { _registeredMembers: ['memberID']},
      Einzelzimmer: { _registeredMembers: ['memberID']},
      Doppelzimmer: { _registeredMembers: ['memberID']}
    }});
    var copy = new Activity().copyFrom(activity);
    expect(copy.registeredMembers('default')).to.be.empty;
    expect(copy.registeredMembers('Einzelzimmer')).to.be.empty;
    expect(copy.registeredMembers('Doppelzimmer')).to.be.empty;

    expect(activity.registeredMembers('default')).to.contain('memberID');
    expect(activity.registeredMembers('Einzelzimmer')).to.contain('memberID');
    expect(activity.registeredMembers('Doppelzimmer')).to.contain('memberID');

    done();
  });

  it('lists the name of the default resource if no other resources are present', function (done) {
    var activity = new Activity();
    expect(activity.resourceNames().length).to.equal(1);
    expect(activity.resourceNames()).to.contain('default');
    done();
  });

  it('lists the name of all resources except the default resource if more resources are present', function (done) {
    var activity = new Activity({resources: {Einzelzimmer: { _registeredMembers: []}, Doppelzimmer: { _registeredMembers: []}}});
    expect(activity.resourceNames().length).to.equal(2);
    expect(activity.resourceNames()).to.contain('Einzelzimmer');
    expect(activity.resourceNames()).to.contain('Doppelzimmer');
    done();
  });

  it('only lists resources that actually contain something valid', function (done) {
    var activity = new Activity({resources: {Einzelzimmer: null, Doppelzimmer: undefined, Heuboden: ""}});
    expect(activity.resourceNames()).to.be.empty;
    done();
  });

  it('adds a default resource if there is no resources property in the activity', function (done) {
    var activity = new Activity({});
    expect(activity.resourceNames().length).to.equal(1);
    expect(activity.resourceNames()).to.contain('default');
    done();
  });

  it('adds no default resource if there are no resources in the activity resources property', function (done) {
    var activity = new Activity({ resources: {}});
    expect(activity.resourceNames()).to.be.empty;
    done();
  });

});
