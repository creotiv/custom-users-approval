import * as core from '@actions/core'
import { Context } from '@actions/github/lib/context';
import { Octokit } from "@octokit/rest";
import api from './api';

export async function run(ctx: Context, octokit: Octokit, configPath: string): Promise<void> {
  try {
    core.info('Fetching configuration...');

    let config;
    let fail = false;
    let failedGroups: string[] = [];

    config = await api.fetchConfig(ctx, octokit, configPath);

    core.debug("Config: ");
    core.debug(JSON.stringify(config));

    for (let groupName in config.groups) {
      const group = config.groups[groupName];
      const approved = await api.getApprovedMembers(ctx, octokit, groupName)
      let sign = "✅";

      if (api.countIncluded<string>(new Set(group.members), approved) < group.required) {
        sign = "❌";
        fail = true;
        failedGroups.push(groupName)
      }

      core.startGroup(`${sign} ${groupName}: (${approved.size}/${group.required}) approval(s).`);
      core.endGroup();
    }

    if (fail) {
      core.setFailed(`Need approval from these groups: ${failedGroups.join(', ')}`);
    }
  } catch (error: any) {
    core.setFailed(error.message);
  }
}
