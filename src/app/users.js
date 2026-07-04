import { addUserToLocalStorage } from "./localStorage.js";
import { notyf } from "../utilities/utility.js";
import { makeId } from "../utilities/id.js";
import { removeResultsByStudent } from "./result.js";
import {
  loginWithBackend,
  updateUserRemote,
  deleteUserRemote,
} from "./backendApi.js";

class UserManagement {
  static allUsers = [];

  // Keep users in memory until a backend replaces this store.
  static addUser(user) {
    this.allUsers.push(user);
  }

  static login(username, password) {
    const user = this.allUsers.find((user) => user.username === username);

    if (!user) return null;

    if (user.checkPassword(password)) {
      return user;
    }

    return null;
  }

  static getUsers() {
    return this.allUsers;
  }

  static reset() {
    this.allUsers = [];
  }
}

class User {
  #password;

  constructor(
    surname,
    firstname,
    admissionNo = null,
    username,
    password,
    role,
    id,
    image,
  ) {
    this.id = id || makeId();
    this.surname = surname;
    this.firstname = firstname;
    this.username = username;
    this.role = role;
    this.admissionNo = admissionNo;
    this.image = image || "";
    this.#password = password ?? null;
  }

  // Passwords are compared locally today; the backend should replace this flow.
  checkPassword(input) {
    if (this.#password === null) {
      return false;
    }
    return this.#password === input;
  }

  // Expose a serializable shape for localStorage persistence.
  toJSON() {
    return {
      id: this.id,
      surname: this.surname,
      firstname: this.firstname,
      username: this.username,
      role: this.role,
      admissionNo: this.admissionNo,
      image: this.image,
      password: this.#password,
    };
  }

  setPassword(password) {
    this.#password = password;
  }
}

export function createUser(
  surname,
  firstname,
  admissionNo,
  username,
  password,
  role,
  id,
  image,
  saveToLocal = true,
) {
  const user = new User(
    surname,
    firstname,
    admissionNo,
    username,
    password,
    role,
    id,
    image,
  );

  UserManagement.addUser(user);

  return user;
}

export function getUserById(id) {
  return UserManagement.getUsers().find((user) => user.id === id);
}

export function getStudentByAdmissionNo(admissionNo) {
  return UserManagement.getUsers().find(
    (user) => user.admissionNo === admissionNo && user.role === "student",
  );
}

export function getUsersByRole(role) {
  return UserManagement.getUsers().filter((user) => user.role === role);
}

export function getAllUsers() {
  return UserManagement.getUsers();
}

export function validateUser(username, password) {
  return loginWithBackend(username, password)
    .then(({ user, token }) => ({ ...user, token }))
    .catch(() => null);
}

export async function updateUser(userId, payload) {
  const user = getUserById(userId);

  if (!user) {
    return false;
  }

  if (payload.surname !== undefined) user.surname = payload.surname;
  if (payload.firstname !== undefined) user.firstname = payload.firstname;
  if (payload.username !== undefined) user.username = payload.username;
  if (payload.role !== undefined) user.role = payload.role;
  if (payload.admissionNo !== undefined) user.admissionNo = payload.admissionNo;
  if (payload.image !== undefined) user.image = payload.image;
  if (payload.password !== undefined && payload.password !== "") {
    user.setPassword(payload.password);
  }

 
  try {
    await updateUserRemote(userId, payload);
  } catch (error) {
    notyf.error(error.message || "Failed to update user");
  }

  return true;
}

export async function deleteUser(userId) {
  const getUser = getUserById(userId);

  if (!getUser) {
    return false;
  }

  const targetUser = getAllUsers().findIndex((user) => {
    return user.id === getUser.id;
  });

  if (targetUser !== -1) {
    getAllUsers().splice(targetUser, 1);
    removeResultsByStudent(userId);
   
    try {
      await deleteUserRemote(userId);
    } catch (error) {
      notyf.error(error.message || "Failed to delete user");
    }
    return true;
  }
}

export function resetUsers() {
  UserManagement.reset();
}
