
function minErr(module) {
    return function () {
        var code = arguments[0],
            prefix = '[' + (module ? module + ':' : '') + code + '] ',
            template = arguments[1],
            templateArgs = arguments,
            stringify = function (obj) {
                if (isFunction(obj)) {
                    return obj.toString().replace(/ \{[\s\S]*$/, '');
                } else if (isUndefined(obj)) {
                    return 'undefined';
                } else if (!isString(obj)) {
                    return JSON.stringify(obj);
                }
                return obj;
            },
            message, i;

        message = prefix + template.replace(/\{\d+\}/g, function (match) {
            var index = +match.slice(1, -1), arg;

            if (index + 2 < templateArgs.length) {
                arg = templateArgs[index + 2];
                if (isFunction(arg)) {
                    return arg.toString().replace(/ ?\{[\s\S]*$/, '');
                } else if (isUndefined(arg)) {
                    return 'undefined';
                } else if (!isString(arg)) {
                    return toJson(arg);
                }
                return arg;
            }
            return match;
        });

        message = message + '\nhttp://errors.angularjs.org/' + version.full + '/' +
            (module ? module + '/' : '') + code;
        for (i = 2; i < arguments.length; i++) {
            message = message + (i == 2 ? '?' : '&') + 'p' + (i-2) + '=' +
                encodeURIComponent(stringify(arguments[i]));
        }

        return new Error(message);
    };
}