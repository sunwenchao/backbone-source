// Backbone.History
// ----------------

// Handles cross-browser history management, based on URL fragments. If the
// browser does not support `onhashchange`, falls back to polling.
// History 模块
var History = Backbone.History = function() {

    this.handlers = [];

    _.bindAll(this, 'checkUrl'); // 绑定 checkUrl 执行环境
};

// Cached regex for cleaning leading hashes and slashes .
var routeStripper = /^[#\/]/; // '#' '/' 开头

// Cached regex for detecting MSIE.
var isExplorer = /msie [\w.]+/; // msie ooxx

// Has the history handling already been started?
History.started = false; // start 是否执行

// Set up all inheritable **Backbone.History** properties and methods.
_.extend(History.prototype, Events, {

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    // 默认检测 hash 变化的间隔
    interval: 50,

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    // 获取 hash 值的方法 可传入 window 对象获取对应hash值
    getHash: function(windowOverride) {
        var loc = windowOverride ? windowOverride.location : window.location;

        var match = loc.href.match(/#(.*)$/);
        return match ? match[1] : ''; // 返回 # 后匹配
    },

    // Get the cross-browser normalized URL fragment, either from the URL,
    // the hash, or the override.
    // 获取 fragment root后面内容
    getFragment: function(fragment, forcePushState) {

        if (fragment == null) {

            if (this._hasPushState || forcePushState) {

                // pathname + search
                fragment = window.location.pathname;
                var search = window.location.search;
                if (search) fragment += search;

            } else {
                // 返回 hash 的值
                fragment = this.getHash();
            }
        }
        
        // 针对高级URL 和 root 做出 fragment 截取
        if (!fragment.indexOf(this.options.root)) fragment = fragment.substr(this.options.root.length);

        // 去掉开头的 '#' '/'
        return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    // 启动路由管理, 返回当前url是否匹配
    start: function(options) {

        // 检测是否已启动过 设置标识
        if (History.started) throw new Error("Backbone.history has already been started");
        History.started = true;

        // Figure out the initial configuration. Do we need an iframe?
        // Is pushState desired ... is it available?
        // 获取选项配置
        this.options          = _.extend({}, {root: '/'}, this.options, options);
        // hashChange
        this._wantsHashChange = this.options.hashChange !== false;
        // pushState 返回boolean
        this._wantsPushState  = !!this.options.pushState;
        // 在_wantsPushState的情况下 进行浏览器 pushState 能力判断 返回boolean   名字起的真不好...
        this._hasPushState    = !!(this.options.pushState && window.history && window.history.pushState);
        // 获取 url 的 fragment
        var fragment          = this.getFragment();
        // ie的属性 返回浏览器渲染当前文档所用的模式
        var docMode           = document.documentMode;
        // 判断 ie8 以下版本的 ie
        var oldIE             = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));

        // oldIE 插入一个 iframe
        if (oldIE) {
            this.iframe = $('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo('body')[0].contentWindow;
            this.navigate(fragment);
        }

        // Depending on whether we're using pushState or hashes, and whether
        // 'onhashchange' is supported, determine how we check the URL state.
        // 设置各个情况下检查 url 变化
        if (this._hasPushState) {
            $(window).bind('popstate', this.checkUrl);
        } else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
            $(window).bind('hashchange', this.checkUrl);
        } else if (this._wantsHashChange) {
            this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
        }

        // Determine if we need to change the base url, for a pushState link
        // opened by a non-pushState browser.
        // 做了对 pushState link 在 non-pushState browser 中的转换处理
        this.fragment = fragment;
        var loc = window.location;
        var atRoot  = loc.pathname == this.options.root; // 是否匹配根路径

        // If we've started off with a route from a `pushState`-enabled browser,
        // but we're currently in a browser that doesn't support it...
        // 针对低级浏览器对高级URL的处理
        if (this._wantsHashChange && this._wantsPushState && !this._hasPushState && !atRoot) {

            this.fragment = this.getFragment(null, true); // 获取 pushState 情形的 fragment

            window.location.replace(this.options.root + '#' + this.fragment); // 替换 URL

            // Return immediately as browser will do redirect to new url
            return true;

            // Or if we've started out with a hash-based route, but we're currently
            // in a browser where it could be `pushState`-based instead...
            // 针对高级浏览器对低级URL的处理
        } else if (this._wantsPushState && this._hasPushState && atRoot && loc.hash) {
            // 获取 hash
            this.fragment = this.getHash().replace(routeStripper, '');
            // 更换为 不带 #的 url
            window.history.replaceState({}, document.title, loc.protocol + '//' + loc.host + this.options.root + this.fragment);
        }

        if (!this.options.silent) { // 非 silent 则执行路由动作
            return this.loadUrl();
        }
    },

    // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    // 停止路由功能 方便测试的api
    stop: function() {
        $(window).unbind('popstate', this.checkUrl).unbind('hashchange', this.checkUrl);
        clearInterval(this._checkUrlInterval);
        History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    // 添加路由匹配条目
    route: function(route, callback) {
        this.handlers.unshift({route: route, callback: callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    // 检测url的变化 pushstate or hash产生的
    checkUrl: function(e) {

        var current = this.getFragment(); // 获取fragment

        // 老ie 检查 iframe hash
        if (current == this.fragment && this.iframe) current = this.getFragment(this.getHash(this.iframe));

        // 相同则返回
        if (current == this.fragment) return false;

        // oldie navigate not trigger
        if (this.iframe) this.navigate(current);

        // 执行路由动作 没匹配去做对_hasPushState的hash兼容检查？貌似没啥意义
        this.loadUrl() || this.loadUrl(this.getHash());
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    // 执行路由动作 返回匹配布尔值
    loadUrl: function(fragmentOverride) {

        var fragment = this.fragment = this.getFragment(fragmentOverride); // 获取fragment

        var matched = _.any(this.handlers, function(handler) { // 查找 handlers 列表

            if (handler.route.test(fragment)) {

                handler.callback(fragment); // 有匹配到的则执行并退出循环
                return true;
            }
        });

        return matched; // 返回匹配结果
    },

    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    // 路由方法 常配参数 replace trigger
    navigate: function(fragment, options) {

        if (!History.started) return false;

        // true - {trigger: true}   null - false
        if (!options || options === true) options = {trigger: options};

        var frag = (fragment || '').replace(routeStripper, ''); // 去掉 / #

        if (this.fragment == frag) return; // 和当前相同 返回

        // If pushState is available, we use it to set the fragment as a real URL.
        if (this._hasPushState) {

            // noRoot 则在前面加上
            if (frag.indexOf(this.options.root) != 0) frag = this.options.root + frag;

            // 记录当前 fragment
            this.fragment = frag;

            // 执行push/replace state
            window.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, frag);


            // If hash changes haven't been explicitly disabled, update the hash
            // fragment to store history.
        } else if (this._wantsHashChange) {

            // 记录当前 fragment
            this.fragment = frag;

            // 更新hash
            this._updateHash(window.location, frag, options.replace);

            // oldie frag和iframe hash不同
            if (this.iframe && (frag != this.getFragment(this.getHash(this.iframe)))) {
                // Opening and closing the iframe tricks IE7 and earlier to push a history entry on hash-tag change.
                // When replace is true, we don't want this.
                // todo 只有这样 oldie 才能添加历史记录？
                if(!options.replace) this.iframe.document.open().close();

                // 更新 iframe hash
                this._updateHash(this.iframe.location, frag, options.replace);
            }

            // If you've told us that you explicitly don't want fallback hashchange-
            // based history, then `navigate` becomes a page refresh.
        } else {
            // 不希望 hashchange 则刷新页面
            window.location.assign(this.options.root + fragment);
        }

        if (options.trigger) this.loadUrl(fragment); // 执行路由动作
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    // 更新hash
    _updateHash: function(location, fragment, replace) {
        if (replace) {
            // 取得 javascript:|# 之前内容 拼接 fragment
            location.replace(location.toString().replace(/(javascript:|#).*$/, '') + '#' + fragment);
        } else {
            location.hash = fragment;
        }
    }
});