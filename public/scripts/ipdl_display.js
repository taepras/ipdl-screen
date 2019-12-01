const STATUS_OPEN_DEFAULT = true;
const STATUS_OPEN = {
    '[class]': false,
    '[event]': false,
    '[closed]': false,
    '[meeting]': true
};
const EVENT_TAGS_TO_SHOW = ['[event]', '[meeting]'];
const MAX_UPCOMING_EVENTS = 5;
const MAX_FEATURED_EVENTS = 3;

const monthNames = [
    "Jan", "Feb", "Mar", "Apr",
    "May", "Jun", "Jul", "Aug",
    "Sep", "Oct", "Nov", "Dec"
];

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

window.isLabOpen = false;



let featuredEventTemplate = Handlebars.compile(document.getElementById('template-featured-event').innerHTML);
let upcomingEventsTemplate = Handlebars.compile(document.getElementById('template-upcoming-event').innerHTML);



fetchCalendar();
fetchWeather();
fetchImages();
updateDateTime();
setInterval(fetchCalendar, 300000);     // 5 minutes interval
setInterval(fetchWeather, 600000);      // 10 minutes
setInterval(updateDateTime, 1000);      // 1 seconds
// setInterval(changeImage, 30000);        // 30 seconds



function fetchCalendar() {
    axios("/calendar").then(function(res) {
        let now = new Date();
        let isEventMatched = false;

        // check if lab is open
        let isOpen = true;  
        let isEventOngoingNow = false;      
        
        console.log(res.data);
        let eventsArr = res.data
            .filter(e => e.type.toLowerCase() == 'vevent')
            // .filter(e => !e.exdate)

        
        // eventsArr.forEach(function (e) { 
        //     console.log(RRule.fromString(e.rrule.rruleString));
        // });

        for (let i in eventsArr) {
            let event = eventsArr[i];
            if (new Date(event.start) <= now && now <= new Date(event.end)) {
                let isOpenThisEvent = isLabOpenForEvent(event);
                isOpen = isOpen && isOpenThisEvent;
                isEventOngoingNow = true;
            }
        }

        if (!isEventOngoingNow)
            isOpen = false;

        window.isLabOpen = isOpen;
        document.getElementById("fill-the-lab-is").innerHTML = isOpen ? 'NOW OPEN' : 'CLOSED';

        listUpcomingEvents(eventsArr);
        showFeaturedEvent(eventsArr);
        compileHours(eventsArr); // get the array
    });
}

function compileHours(events) {
    var today = new Date();
    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0);
    var nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(23);
    nextWeek.setMinutes(59);
    nextWeek.setSeconds(59);

    let eventsThisWeek = events
        .filter(e => today <= new Date(e.end) && new Date(e.start) <= nextWeek)
        .filter(e => isLabOpenForEvent(e));
    eventsThisWeek.sort((a, b) => new Date(a.start) - new Date(b.start));

    let hoursByDay = [[], [], [], [], [], [], []];    // 7 days
    for (let i in eventsThisWeek) {
        // assumes no overnight events
        let startDt = new Date(eventsThisWeek[i].start);
        let endDt = new Date(eventsThisWeek[i].end);
        console.log(startDt, endDt, eventsThisWeek[i]);
        hoursByDay[startDt.getDay()].push([startDt, endDt, eventsThisWeek[i]]);
    }
    
    for (let d in hoursByDay) {
        console.log(hoursByDay[d]);
        hoursByDay[d] = mergeRanges(hoursByDay[d]);
    }

    let hoursElem = document.querySelectorAll(`.fill-lab-hours`);
    for (let i in hoursElem) {
        if (!hoursElem[i] || !hoursElem[i].id) continue;
        let d = hoursElem[i].id.substring(hoursElem[i].id.length - 1);
        console.log(hoursByDay, d)
        hoursElem[i].innerHTML = hoursByDay[d].length
            ? hoursByDay[d]
                  .map(t => `${toShortAmPm(t[0])}-${toShortAmPm(t[1])}`)
                  .join("<br>&nbsp;&nbsp;&nbsp;&nbsp;")
            : "closed";
    }

    document.getElementById("fill-lab-hours-from-date").innerHTML = `${today.getMonth() + 1}/${today.getDate()}`
    document.getElementById("fill-lab-hours-to-date").innerHTML = `${nextWeek.getMonth() + 1}/${nextWeek.getDate()}`

    document.querySelectorAll('.u-day').forEach(function (el) {
        if (el.id == `u-day-${today.getDay()}`) 
            el.classList.add('today');
        else
            el.classList.remove('today');
    });
}

