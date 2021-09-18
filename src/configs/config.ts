import { KeyConfig } from '../types/key-config.type';

export function getConfigBoolean(key: KeyConfig): boolean {
	const val = process.env[key];
	return val == 'true';
}

export function getConfig(key: KeyConfig): string {
	return process.env[key];
}

export function getNumberConfig(key: KeyConfig): number {
	return +process.env[key];
}

