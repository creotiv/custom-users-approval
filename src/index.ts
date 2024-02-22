/**
 * The entrypoint for the action.
 */
import * as core from '@actions/core'
import * as github from '@actions/github'
import { Octokit } from '@octokit/rest'
import { run } from './main'

// eslint-disable-next-line @typescript-eslint/no-floating-promises

const token = core.getInput('token')
const octokit = new Octokit({ auth: token })
const configPath = core.getInput('config')
const ctx = github.context

run(ctx, octokit, configPath)
