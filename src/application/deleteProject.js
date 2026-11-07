"use strict";

const rules = require("../domain/rules");

function makeDeleteProject({ projects, members, tasks, comments }) {
  return async function deleteProject({ actorId, projectId }) {
    const project = await projects.findById(projectId);
    if (!project) {
      return { ok: false, error: "Project not found" };
    }

    const actor = await members.findById(actorId);
    if (!actor) {
      return { ok: false, error: "Member not found" };
    }

    const result = rules.deleteProject({ project, actor });
    if (!result.ok) {
      return result;
    }

    const projectTasks = await tasks.findByProjectId(project.id);
    for (const task of projectTasks) {
      await comments.deleteByTaskId(task.id);
    }
    await tasks.deleteByProjectId(project.id);
    await members.deleteByProjectId(project.id);
    await projects.deleteById(project.id);
    return { ok: true, value: project };
  };
}

module.exports = { makeDeleteProject };
