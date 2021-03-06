describe('Demo App', () => {

    let spawn = require('child_process').spawnSync;
    let assert = require('assert');


    function throwErrorIfSlow(spawnResult, speed) {
        let timeToRun = /time to run (\d+)\.(\d+) ms/.exec(spawnResult.stderr.toString());
        let t = parseFloat(`${timeToRun[1]}.${timeToRun[2]}`);
        if (t > speed) {
            throw new Error(`App took too long, performance issue? exceeded by ${t-speed} ms`);
        }
    }

    it('check result', () => {
        let spawn2 = spawn('node', ['app.js'], {
            cwd : `${__dirname}/../demo/`,
            env : Object.assign(process.env, { MOCK : '' })});
        let result = spawn2.stdout;

        console.log('\t', spawn2.stderr.toString());

        throwErrorIfSlow(spawn2, 300);

        let data = {};
        try {
            data = JSON.parse(result.toString());
        }
        catch(e){
            console.log('could not parse json', result.toString());
            throw new Error(e);
        }

        let body = JSON.parse(data.body);
        assert.deepEqual(body.code, 200);
        assert.deepEqual(typeof body.data, 'object');
        assert.deepEqual(body.message, 'ok')
    });

    it('mock check result', () => {
        let spawnResult = spawn('node', ['app.js'], {
            cwd : `${__dirname}/../demo/`,
            env : Object.assign(process.env, { MOCK : true })
        });

        let result = spawnResult.stdout.toString();


        console.log('\t', spawnResult.stderr.toString());
        throwErrorIfSlow(spawnResult, 7);

        result = result.replace(/^.*mocks are enabled for this session/, '');

        let data = JSON.parse(result);

        let body = JSON.parse(data.body);
        assert.deepEqual(body.code, 200);
        assert.deepEqual(typeof body.data, 'object');
        assert.deepEqual(body.data, { MOCK : true });
        assert.deepEqual(body.message, 'ok')
    });

});