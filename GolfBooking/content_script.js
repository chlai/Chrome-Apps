
//automatic booking procedure


function delayHere(ms) {
    return new Promise(res => setTimeout(res, ms));
}
// findNclick();
if(isLoginPage()){
    alert("Login page");
    findNclick();
    enterWaitingRoom();
}else if(isBookingOptionPage()){
    alert("Booking options");
    enterWaitingRoom();
}else{
    alert("Booking automatino fail, no ksc page created")
}
function findNclick() {
    var btnLogin_001 = document.getElementsByClassName("login-btn");
    if (btnLogin_001 != null && btnLogin_001.length > 0) {
        var inputUserName = document.getElementById("username");
        var inputPwd = document.getElementById("hu8381mk");
        inputUserName.innerText="162552210";
        btnLogin_001[0].click();
    } else {
        //alert("No login button in this page");
        console.log("No login button in this page");
    }
};

function isBookingOptionPage(){
    var eleWaitingRoom = document.querySelector("[href='/upcomingBooking']");
    return eleWaitingRoom!=null;    
}

function isLoginPage(){
    return document.URL.includes('login');
}



