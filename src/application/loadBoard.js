"use strict";

const rules = require("../domain/rules");

function makeLoadBoard({ projects, members, tasks, comments }) {
  return async function loadBoard({ projectId }) {
    const project = await projects.findById(projectId);
    if (!project) {
      return { ok: false, error: "Project not found" };
    }

    const projectMembers = await members.findByProjectId(projectId);
    const projectTasks = await tasks.findByProjectId(projectId);
    const tasksWithComments = [];
    for (const task of projectTasks) {
      const storedComments = await comments.findByTaskId(task.id);
      tasksWithComments.push({
        ...task,
        comments: rules.commentsInCreationOrder(storedComments),
      });
    }

    return {
      ok: true,
      value: {
        project,
        members: projectMembers,
        board: rules.groupTasksByStatus(tasksWithComments),
      },
    };
  };
}

module.exports = { makeLoadBoard };
