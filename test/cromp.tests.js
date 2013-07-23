(function (mocha, chai, cromp) {

    chai.Assertion.includeStack = true;
    var assert = chai.assert;

    suite("cromp", function () {

        test("parse character a", function () {
            var parser = cromp.character("a", function(ch) {
                return "got " + ch;
            });
            var result = cromp.parse(parser, "a").result;
            assert.equal(result, "got a");
        });

        test("parse character b", function () {
            var parser = cromp.character("b", function(ch) {
                return "got " + ch;
            });
            var result = cromp.parse(parser, "b").result;
            assert.equal(result, "got b");
        });

        test("parse characters ab", function () {
            var parser = cromp.seq(
                cromp.character("a"),
                cromp.character("b"))
                    .map(function (results) {
                        return "got " + results[0] + " then " + results[1];
                    });
            var result = cromp.parse(parser, "ab").result;
            assert.equal(result, "got a then b");
        });

        test("parse characters ba", function () {
            var parser = cromp.seq(
                cromp.character("b"),
                cromp.character("a"))
                    .map(function (results) {
                        return "got " + results[0] + " then " + results[1];
                    });
            var result = cromp.parse(parser, "ba").result;
            assert.equal(result, "got b then a");
        });

        test("can't parse a as character b", function () {
            var parser = cromp.character("b");
            var x = cromp.parse(parser, "a");
            assert.ok(!x.success);
        });

        test("can't parse aa as characters a then b", function () {
            var parser = cromp.seq(
                cromp.character("a"),
                cromp.character("b"));
            var x = cromp.parse(parser, "aa");
            assert.ok(!x.success);
        });

        test("simple choice parsing", function () {
            var parser = cromp.choose(
                cromp.character("a"),
                cromp.character("b"));
            var a = cromp.parse(parser, "a");
            var b = cromp.parse(parser, "b");
            assert.ok(a.success);
            assert.ok(b.success);
        });

        test("choice parsing", function () {
            var parser = cromp.choose(
                cromp.seq(
                    cromp.character("a"),
                    cromp.character("b")),
                cromp.seq(
                    cromp.character("a"),
                    cromp.character("a")));
            var ab = cromp.parse(parser, "ab");
            var aa = cromp.parse(parser, "aa");
            assert.ok(ab.success);
            assert.ok(aa.success);
        });

        test("optional parsing", function () {
            var parser = cromp.seq(
                cromp.optional(cromp.character("a")),
                cromp.character("b"));
            var ab = cromp.parse(parser, "ab");
            var b = cromp.parse(parser, "b");
            var aa = cromp.parse(parser, "aa");
            assert.ok(ab.success);
            assert.ok(b.success);
            assert.ok(!aa.success);
        });

        test("many parsing", function () {
            var parser = cromp.many(
                cromp.character("a"));
            var a = cromp.parse(parser, "a");
            var aa = cromp.parse(parser, "aa");
            var aaa = cromp.parse(parser, "aaa");
            var b = cromp.parse(parser, "b");
            assert.ok(a.success);
            assert.deepEqual(["a"], a.result);
            assert.ok(aa.success);
            assert.deepEqual(["a", "a"], aa.result);
            assert.ok(aaa.success);
            assert.deepEqual(["a", "a", "a"], aaa.result);
            assert.ok(b.success);
            assert.deepEqual([], b.result);
        });

        test("many1 parsing", function () {
            var parser = cromp.many1(
                cromp.character("a"));
            var a = cromp.parse(parser, "a");
            var aa = cromp.parse(parser, "aa");
            var b = cromp.parse(parser, "b");
            assert.ok(a.success);
            assert.ok(aa.success);
            assert.ok(!b.success);
        });

        test("interpose parsing", function () {
            var parser = cromp.interpose(
                cromp.character("a"),
                cromp.character(","));
            var a = cromp.parse(parser, "a");
            var aa = cromp.parse(parser, "a,a");
            var aaa = cromp.parse(parser, "a,a,a");
            var b = cromp.parse(parser, "b");
            assert.ok(a.success);
            assert.deepEqual(["a"], a.result);
            assert.ok(aa.success);
            assert.deepEqual(["a", ",", "a"], aa.result);
            assert.ok(aaa.success);
            assert.deepEqual(["a", ",", "a", ",", "a"], aaa.result);
            assert.ok(!b.success);
        });

        test("between parsing", function () {
            var open = cromp.character("(");
            var close = cromp.character(")");
            var parser = cromp.between(open, close, cromp.character("a"));
            var oac = cromp.parse(parser, "(a)");
            var ac = cromp.parse(parser, "a)");
            var oa = cromp.parse(parser, "(a");
            var a = cromp.parse(parser, "a");
            assert.deepEqual("a", oac.result);
            assert.ok(!ac.success);
            assert.ok(!oa.success);
            assert.ok(!a.success);
        });

        test("parse regex", function () {
            var parser = cromp.regex(/[a-c]/);
            var a = cromp.parse(parser, "a");
            var x = cromp.parse(parser, "x");
            var xa = cromp.parse(parser, "xa");
            assert.ok(a.success);
            assert.deepEqual("a", a.result[0]);
            assert.ok(!x.success);
            assert.ok(!xa.success);
        });

        test("parse simple calculator grammar", function () {
            var num = cromp.regex(/[0-9]+/).map(function (m) { return parseInt(m[0], 10); });
            var op1 = cromp.regex(/[+-]/).map(function (m) { return m[0]; });
            var op2 = cromp.regex(/[*\/]/).map(function (m) { return m[0]; });
            var term = cromp.recursive(function () {
                return cromp.choose(
                    cromp.seq(num, op2, term)
                        .map(function (x) { return { op: x[1], l: x[0], r: x[2] }; }),
                    num); });
            var expr = cromp.recursive(function () {
                return cromp.choose(
                    cromp.seq(term, op1, expr)
                        .map(function (x) { return { op: x[1], l: x[0], r: x[2] }; }),
                    term); });
            var parse = function (src) { return cromp.parse(expr, src); };

            var a = parse("1");
            var b = parse("1+2");
            var c = parse("1*2");
            var d = parse("1+2*3+4");
            assert.ok(a.success);
            assert.ok(b.success);
            assert.ok(c.success);
            assert.ok(d.success);
        });

        test("parse left associative grammar", function () {
            var num = cromp.regex(/[0-9]+/).map(function (m) { return parseInt(m[0], 10); });
            var op = cromp.character("+").map(function (x) {
                return function(l, r) { return ["+", l, r]; }; });
            var expr = cromp.chainl(num, op);
            var parse = function (src) { return cromp.parse(expr, src); };

            var a = parse("1");
            var b = parse("1+2");
            var c = parse("1+2+3");
            var d = parse("1+2+3+4");
            assert.ok(a.success);
            assert.ok(b.success);
            assert.ok(c.success);
            assert.deepEqual(c.result, ["+", ["+", 1, 2], 3]);
            assert.ok(d.success);
            assert.deepEqual(d.result, ["+", ["+", ["+", 1, 2], 3], 4]);
        });

        test("parse nested lists", function () {
            var open = cromp.character("(");
            var close = cromp.character(")");
            var list = cromp.recursive(function() {
                return cromp.seq(open, cromp.many(list), close)
                    .map(function (x) { return x[1]; }); });
            var parse = function (src) { return cromp.parse(list, src); };

            var a = parse("()");
            var b = parse("((()))");
            var c = parse("(()())");
            var d = parse("(()(())())");
            var e = parse("(((())");
            assert.ok(a.success);
            assert.deepEqual(a.result, []);
            assert.ok(b.success);
            assert.deepEqual(b.result, [[[]]]);
            assert.ok(c.success);
            assert.deepEqual(c.result, [[],[]]);
            assert.ok(d.success);
            assert.deepEqual(d.result, [[],[[]],[]]);
            assert.ok(!e.success);
        });

        // COMBINATORS
        // cromp.eof
        // cromp.not or notFollowedBy
        // cromp.until
        // cromp.whitespace
        // cromp.string
        // cromp.characters
        // cromp.any

        // ERRORS
        // incomplete parse
        // parse failures
        // badly constructed parser

        // Parser.mapcat
        // Parser.filter

        // TEST CASES
        // if c then t else f
        // JSON

    });

})(this.mocha || new require("mocha").Mocha,
   this.chai || require("chai"),
   this.cromp || require("../"));
