/**
 * Created by daniel.irwin on 7/11/17.
 */
module.exports = function mockServer(port, opts, mockOpts) {
    const arupex = require('../arupex');
    const http = require('http');
    const fs = require('fs');
    let dir = opts?opts.dir:null || process.cwd();

    if (!opts) {

        opts = {
            dir: dir,
            edge: true,
            meterFnc: () => {},
            traceFnc: () => {}
        }
    }

    if(!mockOpts){
        mockOpts = {
            sampleEvent : {}
        };
    }

    const server = http.createServer((req, res) => {

        if (req.url === '/') {
            return res.end(fs.readFileSync(__dirname + '/../assets/mockInput.html', 'utf8'));
        }

        if (req.url === '/primer_schema.json') {
            let value = arupex.interceptors.lambdas(Object.assign(opts, { edge : true }));

            delete value.mockGenerator.fncVarReplacements;

            return res.end(JSON.stringify({
                schema : value.mockGenerator,
                functionNames : Object.keys(value.functions),
                sampleEvent : mockOpts.sampleEvent
            }, null, 3));
        }

        return new Promise( (resolve, reject) => {
            let response = '';

            req.on('data', function(data){
                response += data;
            });

            req.on('end', () => {
                try{
                    resolve(JSON.parse(response));
                }
                catch(e){
                    reject(e);
                }
            });

            req.on('error', (err) => {
                reject(err);
            });
        }).then((body) => {
            let lambdas = require('./lambdas')(Object.assign({
                mockContext : function(){
                    return body.mockData;//this is where ive decided to store my mock data when invoked, could be on headers or what ever you please!
                }
            }, opts, { edge : true }));//need edge

            let lambda = lambdas.pipelines[body.functionName];
                if(!body.event || !body.context){
                    res.statusCode = 400;
                    return res.end(JSON.stringify({
                        code: 400,
                        error: `lambda needs event and context to be invoked`
                    }));
                }
                if (lambda) {
                    console.log('running', body.functionName);
                    let event = body.event;
                    let context = body.context;
                    lambda(event, context, (err, data) => {
                        if (typeof data !== 'string') {
                            data = JSON.stringify(data);
                        }
                        return res.end(data);
                    });
                }
                else {
                    res.statusCode = 404;
                    res.end(JSON.stringify({
                        code: 404,
                        error: `lambda ${body.functionName} could not be found`
                    }));
                }
        }, (err) => {
            res.statusCode = 404;
            res.end(JSON.stringify({
                code: 404,
                error: `lambda could not be found`,
                stack : err.stack
            }));
        });

    });

    server.on('clientError', (err, socket) => {
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    });

    server.listen(port || 1337);

    return server;
};