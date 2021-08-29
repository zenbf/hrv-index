exports.handler = (event, context, callback) => {

    var util = require('./utility');
    var AWS = require('aws-sdk');
    var s3 = new AWS.S3();
    var v1_filename = "community_baseline";
    var v2_filename = "community_baseline_v2";
    var public_bucket = "zenbf.org";
    var bucket = event.Records[0].s3.bucket.name;
    var key = event.Records[0].s3.object.key;
    var rows;
    
    console.log('bucket =', bucket);
    console.log('object key =', key);
    
    s3.getObject({
        Bucket: bucket,
        Key: key
    }, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            callback(err);
        } else {
            let lines = data.Body.toString('ascii').split(/\r?\n/);
            console.log("number of lines=", lines.length);
            
            let text = util.extractCSV(lines);   

            if (text === '') {
                let error = new Error("Email has no csv");
                callback(error);
                return;
            }
            var csv;
            if (! text.startsWith("start,")) {
                console.log("base64-2");
                let buff = new Buffer(text, 'base64');
                csv = buff.toString('ascii');
            } else {
                console.log("text-2")
                csv = text; 
            }
            //console.log("csv", csv);
            rows = csv.split(/\r?\n/);
            console.log("csv lines = " + rows.length);
            let avg = util.computeAvg(rows);
            if (avg.hr == 0 || avg.motion ==0 || avg.sdnn == 0) {
                console.log("avg has no data", avg);
                let error = new Error("avg has no data");
                callback(error);
                return;
            }
            
            let params = {
                    Bucket : 'csv.zenbf.org',
                    Key : key,
                    Body : csv
            };
        
            s3.putObject(params, function(err, response) {
                    if (err) { 
                            console.log("error", err, err.stack); // an error occurred
                            return;
                    }
            });
            
            
            s3.getObject({
                    Bucket: public_bucket,
                    Key: v1_filename
                        }, function(err, data) {
                            if (err) {
                                console.log(err, err.stack);
                                callback(err);
                            } else {
                                let v1 = JSON.parse(data.Body.toString('ascii'));
                                //console.log(v1);
                                v1.hr = (v1.hr * v1.count + avg.hr) / (v1.count + 1);
                                v1.sdnn = (v1.sdnn * v1.count + avg.sdnn) / (v1.count + 1);
                                v1.motion = (v1.motion * v1.count + avg.motion) / (v1.count + 1);
                                v1.count++;
                                console.log("baseline", v1);
                                let params = {
                                                Bucket : public_bucket,
                                                Key : v1_filename,
                                                Body : JSON.stringify(v1),
                                                ACL: "public-read",
                                                ContentType: "application/json"
                                            };
        
                                s3.putObject(params, function(err, response) {
                                if (err) { 
                                    console.log("error", err, err.stack); // an error occurred
                                    callback(err);
                                }
                                else     
                                    console.log("success", response);           // successful response
                                    callback();
                                });   
                                
                                
                            }
            });
            
            let avgM = util.computeAvgPerMin(rows);
            //console.log(avgM);
            s3.getObject({
                    Bucket: public_bucket,
                    Key: v2_filename
                        }, function(err, data) {
                            if (err) {
                                console.log(err, err.stack);
                                callback(err);
                            } else {
                                let v2 = JSON.parse(data.Body.toString('ascii'));
                                //console.log(v2);
                                
                                for(let inx = 0; inx < v2.count.length; inx++) {
                                    if (avgM.count[inx] != 0) {
                                        v2.hr[inx] = (v2.hr[inx] * v2.count[inx] + avgM.hr[inx]) / (v2.count[inx] + 1);
                                        v2.sdnn[inx] = (v2.sdnn[inx] * v2.count[inx] + avgM.sdnn[inx]) / (v2.count[inx] + 1);
                                        v2.motion[inx] = (v2.motion[inx] * v2.count[inx] + avgM.motion[inx]) / (v2.count[inx] + 1);
                                        v2.count[inx]++;
                                    }
                                }
                                
                                console.log("baseline v2 ", v2);
                                let params = {
                                                Bucket : public_bucket,
                                                Key : v2_filename,
                                                Body : JSON.stringify(v2),
                                                ACL: "public-read",
                                                ContentType: "application/json"
                                            };
        
                                s3.putObject(params, function(err, response) {
                                if (err) { 
                                    console.log("error", err, err.stack); // an error occurred
                                    callback(err);
                                }
                                else     
                                    console.log("success", response);           // successful response
                                    callback();
                                });
                            }
            });
            
        }
    });
};






