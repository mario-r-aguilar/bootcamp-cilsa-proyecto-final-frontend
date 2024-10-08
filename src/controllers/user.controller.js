import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import environment from '../config/env.config.js';
import {
	getUsers,
	getUserById,
	getUserByUserName,
	createUser,
	updateUser,
	deleteUser,
} from '../models/user.model.js';

// user CRUD
export const getAllUsers = async (req, res) => {
	try {
		const listOfUsers = await getUsers();

		if (listOfUsers.length === 0) {
			return res.status(200).send({
				status: 'success',
				message: "No users found (controller's message)",
				users: [],
			});
		}

		// quita información sensible de la respuesta
		const listOfUsersWithoutPass = listOfUsers.map(
			({ user_pass, ...user }) => user
		);

		res.status(200).send(listOfUsersWithoutPass);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 'error',
			message:
				"Internal Server Error: It is not possible to get the list of users (controller's error)",
			error,
		});
	}
};

export const getOneUserById = async (req, res) => {
	try {
		const { uid } = req.params;

		if (!uid) {
			return res.status(400).send({
				status: 'error',
				message: "ID is required (controller's error)",
			});
		}
		const user = await getUserById(uid);

		if (!user)
			return res.status(404).send({
				status: 'error',
				message: "The user does not exist (controller's error)",
			});

		const { user_pass, ...userWithoutPass } = user;

		res.status(200).send(userWithoutPass);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 'error',
			message:
				"Internal Server Error: It is not possible to obtain the chosen user (controller's error)",
			error,
		});
	}
};

export const getOneUserByUsername = async (req, res) => {
	try {
		const { usernm } = req.params;

		if (!usernm) {
			return res.status(400).send({
				status: 'error',
				message: "Username is required (controller's error)",
			});
		}

		const user = await getUserByUserName(usernm);

		if (!user)
			return res.status(404).send({
				status: 'error',
				message: "The user does not exist (controller's error)",
			});

		const { user_pass, ...userWithoutPass } = user;

		res.status(200).send(userWithoutPass);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 'error',
			message:
				"Internal Server Error: It is not possible to obtain the chosen user (controller's error)",
			error,
		});
	}
};

export const registerOneUser = async (req, res) => {
	try {
		const { user_firstname, user_lastname, user_name, user_pass } = req.body;

		const newUser = await createUser(
			user_firstname,
			user_lastname,
			user_name,
			user_pass
		);

		if (!newUser) {
			res.status(400).send({
				status: 'error',
				message:
					"It is not possible to register a new user. Parameters are missing or the username already exists (controller's error)",
			});
		}

		res.status(200).redirect('/login');
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 'error',
			message:
				"Internal Server Error: It is not possible to register a new user (controller's error)",
			error,
		});
	}
};

export const updateOneUser = async (req, res) => {
	try {
		const { uid } = req.params;
		const userData = req.body;

		if (!uid) {
			return res.status(400).send({
				status: 'error',
				message: "ID is required (controller's error)",
			});
		}

		const userUpdated = await updateUser(uid, userData);

		if (!userUpdated) {
			return res.status(400).send({
				status: 'error',
				message: "Invalid user ID (controller's error)",
			});
		}

		if (userUpdated.affectedRows === 0) {
			return res.status(404).send({
				status: 'error',
				message:
					"The user was not found or nothing was updated (controller's error)",
			});
		}

		res.status(200).send({
			status: 'success',
			message: "Updated user (controller's message)",
		});
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 'error',
			message:
				"Internal Server Error: It is not possible to update the information of the chosen user (controller's error)",
			error,
		});
	}
};

export const deleteOneUser = async (req, res) => {
	try {
		const { uid } = req.params;

		if (!uid) {
			return res.status(400).send({
				status: 'error',
				message: "ID is required (controller's error)",
			});
		}

		const userDeleted = await deleteUser(uid);

		if (!userDeleted) {
			return res.status(400).send({
				status: 'error',
				message: "Invalid user ID (controller's error)",
			});
		}

		if (userDeleted.affectedRows === 0) {
			return res.status(400).send({
				status: 'error',
				message: "No users were deleted (controller's error)",
			});
		}

		res.status(200).send({
			status: 'success',
			message: "Deleted user (controller's message)",
		});
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 'error',
			message:
				"Internal Server Error: It is not possible to delete the chosen user (controller's error)",
			error,
		});
	}
};

// logueo y sesiones
export const loginUser = async (req, res) => {
	try {
		const { user_name, user_pass } = req.body;

		const user = await getUserByUserName(user_name);
		if (!user) {
			return res.status(404).send({
				status: 'error',
				message: "The user does not exist (controller's error)",
			});
		}

		const passwordIsMatch = await bcrypt.compare(user_pass, user.user_pass);

		if (!passwordIsMatch) {
			return res.status(401).send({
				status: 'error',
				message: "Invalid credentials (controller's error)",
			});
		}

		const payload = {
			userid: user.user_id,
			username: user.user_name,
			firstname: user.user_firstname,
			lastname: user.user_lastname,
			role: user.user_name === environment.admin_name ? 'ADMIN' : 'USER',
		};

		const token = jwt.sign(payload, environment.jwt_secret, {
			expiresIn: '8h',
		});

		res.cookie('token', token, {
			httpOnly: true, // protege contra XSS (Cross-Site Scripting)
			secure: environment.secure_cookie, // envia solo a través de https cuando es true
			sameSite: 'Strict', // protege contra CSRF (Cross-Site Request Forgery)
			maxAge: 28800000, // expira en 8 horas
		});

		if (user.user_name === environment.admin_name) {
			return res.status(200).redirect('/adminprofile');
		}

		return res.status(200).redirect('/profile');
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 'error',
			message:
				"Internal Server Error: It is not possible to log in the user (controller's error)",
			error,
		});
	}
};

export const getCurrentUser = async (req, res) => {
	try {
		const currentUser = req.user;

		res.status(200).send(currentUser);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 'error',
			message:
				"Internal Server Error: Cannot get current user (controller's error)",
			error,
		});
	}
};

export const logoutUser = async (req, res) => {
	try {
		res.clearCookie('token', {
			httpOnly: true,
			secure: environment.secure_cookie,
			sameSite: 'Strict',
		});

		res.status(200).send({
			status: 'success',
			message: "Successfully logged out (client's message)",
		});
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 'error',
			message:
				"Internal Server Error: It is not possible to log out the user (controller's error)",
			error,
		});
	}
};
