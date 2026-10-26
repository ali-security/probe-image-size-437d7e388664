'use strict';


const assert          = require('assert');
const parseSvgHeader  = require('../lib/common/svg_header').parse;
const MAX_DATA_LENGTH = require('../lib/common/svg_header').MAX_DATA_LENGTH;


/* eslint-disable max-len */
/* eslint-disable no-undefined */
/* eslint-disable max-nested-callbacks */

describe('svg header parser', function () {
  it('should extract width info from viewbox', function () {
    assert.deepStrictEqual(
      parseSvgHeader('<svg viewbox="0 0 800 600"></svg>'),
      { width: 800, height: 600, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' }
    );
  });

  it('should extract width info from camel cased viewBox', function () {
    assert.deepStrictEqual(
      parseSvgHeader('<svg viewBox="0 0 800 600"></svg>'),
      { width: 800, height: 600, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' }
    );
  });

  it('should return width/height units', function () {
    assert.deepStrictEqual(
      parseSvgHeader('<svg width="5in" height="4pt"></svg>'),
      { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'pt' }
    );
  });

  it('should ignore stroke-width', function () {
    assert.deepStrictEqual(
      parseSvgHeader('<svg stroke-width="2" width="5" height="4"></svg>'),
      { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' }
    );
  });

  it('should not parse HTML as SVG', function () {
    assert.strictEqual(
      parseSvgHeader('<html><body><svg width="5" height="4"></svg></body></html>'),
      undefined
    );
  });

  it('should skip initial comments and directives', function () {
    assert.deepStrictEqual(
      parseSvgHeader('<?xml version="1.0"?><!-- comment --><svg width="5" height="4"></svg>'),
      { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' }
    );
  });

  it('should skip doctype', function () {
    assert.deepStrictEqual(
      parseSvgHeader('<?xml version="1.0"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n<svg width="5" height="4"></svg>'),
      { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' }
    );
  });

  it('should skip doctype with internal subset', function () {
    assert.deepStrictEqual(
      parseSvgHeader('<!DOCTYPE svg [ <!ENTITY a "b"> ]><svg width="5" height="4"></svg>'),
      { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' }
    );
  });

  it('should allow SVG namespace', function () {
    assert.deepStrictEqual(
      parseSvgHeader('<aaa:svg xmlns:aaa="http://www.w3.org/2000/svg" width="5" height="4"></aaa:svg>'),
      { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' }
    );
  });

  describe('coverage', function () {
    it('single quotes (width/height)', function () {
      assert.deepStrictEqual(
        parseSvgHeader("<svg width='5in' height='4pt'></svg>"),
        { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'pt' }
      );
    });

    it('single quotes (viewbox)', function () {
      assert.deepStrictEqual(
        parseSvgHeader("<svg width='1in' viewbox='0 0 100 50'>"),
        { width: 1, height: 0.5, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'in' }
      );
    });

    it('width, no height', function () {
      assert.deepStrictEqual(
        parseSvgHeader('<svg width="1in" viewbox="0 0 100 50">'),
        { width: 1, height: 0.5, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'in' }
      );
    });

    it('height, no width', function () {
      assert.deepStrictEqual(
        parseSvgHeader('<svg height="1in" viewbox="0 0 100 50">'),
        { width: 2, height: 1, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'in' }
      );
    });

    it('width is invalid, no height', function () {
      assert.strictEqual(parseSvgHeader('<svg width="-1" viewbox="0 0 100 50">'), undefined);
    });

    it('height is invalid, no width', function () {
      assert.strictEqual(parseSvgHeader('<svg height="foobar" viewbox="0 0 100 50">'), undefined);
    });

    it('width is invalid (non positive)', function () {
      assert.strictEqual(parseSvgHeader('<svg width="0" height="5">'), undefined);
    });

    it('width is invalid (Infinity)', function () {
      assert.strictEqual(parseSvgHeader('<svg width="Infinity" height="5">'), undefined);
    });

    it('no viewbox, no height', function () {
      assert.strictEqual(parseSvgHeader('<svg width="5">'), undefined);
    });

    it('viewbox units are different', function () {
      assert.strictEqual(parseSvgHeader('<svg width="5" viewbox="0 0 5px 3in">'), undefined);
    });

    it('unclosed tag', function () {
      assert.strictEqual(parseSvgHeader('<svg width="5" height="5"'), undefined);
    });
  });

  // Malformed input must not make the parser rescan data from every position
  //
  describe('ReDoS', function () {
    function assertFastFail(str) {
      let start = Date.now();

      assert.strictEqual(parseSvgHeader(str), undefined);

      let elapsed = Date.now() - start;

      assert.ok(elapsed < 1000, 'svg header parser is too slow: ' + elapsed + 'ms');
    }

    it('many `<` without `>`', function () {
      assertFastFail('<'.repeat(100000));
      assertFastFail('<' + 'a<'.repeat(100000));
      assertFastFail('<svg' + '<a'.repeat(100000));
      assertFastFail('﻿  ' + '<a'.repeat(100000));
    });

    it('unterminated comment', function () {
      assertFastFail('<!--' + '<a'.repeat(100000));
      assertFastFail('<!-- -->'.repeat(10000) + '<!--' + '<a'.repeat(100000));
    });

    it('unterminated processing instruction', function () {
      assertFastFail('<?xml' + '<a'.repeat(100000));
    });

    it('unterminated CDATA', function () {
      assertFastFail('<![CDATA[' + '<a'.repeat(100000));
    });

    it('unterminated doctype', function () {
      assertFastFail('<!DOCTYPE svg' + '<a'.repeat(100000));
      // callers never pass more than MAX_DATA_LENGTH chars
      assertFastFail(('<!DOCTYPE svg [' + ']<a'.repeat(MAX_DATA_LENGTH)).slice(0, MAX_DATA_LENGTH));
    });

    it('unterminated attribute value', function () {
      assertFastFail('<svg width="' + '<a'.repeat(100000));
      assertFastFail("<svg width='" + '<a'.repeat(100000));
    });

    it('many attributes without `>`', function () {
      assertFastFail('<svg' + ' a=b'.repeat(25000));
      assertFastFail('<svg' + ' a'.repeat(50000) + '<');
    });
  });
});
