"use strict";

const rules = require("../domain/rules");

function makeCreateProject({ projects, members }) {
  return async function createProject({ name, members: memberInputs }) {
    const result = rules.createProject({ name, members: memberInputs });
    if (!result.ok) {
      return result;
    }

    await projects.insert(result.value.project);
    for (const member of result.value.members) {
      await members.insert(member);
    }

    return result;
  };
}

module.exports = { makeCreateProject };
