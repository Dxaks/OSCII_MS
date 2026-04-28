class UserManagement {

    static allUsers = [];

    static addUser(user) {
        this.allUsers.push(user)
    }

    static login(username, password) {
        const user = this.allUsers.find(user => user.username === username);

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

    constructor(surname, firstname, username, password, role, id) {
        this.surname = surname,
        this.firstname = firstname,
        this.username = username,
        this.#password = password,
        this.role = role,
        this.id = crypto.randomUUID();
    }

    checkPassword(input) {
        return this.#password === input;
    }

};


function addUserToAllUsers(surname, firstname, username, password, role) {
  const user = new User(surname, firstname, username, password, role);
  UserManagement.addUser(user);
};

