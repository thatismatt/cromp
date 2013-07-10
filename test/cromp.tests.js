var cromp = require("../");

exports["parse character a"] = function(test) {
    var parser = cromp.character("a", function(ch) {
        return "got " + ch;
    });
    var result = cromp.parse(parser, "a").result;
    test.equal(result, "got a");
    test.done();
};

exports["parse character b"] = function(test) {
    var parser = cromp.character("b", function(ch) {
        return "got " + ch;
    });
    var result = cromp.parse(parser, "b").result;
    test.equal(result, "got b");
    test.done();
};

exports["parse characters ab"] = function(test) {
    var parser = cromp.seq(
        cromp.character("a"),
        cromp.character("b"))
    .map(function (results) {
        return "got " + results[0] + " then " + results[1];
    });
    var result = cromp.parse(parser, "ab").result;
    test.equal(result, "got a then b");
    test.done();
};

exports["parse characters ba"] = function(test) {
    var parser = cromp.seq(
        cromp.character("b"),
        cromp.character("a"))
    .map(function (results) {
        return "got " + results[0] + " then " + results[1];
    });
    var result = cromp.parse(parser, "ba").result;
    test.equal(result, "got b then a");
    test.done();
};

exports["can't parse a as character b"] = function(test) {
    var parser = cromp.character("b");
    var x = cromp.parse(parser, "a");
    test.ok(!x.success);
    test.done();
};

exports["can't parse aa as characters a then b"] = function(test) {
    var parser = cromp.seq(
        cromp.character("a"),
        cromp.character("b"));
    var x = cromp.parse(parser, "aa");
    test.ok(!x.success);
    test.done();
};

exports["simple choice parsing"] = function(test) {
    var parser = cromp.choose(
        cromp.character("a"),
        cromp.character("b"));
    var a = cromp.parse(parser, "a");
    var b = cromp.parse(parser, "b");
    test.ok(a.success);
    test.ok(b.success);
    test.done();
};

exports["choice parsing"] = function(test) {
    var parser = cromp.choose(
        cromp.seq(
            cromp.character("a"),
            cromp.character("b")),
        cromp.seq(
            cromp.character("a"),
            cromp.character("a")));
    var ab = cromp.parse(parser, "ab");
    var aa = cromp.parse(parser, "aa");
    test.ok(ab.success);
    test.ok(aa.success);
    test.done();
};

exports["optional parsing"] = function (test) {
    var parser = cromp.seq(
            cromp.optional(cromp.character("a")),
            cromp.character("b"));
    var ab = cromp.parse(parser, "ab");
    var b = cromp.parse(parser, "b");
    var aa = cromp.parse(parser, "aa");
    test.ok(ab.success);
    test.ok(b.success);
    test.ok(!aa.success);
    test.done();
};

exports["many parsing"] = function (test) {
    var parser = cromp.many(
            cromp.character("a"));
    var a = cromp.parse(parser, "a");
    var aa = cromp.parse(parser, "aa");
    var aaa = cromp.parse(parser, "aaa");
    var b = cromp.parse(parser, "b");
    test.ok(a.success);
    test.deepEqual(["a"], a.result);
    test.ok(aa.success);
    test.deepEqual(["a", "a"], aa.result);
    test.ok(aaa.success);
    test.deepEqual(["a", "a", "a"], aaa.result);
    test.ok(b.success);
    test.deepEqual([], b.result);
    test.done();
};

exports["many1 parsing"] = function (test) {
    var parser = cromp.many1(
            cromp.character("a"));
    var a = cromp.parse(parser, "a");
    var aa = cromp.parse(parser, "aa");
    var b = cromp.parse(parser, "b");
    test.ok(a.success);
    test.ok(aa.success);
    test.ok(!b.success);
    test.done();
};

exports["interpose parsing"] = function (test) {
    var parser = cromp.interpose(
            cromp.character("a"),
            cromp.character(","));
    var a = cromp.parse(parser, "a");
    var aa = cromp.parse(parser, "a,a");
    var aaa = cromp.parse(parser, "a,a,a");
    var b = cromp.parse(parser, "b");
    test.ok(a.success);
    test.deepEqual(["a"], a.result);
    test.ok(aa.success);
    test.deepEqual(["a", ",", "a"], aa.result);
    test.ok(aaa.success);
    test.deepEqual(["a", ",", "a", ",", "a"], aaa.result);
    test.ok(!b.success);
    test.done();
};

exports["between parsing"] = function (test) {
    var open = cromp.character("(");
    var close = cromp.character(")");
    var parser = cromp.between(open, close, cromp.character("a"));
    var oac = cromp.parse(parser, "(a)");
    var ac = cromp.parse(parser, "a)");
    var oa = cromp.parse(parser, "(a");
    var a = cromp.parse(parser, "a");
    test.deepEqual("a", oac.result);
    test.ok(!ac.success);
    test.ok(!oa.success);
    test.ok(!a.success);
    test.done();
};

exports["parse regex"] = function (test) {
    var parser = cromp.regex(/[a-c]/);
    var a = cromp.parse(parser, "a");
    var x = cromp.parse(parser, "x");
    var xa = cromp.parse(parser, "xa");
    test.ok(a.success);
    test.deepEqual("a", a.result[0]);
    test.ok(!x.success);
    test.ok(!xa.success);
    test.done();
};

exports["parse simple calculator grammar"] = function (test) {
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
    test.ok(a.success);
    test.ok(b.success);
    test.ok(c.success);
    test.ok(d.success);
    test.done();
};

exports["parse left associative grammar"] = function (test) {
    var num = cromp.regex(/[0-9]+/).map(function (m) { return parseInt(m[0], 10); });
    var op = cromp.character("+").map(function (x) {
        return function(l, r) { return ["+", l, r]; }; });
    var expr = cromp.chainl(num, op);
    var parse = function (src) { return cromp.parse(expr, src); };

    var a = parse("1");
    var b = parse("1+2");
    var c = parse("1+2+3");
    var d = parse("1+2+3+4");
    test.ok(a.success);
    test.ok(b.success);
    test.ok(c.success);
    test.deepEqual(c.result, ["+", ["+", 1, 2], 3]);
    test.ok(d.success);
    test.deepEqual(d.result, ["+", ["+", ["+", 1, 2], 3], 4]);
    test.done();
};

exports["parse nested lists"] = function (test) {
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
    test.ok(a.success);
    test.deepEqual(a.result, []);
    test.ok(b.success);
    test.deepEqual(b.result, [[[]]]);
    test.ok(c.success);
    test.deepEqual(c.result, [[],[]]);
    test.ok(d.success);
    test.deepEqual(d.result, [[],[[]],[]]);
    test.ok(!e.success);
    test.done();
};

// COMBINATORS
// cromp.eof
// cromp.not or notFollowedBy
// cromp.manyTill
// cromp.whitespace
// cromp.string
// cromp.between(open, close, p)

// ERRORS
// incomplete parse
// parse failures
// badly constructed parser

// Parser.mapcat
// Parser.filter

// TEST CASES
// if c then t else f
// JSON
