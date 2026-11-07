"use strict";

const rules = require("../domain/rules");

function makeDeleteTask({ members, tasks, comments }) {
  return async function deleteTask({ actorId, taskId }) {
    const task = await tasks.findById(taskId);
    if (!task) {
      return { ok: false, error: "Task not found" };
    }

    const actor = await members.findById(actorId);
    if (!actor) {
      return { ok: false, error: "Member not found" };
    }

    const result = rules.deleteTask({ task, actor });
    if (!result.ok) {
      return result;
    }

    await comments.deleteByTaskId(task.id);
    await tasks.deleteById(task.id);
    return { ok: true, value: task };
  };
}

module.exports = { makeDeleteTask };
