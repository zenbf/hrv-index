exports.handler = (event, context, callback) => {
    var util = require('./utility');
    var AWS = require('aws-sdk');
    var s3 = new AWS.S3();
    
    var params = { 
        Bucket: 'info.zenbf.org'
    }
    s3.listObjectsV2(params, function (err, data) {
        if(err) {
            callback(err);
            return;
        }   
        
        //console.log(Array.isArray(data.Contents))
        data.Contents.forEach(function(s) {
            //console.log(s);
            let key = s.Key;
            console.log(key);
            
            s3.getObject({
                    Bucket: 'info.zenbf.org',
                    Key: key
                }, function(err, data) {
                    if (err) {
                        console.log(err, err.stack);
                        return;
                        //callback(err);
                    } else {
                        let lines = data.Body.toString('ascii').split(/\r?\n/);
                        console.log("number of lines=", lines.length);
            
                        let text = util.extractCSV(lines);   

                        if (text === '') {
                            console.log("Email has no csv");
                            //callback(error);
                            return;
                        }
                        let buff = new Buffer(text, 'base64');
                        let csv = buff.toString('ascii');
                        
                        let rows = csv.split(/\r?\n/);
                        let avg = util.computeAvg(rows);
                        if (avg.hr == 0 || avg.motion ==0 || avg.sdnn == 0) {
                            console.log("avg has no data", avg);
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
                    }
                });    
           
          
            
        });


        callback();
    });
    

  
};