function listUpcomingEvents(events) {
    //list upcoming events
    let now = new Date();
    let eventStrings = [];
    let eventsToShow = events
        .filter(d => now < new Date(d.end))
        .filter(shouldListEvent);

    eventsToShow.sort((a, b) => new Date(a.start) - new Date(b.start));
    eventsToShow = eventsToShow.slice(0, MAX_UPCOMING_EVENTS);

    document.getElementById('fill-upcoming-events').innerHTML = upcomingEventsTemplate({
        events: eventsToShow.map(function (e) {
            let start = new Date(e.start);
            let end = new Date(e.end);
            return {
                startDate: `${monthNames[start.getMonth()]} ${start.getDate()}`,
                duration: `${toShortAmPm(start)}-${toShortAmPm(end)}`,
                summary: `${stripTag(e.summary)}`
            }
        })
    });
}


function showFeaturedEvent (events) {
    //list upcoming events
    let now = new Date();
    let eventsByDate = events
        .filter(d => now < new Date(d.end))
        .filter(shouldListEvent);
        
    eventsByDate.sort((a, b) => new Date(a.start) - new Date(b.start));
    let slideShowMainHtml = '';
    let featuredEvents = eventsByDate.slice(0, MAX_FEATURED_EVENTS);
    for (let i in featuredEvents) {
        let featuredEvent = featuredEvents[i];
        let start = new Date(featuredEvent.start);
        let end = new Date(featuredEvent.end);
        let imgUrl = featuredEvent.attach.val;
        let thumbnailGDriveId = imgUrl.substring(imgUrl.indexOf('/file/d/') + '/file/d/'.length, imgUrl.indexOf('/view'));
        let thumbnailUrl = `https://drive.google.com/uc?export=view&id=${thumbnailGDriveId}`
        let featuredEventElemString = featuredEventTemplate({
            summary: stripTag(featuredEvent.summary),
            description: featuredEvent.description,
            thumbnail_url: thumbnailUrl,
            month: monthNames[new Date(featuredEvent.start).getMonth()],
            date: new Date(featuredEvent.start).getDate(),
            time: `${toShortAmPm(start)}-${toShortAmPm(end)}`
        });

        console.log(featuredEvent);
        slideShowMainHtml += featuredEventElemString;
    }

    if (featuredEvents.length <= 0) {
        document.getElementById('slideshow-main').classList.add('slideshow-sub');
        document.getElementById('slideshow-main').innerHTML = '';
        if (document.getElementById('slideshow-main').childNodes.length <= 0) {
            fetchImages();
        }
    } else {
        document.getElementById('slideshow-main').classList.remove('slideshow-sub');
        document.getElementById('slideshow-main').innerHTML = slideShowMainHtml;
    }
}

function stringToDom(text, nodeType = 'div') {
    var node = document.createElement(nodeType);
    node.appendChild(document.createTextNode(text));
    return node.firstChild;
}

function shouldListEvent (event) {
    for (let i in EVENT_TAGS_TO_SHOW) {
        let tag = EVENT_TAGS_TO_SHOW[i]
        if (event.summary.toLowerCase().trim().indexOf(tag) == 0) {
            return true;
        }
    }
    return false;    
}

