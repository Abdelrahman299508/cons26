"use strict";

const { makeCreateProject } = require("./createProject");
const { makeDeleteProject } = require("./deleteProject");
const { makeAddTask } = require("./addTask");
const { makeAssignTask } = require("./assignTask");
const { makeDeleteTask } = require("./deleteTask");
const { makeChangeStatus } = require("./changeStatus");
const { makeAddComment } = require("./addComment");
const { makeLoadBoard } = require("./loadBoard");
const { makeListMyTasks } = require("./listMyTasks");
const { makeListProjects } = require("./listProjects");

function createApplication(repositories) {
  return {
    createProject: makeCreateProject(repositories),
    deleteProject: makeDeleteProject(repositories),
    addTask: makeAddTask(repositories),
    assignTask: makeAssignTask(repositories),
    deleteTask: makeDeleteTask(repositories),
    changeStatus: makeChangeStatus(repositories),
    addComment: makeAddComment(repositories),
    loadBoard: makeLoadBoard(repositories),
    listMyTasks: makeListMyTasks(repositories),
    listProjects: makeListProjects(repositories),
  };
}

module.exports = { createApplication };
