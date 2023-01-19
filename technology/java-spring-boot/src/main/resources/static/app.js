var autoRefreshIntervalId = null;
const dateTimeFormatter = JSJoda.DateTimeFormatter.ofPattern('HH:mm')

function refreshTimeTable() {
  $.getJSON("/timeTable", function (timeTable) {
    refreshSolvingButtons(timeTable.solverStatus != null && timeTable.solverStatus !== "NOT_SOLVING");
    $("#score").text("Score: " + (timeTable.score == null ? "?" : timeTable.score));

    const timeTableByRoom = $("#timeTableByRoom");
    timeTableByRoom.children().remove();
    const timeTableByTeacher = $("#timeTableByTeacher");
    timeTableByTeacher.children().remove();
    const timeTableByStudentGroup = $("#timeTableByStudentGroup");
    timeTableByStudentGroup.children().remove();
    const unassignedLessons = $("#unassignedLessons");
    unassignedLessons.children().remove();

    const theadByRoom = $("<thead>").appendTo(timeTableByRoom);
    const headerRowByRoom = $("<tr>").appendTo(theadByRoom);
    headerRowByRoom.append($("<th>Timeslot</th>"));
    $.each(timeTable.roomList, (index, room) => {
      headerRowByRoom
        .append($("<th/>")
          .append($("<span/>").text(room.name))
          .append($(`<button type="button" class="ml-2 mb-1 btn btn-light btn-sm p-1"/>`)
            .append($(`<small class="fas fa-trash"/>`)
            ).click(() => deleteRoom(room))));
    });
    const theadByTeacher = $("<thead>").appendTo(timeTableByTeacher);
    const headerRowByTeacher = $("<tr>").appendTo(theadByTeacher);
    headerRowByTeacher.append($("<th>Timeslot</th>"));
    const teacherList = [...new Set(timeTable.lessonList.map(lesson => lesson.teacher))];
    $.each(teacherList, (index, teacher) => {
      headerRowByTeacher
        .append($("<th/>")
          .append($("<span/>").text(teacher)));
    });
    const theadByStudentGroup = $("<thead>").appendTo(timeTableByStudentGroup);
    const headerRowByStudentGroup = $("<tr>").appendTo(theadByStudentGroup);
    headerRowByStudentGroup.append($("<th>Timeslot</th>"));
    const studentGroupList = [...new Set(timeTable.lessonList.map(lesson => lesson.studentGroup))];
    $.each(studentGroupList, (index, studentGroup) => {
      headerRowByStudentGroup
        .append($("<th/>")
          .append($("<span/>").text(studentGroup)));
    });

    const tbodyByRoom = $("<tbody>").appendTo(timeTableByRoom);
    const tbodyByTeacher = $("<tbody>").appendTo(timeTableByTeacher);
    const tbodyByStudentGroup = $("<tbody>").appendTo(timeTableByStudentGroup);

    const LocalTime = JSJoda.LocalTime;

    $.each(timeTable.timeslotList, (index, timeslot) => {
      const rowByRoom = $("<tr>").appendTo(tbodyByRoom);
      rowByRoom
        .append($(`<th class="align-middle"/>`)
          .append($("<span/>").text(`
                    ${timeslot.dayOfWeek.charAt(0) + timeslot.dayOfWeek.slice(1).toLowerCase()}
                    ${LocalTime.parse(timeslot.startTime).format(dateTimeFormatter)}
                    -
                    ${LocalTime.parse(timeslot.endTime).format(dateTimeFormatter)}
                `)
            .append($(`<button type="button" class="ml-2 mb-1 btn btn-light btn-sm p-1"/>`)
              .append($(`<small class="fas fa-trash"/>`)
              ).click(() => deleteTimeslot(timeslot)))));
      $.each(timeTable.roomList, (index, room) => {
        rowByRoom.append($("<td/>").prop("id", `timeslot${timeslot.id}room${room.id}`));
      });

      const rowByTeacher = $("<tr>").appendTo(tbodyByTeacher);
      rowByTeacher
        .append($(`<th class="align-middle"/>`)
          .append($("<span/>").text(`
                    ${timeslot.dayOfWeek.charAt(0) + timeslot.dayOfWeek.slice(1).toLowerCase()}
                    ${LocalTime.parse(timeslot.startTime).format(dateTimeFormatter)}
                    -
                    ${LocalTime.parse(timeslot.endTime).format(dateTimeFormatter)}
                `)));
      $.each(teacherList, (index, teacher) => {
        rowByTeacher.append($("<td/>").prop("id", `timeslot${timeslot.id}teacher${convertToId(teacher)}`));
      });

      const rowByStudentGroup = $("<tr>").appendTo(tbodyByStudentGroup);
      rowByStudentGroup
        .append($(`<th class="align-middle"/>`)
          .append($("<span/>").text(`
                    ${timeslot.dayOfWeek.charAt(0) + timeslot.dayOfWeek.slice(1).toLowerCase()}
                    ${LocalTime.parse(timeslot.startTime).format(dateTimeFormatter)}
                    -
                    ${LocalTime.parse(timeslot.endTime).format(dateTimeFormatter)}
                `)));
      $.each(studentGroupList, (index, studentGroup) => {
        rowByStudentGroup.append($("<td/>").prop("id", `timeslot${timeslot.id}studentGroup${convertToId(studentGroup)}`));
      });
    });

    $.each(timeTable.lessonList, (index, lesson) => {
      let colorStr = pickColor(lesson.subject)
      let fontColor = colorStr.split('|').pop();
      let color = colorStr.split('|').shift();
      let roomName = '';
      if (lesson.room)
        {
            roomName = lesson.room.name.split(' ').pop();
        }

      const lessonElementWithoutDelete = $(`<div class="card" style="background-color: ${color};color:${fontColor}"/>`)
        .append($(`<div class="card-body p-2"/>`)
          .append($(`<h5 class="card-title mb-1"/>`).text(lesson.subject))
          .append($(`<p class="card-text ml-2 mb-1"/>`)
            .append($(`<em/>`).text(`by ${lesson.teacher}`)))
          .append($(`<small class="ml-2 mt-1 card-text align-bottom float-right " style="color:${fontColor}"/>`).text(roomName+' '+lesson.id))
          .append($(`<p class="card-text ml-2"/>`).text(lesson.studentGroup)));


      const lessonElement = lessonElementWithoutDelete.clone();
      lessonElement.find(".card-body").prepend(
        $(`<button type="button" class="ml-2 btn btn-light btn-sm p-1 float-right"/>`)
          .append($(`<small class="fas fa-trash"/>`)
          ).click(() => deleteLesson(lesson))
      );
      if (lesson.timeslot == null || lesson.room == null) {
        unassignedLessons.append(lessonElement);
      } else {
        $(`#timeslot${lesson.timeslot.id}room${lesson.room.id}`).append(lessonElement);
        $(`#timeslot${lesson.timeslot.id}teacher${convertToId(lesson.teacher)}`).append(lessonElementWithoutDelete.clone());
        $(`#timeslot${lesson.timeslot.id}studentGroup${convertToId(lesson.studentGroup)}`).append(lessonElementWithoutDelete.clone());
      }
    });
  });
}

