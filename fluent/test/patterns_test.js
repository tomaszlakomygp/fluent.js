'use strict';

import assert from 'assert';

import { MessageContext } from '../src/context';
import { ftl } from './util';

describe('Patterns', function(){
  let ctx, args, errs;

  beforeEach(function() {
    errs = [];
  });

  describe('Simple string value', function(){
    before(function() {
      ctx = new MessageContext('en-US', { useIsolating: false });
      ctx.addMessages(ftl`
        foo = Foo
      `);
    });

    it('returns the value', function(){
      const msg = ctx.messages.get('foo');
      const val = ctx.format(msg, args, errs);
      assert.equal(val, 'Foo');
      assert.equal(errs.length, 0);
    });
  });

  describe('Complex string value', function(){
    before(function() {
      ctx = new MessageContext('en-US', { useIsolating: false });
      ctx.addMessages(ftl`
        foo = Foo
        bar = { foo } Bar
        baz = { missing }
        qux = { malformed
      `);
    });

    it('returns the value', function(){
      const msg = ctx.messages.get('bar');
      const val = ctx.format(msg, args, errs);
      assert.strictEqual(val, 'Foo Bar');
      assert.equal(errs.length, 0);
    });

    it('returns the raw string if the referenced message is ' +
       'not found', function(){
      const msg = ctx.messages.get('baz');
      const val = ctx.format(msg, args, errs);
      assert.strictEqual(val, 'missing');
      assert.ok(errs[0] instanceof ReferenceError); // unknown message
    });
  });

  describe('Complex string referencing a message with null value', function(){
    before(function() {
      ctx = new MessageContext('en-US', { useIsolating: false });
      ctx.addMessages(ftl`
        foo
            .attr = Foo Attr
        bar = { foo } Bar
      `);
    });

    it('returns the null value', function(){
      const msg = ctx.messages.get('foo');
      const val = ctx.format(msg, args, errs);
      assert.strictEqual(val, null);
      assert.equal(errs.length, 0);
    });

    it('formats the attribute', function(){
      const msg = ctx.messages.get('foo');
      const val = ctx.format(msg.attrs.attr, args, errs);
      assert.strictEqual(val, 'Foo Attr');
      assert.equal(errs.length, 0);
    });

    it('formats ??? when the referenced message has no value and no default',
       function(){
      const msg = ctx.messages.get('bar');
      const val = ctx.format(msg, args, errs);
      assert.strictEqual(val, '??? Bar');
      assert.ok(errs[0] instanceof RangeError); // no default
    });
  });

  describe('Cyclic reference', function(){
    before(function() {
      ctx = new MessageContext('en-US', { useIsolating: false });
      ctx.addMessages(ftl`
        foo = { bar }
        bar = { foo }
      `);
    });

    it('returns ???', function(){
      const msg = ctx.messages.get('foo');
      const val = ctx.format(msg, args, errs);
      assert.strictEqual(val, '???');
      assert.ok(errs[0] instanceof RangeError); // cyclic reference
    });
  });

  describe('Cyclic self-reference', function(){
    before(function() {
      ctx = new MessageContext('en-US', { useIsolating: false });
      ctx.addMessages(ftl`
        foo = { foo }
      `);
    });

    it('returns the raw string', function(){
      const msg = ctx.messages.get('foo');
      const val = ctx.format(msg, args, errs);
      assert.strictEqual(val, '???');
      assert.ok(errs[0] instanceof RangeError); // cyclic reference
    });
  });

  describe('Cyclic self-reference in a member', function(){
    before(function() {
      ctx = new MessageContext('en-US', { useIsolating: false });
      ctx.addMessages(ftl`
        foo = { $sel ->
           *[a] { foo }
            [b] Bar
        }
        bar = { foo }
      `);
    });

    it('returns ???', function(){
      const msg = ctx.messages.get('foo');
      const val = ctx.format(msg, {sel: 'a'}, errs);
      assert.strictEqual(val, '???');
      assert.ok(errs[0] instanceof RangeError); // cyclic reference
    });

    it('returns the other member if requested', function(){
      const msg = ctx.messages.get('foo');
      const val = ctx.format(msg, {sel: 'b'}, errs);
      assert.strictEqual(val, 'Bar');
      assert.equal(errs.length, 0);
    });
  });

  describe('Cyclic reference in a selector', function(){
    before(function() {
      ctx = new MessageContext('en-US', { useIsolating: false });
      ctx.addMessages(ftl`
        foo = { ref-foo ->
           *[a] Foo
        }

        ref-foo = { foo }
      `);
    });

    it('returns the default variant', function(){
      const msg = ctx.messages.get('foo');
      const val = ctx.format(msg, args, errs);
      assert.strictEqual(val, 'Foo');
      assert.ok(errs[0] instanceof RangeError); // cyclic reference
    });
  });

  describe('Cyclic self-reference in a selector', function(){
    before(function() {
      ctx = new MessageContext('en-US', { useIsolating: false });
      ctx.addMessages(ftl`
        foo = { foo ->
           *[a] Foo
        }

        bar = { bar.attr ->
           *[a] Bar
        }
            .attr = a
      `);
    });

    it('returns the default variant', function(){
      const msg = ctx.messages.get('foo');
      const val = ctx.format(msg, args, errs);
      assert.strictEqual(val, 'Foo');
      assert.ok(errs[0] instanceof RangeError); // cyclic reference
    });

    it('can reference an attribute', function(){
      const msg = ctx.messages.get('bar');
      const val = ctx.format(msg, args, errs);
      assert.strictEqual(val, 'Bar');
      assert.equal(errs.length, 0);
    });
  });
});
