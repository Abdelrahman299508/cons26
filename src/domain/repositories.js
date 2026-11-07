// Interfaces only. Persistence implements these classes. This file does not talk to MongoDB.

function notImplemented() {
  throw new Error("Repository method is not implemented");
}

class ProjectRepository {
  async insert() {
    notImplemented();
  }

  async findById() {
    notImplemented();
  }

  async findAll() {
    notImplemented();
  }

  async deleteById() {
    notImplemented();
  }
}

class MemberRepository {
  async insert() {
    notImplemented();
  }

  async findById() {
    notImplemented();
  }

  async findByProjectId() {
    notImplemented();
  }

  async deleteByProjectId() {
    notImplemented();
  }
}

class TaskRepository {
  async insert() {
    notImplemented();
  }

  async update() {
    notImplemented();
  }

  async findById() {
    notImplemented();
  }

  async findByProjectId() {
    notImplemented();
  }

  async findByAssigneeId() {
    notImplemented();
  }

  async deleteById() {
    notImplemented();
  }

  async deleteByProjectId() {
    notImplemented();
  }
}

class CommentRepository {
  async insert() {
    notImplemented();
  }

  async findByTaskId() {
    notImplemented();
  }

  async deleteByTaskId() {
    notImplemented();
  }
}

module.exports = {
  ProjectRepository,
  MemberRepository,
  TaskRepository,
  CommentRepository,
};
