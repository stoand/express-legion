import { runTests } from 'test-legion';

// the are the default values, you can omit them
runTests({
    testDir: 'integration',
}, {
    tmpDir: 'tmp_legion',
    postgresBinPath: '/lib/postgresql/16/bin/',
    // for every test instance, we need a unique port
    // instance 0 will use 20100, instance 1 will use 20101, etc.
    startingPort: 20100,
});
