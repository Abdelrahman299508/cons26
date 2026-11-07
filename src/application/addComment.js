"use strict";

const rules = require("../domain/rules");

function makeAddComment({ members, tasks, comments }) {
  return async function addComment({ actorId, taskId, text, time }) {
    const task = await tasks.findById(taskId);
    if (!task) {
      return { ok: false, error: "Task not found" };
    }

    const author = await members.findById(actorId);
    if (!author) {
      return { ok: false, error: "Member not found" };
    }

    const result = rules.addComment({ task, author, text, time });
    if (!result.ok) {
      return result;
    }

    await comments.insert(result.value);
    const stored = await comments.findByTaskId(task.id);
    return {
      ok: true,
      value: {
        comment: result.value,
        comments: rules.commentsInCreationOrder(stored),
      },
    };
  };
}

module.exports = { makeAddComment };
