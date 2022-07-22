var input = document.querySelector('input');
var global_splits_formatted;
var global_splits;
var timingMethodIndex = 1;

input.addEventListener('change', () => {
    var files = input.files;

    if (files.length == 0) return;

    var file = files[0];
    const fileReader = new FileReader();
    fileReader.readAsText(file);
    fileReader.onload = function() {
        generateComparison(parseSplits(fileReader.result));
    }
});

function parseSplits(splitFile) {
    if (window.DOMParser) {
        parser = new DOMParser();
        splits = parser.parseFromString(splitFile, "text/xml");
    } else {
        splits = new ActiveXObject("Microsoft.XMLDOM");
        splits.async = false;
        splits.loadXML(splitFile);
    }
    global_splits = splits;
    return splits;
}

function dragOverHandler(ev) {
    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault();
}

function handleDrop(ev) {
    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault();

    if (ev.dataTransfer.items) {
        // Use DataTransferItemList interface to access the file(s)
        for (var i = 0; i < ev.dataTransfer.items.length; i++) {
            // If dropped items aren't files, reject them
            if (ev.dataTransfer.items[i].kind === 'file') {
                var file = ev.dataTransfer.items[i].getAsFile();
                const fileReader = new FileReader();
                fileReader.readAsText(file);
                fileReader.onload = function() {
                    generateComparison(parseSplits(fileReader.result));
                }
                return;
            }
        }
    } else {
        // Use DataTransfer interface to access the file(s)
        for (var i = 0; i < ev.dataTransfer.files.length; i++) {
            var file = ev.dataTransfer.files[i];
            const fileReader = new FileReader();
            fileReader.readAsText(file);
            fileReader.onload = function() {
                generateComparison(parseSplits(fileReader.result));
            }
            return;
        }
    }
}


function generateComparison(splits) {
    timingMethodIndex = 1;
    var formatted_splits = [];
    var game_time_alerady_checked = false;

    var segments = splits.getElementsByTagName("Segment");
    if (segments.length == 0) {
        alert("No segments found!");
        return;
    }
    var SOB = 0;
    var output = "<tr><td>Split Name</td><td>Timesave</td><td>Segment Time</td><td>Split Time</td>";

    for (var x in segments) {
        try {
            // Game Time
            try {
                if (!game_time_alerady_checked) {
                    var temp = segments[x].childNodes[7].childNodes[3].childNodes[0].nodeValue;
                    if (confirm("A segment was found with GameTime in the splits. Select \"OK\" to switch to Game Time, \"Cancel\" to continue using Real Time."))
                        timingMethodIndex = 3;
                    game_time_alerady_checked = true;
                }
            } catch {}
            var splitName = segments[x].childNodes[1].childNodes[0].nodeValue;
            var bestSegmentTime = segments[x].childNodes[7].childNodes[timingMethodIndex].childNodes[0].nodeValue;
            formatted_splits.push({
                "splitName": splitName,
                "bestSegmentTime": convertTime(bestSegmentTime),
            });
            SOB += convertTime(bestSegmentTime);
        } catch {}
    }

    var targetTime = prompt("Please enter the desired time. Format: 0:49:59.000");
    if (targetTime == null) return;
    if (targetTime.length == 0) return;
    try {
        targetTime = convertTime(targetTime);
    } catch {
        alert("Invalid Target Time Format! Format: 0:49:59.000");
        return;
    }
    var new_splits = 0;
    if (targetTime < SOB) {
        alert("Target Time must be higher than the split's Sum of Best!");
        return;
    }

    for (var x in formatted_splits) {
        try {
            var new_time = getNewTime(targetTime, SOB, formatted_splits[x]["bestSegmentTime"]);
            var new_time_timesave = getNewTime(targetTime, SOB, formatted_splits[x]["bestSegmentTime"], return_timesave=true);
        } catch {
            alert("Distributed calculation failed.");
            return;
        }
        new_splits += new_time;
        formatted_splits[x]["new_time"] = time_output(new_time);
        formatted_splits[x]["new_timesave"] = time_output(new_time_timesave, timesave_format=true);
        formatted_splits[x]["new_splits"] = time_output(new_splits);

        output += "<tr><td>" + formatted_splits[x]["splitName"] + "</td><td>+" + formatted_splits[x]["new_timesave"] + "</td><td>" + formatted_splits[x]["new_time"] + "</td><td>" + time_output(new_splits) + "</td></tr>";
    }
    global_splits_formatted = formatted_splits;
    document.getElementById('header').innerHTML = "Sum of Best: " + time_output(SOB) + " | Total Timesave: " + time_output(targetTime - SOB);
    document.getElementById('splitContent').innerHTML = output;
    document.getElementById('downloadBtn').style.display = 'block';
    document.getElementById('compNameDiv').style.display = 'block';
}