function isLabOpenForEvent (event) {
    if (event.transparency.toLowerCase() == 'transparent')
        return true;
    for (let s in STATUS_OPEN) {
        if (event.summary.toLowerCase().trim().indexOf(s) == 0) {
            return STATUS_OPEN[s];
        }
    }
    return STATUS_OPEN_DEFAULT;
}

function stripTag (eventName) {
    return eventName.substring(eventName.indexOf(']') + 1).trim();
}

function toShortAmPm(date) {
    let amPmHour = date.getHours() % 12;
    if (amPmHour == 0) amPmHour = 12;
    let amPmTime =
        amPmHour + (date.getMinutes() != 0 ? ":" + date.getMinutes() : "");
    let time = `${amPmTime}${date.getHours() < 12 ? "a" : "p"}`;
    return time;
}

function mergeRanges(ranges) {
    var result = [],
        last;

    ranges.forEach(function(r) {
        if (!last || r[0] > last[1]) result.push((last = r));
        else if (r[1] > last[1]) last[1] = r[1];
    });

    return result;
}

function fetchWeather() {
    function kelvinToCelcius(x) {
        return x - 273.15;
    }
    function celciusToFahrenheit(x) {
        return (x / 5) * 9 + 32;
    }
    axios("/weather").then(function(res) {
        let time = new Date(res.data.dt);
        let tempC = kelvinToCelcius(res.data.main.temp);
        let tempF = celciusToFahrenheit(tempC);
        
        let icon = "☀";
        if (res.data.weather[0].main.toLowerCase() == "clear") icon = "☀";
        else if (res.data.weather[0].main.toLowerCase() == "clouds")
            icon = "⛅";
        else if (res.data.weather[0].main.toLowerCase() == "snow") icon = "❄️";
        else if (res.data.weather[0].main.toLowerCase() == "rain") icon = "🌧️";
        else if (res.data.weather[0].main.toLowerCase() == "drizzle")
            icon = "🌧️";
        else if (res.data.weather[0].main.toLowerCase() == "thunderstorm")
            icon = "🌩️";
        else icon = "🌪";

        document.getElementById("fill-weather-f").innerHTML = Math.round(tempF);
        document.getElementById("fill-weather-c").innerHTML = Math.round(tempC);
        document.getElementById("fill-weather-icon").innerHTML = icon;
    });
}

function updateDateTime() {
    let now = new Date();
    document.getElementById("fill-date").innerHTML = `${
        monthNames[now.getMonth()]
    } ${now.getDate()}`;
    document.getElementById("fill-time").innerHTML = now.toLocaleTimeString();
}

let images = [];
let currentImage = 0;
function fetchImages() {
    axios("/images").then(function(res) {
        let elems = document.getElementsByClassName("slideshow-sub");
        for (let i = 0; i < elems.length; i++) {
            res.data.forEach(function(f) {
                var img = document.createElement("div");
                img.classList.add("slide");
                img.classList.add("hide");
                img.style.backgroundImage = `url('${f}')`;
                
                elems[i].appendChild(img);
            });
        }
        
        changeImage();
    });
}

function changeImage() {
    let slideShows = document.querySelectorAll(".slideshow");

    slideShows.forEach(function (el, i) {
        let slides = el.querySelectorAll(".slide");
        if (slides.length > 0) {
            slides.forEach(el => { el.classList.add('hide') });
            let showIndex = Math.floor(Math.random() * slides.length);
            slides[showIndex].classList.remove('hide');
        }
    })
        
    //     if (slideShows.childNodes[i].className == "slide") {
    //       slideShows.childNodes[i];
    //     }        
    // }

    // let imgElems = document.querySelectorAll("slideshow .img");
    // currentImage = (currentImage + 1) % imgElems.length;
    // imgElems.forEach(function(el, i) {
    //     if (i == currentImage) el.classList.remove("hide");
    //     else el.classList.add("hide");
    // });
}
