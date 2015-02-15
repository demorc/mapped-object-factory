'use strict';

// Factory Product
function MappedObject(factory) {
  this.__factory = factory;
  this.__origin = null;
}

MappedObject.prototype.encode = function() {
  return this.__factory.encode(this);
};

MappedObject.prototype.decode = function(origin) {
  return this.__factory.decode(this, origin);
};

// Factory

function MappedObjectFactory(rawBlueprint) {

  var i, l, prop, val, typedKey, key, type;

  var blueprint = this.blueprint = {
    map: null,
    ignore: null,
    // @todo: console.log all prop map if debug === true
    // debug: rawBlueprint.debug,
    didDecode: rawBlueprint.didDecode,
    didEncode: rawBlueprint.didEncode
  };

  // ignore -> ignoreMap
  var ignoreList = rawBlueprint.ignore || [];
  var ignoreMap = {};
  for (i = 0, l = ignoreList.length; i < l; i++) {
    key = ignoreList[i];
    if (key && key.length) {
      ignoreMap[key] = true;
    }
  }
  blueprint.ignoreMap = ignoreMap;

  // generate maps
  var rawMap = rawBlueprint.map;
  var origin2productMap = {};
  var product2originMap = {};

  // guid: 'id:type' => product.guid = type(origin.id)
  for (prop in rawMap) {
    if (rawMap.hasOwnProperty(prop)) {

      val = rawMap[prop];
      typedKey = this.parseKey(val);
      key = typedKey.key;
      type = typedKey.type;

      origin2productMap[prop] = {
        key: key,
        type: type,
        converter: type && MappedObjectFactory.getDecodeConverter(type)
      };

      product2originMap[key] = {
        key: prop,
        type: type,
        converter: type && MappedObjectFactory.getEncodeConverter(type)
      };
    }
  }
  blueprint.map = {
    o2p: origin2productMap,
    p2o: product2originMap
  };
}

// Type Convertion

MappedObjectFactory.typeConverterMap = {};
MappedObjectFactory.addTypeConverter = function(converterName, decodeConverterFn, encodeConverterFn) {
  MappedObjectFactory.typeConverterMap[converterName] = {
    decodeConverterFn: decodeConverterFn,
    encodeConverterFn: encodeConverterFn
  };
};

MappedObjectFactory.getDecodeConverter = function(type) {
  if (!MappedObjectFactory.typeConverterMap[type]) {
    throw new Error('MappedObjectFactory::Unsupported Type::' + type);
  }
  return MappedObjectFactory.typeConverterMap[type].decodeConverterFn;
};

MappedObjectFactory.getEncodeConverter = function(type) {
  if (!MappedObjectFactory.typeConverterMap[type]) {
    throw new Error('MappedObjectFactory::Unsupported Type::' + type);
  }
  return MappedObjectFactory.typeConverterMap[type].encodeConverterFn;
};

MappedObjectFactory.prototype.parseKey = function(prop) {
  if (prop.indexOf(':') !== -1) {
    var typedProp = prop.split(/[\s:]+/);
    return {
      key: typedProp[0],
      type: typedProp[1]
    };
  }
  return {
    key: prop
  };
};

// Decode / Encode

MappedObjectFactory.prototype.decode = function(product, origin) {
  product.__origin = origin;

  var map = this.blueprint.map.o2p;
  var ignoreMap = this.blueprint.ignoreMap;
  var prop, key, val, converter, typedProp;

  // clear old props
  for (prop in product) {
    if (product.hasOwnProperty(prop)) {
      if (prop !== '__factory' && prop !== '__origin') {
        if (typeof product[prop] !== 'function') {
          delete product[prop];
        }
      }
    }
  }

  // copy props
  for (prop in origin) {
    if (origin.hasOwnProperty(prop)) {

      if (ignoreMap.hasOwnProperty(prop)) {
        continue;
      }
      if (map.hasOwnProperty(prop)) {

        typedProp = map[prop];
        key = typedProp.key;
        converter = typedProp.converter;

        product[key] = converter ? converter(origin[prop]) : origin[prop];
      } else {
        // if not_ignored and not_in_map => just copy
        product[prop] = origin[prop];
      }
    }
  }

  // post action
  if (this.blueprint.didDecode) {
    this.blueprint.didDecode(product, origin);
  }

  return product;
};

MappedObjectFactory.prototype.encode = function(product) {
  var p2oMap = this.blueprint.map.p2o;
  var o2pMap = this.blueprint.map.o2p;
  var ignoreMap = this.blueprint.ignoreMap;
  var origin = product.__origin;
  var expOrigin = {};
  var prop, key, productKey, converter, typedProp;

  for (prop in origin) {
    if (origin.hasOwnProperty(prop)) {
      if (o2pMap.hasOwnProperty(prop)) {

        productKey = o2pMap[prop].key;
        typedProp = p2oMap[productKey];
        key = typedProp.key;
        converter = typedProp.converter;

        // copy from product only if in map
        expOrigin[prop] = converter ? converter(product[productKey]) : product[productKey];
      } else {
        // copy from origin without changes
        expOrigin[prop] = origin[prop];
      }
    }
  }

  // postaction
  if (this.blueprint.didEncode) {
    this.blueprint.didEncode(product, expOrigin);
  }

  return expOrigin;
};

MappedObjectFactory.prototype.produce = function(origin) {
  var product = new MappedObject(this);
  this.decode(product, origin);
  return product;
};

if (module && module.exports) {
  module.exports = MappedObjectFactory;
} else {
  window.MappedObjectFactory = MappedObjectFactory;
}