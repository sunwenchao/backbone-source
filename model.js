// Backbone.Model
// --------------

// Create a new model, with defined attributes. A client id (`cid`)
// is automatically generated and assigned for you.
// Model 模块
var Model = Backbone.Model = function(attributes, options) {

    var defaults; // 默认值变量

    attributes || (attributes = {}); // 无参兼容

    // 通过 options 指定 collection
    if (options && options.collection) this.collection = options.collection;

    // 指定去 parse 属性
    if (options && options.parse) attributes = this.parse(attributes);

    // 根据 defaults 扩展属性
    if (defaults = getValue(this, 'defaults')) {
        attributes = _.extend({}, defaults, attributes);
    }

    this.attributes = {}; // 数据存放对象

    this._escapedAttributes = {}; // escaped 数据

    this.cid = _.uniqueId('c'); // 生成客户端唯一 id

    this.changed = {}; // todo
    this._silent = {};
    this._pending = {};

    this.set(attributes, {silent: true}); // 设置属性 不发事件

    // Reset change tracking.
    this.changed = {};
    this._silent = {};
    this._pending = {};

    this._previousAttributes = _.clone(this.attributes); // copy 当前数据为 _previousAttributes

    this.initialize.apply(this, arguments); // 执行 initialize
};

// Attach all inheritable methods to the Model prototype.
_.extend(Model.prototype, Events, {

    // A hash of attributes whose current and previous value differ.
    changed: null,

    // A hash of attributes that have silently changed since the last time
    // `change` was called.  Will become pending attributes on the next call.
    //
    _silent: null,

    // A hash of attributes that have changed since the last `'change'` event
    // began.
    _pending: null,

    // The default name for the JSON `id` attribute is `"id"`. MongoDB and
    // CouchDB users may want to set this to `"_id"`.
    idAttribute: 'id',

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    // 默认为空的初始化方法
    initialize: function(){},

    // Return a copy of the model's `attributes` object.
    // 返回 attributes 属性
    toJSON: function(options) {
        return _.clone(this.attributes);
    },

    // Proxy `Backbone.sync` by default.
    // 代理给 Backbone.sync 处理
    sync: function() {
        return Backbone.sync.apply(this, arguments);
    },

    // Get the value of an attribute.
    // 返回 attributes 里对应值
    get: function(attr) {
        return this.attributes[attr];
    },

    // Get the HTML-escaped value of an attribute.
    // 返回 escaped attributes 里对应值
    escape: function(attr) {
        var html;
        // 如果已经有了直接取
        if (html = this._escapedAttributes[attr]) return html;

        var val = this.get(attr);
        // 返回 escaped attributes 并设置 _escapedAttributes 结果为 string
        return this._escapedAttributes[attr] = _.escape(val == null ? '' : '' + val);
    },

    // Returns `true` if the attribute contains a value that is not null
    // or undefined.
    // 判断是否有这个属性
    has: function(attr) {
        return this.get(attr) != null;
    },

    // Set a hash of model attributes on the object, firing `"change"` unless
    // you choose to silence it.
    // 设置属性的方法
    set: function(key, value, options) {
        var attrs, attr, val;

        // Handle both `"key", value` and `{key: value}` -style arguments.
            // 如果第一个参数是对象 那么第二个参数就是options
        if (_.isObject(key) || key == null) {
            attrs = key;
            options = value;
            // 如果第一个参数是key 那么封装attrs
        } else {
            attrs = {};
            attrs[key] = value;
        }

        // Extract attributes and options.
        options || (options = {});
        if (!attrs) return this;

        // 如果传入的是model对象 则取出 attributes
        if (attrs instanceof Model) attrs = attrs.attributes;

        // unset 清空attrs内的value
        if (options.unset) for (attr in attrs) attrs[attr] = void 0;

        // Run validation.
        // 验证失败 return false
        if (!this._validate(attrs, options)) return false;

        // Check for changes of `id`.
        // 通过 idAttribute 设置id
        if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

        var changes = options.changes = {}; // options.changes
        var now = this.attributes; // 当前的 attributes
        var escaped = this._escapedAttributes; // 当前转义过的对象
        var prev = this._previousAttributes || {}; // 之前数据

        // For each `set` attribute...
        // 遍历需要设置的数据
        for (attr in attrs) {

            val = attrs[attr]; // value

            // If the new and current value differ, record the change.
            // 设置 值不同 || 非设置 有属性
            if (!_.isEqual(now[attr], val) || (options.unset && _.has(now, attr))) {

                delete escaped[attr]; // 删除 _escapedAttributes 中的 attr

                // silent - _silent[attr] = true
                // !silent - changes[attr] = true
                (options.silent ? this._silent : changes)[attr] = true;
            }

            // Update or delete the current value.
            // set - now[attr] = val
            // unset - delete now[attr]
            options.unset ? delete now[attr] : now[attr] = val;

            // If the new and previous value differ, record the change.  If not,
            // then remove changes for this attribute.
            // 值不同 || 存在不同
            if (!_.isEqual(prev[attr], val) || (_.has(now, attr) != _.has(prev, attr))) {

                this.changed[attr] = val; // 标记变更 changed

                if (!options.silent) this._pending[attr] = true; // 记录_pending
            } else {

                delete this.changed[attr]; // 删除 changed
                delete this._pending[attr]; // 删除 _pending
            }
        }

        // Fire the `"change"` events.
        // 执行 change
        if (!options.silent) this.change(options);

        return this;
    },

    // Remove an attribute from the model, firing `"change"` unless you choose
    // to silence it. `unset` is a noop if the attribute doesn't exist.
    // 执行 options 中 unset: true 的 set
    unset: function(attr, options) {
        options = _.extend({}, options, {unset: true});
        return this.set(attr, null, options);
    },

    // Clear all attributes on the model, firing `"change"` unless you choose
    // to silence it.
    // 全部属性 unset
    clear: function(options) {
        options = _.extend({}, options, {unset: true});
        return this.set(_.clone(this.attributes), options);
    },

    // Fetch the model from the server. If the server's representation of the
    // model differs from its current attributes, they will be overriden,
    // triggering a `"change"` event.
    // 发请求获取并设置model
    fetch: function(options) {

        options = options ? _.clone(options) : {};

        var model = this;
        var success = options.success; // 记录原来 success

        // 指向新的方法
        options.success = function(resp, status, xhr) {

            // parse后 进行 set 失败则返回 false
            if (!model.set(model.parse(resp, xhr), options)) return false;

            // 执行 success 原来和sync是对立的
            if (success) success(model, resp, options);
            // 触发 sync 事件
            model.trigger('sync', model, resp, options);
        };

        // 交给 error 处理
        options.error = Backbone.wrapError(options.error, model, options);

        // 发送 read 类型 sync
        return this.sync('read', this, options);
    },

    // Set a hash of model attributes, and sync the model to the server.
    // If the server returns an attributes hash that differs, the model's
    // state will be `set` again.
    save: function(key, value, options) {
        var attrs, current;

        // Handle both `("key", value)` and `({key: value})` -style calls.
        if (_.isObject(key) || key == null) {
            attrs = key;
            options = value;
        } else {
            attrs = {};
            attrs[key] = value;
        }
        options = options ? _.clone(options) : {};

        // If we're "wait"-ing to set changed attributes, validate early.
        if (options.wait) {
            if (!this._validate(attrs, options)) return false;
            current = _.clone(this.attributes);
        }

        // Regular saves `set` attributes before persisting to the server.
        var silentOptions = _.extend({}, options, {silent: true});
        if (attrs && !this.set(attrs, options.wait ? silentOptions : options)) {
            return false;
        }

        // After a successful server-side save, the client is (optionally)
        // updated with the server-side state.
        var model = this;
        var success = options.success;
        options.success = function(resp, status, xhr) {
            var serverAttrs = model.parse(resp, xhr);
            if (options.wait) {
                delete options.wait;
                serverAttrs = _.extend(attrs || {}, serverAttrs);
            }
            if (!model.set(serverAttrs, options)) return false;
            if (success) success(model, resp, options);
            model.trigger('sync', model, resp, options);
        };

        // Finish configuring and sending the Ajax request.
        options.error = Backbone.wrapError(options.error, model, options);
        var xhr = this.sync(this.isNew() ? 'create' : 'update', this, options);
        if (options.wait) this.clear(silentOptions).set(current, silentOptions);
        return xhr;
    },

    // Destroy this model on the server if it was already persisted.
    // Optimistically removes the model from its collection, if it has one.
    // If `wait: true` is passed, waits for the server to respond before removal.
    destroy: function(options) {
        options = options ? _.clone(options) : {};
        var model = this;
        var success = options.success;

        var destroy = function() {
            model.trigger('destroy', model, model.collection, options);
        };

        options.success = function(resp) {
            if (options.wait || model.isNew()) destroy();
            if (success) success(model, resp, options);
            if (!model.isNew()) model.trigger('sync', model, resp, options);
        };

        if (this.isNew()) {
            options.success();
            return false;
        }

        options.error = Backbone.wrapError(options.error, model, options);
        var xhr = this.sync('delete', this, options);
        if (!options.wait) destroy();
        return xhr;
    },

    // Default URL for the model's representation on the server -- if you're
    // using Backbone's restful methods, override this to change the endpoint
    // that will be called.
    // 可覆盖
    url: function() {
        // 取 urlRoot 或者 collection url 或者 抛出错误
        var base = getValue(this, 'urlRoot') || getValue(this.collection, 'url') || urlError();
        // 无id 则用base
        if (this.isNew()) return base;
        // base + id
        return base + (base.charAt(base.length - 1) == '/' ? '' : '/') + encodeURIComponent(this.id);
    },

    // **parse** converts a response into the hash of attributes to be `set` on
    // the model. The default implementation is just to pass the response along.
    // 过滤方法 res回来时 会执行
    parse: function(resp, xhr) {
        return resp;
    },

    // Create a new model with identical attributes to this one.
    // 按照自身的attributes new个新的model  id相同 cid不同
    clone: function() {
        return new this.constructor(this.attributes);
    },

    // A model is new if it has never been saved to the server, and lacks an id.
    // 是否有 id
    isNew: function() {
        return this.id == null;
    },

    // Call this method to manually fire a `"change"` event for this model and
    // a `"change:attribute"` event for each changed attribute.
    // Calling this will cause all objects observing the model to update.
    // 发送事件 干掉了 _changing
    change: function(options) {

        options || (options = {});

        // Silent changes become pending changes.
        // _silent - _pending:true
        for (var attr in this._silent) this._pending[attr] = true;

        // Silent changes are triggered.
        // 合并 changes _silent
        var changes = _.extend({}, options.changes, this._silent);

        this._silent = {}; // 清空 _silent

        for (var attr in changes) {
            // 触发单属性change事件 ( model, value, options )
            this.trigger('change:' + attr, this, this.get(attr), options);
        }

        // Continue firing `"change"` events while there are pending changes.
        // _pending 非空
        while (!_.isEmpty(this._pending)) {

            this._pending = {};

            this.trigger('change', this, options); // 发出 model 的 change 事件

            // Pending and silent changes still remain.
            // 删除 changed
            for (var attr in this.changed) {

                if (this._pending[attr] || this._silent[attr]) continue;

                delete this.changed[attr];
            }
            this._previousAttributes = _.clone(this.attributes); // 保留 _previousAttributes
        }

        return this;
    },

    // Determine if the model has changed since the last `"change"` event.
    // If you specify an attribute name, determine if that attribute has changed.
    // 判断 changed 中有没有
    hasChanged: function(attr) {
        // 没传特定属性 则判断所有属性
        if (attr == null) return !_.isEmpty(this.changed);
        // 判断特点属性
        return _.has(this.changed, attr);
    },

    // Return an object containing all the attributes that have changed, or
    // false if there are no changed attributes. Useful for determining what
    // parts of a view need to be updated and/or what attributes need to be
    // persisted to the server. Unset attributes will be set to undefined.
    // You can also pass an attributes object to diff against the model,
    // determining if there *would be* a change.
    changedAttributes: function(diff) {
        if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
        var val, changed = false, old = this._previousAttributes;
        for (var attr in diff) {
            if (_.isEqual(old[attr], (val = diff[attr]))) continue;
            (changed || (changed = {}))[attr] = val;
        }
        return changed;
    },

    // Get the previous value of an attribute, recorded at the time the last
    // `"change"` event was fired.
    previous: function(attr) {
        if (attr == null || !this._previousAttributes) return null;
        return this._previousAttributes[attr];
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    previousAttributes: function() {
        return _.clone(this._previousAttributes);
    },

    // Check if the model is currently in a valid state. It's only possible to
    // get into an *invalid* state if you're using silent changes.
    isValid: function() {
        return !this.validate || !this.validate(this.attributes);
    },

    // Run validation against the next complete set of model attributes,
    // returning `true` if all is well. If a specific `error` callback has
    // been passed, call that instead of firing the general `"error"` event.
    _validate: function(attrs, options) {
        if (options.silent || !this.validate) return true;
        attrs = _.extend({}, this.attributes, attrs);
        var error = this.validate(attrs, options);
        if (!error) return true;
        if (options && options.error) {
            options.error(this, error, options);
        } else {
            this.trigger('error', this, error, options);
        }
        return false;
    }

});