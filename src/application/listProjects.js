"use strict";

function makeListProjects({ projects }) {
  return async function listProjects() {
    return { ok: true, value: await projects.findAll() };
  };
}

module.exports = { makeListProjects };
