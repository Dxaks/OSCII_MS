import { addUserToLocalStorage } from "./localStorage.js";

class UserManagement {
  static allUsers = [];

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
    this.id = id || crypto.randomUUID();
    this.surname = surname;
    this.firstname = firstname;
    this.username = username;
    this.role = role;
    this.admissionNo = admissionNo;
    this.image = image || "";
    this.#password = password;
  }

  checkPassword(input) {
    return this.#password === input;
  }

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

  if (saveToLocal) {
    addUserToLocalStorage();
  }

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
  return UserManagement.login(username, password);
}

export function deleteUser(userId) {
  const getUser = getUserById(userId);

  const targetUser = getAllUsers().findIndex((user) => {
    return user.id === getUser.id;
  });

  if (targetUser !== -1) {
    getAllUsers().splice(targetUser, 1);
    addUserToLocalStorage();
    return true;
  }
}