function handleDownload() {
    var segments = global_splits.getElementsByTagName("Segment");
    
    var comparisonName = document.getElementById('comparisonName').value;
    console.log(comparisonName);

    if (comparisonName.length == 0) { overwritePB(segments); }

    else { createComparison(segments, comparisonName); }

    download("updated.lss", XMLToString(global_splits));
}

function createComparison(segments, name) {
    var split_format_counter = 0;

    for (var x in segments) {
        try {
            var temp = segments[x].childNodes[5].childNodes[1].childNodes[1];
        } catch (e) {
            continue;
        }
        if (timingMethodIndex == 1)
            var node = global_splits.createElement("RealTime");
        else
            var node = global_splits.createElement("GameTime");
        var create_t = global_splits.createTextNode(global_splits_formatted[split_format_counter]["new_splits"] + "0000");
        node.appendChild(create_t);
        var comparison = global_splits.createElement("SplitTime");
        comparison.setAttribute("name", name);
        comparison.appendChild(node);

        segments[x].childNodes[5].appendChild(comparison);
        split_format_counter++;
    }
}

function overwritePB(segments) {
    var split_format_counter = 0;

    for (var x in segments) {
        try {
            var temp = segments[x].childNodes[5].childNodes[1].childNodes[1];
        } catch (e) {
            continue;
        }
        try {
            segments[x].childNodes[5].childNodes[1].childNodes[timingMethodIndex].childNodes[0].nodeValue = global_splits_formatted[split_format_counter]["new_splits"] + "0000";
            split_format_counter++;
        } catch {
            if (timingMethodIndex == 1)
                var node = global_splits.createElement("RealTime");
            else
                var node = global_splits.createElement("GameTime");
            var create_t = global_splits.createTextNode(global_splits_formatted[split_format_counter]["new_splits"] + "0000");
            node.appendChild(create_t);
            segments[x].childNodes[5].childNodes[1].appendChild(node);
            split_format_counter++;
        }
    }
}


function convertTime(time) {
    var milliseconds = 0;
    var time_list = time.split(":");
    var hours_offset = 1;
    if (time_list.length > 2) { // Hours provided.
        milliseconds += parseInt(time_list[0]) * 3600000;
        hours_offset = 0;
    }

    if (time_list[2 - hours_offset].split(".").length == 2) {
        time_list = time_list.concat(time_list[2 - hours_offset].split("."));
        time_list.splice(2 - hours_offset, 1);
        milliseconds += parseInt(time_list[3 - hours_offset].substring(0, 3));
    }
    milliseconds += parseInt(time_list[2 - hours_offset]) * 1000;
    milliseconds += parseInt(time_list[1 - hours_offset]) * 60000;
    return milliseconds;
}

function getNewTime(targetTime, sumOfBest, bestSegment, return_timesave=false) {
    var pbminussob = targetTime - sumOfBest;
    var timesave = (bestSegment / sumOfBest) * pbminussob;
    if (return_timesave) { return timesave; }
    return bestSegment + timesave;
}

function time_output(milliseconds, timesave_format=false) {
    var date = new Date(milliseconds);
    if (timesave_format) {
        var output = (date.getUTCSeconds().toString()).padStart(2, '0') + "." + (date.getUTCMilliseconds().toString()).padStart(3, '0');
        if (date.getUTCMinutes() > 0) { output =  (date.getUTCMinutes().toString()).padStart(2, '0') + ":" + output}
        if (date.getUTCHours() > 0) { output =  (date.getUTCHours().toString()).padStart(2, '0') + ":" + output}
        return output;
    }
    return (date.getUTCHours().toString()).padStart(2, '0') + ":" + (date.getUTCMinutes().toString()).padStart(2, '0') + ":" + 
    (date.getUTCSeconds().toString()).padStart(2, '0') + "." + (date.getUTCMilliseconds().toString()).padStart(3, '0');
}

function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
  
    element.style.display = 'none';
    document.body.appendChild(element);
  
    element.click();
  
    document.body.removeChild(element);
  }

function XMLToString(oXML) {
    //code for IE
    if (window.ActiveXObject) {
        var oString = oXML.xml; return oString;
    } 
    // code for Chrome, Safari, Firefox, Opera, etc.
    else {
        return (new XMLSerializer()).serializeToString(oXML);
    }
 }
