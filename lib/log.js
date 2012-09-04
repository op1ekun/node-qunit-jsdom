var data,
    log = console.log;

data = {
    assertions: [],
    tests: [],
    summaries: []
};

exports.assertion = function(d) {
    if (d) {
        data.assertions.push(d);
    }

    return data.assertions;
};

exports.test = function(d) {
    if (d) {
        data.tests.push(d);
    }

    return data.tests;
};

exports.summary = function(d) {
    if (d) {
        data.summaries.push(d);
    }

    return data.summaries;
};

/**
 * Get global tests stats in unified format
 */
exports.stats = function() {
    var stats = {
            files: 0,
            assertions: 0,
            failed: 0,
            passed: 0,
            runtime: 0
        };

    data.summaries.forEach(function(file) {
        stats.files++;
        stats.assertions += file.total;
        stats.failed += file.failed;
        stats.passed += file.passed;
        stats.runtime += file.runtime;
    });

    stats.tests = data.tests.length;

    return stats;
};

/**
 * Reset global stats data
 */
exports.reset = function() {
    data = {
        assertions: [],
        tests: [],
        summaries: []
    };
};

var print = exports.print = {};

print.assertions = function() {};

print.errors = function() {
    var errors = [];

    data.assertions.forEach(function(data) {
        if (!data.result) {
            errors.push(data);
        }
    });

    if (errors.length) {
        log('\n\nErrors:');
        errors.forEach(function(data) {
            log('\nModule: ' + data.module + ' Test: ' + data.test);
            if (data.message) {
                log(data.message);
            }

            if (data.source) {
                log(data.source);
            }

            if (data.expected != null || data.actual != null) {
                //it will be an error if data.expected !== data.actual, but if they're
                //both undefined, it means that they were just not filled out because
                //no assertions were hit (likely due to code error that would have been logged as source or message).
                log('Actual value:');
                log(data.actual);
                log('Expected value:');
                log(data.expected);
            }
        });
    }
};

print.tests = function() {};

print.summary = function() {};

print.globalSummary = function() {};
