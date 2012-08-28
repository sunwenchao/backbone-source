
// Backbone.sync
// -------------

// Map from CRUD to HTTP for our default `Backbone.sync` implementation.
var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'delete': 'DELETE',
    'read':   'GET'
};

// Override this function to change the manner in which Backbone persists
// models to the server. You will be passed the type of request, and the
// model in question. By default, makes a RESTful Ajax request
// to the model's `url()`. Some possible customizations could be:
//
// * Use `setTimeout` to batch rapid-fire updates into a single request.
// * Send up the models as XML instead of JSON.
// * Persist models via WebSockets instead of Ajax.
//
// Turn on `Backbone.emulateHTTP` in order to send `PUT` and `DELETE` requests
// as `POST`, with a `_method` parameter containing the true HTTP method,
// as well as all requests with the body as `application/x-www-form-urlencoded`
// instead of `application/json` with the model in a param named `model`.
// Useful when interfacing with server-side languages like **PHP** that make
// it difficult to read the body of `PUT` requests.
Backbone.sync = function(method, model, options) {
    var type = methodMap[method];

    // Default options, unless specified.
    options || (options = {});

    // Default JSON-request options.
    var params = {type: type, dataType: 'json'};

    // Ensure that we have a URL.
    if (!options.url) {
        params.url = getValue(model, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    if (!options.data && model && (method == 'create' || method == 'update')) {
        params.contentType = 'application/json';
        params.data = JSON.stringify(model);
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (Backbone.emulateJSON) {
        params.contentType = 'application/x-www-form-urlencoded';
        params.data = params.data ? {model: params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (Backbone.emulateHTTP) {
        if (type === 'PUT' || type === 'DELETE') {
            if (Backbone.emulateJSON) params.data._method = type;
            params.type = 'POST';
            params.beforeSend = function(xhr) {
                xhr.setRequestHeader('X-HTTP-Method-Override', type);
            };
        }
    }

    // Don't process data on a non-GET request.
    if (params.type !== 'GET' && !Backbone.emulateJSON) {
        params.processData = false;
    }

    // Make the request, allowing the user to override any Ajax options.
    return Backbone.ajax(_.extend(params, options));
};

// Set the default implementation of `Backbone.ajax` to proxy through to `$`.
Backbone.ajax = function() {
    return Backbone.$.ajax.apply(Backbone.$, arguments);
};

// Wrap an optional error callback with a fallback error event.
Backbone.wrapError = function(onError, originalModel, options) {
    return function(model, resp) {
        resp = model === originalModel ? resp : model;
        if (onError) {
            onError(originalModel, resp, options);
        } else {
            originalModel.trigger('error', originalModel, resp, options);
        }
    };
};
