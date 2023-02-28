let color = "#3aa757";

let cycleTime = { refresh: 0, commitstart: 0, commitfinish: 0, performancestart: 0, performancefinish: 0 };
let queryInfo = {
    currentWindow: true, url: [
        '*://*.kscgolf.org.hk/*',
        '*://kscgolf2.noq.com.hk/*',
        '*://*.myqnapcloud.com/*']
};
var tabsInAction = 0;
var golfTabs = [];
var recommendation = 7000;
var bookingTime = 0;
var codeAfterReload = [];
var onCommittedTimeStamp = [];
var lastupdate = [];
var report = "";
const delay = ms => new Promise(res => setTimeout(res, ms));
const compareTime = (a, b) => a.timestamp - b.timestamp;

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "tabwalkright",
        title: "Booking Refresh",
    });
    chrome.contextMenus.create({
        id: "autoTabWalk",
        title: "Booking Tab walk"
    });
    chrome.contextMenus.create({
        id: "autoBook",
        title: "Booking Auto"
    });
});



//this callback is used to handle request from popup, it should be call before a full refresh
//the timestamp for the 1st tab and last tab is return 
chrome.runtime.onMessage.addListener(async (request, sender, reply) => {
    if (request.command == "getdelay") {
        getRecommendation();
        reply({ delay: recommendation });
    } else if (request.command == "passrefresh") {
        console.log('Refresh all start at:' + new Date(request.refreshat) + "  " + request.refreshat);
        cycleTime.refresh = request.refreshat;
    }
    return true;
});

var tabStart = 0;
chrome.tabs.onActivated.addListener(async (details) => {
    if (onCommittedTimeStamp.length > 0 && tabStart > 0) {
        var tab = await chrome.tabs.get(details.tabId);
        await getTabLoadFinish(tab);
        await delay(10);
        var lastindex = onCommittedTimeStamp.length - 1;
        if (details.tabId == onCommittedTimeStamp[lastindex].id) {
            tabStart = 0;
            console.log('Tab Walk End');
        }
        tabWalk(tab);
    }
});

//key short cut to create short cut
chrome.commands.onCommand.addListener(async (command) => {
    test = (arg) => {
        var bodyhead = document.getElementsByTagName('Body')[0];
        bodyhead.innerHTML = '<H3>' + arg + '</H3>';
    };
    var atab = await getAllTabs();
    var alltabs = atab.tabs;
    var ind = alltabs.findIndex(x => x.active);

    var docTime = await chrome.scripting.executeScript({
        target: { tabId: alltabs[ind].id },
        func: test,
        args: [report]
    });
});
chrome.contextMenus.onClicked.addListener(async function (info, tab) {
    if (info.menuItemId == 'tabwalkright') {
        tabStart = 0;
        var atabs = await getAllTabs();
        await refreshAllTabsWait(atabs.tabs);
    } else if (info.menuItemId == 'autoTabWalk') {
        report = "";
        tabStart = 0;
        var atabs = await getAllTabs();
        await allRoundDataExtraction(atabs.tabs, atabs.currentTab);
    } else if (info.menuItemId == 'autoBook') {
        autoBookingWS();
    }
});
async function allRoundDataExtraction(alltabs, tab) {
    console.log('Start tab walk');
    //try to use promise
    tabsInAction = alltabs.length;
    var ind = alltabs.findIndex(x => x.active);
    if (tab == null) {
        console.log('Tabs is null in allRoundDataExtraction');
        tab = alltabs[ind];
    }
    onCommittedTimeStamp = [];
    lastupdate = [];
    for (const t of alltabs) {
        onCommittedTimeStamp.push({ id: t.id, timestamp: 0 });
    }
    //active tab may not be the 1st element
    var ind = onCommittedTimeStamp.findIndex(data => data.id === tab.id);
    tabStart = onCommittedTimeStamp[0].id;
    if (ind != 0) {
        chrome.tabs.update(onCommittedTimeStamp[0].id, { active: true });
    } else {
        await getTabLoadFinish(tab);
        await tabWalk(tab);
    }
    //tab change call will push data to lastupdate
    //wait until it is full loaded
    while (lastupdate.length < tabsInAction) {
        await delay(100);
    }
    getRecommendation();
    return true;
}
async function getTabLoadFinish(tab) {
    if (tab.url.match(/kscgolf|green/) != null) {
        var bt = await getPerformanceLoadFinish(tab);
        while (bt == null) {
            bt = await getPerformanceLoadFinish(tab);
        }
        //add x to indicate it is from displayed second, no x means extract from millisecond
        var sec = bt.lastupdate < 0 ? new Date(bt.connectStart).getSeconds() : 'x' + bt.lastupdate;
        var htmlstr = "<p>" + "Tab id " + tab.id + "  Connnect: " + bt.connectStart + "   Finish: " + bt.loadEventEnd + "  Sec: " + sec + "</p>\n";
        report = report + htmlstr;
        console.log("Tab id " + tab.id + "  Connnect: " + bt.connectStart + "   Finish: " + bt.loadEventEnd + "  Sec: " + sec);
        var ind = lastupdate.findIndex(data => data.id === tab.id);
        if (ind < 0) lastupdate.push({ 'id': tab.id, connectStart: bt.connectStart, 'loadfinish': bt.loadEventEnd, 'sec': sec });
        else {
            lastupdate[ind].connectStart = bt.connectStart;
            lastupdate[ind].loadfinish = bt.loadEventEnd;
            lastupdate[ind].sec = sec;
        }
    }
    return true;
}
async function addToClipboard(value) {
    await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: [chrome.offscreen.Reason.CLIPBOARD],
        justification: 'Write text to the clipboard.',
    });
    // Now that we have an offscreen document, we can dispatch the
    // message.
    chrome.runtime.sendMessage({
        type: 'copy-data-to-clipboard',
        target: 'offscreen-doc',
        data: value,
    });
}

