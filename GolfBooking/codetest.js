const bookingStart = "Please refresh the page at 5:00 PM";
// const bookingStart=document.getElementById("headline").innerText

function getBookingTime(booktime){
    if(booktime.includes("9:30")){

    }
}
function getKeyTime(hh, min, sec, ms) {
    var t930 = new Date();
    t930.setHours(hh);
    t930.setMinutes(min);
    t930.setSeconds(sec);
    t930.setMilliseconds(ms);
    return t930;
}



function getBookingTime(){
    var t930 = new Date();
    var hr = t930.getHours();
    if(hr>9 && hr<17){
        return getKeyTime(17,0,0,0);
    } else return getKeyTime(9,30,0)
}

function getRefreshAt(){
    var myRe = /([0-9]{2}:){2}[0-9]{2}/;
    var myArray = myRe.exec($('#last_update').innerText);
    var strs= myArray[0].split(":");
    var hr=parseInt(strs[0]);
    var min= parseInt(strs[0]);
    var second=parseInt(strs[0]);
}

console.log(getBookingTime());





