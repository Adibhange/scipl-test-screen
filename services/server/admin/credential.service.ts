import bcrypt from "bcryptjs";

const roundsEnv = process.env.BCRYPT_ROUNDS;
const rounds = roundsEnv ? parseInt(roundsEnv, 10) : 12;
const saltRounds = isNaN(rounds) ? 12 : rounds;

export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

export async function hashPin(pin: string): Promise<string> {
	return bcrypt.hash(pin, saltRounds);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
	return bcrypt.compare(pin, hash);
}
