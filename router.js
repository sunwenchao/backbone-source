
// Backbone.Router
// -------------------

// Routers map faux-URLs to actions, and fire events when routes are
// matched. Creating a new one sets its `routes` hash, if not set statically.
// Router模块 options 可填写 `routes` hash
var Router = Backbone.Router = function(options) {

    options || (options = {});
    if (options.routes) this.routes = options.routes; // 会覆盖扩展在子类上的 routes hash  不友好...

    this._bindRoutes(); // 执行路由绑定

    this.initialize.apply(this, arguments); // 执行 initialize
};

// Cached regular expressions for matching named param parts and splatted
// parts of route strings.
var namedParam    = /:\w+/g; // :分隔符
var splatParam    = /\*\w+/g; // *分隔符
var escapeRegExp  = /[-[\]{}()+?.,\\^$|#\s]/g; // 需要转义的字符

// Set up all inheritable **Backbone.Router** properties and methods.
// 扩展原型属性 添加了 events 模块
_.extend(Router.prototype, Events, {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    // 默认无操作 构造函数会调到
    initialize: function(){},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    // 添加路由的方法
    route: function(route, name, callback) {

        Backbone.history || (Backbone.history = new History); // 获取或制造 history 实例 注意是小写h...

        if (!_.isRegExp(route)) route = this._routeToRegExp(route); // 如果不是正则进行转换处理

        if (!callback) callback = this[name]; // 如没有回调参数, 查找自身里的方法

        // 交给 Backbone.history.route 处理 ( route, 绑定上下文的回调 )
        Backbone.history.route(route, _.bind(function(fragment) {

            var args = this._extractParameters(route, fragment); // 根据 route 和 fragment 获取传递给回调的参数

            callback && callback.apply(this, args); // 执行回调

            this.trigger.apply(this, ['route:' + name].concat(args)); // 触发 route:abc 事件

            Backbone.history.trigger('route', this, name, args); // history 对象触发 route 事件

        }, this));

        return this;
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    // 直接代理给 Backbone.history.navigate
    navigate: function(fragment, options) {
        Backbone.history.navigate(fragment, options);
    },

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    // 处理 this.routes, 交给 route 进一步处理
    _bindRoutes: function() {

        if (!this.routes) return;

        var routes = [];

        // 遍历 this.routes, 添加到数组中 元素为 ['/abc','goFn']
        for (var route in this.routes) {
            routes.unshift([route, this.routes[route]]);
        }

        // 遍历 routes, 执行route ( '/abc', 'goFn', function goFn(){} )
        for (var i = 0, l = routes.length; i < l; i++) {
            this.route(routes[i][0], routes[i][1], this[routes[i][1]]);
        }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    // 转换正则 方便获取 :xx *xx
    _routeToRegExp: function(route) {
        route = route.replace(escapeRegExp, '\\$&')
            .replace(namedParam, '([^\/]+)')
            .replace(splatParam, '(.*?)');
        return new RegExp('^' + route + '$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted parameters.
    // 根据正则 解析 fragment, 返回匹配子结果
    _extractParameters: function(route, fragment) {
        return route.exec(fragment).slice(1);
    }

});