function convertToId(str) {
  // Base64 encoding without padding to avoid XSS
  return btoa(str).replace(/=/g, "");
}

function solve() {
  $.post("/timeTable/solve", function () {
    refreshSolvingButtons(true);
  }).fail(function (xhr, ajaxOptions, thrownError) {
    showError("Start solving failed.", xhr);
  });
}

function unassignLessons() {
  $.post("/timeTable/unassign", function () {
    refreshSolvingButtons(false);
    refreshTimeTable();
  }).fail(function (xhr, ajaxOptions, thrownError) {
    showError("Reset Failed!", xhr);
  });
}

function refreshSolvingButtons(solving) {
  if (solving) {
    $("#solveButton").hide();
    $("#stopSolvingButton").show();
    if (autoRefreshIntervalId == null) {
      autoRefreshIntervalId = setInterval(refreshTimeTable, 1000); //calls refreshTimeTable every 2 second
    }
  } else {
    $("#solveButton").show();
    $("#stopSolvingButton").hide();
    if (autoRefreshIntervalId != null) {
      clearInterval(autoRefreshIntervalId);
      autoRefreshIntervalId = null;
    }
  }
}

function stopSolving() {
  $.post("/timeTable/stopSolving", function () {
    refreshSolvingButtons(false);
    refreshTimeTable();
  }).fail(function (xhr, ajaxOptions, thrownError) {
    showError("Stop solving failed.", xhr);
  });
}

