"use strict";

const rules = require("../domain/rules");

function makeChangeStatus({ members, tasks }) {
  return async function changeStatus({ actorId, taskId, nextStatus }) {
    const task = await tasks.findById(taskId);
    if (!task) {
      return { ok: false, error: "Task not found" };
    }

    const actor = await members.findById(actorId);
    if (!actor) {
      return { ok: false, error: "Member not found" };
    }

    const result = rules.changeStatus({ task, actor, nextStatus });
    if (!result.ok) {
      return result;
    }

    await tasks.update(result.value);
    return { ok: true, value: await tasks.findById(task.id) };
  };
}

module.exports = { makeChangeStatus };
