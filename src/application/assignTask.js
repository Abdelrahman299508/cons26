"use strict";

const rules = require("../domain/rules");

function makeAssignTask({ members, tasks }) {
  return async function assignTask({ actorId, taskId, assigneeId }) {
    const task = await tasks.findById(taskId);
    if (!task) {
      return { ok: false, error: "Task not found" };
    }

    const actor = await members.findById(actorId);
    if (!actor) {
      return { ok: false, error: "Member not found" };
    }

    const assignee = await members.findById(assigneeId);
    if (!assignee) {
      return { ok: false, error: "Assignee not found" };
    }

    const result = rules.assignTask({ task, actor, assignee });
    if (!result.ok) {
      return result;
    }

    await tasks.update(result.value);
    return { ok: true, value: await tasks.findById(task.id) };
  };
}

module.exports = { makeAssignTask };