function addLesson() {
  var subject = $("#lesson_subject").val().trim();
  $.post("/lessons", JSON.stringify({
    "subject": subject,
    "teacher": $("#lesson_teacher").val().trim(),
    "studentGroup": $("#lesson_studentGroup").val().trim()
  }), function () {
    refreshTimeTable();
  }).fail(function (xhr, ajaxOptions, thrownError) {
    showError("Adding lesson (" + subject + ") failed.", xhr);
  });
  $('#lessonDialog').modal('toggle');
}

function deleteLesson(lesson) {
  $.delete("/lessons/" + lesson.id, function () {
    refreshTimeTable();
  }).fail(function (xhr, ajaxOptions, thrownError) {
    showError("Deleting lesson (" + lesson.name + ") failed.", xhr);
  });
}

function addTimeslot() {
  $.post("/timeslots", JSON.stringify({
    "dayOfWeek": $("#timeslot_dayOfWeek").val().trim().toUpperCase(),
    "startTime": $("#timeslot_startTime").val().trim(),
    "endTime": $("#timeslot_endTime").val().trim()
  }), function () {
    refreshTimeTable();
  }).fail(function (xhr, ajaxOptions, thrownError) {
    showError("Adding timeslot failed.", xhr);
  });
  $('#timeslotDialog').modal('toggle');
}

function deleteTimeslot(timeslot) {
  $.delete("/timeslots/" + timeslot.id, function () {
    refreshTimeTable();
  }).fail(function (xhr, ajaxOptions, thrownError) {
    showError("Deleting timeslot (" + timeslot.name + ") failed.", xhr);
  });
}

function addRoom() {
  var name = $("#room_name").val().trim();
  $.post("/rooms", JSON.stringify({
    "name": name
  }), function () {
    refreshTimeTable();
  }).fail(function (xhr, ajaxOptions, thrownError) {
    showError("Adding room (" + name + ") failed.", xhr);
  });
  $("#roomDialog").modal('toggle');
}

function deleteRoom(room) {
  $.delete("/rooms/" + room.id, function () {
    refreshTimeTable();
  }).fail(function (xhr, ajaxOptions, thrownError) {
    showError("Deleting room (" + room.name + ") failed.", xhr);
  });
}

function showError(title, xhr) {
  const serverErrorMessage = !xhr.responseJSON ? `${xhr.status}: ${xhr.statusText}` : xhr.responseJSON.message;
  console.error(title + "\n" + serverErrorMessage);
  const notification = $(`<div class="toast" role="alert" aria-live="assertive" aria-atomic="true" style="min-width: 30rem"/>`)
    .append($(`<div class="toast-header bg-danger">
                 <strong class="mr-auto text-dark">Error</strong>
                 <button type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Close">
                   <span aria-hidden="true">&times;</span>
                 </button>
               </div>`))
    .append($(`<div class="toast-body"/>`)
      .append($(`<p/>`).text(title))
      .append($(`<pre/>`)
        .append($(`<code/>`).text(serverErrorMessage))
      )
    );
  $("#notificationPanel").append(notification);
  notification.toast({delay: 30000});
  notification.toast('show');
}

$(document).ready(function () {
  $.ajaxSetup({
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });
  // Extend jQuery to support $.put() and $.delete()
  jQuery.each(["put", "delete"], function (i, method) {
    jQuery[method] = function (url, data, callback, type) {
      if (jQuery.isFunction(data)) {
        type = type || callback;
        callback = data;
        data = undefined;
      }
      return jQuery.ajax({
        url: url,
        type: method,
        dataType: type,
        data: data,
        success: callback
      });
    };
  });

  $("#refreshButton").click(function () {
    refreshTimeTable();
  });
  $("#solveButton").click(function () {
    solve();
  });
  $("#stopSolvingButton").click(function () {
    stopSolving();
  });
  $("#resetButton").click(function () {
      unassignLessons();
  });
  $("#addLessonSubmitButton").click(function () {
    addLesson();
  });
  $("#addTimeslotSubmitButton").click(function () {
    addTimeslot();
  });
  $("#addRoomSubmitButton").click(function () {
    addRoom();
  });

  refreshTimeTable();
});

