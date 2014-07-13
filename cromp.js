(function (cromp) {
    function id (x) { return x; }
    function toArray (a) { return Array.prototype.slice.call(a, 0); }
    function flatten (xs) {
        return xs.reduce(function (a, x) {
            Array.prototype.push.apply(a, x);
            return a;
        }, []);
    }

    function Parser (parse) {
        this.parse = parse;
    }

    Parser.prototype.map = function (f) {
        var self = this;
        return new Parser(function (state) {
            var x = self.parse(state);
            return x.success ? success(f(x.result), x.state) : x;
        });
    };

    Parser.prototype.mapState = function (f) {
        var self = this;
        return new Parser(function (state) {
            var x = self.parse(state);
            return x.success ? f(state, x) : x;
        });
    };

    Parser.prototype.indexed = function () {
        return this.mapState(function (state, x) {
            x.start = state.index;
            return x;
        });
    };

    function ParseState (source, index) {
        this.source = source;
        this.index = index || 0;
    }

    ParseState.prototype.current = function () {
        return this.source[this.index];
    };

    ParseState.prototype.rest = function () {
        return this.source.substring(this.index);
    };

    ParseState.prototype.forward = function (x) {
        return new ParseState(this.source, this.index + (x || 1));
    };

    ParseState.prototype.back = function () {
        return new ParseState(this.source, this.index - 1);
    };

    function success (result, state) {
        return {
            state: state,
            success: true,
            result: result
        };
    }

    function fail (state, message) {
        return {
            state: state,
            success: false,
            message: message
        };
    }

    cromp.parse = function (parser, source) {
        return parser.parse(new ParseState(source));
    };

    cromp.seq = function () {
        var parsers = toArray(arguments);

        function parse (state) {
            return parsers.reduce(
                function (agg, p) {
                    if (!agg.success) return agg;
                    var x = p.parse(agg.state);
                    if (x.success) {
                        agg.result.push(x.result);
                        return success(agg.result, x.state);
                    } else {
                        return fail(state, x.message);
                    }
                }, success([], state));
        }

        return new Parser(parse);
    };

    cromp.choose = function () {
        var parsers = toArray(arguments);

        function parse (state) {
            return parsers.reduce(
                function (agg, p) {
                    if (agg.success) return agg;
                    var x = p.parse(state);
                    return x.success ? x : agg;
                }, fail(state, "choose failed to parse at " + state.index));
        }

        return new Parser(parse);
    };

    cromp.optional = function (parser) {
        return new Parser(function (state) {
            var x = parser.parse(state);
            return success(x.result, x.state);
        });
    };

    cromp.many = function (parser, min) {
        return new Parser(function (state) {
            var result = [];
            var x, s = state;
            function p () { x = parser.parse(s); s = x.state; }
            for (p(); x.success; p()) {
                result.push(x.result);
            }
            return result.length >= (min || 0)
                ? success(result, s)
                : fail(state, "many failed to parse at " + state.index);
        });
    };

    cromp.interpose = function (pa, pb) {
        return new Parser(function (state) {
            var a = pa.parse(state);
            var pba = cromp.many(cromp.seq(pb, pa));
            if (a.success) {
                var x = pba.parse(a.state);
                var result = flatten(x.result);
                result.unshift(a.result);
                return success(result, x.state);
            } else {
                return fail(state, "interpose failed to parse at " + state.index);
            }
        });
    };

    cromp.chainl = function (p, op) {
        return new Parser(function (state) {
            var l = p.parse(state);
            function rest (m) {
                var n = cromp.seq(op, p).parse(m.state);
                return n.success
                    ? rest(success(n.result[0](m.result, n.result[1]), n.state))
                    : success(m.result, m.state);
            }
            return l.success ? rest(l) : fail(state, "chainl failed to parse at " + state.index);
        });
    };

    cromp.character = function (ch) {
        return new Parser(function (state) {
            return state.current() === ch
                ? success(ch, state.forward())
                : fail(state, "character failed to parse, found '" + state.current() + "' expected '" + ch + "' at " + state.index);
        });
    };

    cromp.string = function (str) {
        return new Parser(function (state) {
            return state.rest().indexOf(str) === 0
                ? success(str, state.forward(str.length))
                : fail(state, "string failed to parse, found '" + state.rest().substring(0, str.length) + "' expected '" + str + "' at " + state.index);
        });
    };

    cromp.regex = function (re) {
        return new Parser(function (state) {
            var match = re.exec(state.rest());
            if (match && match.index === 0) {
                return success(match, state.forward(match[0].length));
            } else {
                return fail(state, "regex '" + re + "' failed to parse at " + state.index);
            }
        });
    };

    cromp.recursive = function (f) {
        return new Parser(function (x) { return f().parse(x); });
    };

    cromp.between = function (open, close, inner) {
        return cromp.seq(open, inner, close)
            .map(function (x) { return x[1]; });
    };

    cromp.many1 = function (p) {
        return cromp.many(p, 1);
    };

})(typeof exports === "undefined" ? this["cromp"] = {} : exports);
