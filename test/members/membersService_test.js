'use strict';

var expect = require('must');
var sinon = require('sinon').sandbox.create();
var conf = require('../../testutil/configureForTest');
var Member = conf.get('beans').get('member');

var memberstore = conf.get('beans').get('memberstore');
var avatarProvider = conf.get('beans').get('avatarProvider');

var membersService = conf.get('beans').get('membersService');

describe('MembersService', function () {

  beforeEach(function () {
    sinon.stub(memberstore, 'getMember', function (nickname, callback) {
      if (new RegExp(nickname, 'i').test('hada')) {
        return callback(null, new Member());
      }
      callback(null, null);
    });
  });

  afterEach(function () {
    sinon.restore();
  });

  it('regards various nicknames as reserved words, ignoring the case', function () {
    expect(membersService.isReserved('edit')).to.be(true);
    expect(membersService.isReserved('eDit')).to.be(true);
    expect(membersService.isReserved('neW')).to.be(true);
    expect(membersService.isReserved('checknicKName')).to.be(true);
    expect(membersService.isReserved('submIt')).to.be(true);
    expect(membersService.isReserved('administration')).to.be(true);
    expect(membersService.isReserved('.')).to.be(true);
    expect(membersService.isReserved('..')).to.be(true);
  });

  it('accepts untrimmed versions of reserved words', function (done) {
    membersService.isValidNickname(' checknicKName ', function (err, result) {
      expect(result).to.be(true);
      done(err);
    });
  });

  it('rejects nicknames that already exist, ignoring case', function (done) {
    membersService.isValidNickname('haDa', function (err, result) {
      expect(result).to.be(false);
      done(err);
    });
  });

  it('accepts nicknames that do not exist', function (done) {
    membersService.isValidNickname('haha', function (err, result) {
      expect(result).to.be(true);
      done(err);
    });
  });

  it('accepts nicknames that contain other nicknames', function (done) {
    membersService.isValidNickname('Sc' + 'hada' + 'r', function (err, result) {
      expect(result).to.be(true);
      done(err);
    });
  });

  it('accepts untrimmed versions of nicknames that already exist', function (done) {
    membersService.isValidNickname(' hada ', function (err, result) {
      expect(result).to.be(true);
      done(err);
    });
  });

  it('accepts nicknames containing ".." and "."', function () {
    expect(membersService.isReserved('a..')).to.be(false);
    expect(membersService.isReserved('a.')).to.be(false);
    expect(membersService.isReserved('..a')).to.be(false);
    expect(membersService.isReserved('.a')).to.be(false);
  });

  it('tries to load a members avatar via gravatar if it not cached locally', function (done) {
    sinon.stub(avatarProvider, 'imageDataFromGravatar', function (member, callback) {
      callback({image: 'image', hasNoImage: true});
    });

    var member = new Member({email: 'Email'});
    membersService.getImage(member, function () {
      expect(member.inlineAvatar()).to.be('image');
      expect(member.hasNoImage).to.be(true);
      done();
    });
  });

  it('Does not load a members avatar via gravatar if it can be retrieved from cache', function (done) {
    sinon.stub(avatarProvider, 'imageDataFromCache', function (member) {
      return {image: 'image', hasNoImage: false};
    });
    var gravatarCall = sinon.spy(avatarProvider, 'imageDataFromGravatar');

    var member = new Member({email: 'Email'});
    membersService.getImage(member, function () {
      expect(member.inlineAvatar()).to.be('image');
      expect(gravatarCall.called).to.be(false);
      done();
    });
  });

  describe('"toWordList"', function () {
    it('trims simple interest strings', function () {
      var members = [];
      members.push(new Member({interests: 'Heinz, Becker'}));
      var result = membersService.toWordList(members);
      expect(result[0]).to.include('Heinz');
      expect(result[1]).to.include('Becker');
    });

    it('adds tags inside one member', function () {
      var members = [];
      members.push(new Member({interests: 'Heinz, Heinz'}));
      var result = membersService.toWordList(members);
      expect(result).to.have.length(1);
      expect(result[0]).to.eql({text: 'Heinz', weight: 2, link: '/members/interests/Heinz'});
    });

    it('uses the most common writing', function () {
      var members = [];
      members.push(new Member({interests: 'Heinz, heinz, HeInZ, Heinz, Heinz, heinz'}));
      var result = membersService.toWordList(members);
      expect(result).to.have.length(1);
      expect(result[0]).to.eql({text: 'Heinz', weight: 6, link: '/members/interests/Heinz'});
    });

    it('adds tags of two members', function () {
      var members = [];
      members.push(new Member({interests: ' Heinz'}));
      members.push(new Member({interests: 'Heinz  '}));
      var result = membersService.toWordList(members);
      expect(result).to.have.length(1);
      expect(result[0]).to.eql({text: 'Heinz', weight: 2, link: '/members/interests/Heinz'});
    });

    it('handles empty interests tags', function () {
      var members = [];
      members.push(new Member({}));
      members.push(new Member({interests: 'Heinz  '}));
      var result = membersService.toWordList(members);
      expect(result).to.have.length(1);
      expect(result[0]).to.eql({text: 'Heinz', weight: 1, link: '/members/interests/Heinz'});
    });

    it('ignores differences in upper lower case', function () {
      var members = [];
      members.push(new Member({interests: ' heInz'}));
      members.push(new Member({interests: 'Heinz  '}));
      var result = membersService.toWordList(members);
      expect(result).to.have.length(1);
      expect(result[0]).to.eql({text: 'heInz', weight: 2, link: '/members/interests/heInz'});
    });

    it('ignores " and \'', function () {
      var members = [];
      members.push(new Member({interests: ' "H\'ei"nz"'}));
      var result = membersService.toWordList(members);
      expect(result).to.have.length(1);
      expect(result[0]).to.eql({text: 'Heinz', weight: 1, link: '/members/interests/Heinz'});
    });
  });
});