// ****************************************************************************
// TangoColorFactory
// ****************************************************************************

const SEQUENCE_1 = [0x8AE234, 0xFCE94F, 0x729FCF, 0xE9B96E, 0xAD7FA8];
const SEQUENCE_2 = [0x73D216, 0xEDD400, 0x3465A4, 0xC17D11, 0x75507B];
const colors = ["e63946","f1faee","a8dadc","457b9d","1d3557","f6bd60","f7ede2","f5cac3","84a59d","f28482"];
var colorMap = new Map;
var nextColorCount = 0;
let colorIndex = 0;

function pickColor(object) {
  let color = colorMap[object];
  let fontColor = '#000000';
  if (color !== undefined) {
    return color;
  }
//  color = nextColor();
    colorIndex =  nextColorCount % 9;
    color = '#'+colors[colorIndex];
    l = hexToHSL(color)
    //color = color;
    nextColorCount++;

  if (l < 60)
    {
        fontColor = '#ffffff';
    }
    else
    {
        fontColor = '#000000'
    }

 colorMap[object] = `${color}|${fontColor}`;
  return `${color}|${fontColor}`;
}

function nextColor() {
  let color;
  let colorIndex = nextColorCount % SEQUENCE_1.length;
  let shadeIndex = Math.floor(nextColorCount / SEQUENCE_1.length);
  if (shadeIndex === 0) {
    color = SEQUENCE_1[colorIndex];
  } else if (shadeIndex === 1) {
    color = SEQUENCE_2[colorIndex];
  } else {
    shadeIndex -= 3;
    let floorColor = SEQUENCE_2[colorIndex];
    let ceilColor = SEQUENCE_1[colorIndex];
    let base = Math.floor((shadeIndex / 2) + 1);
    let divisor = 2;
    while (base >= divisor) {
      divisor *= 2;
    }
    base = (base * 2) - divisor + 1;
    let shadePercentage = base / divisor;
    color = buildPercentageColor(floorColor, ceilColor, shadePercentage);
  }
  nextColorCount++;
  return "#" + color.toString(16);
}

function buildPercentageColor(floorColor, ceilColor, shadePercentage) {
  let red = (floorColor & 0xFF0000) + Math.floor(shadePercentage * ((ceilColor & 0xFF0000) - (floorColor & 0xFF0000))) & 0xFF0000;
  let green = (floorColor & 0x00FF00) + Math.floor(shadePercentage * ((ceilColor & 0x00FF00) - (floorColor & 0x00FF00))) & 0x00FF00;
  let blue = (floorColor & 0x0000FF) + Math.floor(shadePercentage * ((ceilColor & 0x0000FF) - (floorColor & 0x0000FF))) & 0x0000FF;
  return red | green | blue;
}


function hexToHSL(H) {
  // Convert hex to RGB first
  let r = 0, g = 0, b = 0;
  if (H.length == 4) {
    r = "0x" + H[1] + H[1];
    g = "0x" + H[2] + H[2];
    b = "0x" + H[3] + H[3];
  } else if (H.length == 7) {
    r = "0x" + H[1] + H[2];
    g = "0x" + H[3] + H[4];
    b = "0x" + H[5] + H[6];
  }
  // Then to HSL
  r /= 255;
  g /= 255;
  b /= 255;
  let cmin = Math.min(r,g,b),
      cmax = Math.max(r,g,b),
      delta = cmax - cmin,
      h = 0,
      s = 0,
      l = 0;

  if (delta == 0)
    h = 0;
  else if (cmax == r)
    h = ((g - b) / delta) % 6;
  else if (cmax == g)
    h = (b - r) / delta + 2;
  else
    h = (r - g) / delta + 4;

  h = Math.round(h * 60);

  if (h < 0)
    h += 360;

  l = (cmax + cmin) / 2;
  s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  //return "hsl(" + h + "," + s + "%," + l + "%)";
  return l;
}