async function getLoadFinishTime() {
    console.log("performance.timing.loadEventEnd: " + performance.timing.loadEventEnd);
    while (performance.timing.loadEventEnd <= 0) await delay(100);
    var lastupdateEle = document.getElementById('last_update');
    //domLoading connectStart domComplete domContentLoadedEventEnd
    var sec = new Date(performance.timing.domComplete).getSeconds();
    var result = { connectStart: performance.timing.domComplete, loadEventEnd: performance.timing.loadEventEnd, lastupdate: -1 };
    if (lastupdateEle != null) {
        var matches = lastupdateEle.innerText.match(/[^:]*(?=\s(AM|PM))/);
        if (matches != null && matches[0].match(/^-?\d+\.?\d*$/g) != null) {
            result.lastupdate = parseInt(matches[0]);
        }
    }
    return result;
}

//this run inside the act tab document
async function getPerformanceLoadFinish(tab) {
    var docTime = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: getLoadFinishTime
    });
    // console.log("DocTime: " + docTime[0].result);
    return docTime == null ? { loadEventEnd: 0, lastupdate: 0 } : docTime[0].result;
}


function clearArrays() {
    codeAfterReload = [];
    onCommittedTimeStamp = [];
    lastupdate = [];
}

function setPush(arr, ele) {
    var ind = arr.findIndex(data => data.id === ele.id);
    if (ind < 0) {
        arr.push(ele);
    } else {
        var allkeys = Object.keys(ele);
        for (const obj of allkeys) {
            arr[ind][obj] = ele[obj];
        }
    }
}



async function tabWalk(ctab) {
    if (golfTabs == null || golfTabs.length == 0) {
        var atabs = await getAllTabs();
        golfTabs = atabs.tabs;
    }
    var ind = golfTabs.findIndex(tab => tab.id === ctab.id);
    // console.log('tab walk id: ' + ind);
    ind = ind < 0 || ind == golfTabs.length - 1 ? 0 : ind + 1;
    chrome.tabs.update(golfTabs[ind].id, { active: true });
    return ind;
}//, "link", "typed", "generated"

async function refreshAllTab() {
    clearArrays();
    report = "";
    console.log('Refresh All Tabs');
    cycleTime.refresh = Date.now();

    var tabs = await chrome.tabs.query(queryInfo);
    if (tabs == null || tabs.length == 0) {
        console.log("Fail to refresh all tabs");
        return false;
    }
    golfTabs = tabs;
    tabsInAction = tabs.length;
    tabs.forEach(async tab => {
        if (tab.url.includes('kscgolf') || tab.url.includes('green')) {
            chrome.tabs.reload(tab.id);
        }
    });
    await delay(500);
}

async function checkTimeStamp() {
    return performance.timing.domComplete;
}

async function refreshAllTabsWait(tabs) {
    //switch to last tab
    clearArrays();
    report = "";

    cycleTime.refresh = Date.now();
    golfTabs = tabs;
    tabsInAction = tabs.length;
    console.log('Before script: ' + Date.now());
    await chrome.tabs.update(tabs[tabs.length - 1].id, { active: true });
    var result = await chrome.scripting.executeScript({
        target: { tabId: tabs[tabs.length - 1].id },
        func: checkTimeStamp
    });
    timestamp = result[0].result;
    console.log("Refresh At TimeStamp:  " + Date.now());
    for (let tab of tabs) {
        chrome.tabs.reload(tab.id);
    }
    var checktime = 0;
    while (checktime <= timestamp) {
        await delay(10);
        result = await chrome.scripting.executeScript({
            target: { tabId: tabs[tabs.length - 1].id },
            func: checkTimeStamp
        });
        checktime = result == null ? 0 : result[0].result;
    }
    await chrome.tabs.update(tabs[0].id, { active: true });
    await delay(10);
    await allRoundDataExtraction(tabs, tabs[0]);
    return true;
}

