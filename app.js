const config = require("./config.js");

const ical = require("node-ical");
const moment = require('moment-timezone')
const rrule = require("rrule");
const path = require("path");
const request = require("request");
const express = require("express");
const fs = require('fs');

const app = express();
const port = 3000;

app.use(express.static('public'))

app.get("/", function(req, res) {
    res.sendFile(path.join(__dirname + "/index1.html"));
});

app.get("/calendar", function(req, res) {
    var today = moment(0, 'HH');
    var nextMonth = moment(0, 'HH').add(1, 'week');


    request.get(config.CALENDAR_URL, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            let json = ical.sync.parseICS(body);

            let events = handleRRule(json, today, nextMonth);
            // console.log(events.length);
            // events.forEach(e => { console.log(e.summary + " " + e.start + " " + e.end) })
            // console.log(events);

            res.json(events);
        }
    });
});

app.get("/images", function(req, res) {
    fs.readdir(config.images.folder, (err, files) => {
        res.send(files.map((f) => config.images.rootPath + f));
    });
    // request.get(config.CALENDAR_URL, function(error, response, body) {
    //     var api_key = "{YOUR_API_KEY}";
    //     var folderId = "{your_public_folder_id}";
    //     var url =
    //         "https://www.googleapis.com/drive/v3/files?q='" +
    //         folderId +
    //         "'+in+parents&key=" +
    //         api_key;
    //     var promise = $.getJSON(url, function(data, status) {
    //         // on success
    //     });
    //     promise
    //         .done(function(data) {
    //             // do something with the data
    //         })
    //         .fail(function() {});
    // });
});

app.get("/weather", function(req, res) {
    request.get({
        url: config.OpenWeatherMap.url,
        qs: {
            q: `${config.OpenWeatherMap.city},${config.OpenWeatherMap.country}`,
            appid: `${config.OpenWeatherMap.api_key}`
        }
    }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            res.json(JSON.parse(body));
        }
    });
});


app.listen(port, () => console.log(`Example app listening on port ${port}!`));






function handleRRule (data, rangeStart, rangeEnd) {
    // from https://github.com/jens-maus/node-ical/blob/master/example_rrule.js

    let events = [];

    for (const k in data) {
        // When dealing with calendar recurrences, you need a range of dates to query against,
        // because otherwise you can get an infinite number of calendar events.
        
        const event = data[k];
        if (event.type === 'VEVENT') {
            const title = event.summary;
            let startDate = moment(event.start);
            let endDate = moment(event.end);
    
            // Calculate the duration of the event for use with recurring events.
            const duration = parseInt(endDate.format('x')) - parseInt(startDate.format('x'));
    
            // Simple case - no recurrences, just print out the calendar event.
            if (typeof event.rrule === 'undefined') {
                events.push(event);
                // console.log(`title:${title}`);
                // console.log(`startDate:${startDate.format('MMMM Do YYYY, h:mm:ss a')}`);
                // console.log(`endDate:${endDate.format('MMMM Do YYYY, h:mm:ss a')}`);
                // console.log(`duration:${moment.duration(duration).humanize()}`);
                // console.log();
            }
    
            // Complicated case - if an RRULE exists, handle multiple recurrences of the event.
            else if (typeof event.rrule !== 'undefined') {
                // For recurring events, get the set of event start dates that fall within the range
                // of dates we're looking for.
                const dates = event.rrule.between(rangeStart.toDate(), rangeEnd.toDate(), true, function(date, i) {
                    return true;
                });
    
                // The "dates" array contains the set of dates within our desired date range range that are valid
                // for the recurrence rule.  *However*, it's possible for us to have a specific recurrence that
                // had its date changed from outside the range to inside the range.  One way to handle this is
                // to add *all* recurrence override entries into the set of dates that we check, and then later
                // filter out any recurrences that don't actually belong within our range.
                if (event.recurrences != undefined) {
                    for (const r in event.recurrences) {
                        // Only add dates that weren't already in the range we added from the rrule so that
                        // we don't double-add those events.
                        if (moment(new Date(r)).isBetween(rangeStart, rangeEnd) != true) {
                            dates.push(new Date(r));
                        }
                    }
                }
    
                // Loop through the set of date entries to see which recurrences should be printed.
                for (const i in dates) {
                    const date = dates[i];
                    let curEvent = event;
                    let showRecurrence = true;
                    let curDuration = duration;
    
                    startDate = moment(date);
    
                    // Use just the date of the recurrence to look up overrides and exceptions (i.e. chop off time information)
                    const dateLookupKey = date.toISOString().substring(0, 10);
    
                    // For each date that we're checking, it's possible that there is a recurrence override for that one day.
                    if (curEvent.recurrences != undefined && curEvent.recurrences[dateLookupKey] != undefined) {
                        // We found an override, so for this recurrence, use a potentially different title, start date, and duration.
                        curEvent = curEvent.recurrences[dateLookupKey];
                        startDate = moment(curEvent.start);
                        curDuration = parseInt(moment(curEvent.end).format('x')) - parseInt(startDate.format('x'));
                    }
                    // If there's no recurrence override, check for an exception date.  Exception dates represent exceptions to the rule.
                    else if (curEvent.exdate != undefined && curEvent.exdate[dateLookupKey] != undefined) {
                        // This date is an exception date, which means we should skip it in the recurrence pattern.
                        showRecurrence = false;
                    }
    
                    // Set the the title and the end date from either the regular event or the recurrence override.
                    const recurrenceTitle = curEvent.summary;
                    endDate = moment(parseInt(startDate.format('x')) + curDuration, 'x');
    
                    // If this recurrence ends before the start of the date range, or starts after the end of the date range,
                    // don't process it.
                    if (endDate.isBefore(rangeStart) || startDate.isAfter(rangeEnd)) {
                        showRecurrence = false;
                    }
    
                    if (showRecurrence === true) {
                        let eventOccurance = Object.assign({}, event);
                        eventOccurance.start = startDate;
                        eventOccurance.end = endDate;
                        events.push(eventOccurance);

                        // console.log(`title:${recurrenceTitle}`);
                        // console.log(`startDate:${startDate.format('MMMM Do YYYY, h:mm:ss a')}`);
                        // console.log(`endDate:${endDate.format('MMMM Do YYYY, h:mm:ss a')}`);
                        // console.log(`duration:${moment.duration(curDuration).humanize()}`);
                        // console.log();
                    }
                }
            }
        }
    }

    return events;
}