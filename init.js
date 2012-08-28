//  Backbone.js 0.9.2
//  Backbone.js 源码解析 By SunWenchao

(function(){

    // Initial Setup
    // -------------

    // Save a reference to the global object (`window` in the browser, `global`
    // on the server).
    // 全局对象 - root
    var root = this;

    // Save the previous value of the `Backbone` variable, so that it can be
    // restored later on, if `noConflict` is used.
    // 保存在全局对象上的旧 backbone 对象
    var previousBackbone = root.Backbone;

    // Create a local reference to splice.
    // 获取数组的 splice 方法
    var splice = Array.prototype.splice;

    // The top-level namespace. All public Backbone classes and modules will
    // be attached to this. Exported for both CommonJS and the browser.
    var Backbone;
    // 对 CommonJS 的支持
    if (typeof exports !== 'undefined') {
        Backbone = exports;
    } else {
        Backbone = root.Backbone = {};
    }

    // Current version of the library. Keep in sync with `package.json`.
    Backbone.VERSION = '0.9.2';

    // Require Underscore, if we're on the server, and it's not already present.
    // 从全局对象 或 CommonJS的require 获取 underscore 对象
    var _ = root._;
    if (!_ && (typeof require !== 'undefined')) _ = require('underscore');

    // For Backbone's purposes, jQuery, Zepto, or Ender owns the `$` variable.
    // 根据其他库, 获取 $ 对象
    Backbone.$ = root.jQuery || root.Zepto || root.ender;

    // Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
    // to its previous owner. Returns a reference to this Backbone object.
    // 将全局对象的 backbone 设为之前保存的, 并返回填充好的 Backbone 对象
    Backbone.noConflict = function() {
        root.Backbone = previousBackbone;
        return this;
    };

    // Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
    // will fake `"PUT"` and `"DELETE"` requests via the `_method` parameter and
    // set a `X-Http-Method-Override` header.
    // 针对不支持 put 和 delete 请求的旧服务器做兼容
    Backbone.emulateHTTP = false;

    // Turn on `emulateJSON` to support legacy servers that can't deal with direct
    // `application/json` requests ... will encode the body as
    // `application/x-www-form-urlencoded` instead and will send the model in a
    // form param named `model`.
    // 针对不支持 application/json 请求的旧服务器做兼容
    Backbone.emulateJSON = false;

    /**
     *  定义了 events model collection router history view 模块
     */

    // The self-propagating extend function that Backbone classes use.
    // 通用继承自身, 生产子类的方法
    var extend = function(protoProps, classProps) {
        var child = inherits(this, protoProps, classProps);
        child.extend = this.extend;
        return child;
    };

    // Set up inheritance for the model, collection, and view.
    // 将 extend 方法赋给各个模块
    Model.extend = Collection.extend = Router.extend = View.extend = extend;

    /**
     *  定义了 sync helper 模块
     */

}).call(this);
