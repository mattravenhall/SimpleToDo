
// Colors
colTasksNone = "#ffffff";
colTasksFew = "#518bf5";
colTasksMany = "#822727";


// Handle task updates in storage
function taskGetSet(taskId, taskObject) {
  chrome.storage.sync.get(['tasks'], function(result) {
      latestTasks = result.tasks;

      // Handle task deletion
      if (taskObject['status'] == 'delete') {
        console.log('Deleting task: '+taskId);
        delete latestTasks[taskId];
      } else {

        // Prep latestTasks if it's undefined
        if (typeof result.tasks == 'undefined') {
          console.log("Prepping absent task list");
          latestTasks = {};
        }

        // Auto-generate ids for new tasks
        if (taskId == "new") {
          taskId = 'task_'+(new Date()).getTime()+'_'+Math.floor(Math.random()*100000).toString(16);
          console.log("Creating a new task with id '"+taskId+"'");
        }

        console.log("Updating task '"+taskId+"'");
        latestTasks[taskId] = taskObject;
      }
      chrome.storage.sync.set({"tasks": latestTasks});
  });
}

// Create a new list item when the user provides one
function newTask() {
  // Grab task name from New Task box
  var inputValue = document.getElementById("newTask").value;
  console.log('inputValue: ' + inputValue);

  // Handle detected input (esp. if empty)
  if (inputValue === '') {
    // alert("No task provided!");
  } else {
    taskGetSet("new", {
      "task": inputValue,
      "status": "unchecked"
    });
  }

  // Reset 'New Task' box
  document.getElementById("newTask").value = "";
}

// Handle task text edits
function editTask(e) {
  chrome.storage.sync.get(['tasks'], function(result) {
    // Collect new task from user input
    updatedTask = e.target.value
    taskId = e.target.parentElement.id
    currentTask = result['tasks'][taskId]['task']

    if (updatedTask == '') {
      console.log("Deleting task '"+taskId+"' due to empty string");
      taskGetSet(taskId, {
        "status": "delete"
      });
    } else if (updatedTask == currentTask) {
      console.log("Aborting task edit as task is unchanged.")
    } else {
      console.log("Updating task '"+taskId+"' with text '"+updatedTask+"'")

      taskGetSet(taskId, {
        "task": updatedTask,
        "status": "unchecked"
      })
    }

  })
};

// Build HTML task list
function buildTaskList() {
  // Create the root
  var list = document.createElement('ul');

  chrome.storage.sync.get(['tasks'], function(result) {
    if (typeof result.tasks == 'undefined') {
      // Set default if no tasks are found
      tasks = {};
      console.log('No tasks found.' + Object.keys(tasks).length);
    } else {
      tasks = result.tasks;
      console.log('Tasks are ' + result.tasks + ' len ' + Object.keys(tasks).length);
    }

    if (Object.keys(tasks).length == 0) {
      // Use placeholder if there are no tasks
      var item = document.createElement('li');
      item.appendChild(document.createTextNode("All done! 🎉"));
      list.appendChild(item);
    } else {
      // Populate tasks
      for(var i = 0; i < Object.keys(tasks).length; i++) {
        var taskId = Object.keys(tasks)[i];
        var taskName = Object.values(tasks)[i]['task'];
        var taskStatus = Object.values(tasks)[i]['status'];

        console.log('li taskName: ' + taskName);
        console.log('li taskStatus: ' + taskStatus);

        // Create the list item:
        var item = document.createElement('li');

        // Store task names are input boxes for easier editing
        taskText = document.createElement("input");
        taskText.type = "text";
        taskText.value = taskName
        taskText.className = "taskName"

        // Set checked/unchecked status
        if (taskStatus == "checked") {
          console.log("Setting task '"+taskId+"' to checked");
          taskText.classList.add("checked");
        } else {
          console.log("Setting task '"+taskId+"' to unchecked");
          taskText.classList.remove("checked");
        }

        // Tag each list item with its task id
        item.id = taskId;

        // Trigger task updates when enter is pressed
        taskText.addEventListener("keyup", function(e) {  // Response to 'enter' in New Task box 
          if (e.keyCode === 13) {
            console.log("Enter press detected");
            e.preventDefault();
            editTask(e);
          }
        });

        // Trigger task updates on focus loss)
        taskText.addEventListener("blur", function(e) {
          console.log("Focus loss detected");
          editTask(e);
        });

        item.appendChild(taskText);

        // Add 'check/uncheck' button
        var spanCheck = document.createElement("SPAN");
        spanCheck.className = "check";
        if (taskStatus == "checked") {
          spanCheck.appendChild(document.createTextNode("↩️"));
        } else {
          spanCheck.appendChild(document.createTextNode("✅"));
        }

        // Add listener that sets checked/unchecked on item click
        spanCheck.addEventListener("click", function(e) {
          taskId = e.target.parentElement.id
          if (e.target.parentElement.tagName === 'LI') {
            console.log('Heard task: ' + taskId);
            // Flip taskStatus accordingly
            if (e.target.parentElement.firstChild.classList.contains("checked")) {
              taskStatus = "unchecked";
              console.log("Status is now unchecked")
              // e.target.parentElement.classList.remove("checked")
            } else {
              taskStatus = "checked";
              console.log("Status is now checked")
              // e.target.parentElement.classList.add("checked")
            }

            // Update list in view & cloud
            taskGetSet(taskId, {
              "task": e.target.parentElement.firstChild.value,
              "status": taskStatus
            });
          }
        })
        item.appendChild(spanCheck);

        // Add "close" button
        var spanClose = document.createElement("SPAN");
        spanClose.className = "close";
        spanClose.appendChild(document.createTextNode("🗑️"));

        // Add listener that removes item from list on x click
        spanClose.addEventListener("click", function(e) {
          taskGetSet(e.target.parentElement.id, {
            "status": "delete"
          });
        })
        item.appendChild(spanClose);

        // Add element to list:
        list.appendChild(item);
      }
    }
  });
  return list;
}

// Build HTML task list on open
document.getElementById('trackedTasks').appendChild(buildTaskList());

// Listen for new tasks
document.getElementById("newTask").addEventListener("keyup", function(event) {  // Response to 'enter' in New Task box 
  if (event.keyCode === 13) {
    event.preventDefault();
    document.getElementById("addButton").click();
  }
})
document.getElementById("addButton").addEventListener("click", newTask);  // Response to click on 'Add' button

// Rebuild HTML task list when storage changes
chrome.storage.onChanged.addListener(function () {
  document.getElementById('trackedTasks').innerHTML = '';
  document.getElementById('trackedTasks').appendChild(buildTaskList());
});

// Update badge with task count
chrome.storage.onChanged.addListener(function () {
  chrome.storage.sync.get(['tasks'], function(result) {
    taskCount = Object.keys(result.tasks).length;
    if (taskCount == 0) {
      chrome.action.setBadgeBackgroundColor({ color: colTasksNone });
      taskCount = "";
    } else if (taskCount >= 10) {
      chrome.action.setBadgeBackgroundColor({ color: colTasksMany });
      taskCount = "10+";
    } else {
      chrome.action.setBadgeBackgroundColor({ color: colTasksFew });
      taskCount = taskCount.toString();
    };
    chrome.action.setBadgeText({text: taskCount});
  });
});
