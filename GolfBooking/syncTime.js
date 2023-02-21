const delay = ms => new Promise(res => setTimeout(res, ms));
async function calculateTimeOffset() {
    // get the current computer time
    const currentTime = new Date();
    // use NodeJS's https module to get public clock
    let publicClockTime;
    let publicTimeOffset=null;
    require('https').get('https://time.is/UTC', (res) => {
        let body = '';
        res.on('data', (chunk) => {
            body += chunk;
        });
        res.on('end', () => {
            var splitString = body.split(" ");
            if (splitString[5] === 'PM') {
                publicClockTime = parseInt(splitString[4].split(":")[0]) + 12;
            } else {
                publicClockTime = parseInt(splitString[4].split(":")[0]);
            }
            publicTimeOffset = publicClockTime - currentTime.getHours();
        });
    });
    var timestamp = Date.now();
    while(publicTimeOffset==null){
        await delay(100);
        if((Date.now()-timestamp)>10000) {
            break;
        }
    }
    return publicTimeOffset;
}
console.log("Start");
 calculateTimeOffset().then(res=>{
    console.log(res);
 });
 
