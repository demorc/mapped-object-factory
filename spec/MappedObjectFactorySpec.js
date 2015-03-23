describe("MappedObjectFactory", function() {
  "use strict";

  var MappedObjectFactory = require('../MappedObjectFactory');
  var factory = null;
  var sampleOrigin = {
        src1: 11,
        src2: 22,
        src3: 33,
        src4: 44
      };

  beforeEach(function() {
    factory = new MappedObjectFactory({
      map: {
        src3: 'dest3',
        src4: 'dest4'
      },
      ignore: ['src1', 'src2'],
      didDecode: function(product, origin) {
        product.dest5 = origin.src1 + origin.src2;
      },
      didEncode: function(product, origin) {
        origin.src5 = product.dest3 + product.dest4;
      }
    });
  });


  it("should decode", function() {
    var p = factory.produce(sampleOrigin);

    // ignore
    expect(p.src1).toBe(undefined);
    expect(p.src2).toBe(undefined);
    // copy
    expect(p.dest3).toBe(33);
    expect(p.dest4).toBe(44);
    // didDecode
    expect(p.dest5).toBe(33);
  });


  it("should encode", function() {
    var p = factory.produce(sampleOrigin);
    var encoded = p.encode();
    var shouldBe = {src1: 11, src2: 22, src3: 33, src4: 44, src5: 77};

    expect(JSON.stringify(encoded)).toBe(JSON.stringify(shouldBe));
  });


  it("should support type conversion", function() {
    MappedObjectFactory.addTypeConverter('int',
      function decode(val) {
        return Math.round(Number(val));
      },
      function encode(val) {
        return '' + val;
      });
    factory = new MappedObjectFactory({
      map: {
        src1: 'dest1:int'
      }
    });

    var p = factory.produce({
      src1: ' 99.51'
    });

    expect(p.dest1).toBe(100);
    expect(p.encode().src1).toBe('100');
  });


  it("should clear the product", function() {
    var p = factory.produce(sampleOrigin).clear();

    expect(p.dest1).toBe(undefined);
    expect(p.dest2).toBe(undefined);
    expect(p.dest3).toBe(undefined);
    expect(p.dest4).toBe(undefined);
  });


  it("should merge product with plain data object", function() {
    var p = factory.produce(sampleOrigin).merge({
      dest1: 'one',
      dest2: 'two',
      dest3: 'three',
      dest4: 'four'
    });

    expect(p.dest1).toBe(undefined);
    expect(p.dest2).toBe(undefined);
    expect(p.dest3).toBe('three');
    expect(p.dest4).toBe('four');
  });


  it("should translate product to plain js object", function() {
    var p = factory.produce(sampleOrigin);
    var plainProductString = JSON.stringify(p.toPlainObject());
    var shouldString = JSON.stringify({
      dest3: 33,
      dest4: 44,
      dest5: 33
    });

    expect(plainProductString).toBe(shouldString);
  });


});