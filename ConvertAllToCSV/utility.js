module.exports = {
   initV1: function (baseline) {

      baseline.count = 0;
      baseline.hr = 0;
      baseline.sdnn = 0;
      baseline.motion = 0;
    
     return baseline;
    },
    extractCSV: function(lines)  {
        let text = '';
        for (var i = 0; i < lines.length; i++) { 
                if (lines[i].startsWith("X-Attachment-Id")) {
                   i = i + 2;  //skip to the beginning of the csv file
                   for (var j = i; j < lines.length; j++) {
                       if (lines[j].startsWith("--"))
                            break;
                       else {    
                         text += lines[j];
                         i++;
                       }
                   }
                   break;
                }
                   
        } 
        return text;
    },
    
    getSum: function(average, row) {
        let fields = row.split(",");
        if (fields.length == 6) {
            average = JSON.parse(average);
            average.hr += parseFloat(fields[3]);
            average.sdnn += parseFloat(fields[4]);
            average.motion += parseFloat(fields[5]);
        }
        
        return JSON.stringify(average);
    },
    
    computeAvg: function (rows) {
        let average = new Object();
        average.hr = 0;
        average.sdnn = 0;
        average.motion = 0;
        try {
           average = rows.reduce(module.exports.getSum, JSON.stringify(average));
        } catch(err) {
            console.log("Not able to reduce");
            return average;
        }
        average = JSON.parse(average);  
        //Hack:  In some cases it requires the parse twice...
        if ((typeof average) == "string")
            average = JSON.parse(average);
        
        if (rows.length > 1) {
            average.hr = average.hr / (rows.length - 1); 
            average.sdnn = average.sdnn / (rows.length - 1);
            average.motion = average.motion / (rows.length - 1);
        }
        return average;
    },

    computeAvgPerMin: function (rows) {
        let avgM = new Object();
        avgM.count = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
        avgM.hr = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
        avgM.sdnn = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
        avgM.motion = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
 
        const interval = 60; //60 seconds
        const number_of_minutes = 30;
        let current = 0;   
        let inx = 0;
        let max = (rows.length > 1800) ? 1800 : rows.length;
        while(inx < max) {
            let sub = rows.slice(inx, inx + interval);
            if (sub.length == interval) {
                let avg = module.exports.computeAvg(sub);
            
                avgM.hr[current] = ((avgM.hr[current] * avgM.count[current]) + avg.hr) / (avgM.count[current] + 1);
                avgM.sdnn[current] = ((avgM.sdnn[current] * avgM.count[current]) + avg.sdnn) / (avgM.count[current] + 1);
                avgM.motion[current] = ((avgM.motion[current] * avgM.count[current]) + avg.motion) / (avgM.count[current] + 1);
                avgM.count[current]++;
                current++;
            }
                
            inx += interval;
        }       
    
        return avgM;
    }

};