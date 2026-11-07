"use strict";

const rules = require("../domain/rules");

function makeAddTask({ members, tasks }) {
  return async function addTask({ actorId, title, dueDate, projectId }) {
    const actor = await members.findById(actorId);
    if (!actor) {
      return { ok: false, error: "Member not found" };
    }

    const result = rules.addTask({ actor, title, dueDate, projectId });
    if (!result.ok) {
      return result;
    }

    await tasks.insert(result.value);
    return { ok: true, value: await tasks.findById(result.value.id) };
  };
}

module.exports = { makeAddTask };
