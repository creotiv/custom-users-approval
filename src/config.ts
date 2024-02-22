export interface ConfigGroup
{
    members: string[];
    required: number;
}

export interface Config
{
    groups: { [groupName: string]: ConfigGroup };
}
