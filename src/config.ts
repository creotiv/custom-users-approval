export interface ConfigGroup {
  members: string[]
  required: number
}

export interface Config {
  teams: { [teamName: string]: ConfigGroup }
}