function getRecommendation() {
    if (lastupdate.length > 2) {
        var midvalue = lastupdate[Math.round(6 * lastupdate.length / 10)].connectStart;
        recommendation = midvalue - cycleTime.refresh;
    } else {
        console.log('Warning: system unable provide recommenation. Default is used.');
        recommendation = 7000;
    }
    console.log("Recommendation:  " + recommendation);
}

async function warningMessage(mes) {
    var act = await getAllTabs();
    mess = (arg) => {
        alert(arg);
    };
    var docTime = await chrome.scripting.executeScript({
        target: { tabId: act.currentTab.id },
        func: mess,
        args: [mes]
    });
}

function setBookingTime() {
    const t500 = new Date().setHours(17, 0, 0, 0);
    const t930 = new Date().setHours(9, 30, 0, 0);
    var nowTime = Date.now();
    var booking = t930;
    if (nowTime > t930) booking = t500;
    nowTime = Date.now();
    var tooEarly = Math.abs(booking - nowTime);
    if (tooEarly > (10 * 60 * 1000) || nowTime > booking) {
        console.log('Not in booking range, system run in debug mode');
        console.log("Official booking target time: " + new Date(booking) + "  " + booking);
        console.log()
        booking = new Date().setMilliseconds(0) + 20000;
    }
    return booking;
}



async function autoBookingWS() {
    //check reload time
    // var t500 = new Date().setHours(17, 0, 0, 0);
    // var t930 = new Date().setHours(9, 30, 0, 0);
    var t500 = new Date().setHours(17, 0, 0, 0);
    var t930 = new Date().setHours(9, 30, 0, 0);
    var nowTime = Date.now();
    var booking = t930;
    if (nowTime > t930) booking = t500;

    var tabq = await getAllTabs();
    golfTabs = tabq.tabs;
    var tab = tabq.currentTab;
    await refreshAllTabsWait(golfTabs);
    var speed = recommendation + 3;
    nowTime = Date.now();
    var tooEarly = Math.abs(booking - nowTime);
    if (tooEarly > (10 * 60 * 1000) || nowTime > booking) {
        console.log('Not in booking range, system run in debug mode');
        console.log("Official booking target time: " + new Date(booking) + "  " + booking);
        booking = new Date().setMilliseconds(0) + 15000;
        speed = 13000;
        if (recommendation > 5000) {
            booking = new Date().setMilliseconds(0) + 20000;
            speed = 18000;
        }
        await warningMessage("Debug mode!!!");
        // await delay(2000);
    }
    bookingTime = booking;
    console.log("Booking target time: " + new Date(booking) + "  " + booking);
    //do the refresh and walk through to calate the traffic close to booking
    var actualStart = Math.abs(booking - nowTime);
    //refresh and walk through 7 sec before booking
    var reloadStart = actualStart - speed;
    console.log("1st reload after: " + reloadStart / 1000.0);
    // setTimeout(refreshAllTab, reloadStart);
    setTimeout(() => {
        Promise.resolve(refreshAllTabsWait(tabq.tabs)).then(result => {
            if (!result) {
                console.log("AutoBooking will  be fail!!!");
            }
            var timeout = bookingTime - Date.now() - recommendation;
            if (timeout < 0) {
                console.log("Fail in auto booking, refresh time out!");
                console.log("Rebuild will tabe action now");
                timeout = 10;
            }
            setTimeout((x) => {
                bookingTime = 0;
                refreshAllTabsWait(x);
            }, timeout, tabq.tabs);
            console.log('Booking target: ' + new Date(bookingTime));
        });
    }, reloadStart);
    setCountDownBadge();
    console.log('All set, good luck!');

}

function setCountDownBadge() {
    if (bookingTime == 0) {
        chrome.action.setBadgeText({text:''});
    } else {
        var cd = (Math.round((bookingTime - Date.now()) / 100) / 10).toString();
        chrome.action.setBadgeText({
            text: cd,
        });
        setTimeout(setCountDownBadge, 50)
    }
    
}
async function getAllTabs() {
    let atabs = await chrome.tabs.query({ active: true});
    let activeTab = null; 
    for (var t of atabs) {
        if (t.url.match(/kscgolf|green/i) != null) activeTab = t;
    }
    let tabs = await chrome.tabs.query({});
    var windowid = activeTab.windowId;
    var result = [];
    for (var t of tabs) {
        if (t.url.match(/kscgolf|green/i) != null && t.windowId == windowid) result.push(t);
    }
    golfTabs = result;
    return { tabs: result, currentTab:activeTab };
}


