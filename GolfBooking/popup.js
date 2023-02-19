// Copyright 2022 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//sleep function

const aiFactor = 500;
const delay = ms => new Promise(res => setTimeout(res, ms));
var currentTab = await chrome.tabs.query({ active: true, currentWindow: true });
var allTabs = await chrome.tabs.query({ currentWindow: true });
var roundTripTime = 0;
const noTab = 30;
let dataStamp = new Date();
var refreshStart = new Date().getTime();
var localCookies = document.cookie;
//set default valuse
if(!localCookies.includes('=')){
   document.cookie='debugmode=false';
   document.cookie='useroundtrip=false';
   document.cookie='delay=500';
} else {
   if(localCookies.includes('debugmode=true')){
    document.getElementById('debugmode').checked=true;
   }
   if(localCookies.includes('useroundtrip=true')){
    document.getElementById('getroundtrip').checked=true;
   }
   document.getElementById('boxInputLag').value=getCookie('delay');
}
let changeColor = document.getElementById("btTest");

chrome.storage.sync.get("color", ({ color }) => {
  changeColor.style.backgroundColor = color;
});

document.getElementById('boxInputLag').addEventListener('change',()=>{
  document.cookie='delay='+document.getElementById('boxInputLag').value;
});

document.getElementById('debugmode').addEventListener('change',()=>{
  if(document.getElementById('debugmode').checked){
    document.cookie='debugmode=true';
  }else {
    document.cookie='debugmode=false';
  }
});
 
document.getElementById('getroundtrip').addEventListener("change", ()=>{
  if(document.getElementById('getroundtrip').checked){
    document.cookie='useroundtrip=true';
  }else {
    document.cookie='useroundtrip=false';
  }
});
document.getElementById("btTest").addEventListener("click", async () => {
  console.log("button clicked!");
  chrome.runtime.sendMessage({ command: "getdelay", refreshat: refreshStart }, function (response) {
    document.getElementById("boxInputLag").value =response.delay;
  });
   
  //document.getElementById("ksclastrefresh").innerText = "Round Trip:" + Math.round(tt);
});
document.getElementById("btRounTrip").addEventListener("click", async () => {
  clearPage();
  document.getElementById("statusMessage").innerText = "Please wait ... ";
  var tt = await loadTime();
  // var tt = await getPerformanceLoadFinish();
  document.getElementById("statusMessage").innerText = "Round Trip:" + Math.round(tt);
  //suggested delay time for autobooking
  document.getElementById("boxInputLag").value = aiFactor + Math.round(tt);
  document.cookie='delay='+document.getElementById("boxInputLag").value;
});
document.getElementById("btAddTabs").addEventListener("click", () => {
  console.log(currentTab[0].url);
  // let queryOptions = { active: true, lastFocusedWindow: true };
  var currentURL = currentTab[0].url;
  for (var i = 0; i < noTab; i++) {
    chrome.tabs.create({ url: currentURL, active: false });
  }
});

document.getElementById("btRefresh").addEventListener("click", refreshAllTab);
document.getElementById("btDeleteTabs").addEventListener("click", removeAllGolfTabs);
document.getElementById("btAutoLogin").addEventListener("click", autoBooking);

// Get the cookie value by name
function getCookie(name) {
  const regex = new RegExp(`(?:(?:^|.*;\\s*)${name}\\s*\\=\\s*([^;]*).*$)|^.*$`);
  return document.cookie.replace(regex, '$1');
}

async function loadTime() {
  var nowTime = new Date().getTime();
  var b4reload = await getPerformanceLoadFinish();
  await chrome.tabs.reload(currentTab[0].id);
  var lt = await getPerformanceLoadFinish();
  while(isNaN(lt) || lt == b4reload){
    await delay(10);
    lt = await getPerformanceLoadFinish();
    console.log("Test: "+ lt);
  }
  return lt - nowTime;
}

async function autoBooking() {
  //check reload time
  var t500 = new Date().setHours(17, 0, 0, 0);
  var t930 = new Date().setHours(9, 30, 0, 0);
  var nowTime = new Date().getTime();
  var booking = t930;
  if (nowTime > t930) booking = t500;
  if (document.getElementById('getroundtrip').checked) {
    document.getElementById("statusMessage").innerText = "Please wait ..";
    var rt1 = await loadTime();
    var rt2 = await loadTime();
    var rt3 = await loadTime();
    rt1 = (rt1 + rt2 + rt3) / 3;
    document.getElementById("boxInputLag").value = aiFactor + Math.round(rt1);
    document.cookie='delay='+document.getElementById("boxInputLag").value;
  }
  var messbox = document.getElementById("statusMessage");
  messbox.innerText = "";
  if (document.getElementById('debugmode').checked) {
    booking = new Date().setMilliseconds(0) + 15000;
  } else {
    var tooEarly = Math.abs(booking - nowTime);
    if (tooEarly > (10 * 60 * 1000)) {
      tooEarly = Math.round(tooEarly / 60000);
      alert("Too early! " + tooEarly + " min");
      return;
    }
  }

  var delaytime = parseInt(document.getElementById("boxInputLag").value);
  document.getElementById('labelStatus').innerText = "Booking Time: " + new Date(booking).toString() + " Queuing Start at: " + new Date().toString();
  var countDown = booking -new Date().getTime();
  messbox.innerText =countDown/1000.0;
  while (countDown>0) {
    messbox.innerText = messbox.innerText + '=';
    if (messbox.innerText.length >40) messbox.innerText =countDown/1000.0;
    if ((booking - new Date().getTime()) < delaytime) {
      refreshStart= new Date().getTime();
      messbox.innerText = "Refresh At: " + new Date().toString() + "--" + refreshStart;
      chrome.tabs.query({ currentWindow: true }, function (tabx) { /* blah */
        tabx.forEach(async tab => {
          chrome.tabs.reload(tab.id);
        });
      });
      break;
    }
    //reserve room for final check traffic
    if (countDown > (delaytime + 2000)) {
      await delay(800);
    } else await delay(10);
    countDown = booking - new Date().getTime();
  }
  await chrome.runtime.sendMessage({ command: "passrefresh", refreshat: refreshStart });
  //must add delay here to avoid window close
  //removeAllGolfTabs();

}
function clearPage() {
  document.getElementById("labelStatus").innerText = "";
  document.getElementById("ksclastrefresh").innerText = "";
  document.getElementById("statusMessage").innerHTML = "";
  document.getElementById("statusMessage").innerText = "";
}

