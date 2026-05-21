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

    constructor(surname, firstname, username, password, role, admissionNo = null) {

        this.id = crypto.randomUUID();
        this.surname = surname;
        this.firstname = firstname;
        this.username = username;
        this.role = role;
        this.admissionNo = admissionNo; 
        this.image = "";
        this.#password = password;
    }

    checkPassword(input){
        return this.#password === input;
    }

}


export function createUser(surname, firstname, admissionNo, username, password, role){

    const user = new User(surname, firstname, admissionNo, username, password,
role);

    UserManagement.addUser(user);
    return user;
}


export function getUserById(
    id
){

return UserManagement
.getUsers()
.find(
    user=>
    user.id===id
);

}


export function getStudentByAdmissionNo(
    admissionNo
){

return UserManagement
.getUsers()
.find(
user=>

user.admissionNo===admissionNo

&&

user.role==="student"
);

}


export function getUsersByRole(
    role
){

return UserManagement
.getUsers()
.filter(
user=>

user.role===role
);

}


export function getAllUsers() {
    return UserManagement.getUsers()
}