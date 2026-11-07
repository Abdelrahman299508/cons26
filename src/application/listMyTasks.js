"use strict";

const rules = require("../domain/rules");

function makeListMyTasks({ members, tasks }) {
  return async function listMyTasks({ memberId }) {
    const member = await members.findById(memberId);
    if (!member) {
      return { ok: false, error: "Member not found" };
    }

    const stored = await tasks.findByAssigneeId(memberId);
    return {
      ok: true,
      value: {
        member,
        tasks: rules.listMyTasks(stored, memberId),
      },
    };
  };
}

module.exports = { makeListMyTasks };
