#!/usr/bin/env node
import { Command } from 'commander';
import { registerInitCommand } from './commands/init';
import { registerUpCommand } from './commands/up';
import { registerDownCommand } from './commands/down';
import { registerStatusCommand } from './commands/status';
import { registerDoctorCommand } from './commands/doctor';
import { registerMockCommands } from './commands/mocks';
import { registerDatabaseCommands } from './commands/databases';
import { registerChaosCommands } from './commands/chaos';
import { registerScenarioCommands } from './commands/scenarios';

const program = new Command();

program
  .name('stubrix')
  .description('Stubrix CLI — professional mock server control plane')
  .version('1.3.1');

registerInitCommand(program);
registerUpCommand(program);
registerDownCommand(program);
registerStatusCommand(program);
registerDoctorCommand(program);
registerMockCommands(program);
registerDatabaseCommands(program);
registerChaosCommands(program);
registerScenarioCommands(program);

program.parse(process.argv);