async function removeAllGolfTabs() {
  clearPage();
  var url = currentTab[0].url;
  var currentTabId = currentTab[0].id;
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    var len = tabs.length;
    for (var k = 1; k <= len; k++) {
      if (tabs[len - k].id != currentTabId && tabs[len - k].url.match(/kscgolf|green/) != null)
        chrome.tabs.remove(tabs[len - k].id);
    }
  });
}

async function refreshAllTab() {
  refreshStart = new Date().getTime();
  clearPage();
  chrome.tabs.query({ currentWindow: true }, function (tabx) { /* blah */
    var urlname = currentTab[0].url;
    tabx.forEach(async tab => {
      if (tab.url.includes('kscgolf') || tab.url.includes('green')) {
        chrome.tabs.reload(tab.id);
      }
    });
  });
  await delay(500);
  var lt = await getPerformanceLoadFinish();
  document.getElementById("statusMessage").innerText = "Refresh At: " + new Date(refreshStart).toString() + " -- " + refreshStart;
  document.getElementById("labelStatus").innerText = "Refresh start:" + refreshStart + "  PT Last update : " + lt + "   RTT: " + Math.round(lt - refreshStart);
  await chrome.runtime.sendMessage({ command: "passrefresh", refreshat: refreshStart });
}
async function getPerformanceLoadFinish() {
  var docTime = await chrome.scripting.executeScript({
    target: { tabId: currentTab[0].id },
    func: getLoadFinishTime
  }); 
  console.log("DocTime: " + docTime[0].result);
  return docTime==null?0:parseInt(docTime[0].result);
}

async function getPerformanceLoadFinishOld() {
  chrome.scripting.executeScript({
    target: { tabId: currentTab[0].id },
    func: getLoadFinishTime
  }).then((result) => {
    console.log("LoadEventEnd: " + result[0].result);
    roundTripTime = result == null ? 0 : parseInt(result[0].result);
  });
}

//get the time to refresh current tab
async function getRoundTrip() {
  dataStamp = new Date();
  var counter = 0;
  //reload here
  roundTripTime = 0;
  while (roundTripTime == 0 && counter < 4) {
    counter++;
    chrome.tabs.reload(currentTab[0].id);
    //await delay(500);
    chrome.scripting.executeScript({
      target: { tabId: currentTab[0].id },
      func: getLoadFinishTime
    }).then((result) => {
      roundTripTime = result == null ? 0 : parseInt(result[0].result) - dataStamp.getTime();
    });
    //await delay(500);
  }
}
function setContentRefreshTime(timeStr) {
  document.getElementById('last_update').innerText = 'Last update:' + timeStr;
}
//content function end here
function getRTT() {
  var p = performance.timing.toJSON();
  var keys = Object.keys(p);
  var allTimes = new Array();
  keys.forEach(x => allTimes.push({ 'tag': x, 'time': p[x] }));
  allTimes.sort((a, b) => a.time - b.time);
  console.log("Log time start")
  for (let ele of allTimes) {
    console.log(ele.tag + ": " + new Date(ele.time).toString());
  }
  return performance.timing.loadEventEnd - performance.timing.navigationStart;
}

async function getLoadFinishTime() {
  console.log("performance.timing.loadEventEnd: " + performance.timing.loadEventEnd);
 var counter=0;
  while(performance.timing.loadEventEnd<=0) {
    await delay(10);
    counter++;
    console.log("Wait.." + counter  );
  }
  return performance.timing.loadEventEnd;
}
function getRTTByCount() {
  const touchInline = (x) => {
    var req = new XMLHttpRequest();
    req.open('GET', x + "?" + new Date().getTime(), false);
    req.send(null);
    return new Date(req.getResponseHeader('date')).getTime();
  }
  var url = document.location.href + '?' + new Date().getTime();
  //test for 5 seconds at most
  var startAt = new Date().getTime();
  var lap = 0;
  var lastTouch = touchInline(url);
  var counter = 0;
  var rtt = 100000;
  console.log("Start At: " + startAt + "   Last Touch: " + lastTouch);
  for (var i = 0; i < 30; i++) {
    counter++;
    var touchAt = touchInline(url);
    if (touchAt != lastTouch) {
      if (lap > 0) {//lap 1 finish and exit
        console.log("Counter : " + counter)
        rtt = 1.0 / counter;
        break;
      } else {
        lastTouch = touchAt;
        lap++;
      }
      counter = 0;
    }
  }
  rtt = (new Date().getTime() - startAt) / 30.0;
  console.log("Rount Trip Time: " + rtt)
  return rtt;
}

async function switchTab(ctab){
  chrome.tabs.query({currentWindow: true}, tabs => {
    var ind = tabs.findIndex(tab=>tab.id===ctab.id);
    var nexttab = ind==tabs.length-1?tabs[0]: tabs[ind+1];
    chrome.tabs.update(nexttab.id, { active: true });
    console.log("Tab id"+ ctab.id + "   Index: " + ind)
    // tabs.forEach(tab => {

    // });
  });
}



