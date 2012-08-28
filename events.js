// Backbone.Events
// -----------------

// Regular expression used to split event strings
// 空格符用来切分事件字符串
var eventSplitter = /\s+/;

// A module that can be mixed in to *any object* in order to provide it with
// custom events. You may bind with `on` or remove with `off` callback functions
// to an event; `trigger`-ing an event fires all callbacks in succession.
//
//     var object = {};
//     _.extend(object, Backbone.Events);
//     object.on('expand', function(){ alert('expanded'); });
//     object.trigger('expand');
//
// Events 模块
var Events = Backbone.Events = {

    // Bind one or more space separated events, `events`, to a `callback`
    // function. Passing `"all"` will bind the callback to all events fired.
    // 绑定事件方法 ( 事件名字符串, 回调方法, 回调执行上下文 ）
    on: function(events, callback, context) {
        var calls, event, list;

        if (!callback) return this;

        events = events.split(eventSplitter); // 切分成数组

        calls = this._callbacks || (this._callbacks = {}); // 回调Map

        while (event = events.shift()) {
            list = calls[event] || (calls[event] = []); // 获取 回调Map 中的此事件回调列表
            list.push(callback, context); // 增加此回调 ( all的绑定也在 Map.all 上 )
        }

        return this;
    },

    // Remove one or many callbacks. If `context` is null, removes all callbacks
    // with that function. If `callback` is null, removes all callbacks for the
    // event. If `events` is null, removes all bound callbacks for all events.
    // 解除绑定 根据参数确定解除回调的范围
    off: function(events, callback, context) {
        var event, calls, list, i;

        // 没回调Map则返回
        if (!(calls = this._callbacks)) return this;

        // 如果参数为空 删除回调Map
        if (!(events || callback || context)) {
            delete this._callbacks;
            return this;
        }

        // 如果有 events 则切分为数组, 没有则取得回调Map的 所有事件名
        events = events ? events.split(eventSplitter) : _.keys(calls);

        // Loop through the callback list, splicing where appropriate.
        // 循环处理事件
        while (event = events.shift()) {

            // 如果没有此事件回调 或者 没有 回调和上下文 参数的限定，则删掉回调Map中的此事件队列
            if (!(list = calls[event]) || !(callback || context)) {
                delete calls[event];
                continue;
            }

            // 循环此事件回调列表
            for (i = list.length - 2; i >= 0; i -= 2) {
                // 判断callback和context限定 确定是否删除回调
                if (!(callback && list[i] !== callback || context && list[i + 1] !== context)) {
                    list.splice(i, 2);
                }
            }
        }

        return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    // 触发事件 ( 事件字符串, args )
    trigger: function(events) {
        var event, calls, list, i, length, args, all, rest;

        if (!(calls = this._callbacks)) return this; // 如无回调Map 则返回

        rest = []; // 回调参数数组

        events = events.split(eventSplitter); // 切分事件字符串为数组

        // ( 'change', a1, a2 )
        // rest[ 0 ] = a1, rest[ 1 ] = a2  填充回调接收参数数组
        for (i = 1, length = arguments.length; i < length; i++) {
            rest[i - 1] = arguments[i];
        }

        // For each event, walk through the list of callbacks twice, first to
        // trigger the event, then to trigger any `"all"` callbacks.
        // 循环处理所有事件, 每个事件都会执行 自身绑定的 和 all绑定的 回调队列
        while (event = events.shift()) {

            // Copy callback lists to prevent modification.
            // 复制数组防止修改
            if (all = calls.all) all = all.slice();
            if (list = calls[event]) list = list.slice();

            // Execute event callbacks.
            if (list) {
                // 添加时list.push(callback, context) 所以要加2
                for (i = 0, length = list.length; i < length; i += 2) {
                    list[i].apply(list[i + 1] || this, rest); // 执行回调
                }
            }

            // Execute "all" callbacks.
            if (all) {
                args = [event].concat(rest); // 增加事件名参数
                for (i = 0, length = all.length; i < length; i += 2) {
                    all[i].apply(all[i + 1] || this, args);
                }
            }
        }

        return this;
    }

};

// Aliases for backwards compatibility.
// on == bind, off == unbind
Events.bind   = Events.on;
Events.unbind = Events.off;