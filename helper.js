// Helpers
// -------

// Shared empty constructor function to aid in prototype-chain creation.
// 空构造方法
var ctor = function(){};

// Helper function to correctly set up the prototype chain, for subclasses.
// Similar to `goog.inherits`, but uses a hash of prototype properties and
// class properties to be extended.
// 生产子类的方法
var inherits = function(parent, protoProps, staticProps) {
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    // 设置子类 构造方法
    if (protoProps && protoProps.hasOwnProperty('constructor')) {
        child = protoProps.constructor;
    } else {
        child = function(){ parent.apply(this, arguments); };
    }

    // Inherit class (static) properties from parent.
    // 继承类属性
    _.extend(child, parent);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    // 继承 parent 的原型方法 ( 去除 parent 构造方法所产生的影响 )
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    // 扩展上传入的原型属性
    if (protoProps) _.extend(child.prototype, protoProps);

    // Add static properties to the constructor function, if supplied.
    // 扩展上传入类属性
    if (staticProps) _.extend(child, staticProps);

    // Correctly set child's `prototype.constructor`.
    // 设置原型的 constructor 属性
    child.prototype.constructor = child;

    // Set a convenience property in case the parent's prototype is needed later.
    // 设置 __super__ 类属性, 指向父原型
    child.__super__ = parent.prototype;

    return child;
};

// Helper function to get a value from a Backbone object as a property
// or as a function.
// 获取object对象的prop值, 如果prop为方法则返回执行结果
var getValue = function(object, prop) {
    if (!(object && object[prop])) return null;
    return _.isFunction(object[prop]) ? object[prop]() : object[prop];
};

// Throw an error when a URL is needed, and none is supplied.
// 抛出Url错误
var urlError = function() {
    throw new Error('A "url" property or function must be specified');
};