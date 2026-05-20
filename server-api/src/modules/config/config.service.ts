
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigRepository } from './config.repository';
import type { Config } from '@prisma/client';

@Injectable()
export class ConfigService {
	constructor(private readonly repository: ConfigRepository) {}

	async findConfig(id: string): Promise<Config> {
		const config = await this.repository.findConfig(id);
		if (!config) throw new NotFoundException(`Config with id ${id} not found`);
		return config;
	}

	async addConfig(id: string, key: string, value: string): Promise<Config> {
		return this.repository.addConfig(id, key, value);
	}

	async removeConfig(id: string) {
		return this.repository.removeConfig(id);
	}

	async getConfigsByKey(configKey: string) {
		return this.repository.getConfigsByKey(configKey);
	}
}

